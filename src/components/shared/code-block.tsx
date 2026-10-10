import { cn } from 'cn'
import { CopyButton } from './copy'

/** A scrollable monospaced block for a rendered configuration, with a copy button. */
export function CodeBlock({
  value,
  className,
  maxHeight = '28rem',
}: {
  value: string
  className?: string
  maxHeight?: string
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border bg-muted/30', className)}>
      <div className="absolute top-2 right-2 z-10">
        <CopyButton value={value} className="bg-background/80 backdrop-blur" />
      </div>
      <pre
        className="scrollbar-thin overflow-auto p-4 font-mono text-xs leading-relaxed"
        style={{ maxHeight }}
      >
        <code>{value}</code>
      </pre>
    </div>
  )
}
