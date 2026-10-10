import { cn } from 'cn'
import { userStatusLabel, userStatusTone } from '@/lib/labels'
import type { UserStatus } from '@/lib/types'

type Tone = 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'primary'

const toneClass: Record<Tone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-info/30 bg-info/10 text-info',
  muted: 'border-border bg-muted text-muted-foreground',
  primary: 'border-primary/30 bg-primary/10 text-primary',
}

/** A compact pill for a state word. */
export function StatusBadge({
  tone = 'muted',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** An account's derived status. */
export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <StatusBadge tone={userStatusTone[status]}>{userStatusLabel[status]}</StatusBadge>
}

/** A boolean "运行中 / 已停止" state. */
export function RunningBadge({ active }: { active: boolean }) {
  return (
    <StatusBadge tone={active ? 'success' : 'muted'}>{active ? '运行中' : '已停止'}</StatusBadge>
  )
}

/** A boolean "已启用 / 已禁用" state. */
export function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <StatusBadge tone={enabled ? 'info' : 'muted'}>{enabled ? '已启用' : '已禁用'}</StatusBadge>
  )
}
