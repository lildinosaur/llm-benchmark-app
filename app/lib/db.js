// Accès SQLite local pour persister les résultats de benchmark.
// Module serveur uniquement (utilisé dans les routes API Next.js).
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

let db;

// Initialise (une seule fois) la connexion et le schéma.
function getDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(path.join(dataDir, 'benchmarks.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id        TEXT    NOT NULL,
      prompt          TEXT,
      response_time   INTEGER,
      generation_speed REAL,
      overall_score   REAL,
      created_at      TEXT    NOT NULL,
      data            TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_results_model ON results (model_id);
  `);

  return db;
}

// Enregistre un résultat complet de benchmark. Retourne l'id inséré.
export function saveResult(result) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO results
      (model_id, prompt, response_time, generation_speed, overall_score, created_at, data)
    VALUES
      (@model_id, @prompt, @response_time, @generation_speed, @overall_score, @created_at, @data)
  `);

  const info = stmt.run({
    model_id: result.modelId || result.modelInfo?.modelName || 'unknown',
    prompt: result.prompt ?? null,
    response_time: Number.isFinite(result.responseTime) ? result.responseTime : null,
    generation_speed: result.generationSpeed != null ? parseFloat(result.generationSpeed) : null,
    overall_score: result.overallScore != null ? parseFloat(result.overallScore) : null,
    created_at: result.timestamp || new Date().toISOString(),
    data: JSON.stringify(result)
  });

  return info.lastInsertRowid;
}

// Reconstruit une ligne DB en objet résultat (avec l'id et la date DB).
function hydrate(row) {
  if (!row) return null;
  const data = JSON.parse(row.data);
  return { ...data, id: row.id, savedAt: row.created_at };
}

// Dernier résultat enregistré pour chaque modèle (pour la page principale).
export function getLatestPerModel() {
  const database = getDb();
  const rows = database.prepare(`
    SELECT r.* FROM results r
    JOIN (SELECT model_id, MAX(id) AS mid FROM results GROUP BY model_id) latest
      ON r.id = latest.mid
    ORDER BY r.created_at DESC
  `).all();
  return rows.map(hydrate);
}

// Un résultat précis par id.
export function getResultById(id) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM results WHERE id = ?').get(id);
  return hydrate(row);
}

// Historique complet d'un modèle (plus récent d'abord).
export function getResultsByModel(modelId) {
  const database = getDb();
  const rows = database.prepare(
    'SELECT * FROM results WHERE model_id = ? ORDER BY id DESC'
  ).all(modelId);
  return rows.map(hydrate);
}
