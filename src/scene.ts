import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  legal,
  recommended,
  postReward,
  postShare,
  type PostAction,
  type Choice,
  type Player,
  type View,
} from "./engine";
import { icon } from "./icons";
import { CharacterAnimation, type Clip } from "./animation";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { clothingVariant, loadMeshyCharacters, loadMeshyMuseum } from "./meshy";
import gallery from "../scenes/layouts/grande-galerie.json";
import cabinet from "../scenes/layouts/cabinet-curiosites.json";
import reserve from "../scenes/layouts/reserve-royale.json";
import { WealthPiles } from "./wealth";
import { escapeHTML as esc } from "./html";

export const LABELS = {
  drill: "Forer",
  secure: "Désactiver les caméras",
  loot: "Casiers",
  pocket: "Faire les poches",
  painting: "Voler la toile",
  radio: "Brouilleur FBI",
};
type Actor = {
  id: string;
  root: T.Object3D;
  target: T.Vector3;
  button: HTMLButtonElement;
  parts: Record<string, T.Object3D>;
  animation: CharacterAnimation;
};
type Marker = {
  button: HTMLButtonElement;
  anchor: T.Vector3;
  object?: T.Object3D;
};
const OFFSETS = [gallery.offsets, cabinet.offsets, reserve.offsets];
export class Museum {
  scene = new T.Scene();
  camera = new T.OrthographicCamera(-9, 9, 6, -6, 0.1, 70);
  renderer: T.WebGLRenderer;
  actors: Actor[] = [];
  model: T.Object3D | null = null;
  templates: { scene: T.Object3D; animations: T.AnimationClip[] }[] = [];
  roomMixer: T.AnimationMixer | null = null;
  drill: T.Object3D | null = null;
  room: T.Object3D | null = null;
  wealth: WealthPiles | null = null;
  markers = new Map<string, Marker>();
  labels = document.createElement("div");
  view: View | null = null;
  roster: Player[] = [];
  selection: Choice | null = null;
  clock = new T.Clock();
  objects: Record<string, T.Object3D> = {};
  ray = new T.Raycaster();
  reduced = matchMedia("(prefers-reduced-motion: reduce)");
  nextLayout = 0;
  layoutIndex = -1;
  frames = 0;
  lastStats = 0;
  ready = false;
  suspended = false;
  lines: HTMLDivElement[] = [];
  constructor(
    public container: HTMLElement,
    public choose: (id: string) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor("#111f27");
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Diorama du musée. Les postes et personnages disposent de boutons accessibles.",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.container.append(this.renderer.domElement, this.labels);
    this.labels.className = "world-labels";
    this.camera.position.set(8.2, 11, 15.5);
    this.camera.lookAt(0, 0.6, 0);
    this.scene.add(new T.HemisphereLight("#fff1d8", "#71503a", 1.8));
    const sun = new T.DirectionalLight("#ffdda0", 3.8);
    sun.position.set(-4, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    Object.assign(sun.shadow.camera, {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
      near: 0.5,
      far: 30,
    });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    const fill = new T.DirectionalLight("#ffedcf", 1.05);
    fill.position.set(7, 5, -6);
    this.scene.add(fill);
    for (const [x, y, z] of [
      [-4.7, 1.9, 0.4],
      [-4.55, 2.25, -2.3],
      [0.5, 2.25, -2.85],
    ]) {
      const lamp = new T.PointLight("#ffb544", 7, 5, 2);
      lamp.position.set(x, y, z);
      this.scene.add(lamp);
    }
    const loader = new GLTFLoader();
    loadMeshyMuseum(loader)
      .then((gltf) => {
        this.room = gltf.scene;
        this.roomMixer = new T.AnimationMixer(this.room);
        gltf.animations.forEach((clip) =>
          this.roomMixer!.clipAction(clip).play(),
        );
        this.configure(this.room);
        this.scene.add(this.room);
        for (const name of [
          "POST_Vault",
          "POST_Loot",
          "POST_Security",
          "POST_Painting",
          "VaultDoorPivot",
          "CameraPivot",
          ...Array.from({ length: 4 }, (_, i) => `PROP_Wealth_${i}`),
        ]) {
          const o = this.room.getObjectByName(name);
          if (o) {
            this.objects[name] = o;
            o.userData.home = o.position.clone();
          }
        }
        this.addMarker("drill", "POST_Vault", new T.Vector3(0, 1.75, 0.15));
        this.addMarker("loot", "POST_Loot", new T.Vector3(0, 2.15, 0.1));
        this.addMarker("secure", "POST_Security", new T.Vector3(0, 3.05, 0.1));
        this.addMarker("painting", "POST_Painting", new T.Vector3(0, 1.8, 0));
        this.ready = true;
        this.update(this.view, this.roster, this.selection);
      })
      .catch(() => this.error("Le musée n’a pas chargé. Recharge la page."));
    loadMeshyCharacters(loader)
      .then((templates) => {
        this.templates = templates;
        this.model = templates[0].scene;
        this.setPlayers(this.roster);
        this.container.dataset.characterClips = "idle,walk,drill";
      })
      .catch(() =>
        this.error("Les personnages n’ont pas chargé. Recharge la page."),
      );
    loader.load(`${import.meta.env.BASE_URL}models/wealth.glb`, (gltf) => {
      this.wealth = new WealthPiles(this.scene, gltf.scene);
      this.update(this.view, this.roster, this.selection);
    });
    const canvas = this.renderer.domElement;
    let down: { x: number; y: number } | null = null;
    canvas.addEventListener(
      "pointerdown",
      (e) => (down = { x: e.clientX, y: e.clientY }),
    );
    canvas.addEventListener("pointerup", (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10)
        return;
      down = null;
      const r = canvas.getBoundingClientRect();
      this.ray.setFromCamera(
        new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          1 - ((e.clientY - r.top) / r.height) * 2,
        ),
        this.camera,
      );
      for (const hit of this.ray.intersectObjects(this.scene.children, true)) {
        const owner =
          hit.instanceId === undefined
            ? undefined
            : hit.object.userData.wealthOwners?.[hit.instanceId];
        if (owner) {
          this.choose(`player:${owner}`);
          return;
        }
        let o: T.Object3D | null = hit.object;
        while (o) {
          if (o.userData.pick) {
            this.choose(o.userData.pick);
            return;
          }
          o = o.parent;
        }
      }
    });
    new ResizeObserver(() => this.resize()).observe(container);
    loader.load(`${import.meta.env.BASE_URL}models/drill.glb`, (gltf) => {
      this.drill = gltf.scene;
      this.actors.forEach((a) => this.attachDrill(a));
    });
    this.resize();
    requestAnimationFrame(this.animate);
  }
  error(message: string) {
    const p = document.createElement("p");
    p.className = "scene-error";
    p.textContent = message;
    this.container.append(p);
  }
  configure(root: T.Object3D) {
    root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }
  addMarker(action: string, name: string, anchor: T.Vector3) {
    const object = this.objects[name];
    if (!object) return;
    const button = document.createElement("button");
    button.className = `post-marker ${action}`;
    button.dataset.post = action;
    button.addEventListener("click", () => this.choose(action));
    this.labels.append(button);
    this.markers.set(action, { button, object, anchor });
    object.userData.pick = action;
  }
  setPlayers(players: Player[]) {
    this.roster = players;
    if (this.templates.length !== 4) return;
    for (const a of this.actors) {
      a.animation.dispose();
      this.scene.remove(a.root);
      a.button.remove();
    }
    this.actors = players.map((p, i) => {
      const template = this.templates[i % 4];
      const root = cloneSkeleton(template.scene);
      clothingVariant(root, i % 4);
      root.position.set(-1.8 + i * 1.4, 0.16, 0.7);
      root.userData.pick = `player:${p.id}`;
      const parts: Record<string, T.Object3D> = {};
      root.traverse((o) => {
        if (["Head", "RightHand", "LeftHand"].includes(o.name))
          parts[o.name] = o;
      });
      const animation = new CharacterAnimation(
        root,
        template.animations,
        i * 0.47,
      );
      this.configure(root);
      this.scene.add(root);
      const button = document.createElement("button");
      button.className = "actor-marker";
      button.dataset.player = p.id;
      button.addEventListener("click", () => this.choose(`player:${p.id}`));
      this.labels.append(button);
      return {
        id: p.id,
        root,
        target: root.position.clone(),
        button,
        parts,
        animation,
      };
    });
    this.actors.forEach((a) => this.attachDrill(a));
    this.update(this.view, players, this.selection);
  }
  attachDrill(a: Actor) {
    if (
      !this.drill ||
      !a.parts.RightHand ||
      a.root.getObjectByName("Held_Drill")
    )
      return;
    const tool = this.drill.clone(true);
    tool.name = "Held_Drill";
    tool.scale.setScalar(0.8);
    tool.visible = false;
    this.configure(tool);
    a.root.add(tool);
  }

  update(v: View | null, players: Player[], selected: Choice | null) {
    this.view = v;
    this.selection = selected;
    if (
      this.roster.map((p) => p.id).join() !== players.map((p) => p.id).join() ||
      (this.model && this.actors.length !== players.length)
    ) {
      this.setPlayers(players);
      return;
    }
    this.roster = players;
    if (this.layoutIndex !== (v?.layout ?? 0) && this.room) {
      this.layoutIndex = v?.layout ?? 0;
      const layout = OFFSETS[this.layoutIndex];
      for (const [key, name] of [["loot", "POST_Loot"]] as const) {
        const obj = this.objects[name];
        if (obj) {
          obj.position.copy(obj.userData.home);
          obj.position.x += layout[key][0];
          obj.position.z += layout[key][1];
        }
      }
    }
    const choosing = !!v && ["promise", "secret"].includes(v.phase),
      reveal = !!v && ["reveal", "debate", "ended"].includes(v.phase);
    for (const [action, m] of this.markers) {
      const promises = players.filter((p) => p.promise?.action === action),
        need = action === "drill" && v ? recommended(v) : 1;
      const covered =
          ["drill", "secure"].includes(action) && promises.length >= need,
        finished = action === "drill" && (v?.vault ?? 0) >= 8;
      const isSelected = selected?.action === action;
      const share = postShare(action as PostAction, promises.length);
      const gain = `${action === "drill" ? "Coffre +2 · " : action === "secure" ? "Alarme −2 · " : ""}<span class="post-reward">${icon("coin")}${promises.length ? share + " / personne" : postReward(action as PostAction) + " à partager"}</span>`;
      m.button.innerHTML = `${icon(isSelected ? "check" : action === "drill" ? "wrench" : action === "secure" ? "laser" : action === "painting" ? "grid" : "lock")}<span><strong>${LABELS[action as keyof typeof LABELS]}${finished ? " · Ouvert" : ""}</strong><small>${gain}</small>${v ? `<em>${["drill", "secure"].includes(action) ? `${covered ? "✓ " : ""}${promises.length}/${need} conseillé` : `${promises.length} annoncé${promises.length > 1 ? "s" : ""}`}</em><span class="post-complices">${promises.length ? promises.map((p) => `<span style="--player:${p.color}"><img src="${import.meta.env.BASE_URL}portraits/${players.indexOf(p)}.png" alt="">${esc(p.name)}</span>`).join("") : "<span>Personne d’annoncé</span>"}</span>` : ""}</span>`;
      m.button.classList.toggle("covered", covered && !finished);
      m.button.classList.toggle("selected", isSelected);
      m.button.classList.toggle("finished", finished);
      m.button.disabled =
        !choosing ||
        (!!v && !legal(v, v.myId, { action: action as Choice["action"] }));
      m.button.setAttribute("aria-pressed", String(isSelected));
      m.button.hidden =
        !v || ["role", "transition", "minigame", "ended"].includes(v.phase);
    }
    this.actors.forEach((a, i) => {
      const p = players[i];
      if (!p) return;
      a.button.style.setProperty("--player", p.color);
      const finding = reveal
        ? v?.report?.findings.find((f) => f.id === p.id)
        : null;
      a.button.innerHTML = `<span class="player-dot">${esc(p.name[0])}</span><span><strong>${esc(p.name)}${v?.myId === p.id ? " · vous" : ""}</strong><small>${p.money} pièces${v?.watched === p.id ? " · Surveillé" : ""}</small>${finding ? `<em>${LABELS[finding.choice.action]} ${finding.success ? "✓" : "×"} · +${finding.gain}${finding.loss ? ` −${finding.loss}` : ""}</em>` : p.promise ? `<em>Promis : ${LABELS[p.promise.action]}${p.promise.target ? ` → ${esc(players.find((x) => x.id === p.promise!.target)?.name)}` : ""}</em>` : ""}</span>`;
      const selectedPlayer =
        v?.phase === "debate" ? v.myVote === p.id : selected?.target === p.id;
      a.button.classList.toggle("selected", selectedPlayer);
      a.button.setAttribute("aria-pressed", String(selectedPlayer));
      a.button.disabled =
        !v ||
        (v.phase === "debate"
          ? v.charges === 0
          : v.phase === "promise" ||
            !choosing ||
            p.id === v.myId ||
            !legal(v, v.myId, { action: "pocket", target: p.id }));
      a.button.hidden =
        !v || ["role", "transition", "minigame", "ended"].includes(v.phase);
      const home = new T.Vector3(-1.8 + i * 1.4, 0.16, 0.7);
      a.target.copy(home);
      if (finding) {
        const key =
          finding.choice.action === "drill"
            ? "POST_Vault"
            : finding.choice.action === "loot"
              ? "POST_Loot"
              : finding.choice.action === "painting"
                ? "POST_Painting"
                : finding.choice.action === "secure"
                  ? "POST_Security"
                  : `PROP_Wealth_${players.findIndex((p) => p.id === finding.choice.target)}`;
        const obj = this.objects[key];
        if (obj) {
          obj.getWorldPosition(a.target);
          const peers = v!.report!.findings.filter(
            (f) => f.choice.action === finding.choice.action,
          );
          const n = peers.findIndex((f) => f.id === a.id);
          a.target.x += (n - (peers.length - 1) / 2) * 0.7;
          a.target.z += finding.choice.action === "painting" ? 2.6 : 1.1;
          if (finding.choice.action === "drill")
            a.target.copy(
              obj.localToWorld(
                new T.Vector3((n - (peers.length - 1) / 2) * 0.7, 0, 1.5),
              ),
            );
          if (finding.choice.action === "secure") a.target.x -= 1.1;
          a.target.y = 0.15;
        }
      }
      const bag = this.objects[`PROP_Wealth_${i}`];
      if (bag) {
        bag.userData.pick = `player:${p.id}`;
        bag.scale.setScalar(selected?.target === p.id ? 1.15 : 1);
      }
    });
    this.wealth?.update(
      players,
      players.map((_, i) => this.objects[`PROP_Wealth_${i}`]),
      selected?.target,
    );
    this.nextLayout = 0;
  }
  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    const ratio = w / h,
      height = Math.max(h < 400 && ratio > 1.5 ? 9.2 : 11, 19 / ratio);
    this.camera.left = (-height * ratio) / 2;
    this.camera.right = (height * ratio) / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.nextLayout = 0;
  }
  transitionFocus(choice: Choice | null) {
    const marker = choice ? this.markers.get(choice.action) : null;
    const actor = choice?.target
      ? this.actors.find((a) => a.id === choice.target)
      : null;
    const purse = choice?.target
      ? this.objects[
          `PROP_Wealth_${this.roster.findIndex((p) => p.id === choice.target)}`
        ]
      : undefined;
    const point = purse
      ? purse.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.6, 0))
      : actor
        ? actor.root
            .getWorldPosition(new T.Vector3())
            .add(new T.Vector3(0, 1.1, 0))
        : marker?.object?.localToWorld(marker.anchor.clone());
    if (!point) return { x: 50, y: 50 };
    point.project(this.camera);
    return {
      x: T.MathUtils.clamp((point.x * 0.5 + 0.5) * 100, 5, 95),
      y: T.MathUtils.clamp((0.5 - point.y * 0.5) * 100, 5, 95),
    };
  }
  layout() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    type Rect = { x: number; y: number; w: number; h: number };
    const placed: Rect[] = [];
    const entries = [...this.markers.values()].map((m) => ({
      button: m.button,
      point: m.object!.localToWorld(m.anchor.clone()),
    }));
    this.actors.forEach((a) =>
      entries.push({
        button: a.button,
        point: a.root.position.clone().add(new T.Vector3(0, 1.85, 0)),
      }),
    );
    while (this.lines.length < entries.length) {
      const line = document.createElement("div");
      line.className = "marker-leader";
      this.labels.prepend(line);
      this.lines.push(line);
    }
    this.lines.forEach((line) => (line.hidden = true));
    for (const [index, { button, point }] of entries.entries()) {
      if (button.hidden) continue;
      const p = point.project(this.camera),
        bw = button.offsetWidth,
        bh = button.offsetHeight;
      const sx = (p.x * 0.5 + 0.5) * w,
        sy = (-p.y * 0.5 + 0.5) * h;
      const wide = w / h > 1.7 && h < 420;
      const idealX = wide
        ? index < 4
          ? ((index + 0.5) / 4) * w - bw / 2
          : ((index - 4 + 0.5) * w) / 4 - bw / 2
        : sx - bw / 2;
      const idealY = wide ? (index < 4 ? 10 : h - bh - 10) : sy - bh;
      const x = Math.max(6, Math.min(w - bw - 6, idealX)),
        y = Math.max(6, Math.min(h - bh - 6, idealY));
      let best: Rect | null = null,
        score = Infinity;
      const intersects = (a: Rect, b: Rect) =>
        a.x < b.x + b.w + 7 &&
        a.x + a.w + 7 > b.x &&
        a.y < b.y + b.h + 7 &&
        a.y + a.h + 7 > b.y;
      const home = { x, y, w: bw, h: bh };
      if (!placed.some((r) => intersects(home, r))) best = home;
      else
        for (let cy = 6; cy <= h - bh - 6; cy += 8)
          for (let cx = 6; cx <= w - bw - 6; cx += 8) {
            const rect = { x: cx, y: cy, w: bw, h: bh },
              d = (cx - x) ** 2 + (cy - y) ** 2;
            if (d < score && !placed.some((r) => intersects(rect, r))) {
              best = rect;
              score = d;
            }
          }
      const rect = best ?? home;
      placed.push(rect);
      button.style.transform = `translate(${rect.x}px,${rect.y}px)`;
      const line = this.lines[index],
        cx = rect.x + bw / 2,
        cy = rect.y + bh / 2,
        dx = sx - cx,
        dy = sy - cy;
      line.hidden = false;
      line.style.left = `${cx}px`;
      line.style.top = `${cy}px`;
      line.style.width = `${Math.hypot(dx, dy)}px`;
      line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    }
  }
  animate = () => {
    requestAnimationFrame(this.animate);
    if (document.hidden || this.suspended) {
      this.clock.getDelta();
      return;
    }
    const dt = Math.min(this.clock.getDelta(), 0.05),
      t = this.clock.elapsedTime;
    this.actors.forEach((a, i) => {
      const walking = a.root.position.distanceTo(a.target) > 0.15;
      a.root.position.lerp(
        a.target,
        this.reduced.matches ? 1 : Math.min(1, dt * 4),
      );
      const finding = this.view?.report?.findings.find((f) => f.id === a.id);
      const clip: Clip = walking
        ? "walk"
        : this.view?.phase === "reveal" && finding?.choice.action === "drill"
          ? "drill"
          : "idle";
      a.animation.update(clip, dt, this.reduced.matches);
      a.root.userData.activeClip = clip;
      const tool = a.root.getObjectByName("Held_Drill");
      if (tool) {
        tool.visible = clip === "drill" && !this.reduced.matches;
        if (tool.visible && a.parts.RightHand) {
          a.root.updateMatrixWorld(true);
          a.parts.RightHand.getWorldPosition(tool.position);
          a.root.worldToLocal(tool.position);
          tool.position.y += 0.025;
        }
      }
      let yaw = 0;
      if (walking)
        yaw = Math.atan2(
          a.target.x - a.root.position.x,
          a.target.z - a.root.position.z,
        );
      else if (this.view?.phase === "reveal" && finding?.success) {
        const key =
          finding.choice.action === "drill"
            ? "POST_Vault"
            : finding.choice.action === "secure"
              ? "POST_Security"
              : finding.choice.action === "loot"
                ? "POST_Loot"
                : finding.choice.action === "painting"
                  ? "POST_Painting"
                  : `PROP_Wealth_${this.roster.findIndex((p) => p.id === finding.choice.target)}`;
        const aim = this.objects[key]?.getWorldPosition(new T.Vector3());
        if (aim)
          yaw = Math.atan2(
            aim.x - a.root.position.x,
            aim.z - a.root.position.z,
          );
      }
      a.root.rotation.y +=
        Math.atan2(
          Math.sin(yaw - a.root.rotation.y),
          Math.cos(yaw - a.root.rotation.y),
        ) * (this.reduced.matches ? 1 : Math.min(1, dt * 6));
    });
    const door = this.objects.VaultDoorPivot;
    if (door)
      door.rotation.y = T.MathUtils.lerp(
        door.rotation.y,
        (this.view?.vault ?? 0) >= 8 ? (door.userData.openAngle ?? -1.9) : 0,
        this.reduced.matches ? 1 : dt * 3,
      );
    const cam = this.objects.CameraPivot;
    if (cam && !this.reduced.matches) cam.rotation.y = Math.sin(t * 0.45) * 0.3;
    this.roomMixer?.update(this.reduced.matches ? 0 : dt);
    this.wealth?.animate(dt, this.reduced.matches);
    this.container.dataset.wealthCoins = JSON.stringify(
      this.wealth?.shown.map((n) => Math.round(n * 100) / 100) ?? [],
    );
    this.container.dataset.wealthUnits = JSON.stringify(
      this.wealth?.counts ?? [],
    );
    this.renderer.render(this.scene, this.camera);
    if (t > this.nextLayout) {
      this.layout();
      this.nextLayout = t + 0.15;
    }
    this.frames++;
    if (t - this.lastStats > 2) {
      this.container.dataset.triangles = String(
        this.renderer.info.render.triangles,
      );
      this.container.dataset.calls = String(this.renderer.info.render.calls);
      this.container.dataset.fps = String(
        Math.round(this.frames / (t - this.lastStats)),
      );
      this.frames = 0;
      this.lastStats = t;
    }
  };
}
