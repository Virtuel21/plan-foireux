# Vérifications

## Version 0.3 — 17 octobre 2026

### Moteur et compilation exécutés

- 29 tests passent : 23 du moteur et 6 de session avec transport simulé. Compilation TypeScript stricte et build Vite exécutés.
- Nouveaux cas : engagement irréversible de la fouille, interdiction de changer d'objet/action ensuite, indices et marquages privés au seul joueur engagé, douze emplacements et six permutations d'indices observés sur 100 graines, aucun cadeau au délai si la fouille n'est pas terminée, prime unique simultanée et absence de farming. Le FBI est exposé à la fin, y compris après fuite réussie.
- Contrôle géométrique Three.js séparé sur 36 configurations (3 objets × 12 marquages) : invisibles initialement, trouvables après rotation, pas de détection à travers l'objet, callback unique. Ce contrôle de géométrie n'est pas un test visuel.

### Parcours navigateur réellement exécutés en local

- Interface publique avec deux postes, besoins d'équipe, avatars des promesses et bouton de confirmation qui nomme le poste et le gain. Phase secrète avec tenir parole/voler, gain potentiel et coût collectif. Le choix secret de vol a donné 18 au joueur ; la promesse rompue était visible ensuite.
- Portrait simulé 390 × 844 : seule la garde d'orientation est accessible ; le jeu est inerte. Paysage 844 × 390 : musée et décisions côte à côte, confirmation accessible, pas de débordement horizontal.
- Parcours complet : fouille du cadre (chiffre 2 = 6), du tiroir du bureau (chiffre 3 = 4), puis de la statue (chiffre 1 = 3). Glissement réellement exécuté sur les objets ; captures avant/après du tiroir confirment sa rotation. Les flèches de rotation ont aussi permis de découvrir et lire les chiffres écrits sur leurs surfaces. Chaque première découverte a donné 6 pièces ; la lecture privée a persisté dans le carnet.
- Les trois vrais chiffres ont été annoncés puis saisis au coffre : 364, code correct, salaire de 3 et coffre ouvert. Le sac est passé de 8 à 64.
- Une révélation de trois voleurs a affiché trois avatars rouges, l'animation CSS `betrayalPulse` de 1,5 seconde, les étiquettes « Promesse rompue » ou « Vol du butin », et les gains avec pièces dans le décor. Un chevauchement des étiquettes de gains a été repéré et corrigé après ce parcours.
- Fuite jouée en tenant le volant : une couverture a sauvé la diversion abandonnée. Victoire de Julien avec 40 pièces ; le sac de 64 a ajouté 16 à chacun. Le FBI Léa, encore actif, a été révélé dans la scène et dans la grande carte finale avec portrait et nom. Son score de 40 ne lui a pas donné la victoire des braqueurs.
- Aucune erreur ni avertissement console lors de ce parcours local complet.
- Salon WebRTC réel avec deux humains simulés par deux onglets et quatre bots : engagement de fouille invité transmis, rechargement pendant la manipulation, même siège et même fouille irréversible retrouvés. Après rotation, le vrai chiffre 7 est arrivé dans le carnet privé ; l'annonce publique 2 était visible dans le carnet de l'hôte sans la valeur privée. Les deux consoles n'ont relevé ni erreur ni avertissement.
- Après correction du cinéma trop haut, révélation à 740 × 360 : 6 étiquettes de gain sur 6 visibles, aucune intersection entre leurs rectangles DOM, liens vers les personnages et six avatars sur une seule rangée. La liste d'avatars est recentrée au début de chaque phase pour éviter de conserver le défilement d'une ancienne consultation du carnet.

### Limites

Ces parcours vérifient le fonctionnement et la lisibilité des états, sans prouver la compréhension d'un nouveau joueur ni l'amusement d'un groupe humain. Pas d'essai sur téléphone physique ou Safari/iOS. La garde portrait est vérifiable en navigateur ; la rotation matérielle et l'API de verrouillage paysage ne sont pas garanties sur chaque appareil. Les restrictions réseau et l'hôte de confiance décrits plus bas restent applicables.

## Version 0.2 — 17 octobre 2026

### Exécuté localement

- 28 tests automatisés passent : 22 tests du moteur et 6 de session avec transport simulé.
- Le moteur vérifie les six actions, l'économie du vol, la réparation plafonnée, la couverture, les primes de découverte simultanée indépendantes de l'ordre réseau, l'absence de gains en refouillant un indice connu, les annonces fausses et les commandes invalides ou verrouillées.
- Les tests couvrent le vrai code, le forçage, une seule seconde tentative au coffre, la fuite sans trésor, les gains encaissés après la révélation finale, les votes et les parties de bots sans blocage.
- Les tests de session couvrent la transmission des mutations privées au seul destinataire, la reconnexion, les anciens canaux ignorés, la suppléance après 20 secondes d'absence, les limites de débit et la révélation minimale de 8 secondes.
- Compilation TypeScript stricte et build Vite de production exécutés avec succès.
- Des simulations de bots et de stratégies simples ont servi à détecter les blocages et le vol systématiquement avantageux. Elles ne mesurent pas l'amusement entre humains.

### Exécuté dans le navigateur sur GitHub Pages

- Fouille du cadre : manipulation de compartiments, compartiment vide puis enveloppe trouvée. Aucun vrai chiffre affiché avant de consacrer l'action à la fouille. Révélation avec gain de 6 pour la première découverte.
- Le carnet privé montrait un vrai chiffre 9 et permettait de publier 2. L'annonce publique et la vérité privée restaient séparées.
- Vol après une promesse de poste : trois voleurs ont touché 6 chacun ; les deux postes abandonnés et le vol ont fait passer l'alarme de 0 à 5. Les cartes montraient les promesses rompues, les gains et les dégâts. Ces preuves restaient visibles au vote.
- Réparation et couverture exécutées ; l'alarme est redescendue de 5 à 3. Une couverture inutile a rapporté 0.
- Clavier du coffre manipulé : saisie réelle de 240 puis verrouillage. La mauvaise tentative a rapporté 0 ; un bot a forcé le coffre et une réparation a compensé son bruit. Le sac est passé de 8 à 48. La phrase du mauvais code a ensuite été corrigée pour ne pas affirmer que le coffre restait fermé lorsqu'un autre joueur l'ouvrait.
- Une fin de fuite réussie a été observée dans ce parcours, avec un sac de 56 réparti et les rôles révélés. La dernière phase a progressé avec les délais de secours ; ce n'est pas un parcours de fuite entièrement manuel.
- Salon WebRTC réel entre deux onglets sur 0.2 : invitation, siège invité, lancement, promesses, fouille privée et choix secrets. À la révélation : deux voleurs à 9, premier découvreur à 6 et poste tenu à 3.
- L'invité a découvert le vrai chiffre 7 puis annoncé 2. Le carnet de l'hôte montrait uniquement l'annonce 2 et aucune découverte privée. Après rechargement/reconnexion, l'invité a retrouvé son siège, le vrai 7 et son annonce 2.
- Une manche commune suivante a confirmé la réparation, la couverture inutile, les postes tenus, l'alarme 3 → 1, le sac 0 → 8 et la grande révélation avec portraits et gains.
- Formats simulés 390 × 844, 320 × 740 et 844 × 390 : pas de débordement horizontal après correction de la jauge d'alarme. Les six cartes mesuraient 161 px de large à 390 px. La fouille du cadre a été manipulée à 320 px, trois zones d'environ 57,7 px de large ; la révélation montrait les quatre cartes et leurs gains. Le délai de secours a verrouillé la fouille trouvée pendant ce parcours.
- L'écran de fin a été clarifié après observation : noms des gagnants, montant et partage du sac, gains encaissés ou butin perdu, au lieu du texte « à risque » resté affiché.
- Les déploiements Pages de 0.2 ont passé leurs contrôles GitHub Actions. La version publiée a été utilisée pour ces vérifications.

### Limites de cette vérification

La seconde tentative au coffre est exécutée par les tests du moteur ; elle n'est pas revendiquée comme un parcours manuel dans le navigateur. Aucun essai humain à 4–6 amis, sur téléphone physique, Safari/iOS ou deux réseaux distincts n'est revendiqué. L'équilibrage et l'amusement demandent des parties humaines. L'hôte reste nécessaire et constitue l'autorité de confiance ; certains réseaux nécessitent un relais TURN non fourni.

## Historique 0.1

## Exécuté localement

- Compilation TypeScript stricte et build de production Vite.
- 9 tests automatisés du moteur : génération reproductible sur 400 configurations de 3 à 6 joueurs ; un seul agent ; absence des secrets dans les vues invitées ; butin et alarmes ; majorité absolue ; éjection et destruction des gains ; partie coopérative complète ; échec après éjection du FBI ; code incorrect ; récupération des anciens indices ; commandes obsolètes ou doubles ; délais d'expiration.
- Export GLB exécuté dans Blender 5.2.2 LTS, source `.blend` sauvegardée.

## Exécuté dans le navigateur sur GitHub Pages

- Chargement de la scène WebGL, du GLB et des six portraits. Aucun message d'erreur ou d'avertissement dans la console lors de la vérification du chargement de la dernière version.
- Partie solo : rôle privé, annonce d'un poste, verrouillage secret, révélation, distribution du butin et passage au vote.
- Salon PeerJS réel entre deux onglets, sans transport de substitution : création, invitation, remplacement d'un bot par l'invité, lancement commun, rôles individuels, promesses et choix secrets.
- L'invité a promis le gardien puis choisi le butin : son choix réel est resté caché dans l'interface de l'hôte avant la révélation. La révélation commune a affiché la promesse rompue, le partage du butin et l'alarme correspondante.
- Rechargement de l'onglet invité : reprise du même siège, du rôle et des 4 pièces provisoires. Pendant l'absence, la suppléance a également enregistré un vote ; cet état a été retrouvé à la reconnexion.
- Une fin de partie FBI avec perte du butin a été observée dans les deux onglets. La réussite complète et le mauvais code ont été exécutés dans les tests du moteur ; la fuite victorieuse complète n'est pas revendiquée comme un parcours manuel dans le navigateur.
- Formats simulés : 390 × 844, 320 × 740 et 844 × 390, sans débordement horizontal. À 390 px, les trois cartes mesuraient 105 px de large ; à 320 px, environ 81,7 px. La capture mobile montre les cartes, la confirmation et l'équipe avec ses portraits.
- Les workflows GitHub Actions ont exécuté les tests, le build et le déploiement Pages avec succès pour les deux premières versions du code. Le site public a répondu HTTP 200.

## Limites et prochaines vérifications

Aucun test sur téléphone physique, Safari/iOS, ni sur deux réseaux distincts n'est revendiqué. WebRTC peut nécessiter un relais TURN sur certains réseaux. L'hôte reste nécessaire, et son rechargement termine le salon. L'équilibrage des bots et les négociations entre humains demandent des parties de test. La comparaison artistique reste qualitative : ce rendu jouable original est plus simple que le concept ImageGen.
