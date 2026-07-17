// Client Ollama pour communiquer avec l'API Ollama
import type { OllamaModel, RunningModel, BenchmarkRawResult } from './types';

// window peut porter un drapeau de mode test en environnement navigateur.
declare global {
  interface Window {
    __TEST_MODE__?: boolean;
  }
}

// Côté Node (undici), fetch impose un timeout d'en-têtes par défaut (~300s).
// Ollama en stream:false n'envoie ses en-têtes qu'une fois la génération finie :
// un modèle lent au chargement à froid dépasse ce délai → UND_ERR_HEADERS_TIMEOUT.
// On fournit un dispatcher undici sans timeout pour les appels /api/generate côté
// serveur. Dans le navigateur, l'option dispatcher est simplement absente.
//
// IMPORTANT : le fetch ET l'Agent doivent venir du MÊME undici. Le fetch global de
// Node utilise l'undici *bundlé* (v7) ; lui passer un Agent issu de l'undici
// *installé* (v8) fait rejeter son handler par assertRequestHandler → erreur
// `invalid onRequestStart method`. On importe donc aussi le fetch d'undici v8.
type FetchLike = typeof fetch;
let serverFetchPromise:
  | Promise<{ fetchImpl: FetchLike; options: RequestInit }>
  | undefined;

async function resolveFetch(): Promise<{ fetchImpl: FetchLike; options: RequestInit }> {
  // Navigateur : fetch global, pas de dispatcher.
  if (typeof window !== 'undefined') return { fetchImpl: fetch, options: {} };
  if (!serverFetchPromise) {
    serverFetchPromise = import('undici').then(({ fetch: undiciFetch, Agent }) => ({
      fetchImpl: undiciFetch as unknown as FetchLike,
      // `dispatcher` n'existe pas dans le type RequestInit standard : cast requis.
      options: {
        dispatcher: new Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 0 })
      } as RequestInit
    }));
  }
  return serverFetchPromise;
}

export const ollamaClient = {
  // Récupérer la liste des modèles disponibles
  async fetchModels(): Promise<OllamaModel[]> {
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
      return (data.models as OllamaModel[]) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles:', error);
      throw error;
    }
  },

  // Récupérer les détails d'un modèle spécifique
  async fetchModelDetails(modelName: string): Promise<Record<string, unknown>> {
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

  // Le modèle supporte-t-il le raisonnement (thinking) ?
  // /api/show renvoie un tableau `capabilities` contenant 'thinking' pour les
  // modèles raisonneurs. Activer think:true sur un modèle qui ne le supporte
  // pas fait échouer /api/generate — d'où cette vérification préalable.
  async supportsThinking(modelName: string): Promise<boolean> {
    try {
      const details = await this.fetchModelDetails(modelName);
      const caps = details.capabilities;
      return Array.isArray(caps) && caps.includes('thinking');
    } catch {
      return false;
    }
  },

  // Récupérer les modèles actuellement chargés en mémoire (VRAM, contexte)
  async fetchRunningModels(): Promise<RunningModel[]> {
    try {
      const response = await fetch('http://localhost:11434/api/ps');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return (data.models as RunningModel[]) || [];
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
  async warmup(modelId: string, signal?: AbortSignal): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.__TEST_MODE__) {
        return true;
      }

      const { fetchImpl, options } = await resolveFetch();
      const response = await fetchImpl('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          prompt: 'Hi !',
          stream: false
        }),
        signal,
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return true;
    } catch (error) {
      // Une annulation doit remonter pour interrompre le benchmark.
      if (error instanceof Error && error.name === 'AbortError') throw error;
      // Un warmup raté ne doit pas casser le flux de benchmark.
      console.error('Erreur lors du préchauffage du modèle:', error);
      return false;
    }
  },

  async runBenchmark(
    modelId: string,
    prompt = 'Réponds par un mot unique : test',
    signal?: AbortSignal,
    // Appelé à chaque token reçu : (chunk, texte accumulé). Optionnel.
    onToken?: (chunk: string, full: string) => void,
    // Activer le raisonnement (think) — uniquement pour les modèles raisonneurs.
    think = false,
    // Appelé à chaque bribe de raisonnement : (chunk, raisonnement accumulé).
    onThinking?: (chunk: string, full: string) => void
  ): Promise<BenchmarkRawResult> {
    try {
      const startTime = Date.now();

      const { fetchImpl, options } = await resolveFetch();
      const response = await fetchImpl('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          prompt,
          // Streaming : Ollama renvoie du NDJSON (une ligne JSON par token),
          // ce qui permet d'afficher la génération en direct. La dernière ligne
          // (done:true) porte les métriques finales.
          stream: true,
          // think:true fait renvoyer un champ `thinking` par ligne NDJSON.
          // N'activer que si le modèle le supporte (sinon Ollama renvoie 400).
          ...(think ? { think: true } : {})
        }),
        signal,
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (!response.body) {
        throw new Error('Réponse Ollama sans corps (streaming indisponible)');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let fullThinking = '';
      // Dernier objet parsé (contient les métriques quand done:true).
      let final: Record<string, unknown> = {};

      // Traite une ligne NDJSON complète.
      const handleLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let obj: Record<string, unknown>;
        try {
          obj = JSON.parse(trimmed);
        } catch {
          return; // ligne partielle/illisible : ignorée
        }
        final = obj;
        // Raisonnement (modèles raisonneurs) : arrive avant/en plus de `response`.
        const thinkChunk = typeof obj.thinking === 'string' ? obj.thinking : '';
        if (thinkChunk) {
          fullThinking += thinkChunk;
          if (onThinking) onThinking(thinkChunk, fullThinking);
        }
        const chunk = typeof obj.response === 'string' ? obj.response : '';
        if (chunk) {
          fullResponse += chunk;
          if (onToken) onToken(chunk, fullResponse);
        }
      };

      // Lecture du flux : découpe par sauts de ligne.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          handleLine(line);
        }
      }
      // Reliquat éventuel sans saut de ligne final.
      if (buffer.trim()) handleLine(buffer);

      const endTime = Date.now();

      return {
        modelId,
        duration: endTime - startTime, // temps total mesuré côté client, en ms
        response: fullResponse,
        thinking: fullThinking || undefined,
        // Métriques renvoyées par Ollama (durées en nanosecondes)
        totalDuration: final.total_duration as number | undefined,
        loadDuration: final.load_duration as number | undefined,
        promptEvalCount: final.prompt_eval_count as number | undefined,
        promptEvalDuration: final.prompt_eval_duration as number | undefined,
        evalCount: final.eval_count as number | undefined,
        evalDuration: final.eval_duration as number | undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors du benchmark:', error);
      throw error;
    }
  },

  // Décharger un modèle de la VRAM.
  // Ollama libère la mémoire quand keep_alive vaut 0 sur /api/generate.
  async unloadModel(modelId: string): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.__TEST_MODE__) {
        return true;
      }

      const { fetchImpl, options } = await resolveFetch();
      const response = await fetchImpl('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          keep_alive: 0
        }),
        ...options
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
