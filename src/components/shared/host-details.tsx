import { formatBytes, formatDuration } from '@/lib/format'
import type { HostStatus } from '@/lib/types'
import { KeyValueList } from './key-value'

/** The host facts, shared by the dashboard and the system page. */
export function HostDetails({ host }: { host: HostStatus }) {
  const memoryUsed = host.MemTotal - host.MemAvail
  const diskUsed = host.DiskTotal - host.DiskFree
  const swapUsed = host.SwapTotal - host.SwapFree

  return (
    <KeyValueList
      items={[
        { label: '主机名', value: host.Hostname || '—', mono: true },
        { label: '系统', value: host.OS || '—' },
        { label: '内核', value: host.Kernel || '—', mono: true },
        { label: '时区', value: host.Timezone || '—', mono: true },
        { label: '本机 IPv4', value: host.LocalIPv4 || '—', mono: true },
        { label: '本机 IPv6', value: host.LocalIPv6 || '—', mono: true },
        { label: 'CPU', value: `${host.CPUCores || '—'} 核 · 负载 ${host.LoadAvg || '—'}` },
        {
          label: '内存',
          value: host.MemTotal
            ? `${formatBytes(memoryUsed)} / ${formatBytes(host.MemTotal)}`
            : '—',
        },
        {
          label: 'Swap',
          value: host.SwapTotal ? `${formatBytes(swapUsed)} / ${formatBytes(host.SwapTotal)}` : '未启用',
        },
        {
          label: '磁盘',
          value: host.DiskTotal
            ? `${formatBytes(diskUsed)} / ${formatBytes(host.DiskTotal)}`
            : '—',
        },
        { label: '运行时间', value: formatDuration(host.Uptime / 1e9) },
        { label: 'sing-box 内核', value: host.CoreVersion || '—', mono: true },
      ]}
    />
  )
}
