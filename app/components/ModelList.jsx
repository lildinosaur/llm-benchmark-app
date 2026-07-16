import React, { useState, useEffect } from 'react';
import { ollamaClient } from '../lib/ollamaClient';

const DEFAULT_PROMPT = 'Réponds par un mot unique : test';
const PROMPT_STORAGE_KEY = 'benchmarkTestPrompt';

// Convertir les octets en gigaoctets lisibles
const formatToGB = (bytes) => {
  if (!bytes) return null;
  return (bytes / (1024 ** 3)).toFixed(1) + ' Go';
};

export default function ModelList() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testPrompt, setTestPrompt] = useState(DEFAULT_PROMPT);

  // Restaurer le prompt sauvegardé (lecture dans useEffect pour éviter
  // un décalage d'hydratation entre serveur et client)
  useEffect(() => {
    const savedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (savedPrompt) {
      setTestPrompt(savedPrompt);
    }
  }, []);

  const handlePromptChange = (e) => {
    setTestPrompt(e.target.value);
    localStorage.setItem(PROMPT_STORAGE_KEY, e.target.value);
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        const fetchedModels = await ollamaClient.fetchModels();
        setModels(fetchedModels);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  if (loading) return (
    <div className="state-panel model-list">
      <div className="scan-track"><div className="scan-bar" /></div>
      <p>Chargement des modèles...</p>
    </div>
  );

  if (error) return (
    <div className="error-panel model-list">
      <h3>Erreur lors du chargement</h3>
      <p>{error}</p>
      <p>Assurez-vous que Ollama est en cours d'exécution.</p>
    </div>
  );

  if (models.length === 0) {
    return (
      <div className="state-panel model-list">
        <h2>Aucun modèle disponible</h2>
        <p>Aucun modèle n'a été trouvé. Vérifiez que Ollama est en cours d'exécution et que des modèles sont téléchargés.</p>
      </div>
    );
  }

  return (
    <div className="model-list">
      <section className="prompt-console">
        <label htmlFor="testPrompt" className="console-label">
          Prompt de test
        </label>
        <textarea
          id="testPrompt"
          value={testPrompt}
          onChange={handlePromptChange}
          rows={3}
          className="prompt-input"
          placeholder="Entrez le prompt à utiliser pour le benchmark..."
        />
        <p className="console-hint">
          Ce prompt sera utilisé pour tous les benchmarks. Il sera conservé entre les tests.
        </p>
      </section>

      <h2 className="section-title">Modèles disponibles · {models.length}</h2>

      <ul>
        {models.map((model) => (
          <li key={model.name} className="model-item">
            <a
              href={`/benchmark/${encodeURIComponent(model.name)}?prompt=${encodeURIComponent(testPrompt)}`}
              className="model-link"
            >
              <span className="model-name">{model.name}</span>
              <span className="model-meta">
                {model.details && model.details.parameter_size && (
                  <span className="meta-chip">{model.details.parameter_size}</span>
                )}
                {model.details && model.details.quantization_level && (
                  <span className="meta-chip">{model.details.quantization_level}</span>
                )}
                {formatToGB(model.size) && (
                  <span className="meta-size">{formatToGB(model.size)}</span>
                )}
              </span>
              <span className="model-go">Mesurer</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
