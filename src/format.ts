// Shared rendering helpers. Every size the panel reports is a byte count and
// every duration is a Go duration in nanoseconds.

export function formatBytes(value: number): string {
  if (!value || value <= 0) {
    return '0 B'
  }
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  let n = value
  let unit = 0
  while (n >= 1024 && unit < units.length - 1) {
    n /= 1024
    unit++
  }
  const digits = n >= 100 || unit === 0 ? 0 : n >= 10 ? 1 : 2
  return `${n.toFixed(digits)} ${units[unit]}`
}

// formatRate renders a bytes-per-second figure the way a bandwidth meter does.
export function formatRate(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatDuration(nanos: number): string {
  if (!nanos || nanos <= 0) {
    return '-'
  }
  let seconds = Math.floor(nanos / 1e9)
  const days = Math.floor(seconds / 86400)
  seconds -= days * 86400
  const hours = Math.floor(seconds / 3600)
  seconds -= hours * 3600
  const minutes = Math.floor(seconds / 60)
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes || (!days && !hours)) parts.push(`${minutes}m`)
  return parts.join(' ')
}

export function formatDate(value: string): string {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export function percentOf(used: number, total: number): number {
  if (!total || total <= 0) {
    return 0
  }
  return Math.min(100, Math.round((used / total) * 100))
}
