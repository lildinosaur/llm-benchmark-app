# Plan d'Implémentation Technique

## 1. Contexte et Objectifs

### 1.1 Statut : terminé ✅

Ce plan décrit l'implémentation de l'application de benchmark des modèles LLM locaux avec Ollama, conformément aux spécifications du fichier `_specs/benchmark-llm-models.md`.

L'objectif est de créer une application web qui permet :
- D'afficher les modèles LLM disponibles localement
- De sélectionner un modèle pour exécuter un benchmark
- D'afficher les résultats (temps de réponse) du benchmark
- De passer facilement d'un modèle à l'autre

### 1.2 Stack Technologique
- Frontend : Next.js (React)
- Backend : Next.js API Routes
- Communication avec Ollama : API REST via fetch
- Gestion des états : React useState/useEffect
- Styles : Tailwind CSS ou CSS modules

## 2. Structure du Projet

### 2.1 Statut : terminé ✅

### 2.2 Architecture générale
```
app/
├── components/
│   ├── ModelList.jsx
│   ├── BenchmarkResult.jsx
│   └── NavigationButtons.jsx
├── pages/
│   ├── index.js (écran d'accueil)
│   └── benchmark/[modelId].js (écran de benchmark)
├── lib/
│   └── ollamaClient.js (client pour communiquer avec Ollama)
└── styles/
    └── globals.css
```

## 3. Implémentation des Fonctionnalités

### 3.1 Statut 

#### Phase 1 : Configuration de base et structure du projet
**Objectif :** Mettre en place la structure de base avec Next.js et les dépendances nécessaires.

- Créer un nouveau projet Next.js
- Installer les dépendances nécessaires (react, react-dom, next)
- Configurer Tailwind CSS ou un autre framework de styles
- Créer les dossiers principaux : components/, pages/, lib/, styles/
- Mettre en place le fichier de configuration principal

#### Phase 2 : Client Ollama
**Objectif :** Créer un client pour communiquer avec l'API Ollama.

- Créer `lib/ollamaClient.js`
- Implémenter la fonction `fetchModels()` pour récupérer la liste des modèles
- Implémenter la fonction `runBenchmark(modelId)` pour exécuter un benchmark sur un modèle
- Gérer les erreurs de connexion et les timeouts
- Test unitaire du client Ollama

✅ Implémenté

#### Phase 3 : Composants Frontend - Liste des modèles
**Objectif :** Afficher la liste des modèles disponibles.

- Créer `components/ModelList.jsx`
- Implémenter un composant qui affiche la liste des modèles récupérés via le client Ollama
- Ajouter des boutons pour sélectionner chaque modèle
- Gérer les états de chargement et d'erreur

✅ Implémenté

#### Phase 4 : Page d'accueil
**Objectif :** Créer l'écran d'accueil avec la liste des modèles.

- Créer `pages/index.js`
- Intégrer le composant ModelList
- Ajouter la logique pour afficher les modèles récupérés depuis Ollama
- Mettre en place une navigation vers la page de benchmark

✅ Implémenté

#### Phase 5 : Composants Frontend - Résultats du benchmark
**Objectif :** Afficher les résultats du benchmark.

- Créer `components/BenchmarkResult.jsx`
- Implémenter un composant qui affiche les résultats (temps, performance)
- Afficher les détails du modèle testé
- Ajouter des informations sur la durée d'exécution

✅ Implémenté

#### Phase 6 : Page de benchmark
**Objectif :** Créer l'écran de benchmark avec résultats.

- Créer `pages/benchmark/[modelId].js`
- Récupérer le modelId depuis les paramètres URL
- Exécuter le benchmark sur le modèle spécifié
- Afficher les résultats via le composant BenchmarkResult
- Mettre en place la navigation vers le modèle suivant


#### Phase 7 : Navigation entre modèles
**Objectif :** Permettre de passer facilement d'un modèle à l'autre.

- Créer `components/NavigationButtons.jsx`
- Implémenter des boutons "Suivant" et "Précédent"
- Mettre en place la logique pour naviguer entre les modèles
- Gérer le cas où on est au premier ou dernier modèle

✅ Implémenté

#### Phase 8 : Gestion des erreurs et améliorations
**Objectif :** Améliorer l'expérience utilisateur avec une gestion d'erreurs robuste.

- Ajouter un affichage clair des erreurs réseau
- Gérer les cas où aucun modèle n'est disponible
- Améliorer l'affichage des résultats (formatage, graphiques simples)
- Ajouter des messages de chargement pendant les opérations

✅ Implémenté

#### Phase 9 : Tests et validation
**Objectif :** Valider le fonctionnement complet de l'application.

- Écrire des tests unitaires pour les composants clés
- Tester l'intégration avec Ollama (simuler ou utiliser un environnement réel)
- Vérifier la navigation entre modèles
- Effectuer des tests d'interface utilisateur

## 4. Détails Techniques

### 4.1 Client Ollama - `lib/ollamaClient.js`

```javascript
// Exemple de structure du client Ollama
export const ollamaClient = {
  // Récupérer la liste des modèles disponibles
  async fetchModels() {
    try {
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

  // Exécuter un benchmark sur un modèle
  async runBenchmark(modelId) {
    try {
      const startTime = Date.now();
      
      // Exemple d'appel à Ollama pour exécuter une commande de test
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          prompt: 'Réponds par un mot unique : test',
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
        duration: endTime - startTime, // temps en ms
        response: data.response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors du benchmark:', error);
      throw error;
    }
  }
};
```

### 4.2 Composant ModelList - `components/ModelList.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { ollamaClient } from '../lib/ollamaClient';

export default function ModelList() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <div>Chargement des modèles...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div className="model-list">
      <h2>Modèles disponibles</h2>
      <ul>
        {models.map((model) => (
          <li key={model.name}>
            <a href={`/benchmark/${model.name}`}>
              {model.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4.3 Page d'accueil - `pages/index.js`

```javascript
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
```

## 5. Tests et Validation

### 5.1 Statut : terminé ✅

- Tests unitaires pour les composants React
- Tests d'intégration avec l'API Ollama (en utilisant des mocks)
- Tests end-to-end pour l'interface utilisateur complète
- Validation de la navigation entre modèles
- Tests de gestion des erreurs (connexion perdue, aucun modèle disponible)

✅ Implémenté

## 6. Déploiement et Maintenance

### 6.1 Statut : terminé ✅

- Documentation de déploiement
- Instructions pour exécuter l'application avec Ollama
- Configuration pour l'environnement de développement
- Considérations de performance et optimisation

✅ Implémenté

## 7. Résumé des Étapes

### 7.1 Statut : à faire

1. Configuration du projet Next.js
2. Création du client Ollama
3. Développement des composants frontend
4. Implémentation des pages d'accueil et de benchmark
5. Intégration de la navigation entre modèles
6. Tests et validation
7. Documentation et déploiement

## 8. Ressources Nécessaires

### 8.1 Statut : à faire

- Environnement local avec Ollama installé
- Node.js et npm/yarn
- Développement avec Next.js
- Accès à internet pour les dépendances