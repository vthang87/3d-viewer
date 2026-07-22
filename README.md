# 3D Viewer

Client-side web viewer for **STL**, **3MF**, **STEP**, and **OBJ** files. Files are parsed and rendered entirely in the browser — nothing is uploaded to a server.

**Live:** [https://3d-viewer.vthang.top](https://3d-viewer.vthang.top)

## Features

- Open `.stl` (ASCII / binary), `.3mf`, `.step` / `.stp`, and `.obj` (+ optional `.mtl`)
- STEP/STP tessellated client-side via OpenCascade WASM (`occt-import-js`, LGPL)
- Large files up to **512 MB** for mesh formats; **STEP/STP max 100 MB** (export STL if larger)
- Import quality presets for STEP: Fast / Balanced / High
- Reduce mesh (meshoptimizer) and export binary STL from the current model
- Orbit / pan / zoom with damping; reset / frame selection
- Auto-center model and fit camera on load
- CAD-style **View Cube** (faces / edges / corners) with animated camera transitions
- Objects tree: show / hide, isolate, focus
- Model info: dimensions (mm), mesh / triangle / vertex counts
- Solid / wireframe, grid, axes, fullscreen

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui
- Three.js + React Three Fiber + drei
- Zustand

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

`output: "standalone"` is enabled for the Docker image.

## Deploy

Production runs on Portainer (**hp-pc**, endpoint 8) behind Cloudflare Tunnel.

| | |
| --- | --- |
| URL | https://3d-viewer.vthang.top |
| Stack | `3d-viewer` |
| Image | `ghcr.io/vthang87/3d-viewer:latest` |
| Host port | `3007` → container `3000` |

### Docker (local)

```bash
docker build --platform linux/amd64 -t ghcr.io/vthang87/3d-viewer:latest .
docker compose up -d
```

### CI / Portainer

1. Push to `main` → GitHub Actions builds and pushes the image to GHCR (`.github/workflows/docker-publish.yml`).
2. In Portainer, redeploy the `3d-viewer` stack (Pull + redeploy) so the host picks up `:latest`.

Compose file used by the stack: [`docker-compose.yml`](docker-compose.yml).

No backend, database, or app env vars are required for the MVP.

## Spec

Product notes: [`docs/web-3d-file-viewer-stl-3mf.md`](docs/web-3d-file-viewer-stl-3mf.md).
