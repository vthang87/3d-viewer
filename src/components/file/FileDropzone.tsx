"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { FilePicker } from "@/components/file/FilePicker";
import { cn } from "@/lib/utils";
import { useViewerStore } from "@/store/viewer-store";
import { ACCEPTED_EXTENSIONS } from "@/types/viewer";

interface FileDropzoneProps {
  className?: string;
  compact?: boolean;
}

export function FileDropzone({ className, compact = false }: FileDropzoneProps) {
  const loadFile = useViewerStore((state) => state.loadFile);
  const status = useViewerStore((state) => state.status);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        await loadFile(file);
      }
    },
    [loadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: false,
    disabled: status === "loading",
    accept: {
      "model/stl": [".stl"],
      "application/vnd.ms-package.3dmanufacturing-3dmodel+xml": [".3mf"],
      "application/octet-stream": [".stl", ".3mf"],
    },
  });

  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "pointer-events-none absolute inset-0 z-10 border-2 border-dashed transition-colors",
          isDragActive
            ? "pointer-events-auto border-primary bg-primary/10"
            : "border-transparent",
          className
        )}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-md bg-background/90 px-4 py-2 text-sm font-medium">
              Drop STL or 3MF to open
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center transition-colors",
        isDragActive && "bg-primary/5",
        className
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-dashed border-border bg-panel/60 px-8 py-12",
          isDragActive && "border-primary"
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
          <Upload className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Drop STL or 3MF file here
          </h2>
          <p className="text-sm text-muted-foreground">or</p>
        </div>
        <FilePicker label="Choose File" />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Supported formats: {ACCEPTED_EXTENSIONS.join(" ").toUpperCase()}</p>
          <p>Your files never leave your device.</p>
        </div>
      </div>
    </div>
  );
}
