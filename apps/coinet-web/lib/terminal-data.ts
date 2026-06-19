import {
  assetUniverse,
  categoryOf,
  formatAxisPrice,
  judgeAsset,
  buildJudgment,
  buildTrackRecord,
  priceHistory,
  seeded,
  stanceFor,
  type Asset,
  type Judgment,
  type PriceHistory,
  type SectorCategory,
  type TrackRecord,
} from "@/lib/judgment"

// ============================================================================
// Coinet Terminal — universal token resolution + Bloomberg-style panel data.
//
// Any query (symbol, name, or pasted contract address) resolves to a full
// TerminalData bundle. Coins in the built-in universe are "verified"; anything
// else is deterministically *synthesized* and clearly flagged as unverified so
// the user knows the confidence is lower.
// ============================================================================

export type ResolveSource = "verified" | "synthesized"
export type Chain = "Ethereum" | "Solana" | "BNB Chain" | "Base" | "Bitcoin" | "Multichain"

export type TokenProfile = {
  symbol: string
  name: string
  source: ResolveSource
  chain: Chain
  category: SectorCategory
  address?: string
  priceNum: number
  price: string
  change24h: number
  /** Seed used for all deterministic synthesis for this token. */
  seed: string
}

export type KeyStat = { label: string; value: string; sub?: string; tone?: "pos" | "neg" | "neutral" }

export type OnChainMetric = {
  label: string
  value: string
  change: number // pct, drives the trend chip
  detail: string
}

export type HolderBucket = { label: string; pct: number; tone: "ok" | "warn" | "bad" }

export type SecurityCheck = {
  label: string
  status: "pass" | "warn" | "fail"
  detail: string
}

export type Liquidity = {
  totalUsd: string
  pairs: { dex: string; pair: string; liquidity: string; share: number }[]
  lockedPct: number
  depthNote: string
}

export type Sentiment = {
  score: number // 0-100 bullishness
  label: string
  mentions24h: string
  mentionChange: number
  galaxyScore: number
  sources: { label: string; pct: number }[]
}

export type NewsItem = {
  source: string
  time: string
  title: string
  impact: "bullish" | "bearish" | "neutral"
}

export type TerminalData = {
  profile: TokenProfile
  history: PriceHistory
  judgment: Judgment
  track: TrackRecord
  keyStats: KeyStat[]
  onChain: OnChainMetric[]
  holders: { buckets: HolderBucket[]; total: string; top10Pct: number; note: string }
  liquidity: Liquidity
  security: { score: number; checks: SecurityCheck[] }
  sentiment: Sentiment
  news: NewsItem[]
}

// ---- Formatting helpers ----------------------------------------------------

function compactUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function compactNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}

function priceToNum(price: string): number {
  return Number((price.match(/[\d.]+/g) ?? ["0"]).join("")) || 0
}

function formatPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return `$${n.toPrecision(2)}`
}

// ---- Query resolution ------------------------------------------------------

const NAME_BANK = [
  "Aether", "Nova", "Helix", "Quantum", "Vertex", "Lumen", "Pulse", "Orbit",
  "Cipher", "Strato", "Nimbus", "Flux", "Echo", "Zenith", "Mosaic", "Drift",
]
const SUFFIX_BANK = ["Protocol", "Network", "Finance", "DAO", "Labs", "Chain", "AI", "Swap"]

function isAddress(q: string): { is: boolean; chain: Chain } {
  if (/^0x[a-fA-F0-9]{40}$/.test(q)) return { is: true, chain: "Ethereum" }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q) && !/\s/.test(q)) return { is: true, chain: "Solana" }
  return { is: false, chain: "Ethereum" }
}

function findKnown(q: string): Asset | undefined {
  const n = q.trim().toLowerCase()
  return assetUniverse.find(
    (a) => a.symbol.toLowerCase() === n || a.name.toLowerCase() === n,
  )
}

/** Resolve any query string to a token profile. */
export function resolveQuery(query: string): TokenProfile {
  const q = query.trim()
  const known = findKnown(q)
  if (known) {
    const priceNum = priceToNum(known.price)
    return {
      symbol: known.symbol,
      name: known.name,
      source: "verified",
      chain: known.symbol === "BTC" ? "Bitcoin" : known.symbol === "SOL" ? "Solana" : "Ethereum",
      category: known.category,
      priceNum,
      price: known.price,
      change24h: known.change,
      seed: known.symbol,
    }
  }

  // Synthesized (unknown ticker or contract address).
  const addr = isAddress(q)
  const seed = q.toLowerCase()
  const rng = seeded(seed)
  const chain: Chain = addr.is ? addr.chain : (["Ethereum", "Solana", "Base", "BNB Chain"] as Chain[])[Math.floor(rng() * 4)]

  let symbol: string
  let name: string
  if (addr.is) {
    const a = NAME_BANK[Math.floor(rng() * NAME_BANK.length)]
    const b = SUFFIX_BANK[Math.floor(rng() * SUFFIX_BANK.length)]
    name = `${a} ${b}`
    symbol = (a.slice(0, 3) + (Math.floor(rng() * 9) + 1)).toUpperCase()
  } else {
    symbol = q.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "TOKEN"
    const a = NAME_BANK[Math.floor(rng() * NAME_BANK.length)]
    const b = SUFFIX_BANK[Math.floor(rng() * SUFFIX_BANK.length)]
    name = `${a} ${b}`
  }

  // Synthesize a plausible small/mid-cap price.
  const magnitude = Math.floor(rng() * 5) // 0..4
  const priceNum = [rng() * 0.0001, rng() * 0.01, rng() * 1.5, rng() * 40, rng() * 600][magnitude]
  const change24h = Number(((rng() - 0.45) * 24).toFixed(1))

  return {
    symbol,
    name,
    source: "synthesized",
    chain,
    category: "Other",
    address: addr.is ? q : undefined,
    priceNum,
    price: formatPrice(priceNum),
    change24h,
    seed,
  }
}

// ---- Panel builders --------------------------------------------------------

function buildKeyStats(p: TokenProfile): KeyStat[] {
  const rng = seeded(`${p.seed}-stats`)
  const supply = p.source === "verified"
    ? { BTC: 19.7e6, ETH: 120.3e6, SOL: 462e6 }[p.symbol] ?? (1e7 + rng() * 9e9)
    : 1e7 + rng() * 9e9
  const mcap = p.priceNum * supply
  const fdvMult = 1 + rng() * 0.8
  const vol = mcap * (0.02 + rng() * 0.18)
  const ath = p.priceNum * (1.4 + rng() * 6)
  const atl = p.priceNum * (0.02 + rng() * 0.3)
  const fromAth = -((1 - p.priceNum / ath) * 100)

  return [
    { label: "Market cap", value: compactUsd(mcap), sub: p.source === "verified" ? "Verified" : "Est." },
    { label: "24h volume", value: compactUsd(vol), sub: `${(vol / mcap * 100).toFixed(1)}% of cap` },
    { label: "FDV", value: compactUsd(mcap * fdvMult), sub: `${fdvMult.toFixed(2)}x mcap` },
    { label: "Circulating", value: compactNum(supply), sub: `${(60 + rng() * 38).toFixed(0)}% of max` },
    { label: "All-time high", value: formatPrice(ath), sub: `${fromAth.toFixed(0)}%`, tone: "neg" },
    { label: "All-time low", value: formatPrice(atl), sub: `+${((p.priceNum / atl - 1) * 100).toFixed(0)}%`, tone: "pos" },
  ]
}

function buildOnChain(p: TokenProfile): OnChainMetric[] {
  const rng = seeded(`${p.seed}-onchain`)
  const mk = (label: string, base: number, unit: string, detail: string): OnChainMetric => {
    const change = Number(((rng() - 0.42) * 30).toFixed(1))
    const val = base * (0.6 + rng() * 0.8)
    return { label, value: `${compactNum(val)}${unit}`, change, detail }
  }
  return [
    mk("Active addresses", 240000, "", "Unique addresses transacting (24h)"),
    mk("Transactions", 1100000, "", "On-chain transfers (24h)"),
    mk("Net exchange flow", 12000, " coins", "Negative = leaving exchanges (bullish)"),
    mk("Whale holdings", 38, "%", "Share held by top 100 wallets"),
    mk("New addresses", 31000, "", "First-seen addresses (24h)"),
    mk("Avg. fee", 2.4, " USD", "Mean transaction cost (24h)"),
  ]
}

function buildHolders(p: TokenProfile) {
  const rng = seeded(`${p.seed}-holders`)
  // Verified blue-chips are less concentrated; synthesized skews riskier.
  const concentrated = p.source === "synthesized" || ["DOGE", "SHIB", "PEPE", "XRP"].includes(p.symbol)
  const top10 = concentrated ? 42 + rng() * 38 : 14 + rng() * 18
  const top1 = top10 * (0.3 + rng() * 0.2)
  const exchanges = 8 + rng() * 14
  const retail = Math.max(4, 100 - top10 - exchanges)
  const tone = (v: number, w: number, b: number): HolderBucket["tone"] =>
    v >= b ? "bad" : v >= w ? "warn" : "ok"
  return {
    buckets: [
      { label: "Top holder", pct: Number(top1.toFixed(1)), tone: tone(top1, 8, 18) },
      { label: "Top 10 wallets", pct: Number(top10.toFixed(1)), tone: tone(top10, 30, 45) },
      { label: "Exchanges", pct: Number(exchanges.toFixed(1)), tone: "ok" as const },
      { label: "Retail / other", pct: Number(retail.toFixed(1)), tone: "ok" as const },
    ] as HolderBucket[],
    total: compactNum(Math.floor(50000 + rng() * 4_000_000)),
    top10Pct: Number(top10.toFixed(1)),
    note: concentrated
      ? "Concentrated supply — a few wallets can move price sharply."
      : "Broadly distributed — low single-wallet risk.",
  }
}

function buildLiquidity(p: TokenProfile): Liquidity {
  const rng = seeded(`${p.seed}-liq`)
  const total = p.source === "verified" ? 4e8 + rng() * 2e9 : 2e5 + rng() * 8e6
  const dexes = p.chain === "Solana"
    ? [["Raydium", "/SOL"], ["Orca", "/USDC"], ["Meteora", "/USDC"]]
    : [["Uniswap v3", "/WETH"], ["Curve", "/USDC"], ["Balancer", "/WETH"]]
  let remaining = 100
  const pairs = dexes.map(([dex, pair], i) => {
    const share = i === dexes.length - 1 ? remaining : Math.round((20 + rng() * 45))
    remaining -= share
    return { dex, pair: `${p.symbol}${pair}`, liquidity: compactUsd(total * Math.max(share, 1) / 100), share: Math.max(share, 1) }
  })
  return {
    totalUsd: compactUsd(total),
    pairs,
    lockedPct: Number((p.source === "verified" ? 70 + rng() * 28 : 10 + rng() * 70).toFixed(0)),
    depthNote: total > 1e8 ? "Deep — large orders fill with minimal slippage." : "Thin — sizeable orders will move price.",
  }
}

function buildSecurity(p: TokenProfile) {
  const rng = seeded(`${p.seed}-sec`)
  const verified = p.source === "verified"
  const pick = (good: number): SecurityCheck["status"] =>
    rng() < (verified ? 0.92 : good) ? "pass" : rng() < 0.6 ? "warn" : "fail"
  const checks: SecurityCheck[] = [
    { label: "Contract verified", status: verified ? "pass" : pick(0.6), detail: "Source code published & matches bytecode" },
    { label: "Ownership renounced", status: verified ? "pass" : pick(0.45), detail: "No admin can alter the contract" },
    { label: "Mint function", status: verified ? "pass" : pick(0.5), detail: "No arbitrary minting of new supply" },
    { label: "Honeypot / sell tax", status: verified ? "pass" : pick(0.55), detail: "Tokens can be freely sold" },
    { label: "Liquidity locked", status: verified ? "pass" : pick(0.4), detail: "LP tokens locked or burned" },
    { label: "Proxy / upgradeable", status: verified ? "warn" : pick(0.5), detail: "Logic can change post-deploy" },
  ]
  const score = Math.round(
    (checks.filter((c) => c.status === "pass").length / checks.length) * 100,
  )
  return { score, checks }
}

function buildSentiment(p: TokenProfile): Sentiment {
  const rng = seeded(`${p.seed}-sent`)
  const stance = stanceFor(p.symbol)
  const score = stance.verdict === "Bullish" ? 62 + rng() * 30
    : stance.verdict === "Bearish" ? 12 + rng() * 28
    : 40 + rng() * 22
  return {
    score: Math.round(score),
    label: score > 66 ? "Bullish" : score > 45 ? "Neutral" : "Bearish",
    mentions24h: compactNum(Math.floor(1000 + rng() * 90000)),
    mentionChange: Number(((rng() - 0.4) * 120).toFixed(0)),
    galaxyScore: Math.round(40 + rng() * 55),
    sources: [
      { label: "X / Twitter", pct: Math.round(40 + rng() * 25) },
      { label: "Reddit", pct: Math.round(12 + rng() * 18) },
      { label: "News", pct: Math.round(8 + rng() * 14) },
      { label: "YouTube", pct: Math.round(5 + rng() * 12) },
    ],
  }
}

const NEWS_TEMPLATES: { t: (s: string) => string; impact: NewsItem["impact"]; source: string }[] = [
  { t: (s) => `${s} sees record daily active addresses as on-chain usage climbs`, impact: "bullish", source: "The Block" },
  { t: (s) => `Analysts flag rising exchange inflows for ${s}, warn of near-term supply`, impact: "bearish", source: "CoinDesk" },
  { t: (s) => `${s} foundation announces ecosystem grant program`, impact: "bullish", source: "Decrypt" },
  { t: (s) => `Derivatives funding on ${s} turns neutral after week of crowded longs`, impact: "neutral", source: "Kaiko" },
  { t: (s) => `Whale wallet accumulates ${s} during the dip, on-chain data shows`, impact: "bullish", source: "Lookonchain" },
  { t: (s) => `${s} liquidity thins on major venues amid lower volatility`, impact: "bearish", source: "Messari" },
]

function buildNews(p: TokenProfile): NewsItem[] {
  const rng = seeded(`${p.seed}-news`)
  const times = ["12m", "48m", "2h", "5h", "9h", "1d"]
  const idx = [...NEWS_TEMPLATES.keys()].sort(() => rng() - 0.5).slice(0, 5)
  return idx.map((i, k) => ({
    source: NEWS_TEMPLATES[i].source,
    time: times[k],
    title: NEWS_TEMPLATES[i].t(p.name),
    impact: NEWS_TEMPLATES[i].impact,
  }))
}

// ---- Top-level bundle ------------------------------------------------------

export function getTerminalData(query: string): TerminalData {
  const profile = resolveQuery(query)
  const history = priceHistory(profile.seed, profile.priceNum)
  const judgment = profile.source === "verified"
    ? judgeAsset(profile.symbol)
    : buildJudgment(`What's your judgment on ${profile.symbol}?`)
  const track = buildTrackRecord(profile.source === "verified" ? profile.symbol : profile.seed)

  return {
    profile,
    history,
    judgment: { ...judgment, asset: profile.symbol, price: profile.price },
    track,
    keyStats: buildKeyStats(profile),
    onChain: buildOnChain(profile),
    holders: buildHolders(profile),
    liquidity: buildLiquidity(profile),
    security: buildSecurity(profile),
    sentiment: buildSentiment(profile),
    news: buildNews(profile),
  }
}

export { categoryOf, formatAxisPrice }
export type { Asset, SectorCategory }
