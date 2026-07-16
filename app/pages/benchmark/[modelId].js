import React from 'react';
import BenchmarkResult from '../../components/BenchmarkResult';

export default function BenchmarkPage({ params }) {
  const { modelId } = params;

  return (
    <div className="benchmark-page">
      <h1>Benchmark du modèle: {modelId}</h1>
      <BenchmarkResult modelId={modelId} />
      <div className="navigation">
        <a href="/" className="back-link">← Retour à la liste des modèles</a>
      </div>
    </div>
  );
}