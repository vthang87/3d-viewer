"use client";

import { FrameSelectionButton } from "@/components/viewer/FrameSelectionButton";
import { ViewCube } from "@/components/viewer/ViewCube";

export function ViewControls() {
  return (
    <div className="flex flex-col items-end gap-2">
      <ViewCube />
      <FrameSelectionButton />
    </div>
  );
}
