import React from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import BenchmarkResult from '../../app/components/BenchmarkResult';
import ThemeToggle from '../../app/components/ThemeToggle';
import { getResultById } from '../../app/lib/db';
import type { StoredResult } from '../../app/lib/types';

interface SavedResultPageProps {
  data: StoredResult;
  modelId: string;
}

// Affiche un résultat déjà enregistré, sans relancer le modèle.
export default function SavedResultPage({ data, modelId }: SavedResultPageProps) {
  return (
    <div className="app-shell">
      <Head>
        <title>{`Résultat — ${modelId}`}</title>
      </Head>

      <header className="faceplate">
        <div className="faceplate-inner">
          <h1 className="brand">
            <span className="power-dot" aria-hidden="true" />
            Résultat enregistré
          </h1>
          <p className="model-tag">{modelId}</p>
          <ThemeToggle />
        </div>
      </header>

      <main className="workspace">
        <div className="saved-banner">
          Résultat archivé — aucun modèle chargé en mémoire.
        </div>
        <BenchmarkResult data={data} />
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <a href={`/history/${encodeURIComponent(modelId)}`} className="btn">← Retour à l'historique</a>
          <a href="/" className="btn">← Retour à la liste des modèles</a>
        </div>
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<SavedResultPageProps> = async ({ params }) => {
  const rawId = params?.id;
  const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId ?? '', 10);
  const data = Number.isInteger(id) ? getResultById(id) : null;

  if (!data) {
    return { notFound: true };
  }

  return {
    props: {
      data,
      modelId: data.modelInfo?.modelName || data.modelId || 'inconnu'
    }
  };
};
