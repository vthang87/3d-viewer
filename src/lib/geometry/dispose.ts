import * as THREE from "three";

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }

  material.dispose();
}

export function disposeObject(object: THREE.Object3D | null | undefined): void {
  if (!object) {
    return;
  }

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (child.material) {
        disposeMaterial(child.material);
      }
    }

    if (child instanceof THREE.Line || child instanceof THREE.Points) {
      child.geometry?.dispose();
      if (child.material) {
        disposeMaterial(child.material as THREE.Material | THREE.Material[]);
      }
    }
  });
}
