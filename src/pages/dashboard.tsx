/*
 * The overview, laid out like 3x-ui's index page: an action bar, four vitals
 * tiles with sparklines, a throughput chart beside a connections chart, and a
 * system strip. Every number is real: the live tiles and the trend lines read
 * the rolling sample from /system/history, while the totals come from the
 * dashboard and runtime endpoints.
 */

import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Clock,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  MemoryStick,
  RefreshCw,
  RotateCw,
  Server,
  SquareArrowOutUpRight,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from 'cn'
import { useCoreAction, useDashboard, useHistory, useRuntime } from '@/lib/queries'
import { formatBytes, formatDuration, formatNumber, formatRate } from '@/lib/format'
import { TrendChart, mean, peak, resolveToken } from '@/components/shared/chart'
import { USAGE_CRIT, USAGE_WARN, VitalTile } from '@/components/shared/vital-tile'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useIsMobile } from '@/hooks/use-mobile'
import type { HistoryResponse } from '@/lib/types'

/** The last sample of a series, or zero while the window is still empty. */
function lastSample(values: number[] | undefined): number {
  return values && values.length > 0 ? values[values.length - 1] : 0
}

const EMPTY_SERIES: number[] = []

/** The overview, rebuilt from the same data the rest of the console uses. */
export function DashboardPage() {
  const dashboard = useDashboard(5000)
  const runtime = useRuntime(5000)
  const history = useHistory(2000)
  const coreAction = useCoreAction()
  const isMobile = useIsMobile()
  const [showIp, setShowIp] = useState(false)

  const runCoreAction = async (action: string) => {
    try {
      await coreAction.mutateAsync(action)
      toast.success(action === 'restart' ? '已重启内核' : '已停止内核')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  if (dashboard.isLoading) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight">概览</h1>
        <LoadingState />
      </>
    )
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight">概览</h1>
        <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
      </>
    )
  }

  const { counts, host, core, version, apiVersion } = dashboard.data
  const series = history.data?.series
  const times = history.data?.times ?? []
  const ready = times.length > 0

  const memUsed = Math.max(0, host.MemTotal - host.MemAvail)
  const memPercent = host.MemTotal ? (memUsed / host.MemTotal) * 100 : 0
  const swapUsed = Math.max(0, host.SwapTotal - host.SwapFree)
  const swapPercent = host.SwapTotal ? (swapUsed / host.SwapTotal) * 100 : 0
  const diskUsed = Math.max(0, host.DiskTotal - host.DiskFree)
  const diskPercent = host.DiskTotal ? (diskUsed / host.DiskTotal) * 100 : 0
  const cpuPercent = lastSample(series?.cpu)

  const health = buildHealth([
    { name: 'CPU', value: cpuPercent },
    { name: '内存', value: memPercent },
    ...(host.SwapTotal > 0 ? [{ name: 'Swap', value: swapPercent }] : []),
    { name: '存储', value: diskPercent },
  ])

  return (
    <div className="flex flex-col gap-3">
      <ActionBar
        active={core.active}
        version={version}
        pending={coreAction.isPending}
        onRestart={() => runCoreAction('restart')}
        onStop={() => runCoreAction('stop')}
        onRefresh={() => {
          void dashboard.refetch()
          void runtime.refetch()
          void history.refetch()
        }}
      />

      {health ? (
        <p className="flex items-center gap-2 text-xs" style={{ color: health.color }}>
          <span className="h-px w-3.5 bg-current" />
          {health.text}
        </p>
      ) : null}

      <Separator className="my-0" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <VitalTile
          icon={<Cpu />}
          label="CPU"
          percent={cpuPercent}
          detail={`${host.CPUCores} 核 · 负载 ${host.LoadAvg || '—'}`}
          footLeft={`均值 ${mean(series?.cpu ?? EMPTY_SERIES).toFixed(0)}%`}
          footRight={`峰值 ${peak(series?.cpu ?? EMPTY_SERIES).toFixed(0)}%`}
          times={times}
          data={series?.cpu ?? EMPTY_SERIES}
        />
        <VitalTile
          icon={<MemoryStick />}
          label="内存"
          percent={memPercent}
          detail={`${formatBytes(memUsed)} / ${formatBytes(host.MemTotal)}`}
          footLeft={`均值 ${mean(series?.mem ?? EMPTY_SERIES).toFixed(0)}%`}
          footRight={`峰值 ${peak(series?.mem ?? EMPTY_SERIES).toFixed(0)}%`}
          times={times}
          data={series?.mem ?? EMPTY_SERIES}
        />
        <VitalTile
          icon={<RotateCw />}
          label="Swap"
          percent={swapPercent}
          detail={
            host.SwapTotal > 0
              ? `${formatBytes(swapUsed)} / ${formatBytes(host.SwapTotal)}`
              : '未启用交换分区'
          }
          footLeft={`均值 ${mean(series?.swap ?? EMPTY_SERIES).toFixed(1)}%`}
          footRight={`峰值 ${peak(series?.swap ?? EMPTY_SERIES).toFixed(0)}%`}
          times={times}
          data={series?.swap ?? EMPTY_SERIES}
        />
        <VitalTile
          icon={<HardDrive />}
          label="存储"
          percent={diskPercent}
          detail={`${formatBytes(diskUsed)} / ${formatBytes(host.DiskTotal)}`}
          footLeft={`可用 ${formatBytes(host.DiskFree)}`}
          footRight={`均值 ${mean(series?.disk ?? EMPTY_SERIES).toFixed(1)}%`}
          times={times}
          data={series?.disk ?? EMPTY_SERIES}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
        <ThroughputCard history={history.data} isMobile={isMobile} host={host} ready={ready} />
        <ConnectionsCard history={history.data} isMobile={isMobile} ready={ready} />
      </div>

      <SystemStrip
        host={host}
        runtime={runtime.data}
        counts={counts}
        apiVersion={apiVersion}
        showIp={showIp}
        onToggleIp={() => setShowIp((value) => !value)}
      />
    </div>
  )
}

interface Health {
  text: string
  color: string
}

/** A one-line warning when CPU, memory, swap or storage runs hot. */
function buildHealth(items: { name: string; value: number }[]): Health | null {
  const list = (subset: typeof items) =>
    subset.map((item) => `${item.name} ${item.value.toFixed(0)}%`).join('、')

  const critical = items.filter((item) => item.value >= USAGE_CRIT)
  if (critical.length > 0) {
    return {
      text: `资源占用偏高：${list(critical)}`,
      color: resolveToken('--destructive', '#e5484d'),
    }
  }
  const warm = items.filter((item) => item.value >= USAGE_WARN)
  if (warm.length > 0) {
    return {
      text: `资源占用需留意：${list(warm)}`,
      color: resolveToken('--warning', '#d9a441'),
    }
  }
  return null
}

interface ActionBarProps {
  active: boolean
  version: string
  pending: boolean
  onRestart: () => void
  onStop: () => void
  onRefresh: () => void
}

/** The status pill and the actions that used to live in the top bar. */
function ActionBar({ active, version, pending, onRestart, onStop, onRefresh }: ActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px]">
        <span className="relative flex size-1.5">
          {active ? (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
          ) : null}
          <span
            className={cn(
              'relative inline-flex size-1.5 rounded-full',
              active ? 'bg-success' : 'bg-muted-foreground',
            )}
          />
        </span>
        sing-box 内核 · {active ? '运行中' : '已停止'}
        <button
          type="button"
          className="text-muted-foreground transition-colors hover:text-primary"
          onClick={onRefresh}
          title="刷新"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </span>

      <span className="font-mono text-xs text-muted-foreground">v{version}</span>

      <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onRestart}
          aria-label="重启内核"
        >
          <RotateCw />
          <span className="hidden sm:inline">重启内核</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || !active}
          onClick={onStop}
          aria-label="停止内核"
        >
          <WifiOff />
          <span className="hidden sm:inline">停止内核</span>
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/logs">
            <SquareArrowOutUpRight />
            <span className="hidden sm:inline">运行日志</span>
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/core">
            <Server />
            <span className="hidden sm:inline">内核配置</span>
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/system">
            <Wifi />
            <span className="hidden sm:inline">系统信息</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  )
}

interface ThroughputCardProps {
  history: HistoryResponse | undefined
  isMobile: boolean
  ready: boolean
  host: { NetRxBytes: number; NetTxBytes: number }
}

/** Aggregate network rate over the window, with the totals at the foot. */
function ThroughputCard({ history, isMobile, ready, host }: ThroughputCardProps) {
  const down = history?.series.netDown ?? EMPTY_SERIES
  const up = history?.series.netUp ?? EMPTY_SERIES
  const times = history?.times ?? []
  const upColor = resolveToken('--warning', '#d9a441')
  const downColor = resolveToken('--info', '#5b8def')

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <div>
            <Kicker>总体速率</Kicker>
            <p className="mt-1 text-xs text-muted-foreground">
              窗口峰值下行 {formatRate(peak(down))}
            </p>
          </div>
          <div className="flex gap-6 text-right sm:ml-auto">
            <Legend color={upColor} icon={<ArrowUpFromLine className="size-3.5" />} label="上行">
              {formatRate(lastSample(up))}
            </Legend>
            <Legend color={downColor} icon={<ArrowDownToLine className="size-3.5" />} label="下行">
              {formatRate(lastSample(down))}
            </Legend>
          </div>
        </div>

        <div className="px-2">
          {ready ? (
            <TrendChart
              times={times}
              series={[up, down]}
              colors={[upColor, downColor]}
              height={isMobile ? 150 : 186}
              axes
              formatY={(value) => formatRate(value).replace('/s', '')}
              referenceLines={[
                { y: mean(up), color: upColor },
                { y: mean(down), color: downColor },
              ]}
            />
          ) : (
            <div style={{ height: isMobile ? 150 : 186 }} />
          )}
        </div>

        <div className="mx-5 mb-5 flex flex-wrap gap-5 border-t pt-4">
          <Foot label="累计上行" value={formatBytes(host.NetTxBytes)} />
          <Separator orientation="vertical" className="h-auto" />
          <Foot label="累计下行" value={formatBytes(host.NetRxBytes)} />
          <Separator orientation="vertical" className="h-auto" />
          <Foot
            label="窗口均值"
            value={`↑ ${formatRate(mean(up))} · ↓ ${formatRate(mean(down))}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface ConnectionsCardProps {
  history: HistoryResponse | undefined
  isMobile: boolean
  ready: boolean
}

/** Open TCP and UDP sockets, charted over the same window. */
function ConnectionsCard({ history, isMobile, ready }: ConnectionsCardProps) {
  const tcp = history?.series.tcp ?? EMPTY_SERIES
  const udp = history?.series.udp ?? EMPTY_SERIES
  const times = history?.times ?? []
  const tcpColor = resolveToken('--chart-1', '#5b8def')
  const udpColor = resolveToken('--chart-4', '#d9a441')

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="p-5">
          <Kicker>连接数</Kicker>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold leading-none tabular">
              {formatNumber(lastSample(tcp) + lastSample(udp))}
            </span>
            <span className="text-sm text-muted-foreground">个打开套接字</span>
          </p>
        </div>

        <div className="flex gap-6 px-5">
          <Legend color={tcpColor} icon={<span className="h-0.5 w-3.5" style={{ background: tcpColor }} />} label="TCP">
            {formatNumber(lastSample(tcp))}
          </Legend>
          <Legend color={udpColor} icon={<span className="h-0.5 w-3.5" style={{ background: udpColor }} />} label="UDP">
            {formatNumber(lastSample(udp))}
          </Legend>
        </div>

        <div className="px-2 pt-3">
          {ready ? (
            <TrendChart
              times={times}
              series={[tcp, udp]}
              colors={[tcpColor, udpColor]}
              height={isMobile ? 130 : 170}
              referenceLines={[
                { y: mean(tcp), color: tcpColor },
                { y: mean(udp), color: udpColor },
              ]}
            />
          ) : (
            <div style={{ height: isMobile ? 130 : 170 }} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Legend({
  color,
  icon,
  label,
  children,
}: {
  color: string
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        {label}
      </span>
      <span className="text-[13px] font-semibold tabular">{children}</span>
    </div>
  )
}

function Foot({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <Kicker>{label}</Kicker>
      <p className="mt-1 text-base font-semibold tabular">{value}</p>
    </div>
  )
}

interface SystemStripProps {
  host: {
    Uptime: number
    LocalIPv4: string
    LocalIPv6: string
  }
  runtime: { uptimeSecs: number; goroutines: number; rssBytes: number } | undefined
  counts: { nodes: number; nodesEnabled: number; users: number; usersActive: number }
  apiVersion: string
  showIp: boolean
  onToggleIp: () => void
}

/** A single strip: uptime, the panel process, and the host addresses. */
function SystemStrip({
  host,
  runtime,
  counts,
  apiVersion,
  showIp,
  onToggleIp,
}: SystemStripProps) {
  const uptimeSecs = Math.floor(host.Uptime / 1_000_000_000)

  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3.5" />
            运行时间
          </p>
          <div className="mt-2 flex gap-4">
            <StripValue label="面板" value={formatDuration(runtime?.uptimeSecs)} />
            <span className="mt-2 w-px bg-border" />
            <StripValue label="系统" value={formatDuration(uptimeSecs)} />
          </div>
        </div>

        <div>
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Server className="size-3.5" />
            面板进程
          </p>
          <div className="mt-2 flex gap-4">
            <StripValue label="常驻内存" value={formatBytes(runtime?.rssBytes)} />
            <span className="mt-2 w-px bg-border" />
            <StripValue label="协程" value={formatNumber(runtime?.goroutines)} />
          </div>
        </div>

        <div>
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Globe className="size-3.5" />
            主机地址
            <button
              type="button"
              className="ml-auto transition-colors hover:text-foreground"
              onClick={onToggleIp}
              aria-label={showIp ? '隐藏地址' : '显示地址'}
            >
              {showIp ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
          </p>
          <div className={cn('mt-2 space-y-1 font-mono text-xs', !showIp && 'blur-[6px]')}>
            <p>{host.LocalIPv4 || '—'}</p>
            <p className="text-muted-foreground">{host.LocalIPv6 || '—'}</p>
          </div>
        </div>

        <Separator className="sm:col-span-2 xl:col-span-3" />

        <div className="flex flex-wrap items-center gap-5 sm:col-span-2 xl:col-span-3">
          <StripStat icon={<Boxes className="size-3.5" />} label="节点">
            {counts.nodesEnabled} / {counts.nodes}
          </StripStat>
          <StripStat icon={<Users className="size-3.5" />} label="账号">
            {counts.usersActive} / {counts.users}
          </StripStat>
          <span className="ml-auto font-mono text-xs text-muted-foreground">API {apiVersion}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function StripValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular">{value}</p>
    </div>
  )
}

function StripStat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular">{children}</span>
    </span>
  )
}
