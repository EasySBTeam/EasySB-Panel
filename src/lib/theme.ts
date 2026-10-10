/*
 * The dark/light switch.
 *
 * The console is dark by default; the choice is remembered in localStorage and
 * applied by toggling the `dark` class the token palette is keyed on. It is kept
 * out of React so the initial paint matches the stored preference with no flash.
 */

import { useCallback, useState } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'easysb-theme'

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

/** Apply the stored theme before React mounts, so the first frame is correct. */
export function initTheme() {
  applyTheme(readTheme())
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggle }
}
