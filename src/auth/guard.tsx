import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './session'

/** Sends an unauthenticated visitor to the login page, remembering where they were. */
export function RequireAuth() {
  const { authenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Keeps an already-signed-in operator off the login page. */
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }
  if (authenticated) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
