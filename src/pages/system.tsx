import { Activity, ArrowDownToLine, ArrowUpFromLine, HardDrive, RefreshCw, Server } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCoreAction,
  useNetwork,
  usePanelAction,
  useRuntime,
  useSubscriptionServiceAction,
  useSystem,
} from '@/lib/queries'
import { formatBytes, formatDuration, formatRate } from '@/lib/format'
import { useCounterRates } from '@/lib/use-rates'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { HostDetails } from '@/components/shared/host-details'
import { EnabledBadge, RunningBadge } from '@/components/shared/status-badge'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import type { ServiceUnit } from '@/lib/types'

/** Host snapshot, the three managed services, live network rates and runtime. */
export function SystemPage() {
  const system = useSystem()
  const network = useNetwork(2000)
  const runtime = useRuntime(5000)
  const coreAction = useCoreAction()
  const subAction = useSubscriptionServiceAction()
  const panelAction = usePanelAction()
  const rates = useCounterRates(network.data)

  const data = system.data

  const act = async (
    run: (action: string) => Promise<unknown>,
    action: string,
    label: string,
  ) => {
    try {
      await run(action)
      toast.success(label)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  return (
    <>
      <PageHeader
        title="系统信息"
        description="主机状态、服务控制与实时资源"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void system.refetch()
                void network.refetch()
                void runtime.refetch()
              }}
            >
              <RefreshCw />
              刷新
            </Button>
          </>
        }
      />

      {system.isLoading ? (
        <LoadingState />
      ) : system.isError || !data ? (
        <ErrorState error={system.error} onRetry={() => system.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="下行速率"
              value={formatRate(rates.rx)}
              hint={`累计 ${formatBytes(data.host.NetRxBytes)}`}
              icon={<ArrowDownToLine />}
            />
            <StatCard
              label="上行速率"
              value={formatRate(rates.tx)}
              hint={`累计 ${formatBytes(data.host.NetTxBytes)}`}
              icon={<ArrowUpFromLine />}
            />
            <StatCard
              label="内存"
              value={formatBytes(data.host.MemTotal - data.host.MemAvail)}
              hint={`共 ${formatBytes(data.host.MemTotal)}`}
            />
            <StatCard
              label="磁盘"
              value={formatBytes(data.host.DiskTotal - data.host.DiskFree)}
              hint={`共 ${formatBytes(data.host.DiskTotal)}`}
              icon={<HardDrive />}
            />
          </div>

          <Section title="服务控制" description="节点、订阅与面板三个服务">
            <div className="divide-y rounded-lg border">
              <ServiceRow
                title="节点服务"
                unit={data.services.core}
                busy={coreAction.isPending}
                onAction={(action) =>
                  act((a) => coreAction.mutateAsync(a), action, '节点服务操作完成')
                }
              />
              <ServiceRow
                title="订阅服务"
                unit={data.services.subscription}
                busy={subAction.isPending}
                lifecycle
                onAction={(action) =>
                  act((a) => subAction.mutateAsync(a), action, '订阅服务操作完成')
                }
              />
              <ServiceRow
                title="面板服务"
                unit={data.services.panel}
                busy={panelAction.isPending}
                lifecycle
                onAction={(action) =>
                  act((a) => panelAction.mutateAsync(a), action, '面板服务操作完成')
                }
              />
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="设备信息" description="主机、内存、磁盘与运行时间" contentClassName="pt-0">
              <HostDetails host={data.host} />
            </Section>

            <Section title="面板进程" description="面板服务自身的运行占用">
              {runtime.data ? (
                <div className="grid grid-cols-2 gap-4">
                  <Metric label="运行时间" value={formatDuration(runtime.data.uptimeSecs)} />
                  <Metric label="连接数" value={runtime.data.connections} />
                  <Metric label="协程" value={runtime.data.goroutines} />
                  <Metric label="GC 次数" value={runtime.data.gcCount} />
                  <Metric label="常驻内存" value={formatBytes(runtime.data.rssBytes)} />
                  <Metric label="堆内存" value={formatBytes(runtime.data.mem.heapBytes)} />
                </div>
              ) : (
                <LoadingState />
              )}
              <div className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                <Activity className="size-3.5" />
                磁盘累计读写 {formatBytes(data.host.DiskReadBytes)} / {formatBytes(data.host.DiskWriteBytes)}
              </div>
            </Section>
          </div>
        </>
      )}
    </>
  )
}

function ServiceRow({
  title,
  unit,
  busy,
  lifecycle = false,
  onAction,
}: {
  title: string
  unit: ServiceUnit
  busy: boolean
  lifecycle?: boolean
  onAction: (action: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-3">
      <Server className="size-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{unit.name}</p>
      </div>
      <div className="ms-auto flex items-center gap-1.5">
        <RunningBadge active={unit.active} />
        <EnabledBadge enabled={unit.enabled} />
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        {unit.active ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction('stop')}>
            停止
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction('start')}>
            启动
          </Button>
        )}
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction('restart')}>
          重启
        </Button>
        {lifecycle ? (
          unit.installed === false ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction('install')}>
              安装服务
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onAction('uninstall')}
            >
              卸载服务
            </Button>
          )
        ) : null}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium tabular">{value}</p>
    </div>
  )
}
