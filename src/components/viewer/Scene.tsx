"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraController } from "@/components/viewer/CameraController";
import { ModelRenderer } from "@/components/viewer/ModelRenderer";
import { ViewerAxes } from "@/components/viewer/ViewerAxes";
import { ViewerGrid } from "@/components/viewer/ViewerGrid";
import { useViewerStore } from "@/store/viewer-store";

export function Scene() {
  const model = useViewerStore((state) => state.model);

  return (
    <Canvas
      className="h-full w-full touch-none"
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [40, 30, 40], fov: 45, near: 0.1, far: 5000 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#111827"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[40, 60, 30]} intensity={1.5} />
      <directionalLight position={[-30, 20, -40]} intensity={0.35} />

      <Suspense fallback={null}>
        <ViewerGrid />
        <ViewerAxes />
        {model ? <ModelRenderer object={model} /> : null}
        <CameraController object={model} />
      </Suspense>
    </Canvas>
  );
}
