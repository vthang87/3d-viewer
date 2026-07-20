"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useViewerStore } from "@/store/viewer-store";

export function CameraControls() {
  const resetCamera = useViewerStore((state) => state.resetCamera);
  const status = useViewerStore((state) => state.status);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={status !== "ready"}
            onClick={resetCamera}
          />
        }
      >
        <RotateCcw className="size-4" />
        Reset
      </TooltipTrigger>
      <TooltipContent>Reset camera</TooltipContent>
    </Tooltip>
  );
}
