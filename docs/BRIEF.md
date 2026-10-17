# Plan Foireux — règles v3, corrections de Julien du 17 octobre 2026

Ce document intègre les dernières demandes et remplace les règles contradictoires de `BRIEF-v1-archive.md`, conservé comme archive du document initial.

## Objectif et autorité

Quatre joueurs, trois braqueurs et un FBI. Le navigateur de l’hôte possède et résout tous les états. WebRTC transporte les vues personnalisées ; PeerJS ne sert qu’à la signalisation. Aucun serveur de jeu personnel.

Coffre : 8 points. Alarme : défaite à 5 ou plus, après calcul complet. Cinq manches maximum. Dès que le coffre atteint 8 et que l’alarme reste sous 5, la fuite suit le bilan de cette manche : aucun tour d’attente après ouverture. La police est prioritaire si ouverture et alarme 5 arrivent ensemble. Si le coffre est fermé à la fin de la manche 5, le FBI gagne.

À la fuite, tous les braqueurs gagnent et reçoivent 8 pièces de bonus. Le plus riche obtient Roi des Voleurs, égalités admises. Le portefeuille FBI est exclu du classement.

## Choix et gains

- Promesses publiques, 20 secondes : seuls les quatre postes sont annonçables. On ne peut pas annoncer Faire les poches, même via une commande réseau. Noms et portraits sont associés au poste promis.
- Choix secrets, 12 secondes : un des quatre postes, ou Faire les poches en touchant un rival ou sa pile de butin. Les autres voient encore la promesse, jamais le vrai choix ni la cible. Une grande annonce centrale distingue les promesses publiques des vrais postes privés.
- Forer : chaque réussite ajoute 2 au coffre.
- Désactiver les caméras : chaque réussite retire 2 alarmes. Le poste est attaché à la caméra du mur droit et à sa petite boîte fermée. Le grand boîtier ouvert est réservé au mini-jeu de connexion des câbles.
- Casiers : défi de goupilles.
- Voler la toile : découper un contour fermé dans le délai, avec au moins 70 % de précision. Tolérance spatiale doublée, interpolation entre les positions du doigt et petits retours sur le contour acceptés ; les sauts au bout du parcours restent interdits.
- Cagnottes différenciées par manche : **Forer 10 pièces, Désactiver les caméras 6, Casiers 16, Voler la toile 24**. Les postes indispensables au groupe rapportent moins ; les postes lucratifs attirent les changements de dernière minute et les voleurs. Ces valeurs remplacent la cagnotte uniforme de 12 pièces à la demande de Julien.
- Part déterminée par TOUS les participants réels, indépendamment des annonces, puis arrondie à l’entier inférieur. Exemple : la toile rapporte 24 seul, 12 à deux, 8 à trois, 6 à quatre ; les caméras rapportent 6, 3, 2 ou 1. Une personne qui rate perd sa part ; elle n’augmente pas les parts des autres. Le reliquat d’une cagnotte n’est pas attribué. Le progrès collectif des réussites reste individuel et cumulable.
- Faire les poches : après les récompenses de poste, prendre 90 % arrondis au supérieur du gain de la manche, en laissant au moins une pièce. Un gain de 24 peut perdre 22 ; 16 peut perdre 15 ; 10 peut perdre 9 ; 6 peut perdre 5. Si la cible ne gagne rien, jusqu’à 4 pièces de sa réserve initiale. Partage entier entre les voleurs réussis ; reliquat conservé par la victime. Les produits des autres vols ne sont pas revolés en cascade.
- Retenter la même cible à la manche suivante déclenche sa vigilance : fenêtres de vol de 0,8 s au lieu de 1,65 s, trois prises de 1,35 s et perte d’une prise complète si repéré. Changer de cible ou passer un tour sans vol rétablit la difficulté normale. L’hôte conserve cet historique privé, chaque joueur ne reçoit que le sien.

Ces valeurs sont une nouvelle base de prototype. Les tests automatisés vérifient le calcul, pas l’équilibrage ou le plaisir entre amis.

## FBI et épreuves

En secret, Profil bas conserve l’épreuve normale. Le brouilleur demande une cible autre que soi. Il remplace l’épreuve du FBI par un vrai talkie-walkie 2D, avec écran et deux boutons rotatifs (canal et réglage fin). Signal rouge/orange/vert, doublé d’un texte. Stabiliser trois fréquences distinctes pendant 0,85 seconde chacune donne une réussite.

Si le radio-défi réussit, le poste de couverture du FBI réussit normalement et le défi de la cible échoue à la résolution, même si celle-ci l’avait terminé. Le bilan montre seulement un défi raté. Aucun émetteur, cible de brouillage ou trace de zone n’est révélé. Un radio-défi raté échoue comme une tâche normale et ne brouille personne. Une surveillance bloque le brouilleur.

Les épreuves durent 18 secondes. Perceuse : bande de pression réduite à 13 %, trois points de 1,45 s ; goupilles : fenêtre de 15 % et vitesse croissante ; sac : retournements plus fréquents, trois prises de 1,3 s ; sécurité : deux panneaux de trois circuits, bornes réordonnées après le premier panneau. La découpe a un chemin ordonné et interdit les sauts au bout du contour. Gestes, clavier et états sont sérialisables et se mettent en pause en cas de coupure.

## Alarmes, bilan et vote

Alarme finale = max(0, précédente +1 temps +nombre de défis ratés −2 × sécurités réussies). Un échec brouillé compte une seule fois. Pas d’alarme de brouillage additionnelle. Les quatre résultats sont calculés simultanément ; aucune alarme provisoire ne termine la partie.

À chaque révélation, une fenêtre montre les portraits, postes promis et réels, réussite/échec, argent actuel, gains et pertes des quatre joueurs. Le calcul de l’alarme apparaît seulement si son niveau augmente, comme le son de sirène. « Alarmes désactivées par N joueurs » remplace « sécurités réussies ». La révélation dure 12 secondes. Si la partie continue, le débat dure au maximum 30 secondes et la fenêtre propose le vote, avec compteurs publics en direct pour chacun et Passer. Dès que les quatre joueurs ont répondu, la manche suivante commence, sans attendre le compteur. Un vote reste modifiable en attendant la quatrième réponse. Sans charge, Continuer remplace Passer. Les votes individuels ne sont pas projetés pendant le débat, seuls les totaux le sont.

Trois voix sur quatre imposent une surveillance d’une manche : coffre ou sécurité et brouilleur bloqué, rôle non révélé. Deux charges communes, pas d’élimination. Aucun vote sans effet après la manche qui termine la partie.

## Visuel et musique

Le coffre est un véritable coffre rectangulaire pierre crème, acier anthracite et volant doré, placé sous l’arche gauche du décor. La façade cintrée précédente est retirée. Les nouveaux modèles doivent être générés à leur budget de polygones directement dans Meshy, sans décimation Blender ultérieure.

Voiture décorative retirée des sources Blender et du GLB. Quatrième poste de tableau identifiable et cliquable. Visages et noms sur les postes, sélection publique/privée explicite, zones tactiles de 44 pixels minimum, téléphone paysage prioritaire.

Les quatre sacs 3D sont remplacés par de petits plateaux de butin. Les liasses et lingots reprennent les unités de Money Tour, avec biseaux, papiers superposés, bandes et poinçons. Les piles s’animent à la hausse et à la baisse selon le solde public ; les instances sont regroupées par matériau pour le mobile.

Musiques fournies par Julien dans son dossier `Plan foireux/songs` : Sneaky Museum Heist à l’accueil ; les deux Sneaking Motif alternent en partie. Lecture au premier geste autorisé par le navigateur, volume modéré, mute persistant et pause lors d’une interruption ou quand l’onglet est masqué. Fichiers locaux au jeu, aucune lecture distante tierce.
