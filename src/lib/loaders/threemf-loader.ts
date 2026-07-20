import * as THREE from "three";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { DEFAULT_MODEL_COLOR } from "@/types/viewer";

function ensureMaterials(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    if (!child.material) {
      child.material = new THREE.MeshStandardMaterial({
        color: DEFAULT_MODEL_COLOR,
        roughness: 0.7,
        metalness: 0.1,
      });
      return;
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (
        material instanceof THREE.MeshBasicMaterial ||
        material instanceof THREE.MeshLambertMaterial ||
        material instanceof THREE.MeshPhongMaterial ||
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        if (!("color" in material) || material.color === undefined) {
          material.color = new THREE.Color(DEFAULT_MODEL_COLOR);
        }
      }
    });
  });
}

export async function load3MF(buffer: ArrayBuffer): Promise<THREE.Object3D> {
  const loader = new ThreeMFLoader();
  const object = loader.parse(buffer);

  ensureMaterials(object);
  object.name = object.name || "3mf-model";

  return object;
}
