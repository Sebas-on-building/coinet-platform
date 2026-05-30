/**
 * AJP.1 — Synthetic ProduceJudgmentInput Fixtures
 *
 * §11 / §12 / §13 / §14 / §15 — Four episode families + 20-run corpus.
 * Each fixture builds a deterministic SignalSnapshot variant that drives
 * services/judgment/produceJudgment() through a meaningful active path.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import type { SignalSnapshot } from '../../services/judgment/types';
import type { ProduceJudgmentInput } from '../../services/judgment';
import { BridgeEpisodeFamily } from '../bridge-certification/contracts/bridge-synthetic-episode';

const POLICY_V = 'ajp1.v1';

// ── Per-episode signal templates ─────────────────────────────────

function solxSpotLed(variant = 0): SignalSnapshot {
  // Constructive spot-led continuation; vary mildly.
  const v = (n: number, delta = 0) => Math.max(0, Math.min(1, n + delta * 0.05));
  return {
    price_momentum_24h: v(0.55, variant),
    price_momentum_1h: v(0.4, variant),
    volume_24h: v(0.7, variant),
    buy_sell_ratio: v(0.65, variant),
    liquidity: v(0.75, variant),
    pair_age_hours: 720,
    leverage_pressure: v(0.2, variant),
    funding_rate: v(0.12, variant),
    liquidation_density: v(0.15, variant),
    fundamentals_strength: v(0.6, variant),
    tvl_trend: v(0.55, variant),
    revenue_quality: v(0.5, variant),
    whale_activity: v(0.55, variant),
    exchange_inflow: v(0.3, variant),
    exchange_outflow: v(0.55, variant),
    security_risk: v(0.2, variant),
    holder_concentration: v(0.35, variant),
    narrative_intensity: v(0.5, variant),
    sentiment: v(0.6, variant),
    unlock_pressure: v(0.15, variant),
    data_completeness: 0.85,
    data_freshness: 0.9,
  };
}

function levaFragility(variant = 0): SignalSnapshot {
  const v = (n: number, delta = 0) => Math.max(0, Math.min(1, n + delta * 0.05));
  return {
    price_momentum_24h: v(0.45, variant),
    price_momentum_1h: v(0.2, variant),
    volume_24h: v(0.55, variant),
    buy_sell_ratio: v(0.5, variant),
    liquidity: v(0.4, variant),
    pair_age_hours: 420,
    leverage_pressure: v(0.75, variant),       // high leverage
    funding_rate: v(0.85, variant),            // hot funding
    liquidation_density: v(0.6, variant),
    fundamentals_strength: v(0.4, variant),
    tvl_trend: v(0.35, variant),
    revenue_quality: v(0.35, variant),
    whale_activity: v(0.6, variant),
    exchange_inflow: v(0.7, variant),          // inflows rising (distribution)
    exchange_outflow: v(0.35, variant),
    security_risk: v(0.3, variant),
    holder_concentration: v(0.5, variant),
    narrative_intensity: v(0.55, variant),
    sentiment: v(0.55, variant),
    unlock_pressure: v(0.2, variant),
    data_completeness: 0.8,
    data_freshness: 0.85,
  };
}

function unlkPostUnlock(variant = 0): SignalSnapshot {
  const v = (n: number, delta = 0) => Math.max(0, Math.min(1, n + delta * 0.05));
  return {
    price_momentum_24h: v(0.4, variant),
    price_momentum_1h: v(0.35, variant),
    volume_24h: v(0.6, variant),
    buy_sell_ratio: v(0.55, variant),
    liquidity: v(0.5, variant),
    pair_age_hours: 8760,
    leverage_pressure: v(0.3, variant),
    funding_rate: v(0.3, variant),
    liquidation_density: v(0.25, variant),
    fundamentals_strength: v(0.55, variant),
    tvl_trend: v(0.45, variant),
    revenue_quality: v(0.5, variant),
    whale_activity: v(0.65, variant),          // whales active post-unlock
    exchange_inflow: v(0.55, variant),
    exchange_outflow: v(0.45, variant),
    security_risk: v(0.25, variant),
    holder_concentration: v(0.4, variant),
    narrative_intensity: v(0.45, variant),
    sentiment: v(0.5, variant),
    unlock_pressure: v(0.85, variant),         // unlock event dominant
    data_completeness: 0.75,
    data_freshness: 0.7,
  };
}

function mockusdAmbiguous(variant = 0): SignalSnapshot {
  // Sparse / ambiguous data to test active product behavior under uncertainty.
  const v = (n: number, delta = 0) => Math.max(0, Math.min(1, n + delta * 0.05));
  const missing = new Set<string>([
    'fundamentals', 'tvl', 'whale_activity', 'narrative', 'unlock',
  ]);
  return {
    price_momentum_24h: v(0.45, variant),
    price_momentum_1h: v(0.45, variant),
    volume_24h: v(0.4, variant),
    buy_sell_ratio: v(0.5, variant),
    liquidity: v(0.45, variant),
    pair_age_hours: null,
    leverage_pressure: v(0.4, variant),
    funding_rate: v(0.45, variant),
    liquidation_density: v(0.4, variant),
    fundamentals_strength: 0.5,    // defaulted
    tvl_trend: 0.5,                // defaulted
    revenue_quality: 0.5,          // defaulted
    whale_activity: 0.5,           // defaulted
    exchange_inflow: 0.5,          // defaulted
    exchange_outflow: 0.5,
    security_risk: 0.4,
    holder_concentration: 0.5,
    narrative_intensity: 0.5,
    sentiment: 0.5,
    unlock_pressure: 0.5,
    data_completeness: 0.4,         // very low coverage
    data_freshness: 0.6,
    _missing: missing,
  };
}

// ── Episode fixture builders ─────────────────────────────────────

export function buildAjp1Input(family: BridgeEpisodeFamily, variant = 0): ProduceJudgmentInput {
  let signals: SignalSnapshot;
  let symbol: string;
  let entityId: string;
  let chain: string | null;
  let marketWide: Partial<{
    macro_regime: string;
    ecosystem_chain: string;
    sector: string;
    capBucket: string;
  }>;

  switch (family) {
    case BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION:
      signals = solxSpotLed(variant);
      symbol = 'SOLX';
      entityId = `synthetic.SOLX.v${variant}`;
      chain = 'solana';
      marketWide = { ecosystem_chain: 'solana', sector: 'L1', capBucket: 'large' };
      break;
    case BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION:
      signals = levaFragility(variant);
      symbol = 'LEVA';
      entityId = `synthetic.LEVA.v${variant}`;
      chain = 'ethereum';
      marketWide = { ecosystem_chain: 'ethereum', sector: 'DeFi', capBucket: 'mid' };
      break;
    case BridgeEpisodeFamily.UNLK_POST_UNLOCK_DIGESTION:
      signals = unlkPostUnlock(variant);
      symbol = 'UNLK';
      entityId = `synthetic.UNLK.v${variant}`;
      chain = 'ethereum';
      marketWide = { ecosystem_chain: 'ethereum', sector: 'Infrastructure', capBucket: 'mid' };
      break;
    case BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION:
      signals = mockusdAmbiguous(variant);
      symbol = 'MOCKUSD';
      entityId = `synthetic.MOCKUSD.v${variant}`;
      chain = null; // ambiguous chain context
      marketWide = {};
      break;
  }

  return {
    entity_id: entityId,
    symbol,
    chain,
    signals,
    marketWide: marketWide as any,
    scores: { qs: 0.5, os: 0.5, risk: 0.4, pos: 0.5 },
  };
}

// ── Corpus (20 deterministic runs) ───────────────────────────────

export interface Ajp1CorpusEntry {
  readonly run_id: string;
  readonly family: BridgeEpisodeFamily;
  readonly variant: number;
  readonly input: ProduceJudgmentInput;
}

export function buildAjp1Corpus(): readonly Ajp1CorpusEntry[] {
  const out: Ajp1CorpusEntry[] = [];
  const families: ReadonlyArray<[BridgeEpisodeFamily, number]> = [
    [BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION, 5],
    [BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION, 5],
    [BridgeEpisodeFamily.UNLK_POST_UNLOCK_DIGESTION, 5],
    [BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION, 5],
  ];
  for (const [family, count] of families) {
    for (let v = 0; v < count; v++) {
      const input = buildAjp1Input(family, v);
      const run_id = `ajp1.run.${fnv1a([family, String(v), POLICY_V].join('|'))}`;
      out.push({ run_id, family, variant: v, input });
    }
  }
  return out;
}
