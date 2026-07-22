import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
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
        side: THREE.DoubleSide,
      });
      return;
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material, index) => {
      if (material instanceof THREE.MeshPhongMaterial) {
        const standard = new THREE.MeshStandardMaterial({
          color: material.color.clone(),
          map: material.map,
          normalMap: material.normalMap,
          roughness: 0.65,
          metalness: 0.1,
          side: THREE.DoubleSide,
          transparent: material.transparent,
          opacity: material.opacity,
          name: material.name,
        });
        if (Array.isArray(child.material)) {
          child.material[index] = standard;
        } else {
          child.material = standard;
        }
        material.dispose();
        return;
      }

      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        material.side = THREE.DoubleSide;
      }
    });
  });
}

export async function loadOBJ(
  objBuffer: ArrayBuffer,
  mtlBuffer?: ArrayBuffer | null
): Promise<THREE.Object3D> {
  const objText = new TextDecoder().decode(objBuffer);
  const loader = new OBJLoader();

  if (mtlBuffer && mtlBuffer.byteLength > 0) {
    const mtlText = new TextDecoder().decode(mtlBuffer);
    const materials = new MTLLoader().parse(mtlText, "");
    materials.preload();
    loader.setMaterials(materials);
  }

  const object = loader.parse(objText);
  ensureMaterials(object);
  object.name = object.name || "obj-model";

  let hasMesh = false;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      hasMesh = true;
    }
  });

  if (!hasMesh) {
    throw new Error("OBJ file contains no mesh geometry.");
  }

  return object;
}
