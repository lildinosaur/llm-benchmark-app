import React from 'react';
import type { CompleteData, StoredResult } from '../lib/types';

interface BenchmarkResultProps {
  data?: Partial<CompleteData> | StoredResult | null;
}

const BenchmarkResult = ({ data }: BenchmarkResultProps) => {
  // Fonction pour convertir les octets en Goctets avec 2 décimales
  const formatToGB = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined || bytes === 0) return 'N/A';
    const gb = bytes / (1024 ** 3);
    return gb.toFixed(2) + ' Go';
  };

  // Vérification sécurisée des données
  const modelInfo = data && data.modelInfo ? data.modelInfo : ({} as Partial<CompleteData['modelInfo']>);
  const responseTime = data && data.responseTime ? data.responseTime : 'N/A';
  const prompt = data && data.prompt ? data.prompt : 'N/A';
  const date = data && data.date ? data.date : 'N/A';
  const contextLength = data && data.contextLength ? data.contextLength : 'N/A';
  const loadTime = data && data.loadTime ? data.loadTime : 'N/A';
  const generationSpeed = data && data.generationSpeed ? data.generationSpeed : 'N/A';
  const overallScore = data && data.overallScore ? data.overallScore : 'N/A';
  const promptTokens = data && data.promptTokens ? data.promptTokens : 'N/A';
  const promptEvalTime = data && data.promptEvalTime ? data.promptEvalTime : 'N/A';
  const promptEvalSpeed = data && data.promptEvalSpeed ? data.promptEvalSpeed : 'N/A';
  const generatedTokens = data && data.generatedTokens ? data.generatedTokens : 'N/A';
  const generationTime = data && data.generationTime ? data.generationTime : 'N/A';
  const modelResponse = data && data.response ? data.response : null;

  // Bargraphe du panneau LCD : gamme auto (multiple de 60 au-dessus de la vitesse)
  const speedValue = parseFloat(String(generationSpeed));
  const barRange = Number.isFinite(speedValue)
    ? Math.max(120, Math.ceil(speedValue / 60) * 60)
    : 120;
  const barWidth = Number.isFinite(speedValue)
    ? Math.min(100, (speedValue / barRange) * 100)
    : 0;

  return (
    <div className="benchmark-result">
      {/* Panneau de lecture principal */}
      <div className="readout">
        <div className="readout-head">
          <span className="readout-label">Mesure</span>
          <span className="readout-model">{modelInfo.modelName || 'N/A'}</span>
        </div>
        <div className="lcd">
          <div className="lcd-main">
            <span className="lcd-value">
              {typeof responseTime === 'number' ? responseTime.toLocaleString('fr-FR') : responseTime}
            </span>
            <span className="lcd-unit">ms</span>
          </div>
          <div className="lcd-sub">temps de réponse total</div>
          <div className="lcd-bar" role="img" aria-label={`Vitesse de génération : ${generationSpeed} tokens par seconde`}>
            <div className="lcd-bar-fill" style={{ width: `${barWidth}%` }} />
          </div>
          <div className="lcd-bar-legend">
            <span>{generationSpeed} tokens/s</span>
            <span>0–{barRange}</span>
          </div>
        </div>
      </div>

      {/* Section Informations du modèle */}
      <section className="panel-section model-info-section">
        <h3 className="section-title">Informations du modèle</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Modèle</span>
            <span className="info-value">{modelInfo.modelName || 'N/A'}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Taille sur disque</span>
            <span className="info-value">{formatToGB(modelInfo.diskSize)}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Mémoire VRAM utilisée</span>
            <span className="info-value">{formatToGB(modelInfo.vramUsage)}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Longueur du contexte</span>
            <span className="info-value">{contextLength}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Date</span>
            <span className="info-value">{date}</span>
          </div>

          <div className="info-item info-item--wide">
            <span className="info-label">Prompt utilisé</span>
            <span className="info-value">{prompt}</span>
          </div>
        </div>
      </section>

      {/* Détails du benchmark */}
      <section className="panel-section benchmark-details">
        <h3 className="section-title">Détails du benchmark</h3>
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Temps de chargement</span>
            <span className="metric-value">{loadTime} s</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Tokens du prompt</span>
            <span className="metric-value">{promptTokens}</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Évaluation du prompt</span>
            <span className="metric-value">{promptEvalTime} s</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Vitesse éval. du prompt</span>
            <span className="metric-value">{promptEvalSpeed} tokens/s</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Tokens générés</span>
            <span className="metric-value">{generatedTokens}</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Durée de génération</span>
            <span className="metric-value">{generationTime} s</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Vitesse de génération</span>
            <span className="metric-value">{generationSpeed} tokens/s</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Score global</span>
            <span className="metric-value">{overallScore}</span>
          </div>
        </div>
      </section>

      {/* Réponse du modèle */}
      {modelResponse && (
        <section className="model-response-section">
          <h3 className="section-title">Réponse du modèle</h3>
          <div className="output-console">
            {modelResponse.split('\n').map((line, index, lines) => (
              <React.Fragment key={index}>
                {line}
                {index < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BenchmarkResult;
