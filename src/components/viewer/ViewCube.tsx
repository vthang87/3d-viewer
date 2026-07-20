"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { subscribeCubeOrientation } from "@/lib/camera/camera-orientation";
import {
  useViewerStore,
  type StandardView,
  type ViewDirection,
} from "@/store/viewer-store";
import { cn } from "@/lib/utils";

const SIZE = 52; // ~2/3 of 78
const HALF = SIZE / 2;
const FACE_RADIUS = 4;
const RIM = 10;
const WRAP = 76; // ~2/3 of 112

/**
 * Classic CSS cube — labels stay upright.
 * Front=+Z, Back=-Z, Right=+X, Left=-X, Top=+Y, Bottom=-Y
 */
const FACE_TRANSFORMS: Record<StandardView, string> = {
  front: `rotateY(0deg) translateZ(${HALF}px)`,
  back: `rotateY(180deg) translateZ(${HALF}px)`,
  right: `rotateY(90deg) translateZ(${HALF}px)`,
  left: `rotateY(-90deg) translateZ(${HALF}px)`,
  top: `rotateX(90deg) translateZ(${HALF}px)`,
  bottom: `rotateX(-90deg) translateZ(${HALF}px)`,
  isometric: "",
};

type RimKey = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/**
 * Rim zones on each face (outer border only).
 * Directions are Three.js Y-up camera look-from vectors.
 */
const FACE_RIMS: Record<
  Exclude<StandardView, "isometric">,
  Record<RimKey, ViewDirection>
> = {
  front: {
    n: [0, 1, 1],
    s: [0, -1, 1],
    e: [1, 0, 1],
    w: [-1, 0, 1],
    ne: [1, 1, 1],
    nw: [-1, 1, 1],
    se: [1, -1, 1],
    sw: [-1, -1, 1],
  },
  back: {
    n: [0, 1, -1],
    s: [0, -1, -1],
    e: [-1, 0, -1],
    w: [1, 0, -1],
    ne: [-1, 1, -1],
    nw: [1, 1, -1],
    se: [-1, -1, -1],
    sw: [1, -1, -1],
  },
  right: {
    n: [1, 1, 0],
    s: [1, -1, 0],
    e: [1, 0, -1],
    w: [1, 0, 1],
    ne: [1, 1, -1],
    nw: [1, 1, 1],
    se: [1, -1, -1],
    sw: [1, -1, 1],
  },
  left: {
    n: [-1, 1, 0],
    s: [-1, -1, 0],
    e: [-1, 0, 1],
    w: [-1, 0, -1],
    ne: [-1, 1, 1],
    nw: [-1, 1, -1],
    se: [-1, -1, 1],
    sw: [-1, -1, -1],
  },
  top: {
    n: [0, 1, -1],
    s: [0, 1, 1],
    e: [1, 1, 0],
    w: [-1, 1, 0],
    ne: [1, 1, -1],
    nw: [-1, 1, -1],
    se: [1, 1, 1],
    sw: [-1, 1, 1],
  },
  bottom: {
    n: [0, -1, 1],
    s: [0, -1, -1],
    e: [1, -1, 0],
    w: [-1, -1, 0],
    ne: [1, -1, 1],
    nw: [-1, -1, 1],
    se: [1, -1, -1],
    sw: [-1, -1, -1],
  },
};

const FACE_LIST: Exclude<StandardView, "isometric">[] = [
  "front",
  "back",
  "right",
  "left",
  "top",
  "bottom",
];

const FACE_LABELS: Record<Exclude<StandardView, "isometric">, string> = {
  front: "Front",
  back: "Back",
  right: "Right",
  left: "Left",
  top: "Top",
  bottom: "Bottom",
};

function dirLabel(dir: ViewDirection): string {
  const [x, y, z] = dir;
  const parts: string[] = [];
  if (y !== 0) parts.push(y > 0 ? "Top" : "Bottom");
  if (z !== 0) parts.push(z > 0 ? "Front" : "Back");
  if (x !== 0) parts.push(x > 0 ? "Right" : "Left");
  return parts.join("-") || "View";
}

function sameDir(a: ViewDirection, b: ViewDirection): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function ViewCube() {
  const cubeRef = useRef<HTMLDivElement>(null);
  const setStandardView = useViewerStore((state) => state.setStandardView);
  const setViewDirection = useViewerStore((state) => state.setViewDirection);
  const status = useViewerStore((state) => state.status);
  const ready = status === "ready";
  const [hoveredDir, setHoveredDir] = useState<ViewDirection | null>(null);

  useEffect(() => {
    return subscribeCubeOrientation(({ rotX, rotY }) => {
      if (!cubeRef.current) return;
      cubeRef.current.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });
  }, []);

  return (
    <div
      className="relative select-none"
      style={{ width: WRAP, height: WRAP }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center overflow-visible"
        style={{ perspective: "720px", perspectiveOrigin: "50% 50%" }}
      >
        <div
          ref={cubeRef}
          className="relative"
          onMouseLeave={() => setHoveredDir(null)}
          style={{
            width: SIZE,
            height: SIZE,
            transformStyle: "preserve-3d",
            transform: "rotateX(-35deg) rotateY(-45deg)",
          }}
        >
          {FACE_LIST.map((face) => {
            const rims = FACE_RIMS[face];

            return (
              <div
                key={face}
                className="absolute overflow-hidden border border-[#6a7388]/80 bg-[#3a4254]/96 shadow-[inset_0_1px_0_rgb(255_255_255/8%)]"
                style={{
                  width: SIZE,
                  height: SIZE,
                  left: 0,
                  top: 0,
                  transform: FACE_TRANSFORMS[face],
                  borderRadius: FACE_RADIUS,
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transformStyle: "preserve-3d",
                }}
              >
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => setStandardView(face)}
                  className={cn(
                    "absolute flex items-center justify-center text-[9px] font-semibold tracking-wide text-white/95 transition-colors",
                    "disabled:cursor-default hover:bg-[#3b82f6]/80"
                  )}
                  style={{
                    left: RIM,
                    top: RIM,
                    right: RIM,
                    bottom: RIM,
                    borderRadius: 3,
                  }}
                  aria-label={`${FACE_LABELS[face]} view`}
                >
                  {FACE_LABELS[face]}
                </button>

                {(Object.keys(rims) as RimKey[]).map((key) => {
                  const dir = rims[key];
                  const isCorner = key.length === 2;
                  // Same corner/edge lights up on every adjacent face that shares it.
                  const lit =
                    hoveredDir != null && sameDir(hoveredDir, dir);

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!ready}
                      title={dirLabel(dir)}
                      aria-label={`${dirLabel(dir)} ${isCorner ? "corner" : "edge"} view`}
                      onMouseEnter={() => setHoveredDir(dir)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setViewDirection(dir);
                        setHoveredDir(null);
                      }}
                      className={cn(
                        "absolute z-10 transition-colors disabled:pointer-events-none",
                        lit
                          ? "bg-[#3b82f6]/50 ring-2 ring-inset ring-[#3b82f6]"
                          : "bg-transparent"
                      )}
                      style={rimStyle(key)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function rimStyle(key: RimKey): CSSProperties {
  switch (key) {
    case "n":
      return { left: RIM, right: RIM, top: 0, height: RIM };
    case "s":
      return { left: RIM, right: RIM, bottom: 0, height: RIM };
    case "e":
      return { top: RIM, bottom: RIM, right: 0, width: RIM };
    case "w":
      return { top: RIM, bottom: RIM, left: 0, width: RIM };
    case "ne":
      return { top: 0, right: 0, width: RIM, height: RIM };
    case "nw":
      return { top: 0, left: 0, width: RIM, height: RIM };
    case "se":
      return { bottom: 0, right: 0, width: RIM, height: RIM };
    case "sw":
      return { bottom: 0, left: 0, width: RIM, height: RIM };
  }
}
