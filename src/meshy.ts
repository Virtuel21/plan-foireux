import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mountSafe } from "./safe";
import safePlacement from "../scenes/safe-placement.json";

const url = (name: string) =>
  `${import.meta.env.BASE_URL}models/${name}.glb?v=meshy-originals-20261017`;

/** Original Meshy objects, placed with parent transforms only. */
export async function loadMeshyMuseum(loader: GLTFLoader) {
  const [backdrop, vault, lockers, cameraBox, guard] = await Promise.all(
    ["museum", "safe-box", "lockers", "camera-box", "guard"].map((name) =>
      loader.loadAsync(url(name)),
    ),
  );
  const room = new T.Group();
  room.name = "Museum";
  const decor = backdrop.scene;
  const box = new T.Box3().setFromObject(decor);
  const size = box.getSize(new T.Vector3());
  const center = box.getCenter(new T.Vector3());
  decor.scale.set(12 / size.x, 12 / size.x, 8 / size.z);
  decor.position.set(
    -center.x * decor.scale.x,
    0.14 - -0.244910535 * decor.scale.y,
    -center.z * decor.scale.z,
  );
  room.add(decor);
  const station = (name: string, x: number, y: number, z: number) => {
    const root = new T.Group();
    root.name = name;
    root.position.set(x, y, z);
    room.add(root);
    return root;
  };
  const fit = (object: T.Object3D, height: number) => {
    const root = new T.Group();
    const bounds = new T.Box3().setFromObject(object);
    const dimensions = bounds.getSize(new T.Vector3());
    const middle = bounds.getCenter(new T.Vector3());
    const scale = height / dimensions.y;
    object.scale.multiplyScalar(scale);
    object.position.set(
      -middle.x * scale,
      -bounds.min.y * scale,
      -middle.z * scale,
    );
    root.add(object);
    return { root, width: dimensions.x * scale };
  };
  // Center the case in the measured niche and support its full base on the sill.
  const safe = station(
    "POST_Vault",
    ...(safePlacement.position as [number, number, number]),
  );
  safe.rotation.y = safePlacement.rotationY;
  safe.scale.fromArray(safePlacement.scale);
  safe.add(mountSafe(vault.scene));
  station("POST_Loot", 0.8, 0.15, -2.2).add(fit(lockers.scene, 1.6).root);
  const cameras = station("POST_Security", 5.2, 0.15, -3.3);
  cameraBox.scene.position.y = 1.5;
  cameras.add(cameraBox.scene);
  const cameraPick = new T.Mesh(
    new T.BoxGeometry(0.7, 0.55, 0.7),
    new T.MeshBasicMaterial({ visible: false }),
  );
  cameraPick.name = "SecurityCameraPick";
  cameraPick.position.y = 2.85;
  cameras.add(cameraPick);
  const boxPick = new T.Mesh(
    new T.BoxGeometry(0.55, 0.76, 0.32),
    new T.MeshBasicMaterial({ visible: false }),
  );
  boxPick.name = "SecurityBoxPick";
  boxPick.position.set(0, 1.86, 0);
  cameras.add(boxPick);
  station("POST_Painting", -1, 0.15, -3.7);
  for (let i = 0; i < 4; i++)
    station(`PROP_Wealth_${i}`, -3.1 + i * 1.85, 0.22, 2.8);
  // Native Meshy rig, native idle animation. No weight or topology changes.
  const watchman = station("Guard", -2.4, 0.15, -1.75);
  watchman.add(guard.scene);
  return { scene: room, animations: guard.animations };
}

export async function loadMeshyCharacters(loader: GLTFLoader) {
  const [male, female] = await Promise.all(
    ["male", "female"].map((name) => loader.loadAsync(url(name))),
  );
  return [male, female, male, female];
}

/** Clothing hue variants keep the shared original 4K maps and all mesh data. */
export function clothingVariant(root: T.Object3D, index: number) {
  if (index !== 2 && index !== 3) return;
  root.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    const change = (source: T.Material) => {
      const material = source.clone();
      material.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "varying vec3 vMeshyPosition;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvMeshyPosition = position;",
        );
        shader.fragmentShader =
          "varying vec3 vMeshyPosition;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          float hi = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
          float lo = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
          float delta = hi - lo;
          float hue = 0.0;
          if (delta > 0.001) {
            if (hi == diffuseColor.r) hue = mod((diffuseColor.g-diffuseColor.b)/delta, 6.0)/6.0;
            else if (hi == diffuseColor.g) hue = ((diffuseColor.b-diffuseColor.r)/delta+2.0)/6.0;
            else hue = ((diffuseColor.r-diffuseColor.g)/delta+4.0)/6.0;
          }
          float clothing = ${index === 2 ? "clamp(1.0-smoothstep(1.16,1.20,vMeshyPosition.y)+smoothstep(1.33,1.37,vMeshyPosition.y),0.0,1.0)" : "1.0"};
          float selection = ${index === 2 ? "smoothstep(0.04,0.06,hue)*(1.0-smoothstep(0.18,0.20,hue))" : "smoothstep(0.40,0.42,hue)*(1.0-smoothstep(0.55,0.57,hue))"};
          if (delta > hi*0.35) {
            vec3 colour = ${index === 2 ? "vec3(1.0, 0.25, 0.025)" : "vec3(0.46, 0.13, 0.43)"};
            diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(lo), colour*hi, 0.9), clothing*selection);
          }`,
        );
      };
      material.customProgramCacheKey = () => `meshy-clothing-${index}`;
      return material;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(change)
      : change(object.material);
  });
}
