/*
 * The left navigation, modelled on 3x-ui: a slim icon rail that widens on
 * hover and stays open once pinned. The outer wrapper reserves the space the
 * content should leave free, while the panel itself is fixed, so a hover-expand
 * slides over the page instead of reflowing it. Pinning widens the reserved
 * space and is remembered in localStorage.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, Pin, PinOff, Sun, UserRound } from 'lucide-react'
import { cn } from 'cn'
import { useAuth } from '@/auth/session'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import brandUrl from '@/assets/brand.png'
import { navGroups } from './nav'

const PINNED_KEY = 'easysb-sidebar-pinned'

function readPinned(): boolean {
  try {
    return localStorage.getItem(PINNED_KEY) === 'true'
  } catch {
    return false
  }
}

/** True when the route belongs to a nav item, so nested pages keep it lit. */
function isActivePath(pathname: string, path: string): boolean {
  if (path === '/') {
    return pathname === '/'
  }
  return pathname === path || pathname.startsWith(`${path}/`)
}

interface NavListProps {
  collapsed: boolean
  onNavigate?: () => void
}

/** The grouped links, shared by the desktop rail and the mobile drawer. */
function NavList({ collapsed, onNavigate }: NavListProps) {
  const { pathname } = useLocation()
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
      {navGroups.map((group) => (
        <div key={group.label} className="pb-2">
          <p
            className={cn(
              'px-3 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground',
              collapsed && 'sr-only',
            )}
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.path)
              const link = (
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    'flex h-9 items-center gap-3 rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none',
                    'hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                    active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                    collapsed ? 'justify-center px-0' : 'px-3',
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed ? <span className="truncate">{item.title}</span> : null}
                </NavLink>
              )
              return (
                <li key={item.path}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

interface FooterProps {
  collapsed: boolean
}

/** Theme switch, account menu and the version tag, at the foot of the rail. */
function SidebarFooter({ collapsed }: FooterProps) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [signingOut, setSigningOut] = useState(false)

  return (
    <div className="shrink-0 border-t p-2">
      <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label={theme === 'dark' ? '切换到浅色' : '切换到深色'}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? 'icon-sm' : 'sm'}
              className={cn('gap-2', collapsed ? '' : 'flex-1 justify-start')}
            >
              <UserRound className="shrink-0" />
              {!collapsed ? (
                <span className="max-w-28 truncate">{session?.username ?? '管理员'}</span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-52">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span>{session?.username ?? '管理员'}</span>
              <span className="text-xs font-normal text-muted-foreground">
                EasySB v{session?.version ?? '—'} · API {session?.apiVersion ?? '—'}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true)
                try {
                  await signOut()
                  navigate('/login', { replace: true })
                } finally {
                  setSigningOut(false)
                }
              }}
            >
              <LogOut />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!collapsed ? (
        <p className="px-2 pt-1.5 text-[11px] text-muted-foreground">
          EasySB v{session?.version ?? '—'}
        </p>
      ) : null}
    </div>
  )
}

function Brand({ collapsed, pinned, onTogglePin }: {
  collapsed: boolean
  pinned: boolean
  onTogglePin: () => void
}) {
  return (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center gap-2.5 border-b',
        collapsed ? 'justify-center px-0' : 'px-3',
      )}
    >
      <img src={brandUrl} alt="EasySB" className="size-8 shrink-0 rounded-lg" />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">EasySB</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn('shrink-0', pinned && 'text-primary')}
            onClick={onTogglePin}
            aria-pressed={pinned}
            aria-label={pinned ? '取消固定侧栏' : '固定侧栏'}
            title={pinned ? '取消固定侧栏' : '固定侧栏'}
          >
            {pinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
          </Button>
        </>
      ) : null}
    </div>
  )
}

/** The authenticated navigation: a hover-expand rail on desktop, a drawer below. */
export function AppSidebar() {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(readPinned)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const collapsed = !hovered && !pinned

  const togglePinned = useCallback(() => {
    setPinned((current) => {
      const next = !current
      try {
        localStorage.setItem(PINNED_KEY, String(next))
      } catch {
        // Storage may be unavailable; the pin still works for this session.
      }
      return next
    })
  }, [])

  // A remount can happen while the pointer is already inside the rail, which
  // would leave it collapsed until the next mouse move. Re-check on mount.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHovered(rootRef.current?.matches(':hover') ?? false)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div
      ref={rootRef}
      className={cn('w-0 shrink-0', pinned ? 'md:w-[220px]' : 'md:w-[72px]')}
    >
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden h-svh flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear md:flex',
          collapsed ? 'md:w-[72px]' : 'md:w-[220px]',
          !pinned && !collapsed && 'shadow-xl',
        )}
      >
        <Brand collapsed={collapsed} pinned={pinned} onTogglePin={togglePinned} />
        <NavList collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} />
      </aside>

      {/* Below md the rail is hidden and a floating handle opens the drawer. */}
      <button
        type="button"
        aria-label="打开菜单"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-3 top-3 z-30 inline-flex size-10 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-md backdrop-blur md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[min(82vw,320px)] gap-0 p-0 md:hidden">
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <Brand collapsed={false} pinned={pinned} onTogglePin={togglePinned} />
          <NavList collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          <SidebarFooter collapsed={false} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
