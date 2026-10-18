import {
  cutAt,
  cutPath,
  cutAccuracy,
  radioSignal,
  gaze,
  stepTrial,
  targetBand,
  type Trial,
} from "./trial";
import { LABELS } from "./scene";
import { soundBank } from "./audio";
import { COLORS, postReward } from "./engine";
import { ElectricalBoard, electricalMarkup } from "./electrical-board";
import { StatueBoard, statueMarkup } from "./statue";
import "./radio.css";
export const INSTRUCTIONS = {
  secure:
    "Relie les trois câbles aux prises de même symbole. Validation automatique, puis un deuxième panneau.",
  drill:
    "Maintiens pour accélérer, relâche pour refroidir. Stabilise trois points dans la zone verte étroite.",
  loot: "Soulève la statue, porte-la et dépose-la sans bruit. Garde ton appui dans la zone verte.",
  radio:
    "Tourne les boutons. Stabilise le signal VERT trois fois pour brouiller ta cible.",
  painting:
    "Découpe tout le contour depuis le repère. Précision minimale : 70 %.",
  pocket:
    "Avance quand la cible regarde ailleurs. Relâche quand elle se retourne.",
};
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
  lastDots = "";
  electrical?: ElectricalBoard;
  statue?: StatueBoard;
  get ready() {
    return !this.electrical || this.electrical.isReady;
  }
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
          "Relie les symboles identiques. Glisse un embout ou touche l’embout puis la prise. Tab + Entrée fonctionne aussi.",
        drill:
          "1. Maintiens le bouton · 2. Relâche avant le rouge. Espace fonctionne aussi.",
        loot: "Maintiens la statue et glisse de gauche à droite pour équilibrer son poids. Relâche si le socle grince. Au clavier : flèches + Espace sur la statue.",
        radio:
          "Clic ou tap à gauche du bouton : − ; à droite : +. Tu peux aussi glisser vers le haut/bas ou utiliser les flèches. Rouge : loin · orange : proche · vert : reste stable.",
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
          : `${postReward(t.action)} pièces à partager`;
    root.innerHTML = `<div class="trial-head"><div><span class="eyebrow">${practice ? "ENTRAÎNEMENT · SANS ENJEU" : "ÉPREUVE PRIVÉE"}</span><h2>${LABELS[t.action]} <small class="trial-reward">${reward}</small></h2></div><div class="trial-dots" aria-label="Progression"></div></div><p class="trial-instruction">${INSTRUCTIONS[t.action]}${t.action === "pocket" && t.difficulty === 2 ? " Tout le groupe est vigilant après ton dernier vol : ouvertures courtes, une prise perdue si tu es repéré." : ""}</p><div class="trial-stage ${t.action}">${t.action === "secure" ? this.wires() : t.action === "radio" ? this.radio() : t.action === "painting" ? this.painting() : t.action === "loot" ? statueMarkup() : this.mechanism()}</div><div class="trial-bottom"><span class="trial-status" role="status">À toi de jouer</span>${t.action === "secure" ? '<span class="electrical-switch-hint">Les trois branchements valident automatiquement le panneau.</span>' : t.action === "painting" ? '<button class="subtle restart-cut">Recommencer la découpe</button>' : t.action === "radio" ? '<span class="radio-private">Transmission privée · 3 fréquences</span>' : `<button class="primary operate">${t.action === "loot" ? "Maintenir pour soulever" : t.action === "drill" ? "Maintenir pour forer" : "Maintenir pour avancer"}</button>`}</div><p class="gesture-example"><span class="demo-dot"></span>${hints[t.action]}</p>`;
    this.bindSpecial();
    if (t.action === "secure") {
      this.electrical = new ElectricalBoard(
        root.querySelector<HTMLElement>(".electrical-board")!,
        t,
        (kind) => {
          soundBank.play(
            kind === "plug" ? "plug" : t.done ? "current" : "lever",
          );
          this.publish();
          this.draw();
        },
      );
    }
    if (t.action === "loot") {
      this.statue = new StatueBoard(
        root.querySelector<HTMLElement>(".statue-workbench")!,
        t,
        {
          paused: () => this.paused,
          held: () => this.held,
          hold: (held) => (this.held = held),
          change: () => {
            // Pointer moves only redraw; frame() publishes progress every 250 ms.
            this.draw();
          },
        },
      );
    }
    const operate = root.querySelector<HTMLButtonElement>(".operate");
    operate?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (this.paused || t.done) return;
      operate.setPointerCapture(e.pointerId);
      this.held = true;
    });
    operate?.addEventListener("pointerup", () => (this.held = false));
    operate?.addEventListener("pointercancel", () => (this.held = false));
    operate?.addEventListener("lostpointercapture", () => (this.held = false));
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.release);
    document.addEventListener("visibilitychange", this.release);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  }
  radio() {
    return `<div class="walkie walkie-v2"><div class="walkie-body"><div class="walkie-antenna" aria-hidden="true"></div><div class="walkie-brand">FIELDLINK <small>FBI · RX / TX</small></div><div class="walkie-knobs">${["Canal", "Réglage fin"].map((label, i) => `<div class="radio-control"><button class="radio-knob" data-knob="${i}" role="slider" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="12"><span></span></button><small>${label}</small></div>`).join("")}</div><div class="radio-screen"><span class="radio-channel">FRÉQUENCE 1 / 3</span><strong class="frequency">117.2 <small>MHz</small></strong><div class="signal-bars">${Array.from({ length: 8 }, (_, i) => `<i style="height:${5 + i * 2}px"></i>`).join("")}</div><span class="signal-label">SIGNAL FAIBLE</span><div class="radio-lock-progress"><i></i></div></div><div class="walkie-speaker" aria-hidden="true">${Array.from({ length: 5 }, () => "<i></i>").join("")}</div></div></div>`;
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
        const step = knob.dataset.knob === "0" ? 0.04 : 0.008;
        let drag:
          | {
              pointerId: number;
              x: number;
              y: number;
              value: number;
              moved: boolean;
            }
          | undefined;
        let suppressClick = false;
        const adjust = (value: number) => {
          t.needle = Math.max(0, Math.min(1, value));
          this.draw();
        };
        knob.addEventListener("pointerdown", (e) => {
          if (this.paused || t.done || !e.isPrimary || e.button !== 0) return;
          e.preventDefault();
          knob.focus({ preventScroll: true });
          knob.setPointerCapture(e.pointerId);
          suppressClick = false;
          drag = {
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            value: t.needle,
            moved: false,
          };
        });
        knob.addEventListener("pointermove", (e) => {
          if (
            !drag ||
            drag.pointerId !== e.pointerId ||
            !knob.hasPointerCapture(e.pointerId) ||
            this.paused ||
            t.done
          )
            return;
          drag.moved ||=
            Math.hypot(e.clientX - drag.x, e.clientY - drag.y) >= 4;
          if (drag.moved) adjust(drag.value + (drag.y - e.clientY) * factor);
        });
        for (const type of [
          "pointerup",
          "pointercancel",
          "lostpointercapture",
        ]) {
          knob.addEventListener(type, (event) => {
            const e = event as PointerEvent;
            if (!drag || drag.pointerId !== e.pointerId) return;
            // A drag also emits click: do not add a tap step on release.
            suppressClick = drag.moved || type !== "pointerup";
            drag = undefined;
            if (knob.hasPointerCapture(e.pointerId))
              knob.releasePointerCapture(e.pointerId);
          });
        }
        knob.addEventListener("click", (e) => {
          const dragged = suppressClick && e.detail > 0;
          suppressClick = false;
          if (dragged || this.paused || t.done) return;
          const bounds = knob.getBoundingClientRect();
          const direction =
            e.detail === 0 || e.clientX >= bounds.left + bounds.width / 2
              ? 1
              : -1;
          adjust(t.needle + direction * step);
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
          adjust(
            t.needle +
              (["ArrowUp", "ArrowRight"].includes(e.key) ? 1 : -1) * step,
          );
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
    return electricalMarkup();
  }
  mechanism() {
    const t = this.state;
    const art =
      t.action === "drill"
        ? `<svg class="machine-art" viewBox="0 0 500 160" aria-hidden="true"><defs><linearGradient id="steel"><stop stop-color="#d1d6d5"/><stop offset=".45" stop-color="#727f83"/><stop offset="1" stop-color="#293940"/></linearGradient><linearGradient id="brass"><stop stop-color="#ffe0a1"/><stop offset="1" stop-color="#9f641e"/></linearGradient></defs><rect x="340" y="12" width="130" height="136" rx="16" fill="url(#steel)" stroke="#d9b86d" stroke-width="5"/><circle cx="400" cy="80" r="43" fill="#1a3036" stroke="url(#brass)" stroke-width="9"/><g class="drill-bit"><path d="M245 73h143v14H245" fill="url(#steel)" stroke="#111e24" stroke-width="3"/>${Array.from({ length: 9 }, (_, i) => `<path d="m${273 + i * 12} 72-9 17" stroke="#1d2a2e" stroke-width="3"/>`).join("")}</g><path d="M90 43h145l29 25v39H90Z" fill="#d99d35" stroke="#f5d38c" stroke-width="4"/><path d="m120 108 10 42h43l12-42" fill="#16373d" stroke="#627b7e" stroke-width="4"/><rect x="72" y="54" width="42" height="48" rx="10" fill="#1d3037"/>${[0, 1, 2, 3].map((i) => `<path d="M${145 + i * 16} 57v28" stroke="#473b22" stroke-width="5"/>`).join("")}<circle cx="104" cy="76" r="8" fill="#fce5b1"/></svg>`
        : `<div class="pocket-art"><div class="target-face"><img src="${import.meta.env.BASE_URL}portraits/${this.targetPortrait}.png" alt="Portrait de la cible"><span class="gaze-label">Regarde ailleurs</span></div><svg viewBox="0 0 420 160" aria-hidden="true"><defs><linearGradient id="cash-gold"><stop stop-color="#ffe4a2"/><stop offset=".5" stop-color="#d9a039"/><stop offset="1" stop-color="#956125"/></linearGradient></defs><rect x="126" y="133" width="236" height="15" rx="5" fill="${COLORS[this.targetPortrait % 4]}"/>${[0, 1, 2].map((i) => `<g transform="translate(${i * 7},${-i * 12})"><rect x="160" y="78" width="145" height="40" rx="5" fill="#42765b" stroke="#bbd09b" stroke-width="3"/><path d="M172 88h119v20H172Z" fill="none" stroke="#81a573" stroke-width="2"/><ellipse cx="232" cy="98" rx="22" ry="8" fill="#abc88e"/><path d="M220 79h19v39h-19Z" fill="#e8cb85"/></g>`).join("")}<path d="m247 133 13-30h65l17 30Z" fill="url(#cash-gold)" stroke="#f0ce73" stroke-width="2"/><path d="M275 112h29m-27 5h23" stroke="#9a662c" stroke-width="3"/><g class="thief-hand"><path d="M15 85h62l36-15q19-5 19 7l-16 12 25-6q12 0 12 12l-34 19H15Z" fill="#253640" stroke="#829296" stroke-width="3"/><rect x="9" y="83" width="31" height="34" rx="5" fill="#d2a64a"/></g></svg></div>`;
    return `${art}<div class="meter"><div class="target-band"></div><div class="meter-needle"></div><span class="meter-start">0</span><span class="meter-end">${t.action === "drill" ? "SURCHAUFFE" : "LIASSE"}</span></div><div class="point-progress"><span></span></div>`;
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
    this.held = true;
  };
  keyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") this.held = false;
  };
  draw() {
    const t = this.state;
    const dots = String(t.stage);
    if (this.lastDots !== dots) {
      this.lastDots = dots;
      const progress = t.action === "secure" ? t.panel : t.stage;
      this.root.querySelector(".trial-dots")!.innerHTML = (
        t.action === "secure" ? [0, 1] : [0, 1, 2]
      )
        .map(
          (i) =>
            `<span class="${i < progress ? "on" : ""}">${i < progress ? "✓" : i + 1}</span>`,
        )
        .join("");
    }
    if (t.action === "secure") {
      this.electrical?.update(this.paused);
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
    } else if (t.action === "loot") {
      this.statue?.update();
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
      const start = t.action === "drill" ? targetBand(t) : 0;
      band.style.left = `${start * 100}%`;
      band.style.width = `${(t.action === "drill" ? 0.13 : 1) * 100}%`;
      needle.style.left = `${(t.action === "drill" ? t.needle : (t.stage + t.progress) / 3) * 100}%`;
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
            : "Le socle a grincé ! Relâche et retrouve l’équilibre.",
      );
    else if (t.action === "painting")
      this.feedback(
        t.cutIndex >= 81
          ? "Découpe trop imprécise : recommence avant le signal."
          : `${Math.round((t.cutIndex / 81) * 100)} % découpé · Précision ${cutAccuracy(t)} %`,
      );
    else if (t.action === "secure")
      this.feedback(
        `Panneau ${Math.min(2, t.panel + 1)} / 2 · Relie les trois câbles. Validation automatique.`,
      );
    else if (t.action === "loot")
      this.feedback(
        `${["Décolle la statue du socle", "Porte-la vers le sac", "Dépose-la sur le rembourrage"][Math.min(2, t.stage)]} · ${t.stage} / 3 étapes`,
      );
    else this.feedback(`${t.stage} / 3 points validés`);
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
    this.electrical?.dispose();
    soundBank.loop("drill", false);
    soundBank.loop("cloth", false);
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.release);
    document.removeEventListener("visibilitychange", this.release);
  }
}
