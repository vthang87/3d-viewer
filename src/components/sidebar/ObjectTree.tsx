"use client";

import { Eye, EyeOff, Focus, ScanEye, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useViewerStore } from "@/store/viewer-store";

function formatCount(value: number): string {
  return value.toLocaleString();
}

export function ObjectTree() {
  const objects = useViewerStore((state) => state.objects);
  const objectVisibility = useViewerStore((state) => state.objectVisibility);
  const isolatedObjectId = useViewerStore((state) => state.isolatedObjectId);
  const selectedObjectId = useViewerStore((state) => state.selectedObjectId);
  const setObjectVisible = useViewerStore((state) => state.setObjectVisible);
  const isolateObject = useViewerStore((state) => state.isolateObject);
  const showAllObjects = useViewerStore((state) => state.showAllObjects);
  const selectObject = useViewerStore((state) => state.selectObject);
  const focusObject = useViewerStore((state) => state.focusObject);

  if (objects.length === 0) {
    return null;
  }

  const hiddenCount = objects.filter(
    (object) => objectVisibility[object.id] === false
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {objects.length} object{objects.length === 1 ? "" : "s"}
          {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
          {isolatedObjectId ? " · isolated" : ""}
        </p>
        {hiddenCount > 0 || isolatedObjectId ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={showAllObjects}
          >
            <ScanEye className="size-3.5" />
            Show all
          </Button>
        ) : null}
      </div>

      <ul className="space-y-1">
        {objects.map((object) => {
          const visible = objectVisibility[object.id] !== false;
          const selected = selectedObjectId === object.id;
          const isolated = isolatedObjectId === object.id;

          return (
            <li key={object.id}>
              <div
                className={cn(
                  "group flex items-start gap-1 rounded-md border border-transparent px-1.5 py-1.5 transition-colors",
                  selected && "border-border bg-secondary/60",
                  isolated && "border-primary/40 bg-primary/10"
                )}
              >
                <button
                  type="button"
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={visible ? "Hide object" : "Show object"}
                  onClick={() => setObjectVisible(object.id, !visible)}
                >
                  {visible ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => selectObject(object.id)}
                  onDoubleClick={() => isolateObject(object.id)}
                >
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      !visible && "text-muted-foreground line-through"
                    )}
                  >
                    {object.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {object.kind === "group" ? "Group" : "Mesh"}
                    {" · "}
                    {formatCount(object.triangleCount)} tri
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-0.5 opacity-70 group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Focus object"
                    title="Focus"
                    onClick={() => focusObject(object.id)}
                  >
                    <Focus className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant={isolated ? "secondary" : "ghost"}
                    size="icon-xs"
                    aria-label="Isolate object"
                    title="Isolate"
                    onClick={() =>
                      isolated ? showAllObjects() : isolateObject(object.id)
                    }
                  >
                    <Layers className="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Double-click an object to isolate it. Use Focus to frame the camera.
      </p>
    </div>
  );
}
