// GET /api/benchmark/status
// Retourne le run courant (ou null). Le client polle cet endpoint pour suivre
// la progression et récupérer les résultats, y compris après un refresh.
import type { NextApiRequest, NextApiResponse } from 'next';
import { getRun } from '../../../app/lib/benchmarkStore';
import type { BenchmarkRun } from '../../../app/lib/types';

interface StatusResponse {
  run?: BenchmarkRun | null;
  error?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }
  return res.status(200).json({ run: getRun() });
}
