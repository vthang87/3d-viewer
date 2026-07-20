"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Info, Maximize, Minimize } from "lucide-react";
import { FileDropzone } from "@/components/file/FileDropzone";
import { FilePicker } from "@/components/file/FilePicker";
import { ModelInfo } from "@/components/sidebar/ModelInfo";
import { CameraControls } from "@/components/toolbar/CameraControls";
import { ViewerToolbar } from "@/components/toolbar/ViewerToolbar";
import { ViewControls } from "@/components/viewer/ViewControls";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useViewerStore } from "@/store/viewer-store";

const Scene = dynamic(
  () => import("@/components/viewer/Scene").then((mod) => mod.Scene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-viewer text-sm text-muted-foreground">
        Initializing viewport…
      </div>
    ),
  }
);

export function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const status = useViewerStore((state) => state.status);
  const error = useViewerStore((state) => state.error);
  const model = useViewerStore((state) => state.model);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      await el.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">
            3D
          </div>
          <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
            3D Viewer
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger
                render={
                  <Button type="button" variant="outline" size="sm" />
                }
              >
                <Info className="size-4" />
                Info
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
                <SheetHeader className="border-b border-border px-4 py-3">
                  <SheetTitle>Model Info</SheetTitle>
                </SheetHeader>
                <ModelInfo />
              </SheetContent>
            </Sheet>
          </div>

          <FilePicker label="Open File" variant="default" size="sm" />
          <CameraControls />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                />
              }
            >
              {isFullscreen ? (
                <Minimize className="size-4" />
              ) : (
                <Maximize className="size-4" />
              )}
              <span className="hidden sm:inline">Fullscreen</span>
            </TooltipTrigger>
            <TooltipContent>Fullscreen</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-64 shrink-0 border-r border-border md:block lg:w-72">
          <ModelInfo />
        </div>

        <div ref={containerRef} className="relative min-w-0 flex-1 bg-viewer">
          {model ? (
            <>
              <Scene />
              <FileDropzone compact />
            </>
          ) : (
            <FileDropzone />
          )}

          {status === "loading" ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="rounded-lg border border-border bg-panel px-5 py-4 text-center shadow-lg">
                <p className="text-sm font-medium">Loading model…</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Parsing geometry
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="absolute top-3 left-1/2 z-30 w-[min(100%-1.5rem,28rem)] -translate-x-1/2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-lg">
              {error}
            </div>
          ) : null}

          {model ? (
            <>
              <div className="pointer-events-none absolute top-3 right-3 z-20 sm:top-4 sm:right-4">
                <div className="pointer-events-auto">
                  <ViewControls />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
                <div className="pointer-events-auto">
                  <ViewerToolbar />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
