# Plan Foireux — règles v2, corrections de Julien du 17 octobre 2026

Ce document intègre les dernières demandes et remplace les règles contradictoires de `BRIEF-v1-archive.md`, conservé comme archive du document initial.

## Objectif et autorité

Quatre joueurs, trois braqueurs et un FBI. Le navigateur de l’hôte possède et résout tous les états. WebRTC transporte les vues personnalisées ; PeerJS ne sert qu’à la signalisation. Aucun serveur de jeu personnel.

Coffre : 8 points. Alarme : défaite à 5 ou plus, après calcul complet. Cinq manches maximum. Dès que le coffre atteint 8 et que l’alarme reste sous 5, la fuite suit le bilan de cette manche : aucun tour d’attente après ouverture. La police est prioritaire si ouverture et alarme 5 arrivent ensemble. Si le coffre est fermé à la fin de la manche 5, le FBI gagne.

À la fuite, tous les braqueurs gagnent et reçoivent 8 pièces de bonus. Le plus riche obtient Roi des Voleurs, égalités admises. Le portefeuille FBI est exclu du classement.

## Choix et gains

- Promesses publiques, 20 secondes : seuls les quatre postes sont annonçables. On ne peut pas annoncer Faire les poches, même via une commande réseau. Noms et portraits sont associés au poste promis.
- Choix secrets, 12 secondes : un des quatre postes, ou Faire les poches en touchant un rival ou son sac. Les autres voient encore la promesse, jamais le vrai choix ni la cible.
- Forer : chaque réussite ajoute 2 au coffre.
- Sécuriser : chaque réussite retire 2 alarmes.
- Casiers : défi de goupilles.
- Voler la toile : découper un contour fermé dans le délai, avec au moins 85 % de précision.
- Chaque poste possède une cagnotte de 12 pièces par manche. Part déterminée par TOUS ses participants réels : seul 12, à deux 6, à trois 4, à quatre 3. Une personne qui rate perd sa part ; elle n’augmente pas les parts des autres. Le progrès collectif des réussites reste individuel et cumulable.
- Faire les poches : jusqu’à 4 pièces au total de la poche initiale de la victime. Partage entier entre les voleurs réussis ; reliquat conservé par la victime. Gains de la manche non volables. Prendre 4 au meneur réduit l’écart de 8.

Ces valeurs sont une nouvelle base de prototype. Les tests automatisés vérifient le calcul, pas l’équilibrage ou le plaisir entre amis.

## FBI et épreuves

En secret, Profil bas conserve l’épreuve normale. Le brouilleur demande une cible autre que soi. Il remplace l’épreuve du FBI par un vrai talkie-walkie 2D, avec écran et deux boutons rotatifs (canal et réglage fin). Signal rouge/orange/vert, doublé d’un texte. Stabiliser trois fréquences distinctes pendant 0,85 seconde chacune donne une réussite.

Si le radio-défi réussit, le poste de couverture du FBI réussit normalement et le défi de la cible échoue à la résolution, même si celle-ci l’avait terminé. Le bilan montre seulement un défi raté. Aucun émetteur, cible de brouillage ou trace de zone n’est révélé. Un radio-défi raté échoue comme une tâche normale et ne brouille personne. Une surveillance bloque le brouilleur.

Les épreuves durent 18 secondes. Perceuse : bande de pression réduite à 13 %, trois points de 1,45 s ; goupilles : fenêtre de 15 % et vitesse croissante ; sac : retournements plus fréquents, trois prises de 1,3 s ; sécurité : deux panneaux de trois circuits, bornes réordonnées après le premier panneau. La découpe a un chemin ordonné et interdit les sauts au bout du contour. Gestes, clavier et états sont sérialisables et se mettent en pause en cas de coupure.

## Alarmes, bilan et vote

Alarme finale = max(0, précédente +1 temps +nombre de défis ratés −2 × sécurités réussies). Un échec brouillé compte une seule fois. Pas d’alarme de brouillage additionnelle. Les quatre résultats sont calculés simultanément ; aucune alarme provisoire ne termine la partie.

À chaque révélation, une fenêtre explique chaque contribution de l’alarme et montre les portraits, postes promis et réels, réussite/échec, argent actuel, gains et pertes des quatre joueurs. La révélation dure 12 secondes. Si la partie continue, le débat dure 30 secondes et la fenêtre propose le vote, avec compteurs publics en direct pour chacun et Passer. Chaque vote reste modifiable jusqu’à l’échéance. Les votes individuels ne sont pas projetés pendant le débat, seuls les totaux le sont.

Trois voix sur quatre imposent une surveillance d’une manche : coffre ou sécurité et brouilleur bloqué, rôle non révélé. Deux charges communes, pas d’élimination. Aucun vote sans effet après la manche qui termine la partie.

## Visuel et musique

Voiture décorative retirée des sources Blender et du GLB. Quatrième poste de tableau identifiable et cliquable. Visages et noms sur les postes, sélection publique/privée explicite, zones tactiles de 44 pixels minimum, téléphone paysage prioritaire.

Musiques fournies par Julien dans son dossier `Plan foireux/songs` : Sneaky Museum Heist à l’accueil ; les deux Sneaking Motif alternent en partie. Lecture au premier geste autorisé par le navigateur, volume modéré, mute persistant et pause lors d’une interruption ou quand l’onglet est masqué. Fichiers locaux au jeu, aucune lecture distante tierce.
