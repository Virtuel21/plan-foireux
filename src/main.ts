import "./style.css";
import { Session, type Snapshot } from "./session";
import { Museum, LABELS } from "./scene";
import { Minigame } from "./minigame";
import { newTrial } from "./trial";
import { legal, type Action, type Choice } from "./engine";
import {
  esc,
  footer,
  hud,
  mobileControls,
  PHASES,
  report,
  rules,
} from "./views";
import { icon } from "./icons";
import { soundBank } from "./audio";

const $ = (q: string) => document.querySelector<HTMLElement>(q)!;
let museum: Museum | null = null,
  snapshot: Snapshot,
  selected: Choice | null = null,
  turn = 0;
let minigame: Minigame | null = null,
  trialRound = 0,
  practice = false,
  modal = "",
  previousFocus: HTMLElement | null = null;
let practiceTimer: ReturnType<typeof setInterval> | undefined;
let mobileMarkup = "";
let muted = localStorage.getItem("pf-muted") === "1";
const session = new Session(
  localStorage.getItem("pf-name") || "Julien",
  render,
);
const invite = new URLSearchParams(location.hash.slice(1));
try {
  museum = new Museum($("#scene"), select);
} catch {
  $("#scene").innerHTML =
    '<p class="scene-error">Le rendu 3D nécessite WebGL. Active l’accélération graphique puis recharge la page.</p>';
}
let phaseAnnouncementTimer: ReturnType<typeof setTimeout> | undefined;
function announcePhase(phase: string) {
  const el = $("#phase-announcement");
  clearTimeout(phaseAnnouncementTimer);
  el.hidden = true;
  if (!["promise", "secret"].includes(phase)) return;
  el.innerHTML = `<span class="eyebrow">${phase === "promise" ? "À TOUS LES COMPLICES · PUBLIC" : "À VOUS DE DÉCIDER · PRIVÉ"}</span><strong>${phase === "promise" ? "Annoncez votre poste" : "Choisissez votre vrai poste"}</strong><p>${phase === "promise" ? "Choisissez un poste pour annoncer votre plan." : "Respectez votre promesse… ou volez le gain d’un rival."}</p>`;
  el.hidden = false;
  phaseAnnouncementTimer = setTimeout(() => (el.hidden = true), 2800);
}
function notify(text: string) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
function sound(type: string) {
  soundBank.muted = muted;
  soundBank.play(
    type === "click" ? "ui" : type === "success" ? "confirm" : "phase",
  );
}
function render(s: Snapshot) {
  snapshot = s;
  const v = s.view,
    changed = v?.turn !== turn;
  if (v && changed) {
    turn = v.turn;
    selected =
      v.phase === "secret"
        ? (v.myChoice ?? v.players.find((p) => p.id === v.myId)!.promise)
        : v.phase === "promise"
          ? v.players.find((p) => p.id === v.myId)!.promise
          : v.myChoice;
    if (modal) closeModal();
    sound(v.phase);
    announcePhase(v.phase);
    if (v.phase === "reveal") {
      if (v.report && v.report.alarmAfter > v.report.alarmBefore)
        soundBank.play("siren");
      else if (v.report?.findings.some((f) => f.gain)) soundBank.play("coin");
    }
    if (v.phase === "ended")
      soundBank.play(v.result?.kind === "escape" ? "van" : "arrest");
    if (v.phase === "promise" && v.voteResult) {
      const suspect = v.players.find((p) => p.id === v.voteResult!.suspect);
      notify(
        suspect
          ? `${suspect.name} est surveillé ce tour. Une utilisation consommée.`
          : "Pas de majorité de trois voix. Aucune surveillance consommée.",
      );
    }
  }
  if (v?.phase === "secret") selected = v.myChoice ?? selected;
  if (v?.phase === "promise")
    selected = v.players.find((p) => p.id === v.myId)!.promise;
  document.body.dataset.phase = v?.phase ?? "lobby";
  document.body.classList.toggle("in-game", !!v);
  soundBank.loop("ambience", !!v && v.pausedAt === null && v.phase !== "ended");
  soundBank.music(!!v && v.phase !== "ended", !!v && v.pausedAt !== null);
  $("#top").innerHTML =
    `<a class="brand" href="${location.pathname}" aria-label="Plan Foireux, accueil">${icon("mask")}<span>PLAN <b>FOIREUX</b><small>UN CASSE PRESQUE PARFAIT</small></span></a>${v ? `<div class="hud">${hud(v)}</div>` : '<span class="edition">LE MUSÉE DES MAUVAISES IDÉES · VOL. 01</span>'}<nav aria-label="Options"><button class="icon-button" data-action="sound" aria-label="${muted ? "Activer" : "Couper"} les sons">${icon(muted ? "mute" : "sound")}</button>${v ? `<button class="icon-button" data-action="role" aria-label="Revoir mon rôle en privé">${icon("mask")}</button>` : ""}<button class="icon-button" data-action="fullscreen" aria-label="Plein écran">${icon("grid")}</button><button class="icon-button" data-action="rules" aria-label="Règles du jeu">${icon("help")}</button></nav>`;
  $("#phase").innerHTML = v
    ? `<div class="phase-copy"><span class="round">TOUR <b>${v.round}</b><span>/ 5</span></span><h1>${PHASES[v.phase]}</h1>${v.phase === "secret" ? '<span class="private-label">PRIVÉ</span>' : ""}</div><time id="countdown" aria-label="Temps restant">00:00</time>`
    : '<span class="location">MUSÉE BELLEVUE · 23:47</span><span class="quiet landscape-hint">4 complices · 1 écran chacun · 5 manches maximum</span>';
  $("#footer").innerHTML = v
    ? footer(v, selected)
    : '<span class="quiet">Promettez le meilleur. Préparez le pire.</span><span class="quiet">v3.0 · Fuite dès l’ouverture · Un FBI parmi vous</span>';
  if (!v) lobby(s);
  else $("#lobby").innerHTML = "";
  museum?.update(v, s.players, selected);
  const nextMobileMarkup = v ? mobileControls(v, selected) : "";
  if (nextMobileMarkup !== mobileMarkup) {
    const controlFocus = document.activeElement?.closest<HTMLElement>(
      "#mobile-controls [data-select]",
    )?.dataset.select;
    mobileMarkup = nextMobileMarkup;
    $("#mobile-controls").innerHTML = mobileMarkup;
    if (controlFocus) {
      Array.from(
        $("#mobile-controls").querySelectorAll<HTMLElement>("[data-select]"),
      )
        .find((el) => el.dataset.select === controlFocus)
        ?.focus({ preventScroll: true });
    }
  }
  if (
    !practice &&
    v &&
    (v.phase === "transition" || v.phase === "minigame") &&
    v.myTrial
  ) {
    if (
      !minigame ||
      minigame.state.seed !== v.myTrial.seed ||
      trialRound !== v.round
    ) {
      disposeTrial();
      trialRound = v.round;
      $("#trial-root").hidden = false;
      $("#trial-root").innerHTML =
        `<div class="trial-shell"><div class="trial-meta"><span>TOUR ${v.round} · ${v.myJam ? `CIBLE : ${esc(v.players.find((p) => p.id === v.myJamTarget)?.name)} · ` : ""}${v.watched === v.myId ? "SURVEILLANCE · " : ""}18 SECONDES</span><time class="trial-clock"></time></div><div id="trial"></div></div>`;
      const targetIndex = v.players.findIndex(
        (p) => p.id === v.myChoice?.target,
      );
      minigame = new Minigame(
        $("#trial"),
        v.myTrial,
        (t, complete) => {
          session.command({ type: "progress", trial: t });
          if (complete && session.state.view?.mySuccess === null) {
            session.command({ type: "result", success: true });
            sound("success");
          }
        },
        Math.max(0, targetIndex),
      );
    }
    minigame.paused =
      v.phase === "transition" ||
      v.pausedAt !== null ||
      s.status === "reconnecting";
    $("#trial-root").classList.toggle("entering", v.phase === "transition");
  } else if (!practice && minigame) disposeTrial();
  if (museum)
    museum.suspended =
      practice || (!!v && ["transition", "minigame"].includes(v.phase));
  if (v?.phase === "transition") {
    const focus = museum?.transitionFocus(v.myChoice);
    if (focus) {
      $("#playfield").style.setProperty("--iris-x", `${focus.x}%`);
      $("#playfield").style.setProperty("--iris-y", `${focus.y}%`);
    }
    document.body.classList.add("iris");
  } else document.body.classList.remove("iris");
  if (v?.phase === "role" && !modal) openModal("role");
  if (v?.phase === "ended" && changed) openModal("result");
  if (v && changed && ["reveal", "debate"].includes(v.phase))
    openModal("report");
  else if (v && modal === "report") refreshReport();
  const pause = (v?.pausedAt !== null && !!v) || s.status === "reconnecting";
  $("#pause-root").hidden = !pause;
  if (pause) {
    $("#pause-root").innerHTML =
      `<section role="alert"><span class="eyebrow">LE CASSE EST EN PAUSE</span><h2>On attend notre complice.</h2><p>Le chrono et l’épreuve sont gelés.<br>Reconnexion : <strong id="pause-count">${Math.ceil((v?.pauseRemaining ?? 90000) / 1000)} s</strong></p><small>Après 90 secondes d’absence, la partie se termine sans classement.</small></section>`;
    if (minigame) minigame.held = false;
  }
  $("#app").inert = !!modal || practice || pause;
  updateTimer();
}
function lobby(s: Snapshot) {
  const nameInput = document.querySelector<HTMLInputElement>("#nickname"),
    nameFocus = document.activeElement === nameInput,
    position = nameInput?.selectionStart;
  $("#lobby").innerHTML =
    `<section class="lobby-panel"><span class="eyebrow">LE PLAN ÉTAIT POURTANT SIMPLE.</span><h1>Un coffre.<br>Quatre alibis.<br><em>Zéro confiance.</em></h1><p class="lobby-description">Coopérez pour fuir.<br>Enrichissez-vous pour régner.<br>Et gardez un œil sur le FBI.</p><div class="lobby-actions">${s.room ? `<div class="room-heading"><span>SALON ${esc(s.room.toUpperCase())}</span><button data-action="invite" class="icon-button" aria-label="Copier le lien d’invitation">${icon("copy")}</button></div><div class="lobby-roster">${s.players.map((p) => `<span style="--player:${p.color}"><i></i>${esc(p.name)}<b>${p.ready ? "Prêt" : p.online ? "Attend" : "Absent"}</b></span>`).join("")}<small>${s.players.length}/4 complices · ${s.players.filter((p) => p.ready).length}/4 prêts</small></div><button data-action="ready" class="primary" ${s.status !== "online" ? "disabled" : ""}>${s.players.find((p) => p.id === s.myId)?.ready ? "Je ne suis plus prêt" : "Je suis prêt"}</button>${s.host ? `<button data-action="start" ${s.players.length < 4 || !s.players.every((p) => p.ready && p.online) ? "disabled" : ""}>Lancer le casse</button>` : ""}` : `<label class="name-label" for="nickname">Votre prénom<input id="nickname" autocomplete="nickname" maxlength="18" value="${esc(session.name)}"></label><button data-action="solo" class="primary">Jouer avec les bots ${icon("arrow")}</button><button data-action="network">${invite.get("room") ? "Rejoindre les complices" : "Inviter mes complices"} ${icon("users")}</button><button data-action="practice" class="text-button">Essayer les épreuves</button>`}${s.room ? `<button data-action="leave" class="text-button">Quitter le salon</button>` : ""}<p class="network-error" role="status">${esc(s.error || (s.status === "connecting" ? "Connexion au salon…" : ""))}</p></div></section><div class="museum-caption"><span class="caption-line"></span><small>COLLECTION PERMANENTE</small><strong>La cupidité est un art.</strong></div>`;
  if (nameFocus) {
    const input = document.querySelector<HTMLInputElement>("#nickname")!;
    input.focus();
    if (position !== null && position !== undefined)
      input.setSelectionRange(position, position);
  }
}
function select(id: string) {
  const v = snapshot.view;
  if (!v || v.pausedAt !== null) return;
  if (v.phase === "debate" && id.startsWith("player:")) {
    if (v.charges) {
      session.command({ type: "vote", target: id.slice(7) });
      sound("click");
    }
    return;
  }
  if (!["promise", "secret"].includes(v.phase)) return;
  const c: Choice = id.startsWith("player:")
    ? { action: "pocket", target: id.slice(7) }
    : { action: id as Action };
  if (v.phase === "promise" && c.action === "pocket") {
    notify(
      "Faire les poches se choisit uniquement en secret. Annoncez un poste de couverture.",
    );
    return;
  }
  if (!legal(v, v.myId, c)) {
    notify(
      v.watched === v.myId
        ? "Surveillé ce tour : choisissez le coffre ou les caméras."
        : id === "drill"
          ? "Le coffre est ouvert : la fuite est lancée si l’alarme reste sous 5."
          : "Choisissez un autre joueur.",
    );
    return;
  }
  selected = c;
  session.command({
    type: v.phase === "promise" ? "promise" : "choose",
    choice: c,
  });
  sound("click");
}
function openModal(kind: string) {
  if (!modal) previousFocus = document.activeElement as HTMLElement;
  modal = kind;
  const v = snapshot.view;
  let content = "";
  if (kind === "rules") content = rules;
  if (kind === "report" && v) content = report(v);
  if (kind === "role" && v)
    content = `<div class="role-card ${v.myRole}">${icon(v.myRole === "agent" ? "shield" : "mask")}<span class="eyebrow">À GARDER POUR VOUS</span><h2>${v.myRole === "agent" ? "Vous êtes le FBI." : "Vous êtes braqueur."}</h2><p>${v.myRole === "agent" ? "Faites atteindre 5 alarmes, ou gardez le coffre fermé pendant cinq manches. En choix secret, sélectionnez une cible avec le brouilleur : votre défi devient un talkie-walkie. Réglez trois fréquences pour faire échouer sa tâche. Votre poste de couverture réussit aussi. Profil bas vous laisse jouer le défi normal." : "Ouvrez le coffre en cinq manches maximum, avec l’alarme sous 5 : la fuite démarre dès l’ouverture. Tous les braqueurs gagnent la fuite. Le plus riche devient Roi des Voleurs."}</p><small>Votre apparence ne révèle rien. Vous pouvez revoir cette carte avec le masque en haut de l’écran.</small><button data-action="close" class="primary">Je garde mon rôle secret</button></div>`;
  if (kind === "practice")
    content = `<span class="eyebrow">SANS ARGENT · SANS ALARME</span><h2>Préparez vos petits talents.</h2><p>Essayez les gestes avant le casse. Chaque épreuve dure 18 secondes.</p><div class="practice-actions">${(["secure", "drill", "loot", "painting", "pocket", "radio"] as const).map((a) => `<button data-practice="${a}">${icon(a === "secure" ? "laser" : a === "drill" ? "wrench" : a === "loot" ? "statue" : "bag")}${LABELS[a]}</button>`).join("")}</div>`;
  if (kind === "jam" && v)
    content = `<span class="eyebrow">FBI · CHOIX STRICTEMENT PRIVÉ</span><h2>Qui vas-tu brouiller ?</h2><p>Ton épreuve sera le talkie-walkie. Trouve et stabilise trois fréquences : la cible échouera à son défi, même si elle l’avait terminé. Son échec ajoutera une alarme. Les autres verront seulement un défi raté.</p><div class="jam-targets">${v.players.map((p, i) => (p.id === v.myId ? "" : `<button data-jam-target="${esc(p.id)}" aria-pressed="${v.myJamTarget === p.id}" class="${v.myJamTarget === p.id ? "selected" : ""}"><img src="${import.meta.env.BASE_URL}portraits/${i}.png" alt=""><strong>${esc(p.name)}</strong><small>${p.money} pièces</small></button>`)).join("")}</div><button data-action="jam-off" class="subtle">Profil bas · Faire mon défi normal</button>`;
  if (kind === "result" && v?.result) {
    const agentIndex = v.players.findIndex((p) => p.exposed === "agent"),
      agent = v.players[agentIndex];
    content = `<span class="eyebrow">${v.result.kind === "escape" ? "COFFRE OUVERT · FUITE RÉUSSIE" : v.result.kind === "aborted" ? "PARTIE INTERROMPUE" : "FIN DU PLAN"}</span><h2>${esc(v.result.text)}</h2>${
      v.result.kind !== "aborted"
        ? `<div class="agent-reveal"><img src="${import.meta.env.BASE_URL}portraits/${agentIndex}.png" alt="${esc(agent?.name)}"><div><span class="eyebrow">L’AGENT INFILTRÉ</span><strong>${esc(agent?.name)}</strong><small>FBI · Portefeuille exclu du classement</small></div></div><div class="ranking">${v.players
            .filter((p) => p.exposed === "burglar")
            .sort((a, b) => b.money - a.money)
            .map(
              (p) =>
                `<div><span>${esc(p.name)}${v.result!.kings.includes(p.id) ? "<em>Roi des Voleurs</em>" : ""}</span><strong>${p.money} pièces</strong></div>`,
            )
            .join(
              "",
            )}</div><p>${v.result.kind === "escape" ? "Les trois braqueurs gagnent. Bonus personnel de 8 pièces inclus." : "Les braqueurs perdent tout leur argent de la partie."}</p>`
        : "<p>Aucune victoire et aucun classement ne sont attribués pour une panne.</p>"
    }${snapshot.host ? '<button class="primary" data-action="lobby">Retour au salon · Rejouer</button>' : v.result.kind === "aborted" ? `<button class="primary" data-action="leave">Retour à l’accueil</button>` : "<p>L’hôte peut ramener les quatre joueurs au salon.</p>"}`;
  }
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal ${kind}" role="dialog" aria-modal="true" aria-label="${kind === "role" ? "Carte de rôle privée" : kind === "result" ? "Résultats du casse" : "Plan Foireux"}"><button class="icon-button modal-close" data-action="close" aria-label="Fermer">${icon("close")}</button><div class="modal-content">${content}</div></section></div>`;
  $("#app").inert = true;
  $("#modal-root")
    .querySelector<HTMLElement>("button,input")
    ?.focus({ preventScroll: true });
}
function refreshReport() {
  const el = document.querySelector(".modal.report .modal-content");
  if (!el || !snapshot.view) return;
  const content = report(snapshot.view);
  if (el.innerHTML === content) return;
  const active = document.activeElement as HTMLElement;
  const vote = active?.dataset.vote,
    action = active?.dataset.action;
  el.innerHTML = content;
  if (vote)
    el.querySelector<HTMLElement>(`[data-vote="${CSS.escape(vote)}"]`)?.focus({
      preventScroll: true,
    });
  else if (action)
    el.querySelector<HTMLElement>(
      `[data-action="${CSS.escape(action)}"]`,
    )?.focus({ preventScroll: true });
}
function closeModal() {
  modal = "";
  $("#modal-root").innerHTML = "";
  $("#app").inert = practice;
  previousFocus?.focus({ preventScroll: true });
}
function disposeTrial() {
  if (museum) museum.suspended = false;
  clearInterval(practiceTimer);
  practiceTimer = undefined;
  minigame?.dispose();
  minigame = null;
  trialRound = 0;
  $("#trial-root").hidden = true;
  $("#trial-root").innerHTML = "";
}
function startPractice(action: Parameters<typeof newTrial>[0]) {
  closeModal();
  practice = true;
  disposeTrial();
  $("#trial-root").hidden = false;
  $("#trial-root").innerHTML =
    '<div class="trial-shell"><div class="trial-meta"><span>ENTRAÎNEMENT</span><time class="trial-clock">00:18</time><button data-action="end-practice" class="subtle">Retour</button></div><div id="trial"></div></div>';
  let started: number | null = null;
  minigame = new Minigame(
    $("#trial"),
    newTrial(action, crypto.getRandomValues(new Uint32Array(1))[0]),
    () => {},
    1,
    true,
  );
  const timer = setInterval(() => {
    if (!practice) {
      clearInterval(timer);
      return;
    }
    const el = document.querySelector(".trial-clock");
    if (!minigame?.ready) {
      if (el) el.textContent = "00:18";
      return;
    }
    started ??= performance.now();
    const left = Math.max(0, 18 - (performance.now() - started) / 1000);
    if (el) el.textContent = `00:${String(Math.ceil(left)).padStart(2, "0")}`;
    if (!left && minigame) {
      minigame.paused = true;
      if (!minigame.state.done)
        minigame.feedback("Temps écoulé. Retour pour réessayer.");
    }
  }, 100);
  practiceTimer = timer;
  if (museum) museum.suspended = true;
  $("#app").inert = true;
}
document.addEventListener("input", (e) => {
  const target = e.target as HTMLInputElement;
  if (target.id === "nickname") {
    session.name = target.value.trim().slice(0, 18) || "Complice";
    localStorage.setItem("pf-name", session.name);
  }
});
function endPractice() {
  if (!practice) return;
  practice = false;
  disposeTrial();
  openModal("practice");
}
// A completed touch drawing may suppress the following compatibility click.
document.addEventListener("pointerup", (e) => {
  if (
    e.pointerType === "touch" &&
    (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset
      .action === "end-practice"
  )
    endPractice();
});
document.addEventListener("click", async (e) => {
  const button = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-action],[data-practice],[data-vote],[data-jam-target],[data-select]",
  );
  if (!button || (button as HTMLButtonElement).disabled) return;
  if (button.dataset.select) {
    select(button.dataset.select);
    return;
  }
  if (button.dataset.practice) {
    startPractice(button.dataset.practice as Parameters<typeof newTrial>[0]);
    return;
  }
  if (button.dataset.vote) {
    session.command({ type: "vote", target: button.dataset.vote });
    sound("click");
    return;
  }
  if (button.dataset.jamTarget) {
    session.command({
      type: "jam",
      enabled: true,
      target: button.dataset.jamTarget,
    });
    closeModal();
    return;
  }
  const action = button.dataset.action;
  if (action === "solo") session.solo();
  else if (action === "network") {
    if (invite.get("room")) session.join(invite.get("room")!);
    else session.createRoom();
  } else if (
    action === "rules" ||
    action === "role" ||
    action === "report" ||
    action === "practice"
  )
    openModal(action);
  else if (action === "close") closeModal();
  else if (action === "leave") {
    closeModal();
    session.leave();
  } else if (action === "jam") openModal("jam");
  else if (action === "jam-off") {
    session.command({ type: "jam", enabled: false });
    closeModal();
  } else if (action === "pass")
    session.command({ type: "vote", target: "pass" });
  else if (action === "ready")
    session.ready(!snapshot.players.find((p) => p.id === snapshot.myId)?.ready);
  else if (action === "start") session.start();
  else if (action === "lobby") {
    closeModal();
    session.lobby();
  } else if (action === "end-practice") {
    endPractice();
  } else if (action === "sound") {
    muted = !muted;
    soundBank.muted = muted;
    if (muted) soundBank.silence();
    else soundBank.unlock();
    localStorage.setItem("pf-muted", muted ? "1" : "0");
    sound("click");
    render(snapshot);
  } else if (action === "fullscreen") {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        try {
          await (
            screen.orientation as ScreenOrientation & {
              lock?: (s: string) => Promise<void>;
            }
          ).lock?.("landscape");
        } catch {}
      } else await document.exitFullscreen();
    } catch {
      notify("Le plein écran n’est pas disponible dans ce navigateur.");
    }
  } else if (action === "invite") {
    const url = `${location.origin}${location.pathname}?v=3.0.0#room=${session.room}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Invitation copiée.");
    } catch {
      openModal("rules");
      $(".modal").innerHTML =
        `<h2>Invitation</h2><p>Sélectionnez et copiez le lien.</p><input aria-label="Lien d’invitation" readonly value="${esc(url)}"><button data-action="close">Fermer</button>`;
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal) closeModal();
  if (e.key === "Tab" && modal) {
    const elements = [
        ...$("#modal-root").querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,a[href]",
        ),
      ],
      first = elements[0],
      last = elements.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
function updateTimer() {
  const v = snapshot?.view;
  if (!v) return;
  const seconds = Math.max(
      0,
      Math.ceil((v.deadline - (v.pausedAt ?? session.now())) / 1000),
    ),
    text = `00:${String(seconds).padStart(2, "0")}`;
  const el = document.getElementById("countdown");
  if (el) el.textContent = text;
  document
    .querySelectorAll(".report-clock")
    .forEach((el) => (el.textContent = text));
  if (!practice) {
    const trial = document.querySelector(".trial-clock");
    if (trial) trial.textContent = text;
  }
}
setInterval(updateTimer, 100);
render(session.state);
session.resume();
if (
  !session.authority &&
  !!invite.get("room") &&
  invite.get("room") === sessionStorage.getItem("pf-v3-joined")
)
  session.join(invite.get("room")!);
