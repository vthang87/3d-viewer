importScripts("occt-import-js.js");

onmessage = async function (ev) {
  try {
    const occt = await occtimportjs({
      locateFile: function (path) {
        return path;
      },
    });

    const result = occt.ReadFile(
      ev.data.format,
      ev.data.buffer,
      ev.data.params ?? null
    );

    postMessage({ ok: true, result: result });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : String(error);
    postMessage({ ok: false, error: message || "STEP worker failed." });
  }
};
