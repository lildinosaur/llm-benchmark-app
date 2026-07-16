import React from 'react';
import Head from 'next/head';
import ModelList from '../app/components/ModelList';

export default function Home() {
  return (
    <div className="app-shell">
      <Head>
        <title>Benchmark LLM</title>
      </Head>

      <header className="faceplate">
        <div className="faceplate-inner">
          <h1 className="brand">
            <span className="power-dot" aria-hidden="true" />
            Benchmark LLM
          </h1>
          <p className="tagline">Banc d'essai pour vos modèles Ollama locaux</p>
        </div>
      </header>

      <main className="workspace">
        <ModelList />
      </main>
    </div>
  );
}
