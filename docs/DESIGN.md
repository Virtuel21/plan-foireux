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

Épreuves en 2D, temps basé sur le delta de simulation, progression sérialisée toutes les 250 ms. Les câbles permettent le glisser ou deux clics/taps et les boutons sont accessibles au clavier. Les trois autres épreuves utilisent un grand bouton et Espace. Les bons points restent acquis après une erreur. La transition ferme le musée puis ouvre l’épreuve pendant 600 ms ; les 18 secondes et les entrées démarrent ensuite. La préférence reduced-motion retire l’iris.

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

La découpe affiche un couloir de tolérance plus large, accepte les mouvements espacés et les petits retours, et demande 70 % de précision. Le vol annonce son enjeu réel, presque tout le gain du tour, et avertit « Cible très vigilante » avant de répéter une cible. Cette difficulté réduit les fenêtres et fait perdre une prise si repéré. Les anciens sacs sont remplacés par des plateaux de liasses et lingots animés en fonction des gains et pertes.

## Interface mobile dédiée et tentation du butin

Sur les petits écrans (largeur ≤ 900 pixels, ou paysage de hauteur ≤ 500 pixels), les bulles projetées sont remplacées par quatre cartes de poste et une liste de complices hors du canvas. En portrait le panneau est sous le musée ; en paysage il est à droite et défile si nécessaire. Les cartes affichent la cagnotte en pièces d’or, l’effet collectif et les seules promesses publiques. En phase secrète, toucher un rival dans cette liste choisit le vol ; le choix réel d’autrui n’est jamais utilisé par le panneau. Les interdictions de surveillance sont identiques aux commandes de la scène. La sélection clavier conserve le focus après une mise à jour.

Les cagnottes à partager sont Caméras 6, Forer 10, Casiers 16 et Toile 24. Les deux postes collectifs rapportent moins : couvrir le plan est moins lucratif que rejoindre un poste de butin. Les parts utilisent les participants réels, même s’ils avaient promis autre chose ; les parts ratées sont perdues. Le vol suit le revenu effectivement gagné, jusqu’à 22 pièces sur une toile solitaire. Ces valeurs et leur affichage partagent la même configuration ; l’équilibrage avec des groupes humains reste à éprouver.
