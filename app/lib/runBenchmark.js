import { ollamaClient } from './ollamaClient';

// Exécute la recette complète d'un benchmark pour un modèle :
// warmup → mesure → lecture VRAM → sauvegarde → déchargement.
// Réutilisé par la page single (/benchmark/[modelId]) et par le
// runner séquentiel « Exécuter tous les tests » de ModelList.
// Retourne { completeData, id, unloaded }.
// Peut throw si runBenchmark échoue (warmup/unload ne throwent jamais).
export async function runFullBenchmark(modelId, prompt) {
  // Récupérer les infos du modèle (taille disque)
  const models = await ollamaClient.fetchModels();
  const modelInfo = models.find(model => model.name === modelId) || {};

  // Précharger le modèle en VRAM avant la mesure réelle (warmup).
  // Le run suivant mesure alors l'inférence pure, sans le chargement à froid.
  await ollamaClient.warmup(modelId);

  // Mesure réelle avec le prompt fourni
  const benchmarkResult = await ollamaClient.runBenchmark(modelId, prompt);

  // Le modèle est chargé : lire /api/ps pour la VRAM et la longueur de contexte
  const runningModels = await ollamaClient.fetchRunningModels();
  const runningInfo = runningModels.find(model => model.name === modelId) || {};

  // Convertir les métriques Ollama (nanosecondes) en valeurs d'affichage
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

  // Combiner infos modèle et résultats du benchmark
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
    prompt,
    date: new Date().toLocaleDateString('fr-FR'),
    contextLength: runningInfo.context_length || 'N/A'
  };

  // Enregistrer le résultat en base pour le consulter sans relancer le test
  let id = null;
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
}
