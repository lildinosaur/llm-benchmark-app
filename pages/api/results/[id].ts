// GET /api/results/:id -> un résultat précis
import type { NextApiRequest, NextApiResponse } from 'next';
import { getResultById } from '../../../app/lib/db';
import type { StoredResult } from '../../../app/lib/types';

interface ResultResponse {
  result?: StoredResult;
  error?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResultResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = parseInt(rawId ?? '', 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }

  const result = getResultById(id);
  if (!result) {
    return res.status(404).json({ error: 'Résultat introuvable' });
  }

  return res.status(200).json({ result });
}
