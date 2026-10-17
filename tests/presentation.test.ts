import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { WealthPiles } from "../src/wealth";
import { player, createGame, resolve, publicView } from "../src/engine";
import { report } from "../src/views";
test("actual authored wealth units grow and shrink, keeping instanced draw batches bounded", async () => {
  const b = await readFile("public/models/wealth.glb");
  const asset = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
  const scene = new T.Scene(),
    wealth = new WealthPiles(scene, asset.scene),
    players = [0, 3, 12, 36].map((money, i) => ({
      ...player(String(i), "P" + i, i),
      money,
    }));
  const anchors = players.map((_, i) => {
    const o = new T.Group();
    o.position.x = i * 2;
    scene.add(o);
    return o;
  });
  scene.updateMatrixWorld(true);
  wealth.update(players, anchors);
  wealth.animate(1, true);
  assert.deepEqual(wealth.counts, [0, 1, 4, 12]);
  assert.ok(wealth.batches.length <= 6);
  players[3].money = 3;
  players[1].money = 30;
  wealth.update(players, anchors);
  wealth.animate(0.1, false);
  assert.ok(wealth.shown[3] < 36 && wealth.shown[3] > 3);
  assert.ok(wealth.shown[1] > 3);
  for (let i = 0; i < 100; i++) wealth.animate(1 / 30, false);
  assert.deepEqual(wealth.counts, [0, 10, 4, 1]);
  assert.ok(wealth.batches.every((b) => b.mesh.count <= 48));
});
test("quiet reports contain actions and money but no alarm explanation; ringing reports name the players work clearly", () => {
  const make = () =>
    createGame(
      [0, 1, 2, 3].map((i) => player(String(i), "P" + i, i)),
      1,
      0,
      () => 0.99,
    );
  const g = make();
  g.choices = {
    "0": { action: "drill" },
    "1": { action: "secure" },
    "2": { action: "loot" },
    "3": { action: "painting" },
  };
  g.successes = { "0": true, "1": true, "2": true, "3": true };
  resolve(g);
  g.phase = "reveal";
  const quiet = report(publicView(g, "0"));
  assert.ok(!quiet.includes("alarm-explanation"));
  assert.ok(!quiet.includes("Pourquoi l’alarme"));
  assert.ok(quiet.includes("Résultats de la manche"));
  const h = make();
  h.choices = g.choices;
  h.successes = { "0": false, "1": false, "2": true, "3": true };
  resolve(h);
  h.phase = "reveal";
  const loud = report(publicView(h, "0"));
  assert.ok(loud.includes("alarm-explanation"));
  assert.ok(loud.includes("Alarmes désactivées"));
  assert.ok(!loud.includes("sécurités réussies"));
});
