/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     SIGNAL SNAPSHOT — Normalized input for all Judgment Engines                ║
 * ║                                                                               ║
 * ║   All values are normalized to 0–1 (or -1–1 for directional metrics).         ║
 * ║   This snapshot is built from Evidence Pack / OmniScore DataPoints.            ║
 * ║   Every engine consumes this, never raw provider data.                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { SignalSnapshot } from './types';

export type { SignalSnapshot } from './types';

/**
 * Build a SignalSnapshot from Evidence Pack modules and OmniScore data.
 *
 * This is the adapter between raw provider data and the judgment engines.
 * Values are clamped and normalized; missing data defaults to neutral (0.5)
 * or zero depending on the metric's semantics.
 */
export function buildSignalSnapshot(input: {
  dexscreener?: {
    price_change_24h?: number;
    price_change_1h?: number;
    volume_24h_usd?: number;
    liquidity_usd?: number;
    pair_age_hours?: number;
    txns_buys_24h?: number;
    txns_sells_24h?: number;
  };
  derivatives?: {
    open_interest_usd?: number;
    open_interest_change_24h?: number;
    funding_rate?: number;
    liquidations_24h_usd?: number;
    long_short_ratio?: number;
  };
  security?: {
    risk_score?: number;
    is_honeypot?: boolean;
    top_10_percentage?: number;
  };
  holders?: {
    total_holders?: number;
    top_10_percentage?: number;
    concentration_risk?: string;
  };
  sentiment?: {
    score?: number;
    volume_mentions_24h?: number;
    social_dominance?: number;
  };
  news?: {
    overall_sentiment?: string;
    has_critical_news?: boolean;
    item_count?: number;
  };
  onchain?: {
    whale_net_flow_24h?: number;
    exchange_inflow_24h?: number;
    exchange_outflow_24h?: number;
    active_addresses_24h?: number;
  };
  protocol?: {
    tvl_usd?: number;
    fees_usd?: number;
    revenue_usd?: number;
  };
  unlock?: {
    next_unlock_usd?: number;
    market_cap_usd?: number;
  };
  coverage?: {
    available_count: number;
    total_count: number;
    stale_count: number;
  };
}): SignalSnapshot {
  const d = input.dexscreener ?? {};
  const der = input.derivatives ?? {};
  const sec = input.security ?? {};
  const hld = input.holders ?? {};
  const sent = input.sentiment ?? {};
  const news = input.news ?? {};
  const oc = input.onchain ?? {};
  const proto = input.protocol ?? {};
  const unlock = input.unlock ?? {};
  const cov = input.coverage ?? { available_count: 0, total_count: 8, stale_count: 0 };

  const _missing = new Set<string>();
  if (!input.dexscreener) _missing.add('market');
  if (!input.derivatives) _missing.add('derivatives');
  if (!input.security) _missing.add('security');
  if (!input.holders) _missing.add('holders');
  if (!input.sentiment) _missing.add('sentiment');
  if (!input.news) _missing.add('news');
  if (!input.onchain) _missing.add('onchain');
  if (!input.protocol) _missing.add('protocol');
  if (!input.unlock) _missing.add('unlock');

  const buys = d.txns_buys_24h ?? 0;
  const sells = d.txns_sells_24h ?? 0;
  const totalTxns = buys + sells;

  const fundingNorm = der.funding_rate != null
    ? clamp((der.funding_rate + 0.1) / 0.2, 0, 1)
    : 0.5;

  const oiChange = der.open_interest_change_24h ?? 0;
  const leverageComposite = clamp(
    (fundingNorm * 0.4) +
    (clamp(oiChange / 50, 0, 1) * 0.4) +
    ((der.long_short_ratio != null ? clamp((der.long_short_ratio - 0.5) / 2, 0, 1) : 0.5) * 0.2),
    0, 1
  );

  const liqDensity = der.liquidations_24h_usd != null
    ? clamp(der.liquidations_24h_usd / 10_000_000, 0, 1)
    : 0;

  const tvlSignal = proto.tvl_usd != null ? clamp(proto.tvl_usd / 100_000_000, 0, 1) : 0;
  const feeSignal = proto.fees_usd != null ? clamp(proto.fees_usd / 1_000_000, 0, 1) : 0;
  const revSignal = proto.revenue_usd != null ? clamp(proto.revenue_usd / 500_000, 0, 1) : 0;
  const addressSignal = oc.active_addresses_24h != null
    ? clamp(oc.active_addresses_24h / 50_000, 0, 1)
    : 0;
  const fundamentalsStrength = (tvlSignal * 0.3 + feeSignal * 0.25 + revSignal * 0.25 + addressSignal * 0.2);

  const whaleNet = oc.whale_net_flow_24h ?? 0;
  const whaleActivity = clamp((whaleNet + 1_000_000) / 2_000_000, 0, 1);

  const exIn = oc.exchange_inflow_24h ?? 0;
  const exOut = oc.exchange_outflow_24h ?? 0;

  const sentimentScore = sent.score ?? 0;
  const newsIntensity = news.item_count != null ? clamp(news.item_count / 10, 0, 1) : 0;
  const socialDom = sent.social_dominance != null ? clamp(sent.social_dominance / 10, 0, 1) : 0;
  const narrativeIntensity = clamp(
    (newsIntensity * 0.4 + socialDom * 0.3 + (sent.volume_mentions_24h != null ? clamp(sent.volume_mentions_24h / 1000, 0, 1) : 0) * 0.3),
    0, 1
  );

  const unlockPressure = unlock.next_unlock_usd != null && unlock.market_cap_usd != null && unlock.market_cap_usd > 0
    ? clamp(unlock.next_unlock_usd / unlock.market_cap_usd, 0, 1)
    : 0;

  const holderConc = hld.top_10_percentage != null
    ? clamp(hld.top_10_percentage / 100, 0, 1)
    : (sec.top_10_percentage != null ? clamp(sec.top_10_percentage / 100, 0, 1) : 0.5);

  return {
    price_momentum_24h: clamp((d.price_change_24h ?? 0) / 30, -1, 1),
    price_momentum_1h: clamp((d.price_change_1h ?? 0) / 10, -1, 1),
    volume_24h: clamp((d.volume_24h_usd ?? 0) / 10_000_000, 0, 1),
    buy_sell_ratio: totalTxns > 0 ? buys / totalTxns : 0.5,

    liquidity: clamp((d.liquidity_usd ?? 0) / 5_000_000, 0, 1),
    pair_age_hours: d.pair_age_hours ?? null,

    leverage_pressure: leverageComposite,
    funding_rate: fundingNorm,
    liquidation_density: liqDensity,

    fundamentals_strength: fundamentalsStrength,
    tvl_trend: tvlSignal,
    revenue_quality: (feeSignal + revSignal) / 2,

    whale_activity: whaleActivity,
    exchange_inflow: clamp(exIn / 5_000_000, 0, 1),
    exchange_outflow: clamp(exOut / 5_000_000, 0, 1),

    security_risk: sec.risk_score != null ? clamp(sec.risk_score / 100, 0, 1) : 0.5,
    holder_concentration: holderConc,

    narrative_intensity: narrativeIntensity,
    sentiment: clamp(sentimentScore, -1, 1),

    unlock_pressure: unlockPressure,

    data_completeness: cov.total_count > 0 ? cov.available_count / cov.total_count : 0,
    data_freshness: cov.total_count > 0
      ? (cov.available_count - cov.stale_count) / cov.total_count
      : 0,

    _missing,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
