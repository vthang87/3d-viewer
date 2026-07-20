"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useViewerStore } from "@/store/viewer-store";

function FrameIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Corner brackets */}
      <path
        d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Cube */}
      <path
        d="M12 8.2 16 10.4v3.8L12 16.4 8 14.2v-3.8L12 8.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 8.2v8.2M8 10.4l4 2.2 4-2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface FrameSelectionButtonProps {
  className?: string;
}

export function FrameSelectionButton({ className }: FrameSelectionButtonProps) {
  const status = useViewerStore((state) => state.status);
  const selectedObjectId = useViewerStore((state) => state.selectedObjectId);
  const focusObject = useViewerStore((state) => state.focusObject);
  const resetCamera = useViewerStore((state) => state.resetCamera);

  const disabled = status !== "ready";

  const onFrame = () => {
    if (selectedObjectId) {
      focusObject(selectedObjectId);
      return;
    }
    resetCamera();
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={disabled}
            aria-label="Frame selection"
            onClick={onFrame}
            className={cn(
              "size-11 rounded-full border border-border/80 bg-[#0b0f19]/95 text-foreground shadow-lg backdrop-blur hover:bg-[#1f2937]",
              className
            )}
          />
        }
      >
        <FrameIcon className="size-5" />
      </TooltipTrigger>
      <TooltipContent side="left">
        {selectedObjectId ? "Frame selected object" : "Frame model"}
      </TooltipContent>
    </Tooltip>
  );
}
