import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, ALARM_MAX, COLORS, SPOTS, advance, apply, botCommand, createGame, makeRooms, publicView, resolveRoom, resolveVote, type Action, type Command, type Game, type Player } from '../src/engine';

const players = (n = 4): Player[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}`, color: COLORS[i], bot: false, online: true, active: true, money: 0, promise: null, ready: false, exposed: null }));
const game = (n = 4, seed = 42) => createGame(players(n), seed, 0);
function command(g: Game, id: string, input: Omit<Command, 'turn'>) { return apply(g, id, { ...input, turn: g.turn }, 0); }
function choices(g: Game, actions: Action[]) {
  for (let i = 0; i < actions.length; i++) { g.players[i].promise = actions[i]; g.choices[g.players[i].id] = { action: actions[i] }; }
}
function inspect(g: Game, id: string, spotId: string) {
  for (let step = 0; step < 3; step++) command(g, id, { type: 'inspect', target: spotId, step });
}
function dismiss(g: Game, now = g.revealStarted + 8_000) {
  for (const p of g.players.filter(p => p.active)) assert.equal(command(g, p.id, { type: 'continue' }), true);
  advance(g, now);
}
function safeChoices(g: Game) {
  let count = 0;
  const room = g.rooms[g.roomIndex];
  for (const p of g.players.filter(p => p.active)) {
    const action: Action = count < room.a.need ? 'a' : count < room.a.need + room.b.need ? 'b' : 'cover';
    p.promise = action; g.choices[p.id] = { action, ...(g.roomIndex === 3 && action === 'a' ? { code: g.code } : {}) }; count++;
  }
}

test('seeded rooms remain feasible for 3–6 players and preserve one spare for small crews', () => {
  assert.equal(ACTIONS.length, 6);
  for (let n = 3; n <= 6; n++) for (let seed = 0; seed < 100; seed++) {
    const rooms = makeRooms(seed, n); assert.deepEqual(rooms, makeRooms(seed, n)); assert.equal(rooms.length, 5);
    for (const room of rooms) { assert.ok(room.a.need + room.b.need <= n); if (n <= 4) assert.equal(room.a.need + room.b.need, 2); }
  }
  assert.throws(() => createGame([players()[0], players()[0], players()[1]], 0));
});

test('public snapshots explicitly omit host secrets and restore only the recipient choice', () => {
  const g = game(); g.phase = 'secret'; inspect(g, 'p0', 'frame');
  command(g, 'p0', { type: 'choose', action: 'search', target: 'frame' });
  g.choices.p1 = { action: 'a', code: '321' }; g.votes.p1 = 'p2';
  const v = publicView(g, 'p0');
  for (const key of ['roles', 'choices', 'votes', 'code', 'rng', 'history', 'envelopes', 'privateClues', 'searches', 'discoveryPriority', 'pendingResult']) assert.ok(!(key in v));
  assert.equal(v.myChoice, 'search'); assert.equal(v.myTarget, 'frame'); assert.equal(v.myCode, ''); assert.equal(v.myClues.length, 0);
  assert.equal(publicView(g, 'p1').myCode, '321'); assert.equal(publicView(g, 'p1').mySearch, null);
  v.players[0].money = 999; v.mySearch!.opened.push(4); assert.equal(g.players[0].money, 0); assert.equal(g.searches.p0.opened.length, 3);
});

test('inspection costs no information until committing search; future caches and bad steps are refused', () => {
  const g = game();
  assert.equal(command(g, 'p0', { type: 'inspect', target: 'frame', step: 0 }), false);
  g.phase = 'secret';
  assert.equal(command(g, 'p0', { type: 'inspect', target: 'bust', step: 0 }), false);
  for (const step of [-1, 3, .5, NaN]) assert.equal(command(g, 'p0', { type: 'inspect', target: 'frame', step }), false);
  assert.equal(command(g, 'p0', { type: 'choose', action: 'search', target: 'frame' }), false);
  inspect(g, 'p0', 'frame'); assert.equal(publicView(g, 'p0').mySearch!.found, true); assert.deepEqual(publicView(g, 'p0').myClues, []);
  assert.equal(command(g, 'p0', { type: 'choose', action: 'loot' }), true);
  choices(g, ['loot', 'a', 'b', 'cover']); resolveRoom(g, 0);
  assert.deepEqual(g.privateClues.p0, []); assert.equal(g.discoveries.length, 0); assert.equal(g.players[0].money, 18);
});

test('simultaneous search awards a single seeded first-discovery bonus independent of arrival order', () => {
  const run = (order: string[]) => {
    const g = game(); g.phase = 'secret';
    for (const id of order) { inspect(g, id, 'frame'); assert.equal(command(g, id, { type: 'choose', action: 'search', target: 'frame' }), true); }
    g.choices.p2 = { action: 'a' }; g.choices.p3 = { action: 'b' }; resolveRoom(g, 0); return g;
  };
  const first = run(['p0', 'p1']), second = run(['p1', 'p0']);
  assert.deepEqual(first.discoveries, second.discoveries); assert.deepEqual(first.players.map(p => p.money), second.players.map(p => p.money));
  assert.equal(first.discoveries.length, 1); assert.equal(first.players[0].money + first.players[1].money, 8);
  assert.equal(first.players.find(p => p.id === first.discoveries[0].ownerId)!.money, 6);
  assert.equal(publicView(first, 'p0').myClues[0].value, first.code[0]); assert.deepEqual(publicView(first, 'p2').myClues, []);
  assert.equal(first.report!.findings.find(f => f.id === 'p0')!.target, 'frame');
});

test('a second player can verify a cache privately but an individual cannot farm search money', () => {
  const g = game(); g.phase = 'secret'; inspect(g, 'p0', 'frame'); command(g, 'p0', { type: 'choose', action: 'search', target: 'frame' });
  g.choices.p1 = { action: 'a' }; g.choices.p2 = { action: 'b' }; g.choices.p3 = { action: 'cover' }; resolveRoom(g, 0);
  g.roomIndex = 2; g.phase = 'secret'; g.choices = {}; g.players.forEach(p => p.ready = false); g.searches = {};
  for (const id of ['p0', 'p1']) { inspect(g, id, 'frame'); assert.equal(command(g, id, { type: 'choose', action: 'search', target: 'frame' }), true); }
  g.choices.p2 = { action: 'a' }; g.choices.p3 = { action: 'b' }; resolveRoom(g, 40_000);
  assert.equal(g.report!.findings.find(f => f.id === 'p0')!.gain, 0); assert.equal(g.report!.findings.find(f => f.id === 'p1')!.gain, 2);
  assert.equal(g.discoveries.length, 1); assert.equal(g.privateClues.p1[0].value, g.code[0]);
});

test('announcements can lie and stay attributed; owning an index is required to announce it', () => {
  const g = game(); g.privateClues.p0.push({ spotId: 'frame', index: 0, value: g.code[0] });
  const lie = String((Number(g.code[0]) + 1) % 10);
  assert.equal(command(g, 'p1', { type: 'claim', target: '0', code: lie }), false);
  assert.equal(command(g, 'p0', { type: 'claim', target: '1', code: lie }), false);
  assert.equal(command(g, 'p0', { type: 'claim', target: '0', code: lie }), true);
  assert.deepEqual(publicView(g, 'p1').claims, [{ id: 'p0', index: 0, value: lie }]);
  assert.equal(publicView(g, 'p1').myClues.length, 0); assert.equal(publicView(g, 'p0').myClues[0].value, g.code[0]);
  assert.equal(command(g, 'p0', { type: 'claim', target: '0', code: g.code[0] }), true); assert.equal(g.claims.length, 1);
});

test('commands reject stale, duplicate, unknown, malformed and post-lock mutations', () => {
  const g = game();
  assert.equal(apply(g, 'p0', { type: 'promise', action: 'a', turn: g.turn - 1 }), false);
  assert.equal(command(g, 'p0', { type: 'promise', action: 'fake' as Action }), false);
  assert.equal(command(g, 'p0', { type: 'promise', action: 'a', target: 'frame' }), false);
  assert.equal(apply(g, 'p0', { type: 'promise', action: 'a', turn: g.turn, injected: true } as Command), false);
  assert.equal(command(g, 'p0', { type: 'clue' }), false);
  g.phase = 'secret'; inspect(g, 'p0', 'frame');
  assert.equal(command(g, 'p0', { type: 'choose', action: 'search', target: 'frame', code: '1' }), false);
  assert.equal(command(g, 'p0', { type: 'choose', action: 'search', target: 'frame' }), true);
  assert.equal(command(g, 'p0', { type: 'choose', action: 'loot' }), false);
  assert.equal(command(g, 'p0', { type: 'inspect', target: 'frame', step: 0 }), false);
  g.privateClues.p0.push({ spotId: 'frame', index: 0, value: '1' });
  assert.equal(command(g, 'p0', { type: 'claim', target: '0', code: '9' }), false);
});

test('stealing dilutes the jackpot and externalizes a visible collective risk', () => {
  const g = game(); g.pool = 20; choices(g, ['a', 'b', 'loot', 'loot']); resolveRoom(g, 0);
  assert.deepEqual(g.players.map(p => p.money), [3, 3, 9, 9]); assert.equal(g.alarm, 1); assert.equal(g.pool, 20);
  assert.deepEqual([g.report!.alarmBefore, g.report!.alarmAfter, g.report!.poolBefore, g.report!.poolAfter], [0, 1, 20, 20]);
  const reckless = game(); choices(reckless, ['loot', 'loot', 'loot', 'loot']); resolveRoom(reckless, 0);
  assert.equal(reckless.alarm, 5); assert.equal(reckless.pool, 0); assert.ok(reckless.players.every(p => p.money === 4.5));
});

test('repair stacks wages but only one alarm reduction, and cover saves one missing person', () => {
  const g = game(6); g.alarm = 4; choices(g, ['a', 'b', 'repair', 'repair', 'cover', 'cover']); resolveRoom(g, 0);
  assert.equal(g.alarm, 2); assert.deepEqual(g.players.map(p => p.money), [3, 3, 1, 1, 0, 0]);
  const rescue = game(); choices(rescue, ['a', 'cover', 'cover', 'loot']); resolveRoom(rescue, 0);
  assert.equal(rescue.alarm, 1); assert.equal(rescue.players[1].money, 3); assert.equal(rescue.players[2].money, 3);
  assert.match(rescue.report!.findings[1].detail, /remplacé/);
  const both = game(); choices(both, ['cover', 'cover', 'cover', 'cover']); resolveRoom(both, 0);
  assert.equal(both.alarm, 2); assert.equal(both.pool, 0); assert.ok(both.players.every(p => p.money === 1.5));
});

test('an actual vault code is required, a cover cannot conjure it, and FORCE has an explicit price', () => {
  const attempt = (code: string) => {
    const g = game(); g.roomIndex = 3; g.pool = 30; g.phase = 'secret';
    assert.equal(command(g, 'p0', { type: 'choose', action: 'a', code }), true);
    g.choices.p1 = { action: 'b' }; g.choices.p2 = { action: 'cover' }; g.choices.p3 = { action: 'cover' };
    resolveRoom(g, 0); return g;
  };
  const good = attempt(game().code); assert.equal(good.objective, true); assert.equal(good.pool, 86); assert.equal(good.alarm, 0);
  const bad = attempt('000'); assert.equal(bad.objective, false); assert.equal(bad.alarm, 2); assert.equal(bad.players[0].money, 0);
  const forced = attempt('FORCE'); assert.equal(forced.objective, true); assert.equal(forced.pool, 68); assert.equal(forced.alarm, 2);
  const redundantForce = game(); redundantForce.roomIndex = 3; redundantForce.pool = 30;
  choices(redundantForce, ['a', 'a', 'b', 'cover']); redundantForce.choices.p0.code = redundantForce.code; redundantForce.choices.p1.code = 'FORCE';
  resolveRoom(redundantForce, 0); assert.equal(redundantForce.pool, 68); assert.equal(redundantForce.alarm, 2);
  const g = game(); g.roomIndex = 3; g.phase = 'secret';
  for (const code of ['', '12', '12X', '1234', 'force']) assert.equal(command(g, 'p0', { type: 'choose', action: 'a', code }), false);
});

test('the last disastrous choices are revealed before seizure clears provisional gains', () => {
  const g = game(); g.alarm = 1; choices(g, ['loot', 'loot', 'loot', 'loot']); resolveRoom(g, 100);
  assert.equal(g.alarm, ALARM_MAX); assert.equal(g.phase, 'reveal'); assert.equal(g.result, null); assert.ok(g.players.every(p => p.money === 4.5));
  for (const p of g.players) command(g, p.id, { type: 'continue' });
  advance(g, 8_099, true); assert.equal(g.phase, 'reveal');
  advance(g, 8_100); assert.equal(g.phase, 'ended'); assert.equal(publicView(g, 'p0').result?.kind, 'fbi'); assert.ok(g.players.every(p => p.money === 0));
  assert.equal(g.report!.findings.length, 4); assert.equal(g.report!.alarmAfter, 6);
});

test('continue is a separate acknowledgement and reveal timeout also progresses', () => {
  const g = game(); safeChoices(g); resolveRoom(g, 0);
  assert.equal(command(g, 'p0', { type: 'continue' }), true); assert.equal(command(g, 'p0', { type: 'continue' }), false);
  advance(g, 8_000); assert.equal(g.phase, 'reveal'); advance(g, 30_000); assert.equal(g.phase, 'vote');
  assert.ok(g.players.every(p => !p.ready)); assert.equal(g.report!.findings.length, 4);
});

test('successful play banks the common bag only after the final reveal and excludes the agent from winners', () => {
  const g = game();
  for (let i = 0; i < 5; i++) {
    g.roomIndex = i; g.choices = {}; safeChoices(g); resolveRoom(g, i * 100_000);
    assert.equal(g.alarm, 0); assert.equal(g.result, null); assert.equal(g.phase, 'reveal');
    if (i === 4) dismiss(g);
  }
  assert.equal(g.result?.kind, 'escape'); assert.equal(g.objective, true); assert.equal(g.pool, 88);
  assert.ok(g.result!.winners.length > 0); assert.ok(g.result!.winners.every(id => g.roles[id] === 'burglar'));
  assert.ok(g.players.every(p => p.exposed && p.money >= 22)); assert.equal(g.report!.poolAfter, 88);
});

test('an active agent wins an empty-handed escape after its reveal, but an ejected agent cannot', () => {
  const missed = game(); missed.roomIndex = 4; safeChoices(missed); resolveRoom(missed, 0); dismiss(missed);
  assert.equal(missed.result?.kind, 'fbi'); assert.match(missed.result!.text, /L’agent a fait sortir le groupe les mains vides/);
  assert.deepEqual(missed.result!.winners, missed.players.filter(p => missed.roles[p.id] === 'agent').map(p => p.id));
  assert.ok(missed.players.every(p => p.money === 0));
  const noAgent = game(); noAgent.roomIndex = 4; const exposed = noAgent.players.find(p => noAgent.roles[p.id] === 'agent')!;
  exposed.active = false; exposed.exposed = 'agent'; noAgent.agentExposed = true; safeChoices(noAgent); resolveRoom(noAgent, 0); dismiss(noAgent);
  assert.equal(noAgent.result?.kind, 'missed'); assert.deepEqual(noAgent.result!.winners, []);
  const g = game(); const agent = g.players.find(p => g.roles[p.id] === 'agent')!;
  agent.active = false; agent.exposed = 'agent'; g.agentExposed = true; g.alarm = 5;
  for (const p of g.players.filter(p => p.active)) g.choices[p.id] = { action: 'loot' };
  resolveRoom(g, 0); dismiss(g); assert.equal(g.result?.kind, 'police'); assert.deepEqual(g.result?.winners, []);
});

test('a failed vault grants exactly one fresh negotiation, search and code attempt before escape', () => {
  const g = game(); g.roomIndex = 3;
  const failVault = (now: number) => {
    g.phase = 'secret'; g.players.forEach(p => p.ready = false);
    choices(g, ['a', 'b', 'cover', 'cover']); g.choices.p0.code = '000'; resolveRoom(g, now); dismiss(g);
    assert.equal(g.phase, 'vote');
    for (const p of g.players) assert.equal(command(g, p.id, { type: 'vote', target: 'skip' }), true);
    advance(g, now + 9_000);
  };
  failVault(0); assert.equal(g.roomIndex, 3); assert.equal(g.vaultRetries, 1); assert.equal(publicView(g, 'p0').vaultRetries, 1);
  assert.equal(g.phase, 'promise'); assert.equal(g.objective, false); assert.deepEqual(g.choices, {}); assert.ok(g.players.every(p => !p.ready && p.promise === null));
  assert.match(g.log[0], /Dernière tentative/);
  g.phase = 'secret'; assert.equal(command(g, 'p2', { type: 'inspect', target: 'frame', step: 0 }), true);
  failVault(50_000); assert.equal(g.roomIndex, 4); assert.equal(g.vaultRetries, 1); assert.equal(g.phase, 'promise');
});

test('a correctly opened vault goes directly to escape without a redundant retry', () => {
  const g = game(); g.roomIndex = 3; safeChoices(g); resolveRoom(g, 0); dismiss(g);
  g.votes = Object.fromEntries(g.players.map(p => [p.id, 'skip'])); resolveVote(g, 9_000);
  assert.equal(g.roomIndex, 4); assert.equal(g.vaultRetries, 0); assert.equal(g.objective, true);
});

test('votes require absolute majority, erase ejected money and rebalance future heavy tasks', () => {
  const g = game(6); const agent = g.players.find(p => g.roles[p.id] === 'agent')!; agent.money = 20;
  g.phase = 'vote'; g.votes = Object.fromEntries(g.players.map((p, i) => [p.id, i < 3 ? agent.id : 'skip'])); resolveVote(g, 0);
  assert.equal(agent.active, true);
  g.phase = 'vote'; g.votes = Object.fromEntries(g.players.filter(p => p.id !== agent.id).map(p => [p.id, agent.id])); resolveVote(g, 0);
  assert.equal(agent.active, false); assert.equal(agent.money, 0); assert.equal(agent.exposed, 'agent'); assert.equal(g.agentExposed, true);
  g.players.slice(0, 4).forEach(p => { p.active = false; });
  const survivor = g.players.find(p => p.active); if (!survivor) g.players[5].active = true;
  g.phase = 'vote'; g.votes = {}; resolveVote(g, 0);
  const count = g.players.filter(p => p.active).length;
  for (const room of g.rooms.slice(g.roomIndex)) assert.ok(room.a.need + room.b.need <= count);
});

test('timeouts do not collect untouched clues and never magically solve the vault', () => {
  const g = game(); advance(g, 45_000); assert.equal(g.phase, 'secret'); advance(g, 85_000);
  assert.equal(g.phase, 'reveal'); assert.equal(g.discoveries.length, 0); assert.ok(Object.values(g.privateClues).every(clues => !clues.length));
  const vault = game(); vault.roomIndex = 3; vault.players[0].promise = 'a'; vault.players[1].promise = 'b';
  advance(vault, 45_000); advance(vault, 85_000); assert.equal(vault.objective, false); assert.equal(vault.report!.findings[0].gain, 0);
});

test('bots inspect and claim through legal commands, and can use false public code without reading host truth', () => {
  const g = game(); const p = g.players.find(p => g.roles[p.id] === 'burglar')!;
  p.promise = 'search'; g.phase = 'secret';
  let inspected = false;
  for (let i = 0; i < 5 && !p.ready; i++) { const cmd = botCommand(g, p)!; inspected ||= cmd.type === 'inspect'; assert.equal(apply(g, p.id, cmd), true); }
  assert.equal(inspected, true); assert.equal(g.choices[p.id].action, 'search'); resolveRoom(g, 0); dismiss(g);
  const claim = botCommand(g, p)!; assert.equal(claim.type, 'claim'); assert.equal(apply(g, p.id, claim), true);
  const vault = game(); const burglar = vault.players.find(player => vault.roles[player.id] === 'burglar')!;
  vault.roomIndex = 3; vault.phase = 'secret'; burglar.promise = 'a'; vault.rng = () => .99;
  vault.claims = [0, 1, 2].map(index => ({ id: 'other', index, value: '9' }));
  Object.defineProperty(vault, 'code', { get() { throw Error('Bots must never inspect the authoritative code'); } });
  assert.equal(botCommand(vault, burglar)!.code, '999'); vault.claims = []; assert.equal(botCommand(vault, burglar)!.code, 'FORCE');
});

test('bots can suspect a rich chronic thief even with honest promises, and recent help cools suspicion', () => {
  const g = game(); g.phase = 'vote'; g.players[0].money = 54; g.players[1].money = 9;
  g.history = Array.from({ length: 3 }, () => ({ id: 'p0', action: 'loot' as const, betrayed: false }));
  g.rng = () => .8;
  assert.equal(botCommand(g, g.players[1])!.target, 'p0');
  g.history.push({ id: 'p0', action: 'a', betrayed: false });
  assert.equal(botCommand(g, g.players[1])!.target, 'skip');
  g.history.push({ id: 'p0', action: 'b', betrayed: false });
  g.rng = () => .1;
  assert.equal(botCommand(g, g.players[1])!.target, 'skip');
});

test('a trailing bot competes with an announced rich looter once mandatory posts are covered', () => {
  const g = game(); g.players[0].money = 30; g.players[0].promise = 'loot';
  g.players[1].promise = 'a'; g.players[2].promise = 'b';
  g.discoveries.push({ spotId: 'frame', index: 0, ownerId: 'p1' });
  g.rng = () => .99;
  assert.equal(botCommand(g, g.players[3])!.action, 'loot');
  g.players[2].promise = null;
  assert.equal(botCommand(g, g.players[3])!.action, 'b');
});

test('full bot-only games can progress through all command phases without a stranded secret or reveal', () => {
  let sawSearch = false, sawClaim = false, sawFinalReveal = false;
  for (let seed = 0; seed < 30; seed++) {
    const g = game(4, seed); let now = 0;
    for (let step = 0; step < 500 && g.phase !== 'ended'; step++) {
      for (const p of g.players) { const cmd = botCommand(g, p); if (cmd) { sawSearch ||= cmd.type === 'inspect'; sawClaim ||= cmd.type === 'claim'; assert.equal(apply(g, p.id, cmd, now), true, JSON.stringify(cmd)); } }
      sawFinalReveal ||= g.phase === 'reveal' && g.pendingResult !== null; now += 1_000; advance(g, now);
    }
    assert.equal(g.phase, 'ended', `seed ${seed} did not finish`);
  }
  assert.ok(sawSearch); assert.ok(sawClaim); assert.ok(sawFinalReveal);
});
