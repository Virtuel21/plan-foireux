# Plan Foireux 0.2 : avidité, information et alibis

> Historique de la version 0.2. La correction 0.3 du 17 octobre 2026 décrite dans [UX_V3.md](UX_V3.md) remplace la présentation des choix et le contrat de fouille ci-dessous : engagement avant inspection 3D, douze emplacements de marquage et indices permutés entre objets. L'économie 0.2 reste en vigueur. Les anciennes étapes de compartiments/enveloppes et `inspect` sans engagement ne sont plus le contrat actuel.

Cette correction du 17 octobre 2026 remplace l'économie et la fouille de 0.1. Le but reste d'ouvrir le trésor et fuir ; le plus riche des braqueurs survivants gagne, le FBI cherche la défaite du groupe. L'amusement reste une hypothèse à éprouver entre humains.

## Décisions et enjeux

Six actions secrètes : `a`, `b` (postes, +3), `loot` (18 partagées, +1 alarme et −8 au sac commun), `search` (cache ciblée, +2 et prime de +4 au premier découvreur), `repair` (+1, −2 alarme, un seul effet par salle), `cover` (+0, remplace au maximum une personne manquante ; prime de sauvetage de 6 partagée entre les couvertures si utile). Une salle sans poste manquant ajoute 8 au sac. Le trésor correctement ouvert ajoute 48. Les gains restent provisoires. L'alarme maximum devient 6 ; chaque poste incomplet ajoute 2, quel que soit le nombre de personnes manquantes.

Le vol crée une ruée qui dilue le jackpot et augmente le danger. Réparer et couvrir ont un coût d'opportunité visible. Les besoins lourds restent faisables après une éjection. Il n'y a pas de bouton FBI réservé qui révélerait automatiquement l'infiltré.

## Fouille dans le musée

Trois caches indépendantes dans le décor : `frame` (cadre, chiffre 0, salle 0), `desk` (bureau, chiffre 1, salle 1), `bust` (statue, chiffre 2, salle 2). Une cache antérieure reste accessible en consacrant une nouvelle action à sa fouille.

Pendant le choix secret, cliquer sur un objet ouvre sa manipulation : examiner trois zones/compartiments. Une zone contient une enveloppe. Avant résolution, on voit seulement que l'enveloppe a été trouvée. Le chiffre n'est obtenu qu'en verrouillant et exécutant `search` sur cette cache. Cela évite une fouille gratuite suivie d'un vol dans le même tour. La prime de première découverte est attribuée à la résolution, indépendamment de l'ordre réseau des clics. Refouiller un indice déjà connu personnellement ne verse pas une deuxième récompense.

Le vrai chiffre est privé. Chaque détenteur peut publier un chiffre de son choix pour l'index concerné. L'interface montre l'auteur de l'annonce et ne certifie pas sa vérité. Le FBI peut mentir ou se taire. Un autre joueur peut vérifier une annonce en dépensant une fouille sur le même objet. Les bots ne lisent jamais directement le code : ils utilisent leurs propres découvertes et les annonces publiques.

## Coffre et révélation

À la salle 4, `a` demande une vraie saisie de trois chiffres. Une mauvaise saisie n'ouvre pas et laisse les postes incomplets. `code: 'FORCE'` permet une issue de secours coûteuse : +2 alarme et −18 au sac (plancher 0). Le trésor n'accorde sa récompense de 48 qu'une fois.

Un coffre resté fermé donne une seconde tentative après les accusations : `vaultRetries` passe de 0 à 1, puis le groupe doit fuir, avec ou sans trésor. Sortir les mains vides donne la victoire à l'agent encore infiltré ; sans agent actif, personne ne gagne. Cela permet de réagir à un faux chiffre plutôt que de perdre sans pouvoir renégocier.

Les bots réagissent aussi à un voleur qui s'enrichit à répétition, même s'il annonce ses vols. Leur soupçon utilise les trois dernières actions et baisse lorsqu'il reprend un poste ou aide le groupe. Un bot distancé peut réclamer sa part en concurrençant le leader sur le butin.

Chaque résolution passe par une révélation visible, y compris la manche qui termine la partie. Gros portraits, promesse → action réelle, gain personnel, conséquence du poste, alarme avant/après, sac avant/après. La révélation attend la validation des joueurs (avec délai de secours), puis ouvre le vote ou le résultat. Les preuves restent visibles au vote. Un rythme de projecteur met successivement chaque complice au centre.

## Contrat technique 0.2

`Action = 'a'|'b'|'loot'|'search'|'repair'|'cover'`.
`Command = {type:string; action?:Action; target?:string; code?:string; step?:number; turn?:number}`.
Commandes : `promise`, `choose`, `inspect` (target cache, step 0..2), `claim` (target index 0..2, code un chiffre), `continue`, `vote`.

View reste explicitement projetée : champs publics existants (players, phase, roomIndex, rooms, alarm, pool, objective, report, log, deadline, turn, result, agentExposed), `myRole`, `myChoice`, `myVote`, `voteCount`, `myId`, plus :

- `spots: {id:string;name:string;clueIndex:number;unlockRoom:number}[]`
- `discoveries: {spotId:string;index:number;ownerId:string}[]` (premiers découvreurs publics)
- `claims: {id:string;index:number;value:string}[]` (annonces non certifiées)
- `myClues: {spotId:string;index:number;value:string}[]`
- `mySearch: {spotId:string;opened:number[];found:boolean}|null`
- `myTarget: string|null`, `myCode: string` (restaurer son propre choix après reconnexion)
- `vaultRetries: number` (0 puis 1 pour l'unique seconde tentative au coffre)

`Finding` conserve id/action/promise/gain/betrayed et ajoute `detail:string`, `target?:string` (objet ciblé, sans le chiffre secret).
`Report` conserve findings/incidents/alarmAdded/text et ajoute `alarmBefore:number;alarmAfter:number;poolBefore:number;poolAfter:number`.
Exporter `ACTIONS`, `SPOTS`, `ALARM_MAX`, `Command`. `apply` refuse tout champ invalide et ne permet pas la collecte hors phase secret ni la modification après verrouillage. `publicView` ne publie jamais le code ou les zones contenant les enveloppes.

`Museum(container,onInteract?:(target:string)=>void)` : interactions `spot:frame`, `spot:desk`, `spot:bust`, `post:a`, `post:b`, `loot`, `vault`, `repair`. Les zones et badges sont ancrés dans le décor, avec accès clavier. `focusPlayer(id:string|null)` sert au projecteur de révélation. Préserver `update`, `setPlayers`, `setZoom`.
