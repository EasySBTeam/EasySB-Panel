import type { ReactNode } from 'react'
import { cn } from 'cn'
import { Card, CardContent } from '@/components/ui/card'

/** A compact metric tile: a label, one value and an optional sub-line or icon. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'destructive'
  className?: string
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'destructive'
          ? 'text-destructive'
          : 'text-foreground'

  return (
    <Card className={cn('gap-0 py-4', className)}>
      <CardContent className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn('text-xl font-semibold tabular tracking-tight', toneClass)}>{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? <div className="text-muted-foreground/70 [&_svg]:size-4">{icon}</div> : null}
      </CardContent>
    </Card>
  )
}
