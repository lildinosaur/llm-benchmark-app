// POST /api/benchmark/cancel
// Annule le run en cours (interrompt la requête Ollama en vol et stoppe la
// série). Le modèle courant est déchargé de la VRAM par le runner.
import type { NextApiRequest, NextApiResponse } from 'next';
import { cancelRun, getRun } from '../../../app/lib/benchmarkStore';
import type { BenchmarkRun } from '../../../app/lib/types';

interface CancelResponse {
  cancelled?: boolean;
  run?: BenchmarkRun | null;
  error?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<CancelResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }
  const cancelled = cancelRun();
  return res.status(200).json({ cancelled, run: getRun() });
}
