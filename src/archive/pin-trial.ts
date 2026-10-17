/** Archived locker challenge, preserved independently of the statue action.
 * No DOM, engine or rendering dependency: a future scene can reuse it directly.
 * The legacy action ID is local to this archived state, not a live game choice.
 */
export type PinTrial = {
  action: "loot";
  seed: number;
  elapsed: number;
  stage: number;
  cooldown: number;
  cursor: number;
  done: boolean;
};
export const newPinTrial = (seed: number): PinTrial => ({
  action: "loot",
  seed,
  elapsed: 0,
  stage: 0,
  cooldown: 0,
  cursor: 0,
  done: false,
});
export const pinBand = (t: Pick<PinTrial, "seed" | "stage">) =>
  0.2 + ((t.seed + t.stage * 13) % 23) / 40;
export function stepPinTrial(t: PinTrial, dt: number): void {
  if (t.done) return;
  dt = Math.max(0, Math.min(dt, 0.1));
  t.elapsed += dt;
  t.cooldown = Math.max(0, t.cooldown - dt);
  const pos = (t.elapsed * (0.76 + t.stage * 0.12)) % 2;
  t.cursor = pos <= 1 ? pos : 2 - pos;
  t.done = t.stage >= 3;
}
export function pin(t: PinTrial): boolean {
  if (t.done || t.cooldown || t.action !== "loot") return false;
  if (Math.abs(t.cursor - pinBand(t)) <= 0.075) {
    t.stage++;
    t.done = t.stage >= 3;
    return true;
  }
  t.cooldown = 0.5;
  return false;
}
