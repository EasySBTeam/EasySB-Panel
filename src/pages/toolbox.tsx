import { useMemo, useState } from 'react'
import { Loader2, Play, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useRunTool, useToolbox } from '@/lib/queries'
import { toolboxGroupLabel, toolboxToolLabel } from '@/lib/labels'
import { formatRelative } from '@/lib/format'
import { PageHeader, Section } from '@/components/shared/page'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ToolboxRecord, ToolboxResult } from '@/lib/types'

/** The toolbox: unlock, network, IP and hardware tools with a cached board. */
export function ToolboxPage() {
  const toolbox = useToolbox()
  const run = useRunTool()
  const [runningId, setRunningId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<{ id: string; record: ToolboxRecord } | null>(null)

  const board = toolbox.data?.board ?? {}
  const boardEntries = useMemo(
    () =>
      Object.values(board)
        .filter((record) => record.result.summary || record.error)
        .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()),
    [board],
  )

  const toolsByGroup = useMemo(() => {
    const groups = toolbox.data?.groups ?? []
    const tools = toolbox.data?.tools ?? []
    return groups.map((group) => ({
      group,
      tools: tools.filter((tool) => tool.group === group),
    }))
  }, [toolbox.data])

  const runTool = async (id: string) => {
    setRunningId(id)
    try {
      await run.mutateAsync(id)
      toast.success(`${toolboxToolLabel[id]?.title ?? id} 运行完成`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '运行失败')
    } finally {
      setRunningId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="工具箱"
        description="解锁检测、回程测速、IP 质量与硬件性能"
        actions={
          <Button variant="outline" size="sm" onClick={() => toolbox.refetch()}>
            <RefreshCw />
            刷新
          </Button>
        }
      />

      {toolbox.isLoading ? (
        <LoadingState />
      ) : toolbox.isError ? (
        <ErrorState error={toolbox.error} onRetry={() => toolbox.refetch()} />
      ) : (
        <>
          <Section
            title="看板"
            description="最近一次检测的关键结果"
            actions={<StatusBadge tone="muted">共 {boardEntries.length} 项</StatusBadge>}
          >
            {boardEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚无检测记录，运行任意工具后会显示在这里</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {boardEntries.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setViewing({ id: record.id, record })}
                    className="flex flex-col items-start gap-1 rounded-lg border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {toolboxToolLabel[record.id]?.title ?? record.id}
                    </span>
                    <span className="line-clamp-2 text-sm font-medium">
                      {record.error || record.result.board || record.result.summary || '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatRelative(record.when)}</span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {toolsByGroup.map(({ group, tools }) => {
            const meta = toolboxGroupLabel[group]
            return (
              <Section
                key={group}
                title={meta?.title ?? group}
                description={meta?.description}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {tools.map((tool) => {
                    const meta = toolboxToolLabel[tool.id]
                    const record = board[tool.id]
                    const busy = runningId === tool.id
                    return (
                      <div
                        key={tool.id}
                        className="flex flex-col gap-2 rounded-lg border p-3"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{meta?.title ?? tool.id}</p>
                          <p className="text-xs text-muted-foreground">{meta?.description}</p>
                        </div>
                        {record ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {record.error
                              ? `上次失败：${record.error}`
                              : `上次：${record.result.summary || '已完成'} · ${formatRelative(record.when)}`}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">尚未检测</p>
                        )}
                        <div className="mt-auto flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={runningId !== null}
                            onClick={() => runTool(tool.id)}
                          >
                            {busy ? <Loader2 className="animate-spin" /> : <Play />}
                            {busy ? '运行中' : '运行'}
                          </Button>
                          {record ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewing({ id: tool.id, record })}
                            >
                              查看结果
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )
          })}
        </>
      )}

      <ResultDialog
        viewing={viewing}
        onClose={() => setViewing(null)}
      />
    </>
  )
}

function ResultDialog({
  viewing,
  onClose,
}: {
  viewing: { id: string; record: ToolboxRecord } | null
  onClose: () => void
}) {
  return (
    <Dialog open={viewing !== null} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {viewing ? toolboxToolLabel[viewing.id]?.title ?? viewing.id : ''}
          </DialogTitle>
          <DialogDescription>
            {viewing ? `运行于 ${formatRelative(viewing.record.when)}` : ''}
          </DialogDescription>
        </DialogHeader>
        {viewing?.record.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {viewing.record.error}
          </p>
        ) : null}
        {viewing ? <ResultTable result={viewing.record.result} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ResultTable({ result }: { result: ToolboxResult }) {
  const headers = result.headers ?? []
  const rows = result.rows ?? []
  const notes = result.notes ?? []
  if (rows.length === 0 && notes.length === 0) {
    return <p className="text-sm text-muted-foreground">该工具未返回数据</p>
  }
  return (
    <div className="space-y-3">
      {rows.length > 0 ? (
        <div className="scrollbar-thin max-h-[55svh] overflow-auto rounded-lg border">
          <Table>
            {headers.length > 0 ? (
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            ) : null}
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      className={cellIndex === 0 && headers.length === 0 ? 'font-medium' : undefined}
                    >
                      {cell || '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      {notes.length > 0 ? (
        <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
