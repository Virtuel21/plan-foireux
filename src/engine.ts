export const ACTIONS = ['a', 'b', 'loot', 'search', 'repair', 'cover'] as const;
export type Action = (typeof ACTIONS)[number];
export type Phase = 'promise' | 'secret' | 'reveal' | 'vote' | 'ended';
export type Role = 'burglar' | 'agent';
export const ALARM_MAX = 6;
export const COLORS = ['#ecac32', '#28aaa5', '#ee7836', '#9d65b2', '#5f8ce1', '#df647c'];
export const SPOTS = [
  { id: 'frame', name: 'Le cadre du hall', clueIndex: 0, unlockRoom: 0 },
  { id: 'desk', name: 'Le bureau de la galerie', clueIndex: 1, unlockRoom: 1 },
  { id: 'bust', name: 'La statue de la réserve', clueIndex: 2, unlockRoom: 2 },
];
const REVEAL_MIN_MS = 8_000;
const REVEAL_TIMEOUT_MS = 30_000;

export type Player = { id: string; name: string; color: string; bot: boolean; online: boolean; active: boolean; money: number; promise: Action | null; ready: boolean; exposed: Role | null };
export type Task = { name: string; short: string; detail: string; need: number; icon: string };
export type Room = { title: string; subtitle: string; a: Task; b: Task; layout: number; clue: number; objective: string };
export type Finding = { id: string; action: Action; promise: Action | null; gain: number; betrayed: boolean; detail: string; target?: string };
export type Report = { findings: Finding[]; incidents: string[]; alarmAdded: number; text: string; alarmBefore: number; alarmAfter: number; poolBefore: number; poolAfter: number };
export type Command = { type: string; action?: Action; target?: string; code?: string; step?: number; turn?: number };
export type Clue = { spotId: string; index: number; value: string };
export type Search = { spotId: string; opened: number[]; found: boolean };
export type Discovery = { spotId: string; index: number; ownerId: string };
export type Claim = { id: string; index: number; value: string };
export type Choice = { action: Action; target?: string; code?: string };
export type Result = { kind: 'escape' | 'fbi' | 'police' | 'missed'; winners: string[]; text: string };
export type Game = {
  players: Player[]; roles: Record<string, Role>; choices: Record<string, Choice>; votes: Record<string, string>;
  phase: Phase; roomIndex: number; rooms: Room[]; alarm: number; pool: number; code: string;
  objective: boolean; report: Report | null; history: { id: string; betrayed: boolean }[]; log: string[];
  deadline: number; turn: number; result: Result | null; agentExposed: boolean; rng: () => number;
  discoveries: Discovery[]; claims: Claim[]; privateClues: Record<string, Clue[]>;
  searches: Record<string, Search>; envelopes: Record<string, number>; discoveryPriority: Record<string, string[]>;
  revealStarted: number; pendingResult: { kind: Result['kind']; text: string } | null;
};
export type View = {
  players: Player[]; phase: Phase; roomIndex: number; rooms: Room[]; alarm: number; pool: number;
  objective: boolean; report: Report | null; log: string[]; deadline: number; turn: number;
  result: Result | null; agentExposed: boolean; myRole: Role; myChoice: Action | null;
  myVote: string | null; voteCount: number; myId: string; spots: typeof SPOTS;
  discoveries: Discovery[]; claims: Claim[]; myClues: Clue[]; mySearch: Search | null;
  myTarget: string | null; myCode: string;
};

export function random(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function makeRooms(seed: number, count: number): Room[] {
  const r = random(seed), heavy = count >= 5 ? 2 : 1;
  const objective = ['la Couronne du roi', 'le Diamant bleu', 'le Masque d’or'][Math.floor(r() * 3)];
  const task = (name: string, short: string, detail: string, need: number, icon: string): Task => ({ name, short, detail, need, icon });
  const pairs = [
    [task('Brouiller les caméras', 'Caméras', 'Coupe la surveillance de l’entrée.', 1, 'eye'), task('Occuper le gardien', 'Gardien', 'Une diversion, et on entre sans bruit.', 1, 'shield')],
    [task('Soulever la grille', 'Grille', 'Maintenez la grille ensemble.', heavy, 'grid'), task('Couper les lasers', 'Lasers', 'Désactive le panneau de sécurité.', 1, 'laser')],
    [task('Neutraliser l’alarme', 'Alarme', 'Débranche le détecteur de mouvement.', 1, 'laser'), task('Déplacer la statue', 'Statue', 'Dégagez le passage vers le trésor.', heavy, 'users')],
    [task('Ouvrir le coffre', 'Coffre', 'Saisis le code découvert, ou force le coffre à tes risques.', 1, 'lock'), task('Surveiller le couloir', 'Guet', 'Garde un œil sur le gardien.', 1, 'eye')],
    [task('Conduire le fourgon', 'Volant', 'Laisse le moteur tourner !', 1, 'van'), task('Faire diversion', 'Diversion', 'Attire la sécurité de l’autre côté.', 1, 'shield')],
  ];
  if (r() > .5) [pairs[1], pairs[2]] = [pairs[2], pairs[1]];
  return pairs.map((p, i) => ({ title: ['Entrer sans se faire voir', 'Traverser la galerie', 'Atteindre la réserve', 'Ouvrir la salle du trésor', 'Tout le monde au fourgon !'][i], subtitle: ['Le hall des antiquités', 'La galerie des portraits', 'La réserve interdite', 'Le grand coffre', 'La cour du musée'][i], a: p[0], b: p[1], layout: Math.floor(r() * 3), clue: Math.min(i, 2), objective }));
}

const active = (g: Game) => g.players.filter(p => p.active);
const isAction = (value: unknown): value is Action => ACTIONS.includes(value as Action);
const accessibleSpot = (g: Game, id: string | undefined) => SPOTS.find(s => s.id === id && s.unlockRoom <= g.roomIndex && g.roomIndex < 4);

/** Reducing the crew must not leave a physically impossible mandatory plan. */
function balanceTasks(g: Game) {
  const count = active(g).length;
  for (const room of g.rooms.slice(g.roomIndex)) {
    room.a.need = Math.min(room.a.need, count ? Math.max(1, count - 1) : 0);
    room.b.need = Math.min(room.b.need, Math.max(0, count - room.a.need));
  }
}

export function createGame(players: Player[], seed: number, now = Date.now()): Game {
  if (players.length < 3 || players.length > 6 || new Set(players.map(p => p.id)).size !== players.length) throw Error('3 à 6 joueurs distincts requis');
  const rng = random(seed), agent = Math.floor(rng() * players.length);
  const rooms = makeRooms(Math.floor(rng() * 0xffffffff), players.length);
  const code = String(100 + Math.floor(rng() * 900));
  const envelopes: Record<string, number> = {}, discoveryPriority: Record<string, string[]> = {};
  for (const spot of SPOTS) {
    envelopes[spot.id] = Math.floor(rng() * 3);
    const shuffled = players.map(p => p.id);
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    discoveryPriority[spot.id] = shuffled;
  }
  return {
    players: players.map(p => ({ ...p, active: true, money: 0, promise: null, ready: false, exposed: null })),
    roles: Object.fromEntries(players.map((p, i) => [p.id, i === agent ? 'agent' : 'burglar'])),
    choices: {}, votes: {}, phase: 'promise', roomIndex: 0, rooms, alarm: 0, pool: 0, code,
    objective: false, report: null, history: [], log: ['Le musée ferme ses portes. À vous de jouer.'],
    deadline: now + 45_000, turn: 1, result: null, agentExposed: false, rng,
    discoveries: [], claims: [], privateClues: Object.fromEntries(players.map(p => [p.id, []])),
    searches: {}, envelopes, discoveryPriority, revealStarted: 0, pendingResult: null,
  };
}

/** Only this explicit projection may leave the authority of the host. */
export function publicView(g: Game, id: string): View {
  return structuredClone({
    players: g.players, phase: g.phase, roomIndex: g.roomIndex, rooms: g.rooms,
    alarm: g.alarm, pool: g.pool, objective: g.objective, report: g.report,
    log: g.log, deadline: g.deadline, turn: g.turn, result: g.result, agentExposed: g.agentExposed,
    myRole: g.roles[id] ?? 'burglar', myChoice: g.choices[id]?.action ?? null,
    myVote: g.votes[id] ?? null, voteCount: Object.keys(g.votes).length, myId: id,
    spots: SPOTS, discoveries: g.discoveries, claims: g.claims, myClues: g.privateClues[id] ?? [],
    mySearch: g.searches[id] ?? null, myTarget: g.choices[id]?.target ?? null, myCode: g.choices[id]?.code ?? '',
  });
}

function end(g: Game, kind: Result['kind'], text: string) {
  const survivors = active(g), agent = survivors.find(p => g.roles[p.id] === 'agent');
  let winners: string[] = [];
  if (kind === 'escape') {
    for (const p of survivors) p.money += g.pool / survivors.length;
    const burglars = survivors.filter(p => g.roles[p.id] === 'burglar');
    const max = Math.max(...burglars.map(p => p.money));
    winners = burglars.filter(p => Math.abs(p.money - max) < 1e-8).map(p => p.id);
  } else {
    for (const p of g.players) p.money = 0;
    if (kind === 'fbi' && agent) winners = [agent.id];
  }
  for (const p of g.players) p.exposed = g.roles[p.id];
  g.result = { kind, text, winners }; g.pendingResult = null; g.phase = 'ended'; g.turn++;
}

/** Validate even locally produced commands: guests and bots use the same rules. */
export function apply(g: Game, id: string, command: Command, now = Date.now()): boolean {
  const p = g.players.find(player => player.id === id);
  if (!p?.active || g.phase === 'ended' || !command || typeof command !== 'object' || command.turn !== g.turn) return false;
  if (Object.keys(command).some(key => !['type', 'action', 'target', 'code', 'step', 'turn'].includes(key))) return false;
  if (typeof command.type !== 'string' || !Number.isInteger(command.turn) || (command.action !== undefined && !isAction(command.action)) || (command.target !== undefined && (typeof command.target !== 'string' || command.target.length > 80)) || (command.code !== undefined && (typeof command.code !== 'string' || command.code.length > 5)) || (command.step !== undefined && (!Number.isInteger(command.step) || command.step < 0 || command.step > 2))) return false;
  const only = (...keys: string[]) => Object.keys(command).every(key => ['type', 'turn', ...keys].includes(key));

  if (command.type === 'claim') {
    if (!only('target', 'code') || !/^[0-2]$/.test(command.target ?? '') || !/^\d$/.test(command.code ?? '') || (g.phase === 'secret' && p.ready)) return false;
    const index = Number(command.target);
    if (!g.privateClues[id]?.some(clue => clue.index === index)) return false;
    const existing = g.claims.find(claim => claim.id === id && claim.index === index);
    if (existing?.value === command.code) return false;
    if (existing) existing.value = command.code!;
    else g.claims.push({ id, index, value: command.code! });
    return true;
  }
  if (command.type === 'continue') {
    if (!only() || g.phase !== 'reveal' || p.ready) return false;
    p.ready = true; return true;
  }
  if (command.type === 'promise') {
    if (!only('action') || g.phase !== 'promise' || p.ready || !isAction(command.action) || (command.action === 'search' && g.roomIndex === 4)) return false;
    p.promise = command.action; p.ready = true; return true;
  }
  if (command.type === 'inspect') {
    const spot = accessibleSpot(g, command.target);
    if (!only('target', 'step') || g.phase !== 'secret' || p.ready || !spot || command.step === undefined) return false;
    const state = g.searches[id]?.spotId === spot.id ? g.searches[id] : { spotId: spot.id, opened: [], found: false };
    if (state.opened.includes(command.step)) return false;
    state.opened.push(command.step); state.found ||= command.step === g.envelopes[spot.id];
    g.searches[id] = state; return true;
  }
  if (command.type === 'choose') {
    if (!only('action', 'target', 'code') || g.phase !== 'secret' || p.ready || g.choices[id] || !isAction(command.action)) return false;
    if (command.action === 'search') {
      const spot = accessibleSpot(g, command.target), state = g.searches[id];
      if (!spot || command.code !== undefined || state?.spotId !== spot.id || !state.found) return false;
      g.choices[id] = { action: 'search', target: spot.id };
    } else {
      if (command.target !== undefined) return false;
      const vaultAttempt = g.roomIndex === 3 && command.action === 'a';
      if (vaultAttempt ? !/^(?:\d{3}|FORCE)$/.test(command.code ?? '') : command.code !== undefined && command.code !== '') return false;
      g.choices[id] = { action: command.action, ...(vaultAttempt ? { code: command.code } : {}) };
    }
    p.ready = true; return true;
  }
  if (command.type === 'vote') {
    if (!only('target') || g.phase !== 'vote' || p.ready || g.votes[id] || !(command.target === 'skip' || active(g).some(target => target.id === command.target && target.id !== id))) return false;
    g.votes[id] = command.target!; p.ready = true; return true;
  }
  return false;
}

export function resolveRoom(g: Game, now = Date.now()) {
  balanceTasks(g);
  const room = g.rooms[g.roomIndex], ps = active(g), alarmBefore = g.alarm, poolBefore = g.pool;
  const incidents: string[] = [], gains = new Map(ps.map(p => [p.id, 0])), details = new Map<string, string>();
  const choice = (id: string) => g.choices[id] ?? { action: 'cover' as const };
  const looters = ps.filter(p => choice(p.id).action === 'loot');
  const repairers = ps.filter(p => choice(p.id).action === 'repair');
  const covers = ps.filter(p => choice(p.id).action === 'cover');
  let alarmDelta = 0;

  // Discoveries are resolved as a batch, never in network arrival order.
  for (const spot of SPOTS) {
    const seekers = ps.filter(p => choice(p.id).action === 'search' && choice(p.id).target === spot.id && g.searches[p.id]?.spotId === spot.id && g.searches[p.id]?.found);
    const fresh = seekers.filter(p => !g.privateClues[p.id].some(clue => clue.index === spot.clueIndex));
    for (const p of seekers) details.set(p.id, 'Indice déjà connu : aucune nouvelle prime.');
    for (const p of fresh) {
      g.privateClues[p.id].push({ spotId: spot.id, index: spot.clueIndex, value: g.code[spot.clueIndex] });
      gains.set(p.id, 2); details.set(p.id, `A découvert le chiffre ${spot.clueIndex + 1}. Il reste privé. +2.`);
    }
    if (fresh.length && !g.discoveries.some(d => d.spotId === spot.id)) {
      const ownerId = g.discoveryPriority[spot.id].find(id => fresh.some(p => p.id === id))!;
      g.discoveries.push({ spotId: spot.id, index: spot.clueIndex, ownerId });
      gains.set(ownerId, (gains.get(ownerId) ?? 0) + 4);
      details.set(ownerId, `Premier indice découvert : chiffre ${spot.clueIndex + 1} privé. +2 et prime +4.`);
    }
  }

  const vaultAttempts = ps.filter(p => choice(p.id).action === 'a' && g.roomIndex === 3);
  const correctVault = vaultAttempts.some(p => choice(p.id).code === g.code);
  const forcedVault = vaultAttempts.some(p => choice(p.id).code === 'FORCE');
  const vaultOpened = correctVault || forcedVault;
  const contributors = {
    a: ps.filter(p => choice(p.id).action === 'a' && (g.roomIndex !== 3 || choice(p.id).code === g.code || choice(p.id).code === 'FORCE')).length,
    b: ps.filter(p => choice(p.id).action === 'b').length,
  };
  const deficits = { a: Math.max(0, room.a.need - contributors.a), b: Math.max(0, room.b.need - contributors.b) };
  const covered = covers.length ? (deficits.a && (g.roomIndex !== 3 || vaultOpened) ? 'a' : deficits.b ? 'b' : null) : null;
  if (covered) {
    deficits[covered]--;
    incidents.push(`La couverture a sauvé ${room[covered].short} : prime de 6 partagée.`);
    for (const p of covers) { gains.set(p.id, 6 / covers.length); details.set(p.id, `A remplacé une personne à ${room[covered].short}. Prime partagée.`); }
  }
  let missing = 0;
  for (const post of ['a', 'b'] as const) {
    if (deficits[post] > 0) { missing++; alarmDelta += 2; incidents.push(`${room[post].short} : poste incomplet. +2 alarme.`); }
  }
  if (!missing) { g.pool += 8; incidents.push('Les deux postes sont assurés : +8 au sac commun.'); }
  if (g.roomIndex === 3 && vaultOpened && !g.objective) {
    if (forcedVault) { g.pool = Math.max(0, g.pool - 18); alarmDelta += 2; incidents.push('Coffre forcé : +2 alarme et −18 au sac (plancher 0).'); }
    g.objective = true; g.pool += 48; incidents.push('Le trésor est dans le sac ! +48 au sac commun.');
  }
  if (looters.length) {
    g.pool = Math.max(0, g.pool - 8); alarmDelta++; incidents.push(`${looters.length} voleur${looters.length > 1 ? 's' : ''} : 18 partagées, +1 alarme, −8 au sac.`);
    for (const p of looters) { gains.set(p.id, 18 / looters.length); details.set(p.id, `18 ÷ ${looters.length} voleur${looters.length > 1 ? 's' : ''}. Le groupe paie +1 alarme et −8 au sac.`); }
  }
  if (repairers.length) {
    alarmDelta -= 2; incidents.push('Une réparation efficace : −2 alarme (effet collectif plafonné).');
    for (const p of repairers) { gains.set(p.id, 1); details.set(p.id, 'A réparé la sécurité. −2 alarme au total pour les réparateurs.'); }
  }
  const findings: Finding[] = ps.map(p => {
    const c = choice(p.id);
    if (c.action === 'a' || c.action === 'b') {
      const valid = !(g.roomIndex === 3 && c.action === 'a' && c.code !== g.code && c.code !== 'FORCE');
      gains.set(p.id, valid ? 3 : 0);
      details.set(p.id, valid ? (g.roomIndex === 3 && c.action === 'a' ? c.code === 'FORCE' ? 'A forcé le coffre : bruyant et coûteux.' : 'Le code saisi était correct. Coffre ouvert !' : `A assuré ${room[c.action].short}. +3.`) : 'Mauvais code : le coffre est resté fermé. Aucun salaire.');
    }
    if (!details.has(p.id)) details.set(p.id, c.action === 'cover' ? 'Prêt à sauver un poste, mais personne ne manquait. +0.' : 'Fouille incomplète : aucun indice ni gain.');
    const gain = gains.get(p.id) ?? 0, betrayed = p.promise !== c.action;
    p.money += gain; g.history.push({ id: p.id, betrayed });
    return { id: p.id, action: c.action, promise: p.promise, gain, betrayed, detail: details.get(p.id)!, ...(c.target ? { target: c.target } : {}) };
  });
  g.alarm = Math.max(0, Math.min(ALARM_MAX, alarmBefore + alarmDelta));
  const text = missing ? 'Des postes ont été abandonnés. Qui avait promis quoi ?' : 'Le passage est ouvert. Regardez qui a rempli ses poches.';
  g.report = { findings, incidents, alarmAdded: g.alarm - alarmBefore, text, alarmBefore, alarmAfter: g.alarm, poolBefore, poolAfter: g.pool };
  g.log.unshift(`${g.roomIndex === 4 ? 'Fuite' : `Salle ${g.roomIndex + 1}`} : alarme ${alarmBefore} → ${g.alarm}, sac ${poolBefore} → ${g.pool}.`);
  g.phase = 'reveal'; g.revealStarted = now; g.deadline = now + REVEAL_TIMEOUT_MS; g.turn++;
  for (const p of g.players) p.ready = false;
  if (g.alarm >= ALARM_MAX) g.pendingResult = { kind: ps.some(p => g.roles[p.id] === 'agent') ? 'fbi' : 'police', text: 'La police est entrée. Le butin est perdu.' };
  else if (g.roomIndex === 4) g.pendingResult = g.objective ? { kind: 'escape', text: 'Le fourgon est parti. Le plus riche des braqueurs remporte le casse !' } : { kind: 'missed', text: 'Vous êtes sortis les mains vides : le trésor est resté dans le coffre.' };
}

function nextRoom(g: Game, now: number) {
  g.roomIndex++; balanceTasks(g); g.phase = 'promise'; g.choices = {}; g.votes = {}; g.searches = {};
  g.report = null; g.pendingResult = null;
  for (const p of g.players) { p.promise = null; p.ready = false; }
  g.turn++; g.deadline = now + 45_000;
}

export function resolveVote(g: Game, now = Date.now()) {
  const ps = active(g), needed = Math.floor(ps.length / 2) + 1, counts: Record<string, number> = {};
  for (const id of Object.values(g.votes)) if (id !== 'skip') counts[id] = (counts[id] ?? 0) + 1;
  const out = ps.find(p => (counts[p.id] ?? 0) >= needed);
  if (out) {
    out.active = false; out.money = 0; out.exposed = g.roles[out.id];
    g.log.unshift(`${out.name} a été éjecté·e : ${out.exposed === 'agent' ? 'agent du FBI !' : 'braqueur innocent.'}`);
    if (out.exposed === 'agent') g.agentExposed = true;
  } else g.log.unshift('Aucune majorité. Le groupe reste au complet.');
  if (!g.agentExposed && active(g).length <= 2) end(g, 'fbi', 'Il ne reste qu’un braqueur face à l’agent. Le FBI gagne.');
  else nextRoom(g, now);
}

function timeoutChoice(g: Game, p: Player): Choice {
  const action = p.promise ?? 'cover';
  if (action === 'search') {
    const state = g.searches[p.id];
    return state?.found && accessibleSpot(g, state.spotId) ? { action, target: state.spotId } : { action: 'cover' };
  }
  // A promised vault job with no submitted code must fail, never auto-solve.
  return { action, ...(g.roomIndex === 3 && action === 'a' ? { code: '' } : {}) };
}

export function advance(g: Game, now = Date.now(), force = false) {
  if (g.phase === 'ended') return;
  const allReady = active(g).every(p => p.ready), elapsed = now >= g.deadline;
  if (g.phase === 'promise' && (allReady || elapsed)) {
    for (const p of active(g)) { p.promise ??= 'cover'; p.ready = false; }
    g.phase = 'secret'; g.turn++; g.deadline = now + 40_000;
  } else if (g.phase === 'secret' && (allReady || elapsed)) {
    for (const p of active(g)) g.choices[p.id] ??= timeoutChoice(g, p);
    resolveRoom(g, now);
  } else if (g.phase === 'reveal' && now - g.revealStarted >= REVEAL_MIN_MS && (allReady || elapsed || force)) {
    if (g.pendingResult) end(g, g.pendingResult.kind, g.pendingResult.text);
    else if (g.agentExposed) nextRoom(g, now);
    else {
      g.phase = 'vote'; g.turn++; g.deadline = now + 45_000; g.votes = {};
      for (const p of g.players) p.ready = false;
    }
  } else if (g.phase === 'vote' && (allReady || elapsed)) resolveVote(g, now);
}

function botSpot(g: Game, id: string) {
  return SPOTS.filter(s => s.unlockRoom <= g.roomIndex && g.roomIndex < 4 && !g.privateClues[id].some(clue => clue.index === s.clueIndex)).sort((a, b) => Number(g.discoveries.some(d => d.spotId === a.id)) - Number(g.discoveries.some(d => d.spotId === b.id)) || b.unlockRoom - a.unlockRoom)[0];
}

/** Bots know their own discoveries and unverified announcements, exactly like a player. */
export function botCommand(g: Game, p: Player): Command | null {
  if (!p.active || p.ready || g.phase === 'ended') return null;
  const turn = g.turn, room = g.rooms[g.roomIndex], r = g.rng, agent = g.roles[p.id] === 'agent';
  if (g.phase === 'reveal') return { type: 'continue', turn };
  if (g.phase === 'promise' || g.phase === 'secret' || g.phase === 'vote') {
    for (const clue of g.privateClues[p.id]) {
      const value = agent ? String((Number(clue.value) + 1) % 10) : clue.value;
      if (!g.claims.some(claim => claim.id === p.id && claim.index === clue.index && claim.value === value)) return { type: 'claim', target: String(clue.index), code: value, turn };
    }
  }
  if (g.phase === 'promise') {
    const count = (action: Action) => active(g).filter(t => t.promise === action).length;
    let action: Action;
    if (count('a') < room.a.need) action = 'a';
    else if (count('b') < room.b.need) action = 'b';
    else if (g.alarm >= 2 && !count('repair')) action = 'repair';
    else if (botSpot(g, p.id) && !count('search')) action = 'search';
    else action = r() < .65 ? 'loot' : 'cover';
    return { type: 'promise', action, turn };
  }
  if (g.phase === 'secret') {
    let action = p.promise ?? 'cover';
    if (agent && (action === 'a' || action === 'b' || action === 'repair') && r() < .28) action = 'loot';
    else if (!agent && (action === 'a' || action === 'b') && g.alarm === 0 && r() < .08) action = 'loot';
    if (action === 'search') {
      const spot = botSpot(g, p.id);
      if (spot) {
        const search = g.searches[p.id]?.spotId === spot.id ? g.searches[p.id] : null;
        if (!search?.found) return { type: 'inspect', target: spot.id, step: [0, 1, 2].find(step => !search?.opened.includes(step))!, turn };
        return { type: 'choose', action, target: spot.id, turn };
      }
      action = g.alarm >= 2 ? 'repair' : 'cover';
    }
    if (action === 'a' && g.roomIndex === 3) {
      const digits = [0, 1, 2].map(index => g.privateClues[p.id].find(clue => clue.index === index)?.value ?? [...g.claims].reverse().find(claim => claim.index === index)?.value);
      const known = digits.every(value => value !== undefined);
      const code = known ? digits.join('') : agent ? '000' : 'FORCE';
      return { type: 'choose', action, code, turn };
    }
    return { type: 'choose', action, turn };
  }
  if (g.phase === 'vote') {
    const suspects = active(g).filter(t => t.id !== p.id).map(t => ({ p: t, n: g.history.filter(h => h.id === t.id && h.betrayed).length })).sort((a, b) => b.n - a.n);
    const target = suspects[0]?.n >= 2 && r() < .65 ? suspects[0].p.id : 'skip';
    return { type: 'vote', target, turn };
  }
  return null;
}
