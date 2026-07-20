"use client";

import { useViewerStore } from "@/store/viewer-store";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileInfo() {
  const file = useViewerStore((state) => state.file);

  if (!file) {
    return (
      <p className="text-sm text-muted-foreground">No model loaded</p>
    );
  }

  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          Name
        </dt>
        <dd className="mt-1 break-all font-medium">{file.name}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          Format
        </dt>
        <dd className="mt-1 font-medium uppercase">{file.type}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          Size
        </dt>
        <dd className="mt-1 font-medium">{formatBytes(file.size)}</dd>
      </div>
    </dl>
  );
}
