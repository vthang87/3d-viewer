import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { DEFAULT_MODEL_COLOR } from "@/types/viewer";

const STL_WORKER_URL = "/stl-worker.js";
const WORKER_THRESHOLD_BYTES = 8 * 1024 * 1024;

type StlWorkerResponse =
  | {
      ok: true;
      positions: Float32Array;
      normals: Float32Array;
      triangleCount: number;
    }
  | { ok: false; reason?: "ascii"; error?: string };

function buildGroupFromGeometry(geometry: THREE.BufferGeometry): THREE.Object3D {
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

function parseOnMainThread(buffer: ArrayBuffer): THREE.Object3D {
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);
  if (!geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  }
  return buildGroupFromGeometry(geometry);
}

function parseBinaryInWorker(buffer: ArrayBuffer): Promise<THREE.Object3D | null> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(STL_WORKER_URL);

    worker.onmessage = (event: MessageEvent<StlWorkerResponse>) => {
      worker.terminate();
      const data = event.data;

      if (!data.ok) {
        if (data.reason === "ascii") {
          resolve(null);
          return;
        }
        reject(new Error(data.error || "STL worker failed."));
        return;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(data.positions, 3)
      );
      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(data.normals, 3)
      );
      resolve(buildGroupFromGeometry(geometry));
    };

    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "STL worker crashed."));
    };

    // Copy before transfer so we can fall back to main-thread ASCII parse.
    const copy = buffer.slice(0);
    worker.postMessage({ buffer: copy }, [copy]);
  });
}

export async function loadSTL(buffer: ArrayBuffer): Promise<THREE.Object3D> {
  if (
    typeof Worker !== "undefined" &&
    buffer.byteLength >= WORKER_THRESHOLD_BYTES
  ) {
    const fromWorker = await parseBinaryInWorker(buffer);
    if (fromWorker) {
      return fromWorker;
    }
  }

  return parseOnMainThread(buffer);
}
