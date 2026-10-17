# Validation v1 — 17 octobre 2026

Ces résultats distinguent exécution automatique, observation visuelle et limites non testées. La précision finale de Julien est appliquée : l’autorité réseau fonctionne dans le navigateur de l’hôte, sans serveur de jeu personnel.

## Règles et compilation exécutées

- `npm test` : **32 tests passent**. Ils couvrent les cinq tours, les plafonds, l’alarme simultanée, la priorité de la police, les 12 pièces, les vols croisés et multiples, l’unicité des résolutions, les votes et abstentions, les deux surveillances, leur expiration, les secrets, les délais, la reconnexion et les quatre mini-jeux.
- L’exemple numérique complet du brief est reproduit : coffre 8, alarme 4, fin à 34/28/32 pour les braqueurs et faux portefeuille FBI à 26. Tous les braqueurs gagnent, un seul titre supplémentaire dans ce scénario.
- `npm run build` : TypeScript et Vite passent. `npm run format:check` passe. Les vérifications des empreintes des 30 ressources du manifeste passent.
- Les sources Blender ont été exécutées : musée, export mobile du personnage partagé et outil de perceuse. Les GLB sont effectivement chargés dans Chrome.

## Navigateur et interface

Onze parcours Chrome ont été exécutés avec succès via Playwright, sur la version locale de production. Les six formats : **1440×900, 844×390, 740×360, 667×375, 390×844 et 320×740**.

Les vérifications mesurent les sept repères du musée : cibles d’au moins 44×44 pixels CSS, absence de recouvrement, maintien dans le viewport, absence de débordement horizontal, sélection visible et gain affiché. Les contrôles paysage utilisent les safe areas et des lignes d’ancrage qui dégagent les modèles. Les quatre épreuves ont été terminées par leurs vrais contrôles. Un parcours tactile supplémentaire utilise de vrais événements de contact Chrome : maintenir/relâcher réussit la perceuse et le sac, puis des taps réussissent les trois goupilles. Les câbles sont validés au clic, au glisser, au clavier, et par taps pendant le test réseau. La préférence de mouvement réduit et la restitution du focus après une boîte de dialogue sont vérifiées.

Une observation visuelle a été réalisée sur les captures du salon, des choix, des quatre épreuves et de la révélation. Les polices sont locales. Contrastes mesurés des couples principaux : texte/surface 11,75:1 ; texte secondaire/surface 8,16:1 ; bouton principal 9,78:1 ; texte des marqueurs 10,45:1.

## Quatre navigateurs WebRTC, hôte local

Le test `tests/browser/network.spec.ts` a réellement lancé quatre contextes Chrome reliés au service de signalisation PeerJS et à des canaux WebRTC directs. Le parcours vérifie :

1. Création chez l’hôte, invitation et quatre humains prêts avant lancement.
2. Promesses publiques, puis changement privé du poste d’un invité, sans changement de sa promesse chez l’hôte.
3. Début des câbles, envoi d’un branchement, départ puis retour de l’invité avec le même jeton. Pause commune, reprise de la même épreuve et gain seulement à la révélation.
4. Rechargement de l’hôte, restauration de ses rôles en local et reconnexion des trois invités. La pause se lève et le bilan reste conservé.

Les tests purs vérifient également que les vues invité ne contiennent jamais les tableaux de rôles, choix, votes, brouillages ou progressions des autres. Le navigateur hôte reste techniquement capable d’inspecter son état complet : c’est la limite du modèle demandé.

## Partie complète, délais réels

`node scripts/qa-full-match.mjs` a exécuté une partie avec trois bots en Chrome, viewport 844×390 avec tactile émulé. Les sélections utilisent des taps ; les épreuves sont commandées au clavier ou par taps. Aucun état interne ni résultat n’est injecté. Les délais sont réels.

La partie dure **441,295 secondes**, soit **7 min 21 s** depuis le lancement jusqu’au résultat, hors lecture des règles et temps de salon. Elle comporte les cinq tours et les quatre débats. Les trois braqueurs s’échappent ; Julien finit à 38, Léa et Max à 34, Sarah est révélée FBI et son portefeuille est exclu. Aucune erreur JavaScript n’a été relevée. La preuve structurée est `docs/evidence/solo-full-match.json`. Un premier parcours complet séparé avait également abouti en 441,243 secondes.

## Rendu et limites

La scène au repos compte 87 928 triangles ; une perceuse ajoute 1 468 triangles par foreur, soit un plafond de 93 800 avec quatre outils. L’observation de la révélation avec un outil relève 89 396 triangles et 140 appels de dessin. Ces mesures de bureau ne prouvent pas 30 FPS sur un téléphone réel.

**Non exécutés :** téléphone physique, Safari/iOS, tests entre quatre réseaux domestiques distincts ou derrière NAT restrictif, panne longue réelle de 90 s sur appareil, et équilibrage/plaisir de jeu avec plusieurs groupes humains. L’expiration de 90 s et les conséquences sans classement sont vérifiées dans le moteur, pas comme une mesure physique de réseau. Les rechargements de l’invité et de l’hôte ont, eux, été exécutés dans les quatre navigateurs.

Les réseaux qui bloquent WebRTC peuvent demander un relais TURN, non fourni par ce prototype. La signalisation PeerJS doit être joignable pour créer/rejoindre un salon. Il n’y a pas de migration vers un autre hôte si son onglet est fermé définitivement. Aucun taux de victoire humain n’est annoncé.
