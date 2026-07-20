import { centerObject, getBoundingBox } from "@/lib/geometry/bounding-box";
import { computeGeometryStats } from "@/lib/geometry/geometry-info";
import { extractSceneObjects } from "@/lib/geometry/object-tree";
import { loadSTL } from "@/lib/loaders/stl-loader";
import { load3MF } from "@/lib/loaders/threemf-loader";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  type FileType,
  type LoadedModel,
} from "@/types/viewer";

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? `.${parts.at(-1)}` : "";
}

export function detectFileType(filename: string): FileType | null {
  const ext = getExtension(filename);
  if (ext === ".stl") return "stl";
  if (ext === ".3mf") return "3mf";
  return null;
}

export function validateFile(file: File): void {
  const type = detectFileType(file.name);

  if (!type) {
    throw new Error(
      `Unsupported file. Supported formats: ${ACCEPTED_EXTENSIONS.join(", ")}`
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File too large. Maximum size is 200 MB.");
  }
}

export async function loadModel(file: File): Promise<LoadedModel> {
  validateFile(file);

  const type = detectFileType(file.name)!;
  const buffer = await file.arrayBuffer();

  let object;
  try {
    object = type === "stl" ? await loadSTL(buffer) : await load3MF(buffer);
  } catch {
    throw new Error(
      "Unable to load this file. The model may be corrupted or unsupported."
    );
  }

  // STL loader already centers geometry; still normalize the group transform.
  const box = getBoundingBox(object);
  if (box.isEmpty()) {
    throw new Error(
      "Unable to load this file. The model may be corrupted or unsupported."
    );
  }

  centerObject(object, box);
  const stats = computeGeometryStats(object);
  const objects = extractSceneObjects(object);

  return {
    object,
    stats,
    objects,
    file: {
      name: file.name,
      size: file.size,
      type,
    },
  };
}
