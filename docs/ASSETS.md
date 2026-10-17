# Modèles Meshy natifs — 17 octobre 2026

Le musée et les personnages du jeu utilisent les sorties Meshy originales. Les simplifications, réductions de textures, poids corrigés manuellement et coiffures remodelées ont été retirés à la demande de Julien. L'ancienne documentation procédurale est conservée dans `ASSETS-v3-procedural.md` ; elle décrit les sources historiques, pas les nouveaux modèles affichés.

## Sources et conservation

`art/meshy-provenance.json` conserve les identifiants des travaux Meshy, les coûts et les empreintes des modèles natifs et du petit boîtier local. Les concepts ont été fournis par Julien ; quatre images de préparation ont servi aux générations. Les sorties proviennent de son compte Meshy 7.1 standard. Aucune nouvelle licence globale ou qualification CC0 n'est attribuée à ces fichiers.

| Fichier | Triangles | Traitement |
| --- | ---: | --- |
| `museum.glb` | 97 487 | Copie exacte du décor Meshy complet |
| `safe-box.glb` | 3 026 | Meshy-T2.5 Smart Topology, cible 3 000, textures 2K ; fichier natif intact |
| `camera-box.glb` | 1 218 | Petite boîte fermée créée localement, zéro crédit |
| `lockers.glb` | 7 577 | Copie exacte des casiers |
| `art/source/electrical-box.glb` | 16 186 | Source native du rendu du mini-jeu uniquement ; absent du diorama |
| `male.glb` | 16 608 | Rig Meshy natif, trois clips regroupés sans rééchantillonnage |
| `female.glb` | 16 656 | Rig Meshy natif, trois clips regroupés sans rééchantillonnage |
| `guard.glb` | 14 442 | Rig Meshy natif, attente de fond |

Les PNG PBR intégrés conservent leur résolution d'origine, jusqu'à 4K. Aucun maillage n'est réexporté par Blender pour alimenter le jeu. `art/assemble_meshy.py` copie les décors à l'identique et ajoute les buffers d'animation aux rigs natifs. Le script vérifie l'identité de chaque bufferView original, de la hiérarchie, des matériaux, des images et de tous les buffers de clips copiés. Les translations de racine sont également intactes.

## Assemblage et personnages partagés

`src/meshy.ts` place les modèles dans des groupes Three.js : seules les transformations des parents changent. Les quatre postes et les quatre ancres de butin conservent leurs interactions. Le vrai coffre rectangulaire est posé sur le seuil de l'arche gauche. `src/safe.ts` distribue les triangles des pièces nativement disjointes entre caisson fixe et porte mobile. Les attributs POSITION, NORMAL et UV sont partagés sans modification ; chaque triangle original apparaît une fois. La charnière est un groupe parent. Le GLB téléchargé de Meshy demeure identique, sans export Blender ni décimation. Le décor comprend déjà la statue, les tableaux, plantes, bancs, vitrine, cordons et caméra ; ils n'ont pas été régénérés individuellement.

Deux bases partagées fournissent quatre joueurs avec des squelettes indépendants de 24 articulations. Julien et Léa utilisent leurs matériaux natifs. Max et Sarah appliquent uniquement une teinte de vêtement au shader : les cartes 4K et la géométrie restent partagées. Les portraits PNG transparents de 512 px proviennent du même rendu via `scripts/preview-meshy.mjs`.

Les trois clips visibles sont `idle`, `walk`, `drill`. Ils tournent respectivement en attente, pendant les déplacements et au bilan du forage. Les autres postes restent en attente ; aucun geste spécifique n'est ajouté pendant les mini-jeux 2D où le personnage est invisible. Le gardien possède seulement une attente de fond. `src/animation.ts` gère les transitions et le mouvement réduit.

## Écarts encore présents

Sarah conserve le chignon de la base féminine, au lieu des cheveux et du bonnet de son concept. Max partage la tête de Julien. Le coffre cintré précédent est retiré du jeu et archivé dans le paquet de production. Le rig et ses déformations proviennent de Meshy. Le rendu n'est donc pas présenté comme une reproduction identique de chaque concept.

## Reproduction

Le paquet de production local contient `raw/`, `rigs/`, `sources/`, les références et `quality-preservation.json`. Les originaux sont indispensables pour reconstruire les regroupements :

```sh
python art/assemble_meshy.py --sources CHEMIN_DU_PAQUET
blender --background --factory-startup --python art/build_camera_box.py
python art/prepare_safe.py --preview CHEMIN_DU_PAQUET/sources/safe-hinged.glb
blender --background --factory-startup --python art/render_electrical_minigame.py
blender --background --factory-startup --python art/review_meshy.py -- CHEMIN_DU_PAQUET
```

Le second script importe les fichiers sans décimation, réduction d'image ou retouche de poids, puis enregistre les scènes de revue Blender. Il n'exporte jamais les GLB du jeu. Les anciens scripts `build_museum.py`, `build_character.py` et `finish_assets.py` concernent les modèles historiques et ne doivent pas écraser les nouveaux fichiers.

Coût effectivement journalisé : **265 crédits** pour huit générations de modèles Meshy, dont la façade précédente archivée, trois rigs, la préparation du mouvement de forage et les applications des clips. La première production et sa restauration ont coûté 250 crédits. Le nouveau coffre a coûté les 15 crédits confirmés, sans remesh supplémentaire. Le petit boîtier et les assemblages locaux ne consomment aucun crédit. La proposition initiale de 21 modèles et 14 animations est abandonnée.

## Ressources conservées

Les unités de lingots et liasses Money Tour, la perceuse existante, les icônes, les sons synthétisés, les trois musiques fournies par Julien et les polices locales sont conservés. Leur provenance et les sources procédurales restent documentées dans `ASSETS-v3-procedural.md`. `art/inventory.json` donne les tailles et SHA-256 des 42 ressources originales. Le mini-jeu électrique utilise désormais le modèle 3D ; les cagnottes des quatre postes sont différenciées dans `config/rules.ts`.

## Poste caméras

Le poste `secure` conserve l’effet Alarme −2 ; sa cagnotte est de 6 pièces à partager. Son libellé est « Désactiver les caméras ». Sa cible 3D et son repère sont attachés à la caméra du mur droit, fixes dans les trois dispositions. Le petit boîtier fermé sous la caméra suit la référence fournie par Julien ; sa création à 1 218 triangles est locale, sans réduction après coup.

Le grand boîtier ouvert est réservé à l’épreuve électrique. `src/electrical-board.ts` précharge l’original intact `art/source/electrical-box.glb` (30,19 Mo), publié par Vite avec un nom versionné. Le PNG historique et son script de rendu restent archivés ; ils ne servent plus de fond au mini-jeu. Les câbles sont des géométries 3D dont les extrémités rejoignent les prises du modèle. L’interrupteur natif est séparé à l’exécution pour pivoter : 16 099 triangles de corps et 87 d’interrupteur conservent les 16 186 triangles d’origine. Chaque cible accessible de 44 pixels contient son point physique, avec des zones séparées sur petit écran. Tap, glisser et clavier utilisent le même état d’épreuve. L’entraînement attend le chargement avant de démarrer ses 18 secondes ; en partie, le délai reste celui de l’hôte.

Les GLB sources du musée, du coffre et des personnages restent intacts. Les placements des casiers et du butin sont corrigés dans `meshy.ts` et les dispositions ; le sol est mesuré par rayon et les unités de richesse sont recentrées sur leur face inférieure à l’exécution. La trace rouge de la plinthe gauche est corrigée par un shader limité aux texels rouges de cette zone. Les matériaux et éclairages chauds se règlent dans `scene.ts`. Ces corrections ne consomment aucun crédit de génération.
