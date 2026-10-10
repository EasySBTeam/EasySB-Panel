import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { LoadingState } from '@/components/shared/states'
import { AppSidebar } from './app-sidebar'
import { Topbar } from './topbar'

/** The authenticated frame: navigation on the left, a top bar, and the page. */
export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <main className="flex-1 space-y-6 p-4 sm:p-6">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
