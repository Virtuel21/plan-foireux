# Validation des originaux Meshy — 17 octobre 2026

Ces contrôles concernent les modèles natifs restaurés. Les résultats de la précédente version procédurale sont archivés dans `VALIDATION-v3-before-meshy.md` et les variantes plus anciennes dans `VALIDATION-v1.md` et `VALIDATION-v2.md`.

## Données et format

- Les GLB statiques natifs sont identiques, SHA-256 compris, aux téléchargements Meshy.
- Les trois rigs regroupés conservent tous les bufferViews originaux, matériaux, images, UV, normales, indices, poids et articulations. Les buffers des animations sont copiés sans modification, y compris les déplacements de racine. Les assertions de `art/assemble_meshy.py` ont passé.
- Le validateur glTF a contrôlé les huit GLB de la bibliothèque : **0 erreur** ; sept avertissements natifs au total, aucun pour le petit boîtier local. Les modèles statiques n'embarquent pas de tangentes ; l'espace tangent est généré à l'import. Les rigs signalent `NODE_SKINNED_MESH_NON_ROOT` et conservent des accessors inutilisés de l'animation de base. Ces informations sont consignées, sans réexport correctif susceptible de modifier le modèle.
- Les 42 entrées d'`art/inventory.json` ont leur taille et SHA-256 vérifiés après l'intégration.

## Contrôles exécutés

`npm test` : **45 tests passent**. `npm run build`, `npm run format:check` et `git diff --check` passent. Les règles, secrets et mini-jeux ne sont pas modifiés.

`scripts/qa-meshy-assets.mjs` a exécuté le composant Museum réel dans Chrome : quatre squelettes indépendants de 24 articulations ; exactement les trois clips idle/walk/drill ; variations effectives des matrices d'os en attente et au forage ; marche pendant le déplacement ; attente sur les autres postes ; perceuse visible au forage ; ouverture du porte du vrai coffre, caisson fixe ; rendu paysage 844×390 ; pose stable en mouvement réduit. Aucune erreur JavaScript. Les résultats de résolution sont injectés pour tester le rendu : ceci n'est pas une nouvelle recette multijoueur.

Les **six parcours d'interface** `museum, clickable posts and safe layout` ont passé dans Chrome : 1440×900, 844×390, 740×360, 667×375, 390×844, 320×740. Huit repères, cibles de 44 pixels minimum, absence de collision entre boutons et de débordement horizontal, sélection du poste Désactiver les caméras. Les captures ont été examinées.

Les scènes Blender ont été importées et sauvegardées avec les textures originales, sans modificateur de décimation. La scène du musée utilise des transformations de parents. Les portraits ont été rendus directement depuis les modèles du jeu.

## Mesures et limites

La base rendue compte **190 278 triangles et 15 appels de dessin** : décor, accessoires, gardien et quatre personnages. Le butin variable et les perceuses s'ajoutent à cette base. Le précédent seuil de 100 000 triangles nécessitait la réduction de maillage rejetée par Julien ; il a été remplacé par un contrôle de cohérence 180 000–215 000 pour cette base native. Ce seuil ne prouve pas une fluidité sur téléphone.

Le paquet charge environ 134.54 Mo de modèles natifs (avant les ressources historiques conservées). Aucune réduction de texture ou de géométrie n'est appliquée pour masquer ce coût. Téléphone physique, Safari/iOS et réseaux domestiques distincts n'ont pas été réessayés lors de cette intégration. Les anciens parcours réseau restent uniquement des preuves de la version antérieure. La fidélité exacte aux concepts n'est pas acquise : voir les écarts déclarés dans `ASSETS.md`.

## Coffre et caméras — recette complémentaire

Meshy-T2.5 Smart Topology a généré le coffre à 3 026 triangles, avec une cible de 3 000 et des textures 2K. Coût confirmé et consommé : 15 crédits, solde vérifié 1 845. Le GLB natif de 6 514 972 octets est identique dans le paquet et le dépôt. Aucun remesh payant ni décimation Blender. Le script de charnière vérifie que tous les triangles sont conservés et que le GLB source n'est jamais réécrit. Dans Chrome, les positions, normales et UV du caisson et de la porte partagent les mêmes buffers, et la matrice du caisson reste identique pendant l'ouverture.

Le grand boîtier n'est plus chargé dans le diorama. Les cibles de clic de la caméra et du petit boîtier fermé ont sélectionné le défi `secure` lors de vrais clics sur le canvas. Le poste conserve les mêmes coordonnées dans les trois dispositions et affiche « Désactiver les caméras ». Le petit boîtier local compte 1 218 triangles et 85 924 octets.

Le parcours des câbles a été rejoué via taps/clics, glisser souris puis clavier avec le rendu du boîtier original en fond du mini-jeu. Les deux panneaux réussissent. La recette comprend donc sept parcours d'interface (six formats de diorama et le parcours câbles), en plus du contrôle des rigs et des mécanismes 3D. La position du coffre tient compte du seuil de pierre original mesuré par lancer de rayon à y=0,317.

## Intégration du coffre dans l'arche — 17 octobre 2026

La recette rapprochée a révélé un caisson décentré, trop avancé et traversant la plante. Le placement commun au jeu et à Blender est désormais dans `scenes/safe-placement.json` : centre longitudinal de la niche, base à 0,32 et profondeur ajustée par le parent. Aucun sommet, UV, normale, texture ou fichier GLB Meshy n'a été réécrit. Le SHA-256 du coffre natif correspond toujours à celui du téléchargement.

`art/fit_safe_in_arch.py` a vérifié le musée et le coffre importés dans Blender. Le caisson mesure environ 1,315 × 1,628 × 0,637 unité et repose dans le renfoncement : les neuf points de support sont à 0–6 mm du seuil irrégulier. Les contacts de triangles du caisson avec le musée sont limités au niveau du seuil. Sur 17 positions entre 0° et 79,3° d'ouverture, aucun triangle de la porte ne rencontre le décor, y compris les colonnes et la plante. Ces mesures complètent l'inspection visuelle ; elles ne constituent pas une simulation physique continue.

`scripts/qa-safe-placement.mjs` a capturé le composant Museum réel dans Chrome : plan général 1440×960, face et trois quarts en 1200×900, coffre fermé puis ouvert, paysages 844×390 et portraits 390×844 et 320×740. Toutes ces captures ont été examinées. Pour les gros plans seulement, les personnages et les étiquettes sont masqués afin de dégager le coffre ; le décor et le coffre sont rendus directement. Le centrage, l'appui sur le seuil et le dégagement des colonnes et de la plante ont été contrôlés.

Les six parcours d'interface 1440×900, 844×390, 740×360, 667×375, 390×844 et 320×740 ont repassé après le déplacement. Le contrôle des assets en navigateur a également repassé, avec ouverture animée, forage, caisson immobile et zéro erreur JavaScript. Les 45 tests du moteur, le build et le contrôle de format passent. Les essais Chrome sur formats mobiles sont simulés sur ordinateur ; aucun appareil physique n'a été essayé pour cette correction. Les preuves sont livrées dans `validation/safe-placement` du paquet de production. Coût supplémentaire : 0 crédit.
