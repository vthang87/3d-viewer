"use client";

import { Axis3d, Box, Grid3x3, Pentagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useViewerStore } from "@/store/viewer-store";
import type { RenderMode } from "@/types/viewer";

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={active}
            aria-label={label}
            className={cn(active && "bg-secondary text-foreground")}
            onClick={onClick}
          />
        }
      >
        {children}
        <span className="hidden sm:inline">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function RenderModeToggle() {
  const renderMode = useViewerStore((state) => state.renderMode);
  const setRenderMode = useViewerStore((state) => state.setRenderMode);

  const modes: { mode: RenderMode; label: string; icon: React.ReactNode }[] = [
    { mode: "solid", label: "Solid", icon: <Box className="size-4" /> },
    {
      mode: "wireframe",
      label: "Wireframe",
      icon: <Pentagon className="size-4" />,
    },
  ];

  return (
    <>
      {modes.map(({ mode, label, icon }) => (
        <ToolbarButton
          key={mode}
          label={label}
          active={renderMode === mode}
          onClick={() => setRenderMode(mode)}
        >
          {icon}
        </ToolbarButton>
      ))}
    </>
  );
}

export function ViewerToolbar() {
  const gridVisible = useViewerStore((state) => state.gridVisible);
  const axesVisible = useViewerStore((state) => state.axesVisible);
  const toggleGrid = useViewerStore((state) => state.toggleGrid);
  const toggleAxes = useViewerStore((state) => state.toggleAxes);
  const status = useViewerStore((state) => state.status);
  const disabled = status !== "ready" && status !== "loading";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border bg-panel/95 px-2 py-1.5 shadow-lg backdrop-blur",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <RenderModeToggle />
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Grid" active={gridVisible} onClick={toggleGrid}>
        <Grid3x3 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Axes" active={axesVisible} onClick={toggleAxes}>
        <Axis3d className="size-4" />
      </ToolbarButton>
    </div>
  );
}
