# Validation des originaux Meshy — 17 octobre 2026

Ces contrôles concernent les modèles natifs restaurés. Les résultats de la précédente version procédurale sont archivés dans `VALIDATION-v3-before-meshy.md` et les variantes plus anciennes dans `VALIDATION-v1.md` et `VALIDATION-v2.md`.

## Données et format

- Les quatre GLB statiques sont identiques, SHA-256 compris, aux téléchargements Meshy.
- Les trois rigs regroupés conservent tous les bufferViews originaux, matériaux, images, UV, normales, indices, poids et articulations. Les buffers des animations sont copiés sans modification, y compris les déplacements de racine. Les assertions de `art/assemble_meshy.py` ont passé.
- Le validateur glTF a contrôlé les sept GLB : **0 erreur**, un avertissement par fichier. Les modèles statiques n'embarquent pas de tangentes ; l'espace tangent est généré à l'import. Les rigs signalent `NODE_SKINNED_MESH_NON_ROOT` et conservent des accessors inutilisés de l'animation de base. Ces informations sont consignées, sans réexport correctif susceptible de modifier le modèle.
- Les 40 entrées d'`art/inventory.json` ont leur taille et SHA-256 vérifiés après l'intégration.

## Contrôles exécutés

`npm test` : **45 tests passent**. `npm run build`, `npm run format:check` et `git diff --check` passent. Les règles, secrets et mini-jeux ne sont pas modifiés.

`scripts/qa-meshy-assets.mjs` a exécuté le composant Museum réel dans Chrome : quatre squelettes indépendants de 24 articulations ; exactement les trois clips idle/walk/drill ; variations effectives des matrices d'os en attente et au forage ; marche pendant le déplacement ; attente sur les autres postes ; perceuse visible au forage ; ouverture du pivot de la façade ; rendu paysage 844×390 ; pose stable en mouvement réduit. Aucune erreur JavaScript. Les résultats de résolution sont injectés pour tester le rendu : ceci n'est pas une nouvelle recette multijoueur.

Les **six parcours d'interface** `museum, clickable posts and safe layout` ont passé dans Chrome : 1440×900, 844×390, 740×360, 667×375, 390×844, 320×740. Huit repères, cibles de 44 pixels minimum, absence de collision entre boutons et de débordement horizontal, sélection du poste Sécuriser. Les captures ont été examinées.

Les scènes Blender ont été importées et sauvegardées avec les textures originales, sans modificateur de décimation. La scène du musée utilise des transformations de parents. Les portraits ont été rendus directement depuis les modèles du jeu.

## Mesures et limites

La base rendue compte **213 261 triangles et 9 appels de dessin** : décor, accessoires, gardien et quatre personnages. Le butin variable et les perceuses s'ajoutent à cette base. Le précédent seuil de 100 000 triangles nécessitait la réduction de maillage rejetée par Julien ; il a été remplacé par un contrôle de cohérence 200 000–240 000 pour cette base native. Ce seuil ne prouve pas une fluidité sur téléphone.

Le paquet charge environ 176 Mo de modèles natifs (avant les ressources historiques conservées). Aucune réduction de texture ou de géométrie n'est appliquée pour masquer ce coût. Téléphone physique, Safari/iOS et réseaux domestiques distincts n'ont pas été réessayés lors de cette intégration. Les anciens parcours réseau restent uniquement des preuves de la version antérieure. La fidélité exacte aux concepts n'est pas acquise : voir les écarts déclarés dans `ASSETS.md`.
