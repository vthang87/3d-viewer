import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function stlBasename(name: string | null | undefined): string {
  if (!name) return "model";
  const base = name.replace(/\.[^.]+$/, "").trim();
  return base.length > 0 ? base : "model";
}

/** Export the current scene object as a binary STL download. */
export function exportObjectAsSTL(
  object: THREE.Object3D,
  sourceName?: string | null
): void {
  const exporter = new STLExporter();
  const result = exporter.parse(object, { binary: true });

  const buffer =
    result instanceof ArrayBuffer
      ? result
      : new TextEncoder().encode(String(result)).buffer;

  const blob = new Blob([new Uint8Array(buffer)], { type: "model/stl" });
  downloadBlob(blob, `${stlBasename(sourceName)}.stl`);
}
