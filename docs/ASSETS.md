# Modèles Meshy natifs — 17 octobre 2026

Le musée et les personnages du jeu utilisent les sorties Meshy originales. Les simplifications, réductions de textures, poids corrigés manuellement et coiffures remodelées ont été retirés à la demande de Julien. L'ancienne documentation procédurale est conservée dans `ASSETS-v3-procedural.md` ; elle décrit les sources historiques, pas les nouveaux modèles affichés.

## Sources et conservation

`art/meshy-provenance.json` conserve les identifiants des travaux Meshy, les coûts et les empreintes des sept fichiers de jeu. Les concepts ont été fournis par Julien ; quatre images de préparation ont servi aux générations. Les sorties proviennent de son compte Meshy 7.1 standard. Aucune nouvelle licence globale ou qualification CC0 n'est attribuée à ces fichiers.

| Fichier | Triangles | Traitement |
| --- | ---: | --- |
| `museum.glb` | 97 487 | Copie exacte du décor Meshy complet |
| `vault.glb` | 11 041 | Copie exacte de la façade cintrée Meshy |
| `lockers.glb` | 7 577 | Copie exacte des casiers |
| `electrical-box.glb` | 16 186 | Copie exacte du boîtier et de sa porte ouverte |
| `male.glb` | 16 608 | Rig Meshy natif, trois clips regroupés sans rééchantillonnage |
| `female.glb` | 16 656 | Rig Meshy natif, trois clips regroupés sans rééchantillonnage |
| `guard.glb` | 14 442 | Rig Meshy natif, attente de fond |

Les PNG PBR intégrés conservent leur résolution d'origine, jusqu'à 4K. Aucun maillage n'est réexporté par Blender pour alimenter le jeu. `art/assemble_meshy.py` copie les décors à l'identique et ajoute les buffers d'animation aux rigs natifs. Le script vérifie l'identité de chaque bufferView original, de la hiérarchie, des matériaux, des images et de tous les buffers de clips copiés. Les translations de racine sont également intactes.

## Assemblage et personnages partagés

`src/meshy.ts` place les modèles dans des groupes Three.js : seules les transformations des parents changent. Les quatre postes et les quatre ancres de butin conservent leurs interactions. La porte est un pivot parent de la façade native entière : aucune face n'est découpée. Le décor comprend déjà la statue, les tableaux, plantes, bancs, vitrine, cordons et caméra ; ils n'ont pas été régénérés individuellement.

Deux bases partagées fournissent quatre joueurs avec des squelettes indépendants de 24 articulations. Julien et Léa utilisent leurs matériaux natifs. Max et Sarah appliquent uniquement une teinte de vêtement au shader : les cartes 4K et la géométrie restent partagées. Les portraits PNG transparents de 512 px proviennent du même rendu via `scripts/preview-meshy.mjs`.

Les trois clips visibles sont `idle`, `walk`, `drill`. Ils tournent respectivement en attente, pendant les déplacements et au bilan du forage. Les autres postes restent en attente ; aucun geste spécifique n'est ajouté pendant les mini-jeux 2D où le personnage est invisible. Le gardien possède seulement une attente de fond. `src/animation.ts` gère les transitions et le mouvement réduit.

## Écarts encore présents

Sarah conserve le chignon de la base féminine, au lieu des cheveux et du bonnet de son concept. Max partage la tête de Julien. La sortie Meshy du coffre est une façade cintrée plutôt que le coffre carré du concept ; elle est utilisée intacte. Le rig et ses déformations proviennent de Meshy. Le rendu n'est donc pas présenté comme une reproduction identique de chaque concept.

## Reproduction

Le paquet de production local contient `raw/`, `rigs/`, `sources/`, les références et `quality-preservation.json`. Les originaux sont indispensables pour reconstruire les regroupements :

```sh
python art/assemble_meshy.py --sources CHEMIN_DU_PAQUET
blender --background --factory-startup --python art/review_meshy.py -- CHEMIN_DU_PAQUET
```

Le second script importe les fichiers sans décimation, réduction d'image ou retouche de poids, puis enregistre les scènes de revue Blender. Il n'exporte jamais les GLB du jeu. Les anciens scripts `build_museum.py`, `build_character.py` et `finish_assets.py` concernent les modèles historiques et ne doivent pas écraser les nouveaux fichiers.

Coût effectivement journalisé : **250 crédits** pour sept modèles, trois rigs, la préparation du mouvement de forage et les applications des clips. Aucun crédit supplémentaire pour la restauration et l'assemblage Blender. La proposition initiale de 21 modèles et 14 animations est abandonnée.

## Ressources conservées

Les unités de lingots et liasses Money Tour, la perceuse existante, les six mini-jeux 2D, les icônes, les sons synthétisés, les trois musiques fournies par Julien et les polices locales sont conservés. Leur provenance et les sources procédurales restent documentées dans `ASSETS-v3-procedural.md`. `art/inventory.json` donne les tailles et SHA-256 actuels des 40 ressources. Les règles et les échanges de secrets ne changent pas.
