import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The development server stands in for the Go panel: it serves the SPA and
// proxies /api to the panel service, so the browser sees one origin the way it
// does in production, where the binary serves both.
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs let the panel be mounted under a security entry prefix
  // (e.g. /manage/). The served index.html carries a <base> tag that resolves
  // them, and the Go panel rewrites that tag when an entry is configured.
  base: './',
  server: {
    allowedHosts: ['.monkeycode-ai.online'],
    proxy: {
      '/api': 'http://127.0.0.1:2095',
    },
  },
  build: {
    // 本地构建把产物直接写进旁边的 Go 仓库，go:embed 从那里取走；CI 里主仓库不在
    // 旁边，用 PANEL_OUTDIR 指到本仓库的 dist/，再作为 Release 资产发布。
    // A local build drops the bundle into the neighbouring Go repository, where
    // go:embed picks it up; in CI that repository is not present, so PANEL_OUTDIR
    // points at this repository's dist/, which is published as a release asset.
    outDir: process.env.PANEL_OUTDIR || '../easysb/internal/panel/web',
    emptyOutDir: true,
  },
})
