# Plan Foireux

Un musée, un trésor, un agent infiltré. Un petit jeu de braquage et de bluff entre amis, directement dans le navigateur.

**[Jouer](https://virtuel21.github.io/plan-foireux/)** · Prototype 0.1

## Jouer

1. Choisissez un pseudo. Lancez une partie avec les bots, ou créez un salon et copiez l'invitation.
2. Dans chaque salle, annoncez publiquement un poste puis verrouillez votre action secrète. Changer d'avis sera visible à la révélation.
3. Chaque poste assuré rapporte 4 pièces. Les fouilleurs se partagent 12 pièces. Un poste incomplet ajoute 1 alarme ; à 3, la police arrive.
4. Votez pour éjecter un suspect, ou passez. Il faut la majorité absolue. Le rôle de l'éjecté est révélé et son argent est retiré.
5. Retrouvez les trois indices, ouvrez le coffre, puis fuyez. Le plus riche des braqueurs survivants gagne. Tous les gains sont provisoires jusqu'à la fuite.

L'agent FBI gagne en faisant monter l'alarme à 3 sans être éjecté, ou en restant seul face à un braqueur. Le jeu comprend quatre salles et une fuite. Jusqu'à 6 humains ; des bots complètent l'équipe jusqu'à 4 participants.

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
