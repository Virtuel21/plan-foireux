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
  decor.name = "MuseumBackdrop";
  const box = new T.Box3().setFromObject(decor);
  const size = box.getSize(new T.Vector3());
  const center = box.getCenter(new T.Vector3());
  decor.scale.set(12 / size.x, 12 / size.x, 8 / size.z);
  decor.position.set(
    -center.x * decor.scale.x,
    0.14 - -0.244910535 * decor.scale.y,
    -center.z * decor.scale.z,
  );
  // The generated backdrop painted a red smear onto the limestone skirting
  // beside the safe. Repair only those red texels at the foot of the left wall;
  // the source GLB, artwork and velvet wall above remain intact.
  decor.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    const repair = (source: T.Material) => {
      const material = source.clone();
      material.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "varying vec3 vMuseumPosition;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvMuseumPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
        shader.fragmentShader =
          "varying vec3 vMuseumPosition;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          float skirting = (1.0-smoothstep(-4.95,-4.8,vMuseumPosition.x))
            * (1.0-smoothstep(0.48,0.58,vMuseumPosition.y));
          float redSmear = step(max(diffuseColor.g,diffuseColor.b)*1.7, diffuseColor.r)
            * step(0.03,diffuseColor.r-diffuseColor.g);
          vec3 limestone = vec3(0.48,0.39,0.28)*(0.85+diffuseColor.r*0.3);
          diffuseColor.rgb = mix(diffuseColor.rgb,limestone,skirting*redSmear);`,
        );
      };
      material.customProgramCacheKey = () => "museum-limestone-skirting-v1";
      return material;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(repair)
      : repair(object.material);
  });
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
  // Keep a clear gap in front of the backdrop's plant in every layout.
  station("POST_Loot", -0.3, 0.15, -1.5).add(fit(lockers.scene, 1.6).root);
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
  const painting = station("POST_Painting", -2.4, 0.15, -3.04);
  const paintingPick = new T.Mesh(
    new T.BoxGeometry(1.85, 1.7, 0.12),
    new T.MeshBasicMaterial({ visible: false }),
  );
  paintingPick.name = "PaintingPick";
  paintingPick.position.y = 1.65;
  painting.add(paintingPick);
  // Sample the actual marble, rather than adding a guessed floating offset.
  // This central aisle also clears the statue ropes and the vase pedestal.
  decor.updateMatrixWorld(true);
  const floorRay = new T.Raycaster();
  for (let i = 0; i < 4; i++) {
    const x = -0.7 + i * 1.05,
      z = 2.65;
    floorRay.set(new T.Vector3(x, 0.5, z), new T.Vector3(0, -1, 0));
    const floor = floorRay.intersectObject(decor, true).find((hit) => {
      const normal = hit.face?.normal
        .clone()
        .applyMatrix3(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld))
        .normalize();
      return normal && normal.y > 0.9 && hit.point.y < 0.3;
    });
    station(`PROP_Wealth_${i}`, x, floor?.point.y ?? 0.15, z);
  }
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
