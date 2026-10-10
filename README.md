# EasySB-Frontend

Web management console for [EasySB](https://github.com/EasySBTeam/EasySB).

This repository holds the React + TypeScript single-page application only. The
Vite build produces a static bundle that EasySB either embeds into the Go binary
(`go:embed public/dist`) or serves from disk, so the Go repository needs no Node
toolchain and never commits built assets.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui (Radix primitives)
- React Router v7, TanStack Query, TanStack Table
- xterm.js for the web terminal

The UI is Chinese-only, dark-first, and reads every value from the panel API
described in the backend's `docs/panel-api.md`.

## Development

```bash
# Install dependencies
npm install

# Start the dev server; /api is proxied to the panel service on 127.0.0.1:2095
npm run dev
```

## Build

```bash
# Typecheck and build the SPA
npm run build
```

`vite.config.ts` writes the bundle to `../easysb/public/dist` by default, where
the Go `go:embed` picks it up. Override the destination with `PANEL_OUTDIR`:

```bash
# Build into this repository's dist/ (used by CI, published as a release asset)
PANEL_OUTDIR=dist npm run build
```

## Release

GitHub Actions builds the bundle from `main` (rolling `edge` pre-release) and
from version tags (formal release). EasySB's `scripts/fetch-panel.sh` downloads
the asset `easysb-panel-dist-v<version>.tar.gz` into `public/dist` before a Go
build.

## Integration contract

- Vite uses `base: './'` so the console can be served under a security-entry
  prefix (for example `/manage/`). `index.html` must keep `<base href="/" />`;
  EasySB rewrites that tag to the configured prefix at serve time.
- The panel serves the SPA and the API on one origin; requests go to `/api/v1`.

## Layout

```
src/
  auth/       session context and route guards
  components/ ui/ (shadcn), shared/ (tables, dialogs, states), layout/ (shell)
  lib/        api client, TanStack Query hooks, types, formatting
  pages/      one module per console section
```
