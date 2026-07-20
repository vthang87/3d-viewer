import type { BufferGeometry } from "three";

export function countTriangles(geometry: BufferGeometry): number {
  const index = geometry.index;
  if (index) {
    return Math.floor(index.count / 3);
  }

  const position = geometry.getAttribute("position");
  if (!position) {
    return 0;
  }

  return Math.floor(position.count / 3);
}

export function countVertices(geometry: BufferGeometry): number {
  const position = geometry.getAttribute("position");
  return position ? position.count : 0;
}
