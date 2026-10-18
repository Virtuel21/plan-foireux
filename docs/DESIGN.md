# Direction artistique et UX — v3

Le dernier brief fourni le 17 octobre remplace les cartes d’actions, l’éjection et les inspections des versions 0.x.

## Direction

Un musée Art déco, à la fois chaleureux et louche : bleu pétrole, bordeaux, laiton, pierre chaude, silhouettes cartoon arrondies. Les modèles sont construits dans Blender avec biseaux, profils lissés et matériaux PBR ; le décor reste entièrement 3D, avec un socle et un mur avant absent. La caméra orthographique cadre les postes sans navigation obligatoire.

Le skill UI/UX Pro Max a été appliqué. La recherche initiale trop générique renvoyait une vitrine marketing ; la recherche ciblée « gaming entertainment immersive » a fourni la direction 3D immersive. Les recommandations de hiérarchie, contraste, feedback, clavier, safe areas, mouvements réduits et gestes alternatifs ont été retenues. La palette reste adaptée au musée plutôt qu’au néon esport proposé par défaut.

DM Sans compose les informations ; Barlow Condensed ExtraBold porte les titres. Les contrôles ont une hauteur minimale de 44 pixels CSS. Le gain et l’effet collectif sont dans les repères de poste et dans le pied d’écran. Le vert des promesses est doublé d’une coche et d’un compte ; il n’utilise jamais le choix privé pour certifier le plan.

## Paysage mobile

Le HUD, le titre de phase et le choix local entourent le diorama, sans colonne de cartes. Sur écran large et peu haut, les repères se répartissent en haut et en bas avec des lignes d’ancrage, pour dégager les objets et éviter les collisions. Le calcul évite le recouvrement des repères. Le coffre et la sécurité restent des objets cliquables ; les noms des joueurs donnent accès au vol et au vote.

Le portrait reste utilisable avec un cadrage et une hiérarchie spécifiques. La rotation n’est jamais bloquée par un écran obligatoire. Les safe areas sont prises en compte. Le plein écran et le verrouillage paysage sont seulement demandés lorsque le navigateur les permet.

## Mini-jeux

Épreuves en 2D, temps basé sur le delta de simulation, progression sérialisée toutes les 250 ms. Les câbles permettent le glisser ou deux clics/taps et les boutons sont accessibles au clavier. Le forage et les poches utilisent un grand bouton et Espace. La statue demande de maintenir et déplacer son appui dans une zone d’équilibre ; les flèches et un curseur offrent une alternative. Les bons points restent acquis après une erreur. La transition ferme le musée puis ouvre l’épreuve pendant 600 ms ; les 18 secondes et les entrées démarrent ensuite. La préférence reduced-motion retire l’iris.

L’exemple de gestes est présent dans chaque épreuve, avec deux étapes et un repère animé discret. Il ne montre pas la bonne borne du puzzle réel. Le salon offre les six entraînements. Une réussite anticipée reste dans l’épreuve jusqu’à l’échéance commune.

## Vérification

La recette automatique relève les dimensions et intersections des huit repères, vérifie l’absence de débordement horizontal, les zones de 44 pixels, le choix sélectionné et les erreurs JavaScript. Les quatre épreuves sont terminées par leurs vrais contrôles, les câbles aussi par glisser et clavier. Les formats, résultats et limites physiques sont consignés dans `VALIDATION.md`.

## Corrections v2

Les quatre postes affichent les portraits et noms de leurs participants annoncés, en plus du compte et du partage prévu. Les avatars restent neutres pendant les promesses. Faire les poches n’est accessible que pendant le choix secret.

La fenêtre de bilan s’ouvre automatiquement : calcul explicite des alarmes, puis quatre portraits avec promesse, action, résultat, poche, gains et pertes. Si la partie continue, la fenêtre de vote s’ouvre ; les quatre compteurs sont visibles en direct. La recherche UI/UX Pro Max `live vote count feedback` a fourni la règle de mise à jour contextualisée : une seule région de statut annonce l’ensemble des voix sans déplacer le focus.

Le talkie est un objet 2D dessiné pour le jeu : antenne, boîtier, grille de haut-parleur, écran LCD, deux boutons rotatifs. Glisser verticalement tourne le bouton ; les flèches ajustent aussi la valeur. Couleurs du signal doublées de texte. La toile utilise un tracé ordonné et montre longueur découpée et précision ; le doigt, la souris et les flèches sont pris en charge.

## Ajustements v3

Une grande annonce au centre signale « Annoncez votre poste » et « Choisissez votre vrai poste », avec la distinction Public / Privé. Elle dure 2,8 secondes, laisse les commandes utilisables et respecte le mouvement réduit. La recherche UI/UX Pro Max `status message focus` a guidé son statut accessible : région polie atomique, aucun focus déplacé. Les rôles secrets FBI/braqueur restent sur leur carte privée.

La sirène et son explication ont le même déclencheur : une hausse effective du niveau d’alarme. Sinon, le bilan montre seulement les résultats et le butin. « Alarmes désactivées par N joueurs » indique clairement le travail accompli. Le vote indique que les quatre réponses lancent la suite ; le chronomètre ne retient plus les joueurs prêts.

La découpe affiche un couloir de tolérance plus large, accepte les mouvements espacés et les petits retours, et demande 70 % de précision. Le vol annonce son enjeu réel, presque tout le gain du tour. Au tour suivant une tentative de vol, tout le groupe est vigilant : changer de cible conserve la difficulté accrue, les fenêtres réduites et la perte d’une prise si repéré. Un tour sans faire les poches rétablit la difficulté normale. Les anciens sacs sont remplacés par des plateaux de liasses et lingots animés en fonction des gains et pertes.

## Interface mobile dédiée et tentation du butin

Sur les petits écrans (largeur ≤ 900 pixels, ou paysage de hauteur ≤ 500 pixels), les bulles projetées sont remplacées par quatre cartes de poste et une liste de complices hors du canvas. En portrait le panneau est sous le musée ; en paysage il est à droite et défile si nécessaire. Les cartes affichent la cagnotte en pièces d’or, l’effet collectif et les seules promesses publiques. En phase secrète, toucher un rival dans cette liste choisit le vol ; le choix réel d’autrui n’est jamais utilisé par le panneau. Les interdictions de surveillance sont identiques aux commandes de la scène. La sélection clavier conserve le focus après une mise à jour.

Les cagnottes à partager sont Caméras 6, Forer 10, Statue 16 et Toile 24. Les deux postes collectifs rapportent moins : couvrir le plan est moins lucratif que rejoindre un poste de butin. Les parts utilisent les participants réels, même s’ils avaient promis autre chose ; les parts ratées sont perdues. Le vol suit le revenu effectivement gagné, jusqu’à 22 pièces sur une toile solitaire. Ces valeurs et leur affichage partagent la même configuration ; l’équilibrage avec des groupes humains reste à éprouver.

## Statue, gardien et commandes d’objets — 18 octobre 2026

« Voler la statue » remplace les casiers, avec la cagnotte et l’identifiant réseau `loot` conservés. Trois étapes demandent de décoller la statue de son capteur, porter son poids, puis la déposer dans un sac. Maintenir et glisser équilibre l’appui sous une zone verte mobile. Un appui incorrect fait grincer le socle ; relâcher calme le bruit. Une erreur remet seulement l’étape en cours à zéro. Les gestes mettent à jour le rendu immédiatement, tandis que l’état réseau conserve sa cadence de 250 ms. L’épreuve des casiers reste archivée pour réemploi.

Le gardien dort sur sa chaise à gauche du banc central. Sa respiration est visuelle ; aucun réveil ni mini-jeu associé n’est ajouté. Aux caméras, un à quatre joueurs occupent l’allée libre à l’ouest de la couronne, avec des trajets aller-retour par le couloir central. Les emplacements de la statue utilisent son côté nord-ouest, dégagé du banc et des cordons.

Les signes du boîtier sont centrés dans les plaques physiques, colorées selon le câble attendu. Les prises libres restent des disques colorés avec un grand « + » sombre et une bordure claire. Les deux boutons rotatifs et l’antenne du talkie sont contenus dans son assemblage, y compris en paysage étroit.


## Confort, zoom et fiches PC — 18 octobre 2026

Le musée conserve les tokens existants : encre #11232c, panneau #17303a, crème #f5ecd7, laiton #f0c36b et turquoise #68dbc5. DM Sans reste la police d’information ; Barlow Condensed porte les titres. Les nouveaux SVG reprennent le trait des icônes existantes.

Les fiches de joueurs sont déplacées dans une colonne de 224 pixels à droite du musée sur PC. Les repères de tête deviennent compacts : pièce et montant, puis main et « Voler » uniquement si l’action est autorisée. Les fiches latérales affichent les promesses publiques et se synchronisent avec le choix local, sans exposer le choix secret adverse. Le panneau mobile existant reste la commande des postes et complices.

Les réglages ont trois curseurs natifs et une coupure générale ; aucune validation n’est requise et le volume du morceau en cours change immédiatement. Les valeurs sont mémorisées. Le focus reste dans la fenêtre et Échap permet de fermer.

Le canvas utilise des gestes réservés à la caméra. Le pincement zoome, le glissement déplace la vue agrandie ; un seuil de déplacement et une protection après le geste empêchent une sélection accidentelle. Boutons +/− et recentrer, molette et clavier complètent les gestes. Les commandes se trouvent dans la scène uniquement en partie afin de dégager l’accueil sur téléphone. Le cadrage des rayons de sélection et des repères utilise la même caméra.

Le boîtier garde son modèle et son interrupteur physique, désormais animé automatiquement. Les ouvertures des prises ont un centre sombre, une bague colorée pleine et une bordure crème. Les symboles des plaques, les embouts et les cibles natives de 44 pixels restent disponibles pour les gestes et le clavier. Le texte de l’épreuve annonce la validation automatique.

Les contours de découpe sont rééchantillonnés à distances régulières pour garder 80 étapes sur six silhouettes. La graine et la version de contour font partie de la progression sauvegardée ; les reprises anciennes gardent leur tracé.
