import type { Object3D } from "three";

export type FileType = "stl" | "3mf" | "step";

export type ViewerStatus = "idle" | "loading" | "ready" | "error";

export type RenderMode = "solid" | "wireframe";

export interface Dimensions {
  x: number;
  y: number;
  z: number;
}

export interface GeometryStats {
  meshCount: number;
  triangleCount: number;
  vertexCount: number;
  dimensions: Dimensions;
}

export interface FileMeta {
  name: string;
  size: number;
  type: FileType;
}

export interface SceneObject {
  id: string;
  name: string;
  kind: "group" | "mesh";
  triangleCount: number;
  meshCount: number;
}

export interface LoadedModel {
  object: Object3D;
  stats: GeometryStats;
  file: FileMeta;
  objects: SceneObject[];
}

export const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".stl", ".3mf", ".step", ".stp"] as const;

export const DEFAULT_MODEL_COLOR = "#d1d5db";
