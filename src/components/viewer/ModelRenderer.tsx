"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { applyObjectVisibility } from "@/lib/geometry/object-tree";
import { useViewerStore } from "@/store/viewer-store";

interface ModelRendererProps {
  object: THREE.Object3D;
}

export function ModelRenderer({ object }: ModelRendererProps) {
  const renderMode = useViewerStore((state) => state.renderMode);
  const objects = useViewerStore((state) => state.objects);
  const objectVisibility = useViewerStore((state) => state.objectVisibility);

  useEffect(() => {
    const wireframe = renderMode === "wireframe";

    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((material) => {
        if (material && "wireframe" in material) {
          material.wireframe = wireframe;
          material.needsUpdate = true;
        }
      });
    });
  }, [object, renderMode]);

  useEffect(() => {
    applyObjectVisibility(object, objects, objectVisibility);
  }, [object, objects, objectVisibility]);

  return <primitive object={object} />;
}
