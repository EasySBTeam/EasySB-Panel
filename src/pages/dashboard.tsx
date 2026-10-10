import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Cpu,
  PanelTop,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useDashboard, useNetwork, useRuntime } from '@/lib/queries'
import { formatBytes, formatDuration, formatRate } from '@/lib/format'
import { useCounterRates } from '@/lib/use-rates'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { HostDetails } from '@/components/shared/host-details'
import { EnabledBadge, RunningBadge, StatusBadge } from '@/components/shared/status-badge'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

/** The landing view: deployment counts, the host, live traffic and the process. */
export function DashboardPage() {
  const dashboard = useDashboard(5000)
  const network = useNetwork(2000)
  const runtime = useRuntime(5000)
  const rates = useCounterRates(network.data)

  if (dashboard.isLoading) {
    return (
      <>
        <PageHeader title="概览" />
        <LoadingState />
      </>
    )
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <>
        <PageHeader title="概览" />
        <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
      </>
    )
  }

  const { counts, host, core, panel, version, apiVersion } = dashboard.data
  const memUsed = host.MemTotal - host.MemAvail
  const memPercent = host.MemTotal ? Math.round((memUsed / host.MemTotal) * 100) : 0
  const diskUsed = host.DiskTotal - host.DiskFree
  const diskPercent = host.DiskTotal ? Math.round((diskUsed / host.DiskTotal) * 100) : 0

  return (
    <>
      <PageHeader
        title="概览"
        description={`EasySB v${version} · API ${apiVersion}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void dashboard.refetch()
              void network.refetch()
              void runtime.refetch()
            }}
          >
            <RefreshCw />
            刷新
          </Button>
        }
      />

      {!host.StatsCapable ? (
        <Alert>
          <Cpu />
          <AlertTitle>当前内核不含流量统计</AlertTitle>
          <AlertDescription>
            本次构建未启用 v2ray API，节点与账号照常可用，但流量不会计数。
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="节点"
          value={`${counts.nodesEnabled} / ${counts.nodes}`}
          hint="已启用 / 总数"
          icon={<Boxes />}
        />
        <StatCard
          label="账号"
          value={`${counts.usersActive} / ${counts.users}`}
          hint="正常 / 总数"
          icon={<Users />}
        />
        <StatCard
          label="sing-box 内核"
          value={core.active ? '运行中' : '已停止'}
          hint={core.enabled ? '开机自启已启用' : '开机自启已禁用'}
          icon={<Cpu />}
          tone={core.active ? 'success' : 'warning'}
        />
        <StatCard
          label="管理面板"
          value={panel.active ? '运行中' : '已停止'}
          hint={panel.installed ? '面板服务已安装' : '未安装为服务'}
          icon={<PanelTop />}
          tone={panel.active ? 'success' : 'warning'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="设备信息"
          description="主机、内存、磁盘与运行时间"
          contentClassName="pt-0"
        >
          <HostDetails host={host} />
        </Section>

        <div className="space-y-6">
          <Section title="实时流量" description="自本次采样起的即时速率">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowDownToLine className="size-3.5 text-info" />
                  下行
                </p>
                <p className="text-lg font-semibold tabular text-info">
                  {formatRate(rates.rx)}
                </p>
                <p className="text-xs text-muted-foreground">
                  累计 {formatBytes(host.NetRxBytes)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowUpFromLine className="size-3.5 text-warning" />
                  上行
                </p>
                <p className="text-lg font-semibold tabular text-warning">
                  {formatRate(rates.tx)}
                </p>
                <p className="text-xs text-muted-foreground">
                  累计 {formatBytes(host.NetTxBytes)}
                </p>
              </div>
            </div>
          </Section>

          <Section title="资源占用" description="内存与磁盘使用">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">内存</span>
                  <span className="tabular">
                    {formatBytes(memUsed)} / {formatBytes(host.MemTotal)}
                  </span>
                </div>
                <Progress value={memPercent} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">磁盘</span>
                  <span className="tabular">
                    {formatBytes(diskUsed)} / {formatBytes(host.DiskTotal)}
                  </span>
                </div>
                <Progress value={diskPercent} />
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="监听端口" description="各节点协议与端口">
          {host.Ports && host.Ports.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {host.Ports.map((port) => (
                <div
                  key={`${port.Protocol}-${port.Port}`}
                  className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                >
                  <span className="text-sm">{port.Protocol}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {port.Enabled && port.Port ? port.Port : '停用'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">尚未部署节点</p>
          )}
        </Section>

        <Section
          title="面板进程"
          description="面板自身的运行占比"
          contentClassName="pt-0"
          actions={<StatusBadge tone="primary">v{apiVersion}</StatusBadge>}
        >
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
            服务状态
            <RunningBadge active={core.active} />
            <EnabledBadge enabled={core.enabled} />
          </div>
        </Section>
      </div>
    </>
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
