# Guide Développeur — Benchmark des Modèles LLM

## Vue d'ensemble technique

Application Next.js 14 (**Pages Router**) sans backend dédié : le navigateur communique **directement** avec l'API REST d'Ollama (`http://localhost:11434`) via `fetch`. Il n'y a ni API Routes ni base de données — l'état vit dans les composants React (`useState`/`useEffect`) et le prompt de test est persisté dans `localStorage`.

Deux écrans :

1. **Accueil** (`/`) — liste les modèles installés et permet d'éditer le prompt de test.
2. **Benchmark** (`/benchmark/[modelId]`) — exécute la mesure au montage de la page et affiche les résultats.

Le style est du CSS personnalisé (`styles/globals.css`, design « instrument de mesure »), sans Tailwind — le plan initial mentionnait Tailwind, mais ce choix a été abandonné au profit de CSS pur avec polices via `next/font`.

## Structure des fichiers

- `pages/_app.jsx` — App Next.js : import des styles globaux et des polices.
- `pages/index.jsx` — page d'accueil ; rend `ModelList` dans la coque visuelle (`app-shell`, `faceplate`).
- `pages/benchmark/[modelId].jsx` — page de benchmark ; orchestre la mesure et rend `BenchmarkResult`. Contient un `getServerSideProps` qui décode le `modelId` de l'URL et lit le prompt en query string.
- `app/lib/ollamaClient.js` — client HTTP vers Ollama : `fetchModels()`, `fetchModelDetails()`, `fetchRunningModels()`, `runBenchmark()`.
- `app/components/ModelList.jsx` — liste des modèles + zone d'édition du prompt (persisté dans `localStorage` sous la clé `benchmarkTestPrompt`).
- `app/components/BenchmarkResult.jsx` — affichage des résultats : panneau LCD (temps total + bargraphe de vitesse), grilles d'informations et de métriques, réponse du modèle.
- `app/components/NavigationButtons.jsx` — boutons précédent/suivant entre modèles. **Actuellement non branché** : aucune page ne l'importe ; la navigation réelle passe par le lien « Retour à la liste ».
- `styles/globals.css` — l'intégralité du style.
- `__tests__/ModelList.test.jsx` — tests unitaires de `ModelList`.

⚠️ `app/pages/` contient d'**anciennes copies non routées** des pages (le routage Next.js utilise `pages/` à la racine). Ne pas les modifier par erreur ; elles sont candidates à la suppression.

## Composants principaux

### `ollamaClient` (`app/lib/ollamaClient.js`)

Objet exportant quatre fonctions asynchrones :

- `fetchModels()` — `GET /api/tags`, retourne `data.models`. Contient un mode test : si `window.__TEST_MODE__` est vrai, retourne trois modèles factices sans appel réseau.
- `fetchModelDetails(modelName)` — `POST /api/show`. **Non utilisée actuellement** ; retourne `{}` en cas d'erreur plutôt que de lever.
- `fetchRunningModels()` — `GET /api/ps`, liste les modèles chargés en mémoire (VRAM, contexte). Retourne `[]` en cas d'erreur : volontairement **non bloquant** pour ne pas faire échouer un benchmark réussi si `/api/ps` est indisponible.
- `runBenchmark(modelId, prompt)` — `POST /api/generate` avec `stream: false`. Retourne à la fois une durée mesurée côté client (`duration`, en ms, via `Date.now()`) et les métriques natives d'Ollama (`total_duration`, `load_duration`, `prompt_eval_count`, `prompt_eval_duration`, `eval_count`, `eval_duration`), **toutes les durées Ollama étant en nanosecondes**.

### `ModelList` (`app/components/ModelList.jsx`)

Charge les modèles au montage et gère quatre états : chargement, erreur, liste vide, liste remplie. Le prompt de test est initialisé à la valeur par défaut puis restauré depuis `localStorage` **dans un `useEffect`** — et non à l'initialisation du `useState` — pour éviter un décalage d'hydratation entre le rendu serveur et le rendu client.

Chaque modèle est un lien vers `/benchmark/<nom>?prompt=<prompt>`, les deux valeurs passées par `encodeURIComponent` (les noms de modèles Ollama contiennent souvent `:`, ex. `llama3:8b`).

### `BenchmarkPage` (`pages/benchmark/[modelId].jsx`)

Orchestre la mesure dans un `useEffect` en trois appels séquentiels :

1. `fetchModels()` pour retrouver la taille sur disque du modèle testé ;
2. `runBenchmark(modelId, prompt)` — la mesure proprement dite ;
3. `fetchRunningModels()` **après** le benchmark, car c'est l'exécution qui charge le modèle en mémoire ; on y lit `size_vram` et `context_length`.

Elle convertit ensuite les nanosecondes d'Ollama en valeurs affichables : ms pour le temps total, secondes pour les durées, tokens/s pour les vitesses (`evalCount / (evalDuration / 1e9)`). Le « score global » est `evalCount / (totalDuration / 1e9)` : une vitesse de génération pénalisée par le temps de chargement.

`getServerSideProps` fournit `modelId` (décodé via `decodeURIComponent`) et le prompt (query string, avec repli sur le prompt par défaut « Réponds par un mot unique : test »).

### `BenchmarkResult` (`app/components/BenchmarkResult.jsx`)

Composant de présentation pur. Chaque champ est lu défensivement avec repli sur `'N/A'` — le composant ne plante jamais sur des données partielles. Le bargraphe LCD calcule sa gamme automatiquement : le prochain multiple de 60 au-dessus de la vitesse mesurée, avec un minimum de 120, pour que la barre reste lisible quel que soit le modèle.

## Flux de données

```
Accueil (/)                        Benchmark (/benchmark/[modelId])
────────────────                   ─────────────────────────────────
fetchModels()  ──► ModelList       getServerSideProps : modelId + prompt (query)
                      │                        │
   prompt (textarea ⇄ localStorage)            ▼
                      │            useEffect :
                      ▼              1. fetchModels()        → taille disque
   lien /benchmark/<id>?prompt=…     2. runBenchmark()       → métriques Ollama (ns)
                                     3. fetchRunningModels() → VRAM, contexte
                                               │
                                    conversion ns → ms / s / tokens/s
                                               ▼
                                       BenchmarkResult (affichage)
```

Le prompt circule ainsi : `textarea` → `localStorage` (persistance) → query string du lien → `getServerSideProps` → prop de page → `runBenchmark`.

## Décisions techniques

- **Appels Ollama directs depuis le navigateur** (pas d'API Routes) : plus simple pour une application strictement locale ; fonctionne car Ollama et le navigateur sont sur la même machine (pas de problème CORS avec localhost dans ce contexte). Contrepartie : l'URL d'Ollama est codée en dur côté client.
- **Métriques natives d'Ollama plutôt que chronométrage client** : `total_duration`, `eval_count`, etc. sont mesurés par Ollama lui-même et bien plus précis que `Date.now()` autour du `fetch`. Le chronométrage client (`duration`) est conservé en secours si `total_duration` est absent.
- **`stream: false`** : la réponse arrive en un bloc avec toutes les métriques finales ; le streaming compliquerait la mesure sans bénéfice pour un benchmark.
- **Prompt en query string + localStorage** plutôt qu'un état global (context/store) : évite toute librairie d'état ; le prompt survit au rechargement et reste visible dans l'URL (reproductibilité d'une mesure).
- **`/api/ps` interrogé après le benchmark** : les informations VRAM/contexte n'existent que pour un modèle chargé ; c'est le benchmark qui provoque le chargement.

## Points d'attention pour la maintenance

- **URL Ollama en dur** (`http://localhost:11434`) répétée dans chaque fonction de `ollamaClient.js`. Pour la rendre configurable, la centraliser dans une constante ou une variable d'environnement `NEXT_PUBLIC_*`.
- **Unités hétérogènes** : durées Ollama en **nanosecondes**, `duration` client en **millisecondes**, affichages en ms ou s. Toute nouvelle métrique doit préciser son unité ; les conversions sont concentrées dans `pages/benchmark/[modelId].jsx`.
- **Code mort** : `NavigationButtons.jsx` et `fetchModelDetails()` ne sont référencés nulle part ; `app/pages/` contient d'anciennes copies non routées. À brancher ou supprimer.
- **Pas de timeout sur les `fetch`** : un modèle très lent laisse la page en chargement indéfiniment (comportement assumé, mais à connaître).
- **`window.__TEST_MODE__`** dans `fetchModels()` : une branche de test dans le code de production ; si vous refactorez le client, préférez un mock Jest.
- **Ne jamais lancer un second `next dev` en parallèle** du serveur de l'utilisateur sur ce projet : le répertoire `.next` partagé se corrompt. Réutiliser le serveur existant sur le port 3000.

## Tests

- Emplacement : `__tests__/ModelList.test.jsx` (Jest + React Testing Library, environnement jsdom).
- Exécution : `npm test`.
- Couverture : les quatre états de `ModelList` — chargement initial, liste chargée, erreur réseau, aucun modèle.

⚠️ Bug connu : le test mocke `jest.mock('../lib/ollamaClient', …)` alors que le composant importe `../app/lib/ollamaClient`. Le mock ne s'applique donc pas au bon module ; à corriger en alignant le chemin (`../app/lib/ollamaClient`).

Non couvert à ce jour : `ollamaClient` lui-même, `BenchmarkResult`, la page de benchmark et les conversions d'unités (bonnes candidates à des tests unitaires purs).
