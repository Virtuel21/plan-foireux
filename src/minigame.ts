import {
  connect,
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
  secure: "Relie les trois circuits au bon symbole, puis abaisse le levier.",
  drill:
    "Maintiens pour accélérer, relâche pour refroidir. Stabilise trois points.",
  loot: "Arrête le curseur dans les trois encoches.",
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
        pocket:
          "1. Maintiens pendant « Ailleurs » · 2. Relâche dès « Se retourne ». Ou Espace.",
      };
    root.innerHTML = `<div class="trial-head"><div><span class="eyebrow">${practice ? "ENTRAÎNEMENT · SANS ENJEU" : "ÉPREUVE PRIVÉE"}</span><h2>${LABELS[t.action]} <small class="trial-reward">${t.action === "drill" ? "Coffre +2 · Vous +6" : t.action === "secure" ? "Alarme −2 · Vous +6" : t.action === "loot" ? "12 pièces à partager" : "Jusqu’à 4 pièces volées"}</small></h2></div><div class="trial-dots" aria-label="Progression"></div></div><p class="trial-instruction">${INSTRUCTIONS[t.action]}</p><div class="trial-stage ${t.action}">${t.action === "secure" ? this.wires() : this.mechanism()}</div><div class="trial-bottom"><span class="trial-status" role="status">À toi de jouer</span>${t.action === "secure" ? '<button class="primary lever">Abaisser le levier</button>' : `<button class="primary operate">${t.action === "loot" ? "Arrêter le curseur" : t.action === "drill" ? "Maintenir pour forer" : "Maintenir pour avancer"}</button>`}</div><p class="gesture-example"><span class="demo-dot"></span>${hints[t.action]}</p>`;
    root.querySelector(".lever")?.addEventListener("click", () => {
      if (this.paused || t.done) return;
      lever(t);
      soundBank.play(t.done ? "current" : "lever");
      this.feedback(
        t.done ? "Trois circuits validés." : "Corrige les prises libérées.",
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
  wires() {
    const t = this.state;
    return `<div class="wire-board"><svg viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden="true">${[0, 1, 2].map((i) => `<path class="cable-shadow" data-shadow="${i}"/><path class="cable-line" data-wire="${i}" stroke="${WIRE_COLORS[i]}"/>`).join("")}</svg>${[0, 1, 2].map((i) => `<span class="circuit-label" style="top:${20 + i * 30}%;--wire:${WIRE_COLORS[i]}">${SYMBOLS[i]}</span><button class="plug" data-cable="${i}" aria-label="Sélectionner l’embout du circuit ${SYMBOLS[i]}" style="--wire:${WIRE_COLORS[i]}">${icon("plus")}</button><button class="terminal" data-terminal="${i}" aria-label="Borne ${SYMBOLS[terminalId(t, i)]}" style="top:${20 + i * 30}%">${SYMBOLS[terminalId(t, i)]}</button>`).join("")}<span class="board-label">CIRCUITS</span><span class="board-label right">BORNES</span></div>`;
  }
  mechanism() {
    const t = this.state;
    const art =
      t.action === "drill"
        ? `<svg class="machine-art" viewBox="0 0 500 160" aria-hidden="true"><defs><linearGradient id="steel"><stop stop-color="#d1d6d5"/><stop offset=".45" stop-color="#727f83"/><stop offset="1" stop-color="#293940"/></linearGradient><linearGradient id="brass"><stop stop-color="#ffe0a1"/><stop offset="1" stop-color="#9f641e"/></linearGradient></defs><rect x="340" y="12" width="130" height="136" rx="16" fill="url(#steel)" stroke="#d9b86d" stroke-width="5"/><circle cx="400" cy="80" r="43" fill="#1a3036" stroke="url(#brass)" stroke-width="9"/><g class="drill-bit"><path d="M245 73h143v14H245" fill="url(#steel)" stroke="#111e24" stroke-width="3"/>${Array.from({ length: 9 }, (_, i) => `<path d="m${273 + i * 12} 72-9 17" stroke="#1d2a2e" stroke-width="3"/>`).join("")}</g><path d="M90 43h145l29 25v39H90Z" fill="#d99d35" stroke="#f5d38c" stroke-width="4"/><path d="m120 108 10 42h43l12-42" fill="#16373d" stroke="#627b7e" stroke-width="4"/><rect x="72" y="54" width="42" height="48" rx="10" fill="#1d3037"/>${[0, 1, 2, 3].map((i) => `<path d="M${145 + i * 16} 57v28" stroke="#473b22" stroke-width="5"/>`).join("")}<circle cx="104" cy="76" r="8" fill="#fce5b1"/></svg>`
        : t.action === "loot"
          ? `<svg class="machine-art" viewBox="0 0 500 160" aria-hidden="true"><rect x="38" y="15" width="424" height="130" rx="22" fill="#68492c" stroke="#d7b16a" stroke-width="5"/><rect x="57" y="35" width="386" height="90" rx="12" fill="#152c32" stroke="#b58947" stroke-width="3"/>${[0, 1, 2].map((i) => `<g class="pin-art" data-pin="${i}"><path d="M${160 + i * 88} 35v58" stroke="#e1ba72" stroke-width="24"/><circle cx="${160 + i * 88}" cy="97" r="13" fill="#f6d58e" stroke="#836133" stroke-width="3"/><path d="M${150 + i * 88} 48h20m-20 8h20m-20 8h20" stroke="#997642" stroke-width="3"/></g>`).join("")}<path d="M90 118h300" stroke="#d9e0d8" stroke-width="8"/><circle cx="93" cy="118" r="8" fill="#b67f39"/></svg>`
          : `<div class="pocket-art"><div class="target-face"><img src="${import.meta.env.BASE_URL}portraits/${this.targetPortrait}.png" alt="Portrait de la cible"><span class="gaze-label">Regarde ailleurs</span></div><svg viewBox="0 0 420 160" aria-hidden="true"><defs><linearGradient id="bag-shade"><stop stop-color="${COLORS[this.targetPortrait % 4]}"/><stop offset="1" stop-color="#152d35"/></linearGradient></defs><path d="M198 45c-3-45 70-45 67 0" fill="none" stroke="#c9a768" stroke-width="10"/><rect x="137" y="39" width="200" height="111" rx="32" fill="url(#bag-shade)" stroke="#8ea3a1" stroke-width="4"/><path d="M158 64h158" stroke="#d2b070" stroke-width="4"/><path d="M178 41v109m119-109v109" stroke="#10222a" stroke-width="16"/><rect x="215" y="81" width="51" height="30" rx="6" fill="#c7a05c"/><g class="thief-hand"><path d="M15 85h62l36-15q19-5 19 7l-16 12 25-6q12 0 12 12l-34 19H15Z" fill="#253640" stroke="#829296" stroke-width="3"/><rect x="9" y="83" width="31" height="34" rx="5" fill="#d2a64a"/></g></svg></div>`;
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
      this.state.action === "secure" ||
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
    this.root.querySelector(".trial-dots")!.innerHTML = [0, 1, 2]
      .map(
        (i) =>
          `<span class="${i < t.stage ? "on" : ""}">${i < t.stage ? "✓" : i + 1}</span>`,
      )
      .join("");
    if (t.action === "secure") {
      [0, 1, 2].forEach((i) => {
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
    } else {
      const band = this.root.querySelector<HTMLElement>(".target-band")!,
        needle = this.root.querySelector<HTMLElement>(".meter-needle")!;
      const start =
          t.action === "drill"
            ? targetBand(t)
            : t.action === "loot"
              ? pinBand(t) - 0.18
              : 0,
        width = t.action === "drill" ? 0.23 : t.action === "loot" ? 0.36 : 1;
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
    else if (t.action !== "secure")
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
