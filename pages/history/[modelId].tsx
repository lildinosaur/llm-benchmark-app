import React from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import ThemeToggle from '../../app/components/ThemeToggle';
import { getResultsByModel } from '../../app/lib/db';
import type { StoredResult } from '../../app/lib/types';

interface Row {
  id: number;
  overallScore: string | null;
  generationSpeed: string | null;
  responseTime: number;
  generatedTokens: number | null;
  loadTime: string | null;
  date: string;
}

interface HistoryPageProps {
  modelId: string;
  rows: Row[];
}

// Historique complet des tests d'un modèle (au lieu du seul dernier résultat).
export default function HistoryPage({ modelId, rows }: HistoryPageProps) {
  return (
    <div className="app-shell">
      <Head>
        <title>{`Historique — ${modelId}`}</title>
      </Head>

      <header className="faceplate">
        <div className="faceplate-inner">
          <h1 className="brand">
            <span className="power-dot" aria-hidden="true" />
            Historique des tests
          </h1>
          <p className="model-tag">{modelId}</p>
          <ThemeToggle />
        </div>
      </header>

      <main className="workspace">
        <div className="dash-actions">
          <a href="/" className="btn">← Retour à la liste des modèles</a>
        </div>

        {rows.length === 0 ? (
          <div className="state-panel">
            <h2>Aucun résultat</h2>
            <p>Aucun test enregistré pour ce modèle.</p>
          </div>
        ) : (
          <section className="dash-panel">
            <h2 className="section-title">{rows.length} test(s) enregistré(s)</h2>
            <div className="dash-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Score global</th>
                    <th className="num">Vitesse (tok/s)</th>
                    <th className="num">Temps réponse (ms)</th>
                    <th className="num">Tokens générés</th>
                    <th className="num">Chargement (s)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="row-clickable"
                      onClick={() => { window.location.href = `/results/${r.id}`; }}
                    >
                      <td className="col-date">{r.date}</td>
                      <td className="num strong">{r.overallScore ?? '—'}</td>
                      <td className="num">{r.generationSpeed ?? '—'}</td>
                      <td className="num">{r.responseTime.toLocaleString('fr-FR')}</td>
                      <td className="num">{r.generatedTokens ?? '—'}</td>
                      <td className="num">{r.loadTime ?? '—'}</td>
                      <td>
                        <a className="saved-link" href={`/results/${r.id}`}>Détail →</a>
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

export const getServerSideProps: GetServerSideProps<HistoryPageProps> = async ({ params }) => {
  const rawModelId = params?.modelId;
  const modelId = decodeURIComponent(Array.isArray(rawModelId) ? rawModelId[0] : rawModelId ?? '');

  const results: StoredResult[] = getResultsByModel(modelId);

  const rows: Row[] = results.map((r) => ({
    id: r.id,
    overallScore: r.overallScore,
    generationSpeed: r.generationSpeed,
    responseTime: r.responseTime,
    generatedTokens: r.generatedTokens,
    loadTime: r.loadTime,
    // savedAt (created_at DB, ISO) porte toujours l'heure ; r.date peut n'être qu'une date (anciens résultats).
    date: r.savedAt ? new Date(r.savedAt).toLocaleString('fr-FR') : (r.date || '—')
  }));

  return { props: { modelId, rows } };
};
