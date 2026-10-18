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

## Musée, interface mobile, cagnottes et boîtier interactif — 18 octobre 2026

Cette recette remplace les passages précédents décrivant le boîtier comme un fond PNG et les postes à cagnotte uniforme. Les GLB sources restent intacts ; les modifications sont réalisées à l’exécution.

`npm test` : **48/48 tests réussis**. Les ajouts vérifient les quatre cagnottes 10/6/16/24, le partage selon les participants réels, les parts ratées perdues, les changements tardifs privés et le vol proportionnel au revenu. Le test de richesse contrôle l’appui indépendamment de l’origine du modèle. `npm run build`, `npm run format:check` et `git diff --check` passent. Vite signale un chunk d’environ 806 ko, supérieur au seuil indicatif de 800 ko ; le build aboutit. Le GLB électrique original ajouté au chargement pèse 30,19 Mo, sans réduction de texture ou de géométrie.

**21 parcours Chrome distincts ont été validés.** La première suite complète a réussi 19 parcours et révélé deux problèmes de recette/reprise. Après les corrections, les deux parcours concernés ont passé ensemble, seuls, sur le build de production local, sans enregistrement de traces : WebRTC à quatre navigateurs et reprise d’un vol difficile. Les 18 secondes autoritaires de l’épreuve restent inchangées. Le rendu du boîtier est désormais déclenché par les gestes et changements visuels ; une mesure instrumentée constate zéro nouvel appel WebGL pendant 600 ms au repos, puis huit lors d’une sélection. Les annonces temporaires sont observées dès DOMContentLoaded afin de ne pas attendre la fin des chargements 3D sans rapport avec elles.

- Musée et commandes : 1440×900, 844×390, 740×360, 667×375, 390×844 et 320×740. En petit format, les bulles sont masquées au profit du panneau de postes et complices ; sélection réelle des caméras, état pressé, icône pièce et absence de débordement horizontal vérifiés. Captures examinées, notamment les quatre complices visibles en 320×740.
- Boîtier natif : 1000×800, 844×390 et 320×740 ; deux panneaux terminés par tap/clic, glisser et clavier. Les zones de 44 pixels ne se chevauchent pas et contiennent chacune le point physique correspondant. Débranchage, tentative erronée et relance après deux requêtes réseau interrompues réussissent. La séparation de l’interrupteur conserve les 16 186 triangles : 16 099 de corps et 87 d’interrupteur. Les cinq nouveaux parcours passent après optimisation ; le parcours ralenti par une exécution concurrente a été rejoué seul avec succès.
- WebRTC : quatre contextes Chrome avec signalisation publique PeerJS, choix secret différent de la promesse, invité quittant puis rechargeant pendant les câbles, câble restauré, deux panneaux réussis, gain caméras de 6 pièces, rechargement de l’hôte conservant les rôles et résultats, vote synchronisé, puis brouillage FBI et bilan commun du tour suivant. Ce parcours utilise les commandes mobiles visibles.
- Les épreuves de forage, casiers, vol, découpe et talkie, les gestes tactiles simulés, la durée propre à chaque entraînement, les gains/pertes et le focus clavier ont également été exécutés.

`scripts/qa-museum-fixes.mjs` contrôle le rendu réel et les triangles du décor : 16 variantes de richesse (1/36/90/180 pièces, quatre sélections), aucune intersection avec le musée ni chevauchement entre propriétaires ; casiers dégagés dans les trois dispositions ; clic direct sur la toile réussi. Les captures 1440×960, 844×390, 390×844 et 320×740 ont été examinées. La lumière est plus chaude, la plante est dégagée, les piles reposent dans l’allée et les texels rouges de la plinthe près du coffre sont corrigés. Aucune erreur JavaScript ou WebGL dans ce contrôle.

Ces essais sont exécutés sur ordinateur avec Chrome, y compris la simulation tactile. Aucun téléphone physique ni Safari/iOS n’a été testé. Les quatre clients WebRTC partagent la même machine et ne prouvent pas le passage de tous les réseaux domestiques. Les cagnottes sont vérifiées mécaniquement ; leur équilibre avec des groupes humains reste à éprouver.

## Gardien endormi, statue et vigilance du groupe — 18 octobre 2026

Le GLB et le fichier Blender du gardien fourni ont des SHA-256 identiques aux originaux. Le musée charge `guard-sleeping.glb` avec sa chaise ; il ne demande plus les anciens `guard.glb` ni `lockers.glb`. La boucle construite à l’exécution reprend la pose assise aux yeux fermés et ajoute uniquement une petite respiration. Le clip de réveil fourni reste intact et n’est jamais joué. Aucun déclencheur de réveil n’est ajouté.

`npm test` : **57/57 tests réussis**. Les ajouts couvrent la difficulté des vols consécutifs même en changeant de cible, la remise à zéro après un tour sans vol, les trois étapes et le bruit de la statue à 30/60 FPS, la restauration JSON et des sauvegardes anciennes, les goupilles archivées, la conservation de la pose du gardien et les trajets caméras. Le build TypeScript/Vite, le formatage et `git diff --check` passent. Le bundle JavaScript atteint environ 816 ko et conserve l’avertissement indicatif de taille de Vite ; le build aboutit.

**29 parcours Chrome distincts sont validés sur le build de production local.** La suite complète a réussi 28 parcours et révélé une commande tactile incorrecte dans le nouveau test à deux doigts : CDP `touchEnd` termine tous les contacts et attend une liste vide. Le retrait du second doigt utilise désormais `touchMove` avec le premier contact restant ; le parcours corrigé a repassé seul, sans modification du code de jeu entre les deux exécutions. Le portage reste actif après le retrait du second doigt, suit le premier puis s’arrête à son relâchement.

La statue est terminée à la souris en 1440×900, au clavier en 844×390 et au toucher simulé en 320×740 ; un essai bruyant peut être relâché puis terminé. Les plaques et prises électriques passent les contrôles géométriques, les deux panneaux, le débranchage, l’erreur et la relance réseau dans trois formats. Le talkie passe les contrôles de logement, dimensions tactiles, absence de recouvrement et gestes dans les mêmes formats. Le musée et son panneau mobile passent les six formats déjà documentés.

Le parcours WebRTC utilise quatre contextes Chrome avec la signalisation publique PeerJS : changement secret de poste, rechargement d’un invité pendant les câbles et restauration d’un circuit, puis câbles et statue joués simultanément. Les gestes tactiles rapides de la statue aboutissent au gain attendu de 8 pièces avec deux participants réels dont un échoue. Rechargement de l’hôte, conservation des rôles et résultats, vote synchronisé et brouillage FBI du tour suivant passent. Le parcours de vigilance restaure un ancien vol sur une cible différente, constate la nouvelle difficulté et la conserve après rechargement.

`scripts/qa-museum-fixes.mjs` a été exécuté dans Chrome avec les vrais modèles. Les 15 sous-ensembles de joueurs, de un à quatre participants, ont été contrôlés à l’aller et au retour vers les caméras, puis vers la statue, avec 31 échantillons par segment : aucune collision des enveloppes de corps avec les triangles du décor. Les trajets caméras conservent également la séparation des joueurs restés à leur emplacement initial. Les quatre arrivées caméras ont ensuite été réellement animées, et les boîtes des corps skinnés ne se chevauchent pas et ne rencontrent pas le décor. Ces échantillons ne constituent pas une simulation physique continue.

Le même contrôle observe sept instants de la boucle du gardien jusqu’à 21,6 secondes : hanches, paupières et chaise immobiles ; respiration de la tête ; seule `GuardSleepLoop` active. Les clics sur la statue et la toile passent, ainsi que les captures 1440×960, 844×390, 390×844 et 320×740, sans erreur JavaScript/WebGL. Captures examinées. La scène compte 181 688 triangles sans argent et 200 088 avec quatre piles de 36 pièces, pour 29 appels de dessin dans cette dernière configuration.

Le moteur et l’interface des casiers restent réutilisables dans `src/archive/`. Une recette Chrome séparée a terminé leurs trois goupilles à la souris et avec Espace, puis vérifié l’arrêt des mises à jour après `dispose()` ; aucune erreur JavaScript.

La vérification publique reproductible est `scripts/qa-statue-release.mjs`. Définir `PF_TEST_URL` avec l’URL publiée et `?rev=<SHA>`, puis `PF_QA_DIR` avec un dossier de preuves, et lancer `node scripts/qa-statue-release.mjs`. Elle joue les trois étapes de statue, les deux panneaux électriques et les trois fréquences du talkie par les commandes visibles, contrôle les requêtes de modèles et capture le musée et le panneau mobile. `PF_EXPECTED_SHA` permet de reporter explicitement la révision dans le relevé ; les noms d’assets chargés doivent être comparés au build publié pour identifier le code réellement servi.

Les essais tactiles restent simulés dans Chrome sur ordinateur. Téléphone physique, Safari/iOS, réseaux domestiques distincts et équilibre de la nouvelle épreuve avec un groupe humain ne sont pas validés par cette recette.


## Réglages audio, zoom et trahison lisible — 18 octobre 2026

`npm test` : **59/59 tests réussis**. Les nouveaux contrôles vérifient 120 découpes distinctes sur les six familles, leur fermeture, leur maintien dans le cadre, la précision avec des points tactiles espacés et la restauration JSON. Le moteur impose cinq familles différentes à un même joueur pendant les cinq manches et refuse une progression qui remplace la forme attribuée. Les sauvegardes anciennes sans version de contour gardent le tracé initial.

`npm run build`, `npm run format:check` et `git diff --check` passent. Le bundle JavaScript reste au-dessus du seuil indicatif de Vite : environ 826 ko ; le build aboutit. Aucun modèle ni texture n’a été modifié. Les trois volumes s’appliquent aux éléments audio en cours et la coupure générale arrête aussi les sons ponctuels actifs.

**37 parcours Chrome distincts ont passé ensemble sur le build de production local**, via `PF_TEST_URL=http://127.0.0.1:4173 npx playwright test --output=work/qa-production --trace=off`. La suite dure environ 6,8 minutes. Après la dernière correction CSS limitée à l’en-tête des portraits de largeur ≤ 360 pixels, le build a été régénéré et le parcours 320×740 rejoué avec succès, avec une assertion supplémentaire qui interdit le rognage vertical de la marque.

- Réglages : curseurs natifs au clavier en 844×390 et 320×740, volumes musique/effets en lecture, effet du volume général, coupure/réactivation, persistance après rechargement et disponibilité en partie. Les tests mesurent les propriétés des lecteurs ; ils ne prouvent pas le niveau acoustique d’un haut-parleur physique.
- Zoom : vrais événements tactiles Chrome simulés en 844×390, 390×844 et 320×740 ; pincement, déplacement, protection du choix sélectionné, mémorisation après rechargement, retour en partie, recentrage et bouton +. Le retour à l’accueil d’une partie solo conserve la préférence de caméra.
- Interface PC : quatre fiches hors de la scène en 1440×900 ; argent et icône pièce au-dessus des joueurs ; trois boutons de vol uniquement en phase secrète pour les adversaires autorisés ; sélection par le repère de tête et synchronisation avec la fiche latérale. Les six formats du musée restent couverts : 1440×900, 844×390, 740×360, 667×375, 390×844, 320×740.
- Boîtier : deux panneaux réussis en 1000×800, 844×390 et 320×740, par clic/tap, glisser et clavier, sans bouton de validation. Une combinaison entièrement erronée est libérée automatiquement ; débranchement et relance après requêtes GLB interrompues passent. Les cibles de 44 pixels restent séparées et alignées avec le modèle.
- WebRTC : quatre contextes Chrome et signalisation publique PeerJS ; choix secret différent de la promesse, rechargement d’un invité avec un câble restauré, câbles et statue, bilan commun, rechargement de l’hôte, vote puis brouillage FBI lors de la manche suivante. Les contrôles de portefeuille, pertes, richesse animée et vigilance après un vol passent.
- Statue terminée à la souris, au clavier et au toucher simulé ; portage à deux doigts, forage, poches, talkie, découpe avec dérive du pouce, entraînements successifs, mouvement réduit et focus de la carte de rôle passent.

Les captures des réglages, du boîtier, du panneau PC et des vues mobiles ont été examinées. La recette a notamment corrigé l’interception du bouton d’entraînement par les commandes de zoom à l’accueil et le rognage de la marque en 320 pixels. Les commandes de caméra visibles sont désormais réservées à la partie.

Les nouveaux jets de trahison et événements communs de `GAMEPLAY_PROPOSITIONS.md` restent des propositions : ils ne sont ni activés ni présentés comme équilibrés. Les essais tactiles sont simulés dans Chrome sur ordinateur ; téléphone physique, Safari/iOS, réseaux domestiques distincts et équilibre entre groupes humains restent non vérifiés.
