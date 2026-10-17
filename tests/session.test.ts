import test from "node:test";
import assert from "node:assert/strict";
import { HostRoom } from "../src/host";
import { newTrial } from "../src/trial";
const token = (i: number) => `test-token-unique-${i}`;
function room() {
  const r = new HostRoom("host", "Julien");
  for (let i = 1; i < 4; i++)
    r.join(token(i), ["Léa", "Sarah", "Max"][i - 1], 0);
  r.players.forEach((p) => r.ready(p.id, true));
  assert.ok(r.start("host", 0));
  return r;
}
test("only the host starts; four ready online humans are required", () => {
  const r = new HostRoom("host", "Julien");
  assert.equal(r.start("host"), false);
  for (let i = 1; i < 4; i++) r.join(token(i), "Complice");
  assert.throws(() => r.join(token(9), "Cinquième"));
  r.players.forEach((p) => r.ready(p.id, true));
  assert.equal(r.start(r.players[1].id), false);
  r.offline(r.players[1].id);
  assert.equal(r.start("host"), false);
  r.join(token(1), "Léa");
  assert.ok(r.start("host"));
});
test("the host sends each guest only its own role, choice, progress and result", () => {
  const r = room(),
    g = r.game!,
    a = r.players[1].id,
    b = r.players[2].id;
  g.phase = "secret";
  g.deadline = 100000;
  const before = r.view(b, 0);
  assert.ok(
    r.command(
      a,
      { type: "choose", choice: { action: "loot" }, turn: g.turn },
      1,
    ),
  );
  assert.deepEqual(r.view(b, 0), before);
  assert.equal(r.view(a, 0)?.myChoice?.action, "loot");
  for (const p of r.players)
    for (const k of [
      "roles",
      "choices",
      "trials",
      "jams",
      "successes",
      "votes",
    ])
      assert.equal(k in r.view(p.id, 0)!, false);
});
test("guest token restores the same seat, private state and paused deadline; unknown token cannot join an active game", () => {
  const r = room(),
    g = r.game!,
    id = r.players[1].id;
  g.phase = "secret";
  g.deadline = 100000;
  r.command(
    id,
    { type: "choose", choice: { action: "loot" }, turn: g.turn },
    1,
  );
  r.offline(id, 2000);
  r.tick(80000);
  assert.equal(g.phase, "secret");
  assert.equal(r.join(token(1), "new name", 32000), id);
  assert.equal(g.deadline, 130000);
  assert.equal(r.view(id)?.myChoice?.action, "loot");
  assert.throws(() => r.join(token(7), "Intrus"));
});
test("host reload snapshot keeps secrets locally and pauses until all guests rejoin", () => {
  const r = room();
  r.game!.phase = "secret";
  r.game!.deadline = Date.now() + 12000;
  const roles = structuredClone(r.game!.roles);
  r.players.forEach((p) => r.offline(p.id));
  const restored = HostRoom.restore(r.serialize());
  assert.deepEqual(restored.game!.roles, roles);
  assert.notEqual(restored.game!.pausedAt, null);
  [1, 2, 3].forEach((i) => restored.join(token(i), ""));
  assert.equal(restored.game!.pausedAt, null);
  assert.equal(restored.players.length, 4);
});
test("legacy host saves retain theft history and statue checkpoints while adding missing noise", () => {
  const r = room(),
    id = r.players[1].id;
  r.game!.phase = "minigame";
  r.game!.deadline = Date.now() + 18000;
  r.game!.lastThefts[id] = r.players[2].id;
  r.game!.trials[id] = newTrial("loot", 9);
  r.game!.trials[id].stage = 1;
  r.game!.trials[id].progress = 0.3;
  delete r.game!.trials[id].statueNoise;
  const restored = HostRoom.restore(r.serialize());
  assert.equal(restored.game!.trials[id].statueNoise, 0);
  assert.equal(restored.game!.trials[id].stage, 1);
  assert.equal(restored.game!.trials[id].progress, 0.3);
  assert.equal(restored.view(id)?.myLastTheft, r.players[2].id);
  assert.equal(restored.view("host")?.myLastTheft, null);
  assert.equal(Object.hasOwn(restored.view("host")!, "lastThefts"), false);
});
test("expired disconnected peer finishes without ranking, replay preserves room roster", () => {
  const r = room();
  r.offline(r.players[1].id, 1000);
  r.tick(91000);
  assert.equal(r.game!.result!.kind, "aborted");
  const ids = r.players.map((p) => p.id);
  r.lobby(r.players[1].id);
  assert.ok(r.game);
  r.lobby("host");
  assert.equal(r.game, null);
  assert.deepEqual(
    r.players.map((p) => p.id),
    ids,
  );
  assert.ok(r.players.every((p) => !p.ready));
});
