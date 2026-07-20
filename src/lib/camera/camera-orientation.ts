/** Shared camera orientation for the HTML ViewCube (avoids per-frame React state). */

export interface CubeOrientation {
  rotX: number;
  rotY: number;
}

type OrientationListener = (orientation: CubeOrientation) => void;

let current: CubeOrientation = { rotX: -35, rotY: -45 };
const listeners = new Set<OrientationListener>();

export function publishCubeOrientation(orientation: CubeOrientation): void {
  current = orientation;
  listeners.forEach((listener) => listener(current));
}

export function getCubeOrientation(): CubeOrientation {
  return current;
}

export function subscribeCubeOrientation(
  listener: OrientationListener
): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
