# Mini-jeu des casiers conservé

Le poste `loot` désigne désormais le vol de statue dans la partie. Les anciennes goupilles restent indépendantes et réutilisables :

- `pin-trial.ts` conserve le moteur pur : `newPinTrial(seed)`, `stepPinTrial(state, dt)`, `pin(state)` et `pinBand(state)`.
- `pin-minigame.ts` conserve l’illustration originale, le curseur, les trois goupilles, les erreurs, la souris, le toucher et Espace. Son CSS est importé automatiquement.

Pour le réutiliser dans une future interface : `const game = new LockerMinigame(container, seed, state => save(state))`. Le composant expose `state`, `paused` et `dispose()` ; appeler `dispose()` avant de remplacer son conteneur. Il n’est ni chargé par l’interface de jeu actuelle, ni proposé dans l’entraînement.
