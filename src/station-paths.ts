import * as T from "three";

export const ACTOR_BODY_RADIUS = 0.34;

/** Use the open aisle west of the crown enclosure, even with four accomplices. */
export function securityPosition(index: number, participants: number) {
  return new T.Vector3(
    2.35 + (index - (participants - 1) / 2) * 1.1,
    0.15,
    -0.8,
  );
}

/** The statue's north-west side is clear of its plinth, ropes and red bench. */
export function statuePosition(index: number, participants: number) {
  const columns = Math.min(2, participants);
  return new T.Vector3(
    -3.45 + ((index % columns) - (columns - 1) / 2) * 0.9,
    0.15,
    1.65 - Math.floor(index / columns) * 0.95,
  );
}

/** Leave the home row before crossing the room, so a lone accomplice never
 * walks through the bodies of players who stayed at their original positions.
 */
export function stationPath(
  from: T.Vector3,
  destination: T.Vector3,
  action: "secure" | "loot" = "secure",
) {
  const path = [new T.Vector3(from.x, 0.15, -0.35)];
  if (action === "loot") path.push(new T.Vector3(destination.x, 0.15, -0.35));
  path.push(destination.clone());
  return path;
}

export function returnPath(
  from: T.Vector3,
  home: T.Vector3,
  action: "secure" | "loot",
) {
  const path: T.Vector3[] = [];
  if (action === "loot") path.push(new T.Vector3(from.x, 0.15, -0.35));
  path.push(new T.Vector3(home.x, 0.15, -0.35), home.clone());
  return path;
}
