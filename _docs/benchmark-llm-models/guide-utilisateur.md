# Guide Utilisateur — Benchmark des Modèles LLM

## Description

L'application **Benchmark LLM** mesure les performances des modèles de langage installés localement avec Ollama. Elle affiche la liste de vos modèles, exécute un test sur celui de votre choix et présente ses résultats (temps de réponse, vitesse de génération, consommation mémoire, etc.).

Elle vous aide à répondre à une question simple : *parmi les modèles installés sur ma machine, lesquels sont les plus rapides ?*

## Prérequis

- **Ollama** installé et en cours d'exécution sur votre machine (API disponible sur `http://localhost:11434`).
- Au moins un modèle téléchargé (par exemple : `ollama pull llama3`).
- L'application démarrée (`npm run dev`), accessible sur [http://localhost:3000](http://localhost:3000).

## Utilisation

### Lancer un benchmark sur un modèle

1. Ouvrez [http://localhost:3000](http://localhost:3000). La page d'accueil affiche la liste de vos modèles Ollama, avec pour chacun sa taille de paramètres, son niveau de quantification et son poids sur disque.
2. (Optionnel) Modifiez le **prompt de test** dans la zone de texte en haut de la page. Par défaut : « Réponds par un mot unique : test ».
3. Cliquez sur le bouton **Mesurer** du modèle à tester.
4. Patientez pendant la mesure. Le premier passage peut être long si le modèle doit d'abord être chargé en mémoire.
5. Consultez les résultats, puis cliquez sur **← Retour à la liste des modèles** pour tester le modèle suivant.

### Personnaliser le prompt de test

Le prompt saisi sur la page d'accueil est utilisé pour tous les benchmarks et **conservé automatiquement** (même après fermeture du navigateur). Pour comparer équitablement vos modèles, utilisez le même prompt pour toute une série de mesures.

### Lire les résultats

Le panneau principal affiche le **temps de réponse total** (en millisecondes) et un bargraphe de la **vitesse de génération** (tokens/s).

**Informations du modèle** :

| Donnée | Signification |
|---|---|
| Taille sur disque | Poids du modèle sur votre disque |
| Mémoire VRAM utilisée | Mémoire vidéo occupée par le modèle une fois chargé |
| Longueur du contexte | Taille de la fenêtre de contexte du modèle chargé |
| Prompt utilisé | Le prompt envoyé pour ce test |

**Détails du benchmark** :

| Métrique | Signification |
|---|---|
| Temps de chargement | Temps pour charger le modèle en mémoire (quasi nul s'il est déjà chargé) |
| Tokens du prompt / Évaluation du prompt | Nombre de tokens du prompt et temps pour les traiter |
| Tokens générés / Durée de génération | Nombre de tokens produits et temps de production |
| Vitesse de génération | Tokens générés par seconde — **l'indicateur clé pour comparer les modèles** |
| Score global | Tokens générés par seconde rapportés à la durée totale (chargement inclus) |

La **réponse du modèle** est affichée en bas de page, ce qui permet de vérifier que le modèle a répondu correctement au prompt.

## Comportements importants

- **Première mesure plus lente** : si le modèle n'est pas encore chargé en mémoire, le temps de chargement s'ajoute au temps total. Pour une mesure représentative de la vitesse pure, relancez le benchmark une seconde fois.
- **Un modèle à la fois** : les benchmarks s'exécutent séquentiellement, un modèle par page. Il n'y a pas de comparaison simultanée.
- **Pas d'historique** : les résultats ne sont pas sauvegardés. Notez-les si vous voulez les comparer.
- **Modèles lents** : un très gros modèle sur une machine modeste peut mettre plusieurs minutes à répondre ; la page reste en « Mesure en cours... » pendant ce temps.

## Messages et erreurs courants

| Message | Signification | Action à prendre |
|---|---|---|
| « Erreur lors du chargement » sur la page d'accueil | L'application n'arrive pas à joindre Ollama | Vérifiez qu'Ollama est démarré (`ollama serve` ou le service système) |
| « Aucun modèle disponible » | Ollama répond mais aucun modèle n'est installé | Téléchargez un modèle : `ollama pull <nom-du-modèle>` |
| « Erreur lors du benchmark » | La requête de génération a échoué (Ollama arrêté, modèle introuvable…) | Vérifiez qu'Ollama tourne et que le modèle existe (`ollama list`) |
| « Mesure en cours... » qui dure longtemps | Le modèle est en cours de chargement ou génère lentement | Patientez ; c'est normal pour les gros modèles au premier passage |
| Valeurs « N/A » dans les résultats | Ollama n'a pas renvoyé cette métrique | Sans gravité ; relancez la mesure si besoin |

## Questions fréquentes

**Q : Quelle métrique utiliser pour comparer mes modèles ?**
R : La **vitesse de génération** (tokens/s) est la plus fiable pour comparer la rapidité brute. Le **temps de réponse total** dépend du chargement du modèle et de la longueur de la réponse.

**Q : Pourquoi le même modèle donne des résultats différents d'une mesure à l'autre ?**
R : La première mesure inclut le chargement du modèle en mémoire. La charge de votre machine influence aussi les résultats. Faites plusieurs mesures et comparez les passages « à chaud ».

**Q : Puis-je tester avec un long prompt ?**
R : Oui, saisissez-le dans la zone « Prompt de test ». Un prompt plus long donne des métriques d'évaluation du prompt plus significatives, mais allonge la mesure.

**Q : L'application fonctionne-t-elle avec un serveur Ollama distant ?**
R : Non, l'adresse `http://localhost:11434` est actuellement fixée dans le code. Seule une instance Ollama locale est prise en charge.
