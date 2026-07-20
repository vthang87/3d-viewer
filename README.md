# 3D Viewer

Client-side web viewer for **STL** and **3MF** files. Files are parsed and rendered entirely in the browser — nothing is uploaded.

## Features (MVP)

- Open `.stl` (ASCII / binary) and `.3mf`
- Drag & drop or file picker
- Orbit / pan / zoom camera with reset
- Auto-center model and fit camera
- Model info: dimensions (mm), mesh / triangle / vertex counts
- Solid / wireframe, grid, axes toggles
- Fullscreen viewport

## Stack

- Next.js + React + TypeScript
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

## Deploy

Deploy to [Vercel](https://vercel.com) as a standard Next.js app. No backend, database, or environment variables required for the MVP.
