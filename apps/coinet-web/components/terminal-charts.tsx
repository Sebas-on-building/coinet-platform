"use client"

import { useId, useMemo, useState } from "react"
import type { Candle, PriceHistory, PriceMarker, SignalStance, Verdict } from "@/lib/judgment"
import { formatAxisPrice } from "@/lib/judgment"
import { cn } from "@/lib/utils"

function strokeFor(stance: SignalStance): string {
  if (stance === "Bullish") return "oklch(0.7 0.16 155)"
  if (stance === "Bearish") return "oklch(0.62 0.23 25)"
  return "var(--color-muted-foreground)"
}

function toPath(values: number[], width: number, height: number, pad = 1) {
  if (values.length === 0) return ""
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = (width - pad * 2) / (values.length - 1 || 1)
  return values
    .map((v, i) => {
      const x = pad + i * stepX
      const y = pad + (height - pad * 2) * (1 - (v - min) / range)
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
}

/** Calm sparkline beside a signal — the line that turns a claim into evidence. */
export function Sparkline({
  values,
  stance,
  className,
  width = 72,
  height = 24,
}: {
  values: number[]
  stance: SignalStance
  className?: string
  width?: number
  height?: number
}) {
  const gradId = useId()
  const d = useMemo(() => toPath(values, width, height), [values, width, height])
  const area = useMemo(() => `${d} L${width - 1},${height} L1,${height} Z`, [d, width, height])
  const stroke = strokeFor(stance)
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const markerColor: Record<Verdict, string> = {
  Bullish: "oklch(0.7 0.16 155)",
  Bearish: "oklch(0.62 0.23 25)",
  Neutral: "var(--color-muted-foreground)",
  Mixed: "oklch(0.78 0.15 75)",
}

const UP = "oklch(0.72 0.15 158)"
const DOWN = "oklch(0.62 0.23 25)"

// Chart geometry (viewBox units).
const W = 760
const H = 320
const AXIS_W = 52 // right price gutter
const TIME_H = 18 // bottom date axis
const VOL_H = 56 // volume histogram band
const GAP = 8
const PLOT_X = 4
const PLOT_TOP = 8
const PLOT_W = W - AXIS_W - PLOT_X
const PRICE_H = H - TIME_H - VOL_H - GAP - PLOT_TOP
const VOL_TOP = PLOT_TOP + PRICE_H + GAP

/**
 * Professional, TradingView-style price chart with candlesticks, a price axis,
 * gridlines, a volume histogram, a hover crosshair, and Coinet's past verdicts
 * pinned as markers — the visual embodiment of "verdicts you can audit".
 */
export function PriceChart({ history, className }: { history: PriceHistory; className?: string }) {
  const [active, setActive] = useState<PriceMarker | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  const { candles, markers, low, high, maxVolume, timeTicks } = history
  const n = candles.length

  const geom = useMemo(() => {
    const range = high - low || 1
    // Pad the price range slightly so candles don't touch the edges.
    const top = high + range * 0.06
    const bottom = low - range * 0.06
    const span = top - bottom || 1
    const yOf = (v: number) => PLOT_TOP + PRICE_H * (1 - (v - bottom) / span)
    const slot = PLOT_W / n
    const xOf = (i: number) => PLOT_X + slot * (i + 0.5)
    const bodyW = Math.max(1.5, Math.min(9, slot * 0.62))

    // 5 horizontal price gridlines.
    const priceTicks = Array.from({ length: 5 }, (_, k) => {
      const v = bottom + (span * k) / 4
      return { v, y: yOf(v) }
    })
    return { yOf, xOf, slot, bodyW, priceTicks, bottom, top }
  }, [low, high, n])

  const lastClose = candles[n - 1]?.close ?? 0
  const lastUp = (candles[n - 1]?.close ?? 0) >= (candles[n - 1]?.open ?? 0)
  const hoverCandle: Candle | null = hover != null ? candles[hover] ?? null : null

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="h-[300px] w-full select-none"
        role="img"
        aria-label="Candlestick price history with Coinet verdict markers"
        onMouseLeave={() => setHover(null)}
      >
        {/* Horizontal gridlines + price axis labels */}
        {geom.priceTicks.map((t, i) => (
          <g key={`p-${i}`}>
            <line
              x1={PLOT_X}
              x2={PLOT_X + PLOT_W}
              y1={t.y}
              y2={t.y}
              stroke="var(--color-border)"
              strokeWidth={0.5}
              opacity={0.5}
            />
            <text
              x={W - AXIS_W + 6}
              y={t.y + 3}
              className="fill-muted-foreground font-mono"
              fontSize={9}
            >
              {formatAxisPrice(t.v)}
            </text>
          </g>
        ))}

        {/* Time axis ticks */}
        {timeTicks.map((t, i) => (
          <text
            key={`t-${i}`}
            x={Math.min(Math.max(geom.xOf(t.index), 14), PLOT_X + PLOT_W - 14)}
            y={H - 5}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
            fontSize={9}
          >
            {t.label}
          </text>
        ))}

        {/* Volume histogram */}
        {candles.map((c, i) => {
          const h = (c.volume / (maxVolume || 1)) * (VOL_H - 4)
          const up = c.close >= c.open
          return (
            <rect
              key={`v-${i}`}
              x={geom.xOf(i) - geom.bodyW / 2}
              y={VOL_TOP + (VOL_H - h)}
              width={geom.bodyW}
              height={Math.max(0.5, h)}
              fill={up ? UP : DOWN}
              opacity={hover === i ? 0.55 : 0.28}
            />
          )
        })}

        {/* Candlesticks */}
        {candles.map((c, i) => {
          const up = c.close >= c.open
          const color = up ? UP : DOWN
          const x = geom.xOf(i)
          const yHigh = geom.yOf(c.high)
          const yLow = geom.yOf(c.low)
          const yOpen = geom.yOf(c.open)
          const yClose = geom.yOf(c.close)
          const bodyTop = Math.min(yOpen, yClose)
          const bodyH = Math.max(1, Math.abs(yClose - yOpen))
          return (
            <g key={`c-${i}`}>
              <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
              <rect
                x={x - geom.bodyW / 2}
                y={bodyTop}
                width={geom.bodyW}
                height={bodyH}
                fill={color}
                rx={0.5}
              />
            </g>
          )
        })}

        {/* Last price line + tag */}
        <line
          x1={PLOT_X}
          x2={PLOT_X + PLOT_W}
          y1={geom.yOf(lastClose)}
          y2={geom.yOf(lastClose)}
          stroke={lastUp ? UP : DOWN}
          strokeWidth={0.75}
          strokeDasharray="3 3"
          opacity={0.7}
        />
        <g>
          <rect
            x={W - AXIS_W + 2}
            y={geom.yOf(lastClose) - 7}
            width={AXIS_W - 4}
            height={14}
            rx={2}
            fill={lastUp ? UP : DOWN}
          />
          <text
            x={W - AXIS_W / 2}
            y={geom.yOf(lastClose) + 3}
            textAnchor="middle"
            className="fill-background font-mono font-semibold"
            fontSize={9}
          >
            {formatAxisPrice(lastClose)}
          </text>
        </g>

        {/* Verdict markers — slim flags pinned to the close at each call */}
        {markers.map((m, idx) => {
          const c = candles[m.index]
          if (!c) return null
          const x = geom.xOf(m.index)
          const y = geom.yOf(c.high) - 6
          const isActive = active?.index === m.index
          const color = markerColor[m.verdict]
          return (
            <g key={`m-${m.index}-${idx}`}>
              <line
                x1={x}
                x2={x}
                y1={y}
                y2={geom.yOf(c.high)}
                stroke={color}
                strokeWidth={isActive ? 1.5 : 1}
                opacity={isActive ? 0.9 : 0.5}
              />
              <circle
                cx={x}
                cy={y}
                r={isActive ? 5 : 3.5}
                fill="var(--color-background)"
                stroke={color}
                strokeWidth={2}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setActive(m)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(m)}
                onBlur={() => setActive(null)}
                tabIndex={0}
              />
            </g>
          )
        })}

        {/* Crosshair */}
        {hover != null && (
          <line
            x1={geom.xOf(hover)}
            x2={geom.xOf(hover)}
            y1={PLOT_TOP}
            y2={VOL_TOP + VOL_H}
            stroke="var(--color-muted-foreground)"
            strokeWidth={0.5}
            strokeDasharray="2 2"
            opacity={0.6}
          />
        )}

        {/* Hover hit-zones (one transparent column per candle) */}
        {candles.map((_, i) => (
          <rect
            key={`h-${i}`}
            x={PLOT_X + geom.slot * i}
            y={PLOT_TOP}
            width={geom.slot}
            height={PRICE_H + GAP + VOL_H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {/* OHLC readout on hover */}
      {hoverCandle && (
        <div className="pointer-events-none absolute left-3 top-2 flex gap-3 rounded-md border border-border bg-popover/90 px-2.5 py-1 font-mono text-[10px] backdrop-blur">
          {(
            [
              ["O", hoverCandle.open],
              ["H", hoverCandle.high],
              ["L", hoverCandle.low],
              ["C", hoverCandle.close],
            ] as const
          ).map(([k, val]) => (
            <span key={k} className="flex gap-1">
              <span className="text-muted-foreground">{k}</span>
              <span className={hoverCandle.close >= hoverCandle.open ? "text-emerald-400" : "text-red-400"}>
                {formatAxisPrice(val)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Verdict marker detail */}
      {active && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-center shadow-xl">
          <div className="flex items-center justify-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ background: markerColor[active.verdict] }}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold text-foreground">{active.verdict}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{active.date}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                active.outcome === "correct"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : active.outcome === "wrong"
                    ? "bg-red-500/15 text-red-300"
                    : "bg-primary/15 text-primary",
              )}
            >
              {active.outcome}
            </span>
          </div>
          <p className="mt-1 max-w-[16rem] text-[11px] leading-snug text-muted-foreground">{active.note}</p>
        </div>
      )}
    </div>
  )
}
