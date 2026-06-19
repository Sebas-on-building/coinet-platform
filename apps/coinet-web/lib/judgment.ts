export type Verdict = "Bullish" | "Bearish" | "Neutral" | "Mixed"
export type SignalStance = "Bullish" | "Bearish" | "Neutral"
export type DataStatus = "available" | "degraded"

export type Signal = {
  label: string
  stance: SignalStance
  weight: number // 0-100, relative influence on the verdict
  detail: string
}

export type Contradiction = {
  title: string
  severity: "critical" | "resolvable"
  detail: string
}

export type CoverageStatus = "scored" | "missing" | "na"
export type DataFamily = {
  name: string
  status: CoverageStatus
}

export type ConfidenceDimension = {
  label: string
  value: number // 0-1
}

export type Timing = {
  phase: string
  step: string // e.g. "Step 6 / 9"
  warning?: string
}

export type OmniScore = {
  quality: number // QS
  opportunity: number // OS
  tokenomics: string
  concentration: string
  sector: string
}

export type Judgment = {
  asset: string
  price: string
  dataStatus: DataStatus
  verdict: Verdict
  confidence: number // 0-100
  thesis: string
  signals: Signal[]
  contradictions: Contradiction[]
  coverage: DataFamily[]
  breakdown: ConfidenceDimension[]
  confirms: string
  invalidates: string
  timing: Timing
  omni: OmniScore
  closing: string
}

export type AssistantReply = { kind: "judgment"; judgment: Judgment } | { kind: "text"; text: string }

// ---- Auditable verdict history ----
export type VerdictOutcome = "correct" | "wrong" | "open"
export type VerdictRecord = {
  date: string // e.g. "May 28"
  daysAgo: number
  verdict: Verdict
  confidence: number
  priceAt: string
  priceNow: string
  outcome: VerdictOutcome
  note: string
}

export type TrackRecord = {
  total: number
  hitRate: number // 0-100, share of resolved calls that were correct
  resolved: number
  records: VerdictRecord[]
}

type Template = {
  match: RegExp
  verdict: Verdict
  confidence: number
  dataStatus: DataStatus
  thesis: string
  signals: Signal[]
  contradictions: Contradiction[]
  breakdown: ConfidenceDimension[]
  confirms: string
  invalidates: string
  timing: Timing
  closing: string
  coverageOverride?: Partial<Record<string, CoverageStatus>>
}

const baseCoverage: DataFamily[] = [
  { name: "Derivatives", status: "scored" },
  { name: "Price / Turnover", status: "scored" },
  { name: "Fundamentals", status: "scored" },
  { name: "On-chain", status: "scored" },
  { name: "Sentiment", status: "missing" },
  { name: "Protocol", status: "na" },
]

function coverageWith(overrides?: Partial<Record<string, CoverageStatus>>): DataFamily[] {
  if (!overrides) return baseCoverage
  return baseCoverage.map((f) => (overrides[f.name] ? { ...f, status: overrides[f.name]! } : f))
}

const templates: Template[] = [
  {
    match: /whale|inflow|outflow|wallet|accumulat/i,
    verdict: "Bearish",
    confidence: 71,
    dataStatus: "available",
    thesis:
      "The weight of evidence tilts cautious. Large holders are rotating onto exchanges while spot bids thin out — a distribution pattern that historically front-runs short-term weakness rather than a clean trend reversal.",
    signals: [
      { label: "Exchange inflows", stance: "Bearish", weight: 82, detail: "+18,400 BTC moved to exchanges by wallets >1k BTC." },
      { label: "Spot order book", stance: "Bearish", weight: 64, detail: "Thinning bids below spot, sell walls stacking near resistance." },
      { label: "Funding rate", stance: "Neutral", weight: 41, detail: "Perp funding flat — no aggressive leverage either direction." },
      { label: "Long-term holders", stance: "Bullish", weight: 38, detail: "LTH supply still rising; not a structural top signal." },
    ],
    contradictions: [
      {
        title: "Inflows vs holder base",
        severity: "resolvable",
        detail:
          "Exchange inflows read bearish, yet long-term holder supply keeps climbing. The distribution may be tactical profit-taking, not the start of a cycle top.",
      },
    ],
    breakdown: [
      { label: "Market", value: 0.74 },
      { label: "Fundamentals", value: 0.35 },
      { label: "On-chain", value: 0.81 },
      { label: "Narrative", value: 0.42 },
    ],
    confirms: "Inflows keep accelerating and bids fail to refill below spot.",
    invalidates: "Coins flow back off exchanges and LTH supply spikes — distribution fizzles.",
    timing: { phase: "Late-stage distribution", step: "Step 6 / 9", warning: "Setup is mature — the easy part of the risk/reward is behind it." },
    closing: "Short-term caution warranted. This reads as distribution, not capitulation.",
  },
  {
    match: /sentiment|fear|greed|mood|social|hype/i,
    verdict: "Mixed",
    confidence: 58,
    dataStatus: "available",
    thesis:
      "Sentiment is hot but not yet euphoric. Social volume is climbing while the Fear & Greed index sits in 'Greed' — constructive for now, but crowded positioning raises the odds of a sharp shakeout.",
    signals: [
      { label: "Fear & Greed", stance: "Bullish", weight: 70, detail: "Reading of 72 (Greed), up from 55 last week." },
      { label: "Social volume", stance: "Bullish", weight: 61, detail: "Mentions +34% WoW, led by majors." },
      { label: "Funding / leverage", stance: "Bearish", weight: 55, detail: "Funding turning rich — crowded longs are fragile." },
      { label: "Stablecoin supply", stance: "Neutral", weight: 44, detail: "Dry powder flat; no fresh capital surge." },
    ],
    contradictions: [
      {
        title: "Greed vs dry powder",
        severity: "critical",
        detail:
          "Sentiment screams greed while stablecoin supply is flat. Without fresh capital, the rally is running on leverage — fuel that can reverse violently.",
      },
    ],
    breakdown: [
      { label: "Market", value: 0.62 },
      { label: "Fundamentals", value: 0.3 },
      { label: "On-chain", value: 0.45 },
      { label: "Narrative", value: 0.78 },
    ],
    confirms: "Social breadth widens beyond majors while funding cools off.",
    invalidates: "Funding spikes into euphoria as price stalls — classic crowded-trade unwind.",
    timing: { phase: "Crowded", step: "Step 7 / 9", warning: "Positioning is stretched — chase with tight risk only." },
    closing: "Trend is up, but the crowd is leaning. Trail stops rather than chase.",
    coverageOverride: { Sentiment: "scored" },
  },
  {
    match: /unlock|vesting|emission|cliff|supply/i,
    verdict: "Bearish",
    confidence: 66,
    dataStatus: "available",
    thesis:
      "Upcoming unlocks add mechanical sell-side pressure. Several mid-caps face cliff unlocks above 3% of float in the next 10 days — typically a drag into the event, with relief only after the supply clears.",
    signals: [
      { label: "Unlock size", stance: "Bearish", weight: 78, detail: "3 tokens unlocking >5% of float within 10d." },
      { label: "Liquidity depth", stance: "Bearish", weight: 60, detail: "Thin books amplify the unlock impact." },
      { label: "Historical pattern", stance: "Neutral", weight: 47, detail: "Majors often pre-price unlocks ~48h prior." },
      { label: "Recipient behavior", stance: "Neutral", weight: 40, detail: "Some allocations are team-locked, not for sale." },
    ],
    contradictions: [
      {
        title: "Unlock size vs recipient intent",
        severity: "resolvable",
        detail:
          "The headline unlock looks heavy, but a chunk is team/treasury allocation that rarely hits the market immediately. Effective float increase may be smaller than the raw number.",
      },
    ],
    breakdown: [
      { label: "Market", value: 0.58 },
      { label: "Fundamentals", value: 0.66 },
      { label: "On-chain", value: 0.7 },
      { label: "Narrative", value: 0.33 },
    ],
    confirms: "Price drifts lower into the cliff on rising volume — the market is pricing supply.",
    invalidates: "Token holds or rallies through the unlock — demand is absorbing the new supply.",
    timing: { phase: "Pre-event", step: "Step 4 / 9" },
    closing: "Expect localized weakness around the cliffs. Avoid adding into the event.",
  },
  {
    match: /.*/,
    verdict: "Bullish",
    confidence: 63,
    dataStatus: "available",
    thesis:
      "The weight of evidence tilts constructive. On-chain accumulation, cooling sell pressure, and improving breadth combine into a moderately bullish read on the current move.",
    signals: [
      { label: "On-chain accumulation", stance: "Bullish", weight: 74, detail: "Accumulation addresses growing steadily." },
      { label: "Breadth", stance: "Bullish", weight: 62, detail: "More assets reclaiming key moving averages." },
      { label: "Derivatives", stance: "Neutral", weight: 48, detail: "Open interest rising without overheated funding." },
      { label: "Macro liquidity", stance: "Neutral", weight: 45, detail: "No major catalysts on the immediate calendar." },
    ],
    contradictions: [
      {
        title: "Volume vs liquidity",
        severity: "critical",
        detail:
          "Volume significantly exceeds available liquidity. High slippage risk and potential for manipulation — treat sharp moves with skepticism.",
      },
    ],
    breakdown: [
      { label: "Market", value: 0.75 },
      { label: "Fundamentals", value: 0.15 },
      { label: "On-chain", value: 0.4 },
      { label: "Narrative", value: 0.55 },
    ],
    confirms: "Spot volume expands and broad participation holds across majors.",
    invalidates: "Price reverses on a volume spike — then the constructive thesis is done.",
    timing: { phase: "Mid-trend", step: "Step 5 / 9" },
    closing: "Bias is up while structure holds. Manage risk into resistance.",
  },
]

type AssetMeta = {
  price: string
  quality: number
  opportunity: number
  sector: string
  tokenomics: string
  concentration: string
}

const assetData: Record<string, AssetMeta> = {
  BTC: { price: "$61,857", quality: 98.4, opportunity: 94.2, sector: "L1", tokenomics: "Fixed supply · disinflationary", concentration: "Low · broadly held" },
  ETH: { price: "$3,420", quality: 95.1, opportunity: 88.7, sector: "L1 · Smart contract", tokenomics: "Net-deflationary under load", concentration: "Low–moderate" },
  SOL: { price: "$148.20", quality: 90.3, opportunity: 91.5, sector: "L1", tokenomics: "Inflationary · declining schedule", concentration: "Moderate" },
  XRP: { price: "$0.52", quality: 71.8, opportunity: 64.0, sector: "Payments", tokenomics: "Escrow-released supply", concentration: "High · issuer-heavy" },
  DOGE: { price: "$0.123", quality: 58.2, opportunity: 70.4, sector: "Memecoin", tokenomics: "Inflationary · uncapped", concentration: "High" },
  ADA: { price: "$0.38", quality: 76.5, opportunity: 61.2, sector: "L1", tokenomics: "Fixed cap · staking-heavy", concentration: "Moderate" },
  AVAX: { price: "$27.10", quality: 80.1, opportunity: 73.8, sector: "L1", tokenomics: "Capped · burn on fees", concentration: "Moderate" },
  LINK: { price: "$13.45", quality: 84.6, opportunity: 77.9, sector: "Oracle / DeFi", tokenomics: "Fixed supply", concentration: "Moderate" },
  UNI: { price: "$7.82", quality: 82.0, opportunity: 75.1, sector: "DeFi · DEX", tokenomics: "Capped · governance", concentration: "Moderate" },
  AAVE: { price: "$92.40", quality: 85.3, opportunity: 79.6, sector: "DeFi · Lending", tokenomics: "Capped · fee-accruing", concentration: "Moderate" },
  SHIB: { price: "$0.0000172", quality: 49.7, opportunity: 66.8, sector: "Memecoin", tokenomics: "Burn-driven · uncapped", concentration: "Very high" },
  PEPE: { price: "$0.0000094", quality: 41.2, opportunity: 72.3, sector: "Memecoin", tokenomics: "Fixed supply · no utility", concentration: "Very high" },
  USDT: { price: "$1.00", quality: 88.0, opportunity: 30.5, sector: "Stablecoin", tokenomics: "Fiat-backed · centralized", concentration: "Issuer-controlled" },
  USDC: { price: "$1.00", quality: 91.5, opportunity: 31.2, sector: "Stablecoin", tokenomics: "Fiat-backed · attested", concentration: "Issuer-controlled" },
}

// Filterable sector buckets for the Markets terminal.
export type SectorCategory = "L1" | "DeFi" | "Memecoin" | "Stablecoin" | "Other"

const assetCategory: Record<string, SectorCategory> = {
  BTC: "L1", ETH: "L1", SOL: "L1", ADA: "L1", AVAX: "L1",
  LINK: "DeFi", UNI: "DeFi", AAVE: "DeFi",
  DOGE: "Memecoin", SHIB: "Memecoin", PEPE: "Memecoin",
  USDT: "Stablecoin", USDC: "Stablecoin",
  XRP: "Other",
}

export type Asset = {
  symbol: string
  name: string
  price: string
  change: number
  category: SectorCategory
}

// Canonical asset universe surfaced by the Markets terminal.
export const assetUniverse: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", price: "$61,857", change: 2.4, category: "L1" },
  { symbol: "ETH", name: "Ethereum", price: "$3,420", change: 1.1, category: "L1" },
  { symbol: "SOL", name: "Solana", price: "$148.20", change: -3.2, category: "L1" },
  { symbol: "AVAX", name: "Avalanche", price: "$27.10", change: 1.8, category: "L1" },
  { symbol: "ADA", name: "Cardano", price: "$0.38", change: -1.1, category: "L1" },
  { symbol: "LINK", name: "Chainlink", price: "$13.45", change: 0.6, category: "DeFi" },
  { symbol: "UNI", name: "Uniswap", price: "$7.82", change: 2.9, category: "DeFi" },
  { symbol: "AAVE", name: "Aave", price: "$92.40", change: 4.1, category: "DeFi" },
  { symbol: "DOGE", name: "Dogecoin", price: "$0.123", change: 5.7, category: "Memecoin" },
  { symbol: "SHIB", name: "Shiba Inu", price: "$0.0000172", change: 6.4, category: "Memecoin" },
  { symbol: "PEPE", name: "Pepe", price: "$0.0000094", change: -4.8, category: "Memecoin" },
  { symbol: "USDT", name: "Tether", price: "$1.00", change: 0.0, category: "Stablecoin" },
  { symbol: "USDC", name: "USD Coin", price: "$1.00", change: 0.01, category: "Stablecoin" },
  { symbol: "XRP", name: "XRP", price: "$0.52", change: -1.8, category: "Other" },
]

export function categoryOf(symbol: string): SectorCategory {
  return assetCategory[symbol] ?? "Other"
}

const genericMeta: AssetMeta = {
  price: "—",
  quality: 72.0,
  opportunity: 68.0,
  sector: "Mixed basket",
  tokenomics: "Aggregate · varies by asset",
  concentration: "Mixed",
}

const assetRegex = /\b(BTC|ETH|SOL|XRP|DOGE|ADA|AVAX|LINK|bitcoin|ethereum|solana|cardano|avalanche|chainlink|ripple|dogecoin)\b/i

const assetMap: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  cardano: "ADA",
  avalanche: "AVAX",
  chainlink: "LINK",
  ripple: "XRP",
  dogecoin: "DOGE",
}

// Topics that warrant a full judgment dossier.
const marketRegex =
  /\b(btc|eth|sol|xrp|doge|ada|avax|link|bitcoin|ethereum|solana|cardano|avalanche|chainlink|ripple|dogecoin|price|market|bull(?:ish)?|bear(?:ish)?|buy|sell|long|short|whale|inflow|outflow|sentiment|fear|greed|unlock|vesting|emission|pump|dump|outlook|forecast|analy(?:ze|sis)|invest|worth|on-?chain|token|coin|trade|trading|rally|dip|crash|moon|hodl|hold|support|resistance|funding|leverage|liquidat|altcoin|memecoin|defi|cycle|top|bottom)\b/i

const greetingRegex = /\b(hi|hey|hello|yo|sup|good\s*(morning|afternoon|evening)|hallo|servus)\b/i
const capabilityRegex =
  /\b(what can you|who are you|what are you|how do you work|what do you do|help|capabilit|explain yourself|are you)\b/i

function pickAsset(prompt: string): string {
  const m = prompt.match(assetRegex)?.[0]
  if (!m) return "Market"
  return assetMap[m.toLowerCase()] ?? m.toUpperCase()
}

export function buildJudgment(prompt: string): Judgment {
  const template = templates.find((t) => t.match.test(prompt)) ?? templates[templates.length - 1]
  const asset = pickAsset(prompt)
  const meta = assetData[asset] ?? genericMeta
  return {
    asset,
    price: meta.price,
    dataStatus: template.dataStatus,
    verdict: template.verdict,
    confidence: template.confidence,
    thesis: template.thesis,
    signals: template.signals,
    contradictions: template.contradictions,
    coverage: coverageWith(template.coverageOverride),
    breakdown: template.breakdown,
    confirms: template.confirms,
    invalidates: template.invalidates,
    timing: template.timing,
    omni: {
      quality: meta.quality,
      opportunity: meta.opportunity,
      tokenomics: meta.tokenomics,
      concentration: meta.concentration,
      sector: meta.sector,
    },
    closing: template.closing,
  }
}

/**
 * Build the full judgment for a known asset symbol (used by the Markets
 * terminal, where selection is explicit rather than parsed from prose).
 */
export function judgeAsset(symbol: string): Judgment {
  return buildJudgment(`What's your judgment on ${symbol} right now?`)
}

// ---- Per-asset stance for the Markets list ----
export type AssetStance = { verdict: Verdict; confidence: number }

/**
 * Lightweight, stable verdict + confidence for a token, used in the asset
 * list column "that no CoinGecko has". Deterministic per symbol, and varied
 * across assets so the column reads as a real, differentiated opinion.
 */
export function stanceFor(symbol: string): AssetStance {
  const rng = seeded(`${symbol}-stance`)
  const roll = rng()
  const verdict: Verdict =
    roll > 0.72 ? "Bullish" : roll > 0.46 ? "Neutral" : roll > 0.2 ? "Mixed" : "Bearish"
  const confidence = 48 + Math.floor(rng() * 42)
  return { verdict, confidence }
}

// ---- Sparkline series (signal evidence) ----
/**
 * Deterministic mini-series for a signal sparkline. Direction reflects the
 * signal stance so the line visually confirms the claim (rising for bullish,
 * falling for bearish, drifting for neutral).
 */
export function sparkSeries(seed: string, stance: SignalStance, points = 24): number[] {
  const rng = seeded(seed)
  const trend = stance === "Bullish" ? 1 : stance === "Bearish" ? -1 : 0
  const out: number[] = []
  let v = 50
  for (let i = 0; i < points; i++) {
    const drift = trend * (i / points) * 28
    v += (rng() - 0.5) * 14
    out.push(Math.max(2, Math.min(98, 35 + drift + (v - 50) * 0.5)))
  }
  return out
}

// ---- Price history with verdict markers (the auditable timeline) ----
export type PriceMarker = {
  index: number // position in the series
  verdict: Verdict
  outcome: VerdictOutcome
  date: string
  note: string
}

export type Candle = {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type AxisTick = { index: number; label: string }

export type PriceHistory = {
  series: number[]
  candles: Candle[]
  markers: PriceMarker[]
  timeTicks: AxisTick[]
  low: number
  high: number
  maxVolume: number
  points: number
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/**
 * A price series over ~60 days with Coinet's past verdicts pinned as markers.
 * Returns OHLC candles + volume + axis ticks so the terminal can render a
 * professional, TradingView-style chart. This is the visual heart of
 * "verdicts you can audit" (§5.1).
 */
export function priceHistory(symbol: string, basePriceOverride?: number): PriceHistory {
  const meta = assetData[symbol] ?? genericMeta
  const basePrice =
    basePriceOverride ?? (Number((meta.price.match(/[\d.]+/g) ?? ["100"]).join("")) || 100)
  const rng = seeded(`${symbol}-price`)
  const points = 60
  const series: number[] = []
  const candles: Candle[] = []
  let close = basePrice * 0.82

  for (let i = 0; i < points; i++) {
    const momentum = Math.sin(i / 7) * basePrice * 0.04
    const open = close
    const drift = (rng() - 0.46) * basePrice * 0.03 + momentum * 0.05
    close = Math.max(basePrice * 0.5, open + drift)
    const wick = basePrice * 0.012 * (0.5 + rng())
    const high = Math.max(open, close) + wick * (0.4 + rng())
    const low = Math.min(open, close) - wick * (0.4 + rng())
    // Volume swells on bigger moves.
    const volume = (0.4 + rng()) * (1 + Math.abs(drift) / (basePrice * 0.02))
    candles.push({ open, high, low, close, volume })
    series.push(close)
  }
  // Pin the final point near the quoted price.
  series[points - 1] = basePrice
  candles[points - 1].close = basePrice
  candles[points - 1].high = Math.max(candles[points - 1].high, basePrice)
  candles[points - 1].low = Math.min(candles[points - 1].low, basePrice)

  const track = buildTrackRecord(symbol)
  const span = 52 // oldest record daysAgo, mapped across the series
  const markers: PriceMarker[] = track.records.map((r) => ({
    index: Math.round(((span - r.daysAgo) / span) * (points - 1)),
    verdict: r.verdict,
    outcome: r.outcome,
    date: r.date,
    note: r.note,
  }))

  // Build ~5 evenly spaced date ticks across the window (newest = today).
  const today = new Date(2026, 5, 17)
  const timeTicks: AxisTick[] = []
  const tickCount = 5
  for (let t = 0; t < tickCount; t++) {
    const index = Math.round((t / (tickCount - 1)) * (points - 1))
    const daysBack = points - 1 - index
    const d = new Date(today)
    d.setDate(d.getDate() - daysBack)
    timeTicks.push({ index, label: `${MONTHS[d.getMonth()]} ${d.getDate()}` })
  }

  return {
    series,
    candles,
    markers,
    timeTicks,
    low: Math.min(...candles.map((c) => c.low)),
    high: Math.max(...candles.map((c) => c.high)),
    maxVolume: Math.max(...candles.map((c) => c.volume)),
    points,
  }
}

// ---- Market regime ("the weather report", §7) ----
export type MarketRegime = {
  fearGreed: number // 0-100
  fearGreedLabel: string
  totalMcap: string
  mcapChange: number
  btcDominance: number
  ethDominance: number
}

/** Format a numeric price for a chart axis label, scaling precision to size. */
export function formatAxisPrice(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  if (v >= 1) return `$${v.toFixed(2)}`
  if (v >= 0.01) return `$${v.toFixed(3)}`
  // Tiny prices (e.g. SHIB): show significant digits.
  return `$${v.toPrecision(2)}`
}

export function marketRegime(): MarketRegime {
  return {
    fearGreed: 72,
    fearGreedLabel: "Greed",
    totalMcap: "$2.31T",
    mcapChange: 1.8,
    btcDominance: 54.2,
    ethDominance: 17.6,
  }
}

/**
 * Decide whether a prompt deserves a full visual judgment dossier or a
 * lightweight conversational reply. Cards only appear for market topics.
 */
export function analyzePrompt(prompt: string): AssistantReply {
  const text = prompt.trim()

  if (marketRegex.test(text)) {
    return { kind: "judgment", judgment: buildJudgment(text) }
  }

  if (capabilityRegex.test(text)) {
    return {
      kind: "text",
      text: "I'm Coinet — a crypto AI with its own judgment system. Ask me about an asset or market move (e.g. \"Is BTC a buy?\", \"What are whales doing?\", \"How's sentiment?\") and I'll weigh the signals, surface the contradictions, and give you a verdict with my confidence in it.",
    }
  }

  if (greetingRegex.test(text)) {
    return {
      kind: "text",
      text: "Hey — Coinet here. Tell me which token or market question is on your mind and I'll give you my judgment, the signals behind it, and the case against it.",
    }
  }

  return {
    kind: "text",
    text: "I'm built for market judgment — prices, whales, sentiment, unlocks, and on-chain moves. Point me at a token or a market question and I'll weigh the evidence for you.",
  }
}

// Deterministic pseudo-random from a string seed so a token's history is stable.
export function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const verdicts: Verdict[] = ["Bullish", "Bearish", "Neutral", "Mixed"]
const noteByOutcome: Record<VerdictOutcome, string[]> = {
  correct: [
    "Played out — price moved as judged within the window.",
    "Confirmed. The driving signal held and the call resolved in favor.",
    "Right read — the contradiction never triggered.",
  ],
  wrong: [
    "Missed — an external catalyst overrode the on-chain read.",
    "Invalidated. The failure condition hit before the thesis matured.",
    "Off — sentiment flipped faster than the signals priced.",
  ],
  open: ["Still open — within the judgment window, not yet resolved."],
}

const monthDay = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const fmtPrice = (n: number) =>
  n >= 100 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : `$${n.toFixed(n >= 1 ? 2 : 4)}`

/**
 * Build an auditable track record for a token: past Coinet verdicts with the
 * price then, the price now, and whether the call resolved correctly.
 */
export function buildTrackRecord(asset: string): TrackRecord {
  const meta = assetData[asset] ?? genericMeta
  const rng = seeded(asset)
  const basePrice = Number((meta.price.match(/[\d.]+/g) ?? ["100"]).join("")) || 100

  const spans = [2, 9, 17, 26, 38, 52]
  const records: VerdictRecord[] = spans.map((daysAgo, i) => {
    const r = rng()
    const verdict = verdicts[Math.floor(rng() * verdicts.length)]
    const drift = (rng() - 0.5) * 0.45
    const priceThen = basePrice * (1 - drift)
    const outcome: VerdictOutcome = i === 0 ? "open" : r > 0.34 ? "correct" : "wrong"
    return {
      date: monthDay(daysAgo),
      daysAgo,
      verdict,
      confidence: 52 + Math.floor(rng() * 40),
      priceAt: fmtPrice(priceThen),
      priceNow: fmtPrice(basePrice),
      outcome,
      note: noteByOutcome[outcome][Math.floor(rng() * noteByOutcome[outcome].length)],
    }
  })

  const resolved = records.filter((r) => r.outcome !== "open")
  const hits = resolved.filter((r) => r.outcome === "correct").length
  return {
    total: records.length,
    resolved: resolved.length,
    hitRate: resolved.length ? Math.round((hits / resolved.length) * 100) : 0,
    records,
  }
}
