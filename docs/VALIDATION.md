# Vérifications 0.1

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
