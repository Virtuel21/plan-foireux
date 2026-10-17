import {
  newPinTrial,
  pin,
  pinBand,
  stepPinTrial,
  type PinTrial,
} from "./pin-trial";
import "./pin-minigame.css";

/** Complete locker UI preserved for a future scene; never offered as a live post. */
export class LockerMinigame {
  state: PinTrial;
  paused = false;
  private raf = 0;
  private last = performance.now();
  constructor(
    private root: HTMLElement,
    seed: number,
    private changed: (state: PinTrial) => void = () => {},
  ) {
    this.state = newPinTrial(seed);
    root.classList.add("archived-locker");
    root.innerHTML = `<h2>Casiers · Goupilles</h2><p>Arrête le curseur dans les trois encoches.</p><svg class="machine-art" viewBox="0 0 500 160" aria-hidden="true"><rect x="38" y="15" width="424" height="130" rx="22" fill="#68492c" stroke="#d7b16a" stroke-width="5"/><rect x="57" y="35" width="386" height="90" rx="12" fill="#152c32" stroke="#b58947" stroke-width="3"/>${[0, 1, 2].map((i) => `<g class="pin-art" data-pin="${i}"><path d="M${160 + i * 88} 35v58" stroke="#e1ba72" stroke-width="24"/><circle cx="${160 + i * 88}" cy="97" r="13" fill="#f6d58e" stroke="#836133" stroke-width="3"/><path d="M${150 + i * 88} 48h20m-20 8h20m-20 8h20" stroke="#997642" stroke-width="3"/></g>`).join("")}<path d="M90 118h300" stroke="#d9e0d8" stroke-width="8"/><circle cx="93" cy="118" r="8" fill="#b67f39"/></svg><div class="locker-meter"><span></span><i></i></div><p class="locker-status" role="status"></p><button type="button">Arrêter le curseur</button>`;
    root.querySelector("button")!.addEventListener("click", this.activate);
    root.addEventListener("keydown", this.key);
    this.raf = requestAnimationFrame(this.frame);
  }
  private activate = () => {
    if (this.paused || this.state.done) return;
    pin(this.state);
    this.changed(structuredClone(this.state));
  };
  private key = (e: KeyboardEvent) => {
    if (e.code !== "Space" || e.repeat) return;
    e.preventDefault();
    this.activate();
  };
  private frame = (now: number) => {
    if (!this.paused) stepPinTrial(this.state, (now - this.last) / 1000);
    this.last = now;
    const state = this.state;
    const band = this.root.querySelector<HTMLElement>(".locker-meter span")!;
    band.style.left = `${(pinBand(state) - 0.075) * 100}%`;
    this.root.querySelector<HTMLElement>(".locker-meter i")!.style.left =
      `${state.cursor * 100}%`;
    this.root
      .querySelectorAll<SVGElement>("[data-pin]")
      .forEach(
        (p, i) =>
          (p.style.transform = `translateY(${i < state.stage ? -20 : 0}px)`),
      );
    this.root.querySelector(".locker-status")!.textContent = state.done
      ? "Réussi !"
      : state.cooldown
        ? "Clac… Réessaie cette goupille."
        : `${state.stage} / 3 goupilles validées`;
    this.root.querySelector<HTMLButtonElement>("button")!.disabled =
      state.done || this.paused;
    this.raf = requestAnimationFrame(this.frame);
  };
  dispose() {
    cancelAnimationFrame(this.raf);
    this.root.removeEventListener("keydown", this.key);
    this.root
      .querySelector("button")
      ?.removeEventListener("click", this.activate);
  }
}
