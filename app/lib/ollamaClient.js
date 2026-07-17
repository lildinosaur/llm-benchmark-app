// Client Ollama pour communiquer avec l'API Ollama
export const ollamaClient = {
  // Récupérer la liste des modèles disponibles
  async fetchModels() {
    try {
      // Dans un environnement de test, on peut utiliser une version mockée
      if (typeof window !== 'undefined' && window.__TEST_MODE__) {
        // Simuler une réponse de test
        return [
          { name: 'llama2', size: 3456789012 },
          { name: 'mistral', size: 4567890123 },
          { name: 'phi3', size: 2345678901 }
        ];
      }

      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles:', error);
      throw error;
    }
  },

  // Récupérer les détails d'un modèle spécifique
  async fetchModelDetails(modelName) {
    try {
      const response = await fetch(`http://localhost:11434/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du modèle:', error);
      // Retourner un objet vide en cas d'erreur
      return {};
    }
  },

  // Récupérer les modèles actuellement chargés en mémoire (VRAM, contexte)
  async fetchRunningModels() {
    try {
      const response = await fetch('http://localhost:11434/api/ps');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles chargés:', error);
      // Ne pas faire échouer le benchmark si /api/ps est indisponible
      return [];
    }
  },

  // Exécuter un benchmark sur un modèle
  // Précharger le modèle en VRAM avec un prompt trivial.
  // Les métriques sont ignorées : seul l'effet de chargement compte,
  // pour que le vrai benchmark mesure l'inférence sans le chargement à froid.
  async warmup(modelId) {
    try {
      if (typeof window !== 'undefined' && window.__TEST_MODE__) {
        return true;
      }

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          prompt: 'Hi !',
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return true;
    } catch (error) {
      // Un warmup raté ne doit pas casser le flux de benchmark.
      console.error('Erreur lors du préchauffage du modèle:', error);
      return false;
    }
  },

  async runBenchmark(modelId, prompt = 'Réponds par un mot unique : test') {
    try {
      const startTime = Date.now();

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          prompt,
          stream: false
        })
      });

      const endTime = Date.now();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        modelId,
        duration: endTime - startTime, // temps total mesuré côté client, en ms
        response: data.response,
        // Métriques renvoyées par Ollama (durées en nanosecondes)
        totalDuration: data.total_duration,
        loadDuration: data.load_duration,
        promptEvalCount: data.prompt_eval_count,
        promptEvalDuration: data.prompt_eval_duration,
        evalCount: data.eval_count,
        evalDuration: data.eval_duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors du benchmark:', error);
      throw error;
    }
  },

  // Décharger un modèle de la VRAM.
  // Ollama libère la mémoire quand keep_alive vaut 0 sur /api/generate.
  async unloadModel(modelId) {
    try {
      if (typeof window !== 'undefined' && window.__TEST_MODE__) {
        return true;
      }

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          keep_alive: 0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return true;
    } catch (error) {
      // Le déchargement ne doit pas faire échouer le flux de benchmark.
      console.error('Erreur lors du déchargement du modèle:', error);
      return false;
    }
  }
};