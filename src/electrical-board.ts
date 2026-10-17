import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { connect, lever, terminalId, type Trial } from "./trial";
import { ELECTRICAL, loosePlug, touchCenters } from "./electrical-layout";
import "./electrical.css";

// Start once with the rest of the game assets, before the timed challenge opens.
// Vite publishes the original GLB under its own versioned asset URL.
let model: ReturnType<GLTFLoader["loadAsync"]> | undefined;
function getModel() {
  if (!model)
    model = new GLTFLoader()
      .loadAsync(
        new URL("../art/source/electrical-box.glb", import.meta.url).href,
      )
      .catch((error: unknown) => {
        model = undefined;
        throw error;
      });
  return model;
}
void getModel().catch(() => {});

export function electricalMarkup() {
  return `<div class="electrical-board" aria-label="Boîtier de dérivation interactif en 3D" aria-busy="true"><div class="electrical-loading" role="status">Chargement du boîtier…</div>${ELECTRICAL.symbols.map((symbol, i) => `<span class="electrical-source-label" data-source="${i}" style="--wire:${ELECTRICAL.colors[i]}">${symbol}</span><button class="electrical-control electrical-plug" data-cable="${i}" aria-label="Sélectionner l’embout du circuit ${symbol}" style="--wire:${ELECTRICAL.colors[i]}" disabled></button><button class="electrical-control electrical-socket" data-terminal="${i}" aria-label="Borne ${symbol}" disabled><span>${symbol}</span></button>`).join("")}<button class="electrical-control electrical-switch" aria-label="Valider les circuits" title="Actionner l’interrupteur du boîtier" disabled><span>ACTIVER</span></button></div>`;
}

/** Physical model + cables. The transparent, projected DOM targets retain native
 * button semantics, pointer capture, 44px touch targets and keyboard activation.
 * They are always placed from the same 3D points as their visible counterpart.
 */
export class ElectricalBoard {
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-1, 1, 0.7, -0.7, 0.01, 10);
  private renderer?: T.WebGLRenderer;
  private observer: ResizeObserver;
  private wires = new T.Group();
  private nativeSwitch?: T.Mesh;
  private ownedGeometry = new Set<T.BufferGeometry>();
  private selected = -1;
  private paused = false;
  private disposed = false;
  private ready = false;
  private dragPoint?: T.Vector3;
  private pointerStart?: [number, number];
  private moved = false;
  private suppressClick = false;
  private lastSignature = "";
  private lastDrawSignature = "";
  private switchUntil = 0;
  private plugPoints: T.Vector3[] = [];
  private plugs: HTMLButtonElement[];
  private terminals: HTMLButtonElement[];
  private switchButton: HTMLButtonElement;

  constructor(
    private root: HTMLElement,
    private trial: Trial,
    private onChange: (type: "plug" | "switch") => void,
  ) {
    this.plugs = [...root.querySelectorAll<HTMLButtonElement>("[data-cable]")];
    this.terminals = [
      ...root.querySelectorAll<HTMLButtonElement>("[data-terminal]"),
    ];
    this.switchButton =
      root.querySelector<HTMLButtonElement>(".electrical-switch")!;
    this.camera.position.set(0, 0, 4);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new T.HemisphereLight(0xffedcf, 0x33515a, 2.6));
    const key = new T.DirectionalLight(0xffebc8, 3.1);
    key.position.set(-2, 3, 5);
    this.scene.add(key);
    const fill = new T.DirectionalLight(0xb5e0ed, 1.7);
    fill.position.set(3, 0, 4);
    this.scene.add(fill, this.wires);
    this.bind();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(root);
    void this.load();
  }

  private async load() {
    try {
      const asset = await getModel();
      if (this.disposed) return;
      this.renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.domElement.setAttribute("aria-hidden", "true");
      this.root.prepend(this.renderer.domElement);
      const original = asset.scene.clone(true);
      original.name = "InteractiveOriginalJunctionBox";
      this.extractSwitch(original);
      this.scene.add(original);
      this.ready = true;
      this.root.dataset.modelReady = "true";
      this.root.setAttribute("aria-busy", "false");
      this.resize();
      this.update(this.paused);
    } catch {
      if (this.disposed) return;
      this.root.querySelector(".electrical-loading")!.textContent =
        "Le boîtier n’a pas pu se charger. Ferme puis relance cette épreuve.";
      this.root.dataset.modelReady = "error";
      this.root.setAttribute("aria-busy", "false");
    }
  }

  /** Meshy supplied one textured mesh. Separate only the native rocker triangles
   * so operating the real switch animates it; preserve every source triangle.
   */
  private extractSwitch(root: T.Object3D) {
    root.traverse((object) => {
      if (!(object instanceof T.Mesh) || !object.geometry.index) return;
      const geometry = object.geometry as T.BufferGeometry;
      const indices = geometry.index!;
      const positions = geometry.getAttribute("position");
      const body: number[] = [],
        rocker: number[] = [];
      for (let i = 0; i < indices.count; i += 3) {
        const triangle = [
          indices.getX(i),
          indices.getX(i + 1),
          indices.getX(i + 2),
        ];
        const center = triangle
          .reduce(
            (v, j) => v.add(new T.Vector3().fromBufferAttribute(positions, j)),
            new T.Vector3(),
          )
          .multiplyScalar(1 / 3);
        const isRocker =
          center.x > 0.52 &&
          center.x < 0.61 &&
          center.y > -0.5 &&
          center.y < -0.365 &&
          center.z > -0.13;
        (isRocker ? rocker : body).push(...triangle);
      }
      if (!rocker.length) return;
      const bodyGeometry = geometry.clone().setIndex(body);
      const switchGeometry = geometry.clone().setIndex(rocker);
      const pivot = new T.Vector3(0.56, -0.435, -0.125);
      switchGeometry.translate(-pivot.x, -pivot.y, -pivot.z);
      object.geometry = bodyGeometry;
      const native = new T.Mesh(switchGeometry, object.material);
      native.name = "OriginalJunctionBoxSwitch";
      native.position.copy(pivot);
      object.add(native);
      this.nativeSwitch = native;
      this.ownedGeometry.add(bodyGeometry).add(switchGeometry);
      this.root.dataset.switchNativeTriangles = String(rocker.length / 3);
    });
  }

  private allowed() {
    return this.ready && !this.paused && !this.trial.done;
  }

  get isReady() {
    return this.ready;
  }

  private select(cable: number) {
    if (!this.allowed() || this.trial.correct[cable]) return;
    this.selected = cable;
    if (this.trial.connections[cable] >= 0) {
      connect(this.trial, cable, -1);
      this.onChange("plug");
    }
    this.update(this.paused);
  }

  private attach(terminal: number) {
    if (!this.allowed()) return;
    if (this.selected < 0) {
      const occupied = this.trial.connections.indexOf(terminal);
      if (occupied >= 0) this.select(occupied);
      return;
    }
    connect(this.trial, this.selected, terminal);
    this.selected = -1;
    this.dragPoint = undefined;
    this.onChange("plug");
    this.update(this.paused);
  }

  private bind() {
    this.plugs.forEach((button, cable) => {
      button.addEventListener("pointerdown", (e) => {
        if (!this.allowed()) return;
        this.select(cable);
        button.setPointerCapture(e.pointerId);
        this.pointerStart = [e.clientX, e.clientY];
        this.moved = false;
      });
      button.addEventListener("pointermove", (e) => {
        if (!button.hasPointerCapture(e.pointerId) || !this.allowed()) return;
        if (
          this.pointerStart &&
          Math.hypot(
            e.clientX - this.pointerStart[0],
            e.clientY - this.pointerStart[1],
          ) > 3
        )
          this.moved = true;
        if (!this.moved) return;
        const r = this.root.getBoundingClientRect();
        const point = new T.Vector3(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          1 - ((e.clientY - r.top) / r.height) * 2,
          0,
        ).unproject(this.camera);
        point.x = T.MathUtils.clamp(point.x, -0.2, 0.57);
        point.y = T.MathUtils.clamp(point.y, -0.34, 0.43);
        point.z = 0.05;
        this.dragPoint = point;
        this.update(this.paused);
      });
      button.addEventListener("pointerup", (e) => {
        if (!this.allowed()) return;
        // The dragged plug covers the receiving socket, so test the projected
        // socket targets directly instead of elementFromPoint's top element.
        const target = this.terminals.findIndex((terminal) => {
          const r = terminal.getBoundingClientRect();
          return (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
          );
        });
        if (this.moved && target >= 0) this.attach(target);
        this.dragPoint = undefined;
        this.pointerStart = undefined;
        this.suppressClick = this.moved;
        this.update(this.paused);
      });
      const cancel = () => {
        this.dragPoint = undefined;
        this.pointerStart = undefined;
        this.update(this.paused);
      };
      button.addEventListener("pointercancel", cancel);
      button.addEventListener("lostpointercapture", cancel);
      button.addEventListener("click", (e) => {
        if (this.suppressClick && e.detail > 0) {
          this.suppressClick = false;
          return;
        }
        this.suppressClick = false;
        this.select(cable);
      });
    });
    this.terminals.forEach((button, i) =>
      button.addEventListener("click", () => this.attach(i)),
    );
    this.switchButton.addEventListener("click", () => {
      if (!this.allowed()) return;
      lever(this.trial);
      this.switchUntil = performance.now() + 320;
      this.selected = -1;
      this.onChange("switch");
      this.update(this.paused);
    });
  }

  private resize() {
    if (!this.renderer) return;
    const width = this.root.clientWidth,
      height = this.root.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    // On small screens focus on the working housing, retaining every control.
    // The hinged decorative lid may extend outside this closer camera framing.
    const narrow = width < 420;
    const worldWidth = Math.max(narrow ? 1.7 : 2.06, (1.34 * width) / height);
    const worldHeight = (worldWidth * height) / width;
    const centerX = narrow ? 0.1 : 0;
    this.camera.left = centerX - worldWidth / 2;
    this.camera.right = centerX + worldWidth / 2;
    this.camera.top = worldHeight / 2;
    this.camera.bottom = -worldHeight / 2;
    this.camera.updateProjectionMatrix();
    this.lastSignature = "";
    this.lastDrawSignature = "";
    this.update(this.paused);
  }

  private point(p: readonly number[]) {
    return new T.Vector3(p[0], p[1], p[2]);
  }

  private place(element: HTMLElement, p: T.Vector3) {
    const screen = p.clone().project(this.camera);
    element.style.left = `${(screen.x + 1) * 50}%`;
    element.style.top = `${(1 - screen.y) * 50}%`;
  }

  private placeTargets(buttons: HTMLElement[], points: T.Vector3[]) {
    const h = this.root.clientHeight;
    const screen = points.map((point) => point.clone().project(this.camera));
    const anchors = screen.map((point) => ((1 - point.y) * h) / 2);
    const centers = touchCenters(anchors, h, 46);
    buttons.forEach((button, i) => {
      button.style.left = `${(screen[i].x + 1) * 50}%`;
      button.style.top = `${centers[i]}px`;
      button.style.setProperty("--anchor-y", `${anchors[i] - centers[i]}px`);
      button.dataset.anchorX = String(
        ((screen[i].x + 1) * this.root.clientWidth) / 2,
      );
      button.dataset.anchorY = String(anchors[i]);
    });
  }

  private rebuildWires() {
    this.wires.traverse((object) => {
      if (object instanceof T.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.wires.clear();
    this.trial.connections.forEach((terminal, cable) => {
      const start = this.point(ELECTRICAL.sources[cable]);
      const end =
        this.selected === cable && this.dragPoint
          ? this.dragPoint.clone()
          : terminal >= 0
            ? this.point(ELECTRICAL.sockets[terminal])
            : this.point(loosePlug(cable));
      const curve = new T.CatmullRomCurve3([
        start,
        new T.Vector3(start.x + 0.09, start.y + 0.065, 0.045 + cable * 0.012),
        new T.Vector3(
          (start.x + end.x) / 2 + 0.045,
          (start.y + end.y) / 2 + 0.065,
          0.075 + cable * 0.014,
        ),
        new T.Vector3(end.x - 0.045, end.y, 0.055),
        end,
      ]);
      const material = new T.MeshStandardMaterial({
        color: ELECTRICAL.colors[cable],
        roughness: 0.4,
        metalness: 0.1,
        emissive: this.selected === cable ? ELECTRICAL.colors[cable] : 0x000000,
        emissiveIntensity: 0.2,
      });
      const wire = new T.Mesh(
        new T.TubeGeometry(curve, 32, 0.012, 7, false),
        material,
      );
      wire.name = `InteractiveCable_${cable}`;
      this.wires.add(wire);
      const connector = new T.Mesh(
        new T.CylinderGeometry(0.024, 0.024, 0.045, 10),
        new T.MeshStandardMaterial({
          color: this.trial.correct[cable] ? 0x60c58d : 0xd6b979,
          metalness: 0.7,
          roughness: 0.32,
        }),
      );
      connector.position.copy(end);
      connector.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        curve.getTangent(1).normalize(),
      );
      connector.name = `InteractivePlug_${cable}`;
      this.wires.add(connector);
      this.plugPoints[cable] = end;
    });
  }

  update(paused: boolean) {
    this.paused = paused;
    if (this.disposed || !this.ready || !this.renderer) return;
    const t = this.trial;
    if (paused) this.dragPoint = undefined;
    const switchOn = t.done || performance.now() < this.switchUntil;
    const drawSignature = `${t.panel}|${t.done}|${paused}|${switchOn}|${t.connections}|${t.correct}|${this.selected}|${this.dragPoint?.toArray().join()}`;
    // This model is static between gestures. In particular, a restored guest
    // must not spend the remaining challenge time competing with idle WebGL
    // draws from every other player. Its real 3D scene redraws on visual change.
    if (drawSignature === this.lastDrawSignature) return;
    this.lastDrawSignature = drawSignature;
    const signature = `${t.connections}|${t.correct}|${this.selected}|${this.dragPoint?.toArray().join()}`;
    if (signature !== this.lastSignature) {
      this.lastSignature = signature;
      this.rebuildWires();
    }
    this.plugs.forEach((button, i) => {
      button.classList.toggle("selected", this.selected === i);
      button.classList.toggle("connected", t.connections[i] >= 0);
      button.disabled = !this.allowed() || t.correct[i];
      button.setAttribute("aria-pressed", String(this.selected === i));
      const label = this.root.querySelector<HTMLElement>(
        `[data-source="${i}"]`,
      )!;
      this.place(label, new T.Vector3(-0.51, ELECTRICAL.sources[i][1], -0.1));
    });
    this.terminals.forEach((button, i) => {
      const cable = t.connections.indexOf(i);
      button.querySelector("span")!.textContent =
        ELECTRICAL.symbols[terminalId(t, i)];
      button.setAttribute(
        "aria-label",
        `Borne ${ELECTRICAL.symbols[terminalId(t, i)]}`,
      );
      button.classList.toggle("occupied", cable >= 0);
      button.classList.toggle("correct", cable >= 0 && t.correct[cable]);
      button.style.setProperty(
        "--wire",
        cable >= 0 ? ELECTRICAL.colors[cable] : "#efd18d",
      );
      button.disabled = !this.allowed() || (cable >= 0 && t.correct[cable]);
    });
    this.switchButton.disabled = !this.allowed();
    this.switchButton.classList.toggle(
      "ready",
      t.connections.every((i) => i >= 0),
    );
    this.switchButton.setAttribute("aria-pressed", String(t.done));
    this.placeTargets(
      [...this.terminals, this.switchButton],
      [
        ...ELECTRICAL.sockets.map((point) => this.point(point)),
        this.point(ELECTRICAL.switch),
      ],
    );
    const loose = this.plugs
      .map((button, i) => ({ button, i }))
      .filter(({ i }) => t.connections[i] < 0);
    if (this.dragPoint) {
      loose.forEach(({ button, i }) => {
        this.place(button, this.plugPoints[i]);
        button.style.setProperty("--anchor-y", "0px");
      });
    } else {
      this.placeTargets(
        loose.map(({ button }) => button),
        loose.map(({ i }) => this.plugPoints[i]),
      );
    }
    if (this.nativeSwitch) this.nativeSwitch.rotation.x = switchOn ? -0.52 : 0;
    this.root.dataset.panel = String(t.panel + 1);
    this.root.dataset.connections = t.connections.join(",");
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.observer.disconnect();
    this.wires.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.ownedGeometry.forEach((geometry) => geometry.dispose());
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
