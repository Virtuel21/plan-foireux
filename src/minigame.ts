import {
  connect,
  cutAt,
  cutPath,
  cutAccuracy,
  radioSignal,
  gaze,
  lever,
  pin,
  pinBand,
  stepTrial,
  targetBand,
  terminalId,
  type Trial,
} from "./trial";
import { icon } from "./icons";
import { LABELS } from "./scene";
import { soundBank } from "./audio";
import { COLORS } from "./engine";
export const INSTRUCTIONS = {
  secure:
    "Rebranche les bons câbles dans le boîtier pour désactiver les caméras. Deux panneaux à terminer.",
  drill:
    "Maintiens pour accélérer, relâche pour refroidir. Stabilise trois points dans la zone verte étroite.",
  loot: "Arrête le curseur dans les trois encoches.",
  radio:
    "Tourne les boutons. Stabilise le signal VERT trois fois pour brouiller ta cible.",
  painting:
    "Découpe tout le contour depuis le repère. Précision minimale : 70 %.",
  pocket:
    "Avance quand la cible regarde ailleurs. Relâche quand elle se retourne.",
};
const SYMBOLS = ["1 △", "2 ○", "3 ╳"],
  WIRE_COLORS = ["#edb844", "#47d8ca", "#ed9472"];
export class Minigame {
  state: Trial;
  held = false;
  selected = -1;
  last = performance.now();
  lastSent = 0;
  sent = false;
  raf = 0;
  paused = false;
  disposed = false;
  suppressClick = false;
  previousCooldown = 0;
  previousStage = 0;
  drawing = false;
  knobY = 0;
  knobValue = 0;
  lastDots = "";
  constructor(
    public root: HTMLElement,
    trial: Trial,
    public send: (t: Trial, complete: boolean) => void,
    public targetPortrait = 0,
    public practice = false,
  ) {
    this.state = structuredClone(trial);
    const t = this.state,
      hints = {
        secure:
          "1. Choisis un embout · 2. Touche sa borne. Le glisser fonctionne aussi.",
        drill:
          "1. Maintiens le bouton · 2. Relâche avant le rouge. Espace fonctionne aussi.",
        loot: "1. Observe le passage · 2. Touche quand le curseur est dans l’encoche. Ou Espace.",
        radio:
          "Glisse un bouton vers le haut/bas, ou utilise les flèches sur le bouton. Rouge : loin · orange : proche · vert : reste stable.",
        painting:
          "Glisse le doigt sur le contour en partant du point blanc. Tu peux relever le doigt. Au clavier : flèches sur la toile.",
        pocket:
          "1. Maintiens pendant « Ailleurs » · 2. Relâche dès « Se retourne ». Ou Espace.",
      };
    const reward =
      t.action === "radio"
        ? "La cible échoue si tu réussis"
        : t.action === "pocket"
          ? "Presque tout le gain du tour"
          : "12 pièces à partager";
    root.innerHTML = `<div class="trial-head"><div><span class="eyebrow">${practice ? "ENTRAÎNEMENT · SANS ENJEU" : "ÉPREUVE PRIVÉE"}</span><h2>${LABELS[t.action]} <small class="trial-reward">${reward}</small></h2></div><div class="trial-dots" aria-label="Progression"></div></div><p class="trial-instruction">${INSTRUCTIONS[t.action]}${t.action === "pocket" && t.difficulty === 2 ? " Cible très vigilante : ouvertures courtes, une prise perdue si tu es repéré." : ""}</p><div class="trial-stage ${t.action}">${t.action === "secure" ? this.wires() : t.action === "radio" ? this.radio() : t.action === "painting" ? this.painting() : this.mechanism()}</div><div class="trial-bottom"><span class="trial-status" role="status">À toi de jouer</span>${t.action === "secure" ? '<button class="primary lever">Valider les circuits</button>' : t.action === "painting" ? '<button class="subtle restart-cut">Recommencer la découpe</button>' : t.action === "radio" ? '<span class="radio-private">Transmission privée · 3 fréquences</span>' : `<button class="primary operate">${t.action === "loot" ? "Arrêter le curseur" : t.action === "drill" ? "Maintenir pour forer" : "Maintenir pour avancer"}</button>`}</div><p class="gesture-example"><span class="demo-dot"></span>${hints[t.action]}</p>`;
    this.bindSpecial();
    root.querySelector(".lever")?.addEventListener("click", () => {
      if (this.paused || t.done) return;
      lever(t);
      soundBank.play(t.done ? "current" : "lever");
      this.feedback(
        t.done
          ? "Circuits rebranchés : caméras désactivées."
          : t.panel
            ? "Panneau 2 : les bornes ont changé."
            : "Corrige les prises libérées.",
      );
      this.publish();
      this.draw();
    });
    const operate = root.querySelector<HTMLButtonElement>(".operate");
    operate?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (this.paused || t.done) return;
      operate.setPointerCapture(e.pointerId);
      if (t.action === "loot") {
        pin(t);
        soundBank.play("lock");
        this.publish();
      } else this.held = true;
    });
    operate?.addEventListener("click", (e) => {
      if (this.paused || t.done) return;
      if (e.detail === 0 && t.action === "loot") {
        pin(t);
        soundBank.play("lock");
        this.publish();
      }
    });
    operate?.addEventListener("pointerup", () => (this.held = false));
    operate?.addEventListener("pointercancel", () => (this.held = false));
    operate?.addEventListener("lostpointercapture", () => (this.held = false));
    root
      .querySelectorAll<HTMLButtonElement>("[data-cable]")
      .forEach((button) => {
        button.addEventListener("pointerdown", (e) => {
          if (this.paused) return;
          this.selected = Number(button.dataset.cable);
          button.setPointerCapture(e.pointerId);
          this.draw();
        });
        button.addEventListener("pointerup", (e) => {
          const target = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>("[data-terminal]");
          if (target && this.selected >= 0 && !this.paused) {
            connect(t, this.selected, Number(target.dataset.terminal));
            soundBank.play("plug");
            this.selected = -1;
            this.suppressClick = true;
            this.publish();
            this.draw();
          }
        });
        button.addEventListener("click", () => {
          if (this.suppressClick) {
            this.suppressClick = false;
            return;
          }
          if (!this.paused) {
            this.selected = Number(button.dataset.cable);
            if (t.connections[this.selected] >= 0 && !t.correct[this.selected])
              connect(t, this.selected, -1);
            this.draw();
          }
        });
      });
    root
      .querySelectorAll<HTMLButtonElement>("[data-terminal]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          if (this.selected >= 0 && !this.paused) {
            connect(t, this.selected, Number(button.dataset.terminal));
            soundBank.play("plug");
            this.selected = -1;
            this.publish();
            this.draw();
          }
        }),
      );
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.release);
    document.addEventListener("visibilitychange", this.release);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  }
  radio() {
    return `<div class="walkie"><div class="walkie-antenna"></div><div class="walkie-knobs">${["Canal", "Réglage fin"].map((label, i) => `<div><button class="radio-knob" data-knob="${i}" role="slider" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="12"><span></span></button><small>${label}</small></div>`).join("")}</div><div class="walkie-body"><div class="walkie-brand">FIELDLINK <small>FBI · RX / TX</small></div><div class="radio-screen"><span class="radio-channel">FRÉQUENCE 1 / 3</span><strong class="frequency">117.2 <small>MHz</small></strong><div class="signal-bars">${Array.from({ length: 8 }, (_, i) => `<i style="height:${5 + i * 2}px"></i>`).join("")}</div><span class="signal-label">SIGNAL FAIBLE</span><div class="radio-lock-progress"><i></i></div></div><div class="walkie-speaker">${Array.from({ length: 5 }, () => "<i></i>").join("")}</div></div></div>`;
  }
  painting() {
    const points = cutPath(this.state)
      .map(([x, y]) => `${x * 500},${y * 300}`)
      .join(" ");
    return `<svg class="cut-board" viewBox="0 0 500 300" preserveAspectRatio="none" tabindex="0" role="application" aria-label="Toile à découper. Glissez sur le contour depuis le point blanc, ou utilisez les flèches."><defs><linearGradient id="canvas-paint"><stop stop-color="#164b50"/><stop offset="1" stop-color="#102d36"/></linearGradient><pattern id="canvas-weave" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0h5v5" fill="none" stroke="#e8d2a3" opacity=".09"/></pattern></defs><rect x="8" y="8" width="484" height="284" rx="12" fill="#98662e" stroke="#efd191" stroke-width="8"/><rect x="25" y="25" width="450" height="250" rx="3" fill="url(#canvas-paint)"/><circle cx="220" cy="120" r="62" fill="#d3a450"/><path d="M110 248 275 83 390 250Z" fill="#377d78"/><path d="m180 250 119-136 88 136" fill="#a94932"/><rect x="25" y="25" width="450" height="250" fill="url(#canvas-weave)"/><polyline class="cut-guide" points="${points}"/><polyline class="cut-outline" points="${points}"/><polyline class="cut-complete"/><circle class="cut-next" r="8"/><g class="knife-cursor"><path d="m0 0 5-23 7 4-8 22Z" fill="#edf0d9" stroke="#17353d" stroke-width="2"/><path d="m5-23 6-20 10 4-9 20" fill="#ce943d" stroke="#30291b" stroke-width="2"/></g></svg><div class="cut-quality">Contour <b class="cut-percent">0 %</b><span>Précision <b class="cut-accuracy">100 %</b> · 70 % requis</span></div>`;
  }
  bindSpecial() {
    const t = this.state;
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-knob]")
      .forEach((knob) => {
        const factor = knob.dataset.knob === "0" ? 0.005 : 0.001;
        knob.addEventListener("pointerdown", (e) => {
          if (this.paused || t.done) return;
          e.preventDefault();
          knob.setPointerCapture(e.pointerId);
          this.knobY = e.clientY;
          this.knobValue = t.needle;
        });
        knob.addEventListener("pointermove", (e) => {
          if (!knob.hasPointerCapture(e.pointerId) || this.paused || t.done)
            return;
          t.needle = Math.max(
            0,
            Math.min(1, this.knobValue + (this.knobY - e.clientY) * factor),
          );
          this.draw();
        });
        knob.addEventListener("keydown", (e) => {
          if (
            !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
              e.key,
            ) ||
            this.paused ||
            t.done
          )
            return;
          e.preventDefault();
          t.needle = Math.max(
            0,
            Math.min(
              1,
              t.needle +
                (["ArrowUp", "ArrowRight"].includes(e.key) ? 1 : -1) *
                  (knob.dataset.knob === "0" ? 0.04 : 0.008),
            ),
          );
          this.draw();
        });
      });
    const board = this.root.querySelector<SVGSVGElement>(".cut-board");
    const move = (e: PointerEvent) => {
      if (!this.drawing || this.paused || t.done || !board) return;
      const r = board.getBoundingClientRect();
      cutAt(t, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      this.draw();
    };
    board?.addEventListener("pointerdown", (e) => {
      if (this.paused || t.done) return;
      board.focus();
      board.setPointerCapture(e.pointerId);
      this.drawing = true;
      move(e);
    });
    board?.addEventListener("pointermove", move);
    board?.addEventListener("pointerup", () => {
      this.drawing = false;
      this.publish();
    });
    board?.addEventListener("pointercancel", () => (this.drawing = false));
    board?.addEventListener("keydown", (e) => {
      if (!e.key.startsWith("Arrow") || this.paused || t.done) return;
      e.preventDefault();
      if (t.cutIndex === 0) {
        const start = cutPath(t)[0];
        t.cutX = start[0];
        t.cutY = start[1];
      }
      cutAt(
        t,
        t.cutX +
          (e.key === "ArrowRight" ? 0.012 : e.key === "ArrowLeft" ? -0.012 : 0),
        t.cutY +
          (e.key === "ArrowDown" ? 0.012 : e.key === "ArrowUp" ? -0.012 : 0),
      );
      this.draw();
    });
    const restartCut = () => {
      if (this.paused || t.done) return;
      t.cutIndex = 0;
      t.cutErrors = 0;
      t.cutSamples = 0;
      t.stage = 0;
      const first = cutPath(t)[0];
      t.cutX = first[0];
      t.cutY = first[1];
      this.publish();
      this.draw();
    };
    const restart = this.root.querySelector(".restart-cut");
    restart?.addEventListener("click", restartCut);
    restart?.addEventListener("pointerup", (e) => {
      if ((e as PointerEvent).pointerType === "touch") restartCut();
    });
  }
  wires() {
    const t = this.state;
    return `<div class="wire-board"><img class="junction-box-art" src="${import.meta.env.BASE_URL}images/electrical-board.png" alt="" aria-hidden="true"><svg viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden="true">${[0, 1, 2].map((i) => `<path class="cable-shadow" data-shadow="${i}"/><path class="cable-line" data-wire="${i}" stroke="${WIRE_COLORS[i]}"/>`).join("")}</svg>${[0, 1, 2].map((i) => `<span class="circuit-label" style="top:${20 + i * 30}%;--wire:${WIRE_COLORS[i]}">${SYMBOLS[i]}</span><button class="plug" data-cable="${i}" aria-label="Sélectionner l’embout du circuit ${SYMBOLS[i]}" style="--wire:${WIRE_COLORS[i]}">${icon("plus")}</button><button class="terminal" data-terminal="${i}" aria-label="Borne ${SYMBOLS[terminalId(t, i)]}" style="top:${20 + i * 30}%">${SYMBOLS[terminalId(t, i)]}</button>`).join("")}<span class="board-label">CIRCUITS</span><span class="board-label right">BORNES CAMÉRAS</span></div>`;
  }
  mechanism() {
    const t = this.state;
    const art =
      t.action === "drill"
        ? `<svg class="machine-art" viewBox="0 0 500 160" aria-hidden="true"><defs><linearGradient id="steel"><stop stop-color="#d1d6d5"/><stop offset=".45" stop-color="#727f83"/><stop offset="1" stop-color="#293940"/></linearGradient><linearGradient id="brass"><stop stop-color="#ffe0a1"/><stop offset="1" stop-color="#9f641e"/></linearGradient></defs><rect x="340" y="12" width="130" height="136" rx="16" fill="url(#steel)" stroke="#d9b86d" stroke-width="5"/><circle cx="400" cy="80" r="43" fill="#1a3036" stroke="url(#brass)" stroke-width="9"/><g class="drill-bit"><path d="M245 73h143v14H245" fill="url(#steel)" stroke="#111e24" stroke-width="3"/>${Array.from({ length: 9 }, (_, i) => `<path d="m${273 + i * 12} 72-9 17" stroke="#1d2a2e" stroke-width="3"/>`).join("")}</g><path d="M90 43h145l29 25v39H90Z" fill="#d99d35" stroke="#f5d38c" stroke-width="4"/><path d="m120 108 10 42h43l12-42" fill="#16373d" stroke="#627b7e" stroke-width="4"/><rect x="72" y="54" width="42" height="48" rx="10" fill="#1d3037"/>${[0, 1, 2, 3].map((i) => `<path d="M${145 + i * 16} 57v28" stroke="#473b22" stroke-width="5"/>`).join("")}<circle cx="104" cy="76" r="8" fill="#fce5b1"/></svg>`
        : t.action === "loot"
          ? `<svg class="machine-art" viewBox="0 0 500 160" aria-hidden="true"><rect x="38" y="15" width="424" height="130" rx="22" fill="#68492c" stroke="#d7b16a" stroke-width="5"/><rect x="57" y="35" width="386" height="90" rx="12" fill="#152c32" stroke="#b58947" stroke-width="3"/>${[0, 1, 2].map((i) => `<g class="pin-art" data-pin="${i}"><path d="M${160 + i * 88} 35v58" stroke="#e1ba72" stroke-width="24"/><circle cx="${160 + i * 88}" cy="97" r="13" fill="#f6d58e" stroke="#836133" stroke-width="3"/><path d="M${150 + i * 88} 48h20m-20 8h20m-20 8h20" stroke="#997642" stroke-width="3"/></g>`).join("")}<path d="M90 118h300" stroke="#d9e0d8" stroke-width="8"/><circle cx="93" cy="118" r="8" fill="#b67f39"/></svg>`
          : `<div class="pocket-art"><div class="target-face"><img src="${import.meta.env.BASE_URL}portraits/${this.targetPortrait}.png" alt="Portrait de la cible"><span class="gaze-label">Regarde ailleurs</span></div><svg viewBox="0 0 420 160" aria-hidden="true"><defs><linearGradient id="cash-gold"><stop stop-color="#ffe4a2"/><stop offset=".5" stop-color="#d9a039"/><stop offset="1" stop-color="#956125"/></linearGradient></defs><rect x="126" y="133" width="236" height="15" rx="5" fill="${COLORS[this.targetPortrait % 4]}"/>${[0, 1, 2].map((i) => `<g transform="translate(${i * 7},${-i * 12})"><rect x="160" y="78" width="145" height="40" rx="5" fill="#42765b" stroke="#bbd09b" stroke-width="3"/><path d="M172 88h119v20H172Z" fill="none" stroke="#81a573" stroke-width="2"/><ellipse cx="232" cy="98" rx="22" ry="8" fill="#abc88e"/><path d="M220 79h19v39h-19Z" fill="#e8cb85"/></g>`).join("")}<path d="m247 133 13-30h65l17 30Z" fill="url(#cash-gold)" stroke="#f0ce73" stroke-width="2"/><path d="M275 112h29m-27 5h23" stroke="#9a662c" stroke-width="3"/><g class="thief-hand"><path d="M15 85h62l36-15q19-5 19 7l-16 12 25-6q12 0 12 12l-34 19H15Z" fill="#253640" stroke="#829296" stroke-width="3"/><rect x="9" y="83" width="31" height="34" rx="5" fill="#d2a64a"/></g></svg></div>`;
    return `${art}<div class="meter"><div class="target-band"></div><div class="meter-needle"></div><span class="meter-start">0</span><span class="meter-end">${t.action === "drill" ? "SURCHAUFFE" : t.action === "loot" ? "ENCOCHE" : "LIASSE"}</span></div><div class="point-progress"><span></span></div>`;
  }
  feedback(text: string) {
    const el = this.root.querySelector(".trial-status");
    if (el) el.textContent = text;
  }
  publish() {
    this.send(structuredClone(this.state), this.state.done);
  }
  release = () => {
    this.held = false;
  };
  keyDown = (e: KeyboardEvent) => {
    if (
      e.code !== "Space" ||
      this.paused ||
      ["secure", "radio", "painting"].includes(this.state.action) ||
      (e.target as HTMLElement)?.tagName === "INPUT"
    )
      return;
    e.preventDefault();
    if (e.repeat) return;
    if (this.state.action === "loot") {
      pin(this.state);
      soundBank.play("lock");
      this.publish();
    } else this.held = true;
  };
  keyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") this.held = false;
  };
  draw() {
    const t = this.state;
    const dots = String(t.stage);
    if (this.lastDots !== dots) {
      this.lastDots = dots;
      this.root.querySelector(".trial-dots")!.innerHTML = [0, 1, 2]
        .map(
          (i) =>
            `<span class="${i < t.stage ? "on" : ""}">${i < t.stage ? "✓" : i + 1}</span>`,
        )
        .join("");
    }
    if (t.action === "secure") {
      [0, 1, 2].forEach((i) => {
        const terminal = this.root.querySelector<HTMLButtonElement>(
          `[data-terminal="${i}"]`,
        )!;
        terminal.textContent = SYMBOLS[terminalId(t, i)];
        terminal.setAttribute(
          "aria-label",
          `Borne ${SYMBOLS[terminalId(t, i)]}`,
        );
        const freeY = 60 + ((i + 1 + (t.seed % 2)) % 3) * 90,
          endY = t.connections[i] >= 0 ? 60 + t.connections[i] * 90 : freeY,
          endX = t.connections[i] >= 0 ? 528 : 300;
        const d = `M48 ${60 + i * 90} C 175 ${60 + i * 90 + 110}, 150 ${freeY - 110}, 300 ${freeY}${t.connections[i] >= 0 ? ` Q 390 ${endY + 50}, ${endX} ${endY}` : ""}`;
        this.root.querySelector(`[data-wire="${i}"]`)!.setAttribute("d", d);
        this.root.querySelector(`[data-shadow="${i}"]`)!.setAttribute("d", d);
        const path = this.root.querySelector<SVGElement>(`[data-wire="${i}"]`)!;
        path.style.strokeWidth = this.selected === i ? "11" : "7";
        path.style.opacity =
          this.selected < 0 || this.selected === i ? "1" : ".55";
        const plug = this.root.querySelector<HTMLButtonElement>(
          `[data-cable="${i}"]`,
        )!;
        plug.style.left =
          t.connections[i] >= 0 ? "calc(88% - 54px)" : `${endX / 6}%`;
        plug.style.top = `${endY / 3}%`;
        plug.classList.toggle("selected", this.selected === i);
        plug.classList.toggle("correct", t.correct[i]);
        plug.disabled = t.correct[i] || this.paused || t.done;
      });
    } else if (t.action === "radio") {
      const signal = radioSignal(t);
      this.root.querySelector(".radio-screen")!.className =
        `radio-screen ${signal}`;
      this.root.querySelector(".radio-channel")!.textContent =
        `FRÉQUENCE ${Math.min(3, t.stage + 1)} / 3`;
      this.root.querySelector(".frequency")!.innerHTML =
        `${(110 + t.needle * 60).toFixed(1)} <small>MHz</small>`;
      this.root.querySelector(".signal-label")!.textContent =
        signal === "green"
          ? "VERT · MAINTIENS LA FRÉQUENCE"
          : signal === "orange"
            ? "ORANGE · PRESQUE CALÉ"
            : "ROUGE · CHERCHE LE SIGNAL";
      (
        this.root.querySelector(".radio-lock-progress i") as HTMLElement
      ).style.width = `${(t.done ? 1 : t.progress) * 100}%`;
      this.root.querySelectorAll<HTMLElement>(".radio-knob").forEach((k) => {
        k.style.setProperty("--rotation", `${-135 + t.needle * 270}deg`);
        k.setAttribute("aria-valuenow", String(Math.round(t.needle * 100)));
        k.setAttribute(
          "aria-valuetext",
          `${(110 + t.needle * 60).toFixed(1)} MHz, signal ${signal}`,
        );
      });
    } else if (t.action === "painting") {
      const path = cutPath(t);
      this.root.querySelector(".cut-complete")!.setAttribute(
        "points",
        path
          .slice(0, t.cutIndex)
          .map(([x, y]) => `${x * 500},${y * 300}`)
          .join(" "),
      );
      const next = path[Math.min(80, t.cutIndex)];
      this.root
        .querySelector(".cut-next")!
        .setAttribute("cx", String(next[0] * 500));
      this.root
        .querySelector(".cut-next")!
        .setAttribute("cy", String(next[1] * 300));
      this.root
        .querySelector(".knife-cursor")!
        .setAttribute(
          "transform",
          `translate(${t.cutX * 500} ${t.cutY * 300})`,
        );
      this.root.querySelector(".cut-percent")!.textContent =
        `${Math.round((t.cutIndex / 81) * 100)} %`;
      this.root.querySelector(".cut-accuracy")!.textContent =
        `${cutAccuracy(t)} %`;
    } else {
      const band = this.root.querySelector<HTMLElement>(".target-band")!,
        needle = this.root.querySelector<HTMLElement>(".meter-needle")!;
      const start =
          t.action === "drill"
            ? targetBand(t)
            : t.action === "loot"
              ? pinBand(t) - 0.075
              : 0,
        width = t.action === "drill" ? 0.13 : t.action === "loot" ? 0.15 : 1;
      band.style.left = `${start * 100}%`;
      band.style.width = `${width * 100}%`;
      needle.style.left = `${(t.action === "drill" ? t.needle : t.action === "loot" ? t.cursor : (t.stage + t.progress) / 3) * 100}%`;
      (
        this.root.querySelector(".point-progress span") as HTMLElement
      ).style.width = `${t.progress * 100}%`;
      if (t.action === "pocket") {
        const look = gaze(t);
        this.root.querySelector(".target-face")!.className =
          `target-face ${look}`;
        this.root.querySelector(".gaze-label")!.textContent =
          look === "away"
            ? "Regarde ailleurs"
            : look === "warning"
              ? "Se retourne… Relâche !"
              : "Vous regarde · Stop !";
        (this.root.querySelector(".thief-hand") as SVGElement).style.transform =
          `translateX(${(t.stage + t.progress) * 26}px)`;
      }
      this.root
        .querySelectorAll<SVGElement>("[data-pin]")
        .forEach(
          (p) =>
            (p.style.transform = `translateY(${Number(p.dataset.pin) < t.stage ? -20 : 0}px)`),
        );
    }
    this.root.classList.toggle("trial-done", t.done);
    this.root.classList.toggle("overheat", t.cooldown > 0);
    if (t.done) {
      this.feedback(
        this.practice
          ? "Réussi ! Prêt pour le casse."
          : t.action === "radio"
            ? "Transmission envoyée. La cible échouera à la révélation."
            : "Réussi. Attends la révélation commune.",
      );
      this.root
        .querySelectorAll<HTMLButtonElement>("button")
        .forEach((b) => (b.disabled = true));
    } else if (t.cooldown > 0)
      this.feedback(
        t.action === "drill"
          ? "Refroidissement… Ce point repart à zéro."
          : t.action === "pocket"
            ? "Repéré ! Reprends au dernier point."
            : "Clac… Réessaie cette goupille.",
      );
    else if (t.action === "painting")
      this.feedback(
        t.cutIndex >= 81
          ? "Découpe trop imprécise : recommence avant le signal."
          : `${Math.round((t.cutIndex / 81) * 100)} % découpé · Précision ${cutAccuracy(t)} %`,
      );
    else if (t.action === "secure")
      this.feedback(
        `Panneau ${Math.min(2, t.panel + 1)} / 2 · Relie puis valide les trois circuits.`,
      );
    else
      this.feedback(
        `${t.stage} / 3 ${t.action === "loot" ? "goupilles" : "points"} validés`,
      );
  }
  frame = (now: number) => {
    if (this.disposed) return;
    const dt = (now - this.last) / 1000;
    this.last = now;
    if (!this.paused) {
      stepTrial(this.state, dt, this.held);
      if (this.state.cooldown > this.previousCooldown)
        soundBank.play(this.state.action === "drill" ? "overheat" : "deny");
      if (this.state.stage > this.previousStage)
        soundBank.play(this.state.done ? "confirm" : "coin");
      this.previousCooldown = this.state.cooldown;
      this.previousStage = this.state.stage;
      if (now - this.lastSent > 250 || (this.state.done && !this.sent)) {
        this.lastSent = now;
        this.publish();
        if (this.state.done) this.sent = true;
      }
    }
    soundBank.loop(
      "drill",
      !this.paused &&
        !this.state.done &&
        this.held &&
        this.state.action === "drill",
    );
    soundBank.loop(
      "cloth",
      !this.paused &&
        !this.state.done &&
        this.held &&
        this.state.action === "pocket",
    );
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };
  dispose() {
    this.disposed = true;
    soundBank.loop("drill", false);
    soundBank.loop("cloth", false);
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.release);
    document.removeEventListener("visibilitychange", this.release);
  }
}
