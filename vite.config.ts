import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The dev server stands in for the Go panel: it serves the SPA and proxies /api
// to the panel service, so the browser sees a single origin, exactly as in
// production where one binary serves both.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset URLs let the panel be mounted under a security-entry prefix
  // (e.g. /manage/): the served index.html carries a <base> tag that resolves
  // them, and the Go panel rewrites that tag when an entry is configured.
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    allowedHosts: ['.monkeycode-ai.online'],
    proxy: {
      '/api': 'http://127.0.0.1:2095',
    },
  },
  build: {
    // A local build drops the bundle into the neighbouring Go repository's
    // public/dist, where go:embed picks it up; in CI that repository is absent,
    // so PANEL_OUTDIR points at this repository's dist/, which is published as a
    // release asset.
    outDir: process.env.PANEL_OUTDIR || '../easysb/public/dist',
    emptyOutDir: true,
  },
})
