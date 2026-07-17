// GET  /api/results            -> dernier résultat par modèle
// GET  /api/results?model=xxx  -> historique d'un modèle
// POST /api/results            -> enregistre un résultat (body = objet benchmark)
import type { NextApiRequest, NextApiResponse } from 'next';
import { saveResult, getLatestPerModel, getResultsByModel } from '../../../app/lib/db';
import type { CompleteData, StoredResult } from '../../../app/lib/types';

interface ResultsResponse {
  results?: StoredResult[];
  id?: number;
  error?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResultsResponse>
) {
  if (req.method === 'GET') {
    const { model } = req.query;
    const modelId = Array.isArray(model) ? model[0] : model;
    const results = modelId ? getResultsByModel(modelId) : getLatestPerModel();
    return res.status(200).json({ results });
  }

  if (req.method === 'POST') {
    const result = req.body as CompleteData | undefined;
    if (!result || (!result.modelId && !result.modelInfo)) {
      return res.status(400).json({ error: 'Résultat de benchmark invalide' });
    }
    const id = saveResult(result);
    return res.status(201).json({ id });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
}
