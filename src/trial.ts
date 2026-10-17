import type { Action } from "./engine";
export type Trial = {
  action: Action;
  seed: number;
  elapsed: number;
  stage: number;
  needle: number;
  progress: number;
  cooldown: number;
  cursor: number;
  connections: number[];
  correct: boolean[];
  done: boolean;
};
export function newTrial(action: Action, seed: number): Trial {
  return {
    action,
    seed,
    elapsed: 0,
    stage: 0,
    needle: 0.12,
    progress: 0,
    cooldown: 0,
    cursor: 0,
    connections: [-1, -1, -1],
    correct: [false, false, false],
    done: false,
  };
}
export const targetBand = (t: Trial) =>
  0.35 + ((t.seed + t.stage * 7) % 11) / 50;
export const pinBand = (t: Trial) => 0.25 + ((t.seed + t.stage * 13) % 21) / 50;
export function gaze(t: Trial): "away" | "warning" | "front" {
  const cycle = (t.elapsed + (t.seed % 7) / 10) % 4;
  return cycle < 2.5 ? "away" : cycle < 3 ? "warning" : "front";
}
export function stepTrial(t: Trial, dt: number, held: boolean): void {
  if (t.done) return;
  dt = Math.max(0, Math.min(dt, 0.1));
  t.elapsed += dt;
  t.cooldown = Math.max(0, t.cooldown - dt);
  if (t.action === "drill") {
    t.needle = Math.max(
      0,
      Math.min(1, t.needle + (held && !t.cooldown ? 0.48 : -0.34) * dt),
    );
    if (t.needle >= 0.95) {
      t.progress = 0;
      t.cooldown = 0.5;
    }
    const band = targetBand(t);
    if (!t.cooldown && t.needle >= band && t.needle <= band + 0.23)
      t.progress += dt;
    if (t.progress >= 1) {
      t.stage++;
      t.progress = 0;
    }
  }
  if (t.action === "loot") {
    const pos = (t.elapsed * 0.52) % 2;
    t.cursor = pos <= 1 ? pos : 2 - pos;
  }
  if (t.action === "pocket" && held && !t.cooldown) {
    if (gaze(t) === "front") {
      t.progress = 0;
      t.cooldown = 0.5;
    } else {
      t.progress += dt;
      if (t.progress >= 1) {
        t.stage++;
        t.progress = 0;
      }
    }
  }
  t.done = t.stage >= 3;
}
export function pin(t: Trial): boolean {
  if (t.done || t.cooldown || t.action !== "loot") return false;
  if (Math.abs(t.cursor - pinBand(t)) <= 0.18) {
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
  (index + (t.seed % 3)) % 3;
export function lever(t: Trial): boolean {
  t.connections.forEach((connection, i) => {
    t.correct[i] = connection >= 0 && terminalId(t, connection) === i;
    if (!t.correct[i]) t.connections[i] = -1;
  });
  t.stage = t.correct.filter(Boolean).length;
  t.done = t.stage === 3;
  return t.done;
}
