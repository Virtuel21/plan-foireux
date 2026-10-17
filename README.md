# Plan Foireux

Un musée, un trésor, un agent infiltré. Un petit jeu de braquage et de bluff entre amis, directement dans le navigateur.

**[Jouer](https://virtuel21.github.io/plan-foireux/?v=0.3)** · Prototype 0.3

## Jouer

1. Choisissez un pseudo. Lancez une partie avec les bots, ou créez un salon et copiez l'invitation.
2. Annoncez publiquement l'un des deux postes : les cartes montrent le gain de 3 pièces et les personnes encore nécessaires. « Fouiller ou aider autrement » donne accès aux autres intentions.
3. Choisissez ensuite en secret entre tenir votre promesse et trahir pour voler. Les cartes et le récapitulatif séparent le gain personnel de l'effet sur l'équipe. Les voleurs se partagent 18 : 18 seul, 9 à deux, 6 à trois. Le vol ajoute 1 alarme et retire 8 au sac commun ; abandonner un poste encore incomplet ajoute 2 alarmes. À 6, la police entre. Les autres plans restent accessibles : réparer rapporte 1 et retire 2 alarmes ; couvrir peut sauver un poste et partager une prime de 6.
4. Pour fouiller, choisissez un objet puis engagez votre action : vous ne pourrez plus voler ou changer de poste dans cette salle. Faites pivoter le cadre, le bureau ou la statue en 3D, avec un glissement, les flèches du clavier ou les boutons de rotation. Cherchez le chiffre écrit sur l'une de ses six faces, parmi douze emplacements possibles. La correspondance entre objets et chiffres du code ainsi que le placement changent selon la graine de la partie. Le chiffre est privé. La première découverte rapporte 6 au total ; un indice encore inconnu de vous rapporte 2. Refouiller un indice déjà connu ne rapporte rien. Une fouille non terminée avant la fin du délai ne donne ni chiffre au carnet ni prime. Vous pouvez ensuite annoncer un faux chiffre ou garder le silence.
5. Pendant la révélation, les avatars des voleurs et de ceux qui ont rompu leur promesse sont signalés en rouge. Les gains apparaissent dans le décor avec une pièce d'or et restent dans le récapitulatif. Votez ensuite pour éjecter un suspect, ou passez. Il faut la majorité absolue. Le rôle de l'éjecté est révélé et son argent est retiré.
6. Composez les trois chiffres sur le clavier du coffre. Un mauvais code ne l'ouvre pas. Un échec accorde une seule seconde tentative après le débat et le vote. Le forcer coûte +2 alarme et −18 au sac ; l'ouvrir rapporte 48 au sac commun. Fuyez ensuite : le plus riche des braqueurs survivants gagne. Tous les gains restent provisoires jusqu'à la fuite.

L'agent FBI gagne en faisant monter l'alarme à 6 sans être éjecté, en restant seul face à un braqueur, ou si le groupe fuit sans trésor alors qu'il est encore actif. Une fuite sans trésor ni agent actif ne donne aucun gagnant. Il dispose des mêmes gestes que les autres, peut mentir sur ses indices et se cacher parmi les gourmands. Le jeu comprend quatre salles et une fuite. Jusqu'à 6 humains ; des bots complètent l'équipe jusqu'à 4 participants. Ils peuvent soupçonner un voleur chronique et lui disputer le butin.

La fin de partie révèle les rôles et affiche une grande carte avec le nom et le portrait de l'agent infiltré, y compris lorsque les braqueurs ont réussi à fuir.

Sur mobile, jouez en paysage. En portrait, un écran bloque les interactions et demande de tourner l'appareil. Le bouton de plein écran tente aussi de demander le verrouillage en paysage lorsque le navigateur le permet ; le site ne peut pas garantir ce verrouillage sur tous les systèmes.

## Développer

Node 22 est utilisé en CI.

```sh
npm ci
npm run dev
npm test
npm run build
```

`src/engine.ts` contient les règles déterministes, `session.ts` les salons PeerJS/WebRTC, `scene.ts` le musée Three.js, `inspection.ts` les objets 3D manipulables, `views.ts` les vues et `main.ts` les interactions. Le GLB est généré par `art/build_character.py` avec Blender, et son fichier source `art/burglar.blend` est inclus. Le modèle commun se recolore via la matière `Cloth`. L'attente, la marche et le travail utilisent les pivots du même modèle.

```sh
blender --background --python art/build_character.py
```

## Connexion et limites du prototype

Les invités communiquent directement avec l'hôte via WebRTC. Le service public PeerServer sert à la signalisation ; aucun serveur de jeu ni compte n'est requis. Certains réseaux restreints nécessitent un relais TURN qui n'est pas fourni par cette version. L'hôte doit garder sa page ouverte. Il n'y a pas encore de migration d'hôte ni de reprise après son rechargement.

Un invité peut recharger son onglet pour reprendre son siège dans le même salon (jeton dans `sessionStorage`). Après 20 secondes d'absence, un bot prend ses décisions en attendant son retour. Le jeton n'est pas placé dans les liens d'invitation. Aucun rôle des autres joueurs ni choix secret n'est transmis aux invités avant la révélation. L'hôte reste une autorité de confiance et peut techniquement lire l'état complet : ce prototype ne prétend pas fournir une protection compétitive contre un hôte modifié.

Le mode solo fonctionne sans service réseau une fois les fichiers chargés. Les polices Google ont des polices de secours. Le jeu contient des sons synthétisés, désactivables, et respecte la préférence de réduction des animations.

## Direction et suite

Voir [le brief final](docs/BRIEF.md), [l'interface et le contrat de fouille 0.3](docs/UX_V3.md), [la direction artistique](docs/DESIGN.md), [les sources des ressources](docs/ASSETS.md) et [les vérifications effectuées](docs/VALIDATION.md).

Le rendu est une première interprétation jouable du concept : modèle original simplifié, matériaux PBR, ombres et objets modulaires. Le concept ImageGen n'est pas un modèle 3D. Les expressions, la finesse des vêtements, les gestes spécialisés, les animations du gardien et l'équilibrage humain restent à approfondir.
