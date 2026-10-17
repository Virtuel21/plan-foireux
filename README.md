# Plan Foireux

Tous complices, chacun pour soi. Un jeu de braquage et de coups bas pour 4 à 6 joueurs, avec un agent du FBI caché dans la bande.

**[Jouer](https://virtuel21.github.io/plan-foireux/?v=0.4)** · Prototype 0.4

## Une seule décision par coup

- **Braquer : +4 pièces**, une personne de plus au travail, −1 alarme.
- **Coup fourré :** une seule offre visible, soit **rafler 8 pièces**, **faire les poches** d'un rival (jusqu'à 5 pièces), soit **le faire trébucher** (jusqu'à 4 pièces et annule son travail et son salaire). Touche un portrait pour changer de victime. Chaque coup fourré ajoute 1 alarme et ne compte pas comme travail.

Il faut au moins la moitié de la bande au travail, arrondie au supérieur. Sinon, on force le passage : +2 alarmes. À **10 alarmes**, la police saisit tous les sacs et le FBI gagne. Après **neuf coups**, le braqueur le plus riche gagne. Les pièces sont personnelles ; il n'y a pas de caisse commune ni de partage final.

Les actions restent secrètes jusqu'à la révélation. Les messages « Je braque », « À l'aide » et « Je te surveille » ne t'engagent à rien : tu peux mentir. Le chat écrit reste accessible, sans vocal et sans ouvrir de menu. Le vocal n'est pas encore intégré.

Après les coups 3 et 6, un vote à majorité absolue permet de contrôler un badge. Si c'est le FBI, la bande fuit immédiatement et le braqueur le plus riche gagne. Un innocent identifié garde sa place et ses pièces. Personne n'est éliminé en cours de partie. Le FBI dispose des mêmes actions que les braqueurs.

La révélation affiche la victime, les gains nets signés et les pièces dans la scène. Les portraits des auteurs de coups fourrés clignotent en rouge ; ce signal n'est pas une preuve qu'ils sont FBI. Tous les rôles, dont le portrait de l'infiltré, sont dévoilés à la fin.

## Démarrer

Choisis ton pseudo puis joue avec les bots, ou crée un salon et partage son lien. Les bots complètent la bande. Sur mobile, tourne le téléphone en paysage. Le portrait bloque les interactions ; le verrouillage d'orientation dépend du navigateur.

Objectif de rythme : **8 à 12 minutes**. Le budget maximal d'un casse de neuf coups est de **11 min 23** : 55 s de choix, 12 s de révélation, deux contrôles de 40 s. Les joueurs prêts peuvent accélérer ; une arrestation ou un FBI démasqué écourte la partie. Le rythme et l'équilibrage demandent encore des essais entre humains.

## Développer

```sh
npm ci
npm run dev
npm test
npm run build
```

Node 22 en CI. Le jeu courant se trouve dans `src/v4/` : moteur pur, session PeerJS, présentation et interface. `scene-view.ts` adapte uniquement les données publiques au musée Three.js partagé dans `src/scene.ts`. Les anciennes règles de `src/engine.ts`, l'inspection et l'ancienne interface sont conservées comme historique ; elles ne sont pas un mode proposé aux joueurs. Les tests historiques restent exécutés en plus des tests du moteur et de la session 0.4.

`?qa` en développement local charge des boutons de scénarios pour vérifier les écrans et interactions sans attendre les délais. Ils sont désactivés dans un salon réseau et absents du bundle de production. Un scénario préparé n'est pas un match joué avec les règles et le temps normaux.

Le personnage commun se recolore via `Cloth`. Sources reproductibles : `art/burglar.blend` et `art/build_character.py`. Les déplacements, le vol, le croche-pied et la chute utilisent les pivots du même modèle ; les pièces volées circulent entre les personnages.

## Réseau et limites

Les invités communiquent directement avec l'hôte en WebRTC. PeerServer sert à la signalisation. Aucun compte n'est requis. Certains réseaux nécessitent un relais TURN non fourni ici. L'hôte doit garder sa page ouverte ; pas de migration d'hôte ni de reprise après son rechargement.

Un invité peut recharger son onglet et retrouver son siège et son choix caché grâce à un jeton en `sessionStorage`, absent du lien d'invitation. Après 20 secondes d'absence, les bots peuvent reprendre ses décisions. Seule la projection explicite `publicView` est transmise : identité du destinataire, son offre et son choix ; les rôles et actions des autres restent privés jusqu'aux révélations prévues. L'hôte reste une autorité de confiance qui peut lire l'état complet.

Le solo ne dépend pas d'un service réseau après chargement. Sons synthétisés désactivables, polices de secours, navigation clavier et réduction des animations. Les essais sur appareil physique, Safari et réseau mobile restent distincts des émulations navigateur.

Voir [l'audit et les décisions 0.4](docs/AUDIT_V4.md), [le brief](docs/BRIEF.md), [la direction artistique](docs/DESIGN.md), [les ressources](docs/ASSETS.md) et [les vérifications exécutées](docs/VALIDATION.md).
