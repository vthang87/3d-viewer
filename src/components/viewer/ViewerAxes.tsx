"use client";

import { useViewerStore } from "@/store/viewer-store";

export function ViewerAxes() {
  const axesVisible = useViewerStore((state) => state.axesVisible);

  if (!axesVisible) {
    return null;
  }

  return <axesHelper args={[20]} />;
}
