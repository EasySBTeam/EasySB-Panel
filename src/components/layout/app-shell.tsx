/*
 * The authenticated frame. 3x-ui has no persistent top bar, so the only chrome
 * is the left rail; each page brings its own header. Below md the rail becomes a
 * drawer opened by the floating handle, which is why the content keeps extra top
 * padding on small screens.
 */

import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/shared/states'
import { AppSidebar } from './app-sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-6 p-4 pt-16 md:p-6">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
