"use client";

import { useViewerStore } from "@/store/viewer-store";

function formatCount(value: number): string {
  return value.toLocaleString();
}

export function GeometryInfo() {
  const meshCount = useViewerStore((state) => state.meshCount);
  const triangleCount = useViewerStore((state) => state.triangleCount);
  const vertexCount = useViewerStore((state) => state.vertexCount);
  const status = useViewerStore((state) => state.status);

  if (status !== "ready") {
    return null;
  }

  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          Meshes
        </dt>
        <dd className="mt-1 font-medium tabular-nums">
          {formatCount(meshCount)}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          Triangles
        </dt>
        <dd className="mt-1 font-medium tabular-nums">
          {formatCount(triangleCount)}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          Vertices
        </dt>
        <dd className="mt-1 font-medium tabular-nums">
          {formatCount(vertexCount)}
        </dd>
      </div>
    </dl>
  );
}
