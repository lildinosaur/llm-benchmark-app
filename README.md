# Benchmark LLM

Banc d'essai pour vos modèles LLM locaux installés avec [Ollama](https://ollama.com).

L'application liste les modèles présents sur votre machine, exécute un benchmark sur celui de votre choix et affiche ses performances. Vous passez ensuite au modèle suivant d'un simple clic, ce qui permet de comparer facilement vos modèles et d'identifier les plus rapides.

## Fonctionnalités

- **Liste des modèles locaux** : détection automatique des modèles installés via l'API Ollama (`/api/tags`).
- **Benchmark à la demande** : exécution d'un prompt de test (personnalisable) sur le modèle sélectionné.
- **Métriques détaillées** :
  - durée totale de génération ;
  - vitesse de génération (tokens/s) ;
  - temps et vitesse d'évaluation du prompt ;
  - nombre de tokens (prompt et réponse).
- **Navigation séquentielle** : bouton pour enchaîner le benchmark du modèle suivant.
- **Interface « instrument de mesure »** : design sombre inspiré des appareils de mesure, sans framework CSS.

## Prérequis

- [Node.js](https://nodejs.org) 18 ou plus récent
- [Ollama](https://ollama.com) installé et démarré localement (API sur `http://localhost:11434`)
- Au moins un modèle installé, par exemple :

```bash
ollama pull llama3
```

## Installation

```bash
git clone <url-du-depot>
cd LLM_Test2
npm install
```

## Utilisation

Démarrer le serveur de développement :

```bash
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000) :

1. La page d'accueil affiche vos modèles Ollama locaux.
2. Cliquez sur un modèle pour lancer son benchmark.
3. Consultez les résultats (vitesse, tokens, durées).
4. Passez au modèle suivant pour comparer.

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm test` | Tests unitaires (Jest + Testing Library) |

## Stack technique

- [Next.js](https://nextjs.org) 14 (Pages Router) — frontend et backend
- [React](https://react.dev) 18
- CSS personnalisé (`styles/globals.css`), polices via `next/font`
- [Jest](https://jestjs.io) et [React Testing Library](https://testing-library.com) pour les tests

## Structure du projet

```
├── pages/                  # Routes Next.js
│   ├── index.jsx           # Accueil : liste des modèles
│   └── benchmark/
│       └── [modelId].jsx   # Page de benchmark d'un modèle
├── app/
│   ├── components/         # Composants React (ModelList, BenchmarkResult, …)
│   └── lib/
│       └── ollamaClient.js # Client pour l'API Ollama
├── styles/                 # Styles globaux
├── __tests__/              # Tests unitaires
├── _specs/                 # Spécifications fonctionnelles
└── _plans/                 # Plans d'implémentation
```

## Configuration

L'application communique avec l'instance Ollama locale à l'adresse par défaut `http://localhost:11434`. Assurez-vous qu'Ollama est en cours d'exécution avant de lancer l'application.


