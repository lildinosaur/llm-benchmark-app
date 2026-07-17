// Runner de benchmark côté SERVEUR (process Node de Next.js).
// Même recette que runFullBenchmark (client) mais sans le hop HTTP vers
// /api/results : on appelle saveResult directement. Ce module importe la
// couche SQLite (better-sqlite3) et ne doit donc JAMAIS être importé côté
// client — uniquement depuis les routes API / le store serveur.
import { ollamaClient } from './ollamaClient';
import { buildCompleteData } from './runBenchmark';
import type { CancelledError, FullBenchmarkOutcome } from './runBenchmark';
import { saveResult } from './db';

// warmup → mesure → lecture VRAM → sauvegarde SQLite → déchargement.
// Retourne { completeData, id, unloaded }. Peut throw ; une annulation
// (signal aborté) décharge la VRAM et rethrow une erreur `{ cancelled: true }`.
export async function runFullBenchmarkServer(
  modelId: string,
  prompt: string,
  {
    signal,
    onEvent,
    onToken,
    onThinking
  }: {
    signal?: AbortSignal;
    onEvent?: (line: string) => void;                    // événements de phase
    onToken?: (chunk: string, full: string) => void;     // tokens streamés du modèle
    onThinking?: (chunk: string, full: string) => void;  // raisonnement streamé
  } = {}
): Promise<FullBenchmarkOutcome> {
  const emit = (line: string) => {
    if (onEvent) onEvent(line);
  };
  try {
    // Infos du modèle (taille disque)
    const models = await ollamaClient.fetchModels();
    const modelInfo = models.find((model) => model.name === modelId) || {};

    // Préchauffage : charger le modèle en VRAM avant la mesure réelle
    emit(`Préchauffage du modèle ${modelId}…`);
    await ollamaClient.warmup(modelId, signal);

    // Détecter si le modèle sait raisonner (thinking) avant la mesure
    const think = await ollamaClient.supportsThinking(modelId);
    if (think) emit('Raisonnement activé pour ce modèle.');

    // Mesure réelle
    emit('Mesure en cours…');
    const benchmarkResult = await ollamaClient.runBenchmark(
      modelId,
      prompt,
      signal,
      onToken,
      think,
      onThinking
    );

    // Modèle chargé : lire /api/ps pour VRAM + longueur de contexte
    emit('Lecture de la VRAM et du contexte…');
    const runningModels = await ollamaClient.fetchRunningModels();
    const runningInfo = runningModels.find((model) => model.name === modelId) || {};

    const completeData = buildCompleteData(modelId, prompt, benchmarkResult, modelInfo, runningInfo);

    // Persister directement en base (pas de fetch relatif possible côté serveur)
    let id: number | null = null;
    try {
      id = saveResult(completeData);
    } catch (saveErr) {
      console.error('Échec de l’enregistrement du résultat:', saveErr);
    }

    // Décharger la VRAM une fois la mesure terminée
    emit('Déchargement du modèle de la VRAM…');
    const unloaded = await ollamaClient.unloadModel(modelId);
    emit('Terminé.');

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
