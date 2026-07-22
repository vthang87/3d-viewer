importScripts("occt-import-js.js");

let occtPromise = null;

function getOcct() {
  if (!occtPromise) {
    occtPromise = occtimportjs({
      locateFile: function (path) {
        return path;
      },
    });
  }
  return occtPromise;
}

function toFloat32(array) {
  if (array instanceof Float32Array) return array;
  return Float32Array.from(array);
}

function toUint32(array) {
  if (array instanceof Uint32Array) return array;
  return Uint32Array.from(array);
}

function packMeshes(rawMeshes) {
  const meshes = [];
  const transfer = [];

  for (let i = 0; i < rawMeshes.length; i += 1) {
    const mesh = rawMeshes[i];
    const position = toFloat32(mesh.attributes.position.array);
    const normal =
      mesh.attributes.normal && mesh.attributes.normal.array
        ? toFloat32(mesh.attributes.normal.array)
        : null;
    const index = toUint32(mesh.index.array);

    transfer.push(position.buffer);
    if (normal) transfer.push(normal.buffer);
    transfer.push(index.buffer);

    const faces = [];
    const brepFaces = mesh.brep_faces || [];
    for (let f = 0; f < brepFaces.length; f += 1) {
      const face = brepFaces[f];
      faces.push({
        first: face.first,
        last: face.last,
        color: face.color || null,
      });
    }

    meshes.push({
      name: mesh.name || "",
      color: mesh.color || null,
      position: position,
      normal: normal,
      index: index,
      faces: faces,
    });
  }

  return { meshes: meshes, transfer: transfer };
}

onmessage = async function (ev) {
  try {
    if (ev.data && ev.data.type === "warmup") {
      await getOcct();
      postMessage({ ok: true, type: "warmup" });
      return;
    }

    const occt = await getOcct();
    const result = occt.ReadFile(
      ev.data.format,
      ev.data.buffer,
      ev.data.params ?? null
    );

    const packed = packMeshes(result.meshes || []);

    postMessage(
      {
        ok: true,
        type: "result",
        success: !!result.success,
        meshes: packed.meshes,
      },
      packed.transfer
    );
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : String(error);
    postMessage({ ok: false, error: message || "STEP worker failed." });
  }
};
