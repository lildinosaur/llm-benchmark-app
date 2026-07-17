import React, { useState, useEffect } from 'react';
import { ollamaClient } from '../lib/ollamaClient';
import { runFullBenchmark } from '../lib/runBenchmark';

const DEFAULT_PROMPT = 'Réponds par un mot unique : test';
const PROMPT_STORAGE_KEY = 'benchmarkTestPrompt';

// Convertir les octets en gigaoctets lisibles
const formatToGB = (bytes) => {
  if (!bytes) return null;
  return (bytes / (1024 ** 3)).toFixed(1) + ' Go';
};

export default function ModelList() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testPrompt, setTestPrompt] = useState(DEFAULT_PROMPT);
  // Derniers résultats enregistrés, indexés par nom de modèle
  const [savedResults, setSavedResults] = useState({});
  // Exécution séquentielle « Exécuter tous les tests »
  const [running, setRunning] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Restaurer le prompt sauvegardé (lecture dans useEffect pour éviter
  // un décalage d'hydratation entre serveur et client)
  useEffect(() => {
    const savedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (savedPrompt) {
      setTestPrompt(savedPrompt);
    }
  }, []);

  const handlePromptChange = (e) => {
    setTestPrompt(e.target.value);
    localStorage.setItem(PROMPT_STORAGE_KEY, e.target.value);
  };

  // Lancer les benchmarks sur tous les modèles, un par un.
  // Chaque modèle est préchauffé puis déchargé : un seul modèle en VRAM à la fois.
  const runAll = async () => {
    if (running || models.length === 0) return;
    setRunning(true);
    setProgress({ done: 0, total: models.length });

    for (const model of models) {
      setCurrentModel(model.name);
      try {
        const { completeData, id } = await runFullBenchmark(model.name, testPrompt);
        setSavedResults((prev) => ({ ...prev, [model.name]: { ...completeData, id } }));
      } catch (err) {
        // Un échec sur un modèle n'interrompt pas la série
        console.error(`Échec du benchmark pour ${model.name}:`, err);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setCurrentModel(null);
    setRunning(false);
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        const fetchedModels = await ollamaClient.fetchModels();
        setModels(fetchedModels);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  // Charger les résultats déjà enregistrés en base (sans relancer de test)
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const res = await fetch('/api/results');
        if (!res.ok) return;
        const { results } = await res.json();
        const byModel = {};
        for (const r of results) {
          const name = r.modelInfo?.modelName || r.modelId;
          if (name) byModel[name] = r;
        }
        setSavedResults(byModel);
      } catch (err) {
        console.error('Échec du chargement des résultats enregistrés:', err);
      }
    };

    loadSaved();
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
        </p>

        <button
          type="button"
          className="btn run-all-btn"
          onClick={runAll}
          disabled={running || models.length === 0}
        >
          {running ? 'Exécution en cours…' : 'Exécuter tous les tests'}
        </button>

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
                <span className="model-go">{saved ? 'Relancer' : 'Mesurer'}</span>
              </a>

              {saved && (
                <div className="saved-row">
                  <span className="saved-metric">
                    {saved.generationSpeed ? `${saved.generationSpeed} tokens/s` : '—'}
                  </span>
                  <span className="saved-metric">
                    {saved.responseTime ? `${saved.responseTime} ms` : '—'}
                  </span>
                  <a className="saved-link" href={`/results/${saved.id}`}>
                    Voir le dernier résultat →
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
