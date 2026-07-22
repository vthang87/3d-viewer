import { centerObject, getBoundingBox } from "@/lib/geometry/bounding-box";
import { computeGeometryStats } from "@/lib/geometry/geometry-info";
import { extractSceneObjects } from "@/lib/geometry/object-tree";
import { loadOBJ } from "@/lib/loaders/obj-loader";
import { loadSTL } from "@/lib/loaders/stl-loader";
import { loadSTEP, type LoadProgress } from "@/lib/loaders/step-loader";
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

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function validateFile(file: File): void {
  const type = detectFileType(file.name);

  if (!type) {
    throw new Error(
      `Unsupported file. Supported formats: ${ACCEPTED_EXTENSIONS.join(", ")}`
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File too large (${formatMb(file.size)}). Maximum size is ${formatMb(MAX_FILE_SIZE_BYTES)}.`
    );
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

function isMemoryError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("memory") ||
    message.includes("allocation") ||
    message.includes("out of heap") ||
    error.name === "RangeError"
  );
}

function wrapLoadError(error: unknown): Error {
  if (isMemoryError(error)) {
    return new Error(
      "Not enough browser memory for this file. Try a smaller export, reduce mesh in CAD, or use binary STL."
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(
    "Unable to load this file. The model may be corrupted or unsupported."
  );
}

async function loadObjectForType(
  type: FileType,
  buffer: ArrayBuffer,
  mtlBuffer: ArrayBuffer | null | undefined,
  onProgress?: LoadProgress
) {
  switch (type) {
    case "stl":
      onProgress?.("Parsing STL…");
      return loadSTL(buffer);
    case "3mf":
      onProgress?.("Parsing 3MF…");
      return load3MF(buffer);
    case "step":
      return loadSTEP(buffer, onProgress);
    case "obj":
      onProgress?.("Parsing OBJ…");
      return loadOBJ(buffer, mtlBuffer);
    default:
      throw new Error("Unsupported file type.");
  }
}

export async function loadModel(file: File): Promise<LoadedModel> {
  return loadModelFromFiles([file]);
}

export async function loadModelFromFiles(
  files: File[],
  onProgress?: LoadProgress
): Promise<LoadedModel> {
  const primary = validateFiles(files);
  const type = detectFileType(primary.name)!;
  const mtl = files.find(isMtlFile) ?? null;

  onProgress?.(
    `Reading ${primary.name} (${formatMb(primary.size)})…`
  );

  let buffer: ArrayBuffer;
  let mtlBuffer: ArrayBuffer | null = null;

  try {
    buffer = await primary.arrayBuffer();
    mtlBuffer = mtl ? await mtl.arrayBuffer() : null;
  } catch (error) {
    throw wrapLoadError(error);
  }

  let object;
  try {
    object = await loadObjectForType(type, buffer, mtlBuffer, onProgress);
  } catch (error) {
    throw wrapLoadError(error);
  }

  onProgress?.("Computing bounds…");

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
