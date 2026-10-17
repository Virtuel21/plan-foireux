# Plan Foireux 0.3 : comprendre, choisir, voir les conséquences

Correction du 17 octobre 2026 après le retour de Julien. L'économie de [GAMEPLAY_V2.md](GAMEPLAY_V2.md) est conservée. La présentation des décisions, la fouille et la lisibilité de la révélation changent. Ce document décrit l'intention et le contrat de la version ; les parcours effectivement exécutés et leurs limites sont consignés dans [VALIDATION.md](VALIDATION.md).

## Problème et principe de décision

Six cartes de poids comparable obligeaient à comprendre tout le système avant de choisir. La nouvelle hiérarchie place une question concrète au premier plan : quel poste vais-je annoncer, puis vais-je tenir cette promesse ou profiter des autres pour voler ? Les autres aides restent disponibles dans un second niveau.

Le joueur doit voir trois informations avant de valider : son action, son gain potentiel et ce qu'il fait subir ou gagner au groupe. Les récompenses conditionnelles restent présentées comme telles : un poste vaut 3 ; voler peut rapporter 18 seul, 9 à deux ou 6 à trois. Toutes les pièces restent provisoires jusqu'à la fuite.

## Recherche primaire et déductions de conception

Sources consultées le 17 octobre 2026. Les faits ci-dessous proviennent des éditeurs ; les applications à Plan Foireux sont nos déductions et ne constituent pas une validation de l'amusement.

| Référence | Fait vérifié dans la source primaire | Déduction appliquée à Plan Foireux |
| --- | --- | --- |
| [Ca$h'n Guns, Repos Production](https://www.rprod.com/fr/games/cashn-guns-second-edition), [règles françaises, phase Courage et partage du butin](https://cdn.svc.asmodee.net/production-rprod/storage/downloads/games/cashn-guns/cash-rules-fr-1606818711NVqwH.pdf) | Après le choix secret et le braquage, un joueur peut se coucher : il évite la blessure mais renonce au partage. Rester debout conserve une chance de prendre du butin et le risque de subir les tirs. Le survivant le plus riche gagne. | Mettre deux gestes et leurs conséquences en opposition, plutôt qu'une grille d'options équivalentes. Ici : tenir son poste avec un salaire connu, ou prendre un gain supérieur dépendant des autres et mettre le casse en danger. Nous n'importons pas ses règles de tir ou de blessure. |
| [Triple Agent, site officiel](https://triple-agent.com/) | Le site présente un jeu de groupe pour 5 à 9 joueurs utilisant un seul téléphone. | Retenir l'idée de consignes personnelles courtes dans une expérience sociale. Ce site ne suffit pas à auditer ses écrans ni ses interactions ; nous ne prétendons pas avoir observé son interface complète. Plan Foireux conserve un appareil par joueur. |
| [Clash Royale, aide Elixir](https://support.clashroyale.com/hc/en-us/articles/49484936933403-Elixir), [présentation officielle Card Evolution](https://supercell.com/en/games/clashroyale/blog/release-notes/card-evolution-2/) | L'élixir permet de déployer les cartes. La présentation de 2023 décrit des gouttes affichées directement sur la carte pour indiquer les cycles restant avant son évolution, puis un état visuel quand elle est prête. | Rapprocher l'information de l'action : pièce d'or et gain sur la carte, besoin du poste à côté de son intitulé, conséquence collective dans l'aperçu. Cette transposition de lisibilité est une inférence ; les règles de Clash Royale ne sont pas reprises. |

## Choix public et choix secret

La phase publique affiche d'abord les deux postes de la salle. Chaque carte nomme le travail, son salaire et son besoin en personnes. Le suivi des promesses montre les avatars annoncés et le nombre de personnes encore nécessaires. Il s'agit d'intentions publiques, pas d'une garantie d'exécution. Le bouton « Fouiller ou aider autrement » ouvre les intentions de fouille, réparation et couverture.

La phase secrète oppose « Je tiens ma promesse » et « Je trahis pour voler ». La promesse exacte reste visible sur la première carte. Le vol explique sa dilution et ses coûts : +1 alarme, −8 au sac commun, et éventuellement +2 alarme pour un poste laissé incomplet. « Changer de plan autrement » expose les autres actions. Changer de poste pour aider et voler pour soi ne portent pas le même libellé.

L'aperçu sépare « Pour toi » et « Pour le groupe ». La validation reprend le geste choisi au lieu d'un bouton générique. Le coffre exige toujours la préparation du code, ou la décision explicite de le forcer. La phase secrète dure au maximum 60 secondes pour permettre l'inspection.

## Fouille 3D : nouveau contrat

Ce contrat remplace la fouille par trois compartiments/enveloppes de 0.2. Les trois objets restent `frame`, `desk` et `bust`, disponibles respectivement à partir des salles 0, 1 et 2. La correspondance entre ces objets et les indices 0, 1 et 2 du code est une permutation déterminée par la graine de la partie. Chaque objet reçoit l'un de douze emplacements de marquage : six faces, deux positions par face. La graine renouvelle aussi le code.

Le parcours est le suivant : choisir l'objet, lire le coût de cette fouille, engager irréversiblement son action, puis retourner l'objet pour lire le chiffre écrit sur sa surface. Le cadre, le bureau et la statue ont un volume 3D. Glissement souris ou tactile, flèches du clavier et boutons de rotation permettent de les examiner. La face marquée doit être orientée vers la caméra et réellement visible ; sa détection ne traverse pas le volume de l'objet. Un soulignement distingue 6 et 9.

Le chiffre reste une information personnelle. Après découverte, le joueur peut ensuite annoncer une valeur vraie ou fausse, ou se taire. Un complice peut consacrer une autre fouille au même objet pour vérifier. La première découverte rapporte 2 plus une prime unique de 4 ; une nouvelle vérification personnelle rapporte 2 ; refouiller son propre indice connu ne rapporte rien. En cas de découverte simultanée, la prime est attribuée selon une priorité seedée, indépendamment de l'ordre réseau.

### Commandes et confidentialité

- `begin-search`, avec `target` égal à un objet accessible, engage `choices[id] = {action:'search', target}`. Le joueur n'est pas encore prêt, afin de pouvoir manipuler. Tout autre `choose`, tout nouvel engagement et tout changement d'objet sont ensuite refusés pour cette salle.
- `publicView(..., id).mySearch` devient `{spotId, opened, found, committed, mark, value}` pour ce seul destinataire engagé. `mark` va de 0 à 11 : `Math.floor(mark / 2)` désigne la face et `mark % 2` la position. Les autres joueurs ne reçoivent ni cette position ni ce chiffre. `View.spots` contient la correspondance publique des objets et indices, sans les valeurs du code.
- `inspect`, avec le même `target` et `step` correspondant au marquage, confirme la découverte et passe automatiquement le joueur à `ready`. Les inspections sans engagement préalable, les mauvaises cibles et les positions hors 0..11 sont refusées. L'inscription est utilisée pour rendre l'objet après engagement ; ce prototype repose toujours sur un hôte de confiance, sans promesse de protection contre un client modifié.
- À la fin du délai, une fouille engagée mais incomplète reste l'action de ce joueur. Elle ne devient pas une autre aide, ne donne aucune prime et n'ajoute aucun chiffre au carnet. Le gain et l'ajout au carnet sont résolus avec le groupe.
- Les bots engagent une fouille puis inspectent à partir de leur propre vue privée. Pour le coffre, ils utilisent leurs découvertes et les annonces attribuées, jamais le code complet de l'autorité.

## Révélation et fin de partie

Un vol est signalé en rouge dans la liste des avatars, même lorsque le joueur l'avait annoncé ; une promesse rompue est également signalée. Le moteur conserve la distinction : `Finding.betrayed` signifie précisément une action différente de la promesse, alors que le signal visuel inclut aussi `action === 'loot'`.

Les avatars et leurs étiquettes attirent l'attention en rouge pendant la révélation. Avec la préférence de réduction des animations, le signal rouge reste lisible sans pulsation. Au-dessus des personnages dans le musée, un montant accompagné d'une petite pièce d'or montre le gain individuel. Le récapitulatif conserve action, promesse, gain et effets sur l'alarme et le sac.

À toute fin de partie, les rôles sont révélés. Une grande carte du FBI nomme l'infiltré et montre son portrait, qu'il soit encore présent ou déjà éjecté, y compris après une fuite victorieuse des braqueurs.

## Paysage et langage visuel

L'interface mobile jouable est conçue pour le paysage. En portrait sur un écran étroit, une garde d'orientation masque le jeu et désactive ses interactions, avec une invitation à tourner le téléphone. Un bouton demande le plein écran et tente le verrouillage paysage si le navigateur propose cette API. Ce mécanisme ne garantit pas un verrouillage universel du système ; une rotation manuelle peut rester nécessaire. Il ne constitue pas une pause de la partie réseau.

La direction existante reste cohérente avec le musée cartoon : crème `#fff0cf`, nuit `#102737`, or `#ffb321`, vert loyal `#247e65` et rouge de trahison `#b74032`. Barlow Condensed porte les titres et montants ; Nunito Sans porte les explications. Le rouge est accompagné de libellés, le gain d'une pièce et d'un nombre : les couleurs seules ne transmettent pas la décision.

Le critère à éprouver en partie humaine est simple : un nouveau joueur peut-il expliquer ce qu'il va gagner et le risque pour les autres avant de valider ? La publication et les tests techniques ne suffisent pas à répondre à cette question.
