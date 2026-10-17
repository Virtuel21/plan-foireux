import test from "node:test";
import assert from "node:assert/strict";
import { createGame, player, resolve } from "../src/engine";
test("betrayal compares action and target, ignores property order and absent promises", () => {
  const g = createGame(
    [0, 1, 2, 3].map((i) => player(String(i), "Complice", i)),
    1,
    0,
    () => 0.9,
  );
  g.players[0].promise = { action: "pocket", target: "1" };
  g.choices["0"] = { target: "1", action: "pocket" };
  g.choices["1"] = { action: "secure" };
  const r = resolve(g);
  assert.equal(r.findings[0].betrayed, false);
  assert.equal(r.findings[1].betrayed, false);
});
