import type { Action } from "./engine";
export type TrialAction = Action | "radio";
export type Trial = {
  action: TrialAction;
  seed: number;
  difficulty: 1 | 2;
  elapsed: number;
  stage: number;
  needle: number;
  progress: number;
  cooldown: number;
  cursor: number;
  connections: number[];
  correct: boolean[];
  panel: number;
  cutIndex: number;
  cutErrors: number;
  cutSamples: number;
  cutX: number;
  cutY: number;
  done: boolean;
};
export function newTrial(
  action: TrialAction,
  seed: number,
  difficulty: 1 | 2 = 1,
): Trial {
  return {
    action,
    seed,
    difficulty,
    elapsed: 0,
    stage: 0,
    needle: 0.12,
    progress: 0,
    cooldown: 0,
    cursor: 0,
    connections: [-1, -1, -1],
    correct: [false, false, false],
    panel: 0,
    cutIndex: 0,
    cutErrors: 0,
    cutSamples: 0,
    cutX: 0.5,
    cutY: 0.15,
    done: false,
  };
}
export const targetBand = (t: Trial) =>
  0.24 + ((t.seed + t.stage * 7) % 17) / 40;
export const pinBand = (t: Trial) => 0.2 + ((t.seed + t.stage * 13) % 23) / 40;
export const radioTarget = (t: Trial) =>
  0.18 + ((t.seed + t.stage * 19) % 29) / 45;
export const radioSignal = (t: Trial) =>
  t.done || Math.abs(t.needle - radioTarget(t)) < 0.028
    ? "green"
    : Math.abs(t.needle - radioTarget(t)) < 0.12
      ? "orange"
      : "red";
export function gaze(t: Trial): "away" | "warning" | "front" {
  if (t.difficulty === 2) {
    const cycle = (t.elapsed + (t.seed % 7) / 10) % 3.2;
    return cycle < 0.8 ? "away" : cycle < 1.05 ? "warning" : "front";
  }
  const cycle = (t.elapsed + (t.seed % 7) / 10) % 3.4;
  return cycle < 1.65 ? "away" : cycle < 2.05 ? "warning" : "front";
}
export function stepTrial(t: Trial, dt: number, held: boolean): void {
  if (t.done) return;
  dt = Math.max(0, Math.min(dt, 0.1));
  t.elapsed += dt;
  t.cooldown = Math.max(0, t.cooldown - dt);
  if (t.action === "drill") {
    t.needle = Math.max(
      0,
      Math.min(1, t.needle + (held && !t.cooldown ? 0.64 : -0.45) * dt),
    );
    if (t.needle >= 0.94) {
      t.progress = 0;
      t.cooldown = 0.5;
    }
    const band = targetBand(t);
    if (!t.cooldown && t.needle >= band && t.needle <= band + 0.13)
      t.progress += dt / 1.45;
    if (t.progress >= 1) {
      t.stage++;
      t.progress = 0;
    }
  }
  if (t.action === "loot") {
    const pos = (t.elapsed * (0.76 + t.stage * 0.12)) % 2;
    t.cursor = pos <= 1 ? pos : 2 - pos;
  }
  if (t.action === "pocket" && held && !t.cooldown) {
    if (gaze(t) === "front") {
      t.progress = 0;
      if (t.difficulty === 2) t.stage = Math.max(0, t.stage - 1);
      t.cooldown = 0.5;
    } else {
      t.progress += dt / (t.difficulty === 2 ? 1.35 : 1.3);
      if (t.progress >= 1) {
        t.stage++;
        t.progress = 0;
      }
    }
  }
  if (t.action === "radio") {
    t.progress = radioSignal(t) === "green" ? t.progress + dt / 0.85 : 0;
    if (t.progress >= 1) {
      t.stage++;
      t.progress = 0;
    }
  }
  if (t.action !== "painting" && t.action !== "secure") t.done = t.stage >= 3;
}
export function pin(t: Trial): boolean {
  if (t.done || t.cooldown || t.action !== "loot") return false;
  if (Math.abs(t.cursor - pinBand(t)) <= 0.075) {
    t.stage++;
    t.done = t.stage >= 3;
    return true;
  }
  t.cooldown = 0.5;
  return false;
}
export function connect(t: Trial, cable: number, terminal: number) {
  if (t.done || t.correct[cable]) return;
  t.connections = t.connections.map((v, i) =>
    i === cable ? terminal : v === terminal && terminal !== -1 ? -1 : v,
  );
}
export const terminalId = (t: Trial, index: number) =>
  (index + (t.seed % 3) + t.panel) % 3;
export function lever(t: Trial): boolean {
  t.connections.forEach((connection, i) => {
    t.correct[i] = connection >= 0 && terminalId(t, connection) === i;
    if (!t.correct[i]) t.connections[i] = -1;
  });
  if (t.correct.every(Boolean)) {
    t.panel++;
    t.stage = t.panel === 2 ? 3 : 1;
    t.done = t.panel === 2;
    if (!t.done) {
      t.connections = [-1, -1, -1];
      t.correct = [false, false, false];
    }
  }
  return t.done;
}
/** Ordered closed silhouette. Coordinates normalised to the artwork, independent of DPI. */
export function cutPath(t: Pick<Trial, "seed">): [number, number][] {
  return Array.from({ length: 81 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 80;
    const r = 1 + 0.08 * Math.sin(3 * a + (t.seed % 3) * 0.4);
    return [0.5 + Math.cos(a) * 0.32 * r, 0.5 + Math.sin(a) * 0.35 * r];
  });
}
export const cutAccuracy = (t: Trial) =>
  Math.round(100 * (1 - t.cutErrors / Math.max(1, t.cutSamples)));
export const CUT_TOLERANCE = 0.09;
export const CUT_REQUIRED_ACCURACY = 70;
export function cutAt(t: Trial, x: number, y: number): boolean {
  if (
    t.action !== "painting" ||
    t.done ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  )
    return false;
  const path = cutPath(t),
    oldX = t.cutX,
    oldY = t.cutY;
  t.cutX = Math.max(0, Math.min(1, x));
  t.cutY = Math.max(0, Math.min(1, y));
  if (t.cutIndex === 0) {
    t.cutSamples++;
    if (Math.hypot(x - path[0][0], y - path[0][1]) > 0.12) {
      t.cutErrors++;
      return false;
    }
    t.cutIndex = 1;
    return true;
  }
  const steps = Math.max(1, Math.ceil(Math.hypot(x - oldX, y - oldY) / 0.025));
  let accepted = false;
  for (let k = 1; k <= steps; k++) {
    const px = oldX + ((x - oldX) * k) / steps,
      py = oldY + ((y - oldY) * k) / steps;
    let best = -1,
      dist = Infinity;
    for (
      let i = Math.max(0, t.cutIndex - 4);
      i < Math.min(81, t.cutIndex + 10);
      i++
    ) {
      const d = Math.hypot(px - path[i][0], py - path[i][1]);
      if (d < dist) {
        dist = d;
        best = i;
      }
    }
    t.cutSamples = Math.min(10000, t.cutSamples + 1);
    if (dist > CUT_TOLERANCE)
      t.cutErrors = Math.min(t.cutSamples, t.cutErrors + 1);
    else {
      accepted = true;
      t.cutIndex = Math.max(t.cutIndex, best + 1);
    }
  }
  t.stage = Math.min(3, Math.floor(t.cutIndex / 27));
  t.done = t.cutIndex >= 81 && cutAccuracy(t) >= CUT_REQUIRED_ACCURACY;
  return accepted;
}
