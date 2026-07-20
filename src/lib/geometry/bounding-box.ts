import * as THREE from "three";
import type { Dimensions } from "@/types/viewer";

export function getBoundingBox(object: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(object);
}

export function getDimensions(box: THREE.Box3): Dimensions {
  const size = box.getSize(new THREE.Vector3());
  return {
    x: size.x,
    y: size.y,
    z: size.z,
  };
}

export function centerObject(object: THREE.Object3D, box?: THREE.Box3): THREE.Box3 {
  const bounds = box ?? getBoundingBox(object);
  const center = bounds.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.updateMatrixWorld(true);
  return getBoundingBox(object);
}
