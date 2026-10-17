# Assets originaux et provenance

Production du 17 octobre 2026, pour le dépôt Plan Foireux. Aucun fichier d’Among Us, de No More Room in Hell ou d’un autre jeu n’est intégré. Aucun asset de marketplace n’a été téléchargé.

## Musée

`art/build_museum.py` construit un diorama Art déco original : socle, damier en marbre, mur coupé, pilastres, moulures de laiton, trois tableaux géométriques originaux, objets de musée, banc, plantes, corde, coffre à porte pivotante et lingots, groupe de neuf compartiments, terminal, clavier, boîtier, caméra pivotante, quatre plateaux de butin. La voiture a été supprimée en v2 et les sacs en v3.

Les surfaces utilisent des matériaux PBR et des biseaux doux. Les tableaux sont des reliefs géométriques, sans texture distante. Les trois cadres partagent une direction visuelle mais ont des couleurs différentes. Les piles de butin et les postes sont séparés ; les noms, montants et zones de clic restent dans le code.

Sources : `art/source/museum-authoring.blend` (maillages éditables), `art/source/museum.blend` (export optimisé), `public/models/museum.glb` (45 308 triangles). `VaultDoorPivot` et `CameraPivot` restent articulés. Les racines `POST_Vault`, `POST_Loot`, `POST_Security`, `POST_Painting` et `PROP_Wealth_0` à `3` servent aux placements et interactions. Blender travaille en mètres, Z vertical ; glTF convertit vers Y vertical.

## Lingots et liasses

À la demande de Julien, `art/wealth_units.py` reprend la géométrie d’auteur de son dépôt Money Tour (`scripts/wealth_models.py`, vérifié localement), avec adaptation et réduction pour ce jeu. Aucun téléchargement de modèle de marketplace. Les billets ont huit couches, une bande de papier et des traits d’impression ; le lingot a des biseaux, un poinçon et un sceau. Les deux racines sont `banknote_bundle` et `gold_bar`. Sources éditables `art/source/wealth-authoring.blend`, source optimisée `art/source/wealth.blend`, export `public/models/wealth.glb` : 674 triangles pour les deux unités réunies.

`src/wealth.ts` regroupe les unités par matériau dans six lots d’instances pour les quatre joueurs. Une unité correspond à trois pièces, jusqu’à douze unités par joueur ; au-delà de 36 pièces, leur hauteur continue d’augmenter. Les variations de solde sont interpolées, ou immédiates en mouvement réduit. Les piles et leurs plateaux restent cliquables pour choisir la cible privée. La provenance est la réutilisation du travail Money Tour demandée par son propriétaire ; aucune nouvelle licence globale du dépôt n’est ajoutée.

## Personnage partagé

Le personnage original du dépôt est conservé, avec ses pivots Head/ArmL/ArmR/LegL/LegR et son matériau Cloth. `art/burglar.blend` et `art/build_character.py` sont les sources originales. `art/source/burglar.blend` et `public/models/burglar.glb` sont l’export mobile (9 558 triangles), partagé entre quatre variantes de couleur. Les portraits existants sont des rendus du même personnage.

`src/animation.ts` contient 12 clips procéduraux partagés : attente, marche, promesse, forer, sécuriser, piller, découper la toile, fouiller le sac, échec, accusation, célébration et reddition. Ce sont des poses sur un rig à pivots, pas des animations squelettiques MoCap ni des clips Blender exportés. Les couleurs ne révèlent jamais le FBI.

## Reproduire les exports

Avec Blender 5.2 :

```sh
blender --background --python art/build_museum.py
blender --background --python art/finish_assets.py
blender --background --python art/build_drill.py
blender --background --python art/wealth_units.py
```

Le deuxième script part toujours des sources, convertit les courbes, réduit le maillage puis groupe par matériau et parent. Les pivots sont conservés. Pour reconstruire aussi le personnage source et ses portraits, exécuter d’abord `art/build_character.py`.

La base du musée et de ses quatre avatars compte 83 540 triangles. Les piles ajoutent une quantité variable selon les soldes ; six appels de dessin au maximum pour tout le butin. La perceuse tenue pendant les révélations ajoute 1 468 triangles par foreur. `art/build_drill.py` et `art/source/drill.blend` en conservent la source, `public/models/drill.glb` son export. Les mesures navigateur sont consignées dans `VALIDATION.md`. Le budget de 30 FPS sur un téléphone physique n’est pas validé par ces mesures de bureau.

## Mini-jeux et interface

Les câbles SVG, prises HTML, corps de perceuse, mécanisme de serrure, liasses et lingot du mini-jeu de vol, main, talkie-walkie à écran et boutons rotatifs, toile et outil de découpe, jauges, symboles et icônes sont dessinés par le code du projet. Les instructions et symboles complètent les couleurs. Les ombres, dégradés et formes arrondies assurent une direction cohérente avec le musée. Aucune image conceptuelle n’est présentée comme un modèle 3D.

Une banque originale de 16 bruitages et une ambiance est livrée dans `public/audio/`. Le générateur `audio/build_audio.py` utilise seulement la bibliothèque standard Python (ondes, enveloppes et bruit déterministe), sans enregistrement ni échantillon tiers. Sélection, confirmation, refus, fin de phase, perceuse, surchauffe, prise, courant, levier, serrure, pièces, tissu, signal, sirène, van et arrestation ont leurs fichiers WAV. L’ambiance est une discrète tonalité de musée. `src/audio.ts` contrôle le volume, le mute persistant et les boucles privées. Les trois MP3 fournis par Julien sont intégrés dans `public/music/` : Sneaky Museum Heist (accueil), The Sneaking Motif et The Sneaking Motif 2 (alternance en partie). Ils sont copiés sans réencodage depuis le dossier utilisateur `Documents/Plan foireux/songs`. Leur provenance est déclarée comme fourniture utilisateur ; aucune licence tierce supplémentaire n’est déduite. Pas de voix réseau.

Le gardien de fond et les silhouettes de raid ne sont pas ajoutés : la pression et l’arrestation sont portées par l’alarme, les bruitages et le résultat. Ces personnages étaient facultatifs pour la première boucle jouable.

## Polices

Les polices sont livrées localement dans `public/fonts/`, avec leur licence SIL Open Font License 1.1 :

- Barlow Condensed ExtraBold, auteurs du Barlow Project : https://github.com/google/fonts/tree/main/ofl/barlowcondensed ; licence dans `BarlowCondensed-OFL.txt`.
- DM Sans variable, auteurs du DM Sans Project : https://github.com/google/fonts/tree/main/ofl/dmsans ; licence dans `DMSans-OFL.txt`.

Les licences ont été lues depuis les fichiers officiels du dépôt Google Fonts lors de l’intégration. Les sources du jeu ne reçoivent pas une nouvelle licence globale par cette modification. `art/inventory.json` associe les ressources et leurs empreintes aux usages.
