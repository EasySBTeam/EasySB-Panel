/*
 * The trend charts the overview draws, built on uPlot (the same engine 3x-ui
 * uses) so the sparklines and the wide charts share one renderer and one set of
 * interaction quirks. Colours come from the theme tokens, resolved to concrete
 * values because a canvas cannot read a CSS variable.
 */

import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

/** A reference line drawn across the plot at a fixed y, e.g. the mean. */
export interface ReferenceLine {
  y: number
  color: string
}

export interface TrendChartProps {
  /** The shared x axis, in unix seconds. */
  times: number[]
  /** One array per series, each the same length as `times`. */
  series: number[][]
  /** Stroke colour per series, matching `series` by index. */
  colors: string[]
  height?: number
  /** Draw the area under each series. */
  fill?: boolean
  /** Render the axes, grid and cursor; a sparkline leaves them off. */
  axes?: boolean
  /** Format a y value in the axis and the cursor. */
  formatY?: (value: number) => string
  /** Horizontal reference lines, such as the mean of a tile's series. */
  referenceLines?: ReferenceLine[]
  className?: string
}

/**
 * Resolve a theme token (for example "--primary") to a concrete CSS colour a
 * canvas accepts. Probing an element makes the browser do the conversion, so an
 * oklch() token becomes the rgb() uPlot needs.
 */
export function resolveToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback
  }
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value && value !== 'rgba(0, 0, 0, 0)' ? value : fallback
}

/** A translucent version of a resolved rgb()/rgba() colour. */
function withAlpha(color: string, alpha: number): string {
  const match = color.match(/rgba?\(([^)]+)\)/)
  if (!match) {
    return color
  }
  const parts = match[1].split(',').map((p) => p.trim())
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`
}

/** The chart label font, shared by the axis and the width probe. */
const LABEL_FONT = '11px ui-sans-serif, system-ui, sans-serif'

let measureContext: CanvasRenderingContext2D | null = null

/**
 * The rendered width of a label in the axis font. A canvas measures the real
 * glyphs so the axis can reserve exactly enough room; a fixed width clips labels
 * such as "390.6 KB" and the eye then reads the survivors as out of order.
 */
function labelWidth(text: string): number {
  if (typeof document !== 'undefined') {
    measureContext ??= document.createElement('canvas').getContext('2d')
    if (measureContext) {
      measureContext.font = LABEL_FONT
      return measureContext.measureText(text).width
    }
  }
  return text.length * 7
}

/** A round step near max/target, so the axis shows 1/2/5-style tidy ticks. */
function niceStep(max: number, target: number): number {
  if (max <= 0) {
    return 1
  }
  const raw = max / target
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const normalized = raw / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

/** The shared uPlot configuration for both the sparklines and the wide charts. */
function buildOptions({
  colors,
  series,
  height,
  fill,
  axes,
  formatY,
  referenceLines,
}: Required<Pick<TrendChartProps, 'colors' | 'series'>> &
  Pick<TrendChartProps, 'height' | 'fill' | 'axes' | 'formatY' | 'referenceLines'>): uPlot.Options {
  const showAxes = axes ?? false
  const seriesConfig: uPlot.Series[] = [{}]
  series.forEach((_, index) => {
    seriesConfig.push({
      stroke: colors[index] ?? colors[0],
      width: showAxes ? 1.6 : 1.5,
      fill: fill ? withAlpha(colors[index] ?? colors[0], showAxes ? 0.14 : 0.28) : undefined,
      points: { show: false },
    })
  })
  // Each reference line is a flat series so uPlot draws a horizontal guide.
  ;(referenceLines ?? []).forEach((line) => {
    seriesConfig.push({
      stroke: line.color,
      width: 1,
      dash: [3, 4],
      fill: undefined,
      points: { show: false },
    })
  })

  return {
    width: 0,
    height: height ?? 64,
    padding: showAxes ? [8, 8, 0, 0] : [2, 0, 2, 0],
    legend: { show: false },
    cursor: { show: showAxes, y: false },
    scales: { x: { time: true }, y: { range: (_u, _min, max) => [0, max > 0 ? max * 1.1 : 1] } },
    axes: showAxes
      ? [
          {
            stroke: colors[0],
            grid: { stroke: withAlpha(colors[0] ?? '#888', 0.12) },
            ticks: { show: false },
            font: LABEL_FONT,
            space: 64,
            // uPlot's time axis defaults to a US-style date plus am/pm; the
            // console is Chinese-only, so format every tick as 24-hour HH:MM.
            values: (_u, ticks) => ticks.map((t) => formatClock(t)),
          },
          {
            stroke: colors[0],
            grid: { stroke: withAlpha(colors[0] ?? '#888', 0.12) },
            ticks: { show: false },
            font: LABEL_FONT,
            // Reserve room for the widest label instead of a fixed width, which
            // clips the leading digits of values such as "390.6 KB". uPlot hands
            // `size` the already-formatted tick strings.
            size: (_u, values) =>
              Math.ceil((values ?? []).reduce((max, label) => Math.max(max, labelWidth(label)), 0)) + 12,
            // Force round, evenly spaced ticks; uPlot's default picker can
            // return awkward values for a rate axis that only reaches ~100k.
            splits: (_u, _axisIdx, _scaleMin, scaleMax) => {
              const step = niceStep(scaleMax, 4)
              const values: number[] = []
              for (let value = 0; value <= scaleMax + step / 2; value += step) {
                values.push(value)
              }
              return values
            },
            values: (_u, ticks) => ticks.map((v) => (formatY ? formatY(v) : String(v))),
          },
        ]
      : [{ show: false }, { show: false }],
    series: seriesConfig,
  }
}

export function TrendChart({
  times,
  series,
  colors,
  height,
  fill = true,
  axes = false,
  formatY,
  referenceLines,
  className,
}: TrendChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)
  const hasData = times.length > 0

  useEffect(() => {
    const host = hostRef.current
    if (!host || !hasData) {
      return
    }
    const options = buildOptions({ colors, series, height, fill, axes, formatY, referenceLines })
    const data = toData(times, series, referenceLines)
    const plot = new uPlot(options, data, host)
    plotRef.current = plot

    const observer = new ResizeObserver(() => {
      const width = host.clientWidth
      if (width > 0) {
        plot.setSize({ width, height: height ?? 64 })
      }
    })
    observer.observe(host)
    if (host.clientWidth > 0) {
      plot.setSize({ width: host.clientWidth, height: height ?? 64 })
    }

    return () => {
      observer.disconnect()
      plot.destroy()
      plotRef.current = null
    }
    // The chart is rebuilt when the series set changes shape; data updates below
    // are applied without a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData, series.length, colors.join(','), height, fill, axes, referenceLines?.length])

  useEffect(() => {
    const plot = plotRef.current
    if (plot && hasData) {
      plot.setData(toData(times, series, referenceLines))
    }
  }, [hasData, times, series, referenceLines])

  if (!hasData) {
    return <div className={className} style={{ height: height ?? 64 }} />
  }

  return <div ref={hostRef} className={className} style={{ height: height ?? 64 }} />
}

/** uPlot's data is [xs, ...series]; reference lines become flat extra series. */
function toData(
  times: number[],
  series: number[][],
  referenceLines?: ReferenceLine[],
): uPlot.AlignedData {
  const rows: (number | null)[][] = [times, ...series]
  ;(referenceLines ?? []).forEach((line) => {
    rows.push(times.map(() => line.y))
  })
  return rows as unknown as uPlot.AlignedData
}

/** The arithmetic mean of a series, or zero when it is empty. */
export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((total, value) => total + value, 0) / values.length
}

/** The largest value in a series, or zero when it is empty. */
export function peak(values: number[]): number {
  return values.reduce((max, value) => (value > max ? value : max), 0)
}

/** An x tick as a 24-hour clock time, e.g. "10:03". */
export function formatClock(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
