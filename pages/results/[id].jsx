import React from 'react';
import Head from 'next/head';
import BenchmarkResult from '../../app/components/BenchmarkResult';
import { getResultById } from '../../app/lib/db';

// Affiche un résultat déjà enregistré, sans relancer le modèle.
export default function SavedResultPage({ data, modelId }) {
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
        </div>
      </header>

      <main className="workspace">
        <div className="saved-banner">
          Résultat archivé — aucun modèle chargé en mémoire.
        </div>
        <BenchmarkResult data={data} />
        <div style={{ marginTop: '24px' }}>
          <a href="/" className="btn">← Retour à la liste des modèles</a>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const id = parseInt(params.id, 10);
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
}
