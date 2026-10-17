PLAN FOIREUX
Brief de développement du prototype jouable
Version du 17 octobre 2026

Ce document fixe une première version pour quatre amis dans un navigateur. Le jeu se déroule dans un musée en 3D cartoon, vu par une caméra fixe. Chaque joueur utilise son propre écran. On choisit les postes directement dans le décor, puis on réalise un mini-jeu en 2D. Le cœur du jeu est la différence entre ce que chacun promet publiquement et ce qu’il fait réellement en secret.

Les valeurs ci-dessous constituent une base de prototype cohérente, pas un équilibrage validé par des parties. Le développement doit d’abord permettre de tester cette boucle complète avec des formes simples. Les modèles, animations et sons décrits restent à produire.

1  La partie et la victoire

Quatre joueurs participent : trois braqueurs et un agent du FBI. Les rôles sont tirés au hasard et restent secrets jusqu’au résultat final. Aucun costume ne révèle le rôle. Une partie comporte exactement cinq tours, sauf arrestation anticipée. La fuite a lieu à la fin du cinquième tour, même si le coffre est ouvert plus tôt.

Les braqueurs s’enfuient si le coffre atteint 8 points sur 8 et si l’alarme finale reste strictement inférieure à 5. Tous les braqueurs gagnent alors le braquage. Le plus riche reçoit en plus le titre Roi des Voleurs. Une égalité donne plusieurs titulaires. Ce titre supplémentaire ne transforme pas les autres braqueurs en perdants.

Le FBI gagne si l’alarme atteint au moins 5 à la résolution d’un tour, ou si le coffre reste incomplet à la fin du cinquième tour. Dans ces cas, tous les braqueurs perdent leur argent de la partie. Le FBI n’a pas besoin de rester insoupçonné pour gagner : le soupçon permet de le surveiller temporairement, pas de terminer la partie.

Au départ, le coffre est à 0 sur 8, l’alarme à 0 sur 5 et toutes les poches sont vides. L’ouverture du coffre ne peut jamais reculer. À la fuite, chaque vrai braqueur reçoit un bonus personnel de 8 pièces. Le faux portefeuille du FBI est ignoré au classement final. Pendant la partie, son portefeuille fonctionne comme celui des autres et peut être volé.

Le briefing d’entrée doit pouvoir tenir en trois phrases : « Ouvrez le coffre avant la fin du tour 5. À 5 alarmes, la police gagne. Coopérez pour fuir, enrichissez-vous pour devenir Roi des Voleurs ; un FBI est parmi vous. » Un bouton discret permet de revoir sa carte de rôle en privé.

2  Le musée et les interactions

Le diorama occupe tout l’écran. La caméra est orthographique, en hauteur et en trois quarts. Un mur avant est absent et les murs latéraux sont assez bas pour laisser lire les interactions. Les joueurs ne pilotent pas leur personnage au clavier : les déplacements sont de courtes animations de révélation.

Le musée comporte deux zones lisibles. La zone du coffre contient le grand coffre et le groupe de casiers. La zone de l’entrée contient le poste de sécurité et les sacs des quatre personnages. Les sacs restent à l’entrée pendant que les personnages travaillent ailleurs. Ces zones servent aux indices de brouillage ; leur nom et leur appartenance restent stables malgré les variantes de disposition.

Cliquer sur le coffre sélectionne Forer. Cliquer sur le terminal, la caméra associée ou son boîtier électrique sélectionne Sécuriser : ce sont plusieurs surfaces d’un même poste. Cliquer sur le groupe de casiers sélectionne Piller les casiers. Cliquer sur un autre personnage sélectionne Faire les poches à ce joueur ; son sac de même couleur est également souligné à l’entrée. On vise son argent, on ne le blesse pas.

Un libellé court apparaît au-dessus du poste sélectionné et annonce le gain : « Coffre +2 • Vous +6 », « Alarme −2 • Vous +6 », « Butin de 12 à partager » ou « Jusqu’à 4 volées à Léa ». La première sélection affiche aussi une seule phrase d’aide. Pas de panneau de quatre actions à choisir séparément du décor.

Le HUD permanent montre le tour et le temps restant, le coffre sur 8, les cinq gyrophares, sa poche et les deux utilisations de surveillance. Les montants des autres joueurs sont visibles près de leur nom pendant les choix et les débats, pour choisir une cible en connaissance de cause. Sur mobile, les noms et montants peuvent se replier en pastilles attachées aux avatars, sans masquer leurs zones de clic.

Un clic sélectionne ; la sélection reste modifiable jusqu’à la fin de la phase. Un contour et une coche indiquent le choix local. Le survol ne doit être nécessaire à aucune information. Les zones tactiles mesurent au moins 44 pixels CSS, même si le modèle 3D paraît plus petit. Les repères ne doivent pas se chevaucher. Chaque interaction possède un équivalent clavier et une étiquette accessible.

3  Un tour complet

3A  Les promesses publiques pendant 20 secondes

Le bandeau annonce « Annoncez votre poste ». Les quatre joueurs voient les mêmes promesses et discutent librement. Une petite vignette du joueur se place au-dessus de son poste promis. Si quelqu’un annonce un vol, une flèche et son nom montrent la cible. Les personnages réels restent à leurs positions neutres : une promesse n’est pas un déplacement effectif.

Le coffre passe au vert lorsque les promesses couvrent le rythme conseillé. Le nombre conseillé est l’arrondi supérieur des points manquants divisés par deux fois le nombre de tours restants, tour courant compris. Exemple : 4 points manquants au dernier tour donnent deux foreurs conseillés. À 8 sur 8, le coffre affiche Terminé et ne peut plus être choisi.

La sécurité demande au moins une promesse par tour et passe au vert si elle l’obtient. Deux sécurisateurs restent autorisés. Leur utilité dépend du niveau d’alarme et de la confiance accordée au premier. À alarme 4, la jauge reste visiblement critique même si le poste est vert.

Le vert signifie « couvert selon les promesses, si les épreuves réussissent ». Une coche et le compte « 1 sur 1 annoncé » accompagnent la couleur. Il ne certifie ni les intentions, ni la réussite, ni la survie du groupe. Les casiers restent dorés ; ils affichent le partage prévu si les personnes annoncées réussissent : 12, 6, 4 ou 3 chacun. Le vol reste violet avec le gain maximal actuellement possible.

Le jeu peut afficher « Le plan couvre les besoins annoncés » lorsque coffre et sécurité sont couverts. Il attend néanmoins la fin des 20 secondes. Les promesses se figent alors comme un historique public. Les discussions vocales utilisent Discord ou la conversation dans la pièce dans le premier prototype.

3B  Les choix secrets pendant 12 secondes

Le bandeau devient « Choisissez ce que vous faites vraiment ». Les joueurs retrouvent exactement les mêmes interactions sur leur copie locale du diorama. Chacun peut respecter sa promesse ou changer de poste et de cible.

Les anciennes promesses restent visibles avec la mention Promis. Le nouveau contour, la coche, les informations de gain et l’éventuel fantôme de déplacement n’existent que sur l’écran du joueur. Les couleurs publiques ne se recalculent pas à partir des choix privés. Aucun déplacement, son, particule, changement de portefeuille ou indicateur de validation ne doit donner d’indice aux autres avant la révélation.

Le FBI possède en plus un petit émetteur privé attaché à son HUD, avec deux positions : Profil bas ou Brouiller. Profil bas est le réglage par défaut de chaque tour. Un clic change le mode ; l’émetteur est absent des autres écrans. Pendant une surveillance, il affiche « Brouillage bloqué ce tour ».

À l’échéance, chaque choix est verrouillé. En l’absence de choix privé, la promesse est conservée si elle est encore légale. Sinon, Sécuriser est sélectionné. Ce remplacement ne réussit pas automatiquement l’épreuve. Une cible déconnectée met d’abord la partie en pause selon la règle de reconnexion.

3C  La transition et le mini jeu pendant 18 secondes

Un iris noir se ferme en 0,3 seconde autour du poste choisi, puis s’ouvre en 0,3 seconde sur le mini-jeu. Pour un vol, il se centre sur le personnage ciblé puis révèle son sac en gros plan. Le chrono de l’épreuve démarre après l’ouverture, pas pendant le fondu. Une préférence de réduction des animations remplace l’iris par un fondu bref.

Tout le monde joue en même temps, chacun à son épreuve. Une seule action est possible par tour. Une réussite anticipée reste sur un état local discret jusqu’à l’échéance commune. On ne retourne pas plus tôt sur la scène publique et on ne choisit pas un deuxième poste. Les petites erreurs peuvent être corrigées dans les 18 secondes ; elles ne relancent pas une nouvelle session et ne donnent pas d’argent partiel.

Chaque épreuve comporte une phrase d’instruction persistante, un exemple animé de deux gestes au premier essai et son gain. Le premier exemple peut être essayé avant la partie dans le salon. À l’échéance, une épreuve incomplète est un échec, sans alarme supplémentaire directe.

3D  La révélation et la résolution pendant 12 secondes

Le même iris ramène tout le monde au diorama. La scène révèle les choix réels ensemble. Les avatars rejoignent des emplacements préparés auprès des postes et jouent une animation courte. Plusieurs joueurs peuvent travailler au même poste : pas de collision physique ni de pénalité de bagarre.

Exemples : deux perceuses tournent autour du coffre ; un pillard peine à porter une poignée de pièces ; un voleur fouille le sac coloré de sa cible ; un électricien remet le courant sous une caméra comiquement affolée. Des échecs produisent une petite fumée ou une expression embarrassée. Ils ne doivent pas ressembler à un indice garanti de rôle.

Au-dessus des postes, on voit les effets et les noms des participants. Une promesse non tenue porte brièvement « Promis : sécurité → Fait : casiers ». Le résultat individuel réussi ou raté est public, ainsi que les gains et pertes. Le brouillage n’est jamais attribué directement à un nom par le jeu.

Le jeu calcule toutes les contributions, les vols et l’alarme en un seul résultat. Il anime ensuite le bilan déjà calculé. Une alarme provisoire ne déclenche jamais une défaite avant la déduction des sécurisations du même tour.

3E  Le débat et le vote pendant 30 secondes

Après les tours 1 à 4, et seulement si la police n’a pas déjà gagné, le bandeau annonce « Qui surveille-t-on au prochain tour ? ». On débat en regardant la scène et la trace éventuelle. Cliquer sur un avatar choisit le suspect ; un petit bouton Passer reste disponible. Le vote peut être changé jusqu’à la fin. Les choix de vote restent privés jusqu’au dépouillement.

Trois voix sur quatre pour la même personne déclenchent une surveillance et consomment une des deux utilisations communes. Deux voix, une égalité, une abstention générale ou une majorité pour Passer ne consomment rien. Une absence de vote vaut Passer. Le résultat indique les voix et la conséquence. Il n’y a pas de vote après le cinquième tour.

Un tour complet dure environ 94 secondes, transitions comprises. Une partie de cinq tours dure environ huit minutes, puis le briefing, la carte de rôle et les résultats amènent la cible vers huit à dix minutes. Cette durée est une estimation à mesurer en test. Lorsque les deux surveillances ont déjà été utilisées, le débat reste disponible pour préparer le tour suivant, mais le vote de suspect est désactivé avec la mention « Plus de surveillance ».

4  Les actions et les gains

FORER LE COFFRE
Réussite : +2 points de coffre et +6 pièces personnelles. Échec : aucun progrès et aucune pièce. Plusieurs réussites s’additionnent, jusqu’au plafond de 8. Si le coffre était encore incomplet au verrouillage, un foreur réussi reçoit ses 6 pièces même si un autre foreur termine simultanément le coffre. On n’autorise plus de nouveau choix Forer au tour suivant.

SÉCURISER
Réussite : −2 alarmes et +6 pièces personnelles. Échec : aucun effet. Plusieurs sécurisations s’additionnent. L’alarme est bornée à zéro après le calcul complet ; les 6 pièces sont gagnées même si la réduction était partiellement inutile. Le joueur coopère et renonce à un gain potentiel supérieur aux casiers.

PILLER LES CASIERS
Un stock global de 12 pièces est disponible par tour, pas 12 par meuble. Tous les casiers visibles appartiennent au même groupe et le montrent. Le stock est partagé uniquement entre les pillards qui réussissent : 12 pour un, 6 chacun pour deux, 4 chacun pour trois, 3 chacun pour quatre. Un échec ne prend rien et ne diminue pas le partage des autres. Le stock est renouvelé au tour suivant ; les pièces non prises ne se cumulent pas.

FAIRE LES POCHES
Une réussite vole jusqu’à 4 pièces. La cible est choisie avant l’épreuve en cliquant sur son personnage. Elle ne reçoit pas de contre-épreuve et peut réussir son propre travail en même temps. Le montant volable est déterminé par sa poche au début du tour : les gains du tour ne sont pas volables immédiatement. Cible sans argent : gain zéro, indiqué avant le choix.

Une même victime ne peut perdre que 4 pièces au total pendant le tour. Si plusieurs voleurs réussissent contre elle, on partage le montant disponible entre eux en pièces entières ; le reste demeure chez la victime. Exemple : trois voleurs sur une victime assez riche gagnent 1 chacun, la victime perd 3. Deux voleurs sur une victime qui possède 3 gagnent 1 chacun, la victime conserve 1. On calcule depuis une photographie commune des poches et on applique ensuite les transferts en même temps, pour éviter qu’un ordre réseau change le résultat.

Le vol a un gain brut plus faible que la coopération. Il sert à rattraper un rival : prendre 4 au meneur réduit l’écart de 8. Son intérêt est surtout tardif. Au premier tour, toutes les poches vides rendent cette action inutile ; le repère le dit explicitement.

5  Le FBI et les alarmes

Le temps ajoute toujours une alarme par tour. Un FBI en mode Brouiller ajoute une alarme supplémentaire uniquement s’il réussit son mini-jeu. Sa tâche normale réussit aussi et applique exactement les mêmes effets que pour un braqueur. Un FBI peut donc ouvrir le coffre, gagner 6 pièces à la sécurité et réduire l’alarme tout en envoyant un signal secret.

L’alarme finale du tour est le maximum entre zéro et : alarme précédente +1 pour le temps +1 si le brouillage a réussi −2 pour chaque sécurité réussie. Une seule alarme de brouillage est possible par tour, quel que soit le poste. Les échecs ordinaires, le nombre de pillards et les vols n’ajoutent pas directement d’alarme.

Exemple : alarme 4, temps +1, brouillage +1, une sécurité réussie −2 donnent une alarme finale de 4. Le braquage continue. Sans cette sécurité, le résultat serait 6 et la police gagnerait. L’affichage sature à cinq gyrophares mais le bilan conserve les contributions numériques exactes.

Un brouillage réussi crée aussi une trace publique : « Transmission suspecte détectée dans la zone du coffre » ou « … dans la zone de l’entrée ». C’est la zone du poste réellement choisi par le FBI. Forer et casiers donnent zone du coffre ; sécurité et vol donnent zone de l’entrée. La trace reste visible même si les sécurisations annulent la hausse nette de l’alarme. Profil bas, surveillance ou échec ne créent pas de trace.

Le jeu révèle qui était dans chaque zone, mais ne nomme pas l’émetteur du signal. Saboter seul dans une zone peut donc permettre de déduire le rôle. Le FBI doit choisir entre discrétion et efficacité. Une tâche ratée n’est pas une preuve ; un changement de promesse peut venir d’un braqueur cupide. Une réussite n’est pas une preuve d’innocence.

6  La surveillance

Le mot affiché en jeu est Surveillance. Un bracelet ou des menottes cartoon servent de pictogramme, sans ambiguïté sur l’effet. Texte de vote : « Au prochain tour seulement, cette personne devra forer ou sécuriser. Si c’est le FBI, son brouillage sera bloqué. Rôle non révélé. »

Une personne surveillée reste dans la partie, discute et vote normalement. Pendant le tour suivant, seuls le coffre encore fermé et la sécurité sont sélectionnables. Ses récompenses et son mini-jeu restent identiques. Si le coffre est terminé, seule la sécurité est disponible. Le brouillage FBI est bloqué ; une surveillance ne force pas la réussite et ne protège pas contre un échec volontaire.

À la fin de ce tour, la surveillance expire automatiquement, avant un éventuel nouveau vote. Le même suspect peut être surveillé une seconde fois avec la dernière utilisation. Il ne peut y avoir qu’un joueur surveillé à la fois. Un mauvais vote gaspille une ressource mais n’élimine personne, ne retire pas d’argent et n’ajoute pas d’alarme.

Exemple immédiat : le groupe surveille Max après le tour 2. Au tour 3, Max choisit Sécuriser et joue le jeu des câbles. S’il est braqueur et réussit : −2 alarmes, +6 pour lui. S’il est FBI et réussit : le même résultat, sans brouillage possible. S’il échoue : aucun effet. Au tour 4, il retrouve tous ses choix.

7  Les quatre mini jeux

Les quatre sessions durent 18 secondes, avec des difficultés initiales proches. Ce sont des épreuves privées indépendantes : aucun geste synchronisé entre deux connexions n’est requis. Les manipulations sont en 2D pour obtenir une réponse précise sur ordinateur comme sur téléphone. Leur habillage reprend les objets du musée. Les erreurs font perdre du temps, pas toute la progression déjà acquise ni une alarme de plus.

7A  Sécuriser avec la boîte de dérivation

Instruction : « Relie les trois circuits au bon symbole, puis abaisse le levier. » La vue montre l’intérieur d’une boîte ouverte : trois câbles souples fixés à des circuits identifiés par un chiffre et un symbole, trois bornes libres disposées en face, un petit schéma et un gros interrupteur. Couleur, symbole et numéro se doublent ; aucune réponse ne dépend seulement de la couleur.

Le joueur suit visuellement un câble depuis son circuit d’origine jusqu’à son embout libre, parmi des courbes qui se croisent sans jonction. Il attrape l’embout et le branche sur la borne portant le même identifiant. Les embouts ne sont pas tous alignés au niveau de leur origine : observer les chemins compte autant que faire glisser trois lignes de gauche à droite. Il y a trois circuits utiles et aucun faux fil au premier prototype.

Les câbles se dessinent en courbes SVG ou Canvas, avec des attaches visibles, une ombre et des prises larges. On peut glisser un embout, ou cliquer dessus puis cliquer sur la borne. Pendant la sélection, le fil choisi est mis en évidence sans révéler automatiquement sa destination. Une borne n’accepte qu’un câble ; une connexion peut être débranchée en la sélectionnant.

Après trois branchements, le joueur actionne le levier. Les bons circuits restent branchés et s’allument ; les mauvais sont signalés par une vibration graphique courte et leur embout se libère. Il peut corriger tant que le chrono tourne. Trois circuits corrects et le levier validé donnent la réussite. Aucun clic rapide répété n’est nécessaire. Une mauvaise validation n’ajoute pas d’alarme.

Variation par graine : ordre des circuits et des bornes, chemins de fils, positions des embouts et décoration du boîtier. On génère une solution complète avant de mélanger. Garder des espacements minimaux et une épaisseur lisible sur mobile ; les croisements doivent montrer quel fil passe au-dessus. Cible de réalisation après apprentissage : environ 8 à 14 secondes, à vérifier.

Assets : fond de boîtier, charnière décorative, trois symboles de circuit, prises et bornes, levier dans deux états, voyants, quelques vis, câble procédural, clic de prise, bourdonnement et validation. Le boîtier du diorama est un modèle 3D simple ; son gros plan jouable reste une interface 2D.

7B  Forer avec la pression de la perceuse

Instruction : « Maintiens pour accélérer, relâche pour refroidir. Stabilise trois points. » Une perceuse cartoon appuie sur le verrou. Une aiguille de pression monte quand on maintient le bouton ou la touche Espace, descend quand on relâche. Une bande cible est marquée par deux traits et un motif, avec une couleur en complément.

Il faut maintenir l’aiguille dans cette bande pendant une seconde cumulée sur chacun des trois points. Sortir de la bande suspend l’accumulation du point courant. Atteindre la zone rouge remet seulement ce point à zéro et impose un refroidissement visible de 0,5 seconde. Les points terminés restent acquis pendant la session. Après chaque point, la bande se déplace légèrement et la perceuse avance.

Trois points terminés avant 18 secondes donnent +2 au coffre et +6 pièces. Deux points seulement restent un échec pour le résultat du tour ; la progression intermédiaire ne persiste pas au tour suivant. Le comportement physique de l’aiguille utilise le temps écoulé, pas le nombre d’images par seconde.

Variation : trois positions de cible sélectionnées dans une plage raisonnable, petites décorations du verrou. Largeur de bande et vitesse restent constantes dans la V1 pour ne pas donner une épreuve beaucoup plus difficile à certains joueurs. Assets : perceuse vue rapprochée, poignée, cadran, aiguille, trois rivets ou verrous, copeaux, fumée légère et sons de moteur.

7C  Piller avec les trois goupilles

Instruction : « Arrête le curseur dans les trois encoches. » Le gros plan montre un mécanisme de casier stylisé. Un curseur fait des allers-retours sur une jauge. Trois goupilles doivent être verrouillées l’une après l’autre ; une encoche indique où arrêter le curseur.

Un clic, un tap ou Espace tente la goupille courante. Dans l’encoche : elle se verrouille et la suivante commence. En dehors : petit clac, blocage de 0,5 seconde, puis reprise de cette seule goupille. Les précédentes restent acquises. Le curseur traverse une fenêtre cible d’environ 0,7 seconde à chaque passage ; on ajuste cette valeur en test, sans score de précision supplémentaire.

Trois goupilles donnent la réussite, puis la récompense dépend du nombre total de pillards réussis. Le jeu annonce donc « Casier ouvert, partage à la révélation », pas « Vous avez gagné 12 » avant de connaître les autres résultats. Une quantité de pièces révélée à l’avance serait une fuite d’information.

Variation : emplacement des trois encoches et sens initial du curseur. Pas de bouton à marteler, pas de combinaison à mémoriser. Assets : mécanisme de serrure exagéré, trois goupilles, outil, curseur, petite poignée de pièces, sons de clac et d’ouverture.

7D  Faire les poches sans se faire remarquer

Instruction : « Avance quand la cible regarde ailleurs. Relâche quand elle se retourne. » Le gros plan montre le sac de la cible, la main du voleur et un petit portrait cartoon qui regarde à gauche ou se retourne. Le mouvement de tête est annoncé environ 0,5 seconde avant le regard de face.

Maintenir le bouton fait avancer la main vers trois étapes successives : ouvrir, atteindre la poche, retirer la liasse. Chaque étape demande environ une seconde d’action pendant que la cible regarde ailleurs. Relâcher immobilise la main. Si on continue pendant le regard de face, la main recule au dernier point validé et un petit indicateur « Repéré » apparaît pendant 0,5 seconde. On peut reprendre dans le temps restant.

Le comportement du portrait est généré pour cette épreuve et ne dépend pas des clics réels du joueur ciblé, occupé à sa propre tâche. Le résultat complet vole le montant calculé par les règles, au maximum 4 pièces. Être repéré pendant la manipulation ne lance ni contre-jeu, ni nouvelle alarme, ni révélation anticipée. La tentative réelle sera montrée au bilan, réussie ou ratée.

Variation : séquence de fenêtres de regard, toujours avec assez de temps d’ouverture pour réussir ; couleur, écusson et nom de la cible sur le sac. Assets : un seul sac avec quatre teintes, main gantée, fermeture, liasse, portrait en deux orientations et état de surprise, froissement et petit sifflement. Le portrait réutilise le rendu des avatars.

7E  Ce que jouent les agents du FBI

Il n’y a pas quatre variantes inversées supplémentaires. Le FBI joue exactement ces quatre épreuves. S’il a armé Brouiller et réussit, on ajoute son signal secret au résultat normal. Cela évite de doubler le contenu et permet au FBI de soutenir le braquage pour gagner la confiance du groupe. Pendant l’épreuve, un minuscule symbole d’émetteur rappelle son mode, uniquement sur son écran.

8  Une partie complète avec coopération et trahison

Julien, Léa et Sarah sont braqueurs. Max est le FBI, mais personne d’autre ne le sait. Chacun commence à zéro. On note les poches dans l’ordre Julien, Léa, Sarah, Max. Tous les exemples de réussite ci-dessous utilisent les règles précédentes ; ce scénario est un exemple calculé, pas une partie jouée.

Tour 1
Julien promet le coffre, Léa la sécurité, Sarah et Max les casiers. Le coffre et la sécurité passent au vert. En secret, Léa abandonne les câbles pour piller ; elle espère prendre davantage. Julien réussit sa perceuse. Les trois pillards réussissent et se partagent 12, donc 4 chacun. Max a choisi Brouiller.
Résultat : coffre 2 sur 8 ; alarme 2, soit temps +1 et brouillage +1 ; poches 6, 4, 4, 4. Une trace vient de la zone du coffre où les quatre joueurs étaient présents. Léa a rompu sa promesse mais n’est pas FBI : la cupidité crée une accusation plausible. Le groupe passe au vote.

Tour 2
Julien fore. Léa retourne à la sécurité mais rate ses câbles. Sarah vole 4 à Julien, qui possédait 6 au début du tour. Max pille seul, réussit et brouille. Le coffre progresse de 2 et Julien gagne 6 avant le transfert simultané de son vol.
Résultat : coffre 4 sur 8 ; alarme 4 ; poches 8, 4, 8, 16. La trace du coffre vise cette fois la zone occupée seulement par Julien et Max. Max accuse Julien et rappelle que l’alarme est montée pendant qu’il forait. Léa peut honnêtement avouer son échec aux câbles. Trois voix surveillent Julien pour le tour 3. Il reste une utilisation.

Tour 3
Julien surveillé fore et réussit. Léa réussit la sécurité. Sarah et Max pillent et gagnent 6 chacun. Max choisit Profil bas : il veut que la baisse d’alarme fasse croire que surveiller Julien était utile.
Résultat : coffre 6 sur 8 ; alarme 3, soit 4 +1 −2 ; poches 14, 10, 14, 22. L’absence de signal ne prouve rien sur Julien. Sarah le fait remarquer. Comme Julien et Max étaient les deux suspects du signal précédent, trois joueurs décident de consacrer la dernière surveillance à Max au tour 4. Julien retrouve sa liberté.

Tour 4
Julien promet de finir le coffre, puis choisit les casiers en secret pour prendre 12. Léa vole 4 à Julien. Sarah, méfiante, abandonne secrètement sa propre promesse et prend le coffre : elle sauve le plan. Max surveillé doit forer ou sécuriser ; il choisit la sécurité et la rate volontairement. Son brouillage est indisponible.
Résultat : coffre 8 sur 8 ; alarme 4 ; poches 22, 14, 20, 22. Le coffre s’ouvre grâce à Sarah, mais le van n’arrive qu’après le tour 5. Julien est maintenant le plus riche des braqueurs parce qu’il a trahi sa promesse. Max est fortement soupçonné mais plus aucune surveillance n’est disponible. Le dernier débat sert à répartir les tâches, pas à voter sans ressource.

Tour 5
Forer est désactivé. Léa accepte de sécuriser. Julien, Sarah et Max pillent, soit 4 chacun en cas de réussite. Max arme Brouiller. Tous réussissent leurs épreuves.
Résultat : coffre 8 sur 8 ; alarme 4, soit 4 +1 +1 −2 ; poches 26, 20, 24, 26. Le van arrive. Bonus de coffre aux braqueurs : Julien finit à 34, Sarah à 32, Léa à 28. Tous trois gagnent le braquage ; Julien devient Roi des Voleurs. Max révèle sa carte FBI et perd. Si Léa avait raté ses câbles, l’alarme aurait atteint 6 et le FBI aurait gagné. Le plan collectif et le classement personnel ont donc tous deux pesé jusqu’au dernier geste.

9  Rejouabilité et variations du décor

La V1 utilise un même musée et trois dispositions préparées. Chaque disposition définit des emplacements compatibles pour coffre, casiers, sécurité, sacs, personnages et petites décorations. On tire une disposition au lancement puis on remplit ses emplacements avec des variantes de props. Il ne faut pas positionner des objets au hasard sur tout le sol : cela produirait des chevauchements, des marqueurs illisibles et des scènes impossibles à animer.

Le coffre et les casiers peuvent bouger à l’intérieur de leur zone ; le terminal, la caméra et les sacs bougent dans la zone de l’entrée. La caméra de jeu reste fixe pour une disposition donnée et les marqueurs se projettent depuis leurs points d’ancrage. Les rôles, les câbles, les fenêtres de timing et les séquences de regard changent à chaque partie ou épreuve. La graine publique du décor ne doit pas permettre de déduire le rôle FBI ou les choix secrets.

Un gardien peut avoir trois petites positions de départ ou trajets de fond préparés. Dans ce premier prototype, il illustre la pression et n’ajoute pas une règle cachée : c’est l’alarme qui résout le danger. Les vrais obstacles jouables sont le coffre à ouvrir, les circuits à détourner, le temps, les promesses non tenues et le FBI. Une IA de garde à éviter en déplacement ajouterait un deuxième jeu et davantage de synchronisation.

La variation d’objectifs détaillés, par exemple coffre à code ou mécanisme de musée alternatif, vient après validation de cette boucle. On pourra remplacer le mini-jeu du coffre en conservant son contrat +2 et +6, au lieu d’ajouter un nouvel objectif obligatoire à chaque partie. La première version contient quatre épreuves à bien régler, pas une bibliothèque de vingt tâches.

10  Les assets à produire

Les quantités sont des objectifs de production du prototype. Une variante de couleur ou d’état ne demande pas nécessairement un nouveau modèle. Les noms suivants sont des identifiants proposés pour le futur projet, pas des fichiers déjà livrés.

DÉCOR EN 3D
MUS_Base : 1 socle de musée avec sol et mur coupé ; murs, coin et porte en modules réutilisables. Prévoir des pivots et dimensions cohérents.
MUS_Exhibits : 2 vitrines, 3 cadres avec illustrations différentes, 2 socles et 2 statues ou objets absurdes. Les peintures peuvent partager un atlas.
MUS_SetDressing : 1 banc, 1 plante, 1 potelet avec corde, 1 tapis et 1 lampe. Les combinaisons donnent les trois dispositions.
MUS_Layouts : 3 fichiers de placement avec ancrages de postes, sacs, zones et animations. Les modèles ne sont pas dupliqués pour chaque disposition.

POSTES ET OBJETS EN 3D
POST_Vault : 1 coffre avec porte séparée, poignée pivotante, trois verrous visibles et intérieur contenant les lingots. États fermé, progression et ouvert.
POST_Drill : 1 perceuse réutilisée jusqu’à quatre fois, quelques copeaux et une petite fumée en particules.
POST_Security : 1 terminal, 1 caméra orientable, 1 boîtier de dérivation avec couvercle séparé et 1 voyant. Ce groupe représente une seule action.
POST_Loot : 1 module de casiers avec porte séparée, décliné par teinte ou usure. Le groupe possède un stock commun, quelle que soit sa longueur visuelle.
PROP_Bag : 1 sac avec fermeture et ancrage de main, décliné dans les quatre couleurs de joueurs. Il reste à l’entrée et porte un nom ou un écusson.
PROP_Money : 1 pièce, 1 liasse et 1 lingot réutilisables ; affichage principalement par petits groupes et effets 2D.
PROP_Surveillance : 1 bracelet ou paire de menottes cartoon, surtout pictogramme visible au-dessus de l’avatar, sans pose immobilisée complexe.
PROP_Escape : 1 van simplifié aperçu derrière la porte ou sur le bord du diorama.
PROP_Police : 1 silhouette de policier ou bouclier pour la fin, réutilisée. Le raid peut être gyrophares, porte qui s’ouvre et trois silhouettes ; pas de combat ni de ragdoll.

PERSONNAGES ET ANIMATIONS
CHAR_Robber : 1 personnage de base avec 1 rig partagé, décliné en jaune moutarde, turquoise, orange et prune. Visage, sourcils et accessoire simples distinguent les joueurs au-delà de la couleur. Le FBI utilise exactement ces apparences.
CHAR_Guard : 1 gardien avec le même rig si possible. Il peut être ajouté après la première partie jouable.
ANIM_Common : environ 10 clips partagés : attente, marche courte, promesse ou geste, forer, manipuler le boîtier, piller, fouiller un sac, échec ou surprise, accusation, célébration. La défaite peut utiliser la surprise suivie de bras levés.
Les animations s’ancrent à des emplacements prédéfinis. Les victimes n’ont pas besoin de 12 animations de duel différentes : le sac laissé à l’entrée permet le vol pendant que son propriétaire travaille ailleurs. Prévoir quatre points autour de chaque poste pour éviter les superpositions.

INTERFACE EN 2D
UI_HUD : jauge de coffre segmentée, cinq gyrophares, compteur de poche, timer, tour, deux charges de surveillance, noms et portraits.
UI_Markers : icônes forer, sécuriser, casiers et vol ; états disponible, promis, sélection privée, conseillé couvert, terminé et interdit par surveillance. Utiliser un symbole ou du texte en plus de chaque couleur.
UI_Roles : carte Braqueur et carte FBI, plus émetteur privé à deux positions.
UI_Vote : contour de cible, compteur de voix après dépouillement, petit bouton Passer, pictogramme de surveillance.
UI_Results : carte de rôle révélée, résultat collectif, classement, bonus de coffre et titre Roi des Voleurs.
UI_Transition : masque circulaire et fondu alternatif, produits par le code. Les icônes simples et câbles sont vectoriels ou dessinés par le code, pour rester nets.

MINI JEUX EN 2D
MG_Wires : fond de boîte, 3 identifiants circuit, prises et bornes, levier, voyants et vis ; fils tracés par le code.
MG_Drill : corps de perceuse rapproché ou rendu du modèle, cadran, aiguille, bande cible, 3 points de progression, copeaux et vapeur.
MG_Lock : mécanisme de serrure, outil, 3 goupilles, curseur et encoches.
MG_Pocket : sac, main, fermeture, liasse et portrait dans 2 directions plus surprise. Couleurs et portrait proviennent de la cible.
Les décors 2D peuvent être exportés depuis Blender en images avec transparence ou assemblés en SVG. Imagegen peut fournir une piste pour les tableaux, l’ambiance ou des textures. Il ne remplace pas le rig, les pivots, les objets séparés et les animations nécessaires aux modèles jouables.

SONS
Prévoir environ 16 sons courts : clic UI, confirmation, refus, fin de phase, perceuse, surchauffe, prise de câble, courant, levier, serrure, pièces, tissu du sac, signal suspect, gyrophare, van et arrestation. Ajouter 1 ambiance de musée et éventuellement 1 boucle musicale courte avec montée de tension. Aucune réplique doublée ni voix réseau n’est nécessaire à la V1. Les effets privés restent privés jusqu’à la révélation.

11  Format et intégration des assets

Conserver les sources éditables .blend et exporter les objets 3D en .glb. Noms, échelle et axes doivent être cohérents. Appliquer les transformations avant export, utiliser des pivots sur les charnières et nommer les points d’ancrage. Exporter une base de personnage avec ses clips réutilisables ; partager géométrie et matériaux pour ses variantes.

Séparer le décor statique, les postes animés, les avatars et les marqueurs. Les noms des joueurs, les valeurs et les zones de clic restent gérés par le code. Les variations de placement résident dans des données de scène. Une seule caméra et un éclairage simple avec ombres douces rendent l’ensemble faisable ; éviter les reflets complexes, textures énormes et sources lumineuses dynamiques nombreuses.

Objectifs initiaux à mesurer : autour de 100 000 triangles visibles ou moins, textures généralement de 512 à 1 024 pixels, paquet initial inférieur à 15 Mo compressés si possible, interface et mini-jeux fluides à 30 images par seconde sur un téléphone moyen. Ce sont des budgets de travail, pas des performances garanties. La réponse des mini-jeux doit rester indépendante du framerate.

Organiser le futur dépôt en dossiers art/source, art/exports, audio, ui, scenes/layouts et config. Un inventaire associe chaque asset à son auteur ou outil, sa source, sa licence éventuelle, son export et son usage. Les références Among Us et No More Room in Hell 2 guident l’interaction ; leurs images, sons et fichiers ne sont pas à intégrer.

12  Déroulement réseau et états

Le parcours du salon doit rester court : créer un salon, copier le lien, entrer un prénom, rejoindre, attendre les quatre prêts et lancer. Le salon conserve les joueurs pour Rejouer. Il faut un écran par joueur ; un écran partagé ne protège pas les choix et les rôles. Une télévision peut afficher plus tard un mode spectateur exclusivement public, mais n’est pas requise.

Une machine d’états commune règle les transitions : salon, rôle, promesses, choix secrets, mini-jeux, révélation, débat, résultat. Les délais et l’ordre des événements sont pilotés par une autorité commune. Le résultat d’un tour est appliqué une seule fois, même après reconnexion ou renvoi d’un message.

Pour cette version, prévoir un petit serveur de salon qui attribue les rôles, conserve les choix et diffuse uniquement ce que chacun doit connaître. Le client reçoit l’état public et son état privé. Masquer un champ dans l’interface ne suffit pas si tous les navigateurs reçoivent les rôles ou les choix avant la révélation. Le lien de salon peut garder la simplicité de Money Tour ; son transport réseau n’est pas une garantie de secret à reprendre aveuglément.

Les mini-jeux peuvent tourner localement et renvoyer un résultat avant le délai. Le serveur valide l’action autorisée, l’identité, le tour, le verrouillage, la récompense et l’unicité du résultat ; cela suffit pour un prototype entre amis, sans prétendre empêcher toute triche par modification du navigateur. Le score final est calculé par le serveur. La graine du décor est séparée des tirages de rôles et des données privées.

En cas de perte de connexion, afficher une pause commune et geler le tour, y compris le chrono de l’épreuve. Une fenêtre de reconnexion de 90 secondes permet de retrouver le même rôle, choix, progression locale envoyée et temps restant. Si la restauration d’une épreuve n’est pas fiable, conserver un état sérialisable de ses points, branchements et temps. Après l’expiration, terminer sans classement et proposer le retour au salon ; ne pas offrir une victoire FBI grâce à une panne. Ce comportement doit être testé avant diffusion publique.

13  Ordre conseillé de développement

Étape 1 : moteur de règles pur et configurable pour quatre joueurs. Mettre en place les cinq tours, les gains, les alarmes, les rôles, la surveillance et le classement. Vérifier les cas chiffrés sans art.

Étape 2 : musée provisoire avec formes simples, repères cliquables, promesses publiques vertes, choix privés et vote sur avatars. À ce stade, les résultats des épreuves peuvent être pilotés dans un outil de développement local. Cet outil ne figure pas dans la partie publique.

Étape 3 : boîte de dérivation jouable sur souris et tactile, puis intégration dans une partie à quatre. C’est le premier test de lisibilité et de plaisir de manipulation.

Étape 4 : ajouter les trois autres épreuves, le serveur de salon, les révélations synchronisées et la reconnexion. Jouer des parties complètes et mesurer les choix, les erreurs, les durées et les victoires par rôle.

Étape 5 : remplacer progressivement les formes par les modèles Blender, puis ajouter animations, sons et trois dispositions. Le décor ne doit pas retarder le premier test de la boucle.

Ne pas estimer le coût comme une simple modification de Money Tour : quatre mini-jeux, des animations de personnages et des secrets réseau représentent un travail supplémentaire. Le musée unique, le rig commun, les actions indépendantes et le nombre fixe de quatre joueurs gardent ce travail délimité. Les parties à cinq ou six demanderaient un nouvel équilibrage ; ne pas les annoncer à la V1.

14  Vérifications avant de développer davantage

Règles : vérifier le calcul simultané de l’alarme, la priorité de la police si coffre terminé et alarme à 5, l’échec au tour 5 si coffre incomplet, le bonus de 8 réservé aux braqueurs, les gains des foreurs simultanés et le partage des 12 pièces.

Vol : vérifier les poches vides, plusieurs voleurs sur une cible, les vols croisés et l’absence d’argent négatif. Le bilan ne dépend jamais de l’ordre d’arrivée des résultats réseau.

Surveillance : vérifier le seuil de trois voix, les égalités, les abstentions, les deux utilisations partagées, l’expiration après un tour, l’interdiction de brouillage et le cas du coffre déjà ouvert.

Secret : vérifier avec deux ou quatre clients que les changements privés, le mode FBI, la fin anticipée d’une épreuve et les gains ne sont pas visibles avant la révélation. Une trace reste affichée après un tour dont l’alarme baisse.

Interface : vérifier les clics et taps sur les postes, les avatars et les fils à 390 × 844, 844 × 390, 320 × 740 et sur ordinateur. Tous les gains, risques et états se lisent sans survol ni code couleur exclusif. Le portrait dispose d’une scène cadrée pour ses interactions et de marqueurs réorganisés ; le paysage peut être conseillé sans être imposé.

Jeu : observer si les braqueurs coopèrent assez pour s’échapper, si l’argent crée des changements de promesses, si le FBI dispose de vrais choix de couverture et si le débat utilise des indices plutôt que des accusations au hasard. La limite de cinq alarmes est un point de départ : ne pas augmenter la difficulté des mini-jeux pour compenser un déséquilibre du FBI.

Le premier objectif de validation est de faire jouer plusieurs groupes et de relever les victoires FBI, les coffres inachevés, les échecs par épreuve, l’usage des surveillances, la répartition des actions et la durée totale. Ajuster une valeur à la fois. Aucun taux de victoire ou plaisir de jeu n’a été démontré à ce stade.

Le point d’équilibre le plus sensible est connu : une sécurité réussie retire autant d’alarme que le temps et le brouillage en ajoutent ensemble. Une équipe disciplinée qui réussit toujours sa sécurité peut donc neutraliser la menace d’alarme. Le FBI doit alors provoquer un abandon de poste par le bluff, exploiter les échecs ou faire négliger le coffre. Si cela le rend trop faible en partie, ajuster d’abord la pression d’alarme ou l’économie dans la configuration, sans ajouter immédiatement une cinquième action ou de nouvelles exceptions.

15  Références consultées

Among Us, page officielle Innersloth : https://www.innersloth.com/games/among-us/
La référence revendique coopération, trahison, tâches et discussions. Notre adaptation utilise des promesses publiques et un classement d’argent, avec une surveillance temporaire sans élimination.

No More Room in Hell 2, notes officielles de la mise à jour Reinforcement : https://www.nmrih2.com/2024/11/28/reinforcement-update-0-2-0-out-now/
Les notes mentionnent explicitement le mini-jeu de câblage, ses indicateurs et les disjoncteurs interactifs. La boîte décrite ici est notre proposition de puzzle court ; elle ne prétend pas reproduire exactement toutes les règles de l’original.

No More Room in Hell 2, notes officielles Armageddon : https://www.nmrih2.com/2026/08/10/armageddon-1-0-update-notes/
Les développeurs y signalent des améliorations du déroulement du câblage. Pour le prototype, on retient surtout une manipulation claire, des retours immédiats et un gros plan lisible, avec des graphismes originaux.

Les anciens concepts visuels restent une référence de musée et de personnages cartoon. Leurs panneaux latéraux et cartes d’action sont remplacés dans ce brief par des interactions directes sur le diorama. Les concepts générés ne sont ni des modèles Blender ni une preuve de rendu temps réel déjà obtenu.

## Précision réseau de Julien

Après le brief joint, Julien a demandé : « le jeu doit gérer ça localement avec l’hote ». Cette instruction prévaut sur le chapitre 12 du brief : le navigateur hôte conserve les rôles et choix, valide les commandes et calcule les résultats. Les autres navigateurs reçoivent une vue filtrée par destinataire. Il n’y a pas de serveur de jeu à déployer. La confiance accordée à l’hôte est une limite explicite de ce modèle.
