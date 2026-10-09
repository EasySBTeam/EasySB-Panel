import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Progress, Radio, Spin } from '@arco-design/web-react'
import { IconRefresh } from '@arco-design/web-react/icon'
import { api } from '../api/client'
import type { Dashboard as DashboardData, DomainsResponse, HostInfo, MonitorSample } from '../api/types'
import { useLoad } from '../hooks'
import { formatBytes, formatDuration, formatRate, percentOf } from '../format'
import { useI18n } from '../i18n'
import { CoreSection } from './Core'
import { LogSection, SystemSection } from './System'

function Ring({ percent, label, detail }: { percent: number; label: string; detail: string }) {
  return (
    <div className="metric-ring">
      <Progress type="circle" width={104} percent={percent} strokeWidth={7} />
      <div className="metric-ring-label">{label}</div>
      <div className="metric-ring-detail">{detail}</div>
    </div>
  )
}

interface Rate {
  up: number
  down: number
  read: number
  write: number
}

type RateKey = keyof Rate

// LineChart draws two series from the sampled rate history. An empty history is
// reported rather than drawn, so the first seconds after mount do not look like
// a flat line that never happened.
function LineChart({
  history,
  keys,
  colors,
  fillKey,
  empty,
}: {
  history: Rate[]
  keys: [RateKey, RateKey]
  colors: [string, string]
  fillKey?: RateKey
  empty: string
}) {
  if (history.length < 2) {
    return <div className="monitor-empty">{empty}</div>
  }
  const width = 100
  const height = 40
  const peak = Math.max(1, ...history.flatMap((row) => keys.map((key) => row[key])))
  const x = (index: number) => (index / (history.length - 1)) * width
  const y = (value: number) => height - (value / peak) * (height - 4) - 2
  const points = (key: RateKey) =>
    history.map((row, index) => `${x(index).toFixed(2)},${y(row[key]).toFixed(2)}`).join(' ')
  return (
    <div className="monitor-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {fillKey && (
          <polygon points={`0,${height} ${points(fillKey)} ${width},${height}`} fill={`${colors[0]}28`} />
        )}
        <polyline points={points(keys[1])} fill="none" stroke={colors[1]} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        <polyline points={points(keys[0])} fill="none" stroke={colors[0]} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

// Monitor samples the cumulative network and disk counters every few seconds and
// turns them into live rates. The counters are the host's real /proc totals, so
// the charts are measured rather than invented; a reboot or a counter wrap is
// clamped to zero instead of drawn as a negative spike. Traffic and disk IO
// share one chart and switch with a toggle, the way 1Panel lays them out.
function Monitor() {
  const { t } = useI18n()
  const [mode, setMode] = useState<'traffic' | 'disk'>('traffic')
  const [totals, setTotals] = useState<MonitorSample | null>(null)
  const [history, setHistory] = useState<Rate[]>([])
  const prev = useRef<{ sample: MonitorSample; ts: number } | null>(null)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const sample = await api.get<MonitorSample>('/system/network')
        if (!alive) return
        setTotals(sample)
        const now = Date.now()
        const before = prev.current
        if (before) {
          const seconds = (now - before.ts) / 1000
          if (seconds > 0) {
            const rate = (next: number, last: number) => Math.max(0, (next - last) / seconds)
            setHistory((rows) =>
              [
                ...rows,
                {
                  down: rate(sample.rxBytes, before.sample.rxBytes),
                  up: rate(sample.txBytes, before.sample.txBytes),
                  read: rate(sample.readBytes, before.sample.readBytes),
                  write: rate(sample.writeBytes, before.sample.writeBytes),
                },
              ].slice(-40),
            )
          }
        }
        prev.current = { sample, ts: now }
      } catch {
        // Keep the last known reading on a transient failure.
      }
    }
    void tick()
    const id = setInterval(tick, 3000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const latest = history.at(-1)
  const traffic = mode === 'traffic'
  const stats = traffic
    ? [
        { label: t('dashboard.upload'), value: latest ? formatRate(latest.up) : '-' },
        { label: t('dashboard.download'), value: latest ? formatRate(latest.down) : '-' },
        { label: t('dashboard.totalSent'), value: totals ? formatBytes(totals.txBytes) : '-' },
        { label: t('dashboard.totalReceived'), value: totals ? formatBytes(totals.rxBytes) : '-' },
      ]
    : [
        { label: t('dashboard.read'), value: latest ? formatRate(latest.read) : '-' },
        { label: t('dashboard.write'), value: latest ? formatRate(latest.write) : '-' },
        { label: t('dashboard.totalRead'), value: totals ? formatBytes(totals.readBytes) : '-' },
        { label: t('dashboard.totalWrite'), value: totals ? formatBytes(totals.writeBytes) : '-' },
      ]

  return (
    <div className="monitor">
      <div className="monitor-head">
        <Radio.Group
          type="button"
          value={mode}
          onChange={(value) => setMode(value as 'traffic' | 'disk')}
          options={[
            { label: t('dashboard.traffic'), value: 'traffic' },
            { label: t('dashboard.diskIO'), value: 'disk' },
          ]}
        />
      </div>

      <div className="monitor-stats">
        {stats.map((stat) => (
          <div className="monitor-stat" key={stat.label}>
            <div className="monitor-stat-label">{stat.label}</div>
            <div className="monitor-stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      {traffic ? (
        <LineChart history={history} keys={['up', 'down']} colors={['#3ecf8e', '#f5a623']} fillKey="up" empty={t('dashboard.waiting')} />
      ) : (
        <LineChart history={history} keys={['read', 'write']} colors={['#4080ff', '#9b6bff']} fillKey="read" empty={t('dashboard.waiting')} />
      )}

      <div className="monitor-legend">
        {traffic ? (
          <>
            <span>
              <i className="monitor-dot dot-up" />
              {t('dashboard.upload')}
            </span>
            <span>
              <i className="monitor-dot dot-down" />
              {t('dashboard.download')}
            </span>
          </>
        ) : (
          <>
            <span>
              <i className="monitor-dot dot-read" />
              {t('dashboard.read')}
            </span>
            <span>
              <i className="monitor-dot dot-write" />
              {t('dashboard.write')}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function Overview({ data }: { data: { dashboard: DashboardData; domains: DomainsResponse | null } }) {
  const { t } = useI18n()
  const dash = data.dashboard
  const host: HostInfo = dash.host
  const memUsed = Math.max(0, host.MemTotal - host.MemAvail)
  const diskUsed = Math.max(0, host.DiskTotal - host.DiskFree)
  const swapUsed = Math.max(0, host.SwapTotal - host.SwapFree)
  const load1 = Number.parseFloat((host.LoadAvg || '0').split(' ')[0]) || 0
  const loadPercent = host.CPUCores > 0 ? Math.min(100, Math.round((load1 / host.CPUCores) * 100)) : 0

  const ports = host.Ports ?? []
  const enabledPorts = ports.filter((port) => port.Enabled)
  const domainCount = data.domains?.domains?.length ?? (host.Domain ? 1 : 0)

  const overview = [
    { key: 'nodes', label: t('dashboard.nodes'), value: dash.counts.nodes, hint: t('dashboard.nodesHint', { total: dash.counts.nodes, on: dash.counts.nodesEnabled }) },
    { key: 'accounts', label: t('dashboard.accounts'), value: dash.counts.users, hint: t('dashboard.accountsHint', { total: dash.counts.users, active: dash.counts.usersActive }) },
    { key: 'protocols', label: t('dashboard.protocols'), value: enabledPorts.length, hint: `${ports.length} ${t('dashboard.protocols')}` },
    { key: 'domains', label: t('dashboard.domains'), value: domainCount, hint: host.Domain || t('dashboard.notSet') },
  ]

  return (
    <div className="dash-grid">
      <div className="dash-main">
        <Card className="panel-card" bordered={false} title={t('dashboard.overview')}>
          <div className="ov-grid">
            {overview.map((cell) => (
              <div className="ov-cell" key={cell.key}>
                <div className="ov-label">{cell.label}</div>
                <div className="ov-value">{cell.value}</div>
                <div className="metric-ring-detail">{cell.hint}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="panel-card" bordered={false} title={t('dashboard.status')}>
          <div className="status-grid">
            <Ring label={t('dashboard.load')} percent={loadPercent} detail={`${host.LoadAvg || '-'} · ${host.CPUCores}`} />
            <Ring
              label={t('dashboard.memory')}
              percent={percentOf(memUsed, host.MemTotal)}
              detail={`${formatBytes(memUsed)} / ${formatBytes(host.MemTotal)}`}
            />
            <Ring
              label={t('dashboard.disk')}
              percent={percentOf(diskUsed, host.DiskTotal)}
              detail={`${formatBytes(diskUsed)} / ${formatBytes(host.DiskTotal)}`}
            />
            <Ring
              label={t('dashboard.swap')}
              percent={percentOf(swapUsed, host.SwapTotal)}
              detail={`${formatBytes(swapUsed)} / ${formatBytes(host.SwapTotal)}`}
            />
          </div>
        </Card>

        <Card className="panel-card" bordered={false} title={t('dashboard.monitor')}>
          <Monitor />
        </Card>
      </div>

      <div className="dash-side">
        <Card className="panel-card" bordered={false} title={t('dashboard.systemInfo')}>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">{t('dashboard.hostname')}</span>
              <span className="info-value">{host.Hostname || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('dashboard.os')}</span>
              <span className="info-value">{host.OS || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('dashboard.kernel')}</span>
              <span className="info-value">{host.Kernel || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('dashboard.ipv4')}</span>
              <span className="info-value mono">{host.LocalIPv4 || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('dashboard.ipv6')}</span>
              <span className="info-value mono">{host.LocalIPv6 || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('dashboard.uptime')}</span>
              <span className="info-value">{formatDuration(host.Uptime)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('dashboard.protocols')}</span>
              <span className="info-value">
                {enabledPorts.length ? enabledPorts.map((port) => port.Port ? `${port.Protocol}:${port.Port}` : port.Protocol).join(' · ') : t('dashboard.noProtocols')}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { t } = useI18n()
  const { data, loading, error, reload } = useLoad(async () => {
    const [dashboard, domains] = await Promise.all([
      api.get<DashboardData>('/dashboard'),
      api.get<DomainsResponse>('/domains').catch(() => null),
    ])
    return { dashboard, domains }
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t('dashboard.title')}</h2>
          <span className="muted">
            {t('dashboard.subtitle', { version: data?.dashboard.version ?? '', api: data?.dashboard.apiVersion ?? '' })}
          </span>
        </div>
        <Button icon={<IconRefresh />} onClick={reload} loading={loading}>
          {t('common.refresh')}
        </Button>
      </div>

      {loading && !data ? (
        <div className="center-block">
          <Spin size={40} />
        </div>
      ) : error && !data ? (
        <Alert type="error" title={t('dashboard.cannotLoad')} content={error} />
      ) : data ? (
        <>
          <Overview data={data} />
          <Card className="panel-card" bordered={false} title={t('core.title')} style={{ marginTop: 16 }}>
            <CoreSection />
          </Card>
          <Card className="panel-card" bordered={false} title={t('system.services')} style={{ marginTop: 16 }}>
            <SystemSection />
          </Card>
          <Card className="panel-card" bordered={false} title={t('system.logs')} style={{ marginTop: 16 }}>
            <LogSection />
          </Card>
        </>
      ) : null}
    </div>
  )
}
