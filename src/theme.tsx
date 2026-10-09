import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// Arco switches palettes through CSS variables keyed off body[arco-theme="dark"],
// so the mode is expressed by that attribute plus a data-theme hook for the few
// shell styles that need explicit values. "system" follows the OS preference and
// keeps following it while the page is open.

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

const THEME_KEY = 'easysb_panel_theme'

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' || stored === 'system' ? stored : 'light'
  })

  useEffect(() => {
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && prefersDark())
      const body = document.body
      if (dark) {
        body.setAttribute('arco-theme', 'dark')
      } else {
        body.removeAttribute('arco-theme')
      }
      body.setAttribute('data-theme', dark ? 'dark' : 'light')
      body.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    if (mode !== 'system') {
      return
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(THEME_KEY, next)
    setModeState(next)
  }, [])

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return ctx
}
