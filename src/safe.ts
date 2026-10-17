import * as T from "three";
import layout from "../scenes/safe-hinge.json";

/** Mount native disconnected pieces. No welding, decimation or normal changes. */
export function mountSafe(source: T.Object3D) {
  let original: T.Mesh | undefined;
  source.traverse((object) => {
    if (object instanceof T.Mesh) original = object;
  });
  if (!original?.geometry.index) throw Error("Coffre Meshy incomplet");
  const native = original.geometry;
  const index = native.index!;
  if (index.count !== layout.triangles * 3)
    throw Error("La topologie du coffre ne correspond pas à sa charnière");
  const moving = new Set(layout.doorTriangles);
  const part = (door: boolean) => {
    const geometry = new T.BufferGeometry();
    for (const [name, attribute] of Object.entries(native.attributes))
      geometry.setAttribute(name, attribute);
    const selected: number[] = [];
    const bounds = new T.Box3();
    const point = new T.Vector3();
    for (let triangle = 0; triangle < layout.triangles; triangle++) {
      if (moving.has(triangle) !== door) continue;
      for (let vertex = 0; vertex < 3; vertex++) {
        const id = index.getX(triangle * 3 + vertex);
        selected.push(id);
        bounds.expandByPoint(
          point.fromBufferAttribute(native.attributes.position, id),
        );
      }
    }
    geometry.setIndex(selected);
    geometry.boundingBox = bounds;
    geometry.boundingSphere = bounds.getBoundingSphere(new T.Sphere());
    return new T.Mesh(geometry, original!.material);
  };
  const body = part(false);
  body.name = "SafeNativeBody";
  const leaf = part(true);
  leaf.name = "SafeNativeDoor";
  original.removeFromParent();
  source.add(body);
  const rest = new T.Group();
  rest.name = "SafeHingeRest";
  rest.position.fromArray(layout.mountedHinge);
  rest.rotation.y = layout.closedAngle;
  source.add(rest);
  const pivot = new T.Group();
  pivot.name = "VaultDoorPivot";
  pivot.userData.openAngle = -layout.closedAngle;
  rest.add(pivot);
  leaf.position.fromArray(layout.sourceHinge).negate();
  pivot.add(leaf);

  const scale = layout.targetHeight / (layout.bodyMax[1] - layout.bodyMin[1]);
  source.scale.setScalar(scale);
  source.position.set(
    -((layout.bodyMin[0] + layout.bodyMax[0]) / 2) * scale,
    -layout.bodyMin[1] * scale,
    -((layout.bodyMin[2] + layout.bodyMax[2]) / 2) * scale,
  );
  return source;
}
