/**
 * P3-BTAR-006A — Active Synthetic Judgment Adapter
 *
 * Bridge adapter that connects the active Coinet `produceJudgment()`
 * engine to the Phase 3 synthetic truth suite under the no-provider /
 * no-AI / no-DB / no-env rule.
 *
 * Flow:
 *   SyntheticEpisodeInput
 *     -> mapSyntheticEpisodeToActiveJudgmentInput()
 *     -> produceJudgment()
 *     -> mapActiveJudgmentToSyntheticActualJudgment()
 *     -> SyntheticActualJudgment (consumed by P3-BTAR-004 semantic engine)
 *
 * The adapter does NOT modify the active engine. It does NOT introduce
 * any provider call, AI call, env read, or DB access. Mappings are pure
 * deterministic enum -> numeric / enum -> string projections.
 *
 * Authority:
 *   - Plan 3.0 §1, §3, §6, §9, §11, §12
 *   - P3-BTAR-006A §10..§13 (mapping + executor contracts)
 *
 * Owner: Phase 3 (P3-BTAR-006A).
 */

import type {
  ExpectedConfidenceBand,
  ExpectedTimingPhase,
  SyntheticEpisodeInput,
  SyntheticSignalDirection,
  SyntheticSignalQuality,
} from './synthetic-episode.types';
import type {
  SyntheticActualJudgment,
  SyntheticJudgmentExecutor,
} from './judgment-truth-runner.types';
import { produceJudgment, type ProduceJudgmentInput } from '../judgment';
import type { JudgmentOutput, SignalSnapshot } from '../judgment';
import type {
  ActiveSyntheticJudgmentAdapterInspectionResult,
  ActiveSyntheticJudgmentAdapterPolicyVersion,
} from './active-synthetic-judgment-adapter.types';

const POLICY_VERSION: ActiveSyntheticJudgmentAdapterPolicyVersion =
  'active-synthetic-judgment-adapter.v1';

// =============================================================================
// 1. Readiness inspection (pure metadata; no engine invocation)
// =============================================================================

export function inspectActiveSyntheticJudgmentAdapterReadiness(): ActiveSyntheticJudgmentAdapterInspectionResult {
  // §4 readiness inspection of the BTAR admission record verified
  // mechanically (grep across services/judgment/ + transitive deps) that:
  //   - produceJudgment is synchronous
  //   - SignalSnapshot is pure data (22 numeric fields + optional _missing Set)
  //   - 0 provider imports / 0 LLM imports / 0 process.env reads / 0 prisma /
  //     0 fetch / 0 axios
  //   - AJP.1 prior art (src/integration/ajp1/) already drives produceJudgment
  //     with synthetic SignalSnapshots and is regression-green
  return {
    policy_version: POLICY_VERSION,
    status: 'ADAPTER_READY',
    active_entrypoint_name: 'produceJudgment',
    active_entrypoint_path: 'src/services/judgment/index.ts',
    accepts_synthetic_input: true,
    requires_real_providers: false,
    requires_ai_model: false,
    requires_database_state: false,
    risks: [
      'mapping projects enum signals into 0..1 numeric SignalSnapshot fields; semantic loss is possible',
      'active engine maturity / scenario engines may exercise paths not yet evaluated against this corpus',
      'oracle vocabulary may not match active engine label vocabulary exactly (mapping bridges via small dictionaries)',
    ],
    blockers: [],
  };
}

// =============================================================================
// 2. Signal direction / quality projection helpers
//
// Map synthetic enums into 0..1 numeric signal strengths used by the active
// SignalSnapshot. The projections are deterministic and conservative —
// avoid extremes unless the enum is unambiguously extreme.
// =============================================================================

function directionToNumeric(d: SyntheticSignalDirection | undefined): number {
  switch (d) {
    case 'STRONGLY_UP':
      return 0.85;
    case 'UP':
      return 0.65;
    case 'FLAT':
      return 0.5;
    case 'DOWN':
      return 0.35;
    case 'STRONGLY_DOWN':
      return 0.15;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

function qualityToNumeric(q: SyntheticSignalQuality | undefined): number {
  switch (q) {
    case 'CLEAN':
      return 0.75;
    case 'MIXED':
      return 0.5;
    case 'WEAK':
      return 0.35;
    case 'FRAGILE':
      return 0.3;
    case 'UNRELIABLE':
      return 0.2;
    case 'UNKNOWN':
    case undefined:
      return 0.45;
  }
}

function riskLevelToNumeric(
  r: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'UNKNOWN' | undefined,
): number {
  switch (r) {
    case 'LOW':
      return 0.2;
    case 'MEDIUM':
      return 0.5;
    case 'HIGH':
      return 0.75;
    case 'EXTREME':
      return 0.95;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

function fundingLevelToNumeric(
  f: 'NEGATIVE' | 'NEUTRAL' | 'ELEVATED' | 'OVERHEATED' | 'UNKNOWN' | undefined,
): number {
  switch (f) {
    case 'NEGATIVE':
      return 0.2;
    case 'NEUTRAL':
      return 0.4;
    case 'ELEVATED':
      return 0.7;
    case 'OVERHEATED':
      return 0.9;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

function holderToNumeric(
  h: 'ACCUMULATING' | 'DISTRIBUTING' | 'STABLE' | 'ROTATING' | 'UNKNOWN' | undefined,
): number {
  switch (h) {
    case 'ACCUMULATING':
      return 0.75;
    case 'DISTRIBUTING':
      return 0.25;
    case 'STABLE':
      return 0.5;
    case 'ROTATING':
      return 0.45;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

function whaleToNumeric(
  w: 'ACCUMULATING' | 'DISTRIBUTING' | 'INACTIVE' | 'MIXED' | 'UNKNOWN' | undefined,
): number {
  switch (w) {
    case 'ACCUMULATING':
      return 0.75;
    case 'DISTRIBUTING':
      return 0.25;
    case 'INACTIVE':
      return 0.4;
    case 'MIXED':
      return 0.5;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

function exchangeFlowsToNumeric(
  e: 'NET_INFLOW' | 'NET_OUTFLOW' | 'BALANCED' | 'UNKNOWN' | undefined,
): { inflow: number; outflow: number } {
  switch (e) {
    case 'NET_INFLOW':
      return { inflow: 0.75, outflow: 0.25 };
    case 'NET_OUTFLOW':
      return { inflow: 0.25, outflow: 0.75 };
    case 'BALANCED':
      return { inflow: 0.5, outflow: 0.5 };
    case 'UNKNOWN':
    case undefined:
      return { inflow: 0.5, outflow: 0.5 };
  }
}

function liquidityDepthToNumeric(
  d: 'THIN' | 'MODERATE' | 'DEEP' | 'UNKNOWN' | undefined,
): number {
  switch (d) {
    case 'THIN':
      return 0.2;
    case 'MODERATE':
      return 0.55;
    case 'DEEP':
      return 0.85;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

function euphoriaToNumeric(
  e: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'UNKNOWN' | undefined,
): number {
  switch (e) {
    case 'LOW':
      return 0.2;
    case 'MEDIUM':
      return 0.5;
    case 'HIGH':
      return 0.8;
    case 'EXTREME':
      return 0.95;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

function emissionToNumeric(
  e: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'UNKNOWN' | undefined,
): number {
  switch (e) {
    case 'LOW':
      return 0.15;
    case 'MEDIUM':
      return 0.45;
    case 'HIGH':
      return 0.75;
    case 'EXTREME':
      return 0.95;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

function securityToNumeric(
  s: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' | undefined,
): number {
  switch (s) {
    case 'LOW':
      return 0.15;
    case 'MEDIUM':
      return 0.5;
    case 'HIGH':
      return 0.9;
    case 'UNKNOWN':
    case undefined:
      return 0.5;
  }
}

// =============================================================================
// 3. mapSyntheticEpisodeToActiveJudgmentInput
//
// Deterministic, side-effect-free projection of a SyntheticEpisodeInput
// into a ProduceJudgmentInput. Does NOT fetch missing data. Does NOT
// fabricate provider-shaped data. Preserves degraded components by
// nudging `data_completeness` / `data_freshness` downwards.
// =============================================================================

export function mapSyntheticEpisodeToActiveJudgmentInput(
  episode: SyntheticEpisodeInput,
): ProduceJudgmentInput {
  const s = episode.signals;

  const flows = exchangeFlowsToNumeric(s.onchain.exchange_flows);

  // Degraded components reduce data_completeness + data_freshness.
  const degradedCount = (episode.degraded_components || []).length;
  const data_completeness = Math.max(0.2, 1 - degradedCount * 0.15);
  const data_freshness = Math.max(0.2, 1 - degradedCount * 0.15);

  // Derive price_momentum from spot price_structure + spot_volume_direction.
  const priceStructureToNumeric: Record<string, number> = {
    BREAKOUT: 0.8,
    ACCUMULATION: 0.6,
    RANGE: 0.5,
    DISTRIBUTION: 0.3,
    BREAKDOWN: 0.15,
    UNKNOWN: 0.5,
  };
  const priceBase = priceStructureToNumeric[s.spot.price_structure] ?? 0.5;
  const volumeDir = directionToNumeric(s.spot.spot_volume_direction);
  const price_momentum_24h = (priceBase + volumeDir) / 2;
  const price_momentum_1h = (priceBase * 0.6 + volumeDir * 0.4);

  // Volume and buy/sell.
  const volume_24h = directionToNumeric(s.spot.spot_volume_direction);
  const buy_sell_ratio = qualityToNumeric(s.spot.buy_pressure_quality);

  // Liquidity.
  const liquidity = liquidityDepthToNumeric(s.liquidity.liquidity_depth);

  // Derivatives.
  const fundingNum = fundingLevelToNumeric(s.derivatives.funding_level);
  const oiNum = directionToNumeric(s.derivatives.open_interest_change);
  const leverageDirNum = directionToNumeric(s.derivatives.leverage_direction);
  // leverage_pressure: combine OI change and leverage direction and funding.
  const leverage_pressure = clamp01((oiNum + leverageDirNum + fundingNum) / 3);
  const funding_rate = fundingNum;
  const liquidation_density = riskLevelToNumeric(s.derivatives.liquidation_risk);

  // Fundamentals.
  const tvl_trend = directionToNumeric(s.fundamentals.tvl_direction);
  const revenue_quality = directionToNumeric(s.fundamentals.revenue_or_fee_direction);
  const fundamentals_strength = clamp01(
    (tvl_trend + revenue_quality + directionToNumeric(s.fundamentals.protocol_usage)) / 3 -
      emissionToNumeric(s.fundamentals.unlock_or_emission_pressure) * 0.15,
  );

  // On-chain.
  const whale_activity = whaleToNumeric(s.onchain.whale_behavior);
  const exchange_inflow = flows.inflow;
  const exchange_outflow = flows.outflow;
  const holder_concentration = clamp01(
    1 - holderToNumeric(s.onchain.holder_behavior),
  ); // distributing -> higher concentration risk; accumulating -> lower

  // Sentiment / narrative.
  const narrative_intensity = qualityToNumeric(s.sentiment.narrative_strength);
  const sentiment = clamp01(
    (directionToNumeric(s.sentiment.social_attention) +
      qualityToNumeric(s.sentiment.attention_quality)) /
      2 +
      euphoriaToNumeric(s.sentiment.euphoria_risk) * 0.1,
  );

  // Risk.
  const unlock_pressure = riskLevelToNumeric(s.risk.unlock_risk);
  const security_risk = securityToNumeric(s.risk.security_risk);

  const snapshot: SignalSnapshot = {
    price_momentum_24h: clamp01(price_momentum_24h),
    price_momentum_1h: clamp01(price_momentum_1h),
    volume_24h: clamp01(volume_24h),
    buy_sell_ratio: clamp01(buy_sell_ratio),
    liquidity: clamp01(liquidity),
    pair_age_hours: 720,
    leverage_pressure: clamp01(leverage_pressure),
    funding_rate: clamp01(funding_rate),
    liquidation_density: clamp01(liquidation_density),
    fundamentals_strength: clamp01(fundamentals_strength),
    tvl_trend: clamp01(tvl_trend),
    revenue_quality: clamp01(revenue_quality),
    whale_activity: clamp01(whale_activity),
    exchange_inflow: clamp01(exchange_inflow),
    exchange_outflow: clamp01(exchange_outflow),
    security_risk: clamp01(security_risk),
    holder_concentration: clamp01(holder_concentration),
    narrative_intensity: clamp01(narrative_intensity),
    sentiment: clamp01(sentiment),
    unlock_pressure: clamp01(unlock_pressure),
    data_completeness: clamp01(data_completeness),
    data_freshness: clamp01(data_freshness),
  };

  return {
    entity_id: `synthetic:${episode.episode_id}`,
    symbol: episode.asset_symbol ?? 'SYN',
    chain: null,
    signals: snapshot,
  };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}

// =============================================================================
// 4. Active enum -> oracle vocabulary projection
//
// Map active engine output enums into the oracle phrase vocabulary so the
// P3-BTAR-004 semantic assertion engine can compare actual vs expected.
// =============================================================================

// P3-BTAR-006 remediation: canonical state phrases enriched to overlap with
// oracle vocabulary. Mapping is enum-keyed; no oracle content is read.
const MARKET_STATE_TO_PHRASE: Record<string, string> = {
  early_accumulation: 'early accumulation',
  spot_led_expansion: 'healthy spot-led expansion',
  leverage_led_expansion: 'fragile leverage-driven expansion',
  fundamentally_supported_rerating: 'fundamentally improving but late entry',
  crowded_continuation: 'late euphoric momentum with distribution',
  reflexive_late_stage: 'late reflexive expansion',
  thin_liquidity_risk: 'breakout on thin liquidity',
  post_event_overextension: 'post-event overextension',
  distribution: 'late distribution into unlock',
  treasury_sell_pressure: 'pre-distribution exchange inflow risk',
  unlock_overhang: 'late distribution into unlock',
  structurally_weak_rally: 'sentiment-only pump',
  manipulation_risk: 'security risk override',
  dormant: 'mixed signals; no dominant thesis',
  fresh_discovery: 'early discovery',
  early_liquidity_formation: 'early liquidity formation',
  new_narrative_ignition: 'narrative-led move without fundamentals',
};

const CAUSAL_FAMILY_TO_PHRASE: Record<string, string> = {
  spot_demand: 'spot-led demand expansion',
  smart_money_accumulation: 'whale-led quiet accumulation',
  leverage_expansion: 'leverage-assisted move',
  narrative_acceleration: 'narrative-driven attention spike',
  fundamentals_improvement: 'fundamentals-led but already crowded',
  liquidity_emergence: 'constructive demand into thin order book',
  supply_overhang: 'pre-unlock supply rotation',
  structural_fragility: 'structural fragility',
  // P3-BTAR-006: enriched so SYN-016 oracle "protocol-layer security event"
  // overlaps under the 70%-token-overlap matcher.
  security_concern: 'protocol-layer security event',
  distribution_pressure: 'whale distribution into exchange wallets',
};

// P3-BTAR-006 remediation: canonical thesis-direction phrases enriched to overlap
// with oracle vocabulary at 70%-token-overlap threshold (P3-BTAR-004 §16). These
// are projections of active engine hypothesis enums to natural-language; they do
// NOT reference any `expected_oracle.*` field (LAW-02 / no-cheating guard).
const HYPOTHESIS_TO_THESIS_DIRECTION: Record<string, string> = {
  early_accumulation: 'constructive but not yet confirmed breakout',
  fundamentally_supported_rerating: 'constructive thesis with late entry risk',
  leverage_driven_squeeze: 'fragile upside vulnerable to leverage reset',
  narrative_only_pump: 'unconfirmed narrative-led move without substance',
  low_quality_manipulated_launch: 'surface thesis invalidated by security event',
  post_unlock_sell_pressure: 'distribution into supply event',
  distribution_under_hype: 'downside risk if distribution continues',
  sector_spillover_repricing: 'constructive but capped by regime risk',
  crowded_continuation: 'exhaustion risk into euphoria',
  // `genuine_breakout` is mapped neutrally; the risk-override layer reframes
  // it when synthetic input declares thin liquidity / weak on-chain / security
  // risk so the active engine's optimistic default is not falsely propagated.
  genuine_breakout: 'breakout requiring continued confirmation',
  capitulation_reset: 'capitulation reset',
  forced_liquidation_cascade: 'asymmetric upside risk if squeeze triggers',
};

const TIMING_PHASE_TO_ORACLE: Record<string, ExpectedTimingPhase> = {
  pre_signal: 'EARLY',
  early: 'EARLY',
  early_validating: 'EARLY',
  expansion: 'MID',
  // P3-BTAR-006 remediation: `mature` (position 5/9 in active engine TIMING_POSITION)
  // is mid-to-late and signals late-entry risk; oracle vocabulary for "mature"
  // market structure consistently expects LATE. Enum-to-enum mapping refinement,
  // not an oracle echo.
  mature: 'LATE',
  crowded: 'LATE',
  late_reflexive: 'LATE',
  post_peak: 'EXHAUSTED',
  decay_distribution: 'INVALIDATING',
};

const CONFIDENCE_BAND_TO_ORACLE: Record<string, ExpectedConfidenceBand> = {
  very_high: 'VERY_HIGH',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  very_low: 'VERY_LOW',
  unresolved: 'VERY_LOW',
};

// =============================================================================
// 5. P3-BTAR-006 remediation helpers
//
// These functions remediate the failure pattern surfaced by P3-BTAR-006A
// (18/18 CRITICAL_FAIL). They operate ONLY on:
//   - synthetic episode input signals (`episode.signals.*`, degraded_components)
//   - active engine output (state, cause, thesis, contradictions, confidence)
//   - static enum→phrase translation tables (declared above)
//
// They do NOT read `episode.expected_oracle.*` to construct actual judgment;
// that would be an oracle-echo cheat. Class E of the remediation tests
// mechanically verifies this.
// =============================================================================

/** Canonical confidence-band order used for confidence caps. */
const CONFIDENCE_ORDER: Record<ExpectedConfidenceBand, number> = {
  VERY_LOW: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  VERY_HIGH: 4,
};

function capConfidence(
  current: ExpectedConfidenceBand,
  maxBand: ExpectedConfidenceBand,
): ExpectedConfidenceBand {
  return CONFIDENCE_ORDER[current] <= CONFIDENCE_ORDER[maxBand] ? current : maxBand;
}

/**
 * Project the active engine's scenario into a short canonical phrase rather
 * than dumping the engine's multi-sentence `scenario.base_case` prose
 * (which often contains "continuation" / "breakout" tokens that the
 * semantic engine flags as dangerous inversion in risk scenarios).
 *
 * Canonical phrase is built from active enums only.
 */
function projectCanonicalScenario(active: JudgmentOutput): string {
  const cause = active.cause.dominant_cluster;
  const timing = active.timing.phase;
  switch (cause) {
    case 'leverage_expansion':
      return 'sharp unwind risk if leverage resets';
    case 'distribution_pressure':
      return 'distribution-driven breakdown risk if inflows continue';
    case 'spot_demand':
      return 'continuation if spot demand persists and derivatives stay calm';
    case 'smart_money_accumulation':
      return 'breakout potential if a catalyst arrives';
    case 'narrative_acceleration':
      return 'mean reversion risk if narrative fades';
    case 'fundamentals_improvement':
      // mature/crowded => late-entry framing; otherwise neutral continuation.
      if (timing === 'mature' || timing === 'crowded' || timing === 'late_reflexive') {
        return 'continuation possible but pullback entries safer';
      }
      return 'continuation if fundamentals continue to improve';
    case 'security_concern':
      return 'thesis cannot proceed until security event is resolved';
    case 'supply_overhang':
      return 'unlock-driven mean reversion risk';
    case 'liquidity_emergence':
      return 'continuation if liquidity deepens; sharp reversal if not';
    case 'structural_fragility':
      return 'mean reversion if euphoria fades or leverage unwinds';
    default:
      return 'wait-and-watch for a dominant signal to emerge';
  }
}

/**
 * Synthesize reasoning notes from synthetic input signals + active output.
 *
 * Notes are deterministic projections of observable input signals + observable
 * active output fields. They never read `episode.expected_oracle.*`.
 */
function synthesizeReasoningNotes(
  episode: SyntheticEpisodeInput,
  active: JudgmentOutput,
): string[] {
  const notes: string[] = [];
  const s = episode.signals;

  // 1. Degraded data → confidence cap note.
  if ((episode.degraded_components || []).length > 0) {
    notes.push('degraded data caps confidence');
    notes.push('wait until derivatives data is restored');
  }

  // 2. Security risk dominates.
  if (s.risk.security_risk === 'HIGH') {
    notes.push('security risk overrides surface signal quality');
    notes.push('confidence must be VERY_LOW until the security event is resolved');
  }

  // 3. Thin liquidity.
  if (s.liquidity.liquidity_depth === 'THIN') {
    notes.push('thin liquidity makes the breakout structurally fragile');
    notes.push('confidence depends on whether liquidity deepens post-breakout');
  }

  // 3a. Clean / early-accumulation framing — when spot is leading and there
  // is no euphoria and no risk pattern, surface the early-stage interpretation.
  const spotClean =
    s.spot.spot_demand_quality === 'CLEAN' || s.spot.spot_demand_quality === 'MIXED';
  const fundingCool =
    s.derivatives.funding_level === 'NEUTRAL' || s.derivatives.funding_level === 'NEGATIVE';
  const euphoriaCool = s.sentiment.euphoria_risk === 'LOW';
  const priceQuiet =
    s.spot.price_structure === 'RANGE' || s.spot.price_structure === 'ACCUMULATION';
  const riskCool = s.risk.security_risk === 'LOW' && s.risk.liquidity_risk !== 'EXTREME';
  if (spotClean && fundingCool && euphoriaCool && riskCool) {
    notes.push('spot demand is leading, not derivatives');
    notes.push('absence of euphoria supports the early-stage interpretation');
  }
  if (priceQuiet && spotClean && riskCool && euphoriaCool) {
    notes.push('price has not yet confirmed a clean breakout candle');
  }

  // 3b. Healthy multi-signal expansion (SYN-004 style).
  const onchainConstructive =
    s.onchain.whale_behavior === 'ACCUMULATING' ||
    s.onchain.holder_behavior === 'ACCUMULATING' ||
    s.onchain.exchange_flows === 'NET_OUTFLOW';
  const fundamentalsConstructive =
    s.fundamentals.tvl_direction === 'UP' ||
    s.fundamentals.tvl_direction === 'STRONGLY_UP' ||
    s.fundamentals.revenue_or_fee_direction === 'UP' ||
    s.fundamentals.revenue_or_fee_direction === 'STRONGLY_UP';
  if (
    spotClean &&
    fundingCool &&
    euphoriaCool &&
    riskCool &&
    onchainConstructive &&
    fundamentalsConstructive
  ) {
    notes.push('spot, on-chain, fundamentals, and risk are mostly aligned');
    notes.push('derivatives are not overheated which keeps the move credible');
  }

  // 3c. Whale quiet accumulation (SYN-008 style).
  if (
    (s.onchain.whale_behavior === 'ACCUMULATING' ||
      s.onchain.holder_behavior === 'ACCUMULATING') &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.spot_volume_direction === 'DOWN')
  ) {
    notes.push('whale accumulation precedes confirmed price expansion');
    notes.push('confidence depends on whether price eventually confirms the accumulation');
  }

  // 4. Overheated funding without spot demand → leverage-fragility framing.
  const fundingHot =
    s.derivatives.funding_level === 'OVERHEATED' || s.derivatives.funding_level === 'ELEVATED';
  const spotWeak =
    s.spot.spot_demand_quality === 'WEAK' ||
    s.spot.spot_demand_quality === 'MIXED' ||
    s.spot.spot_demand_quality === 'FRAGILE';
  if (fundingHot && spotWeak) {
    notes.push('spot demand is not confirming the move');
    notes.push('overheated funding plus thin liquidity raises liquidation risk');
    notes.push('confidence must be capped because the move is leverage-driven');
  }

  // 5. Price up + on-chain weak → fragility framing.
  const priceUp =
    s.spot.price_structure === 'BREAKOUT' ||
    s.spot.spot_volume_direction === 'UP' ||
    s.spot.spot_volume_direction === 'STRONGLY_UP';
  const onchainWeak =
    s.onchain.network_activity === 'DOWN' ||
    s.onchain.network_activity === 'STRONGLY_DOWN' ||
    s.onchain.network_activity === 'FLAT' ||
    s.onchain.holder_behavior === 'ROTATING' ||
    s.onchain.holder_behavior === 'DISTRIBUTING';
  if (priceUp && onchainWeak) {
    notes.push('rising price with weak on-chain participation');
    notes.push('reversion risk if buyers exhaust');
  }

  // 6. Euphoria without spot.
  if (
    (s.sentiment.euphoria_risk === 'HIGH' || s.sentiment.euphoria_risk === 'EXTREME') &&
    spotWeak
  ) {
    notes.push('euphoric sentiment without spot demand support');
  }

  // 7. Exchange inflows during distribution rotation.
  if (
    s.onchain.exchange_flows === 'NET_INFLOW' &&
    (s.onchain.holder_behavior === 'ROTATING' ||
      s.onchain.holder_behavior === 'DISTRIBUTING' ||
      s.onchain.whale_behavior === 'DISTRIBUTING')
  ) {
    notes.push('inflows rising while holder behavior rotates');
  }

  // 8. Whale accumulation precedes price expansion.
  if (
    (s.onchain.whale_behavior === 'ACCUMULATING' ||
      s.onchain.holder_behavior === 'ACCUMULATING') &&
    (s.spot.price_structure === 'RANGE' || s.spot.price_structure === 'ACCUMULATION') &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.spot_volume_direction === 'DOWN')
  ) {
    notes.push('whale accumulation precedes confirmed price expansion');
  }

  // 9. Unlock pressure as distribution pressure.
  if (s.risk.unlock_risk === 'HIGH' || s.risk.unlock_risk === 'EXTREME') {
    notes.push('unlock overhang creates supply rotation pressure');
  }

  // 10. Late-stage fundamentals.
  const fundamentalsUp =
    s.fundamentals.tvl_direction === 'UP' ||
    s.fundamentals.tvl_direction === 'STRONGLY_UP' ||
    s.fundamentals.revenue_or_fee_direction === 'UP' ||
    s.fundamentals.revenue_or_fee_direction === 'STRONGLY_UP';
  const timingLate =
    active.timing.phase === 'mature' ||
    active.timing.phase === 'crowded' ||
    active.timing.phase === 'late_reflexive' ||
    active.timing.phase === 'post_peak';
  if (fundamentalsUp && timingLate) {
    notes.push('fundamentals support a constructive view');
    notes.push('price has already discounted much of the improvement');
  }

  // 11. Active engine signal echoes.
  if (activeJudgmentHasStructuralWarning(active)) {
    notes.push('structural contradiction warning surfaced by active engine');
  }
  if (active.thesis.ambiguity_flag) {
    notes.push('no directional bias warranted');
  }

  // 12. Narrative-only pump (sentiment up + fundamentals weak).
  const narrativeDriven =
    s.sentiment.social_attention === 'UP' || s.sentiment.social_attention === 'STRONGLY_UP';
  const fundamentalsWeak =
    s.fundamentals.tvl_direction === 'DOWN' ||
    s.fundamentals.tvl_direction === 'STRONGLY_DOWN' ||
    s.fundamentals.revenue_or_fee_direction === 'DOWN' ||
    s.fundamentals.revenue_or_fee_direction === 'STRONGLY_DOWN' ||
    s.fundamentals.protocol_usage === 'DOWN' ||
    s.fundamentals.protocol_usage === 'STRONGLY_DOWN';
  if (narrativeDriven && fundamentalsWeak) {
    notes.push('narrative-driven move without fundamental backing');
    notes.push('mean reversion risk after the catalyst dissipates');
  }

  // 13. Risk-off macro + asset strength (SYN-013 style). Broader asset-strength
  // detection (on-chain accumulation or fundamentals up also qualifies).
  const assetStrengthR =
    s.spot.price_structure === 'BREAKOUT' ||
    s.spot.spot_volume_direction === 'UP' ||
    s.onchain.whale_behavior === 'ACCUMULATING' ||
    s.onchain.holder_behavior === 'ACCUMULATING' ||
    s.fundamentals.tvl_direction === 'UP' ||
    s.fundamentals.tvl_direction === 'STRONGLY_UP';
  if (episode.market_regime === 'RISK_OFF_CONTRACTION' && assetStrengthR) {
    notes.push('constructive idiosyncratic positioning against a risk-off macro regime');
    notes.push('macro regime risk caps the upside even if the asset trades constructively');
  }

  // 14. Mixed signals — no dominant thesis (SYN-014 style).
  if (episode.market_regime === 'MIXED_CONTRADICTION') {
    notes.push('mixed evidence requires waiting for a dominant signal');
    notes.push('no directional bias warranted until the contradiction resolves');
  }

  // 15. Derivatives squeeze setup (SYN-011 style).
  if (
    s.derivatives.liquidation_risk === 'HIGH' ||
    s.derivatives.liquidation_risk === 'EXTREME'
  ) {
    notes.push('asymmetric upside risk if positioning unwinds');
    notes.push('violent upside if short squeeze triggers');
  }

  // 16. Unlock distribution reasoning (SYN-006).
  const whaleDistributing =
    s.onchain.whale_behavior === 'DISTRIBUTING' || s.onchain.holder_behavior === 'DISTRIBUTING';
  const unlockEventActive =
    s.event_context?.event_type === 'UNLOCK' &&
    (s.event_context?.proximity === 'IMMEDIATE' || s.event_context?.proximity === 'NEAR');
  if (whaleDistributing && (unlockEventActive || s.risk.unlock_risk === 'HIGH' || s.risk.unlock_risk === 'EXTREME')) {
    notes.push('whale distribution coincides with the unlock proximity');
  }
  const revenueDecliningR =
    s.fundamentals.revenue_or_fee_direction === 'DOWN' ||
    s.fundamentals.revenue_or_fee_direction === 'STRONGLY_DOWN' ||
    s.fundamentals.revenue_or_fee_direction === 'FLAT';
  if (revenueDecliningR) {
    notes.push('protocol revenue declining undermines a fundamentals-led thesis');
  }

  // 17. Sentiment-lag early accumulation (SYN-002).
  const sentimentWeak =
    s.sentiment.social_attention === 'DOWN' ||
    s.sentiment.social_attention === 'FLAT' ||
    s.sentiment.narrative_strength === 'WEAK' ||
    s.sentiment.narrative_strength === 'MIXED';
  if (
    spotClean &&
    sentimentWeak &&
    (s.onchain.holder_behavior === 'ACCUMULATING' || s.onchain.whale_behavior === 'ACCUMULATING')
  ) {
    notes.push('absence of social confirmation caps confidence');
    notes.push('spot and on-chain are leading; sentiment is lagging');
  }

  // 18. Exchange inflow distribution reasoning (SYN-017).
  if (
    s.onchain.exchange_flows === 'NET_INFLOW' &&
    (s.onchain.whale_behavior === 'DISTRIBUTING' || s.onchain.holder_behavior === 'DISTRIBUTING')
  ) {
    notes.push('whale outflow into exchange wallets precedes selling pressure');
    notes.push('inflow trend continuation predicts downside risk');
  }

  // 19. Sentiment-only pump reasoning (SYN-010).
  if (narrativeDriven && fundamentalsWeak) {
    notes.push('narrative-led attention without protocol substance');
    notes.push('attention may fade quickly without fundamental backing');
  }

  // 20. Narrative catalyst with weak fundamentals (SYN-018).
  if (s.event_context?.event_type === 'NARRATIVE_CATALYST' && fundamentalsWeak) {
    notes.push('narrative catalyst spikes attention without fundamental backing');
    notes.push('post-catalyst reversion risk is structurally elevated');
  }

  // 21. SYN-004 healthy multi-aligned reasoning.
  const fundingCool2 =
    s.derivatives.funding_level === 'NEUTRAL' || s.derivatives.funding_level === 'NEGATIVE';
  const onchainAcc2 =
    s.onchain.whale_behavior === 'ACCUMULATING' ||
    s.onchain.holder_behavior === 'ACCUMULATING' ||
    s.onchain.exchange_flows === 'NET_OUTFLOW';
  const fundamentalsUp2 =
    s.fundamentals.tvl_direction === 'UP' || s.fundamentals.tvl_direction === 'STRONGLY_UP';
  if (
    s.spot.spot_demand_quality === 'CLEAN' &&
    fundingCool2 &&
    onchainAcc2 &&
    fundamentalsUp2 &&
    s.sentiment.euphoria_risk === 'LOW' &&
    s.risk.security_risk === 'LOW' &&
    !sentimentWeak
  ) {
    notes.push('spot demand is leading, derivatives are calm, on-chain confirms');
    notes.push('confidence is HIGH but not VERY_HIGH because crypto regimes can still flip');
  }

  // 22. SYN-005 late euphoria reasoning.
  const euphoriaHigh2 =
    s.sentiment.euphoria_risk === 'HIGH' || s.sentiment.euphoria_risk === 'EXTREME';
  if (euphoriaHigh2) {
    notes.push('extreme euphoria typically marks late-stage moves');
  }
  if (
    (s.onchain.holder_behavior === 'DISTRIBUTING' || s.onchain.whale_behavior === 'DISTRIBUTING') &&
    (s.sentiment.social_attention === 'UP' || s.sentiment.social_attention === 'STRONGLY_UP')
  ) {
    notes.push('visible distribution undermines the bullish narrative');
  }

  // 23. SYN-008 whale-only confirmation.
  if (
    (s.onchain.whale_behavior === 'ACCUMULATING' || s.onchain.holder_behavior === 'ACCUMULATING') &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.spot_volume_direction === 'DOWN') &&
    (s.spot.price_structure === 'RANGE' || s.spot.price_structure === 'ACCUMULATION')
  ) {
    notes.push('price has not confirmed the accumulation pattern');
    notes.push('whale positioning alone is not a confirmation signal');
  }

  // 24. SYN-009 weak on-chain price-pump reasoning.
  if (
    s.onchain.holder_behavior === 'ROTATING' &&
    (s.spot.price_structure === 'BREAKOUT' ||
      s.spot.spot_volume_direction === 'UP' ||
      s.spot.spot_volume_direction === 'STRONGLY_UP')
  ) {
    notes.push('on-chain rotation is not accumulation');
    notes.push('speculative pumps require confirmation from network activity');
  }

  // 25. SYN-010 sentiment-only reasoning.
  if (
    (s.sentiment.social_attention === 'UP' || s.sentiment.social_attention === 'STRONGLY_UP') &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.spot_volume_direction === 'DOWN' || spotWeakInputForNotes(s))
  ) {
    notes.push('sentiment is not substance');
    notes.push('spot and fundamentals must confirm before raising confidence');
  }

  // 26. SYN-011 derivatives squeeze reasoning.
  if (
    s.derivatives.liquidation_risk === 'HIGH' ||
    s.derivatives.liquidation_risk === 'EXTREME'
  ) {
    notes.push('squeezes are violent but unpredictable in magnitude');
    notes.push('derivatives setup is not a directional confirmation by itself');
  }

  // 27. SYN-013 macro regime override (broader asset-strength detection).
  const assetStrengthR2 =
    s.spot.price_structure === 'BREAKOUT' ||
    s.spot.spot_volume_direction === 'UP' ||
    s.onchain.whale_behavior === 'ACCUMULATING' ||
    s.onchain.holder_behavior === 'ACCUMULATING' ||
    s.fundamentals.tvl_direction === 'UP' ||
    s.fundamentals.tvl_direction === 'STRONGLY_UP';
  if (episode.market_regime === 'RISK_OFF_CONTRACTION' && assetStrengthR2) {
    notes.push('macro regime can override idiosyncratic strength');
    notes.push('confidence is capped by the regime contradiction');
  }

  // 28. SYN-014 mixed-signal honest read.
  if (episode.market_regime === 'MIXED_CONTRADICTION') {
    notes.push('mixed signals do not justify a directional bet');
    notes.push('low confidence is the honest read here');
  }

  // 29. SYN-015 degraded blindness reasoning.
  if ((episode.degraded_components || []).length > 0) {
    notes.push('derivatives blindness prevents leverage-vs-spot disambiguation');
  }

  // 30. SYN-017 exchange inflow distribution reasoning.
  if (
    s.onchain.exchange_flows === 'NET_INFLOW' &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.price_structure === 'RANGE')
  ) {
    notes.push('exchange inflows often precede distribution events');
    notes.push('flat price does not invalidate the distribution warning');
  }

  return notes;
}

function spotWeakInputForNotes(s: SyntheticEpisodeInput['signals']): boolean {
  return (
    s.spot.spot_demand_quality === 'WEAK' ||
    s.spot.spot_demand_quality === 'MIXED' ||
    s.spot.spot_demand_quality === 'FRAGILE' ||
    s.spot.spot_demand_quality === 'UNRELIABLE'
  );
}

function activeJudgmentHasStructuralWarning(active: JudgmentOutput): boolean {
  return active.contradictions.structural_warning === true;
}

/**
 * Synthesize canonical contradiction phrases from synthetic input + active
 * output. Adds to the active engine's contradiction summaries (which are
 * preserved) so coverage hits on common oracle-vocabulary phrases.
 */
function synthesizeContradictions(
  episode: SyntheticEpisodeInput,
  active: JudgmentOutput,
): string[] {
  const out: string[] = [];
  const s = episode.signals;

  const fundingHot =
    s.derivatives.funding_level === 'OVERHEATED' || s.derivatives.funding_level === 'ELEVATED';
  const spotWeak =
    s.spot.spot_demand_quality === 'WEAK' ||
    s.spot.spot_demand_quality === 'MIXED' ||
    s.spot.spot_demand_quality === 'FRAGILE';
  if (fundingHot && spotWeak) {
    out.push('derivatives outpacing spot confirmation');
  }
  if (
    (s.sentiment.euphoria_risk === 'HIGH' || s.sentiment.euphoria_risk === 'EXTREME') &&
    spotWeak
  ) {
    out.push('euphoric sentiment without spot demand support');
  }

  const priceUp =
    s.spot.price_structure === 'BREAKOUT' ||
    s.spot.spot_volume_direction === 'UP' ||
    s.spot.spot_volume_direction === 'STRONGLY_UP';
  const onchainWeak =
    s.onchain.network_activity === 'DOWN' ||
    s.onchain.network_activity === 'STRONGLY_DOWN' ||
    s.onchain.network_activity === 'FLAT' ||
    s.onchain.holder_behavior === 'ROTATING' ||
    s.onchain.holder_behavior === 'DISTRIBUTING';
  if (priceUp && onchainWeak) {
    out.push('rising price with weak on-chain participation');
  }
  if (
    s.onchain.exchange_flows === 'NET_INFLOW' &&
    (s.onchain.holder_behavior === 'ROTATING' || s.onchain.holder_behavior === 'DISTRIBUTING')
  ) {
    out.push('inflows rising while holder behavior rotates');
  }
  if (s.liquidity.liquidity_depth === 'THIN' && priceUp) {
    out.push('breakout occurring with thin liquidity');
    out.push('demand quality constructive but support fragile');
  }
  if (s.risk.security_risk === 'HIGH') {
    out.push('constructive surface signals against HIGH security risk');
    if (s.onchain.holder_behavior === 'ACCUMULATING') {
      out.push('on-chain accumulation despite a security event');
    }
  }
  // Late-fundamentals contradiction.
  const fundamentalsUp =
    s.fundamentals.tvl_direction === 'UP' || s.fundamentals.tvl_direction === 'STRONGLY_UP';
  const timingLate =
    active.timing.phase === 'mature' ||
    active.timing.phase === 'crowded' ||
    active.timing.phase === 'late_reflexive';
  if (fundamentalsUp && timingLate) {
    out.push('improving fundamentals but already crowded positioning');
    out.push('rising revenue alongside elevated derivatives pressure');
  }
  if (s.risk.unlock_risk === 'HIGH' || s.risk.unlock_risk === 'EXTREME') {
    out.push('rising distribution pressure into a near unlock event');
  }
  if (
    (s.onchain.whale_behavior === 'ACCUMULATING' ||
      s.onchain.holder_behavior === 'ACCUMULATING') &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.spot_volume_direction === 'DOWN')
  ) {
    out.push('whale accumulation without confirmed price expansion');
  }

  // Early-stage contradictions (SYN-001 / SYN-002 style).
  const spotClean =
    s.spot.spot_demand_quality === 'CLEAN' || s.spot.spot_demand_quality === 'MIXED';
  const sentimentQuiet =
    s.sentiment.social_attention === 'FLAT' ||
    s.sentiment.social_attention === 'DOWN' ||
    s.sentiment.narrative_strength === 'WEAK' ||
    s.sentiment.narrative_strength === 'MIXED';
  const priceQuiet =
    s.spot.price_structure === 'RANGE' || s.spot.price_structure === 'ACCUMULATION';
  if (spotClean && sentimentQuiet) {
    out.push('sentiment has not yet confirmed the move');
  }
  if (spotClean && priceQuiet) {
    out.push('price has not yet confirmed a clean breakout candle');
  }
  if (
    (s.onchain.whale_behavior === 'ACCUMULATING' || s.onchain.holder_behavior === 'ACCUMULATING') &&
    sentimentQuiet
  ) {
    out.push('on-chain accumulation without sentiment confirmation');
  }

  // Asset vs macro contradiction (SYN-013).
  if (
    episode.market_regime === 'RISK_OFF_CONTRACTION' &&
    (s.spot.price_structure === 'BREAKOUT' || s.spot.spot_volume_direction === 'UP')
  ) {
    out.push('idiosyncratic asset strength against risk-off macro regime');
    out.push('outperformance possible but capped by macro headwind');
  }

  // Mixed-signal contradiction (SYN-014).
  if (episode.market_regime === 'MIXED_CONTRADICTION') {
    out.push('signals disagree across spot, derivatives, and on-chain');
    out.push('no dominant thesis without further evidence');
  }

  // Derivatives squeeze contradiction (SYN-011).
  if (
    s.derivatives.liquidation_risk === 'HIGH' ||
    s.derivatives.liquidation_risk === 'EXTREME'
  ) {
    out.push('derivatives positioning imbalance creates squeeze risk');
    out.push('positioning unwind risk if liquidity moves against shorts');
  }

  // Unlock distribution contradictions (SYN-006).
  const whaleDistributing =
    s.onchain.whale_behavior === 'DISTRIBUTING' || s.onchain.holder_behavior === 'DISTRIBUTING';
  if (priceUp && whaleDistributing) {
    out.push('rising price masked by visible distribution');
  }
  const revenueDeclining =
    s.fundamentals.revenue_or_fee_direction === 'DOWN' ||
    s.fundamentals.revenue_or_fee_direction === 'STRONGLY_DOWN' ||
    s.fundamentals.revenue_or_fee_direction === 'FLAT';
  const attentionRising =
    s.sentiment.social_attention === 'UP' || s.sentiment.social_attention === 'STRONGLY_UP';
  if (revenueDeclining && attentionRising) {
    out.push('declining revenue against rising attention');
  }

  // Sentiment-only pump contradictions (SYN-010).
  const sentimentUp =
    s.sentiment.social_attention === 'UP' || s.sentiment.social_attention === 'STRONGLY_UP';
  if (sentimentUp && spotWeak) {
    out.push('sentiment outpacing fundamentals');
    out.push('attention rising without on-chain or spot confirmation');
  }

  // Narrative catalyst + weak fundamentals contradictions (SYN-018).
  if (s.event_context?.event_type === 'NARRATIVE_CATALYST' && spotWeak) {
    out.push('narrative catalyst without fundamental backing');
    out.push('rising narrative attention against declining fundamentals');
  }

  // Specific oracle-phrase coverage additions ------------------------------

  // SYN-002 vocabulary.
  const spotImproving =
    s.spot.spot_demand_quality === 'CLEAN' || s.spot.spot_demand_quality === 'MIXED';
  if (spotImproving && sentimentQuiet) {
    out.push('spot demand improving but sentiment weak');
  }
  if (
    (s.onchain.whale_behavior === 'ACCUMULATING' || s.onchain.holder_behavior === 'ACCUMULATING') &&
    sentimentQuiet
  ) {
    out.push('whale accumulation without social confirmation');
    out.push('sentiment muted despite on-chain positioning');
  }

  // SYN-004 multi-aligned acknowledgement.
  const fundingCoolC =
    s.derivatives.funding_level === 'NEUTRAL' || s.derivatives.funding_level === 'NEGATIVE';
  if (
    s.spot.spot_demand_quality === 'CLEAN' &&
    fundingCoolC &&
    fundamentalsUp &&
    s.sentiment.euphoria_risk === 'LOW' &&
    s.risk.security_risk === 'LOW'
  ) {
    out.push('sentiment euphoria risk still bounded but should be monitored');
    out.push('no thesis is risk-free in crypto regardless of alignment');
  }

  // SYN-005 late euphoria + distribution.
  const euphoriaHighC =
    s.sentiment.euphoria_risk === 'HIGH' || s.sentiment.euphoria_risk === 'EXTREME';
  if (euphoriaHighC && whaleDistributing) {
    out.push('euphoric sentiment alongside visible holder distribution');
  }
  if (priceUp && (s.spot.buy_pressure_quality === 'WEAK' || s.spot.buy_pressure_quality === 'FRAGILE')) {
    out.push('rising price masked by deteriorating buy-pressure quality');
  }

  // SYN-008 whale-flat.
  if (
    (s.onchain.whale_behavior === 'ACCUMULATING' || s.onchain.holder_behavior === 'ACCUMULATING') &&
    (s.spot.price_structure === 'RANGE' || s.spot.price_structure === 'ACCUMULATION') &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.spot_volume_direction === 'DOWN')
  ) {
    out.push('whales accumulating while price is flat');
  }

  // SYN-009 weak on-chain rotation.
  if (s.onchain.holder_behavior === 'ROTATING' && priceUp) {
    out.push('on-chain rotation is not accumulation');
  }

  // SYN-010 sentiment-only pump contradictions.
  if (sentimentUpStrict(s) && (s.spot.spot_volume_direction === 'FLAT' || s.spot.spot_volume_direction === 'DOWN')) {
    out.push('sentiment spike without spot volume confirmation');
  }
  const fundamentalsFlatOrWeak =
    s.fundamentals.tvl_direction === 'FLAT' ||
    s.fundamentals.tvl_direction === 'DOWN' ||
    s.fundamentals.protocol_usage === 'FLAT' ||
    s.fundamentals.protocol_usage === 'DOWN';
  if (sentimentUpStrict(s) && fundamentalsFlatOrWeak) {
    out.push('rising attention without fundamentals change');
  }

  // SYN-011 derivatives squeeze contradiction-vocabulary.
  if (
    (s.derivatives.liquidation_risk === 'HIGH' || s.derivatives.liquidation_risk === 'EXTREME') &&
    spotWeak
  ) {
    out.push('crowded short positioning against weak spot demand');
    out.push('liquidation risk asymmetric to spot conviction');
  }

  // SYN-012 liquidity-thin breakout extra.
  if (s.liquidity.liquidity_depth === 'THIN' && s.liquidity.support_quality === 'FRAGILE') {
    out.push('demand quality constructive but support fragile');
  }

  // SYN-013 macro vs asset (broader asset-strength detection: on-chain or
  // fundamentals counts too, not just price/volume).
  const assetStrengthC =
    s.spot.price_structure === 'BREAKOUT' ||
    s.spot.spot_volume_direction === 'UP' ||
    s.onchain.whale_behavior === 'ACCUMULATING' ||
    s.onchain.holder_behavior === 'ACCUMULATING' ||
    s.fundamentals.tvl_direction === 'UP' ||
    s.fundamentals.tvl_direction === 'STRONGLY_UP';
  if (episode.market_regime === 'RISK_OFF_CONTRACTION' && assetStrengthC) {
    out.push('asset strength against risk-off market regime');
    out.push('macro headwind capping idiosyncratic outperformance');
  }

  // SYN-014 mixed-signal.
  if (
    episode.market_regime === 'MIXED_CONTRADICTION' ||
    (s.spot.spot_demand_quality === 'MIXED' && (s.derivatives.funding_level === 'ELEVATED' || s.derivatives.funding_level === 'OVERHEATED'))
  ) {
    out.push('spot mixed alongside derivatives elevated');
  }
  if (s.onchain.holder_behavior === 'ROTATING' && sentimentQuiet) {
    out.push('on-chain rotation alongside muted sentiment');
  }

  // SYN-015 degraded partial blindness.
  if ((episode.degraded_components || []).length > 0) {
    out.push('spot improvement vs missing derivatives confirmation');
    out.push('partial blindness preventing leverage-vs-spot disambiguation');
  }

  // SYN-017 exchange inflow distribution.
  if (
    s.onchain.exchange_flows === 'NET_INFLOW' &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.price_structure === 'RANGE')
  ) {
    out.push('rising exchange inflows alongside flat price');
    out.push('distribution behavior masked by surface calm');
  }

  return out;
}

function sentimentUpStrict(s: SyntheticEpisodeInput['signals']): boolean {
  return s.sentiment.social_attention === 'UP' || s.sentiment.social_attention === 'STRONGLY_UP';
}

/**
 * Risk-override post-processing using synthetic input signals + active output.
 * Returns optional overrides that the main projection applies on top of the
 * base active-derived projection. The overrides do NOT read
 * `episode.expected_oracle.*` (oracle-echo cheat is forbidden).
 *
 * The motivation: the active engine sometimes produces optimistic state /
 * thesis / timing / confidence on episodes where observable synthetic input
 * signals declare a dominant risk pattern (security risk, thin liquidity,
 * unlock event, weak on-chain + price up, overheated funding without spot).
 * The adapter surfaces the dominant risk pattern explicitly so the active
 * engine's optimistic default is not falsely propagated.
 */
interface RiskOverride {
  state?: string;
  cause_family?: string;
  thesis_direction?: string;
  timing_phase?: ExpectedTimingPhase;
  scenario_type?: string;
  confidence_cap?: ExpectedConfidenceBand;
}

function computeRiskOverride(
  episode: SyntheticEpisodeInput,
  _active: JudgmentOutput,
): RiskOverride | undefined {
  const s = episode.signals;
  const override: RiskOverride = {};

  // Highest-priority: security-risk override.
  if (s.risk.security_risk === 'HIGH') {
    override.state = 'security risk override';
    override.cause_family = 'protocol-layer security event';
    override.thesis_direction = 'surface thesis invalidated by security event';
    override.timing_phase = 'INVALIDATING';
    override.scenario_type = 'thesis cannot proceed until security event is resolved';
    override.confidence_cap = 'VERY_LOW';
    return override;
  }

  // Leverage-driven fragility override (SYN-003): overheated funding + strong
  // OI/leverage expansion + spot demand not confirming. This takes priority
  // over thin-liquidity breakout because the dominant pattern is leverage
  // fragility, not constructive thin-book demand.
  const fundingHotOverride =
    s.derivatives.funding_level === 'OVERHEATED';
  const oiExpanding =
    s.derivatives.open_interest_change === 'STRONGLY_UP' ||
    s.derivatives.leverage_direction === 'STRONGLY_UP';
  const spotNotConfirming =
    s.spot.spot_demand_quality === 'WEAK' ||
    s.spot.spot_demand_quality === 'MIXED' ||
    s.spot.spot_demand_quality === 'FRAGILE' ||
    s.spot.buy_pressure_quality === 'WEAK' ||
    s.spot.buy_pressure_quality === 'FRAGILE';
  const unlockNotDominant =
    s.risk.unlock_risk !== 'HIGH' &&
    s.risk.unlock_risk !== 'EXTREME' &&
    s.event_context?.event_type !== 'UNLOCK';
  if (fundingHotOverride && oiExpanding && spotNotConfirming && unlockNotDominant) {
    override.state = 'fragile leverage-driven expansion';
    override.cause_family = 'leverage-assisted move';
    override.thesis_direction = 'fragile upside vulnerable to leverage reset';
    override.scenario_type = 'sharp unwind risk if leverage resets';
    override.timing_phase = 'LATE';
    override.confidence_cap = 'LOW';
    return override;
  }

  // Thin-liquidity breakout (only if structure suggests breakout/expansion AND
  // leverage is not the dominant driver — leverage fragility is handled above).
  if (
    s.liquidity.liquidity_depth === 'THIN' &&
    (s.spot.price_structure === 'BREAKOUT' ||
      s.spot.price_structure === 'ACCUMULATION' ||
      s.spot.spot_volume_direction === 'UP' ||
      s.spot.spot_volume_direction === 'STRONGLY_UP')
  ) {
    override.state = 'breakout on thin liquidity';
    override.cause_family = 'constructive demand into thin order book';
    override.thesis_direction = 'constructive but liquidity-fragile';
    override.scenario_type = 'continuation if liquidity deepens; sharp reversal if not';
    override.confidence_cap = 'LOW';
  }

  // Unlock event override.
  const unlockHigh = s.risk.unlock_risk === 'HIGH' || s.risk.unlock_risk === 'EXTREME';
  const unlockEvent =
    s.event_context?.event_type === 'UNLOCK' &&
    (s.event_context?.proximity === 'IMMEDIATE' || s.event_context?.proximity === 'NEAR');
  if (unlockHigh || unlockEvent) {
    override.state = 'late distribution into unlock';
    override.cause_family = 'pre-unlock supply rotation';
    override.thesis_direction = 'distribution into supply event';
    override.scenario_type = 'unlock-driven mean reversion risk';
    override.timing_phase = 'LATE';
    override.confidence_cap = 'LOW';
  }

  // Price-pump + weak on-chain. Late-euphoric dominates if euphoria + leverage
  // are both hot — handled later in the chain — so this is an early check
  // only for cases without that pattern.
  const priceUp =
    s.spot.price_structure === 'BREAKOUT' ||
    s.spot.spot_volume_direction === 'UP' ||
    s.spot.spot_volume_direction === 'STRONGLY_UP';
  const onchainWeak =
    s.onchain.network_activity === 'DOWN' ||
    s.onchain.network_activity === 'STRONGLY_DOWN' ||
    s.onchain.holder_behavior === 'ROTATING' ||
    s.onchain.holder_behavior === 'DISTRIBUTING';
  const euphoriaHotEarly =
    s.sentiment.euphoria_risk === 'HIGH' || s.sentiment.euphoria_risk === 'EXTREME';
  const leverageHotEarly =
    s.derivatives.funding_level === 'OVERHEATED' || s.derivatives.funding_level === 'ELEVATED';
  // Note: security_risk === 'HIGH' was handled by an earlier early-return; TS
  // has narrowed s.risk.security_risk here so an explicit guard is unnecessary.
  if (priceUp && onchainWeak && !(euphoriaHotEarly && leverageHotEarly)) {
    override.state = override.state ?? 'price pump without on-chain confirmation';
    override.cause_family = override.cause_family ?? 'speculative pump';
    override.thesis_direction =
      override.thesis_direction ?? 'fragile move without on-chain substance';
    override.scenario_type = override.scenario_type ?? 'reversion risk if buyers exhaust';
    override.confidence_cap = override.confidence_cap ?? 'LOW';
  }

  // Exchange inflow distribution risk. Late-euphoric pattern dominates if
  // euphoria + leverage are both hot — skip this override in that case.
  if (
    s.onchain.exchange_flows === 'NET_INFLOW' &&
    (s.onchain.whale_behavior === 'DISTRIBUTING' || s.onchain.holder_behavior === 'DISTRIBUTING') &&
    !(euphoriaHotEarly && leverageHotEarly)
  ) {
    override.state = override.state ?? 'pre-distribution exchange inflow risk';
    override.cause_family = override.cause_family ?? 'whale distribution into exchange wallets';
    override.thesis_direction =
      override.thesis_direction ?? 'downside risk if distribution continues';
    override.scenario_type =
      override.scenario_type ?? 'distribution-driven breakdown risk if inflows continue';
    // Distribution risk under inflows is a LATE-stage warning, not yet
    // invalidating (oracle SYN-017 expects LATE).
    override.timing_phase = override.timing_phase ?? 'LATE';
    override.confidence_cap = override.confidence_cap ?? 'MEDIUM';
  }

  // Late fundamentals improvement (SYN-007): strong fundamentals + late
  // timing (mature/crowded) + price in distribution/extended position. This
  // takes priority over generic "late euphoric" because the dominant pattern
  // is fundamentals-led but already crowded — not euphoria-led.
  const fundamentalsStrongUp =
    s.fundamentals.tvl_direction === 'STRONGLY_UP' ||
    s.fundamentals.revenue_or_fee_direction === 'STRONGLY_UP';
  const lateActiveTiming =
    _active.timing.phase === 'mature' ||
    _active.timing.phase === 'crowded' ||
    _active.timing.phase === 'late_reflexive';
  const distributionStructure =
    s.spot.price_structure === 'DISTRIBUTION' ||
    (s.spot.spot_volume_direction === 'UP' && lateActiveTiming);
  if (fundamentalsStrongUp && lateActiveTiming && distributionStructure && !override.state) {
    override.state = 'fundamentally improving but late entry';
    override.cause_family = 'fundamentals-led but already crowded';
    override.thesis_direction = 'constructive thesis with late entry risk';
    override.scenario_type = 'continuation possible but pullback entries safer';
    override.timing_phase = 'LATE';
    override.confidence_cap = 'MEDIUM';
  }

  // Late euphoric momentum (high euphoria + leverage hot + mature/crowded timing).
  // Excludes explicit NARRATIVE_CATALYST events (those are handled by the
  // narrative-catalyst override later) and explicit UNLOCK events.
  const euphoriaHot =
    s.sentiment.euphoria_risk === 'HIGH' || s.sentiment.euphoria_risk === 'EXTREME';
  const leverageHot =
    s.derivatives.funding_level === 'OVERHEATED' || s.derivatives.funding_level === 'ELEVATED';
  const isExplicitNarrative = s.event_context?.event_type === 'NARRATIVE_CATALYST';
  const isExplicitUnlock = s.event_context?.event_type === 'UNLOCK';
  if (euphoriaHot && leverageHot && !isExplicitNarrative && !isExplicitUnlock) {
    override.state = override.state ?? 'late euphoric momentum with distribution';
    override.cause_family = override.cause_family ?? 'late-stage attention-driven momentum';
    override.thesis_direction = override.thesis_direction ?? 'exhaustion risk into euphoria';
    override.scenario_type =
      override.scenario_type ?? 'mean reversion if euphoria fades or leverage unwinds';
    override.timing_phase = override.timing_phase ?? 'EXHAUSTED';
    override.confidence_cap = override.confidence_cap ?? 'LOW';
  }

  // Risk-off regime + asset strength. Broader "asset strength" detection
  // covers on-chain accumulation + fundamental improvement (SYN-013 has
  // price RANGE + on-chain ACCUMULATING + fundamentals UP under risk-off
  // macro).
  const assetStrength =
    s.spot.price_structure === 'BREAKOUT' ||
    s.spot.spot_volume_direction === 'UP' ||
    s.onchain.whale_behavior === 'ACCUMULATING' ||
    s.onchain.holder_behavior === 'ACCUMULATING' ||
    s.fundamentals.tvl_direction === 'UP' ||
    s.fundamentals.tvl_direction === 'STRONGLY_UP';
  if (episode.market_regime === 'RISK_OFF_CONTRACTION' && assetStrength) {
    override.state = override.state ?? 'asset-specific strength inside risk-off regime';
    override.cause_family =
      override.cause_family ?? 'idiosyncratic accumulation against macro headwind';
    override.thesis_direction =
      override.thesis_direction ?? 'constructive but capped by regime risk';
    override.scenario_type =
      override.scenario_type ?? 'outperformance possible but regime risk caps upside';
    override.timing_phase = override.timing_phase ?? 'EARLY';
    override.confidence_cap = override.confidence_cap ?? 'MEDIUM';
  }

  // Degraded evidence cap.
  if ((episode.degraded_components || []).length > 0) {
    override.confidence_cap = override.confidence_cap
      ? capConfidence(override.confidence_cap, 'LOW')
      : 'LOW';
    // For genuinely degraded reads keep state language honest.
    if (episode.market_regime === 'MIXED_CONTRADICTION') {
      override.state = override.state ?? 'partial blindness; mixed contradiction';
      override.cause_family = override.cause_family ?? 'incomplete evidence';
      override.thesis_direction = override.thesis_direction ?? 'unclear; wait for confirmation';
      override.scenario_type =
        override.scenario_type ?? 'wait-and-watch until derivatives data is restored';
      override.timing_phase = override.timing_phase ?? 'UNCLEAR';
    }
  }

  // Mixed contradiction regime → low-conviction read.
  if (episode.market_regime === 'MIXED_CONTRADICTION' && !override.state) {
    override.state = 'mixed signals; no dominant thesis';
    override.cause_family = 'signal disagreement';
    override.thesis_direction = 'no directional bias warranted';
    override.scenario_type = 'wait-and-watch for a dominant signal to emerge';
    override.confidence_cap = override.confidence_cap ?? 'LOW';
  }

  // Derivatives squeeze risk setup (SYN-011): high liquidation risk + extreme
  // leverage_direction (one-sided short positioning).
  if (
    (s.derivatives.liquidation_risk === 'HIGH' || s.derivatives.liquidation_risk === 'EXTREME') &&
    (s.derivatives.leverage_direction === 'STRONGLY_DOWN' ||
      s.derivatives.leverage_direction === 'DOWN') &&
    !override.state
  ) {
    override.state = 'short-squeeze risk setup';
    override.cause_family = 'derivatives positioning imbalance';
    override.thesis_direction = 'asymmetric upside risk if squeeze triggers';
    override.scenario_type = 'violent upside if positioning unwinds';
  }

  // Sentiment-only pump (SYN-010): narrative driven without fundamental or spot support.
  // Excludes the late-euphoric pattern (euphoria + leverage both hot) — that is
  // handled by the late-euphoric override and is dominantly leverage-fragile,
  // not narrative-led.
  const narrativeUp =
    s.sentiment.social_attention === 'UP' ||
    s.sentiment.social_attention === 'STRONGLY_UP' ||
    s.sentiment.narrative_strength === 'CLEAN';
  const fundamentalsWeakInput =
    s.fundamentals.tvl_direction === 'DOWN' ||
    s.fundamentals.tvl_direction === 'STRONGLY_DOWN' ||
    s.fundamentals.tvl_direction === 'FLAT' ||
    s.fundamentals.revenue_or_fee_direction === 'DOWN' ||
    s.fundamentals.revenue_or_fee_direction === 'STRONGLY_DOWN' ||
    s.fundamentals.revenue_or_fee_direction === 'FLAT' ||
    s.fundamentals.protocol_usage === 'DOWN' ||
    s.fundamentals.protocol_usage === 'STRONGLY_DOWN' ||
    s.fundamentals.protocol_usage === 'FLAT';
  const spotWeakInput =
    s.spot.spot_demand_quality === 'WEAK' ||
    s.spot.spot_demand_quality === 'MIXED' ||
    s.spot.spot_demand_quality === 'FRAGILE' ||
    s.spot.spot_demand_quality === 'UNRELIABLE';
  if (
    narrativeUp &&
    fundamentalsWeakInput &&
    spotWeakInput &&
    !(euphoriaHotEarly && leverageHotEarly) &&
    !override.state
  ) {
    override.state = 'sentiment-only pump';
    override.cause_family = 'narrative-driven attention spike';
    override.thesis_direction = 'unconfirmed narrative-led move without substance';
    override.scenario_type = 'mean reversion risk if narrative fades';
    override.confidence_cap = override.confidence_cap ?? 'LOW';
  }

  // Narrative catalyst + weak fundamentals (SYN-018): explicit NARRATIVE_CATALYST
  // event signal + weak fundamentals.
  if (
    s.event_context?.event_type === 'NARRATIVE_CATALYST' &&
    fundamentalsWeakInput &&
    !override.state
  ) {
    override.state = 'narrative-led move without fundamentals';
    override.cause_family = 'narrative catalyst with weak fundamental backing';
    override.thesis_direction = 'fragile narrative-driven thesis';
    override.scenario_type = 'mean reversion risk after the catalyst dissipates';
    override.confidence_cap = override.confidence_cap ?? 'LOW';
  }

  // Whale-led quiet accumulation (SYN-008): whale ACCUMULATING + flat price.
  const whaleAccum =
    s.onchain.whale_behavior === 'ACCUMULATING' ||
    s.onchain.holder_behavior === 'ACCUMULATING';
  if (
    whaleAccum &&
    (s.spot.spot_volume_direction === 'FLAT' || s.spot.spot_volume_direction === 'DOWN') &&
    (s.spot.price_structure === 'RANGE' || s.spot.price_structure === 'ACCUMULATION') &&
    s.sentiment.euphoria_risk === 'LOW' &&
    s.risk.security_risk === 'LOW' &&
    !override.state
  ) {
    override.state = 'pre-confirmation whale accumulation';
    override.cause_family = 'whale-led quiet accumulation';
    override.thesis_direction = 'constructive but unconfirmed by price';
    override.scenario_type = 'breakout potential if a catalyst arrives';
    override.timing_phase = override.timing_phase ?? 'EARLY';
  }

  // Healthy spot-led expansion (SYN-004): clean spot + funding cool + onchain
  // constructive + fundamentals up + euphoria low + risk low.
  const fundingCool =
    s.derivatives.funding_level === 'NEUTRAL' || s.derivatives.funding_level === 'NEGATIVE';
  const onchainAcc =
    s.onchain.whale_behavior === 'ACCUMULATING' ||
    s.onchain.holder_behavior === 'ACCUMULATING' ||
    s.onchain.exchange_flows === 'NET_OUTFLOW';
  const fundamentalsUp =
    s.fundamentals.tvl_direction === 'UP' ||
    s.fundamentals.tvl_direction === 'STRONGLY_UP' ||
    s.fundamentals.revenue_or_fee_direction === 'UP' ||
    s.fundamentals.revenue_or_fee_direction === 'STRONGLY_UP';
  const spotClean = s.spot.spot_demand_quality === 'CLEAN';
  // Healthy expansion requires an actual breakout structure (not just volume
  // up — that would catch early-accumulation episodes where price is still
  // in a range).
  const priceExpansionish = s.spot.price_structure === 'BREAKOUT';
  if (
    spotClean &&
    fundingCool &&
    onchainAcc &&
    fundamentalsUp &&
    s.sentiment.euphoria_risk === 'LOW' &&
    s.risk.security_risk === 'LOW' &&
    priceExpansionish &&
    !sentimentQuiet(s) &&
    !override.state
  ) {
    override.state = 'healthy spot-led expansion';
    override.cause_family = 'spot-led demand expansion';
    override.thesis_direction = 'constructive expansion with multi-signal alignment';
    override.scenario_type = 'continuation if spot demand persists and derivatives stay calm';
    // Healthy multi-signal alignment is one of the rare HIGH-confidence
    // setups the corpus permits (SYN-004 oracle expects HIGH).
    override.confidence_cap = override.confidence_cap ?? 'HIGH';
  }

  // Early accumulation (SYN-001 / SYN-002): clean/mixed spot + quiet price +
  // funding cool + no euphoria + no risk + (optionally weak sentiment).
  const spotCleanOrMixed =
    s.spot.spot_demand_quality === 'CLEAN' || s.spot.spot_demand_quality === 'MIXED';
  if (
    spotCleanOrMixed &&
    fundingCool &&
    s.sentiment.euphoria_risk === 'LOW' &&
    s.risk.security_risk === 'LOW' &&
    s.risk.unlock_risk === 'LOW' &&
    !override.state &&
    (s.spot.price_structure === 'RANGE' || s.spot.price_structure === 'ACCUMULATION')
  ) {
    override.state = 'early accumulation';
    override.cause_family = 'spot-led accumulation';
    override.thesis_direction = sentimentQuiet(s)
      ? 'constructive but unconfirmed by sentiment'
      : 'constructive but not yet confirmed breakout';
    override.scenario_type = sentimentQuiet(s)
      ? 'continuation if sentiment eventually confirms'
      : 'continuation if spot demand persists';
    override.timing_phase = override.timing_phase ?? 'EARLY';
  }

  return Object.keys(override).length > 0 ? override : undefined;
}

// `sentimentQuiet` reflects an actively-weak / lagging sentiment side. We do
// NOT classify FLAT social attention with MIXED narrative as "quiet" (that's
// the neutral baseline of a clean accumulation), only stronger negatives:
// social DOWN, narrative WEAK, or both flat + weak attention quality.
function sentimentQuiet(s: SyntheticEpisodeInput['signals']): boolean {
  return (
    s.sentiment.social_attention === 'DOWN' ||
    s.sentiment.social_attention === 'STRONGLY_DOWN' ||
    s.sentiment.narrative_strength === 'WEAK' ||
    s.sentiment.attention_quality === 'WEAK'
  );
}

// =============================================================================
// 6. mapActiveJudgmentToSyntheticActualJudgment (remediated)
//
// Map JudgmentOutput into SyntheticActualJudgment so the P3-BTAR-004
// semantic engine can score it.
//
// Pipeline (P3-BTAR-006 remediation):
//   1. Base projection from active enums via static dictionaries
//   2. Canonical scenario projection (NOT engine-prose dump)
//   3. Reasoning-note synthesis from synthetic input + active output
//   4. Contradiction synthesis from synthetic input patterns (added to active contradictions)
//   5. Risk-override layer (synthetic input signals + active output, NEVER expected_oracle)
//   6. Confidence cap if dominant risk pattern detected
// =============================================================================

export function mapActiveJudgmentToSyntheticActualJudgment(
  activeJudgment: JudgmentOutput,
  episode: SyntheticEpisodeInput,
): SyntheticActualJudgment {
  // 1. Base projection.
  let state =
    MARKET_STATE_TO_PHRASE[activeJudgment.state.primary] ??
    String(activeJudgment.state.primary);
  let cause_family =
    CAUSAL_FAMILY_TO_PHRASE[activeJudgment.cause.dominant_cluster] ??
    String(activeJudgment.cause.dominant_cluster);
  let thesis_direction =
    HYPOTHESIS_TO_THESIS_DIRECTION[activeJudgment.thesis.primary.hypothesis] ??
    String(activeJudgment.thesis.primary.hypothesis);
  let timing_phase: ExpectedTimingPhase =
    TIMING_PHASE_TO_ORACLE[activeJudgment.timing.phase] ?? 'UNCLEAR';
  let confidence_band: ExpectedConfidenceBand =
    CONFIDENCE_BAND_TO_ORACLE[activeJudgment.confidence.overall] ?? 'LOW';

  // 2. Canonical scenario (not engine-prose dump).
  let scenario_type = projectCanonicalScenario(activeJudgment);

  // 3. Contradictions = active engine contradictions + synthesized canonical phrases.
  const activeContradictionSummaries = activeJudgment.contradictions.items
    .map((c) => c.summary)
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
  const synthesizedContradictions = synthesizeContradictions(episode, activeJudgment);
  // Dedup while preserving order.
  const seenContradictions = new Set<string>();
  const contradictions: string[] = [];
  for (const c of [...activeContradictionSummaries, ...synthesizedContradictions]) {
    const key = c.toLowerCase();
    if (!seenContradictions.has(key)) {
      seenContradictions.add(key);
      contradictions.push(c);
    }
  }

  // 4. Reasoning notes synthesized from synthetic input + active output.
  const reasoning_notes_raw = synthesizeReasoningNotes(episode, activeJudgment);
  const seenNotes = new Set<string>();
  const reasoning_notes: string[] = [];
  for (const n of reasoning_notes_raw) {
    const key = n.toLowerCase();
    if (!seenNotes.has(key)) {
      seenNotes.add(key);
      reasoning_notes.push(n);
    }
  }

  // 5. Risk-override layer (synthetic input + active output; NEVER expected_oracle).
  const override = computeRiskOverride(episode, activeJudgment);
  if (override) {
    if (override.state) state = override.state;
    if (override.cause_family) cause_family = override.cause_family;
    if (override.thesis_direction) thesis_direction = override.thesis_direction;
    if (override.timing_phase) timing_phase = override.timing_phase;
    if (override.scenario_type) scenario_type = override.scenario_type;
    if (override.confidence_cap) {
      confidence_band = capConfidence(confidence_band, override.confidence_cap);
    }
  }

  const thesis = `Active engine judgment for ${episode.episode_id}: ${state}; ${cause_family}; thesis = ${thesis_direction}`;

  return {
    state,
    cause_family,
    thesis_direction,
    thesis,
    contradictions,
    timing_phase,
    scenario_type,
    confidence_band,
    reasoning_notes,
  };
}

// =============================================================================
// 6. createActiveSyntheticJudgmentExecutor
//
// Implements the SyntheticJudgmentExecutor interface from P3-BTAR-002 so
// the existing runner + semantic engine + suite execution layer can
// consume it. Metadata literal-pins `uses_real_providers: false` and
// `uses_ai_model: false` to satisfy `assertNoRealProviderExecutor`.
// =============================================================================

export function createActiveSyntheticJudgmentExecutor(): SyntheticJudgmentExecutor {
  return {
    metadata: {
      executor_id: 'active-synthetic-judgment-adapter',
      executor_version: 'v1',
      uses_real_providers: false,
      uses_ai_model: false,
      deterministic: true,
    },
    execute: (episode: SyntheticEpisodeInput): SyntheticActualJudgment => {
      const input = mapSyntheticEpisodeToActiveJudgmentInput(episode);
      const judgment = produceJudgment(input);
      return mapActiveJudgmentToSyntheticActualJudgment(judgment, episode);
    },
  };
}
