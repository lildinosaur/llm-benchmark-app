import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import BenchmarkResult from '../../app/components/BenchmarkResult';
import ThemeToggle from '../../app/components/ThemeToggle';
import type { BenchmarkRun, CompleteData, StoredResult } from '../../app/lib/types';

const POLL_INTERVAL_MS = 1000;

interface BenchmarkPageProps {
  modelId: string;
  prompt: string;
}

export default function BenchmarkPage({ modelId, prompt }: BenchmarkPageProps) {
  const [benchmarkData, setBenchmarkData] = useState<CompleteData | StoredResult | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [unloaded, setUnloaded] = useState(false);
  const [initializing, setInitializing] = useState(true); // chargement du statut/DB au montage
  const [isRunning, setIsRunning] = useState(false);       // mesure en cours pour CE modèle
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [liveOutput, setLiveOutput] = useState('');
  const [liveThinking, setLiveThinking] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLPreElement | null>(null);
  const thinkingRef = useRef<HTMLPreElement | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Applique un run serveur à l'état local, en ne considérant que ce modèle.
  const processRun = (run: BenchmarkRun | null): boolean => {
    if (!run || !run.models?.includes(modelId)) return false;
    // Logs live remontés du serveur (phases + tokens streamés du modèle)
    setLogs(run.logs ?? []);
    setLiveOutput(run.liveOutput ?? '');
    setLiveThinking(run.liveThinking ?? '');
    const mine = run.results?.find((r) => r.model === modelId);

    if (mine?.ok) {
      setBenchmarkData(mine.completeData ?? null);
      setSavedId(mine.id ?? null);
      setUnloaded(true);
      setIsRunning(false);
      setCancelled(false);
      setError(null);
      return true; // terminé
    }
    if (mine && !mine.ok) {
      setError(mine.error || 'Échec du benchmark');
      setIsRunning(false);
      return true;
    }
    // Pas encore de résultat pour ce modèle
    if (run.status === 'running') {
      setIsRunning(true);
      return false; // continuer à poller
    }
    if (run.status === 'cancelled') {
      setCancelled(true);
      setIsRunning(false);
      return true;
    }
    return false;
  };

  // Auto-scroll de la sortie live vers le bas à chaque nouveau token.
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveOutput]);

  // Auto-scroll du raisonnement à chaque nouvelle bribe.
  useEffect(() => {
    const el = thinkingRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveThinking]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/benchmark/status');
        if (!res.ok) return;
        const { run } = (await res.json()) as { run: BenchmarkRun | null };
        const finished = processRun(run);
        if (finished || !run || run.status !== 'running') stopPolling();
      } catch (err) {
        console.error('Échec du polling du statut:', err);
      }
    }, POLL_INTERVAL_MS);
  };

  // Lancer (ou relancer) un benchmark pour ce modèle côté serveur.
  const startBenchmark = async () => {
    setError(null);
    setCancelled(false);
    setBenchmarkData(null);
    setSavedId(null);
    setLogs([]);
    setLiveOutput('');
    setLiveThinking('');
    setIsRunning(true);
    try {
      const res = await fetch('/api/benchmark/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, models: [modelId] })
      });
      const data = (await res.json()) as { run?: BenchmarkRun; error?: string };
      if (data.run) {
        processRun(data.run);
        startPolling();
      } else if (data.error) {
        setError(data.error);
        setIsRunning(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setIsRunning(false);
    }
  };

  const cancelBenchmark = async () => {
    try {
      await fetch('/api/benchmark/cancel', { method: 'POST' });
    } catch (err) {
      console.error('Échec de l’annulation:', err);
    }
  };

  // Au montage : reprendre un run en cours pour ce modèle, sinon afficher le
  // dernier résultat en base (pas de relance automatique).
  useEffect(() => {
    const init = async () => {
      try {
        const statusRes = await fetch('/api/benchmark/status');
        if (statusRes.ok) {
          const { run } = (await statusRes.json()) as { run: BenchmarkRun | null };
          if (run && run.models?.includes(modelId)) {
            const finished = processRun(run);
            if (!finished && run.status === 'running') startPolling();
            setInitializing(false);
            return;
          }
        }

        // Aucun run en cours pour ce modèle : charger le dernier résultat en base
        const res = await fetch(`/api/results?model=${encodeURIComponent(modelId)}`);
        if (res.ok) {
          const { results } = (await res.json()) as { results: StoredResult[] };
          if (results && results.length > 0) {
            const latest = results[0]; // trié par id DESC côté DB
            setBenchmarkData(latest);
            setSavedId(latest.id ?? null);
            setUnloaded(true);
          }
        }
      } catch (err) {
        console.error('Échec de l’initialisation:', err);
      } finally {
        setInitializing(false);
      }
    };

    init();
    return () => stopPolling();
  }, [modelId]);

  // Encart repliable de logs en direct (phases + raisonnement + texte streamé).
  const liveLogsPanel = (logs.length > 0 || liveOutput || liveThinking) && (
    <details className="live-logs" open>
      <summary>Logs en direct</summary>
      {logs.length > 0 && (
        <pre className="live-logs-events">{logs.join('\n')}</pre>
      )}
      {liveThinking && (
        <>
          <p className="live-logs-label">Raisonnement</p>
          <pre className="live-logs-thinking" ref={thinkingRef}>
            {liveThinking}
          </pre>
        </>
      )}
      <p className="live-logs-label">Réponse</p>
      <pre className="live-logs-output" ref={outputRef}>
        {liveOutput || '…'}
      </pre>
    </details>
  );

  return (
    <div className="app-shell">
      <Head>
        <title>{`Benchmark — ${modelId}`}</title>
      </Head>

      <header className="faceplate">
        <div className="faceplate-inner">
          <h1 className="brand">
            <span className="power-dot" aria-hidden="true" />
            Benchmark
          </h1>
          <p className="model-tag">{modelId}</p>
          <ThemeToggle />
        </div>
      </header>

      <main className="workspace">
        {initializing && (
          <div className="state-panel">
            <div className="scan-track"><div className="scan-bar" /></div>
            <p>Chargement…</p>
          </div>
        )}

        {!initializing && isRunning && (
          <div className="state-panel">
            <div className="scan-track"><div className="scan-bar" /></div>
            <h2>Mesure en cours...</h2>
            <p>
              Le test s'exécute côté serveur : vous pouvez rafraîchir ou fermer
              cette page, la mesure continuera et vous retrouverez le résultat ici.
            </p>
            <div style={{ marginTop: '20px' }}>
              <button type="button" className="btn cancel-btn" onClick={cancelBenchmark}>
                Annuler le test
              </button>
              {' '}
              <a href="/" className="btn">← Retour à la liste des modèles</a>
            </div>
            {liveLogsPanel}
          </div>
        )}

        {!initializing && !isRunning && cancelled && (
          <>
            <div className="saved-banner">
              Test annulé · modèle déchargé de la VRAM.
            </div>
            <div style={{ marginTop: '24px' }}>
              <button type="button" className="btn" onClick={startBenchmark}>Relancer le test</button>
              {' '}
              <a href="/" className="btn">← Retour à la liste des modèles</a>
            </div>
          </>
        )}

        {!initializing && !isRunning && !cancelled && error && (
          <>
            <div className="error-panel">
              <h3>Erreur lors du benchmark</h3>
              <p>{error}</p>
              <p>Assurez-vous que Ollama est en cours d'exécution.</p>
            </div>
            <div style={{ marginTop: '24px' }}>
              <button type="button" className="btn" onClick={startBenchmark}>Réessayer</button>
              {' '}
              <a href="/" className="btn">← Retour à la liste des modèles</a>
            </div>
          </>
        )}

        {!initializing && !isRunning && !cancelled && !error && benchmarkData && (
          <>
            <div className="saved-banner">
              {savedId ? 'Dernier résultat enregistré.' : 'Résultat.'}
              {unloaded ? ' · modèle déchargé de la VRAM.' : ''}
            </div>
            <div style={{ margin: '16px 0' }}>
              <button type="button" className="btn run-all-btn" onClick={startBenchmark}>
                Relancer le test
              </button>
              {' '}
              <a href={`/history/${encodeURIComponent(modelId)}`} className="btn">Voir l'historique</a>
            </div>
            <BenchmarkResult data={benchmarkData} />
            <div style={{ marginTop: '24px' }}>
              <a href="/" className="btn">← Retour à la liste des modèles</a>
            </div>
          </>
        )}

        {!initializing && !isRunning && !cancelled && !error && !benchmarkData && (
          <>
            <div className="state-panel">
              <h2>Aucun résultat pour ce modèle</h2>
              <p>Lancez un benchmark pour mesurer ses performances.</p>
              <div style={{ marginTop: '20px' }}>
                <button type="button" className="btn run-all-btn" onClick={startBenchmark}>
                  Lancer le test
                </button>
              </div>
            </div>
            <div style={{ marginTop: '24px' }}>
              <a href="/" className="btn">← Retour à la liste des modèles</a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Pour les routes dynamiques dans Next.js, nous devons utiliser getServerSideProps
export const getServerSideProps: GetServerSideProps<BenchmarkPageProps> = async ({ params, query }) => {
  const rawModelId = params?.modelId;
  const modelId = Array.isArray(rawModelId) ? rawModelId[0] : rawModelId;
  const rawPrompt = query?.prompt;
  const prompt = Array.isArray(rawPrompt) ? rawPrompt[0] : rawPrompt;

  // Nettoyer le nom du modèle s'il contient des caractères spéciaux
  const cleanModelId = modelId ? decodeURIComponent(modelId) : 'unknown';

  // Utiliser le prompt passé en paramètre ou le prompt par défaut
  const testPrompt = prompt || 'Réponds par un mot unique : test';

  return {
    props: {
      modelId: cleanModelId,
      prompt: testPrompt
    }
  };
};
