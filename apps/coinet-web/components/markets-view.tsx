"use client"

import { useMemo, useState } from "react"
import { TrendingUp, TrendingDown, Activity, History, MessageSquare, Minus } from "lucide-react"
import {
  assetUniverse,
  judgeAsset,
  stanceFor,
  buildTrackRecord,
  priceHistory,
  marketRegime,
  type Asset,
  type SectorCategory,
  type Verdict,
  type VerdictOutcome,
} from "@/lib/judgment"
import { JudgmentCard } from "@/components/judgment-card"
import { PriceChart } from "@/components/terminal-charts"
import { useChat } from "@/components/chat-context"
import { cn } from "@/lib/utils"

const verdictDot: Record<Verdict, string> = {
  Bullish: "bg-emerald-400",
  Bearish: "bg-red-400",
  Neutral: "bg-muted-foreground",
  Mixed: "bg-amber-400",
}

const verdictText: Record<Verdict, string> = {
  Bullish: "text-emerald-400",
  Bearish: "text-red-400",
  Neutral: "text-muted-foreground",
  Mixed: "text-amber-400",
}

const outcomeStyle: Record<VerdictOutcome, { label: string; cls: string }> = {
  correct: { label: "Correct", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  wrong: { label: "Wrong", cls: "bg-red-500/15 text-red-300 ring-red-500/30" },
  open: { label: "Open", cls: "bg-primary/15 text-primary ring-primary/30" },
}

const sectors: (SectorCategory | "All")[] = ["All", "L1", "DeFi", "Memecoin", "Stablecoin"]

// Fear & Greed is color-coded by zone (calm, not alarmist).
function fgColor(value: number) {
  if (value >= 75) return "text-emerald-400"
  if (value >= 55) return "text-emerald-300"
  if (value >= 45) return "text-muted-foreground"
  if (value >= 25) return "text-amber-400"
  return "text-red-400"
}

function RegimeStat({ label, value, sub, valueClass }: { label: string; value: string; sub?: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className={cn("font-mono text-sm font-semibold text-foreground", valueClass)}>{value}</span>
        {sub}
      </span>
    </div>
  )
}

export function MarketsView() {
  const { ask } = useChat()
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC")
  const [sector, setSector] = useState<SectorCategory | "All">("All")

  const regime = useMemo(() => marketRegime(), [])

  const list = useMemo(
    () => (sector === "All" ? assetUniverse : assetUniverse.filter((a) => a.category === sector)),
    [sector],
  )

  // Keep selection valid when the filter hides the current asset.
  const selected: Asset = list.find((a) => a.symbol === selectedSymbol) ?? list[0] ?? assetUniverse[0]

  const judgment = useMemo(() => judgeAsset(selected.symbol), [selected.symbol])
  const track = useMemo(() => buildTrackRecord(selected.symbol), [selected.symbol])
  const history = useMemo(() => priceHistory(selected.symbol), [selected.symbol])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        <Activity className="size-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold text-foreground">Markets · Judgment Terminal</h2>
      </div>

      {/* Market regime — the weather report */}
      <div className="flex items-center gap-5 overflow-x-auto border-b border-border bg-secondary/20 px-4 py-2.5 sm:px-6">
        <RegimeStat
          label="Fear & Greed"
          value={`${regime.fearGreed}`}
          valueClass={fgColor(regime.fearGreed)}
          sub={<span className={cn("text-[11px] font-medium", fgColor(regime.fearGreed))}>{regime.fearGreedLabel}</span>}
        />
        <span className="h-7 w-px shrink-0 bg-border" aria-hidden="true" />
        <RegimeStat
          label="Total Mcap"
          value={regime.totalMcap}
          sub={
            <span className={cn("text-[11px] font-medium tabular-nums", regime.mcapChange >= 0 ? "text-emerald-400" : "text-red-400")}>
              {regime.mcapChange >= 0 ? "+" : ""}
              {regime.mcapChange}%
            </span>
          }
        />
        <span className="h-7 w-px shrink-0 bg-border" aria-hidden="true" />
        <RegimeStat label="BTC Dominance" value={`${regime.btcDominance}%`} />
        <span className="h-7 w-px shrink-0 bg-border" aria-hidden="true" />
        <RegimeStat label="ETH Dominance" value={`${regime.ethDominance}%`} />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Asset rail */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border sm:flex">
          {/* Sector filter */}
          <div className="flex flex-wrap gap-1 border-b border-border p-2">
            {sectors.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSector(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  sector === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Asset</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Coinet</span>
            </div>
            {list.map((t) => {
              const active = t.symbol === selected.symbol
              const stance = stanceFor(t.symbol)
              return (
                <button
                  key={t.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(t.symbol)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    active ? "bg-secondary ring-1 ring-primary/40" : "hover:bg-secondary/60",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
                    {t.symbol.slice(0, 3)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{t.symbol}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] text-muted-foreground">{t.price}</span>
                      <span
                        className={cn(
                          "text-[10px] font-medium tabular-nums",
                          t.change >= 0 ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {t.change >= 0 ? "+" : ""}
                        {t.change}%
                      </span>
                    </span>
                  </span>
                  {/* Coinet stance column ��� the data no one else has */}
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className={cn("flex items-center gap-1 text-[11px] font-semibold", verdictText[stance.verdict])}>
                      <span className={cn("size-1.5 rounded-full", verdictDot[stance.verdict])} />
                      {stance.verdict}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{stance.confidence}%</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Main terminal */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* Mobile filter + selector */}
          <div className="sm:hidden">
            <div className="flex gap-1.5 overflow-x-auto border-b border-border p-2">
              {sectors.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSector(s)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    sector === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto border-b border-border p-2">
              {list.map((t) => (
                <button
                  key={t.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(t.symbol)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    t.symbol === selected.symbol
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5 p-4 sm:p-6">
            {/* Token summary */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                  {selected.symbol.slice(0, 3)}
                </span>
                <div>
                  <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground">{selected.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-xl font-semibold text-foreground">{selected.price}</p>
                <p
                  className={cn(
                    "flex items-center justify-end gap-1 text-sm font-medium tabular-nums",
                    selected.change >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {selected.change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {selected.change >= 0 ? "+" : ""}
                  {selected.change}% · 24h
                </p>
              </div>
            </div>

            {/* Verdict heart + evidence dossier */}
            <JudgmentCard judgment={judgment} />

            {/* Auditable verdict history — price chart with verdict markers */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card/60">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <History className="size-4 text-primary" />
                  Verdict history
                  <span className="text-xs font-normal text-muted-foreground">· you can audit this</span>
                </span>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-heading text-base font-bold text-emerald-400">{track.hitRate}%</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hit rate</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-base font-bold text-foreground">
                      {track.resolved}
                      <span className="text-muted-foreground">/{track.total}</span>
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Resolved</p>
                  </div>
                </div>
              </div>

              {/* The chart: candlesticks with Coinet's past calls pinned */}
              <div className="border-t border-border">
                <div className="flex items-center gap-3 px-4 pt-3 text-[11px]">
                  <span className="font-mono font-semibold text-foreground">{selected.symbol}/USD</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">1D</span>
                  <span
                    className={cn(
                      "ml-auto flex items-center gap-1 font-mono tabular-nums",
                      selected.change >= 0 ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {selected.change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {selected.change >= 0 ? "+" : ""}
                    {selected.change}%
                  </span>
                </div>
                <div className="px-2 pt-1 sm:px-3">
                  <PriceChart history={history} />
                </div>
                <p className="flex items-center gap-1.5 px-4 pb-3 text-[11px] text-muted-foreground">
                  <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Circles mark Coinet&apos;s past verdicts — hover one to see the call, the date, and whether it held.
                </p>
              </div>

              {/* Itemized record beneath the chart */}
              <ol className="relative border-t border-border px-5 py-4">
                <span className="absolute bottom-6 left-[1.55rem] top-6 w-px bg-border" aria-hidden="true" />
                {track.records.map((r) => {
                  const o = outcomeStyle[r.outcome]
                  return (
                    <li key={r.date} className="relative flex gap-4 py-2.5">
                      <span
                        className={cn(
                          "relative z-10 mt-1 flex size-3 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                          verdictDot[r.verdict],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("flex items-center gap-1 text-sm font-semibold", verdictText[r.verdict])}>
                            {r.verdict === "Bullish" ? (
                              <TrendingUp className="size-3.5" />
                            ) : r.verdict === "Bearish" ? (
                              <TrendingDown className="size-3.5" />
                            ) : (
                              <Minus className="size-3.5" />
                            )}
                            {r.verdict}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
                              o.cls,
                            )}
                          >
                            {o.label}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">{r.date}</span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{r.note}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                          {r.confidence}% conf · called at {r.priceAt} → now {r.priceNow}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>

            {/* Continue in chat */}
            <button
              type="button"
              onClick={() => ask(`What's your judgment on ${selected.name} (${selected.symbol}) right now?`)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <MessageSquare className="size-4" />
              Discuss {selected.symbol} with Coinet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
