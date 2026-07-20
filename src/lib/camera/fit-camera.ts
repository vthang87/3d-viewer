import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

function getWorldBoundingBox(object: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  object.updateWorldMatrix(true, true);

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const geometry = child.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) {
      return;
    }

    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }

    const geometryBox = geometry.boundingBox;
    if (!geometryBox || geometryBox.isEmpty()) {
      return;
    }

    const worldBox = geometryBox.clone().applyMatrix4(child.matrixWorld);
    box.union(worldBox);
  });

  if (box.isEmpty()) {
    return new THREE.Box3().setFromObject(object);
  }

  return box;
}

export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsImpl | null,
  object: THREE.Object3D,
  offset = 1.5
): void {
  const box = getWorldBoundingBox(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (maxDim / (2 * Math.tan(fov / 2))) * offset;

  const direction = new THREE.Vector3(1, 0.8, 1).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance));
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 100;
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}
