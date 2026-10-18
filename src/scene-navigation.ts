import { icon } from "./icons";

/** Local camera preference only. A gesture never selects a task or a victim. */
export class SceneNavigation {
  zoom = 1;
  panX = 0;
  panY = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private lastDistance = 0;
  private lastCenter = { x: 0, y: 0 };
  private down = { x: 0, y: 0 };
  private gesturing = false;
  private blockedUntil = 0;
  private controls = document.createElement("div");

  constructor(
    private canvas: HTMLCanvasElement,
    private container: HTMLElement,
    private change: () => void,
  ) {
    try {
      const saved = JSON.parse(localStorage.getItem("pf-scene-view") || "{}");
      if (Number.isFinite(saved.zoom)) this.zoom = saved.zoom;
      if (Number.isFinite(saved.panX)) this.panX = saved.panX;
      if (Number.isFinite(saved.panY)) this.panY = saved.panY;
    } catch {}
    this.controls.className = "scene-navigation";
    this.controls.setAttribute("role", "group");
    this.controls.setAttribute("aria-label", "Vue du musée");
    this.controls.innerHTML = `<button data-view="out" aria-label="Dézoomer la scène">${icon("minus")}</button><output aria-label="Zoom de la scène"></output><button data-view="in" aria-label="Zoomer la scène">${icon("plus")}</button><button data-view="reset" aria-label="Recentrer la scène" title="Recentrer la scène">${icon("reset")}</button>`;
    container.append(this.controls);
    this.controls.addEventListener("click", (e) => {
      const action = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-view]",
      )?.dataset.view;
      if (action === "reset") {
        this.zoom = 1;
        this.panX = this.panY = 0;
      } else if (action) this.zoom += action === "in" ? 0.2 : -0.2;
      else return;
      this.apply();
    });
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-description",
      "Pincez pour zoomer, glissez pour déplacer la vue agrandie. Clavier : +, −, flèches et R pour recentrer.",
    );
    canvas.addEventListener("keydown", (e) => {
      if (
        ![
          "+",
          "=",
          "-",
          "r",
          "R",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      if (["r", "R"].includes(e.key)) {
        this.zoom = 1;
        this.panX = this.panY = 0;
      } else if (["+", "="].includes(e.key)) this.zoom += 0.2;
      else if (e.key === "-") this.zoom -= 0.2;
      else if (e.key === "ArrowLeft") this.panX += 0.06;
      else if (e.key === "ArrowRight") this.panX -= 0.06;
      else if (e.key === "ArrowUp") this.panY += 0.06;
      else if (e.key === "ArrowDown") this.panY -= 0.06;
      this.apply();
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.down = { x: e.clientX, y: e.clientY };
      if (this.pointers.size > 1) this.block();
      else this.gesturing = false;
      this.measure();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const points = [...this.pointers.values()];
      const center = this.center();
      if (points.length > 1) {
        const distance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
        if (this.lastDistance > 0) this.zoom *= distance / this.lastDistance;
        this.lastDistance = distance;
        this.block();
      } else if (
        Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 8
      )
        this.block();
      if (this.gesturing) {
        if (this.zoom > 1) {
          this.panX += (center.x - this.lastCenter.x) / canvas.clientWidth;
          this.panY += (center.y - this.lastCenter.y) / canvas.clientHeight;
        }
        this.apply(false);
      }
      this.lastCenter = center;
    });
    const end = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      if (this.gesturing || e.type !== "pointerup") this.block();
      this.pointers.delete(e.pointerId);
      this.measure();
      if (!this.pointers.size) this.apply();
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("lostpointercapture", end);
    window.addEventListener("blur", () => {
      this.pointers.clear();
      this.block();
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoom *= Math.exp(-e.deltaY * 0.0015);
        this.apply();
      },
      { passive: false },
    );
    this.apply();
  }

  get suppressSelection() {
    return this.pointers.size > 1 || performance.now() < this.blockedUntil;
  }
  private block() {
    this.gesturing = true;
    this.blockedUntil = performance.now() + 350;
  }
  private center() {
    const p = [...this.pointers.values()];
    return p.length
      ? {
          x: p.reduce((n, v) => n + v.x, 0) / p.length,
          y: p.reduce((n, v) => n + v.y, 0) / p.length,
        }
      : this.lastCenter;
  }
  private measure() {
    const p = [...this.pointers.values()];
    this.lastCenter = this.center();
    this.lastDistance =
      p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
  }
  private apply(save = true) {
    this.zoom = Math.max(1, Math.min(2.6, this.zoom));
    const limit = (this.zoom - 1) / 2;
    this.panX = Math.max(-limit, Math.min(limit, this.panX));
    this.panY = Math.max(-limit, Math.min(limit, this.panY));
    this.controls.querySelector("output")!.textContent =
      `${Math.round(this.zoom * 100)} %`;
    this.controls.querySelector<HTMLButtonElement>(
      '[data-view="out"]',
    )!.disabled = this.zoom <= 1;
    this.controls.querySelector<HTMLButtonElement>(
      '[data-view="in"]',
    )!.disabled = this.zoom >= 2.6;
    this.container.dataset.zoom = this.zoom.toFixed(3);
    this.container.dataset.pan = `${this.panX.toFixed(3)},${this.panY.toFixed(3)}`;
    if (save)
      localStorage.setItem(
        "pf-scene-view",
        JSON.stringify({ zoom: this.zoom, panX: this.panX, panY: this.panY }),
      );
    this.change();
  }
}
