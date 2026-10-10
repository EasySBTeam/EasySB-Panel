import type { ReactNode } from 'react'
import { cn } from 'cn'

export interface KeyValueItem {
  label: ReactNode
  value: ReactNode
  /** Render the value in a monospaced face, for paths, ids and addresses. */
  mono?: boolean
  className?: string
}

/** A two-column list of labels and values, wrapping on narrow screens. */
export function KeyValueList({
  items,
  columns = 2,
  className,
}: {
  items: KeyValueItem[]
  columns?: 1 | 2 | 3
  className?: string
}) {
  const gridClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2'
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3', gridClass, className)}>
      {items.map((item, index) => (
        <div key={index} className={cn('min-w-0 space-y-0.5', item.className)}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className={cn('truncate text-sm', item.mono && 'font-mono text-xs')}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
