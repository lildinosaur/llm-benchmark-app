// Store en mémoire du run de benchmark en cours, vivant dans le PROCESS
// serveur de Next.js. C'est ce qui permet à un test de continuer même si le
// navigateur rafraîchit ou se ferme : l'exécution ne dépend plus du client.
//
// Un seul run actif à la fois (contrainte VRAM : un modèle chargé à la fois).
// L'état est accroché à `globalThis` pour survivre au hot-reload en dev et
// être partagé entre toutes les requêtes API en prod (`next start`, mono-process).
// Un redémarrage du serveur vide le run en cours (les résultats déjà terminés
// restent en SQLite) — compromis accepté.
import { ollamaClient } from './ollamaClient';
import { runFullBenchmarkServer } from './serverBenchmark';
import type { BenchmarkRun } from './types';

interface StoreState {
  run: BenchmarkRun | null;
  controller: AbortController | null;
  seq: number;
}

// globalThis typé pour porter le store entre les requêtes / le HMR.
const globalStore = globalThis as typeof globalThis & {
  __benchmarkStore?: StoreState;
};

const store: StoreState = globalStore.__benchmarkStore || (globalStore.__benchmarkStore = {
  run: null,          // run courant, ou null
  controller: null,   // AbortController du run courant
  seq: 0              // compteur pour générer des runId
});

// Retourne le run courant (ou null). Objet directement sérialisable en JSON
// pour la route /api/benchmark/status.
export function getRun(): BenchmarkRun | null {
  return store.run;
}

// Démarre un run sur la liste de modèles fournie.
// Refuse si un run est déjà en cours -> { alreadyRunning: true, run }.
// Sinon lance l'exécution en fire-and-forget -> { run }.
export function startRun(
  { models, prompt }: { models: string[]; prompt: string }
): { alreadyRunning?: boolean; run: BenchmarkRun } {
  if (store.run && store.run.status === 'running') {
    return { alreadyRunning: true, run: store.run };
  }

  const run: BenchmarkRun = {
    runId: `run_${Date.now()}_${++store.seq}`,
    status: 'running',
    prompt,
    models: [...models],
    currentModel: null,
    progress: { done: 0, total: models.length },
    results: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    logs: [],
    liveOutput: '',
    liveThinking: ''
  };

  const controller = new AbortController();
  store.run = run;
  store.controller = controller;

  // Fire-and-forget : ne PAS await, la requête HTTP retourne tout de suite.
  execute(run, controller).catch((err: unknown) => {
    run.status = 'error';
    run.error = err instanceof Error ? err.message : String(err);
    run.currentModel = null;
    run.finishedAt = new Date().toISOString();
  });

  return { run };
}

// Boucle séquentielle : chaque modèle est mesuré puis déchargé avant le suivant.
async function execute(run: BenchmarkRun, controller: AbortController): Promise<void> {
  for (const model of run.models) {
    if (controller.signal.aborted) {
      run.status = 'cancelled';
      break;
    }
    run.currentModel = model;
    run.liveOutput = '';   // réinitialiser la sortie streamée pour le nouveau modèle
    run.liveThinking = ''; // idem pour le raisonnement streamé
    const pushLog = (line: string) => {
      const t = new Date().toLocaleTimeString('fr-FR');
      (run.logs ??= []).push(`[${t}] ${model} · ${line}`);
    };
    try {
      const { completeData, id } = await runFullBenchmarkServer(model, run.prompt, {
        signal: controller.signal,
        onEvent: pushLog,
        onToken: (_chunk, full) => {
          run.liveOutput = full;
        },
        onThinking: (_chunk, full) => {
          run.liveThinking = full;
        }
      });
      run.results.push({ model, ok: true, id, completeData });
    } catch (err: unknown) {
      // Annulation → on stoppe la série (VRAM déjà déchargée par le runner)
      const cancelled = (err as { cancelled?: boolean })?.cancelled;
      if (cancelled || controller.signal.aborted) {
        run.status = 'cancelled';
        break;
      }
      // Un échec sur un modèle n'interrompt pas la série
      run.results.push({
        model,
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
    run.progress.done += 1;
  }

  run.currentModel = null;
  if (run.status === 'running') run.status = 'done';
  run.finishedAt = new Date().toISOString();
}

// Annule le run en cours (interrompt la requête Ollama en vol et empêche le
// passage au modèle suivant). Retourne true si un run était en cours.
export function cancelRun(): boolean {
  if (store.run && store.run.status === 'running') {
    store.controller?.abort();
    return true;
  }
  return false;
}

// Liste des modèles installés (utilisée par /api/benchmark/run quand le client
// ne fournit pas de liste explicite).
export async function fetchAllModelNames(): Promise<string[]> {
  const models = await ollamaClient.fetchModels();
  return models.map((m) => m.name);
}
