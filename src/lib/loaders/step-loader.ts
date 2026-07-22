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

type WorkerResponse =
  | { ok: true; result: OcctImportResult }
  | { ok: false; error: string };

const WORKER_URL = "/occt-import-js/step-worker.js";

export type LoadProgress = (message: string) => void;

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

/** Coarser tessellation for larger STEP files to keep browser memory in check. */
export function stepParamsForFileSize(byteLength: number) {
  const mb = byteLength / (1024 * 1024);

  if (mb >= 120) {
    return {
      linearUnit: "millimeter",
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.03,
      angularDeflection: 0.75,
    };
  }

  if (mb >= 40) {
    return {
      linearUnit: "millimeter",
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.015,
      angularDeflection: 0.5,
    };
  }

  return {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.003,
    angularDeflection: 0.35,
  };
}

function timeoutMsForFileSize(byteLength: number): number {
  const mb = byteLength / (1024 * 1024);
  // Base 3 min + ~4s per MB, capped at 15 min.
  return Math.min(15 * 60_000, Math.max(180_000, Math.round(180_000 + mb * 4_000)));
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function parseStepInWorker(
  buffer: ArrayBuffer,
  params: ReturnType<typeof stepParamsForFileSize>,
  onProgress?: LoadProgress
): Promise<OcctImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_URL);
    const timeoutMs = timeoutMsForFileSize(buffer.byteLength);

    onProgress?.(
      `Tessellating STEP (${Math.round(buffer.byteLength / (1024 * 1024))} MB)… this can take several minutes`
    );

    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(
        new Error(
          "STEP import timed out. Try reducing the model in CAD software, or export STL/OBJ first."
        )
      );
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      window.clearTimeout(timeout);
      worker.terminate();

      const data = event.data;
      if (!data || typeof data !== "object") {
        reject(new Error("STEP worker returned an invalid response."));
        return;
      }

      if (!data.ok) {
        reject(
          new Error(
            data.error.includes("memory") || data.error.includes("Memory")
              ? "Not enough memory to import this STEP file. Export a lighter STL/OBJ, or simplify in CAD first."
              : data.error
          )
        );
        return;
      }

      resolve(data.result);
    };

    worker.onerror = (event) => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(
        new Error(
          event.message ||
            "STEP worker crashed. The file may be too large for the browser."
        )
      );
    };

    worker.onmessageerror = () => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(
        new Error(
          "Failed to transfer STEP result. The tessellated mesh is probably too large for the browser."
        )
      );
    };

    // Transfer ownership of the ArrayBuffer so we don't keep two copies.
    const view = new Uint8Array(buffer);
    worker.postMessage(
      {
        format: "step",
        buffer: view,
        params,
      },
      [buffer]
    );
  });
}

/**
 * Load a STEP/STP file via OpenCascade WASM (occt-import-js) in a Web Worker.
 * Converts Z-up CAD coordinates to Three.js Y-up.
 */
export async function loadSTEP(
  buffer: ArrayBuffer,
  onProgress?: LoadProgress
): Promise<THREE.Object3D> {
  if (typeof window === "undefined") {
    throw new Error("STEP loading is only available in the browser.");
  }

  const params = stepParamsForFileSize(buffer.byteLength);
  const result = await parseStepInWorker(buffer, params, onProgress);
  const meshes = result.meshes ?? [];

  if (!result.success && meshes.length === 0) {
    throw new Error("STEP import failed.");
  }

  if (meshes.length === 0) {
    throw new Error("STEP file contains no tessellated geometry.");
  }

  onProgress?.(`Building ${meshes.length.toLocaleString()} mesh parts…`);

  const group = new THREE.Group();
  group.name = "step-model";

  for (let i = 0; i < meshes.length; i += 1) {
    group.add(buildMesh(meshes[i]));
    if (i > 0 && i % 8 === 0) {
      await yieldToMain();
    }
  }

  // OpenCascade / STEP are typically Z-up; Three.js scene is Y-up.
  group.rotation.x = -Math.PI / 2;
  group.updateMatrixWorld(true);

  return group;
}
