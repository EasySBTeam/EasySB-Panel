import { useCallback, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'

/** Copy text to the clipboard and report the outcome. */
export function useCopy() {
  return useCallback(async (value: string, label = '已复制') => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(label)
      return true
    } catch {
      toast.error('复制失败，请手动复制')
      return false
    }
  }, [])
}

/** An icon button that copies its value and briefly confirms inline. */
export function CopyButton({
  value,
  label,
  className,
  size = 'icon-sm',
}: {
  value: string
  label?: string
  className?: string
  size?: 'icon-sm' | 'icon' | 'icon-xs'
}) {
  const copy = useCopy()
  const [done, setDone] = useState(false)

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      aria-label="复制"
      onClick={async () => {
        const ok = await copy(value, label)
        if (ok) {
          setDone(true)
          window.setTimeout(() => setDone(false), 1200)
        }
      }}
    >
      {done ? <Check className="text-success" /> : <Copy />}
    </Button>
  )
}

/** A labelled, monospaced value with a copy button on the right. */
export function CopyField({
  label,
  value,
  className,
}: {
  label?: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border bg-muted/30 py-1 pr-1 pl-3', className)}>
      <div className="min-w-0 flex-1">
        {label ? <p className="text-[0.7rem] text-muted-foreground">{label}</p> : null}
        <p className="truncate font-mono text-xs">{value || '—'}</p>
      </div>
      <CopyButton value={value} />
    </div>
  )
}
