import { newTrial, type Trial } from "./trial";
import { CONFIG } from "../config/rules";
export { CONFIG } from "../config/rules";
export const COLORS = ["#ecac32", "#28aaa5", "#ee7836", "#9d65b2"];
export const ACTIONS = [
  "drill",
  "secure",
  "loot",
  "painting",
  "pocket",
] as const;
export type Action = (typeof ACTIONS)[number];
export type Role = "burglar" | "agent";
export type Phase = keyof typeof CONFIG.durations | "ended";
export type Choice = { action: Action; target?: string };
export type Player = {
  id: string;
  name: string;
  color: string;
  bot: boolean;
  online: boolean;
  money: number;
  promise: Choice | null;
  ready: boolean;
  exposed: Role | null;
};
export type Finding = {
  id: string;
  choice: Choice;
  promise: Choice | null;
  success: boolean;
  gain: number;
  loss: number;
  betrayed: boolean;
  zone: "vault" | "entry";
};
export type Report = {
  round: number;
  findings: Finding[];
  alarmBefore: number;
  alarmAfter: number;
  jam: number;
  failures: number;
  security: number;
  vaultAdded: number;
  trace: "vault" | "entry" | null;
};
export type Result = {
  kind: "escape" | "fbi" | "aborted";
  winners: string[];
  kings: string[];
  text: string;
};
export type Command = {
  type: "promise" | "choose" | "jam" | "vote" | "progress" | "result";
  turn: number;
  choice?: Choice;
  enabled?: boolean;
  target?: string;
  trial?: Trial;
  success?: boolean;
};
export type Game = {
  players: Player[];
  roles: Record<string, Role>;
  choices: Record<string, Choice>;
  jams: Record<string, boolean>;
  jamTargets: Record<string, string>;
  votes: Record<string, string>;
  trials: Record<string, Trial>;
  successes: Record<string, boolean>;
  wallets: Record<string, number>;
  lastThefts: Record<string, string>;
  phase: Phase;
  round: number;
  turn: number;
  phaseStarted: number;
  deadline: number;
  layout: number;
  seed: number;
  vault: number;
  alarm: number;
  charges: number;
  watched: string | null;
  report: Report | null;
  history: Report[];
  voteResult: { votes: Record<string, string>; suspect: string | null } | null;
  result: Result | null;
  pausedAt: number | null;
  disconnects: Record<string, number>;
};
export type View = Pick<
  Game,
  | "players"
  | "phase"
  | "round"
  | "turn"
  | "deadline"
  | "phaseStarted"
  | "layout"
  | "seed"
  | "vault"
  | "alarm"
  | "charges"
  | "watched"
  | "report"
  | "voteResult"
  | "result"
  | "pausedAt"
> & {
  myId: string;
  myRole: Role;
  myChoice: Choice | null;
  myLastTheft: string | null;
  myJam: boolean;
  myJamTarget: string | null;
  voteCounts: Record<string, number>;
  myVote: string | null;
  myTrial: Trial | null;
  mySuccess: boolean | null;
  pauseRemaining: number;
};
export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function player(
  id: string,
  name: string,
  index: number,
  bot = false,
): Player {
  return {
    id,
    name: name.trim().slice(0, 18) || "Complice",
    color: COLORS[index % 4],
    bot,
    online: true,
    money: 0,
    promise: null,
    ready: bot,
    exposed: null,
  };
}
export function createGame(
  players: Player[],
  seed: number,
  now = Date.now(),
  privateRandom = Math.random,
): Game {
  if (players.length !== 4 || new Set(players.map((p) => p.id)).size !== 4)
    throw Error("Exactement quatre joueurs distincts sont requis.");
  const agent = Math.floor(privateRandom() * 4);
  return {
    players: players.map((p) => ({
      ...p,
      money: 0,
      promise: null,
      exposed: null,
    })),
    roles: Object.fromEntries(
      players.map((p, i) => [p.id, i === agent ? "agent" : "burglar"]),
    ),
    choices: {},
    jams: {},
    jamTargets: {},
    votes: {},
    trials: {},
    successes: {},
    wallets: {},
    lastThefts: {},
    phase: "role",
    round: 1,
    turn: 1,
    phaseStarted: now,
    deadline: now + CONFIG.durations.role,
    seed,
    layout: Math.floor(random(seed)() * 3),
    vault: 0,
    alarm: 0,
    charges: 2,
    watched: null,
    report: null,
    history: [],
    voteResult: null,
    result: null,
    pausedAt: null,
    disconnects: {},
  };
}
export function publicView(g: Game, id: string, now = Date.now()): View {
  return structuredClone({
    players: g.players,
    phase: g.phase,
    round: g.round,
    turn: g.turn,
    deadline: g.deadline,
    phaseStarted: g.phaseStarted,
    layout: g.layout,
    seed: g.seed,
    vault: g.vault,
    alarm: g.alarm,
    charges: g.charges,
    watched: g.watched,
    report: g.report,
    voteResult: g.voteResult,
    result: g.result,
    pausedAt: g.pausedAt,
    myId: id,
    myRole: g.roles[id] ?? "burglar",
    myChoice: g.choices[id] ?? null,
    myLastTheft: g.lastThefts[id] ?? null,
    myJam: g.jams[id] ?? false,
    myJamTarget: g.jamTargets[id] ?? null,
    voteCounts:
      g.phase === "debate"
        ? Object.fromEntries(
            [...g.players.map((p) => p.id), "pass"].map((target) => [
              target,
              Object.values(g.votes).filter((v) => v === target).length,
            ]),
          )
        : {},
    myVote: g.votes[id] ?? null,
    myTrial: g.trials[id] ?? null,
    mySuccess: g.successes[id] ?? null,
    pauseRemaining:
      g.pausedAt === null
        ? 0
        : Math.max(
            0,
            CONFIG.reconnect -
              (now - Math.min(...Object.values(g.disconnects))),
          ),
  });
}
export function legal(
  g: Pick<Game, "players" | "vault" | "watched">,
  id: string,
  c: Choice | undefined,
): c is Choice {
  return (
    !!c &&
    typeof c === "object" &&
    Object.keys(c).every((k) => ["action", "target"].includes(k)) &&
    ACTIONS.includes(c.action) &&
    !(c.action === "drill" && g.vault >= CONFIG.vault) &&
    !(g.watched === id && !["drill", "secure"].includes(c.action)) &&
    (c.action !== "pocket"
      ? c.target === undefined
      : typeof c.target === "string" &&
        c.target !== id &&
        g.players.some((p) => p.id === c.target))
  );
}
export const recommended = (v: Pick<View, "vault" | "round">) =>
  Math.ceil((CONFIG.vault - v.vault) / (2 * (CONFIG.rounds + 1 - v.round)));
export function apply(
  g: Game,
  id: string,
  c: Command,
  now = Date.now(),
): boolean {
  if (
    !c ||
    typeof c !== "object" ||
    Array.isArray(c) ||
    typeof c.type !== "string" ||
    !g.players.some((p) => p.id === id) ||
    c.turn !== g.turn ||
    g.phase === "ended" ||
    g.pausedAt !== null ||
    now >= g.deadline
  )
    return false;
  const fields: Record<Command["type"], string[]> = {
    promise: ["choice"],
    choose: ["choice"],
    jam: ["enabled", "target"],
    vote: ["target"],
    progress: ["trial"],
    result: ["success"],
  };
  if (
    !Object.hasOwn(fields, c.type) ||
    Object.keys(c).some((k) => !["type", "turn", ...fields[c.type]].includes(k))
  )
    return false;
  if (
    c.type === "promise" &&
    g.phase === "promise" &&
    c.choice?.action !== "pocket" &&
    legal(g, id, c.choice)
  ) {
    g.players.find((p) => p.id === id)!.promise = structuredClone(c.choice);
    return true;
  }
  if (c.type === "choose" && g.phase === "secret" && legal(g, id, c.choice)) {
    g.choices[id] = structuredClone(c.choice);
    return true;
  }
  if (
    c.type === "jam" &&
    g.phase === "secret" &&
    g.roles[id] === "agent" &&
    g.watched !== id &&
    typeof c.enabled === "boolean" &&
    (!c.enabled ||
      (typeof c.target === "string" &&
        c.target !== id &&
        g.players.some((p) => p.id === c.target)))
  ) {
    g.jams[id] = c.enabled;
    if (c.enabled) g.jamTargets[id] = c.target!;
    else delete g.jamTargets[id];
    return true;
  }
  if (
    c.type === "vote" &&
    g.phase === "debate" &&
    (g.charges > 0 || c.target === "pass") &&
    typeof c.target === "string" &&
    (c.target === "pass" || g.players.some((p) => p.id === c.target))
  ) {
    g.votes[id] = c.target;
    return true;
  }
  if (
    c.type === "progress" &&
    g.phase === "minigame" &&
    !(id in g.successes) &&
    validProgress(c.trial, g.trials[id])
  ) {
    g.trials[id] = structuredClone(c.trial!);
    return true;
  }
  if (
    c.type === "result" &&
    g.phase === "minigame" &&
    typeof c.success === "boolean" &&
    !(id in g.successes)
  ) {
    g.successes[id] = c.success;
    return true;
  }
  return false;
}
function validProgress(
  t: Trial | undefined,
  current: Trial | undefined,
): boolean {
  if (
    !t ||
    !current ||
    JSON.stringify(t).length > 3000 ||
    t.action !== current.action ||
    t.seed !== current.seed ||
    t.difficulty !== current.difficulty
  )
    return false;
  return (
    Number.isFinite(t.elapsed) &&
    t.elapsed >= current.elapsed &&
    t.elapsed <= 18.1 &&
    Number.isInteger(t.stage) &&
    t.stage >= 0 &&
    t.stage <= 3 &&
    Number.isInteger(t.panel) &&
    t.panel >= 0 &&
    t.panel <= 2 &&
    Number.isInteger(t.cutIndex) &&
    t.cutIndex >= 0 &&
    t.cutIndex <= 81 &&
    Number.isFinite(t.cutErrors) &&
    t.cutErrors >= 0 &&
    t.cutErrors <= 10000 &&
    Number.isFinite(t.cutSamples) &&
    t.cutSamples >= 0 &&
    t.cutSamples <= 10000 &&
    t.cutErrors <= t.cutSamples &&
    [t.needle, t.progress, t.cooldown, t.cursor, t.cutX, t.cutY].every(
      Number.isFinite,
    ) &&
    t.needle >= 0 &&
    t.needle <= 1 &&
    t.progress >= 0 &&
    t.progress <= 1.1 &&
    t.cooldown >= 0 &&
    t.cooldown <= 0.6 &&
    Array.isArray(t.connections) &&
    t.connections.length === 3 &&
    t.connections.every((n) => Number.isInteger(n) && n >= -1 && n <= 2) &&
    Array.isArray(t.correct) &&
    t.correct.length === 3 &&
    t.correct.every((n) => typeof n === "boolean") &&
    typeof t.done === "boolean"
  );
}
function finish(g: Game) {
  const escape = g.vault >= CONFIG.vault && g.alarm < CONFIG.alarm,
    burglars = g.players.filter((p) => g.roles[p.id] === "burglar");
  for (const p of burglars) p.money = escape ? p.money + CONFIG.bonus : 0;
  const max = Math.max(...burglars.map((p) => p.money));
  g.result = {
    kind: escape ? "escape" : "fbi",
    winners: g.players
      .filter((p) =>
        escape ? g.roles[p.id] === "burglar" : g.roles[p.id] === "agent",
      )
      .map((p) => p.id),
    kings: escape
      ? burglars.filter((p) => p.money === max).map((p) => p.id)
      : [],
    text: escape
      ? "Le casse est réussi. Tous les braqueurs s’échappent !"
      : g.alarm >= CONFIG.alarm
        ? "La police entre dans le musée. Le FBI gagne."
        : "Le temps est écoulé, mais le coffre est incomplet. Le FBI gagne.",
  };
  g.players.forEach((p) => (p.exposed = g.roles[p.id]));
  g.phase = "ended";
  g.turn++;
}
export function resolve(g: Game): Report {
  if (g.history.some((r) => r.round === g.round))
    return g.history.find((r) => r.round === g.round)!;
  const before = { ...g.wallets },
    gains: Record<string, number> = {},
    losses: Record<string, number> = {};
  // A successful radio hides behind an ordinary failed task. Never project its target.
  const effective = { ...g.successes };
  for (const p of g.players) {
    const target = g.jamTargets[p.id];
    if (
      g.roles[p.id] === "agent" &&
      g.jams[p.id] &&
      g.watched !== p.id &&
      g.successes[p.id] &&
      target &&
      target !== p.id
    )
      effective[target] = false;
  }
  let drills = 0,
    secure = 0;
  const pools = {
    drill: CONFIG.cooperation,
    secure: CONFIG.cooperation,
    loot: CONFIG.loot,
    painting: CONFIG.painting,
  };
  for (const p of g.players) {
    gains[p.id] = 0;
    losses[p.id] = 0;
    const c = g.choices[p.id];
    if (!c || !effective[p.id]) continue;
    if (c.action === "drill") drills++;
    if (c.action === "secure") secure++;
    if (c.action !== "pocket") {
      // All participants occupy a share; failed shares are lost, never redistributed.
      const count = g.players.filter(
        (x) => g.choices[x.id]?.action === c.action,
      ).length;
      gains[p.id] = Math.floor(pools[c.action] / count);
    }
  }
  const earned = { ...gains };
  for (const victim of g.players) {
    const thieves = g.players.filter(
      (p) =>
        g.choices[p.id]?.action === "pocket" &&
        g.choices[p.id]?.target === victim.id &&
        effective[p.id],
    );
    if (!thieves.length) continue;
    const share = Math.floor(
      (earned[victim.id] > 0
        ? Math.min(
            earned[victim.id] - 1,
            Math.ceil(earned[victim.id] * CONFIG.theftIncomeRate),
          )
        : Math.min(CONFIG.theft, before[victim.id] ?? victim.money)) /
        thieves.length,
    );
    thieves.forEach((p) => (gains[p.id] += share));
    losses[victim.id] = share * thieves.length;
  }
  const report: Report = {
    round: g.round,
    findings: g.players.map((p) => ({
      id: p.id,
      choice: g.choices[p.id] ?? { action: "secure" },
      promise: p.promise,
      success: !!effective[p.id],
      gain: gains[p.id],
      loss: losses[p.id],
      betrayed:
        !!p.promise &&
        (p.promise.action !== g.choices[p.id]?.action ||
          p.promise.target !== g.choices[p.id]?.target),
      zone: ["drill", "loot", "painting"].includes(g.choices[p.id]?.action)
        ? "vault"
        : "entry",
    })),
    alarmBefore: g.alarm,
    alarmAfter: Math.max(
      0,
      g.alarm +
        1 +
        g.players.filter((p) => !effective[p.id]).length -
        2 * secure,
    ),
    jam: 0,
    failures: g.players.filter((p) => !effective[p.id]).length,
    security: secure,
    vaultAdded: Math.min(CONFIG.vault - g.vault, 2 * drills),
    trace: null,
  };
  g.players.forEach((p) => (p.money += gains[p.id] - losses[p.id]));
  g.alarm = report.alarmAfter;
  g.vault += report.vaultAdded;
  g.lastThefts = Object.fromEntries(
    g.players
      .filter((p) => g.choices[p.id]?.action === "pocket")
      .map((p) => [p.id, g.choices[p.id].target!]),
  );
  g.report = report;
  g.history.push(report);
  g.watched = null;
  return report;
}
export function setOnline(
  g: Game,
  id: string,
  online: boolean,
  now = Date.now(),
) {
  const p = g.players.find((p) => p.id === id);
  if (!p || p.bot || g.phase === "ended") return;
  p.online = online;
  if (!online) {
    g.disconnects[id] ??= now;
    g.pausedAt ??= now;
  } else {
    delete g.disconnects[id];
    if (!Object.keys(g.disconnects).length && g.pausedAt !== null) {
      const duration = now - g.pausedAt;
      g.deadline += duration;
      g.phaseStarted += duration;
      g.pausedAt = null;
    }
  }
}
export function advance(
  g: Game,
  now = Date.now(),
  privateRandom = Math.random,
) {
  if (g.phase === "ended") return;
  if (g.pausedAt !== null) {
    if (Object.values(g.disconnects).some((t) => now - t >= CONFIG.reconnect)) {
      g.result = {
        kind: "aborted",
        winners: [],
        kings: [],
        text: "Reconnexion expirée. Partie terminée sans classement.",
      };
      g.phase = "ended";
      g.turn++;
    }
    return;
  }
  const allVoted =
    g.phase === "debate" &&
    g.players.every((p) => Object.hasOwn(g.votes, p.id));
  if (now < g.deadline && !allVoted) return;
  let next: Phase;
  if (g.phase === "role") next = "promise";
  else if (g.phase === "promise") next = "secret";
  else if (g.phase === "secret") {
    for (const p of g.players) {
      if (!legal(g, p.id, g.choices[p.id]))
        g.choices[p.id] = legal(g, p.id, p.promise ?? undefined)
          ? { ...p.promise! }
          : { action: "secure" };
      g.trials[p.id] = newTrial(
        g.roles[p.id] === "agent" &&
          g.jams[p.id] &&
          g.jamTargets[p.id] &&
          g.watched !== p.id
          ? "radio"
          : g.choices[p.id].action,
        Math.floor(privateRandom() * 0xffffffff),
        g.choices[p.id].action === "pocket" &&
          g.lastThefts[p.id] === g.choices[p.id].target
          ? 2
          : 1,
      );
      g.wallets[p.id] = p.money;
    }
    next = "transition";
  } else if (g.phase === "transition") next = "minigame";
  else if (g.phase === "minigame") {
    resolve(g);
    next = "reveal";
  } else if (g.phase === "reveal") {
    if (
      g.alarm >= CONFIG.alarm ||
      g.vault >= CONFIG.vault ||
      g.round === CONFIG.rounds
    ) {
      finish(g);
      return;
    }
    next = "debate";
  } else {
    const counts: Record<string, number> = {};
    Object.values(g.votes).forEach(
      (id) => (counts[id] = (counts[id] ?? 0) + 1),
    );
    const suspect =
      g.charges > 0
        ? (g.players.find((p) => (counts[p.id] ?? 0) >= 3)?.id ?? null)
        : null;
    g.voteResult = { votes: { ...g.votes }, suspect };
    if (suspect) g.charges--;
    g.watched = suspect;
    g.round++;
    g.choices = {};
    g.jams = {};
    g.jamTargets = {};
    g.votes = {};
    g.trials = {};
    g.successes = {};
    g.wallets = {};
    g.players.forEach((p) => (p.promise = null));
    next = "promise";
  }
  g.phase = next;
  g.turn++;
  g.phaseStarted = now;
  g.deadline = now + CONFIG.durations[next as keyof typeof CONFIG.durations];
}
export function botAct(g: Game, p: Player, now = Date.now()) {
  const r = random(g.seed + g.round * 173 + g.players.indexOf(p) * 61 + g.turn),
    index = g.players.indexOf(p);
  const choice = (): Choice => {
    if (g.watched === p.id)
      return {
        action: g.vault < CONFIG.vault && index % 2 === 0 ? "drill" : "secure",
      };
    if (g.vault < CONFIG.vault && index === (g.round - 1) % 4)
      return { action: "drill" };
    if (index === g.round % 4) return { action: "secure" };
    if (g.vault < CONFIG.vault && g.round >= 3 && index === (g.round + 1) % 4)
      return { action: "drill" };
    return { action: index % 2 ? "painting" : "loot" };
  };
  if (now - g.phaseStarted < 1400 + index * 350) return;
  if (g.phase === "promise" && !p.promise)
    apply(g, p.id, { type: "promise", choice: choice(), turn: g.turn }, now);
  if (g.phase === "secret" && !g.choices[p.id]) {
    apply(
      g,
      p.id,
      {
        type: "choose",
        choice:
          r() < 0.2 && g.watched !== p.id
            ? { action: "loot" }
            : (p.promise ?? choice()),
        turn: g.turn,
      },
      now,
    );
    if (g.roles[p.id] === "agent")
      apply(
        g,
        p.id,
        {
          type: "jam",
          enabled: r() < 0.65,
          target: g.players.filter((x) => x.id !== p.id)[Math.floor(r() * 3)]
            .id,
          turn: g.turn,
        },
        now,
      );
  }
  if (
    g.phase === "minigame" &&
    now - g.phaseStarted > 9000 &&
    !(p.id in g.successes)
  )
    apply(g, p.id, { type: "result", success: r() > 0.12, turn: g.turn }, now);
  if (g.phase === "debate" && !(p.id in g.votes)) {
    const suspects =
      g.report?.findings
        .filter((f) => !f.success || f.betrayed)
        .map((f) => f.id) ?? [];
    const target =
      suspects.length && r() < 0.75
        ? suspects[Math.floor(r() * suspects.length)]
        : "pass";
    apply(g, p.id, { type: "vote", target, turn: g.turn }, now);
  }
}
