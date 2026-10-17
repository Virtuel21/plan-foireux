# Plan Foireux

Un musée, un trésor, un agent infiltré. Un petit jeu de braquage et de bluff entre amis, directement dans le navigateur.

**[Jouer](https://virtuel21.github.io/plan-foireux/?v=0.2)** · Prototype 0.2

## Jouer

1. Choisissez un pseudo. Lancez une partie avec les bots, ou créez un salon et copiez l'invitation.
2. Dans chaque salle, négociez vos postes puis verrouillez un choix secret parmi six : poste A, poste B, vol, fouille, réparation ou couverture.
3. Un poste rapporte 3 ; les voleurs se partagent 18 (+1 alarme et −8 au sac). Un poste incomplet ajoute 2 alarmes. À 6, la police entre. Réparer retire 2 alarmes ; couvrir peut sauver un poste.
4. Cliquez les objets du musée et manipulez le cadre, les tiroirs ou la statue pour trouver une enveloppe. Lire son chiffre privé consomme votre action. La première découverte rapporte 6 au total ; un indice encore inconnu de vous rapporte 2. Refouiller un indice déjà connu ne rapporte rien. Vous pouvez annoncer un faux chiffre ou garder le silence.
5. Regardez les promesses rompues, les gains et les dégâts pendant la révélation, puis validez le récapitulatif. Votez pour éjecter un suspect, ou passez. Il faut la majorité absolue. Le rôle de l'éjecté est révélé et son argent est retiré.
6. Composez les trois chiffres sur le clavier du coffre. Un mauvais code ne l'ouvre pas. Un échec accorde une seule seconde tentative après le débat et le vote. Le forcer coûte +2 alarme et −18 au sac ; l'ouvrir rapporte 48 au sac commun. Fuyez ensuite : le plus riche des braqueurs survivants gagne. Tous les gains restent provisoires jusqu'à la fuite.

L'agent FBI gagne en faisant monter l'alarme à 6 sans être éjecté, en restant seul face à un braqueur, ou si le groupe fuit sans trésor alors qu'il est encore actif. Une fuite sans trésor ni agent actif ne donne aucun gagnant. Il dispose des mêmes gestes que les autres, peut mentir sur ses indices et se cacher parmi les gourmands. Le jeu comprend quatre salles et une fuite. Jusqu'à 6 humains ; des bots complètent l'équipe jusqu'à 4 participants. Ils peuvent soupçonner un voleur chronique et lui disputer le butin.

## Développer

Node 22 est utilisé en CI.

```sh
npm ci
npm run dev
npm test
npm run build
```

`src/engine.ts` contient les règles déterministes, `session.ts` les salons PeerJS/WebRTC, `scene.ts` le musée Three.js, et `main.ts` l'interface. Le GLB est généré par `art/build_character.py` avec Blender, et son fichier source `art/burglar.blend` est inclus. Le modèle commun se recolore via la matière `Cloth`. L'attente, la marche et le travail utilisent les pivots du même modèle.

```sh
blender --background --python art/build_character.py
```

## Connexion et limites du prototype

Les invités communiquent directement avec l'hôte via WebRTC. Le service public PeerServer sert à la signalisation ; aucun serveur de jeu ni compte n'est requis. Certains réseaux restreints nécessitent un relais TURN qui n'est pas fourni par cette version. L'hôte doit garder sa page ouverte. Il n'y a pas encore de migration d'hôte ni de reprise après son rechargement.

Un invité peut recharger son onglet pour reprendre son siège dans le même salon (jeton dans `sessionStorage`). Après 20 secondes d'absence, un bot prend ses décisions en attendant son retour. Le jeton n'est pas placé dans les liens d'invitation. Aucun rôle des autres joueurs ni choix secret n'est transmis aux invités avant la révélation. L'hôte reste une autorité de confiance et peut techniquement lire l'état complet : ce prototype ne prétend pas fournir une protection compétitive contre un hôte modifié.

Le mode solo fonctionne sans service réseau une fois les fichiers chargés. Les polices Google ont des polices de secours. Le jeu contient des sons synthétisés, désactivables, et respecte la préférence de réduction des animations.

## Direction et suite

Voir [le brief final](docs/BRIEF.md), [la direction artistique](docs/DESIGN.md), [les sources des ressources](docs/ASSETS.md) et [les vérifications effectuées](docs/VALIDATION.md).

Le rendu est une première interprétation jouable du concept : modèle original simplifié, matériaux PBR, ombres et objets modulaires. Le concept ImageGen n'est pas un modèle 3D. Les expressions, la finesse des vêtements, les gestes spécialisés, les animations du gardien et l'équilibrage humain restent à approfondir.
