import React from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { getLatestPerModel } from '../app/lib/db';
import ThemeToggle from '../app/components/ThemeToggle';

// Ligne du tableau comparatif (données aplaties pour l'affichage/export).
interface Row {
  id: number;
  modelId: string;
  modelName: string;
  overallScore: number | null;
  generationSpeed: number | null;
  responseTime: number | null;
  generatedTokens: number | null;
  loadTime: number | null;
  diskSize: string | null;
  date: string;
}

interface DashboardProps {
  rows: Row[];
}

// Formate des octets en Go lisibles.
const formatToGB = (bytes: number | undefined): string | null => {
  if (!bytes) return '—';
  return (bytes / (1024 ** 3)).toFixed(1) + ' Go';
};

// Valeur numérique sûre (pour tri et affichage).
const num = (v: unknown): number | null =>
  v != null && Number.isFinite(parseFloat(String(v))) ? parseFloat(String(v)) : null;

// Colonnes du tableau (en-tête + extracteur), partagées écran / export.
const COLUMNS: { label: string; get: (r: Row, i: number) => string | number | null }[] = [
  { label: 'Rang', get: (r, i) => i + 1 },
  { label: 'Modèle', get: (r) => r.modelName },
  { label: 'Score global', get: (r) => r.overallScore ?? '' },
  { label: 'Vitesse (tok/s)', get: (r) => r.generationSpeed ?? '' },
  { label: 'Temps réponse (ms)', get: (r) => r.responseTime ?? '' },
  { label: 'Tokens générés', get: (r) => r.generatedTokens ?? '' },
  { label: 'Chargement (s)', get: (r) => r.loadTime ?? '' },
  { label: 'Taille disque', get: (r) => r.diskSize },
  { label: 'Date', get: (r) => r.date }
];

// Échappe une valeur pour CSV (séparateur point-virgule, style Excel FR).
const csvCell = (v: unknown): string => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Génère un CSV (ouvrable dans Excel) et déclenche le téléchargement.
const exportCsv = (rows: Row[]): void => {
  const lines = [
    COLUMNS.map((c) => csvCell(c.label)).join(';'),
    ...rows.map((r, i) => COLUMNS.map((c) => csvCell(c.get(r, i))).join(';'))
  ];
  // BOM UTF-8 pour que Excel lise correctement les accents.
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'benchmark-llm.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// Tableau comparatif de tous les modèles benchmarkés.
export default function Dashboard({ rows }: DashboardProps) {
  return (
    <div className="app-shell">
      <Head>
        <title>Tableau comparatif — Benchmark LLM</title>
      </Head>

      <header className="faceplate">
        <div className="faceplate-inner">
          <h1 className="brand">
            <span className="power-dot" aria-hidden="true" />
            Tableau comparatif
          </h1>
          <p className="tagline">Tous les modèles côte à côte</p>
          <ThemeToggle />
        </div>
      </header>

      <main className="workspace">
        <div className="dash-actions">
          <a href="/" className="btn">← Retour à la liste des modèles</a>
          {rows.length > 0 && (
            <button type="button" className="btn" onClick={() => exportCsv(rows)}>
              Exporter en Excel (CSV) ↓
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="state-panel">
            <h2>Aucun résultat</h2>
            <p>Lancez au moins un benchmark pour alimenter le tableau.</p>
          </div>
        ) : (
          <section className="dash-panel">
            <h2 className="section-title">Résultats · {rows.length} modèle(s)</h2>
            <div className="dash-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th className="col-rank">#</th>
                    <th>Modèle</th>
                    <th className="num">Score global</th>
                    <th className="num">Vitesse (tok/s)</th>
                    <th className="num">Temps réponse (ms)</th>
                    <th className="num">Tokens générés</th>
                    <th className="num">Chargement (s)</th>
                    <th className="num">Taille disque</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="col-rank">{i + 1}</td>
                      <td className="col-model">{r.modelName}</td>
                      <td className="num strong">{r.overallScore ?? '—'}</td>
                      <td className="num">{r.generationSpeed ?? '—'}</td>
                      <td className="num">
                        {r.responseTime != null ? r.responseTime.toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="num">{r.generatedTokens ?? '—'}</td>
                      <td className="num">{r.loadTime ?? '—'}</td>
                      <td className="num">{r.diskSize}</td>
                      <td className="col-date">{r.date}</td>
                      <td>
                        <a className="saved-link" href={`/results/${r.id}`}>Détail →</a>
                        {' '}
                        <a className="saved-link" href={`/history/${encodeURIComponent(r.modelId)}`}>Historique →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async () => {
  const results = getLatestPerModel();

  const rows: Row[] = results
    .map((r) => ({
      id: r.id,
      modelId: r.modelId || r.modelInfo?.modelName || 'inconnu',
      modelName: r.modelInfo?.modelName || r.modelId || 'inconnu',
      overallScore: num(r.overallScore),
      generationSpeed: num(r.generationSpeed),
      responseTime: num(r.responseTime),
      generatedTokens: num(r.generatedTokens),
      loadTime: num(r.loadTime),
      diskSize: formatToGB(r.modelInfo?.diskSize),
      date: r.date || r.savedAt || '—'
    }))
    // Meilleur score en premier ; modèles sans score à la fin.
    .sort((a, b) => (b.overallScore ?? -Infinity) - (a.overallScore ?? -Infinity));

  return { props: { rows } };
};
