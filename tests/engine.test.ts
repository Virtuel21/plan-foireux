import test from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  apply,
  CONFIG,
  createGame,
  legal,
  player,
  publicView,
  recommended,
  resolve,
  setOnline,
  type Action,
  type Choice,
  type Game,
} from "../src/engine";
const players = () =>
  ["Julien", "Léa", "Sarah", "Max"].map((n, i) => player(String(i), n, i));
const game = () => createGame(players(), 143, 0, () => 0.99);
function phase(g: Game, name: Game["phase"]) {
  g.phase = name;
  g.phaseStarted = 0;
  g.deadline = 100000;
}
function round(
  g: Game,
  actions: (Action | Choice)[],
  success = [true, true, true, true],
  jam = true,
) {
  g.choices = Object.fromEntries(
    actions.map((a, i) => [
      String(i),
      typeof a === "string" ? { action: a } : a,
    ]),
  );
  g.successes = Object.fromEntries(success.map((s, i) => [String(i), s]));
  g.jams = { "3": jam };
  g.wallets = Object.fromEntries(g.players.map((p) => [p.id, p.money]));
  return resolve(g);
}
function next(g: Game, watched?: string) {
  phase(g, "reveal");
  advance(g, g.deadline);
  if (g.phase === "ended") return;
  if (watched)
    g.votes = { "0": watched, "1": watched, "2": watched, "3": "pass" };
  advance(g, g.deadline);
}
test("four seats, one independently drawn FBI; public layout seed does not draw roles", () => {
  const a = createGame(players(), 1, 0, () => 0),
    b = createGame(players(), 1, 0, () => 0.9);
  assert.equal(a.layout, b.layout);
  assert.notDeepEqual(a.roles, b.roles);
  assert.equal(Object.values(a.roles).filter((r) => r === "agent").length, 1);
  assert.throws(() => createGame(players().slice(1), 1));
  assert.throws(() => createGame([players()[0], ...players().slice(0, 3)], 1));
});
test("private changes and early success do not alter another client projection", () => {
  const g = game();
  phase(g, "secret");
  const before = publicView(g, "0", 0);
  assert.equal(
    apply(
      g,
      "3",
      { type: "choose", choice: { action: "loot" }, turn: g.turn },
      1,
    ),
    true,
  );
  apply(g, "3", { type: "jam", enabled: true, turn: g.turn }, 1);
  assert.deepEqual(publicView(g, "0", 0), before);
  phase(g, "minigame");
  const mini = publicView(g, "0", 0);
  apply(g, "3", { type: "result", success: true, turn: g.turn }, 1);
  assert.deepEqual(publicView(g, "0", 0), mini);
  for (const secret of [
    "roles",
    "choices",
    "jams",
    "successes",
    "votes",
    "wallets",
  ])
    assert.equal(Object.hasOwn(mini, secret), false);
});
test("promises and secret choices stay editable until their full deadline", () => {
  const g = game();
  phase(g, "promise");
  assert.ok(
    apply(
      g,
      "0",
      { type: "promise", choice: { action: "drill" }, turn: g.turn },
      1,
    ),
  );
  assert.ok(
    apply(
      g,
      "0",
      { type: "promise", choice: { action: "secure" }, turn: g.turn },
      2,
    ),
  );
  advance(g, 99999);
  assert.equal(g.phase, "promise");
  assert.equal(
    apply(
      g,
      "0",
      { type: "promise", choice: { action: "loot" }, turn: g.turn },
      100000,
    ),
    false,
  );
  advance(g, 100000);
  assert.equal(g.phase, "secret");
  assert.ok(
    apply(
      g,
      "0",
      { type: "choose", choice: { action: "loot" }, turn: g.turn },
      100001,
    ),
  );
  assert.equal(g.players[0].promise?.action, "secure");
});
test("normalization falls back to a legal promise, otherwise security; transition precedes 18 seconds", () => {
  const g = game();
  phase(g, "secret");
  g.players[0].promise = { action: "drill" };
  g.vault = 8;
  g.players[1].promise = { action: "loot" };
  advance(g, 100000);
  assert.equal(g.phase, "transition");
  assert.equal(g.choices["0"].action, "secure");
  assert.equal(g.choices["1"].action, "loot");
  assert.equal(g.deadline, 100600);
  advance(g, 100600);
  assert.equal(g.deadline, 118600);
  assert.equal(g.phase, "minigame");
});
test("alarm adds time and each effective failure, then subtracts all security simultaneously", () => {
  const g = game();
  g.alarm = 4;
  const r = round(
    g,
    ["drill", "secure", "loot", "painting"],
    [false, true, true, true],
    false,
  );
  assert.equal(g.alarm, 4);
  assert.equal(r.failures, 1);
  assert.equal(r.security, 1);
  assert.equal(r.trace, null);
  assert.equal(r.jam, 0);
  const h = game();
  h.alarm = 4;
  round(
    h,
    ["secure", "secure", "loot", "painting"],
    [true, true, false, false],
    false,
  );
  assert.equal(h.alarm, 3);
});
test("simultaneous drillers share twelve even at the cap; completed vault never recedes", () => {
  const g = game();
  g.vault = 6;
  round(g, ["drill", "drill", "drill", "drill"]);
  assert.equal(g.vault, 8);
  assert.deepEqual(
    g.players.map((p) => p.money),
    [3, 3, 3, 3],
  );
  assert.equal(legal(g, "0", { action: "drill" }), false);
});
test("each of the four posts pays 12, 6, 4, 3 based on attendance; failed shares are lost", () => {
  for (const action of ["drill", "secure", "loot", "painting"] as const) {
    for (let n = 1; n <= 4; n++) {
      const g = game();
      round(
        g,
        [0, 1, 2, 3].map((i) =>
          i < n ? action : { action: "pocket", target: String((i + 1) % 4) },
        ),
        [true, true, true, true],
        false,
      );
      assert.equal(g.players[0].money, 12 / n);
    }
    const h = game();
    round(
      h,
      [action, action, action, action],
      [true, false, false, false],
      false,
    );
    assert.equal(h.players[0].money, 3);
    assert.equal(h.report?.failures, 3);
  }
});
test("four failed challenges give zero money and five alarms including time", () => {
  const g = game();
  round(
    g,
    ["drill", "secure", "loot", { action: "pocket", target: "0" }],
    [false, false, false, false],
  );
  assert.deepEqual(
    g.players.map((p) => p.money),
    [0, 0, 0, 0],
  );
  assert.equal(g.alarm, 5);
});
test("three thieves share four in integers; remainder stays with victim", () => {
  const g = game();
  g.players[0].money = 10;
  round(g, [
    "secure",
    ...[1, 2, 3].map(() => ({ action: "pocket" as const, target: "0" })),
  ]);
  assert.deepEqual(
    g.players.map((p) => p.money),
    [19, 1, 1, 1],
  );
});
test("two thieves on three coins take one each, gains this turn cannot be stolen", () => {
  const g = game();
  g.players[0].money = 3;
  round(g, [
    "secure",
    { action: "pocket", target: "0" },
    { action: "pocket", target: "0" },
    "loot",
  ]);
  assert.deepEqual(
    g.players.map((p) => p.money),
    [13, 1, 1, 12],
  );
  const h = game();
  round(h, ["secure", { action: "pocket", target: "0" }, "loot", "drill"]);
  assert.equal(h.players[1].money, 0);
});
test("cross theft and result arrival order do not change the common snapshot", () => {
  const a = game(),
    b = game();
  for (const g of [a, b]) {
    g.players.forEach((p, i) => (p.money = i + 2));
    g.wallets = Object.fromEntries(g.players.map((p) => [p.id, p.money]));
    g.choices = {
      "0": { action: "pocket", target: "1" },
      "1": { action: "pocket", target: "0" },
      "2": { action: "pocket", target: "3" },
      "3": { action: "pocket", target: "2" },
    };
  }
  a.successes = { "0": true, "1": true, "2": true, "3": true };
  b.successes = { "3": true, "2": true, "1": true, "0": true };
  resolve(a);
  resolve(b);
  assert.deepEqual(
    a.players.map((p) => p.money),
    [3, 2, 4, 5],
  );
  assert.deepEqual(a.players, b.players);
  assert.ok(a.players.every((p) => p.money >= 0));
});
test("resolution is idempotent and replayed or duplicate results rejected", () => {
  const g = game();
  phase(g, "minigame");
  assert.ok(apply(g, "0", { type: "result", success: true, turn: 1 }, 1));
  assert.equal(
    apply(g, "0", { type: "result", success: false, turn: 1 }, 2),
    false,
  );
  assert.equal(
    apply(g, "1", { type: "result", success: true, turn: 0 }, 2),
    false,
  );
  round(g, ["secure", "drill", "loot", "loot"]);
  const saved = structuredClone(g);
  resolve(g);
  assert.deepEqual(g, saved);
});
test("live aggregate votes are public, individual votes stay private; majority spends one charge", () => {
  for (const [votes, spent] of [
    [{ "0": "3", "1": "3", "2": "3" }, 1],
    [{ "0": "3", "1": "3", "2": "2", "3": "2" }, 0],
    [{ "0": "pass", "1": "pass", "2": "pass" }, 0],
    [{}, 0],
  ] as const) {
    const g = game();
    phase(g, "debate");
    g.votes = { ...votes };
    assert.equal(
      publicView(g, "1").myVote,
      votes["1" as keyof typeof votes] ?? null,
    );
    assert.equal(
      publicView(g, "0").voteCounts["3"],
      Object.values(votes).filter((t) => t === "3").length,
    );
    assert.equal(Object.hasOwn(publicView(g, "0"), "votes"), false);
    advance(g, 100000);
    assert.equal(g.charges, 2 - spent);
    assert.equal(g.watched, spent ? "3" : null);
    assert.deepEqual(g.voteResult?.votes, votes);
  }
});
test("surveillance restricts one turn and blocks jam; expiry permits another vote", () => {
  const g = game();
  g.watched = "3";
  phase(g, "secret");
  assert.equal(legal(g, "3", { action: "loot" }), false);
  assert.equal(legal(g, "3", { action: "pocket", target: "0" }), false);
  assert.equal(legal(g, "3", { action: "drill" }), true);
  assert.equal(
    apply(g, "3", { type: "jam", enabled: true, turn: g.turn }, 1),
    false,
  );
  round(g, ["loot", "drill", "secure", "secure"]);
  assert.equal(g.report?.jam, 0);
  assert.equal(g.watched, null);
  assert.equal(g.players[3].money, 6);
  g.watched = "3";
  g.vault = 8;
  assert.equal(legal(g, "3", { action: "drill" }), false);
  assert.equal(legal(g, "3", { action: "secure" }), true);
});
test("no surveillance left keeps debate available but rejects suspect and pass", () => {
  const g = game();
  phase(g, "debate");
  g.charges = 0;
  assert.equal(apply(g, "0", { type: "vote", target: "3", turn: 1 }, 1), false);
  advance(g, 100000);
  assert.equal(g.watched, null);
  assert.equal(g.charges, 0);
});
test("5 alarms beats a full vault; otherwise opening it ends the heist immediately", () => {
  const g = game();
  g.vault = 8;
  g.alarm = 5;
  phase(g, "reveal");
  advance(g, 100000);
  assert.equal(g.result?.kind, "fbi");
  assert.deepEqual(g.result?.winners, ["3"]);
  assert.ok(g.players.filter((p) => p.id !== "3").every((p) => p.money === 0));
  const h = game();
  h.vault = 8;
  phase(h, "reveal");
  advance(h, 100000);
  assert.equal(h.phase, "ended");
  assert.equal(h.result?.kind, "escape");
});
test("fifth round incomplete vault loses; escape rewards all burglars and tied kings, ignores FBI wallet", () => {
  const g = game();
  g.round = 5;
  phase(g, "reveal");
  advance(g, 100000);
  assert.equal(g.result?.kind, "fbi");
  const h = game();
  h.round = 5;
  h.vault = 8;
  h.players.forEach((p) => (p.money = p.id === "3" ? 999 : 10));
  phase(h, "reveal");
  advance(h, 100000);
  assert.equal(h.phase, "ended");
  assert.deepEqual(h.result?.winners, ["0", "1", "2"]);
  assert.deepEqual(h.result?.kings, ["0", "1", "2"]);
  assert.deepEqual(
    h.players.map((p) => p.money),
    [18, 18, 18, 999],
  );
});
test("successful targeted FBI radio overrides even a finished challenge without disclosing the jammer", () => {
  const g = game();
  g.jamTargets["3"] = "0";
  g.alarm = 2;
  const r = round(g, ["drill", "secure", "loot", "painting"]);
  assert.equal(r.findings[0].success, false);
  assert.equal(r.findings[0].gain, 0);
  assert.equal(g.vault, 0);
  assert.equal(r.failures, 1);
  assert.equal(g.alarm, 2);
  assert.equal(r.trace, null);
  assert.equal(r.jam, 0);
  const other = publicView(g, "1");
  assert.equal(other.myJamTarget, null);
  for (const key of ["jamTargets", "jams", "trials", "successes"])
    assert.equal(Object.hasOwn(other, key), false);
  assert.equal(JSON.stringify(r).includes("radio"), false);
});
test("failed or watched radio cannot sabotage, target validation and private trial substitution", () => {
  const g = game();
  phase(g, "secret");
  for (const target of [undefined, "3", "missing"])
    assert.equal(
      apply(g, "3", { type: "jam", enabled: true, target, turn: g.turn }, 1),
      false,
    );
  assert.equal(
    apply(g, "0", { type: "jam", enabled: true, target: "1", turn: g.turn }, 1),
    false,
  );
  assert.ok(
    apply(g, "3", { type: "jam", enabled: true, target: "0", turn: g.turn }, 1),
  );
  advance(g, g.deadline);
  assert.equal(g.trials["3"].action, "radio");
  assert.equal(g.trials["0"].action, "secure");
  g.successes = { "0": true, "1": true, "2": true, "3": false };
  resolve(g);
  assert.equal(g.report?.findings[0].success, true);
  const h = game();
  h.jamTargets["3"] = "0";
  h.watched = "3";
  const r = round(h, ["drill", "secure", "loot", "painting"]);
  assert.equal(r.findings[0].success, true);
});
test("pocket picking is legal only as a secret choice, never a public promise", () => {
  const g = game();
  phase(g, "promise");
  const choice: Choice = { action: "pocket", target: "1" };
  assert.equal(
    apply(g, "0", { type: "promise", choice, turn: g.turn }, 1),
    false,
  );
  assert.equal(g.players[0].promise, null);
  phase(g, "secret");
  assert.equal(
    apply(g, "0", { type: "choose", choice, turn: g.turn }, 1),
    true,
  );
});
test("three cooperative rounds escape early, rewards split and theft competes with a crowded post", () => {
  const g = game();
  round(g, ["drill", "secure", "loot", "painting"], undefined, false);
  next(g);
  round(
    g,
    ["drill", "secure", { action: "pocket", target: "0" }, "painting"],
    undefined,
    false,
  );
  next(g);
  round(g, ["drill", "secure", "drill", "painting"], undefined, false);
  next(g);
  assert.equal(g.round, 3);
  assert.equal(g.result?.kind, "escape");
  assert.equal(g.vault, 8);
  assert.deepEqual(
    g.players.map((p) => p.money),
    [34, 44, 30, 36],
  );
});
test("disconnect freezes all phases, resumes exact remaining time, expires without ranking", () => {
  for (const name of [
    "promise",
    "secret",
    "minigame",
    "reveal",
    "debate",
  ] as const) {
    const g = game();
    phase(g, name);
    setOnline(g, "1", false, 2000);
    advance(g, 80000);
    assert.equal(g.phase, name);
    assert.equal(
      apply(g, "0", { type: "vote", target: "1", turn: 1 }, 3000),
      false,
    );
    setOnline(g, "1", true, 32000);
    assert.equal(g.deadline, 130000);
    assert.equal(g.pausedAt, null);
  }
  const h = game();
  setOnline(h, "1", false, 2000);
  advance(h, 92000);
  assert.equal(h.result?.kind, "aborted");
  assert.deepEqual(h.result?.winners, []);
  assert.ok(h.players.every((p) => p.exposed === null));
});
test("recommendations include current turn and command validation rejects malformed or illegal data", () => {
  assert.equal(recommended({ vault: 4, round: 5 }), 2);
  assert.equal(recommended({ vault: 8, round: 5 }), 0);
  const g = game();
  phase(g, "secret");
  for (const c of [
    null,
    {},
    { type: "__proto__", turn: 1 },
    { type: { toString: null, valueOf: null }, turn: 1 },
    { type: "choose", turn: 1, choice: { action: "pocket", target: "0" } },
    { type: "choose", turn: 1, choice: { action: "drill", target: "3" } },
    { type: "result", turn: 1, success: true, money: 999 },
  ])
    assert.equal(apply(g, "0", c as any, 1), false);
  assert.equal(CONFIG.durations.minigame, 18000);
});
