// GET /api/results/:id -> un résultat précis
import { getResultById } from '../../../app/lib/db';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }

  const id = parseInt(req.query.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }

  const result = getResultById(id);
  if (!result) {
    return res.status(404).json({ error: 'Résultat introuvable' });
  }

  return res.status(200).json({ result });
}
