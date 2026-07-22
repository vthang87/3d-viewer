import { centerObject, getBoundingBox } from "@/lib/geometry/bounding-box";
import { computeGeometryStats } from "@/lib/geometry/geometry-info";
import { extractSceneObjects } from "@/lib/geometry/object-tree";
import { loadOBJ } from "@/lib/loaders/obj-loader";
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
  if (ext === ".obj") return "obj";
  return null;
}

function isMtlFile(file: File): boolean {
  return getExtension(file.name) === ".mtl";
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

function validateFiles(files: File[]): File {
  if (files.length === 0) {
    throw new Error("No file selected.");
  }

  const modelFiles = files.filter((file) => detectFileType(file.name));
  const mtlFiles = files.filter(isMtlFile);

  if (modelFiles.length === 0) {
    throw new Error(
      `Unsupported file. Supported formats: ${ACCEPTED_EXTENSIONS.join(", ")}`
    );
  }

  if (modelFiles.length > 1) {
    throw new Error("Please open one model file at a time.");
  }

  const primary = modelFiles[0];
  validateFile(primary);

  if (mtlFiles.length > 0 && detectFileType(primary.name) !== "obj") {
    throw new Error("MTL materials can only be used with OBJ files.");
  }

  return primary;
}

async function loadObjectForType(
  type: FileType,
  buffer: ArrayBuffer,
  mtlBuffer?: ArrayBuffer | null
) {
  switch (type) {
    case "stl":
      return loadSTL(buffer);
    case "3mf":
      return load3MF(buffer);
    case "step":
      return loadSTEP(buffer);
    case "obj":
      return loadOBJ(buffer, mtlBuffer);
    default:
      throw new Error("Unsupported file type.");
  }
}

export async function loadModel(file: File): Promise<LoadedModel> {
  return loadModelFromFiles([file]);
}

export async function loadModelFromFiles(files: File[]): Promise<LoadedModel> {
  const primary = validateFiles(files);
  const type = detectFileType(primary.name)!;
  const mtl = files.find(isMtlFile) ?? null;

  const buffer = await primary.arrayBuffer();
  const mtlBuffer = mtl ? await mtl.arrayBuffer() : null;

  let object;
  try {
    object = await loadObjectForType(type, buffer, mtlBuffer);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("STEP") ||
        error.message.includes("OBJ") ||
        error.message.includes("MTL"))
    ) {
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
      name: primary.name,
      size: primary.size + (mtl?.size ?? 0),
      type,
    },
  };
}
