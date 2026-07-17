// POST /api/benchmark/run
// Body: { prompt?, models? }
//  - models : liste de noms de modèles à mesurer. Si absent, tous les modèles
//             installés (récupérés depuis Ollama côté serveur).
// Démarre l'exécution en arrière-plan dans le process serveur et retourne
// immédiatement l'état du run. Si un run est déjà en cours -> 409.
import type { NextApiRequest, NextApiResponse } from 'next';
import { startRun, fetchAllModelNames } from '../../../app/lib/benchmarkStore';
import type { BenchmarkRun } from '../../../app/lib/types';

const DEFAULT_PROMPT = 'Réponds par un mot unique : test';

interface RunResponse {
  run?: BenchmarkRun;
  alreadyRunning?: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RunResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }

  const { prompt, models } = (req.body || {}) as { prompt?: string; models?: string[] };
  const testPrompt = prompt || DEFAULT_PROMPT;

  let modelNames: string[] | null = Array.isArray(models) ? models.filter(Boolean) : null;
  if (!modelNames || modelNames.length === 0) {
    try {
      modelNames = await fetchAllModelNames();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(502).json({ error: `Impossible de contacter Ollama: ${message}` });
    }
  }

  if (modelNames.length === 0) {
    return res.status(400).json({ error: 'Aucun modèle à tester' });
  }

  const { alreadyRunning, run } = startRun({ models: modelNames, prompt: testPrompt });

  if (alreadyRunning) {
    return res.status(409).json({ alreadyRunning: true, run });
  }

  return res.status(202).json({ run });
}
