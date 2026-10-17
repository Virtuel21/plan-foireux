# Validation v2 — 17 octobre 2026

## Vérifications exécutées

- `npm test` : **37 tests passent**. Couverture des quatre cagnottes (12/6/4/3 selon la fréquentation), des parts ratées perdues, des vols multiples et croisés, des échecs à +1 alarme, de la résolution simultanée, de la fuite anticipée, de la priorité de la police, des votes publics agrégés, de la surveillance, des commandes illégales, du refus du vol public, des cibles privées FBI, du remplacement par le radio-défi, du brouillage d’un défi terminé et des six simulations d’épreuves. L’autorité et les secrets restent chez l’hôte.
- TypeScript/Vite et `npm run format:check` passent. Les 33 ressources du manifeste ont leurs tailles et SHA-256 vérifiés. Les trois MP3 sont identiques aux fichiers fournis par Julien.
- Les scripts Blender du musée et de l’export ont été exécutés. `POST_Painting` est une vraie racine du GLB ; la voiture et `PROP_Escape` sont supprimés des sources et de l’export. Le personnage partagé et ses couleurs sont conservés.

## Douze parcours Chrome

Les douze scénarios Playwright ont été exécutés en plusieurs commandes, sans modification de l’état des parties depuis les tests :

1. Six formats : **1440×900, 844×390, 740×360, 667×375, 390×844 et 320×740**. Huit repères visibles, cibles de 44 pixels minimum, aucune intersection ni sortie d’écran, pas de débordement horizontal, poste sélectionné et gain lisibles.
2. Câbles sur deux panneaux, terminés par clics/taps, glisser et clavier.
3. Perceuse, goupilles et sac terminés avec leurs commandes, après augmentation de difficulté.
4. Réduction du mouvement et focus de la fenêtre de règles.
5. Touches Chrome réelles (émulation tactile) : maintenir/relâcher pour perceuse et sac, taps pour goupilles.
6. Découpe réussie par tracé tactile sur le contour, précision mesurée 100 %. Talkie terminé en trois fréquences, avec glisser tactile du bouton puis flèches clavier. Boutons rotatifs mesurés à au moins 44×44 pixels.
7. Quatre contextes WebRTC réels et **deux manches** : quatre joueurs prêts ; changement secret invisible chez les autres ; progression et rechargement d’un invité ; pause/reprise ; rechargement de l’hôte avec conservation des rôles ; vote simultané donnant 3/4 chez les quatre clients ; puis sélection privée d’une cible FBI et réussite du talkie. La cible avait terminé son épreuve et apparaît malgré cela en échec à la révélation. Le FBI conserve son poste public de couverture ; aucun émetteur n’est révélé.

Les captures ont été examinées : musée paysage, promesses avec portraits/noms, découpe, talkie, quatre portraits de bilan et compteurs de vote. Les fenêtres peuvent défiler sur les petits écrans ; tous les boutons de vote restent accessibles. Le chrono du bilan/vote est aussi affiché dans la fenêtre.

Les trois pistes musicales sont intégrées localement. Lecture de l’accueil et du premier thème en partie vérifiée dans Chrome ; le passage au second thème est vérifié en plaçant la lecture près de la fin de la première piste, puis en constatant la nouvelle piste décodée et en lecture. Le mute persistant coupe effets et musique. Cette vérification porte sur la lecture navigateur, pas sur une écoute critique de mixage sur téléphone physique.

## Partie complète avec délais réels

`node scripts/qa-full-match.mjs` a joué avec trois bots, en 844×390 avec tactile émulé. Sélections par taps ; épreuves par les vrais boutons/clavier. Aucun résultat, état de partie ou délai n’est injecté.

**255,812 secondes (4 min 16 s)** du lancement au résultat. Trois manches et deux débats complets. Le coffre s’ouvre à la manche 3 et la fuite suit son bilan : aucun tour 4 artificiel. Julien et Sarah terminent à 26, tous deux Rois des Voleurs, Max à 14. Léa est révélée FBI et exclue du classement. **Aucune erreur JavaScript.** Preuve structurée : `docs/evidence/solo-full-match-v2.json`.

## Rendu et limites

Scène au repos mesurée : **85 884 triangles, 144 appels de dessin**, avec les quatre avatars. Musée : 47 652 triangles. Jusqu’à quatre perceuses de 1 468 triangles donnent 91 756 triangles. Ce sont des mesures de bureau, pas une preuve de 30 FPS sur téléphone physique.

Non exécutés : téléphone physique, Safari/iOS, quatre réseaux domestiques distincts ou NAT restrictifs, équilibrage et plaisir avec plusieurs groupes humains. La nouvelle économie et la difficulté sont implémentées et vérifiées numériquement ; aucun taux de victoire humain n’est annoncé.

Le service PeerJS ne sert qu’à la signalisation. La machine de l’hôte garde la logique et les secrets ; elle reste une machine de confiance. Aucun relais TURN privé ni migration vers un autre hôte n’est fourni. Les liens de salon et le GLB du musée sont versionnés pour éviter le mélange des anciennes et nouvelles règles/ressources.

Les anciennes mesures v1 et le brief initial restent archivés dans `VALIDATION-v1.md` et `BRIEF-v1-archive.md`.
