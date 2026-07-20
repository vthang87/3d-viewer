"use client";

import { useViewerStore } from "@/store/viewer-store";

export function DimensionsInfo() {
  const dimensions = useViewerStore((state) => state.dimensions);
  const fileType = useViewerStore((state) => state.fileType);

  if (!dimensions) {
    return null;
  }

  const unitNote =
    fileType === "step"
      ? "STEP units are converted during tessellation. Dimensions are shown in millimeters (model units as interpreted by the importer)."
      : fileType === "3mf"
        ? "3MF may include unit metadata; dimensions are shown in millimeters."
        : "STL files do not contain unit metadata. Dimensions are interpreted as millimeters.";

  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium tabular-nums">
        {dimensions.x.toFixed(2)} × {dimensions.y.toFixed(2)} ×{" "}
        {dimensions.z.toFixed(2)} mm
      </p>
      <dl className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div>
          <dt>X</dt>
          <dd className="mt-0.5 font-medium text-foreground tabular-nums">
            {dimensions.x.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt>Y</dt>
          <dd className="mt-0.5 font-medium text-foreground tabular-nums">
            {dimensions.y.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt>Z</dt>
          <dd className="mt-0.5 font-medium text-foreground tabular-nums">
            {dimensions.z.toFixed(2)}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {unitNote}
      </p>
    </div>
  );
}
