import {
  statueBalanced,
  statueBand,
  statueNoise,
  statueTarget,
  supportStatue,
  type Trial,
} from "./trial";
import "./statue.css";

const STEPS = ["Décoller", "Porter", "Déposer"];
export function statueMarkup() {
  return `<div class="statue-workbench"><ol class="statue-steps">${STEPS.map((step, i) => `<li data-statue-step="${i}"><span>${i + 1}</span>${step}</li>`).join("")}</ol><button class="statue-carry" aria-label="Soutenir la statue. Maintenez et glissez de gauche à droite pour équilibrer son poids."><svg viewBox="0 0 600 240" role="img" aria-label="Statue de marbre à soulever de son socle et déposer dans un sac"><defs><linearGradient id="statue-marble"><stop stop-color="#fff5da"/><stop offset=".6" stop-color="#ded4b7"/><stop offset="1" stop-color="#b5aa8d"/></linearGradient></defs><path d="M55 214h490" stroke="#658080" stroke-width="2"/><ellipse cx="300" cy="211" rx="92" ry="8" fill="#071b23" opacity=".5"/><g class="statue-sack"><path d="m422 145-18 65h139l-18-65-19 14-22-13-25 15Z" fill="#314a50" stroke="#a6b1a0" stroke-width="3"/><path d="M422 160c24 21 71 21 102 0" stroke="#d3b16d" fill="none" stroke-width="5"/></g><g class="statue-plinth"><path d="M243 161h114v50H243Z" fill="#c7b58d" stroke="#eedbb2" stroke-width="3"/><path d="M234 154h132v14H234Z" fill="#e7d6b5" stroke="#f5e6c6" stroke-width="3"/><path d="m255 175 18 4m43 13 19 5" stroke="#9b8d74" stroke-width="2"/><rect class="statue-sensor" x="279" y="163" width="42" height="8" rx="3" fill="#ecac55"/></g><g class="statue-lift"><g class="statue-marble"><path d="m281 79-22 15-10 40 15 12 11-27-4 31h62l-8-31 15 24 12-12-17-36-20-16Z" fill="url(#statue-marble)" stroke="#9d937e" stroke-width="2"/><path d="m278 92 9 22-8 33m32-54-3 20 12 32m-34-23 22 7" fill="none" stroke="#b6aa91" stroke-width="3"/><path d="M288 70v17l13 8 14-12-5-17Z" fill="#e8ddbf"/><ellipse cx="300" cy="51" rx="23" ry="29" fill="url(#statue-marble)" stroke="#c2b69d" stroke-width="2"/>${[
    [279, 32],
    [290, 24],
    [305, 23],
    [319, 31],
    [321, 43],
    [278, 46],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="10" fill="#eee5cb" stroke="#c2b69d" stroke-width="2"/>`,
    )
    .join(
      "",
    )}<path d="m292 50 5 1m10-1 5-1m-9 7-3 6h5m-10 9 13-1" stroke="#a1937e" stroke-width="2" fill="none"/><path d="M268 145h65l6 10h-78Z" fill="#efe4c8" stroke="#ab9f87" stroke-width="2"/></g><g class="statue-hands" fill="#243e49" stroke="#9ab3b0" stroke-width="3"><path d="m205 163 26-18 40-1 7 10-25 9-35 13Z"/><path d="m387 163-24-18-31-1-8 10 26 9 24 13Z"/></g></g><text x="300" y="233" text-anchor="middle" fill="#c5d7cf" font-size="12">MAINTIENS · GLISSE POUR ÉQUILIBRER</text></svg></button><div class="statue-balance" role="img" aria-label="Appui à conserver dans la zone verte"><span class="statue-safe"></span><span class="statue-support-marker"></span></div><div class="statue-adjust"><label>Ton appui<input class="statue-support" type="range" min="0" max="100" step="1" value="50" aria-label="Déplacer l’appui sous la statue"></label><div class="statue-noise"><span>Bruit du socle <b>Silencieux</b></span><div><i></i></div></div></div><div class="statue-stage-progress"><i></i></div></div>`;
}

export class StatueBoard {
  private carry: HTMLButtonElement;
  private support: HTMLInputElement;
  private activePointer: number | null = null;
  constructor(
    private root: HTMLElement,
    private trial: Trial,
    private input: {
      paused: () => boolean;
      held: () => boolean;
      hold: (held: boolean) => void;
      change: () => void;
    },
  ) {
    this.carry = root.querySelector<HTMLButtonElement>(".statue-carry")!;
    this.support = root.querySelector<HTMLInputElement>(".statue-support")!;
    const move = (e: PointerEvent) => {
      if (this.input.paused() || this.trial.done) return;
      const bounds = this.carry.getBoundingClientRect();
      supportStatue(this.trial, (e.clientX - bounds.left) / bounds.width);
      this.input.change();
    };
    this.carry.addEventListener("pointerdown", (e) => {
      if (
        this.input.paused() ||
        trial.done ||
        this.activePointer !== null ||
        e.button !== 0
      )
        return;
      e.preventDefault();
      this.activePointer = e.pointerId;
      this.carry.setPointerCapture(e.pointerId);
      input.hold(true);
      move(e);
    });
    this.carry.addEventListener("pointermove", (e) => {
      if (
        this.activePointer === e.pointerId &&
        this.carry.hasPointerCapture(e.pointerId)
      )
        move(e);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      this.carry.addEventListener(type, (event) => {
        if ((event as PointerEvent).pointerId !== this.activePointer) return;
        this.activePointer = null;
        input.hold(false);
      });
    this.carry.addEventListener("keydown", (e) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) ||
        input.paused() ||
        trial.done
      )
        return;
      e.preventDefault();
      supportStatue(
        trial,
        trial.needle +
          (["ArrowRight", "ArrowUp"].includes(e.key) ? 0.025 : -0.025),
      );
      input.change();
    });
    this.support.addEventListener("input", () => {
      if (input.paused() || trial.done) return;
      supportStatue(trial, this.support.valueAsNumber / 100);
      input.change();
    });
  }
  update() {
    const t = this.trial,
      held = this.input.held(),
      balanced = statueBalanced(t);
    this.root.dataset.stage = String(t.stage);
    this.root.dataset.balanced = String(balanced);
    this.root.classList.toggle("carrying", held && !this.input.paused());
    this.root.classList.toggle(
      "statue-unbalanced",
      held && !balanced && !t.done,
    );
    this.carry.disabled = this.support.disabled = this.input.paused() || t.done;
    this.carry.setAttribute("aria-pressed", String(held));
    this.support.value = String(Math.round(t.needle * 100));
    this.support.setAttribute(
      "aria-valuetext",
      `${Math.round(t.needle * 100)} %, ${balanced ? "poids équilibré" : "hors du point d’équilibre"}`,
    );
    const safe = this.root.querySelector<HTMLElement>(".statue-safe")!;
    safe.style.left = `${(statueTarget(t) - statueBand(t) / 2) * 100}%`;
    safe.style.width = `${statueBand(t) * 100}%`;
    this.root.querySelector<HTMLElement>(".statue-support-marker")!.style.left =
      `${t.needle * 100}%`;
    const noise = statueNoise(t);
    this.root.querySelector<HTMLElement>(".statue-noise i")!.style.width =
      `${noise * 100}%`;
    this.root.querySelector(".statue-noise b")!.textContent =
      noise > 0.55 ? "Ça grince !" : noise > 0.1 ? "Attention…" : "Silencieux";
    this.root.querySelector<HTMLElement>(
      ".statue-stage-progress i",
    )!.style.width = `${(t.done ? 1 : t.progress) * 100}%`;
    this.root
      .querySelectorAll<HTMLElement>("[data-statue-step]")
      .forEach((el, i) => {
        el.classList.toggle("complete", i < t.stage);
        el.classList.toggle("current", !t.done && i === t.stage);
      });
    const tilt =
      t.done || !held
        ? 0
        : Math.max(-11, Math.min(11, (t.needle - statueTarget(t)) * 40));
    const x = t.done
      ? 180
      : t.stage === 2
        ? 110 + t.progress * 70
        : t.stage === 1
          ? t.progress * 110
          : 0;
    const y = t.done
      ? 38
      : t.stage === 2
        ? -19 + t.progress * 57
        : -t.stage * 19 - t.progress * 19;
    this.root
      .querySelector<SVGGElement>(".statue-lift")!
      .setAttribute(
        "transform",
        `translate(${x} ${y}) rotate(${tilt} 300 150)`,
      );
    this.root.querySelector<HTMLElement>(".statue-sack")!.style.opacity =
      t.stage >= 1 ? "1" : ".45";
  }
}
