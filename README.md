# Plan Foireux — prototype jouable v1

Un musée Art déco, quatre complices, un FBI. Le brief du 17 octobre 2026 dans `docs/BRIEF.md` remplace les règles 0.x. La précision ultérieure de Julien prévaut sur son chapitre réseau : **le navigateur de l’hôte gère la partie localement**, sans serveur de jeu à déployer.

## Jouer

Choisissez un prénom, jouez avec trois bots ou invitez vos complices. L’hôte crée un salon et copie le lien. Chaque invité l’ouvre sur son écran, entre son prénom puis rejoint. Quatre joueurs prêts sont requis pour lancer une partie en ligne. Le salon garde les mêmes sièges pour Rejouer. Les discussions passent par Discord ou par la conversation dans la pièce.

Ouvrez le coffre avant la fin du tour 5. À 5 alarmes, la police gagne. Coopérez pour fuir, enrichissez-vous pour devenir Roi des Voleurs ; un FBI est parmi vous.

Touchez directement le coffre, les casiers, le poste de sécurité ou le personnage d’un rival. La promesse publique est modifiable pendant 20 s, puis le choix réel reste privé pendant 12 s. Une épreuve de 18 s décide de la réussite. La révélation dure 12 s, puis on débat et vote pendant 30 s après les tours 1 à 4. Aucune validation anticipée ne raccourcit une phase et aucune réussite anticipée n’est montrée aux autres.

- Forer : coffre +2, poche +6 en cas de réussite.
- Sécuriser : alarme −2, poche +6.
- Casiers : un stock global de 12 pièces partagé entre les réussites.
- Faire les poches : jusqu’à 4 pièces de la poche initiale d’un rival, à partager entre ses voleurs ; les gains du tour ne peuvent pas être volés.

Le temps ajoute 1 alarme. Le FBI peut ajouter 1 alarme en réussissant avec Brouiller activé. Une trace révèle seulement sa zone. Trois voix sur quatre déclenchent un tour de surveillance, avec deux utilisations communes ; aucune élimination ni révélation de rôle. La fuite attend le tour 5 : coffre à 8 et alarme sous 5, les trois braqueurs gagnent et reçoivent chacun 8 pièces. Le plus riche reçoit un titre supplémentaire, partagé en cas d’égalité.

L’entraînement du salon permet d’essayer les quatre épreuves. Le paysage est le format principal pour téléphone ; le portrait reste jouable. Les gestes ont des commandes au clavier, les câbles permettent le glisser ou deux taps, et les cibles mesurent au moins 44 pixels CSS.

## Développer

Node 22 :

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm test` vérifie le moteur, l’autorité locale de l’hôte, la confidentialité des projections et les quatre simulations de mini-jeux. `npm run test:browser` utilise Chrome installé pour la recette. Le test multijoueur utilise réellement WebRTC et le service public de signalisation PeerJS ; il nécessite Internet. Sous Linux, `npx playwright install chrome` installe le navigateur de recette.

`npm run build` produit `dist/`, déployable sur GitHub Pages sans backend. `node scripts/qa-full-match.mjs` exécute une partie avec bots avec les délais réels. `PF_TEST_URL` et `PF_QA_DIR` choisissent l’URL et le dossier de preuves.

## Multijoueur hébergé chez l’hôte

PeerJS établit les connexions WebRTC directes. Son service public sert à la signalisation ; les rôles, choix, mini-jeux, récompenses et résultats sont détenus et calculés dans le navigateur de l’hôte. Aucun serveur Node personnel, compte ou adresse à configurer n’est nécessaire. Les invités ne reçoivent que l’état public et leur propre état privé, via une projection explicite. L’hôte est une machine de confiance : son propriétaire peut techniquement inspecter l’état complet dans son navigateur.

Une perte de connexion gèle le groupe et les chronos. Le même onglet retrouve son siège, son rôle, son choix et la dernière progression envoyée, grâce à un jeton privé dans `sessionStorage`. Les liens d’invitation n’incluent aucun jeton. Une fenêtre de 90 s laisse le temps de revenir ; ensuite la partie se termine sans classement. L’hôte conserve aussi une sauvegarde locale de son salon et peut le reprendre après un rechargement du même onglet ; les invités se reconnectent à son identifiant. Fermer définitivement l’onglet de l’hôte ne migre pas la partie vers un autre joueur.

Les coupures silencieuses sont détectées par heartbeat, avec un délai de détection pouvant atteindre 15 secondes. Les fermetures et rechargements envoient immédiatement une annonce d’absence lorsque le navigateur le permet. Des réseaux restrictifs peuvent bloquer WebRTC ; aucun relais TURN privé n’est fourni. Les résultats d’épreuves sont déclarés par le navigateur : les autorisations, gains, délais et unicité sont vérifiés, mais ce prototype entre amis ne prétend pas empêcher la modification du client.

## Sources et direction

- `src/engine.ts`, `config/rules.ts` : règles pures, résolution simultanée, surveillance, délais et pause.
- `src/host.ts`, `src/session.ts` : autorité locale, identités et transport WebRTC.
- `src/trial.ts`, `src/minigame.ts` : état sérialisable et quatre manipulations 2D.
- `src/scene.ts`, `src/animation.ts` : diorama, repères accessibles, clips procéduraux du modèle partagé.
- `scenes/layouts/` : trois dispositions préparées, zones stables.
- `art/source/`, `art/build_museum.py`, `art/finish_assets.py` : sources Blender et exports mobiles reproductibles.
- `audio/build_audio.py` : banque de sons originaux synthétisés.
- `docs/ASSETS.md`, `docs/DESIGN.md`, `docs/VALIDATION.md` : provenance, décisions UX et vérifications.

Les documents `GAMEPLAY_V2.md` et `UX_V3.md` sont des archives historiques, sans autorité sur cette version. Les essais sur téléphone physique, Safari/iOS et l’équilibrage avec plusieurs groupes humains restent à réaliser.
