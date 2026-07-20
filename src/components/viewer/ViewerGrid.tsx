"use client";

import { Grid } from "@react-three/drei";
import { useViewerStore } from "@/store/viewer-store";

export function ViewerGrid() {
  const gridVisible = useViewerStore((state) => state.gridVisible);

  if (!gridVisible) {
    return null;
  }

  return (
    <Grid
      args={[100, 100]}
      cellSize={1}
      cellThickness={0.6}
      cellColor="#374151"
      sectionSize={10}
      sectionThickness={1.1}
      sectionColor="#4b5563"
      fadeDistance={80}
      fadeStrength={1}
      infiniteGrid
      position={[0, 0, 0]}
    />
  );
}
