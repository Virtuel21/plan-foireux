import test from "node:test";
import assert from "node:assert/strict";
import {
  connect,
  gaze,
  lever,
  newTrial,
  stepTrial,
  normalizeTrial,
  statueTarget,
  statueBand,
  statueNoise,
  statueBalanced,
  supportStatue,
  targetBand,
  terminalId,
  radioTarget,
  radioSignal,
  cutPath,
  cutAt,
  cutAccuracy,
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
  assert.equal(lever(t), false);
  assert.equal(t.panel, 1);
  for (let i = 0; i < 3; i++)
    connect(
      t,
      i,
      [0, 1, 2].find((j) => terminalId(t, j) === i)!,
    );
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
test("statue requires carrying through three different supports and works at 30 and 60 FPS", () => {
  for (const fps of [30, 60]) {
    const t = newTrial("loot", 4),
      targets: number[] = [];
    for (let i = 0; i < fps * 18 && !t.done; i++) {
      targets[t.stage] = statueTarget(t);
      supportStatue(t, statueTarget(t));
      stepTrial(t, 1 / fps, true);
    }
    assert.equal(t.done, true);
    assert.equal(t.stage, 3);
    assert.ok(t.elapsed > 4.4 && t.elapsed < 5);
    assert.ok(targets[1] - targets[0] > 0.2);
    assert.ok(targets[1] - targets[2] > 0.1);
    assert.equal(t.cursor, 0, "the statue has no timed locker cursor");
    assert.equal(statueNoise(t), 0);
  }
  const fixed = newTrial("loot", 4);
  for (let i = 0; i < 60 * 18; i++) stepTrial(fixed, 1 / 60, true);
  assert.equal(fixed.done, false);
  assert.equal(
    fixed.stage,
    0,
    "holding at a fixed support cannot complete the statue",
  );
});
test("statue can be steadied before carrying; noise resets only the current checkpoint", () => {
  const t = newTrial("loot", 2);
  t.stage = 1;
  t.progress = 0.8;
  t.statueNoise = 0.99;
  supportStatue(t, 0);
  stepTrial(t, 0.1, true);
  assert.equal(t.stage, 1);
  assert.equal(t.progress, 0);
  assert.equal(t.cooldown, 0.5);
  assert.equal(t.statueNoise, 0.25);
  for (let i = 0; i < 8; i++) {
    supportStatue(t, statueTarget(t));
    stepTrial(t, 0.1, false);
  }
  assert.equal(t.stage, 1);
  assert.equal(t.progress, 0);
  assert.equal(t.statueNoise, 0);
  assert.equal(statueBalanced(t), true);
  assert.equal(statueBand(t), 0.2);
});
test("statue state survives JSON restoration and legacy saves receive a zero noise default", () => {
  const t = newTrial("loot", 9);
  t.stage = 1;
  t.progress = 0.3;
  t.statueNoise = 0.2;
  const restored = JSON.parse(JSON.stringify(t));
  for (let i = 0; i < 120; i++)
    for (const trial of [t, restored]) {
      supportStatue(trial, statueTarget(trial));
      stepTrial(trial, 1 / 60, true);
    }
  assert.deepEqual(restored, t);
  const legacy = newTrial("loot", 3);
  legacy.stage = 1;
  legacy.progress = 0.4;
  delete legacy.statueNoise;
  assert.equal(statueNoise(legacy), 0);
  normalizeTrial(legacy);
  assert.equal(legacy.statueNoise, 0);
  assert.equal(legacy.stage, 1);
  assert.equal(legacy.progress, 0.4);
});
test("statue support rejects invalid gestures and clamps the usable support range", () => {
  const t = newTrial("loot", 1);
  for (const input of [NaN, Infinity, -Infinity])
    assert.equal(supportStatue(t, input), false);
  assert.equal(t.needle, 0.5);
  supportStatue(t, -1);
  assert.equal(t.needle, 0);
  supportStatue(t, 2);
  assert.equal(t.needle, 1);
  t.done = true;
  assert.equal(supportStatue(t, 0.3), false);
  assert.equal(supportStatue(newTrial("drill", 1), 0.3), false);
});
test("pocket warning precedes face, caught motion restores last checkpoint; completion possible", () => {
  const t = newTrial("pocket", 0);
  t.elapsed = 1.8;
  assert.equal(gaze(t), "warning");
  t.elapsed = 2.2;
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

test("radio needs three distinct frequencies and 0.85 seconds of stable green each", () => {
  const t = newTrial("radio", 18);
  assert.equal(radioSignal(t), "red");
  for (let stage = 0; stage < 3; stage++) {
    t.needle = radioTarget(t);
    stepTrial(t, 0.1, false);
    assert.equal(t.done, false);
    for (let i = 0; i < 8; i++) stepTrial(t, 0.1, false);
    assert.equal(t.stage, stage + 1);
  }
  assert.equal(t.done, true);
  const h = newTrial("radio", 1);
  h.needle = radioTarget(h);
  stepTrial(h, 0.1, false);
  h.needle = 0;
  stepTrial(h, 0.1, false);
  assert.equal(h.progress, 0);
});
test("cutting must follow the complete ordered outline with 70 percent accuracy", () => {
  const t = newTrial("painting", 5);
  const path = cutPath(t);
  assert.equal(cutAt(t, ...path[40]), false);
  assert.equal(t.cutIndex, 0);
  for (const point of path) cutAt(t, ...point);
  assert.equal(t.done, true);
  assert.ok(cutAccuracy(t) >= 70);
  const bad = newTrial("painting", 5);
  for (let i = 0; i < 120; i++) cutAt(bad, 0, 0);
  for (const point of path) cutAt(bad, ...point);
  assert.equal(bad.cutIndex, 81);
  assert.equal(bad.done, false);
  assert.ok(cutAccuracy(bad) < 70);
});

test("cutting accepts thumb drift, backtracking and faster samples inside a wider corridor", () => {
  const t = newTrial("painting", 4),
    path = cutPath(t);
  cutAt(t, ...path[0]);
  for (let i = 1; i < path.length; i += 2) {
    const [x, y] = path[i];
    cutAt(t, x + 0.045 * Math.sin(i), y + 0.045 * Math.cos(i));
    if (i % 7 === 0) cutAt(t, x, y);
  }
  cutAt(t, ...path[80]);
  assert.equal(t.done, true);
  assert.ok(cutAccuracy(t) >= 70);
});
test("repeat theft is much harder but still possible with near-perfect timing", () => {
  const normal = newTrial("pocket", 0),
    hard = newTrial("pocket", 0, 2);
  for (let i = 0; i < 1080; i++) {
    if (!normal.done) stepTrial(normal, 1 / 60, gaze(normal) === "away");
    if (!hard.done) stepTrial(hard, 1 / 60, gaze(hard) === "away");
  }
  assert.equal(normal.done, true);
  assert.equal(hard.done, true);
  assert.ok(hard.elapsed > normal.elapsed * 2);
  const caught = newTrial("pocket", 0, 2);
  caught.elapsed = 1.1;
  caught.stage = 2;
  caught.progress = 0.9;
  stepTrial(caught, 0.01, true);
  assert.equal(caught.stage, 1);
  assert.equal(caught.progress, 0);
});
test("every hard theft starting offset remains achievable at both 30 and 60 FPS", () => {
  for (const fps of [30, 60])
    for (let seed = 0; seed < 7; seed++) {
      const t = newTrial("pocket", seed, 2);
      for (let i = 0; i < fps * 18 && !t.done; i++)
        stepTrial(t, 1 / fps, gaze(t) === "away");
      assert.equal(t.done, true, `seed ${seed}, ${fps} FPS`);
      assert.ok(t.elapsed > 12);
    }
});
