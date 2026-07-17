import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import BenchmarkResult from '../../app/components/BenchmarkResult';
import { runFullBenchmark } from '../../app/lib/runBenchmark';

export default function BenchmarkPage({ modelId, prompt }) {
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [unloaded, setUnloaded] = useState(false);

  useEffect(() => {
    const runBenchmark = async () => {
      try {
        setLoading(true);

        const { completeData, id, unloaded } = await runFullBenchmark(modelId, prompt);

        setBenchmarkData(completeData);
        if (id !== null) setSavedId(id);
        setUnloaded(unloaded);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    runBenchmark();
  }, [modelId, prompt]);

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
        </div>
      </header>

      <main className="workspace">
        {loading && (
          <div className="state-panel">
            <div className="scan-track"><div className="scan-bar" /></div>
            <h2>Mesure en cours...</h2>
            <p>Le premier passage peut prendre du temps si le modèle doit être chargé en mémoire.</p>
          </div>
        )}

        {!loading && error && (
          <>
            <div className="error-panel">
              <h3>Erreur lors du benchmark</h3>
              <p>{error}</p>
              <p>Assurez-vous que Ollama est en cours d'exécution.</p>
            </div>
            <div style={{ marginTop: '24px' }}>
              <a href="/" className="btn">← Retour à la liste des modèles</a>
            </div>
          </>
        )}

        {!loading && !error && (
          <>
            <div className="saved-banner">
              {savedId
                ? 'Résultat enregistré · '
                : 'Enregistrement du résultat… · '}
              {unloaded
                ? 'modèle déchargé de la VRAM.'
                : 'déchargement de la VRAM non confirmé.'}
            </div>
            <BenchmarkResult data={benchmarkData} />
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
export async function getServerSideProps({ params, query }) {
  const { modelId } = params;
  const { prompt } = query;

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
}
