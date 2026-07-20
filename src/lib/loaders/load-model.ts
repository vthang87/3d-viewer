import { centerObject, getBoundingBox } from "@/lib/geometry/bounding-box";
import { computeGeometryStats } from "@/lib/geometry/geometry-info";
import { extractSceneObjects } from "@/lib/geometry/object-tree";
import { loadSTL } from "@/lib/loaders/stl-loader";
import { loadSTEP } from "@/lib/loaders/step-loader";
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
  if (ext === ".step" || ext === ".stp") return "step";
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
    if (type === "stl") {
      object = await loadSTL(buffer);
    } else if (type === "3mf") {
      object = await load3MF(buffer);
    } else {
      object = await loadSTEP(buffer);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("STEP")) {
      throw error;
    }
    throw new Error(
      "Unable to load this file. The model may be corrupted or unsupported."
    );
  }

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
