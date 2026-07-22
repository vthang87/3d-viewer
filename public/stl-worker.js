/**
 * Lightweight binary STL parser (no Three.js) for off-main-thread loading.
 */
function isProbablyBinarySTL(buffer) {
  if (buffer.byteLength < 84) return false;
  const view = new DataView(buffer);
  const triCount = view.getUint32(80, true);
  const expected = 84 + triCount * 50;
  // Allow small trailing padding; reject obvious ASCII.
  if (triCount === 0 || expected > buffer.byteLength + 512) return false;
  if (Math.abs(expected - buffer.byteLength) > 512) {
    const head = new TextDecoder("latin1").decode(buffer.slice(0, 80)).toLowerCase();
    if (head.includes("solid") && !head.includes("\0")) return false;
  }
  return true;
}

function parseBinarySTL(buffer) {
  const view = new DataView(buffer);
  const triCount = view.getUint32(80, true);
  const positions = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 9);

  let offset = 84;
  for (let t = 0; t < triCount; t += 1) {
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;

    for (let v = 0; v < 3; v += 1) {
      const base = t * 9 + v * 3;
      positions[base] = view.getFloat32(offset, true);
      positions[base + 1] = view.getFloat32(offset + 4, true);
      positions[base + 2] = view.getFloat32(offset + 8, true);
      normals[base] = nx;
      normals[base + 1] = ny;
      normals[base + 2] = nz;
      offset += 12;
    }

    offset += 2; // attribute byte count
  }

  return { positions: positions, normals: normals, triangleCount: triCount };
}

onmessage = function (ev) {
  try {
    const buffer = ev.data.buffer;
    if (!isProbablyBinarySTL(buffer)) {
      postMessage({ ok: false, reason: "ascii" });
      return;
    }

    const parsed = parseBinarySTL(buffer);
    postMessage(
      {
        ok: true,
        positions: parsed.positions,
        normals: parsed.normals,
        triangleCount: parsed.triangleCount,
      },
      [parsed.positions.buffer, parsed.normals.buffer]
    );
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : String(error);
    postMessage({ ok: false, error: message || "STL worker failed." });
  }
};
