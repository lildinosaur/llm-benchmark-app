Actuellement, notre application n'effectue pas encore de véritable benchmark avec des mesures de performance.

  Dans une implémentation complète, le benchmark devrait effectuer les actions suivantes :

  1. Envoyer une requête au modèle : Envoyer un prompt (pré-déterminé par défaut ou spécifié par l'utilisateur) au modèle Ollama (avec l'option --verbose)
  2. Mesurer le temps de réponse : Calculer le temps écoulé entre l'envoi et la réception de la réponse
  3. Afficher les résultats : Afficher le temps de réponse, le nombre de tokens, etc.

Le composant BenchmarkResult que nous avons créé n'est pas encore implémenté pour effectuer ces mesures.

Pour que le benchmark soit effectif, il faudrait :
- Implémenter le composant BenchmarkResult qui exécute vraiment les requêtes
- Ajouter des mesures précises comme le temps de réponse, le nombre de tokens, etc.
- Afficher ces résultats de manière claire.
