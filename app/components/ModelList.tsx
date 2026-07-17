import React, { useState, useEffect, useRef } from 'react';
import { ollamaClient } from '../lib/ollamaClient';
import type { BenchmarkRun, CompleteData, OllamaModel, StoredResult } from '../lib/types';

const DEFAULT_PROMPT = 'Réponds par un mot unique : test';
const PROMPT_STORAGE_KEY = 'benchmarkTestPrompt';
const POLL_INTERVAL_MS = 1000;

// Entrée d'affichage : résultat complet + id (issu de la DB ou du run en cours).
type SavedEntry = CompleteData & { id?: number | null; savedAt?: string };

// Convertir les octets en gigaoctets lisibles
const formatToGB = (bytes: number | undefined): string | null => {
  if (!bytes) return null;
  return (bytes / (1024 ** 3)).toFixed(1) + ' Go';
};

// Indexer les résultats terminés d'un run par nom de modèle (pour l'affichage
// en direct des cartes pendant l'exécution serveur).
const resultsByModel = (run: BenchmarkRun | null): Record<string, SavedEntry> => {
  const byModel: Record<string, SavedEntry> = {};
  if (!run) return byModel;
  for (const r of run.results || []) {
    if (r.ok && r.completeData) {
      byModel[r.model] = { ...r.completeData, id: r.id };
    }
  }
  return byModel;
};

export default function ModelList() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState(DEFAULT_PROMPT);
  // Derniers résultats enregistrés, indexés par nom de modèle
  const [savedResults, setSavedResults] = useState<Record<string, SavedEntry>>({});
  // Run de benchmark serveur en cours (ou null). L'exécution vit côté serveur :
  // on ne fait que déclencher puis poller son état.
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const running = run?.status === 'running';
  const progress = run?.progress || { done: 0, total: 0 };
  const currentModel = run?.currentModel || null;

  // Restaurer le prompt sauvegardé (dans useEffect pour éviter un décalage
  // d'hydratation entre serveur et client)
  useEffect(() => {
    const savedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (savedPrompt) {
      setTestPrompt(savedPrompt);
    }
  }, []);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTestPrompt(e.target.value);
    localStorage.setItem(PROMPT_STORAGE_KEY, e.target.value);
  };

  // Applique un run reçu du serveur : met à jour l'état + les cartes en direct.
  const applyRun = (nextRun: BenchmarkRun | null) => {
    setRun(nextRun);
    if (nextRun) {
      const live = resultsByModel(nextRun);
      if (Object.keys(live).length > 0) {
        setSavedResults((prev) => ({ ...prev, ...live }));
      }
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Interroge périodiquement /api/benchmark/status jusqu'à la fin du run.
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/benchmark/status');
        if (!res.ok) return;
        const { run: serverRun } = (await res.json()) as { run: BenchmarkRun | null };
        applyRun(serverRun);
        if (!serverRun || serverRun.status !== 'running') {
          stopPolling();
        }
      } catch (err) {
        console.error('Échec du polling du statut:', err);
      }
    }, POLL_INTERVAL_MS);
  };

  // Lancer les benchmarks sur tous les modèles côté serveur.
  const runAll = async () => {
    if (running || models.length === 0) return;
    try {
      const res = await fetch('/api/benchmark/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testPrompt, models: models.map((m) => m.name) })
      });
      const data = (await res.json()) as { run?: BenchmarkRun; error?: string };
      // 202 (démarré) ou 409 (un run était déjà en cours) : on suit ce run.
      if (data.run) {
        applyRun(data.run);
        startPolling();
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Annuler la série en cours côté serveur.
  const cancelAll = async () => {
    try {
      const res = await fetch('/api/benchmark/cancel', { method: 'POST' });
      if (res.ok) {
        const { run: serverRun } = (await res.json()) as { run: BenchmarkRun | null };
        applyRun(serverRun);
      }
    } catch (err) {
      console.error('Échec de l’annulation:', err);
    }
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        const fetchedModels = await ollamaClient.fetchModels();
        setModels(fetchedModels);
        setLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  // Charger les résultats déjà enregistrés en base + reprendre un run serveur
  // éventuellement en cours (survit à un refresh / une fermeture d'onglet).
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const res = await fetch('/api/results');
        if (res.ok) {
          const { results } = (await res.json()) as { results: StoredResult[] };
          const byModel: Record<string, SavedEntry> = {};
          for (const r of results) {
            const name = r.modelInfo?.modelName || r.modelId;
            if (name) byModel[name] = r;
          }
          setSavedResults(byModel);
        }
      } catch (err) {
        console.error('Échec du chargement des résultats enregistrés:', err);
      }

      try {
        const res = await fetch('/api/benchmark/status');
        if (res.ok) {
          const { run: serverRun } = (await res.json()) as { run: BenchmarkRun | null };
          if (serverRun) {
            applyRun(serverRun);
            if (serverRun.status === 'running') startPolling();
          }
        }
      } catch (err) {
        console.error('Échec de la reprise du run:', err);
      }
    };

    loadSaved();
    return () => stopPolling();
  }, []);

  if (loading) return (
    <div className="state-panel model-list">
      <div className="scan-track"><div className="scan-bar" /></div>
      <p>Chargement des modèles...</p>
    </div>
  );

  if (error) return (
    <div className="error-panel model-list">
      <h3>Erreur lors du chargement</h3>
      <p>{error}</p>
      <p>Assurez-vous que Ollama est en cours d'exécution.</p>
    </div>
  );

  if (models.length === 0) {
    return (
      <div className="state-panel model-list">
        <h2>Aucun modèle disponible</h2>
        <p>Aucun modèle n'a été trouvé. Vérifiez que Ollama est en cours d'exécution et que des modèles sont téléchargés.</p>
      </div>
    );
  }

  return (
    <div className="model-list">
      <section className="prompt-console">
        <label htmlFor="testPrompt" className="console-label">
          Prompt de test
        </label>
        <textarea
          id="testPrompt"
          value={testPrompt}
          onChange={handlePromptChange}
          rows={3}
          className="prompt-input"
          placeholder="Entrez le prompt à utiliser pour le benchmark..."
        />
        <p className="console-hint">
          Ce prompt sera utilisé pour tous les benchmarks. Il sera conservé entre les tests.
          Les tests s'exécutent côté serveur : vous pouvez rafraîchir ou fermer la page sans les interrompre.
        </p>

        <div className="run-all-actions">
          <button
            type="button"
            className="btn run-all-btn"
            onClick={runAll}
            disabled={running || models.length === 0}
          >
            {running ? 'Exécution en cours…' : 'Exécuter tous les tests'}
          </button>

          {running && (
            <button
              type="button"
              className="btn cancel-btn"
              onClick={cancelAll}
            >
              Annuler les tests
            </button>
          )}
        </div>

        {running && (
          <div className="run-all-progress">
            <div className="scan-track"><div className="scan-bar" /></div>
            <p>
              Test {Math.min(progress.done + 1, progress.total)}/{progress.total}
              {currentModel ? ` · ${currentModel}` : ''}
            </p>
          </div>
        )}
      </section>

      <h2 className="section-title">Modèles disponibles · {models.length}</h2>

      <ul>
        {models.map((model) => {
          const saved = savedResults[model.name];
          return (
            <li key={model.name} className="model-item">
              <a
                href={`/benchmark/${encodeURIComponent(model.name)}?prompt=${encodeURIComponent(testPrompt)}`}
                className="model-link"
              >
                <span className="model-name">{model.name}</span>
                <span className="model-meta">
                  {model.details && model.details.parameter_size && (
                    <span className="meta-chip">{model.details.parameter_size}</span>
                  )}
                  {model.details && model.details.quantization_level && (
                    <span className="meta-chip">{model.details.quantization_level}</span>
                  )}
                  {formatToGB(model.size) && (
                    <span className="meta-size">{formatToGB(model.size)}</span>
                  )}
                </span>
                <span className="model-go">
                  {currentModel === model.name ? 'En cours…' : (saved ? 'Relancer' : 'Mesurer')}
                </span>
              </a>

              {saved && (
                <div className="saved-row">
                  <span className="saved-metric">
                    {saved.generationSpeed ? `${saved.generationSpeed} tokens/s` : '—'}
                  </span>
                  <span className="saved-metric">
                    {saved.responseTime ? `${saved.responseTime} ms` : '—'}
                  </span>
                  <a className="saved-link" href={`/history/${encodeURIComponent(model.name)}`}>
                    Voir l'historique →
                  </a>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
