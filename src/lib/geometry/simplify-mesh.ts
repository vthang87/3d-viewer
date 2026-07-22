import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";

export interface SimplifyOptions {
  /** Fraction of triangles to keep (0–1). */
  ratio: number;
  /** Relative error tolerance for meshoptimizer. */
  targetError?: number;
}

function ensureIndexed(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  let geo = geometry.index ? geometry : mergeVertices(geometry, 1e-4);

  if (!geo.index) {
    const position = geo.getAttribute("position");
    if (!position) {
      throw new Error("Mesh has no position attribute.");
    }
    const indices = new Uint32Array(position.count);
    for (let i = 0; i < position.count; i += 1) {
      indices[i] = i;
    }
    geo = geo.clone();
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
  }

  return geo;
}

function triangleCountOf(geometry: THREE.BufferGeometry): number {
  if (geometry.index) {
    return Math.floor(geometry.index.count / 3);
  }
  const position = geometry.getAttribute("position");
  return position ? Math.floor(position.count / 3) : 0;
}

function simplifyGeometry(
  geometry: THREE.BufferGeometry,
  ratio: number,
  targetError: number
): THREE.BufferGeometry {
  const source = ensureIndexed(geometry);
  const indexAttr = source.index!;
  const positionAttr = source.getAttribute("position");

  if (!(positionAttr instanceof THREE.BufferAttribute)) {
    throw new Error("Unsupported position attribute.");
  }

  const currentTriangles = triangleCountOf(source);
  if (currentTriangles < 4) {
    return source;
  }

  const keepRatio = THREE.MathUtils.clamp(ratio, 0.01, 1);
  const targetIndexCount = Math.max(
    12,
    Math.floor(currentTriangles * keepRatio) * 3
  );

  if (targetIndexCount >= indexAttr.count) {
    return source;
  }

  const indices = new Uint32Array(indexAttr.array.length);
  indices.set(indexAttr.array as ArrayLike<number>);

  const positions = new Float32Array(positionAttr.array.length);
  positions.set(positionAttr.array as ArrayLike<number>);

  const [simplifiedIndices] = MeshoptSimplifier.simplify(
    indices,
    positions,
    3,
    targetIndexCount,
    targetError,
    ["LockBorder", "Prune"]
  );

  if (simplifiedIndices.length < 3) {
    return source;
  }

  // compactMesh rewrites indices in place and returns a vertex remap.
  const [remap, uniqueVertexCount] =
    MeshoptSimplifier.compactMesh(simplifiedIndices);

  const next = new THREE.BufferGeometry();
  next.setIndex(new THREE.BufferAttribute(simplifiedIndices, 1));

  const attrs = Object.keys(source.attributes);
  for (const name of attrs) {
    const attr = source.getAttribute(name);
    if (!(attr instanceof THREE.BufferAttribute) || attr.itemSize < 1) {
      continue;
    }

    const itemSize = attr.itemSize;
    const compacted = new Float32Array(uniqueVertexCount * itemSize);
    const src = attr.array as ArrayLike<number>;

    for (let i = 0; i < remap.length; i += 1) {
      const dst = remap[i];
      if (dst === 0xffffffff) continue;
      for (let c = 0; c < itemSize; c += 1) {
        compacted[dst * itemSize + c] = Number(src[i * itemSize + c]);
      }
    }

    next.setAttribute(
      name,
      new THREE.BufferAttribute(compacted, itemSize, attr.normalized)
    );
  }

  next.computeVertexNormals();
  next.computeBoundingBox();
  next.computeBoundingSphere();
  return next;
}

/**
 * In-place simplify all meshes under `root`, keeping ~`ratio` of triangles.
 * Returns total triangles before/after.
 */
export async function simplifyObject(
  root: THREE.Object3D,
  options: SimplifyOptions
): Promise<{ before: number; after: number }> {
  await MeshoptSimplifier.ready;

  const ratio = THREE.MathUtils.clamp(options.ratio, 0.01, 1);
  const targetError = options.targetError ?? 0.01;

  let before = 0;
  let after = 0;

  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      meshes.push(child);
    }
  });

  for (const mesh of meshes) {
    const oldGeo = mesh.geometry as THREE.BufferGeometry;
    before += triangleCountOf(oldGeo);

    const nextGeo = simplifyGeometry(oldGeo, ratio, targetError);
    after += triangleCountOf(nextGeo);

    if (nextGeo !== oldGeo) {
      mesh.geometry = nextGeo;
      oldGeo.dispose();
    }
  }

  return { before, after };
}
