// Types partagés de l'application de benchmark.

// Modèle renvoyé par /api/tags d'Ollama.
export interface OllamaModel {
  name: string;
  size?: number;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Modèle chargé en mémoire, renvoyé par /api/ps d'Ollama.
export interface RunningModel {
  name: string;
  size_vram?: number;
  context_length?: number;
  [key: string]: unknown;
}

// Résultat brut d'un run Ollama (durées en nanosecondes côté Ollama).
export interface BenchmarkRawResult {
  modelId: string;
  duration: number; // temps total mesuré côté client, en ms
  response?: string;
  thinking?: string; // texte de raisonnement (modèles raisonneurs), streamé
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  promptEvalDuration?: number;
  evalCount?: number;
  evalDuration?: number;
  timestamp: string;
}

// Infos modèle attachées au résultat complet.
export interface ModelInfo {
  modelName: string;
  diskSize?: number;
  vramUsage: number;
}

// Résultat complet, prêt pour l'affichage et la persistance.
// Étend le résultat brut avec les métriques dérivées (chaînes formatées).
export interface CompleteData extends Partial<BenchmarkRawResult> {
  modelInfo: ModelInfo;
  responseTime: number;
  loadTime: string | null;
  generationSpeed: string | null;
  overallScore: string | null;
  promptTokens: number | null;
  promptEvalTime: string | null;
  promptEvalSpeed: string | null;
  generatedTokens: number | null;
  generationTime: string | null;
  prompt: string;
  date: string;
  contextLength: number | string;
}

// Résultat hydraté depuis SQLite (données + id/date DB).
export interface StoredResult extends CompleteData {
  id: number;
  savedAt?: string;
}

// Statut d'un run de benchmark côté serveur.
export type RunStatus = 'running' | 'done' | 'cancelled' | 'error';

// Résultat par modèle dans un run.
export interface RunModelResult {
  model: string;
  ok: boolean;
  id?: number | null;
  error?: string;
  completeData?: CompleteData;
}

// Run de benchmark suivi dans le store serveur.
export interface BenchmarkRun {
  runId: string;
  status: RunStatus;
  prompt: string;
  models: string[];
  currentModel: string | null;
  progress: { done: number; total: number };
  results: RunModelResult[];
  startedAt: string;
  finishedAt: string | null;
  error?: string;
  logs?: string[];       // lignes d'événements chronologiques (phases du test)
  liveOutput?: string;   // texte streamé du modèle en cours de mesure
  liveThinking?: string; // raisonnement streamé du modèle en cours de mesure
}
