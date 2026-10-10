/*
 * Who is logged in, and the one place that answers it.
 *
 * The session endpoint requires authentication, so a 401 from it means "not
 * logged in" rather than an error worth showing. Every mutation the app makes can
 * also earn a 401 when the session expires; api.ts broadcasts that, and this
 * provider turns the broadcast back into a session refetch so the guard sends the
 * operator to the login screen instead of leaving a broken page on screen.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UNAUTHORIZED_EVENT } from '@/lib/api'
import { keys, useLogin, useLogout, useSession } from '@/lib/queries'

interface Session {
  username: string
  version: string
  apiVersion: string
}

interface AuthContextValue {
  session: Session | null
  loading: boolean
  authenticated: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const sessionQuery = useSession()
  const login = useLogin()
  const logout = useLogout()

  // A 401 from any request means the session ended; refetching the session query
  // resolves it to the unauthenticated state, which the guard reacts to.
  useEffect(() => {
    const onUnauthorized = () => {
      void qc.invalidateQueries({ queryKey: keys.session })
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [qc])

  const signIn = useCallback(
    async (username: string, password: string) => {
      await login.mutateAsync({ username, password })
      await qc.invalidateQueries({ queryKey: keys.session })
    },
    [login, qc],
  )

  const signOut = useCallback(async () => {
    try {
      await logout.mutateAsync()
    } finally {
      qc.clear()
    }
  }, [logout, qc])

  const value = useMemo<AuthContextValue>(() => {
    const data = sessionQuery.data
    const authenticated = Boolean(data && data.username && data.username !== 'anonymous')
    return {
      session: authenticated && data ? data : null,
      loading: sessionQuery.isLoading,
      authenticated,
      signIn,
      signOut,
      refresh: () => {
        void qc.invalidateQueries({ queryKey: keys.session })
      },
    }
  }, [sessionQuery.data, sessionQuery.isLoading, signIn, signOut, qc])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
