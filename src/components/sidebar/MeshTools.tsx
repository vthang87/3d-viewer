"use client";

import { useMemo, useState } from "react";
import { Download, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportQuality } from "@/lib/loaders/step-loader";
import { useViewerStore } from "@/store/viewer-store";

const KEEP_PRESETS = [
  { label: "75%", value: 0.75 },
  { label: "50%", value: 0.5 },
  { label: "25%", value: 0.25 },
  { label: "10%", value: 0.1 },
] as const;

const QUALITY_PRESETS: { label: string; value: ImportQuality; hint: string }[] =
  [
    { label: "Fast", value: "fast", hint: "Fewer triangles, quicker STEP" },
    { label: "Balanced", value: "balanced", hint: "Default" },
    { label: "High", value: "high", hint: "More detail, slower" },
  ];

export function MeshTools() {
  const status = useViewerStore((state) => state.status);
  const triangleCount = useViewerStore((state) => state.triangleCount);
  const importQuality = useViewerStore((state) => state.importQuality);
  const setImportQuality = useViewerStore((state) => state.setImportQuality);
  const reduceMesh = useViewerStore((state) => state.reduceMesh);
  const exportStl = useViewerStore((state) => state.exportStl);
  const [keepRatio, setKeepRatio] = useState(0.5);

  const estimated = useMemo(
    () => Math.max(1, Math.round(triangleCount * keepRatio)),
    [triangleCount, keepRatio]
  );

  const busy = status === "loading";
  const disabled = status !== "ready" || busy || triangleCount === 0;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Import quality (STEP)
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUALITY_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              size="xs"
              variant={importQuality === preset.value ? "default" : "outline"}
              disabled={busy}
              title={preset.hint}
              onClick={() => setImportQuality(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          For large STEP (~50MB+), choose <strong>Fast</strong> before opening.
          Binary STL is still the most reliable format for huge models.
        </p>
      </div>

      <div>
        <label
          htmlFor="keep-ratio"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Keep triangles
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {KEEP_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              size="xs"
              variant={keepRatio === preset.value ? "default" : "outline"}
              disabled={disabled}
              onClick={() => setKeepRatio(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <input
          id="keep-ratio"
          type="range"
          min={0.05}
          max={0.95}
          step={0.05}
          value={keepRatio}
          disabled={disabled}
          onChange={(event) => setKeepRatio(Number(event.target.value))}
          className="mt-3 w-full accent-primary"
        />
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          ≈ {estimated.toLocaleString()} / {triangleCount.toLocaleString()} tris
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => void reduceMesh(keepRatio)}
        >
          <Minimize2 data-icon="inline-start" />
          Reduce mesh
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => exportStl()}
        >
          <Download data-icon="inline-start" />
          Export STL
        </Button>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Reduction uses meshoptimizer in the browser. Export downloads a binary
        STL of the current model (after any reduction).
      </p>
    </div>
  );
}
