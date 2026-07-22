importScripts("occt-import-js.js");

let occtPromise = null;
let queue = Promise.resolve();

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

/** Always allocate a fresh buffer — never transfer WASM/heap views. */
function copyFloat32(array) {
  const out = new Float32Array(array.length);
  out.set(array);
  return out;
}

function copyUint32(array) {
  const out = new Uint32Array(array.length);
  out.set(array);
  return out;
}

function packMeshes(rawMeshes, onProgress) {
  const meshes = [];
  const transfer = [];
  const total = rawMeshes.length;

  for (let i = 0; i < total; i += 1) {
    if (i === 0 || i % 25 === 0 || i === total - 1) {
      onProgress("packing", i + 1, total);
    }

    const mesh = rawMeshes[i];
    const positionSrc = mesh && mesh.attributes && mesh.attributes.position
      ? mesh.attributes.position.array
      : null;
    const indexSrc = mesh && mesh.index ? mesh.index.array : null;

    if (!positionSrc || !indexSrc || positionSrc.length < 3 || indexSrc.length < 3) {
      continue;
    }

    const position = copyFloat32(positionSrc);
    const index = copyUint32(indexSrc);

    let normal = null;
    const normalSrc =
      mesh.attributes && mesh.attributes.normal
        ? mesh.attributes.normal.array
        : null;
    if (normalSrc && normalSrc.length === positionSrc.length) {
      normal = copyFloat32(normalSrc);
    }

    transfer.push(position.buffer);
    transfer.push(index.buffer);
    if (normal) transfer.push(normal.buffer);

    meshes.push({
      name: (mesh.name || "").toString(),
      color: mesh.color || null,
      position: position,
      normal: normal,
      index: index,
    });
  }

  return { meshes: meshes, transfer: transfer };
}

async function handleMessage(ev) {
  const data = ev.data || {};

  if (data.type === "warmup") {
    await getOcct();
    postMessage({ ok: true, type: "warmup" });
    return;
  }

  const requestId = data.requestId;
  try {
    postMessage({
      ok: true,
      type: "progress",
      requestId: requestId,
      phase: "tessellate",
    });

    const occt = await getOcct();
    const result = occt.ReadFile(
      data.format || "step",
      data.buffer,
      data.params ?? null
    );

    const rawMeshes = (result && result.meshes) || [];
    if (!rawMeshes.length) {
      postMessage({
        ok: false,
        requestId: requestId,
        error:
          "STEP produced no mesh. The file may be empty, unsupported, or too complex to tessellate.",
      });
      return;
    }

    const packed = packMeshes(rawMeshes, function (phase, current, total) {
      postMessage({
        ok: true,
        type: "progress",
        requestId: requestId,
        phase: phase,
        current: current,
        total: total,
      });
    });

    if (!packed.meshes.length) {
      postMessage({
        ok: false,
        requestId: requestId,
        error: "STEP meshes were empty after tessellation.",
      });
      return;
    }

    try {
      postMessage(
        {
          ok: true,
          type: "result",
          requestId: requestId,
          success: !!(result && result.success),
          meshes: packed.meshes,
        },
        packed.transfer
      );
    } catch (transferError) {
      // Fallback without transfer list if the browser rejects it.
      postMessage({
        ok: true,
        type: "result",
        requestId: requestId,
        success: !!(result && result.success),
        meshes: packed.meshes,
      });
    }
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : String(error);
    postMessage({
      ok: false,
      requestId: requestId,
      error: message || "STEP worker failed.",
    });
  }
}

onmessage = function (ev) {
  queue = queue.then(function () {
    return handleMessage(ev);
  });
};
