import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { WealthPiles } from "../src/wealth";
import { player } from "../src/engine";

test("cash units rest on the measured anchor, independent of source origin", () => {
  const source = new T.Group();
  for (const name of ["banknote_bundle", "gold_bar"]) {
    const unit = new T.Group();
    unit.name = name;
    const mesh = new T.Mesh(
      new T.BoxGeometry(0.7, name === "gold_bar" ? 0.19 : 0.24, 0.39),
      new T.MeshStandardMaterial(),
    );
    mesh.position.set(0.35, 0.53, -0.2);
    unit.add(mesh);
    source.add(unit);
  }
  const scene = new T.Scene(),
    anchor = new T.Object3D();
  anchor.position.set(2, 0.153, 2.65);
  scene.add(anchor);
  const piles = new WealthPiles(scene, source);
  for (const amount of [1, 3, 18, 36, 90, 180]) {
    const owner = { ...player("p", "Julien", 0), money: amount };
    piles.update([owner], [anchor], "p");
    piles.animate(1, true);
    const bounds = new T.Box3();
    for (const { mesh } of piles.batches) {
      mesh.geometry.computeBoundingBox();
      for (let i = 0; i < mesh.count; i++) {
        const matrix = new T.Matrix4();
        mesh.getMatrixAt(i, matrix);
        bounds.union(mesh.geometry.boundingBox!.clone().applyMatrix4(matrix));
      }
    }
    assert.ok(Math.abs(bounds.min.y - (anchor.position.y + 0.008)) < 1e-7);
    assert.ok(bounds.max.x - bounds.min.x < 1.05, "piles stay in their lane");
    assert.ok(bounds.max.z - bounds.min.z < 1, "piles clear the decor");
    assert.ok(
      bounds.max.y - anchor.position.y < 1,
      "high wallets stay compact",
    );
    if (amount >= 36)
      for (const { mesh } of piles.batches) {
        const lower = new T.Matrix4(),
          upper = new T.Matrix4();
        mesh.getMatrixAt(0, lower);
        mesh.getMatrixAt(mesh.count / 2, upper);
        const lowerBounds = mesh.geometry
            .boundingBox!.clone()
            .applyMatrix4(lower),
          upperBounds = mesh.geometry.boundingBox!.clone().applyMatrix4(upper);
        assert.ok(
          Math.abs(lowerBounds.max.y - upperBounds.min.y) < 1e-7,
          "each upper unit rests on the matching lower unit",
        );
      }
  }
});
