# Plan Foireux — prototype jouable v2

Un musée Art déco, quatre complices, un FBI. Le brief du 17 octobre 2026 dans `docs/BRIEF.md` remplace les règles 0.x. La précision ultérieure de Julien prévaut sur son chapitre réseau : **le navigateur de l’hôte gère la partie localement**, sans serveur de jeu à déployer.

## Jouer

Choisissez un prénom, jouez avec trois bots ou invitez vos complices. L’hôte crée un salon et copie le lien. Chaque invité l’ouvre sur son écran, entre son prénom puis rejoint. Quatre joueurs prêts sont requis pour lancer une partie en ligne. Le salon garde les mêmes sièges pour Rejouer. Les discussions passent par Discord ou par la conversation dans la pièce.

Ouvrez le coffre pour fuir, en cinq manches maximum. À 5 alarmes, la police gagne. La fuite suit immédiatement la manche qui ouvre le coffre, avec priorité à la police si l’alarme atteint aussi 5.

Annoncez publiquement un poste parmi Forer, Sécuriser, Casiers ou Voler la toile. Les portraits et noms montrent qui promet quoi. En secret, choisissez votre vrai poste ou faites les poches d’un rival : le vol ne peut jamais être annoncé. Les phases durent 20 s de promesses, 12 s de secret, 18 s d’épreuve et 12 s de bilan. Un débat de 30 s suit chaque manche qui continue.

Chaque poste partage **12 pièces entre tous ses participants réels** : seul 12, à deux 6, à trois 4, à quatre 3 ; une part ratée est perdue. Forer ajoute aussi 2 au coffre ; Sécuriser retire 2 alarmes. Le vol prend jusqu’à 4 pièces au portefeuille initial d’un rival, partagé entre les voleurs réussis. Voler la toile demande de découper un contour avec 85 % de précision.

L’alarme ajoute 1 pour le temps et 1 par défi raté, puis retire 2 par sécurité réussie. Le bilan automatique explique ce calcul et présente les statistiques des quatre portraits. Le vote affiche les nombres de voix en direct : 3/4 imposent un tour de surveillance, deux charges communes, aucun rôle révélé.

Le FBI choisit une cible privée et joue un talkie-walkie à trois fréquences : rouge, orange, vert. S’il réussit, la cible apparaît comme ayant raté son défi et son propre poste de couverture réussit. Un joueur surveillé ne peut pas brouiller. Tous les détails sont dans `docs/BRIEF.md`, les règles précédentes dans `docs/BRIEF-v1-archive.md`.

L’entraînement propose six épreuves : les quatre postes, le vol et le talkie FBI. Les trois musiques fournies par Julien sont intégrées : thème d’accueil et deux thèmes alternés en partie. Téléphone paysage prioritaire, gestes et alternatives clavier, cibles de 44 pixels CSS minimum.

## Développer

Node 22 :

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm test` vérifie le moteur, l’autorité locale de l’hôte, la confidentialité des projections et les six simulations de mini-jeux. `npm run test:browser` utilise Chrome installé pour la recette. Le test multijoueur utilise réellement WebRTC et le service public de signalisation PeerJS ; il nécessite Internet. Sous Linux, `npx playwright install chrome` installe le navigateur de recette.

`npm run build` produit `dist/`, déployable sur GitHub Pages sans backend. `node scripts/qa-full-match.mjs` exécute une partie avec bots avec les délais réels. `PF_TEST_URL` et `PF_QA_DIR` choisissent l’URL et le dossier de preuves.

## Multijoueur hébergé chez l’hôte

PeerJS établit les connexions WebRTC directes. Son service public sert à la signalisation ; les rôles, choix, mini-jeux, récompenses et résultats sont détenus et calculés dans le navigateur de l’hôte. Aucun serveur Node personnel, compte ou adresse à configurer n’est nécessaire. Les invités ne reçoivent que l’état public et leur propre état privé, via une projection explicite. L’hôte est une machine de confiance : son propriétaire peut techniquement inspecter l’état complet dans son navigateur.

Une perte de connexion gèle le groupe et les chronos. Le même onglet retrouve son siège, son rôle, son choix et la dernière progression envoyée, grâce à un jeton privé dans `sessionStorage`. Les liens d’invitation n’incluent aucun jeton. Une fenêtre de 90 s laisse le temps de revenir ; ensuite la partie se termine sans classement. L’hôte conserve aussi une sauvegarde locale de son salon et peut le reprendre après un rechargement du même onglet ; les invités se reconnectent à son identifiant. Fermer définitivement l’onglet de l’hôte ne migre pas la partie vers un autre joueur.

Les coupures silencieuses sont détectées par heartbeat, avec un délai de détection pouvant atteindre 15 secondes. Les fermetures et rechargements envoient immédiatement une annonce d’absence lorsque le navigateur le permet. Des réseaux restrictifs peuvent bloquer WebRTC ; aucun relais TURN privé n’est fourni. Les résultats d’épreuves sont déclarés par le navigateur : les autorisations, gains, délais et unicité sont vérifiés, mais ce prototype entre amis ne prétend pas empêcher la modification du client.

## Sources et direction

- `src/engine.ts`, `config/rules.ts` : règles pures, résolution simultanée, surveillance, délais et pause.
- `src/host.ts`, `src/session.ts` : autorité locale, identités et transport WebRTC.
- `src/trial.ts`, `src/minigame.ts` : état sérialisable et six manipulations 2D.
- `src/scene.ts`, `src/animation.ts` : diorama, repères accessibles, clips procéduraux du modèle partagé.
- `scenes/layouts/` : trois dispositions préparées, zones stables.
- `art/source/`, `art/build_museum.py`, `art/finish_assets.py` : sources Blender et exports mobiles reproductibles.
- `audio/build_audio.py` : banque de sons originaux synthétisés.
- `docs/ASSETS.md`, `docs/DESIGN.md`, `docs/VALIDATION.md` : provenance, décisions UX et vérifications.

Les documents `GAMEPLAY_V2.md` et `UX_V3.md` sont des archives historiques, sans autorité sur cette version. Les essais sur téléphone physique, Safari/iOS et l’équilibrage avec plusieurs groupes humains restent à réaliser.
