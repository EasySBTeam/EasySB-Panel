import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import { initTheme } from '@/lib/theme'
import App from './App.tsx'

// Apply the stored theme before the first paint, so the console never flashes.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
