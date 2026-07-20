"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { fitCameraToObject } from "@/lib/camera/fit-camera";
import { publishCubeOrientation } from "@/lib/camera/camera-orientation";
import { findObjectById } from "@/lib/geometry/object-tree";
import { useViewerStore } from "@/store/viewer-store";

const VIEW_ANIM_DURATION = 0.5;

interface OrbitAnim {
  active: boolean;
  elapsed: number;
  duration: number;
  fromSpherical: THREE.Spherical;
  toSpherical: THREE.Spherical;
  target: THREE.Vector3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shortestTheta(from: number, to: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta;
}

interface CameraControllerProps {
  object: THREE.Object3D | null;
}

export function CameraController({ object }: CameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const cameraResetToken = useViewerStore((state) => state.cameraResetToken);
  const focusObjectId = useViewerStore((state) => state.focusObjectId);
  const viewDirection = useViewerStore((state) => state.viewDirection);
  const viewDirectionToken = useViewerStore((state) => state.viewDirectionToken);

  const offset = useRef(new THREE.Vector3());
  const spherical = useRef(new THREE.Spherical());
  const anim = useRef<OrbitAnim | null>(null);
  const scratchSpherical = useRef(new THREE.Spherical());
  // Track last handled view token so fit/reset doesn't re-trigger wrongly
  const lastViewToken = useRef(0);

  useEffect(() => {
    if (!object || !(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }

    // ViewCube angle change → animated orbit
    if (
      viewDirection &&
      viewDirectionToken > 0 &&
      viewDirectionToken !== lastViewToken.current
    ) {
      lastViewToken.current = viewDirectionToken;

      const controls = controlsRef.current;
      const target = controls?.target.clone() ?? new THREE.Vector3(0, 0, 0);
      const distance = Math.max(camera.position.distanceTo(target), 1);
      const direction = new THREE.Vector3(...viewDirection).normalize();

      // Nudge off exact poles so OrbitControls stays stable
      if (Math.abs(direction.y) > 0.999) {
        direction.x = 0.0001;
        direction.normalize();
      }

      const fromSpherical = new THREE.Spherical().setFromVector3(
        camera.position.clone().sub(target)
      );
      const toSpherical = new THREE.Spherical().setFromVector3(
        direction.multiplyScalar(distance)
      );
      fromSpherical.makeSafe();
      toSpherical.makeSafe();
      toSpherical.theta = shortestTheta(fromSpherical.theta, toSpherical.theta);

      anim.current = {
        active: true,
        elapsed: 0,
        duration: VIEW_ANIM_DURATION,
        fromSpherical,
        toSpherical,
        target,
      };

      if (controls) {
        controls.enabled = false;
      }
      return;
    }

    // Reset / focus / initial load → snap fit (no angle token change)
    if (viewDirectionToken === lastViewToken.current) {
      anim.current = null;
      const targetObject =
        focusObjectId != null
          ? (findObjectById(object, focusObjectId) ?? object)
          : object;
      fitCameraToObject(camera, controlsRef.current, targetObject);
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }
  }, [
    object,
    camera,
    cameraResetToken,
    focusObjectId,
    viewDirection,
    viewDirectionToken,
  ]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;

    if (anim.current?.active) {
      const state = anim.current;
      state.elapsed += delta;
      const u = Math.min(1, state.elapsed / state.duration);
      const e = easeInOutCubic(u);

      const sph = scratchSpherical.current.set(
        THREE.MathUtils.lerp(
          state.fromSpherical.radius,
          state.toSpherical.radius,
          e
        ),
        THREE.MathUtils.lerp(state.fromSpherical.phi, state.toSpherical.phi, e),
        THREE.MathUtils.lerp(
          state.fromSpherical.theta,
          state.toSpherical.theta,
          e
        )
      );
      sph.makeSafe();

      camera.position.setFromSpherical(sph).add(state.target);
      camera.up.set(0, 1, 0);
      camera.lookAt(state.target);

      if (controls) {
        controls.target.copy(state.target);
      }

      if (u >= 1) {
        state.active = false;
        if (controls) {
          controls.enabled = true;
          controls.update();
        }
      }
    }

    const target = controls?.target ?? new THREE.Vector3(0, 0, 0);
    offset.current.subVectors(camera.position, target);
    spherical.current.setFromVector3(offset.current);

    const rotX = THREE.MathUtils.radToDeg(spherical.current.phi - Math.PI / 2);
    const rotY = THREE.MathUtils.radToDeg(-spherical.current.theta);
    publishCubeOrientation({ rotX, rotY });
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      screenSpacePanning
    />
  );
}
