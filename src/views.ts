import { recommended, type Choice, type View } from "./engine";
import { LABELS } from "./scene";
import { icon } from "./icons";
export { escapeHTML as esc } from "./html";
import { escapeHTML as esc } from "./html";
export const choiceText = (c: Choice | null, v?: View) =>
  c
    ? `${LABELS[c.action]}${c.target ? ` → ${v?.players.find((p) => p.id === c.target)?.name ?? ""}` : ""}`
    : "Aucun poste";
export const PHASES = {
  role: "Découvrez votre rôle",
  promise: "Annoncez votre poste",
  secret: "Choisissez ce que vous faites vraiment",
  transition: "À vous de jouer…",
  minigame: "Une épreuve. Un seul poste.",
  reveal: "Les promesses passent aux actes",
  debate: "Qui surveille-t-on au prochain tour ?",
  ended: "Le casse est terminé",
};
export function gain(c: Choice | null, v: View) {
  if (!c) return "Touchez un poste dans le musée.";
  return c.action === "drill"
    ? "Coffre +2 · Vous +6 pièces"
    : c.action === "secure"
      ? "Alarme −2 · Vous +6 pièces"
      : c.action === "loot"
        ? "Butin de 12 pièces à partager entre les réussites"
        : `Jusqu’à ${Math.min(4, v.players.find((p) => p.id === c.target)?.money ?? 0)} volées à ${v.players.find((p) => p.id === c.target)?.name}${v.round === 1 ? " · Poches vides ce tour" : ""}`;
}
export function hud(v: View) {
  const me = v.players.find((p) => p.id === v.myId)!;
  return `<div class="hud-vault" aria-label="Coffre ${v.vault} sur 8">${icon("lock")}<span class="hud-label">Coffre</span><div class="segments">${Array.from({ length: 8 }, (_, i) => `<i class="${i < v.vault ? "filled" : ""}"></i>`).join("")}</div><strong>${v.vault}/8</strong></div><div class="alarm ${v.alarm >= 4 ? "critical" : ""}" aria-label="Alarme ${v.alarm} sur 5">${Array.from({ length: 5 }, (_, i) => `<span class="siren ${i < v.alarm ? "on" : ""}">${icon("alarm")}</span>`).join("")}</div><div class="my-money">${icon("coin")}<strong>${me.money}</strong><span>pièces</span></div><div class="surveillance-count" aria-label="${v.charges} surveillances restantes">${icon("eye")}<strong>${v.charges}/2</strong></div>`;
}
export function footer(v: View, selected: Choice | null) {
  if (v.phase === "promise" || v.phase === "secret") {
    const covered =
      v.players.filter((p) => p.promise?.action === "drill").length >=
        recommended(v) && v.players.some((p) => p.promise?.action === "secure");
    return `<div class="selection-info"><span class="eyebrow">${v.phase === "secret" ? "VOTRE CHOIX PRIVÉ" : "VOTRE PROMESSE PUBLIQUE"}</span><strong>${esc(gain(selected, v))}</strong><small>${v.watched === v.myId ? "Surveillance : coffre ou sécurité uniquement ce tour." : v.phase === "secret" ? "Modifiable jusqu’au signal. Les autres ne voient que vos promesses." : covered ? "✓ Le plan couvre les besoins annoncés, si les épreuves réussissent." : "Choix modifiable. Touchez un autre poste ou le personnage d’un rival."}</small></div>${v.phase === "promise" && v.voteResult ? `<button class="subtle" data-action="report" aria-label="Voir les voix du dernier vote">Vote</button>` : ""}${v.myRole === "agent" && v.phase === "secret" ? `<button class="transmitter ${v.myJam ? "armed" : ""}" data-action="jam" aria-pressed="${v.myJam}" ${v.watched === v.myId ? "disabled" : ""}>${icon("flag")}<span>${v.watched === v.myId ? "Brouillage bloqué ce tour" : v.myJam ? "Brouiller · activé" : "Profil bas"}</span></button>` : `<span class="phase-tag">${v.phase === "secret" ? icon("lock") + " Secret" : icon("users") + " Public"}</span>`}`;
  }
  if (v.phase === "reveal" || v.phase === "debate") {
    const r = v.report;
    return `<div class="selection-info"><span class="eyebrow">${v.phase === "debate" ? "DISCUTEZ · VOIX PRIVÉES" : "RÉSOLUTION SIMULTANÉE"}</span><strong>${r?.trace ? `Transmission suspecte : zone ${r.trace === "vault" ? "du coffre" : "de l’entrée"}` : "Aucune transmission suspecte détectée"}</strong><small>${v.phase === "debate" ? (v.charges ? "3 voix sur 4 · Un tour de surveillance · Rôle non révélé" : "Plus de surveillance. Préparez le prochain tour ensemble.") : `${r?.alarmBefore} +1 temps +${r?.jam} brouillage −${(r?.security ?? 0) * 2} sécurité = ${r?.alarmAfter} alarme · Coffre +${r?.vaultAdded}`}</small></div><button data-action="report" class="subtle">${icon("chat")}<span>Bilan</span></button>${v.phase === "debate" ? `<button data-action="pass" class="${v.myVote === "pass" ? "selected" : "subtle"}" ${!v.charges ? "disabled" : ""}>Passer</button>` : ""}`;
  }
  return `<p class="quiet">Ouvrez le coffre avant la fin du tour 5. À 5 alarmes, la police gagne.</p>`;
}
export function report(v: View) {
  const r = v.report;
  if (!r) return "<p>Aucun bilan pour le moment.</p>";
  return `<span class="eyebrow">TOUR ${r.round} · INFORMATIONS PUBLIQUES</span><h2>Bilan du casse</h2><p class="report-math">Alarme : ${r.alarmBefore} +1 temps +${r.jam} signal −${r.security * 2} sécurité = <strong>${r.alarmAfter}</strong><br>Coffre : +${r.vaultAdded} points</p>${r.trace ? `<p class="trace">${icon("flag")}Transmission suspecte dans la zone ${r.trace === "vault" ? "du coffre" : "de l’entrée"}.</p>` : ""}<div class="report-list">${r.findings
    .map((f) => {
      const p = v.players.find((p) => p.id === f.id)!;
      return `<div><span class="report-player" style="--player:${p.color}">${esc(p.name)}</span><span><strong>${esc(choiceText(f.choice, v))} · ${f.success ? "Réussi" : "Raté"}</strong><small>${f.betrayed ? `Promis : ${esc(choiceText(f.promise, v))} → Fait : ${esc(choiceText(f.choice, v))}` : f.promise ? "Promesse tenue" : "Aucun poste promis"}<br>Zone ${f.zone === "vault" ? "du coffre" : "de l’entrée"}</small></span><b>+${f.gain}${f.loss ? `<br>−${f.loss}` : ""}</b></div>`;
    })
    .join("")}</div>${
    v.voteResult
      ? `<p class="quiet">Dernier vote : ${v.players
          .map((p) => [p.id, v.voteResult!.votes[p.id] ?? "pass"] as const)
          .map(
            ([id, target]) =>
              `${esc(v.players.find((p) => p.id === id)?.name)} → ${target === "pass" ? "Passer" : esc(v.players.find((p) => p.id === target)?.name)}`,
          )
          .join(" · ")}</p>`
      : ""
  }`;
}
export const rules = `<span class="eyebrow">LE PLAN EN TROIS PHRASES</span><h2>Fuyez ensemble.<br>Gardez une longueur d’avance.</h2><p>Ouvrez le coffre avant la fin du tour 5. À 5 alarmes, la police gagne. Coopérez pour fuir, enrichissez-vous pour devenir Roi des Voleurs ; un FBI est parmi vous.</p><div class="rule-grid"><p><b>Forer</b>Une réussite : coffre +2, vous +6.</p><p><b>Sécuriser</b>Une réussite : alarme −2, vous +6.</p><p><b>Casiers</b>12 pièces partagées entre ceux qui réussissent.</p><p><b>Faire les poches</b>Jusqu’à 4 pièces de la poche initiale d’un rival. Ses gains du tour restent à lui.</p></div><p>Chaque tour : 20 s de promesses, 12 s de choix secrets, 18 s d’épreuve, 12 s de révélation et 30 s de débat. Le temps ajoute 1 alarme. Un FBI qui réussit peut en ajouter 1 et laisse une trace de zone.</p><p><b>Surveillance :</b> 3 voix sur 4, deux utilisations communes. Au prochain tour seulement, le suspect doit forer ou sécuriser ; son brouillage est bloqué. Personne n’est éliminé, aucun rôle n’est révélé.</p><p><b>La fuite attend la fin du tour 5.</b> Coffre à 8 et alarme sous 5 : les trois braqueurs gagnent, chacun reçoit 8 pièces. Le plus riche devient Roi des Voleurs, même en cas d’égalité.</p>`;
