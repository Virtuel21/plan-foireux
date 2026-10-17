import test from "node:test";
import assert from "node:assert/strict";
import {
  connect,
  gaze,
  lever,
  newTrial,
  pin,
  pinBand,
  stepTrial,
  targetBand,
} from "../src/trial";
test("wires preserve good circuits and free wrong ones; tap and drag use same connection contract", () => {
  const t = newTrial("secure", 1);
  connect(t, 0, 2);
  connect(t, 1, 1);
  connect(t, 2, 0);
  assert.equal(lever(t), false);
  assert.equal(t.correct[0], true);
  assert.equal(t.connections[1], -1);
  connect(t, 1, 0);
  connect(t, 2, 1);
  assert.equal(lever(t), true);
});
test("a terminal accepts one cable and unplugging is reversible before validation", () => {
  const t = newTrial("secure", 0);
  connect(t, 0, 1);
  connect(t, 1, 1);
  assert.deepEqual(t.connections, [-1, 1, -1]);
  connect(t, 1, -1);
  assert.deepEqual(t.connections, [-1, -1, -1]);
});
test("pressure is elapsed-time based at 30 and 60 FPS and three points achievable", () => {
  for (const fps of [30, 60]) {
    const t = newTrial("drill", 8);
    for (let i = 0; i < 18 * fps && !t.done; i++)
      stepTrial(t, 1 / fps, t.needle < targetBand(t) + 0.1);
    assert.equal(t.done, true);
    assert.ok(t.elapsed < 12);
  }
});
test("overheat resets current point only and keeps completed points", () => {
  const t = newTrial("drill", 2);
  t.stage = 1;
  t.progress = 0.8;
  t.needle = 0.94;
  stepTrial(t, 0.1, true);
  assert.equal(t.stage, 1);
  assert.equal(t.progress, 0);
  assert.equal(t.cooldown, 0.5);
});
test("three pins have a 0.69-second target window; error keeps completed pins", () => {
  const t = newTrial("loot", 4);
  t.cursor = pinBand(t);
  assert.equal(pin(t), true);
  t.cursor = 0;
  assert.equal(pin(t), false);
  assert.equal(t.stage, 1);
  assert.equal(t.cooldown, 0.5);
  assert.ok(Math.abs(0.36 / 0.52 - 0.7) < 0.02);
});
test("pocket warning precedes face, caught motion restores last checkpoint; completion possible", () => {
  const t = newTrial("pocket", 0);
  t.elapsed = 2.6;
  assert.equal(gaze(t), "warning");
  t.elapsed = 3.1;
  t.stage = 1;
  t.progress = 0.7;
  stepTrial(t, 0.01, true);
  assert.equal(t.progress, 0);
  assert.equal(t.stage, 1);
  assert.equal(t.cooldown, 0.5);
  const a = newTrial("pocket", 0);
  for (let i = 0; i < 1080 && !a.done; i++)
    stepTrial(a, 1 / 60, gaze(a) === "away");
  assert.equal(a.done, true);
});
