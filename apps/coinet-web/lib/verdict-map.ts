/**
 * Map the governed ChatVerdict (POST /api/chat/message) into the terminal's
 * Judgment shape for JudgmentCard.
 *
 * Honesty contract:
 *  - REAL (from the engine via the verdict): verdict direction, confidence,
 *    thesis, signals (cause drivers), contradictions, confidence breakdown,
 *    confirms/invalidates, timing, closing.
 *  - ILLUSTRATIVE (not in the DTO, kept from the mock scaffold + flagged in the
 *    card): coverage grid, OmniScore. Price is blanked to "—" — never a stale
 *    quote.
 *  - Callers must pass only AVAILABLE/DEGRADED verdicts WITH fields. An
 *    UNAVAILABLE verdict has no fields and must render as text, never a card.
 */
import type {
  ConfidenceDimension,
  Contradiction,
  Judgment,
  Signal,
  SignalStance,
  Verdict,
} from "@/lib/judgment"
import { judgeAsset } from "@/lib/judgment"
import type { ChatVerdict } from "@/types/api"

type VFields = NonNullable<ChatVerdict["fields"]>

// Humanize an engine identifier/enum into Title-case words ("leverage_expansion"
// → "Leverage expansion"). Idempotent on already-humanized strings.
function humanize(s: string): string {
  const t = s.replace(/[_-]+/g, " ").trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

const BAND_TO_NUMBER: Record<string, number> = {
  very_low: 15,
  low: 35,
  medium: 55,
  high: 75,
  very_high: 90,
}

function deriveConfidence(f: VFields): number {
  const score = f.confidence_detail?.score
  if (typeof score === "number" && Number.isFinite(score)) {
    return Math.max(0, Math.min(100, Math.round(score * 100)))
  }
  const band = (f.confidence_band ?? "").toLowerCase().replace(/\s+/g, "_")
  return BAND_TO_NUMBER[band] ?? 50
}

/**
 * Honest 4-way verdict — the engine emits no Bull/Bear/Neutral/Mixed, so we
 * derive it from the real driver balance + contradiction load:
 *   net = Σ(positive driver strength) − Σ(negative driver strength)
 *   Mixed   = genuine two-sided conflict (high contradiction load / structural
 *             warning / ambiguous thesis, AND both sides carry real weight)
 *   Neutral = drivers balanced or weak (|net| small)
 *   else    = sign of net
 * Thresholds (0.5 / 0.15) are tunable.
 */
export function deriveVerdict(f: VFields): Verdict {
  const drivers = f.cause_detail?.drivers ?? []
  let pos = 0
  let neg = 0
  for (const d of drivers) {
    const s = typeof d.strength === "number" && Number.isFinite(d.strength) ? d.strength : 0.5
    if (d.direction === "positive") pos += s
    else if (d.direction === "negative") neg += s
  }
  const net = pos - neg

  const conflicted =
    (typeof f.contradiction_load === "number" && f.contradiction_load >= 0.5) ||
    f.contradiction_structural_warning === true ||
    f.thesis_detail?.ambiguous === true
  const twoSided = pos > 0.15 && neg > 0.15

  if (conflicted && twoSided) return "Mixed"
  if (Math.abs(net) < 0.15) return "Neutral"
  return net > 0 ? "Bullish" : "Bearish"
}

function mapSignals(f: VFields): Signal[] {
  const drivers = f.cause_detail?.drivers ?? []
  return drivers.map((d) => {
    const stance: SignalStance = d.direction === "positive" ? "Bullish" : "Bearish"
    const weight =
      typeof d.strength === "number" && Number.isFinite(d.strength)
        ? Math.max(0, Math.min(100, Math.round(d.strength * 100)))
        : 50
    return { label: humanize(d.family), stance, weight, detail: d.summary ?? "" }
  })
}

function mapContradictions(f: VFields): Contradiction[] {
  const items = f.contradiction_items ?? []
  return items.map((c) => ({
    title: humanize(c.class),
    severity: c.severity === "critical" || c.resolvable === false ? "critical" : "resolvable",
    detail: c.summary ?? "",
  }))
}

function mapBreakdown(f: VFields): ConfidenceDimension[] {
  const b = f.confidence_detail?.breakdown
  if (!b) return []
  const out: ConfidenceDimension[] = []
  if (typeof b.market === "number") out.push({ label: "Market", value: b.market })
  if (typeof b.fundamentals === "number") out.push({ label: "Fundamentals", value: b.fundamentals })
  if (typeof b.onchain === "number") out.push({ label: "On-chain", value: b.onchain })
  if (typeof b.narrative === "number") out.push({ label: "Narrative", value: b.narrative })
  return out
}

function mapTiming(f: VFields): Judgment["timing"] {
  const phase = f.timing_phase ? humanize(f.timing_phase) : ""
  const pos = f.timing_detail?.position
  const total = f.timing_detail?.total
  const step =
    typeof pos === "number" && typeof total === "number" ? `Step ${pos} / ${total}` : ""
  const warning = f.timing_detail?.maturity_warning
    ? f.timing_detail?.maturity_note ?? undefined
    : undefined
  return { phase, step, warning }
}

export function chatVerdictToJudgment(v: ChatVerdict, prose?: string): Judgment {
  const symbol = v.symbol ?? "Market"
  // Scaffold supplies ONLY the illustrative fields we keep: coverage + omni.
  const scaffold = judgeAsset(symbol)
  const f = v.fields ?? {}

  return {
    ...scaffold,
    asset: symbol,
    price: "—", // not in the DTO — honest blank, never a stale quote
    dataStatus: v.status === "DEGRADED" ? "degraded" : "available",
    verdict: deriveVerdict(f),
    confidence: deriveConfidence(f),
    thesis: f.thesis ?? prose ?? "",
    signals: mapSignals(f),
    contradictions: mapContradictions(f),
    breakdown: mapBreakdown(f),
    confirms: f.scenario_detail?.bullish_confirmation ?? f.signal_24h ?? "",
    invalidates: f.scenario_detail?.bearish_failure ?? f.failure_condition ?? "",
    timing: mapTiming(f),
    closing: f.scenario_summary ?? f.scenario_detail?.next_trigger ?? prose ?? "",
    // coverage + omni intentionally retained from scaffold (illustrative —
    // flagged "wiring pending" in JudgmentCard).
  }
}
