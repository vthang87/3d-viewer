#!/usr/bin/env node
/**
 * Copy occt-import-js WASM runtime into public/ for browser workers.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "node_modules", "occt-import-js", "dist");
const dest = path.join(root, "public", "occt-import-js");

const files = [
  "occt-import-js.js",
  "occt-import-js.wasm",
  "occt-import-js-worker.js",
  "license.occt.txt",
  "license.occt-import-js.txt",
];

if (!fs.existsSync(src)) {
  console.warn("[copy-occt-assets] occt-import-js not installed; skip.");
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });

for (const file of files) {
  const from = path.join(src, file);
  if (!fs.existsSync(from)) {
    console.warn(`[copy-occt-assets] missing ${file}`);
    continue;
  }
  fs.copyFileSync(from, path.join(dest, file));
}

console.log("[copy-occt-assets] synced public/occt-import-js");
