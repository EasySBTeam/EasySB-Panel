import { useState } from 'react'
import { Gauge, RefreshCw, RotateCcw, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useBBR, useBBRClear, useBBREnable } from '@/lib/queries'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { KeyValueList } from '@/components/shared/key-value'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** BBR congestion control: current state, enable with a queue discipline, and clear. */
export function BBRPage() {
  const bbr = useBBR()
  const enable = useBBREnable()
  const clear = useBBRClear()
  const [qdisc, setQdisc] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const data = bbr.data
  const selectedQdisc = qdisc || data?.qdiscs?.[0] || 'fq'

  return (
    <>
      <PageHeader
        title="BBR 加速"
        description="启用内核 TCP 拥塞控制算法以提升吞吐"
        actions={
          <Button variant="outline" size="sm" onClick={() => bbr.refetch()}>
            <RefreshCw />
            刷新
          </Button>
        }
      />

      {bbr.isLoading ? (
        <LoadingState />
      ) : bbr.isError || !data ? (
        <ErrorState error={bbr.error} onRetry={() => bbr.refetch()} />
      ) : (
        <>
          {!data.supported ? (
            <Alert variant="destructive">
              <Gauge />
              <AlertTitle>当前内核不支持 BBR</AlertTitle>
              <AlertDescription>
                请先升级内核或安装 BBRv3 内核后再启用。
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="BBR 状态"
              value={data.enabled ? '已启用' : '未启用'}
              tone={data.enabled ? 'success' : 'warning'}
              icon={<Zap />}
            />
            <StatCard label="拥塞控制" value={data.congestion || '—'} />
            <StatCard label="队列算法" value={data.qdisc || '—'} />
            <StatCard
              label="自定义内核"
              value={data.customKernel || '未安装'}
              tone={data.customKernel ? 'success' : 'default'}
            />
          </div>

          {data.needsReboot ? (
            <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
              检测到内核升级，重启后新的 BBR 内核才会生效。
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="启用 BBR" description="选择队列算法并写入系统配置">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>队列算法 (qdisc)</Label>
                  <Select value={selectedQdisc} onValueChange={setQdisc}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {data.qdiscs.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    通用推荐 fq；低配机型可选 fq_codel。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={enable.isPending || !data.supported}
                    onClick={async () => {
                      try {
                        await enable.mutateAsync(selectedQdisc)
                        toast.success('BBR 已启用')
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : '启用失败')
                      }
                    }}
                  >
                    <Zap />
                    启用 BBR
                  </Button>
                  <Button
                    variant="outline"
                    disabled={clear.isPending}
                    onClick={() => setConfirmClear(true)}
                  >
                    <RotateCcw />
                    清除配置
                  </Button>
                </div>
              </div>
            </Section>

            <Section title="内核信息" description="当前内核与可用的拥塞控制算法">
              <KeyValueList
                items={[
                  { label: '运行中的内核', value: data.running || '—', mono: true },
                  { label: '架构', value: data.arch || '—', mono: true },
                  {
                    label: '可用算法',
                    value: (data.available ?? []).join(', ') || '—',
                  },
                  {
                    label: '已安装 BBR 内核',
                    value:
                      data.kernels && data.kernels.length > 0
                        ? data.kernels.join(', ')
                        : '未安装',
                  },
                ]}
              />
              <div className="mt-4 flex items-center gap-2 border-t pt-4">
                <span className="text-xs text-muted-foreground">BBR 支持</span>
                <StatusBadge tone={data.supported ? 'success' : 'destructive'}>
                  {data.supported ? '支持' : '不支持'}
                </StatusBadge>
              </div>
            </Section>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="清除 BBR 配置"
        description="移除 EasySB 写入的 drop-in 文件并还原被替换的值，不会影响其他手工配置。"
        confirmLabel="清除"
        destructive={false}
        pending={clear.isPending}
        onConfirm={async () => {
          try {
            const res = await clear.mutateAsync()
            toast.success(
              res.cleared && res.cleared.length > 0
                ? `已清除 ${res.cleared.length} 项配置`
                : '没有需要清除的配置',
            )
            setConfirmClear(false)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '清除失败')
          }
        }}
      />
    </>
  )
}
