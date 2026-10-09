# EasySB-Panel

Web management panel for [EasySB](https://github.com/EasySBTeam/EasySB).

This repository holds the React + TypeScript frontend. The Vite build writes its
output into the EasySB Go module (`easysb/internal/panel/web`), which embeds the
built SPA into the `easysb` binary. Build the frontend first, then rebuild EasySB.

## Build

```bash
# Install dependencies
npm install

# Build into ../easysb/internal/panel/web (see vite.config.ts outDir)
npm run build
```

## Development

```bash
# Start the dev server
npm run dev
```
