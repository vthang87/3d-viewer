import * as THREE from "three";
import type { SceneObject } from "@/types/viewer";

function countMeshStats(object: THREE.Object3D): {
  meshCount: number;
  triangleCount: number;
} {
  let meshCount = 0;
  let triangleCount = 0;

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    meshCount += 1;
    const geometry = child.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) {
      return;
    }

    const index = geometry.index;
    if (index) {
      triangleCount += Math.floor(index.count / 3);
      return;
    }

    const position = geometry.getAttribute("position");
    if (position) {
      triangleCount += Math.floor(position.count / 3);
    }
  });

  return { meshCount, triangleCount };
}

function hasMesh(object: THREE.Object3D): boolean {
  let found = false;
  object.traverse((child) => {
    if (found) return;
    if (child instanceof THREE.Mesh) {
      found = true;
    }
  });
  return found;
}

function resolveName(object: THREE.Object3D, fallback: string): string {
  const name = object.name?.trim();
  return name && name.length > 0 ? name : fallback;
}

/**
 * Prefer top-level parts (root children) for assemblies like 3MF.
 * Fall back to individual meshes when the model is flat (typical STL).
 */
export function extractSceneObjects(root: THREE.Object3D): SceneObject[] {
  const partCandidates = root.children.filter(hasMesh);

  if (partCandidates.length > 1) {
    return partCandidates.map((child, index) => {
      const stats = countMeshStats(child);
      const kind: SceneObject["kind"] =
        child instanceof THREE.Mesh ? "mesh" : "group";

      return {
        id: child.uuid,
        name: resolveName(child, `Object ${index + 1}`),
        kind,
        meshCount: stats.meshCount,
        triangleCount: stats.triangleCount,
      };
    });
  }

  const meshes: SceneObject[] = [];
  let meshIndex = 0;

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child === root) {
      return;
    }

    meshIndex += 1;
    const stats = countMeshStats(child);
    meshes.push({
      id: child.uuid,
      name: resolveName(child, `Mesh ${meshIndex}`),
      kind: "mesh",
      meshCount: stats.meshCount,
      triangleCount: stats.triangleCount,
    });
  });

  if (meshes.length > 0) {
    return meshes;
  }

  if (hasMesh(root)) {
    const stats = countMeshStats(root);
    return [
      {
        id: root.uuid,
        name: resolveName(root, "Model"),
        kind: root instanceof THREE.Mesh ? "mesh" : "group",
        meshCount: stats.meshCount,
        triangleCount: stats.triangleCount,
      },
    ];
  }

  return [];
}

export function findObjectById(
  root: THREE.Object3D,
  id: string
): THREE.Object3D | null {
  if (root.uuid === id) {
    return root;
  }

  let found: THREE.Object3D | null = null;
  root.traverse((child) => {
    if (found) return;
    if (child.uuid === id) {
      found = child;
    }
  });
  return found;
}

export function applyObjectVisibility(
  root: THREE.Object3D,
  objects: SceneObject[],
  visibility: Record<string, boolean>
): void {
  for (const entry of objects) {
    const target = findObjectById(root, entry.id);
    if (target) {
      target.visible = visibility[entry.id] !== false;
    }
  }
}

export function createDefaultVisibility(
  objects: SceneObject[]
): Record<string, boolean> {
  return Object.fromEntries(objects.map((object) => [object.id, true]));
}
