# Plan Foireux

- Lire `docs/BRIEF.md` avant une évolution des règles. La dernière version du brief partagé prévaut sur les propositions précédentes.
- `src/engine.ts` ne dépend pas du DOM ni de Three.js. Ne transmettre aux invités que les vues produites par `publicView` ; conserver les rôles et choix secrets dans l'autorité de l'hôte.
- Personnages : conserver le modèle partagé et les variantes de `Cloth`. Les sources Blender et le script doivent rester reproductibles.
- Vérification : `npm test` puis `npm run build`. Le workflow de `main` déploie Pages après ces contrôles.
- Distinguer tests du moteur, parcours réellement exécutés dans le navigateur et essais sur appareil physique dans `docs/VALIDATION.md`.
- Lancer le serveur local avec `npm run dev`. Les fichiers livrables sont générés par `npm run build` dans `dist/`.
