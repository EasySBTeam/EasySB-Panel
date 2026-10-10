import { useState } from 'react'
import { RefreshCw, WrapText } from 'lucide-react'
import { useLogs } from '@/lib/queries'
import { formatDateTime } from '@/lib/format'
import { PageHeader, Section } from '@/components/shared/page'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { CopyButton } from '@/components/shared/copy'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from 'cn'

const SERVICES = [
  { value: 'core', label: '节点服务' },
  { value: 'subscription', label: '订阅服务' },
  { value: 'panel', label: '面板服务' },
] as const

const LINE_OPTIONS = [100, 200, 500, 1000, 2000]

/** Tail one service's log file. */
export function LogsPage() {
  const [service, setService] = useState<string>('core')
  const [lines, setLines] = useState(200)
  const [wrap, setWrap] = useState(false)
  const logs = useLogs(service, lines)

  const text = (logs.data?.lines ?? []).join('\n')

  return (
    <>
      <PageHeader
        title="运行日志"
        description="查看内核、订阅与面板服务的最近日志"
        actions={
          <Button variant="outline" size="sm" onClick={() => logs.refetch()}>
            <RefreshCw />
            刷新
          </Button>
        }
      />

      <Section
        title="日志内容"
        description={logs.data?.path}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={service} onValueChange={setService}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(lines)} onValueChange={(value) => setLines(Number(value))}>
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_OPTIONS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    最近 {count} 行
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={wrap ? 'default' : 'outline'}
              size="icon-sm"
              aria-label="自动换行"
              onClick={() => setWrap((current) => !current)}
            >
              <WrapText />
            </Button>
            <CopyButton value={text} size="icon-sm" />
          </div>
        }
      >
        {logs.isLoading ? (
          <LoadingState />
        ) : logs.isError ? (
          <ErrorState error={logs.error} onRetry={() => logs.refetch()} />
        ) : (
          <div className="space-y-2">
            {logs.data?.note ? (
              <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                {logs.data.note}
              </p>
            ) : null}
            <pre
              className={cn(
                'scrollbar-thin max-h-[70svh] min-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed',
                wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
              )}
            >
              {text || '（无日志内容）'}
            </pre>
            <p className="text-xs text-muted-foreground">
              最后更新 {formatDateTime(new Date().toISOString())}
            </p>
          </div>
        )}
      </Section>
    </>
  )
}
