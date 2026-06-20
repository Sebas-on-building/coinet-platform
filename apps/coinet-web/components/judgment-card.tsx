"use client"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Check,
  X,
  Clock,
  ShieldCheck,
} from "lucide-react"
import type { CoverageStatus, Judgment, SignalStance, Verdict } from "@/lib/judgment"
import { sparkSeries } from "@/lib/judgment"
import { Sparkline } from "@/components/terminal-charts"
import { useChat } from "@/components/chat-context"
import { cn } from "@/lib/utils"

// Flatten a judgment into copyable plain text.
function judgmentToText(j: Judgment): string {
  const lines = [
    `${j.asset} — ${j.verdict} (${j.confidence}% confidence)`,
    j.price !== "—" ? `Price: ${j.price}` : "",
    "",
    j.thesis,
    "",
    "Signals weighed:",
    ...j.signals.map((s) => `• ${s.label} (${s.stance}, ${s.weight}%): ${s.detail}`),
  ]
  if (j.contradictions.length) {
    lines.push("", "Coinet challenges itself:", ...j.contradictions.map((c) => `• ${c.title}: ${c.detail}`))
  }
  lines.push("", j.closing)
  return lines.filter((l) => l !== undefined).join("\n")
}

const verdictStyles: Record<Verdict, { text: string; bg: string; ring: string }> = {
  Bullish: { text: "text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/30" },
  Bearish: { text: "text-red-400", bg: "bg-red-500/15", ring: "ring-red-500/30" },
  Neutral: { text: "text-muted-foreground", bg: "bg-secondary", ring: "ring-border" },
  Mixed: { text: "text-amber-400", bg: "bg-amber-500/15", ring: "ring-amber-500/30" },
}

function StanceIcon({ stance, className }: { stance: SignalStance; className?: string }) {
  if (stance === "Bullish") return <TrendingUp className={cn("text-emerald-400", className)} />
  if (stance === "Bearish") return <TrendingDown className={cn("text-red-400", className)} />
  return <Minus className={cn("text-muted-foreground", className)} />
}

function barColor(stance: SignalStance) {
  if (stance === "Bullish") return "bg-emerald-400"
  if (stance === "Bearish") return "bg-red-400"
  return "bg-muted-foreground"
}

// Confidence is color-coded by level: low=amber, medium=blue, high=green.
function confidenceColor(value: number) {
  if (value >= 70) return { bar: "bg-emerald-400", text: "text-emerald-400" }
  if (value >= 40) return { bar: "bg-primary", text: "text-primary" }
  return { bar: "bg-amber-400", text: "text-amber-400" }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</p>
}

const coverageMeta: Record<CoverageStatus, { dot: string; label: string; text: string }> = {
  scored: { dot: "bg-emerald-400", label: "Scored", text: "text-foreground" },
  missing: { dot: "bg-muted-foreground/50", label: "Missing", text: "text-muted-foreground" },
  na: { dot: "bg-transparent ring-1 ring-border", label: "n/a", text: "text-muted-foreground/60" },
}

export function JudgmentCard({ judgment }: { judgment: Judgment }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)
  const { regenerate } = useChat()
  const v = verdictStyles[judgment.verdict]
  const conf = confidenceColor(judgment.confidence)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(judgmentToText(judgment))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur">
      {/* 1 — Verdict header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
            <Scale className="size-3.5" />
            Judgment
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-base font-bold tracking-tight text-foreground">{judgment.asset}</span>
            {judgment.price !== "—" && <span className="font-mono text-sm text-muted-foreground">{judgment.price}</span>}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider",
              judgment.dataStatus === "available" ? "text-emerald-400/80" : "text-amber-400/80",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                judgment.dataStatus === "available" ? "bg-emerald-400" : "bg-amber-400",
              )}
            />
            {judgment.dataStatus === "available" ? "Data live" : "Data degraded"}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1",
            v.bg,
            v.text,
            v.ring,
          )}
        >
          <StanceIcon
            stance={judgment.verdict === "Mixed" ? "Neutral" : (judgment.verdict as SignalStance)}
            className="size-4"
          />
          {judgment.verdict}
        </span>
      </div>

      {/* 2 — Mentor prose */}
      <p className="px-5 pt-4 text-sm leading-relaxed text-foreground/90">{judgment.thesis}</p>

      {/* 3 — Confidence bar */}
      <div className="px-5 pt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wider text-muted-foreground">Confidence</span>
          <span className={cn("font-mono font-semibold", conf.text)}>{judgment.confidence}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full rounded-full", conf.bar)} style={{ width: `${judgment.confidence}%` }} />
        </div>
      </div>

      {/* 4 — Signals weighed (drivers) */}
      <div className="px-5 pt-5">
        <SectionLabel>Signals weighed</SectionLabel>
        <div className="flex flex-col gap-3">
          {judgment.signals.map((s) => (
            <div key={s.label} className="flex items-start gap-3">
              <StanceIcon stance={s.stance} className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <div className="flex items-center gap-2.5">
                    <Sparkline
                      values={sparkSeries(`${judgment.asset}-${s.label}`, s.stance)}
                      stance={s.stance}
                      className="shrink-0"
                    />
                    <span className="font-mono text-xs text-muted-foreground">{s.weight}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full", barColor(s.stance))} style={{ width: `${s.weight}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5 — Contradictions */}
      {judgment.contradictions.length > 0 && (
        <div className="px-5 pt-5">
          <SectionLabel>Coinet challenges itself</SectionLabel>
          <div className="flex flex-col gap-2">
            {judgment.contradictions.map((c) => (
              <div key={c.title} className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <AlertTriangle className="size-3.5 text-red-400" />
                    {c.title}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      c.severity === "critical" ? "bg-red-500/20 text-red-300" : "bg-amber-500/15 text-amber-300",
                    )}
                  >
                    {c.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle for the supporting dossier (6–10) */}
      <div className="px-5 pt-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={open}
        >
          <span>{open ? "Hide full dossier" : "Show full dossier"}</span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-5 px-5 pt-5">
          {/* 6 — Trust layer / data coverage */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <SectionLabel>Data coverage</SectionLabel>
              <span className="pb-2 text-[10px] italic text-muted-foreground/50">illustrative — wiring pending</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {judgment.coverage.map((f) => {
                const m = coverageMeta[f.status]
                return (
                  <div
                    key={f.name}
                    className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-2.5 py-2"
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", m.dot)} />
                    <div className="min-w-0">
                      <p className={cn("truncate text-xs font-medium", m.text)}>{f.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{m.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 7 — Confidence breakdown */}
          <div>
            <SectionLabel>Confidence breakdown</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {judgment.breakdown.map((d) => (
                <div key={d.label} className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">{d.label}</span>
                    <span className="font-mono text-xs font-semibold text-foreground">{d.value.toFixed(2)}</span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${d.value * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 8 — Confirmation & failure */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Check className="size-3.5" />
                What confirms this
              </span>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{judgment.confirms}</p>
            </div>
            <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-300">
                <X className="size-3.5" />
                What kills it
              </span>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{judgment.invalidates}</p>
            </div>
          </div>

          {/* 9 — Timing */}
          <div>
            <SectionLabel>Timing</SectionLabel>
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock className="size-3.5 text-primary" />
                  {judgment.timing.phase}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {judgment.timing.step}
                </span>
              </div>
              {judgment.timing.warning && (
                <p className="mt-1.5 text-xs leading-relaxed text-amber-300/90">{judgment.timing.warning}</p>
              )}
            </div>
          </div>

          {/* 10 — OmniScore */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <SectionLabel>OmniScore</SectionLabel>
              <span className="pb-2 text-[10px] italic text-muted-foreground/50">illustrative — wiring pending</span>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg bg-primary/10 px-3 py-2 text-center">
                  <p className="font-heading text-xl font-bold text-primary">{judgment.omni.quality.toFixed(1)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quality (QS)</p>
                </div>
                <div className="flex-1 rounded-lg bg-primary/10 px-3 py-2 text-center">
                  <p className="font-heading text-xl font-bold text-primary">{judgment.omni.opportunity.toFixed(1)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Opportunity (OS)</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground/70">Sector</span>
                  <p className="font-medium text-foreground">{judgment.omni.sector}</p>
                </div>
                <div>
                  <span className="text-muted-foreground/70">Tokenomics</span>
                  <p className="font-medium text-foreground">{judgment.omni.tokenomics}</p>
                </div>
                <div>
                  <span className="text-muted-foreground/70">Concentration</span>
                  <p className="font-medium text-foreground">{judgment.omni.concentration}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11 — Closing line / risk summary */}
      <div className="mt-5 flex items-start gap-2 border-t border-border bg-secondary/40 px-5 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm font-medium text-foreground">{judgment.closing}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-border px-3 py-2">
        <button
          type="button"
          aria-label={copied ? "Copied to clipboard" : "Copy judgment"}
          onClick={handleCopy}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary",
            copied ? "text-emerald-400" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
        <button
          type="button"
          aria-label="Regenerate judgment"
          onClick={() => regenerate()}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <RefreshCw className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Good judgment"
          aria-pressed={feedback === "up"}
          onClick={() => setFeedback((f) => (f === "up" ? null : "up"))}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary",
            feedback === "up" ? "text-emerald-400" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ThumbsUp className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Bad judgment"
          aria-pressed={feedback === "down"}
          onClick={() => setFeedback((f) => (f === "down" ? null : "down"))}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary",
            feedback === "down" ? "text-red-400" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ThumbsDown className="size-4" />
        </button>
      </div>
    </div>
  )
}
