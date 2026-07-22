"use client";

import { FileInfo } from "@/components/file/FileInfo";
import { DimensionsInfo } from "@/components/sidebar/DimensionsInfo";
import { GeometryInfo } from "@/components/sidebar/GeometryInfo";
import { MeshTools } from "@/components/sidebar/MeshTools";
import { ObjectTree } from "@/components/sidebar/ObjectTree";
import { Separator } from "@/components/ui/separator";
import { useViewerStore } from "@/store/viewer-store";

export function ModelInfo() {
  const status = useViewerStore((state) => state.status);
  const model = useViewerStore((state) => state.model);
  const objects = useViewerStore((state) => state.objects);

  if (!model && status !== "ready") {
    return (
      <aside className="flex h-full w-full flex-col gap-5 overflow-y-auto bg-panel p-4">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            File
          </h2>
          <FileInfo />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col gap-5 overflow-y-auto bg-panel p-4">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          File
        </h2>
        <FileInfo />
      </div>

      <Separator />
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dimensions
        </h2>
        <DimensionsInfo />
      </div>
      <Separator />
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Geometry
        </h2>
        <GeometryInfo />
      </div>
      <Separator />
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Mesh tools
        </h2>
        <MeshTools />
      </div>
      {objects.length > 0 ? (
        <>
          <Separator />
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Objects
            </h2>
            <ObjectTree />
          </div>
        </>
      ) : null}
    </aside>
  );
}
