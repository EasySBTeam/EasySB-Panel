/*
 * Formatting for values the API returns as raw numbers.
 *
 * Bytes, durations and timestamps all arrive as integers or RFC3339 strings, and
 * every page should render them the same way, so the conversions live here rather
 * than being re-derived per screen.
 */

const KIB = 1024
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

/** A byte count with a binary unit, e.g. "1.5 GB". */
export function formatBytes(bytes: number | null | undefined, digits = 1): string {
  if (bytes == null || !Number.isFinite(bytes)) {
    return '—'
  }
  if (bytes < KIB) {
    return `${bytes} B`
  }
  let value = bytes
  let unit = 0
  while (value >= KIB && unit < BYTE_UNITS.length - 1) {
    value /= KIB
    unit++
  }
  return `${value.toFixed(digits)} ${BYTE_UNITS[unit]}`
}

/** A byte count without a space before the unit, for dense tables. */
export function formatBytesTight(bytes: number | null | undefined, digits = 1): string {
  return formatBytes(bytes, digits).replace(' ', '')
}

/** A rate in bytes per second, e.g. "3.2 MB/s". */
export function formatRate(bytesPerSecond: number | null | undefined): string {
  if (bytesPerSecond == null || !Number.isFinite(bytesPerSecond) || bytesPerSecond < 0) {
    return '—'
  }
  return `${formatBytes(bytesPerSecond)}/s`
}

/** A day count of seconds as a compact duration, e.g. "3天 4小时". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '—'
  }
  const secs = Math.floor(totalSeconds)
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const seconds = secs % 60
  if (days > 0) {
    return `${days}天 ${hours}小时`
  }
  if (hours > 0) {
    return `${hours}小时 ${minutes}分`
  }
  if (minutes > 0) {
    return `${minutes}分 ${seconds}秒`
  }
  return `${seconds}秒`
}

/** A percentage the API already computed, clamped for display. */
export function formatPercent(percent: number | null | undefined): string {
  if (percent == null || !Number.isFinite(percent)) {
    return '—'
  }
  return `${Math.min(100, Math.max(0, percent))}%`
}

/** A compact integer, e.g. "1.2万" is avoided; thousands separators are used. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—'
  }
  return value.toLocaleString('zh-CN')
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** A local date-time, e.g. "2026-10-10 14:30". The zero time renders as "—". */
export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date || date.getTime() === 0) {
    return '—'
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** A local date, e.g. "2026-10-10". The zero time renders as "—". */
export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date || date.getTime() === 0) {
    return '—'
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A relative "多久以前" string, e.g. "3 分钟前". */
export function formatRelative(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date || date.getTime() === 0) {
    return '—'
  }
  const diff = Date.now() - date.getTime()
  const secs = Math.round(diff / 1000)
  if (secs < 60) {
    return '刚刚'
  }
  const minutes = Math.round(secs / 60)
  if (minutes < 60) {
    return `${minutes} 分钟前`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} 小时前`
  }
  const days = Math.round(hours / 24)
  return `${days} 天前`
}

/** The per-second rate between two counter readings taken `elapsedMs` apart. */
export function rateBetween(previous: number, current: number, elapsedMs: number): number {
  if (elapsedMs <= 0 || current < previous) {
    return 0
  }
  return ((current - previous) * 1000) / elapsedMs
}

/** A short id for display, keeping both ends readable. */
export function shortToken(token: string, head = 6, tail = 4): string {
  if (token.length <= head + tail + 1) {
    return token
  }
  return `${token.slice(0, head)}…${token.slice(-tail)}`
}
