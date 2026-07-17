import React from 'react';
import Head from 'next/head';
import ModelList from '../app/components/ModelList';
import ThemeToggle from '../app/components/ThemeToggle';

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
          <ThemeToggle />
        </div>
      </header>

      <main className="workspace">
        <div style={{ marginBottom: '20px' }}>
          <a href="/dashboard" className="btn">Tableau comparatif →</a>
        </div>
        <ModelList />
      </main>
    </div>
  );
}
