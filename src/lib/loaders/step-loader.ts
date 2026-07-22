import * as THREE from "three";
import { DEFAULT_MODEL_COLOR } from "@/types/viewer";

export type ImportQuality = "fast" | "balanced" | "high";

export type LoadProgress = (message: string) => void;

export interface StepTessellationParams {
  linearUnit: "millimeter";
  linearDeflectionType: "bounding_box_ratio";
  linearDeflection: number;
  angularDeflection: number;
}

interface TransferFace {
  first: number;
  last: number;
  color: [number, number, number] | null;
}

interface TransferMesh {
  name: string;
  color: [number, number, number] | null;
  position: Float32Array;
  normal: Float32Array | null;
  index: Uint32Array;
  faces: TransferFace[];
}

type WorkerResponse =
  | { ok: true; type: "warmup" }
  | {
      ok: true;
      type: "result";
      success: boolean;
      meshes: TransferMesh[];
    }
  | { ok: false; error: string };

const WORKER_URL = "/occt-import-js/step-worker.js";

let sharedWorker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let requestId = 0;

function getSharedWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker(WORKER_URL);
  }
  return sharedWorker;
}

/** Preload OCCT WASM so the first STEP open feels faster. */
export function warmupStepWorker(): void {
  if (typeof window === "undefined") return;
  if (workerReady) return;

  const worker = getSharedWorker();
  workerReady = new Promise((resolve) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data && event.data.ok && event.data.type === "warmup") {
        worker.removeEventListener("message", onMessage);
        resolve();
      }
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ type: "warmup" });
  });
}

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

function buildMesh(mesh: TransferMesh): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(mesh.position, 3));

  if (mesh.normal && mesh.normal.length === mesh.position.length) {
    geometry.setAttribute("normal", new THREE.BufferAttribute(mesh.normal, 3));
  } else {
    geometry.computeVertexNormals();
  }

  geometry.setIndex(new THREE.BufferAttribute(mesh.index, 1));

  const defaultColor = colorFromRgb(mesh.color, new THREE.Color(DEFAULT_MODEL_COLOR));
  const materials: THREE.MeshStandardMaterial[] = [createMaterial(defaultColor)];
  const faces = mesh.faces ?? [];

  if (faces.length > 0) {
    for (const face of faces) {
      materials.push(createMaterial(colorFromRgb(face.color, defaultColor)));
    }

    const triangleCount = mesh.index.length / 3;
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

  const threeMesh = new THREE.Mesh(
    geometry,
    materials.length > 1 ? materials : materials[0]
  );
  threeMesh.name = mesh.name?.trim() || "step-part";
  return threeMesh;
}

const QUALITY_BASE: Record<
  ImportQuality,
  { linearDeflection: number; angularDeflection: number }
> = {
  fast: { linearDeflection: 0.04, angularDeflection: 0.9 },
  balanced: { linearDeflection: 0.01, angularDeflection: 0.5 },
  high: { linearDeflection: 0.002, angularDeflection: 0.3 },
};

/** Tessellation params from quality + file size (larger files go coarser). */
export function stepParamsForImport(
  byteLength: number,
  quality: ImportQuality = "balanced"
): StepTessellationParams {
  const mb = byteLength / (1024 * 1024);
  const base = QUALITY_BASE[quality];
  let scale = 1;

  if (mb >= 120) scale = quality === "high" ? 2.5 : 3.5;
  else if (mb >= 40) scale = quality === "high" ? 1.6 : 2.2;
  else if (mb >= 15) scale = 1.3;

  return {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: base.linearDeflection * scale,
    angularDeflection: Math.min(1.2, base.angularDeflection * Math.sqrt(scale)),
  };
}

function timeoutMsForFileSize(byteLength: number): number {
  const mb = byteLength / (1024 * 1024);
  return Math.min(15 * 60_000, Math.max(180_000, Math.round(180_000 + mb * 4_000)));
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function parseStepInWorker(
  buffer: ArrayBuffer,
  params: StepTessellationParams,
  onProgress?: LoadProgress
): Promise<TransferMesh[]> {
  return new Promise((resolve, reject) => {
    const worker = getSharedWorker();
    const timeoutMs = timeoutMsForFileSize(buffer.byteLength);
    const id = ++requestId;

    onProgress?.(
      `Tessellating STEP (${Math.round(buffer.byteLength / (1024 * 1024))} MB)…`
    );

    const timeout = window.setTimeout(() => {
      cleanup();
      // Recreate worker after timeout — it may be stuck in WASM.
      sharedWorker?.terminate();
      sharedWorker = null;
      workerReady = null;
      reject(
        new Error(
          "STEP import timed out. Try Import quality → Fast, or export STL/OBJ from CAD."
        )
      );
    }, timeoutMs);

    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.ok && data.type === "warmup") return;

      // Ignore late messages from a previous request after recreate.
      if (id !== requestId) return;

      cleanup();

      if (!data.ok) {
        reject(
          new Error(
            data.error.includes("memory") || data.error.includes("Memory")
              ? "Not enough memory to import this STEP file. Use Fast quality or export STL/OBJ."
              : data.error
          )
        );
        return;
      }

      if (data.type !== "result") return;
      resolve(data.meshes);
    };

    const onError = (event: ErrorEvent) => {
      cleanup();
      sharedWorker?.terminate();
      sharedWorker = null;
      workerReady = null;
      reject(
        new Error(
          event.message ||
            "STEP worker crashed. The file may be too large for the browser."
        )
      );
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);

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
 * Load a STEP/STP file via OpenCascade WASM in a shared Web Worker.
 * Mesh buffers are transferred as TypedArrays (much faster than JSON).
 */
export async function loadSTEP(
  buffer: ArrayBuffer,
  onProgress?: LoadProgress,
  quality: ImportQuality = "balanced"
): Promise<THREE.Object3D> {
  if (typeof window === "undefined") {
    throw new Error("STEP loading is only available in the browser.");
  }

  warmupStepWorker();
  if (workerReady) {
    onProgress?.("Preparing STEP engine…");
    await workerReady.catch(() => undefined);
  }

  const params = stepParamsForImport(buffer.byteLength, quality);
  const meshes = await parseStepInWorker(buffer, params, onProgress);

  if (meshes.length === 0) {
    throw new Error("STEP file contains no tessellated geometry.");
  }

  onProgress?.(`Building ${meshes.length.toLocaleString()} mesh parts…`);

  const group = new THREE.Group();
  group.name = "step-model";

  for (let i = 0; i < meshes.length; i += 1) {
    group.add(buildMesh(meshes[i]));
    if (i > 0 && i % 12 === 0) {
      await yieldToMain();
    }
  }

  group.rotation.x = -Math.PI / 2;
  group.updateMatrixWorld(true);

  return group;
}
