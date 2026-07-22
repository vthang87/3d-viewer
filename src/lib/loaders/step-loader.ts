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

interface TransferMesh {
  name: string;
  color: [number, number, number] | null;
  position: Float32Array;
  normal: Float32Array | null;
  index: Uint32Array;
}

type WorkerResponse =
  | { ok: true; type: "warmup" }
  | {
      ok: true;
      type: "progress";
      requestId?: number;
      phase: string;
      current?: number;
      total?: number;
    }
  | {
      ok: true;
      type: "result";
      requestId?: number;
      success: boolean;
      meshes: TransferMesh[];
    }
  | { ok: false; requestId?: number; error: string };

const WORKER_URL = "/occt-import-js/step-worker.js";

let sharedWorker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let nextRequestId = 1;

function getSharedWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker(WORKER_URL);
  }
  return sharedWorker;
}

function resetWorker(): void {
  sharedWorker?.terminate();
  sharedWorker = null;
  workerReady = null;
}

/** Preload OCCT WASM so the first STEP open feels faster. */
export function warmupStepWorker(): void {
  if (typeof window === "undefined") return;
  if (workerReady) return;

  try {
    const worker = getSharedWorker();
    workerReady = new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("STEP engine warmup timed out."));
      }, 45_000);

      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data && event.data.ok && event.data.type === "warmup") {
          cleanup();
          resolve();
        }
      };

      const onError = () => {
        cleanup();
        reject(new Error("STEP engine failed to start."));
      };

      const cleanup = () => {
        window.clearTimeout(timeout);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      };

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.postMessage({ type: "warmup" });
    }).catch((error) => {
      resetWorker();
      return Promise.reject(error);
    });
  } catch {
    workerReady = null;
  }
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

function buildMesh(mesh: TransferMesh): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(mesh.position, 3));

  if (mesh.normal && mesh.normal.length === mesh.position.length) {
    geometry.setAttribute("normal", new THREE.BufferAttribute(mesh.normal, 3));
  } else {
    geometry.computeVertexNormals();
  }

  geometry.setIndex(new THREE.BufferAttribute(mesh.index, 1));

  const material = new THREE.MeshStandardMaterial({
    color: colorFromRgb(mesh.color, new THREE.Color(DEFAULT_MODEL_COLOR)),
    roughness: 0.55,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });

  const threeMesh = new THREE.Mesh(geometry, material);
  threeMesh.name = mesh.name?.trim() || "step-part";
  return threeMesh;
}

const QUALITY_BASE: Record<
  ImportQuality,
  { linearDeflection: number; angularDeflection: number }
> = {
  // Coarser = fewer triangles = much faster STEP imports.
  fast: { linearDeflection: 0.08, angularDeflection: 1.0 },
  balanced: { linearDeflection: 0.02, angularDeflection: 0.55 },
  high: { linearDeflection: 0.004, angularDeflection: 0.35 },
};

/** Tessellation params from quality + file size (larger files go coarser). */
export function stepParamsForImport(
  byteLength: number,
  quality: ImportQuality = "balanced"
): StepTessellationParams {
  const mb = byteLength / (1024 * 1024);
  const base = QUALITY_BASE[quality];
  let scale = 1;

  if (mb >= 100) scale = quality === "high" ? 3 : 5;
  else if (mb >= 40) scale = quality === "high" ? 2 : 3;
  else if (mb >= 15) scale = 1.5;

  return {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: base.linearDeflection * scale,
    angularDeflection: Math.min(1.5, base.angularDeflection * Math.sqrt(scale)),
  };
}

function timeoutMsForFileSize(byteLength: number, quality: ImportQuality): number {
  const mb = byteLength / (1024 * 1024);
  const qualityFactor = quality === "fast" ? 0.7 : quality === "high" ? 1.4 : 1;
  return Math.min(
    20 * 60_000,
    Math.max(120_000, Math.round((120_000 + mb * 5_000) * qualityFactor))
  );
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function parseStepInWorker(
  buffer: ArrayBuffer,
  params: StepTessellationParams,
  quality: ImportQuality,
  onProgress?: LoadProgress
): Promise<TransferMesh[]> {
  return new Promise((resolve, reject) => {
    const worker = getSharedWorker();
    const timeoutMs = timeoutMsForFileSize(buffer.byteLength, quality);
    const requestId = nextRequestId++;
    const mb = Math.round(buffer.byteLength / (1024 * 1024));

    onProgress?.(`Tessellating STEP (${mb} MB, ${quality})…`);

    const timeout = window.setTimeout(() => {
      cleanup();
      resetWorker();
      reject(
        new Error(
          "STEP import timed out. Choose Import quality → Fast and try again, or export binary STL from CAD."
        )
      );
    }, timeoutMs);

    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.ok && data.type === "warmup") return;

      if ("requestId" in data && data.requestId != null && data.requestId !== requestId) {
        return;
      }

      if (data.ok && data.type === "progress") {
        if (data.phase === "tessellate") {
          onProgress?.(`Tessellating STEP (${mb} MB, ${quality})…`);
        } else if (data.phase === "packing") {
          onProgress?.(
            `Packing meshes ${data.current ?? 0}/${data.total ?? "?"}…`
          );
        }
        return;
      }

      cleanup();

      if (!data.ok) {
        const err = data.error || "STEP import failed.";
        reject(
          new Error(
            /memory|alloc|heap/i.test(err)
              ? "Not enough memory for this STEP file. Use Fast quality, or export binary STL from CAD."
              : err
          )
        );
        return;
      }

      if (data.type !== "result") return;
      resolve(data.meshes);
    };

    const onError = (event: ErrorEvent) => {
      cleanup();
      resetWorker();
      reject(
        new Error(
          event.message ||
            "STEP worker crashed. Try Fast quality or export STL/OBJ from CAD."
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

    // Copy file bytes into a dedicated buffer we can transfer safely.
    const payload = buffer.slice(0);
    const view = new Uint8Array(payload);
    worker.postMessage(
      {
        format: "step",
        buffer: view,
        params,
        requestId,
      },
      [payload]
    );
  });
}

/**
 * Load a STEP/STP file via OpenCascade WASM in a shared Web Worker.
 * Mesh buffers are copied then transferred as TypedArrays.
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
    try {
      await Promise.race([
        workerReady,
        new Promise<void>((_, reject) => {
          window.setTimeout(
            () => reject(new Error("STEP engine warmup timed out.")),
            45_000
          );
        }),
      ]);
    } catch {
      // Continue anyway — the load request will initialize OCCT itself.
      onProgress?.("Starting STEP engine…");
    }
  }

  const mb = buffer.byteLength / (1024 * 1024);
  let effectiveQuality = quality;

  // Huge STEP files often OOM / hang on Balanced/High in-browser.
  if (mb >= 80 && quality !== "fast") {
    effectiveQuality = "fast";
    onProgress?.(
      `Large STEP (${Math.round(mb)} MB) — auto-switching to Fast tessellation…`
    );
  }

  const params = stepParamsForImport(buffer.byteLength, effectiveQuality);
  const meshes = await parseStepInWorker(
    buffer,
    params,
    effectiveQuality,
    onProgress
  );

  if (meshes.length === 0) {
    throw new Error("STEP file contains no tessellated geometry.");
  }

  onProgress?.(`Building ${meshes.length.toLocaleString()} mesh parts…`);

  const group = new THREE.Group();
  group.name = "step-model";

  for (let i = 0; i < meshes.length; i += 1) {
    group.add(buildMesh(meshes[i]));
    if (i > 0 && i % 20 === 0) {
      await yieldToMain();
    }
  }

  group.rotation.x = -Math.PI / 2;
  group.updateMatrixWorld(true);

  return group;
}
