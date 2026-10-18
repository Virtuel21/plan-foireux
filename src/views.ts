import {
  legal,
  postReward,
  postShare,
  recommended,
  type Choice,
  type PostAction,
  type View,
} from "./engine";
import { LABELS } from "./scene";
import { icon } from "./icons";
export { escapeHTML as esc } from "./html";
import { escapeHTML as esc } from "./html";
const ASSET_BASE = import.meta.env?.BASE_URL ?? "./";
export const choiceText = (c: Choice | null, v?: View) =>
  c
    ? `${LABELS[c.action]}${c.target ? ` → ${v?.players.find((p) => p.id === c.target)?.name ?? ""}` : ""}`
    : "Aucun poste";
export const PHASES = {
  role: "Découvrez votre rôle",
  promise: "Annoncez votre poste",
  secret: "Votre vrai choix reste secret",
  transition: "À vous de jouer…",
  minigame: "Une épreuve. Un seul poste.",
  reveal: "Bilan de la manche",
  debate: "Votez pour une surveillance",
  ended: "Le casse est terminé",
};
export function gain(c: Choice | null, v: View) {
  if (!c) return "Choisissez votre poste.";
  if (c.action === "pocket")
    return `${v.myLastTheft !== null ? "TOUT LE GROUPE EST VIGILANT · " : ""}Volez 90 % du gain du tour de ${v.players.find((p) => p.id === c.target)?.name}, en lui laissant au moins 1 pièce`;
  const count = v.players.filter((p) => p.promise?.action === c.action).length;
  return `${LABELS[c.action]} · ${c.action === "drill" ? "Coffre +2 · " : c.action === "secure" ? "Alarme −2 · " : ""}${postReward(c.action)} pièces à partager (${postShare(c.action, count)} selon les annonces)`;
}
const POST_ICONS = {
  drill: "wrench",
  secure: "laser",
  loot: "statue",
  painting: "museum",
};
const POST_EFFECTS = {
  drill: "Coffre +2",
  secure: "Alarme −2",
  loot: "Statue à porter",
  painting: "Gros butin",
};
export function mobileControls(v: View, selected: Choice | null) {
  const choosing = v.phase === "promise" || v.phase === "secret";
  const posts: PostAction[] = ["drill", "secure", "loot", "painting"];
  return `${
    choosing
      ? `<div class="mobile-section-title"><strong>${v.phase === "promise" ? "Votre promesse publique" : "Votre vrai poste · privé"}</strong><span>Butin à partager</span></div><div class="mobile-posts">${posts
          .map((action) => {
            const announced = v.players.filter(
              (p) => p.promise?.action === action,
            );
            const chosen = selected?.action === action;
            return `<button class="mobile-post-card${chosen ? " selected" : ""}" data-mobile-post="${action}" data-select="${action}" aria-pressed="${chosen}" ${!legal(v, v.myId, { action }) ? "disabled" : ""}><span class="mobile-post-heading">${icon(POST_ICONS[action])}<strong>${LABELS[action]}</strong><b class="coin-amount" aria-label="${postReward(action)} pièces">${icon("coin")}${postReward(action)}</b></span><span class="mobile-post-detail">${POST_EFFECTS[action]}<small>${announced.length} annoncé${announced.length > 1 ? "s" : ""}</small></span><span class="mobile-promises">${announced.length ? announced.map((p) => `<i style="--player:${p.color}"></i>${esc(p.name)}`).join(" · ") : "Personne d’annoncé"}</span></button>`;
          })
          .join("")}</div>`
      : ""
  }<div class="mobile-section-title"><strong>Les complices</strong><span>${v.phase === "secret" ? "Touchez un rival pour le voler" : "Promesses publiques"}</span></div><div class="mobile-players">${v.players
    .map((p, i) => {
      const canSteal =
        v.phase === "secret" &&
        legal(v, v.myId, { action: "pocket", target: p.id });
      const content = `<img src="${ASSET_BASE}portraits/${i}.png" alt=""><span><strong>${esc(p.name)}${p.id === v.myId ? " · vous" : ""}</strong><small>${p.promise ? esc(LABELS[p.promise.action]) : "Aucun poste annoncé"}</small></span><b class="coin-amount">${icon("coin")}${p.money}</b>${canSteal ? `<em>${selected?.action === "pocket" && selected.target === p.id ? "Ciblé" : "Voler"}</em>` : ""}`;
      return canSteal
        ? `<button class="mobile-player${selected?.action === "pocket" && selected.target === p.id ? " selected" : ""}" data-select="player:${esc(p.id)}" aria-label="Voler ${esc(p.name)}" aria-pressed="${selected?.action === "pocket" && selected.target === p.id}" style="--player:${p.color}">${content}</button>`
        : `<div class="mobile-player" style="--player:${p.color}">${content}</div>`;
    })
    .join("")}</div>`;
}
export function hud(v: View) {
  const me = v.players.find((p) => p.id === v.myId)!;
  return `<div class="hud-vault" aria-label="Coffre ${v.vault} sur 8">${icon("lock")}<span class="hud-label">Coffre</span><div class="segments">${Array.from({ length: 8 }, (_, i) => `<i class="${i < v.vault ? "filled" : ""}"></i>`).join("")}</div><strong>${v.vault}/8</strong></div><div class="alarm ${v.alarm >= 4 ? "critical" : ""}" aria-label="Alarme ${v.alarm} sur 5">${Array.from({ length: 5 }, (_, i) => `<span class="siren ${i < v.alarm ? "on" : ""}">${icon("alarm")}</span>`).join("")}</div><div class="my-money">${icon("coin")}<strong>${me.money}</strong><span>pièces</span></div><div class="surveillance-count" aria-label="${v.charges} surveillances restantes">${icon("eye")}<strong>${v.charges}/2</strong></div>`;
}
export function crewControls(v: View, selected: Choice | null) {
  if (["role", "transition", "minigame", "ended"].includes(v.phase)) return "";
  return `<h2>Les complices</h2><p>${v.phase === "secret" ? "Un rival bien payé ?" : "Le plan de chacun"}</p>${v.players
    .map((p, i) => {
      const canSteal =
        v.phase === "secret" &&
        v.pausedAt === null &&
        legal(v, v.myId, { action: "pocket", target: p.id });
      const canVote =
        v.phase === "debate" && v.charges > 0 && v.pausedAt === null;
      const chosen = canVote
        ? v.myVote === p.id
        : selected?.action === "pocket" && selected.target === p.id;
      const finding = ["reveal", "debate"].includes(v.phase)
        ? v.report?.findings.find((f) => f.id === p.id)
        : null;
      const content = `<img src="${ASSET_BASE}portraits/${i}.png" alt=""><span class="crew-details"><strong>${esc(p.name)}${p.id === v.myId ? " · vous" : ""}</strong><span class="coin-amount">${icon("coin")}${p.money}</span><small>${finding ? `${LABELS[finding.choice.action]} ${finding.success ? "✓" : "×"} · +${finding.gain}${finding.loss ? ` −${finding.loss}` : ""}` : p.promise ? `Promis : ${LABELS[p.promise.action]}` : "Aucun poste annoncé"}</small>${v.watched === p.id ? `<small>${icon("eye")}Surveillé</small>` : ""}${canSteal ? `<span class="crew-steal">${icon("steal")}Voler${chosen ? icon("check") : ""}</span>` : canVote ? "<small>Surveiller</small>" : ""}</span>`;
      return canSteal || canVote
        ? `<button class="crew-card${chosen ? " selected" : ""}" data-select="player:${esc(p.id)}" aria-label="${canSteal ? "Voler" : "Surveiller"} ${esc(p.name)}" aria-pressed="${chosen}" style="--player:${p.color}">${content}</button>`
        : `<div class="crew-card" style="--player:${p.color}">${content}</div>`;
    })
    .join("")}`;
}
export function footer(v: View, selected: Choice | null) {
  if (v.phase === "promise" || v.phase === "secret") {
    const covered =
      v.players.filter((p) => p.promise?.action === "drill").length >=
        recommended(v) && v.players.some((p) => p.promise?.action === "secure");
    const target = v.players.find((p) => p.id === v.myJamTarget);
    return `<div class="selection-info"><span class="eyebrow">${v.phase === "secret" ? "VOTRE CHOIX PRIVÉ" : "VOTRE PROMESSE PUBLIQUE"}</span><strong>${esc(gain(selected, v))}</strong><small>${v.watched === v.myId ? "Surveillance : coffre ou caméras uniquement." : v.phase === "secret" ? "Les postes encombrés rapportent moins. Touchez un rival pour voler son gain." : covered ? "✓ Coffre et caméras couverts selon les annonces. Vos vrais choix restent libres." : "Annoncez un des quatre postes. Faire les poches se choisit uniquement en secret."}</small></div>${v.myRole === "agent" && v.phase === "secret" ? `<button class="transmitter ${v.myJam ? "armed" : ""}" data-action="jam" aria-pressed="${v.myJam}" ${v.watched === v.myId ? "disabled" : ""}>${icon("flag")}<span>${v.watched === v.myId ? "Brouillage bloqué" : v.myJam ? `Brouiller ${esc(target?.name)} · Modifier` : "FBI · Choisir une cible"}</span></button>` : `<span class="phase-tag">${v.phase === "secret" ? icon("lock") + " Secret" : icon("users") + " Public"}</span>`}`;
  }
  if (v.phase === "reveal" || v.phase === "debate")
    return `<div class="selection-info"><span class="eyebrow">${v.phase === "debate" ? "VOTES EN DIRECT" : "RÉSOLUTION SIMULTANÉE"}</span><strong>${v.vault >= 8 ? "Coffre ouvert : la fuite est lancée !" : v.alarm >= 5 ? "La police est alertée." : `Coffre : encore ${8 - v.vault} points · ${5 - v.round} manches maximum`}</strong><small>${v.phase === "debate" ? "3 voix sur 4 · Un tour de surveillance · Rôle non révélé" : v.report && v.report.alarmAfter > v.report.alarmBefore ? `L’alarme monte à ${v.report.alarmAfter}/5. Le bilan explique ce qui s’est passé.` : "Le groupe a contenu les alarmes. Consultez les actions et les gains."}</small></div><button data-action="report" class="subtle">${icon("chat")}<span>${v.phase === "debate" ? "Bilan et vote" : v.report && v.report.alarmAfter > v.report.alarmBefore ? "Pourquoi l’alarme ?" : "Bilan"}</span></button>`;
  return `<p class="quiet">Ouvrez le coffre pour fuir. Au plus tard manche 5. À 5 alarmes, le FBI gagne.</p>`;
}
export function report(v: View) {
  const r = v.report;
  if (!r) return "<p>Aucun bilan pour le moment.</p>";
  const voting = v.phase === "debate",
    alarmRang = r.alarmAfter > r.alarmBefore;
  const failed = r.findings
    .filter((f) => !f.success)
    .map((f) => esc(v.players.find((p) => p.id === f.id)?.name));
  return `<span class="eyebrow">MANCHE ${r.round} · ${voting ? "VOTE EN DIRECT" : "CE QUI VIENT DE SE PASSER"}</span><time class="report-clock" aria-label="Temps restant pour le bilan ou le vote"></time><h2>${voting ? "Qui faut-il surveiller ?" : r.alarmAfter > r.alarmBefore ? "Pourquoi l’alarme a sonné" : "Résultats de la manche"}</h2>${alarmRang ? `<div class="alarm-explanation"><div><span>Avant</span><b>${r.alarmBefore}</b></div><div><span>Temps écoulé</span><b>+1</b></div><div class="${r.failures ? "danger-text" : ""}"><span>${r.failures} défi${r.failures > 1 ? "s" : ""} raté${r.failures > 1 ? "s" : ""}</span><b>+${r.failures}</b></div><div><span>Alarmes désactivées<br>par ${r.security} joueur${r.security > 1 ? "s" : ""}</span><b>−${r.security * 2}</b></div><div><span>Alarme finale</span><b>${r.alarmAfter}/5</b></div></div>` : ""}<p class="report-context">${alarmRang && failed.length ? `Défis ratés : ${failed.join(", ")}. Un défi incomplet ou brouillé compte comme un échec. ` : ""}${v.vault >= 8 ? (r.alarmAfter < 5 ? "Coffre ouvert : vous fuyez dès la fin de ce bilan." : "Coffre ouvert, mais la police arrive : la priorité reste à l’alarme.") : `Coffre +${r.vaultAdded} : ${v.vault}/8. Il reste ${5 - v.round} manche${5 - v.round > 1 ? "s" : ""} maximum pour l’ouvrir.`}</p><div class="vote-grid">${v.players
    .map((p, i) => {
      const f = r.findings.find((f) => f.id === p.id)!;
      const n = v.voteCounts[p.id] ?? 0;
      return `<article class="vote-card ${v.myVote === p.id ? "voted" : ""}" style="--player:${p.color}"><div class="vote-person"><img src="${ASSET_BASE}portraits/${i}.png" alt=""><div><strong>${esc(p.name)}${p.id === v.myId ? " · vous" : ""}</strong><b>${p.money} pièces</b></div></div><div class="finding-action ${f.success ? "success-text" : "danger-text"}">${esc(choiceText(f.choice, v))} · ${f.success ? "Réussi" : alarmRang ? "Raté · +1 alarme" : "Raté"}</div><p>${f.promise ? `Promis : ${esc(choiceText(f.promise, v))}` : "Aucun poste promis"}<br>${f.betrayed ? "Promesse changée" : "Promesse tenue"} · Gain +${f.gain}${f.loss ? ` · Volé −${f.loss} · Solde du tour ${f.gain - f.loss >= 0 ? "+" : ""}${f.gain - f.loss}` : ""}</p>${voting ? `<button data-vote="${esc(p.id)}" aria-pressed="${v.myVote === p.id}" ${!v.charges ? "disabled" : ""}><span>${v.myVote === p.id ? "Votre vote" : "Surveiller"}</span><b data-count="${esc(p.id)}">${n} / 4</b></button>` : ""}</article>`;
    })
    .join(
      "",
    )}</div>${voting ? `<div class="vote-footer"><p>${v.charges ? `<b>3 voix pour la même personne.</b> ${v.charges}/2 surveillances restantes.<br>Au prochain tour : coffre ou caméras, brouilleur bloqué. Aucun rôle révélé.` : "Plus de surveillance. Prêts pour la suite ?"}</p><button data-action="pass" class="${v.myVote === "pass" ? "selected" : "subtle"}">${v.charges ? "Passer" : "Continuer"} · ${v.voteCounts.pass ?? 0}/4</button></div><p class="vote-live" role="status" aria-atomic="true">${v.players.map((p) => `${esc(p.name)} : ${v.voteCounts[p.id] ?? 0} voix`).join(" · ")}. La manche suivante commence dès les quatre réponses. Le vote reste modifiable en attendant.</p>` : '<p class="quiet">Les quatre vrais postes et résultats sont révélés ensemble. Le vote suit si le casse continue.</p>'}`;
}
export const rules = `<span class="eyebrow">LE PLAN</span><h2>Ouvrez. Enrichissez-vous. Fuyez.</h2><p>Le coffre à 8/8 lance la fuite immédiatement après le bilan, si l’alarme reste sous 5. Vous avez cinq manches maximum. À 5 alarmes ou si le temps manque, le FBI gagne.</p><div class="rule-grid"><p><b>Forer</b>Chaque réussite ouvre le coffre de 2 points.</p><p><b>Désactiver les caméras</b>Chaque réussite retire 2 alarmes.</p><p><b>Statue & toile</b>Deux autres façons de gagner des pièces.</p><p><b>Des butins inégaux à partager</b>Caméras : ${postReward("secure")} pièces. Forer : ${postReward("drill")}. Statue : ${postReward("loot")}. Toile : ${postReward("painting")}. La cagnotte est partagée entre les participants réels, arrondie vers le bas. Une part ratée est perdue. Les postes critiques rapportent moins : à vous de résister à la tentation.</p><p><b>Faire les poches · Secret uniquement</b>Volez presque tout le gain du tour de votre cible (90 %, arrondi vers le haut, en lui laissant au moins 1 pièce). Sans gain, jusqu’à 4 pièces de sa réserve. Plusieurs voleurs partagent ce montant. Après un vol, toutes les cibles sont vigilantes à la manche suivante : changer de victime ne réduit pas la difficulté. Une manche sans faire les poches rétablit la difficulté normale.</p><p><b>Alarme</b>+1 par manche, +1 pour chaque défi raté, −2 par joueur qui désactive les alarmes. Tout est calculé ensemble.</p></div><p>Le FBI choisit une cible privée et remplace son défi par un talkie-walkie à régler sur trois fréquences. S’il réussit, son poste de couverture réussit aussi et la cible apparaît comme ayant raté son défi. Aucun nom de brouilleur n’est dévoilé.</p><p>Le vote se termine dès les quatre réponses. Votez après chaque manche qui continue : 3 voix sur 4 imposent coffre ou caméras et bloquent le brouilleur un tour. Deux surveillances communes. Tous les braqueurs gagnent la fuite et 8 pièces de bonus ; le plus riche devient Roi des Voleurs.</p>`;
