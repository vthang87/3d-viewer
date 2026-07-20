import * as THREE from "three";
import { DEFAULT_MODEL_COLOR } from "@/types/viewer";

export interface OcctMeshAttribute {
  array: number[];
}

export interface OcctBrepFace {
  first: number;
  last: number;
  color?: [number, number, number] | null;
}

export interface OcctMesh {
  name?: string;
  color?: [number, number, number] | null;
  attributes: {
    position: OcctMeshAttribute;
    normal?: OcctMeshAttribute;
  };
  index: OcctMeshAttribute;
  brep_faces?: OcctBrepFace[];
}

export interface OcctImportResult {
  success?: boolean;
  meshes?: OcctMesh[];
}

const WORKER_URL = "/occt-import-js/occt-import-js-worker.js";

function colorFromRgb(
  rgb: [number, number, number] | null | undefined,
  fallback: THREE.Color
): THREE.Color {
  if (!rgb || rgb.length < 3) {
    return fallback.clone();
  }
  return new THREE.Color(rgb[0], rgb[1], rgb[2]);
}

function createMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
}

function buildMesh(geometryMesh: OcctMesh): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(geometryMesh.attributes.position.array, 3)
  );

  if (geometryMesh.attributes.normal) {
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(geometryMesh.attributes.normal.array, 3)
    );
  } else {
    geometry.computeVertexNormals();
  }

  const index = Uint32Array.from(geometryMesh.index.array);
  geometry.setIndex(new THREE.BufferAttribute(index, 1));

  const defaultColor = colorFromRgb(
    geometryMesh.color,
    new THREE.Color(DEFAULT_MODEL_COLOR)
  );
  const materials: THREE.MeshStandardMaterial[] = [createMaterial(defaultColor)];

  const faces = geometryMesh.brep_faces ?? [];
  if (faces.length > 0) {
    for (const face of faces) {
      materials.push(createMaterial(colorFromRgb(face.color, defaultColor)));
    }

    const triangleCount = index.length / 3;
    let triangleIndex = 0;
    let faceColorGroupIndex = 0;

    while (triangleIndex < triangleCount) {
      let lastIndex: number;
      let materialIndex: number;

      if (faceColorGroupIndex >= faces.length) {
        lastIndex = triangleCount;
        materialIndex = 0;
      } else if (triangleIndex < faces[faceColorGroupIndex].first) {
        lastIndex = faces[faceColorGroupIndex].first;
        materialIndex = 0;
      } else {
        lastIndex = faces[faceColorGroupIndex].last + 1;
        materialIndex = faceColorGroupIndex + 1;
        faceColorGroupIndex += 1;
      }

      geometry.addGroup(
        triangleIndex * 3,
        (lastIndex - triangleIndex) * 3,
        materialIndex
      );
      triangleIndex = lastIndex;
    }
  }

  const mesh = new THREE.Mesh(
    geometry,
    materials.length > 1 ? materials : materials[0]
  );
  mesh.name = geometryMesh.name?.trim() || "step-part";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function parseStepInWorker(buffer: ArrayBuffer): Promise<OcctImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_URL);

    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("STEP import timed out."));
    }, 120_000);

    worker.onmessage = (event: MessageEvent<OcctImportResult>) => {
      window.clearTimeout(timeout);
      worker.terminate();
      resolve(event.data);
    };

    worker.onerror = (event) => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(event.error ?? new Error(event.message || "STEP worker failed."));
    };

    worker.postMessage({
      format: "step",
      buffer: new Uint8Array(buffer),
      params: null,
    });
  });
}

/**
 * Load a STEP/STP file via OpenCascade WASM (occt-import-js) in a Web Worker.
 * Converts Z-up CAD coordinates to Three.js Y-up.
 */
export async function loadSTEP(buffer: ArrayBuffer): Promise<THREE.Object3D> {
  if (typeof window === "undefined") {
    throw new Error("STEP loading is only available in the browser.");
  }

  const result = await parseStepInWorker(buffer);
  const meshes = result.meshes ?? [];

  if (!result.success && meshes.length === 0) {
    throw new Error("STEP import failed.");
  }

  if (meshes.length === 0) {
    throw new Error("STEP file contains no tessellated geometry.");
  }

  const group = new THREE.Group();
  group.name = "step-model";

  for (const meshData of meshes) {
    group.add(buildMesh(meshData));
  }

  // OpenCascade / STEP are typically Z-up; Three.js scene is Y-up.
  group.rotation.x = -Math.PI / 2;
  group.updateMatrixWorld(true);

  return group;
}
