# Audit et refonte 0.4 — moins de règles, plus de personnes à embêter

## Brief retenu

Julien veut des parties de 8 à 12 minutes, jouables sans vocal ; un vocal pourra être ajouté ensuite. Les seuls invariants de jeu sont des braqueurs qui cherchent à sortir les plus riches, un FBI qui veut faire rater le braquage sans être démasqué, et des situations de chaos/trahison. Cette correction remplace les contraintes antérieures de fouille, de code et d'annonce publique.

## Diagnostic sur 0.3

- Une décision est demandée deux fois : annoncer son poste, puis confirmer en secret. Le premier écran ressemble à une action, mais n'en exécute aucune.
- Six actions restent dans le moteur. Deux cartes principales cachent encore les autres dans un second niveau : la hiérarchie ne supprime pas la complexité.
- Il faut suivre salaire, vol partagé, prime de première fouille, sac commun, perte de 8, partage final et alarme. Le montant sur une carte ne suffit pas à expliquer le résultat.
- Deux besoins de postes, couverture et réparation obligent à déduire un plan collectif avant de pouvoir agir.
- La fouille est un second jeu : choisir une cache, engager une action, tourner l'objet, mémoriser un chiffre, ouvrir le carnet, annoncer, composer au coffre. Elle interrompt la compétition pour l'argent.
- Un changement pour aider peut être signalé comme une promesse rompue. Le signal rouge mélange mensonge, vol et intention de sabotage.
- Les votes à chaque salle répètent une procédure et peuvent retirer un joueur pendant plusieurs minutes. Sans vocal, le jeu fournit trop peu de moyens simples de négocier.
- Les coups contre les autres sont surtout indirects. On abandonne un poste ; on ne choisit pas vraiment une victime. La scène illustre un calcul plutôt qu'une interaction sociale.

Les tests 0.3 prouvaient le fonctionnement technique, pas la compréhension par un nouveau joueur. Les retours successifs de Julien invalident l'hypothèse selon laquelle une autre mise en page suffirait.

## Boucle 0.4 retenue

Neuf coups, une monnaie personnelle, une alarme collective. À chaque coup, deux cartes, toujours sur le même écran :

- **Braquer : +4**, aide le passage et retire 1 alarme.
- **Un coup fourré :** soit rafler 8 pièces, soit faire les poches d'un rival (jusqu'à 5), soit le faire trébucher (jusqu'à 4 et empêche son travail). Le coup proposé est visible directement ; il n'y a ni collection de cartes, ni inventaire, ni sous-menu. Une cible se choisit en touchant son portrait.

Il faut au moins la moitié de l'équipe au travail, arrondie au supérieur. Sinon le groupe force le passage : +2 alarmes. Chaque coup fourré ajoute 1 alarme. À 10, la police entre ; si le FBI n'a pas été démasqué, il gagne. Après le neuvième coup, le groupe s'enfuit et le braqueur le plus riche gagne. Aucune caisse commune à partager, aucun salaire fractionnaire.

Après les coups 3 et 6, un contrôle court permet de désigner un suspect. Une majorité absolue démasquant le FBI fait sortir immédiatement les braqueurs avec leurs gains. Un innocent est identifié mais continue à jouer ; il n'est ni éliminé ni dépouillé par un vote. Le leader veut sécuriser sa fortune ; un retardataire peut vouloir prolonger le casse. Il n'y a pas de bouton de sabotage réservé au FBI qui le désignerait automatiquement.

Le premier coup propose seulement travail ou rafle, pour apprendre le rapport argent/danger. Les coups ciblés arrivent ensuite. Les offres suivantes sont réparties équitablement et déterminées par une graine. Les choix restent privés jusqu'à la révélation. Les vols simultanés ne peuvent pas créer d'argent ni dépendre de l'ordre d'arrivée réseau.

## Communication et rythme

Messages rapides non contraignants (« Je braque », « Besoin d'aide », « Je te surveille »), bulles au-dessus des avatars et discussion écrite sur le même écran. Le joueur peut donc promettre, mentir et accuser sans ouvrir un autre parcours.

Budget d'une partie allant au bout : 9 choix de 55 secondes, 9 révélations de 12 secondes, 2 contrôles de 40 secondes, soit 11 min 23 hors accueil. Un accord de tous les joueurs peut accélérer ; une capture du FBI ou l'arrivée de la police peut terminer avant. La durée réellement observée doit être mesurée séparément de ce budget.

## Interface et références

Conserver le musée cartoon, le modèle recoloré, les portraits expressifs et les pièces d'or. Remplacer la page à faire défiler par un plateau de jeu occupant l'écran : danger en haut, personnages et interactions au centre, deux grandes cartes en bas, portraits et communication toujours accessibles. Pas de longue fenêtre de règles au départ. Le rôle tient en une phrase, et chaque nouveauté est expliquée au moment où elle sert.

Palette : nuit #102737, crème #fff0cf, or #ffb321, vert d'aide #247e65, rouge de risque #b74032. Barlow Condensed pour actions/montants, Nunito Sans pour les courtes consignes. Les couleurs accompagnent un nombre, une icône et un verbe. Le rouge signale le coup fourré, pas une preuve d'appartenance au FBI.

Sources primaires consultées le 17 octobre 2026 :

- [Apple — Onboarding for Games](https://developer.apple.com/app-store/onboarding-for-games/) : apprendre une étape à la fois, par l'action, et différer les éléments non essentiels. Application ici : premier coup simple, pas d'inventaire ni de manuel avant le jeu.
- [Ca$h'n Guns — Repos Production](https://www.rprod.com/fr/games/cashn-guns-second-edition) : concurrence autour du butin et arbitrage simple entre risque et récompense. Nous en retenons la lisibilité du dilemme, pas les règles de tir.
- [Galèrapagos — Gigamic](https://www.gigamic.com/jeux-star/454-galerapagos-3421271815211.html) : coopération nécessaire et intérêts personnels divergents. Notre transposition garde une seule ressource commune, l'alarme.

Ces applications sont des choix de conception ; aucune source ne prouve que cette nouvelle version sera amusante. Les critères à éprouver entre humains : expliquer son choix en une phrase, reconnaître sa victime et son gain, comprendre pourquoi l'alarme bouge, et vouloir rejouer après une mauvaise surprise.
