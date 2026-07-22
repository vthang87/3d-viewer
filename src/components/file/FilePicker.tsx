"use client";

import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useViewerStore } from "@/store/viewer-store";
import { ACCEPTED_EXTENSIONS } from "@/types/viewer";

interface FilePickerProps {
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function FilePicker({
  label = "Open File",
  variant = "default",
  size = "default",
  className,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const loadFiles = useViewerStore((state) => state.loadFiles);
  const status = useViewerStore((state) => state.status);

  const onChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (files.length > 0) {
        await loadFiles(files);
      }
    },
    [loadFiles]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        multiple
        className="hidden"
        onChange={onChange}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={status === "loading"}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}
