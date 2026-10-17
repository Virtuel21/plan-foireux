import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Player } from "./engine";
const MAX_UNITS = 12;
type Batch = { mesh: T.InstancedMesh; kind: "note" | "gold" };
/** Shared Money Tour units, batched across all four purses. No per-note draw calls. */
export class WealthPiles {
  batches: Batch[] = [];
  shown: number[] = [];
  targets: number[] = [];
  owners: string[] = [];
  anchors: (T.Object3D | undefined)[] = [];
  selected: string | undefined;
  counts: number[] = [];
  constructor(
    public scene: T.Scene,
    root: T.Object3D,
  ) {
    root.updateMatrixWorld(true);
    for (const [name, kind] of [
      ["banknote_bundle", "note"],
      ["gold_bar", "gold"],
    ] as const) {
      const source = root.getObjectByName(name);
      if (!source) throw Error("Modèle de butin incomplet");
      const inverse = source.matrixWorld.clone().invert(),
        groups = new Map<T.Material, T.BufferGeometry[]>();
      source.traverse((o) => {
        if (!(o instanceof T.Mesh) || Array.isArray(o.material)) return;
        const g = o.geometry
          .clone()
          .applyMatrix4(
            new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld),
          );
        g.deleteAttribute("uv");
        const list = groups.get(o.material) || [];
        list.push(g);
        groups.set(o.material, list);
      });
      for (const [material, parts] of groups) {
        const geometry = mergeGeometries(parts);
        parts.forEach((p) => p.dispose());
        if (!geometry) continue;
        const mesh = new T.InstancedMesh(geometry, material, MAX_UNITS * 4);
        mesh.count = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.name = `Wealth_${kind}`;
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        this.scene.add(mesh);
        this.batches.push({ mesh, kind });
      }
    }
  }
  update(
    players: Player[],
    anchors: (T.Object3D | undefined)[],
    selected?: string,
  ) {
    this.owners = players.map((p) => p.id);
    this.targets = players.map((p) => p.money);
    this.anchors = anchors;
    this.selected = selected;
    players.forEach((p, i) => (this.shown[i] ??= p.money));
  }
  animate(dt: number, reduced: boolean) {
    this.shown = this.targets.map((v, i) => {
      const current = this.shown[i] ?? v;
      return reduced || Math.abs(v - current) < 0.015
        ? v
        : T.MathUtils.lerp(current, v, Math.min(1, dt * 6));
    });
    const units: { kind: "note" | "gold"; matrix: T.Matrix4; owner: string }[] =
      [];
    this.counts = [];
    this.owners.forEach((owner, i) => {
      const base = this.anchors[i]?.getWorldPosition(new T.Vector3());
      if (!base) {
        this.counts[i] = 0;
        return;
      }
      const amount = this.shown[i] ?? 0,
        count = Math.min(MAX_UNITS, Math.ceil(amount / 3));
      this.counts[i] = count;
      for (let k = 0; k < count; k++) {
        const fraction =
          k === count - 1 && amount < MAX_UNITS * 3
            ? T.MathUtils.clamp((amount - k * 3) / 3, 0.04, 1)
            : 1;
        const scale = 0.56 * (owner === this.selected ? 1.12 : 1),
          height = 1 + Math.max(0, amount - 36) / 65;
        const position = base
          .clone()
          .add(
            new T.Vector3(
              ((k % 3) - 1) * 0.41,
              0.29 + Math.floor(k / 6) * 0.14 * height,
              Math.floor((k % 6) / 3) * 0.26 - 0.13,
            ),
          );
        const matrix = new T.Matrix4().compose(
          position,
          new T.Quaternion().setFromAxisAngle(
            new T.Vector3(0, 1, 0),
            k % 2 ? 0.07 : -0.04,
          ),
          new T.Vector3(scale, scale * height * fraction, scale),
        );
        units.push({ kind: k % 3 === 2 ? "gold" : "note", matrix, owner });
      }
    });
    for (const { mesh, kind } of this.batches) {
      const selected = units.filter((u) => u.kind === kind);
      mesh.count = selected.length;
      mesh.userData.wealthOwners = selected.map((u) => u.owner);
      selected.forEach((u, i) => mesh.setMatrixAt(i, u.matrix));
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
