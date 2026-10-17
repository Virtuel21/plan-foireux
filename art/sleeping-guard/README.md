# Gardien endormi fourni par Julien

`public/models/guard-sleeping.glb` est la copie binaire exacte de `gardien-endormi.glb`, fourni dans le dossier `uti/outputs/gardien-endormi`. Son SHA-256 est `0ae2f3c0d9882033446de40fd43a112aee19751192131e59cbc9fed6f6ea33f2` (3 334 852 octets, 13 429 triangles). La géométrie, les textures intégrées, le squelette et le clip source sont conservés. L'objet `Chaise` est déjà inclus : aucun second modèle de chaise n'est chargé.

`source-provenance.json` et `source-verification.json` sont les relevés joints au modèle fourni. Ils attribuent le personnage et le rig à Meshy, puis la chaise, les paupières et l'animation à la création locale dans Blender. Aucun nouveau travail Meshy ni crédit de génération n'a été utilisé pour cette intégration.

Le fichier source modifiable `gardien-endormi.blend` est également conservé ici à l'identique, hors des fichiers publics (SHA-256 `ce5a2606785974e0955638f554e85481c630821c7855bf1d8e0ed274d8acec72`). Aucun export Blender supplémentaire n'est nécessaire pour reproduire l'intégration : le GLB fourni et le module de boucle suffisent.

Le clip source `Reveil_Sursaut_Debout` demeure intégré mais n'est pas joué dans le musée. La demande d'intégration impose de conserver le gardien endormi. `src/sleeping-guard.ts` construit donc `GuardSleepLoop` à partir du premier échantillon de chaque piste : hanches, membres et paupières restent dans la pose assise aux yeux fermés. Seules de très petites rotations de la colonne et de la tête ajoutent une respiration de 3,6 secondes. Les tableaux de clés du clip source ne sont pas modifiés.

Le groupe entier est posé dans `src/meshy.ts` à `(-3.65, 0.15, -1.9)`, tourné de `0.12` radian, à gauche du banc sous le tableau central. La chaise reste immobile et aucun réveil n'est déclenché par une phase de jeu. Les anciens `guard.glb` et `lockers.glb` sont conservés comme ressources historiques, sans chargement dans la scène.

`tests/scene.test.ts` vérifie la conservation du clip source et les invariants de sommeil. `scripts/qa-museum-fixes.mjs` charge le vrai modèle dans Chrome, contrôle plusieurs instants de sa boucle, le dégagement avec le décor, le poste statue fixe, et les chemins des personnages allant aux caméras.
