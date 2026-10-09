import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api/client'
import type { LoginResult, Session } from './api/types'

interface AuthState {
  session: Session | null
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  // A token in storage is only trusted after the panel confirms it still maps
  // to a live session: a restarted panel invalidates every session.
  useEffect(() => {
    if (!getToken()) {
      setReady(true)
      return
    }
    let alive = true
    api
      .get<Session>('/auth/session')
      .then((s) => {
        if (alive) setSession(s)
      })
      .catch(() => {
        setToken('')
      })
      .finally(() => {
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.post<LoginResult>('/auth/login', { username, password })
    setToken(result.token)
    setSession({ username: result.username, version: result.version, apiVersion: result.apiVersion })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setToken('')
      setSession(null)
    }
  }, [])

  const value = useMemo(() => ({ session, ready, login, logout }), [session, ready, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
