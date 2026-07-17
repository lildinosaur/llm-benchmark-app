import { ollamaClient } from './ollamaClient';
import type {
  BenchmarkRawResult,
  CompleteData,
  OllamaModel,
  RunningModel
} from './types';

// Résultat d'une exécution complète (mesure + persistance + déchargement).
export interface FullBenchmarkOutcome {
  completeData: CompleteData;
  id: number | null;
  unloaded: boolean;
}

// Erreur marquée comme annulation volontaire.
export interface CancelledError extends Error {
  cancelled?: boolean;
}

// Transforme le résultat brut d'Ollama (durées en nanosecondes) en objet
// d'affichage complet. Fonction pure, sans I/O : réutilisée côté client
// (runFullBenchmark) et côté serveur (serverBenchmark) pour garantir un
// format de données identique quel que soit l'endroit d'exécution.
export function buildCompleteData(
  modelId: string,
  prompt: string,
  benchmarkResult: BenchmarkRawResult,
  modelInfo: Partial<OllamaModel> = {},
  runningInfo: Partial<RunningModel> = {}
): CompleteData {
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

  return {
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
    prompt,
    date: new Date().toLocaleString('fr-FR'),
    contextLength: runningInfo.context_length || 'N/A'
  };
}

// Exécute la recette complète d'un benchmark pour un modèle (variante CLIENT :
// persiste via POST /api/results). Conservée pour usage navigateur.
// Retourne { completeData, id, unloaded }.
// Peut throw si runBenchmark échoue (warmup/unload ne throwent jamais).
// Un `signal` (AbortSignal) permet d'annuler le test : la requête en vol
// est interrompue et le modèle est déchargé de la VRAM avant de rethrow
// une erreur marquée `{ cancelled: true }`.
export async function runFullBenchmark(
  modelId: string,
  prompt: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<FullBenchmarkOutcome> {
  try {
    // Récupérer les infos du modèle (taille disque)
    const models = await ollamaClient.fetchModels();
    const modelInfo = models.find((model) => model.name === modelId) || {};

    // Précharger le modèle en VRAM avant la mesure réelle (warmup).
    await ollamaClient.warmup(modelId, signal);

    // Mesure réelle avec le prompt fourni
    const benchmarkResult = await ollamaClient.runBenchmark(modelId, prompt, signal);

    // Le modèle est chargé : lire /api/ps pour la VRAM et la longueur de contexte
    const runningModels = await ollamaClient.fetchRunningModels();
    const runningInfo = runningModels.find((model) => model.name === modelId) || {};

    // Convertir les métriques Ollama en valeurs d'affichage (logique partagée)
    const completeData = buildCompleteData(modelId, prompt, benchmarkResult, modelInfo, runningInfo);

    // Enregistrer le résultat en base pour le consulter sans relancer le test
    let id: number | null = null;
    try {
      const saveResponse = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeData)
      });
      if (saveResponse.ok) {
        ({ id } = await saveResponse.json());
      }
    } catch (saveErr) {
      console.error('Échec de l’enregistrement du résultat:', saveErr);
    }

    // Décharger le modèle de la VRAM une fois la mesure terminée
    const unloaded = await ollamaClient.unloadModel(modelId);

    return { completeData, id, unloaded };
  } catch (error) {
    // Annulation : interrompre proprement et libérer la VRAM.
    if ((error instanceof Error && error.name === 'AbortError') || signal?.aborted) {
      await ollamaClient.unloadModel(modelId);
      const cancelled: CancelledError = new Error('Benchmark annulé');
      cancelled.cancelled = true;
      throw cancelled;
    }
    throw error;
  }
}
