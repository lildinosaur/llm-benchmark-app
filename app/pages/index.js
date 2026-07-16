import React from 'react';
import ModelList from '../components/ModelList';

export default function Home() {
  return (
    <div className="home-page">
      <h1>Benchmark des Modèles LLM</h1>
      <p>Sélectionnez un modèle pour commencer le benchmark</p>
      <ModelList />
    </div>
  );
}