// GET  /api/results            -> dernier résultat par modèle
// GET  /api/results?model=xxx  -> historique d'un modèle
// POST /api/results            -> enregistre un résultat (body = objet benchmark)
import { saveResult, getLatestPerModel, getResultsByModel } from '../../../app/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { model } = req.query;
    const results = model ? getResultsByModel(model) : getLatestPerModel();
    return res.status(200).json({ results });
  }

  if (req.method === 'POST') {
    const result = req.body;
    if (!result || (!result.modelId && !result.modelInfo)) {
      return res.status(400).json({ error: 'Résultat de benchmark invalide' });
    }
    const id = saveResult(result);
    return res.status(201).json({ id });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
}
