/** Measured on the original open GLB, in its native glTF coordinate system.
 * The front camera looks down -Z; these are the actual plug/socket/switch sites.
 * Keep DOM targets and rendered cable ends derived from these same coordinates.
 */
export const ELECTRICAL = {
  sources: [
    [-0.09, 0.32, -0.095],
    [-0.09, 0.04, -0.075],
    [-0.09, -0.25, -0.085],
  ],
  sockets: [
    [0.49, 0.336, -0.095],
    [0.49, 0.059, -0.095],
    [0.49, -0.217, -0.095],
  ],
  // Centres of the enamel labels beside the socket holes, measured on the GLB.
  plates: [
    [0.648, 0.336, -0.143],
    [0.648, 0.059, -0.143],
    [0.648, -0.217, -0.143],
  ],
  switch: [0.56, -0.44, -0.075],
  symbols: ["1 △", "2 ○", "3 ╳"],
  colors: ["#edb844", "#ef896a", "#47d8ca"],
} as const;

export function loosePlug(cable: number): [number, number, number] {
  return [0.16, ELECTRICAL.sources[cable][1] - 0.045, 0.045];
}

/** Least-squares separation of a column's touch targets. Physical parts remain
 * inside their 44px zones; only transparent hit areas move, never model anchors.
 */
export function touchCenters(anchors: number[], height: number, size = 44) {
  const groups: { sum: number; count: number }[] = [];
  anchors.forEach((anchor, i) => {
    groups.push({ sum: anchor - i * size, count: 1 });
    while (groups.length > 1) {
      const b = groups[groups.length - 1],
        a = groups[groups.length - 2];
      if (a.sum / a.count <= b.sum / b.count) break;
      groups.splice(-2, 2, { sum: a.sum + b.sum, count: a.count + b.count });
    }
  });
  const centers = groups
    .flatMap((group) =>
      Array<number>(group.count).fill(group.sum / group.count),
    )
    .map((center, i) => center + i * size);
  if (!centers.length) return centers;
  const shift = Math.max(
    size / 2 - centers[0],
    Math.min(0, height - size / 2 - centers[centers.length - 1]),
  );
  return centers.map((center) => center + shift);
}
