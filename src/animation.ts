import * as T from "three";
export const CLIPS = [
  "idle",
  "walk",
  "promise",
  "drill",
  "secure",
  "loot",
  "pocket",
  "failure",
  "accuse",
  "celebrate",
  "surrender",
] as const;
export type Clip = (typeof CLIPS)[number];
/** Shared pivot rig: procedural clips apply to the original model's five named joints. */
export function pose(
  parts: Record<string, T.Object3D>,
  rest: Record<string, T.Euler>,
  clip: Clip,
  time: number,
  reduced: boolean,
) {
  for (const [name, part] of Object.entries(parts))
    part.rotation.copy(rest[name]);
  const wave = reduced
    ? 0
    : Math.sin(time * (clip === "walk" ? 11 : clip === "drill" ? 28 : 6));
  const rotate = (name: string, axis: "x" | "y" | "z", value: number) => {
    if (parts[name]) parts[name].rotation[axis] += value;
  };
  if (clip === "idle") {
    rotate("Head", "z", reduced ? 0 : Math.sin(time * 1.8) * 0.025);
    return;
  }
  if (clip === "walk") {
    rotate("ArmL", "x", wave * 0.5);
    rotate("ArmR", "x", -wave * 0.5);
    rotate("LegL", "x", -wave * 0.5);
    rotate("LegR", "x", wave * 0.5);
  }
  if (clip === "promise" || clip === "accuse") {
    rotate("ArmR", "x", -1.1);
    rotate("ArmR", "z", clip === "accuse" ? -0.5 : -0.15 + wave * 0.1);
    rotate("Head", "y", 0.15);
  }
  if (clip === "drill") {
    rotate("ArmL", "x", -1.25 + wave * 0.04);
    rotate("ArmR", "x", -1.25 - wave * 0.04);
    rotate("Head", "x", 0.17);
  }
  if (clip === "secure") {
    rotate("ArmL", "x", -0.8 + wave * 0.15);
    rotate("ArmR", "x", -1.25 - wave * 0.14);
    rotate("Head", "x", 0.25);
  }
  if (clip === "loot") {
    rotate("ArmL", "x", -1.1 + wave * 0.3);
    rotate("ArmR", "x", -0.6 - wave * 0.3);
    rotate("Head", "x", 0.15);
  }
  if (clip === "pocket") {
    rotate("ArmR", "x", -1.3 + wave * 0.1);
    rotate("ArmL", "x", -0.4);
    rotate("Head", "y", wave * 0.25);
  }
  if (clip === "failure") {
    rotate("Head", "z", -0.2);
    rotate("ArmR", "x", -1.8);
    rotate("ArmR", "z", -0.5);
  }
  if (clip === "celebrate" || clip === "surrender") {
    rotate("ArmL", "z", -2.4 - wave * 0.1);
    rotate("ArmR", "z", 2.4 + wave * 0.1);
    rotate("Head", "x", -0.1);
  }
}
