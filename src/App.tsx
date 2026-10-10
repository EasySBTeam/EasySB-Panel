import { lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/session'
import { RedirectIfAuthed, RequireAuth } from '@/auth/guard'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { routerBasename } from '@/lib/api'
import { LoginPage } from '@/pages/login'

// Each page is loaded on demand, so the login screen and the shell do not carry
// the terminal's xterm or the toolbox's tables until they are opened.
const DashboardPage = lazy(() =>
  import('@/pages/dashboard').then((module) => ({ default: module.DashboardPage })),
)
const NodesPage = lazy(() =>
  import('@/pages/nodes').then((module) => ({ default: module.NodesPage })),
)
const UsersPage = lazy(() =>
  import('@/pages/users').then((module) => ({ default: module.UsersPage })),
)
const UserDetailPage = lazy(() =>
  import('@/pages/user-detail').then((module) => ({ default: module.UserDetailPage })),
)
const SubscriptionsPage = lazy(() =>
  import('@/pages/subscriptions').then((module) => ({ default: module.SubscriptionsPage })),
)
const DomainsPage = lazy(() =>
  import('@/pages/domains').then((module) => ({ default: module.DomainsPage })),
)
const CorePage = lazy(() =>
  import('@/pages/core').then((module) => ({ default: module.CorePage })),
)
const SystemPage = lazy(() =>
  import('@/pages/system').then((module) => ({ default: module.SystemPage })),
)
const LogsPage = lazy(() =>
  import('@/pages/logs').then((module) => ({ default: module.LogsPage })),
)
const BBRPage = lazy(() =>
  import('@/pages/bbr').then((module) => ({ default: module.BBRPage })),
)
const ToolboxPage = lazy(() =>
  import('@/pages/toolbox').then((module) => ({ default: module.ToolboxPage })),
)
const TerminalPage = lazy(() =>
  import('@/pages/terminal').then((module) => ({ default: module.TerminalPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings').then((module) => ({ default: module.SettingsPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
  },
})

/** The router, the data client and the auth gate that make up the console. */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename()}>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <Routes>
              <Route
                path="/login"
                element={
                  <RedirectIfAuthed>
                    <LoginPage />
                  </RedirectIfAuthed>
                }
              />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="nodes" element={<NodesPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="users/:name" element={<UserDetailPage />} />
                  <Route path="subscriptions" element={<SubscriptionsPage />} />
                  <Route path="domains" element={<DomainsPage />} />
                  <Route path="core" element={<CorePage />} />
                  <Route path="system" element={<SystemPage />} />
                  <Route path="logs" element={<LogsPage />} />
                  <Route path="bbr" element={<BBRPage />} />
                  <Route path="toolbox" element={<ToolboxPage />} />
                  <Route path="terminal" element={<TerminalPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
