# Validation v3 — 17 octobre 2026

## Contrôles exécutés

- `npm test` : **45 tests passent**. Les nouvelles vérifications couvrent le vol du gain courant (11 sur 12), les vols multiples et croisés sans cascade, la vigilance privée au tour suivant, son retour à la normale, le vote terminé dès les quatre réponses et Passer sans charge. Les règles antérieures de résolution simultanée, FBI, fuite, confidentialité et reconnexion restent couvertes.
- Les défis de vol difficiles ont été terminés par simulation pour les sept décalages de départ, à 30 et 60 FPS, dans les 18 secondes. Une erreur fait perdre une prise. Ceci vérifie la faisabilité, sans prétendre mesurer le taux de réussite humain.
- La découpe accepte 70 % avec une tolérance spatiale de 0,09 (anciennement 0,045), interpolation des mouvements et petits retours. Les tests conservent le refus d’un départ éloigné et des tracés trop imprécis.
- TypeScript/Vite, `npm run format:check` et `git diff --check` passent. Les **34 ressources** du manifeste ont tailles et SHA-256 vérifiés.
- Les scripts Blender du musée et du butin ont été exécutés. Les anciens sacs sont retirés ; quatre plateaux `PROP_Wealth_0` à `3` les remplacent. Les unités Money Tour réutilisées sont exportées dans `wealth.glb`, avec leurs sources éditables. Le personnage et les portraits restent conservés.

## Seize parcours Chrome exécutés

La suite existante de treize parcours passe, puis les trois scénarios de présentation de cette version passent. Les premières erreurs du nouveau scénario de pile concernaient sa fixture : il attendait des statistiques de rendu pendant une transition qui suspend volontairement la 3D. La fixture commence désormais en choix secret, quand la scène est visible.

- Six formats : **1440×900, 844×390, 740×360, 667×375, 390×844 et 320×740**. Huit repères visibles, cibles de 44 pixels minimum, absence de collision entre repères et de débordement horizontal, choix et gains lisibles.
- Six épreuves jouées via leurs commandes ; câbles aussi au clavier et par glisser. Tactile Chrome réel émulé pour maintenir/relâcher et taps. Le tracé de toile volontairement erroné échoue, un seul tap réinitialise, puis un tracé tactile espacé et décalé jusqu’à 4,5 % réussit (100 % dans le couloir élargi). Talkie terminé sur trois fréquences. Lecture des trois musiques, changement de piste et mute vérifiés. Le minuteur d’un entraînement ne fige pas le suivant.
- **Quatre navigateurs WebRTC réels, deux manches** : prêts, choix secret invisible chez les autres, rechargement invité et hôte, pause/reprise, conservation des rôles, compteurs de votes synchronisés. La quatrième réponse lance la prochaine manche sous trois secondes, avec un nouveau délai complet. Les annonces centrales des promesses et choix secrets sont présentes. Le FBI règle trois fréquences et fait échouer une cible ayant déjà terminé son défi. La deuxième manche, dont l’alarme baisse, ne contient aucune explication d’alarme.
- **Trois scénarios à partir de sauvegardes d’hôte connues** : piles qui passent de `[3,12,24,48]` à `[7,8,36,60]`, avec une diminution chez la victime ; bilan silencieux sans calcul d’alarme ; annonce au centre mesurée ; avertissement de vigilance et défi difficile conservés après rechargement ; bilan d’un poste réussi à +12, vol de −11, solde +1. Ces cas sont des fixtures de présentation, distinctes du parcours réseau sans injection.

Captures examinées : annonce centrale en paysage, découpe tolérante, piles de lingots et billets, bilan silencieux et gain courant volé. Le texte des alarmes emploie « Alarmes désactivées par N joueurs ». Le son de sirène et son explication partagent le même déclencheur : une hausse effective du niveau.

## Rendu et limites

Musée : **45 308 triangles** ; quatre personnages : **38 232** ; base : **83 540**. Les deux unités de butin réunies comptent **674 triangles**. Elles sont regroupées en six lots d’instances pour les quatre portefeuilles. Les piles ajoutent une quantité variable, plafonnée à douze unités par joueur ; au-delà, leur hauteur augmente. Le maximum théorique avec quatre piles pleines et quatre perceuses est **107 812 triangles**. Ces comptes ne prouvent pas 30 FPS sur téléphone physique.

Non exécutés : téléphone physique, Safari/iOS, quatre réseaux domestiques distincts/NAT restrictifs, équilibrage avec plusieurs groupes humains. L’économie et la difficulté sont vérifiées numériquement et via des contrôles navigateur ; aucun taux de victoire ou de satisfaction humaine n’est annoncé.

L’hôte garde les secrets et la logique dans son navigateur ; PeerJS ne sert qu’à la signalisation. Pas de serveur Node personnel, migration d’hôte ni TURN privé. Les salons et sauvegardes passent au préfixe v3 pour éviter de mélanger les règles incompatibles. La validation v2 reste archivée dans `VALIDATION-v2.md`.
