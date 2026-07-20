import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { DEFAULT_MODEL_COLOR } from "@/types/viewer";

export async function loadSTL(buffer: ArrayBuffer): Promise<THREE.Object3D> {
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: DEFAULT_MODEL_COLOR,
    roughness: 0.7,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "stl-mesh";

  const group = new THREE.Group();
  group.name = "stl-model";
  group.add(mesh);

  return group;
}
