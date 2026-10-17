import test from "node:test";
import assert from "node:assert/strict";
import {
  newPinTrial,
  pin,
  pinBand,
  stepPinTrial,
} from "../src/archive/pin-trial";

test("archived pins preserve their narrow timing window and completed pins after mistakes", () => {
  const t = newPinTrial(4);
  t.cursor = pinBand(t);
  assert.equal(pin(t), true);
  t.cursor = 0;
  assert.equal(pin(t), false);
  assert.equal(t.stage, 1);
  assert.equal(t.cooldown, 0.5);
  assert.ok(0.15 / 0.76 < 0.2);
  assert.equal(pin(t), false, "cooldown blocks another attempt");
});
test("archived locker mechanics remain playable independently at 30 and 60 FPS", () => {
  for (const fps of [30, 60]) {
    const t = newPinTrial(4);
    for (let i = 0; i < fps * 18 && !t.done; i++) {
      stepPinTrial(t, 1 / fps);
      if (Math.abs(t.cursor - pinBand(t)) <= 0.06) pin(t);
    }
    assert.equal(t.done, true);
    assert.equal(t.stage, 3);
    const complete = structuredClone(t);
    stepPinTrial(t, 0.1);
    assert.equal(pin(t), false);
    assert.deepEqual(t, complete);
  }
});
