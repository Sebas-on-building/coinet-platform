/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     COINET JUDGMENT ENGINE — ORCHESTRATOR                                     ║
 * ║                                                                               ║
 * ║   Wires State, Contradiction, and Confidence engines into the                 ║
 * ║   7-part Judgment Output.                                                     ║
 * ║                                                                               ║
 * ║   Phase B: State + Contradiction + Confidence                                 ║
 * ║   Phase C: Full Timing & Sequence Engine                                      ║
 * ║   Phase D: + Hypothesis ranking (future)                                      ║
 * ║   Phase E: + Scenario engine (future)                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { classifyState } from './state-engine';
import { detectContradictions } from './contradiction-engine';
import { computeConfidence } from './confidence-engine';
import { classifyTimingFull } from './timing-engine';
import { buildSignalSnapshot, type SignalSnapshot } from './signal-snapshot';
import {
  CAUSAL_FAMILIES,
  FEATURE_TO_CAUSAL_FAMILY,
  HYPOTHESIS_CLASSES,
  MARKET_STATE_GROUPS,
  type CausalFamily,
  type MarketState,
} from './taxonomies';
import type {
  JudgmentOutput,
  JudgmentCause,
  JudgmentThesis,
  JudgmentTiming,
  JudgmentScenario,
  CausalDriver,
  RankedHypothesis,
} from './types';
import { JUDGMENT_VERSION } from './types';

// Re-export everything consumers need
export { buildSignalSnapshot } from './signal-snapshot';
export type { SignalSnapshot } from './signal-snapshot';
export type { JudgmentOutput } from './types';
export { JudgmentOutputSchema, JUDGMENT_VERSION } from './types';
export * from './taxonomies';
export { classifyTimingFull } from './timing-engine';
export type { FullTimingResult, SequenceAnalysis, InflectionSignal } from './timing-engine';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProduceJudgmentInput {
  entity_id: string;
  symbol: string;
  chain: string | null;
  signals: SignalSnapshot;
  /** OmniScore results (if available) for reference */
  scores?: {
    qs: number;
    os: number | null;
    risk: number;
    pos: number | null;
  };
}

/**
 * Produce a complete 7-part Judgment Output from a signal snapshot.
 *
 * This is THE orchestrator. All judgment engines run here in order:
 * 1. Classify state
 * 2. Detect contradictions
 * 3. Compute confidence
 * 4. Attribute causes
 * 5. Rank hypotheses (simplified v1)
 * 6. Classify timing (full timing & sequence engine)
 * 7. Generate scenario (simplified v1)
 * 8. Build evidence ledger
 * 9. Run quality checks
 */
export function produceJudgment(input: ProduceJudgmentInput): JudgmentOutput {
  const { entity_id, symbol, chain, signals, scores } = input;

  // 1. State
  const state = classifyState(signals);

  // 2. Contradictions
  const contradictions = detectContradictions(signals);

  // 3. Confidence (depends on state + contradictions)
  const confidence = computeConfidence({ signals, contradictions, state });

  // 4. Cause
  const cause = attributeCauses(signals);

  // 5. Thesis (simplified v1 — derive from state + cause)
  const thesis = rankHypotheses(state, cause, contradictions);

  // 6. Timing (full timing & sequence engine)
  const fullTiming = classifyTimingFull(
    { primary: state.primary, confidence: state.confidence },
    signals
  );
  const timing: JudgmentTiming = {
    phase: fullTiming.phase,
    score: fullTiming.score,
    sequence_position: fullTiming.sequence_position,
    sequence_total: fullTiming.sequence_total,
    maturity_warning: fullTiming.maturity_warning,
    maturity_note: fullTiming.maturity_note,
  };

  // 7. Scenario (simplified v1 — derive from state + contradictions)
  const scenario = generateScenario(state, contradictions, signals);

  // 8. Evidence ledger
  const evidence = buildEvidenceLedger(signals, contradictions);

  // 9. Quality checks
  const quality_checks = runQualityChecks(state, cause, contradictions, timing, scenario, confidence);

  return {
    version: JUDGMENT_VERSION,
    entity_id,
    symbol,
    chain,
    judged_at: new Date().toISOString(),
    state,
    cause,
    thesis,
    contradictions,
    timing,
    scenario,
    confidence,
    evidence,
    scores: scores ?? { qs: 0, os: null, risk: 0, pos: null },
    quality_checks,
    timing_extended: {
      sequence: fullTiming.sequence,
      maturity: fullTiming.maturity,
      inflections: fullTiming.inflections,
      projection: fullTiming.projection,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAUSE ATTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════════

function attributeCauses(signals: SignalSnapshot): JudgmentCause {
  const familyScores = new Map<CausalFamily, { strength: number; features: string[] }>();

  const featureValues: Record<string, number> = {
    open_interest_usd: signals.leverage_pressure,
    open_interest_change_24h: signals.leverage_pressure,
    funding_rate: signals.funding_rate,
    liquidations_24h_usd: signals.liquidation_density,
    volume_24h_usd: signals.volume_24h,
    price_change_24h: Math.abs(signals.price_momentum_24h),
    txns_buys_24h: signals.buy_sell_ratio,
    whale_net_flow_24h: signals.whale_activity,
    large_transactions_24h: signals.whale_activity,
    sentiment_score: Math.max(0, signals.sentiment),
    volume_mentions_24h: signals.narrative_intensity,
    social_dominance: signals.narrative_intensity,
    news_intensity: signals.narrative_intensity,
    tvl_usd: signals.tvl_trend,
    protocol_fees_usd: signals.revenue_quality,
    protocol_revenue_usd: signals.revenue_quality,
    active_addresses_24h: signals.fundamentals_strength,
    liquidity_usd: signals.liquidity,
    exchange_inflow_24h: signals.exchange_inflow,
    risk_score: signals.security_risk,
    top_10_percentage: signals.holder_concentration,
    unlock_next_usd: signals.unlock_pressure,
  };

  for (const [feature, value] of Object.entries(featureValues)) {
    const family = FEATURE_TO_CAUSAL_FAMILY[feature];
    if (!family || value < 0.1) continue;

    const existing = familyScores.get(family) ?? { strength: 0, features: [] };
    existing.strength = Math.max(existing.strength, value);
    existing.features.push(feature);
    familyScores.set(family, existing);
  }

  const ranked = [...familyScores.entries()]
    .map(([family, data]) => ({
      family,
      strength: data.strength,
      features: data.features,
    }))
    .sort((a, b) => b.strength - a.strength);

  const positiveDrivers: CausalDriver[] = [];
  const negativeDrivers: CausalDriver[] = [];

  const NEGATIVE_FAMILIES = new Set<CausalFamily>([
    CAUSAL_FAMILIES.SUPPLY_OVERHANG,
    CAUSAL_FAMILIES.STRUCTURAL_FRAGILITY,
    CAUSAL_FAMILIES.SECURITY_CONCERN,
    CAUSAL_FAMILIES.DISTRIBUTION_PRESSURE,
  ]);

  for (const item of ranked) {
    const driver: CausalDriver = {
      family: item.family,
      supporting_features: item.features,
      strength: item.strength,
      summary: getCausalSummary(item.family, item.strength),
    };

    if (NEGATIVE_FAMILIES.has(item.family)) {
      if (negativeDrivers.length < 3) negativeDrivers.push(driver);
    } else {
      if (positiveDrivers.length < 3) positiveDrivers.push(driver);
    }
  }

  return {
    positive_drivers: positiveDrivers,
    negative_drivers: negativeDrivers,
    dominant_cluster: ranked[0]?.family ?? CAUSAL_FAMILIES.SPOT_DEMAND,
    secondary_cluster: ranked[1]?.family ?? null,
  };
}

function getCausalSummary(family: CausalFamily, strength: number): string {
  const intensity = strength > 0.7 ? 'Strong' : strength > 0.4 ? 'Moderate' : 'Weak';
  const summaries: Record<CausalFamily, string> = {
    leverage_expansion: `${intensity} derivatives expansion driving price action`,
    spot_demand: `${intensity} organic spot demand and volume`,
    smart_money_accumulation: `${intensity} smart-money accumulation signals`,
    narrative_acceleration: `${intensity} narrative and social momentum`,
    fundamentals_improvement: `${intensity} protocol fundamental improvement`,
    liquidity_emergence: `${intensity} liquidity formation`,
    supply_overhang: `${intensity} supply overhang pressure`,
    structural_fragility: `${intensity} structural fragility signals`,
    security_concern: `${intensity} security and trust concerns`,
    distribution_pressure: `${intensity} distribution and selling pressure`,
  };
  return summaries[family];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HYPOTHESIS RANKING (Simplified v1)
// ═══════════════════════════════════════════════════════════════════════════════

function rankHypotheses(
  state: ReturnType<typeof classifyState>,
  cause: JudgmentCause,
  contradictions: ReturnType<typeof detectContradictions>
): JudgmentThesis {
  const stateGroup = MARKET_STATE_GROUPS[state.primary];
  const dominant = cause.dominant_cluster;

  const hypotheses: RankedHypothesis[] = [];

  if (stateGroup === 'expansion' && dominant === CAUSAL_FAMILIES.SPOT_DEMAND) {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.GENUINE_BREAKOUT, 0.7, contradictions));
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.FUNDAMENTALLY_SUPPORTED_RERATING, 0.5, contradictions));
  } else if (stateGroup === 'expansion' && dominant === CAUSAL_FAMILIES.LEVERAGE_EXPANSION) {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.LEVERAGE_DRIVEN_SQUEEZE, 0.7, contradictions));
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.CROWDED_CONTINUATION, 0.5, contradictions));
  } else if (stateGroup === 'expansion' && dominant === CAUSAL_FAMILIES.SMART_MONEY_ACCUMULATION) {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.EARLY_ACCUMULATION, 0.7, contradictions));
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.GENUINE_BREAKOUT, 0.4, contradictions));
  } else if (stateGroup === 'expansion' && dominant === CAUSAL_FAMILIES.NARRATIVE_ACCELERATION) {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.NARRATIVE_ONLY_PUMP, 0.6, contradictions));
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.GENUINE_BREAKOUT, 0.3, contradictions));
  } else if (stateGroup === 'fragility') {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.CROWDED_CONTINUATION, 0.6, contradictions));
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.DISTRIBUTION_UNDER_HYPE, 0.4, contradictions));
  } else if (stateGroup === 'risk' && dominant === CAUSAL_FAMILIES.DISTRIBUTION_PRESSURE) {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.DISTRIBUTION_UNDER_HYPE, 0.7, contradictions));
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.POST_UNLOCK_SELL_PRESSURE, 0.3, contradictions));
  } else if (stateGroup === 'risk' && dominant === CAUSAL_FAMILIES.SECURITY_CONCERN) {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.LOW_QUALITY_MANIPULATED_LAUNCH, 0.7, contradictions));
  } else if (stateGroup === 'discovery') {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.EARLY_ACCUMULATION, 0.5, contradictions));
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.LOW_QUALITY_MANIPULATED_LAUNCH, 0.3, contradictions));
  } else {
    hypotheses.push(makeHypothesis(HYPOTHESIS_CLASSES.CROWDED_CONTINUATION, 0.4, contradictions));
  }

  hypotheses.sort((a, b) => b.confidence - a.confidence);

  const primary = hypotheses[0];
  const secondary = hypotheses.length > 1 ? hypotheses[1] : null;
  const clarity = secondary ? primary.confidence - secondary.confidence : primary.confidence;

  return {
    primary,
    secondary,
    clarity: Math.min(1, Math.max(0, clarity)),
    ambiguity_flag: clarity < 0.15,
  };
}

function makeHypothesis(
  hypothesis: (typeof HYPOTHESIS_CLASSES)[keyof typeof HYPOTHESIS_CLASSES],
  baseSupport: number,
  contradictions: ReturnType<typeof detectContradictions>
): RankedHypothesis {
  const contradictionPenalty = contradictions.load * 0.3;
  const confidence = Math.max(0, Math.min(1, baseSupport - contradictionPenalty));

  return {
    hypothesis,
    support_score: baseSupport,
    contradiction_score: contradictions.load,
    confidence,
    missing_evidence: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO (Simplified v1)
// ═══════════════════════════════════════════════════════════════════════════════

function generateScenario(
  state: ReturnType<typeof classifyState>,
  contradictions: ReturnType<typeof detectContradictions>,
  signals: SignalSnapshot
): JudgmentScenario {
  const stateGroup = MARKET_STATE_GROUPS[state.primary];
  const topContradiction = contradictions.items[0];

  const scenarios: Record<string, { base: string; bull: string; bear: string; trigger: string }> = {
    discovery: {
      base: 'Early-stage formation with limited data.',
      bull: 'Liquidity deepens and narrative develops with real demand.',
      bear: 'Liquidity dries up or security concerns emerge.',
      trigger: 'Watch for sustained volume and holder growth.',
    },
    expansion: {
      base: 'Active expansion with positive momentum.',
      bull: 'Spot volume confirms and fundamentals strengthen.',
      bear: 'Volume fades or leverage becomes overextended.',
      trigger: 'Watch for spot volume follow-through and funding normalization.',
    },
    fragility: {
      base: 'Crowded continuation with elevated fragility.',
      bull: 'Spot participation strengthens while funding cools.',
      bear: 'Exchange inflows rise and liquidation cascade begins.',
      trigger: 'Watch for spot-led confirmation within next 24h.',
    },
    risk: {
      base: 'Distribution or structural weakness present.',
      bull: 'Selling pressure subsides and inflows resume.',
      bear: 'Distribution continues and price support breaks.',
      trigger: 'Watch for exchange outflow reversal and whale re-entry.',
    },
  };

  const s = scenarios[stateGroup] ?? scenarios.expansion;

  let base = s.base;
  if (topContradiction) {
    base += ` Key tension: ${topContradiction.summary.toLowerCase()}`;
  }

  const scenarioConfidence = Math.max(0, Math.min(1,
    signals.data_completeness * 0.4 +
    state.confidence * 0.3 +
    (1 - contradictions.load) * 0.3
  ));

  return {
    base_case: base,
    bullish_confirmation: s.bull,
    bearish_failure: s.bear,
    next_trigger: s.trigger,
    scenario_confidence: scenarioConfidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

function buildEvidenceLedger(
  signals: SignalSnapshot,
  contradictions: ReturnType<typeof detectContradictions>
) {
  const positive: string[] = [];
  const negative: string[] = [];
  const unresolved: string[] = [];
  const stale: string[] = [];

  if (signals.volume_24h > 0.3) positive.push('Strong volume');
  if (signals.whale_activity > 0.4) positive.push('Whale accumulation');
  if (signals.fundamentals_strength > 0.4) positive.push('Solid fundamentals');
  if (signals.narrative_intensity > 0.4) positive.push('Active narrative');
  if (signals.liquidity > 0.3) positive.push('Good liquidity');
  if (signals.exchange_outflow > 0.3) positive.push('Exchange outflows');

  if (signals.security_risk > 0.5) negative.push('Elevated security risk');
  if (signals.leverage_pressure > 0.6) negative.push('High leverage');
  if (signals.exchange_inflow > 0.4) negative.push('Exchange inflows elevated');
  if (signals.holder_concentration > 0.7) negative.push('High holder concentration');
  if (signals.unlock_pressure > 0.3) negative.push('Unlock approaching');

  for (const c of contradictions.items) {
    if (!c.resolvable) {
      unresolved.push(c.summary);
    }
  }

  if (signals.data_freshness < 0.5) stale.push('Some data sources are stale');
  if (signals.data_completeness < 0.6) stale.push('Multiple data modules unavailable');

  return { positive, negative, unresolved, stale };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY CHECKS (the 6-check standard)
// ═══════════════════════════════════════════════════════════════════════════════

function runQualityChecks(
  state: ReturnType<typeof classifyState>,
  cause: JudgmentCause,
  contradictions: ReturnType<typeof detectContradictions>,
  timing: JudgmentTiming,
  scenario: JudgmentScenario,
  confidence: ReturnType<typeof computeConfidence>
) {
  const has_clear_state = state.confidence > 0.2;
  const has_top_causes = cause.positive_drivers.length > 0 || cause.negative_drivers.length > 0;
  const has_contradictions = Array.isArray(contradictions.items);
  const has_timing =
    typeof timing.phase === 'string' &&
    timing.phase.length > 0 &&
    Number.isFinite(timing.score) &&
    timing.score >= 0 &&
    timing.score <= 100 &&
    Number.isInteger(timing.sequence_position) &&
    Number.isInteger(timing.sequence_total) &&
    timing.sequence_position >= 1 &&
    timing.sequence_total >= 1 &&
    timing.sequence_position <= timing.sequence_total;
  const has_next_conditions = scenario.next_trigger.length > 0;
  const has_honest_confidence =
    Number.isFinite(confidence.score) &&
    confidence.score >= 0 &&
    confidence.score <= 1;

  return {
    has_clear_state,
    has_top_causes,
    has_contradictions,
    has_timing,
    has_next_conditions,
    has_honest_confidence,
    all_passed: has_clear_state && has_top_causes && has_contradictions &&
                has_timing && has_next_conditions && has_honest_confidence,
  };
}
