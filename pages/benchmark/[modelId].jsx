import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import BenchmarkResult from '../../app/components/BenchmarkResult';
import { ollamaClient } from '../../app/lib/ollamaClient';

export default function BenchmarkPage({ modelId, prompt }) {
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const runBenchmark = async () => {
      try {
        setLoading(true);

        // Fetch model information first to get disk size
        const models = await ollamaClient.fetchModels();
        const modelInfo = models.find(model => model.name === modelId) || {};

        // Run the actual benchmark with the user-provided prompt
        const benchmarkResult = await ollamaClient.runBenchmark(modelId, prompt);

        // The model is now loaded: query /api/ps for VRAM usage and context length
        const runningModels = await ollamaClient.fetchRunningModels();
        const runningInfo = runningModels.find(model => model.name === modelId) || {};

        // Convert Ollama metrics (nanoseconds) into display values
        const responseTime = benchmarkResult.totalDuration
          ? Math.round(benchmarkResult.totalDuration / 1e6)
          : benchmarkResult.duration;
        const loadTime = benchmarkResult.loadDuration
          ? (benchmarkResult.loadDuration / 1e9).toFixed(2)
          : null;
        const generationSpeed = benchmarkResult.evalCount && benchmarkResult.evalDuration
          ? (benchmarkResult.evalCount / (benchmarkResult.evalDuration / 1e9)).toFixed(1)
          : null;
        const overallScore = benchmarkResult.evalCount && benchmarkResult.totalDuration
          ? (benchmarkResult.evalCount / (benchmarkResult.totalDuration / 1e9)).toFixed(1)
          : null;
        const promptTokens = benchmarkResult.promptEvalCount || null;
        const promptEvalTime = benchmarkResult.promptEvalDuration
          ? (benchmarkResult.promptEvalDuration / 1e9).toFixed(2)
          : null;
        const promptEvalSpeed = benchmarkResult.promptEvalCount && benchmarkResult.promptEvalDuration
          ? (benchmarkResult.promptEvalCount / (benchmarkResult.promptEvalDuration / 1e9)).toFixed(1)
          : null;
        const generatedTokens = benchmarkResult.evalCount || null;
        const generationTime = benchmarkResult.evalDuration
          ? (benchmarkResult.evalDuration / 1e9).toFixed(2)
          : null;

        // Combine model info with benchmark results
        const completeData = {
          ...benchmarkResult,
          modelInfo: {
            modelName: modelId,
            diskSize: modelInfo.size,
            vramUsage: runningInfo.size_vram || 0
          },
          responseTime,
          loadTime,
          generationSpeed,
          overallScore,
          promptTokens,
          promptEvalTime,
          promptEvalSpeed,
          generatedTokens,
          generationTime,
          prompt: prompt,
          date: new Date().toLocaleDateString('fr-FR'),
          contextLength: runningInfo.context_length || 'N/A'
        };

        setBenchmarkData(completeData);
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
