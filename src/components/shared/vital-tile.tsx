/*
 * A vitals tile for the overview: one big percentage, a detail line, the
 * window's average and peak, and a sparkline of the series behind the number.
 * The stroke colour tracks how close the value is to its limit.
 */

import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendChart, mean, resolveToken } from '@/components/shared/chart'

/** Amber above this and red above the next, matching the health line. */
export const USAGE_WARN = 75
export const USAGE_CRIT = 90

/** A theme colour for a utilisation percentage. */
export function usageColor(percent: number): string {
  if (percent >= USAGE_CRIT) {
    return resolveToken('--destructive', '#e5484d')
  }
  if (percent >= USAGE_WARN) {
    return resolveToken('--warning', '#d9a441')
  }
  return resolveToken('--success', '#3fa06a')
}

export interface VitalTileProps {
  icon: ReactNode
  label: string
  percent: number
  detail: string
  footLeft: string
  footRight: string
  times: number[]
  data: number[]
}

export function VitalTile({
  icon,
  label,
  percent,
  detail,
  footLeft,
  footRight,
  times,
  data,
}: VitalTileProps) {
  const color = usageColor(percent)
  const referenceLines =
    data.length > 1 ? [{ y: mean(data), color: resolveToken('--muted-foreground', '#8a8f98') }] : []

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 px-5 pt-4" style={{ color }}>
          <span className="[&_svg]:size-4">{icon}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
        </div>

        <div className="flex items-baseline gap-1 px-5 pt-3">
          <span className="text-3xl font-semibold leading-none tracking-tight tabular">
            {percent.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">%</span>
        </div>

        <p className="px-5 pt-1.5 text-xs text-muted-foreground">{detail}</p>

        <div className="flex justify-between gap-2 px-5 pt-3.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">
          <span>{footLeft}</span>
          <span>{footRight}</span>
        </div>

        <div className="mt-1.5">
          {times.length > 0 ? (
            <TrendChart
              times={times}
              series={[data]}
              colors={[color]}
              height={62}
              fill
              referenceLines={referenceLines}
            />
          ) : (
            <div className="h-[62px]" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
