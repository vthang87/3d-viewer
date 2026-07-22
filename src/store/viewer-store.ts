import type { Object3D } from "three";
import { create } from "zustand";
import { disposeObject } from "@/lib/geometry/dispose";
import { exportObjectAsSTL } from "@/lib/geometry/export-stl";
import { computeGeometryStats } from "@/lib/geometry/geometry-info";
import {
  applyObjectVisibility,
  createDefaultVisibility,
  extractSceneObjects,
  findObjectById,
} from "@/lib/geometry/object-tree";
import { simplifyObject } from "@/lib/geometry/simplify-mesh";
import { loadModelFromFiles } from "@/lib/loaders/load-model";
import type { ImportQuality } from "@/lib/loaders/step-loader";
import type {
  Dimensions,
  FileMeta,
  FileType,
  RenderMode,
  SceneObject,
  ViewerStatus,
} from "@/types/viewer";

export type StandardView =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "isometric";

export type ViewDirection = [number, number, number];

export const STANDARD_VIEW_DIRECTIONS: Record<StandardView, ViewDirection> = {
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  front: [0, 0, 1],
  back: [0, 0, -1],
  isometric: [1, 0.85, 1],
};

interface ViewerState {
  status: ViewerStatus;
  error: string | null;
  file: FileMeta | null;
  fileType: FileType | null;
  model: Object3D | null;
  dimensions: Dimensions | null;
  triangleCount: number;
  meshCount: number;
  vertexCount: number;
  objects: SceneObject[];
  objectVisibility: Record<string, boolean>;
  isolatedObjectId: string | null;
  selectedObjectId: string | null;
  renderMode: RenderMode;
  gridVisible: boolean;
  axesVisible: boolean;
  cameraResetToken: number;
  focusObjectId: string | null;
  viewDirection: ViewDirection | null;
  viewDirectionToken: number;
  busyMessage: string | null;
  importQuality: ImportQuality;
  loadFile: (file: File) => Promise<void>;
  loadFiles: (files: File[]) => Promise<void>;
  clearModel: () => void;
  resetCamera: () => void;
  setRenderMode: (mode: RenderMode) => void;
  setImportQuality: (quality: ImportQuality) => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  setGridVisible: (visible: boolean) => void;
  setAxesVisible: (visible: boolean) => void;
  setObjectVisible: (id: string, visible: boolean) => void;
  isolateObject: (id: string) => void;
  showAllObjects: () => void;
  selectObject: (id: string | null) => void;
  focusObject: (id: string) => void;
  setStandardView: (view: StandardView) => void;
  setViewDirection: (direction: ViewDirection) => void;
  reduceMesh: (keepRatio: number) => Promise<void>;
  exportStl: () => void;
}

function syncVisibility(
  model: Object3D | null,
  objects: SceneObject[],
  visibility: Record<string, boolean>
): void {
  if (!model) return;
  applyObjectVisibility(model, objects, visibility);
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  status: "idle",
  error: null,
  file: null,
  fileType: null,
  model: null,
  dimensions: null,
  triangleCount: 0,
  meshCount: 0,
  vertexCount: 0,
  objects: [],
  objectVisibility: {},
  isolatedObjectId: null,
  selectedObjectId: null,
  renderMode: "solid",
  gridVisible: true,
  axesVisible: true,
  cameraResetToken: 0,
  focusObjectId: null,
  viewDirection: null,
  viewDirectionToken: 0,
  busyMessage: null,
  importQuality: "balanced",

  loadFile: async (file) => {
    await get().loadFiles([file]);
  },

  loadFiles: async (files) => {
    const previous = get().model;
    set({ status: "loading", error: null, busyMessage: "Loading model…" });

    try {
      const loaded = await loadModelFromFiles(
        files,
        (message) => {
          set({ busyMessage: message });
        },
        get().importQuality
      );
      disposeObject(previous);

      const objectVisibility = createDefaultVisibility(loaded.objects);
      syncVisibility(loaded.object, loaded.objects, objectVisibility);

      set({
        status: "ready",
        error: null,
        busyMessage: null,
        file: loaded.file,
        fileType: loaded.file.type,
        model: loaded.object,
        dimensions: loaded.stats.dimensions,
        triangleCount: loaded.stats.triangleCount,
        meshCount: loaded.stats.meshCount,
        vertexCount: loaded.stats.vertexCount,
        objects: loaded.objects,
        objectVisibility,
        isolatedObjectId: null,
        selectedObjectId: null,
        focusObjectId: null,
        viewDirection: null,
        cameraResetToken: get().cameraResetToken + 1,
      });
    } catch (error) {
      set({
        status: get().model ? "ready" : "idle",
        busyMessage: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load this file. The model may be corrupted or unsupported.",
      });
    }
  },

  clearModel: () => {
    disposeObject(get().model);
    set({
      status: "idle",
      error: null,
      busyMessage: null,
      file: null,
      fileType: null,
      model: null,
      dimensions: null,
      triangleCount: 0,
      meshCount: 0,
      vertexCount: 0,
      objects: [],
      objectVisibility: {},
      isolatedObjectId: null,
      selectedObjectId: null,
      focusObjectId: null,
      viewDirection: null,
    });
  },

  resetCamera: () => {
    set({
      focusObjectId: null,
      viewDirection: null,
      cameraResetToken: get().cameraResetToken + 1,
    });
  },

  setRenderMode: (mode) => set({ renderMode: mode }),

  setImportQuality: (quality) => set({ importQuality: quality }),

  toggleGrid: () => set({ gridVisible: !get().gridVisible }),

  toggleAxes: () => set({ axesVisible: !get().axesVisible }),

  setGridVisible: (visible) => set({ gridVisible: visible }),

  setAxesVisible: (visible) => set({ axesVisible: visible }),

  setObjectVisible: (id, visible) => {
    const { model, objects, objectVisibility } = get();
    const nextVisibility = { ...objectVisibility, [id]: visible };

    syncVisibility(model, objects, nextVisibility);
    set({
      objectVisibility: nextVisibility,
      isolatedObjectId: null,
      selectedObjectId: id,
    });
  },

  isolateObject: (id) => {
    const { model, objects } = get();
    if (!model || objects.length === 0) return;

    const nextVisibility = Object.fromEntries(
      objects.map((object) => [object.id, object.id === id])
    );

    syncVisibility(model, objects, nextVisibility);
    set({
      objectVisibility: nextVisibility,
      isolatedObjectId: id,
      selectedObjectId: id,
      focusObjectId: id,
      viewDirection: null,
      cameraResetToken: get().cameraResetToken + 1,
    });
  },

  showAllObjects: () => {
    const { model, objects } = get();
    const nextVisibility = createDefaultVisibility(objects);
    syncVisibility(model, objects, nextVisibility);
    set({
      objectVisibility: nextVisibility,
      isolatedObjectId: null,
      focusObjectId: null,
      viewDirection: null,
      cameraResetToken: get().cameraResetToken + 1,
    });
  },

  selectObject: (id) => set({ selectedObjectId: id }),

  focusObject: (id) => {
    const { model } = get();
    if (!model || !findObjectById(model, id)) return;

    set({
      selectedObjectId: id,
      focusObjectId: id,
      viewDirection: null,
      cameraResetToken: get().cameraResetToken + 1,
    });
  },

  setViewDirection: (direction) => {
    set({
      viewDirection: direction,
      viewDirectionToken: get().viewDirectionToken + 1,
      focusObjectId: null,
    });
  },

  setStandardView: (view) => {
    get().setViewDirection(STANDARD_VIEW_DIRECTIONS[view]);
  },

  reduceMesh: async (keepRatio) => {
    const model = get().model;
    if (!model || get().status === "loading") return;

    set({
      status: "loading",
      error: null,
      busyMessage: "Reducing mesh…",
    });

    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 30);
      });

      await simplifyObject(model, { ratio: keepRatio });

      const stats = computeGeometryStats(model);
      const objects = extractSceneObjects(model);
      const objectVisibility = createDefaultVisibility(objects);
      syncVisibility(model, objects, objectVisibility);

      set({
        status: "ready",
        busyMessage: null,
        error: null,
        dimensions: stats.dimensions,
        triangleCount: stats.triangleCount,
        meshCount: stats.meshCount,
        vertexCount: stats.vertexCount,
        objects,
        objectVisibility,
        isolatedObjectId: null,
        selectedObjectId: null,
        focusObjectId: null,
        viewDirection: null,
        cameraResetToken: get().cameraResetToken + 1,
      });
    } catch (error) {
      set({
        status: "ready",
        busyMessage: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to reduce this mesh.",
      });
    }
  },

  exportStl: () => {
    const { model, file } = get();
    if (!model) return;

    try {
      exportObjectAsSTL(model, file?.name);
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Unable to export STL.",
      });
    }
  },
}));
