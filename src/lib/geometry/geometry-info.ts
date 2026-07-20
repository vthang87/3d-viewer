import * as THREE from "three";
import { getBoundingBox, getDimensions } from "@/lib/geometry/bounding-box";
import { countTriangles, countVertices } from "@/lib/geometry/triangle-count";
import type { GeometryStats } from "@/types/viewer";

export function computeGeometryStats(object: THREE.Object3D): GeometryStats {
  let meshCount = 0;
  let triangleCount = 0;
  let vertexCount = 0;

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    meshCount += 1;
    const geometry = child.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) {
      return;
    }

    triangleCount += countTriangles(geometry);
    vertexCount += countVertices(geometry);
  });

  const box = getBoundingBox(object);

  return {
    meshCount,
    triangleCount,
    vertexCount,
    dimensions: getDimensions(box),
  };
}
