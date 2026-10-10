import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/auth/session'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { crumbByPath } from './nav'

interface Crumb {
  label: string
  path?: string
}

/** Build the breadcrumb trail for a pathname. */
function crumbsFor(pathname: string): Crumb[] {
  if (pathname === '/') {
    return [{ label: '概览' }]
  }
  const segments = pathname.split('/').filter(Boolean)
  const first = `/${segments[0]}`
  const base = crumbByPath.get(first)
  const crumbs: Crumb[] = []
  if (base) {
    crumbs.push({ label: base, path: segments.length > 1 ? first : undefined })
  }
  if (segments.length > 1) {
    crumbs.push({ label: decodeURIComponent(segments[1]) })
  }
  return crumbs.length > 0 ? crumbs : [{ label: '概览' }]
}

export function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [signingOut, setSigningOut] = useState(false)
  const crumbs = crumbsFor(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1
            return (
              <span key={`${crumb.label}-${index}`} className="contents">
                <BreadcrumbItem
                  className={last ? 'min-w-0' : 'hidden sm:block'}
                >
                  {last || !crumb.path ? (
                    <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.path}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!last ? <BreadcrumbSeparator className="hidden sm:block" /> : null}
              </span>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

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
          <Button variant="ghost" size="sm" className="gap-2">
            <UserRound />
            <span className="hidden max-w-24 truncate sm:inline">{session?.username ?? '管理员'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
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
    </header>
  )
}
