/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     COINET JUDGMENT ENGINE — ORCHESTRATOR                                     ║
 * ║                                                                               ║
 * ║   Wires State, Contradiction, and Confidence engines into the                 ║
 * ║   7-part Judgment Output.                                                     ║
 * ║                                                                               ║
 * ║   Phase B: State + Contradiction + Confidence                                 ║
 * ║   Phase C: Full Timing & Sequence Engine                                      ║
 * ║   Phase D: Dynamic Hypothesis Ranking (v2)                                    ║
 * ║   Phase E: Dynamic Scenario Engine (v2)                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { classifyState } from './state-engine';
import { detectContradictions } from './contradiction-engine';
import { computeConfidence } from './confidence-engine';
import { classifyTimingFull, type FullTimingResult } from './timing-engine';
import { buildSignalSnapshot, type SignalSnapshot } from './signal-snapshot';
import {
  familyApplicability,
  deriveFamilyDataPresence,
  mapGraphSectorToOmniSector,
} from './asset-applicability';
import type { Sector, CapBucket } from '../omniscore_v3';
import {
  CAUSAL_FAMILIES,
  FEATURE_TO_CAUSAL_FAMILY,
  HYPOTHESIS_CLASSES,
  MARKET_STATE_GROUPS,
  MARKET_STATE_LABELS,
  HYPOTHESIS_LABELS,
  type CausalFamily,
  type MarketState,
  type HypothesisClass,
} from './taxonomies';
import type {
  JudgmentOutput,
  JudgmentCause,
  JudgmentThesis,
  JudgmentTiming,
  JudgmentScenario,
  HorizonScenario,
  CausalDriver,
  RankedHypothesis,
} from './types';
import { JUDGMENT_VERSION } from './types';
import { classifyRegime, type MarketWideInputs, type UnifiedRegime } from './regime-engine';
import { produceHypothesisOutput, type ProduceHypothesisResult } from '../hypotheses/orchestrator';
import { formatHypothesisForAI } from '../hypotheses/explainer';
import { persistHypothesisJudgmentSnapshot } from '../hypotheses/logging';
import { captureJudgmentSnapshot } from '../calibration-spine/snapshot-writer';
import type { EntityConfidenceState } from '../canonicalization/entity-confidence-model';
import type { ConfidenceGateDecision } from '../canonicalization/confidence-gate';

// Re-export everything consumers need
export { buildSignalSnapshot } from './signal-snapshot';
export type { SignalSnapshot } from './signal-snapshot';
export type { JudgmentOutput } from './types';
export { JudgmentOutputSchema, JUDGMENT_VERSION } from './types';
export * from './taxonomies';
export { classifyTimingFull } from './timing-engine';
export type { FullTimingResult, SequenceAnalysis, InflectionSignal, TemporalAnalysis, TimestampedSnapshot } from './timing-engine';
export { classifyRegime } from './regime-engine';
export type { UnifiedRegime, MacroContext, EcosystemPosture, MarketWideInputs } from './regime-engine';
export { produceHypothesisOutput } from '../hypotheses/orchestrator';
export type { HypothesisOutput, RankedHypothesis as HypothesisRanked } from '../hypotheses/types';

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
  /** Market-wide inputs for regime classification (Layer 8) */
  marketWide?: Partial<MarketWideInputs>;
  /** Entity context from Knowledge Graph (Layer 4) — enriches regime + scenario */
  entityContext?: {
    ecosystem: string | null;
    sector: string | null;
    relatedAssets: string[];
    narratives: string[];
    competitors: string[];
    capBucket: string | null;
  };
  /**
   * OmniScore asset Sector (L1/DeFi/Memecoin/Stablecoin/…), resolved upstream
   * where the CoinGecko id is known. Drives per-family applicability so each
   * asset is judged by the right lens. Falls back to the knowledge-graph sector,
   * then 'Unknown' (conservative — all families applicable).
   */
  assetSector?: Sector;
  /** OmniScore market-cap bucket — reserved for confidence expectation calibration. */
  capBucket?: CapBucket;
  /** L3.3-B: identity confidence state for gate enforcement */
  identityConfidenceState?: EntityConfidenceState;
}

/**
 * Produce a complete 7-part Judgment Output from a signal snapshot.
 *
 * This is THE orchestrator. All judgment engines run here in order:
 * 1. Classify state
 * 2. Detect contradictions
 * 3. Attribute causes
 * 4. Classify timing (full timing & sequence engine)
 * 5. Rank hypotheses (v2 — dynamic signal-aligned scoring)
 * 6. Generate scenario (v2 — dynamic from state+cause+contradiction+timing)
 * 7. Compute confidence
 * 8. Build evidence ledger
 * 9. Run quality checks
 */
export function produceJudgment(input: ProduceJudgmentInput): JudgmentOutput {
  const { entity_id, symbol, chain, scores, marketWide, entityContext } = input;

  // ── Asset applicability (purpose → lens) ───────────────────────────────────
  // Resolve the asset's Sector and annotate the snapshot with per-family
  // applicability BEFORE the engines run, so confidence/contradiction/hypothesis
  // all judge by the same purpose→lens map. Sector priority: OmniScore (supplied)
  // → knowledge-graph sector → 'Unknown' (conservative: all families applicable).
  // Annotate a COPY — never mutate the caller's input.signals (keeps input-side
  // fingerprints and other downstream consumers byte-stable); the engines below
  // read this annotated copy.
  const resolvedSector: Sector =
    input.assetSector ?? mapGraphSectorToOmniSector(entityContext?.sector) ?? 'Unknown';
  const signals: SignalSnapshot = {
    ...input.signals,
    _applicability: familyApplicability(
      resolvedSector,
      input.capBucket ?? (entityContext?.capBucket as CapBucket | null) ?? null,
      deriveFamilyDataPresence(input.signals),
    ),
  };

  // L3.3-B gate enforcement — compute gate decisions before engines run
  let identityConfidenceOutput: JudgmentOutput['identity_confidence'];
  if (input.identityConfidenceState) {
    try {
      const { canUseForScoring, canUseForContradiction, canUseForScenario, canUseForJudgment } =
        require('../canonicalization/confidence-gate') as typeof import('../canonicalization/confidence-gate');
      const cState = input.identityConfidenceState;
      const objType = cState.objectType;
      const sg = canUseForScoring(entity_id, objType, cState);
      const cg = canUseForContradiction(entity_id, objType, cState, { allowConditional: true });
      const scg = canUseForScenario(entity_id, objType, cState, { allowConditional: true });
      const jg = canUseForJudgment(entity_id, objType, cState);
      identityConfidenceOutput = {
        band: cState.band,
        epistemic_state: cState.epistemicState,
        scoring_gate: sg.mode,
        contradiction_gate: cg.mode,
        scenario_gate: scg.mode,
        judgment_gate: jg.mode,
        disclosure_required: cState.band === 'UNRESOLVED' || cState.band === 'LOW'
          || cState.epistemicState === 'CONTESTED',
        active_scars: cState.activeScars.map(s => s.code),
        state_id: cState.stateId,
      };
    } catch { /* L3.3-B integration is best-effort during rollout */ }
  }

  // 1. State
  const state = classifyState(signals);

  // 2. Contradictions
  const contradictions = detectContradictions(signals);

  // 3. Cause
  const cause = attributeCauses(signals);

  // 4. Timing (full timing & sequence engine — needed by thesis + scenario)
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

  // 5. Regime (Layer 8 — runs BEFORE thesis/scenario so they can consume regime context)
  const regimeMarketWide: Partial<MarketWideInputs> = {
    ...marketWide,
    ...(entityContext?.ecosystem ? { ecosystem_chain: entityContext.ecosystem.replace('chain:', '') } : {}),
    ...(entityContext?.sector ? { sector: entityContext.sector.replace('sector:', '') } : {}),
    ...(entityContext?.capBucket ? { capBucket: entityContext.capBucket } : {}),
  };
  const regime = classifyRegime(signals, regimeMarketWide);

  // 6. Thesis (v3 — regime-aware, context-aware, dynamic scoring)
  const thesis = rankHypotheses(state, cause, contradictions, signals, entityContext, regime);

  // 6b. Hypothesis Engine (Phase 3 Wave 2 — full evidence-linked ranking)
  let hypothesisEngineResult: ProduceHypothesisResult | undefined;
  try {
    hypothesisEngineResult = produceHypothesisOutput({
      signals,
      regimePrimary: regime?.macro?.posture,
      sequenceState: fullTiming?.sequence?.summary,
      regimeConfigVersion: regime?.configVersion,
    });

    persistHypothesisJudgmentSnapshot({
      assetCanonicalId: entity_id,
      assetSymbol: symbol,
      chainId: chain ?? undefined,
      judgmentTimestamp: new Date(),
      regimePrimary: regime?.macro?.posture,
      sequenceState: fullTiming?.sequence?.summary,
      timingPhase: fullTiming?.phase,
      hypothesisOutput: hypothesisEngineResult.hypothesisOutput,
      coverage: hypothesisEngineResult.coverage,
      configVersions: hypothesisEngineResult.configVersions,
      contradictionLoad: contradictions.load as number,
    }).catch(() => {});
  } catch { /* hypothesis engine is best-effort in this rollout */ }

  // 7. Scenario (v3 — horizon-aware, regime+hypothesis+contradiction referencing)
  const scenario = generateScenario(state, cause, thesis, contradictions, fullTiming, signals, entityContext, regime);

  // 8. Confidence (depends on state + contradictions + regime modifier)
  const confidence = computeConfidence({
    signals,
    contradictions,
    state,
    regimeModifier: regime.confidenceModifier,
  });

  // 9. Source Systems doctrine enforcement (best-effort — non-blocking)
  try {
    const { enforceR6SecurityCap, getAggregateConfidencePenalty } = require('../source-systems');
    // Rule 6: Security cap on confidence
    if (signals.security_risk > 0.5) {
      const { cappedConfidence } = enforceR6SecurityCap(signals.security_risk, confidence.score);
      if (cappedConfidence < confidence.score) {
        (confidence as any).score = cappedConfidence;
        (confidence as any).primary_uncertainty = (confidence as any).primary_uncertainty
          || `Security risk (${(signals.security_risk * 100).toFixed(0)}%) caps confidence`;
      }
    }
    // Source degradation penalty
    const degradationPenalty = getAggregateConfidencePenalty();
    if (degradationPenalty > 0.01) {
      (confidence as any).score = Math.max(0, confidence.score - degradationPenalty);
    }
  } catch { /* source-systems integration is best-effort */ }

  // 10. Evidence ledger
  const evidence = buildEvidenceLedger(signals, contradictions);

  // 11. Quality checks
  const quality_checks = runQualityChecks(state, cause, contradictions, timing, scenario, confidence);

  // 12. Calibration Spine — snapshot capture (Phase 3 Wave 3, Gate 1)
  try {
    const heOutput = hypothesisEngineResult?.hypothesisOutput;
    captureJudgmentSnapshot({
      assetCanonicalId: entity_id,
      assetSymbol: symbol,
      chainId: chain ?? undefined,
      priceAtJudgment: 0,
      regimePrimary: regime?.macro?.posture,
      sequenceState: fullTiming?.sequence?.summary,
      timingPhase: fullTiming?.phase,
      primaryHypothesisId: heOutput?.primary?.id ?? thesis.primary.hypothesis,
      primaryHypothesisScore: heOutput?.primary?.score ?? thesis.primary.support_score,
      primaryHypothesisConfidence: heOutput?.primary?.confidence ?? thesis.primary.confidence,
      secondaryHypothesisId: heOutput?.secondary?.id ?? thesis.secondary?.hypothesis,
      secondaryHypothesisScore: heOutput?.secondary?.score ?? thesis.secondary?.support_score,
      confidenceSpread: heOutput ? (heOutput.primary.score - (heOutput.secondary?.score ?? 0)) : thesis.clarity,
      ambiguityLevel: heOutput?.ambiguityLevel ?? (thesis.ambiguity_flag ? 'high' : 'low'),
      opportunityScore: scores?.os ?? undefined,
      riskScore: scores?.risk ?? undefined,
      qualityScore: scores?.qs ?? undefined,
      signalConfidence: confidence.score,
      contradictionLoad: contradictions.load as number,
      contradictionClasses: contradictions.items.map((c: any) => c.class),
      coverageScore: signals.data_completeness,
      degradedDomains: signals._missing ? [...signals._missing] : [],
      decisiveMissingEvidence: heOutput?.decisiveMissingEvidence ?? [],
      hypothesisConfigVersion: hypothesisEngineResult?.configVersions?.hypothesisRegistryVersion ?? 'legacy',
      regimeConfigVersion: regime?.configVersion,
    });
  } catch { /* calibration snapshot is best-effort */ }

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
    regime,
    timing_extended: {
      sequence: fullTiming.sequence,
      maturity: fullTiming.maturity,
      inflections: fullTiming.inflections,
      projection: fullTiming.projection,
    },
    hypothesisEngine: hypothesisEngineResult ? {
      output: hypothesisEngineResult.hypothesisOutput,
      coverage: hypothesisEngineResult.coverage,
      configVersions: hypothesisEngineResult.configVersions,
      auditNotes: hypothesisEngineResult.internalProfiles.auditNotes,
    } : undefined,
    identity_confidence: identityConfidenceOutput,
  };
}

/**
 * Applicability gate for fundamentals-based "missing evidence" notes. We only
 * tell the user that fundamentals are missing/weak when fundamentals are the
 * right lens for this asset AND we have real data (SCORED). For assets where
 * fundamentals are NOT_APPLICABLE (e.g. memecoins) or we lack a source
 * (APPLICABLE_NO_DATA — e.g. BTC network fundamentals), surfacing "fundamental
 * backing would strengthen thesis" is misleading. Legacy fallback: when no
 * applicability is attached, behave as before.
 */
function fundamentalsLensScored(s: SignalSnapshot): boolean {
  const a = s._applicability;
  if (!a) return true;
  return a.fundamentals_protocol === 'SCORED' || a.fundamentals_network === 'SCORED';
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
// HYPOTHESIS RANKING (v2 — dynamic signal-aligned scoring)
//
// Each hypothesis has a signal-derived support function, a set of
// contradiction classes that specifically weaken it, and a function
// that identifies missing evidence.
// ═══════════════════════════════════════════════════════════════════════════════

/** Linear interpolation between min→0 and max→1, clamped. */
function scale(value: number, min: number, max: number): number {
  if (max <= min) return value >= min ? 1 : 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

interface HypothesisProfile {
  id: HypothesisClass;
  label?: string;
  /** State groups where this hypothesis is plausible */
  plausibleGroups: ReadonlySet<string>;
  /** Aligned causal family — gets a boost when cause.dominant matches */
  alignedCause: CausalFamily;
  /** Compute raw support from actual signal values (0–1) */
  computeSupport(s: SignalSnapshot): number;
  /** Contradiction classes that specifically undermine this hypothesis */
  weakenedBy: ReadonlySet<string>;
  /** Identify evidence gaps that would increase confidence */
  getMissingEvidence(s: SignalSnapshot): string[];
}

const HYPOTHESIS_PROFILES: HypothesisProfile[] = [
  // ── EARLY ACCUMULATION ──────────────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.EARLY_ACCUMULATION,
    plausibleGroups: new Set(['discovery', 'expansion']),
    alignedCause: CAUSAL_FAMILIES.SMART_MONEY_ACCUMULATION,
    computeSupport(s) {
      let v = 0;
      v += 0.25 * scale(s.whale_activity, 0.15, 0.6);
      v += 0.20 * scale(s.exchange_outflow, 0.1, 0.5);
      v += 0.15 * scale(1 - s.leverage_pressure, 0.5, 1.0);
      v += 0.15 * scale(1 - s.narrative_intensity, 0.5, 1.0);
      v += 0.15 * scale(s.price_momentum_24h + 0.1, 0, 0.3);
      if (s.volume_24h > 0.05 && s.volume_24h < 0.5) v += 0.10;
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['late_whale_entry', 'sentiment_vs_onchain']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.volume_24h < 0.2) m.push('Spot volume confirmation needed');
      if (fundamentalsLensScored(s) && s.fundamentals_strength < 0.3) m.push('Fundamental backing would strengthen thesis');
      if (s.liquidity < 0.2) m.push('Liquidity depth needed for sustainability');
      return m;
    },
  },

  // ── GENUINE BREAKOUT ────────────────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.GENUINE_BREAKOUT,
    plausibleGroups: new Set(['expansion']),
    alignedCause: CAUSAL_FAMILIES.SPOT_DEMAND,
    computeSupport(s) {
      let v = 0;
      v += 0.25 * scale(s.volume_24h, 0.2, 0.7);
      v += 0.20 * scale(s.price_momentum_24h, 0.05, 0.3);
      v += 0.15 * scale(s.liquidity, 0.15, 0.5);
      v += 0.15 * scale(s.buy_sell_ratio, 0.5, 0.7);
      // Spot should outpace leverage
      const spotOverLeverage = Math.max(0, s.volume_24h - s.leverage_pressure);
      v += 0.15 * scale(spotOverLeverage, 0, 0.3);
      v += 0.10 * scale(s.whale_activity, 0.1, 0.5);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['price_vs_fundamentals', 'price_vs_spot_structure', 'leverage_vs_spot']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (fundamentalsLensScored(s) && s.fundamentals_strength < 0.3) m.push('Fundamental validation would confirm real breakout');
      if (s.whale_activity < 0.3) m.push('Smart money participation not yet confirmed');
      if (s.exchange_outflow < 0.2) m.push('Exchange outflow conviction signal absent');
      return m;
    },
  },

  // ── FUNDAMENTALLY SUPPORTED RERATING ────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.FUNDAMENTALLY_SUPPORTED_RERATING,
    plausibleGroups: new Set(['expansion']),
    alignedCause: CAUSAL_FAMILIES.FUNDAMENTALS_IMPROVEMENT,
    computeSupport(s) {
      let v = 0;
      v += 0.30 * scale(s.fundamentals_strength, 0.3, 0.8);
      v += 0.20 * scale(s.tvl_trend, 0.2, 0.6);
      v += 0.20 * scale(s.revenue_quality, 0.2, 0.6);
      v += 0.15 * scale(s.price_momentum_24h, -0.05, 0.2);
      v += 0.15 * scale(1 - s.security_risk, 0.5, 1.0);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['tvl_vs_inflows', 'price_vs_fundamentals']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.narrative_intensity < 0.2) m.push('Market has not yet recognized fundamental improvement');
      if (s.volume_24h < 0.2) m.push('Volume confirmation needed');
      if (s.whale_activity < 0.2) m.push('Smart money participation would strengthen thesis');
      return m;
    },
  },

  // ── LEVERAGE-DRIVEN SQUEEZE ─────────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.LEVERAGE_DRIVEN_SQUEEZE,
    plausibleGroups: new Set(['expansion', 'fragility']),
    alignedCause: CAUSAL_FAMILIES.LEVERAGE_EXPANSION,
    computeSupport(s) {
      let v = 0;
      v += 0.30 * scale(s.leverage_pressure, 0.35, 0.8);
      v += 0.20 * scale(s.funding_rate, 0.3, 0.7);
      v += 0.20 * scale(s.liquidation_density, 0.2, 0.6);
      v += 0.15 * scale(s.price_momentum_24h, 0.0, 0.2);
      // Leverage exceeding spot is the defining signature
      const leverageOverSpot = Math.max(0, s.leverage_pressure - s.volume_24h);
      v += 0.15 * scale(leverageOverSpot, 0.05, 0.35);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['leverage_vs_spot', 'volume_vs_liquidity']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.volume_24h < 0.3) m.push('Spot volume confirmation would de-risk the setup');
      if (fundamentalsLensScored(s) && s.fundamentals_strength < 0.2) m.push('No fundamental backing increases fragility');
      if (s.whale_activity < 0.2) m.push('No smart money participation detected');
      return m;
    },
  },

  // ── NARRATIVE-ONLY PUMP ─────────────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.NARRATIVE_ONLY_PUMP,
    plausibleGroups: new Set(['expansion', 'fragility', 'discovery']),
    alignedCause: CAUSAL_FAMILIES.NARRATIVE_ACCELERATION,
    computeSupport(s) {
      let v = 0;
      v += 0.30 * scale(s.narrative_intensity, 0.3, 0.8);
      v += 0.20 * scale(Math.max(0, s.sentiment), 0.1, 0.6);
      // Weak fundamentals confirm narrative-only nature
      v += 0.20 * scale(1 - s.fundamentals_strength, 0.6, 1.0);
      v += 0.15 * scale(s.price_momentum_24h, 0.0, 0.2);
      // Low whale activity means retail-driven
      v += 0.15 * scale(1 - s.whale_activity, 0.5, 1.0);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['positive_signals_vs_security', 'volume_vs_liquidity']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.fundamentals_strength > 0.3) m.push('Fundamentals may support move — narrative-only thesis weakened');
      if (s.exchange_inflow < 0.1 && s.exchange_outflow < 0.1) m.push('Exchange flow data needed to assess distribution risk');
      if (s.whale_activity > 0.3) m.push('Whale participation detected — may not be purely narrative');
      return m;
    },
  },

  // ── LOW QUALITY / MANIPULATED LAUNCH ────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.LOW_QUALITY_MANIPULATED_LAUNCH,
    plausibleGroups: new Set(['discovery', 'risk']),
    alignedCause: CAUSAL_FAMILIES.SECURITY_CONCERN,
    computeSupport(s) {
      let v = 0;
      v += 0.35 * scale(s.security_risk, 0.4, 0.9);
      v += 0.25 * scale(s.holder_concentration, 0.5, 0.9);
      v += 0.20 * scale(1 - s.liquidity, 0.7, 1.0);
      if (s.pair_age_hours !== null && s.pair_age_hours < 48) v += 0.20;
      else if (s.pair_age_hours !== null && s.pair_age_hours < 168) v += 0.10;
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['positive_signals_vs_security']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.security_risk < 0.7 && s.security_risk > 0.3) m.push('Security assessment inconclusive — more data needed');
      if (s.holder_concentration < 0.6) m.push('Holder distribution data incomplete');
      if (s.data_completeness < 0.5) m.push('Significant data gaps prevent definitive classification');
      return m;
    },
  },

  // ── POST-UNLOCK SELL PRESSURE ───────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.POST_UNLOCK_SELL_PRESSURE,
    plausibleGroups: new Set(['risk', 'fragility']),
    alignedCause: CAUSAL_FAMILIES.SUPPLY_OVERHANG,
    computeSupport(s) {
      let v = 0;
      v += 0.35 * scale(s.unlock_pressure, 0.2, 0.7);
      v += 0.25 * scale(s.exchange_inflow, 0.2, 0.6);
      v += 0.20 * scale(-s.price_momentum_24h, 0.0, 0.2);
      v += 0.20 * scale(1 - s.whale_activity, 0.6, 1.0);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['growth_vs_unlock']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.exchange_outflow < 0.1) m.push('Exchange outflow data needed to detect selling exhaustion');
      if (s.whale_activity > 0.3) m.push('Whale accumulation may be absorbing unlock supply');
      return m;
    },
  },

  // ── DISTRIBUTION UNDER HYPE ─────────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.DISTRIBUTION_UNDER_HYPE,
    plausibleGroups: new Set(['fragility', 'risk']),
    alignedCause: CAUSAL_FAMILIES.DISTRIBUTION_PRESSURE,
    computeSupport(s) {
      let v = 0;
      v += 0.30 * scale(s.exchange_inflow, 0.25, 0.7);
      v += 0.25 * scale(s.narrative_intensity, 0.25, 0.6);
      v += 0.20 * scale(1 - s.whale_activity, 0.5, 1.0);
      // Price flat or slightly up while distribution happens
      if (s.price_momentum_24h > -0.1 && s.price_momentum_24h < 0.1) v += 0.15;
      v += 0.10 * scale(s.volume_24h, 0.15, 0.5);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['sentiment_vs_onchain', 'leverage_vs_spot']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.exchange_inflow < 0.3) m.push('Exchange inflow signal is moderate — distribution thesis uncertain');
      if (fundamentalsLensScored(s) && s.fundamentals_strength < 0.2) m.push('Fundamental health assessment needed');
      return m;
    },
  },

  // ── SECTOR SPILLOVER / REPRICING ────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.SECTOR_SPILLOVER_REPRICING,
    plausibleGroups: new Set(['expansion', 'discovery']),
    alignedCause: CAUSAL_FAMILIES.NARRATIVE_ACCELERATION,
    computeSupport(s) {
      let v = 0;
      // Moderate narrative + weak fundamentals + price movement = sector flow
      v += 0.25 * scale(s.narrative_intensity, 0.2, 0.5);
      v += 0.25 * scale(s.price_momentum_24h, 0.03, 0.2);
      v += 0.20 * scale(1 - s.fundamentals_strength, 0.5, 1.0);
      v += 0.15 * scale(1 - s.leverage_pressure, 0.4, 0.8);
      v += 0.15 * scale(s.volume_24h, 0.1, 0.4);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['price_vs_fundamentals', 'narrative_before_fundamentals']),
    getMissingEvidence(s) {
      const m: string[] = [];
      m.push('Cross-asset correlation data not available in current snapshot');
      if (s.data_completeness < 0.6) m.push('Incomplete data prevents sector flow confirmation');
      return m;
    },
  },

  // ── CROWDED CONTINUATION ────────────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.CROWDED_CONTINUATION,
    plausibleGroups: new Set(['expansion', 'fragility']),
    alignedCause: CAUSAL_FAMILIES.LEVERAGE_EXPANSION,
    computeSupport(s) {
      let v = 0;
      v += 0.30 * scale(s.leverage_pressure, 0.45, 0.85);
      v += 0.20 * scale(s.funding_rate, 0.4, 0.75);
      v += 0.15 * scale(s.price_momentum_24h, 0.03, 0.2);
      v += 0.15 * scale(s.narrative_intensity, 0.3, 0.7);
      v += 0.20 * scale(s.liquidation_density, 0.3, 0.7);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['leverage_vs_spot', 'volume_vs_liquidity']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.volume_24h < 0.3) m.push('Spot participation unclear — volume confirmation needed');
      if (fundamentalsLensScored(s) && s.fundamentals_strength < 0.2) m.push('No fundamental anchor for continuation');
      if (s.whale_activity < 0.2) m.push('No smart money participation to absorb liquidation cascades');
      return m;
    },
  },

  // ── CAPITULATION RESET ───────────────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.CAPITULATION_RESET,
    label: 'Capitulation Reset',
    plausibleGroups: new Set(['risk', 'fragility']),
    alignedCause: CAUSAL_FAMILIES.STRUCTURAL_FRAGILITY as CausalFamily,
    computeSupport(s: SignalSnapshot) {
      let v = 0;
      v += 0.30 * scale(Math.abs(s.price_momentum_24h), 0.1, 0.3);
      v += 0.25 * scale(s.exchange_inflow, 0.3, 0.7);
      v += 0.20 * scale(1 - s.buy_sell_ratio, 0.3, 0.7);
      v += 0.15 * scale(s.liquidation_density, 0.3, 0.7);
      v += 0.10 * scale(1 - s.sentiment, 0.3, 0.8);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['volume_vs_liquidity']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.volume_24h > 0.5) m.push('Volume still elevated — capitulation may not be complete');
      if (s.whale_activity > 0.4) m.push('Smart money still active — not typical capitulation');
      return m;
    },
  },

  // ── FORCED LIQUIDATION CASCADE ───────────────────────────────────────────
  {
    id: HYPOTHESIS_CLASSES.FORCED_LIQUIDATION_CASCADE,
    label: 'Forced Liquidation Cascade',
    plausibleGroups: new Set(['risk', 'fragility', 'expansion']),
    alignedCause: CAUSAL_FAMILIES.LEVERAGE_EXPANSION as CausalFamily,
    computeSupport(s: SignalSnapshot) {
      let v = 0;
      v += 0.35 * scale(s.liquidation_density, 0.4, 0.8);
      v += 0.25 * scale(s.leverage_pressure, 0.5, 0.85);
      v += 0.20 * scale(s.funding_rate, 0.5, 0.85);
      v += 0.20 * scale(Math.abs(s.price_momentum_1h), 0.05, 0.2);
      return clamp(v, 0, 1);
    },
    weakenedBy: new Set(['leverage_vs_spot']),
    getMissingEvidence(s) {
      const m: string[] = [];
      if (s.liquidation_density < 0.3) m.push('Liquidation density not elevated enough');
      if (s.leverage_pressure < 0.4) m.push('Leverage not at cascade-risk levels');
      return m;
    },
  },
];

/**
 * Score all hypotheses against actual signals and return ranked thesis.
 */
function rankHypotheses(
  state: ReturnType<typeof classifyState>,
  cause: JudgmentCause,
  contradictions: ReturnType<typeof detectContradictions>,
  signals: SignalSnapshot,
  entityContext?: ProduceJudgmentInput['entityContext'],
  regime?: UnifiedRegime,
): JudgmentThesis {
  const stateGroup = MARKET_STATE_GROUPS[state.primary];

  const scored: RankedHypothesis[] = HYPOTHESIS_PROFILES
    .filter(p => p.plausibleGroups.has(stateGroup))
    .map(profile => {
      let support = profile.computeSupport(signals);

      // Boost when dominant causal family aligns with this hypothesis
      if (cause.dominant_cluster === profile.alignedCause) {
        support = clamp(support * 1.2, 0, 1);
      }
      if (cause.secondary_cluster === profile.alignedCause) {
        support = clamp(support * 1.08, 0, 1);
      }

      // ── Regime as first-class prior ──
      if (regime) {
        const macro = regime.macro.posture;
        const ecoHealth = regime.ecosystem.health;
        const volRegime = regime.volatility.regime;
        const leverage = regime.macro.overallLeverage;

        // Risk-off regime suppresses bullish continuation hypotheses
        if (macro === 'risk_off') {
          if (profile.id === HYPOTHESIS_CLASSES.CROWDED_CONTINUATION) {
            support = clamp(support * 0.55, 0, 1);
          }
          if (profile.id === HYPOTHESIS_CLASSES.FUNDAMENTALLY_SUPPORTED_RERATING) {
            support = clamp(support * 0.75, 0, 1);
          }
          // Boost capitulation and forced-liquidation hypotheses during risk-off
          if (profile.id === HYPOTHESIS_CLASSES.CAPITULATION_RESET) {
            support = clamp(support * 1.35, 0, 1);
          }
          if (profile.id === HYPOTHESIS_CLASSES.FORCED_LIQUIDATION_CASCADE) {
            support = clamp(support * 1.3, 0, 1);
          }
        }

        // Risk-on regime boosts continuation, suppresses capitulation
        if (macro === 'risk_on') {
          if (profile.id === HYPOTHESIS_CLASSES.CROWDED_CONTINUATION) {
            support = clamp(support * 1.15, 0, 1);
          }
          if (profile.id === HYPOTHESIS_CLASSES.CAPITULATION_RESET) {
            support = clamp(support * 0.6, 0, 1);
          }
        }

        // Extreme volatility boosts squeeze/liquidation hypotheses
        if (volRegime === 'extreme_high' || volRegime === 'high') {
          if (profile.id === HYPOTHESIS_CLASSES.FORCED_LIQUIDATION_CASCADE) {
            support = clamp(support * 1.25, 0, 1);
          }
          // Suppress gentle-rerating hypotheses in high volatility
          if (profile.id === HYPOTHESIS_CLASSES.FUNDAMENTALLY_SUPPORTED_RERATING) {
            support = clamp(support * 0.8, 0, 1);
          }
        }

        // Extreme leverage makes crowded-continuation fragile
        if (leverage === 'extreme' || leverage === 'high') {
          if (profile.id === HYPOTHESIS_CLASSES.CROWDED_CONTINUATION) {
            support = clamp(support * 0.7, 0, 1);
          }
        }

        // Stressed/crisis ecosystem penalizes sector spillover (contagion, not relative)
        if (ecoHealth === 'stressed' || ecoHealth === 'crisis') {
          if (profile.id === HYPOTHESIS_CLASSES.SECTOR_SPILLOVER_REPRICING) {
            support = clamp(support * 0.6, 0, 1);
          }
          if (profile.id === HYPOTHESIS_CLASSES.CAPITULATION_RESET) {
            support = clamp(support * 1.2, 0, 1);
          }
        }

        // Data-unavailable regime: penalize high-conviction hypotheses
        if (macro === 'data_unavailable') {
          support = clamp(support * 0.85, 0, 1);
        }
      }

      // ── Entity context priors (expanded) ──
      if (entityContext) {
        if (profile.id === HYPOTHESIS_CLASSES.SECTOR_SPILLOVER_REPRICING && entityContext.relatedAssets.length > 3) {
          support = clamp(support * 1.15, 0, 1);
        }

        const cap = entityContext.capBucket;
        if (cap === 'mega' || cap === 'large') {
          if (profile.id === HYPOTHESIS_CLASSES.LOW_QUALITY_MANIPULATED_LAUNCH) {
            support = clamp(support * 0.2, 0, 1);
          }
          if (profile.id === HYPOTHESIS_CLASSES.NARRATIVE_ONLY_PUMP) {
            support = clamp(support * 0.6, 0, 1);
          }
        }

        // Micro/small-cap + low liquidity: boost manipulated launch prior
        if ((cap === 'micro' || cap === 'small') && signals.liquidity < 0.2) {
          if (profile.id === HYPOTHESIS_CLASSES.LOW_QUALITY_MANIPULATED_LAUNCH) {
            support = clamp(support * 1.4, 0, 1);
          }
        }

        if (!entityContext.sector && profile.id === HYPOTHESIS_CLASSES.SECTOR_SPILLOVER_REPRICING) {
          support = clamp(support * 0.5, 0, 1);
        }

        // DeFi sector + strong fundamentals = stronger fundamental rerating
        if (entityContext.sector?.toLowerCase().includes('defi') && signals.fundamentals_strength > 0.5) {
          if (profile.id === HYPOTHESIS_CLASSES.FUNDAMENTALLY_SUPPORTED_RERATING) {
            support = clamp(support * 1.15, 0, 1);
          }
        }
      }

      // ── Discovery states: suppress crowded-continuation fallback ──
      if (stateGroup === 'discovery' && profile.id === HYPOTHESIS_CLASSES.CROWDED_CONTINUATION) {
        support = clamp(support * 0.3, 0, 1);
      }

      // Targeted contradiction penalty
      let contradictionPenalty = 0;
      for (const c of contradictions.items) {
        if (profile.weakenedBy.has(c.class as string)) {
          contradictionPenalty += severityWeight(c.severity as string);
        }
      }
      contradictionPenalty += contradictions.load * 0.08;
      contradictionPenalty = Math.min(0.5, contradictionPenalty);

      const confidence = clamp(support - contradictionPenalty, 0, 1);
      const missing_evidence = profile.getMissingEvidence(signals);

      return {
        hypothesis: profile.id,
        support_score: Math.round(support * 1000) / 1000,
        contradiction_score: Math.round(contradictionPenalty * 1000) / 1000,
        confidence: Math.round(confidence * 1000) / 1000,
        missing_evidence,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  // Fallback if no hypothesis was plausible for this state group
  if (scored.length === 0) {
    scored.push({
      hypothesis: HYPOTHESIS_CLASSES.CROWDED_CONTINUATION,
      support_score: 0.15,
      contradiction_score: contradictions.load,
      confidence: clamp(0.15 - contradictions.load * 0.3, 0, 1),
      missing_evidence: ['Insufficient signal data for clear hypothesis'],
    });
  }

  const primary = scored[0];
  const secondary = scored.length > 1 ? scored[1] : null;
  const clarity = secondary
    ? primary.confidence - secondary.confidence
    : primary.confidence;

  return {
    primary,
    secondary,
    clarity: clamp(clarity, 0, 1),
    ambiguity_flag: clarity < 0.15,
  };
}

function severityWeight(severity: string): number {
  switch (severity) {
    case 'critical': return 0.20;
    case 'high': return 0.14;
    case 'moderate': return 0.08;
    case 'low': return 0.04;
    default: return 0.02;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO ENGINE (v2 — dynamic from state + cause + thesis + timing context)
//
// Generates scenarios from the specific combination of signals rather than
// selecting from group-level templates.
// ═══════════════════════════════════════════════════════════════════════════════

const CAUSAL_FAMILY_LABELS: Record<CausalFamily, string> = {
  leverage_expansion: 'derivatives and leverage expansion',
  spot_demand: 'organic spot demand',
  smart_money_accumulation: 'smart money accumulation',
  narrative_acceleration: 'narrative and social momentum',
  fundamentals_improvement: 'fundamental improvement',
  liquidity_emergence: 'liquidity formation',
  supply_overhang: 'supply overhang pressure',
  structural_fragility: 'structural fragility',
  security_concern: 'security concerns',
  distribution_pressure: 'distribution pressure',
};

function generateScenario(
  state: ReturnType<typeof classifyState>,
  cause: JudgmentCause,
  thesis: JudgmentThesis,
  contradictions: ReturnType<typeof detectContradictions>,
  timing: FullTimingResult,
  signals: SignalSnapshot,
  entityContext?: ProduceJudgmentInput['entityContext'],
  regime?: UnifiedRegime,
): JudgmentScenario {
  const stateLabel = MARKET_STATE_LABELS[state.primary] ?? state.primary;
  const causeLabel = CAUSAL_FAMILY_LABELS[cause.dominant_cluster] ?? cause.dominant_cluster;
  const thesisLabel = HYPOTHESIS_LABELS[thesis.primary.hypothesis as HypothesisClass] ?? thesis.primary.hypothesis;
  const topContradiction = contradictions.items[0];
  const topContradictionSummary = topContradiction?.summary ?? null;

  // ── BASE CASE (with regime + hypothesis references) ───────────────────
  const baseParts: string[] = [];
  baseParts.push(`Primary hypothesis: ${thesisLabel.toLowerCase()}.`);

  if (thesis.secondary) {
    const secLabel = HYPOTHESIS_LABELS[thesis.secondary.hypothesis as HypothesisClass] ?? thesis.secondary.hypothesis;
    baseParts.push(`Secondary hypothesis: ${secLabel.toLowerCase()} if ${thesis.primary.missing_evidence[0]?.toLowerCase() ?? 'primary thesis weakens'}.`);
  }

  baseParts.push(`${stateLabel} driven primarily by ${causeLabel}.`);

  if (regime) {
    const regimeDesc = regime.macro.posture !== 'data_unavailable'
      ? `Regime: ${regime.macro.posture.replace(/_/g, '-')}, ${regime.ecosystem.health} ecosystem, ${regime.volatility.regime.replace(/_/g, '-')} volatility.`
      : 'Regime data insufficient — elevated uncertainty.';
    baseParts.push(regimeDesc);
  }

  if (topContradiction) {
    baseParts.push(`Main contradiction: ${topContradiction.summary.toLowerCase()}`);
  }

  if (timing.maturity.warning && timing.maturity.note) {
    baseParts.push(`Current timing: ${timing.phase.replace(/_/g, ' ')}. ${timing.maturity.note}`);
  } else {
    baseParts.push(`Current timing: ${timing.phase.replace(/_/g, ' ')}.`);
  }

  if (thesis.ambiguity_flag) {
    baseParts.push(`Thesis is ambiguous — ${thesisLabel} only marginally leads alternative explanations.`);
  }

  // Surface coverage weakness in scenario text
  const missing = signals._missing;
  if (missing && missing.size >= 4) {
    const cats = [...missing].slice(0, 4).join(', ');
    baseParts.push(`Data coverage is sparse (missing: ${cats}) — all conclusions carry elevated uncertainty.`);
  } else if (missing && missing.size >= 2) {
    const cats = [...missing].slice(0, 3).join(', ');
    baseParts.push(`Partial data coverage (missing: ${cats}) — confidence reduced.`);
  }

  const base_case = baseParts.join(' ');

  // ── LEGACY FIELDS (backward compat) ────────────────────────────────────
  const bullish_confirmation = buildBullishCase(signals, thesis, timing, cause);
  const bearish_failure = buildBearishCase(signals, thesis, contradictions, timing);
  const next_trigger = buildNextTrigger(timing, contradictions, signals);

  // ── HORIZON-SPECIFIC SCENARIOS (24h / 7d / 30d) ───────────────────────
  const horizons = buildHorizonScenarios(signals, thesis, contradictions, timing, regime, entityContext);

  // ── CONFIDENCE ────────────────────────────────────────────────────────
  let conf = 0;
  conf += signals.data_completeness * 0.25;
  conf += state.confidence * 0.20;
  conf += (1 - contradictions.load) * 0.20;
  conf += thesis.clarity * 0.20;
  conf += timing.sequence.sequence_health * 0.15;
  const scenario_confidence = clamp(conf, 0, 1);

  return {
    base_case,
    bullish_confirmation,
    bearish_failure,
    next_trigger,
    scenario_confidence: Math.round(scenario_confidence * 1000) / 1000,
    horizons,
    primary_hypothesis: thesisLabel,
    top_contradiction: topContradictionSummary ?? undefined,
    regime_context: regime?.summary,
  };
}

function buildHorizonScenarios(
  signals: SignalSnapshot,
  thesis: JudgmentThesis,
  contradictions: ReturnType<typeof detectContradictions>,
  timing: FullTimingResult,
  regime?: UnifiedRegime,
  entityContext?: ProduceJudgmentInput['entityContext'],
): HorizonScenario[] {
  const thesisLabel = HYPOTHESIS_LABELS[thesis.primary.hypothesis as HypothesisClass] ?? thesis.primary.hypothesis;
  const topC = contradictions.items[0];
  const macroLabel = regime ? regime.macro.posture.replace(/_/g, '-') : 'unknown';
  const isRiskOff = regime?.macro.posture === 'risk_off';
  const isHighVol = regime && (regime.volatility.regime === 'extreme_high' || regime.volatility.regime === 'high');
  const highLeverage = signals.leverage_pressure > 0.5;

  // ── 24h ────────────────────────────────────────────────────────────────
  const h24Confirm: string[] = [];
  if (signals.volume_24h < 0.3) h24Confirm.push('spot volume expansion');
  if (highLeverage) h24Confirm.push('funding rate cooling without price collapse');
  if (signals.whale_activity < 0.2) h24Confirm.push('smart money entry on spot');
  if (h24Confirm.length === 0) h24Confirm.push('broad participation continues');
  const h24Confirmation = `${thesisLabel} confirmed if ${h24Confirm.join(' with ')}.`;

  const h24Fail: string[] = [];
  if (highLeverage) h24Fail.push('leveraged unwind on thin spot demand');
  if (signals.exchange_inflow > 0.3) h24Fail.push('exchange inflows accelerate');
  if (topC) h24Fail.push(`${topC.summary.split('.')[0].toLowerCase()} worsens`);
  if (h24Fail.length === 0) h24Fail.push('price reverses on volume spike');
  const h24Failure = `Thesis fails if ${h24Fail.join(' or ')}.`;

  const h24Trigger = timing.projection.watch_for.length > 0
    ? `Watch: ${timing.projection.watch_for.slice(0, 2).join(', ').toLowerCase()}.`
    : 'Monitor volume, funding, and exchange flow direction.';

  const h24Invalidation = timing.projection.invalidates_thesis.length > 0
    ? timing.projection.invalidates_thesis[0]
    : 'No immediate invalidation conditions.';

  // ── 7d ─────────────────────────────────────────────────────────────────
  const h7dConfirm: string[] = [];
  if (isRiskOff) h7dConfirm.push(`macro shifts away from ${macroLabel}`);
  if (signals.fundamentals_strength < 0.3 && signals.narrative_intensity > 0.3) {
    h7dConfirm.push('fundamentals begin confirming narrative');
  }
  if (signals.liquidity < 0.25) h7dConfirm.push('liquidity depth builds');
  if (h7dConfirm.length === 0) h7dConfirm.push('sustained volume with declining contradiction load');
  const h7dConfirmation = `Weekly outlook: ${thesisLabel.toLowerCase()} strengthens if ${h7dConfirm.join(' and ')}.`;

  const h7dFail: string[] = [];
  if (isRiskOff) h7dFail.push('risk-off regime deepens');
  if (isHighVol) h7dFail.push('volatility expansion triggers liquidation cascades');
  if (signals.exchange_inflow > 0.25) h7dFail.push('exchange inflows rise while liquidity weakens');
  if (h7dFail.length === 0) h7dFail.push('sustained selling without buyer absorption');
  const h7dFailure = `7d failure condition: ${h7dFail.join(' while ')}.`;

  const h7dTrigger = entityContext?.sector
    ? `Sector rotation signals in ${entityContext.sector.replace('sector:', '')} space.`
    : 'Cross-asset correlation shifts or sector-level capital rotation.';

  const h7dInvalidation = contradictions.structural_warning
    ? 'Structural contradiction resolves against thesis direction.'
    : 'Persistent divergence between spot and derivatives activity.';

  // ── 30d ────────────────────────────────────────────────────────────────
  const h30dConfirm: string[] = [];
  h30dConfirm.push('fundamental metrics validate growth thesis');
  if (signals.unlock_pressure > 0.2) h30dConfirm.push('unlock pressure absorbed without distribution');
  if (entityContext?.narratives && entityContext.narratives.length > 0) {
    h30dConfirm.push(`narrative "${entityContext.narratives[0]}" sustains institutional interest`);
  }
  const h30dConfirmation = `30d confirmation: ${h30dConfirm.join(', ')}.`;

  const h30dFail: string[] = [];
  h30dFail.push('fundamental metrics stagnate or decline');
  if (signals.holder_concentration > 0.6) h30dFail.push('concentration risk materializes through distribution');
  if (isRiskOff) h30dFail.push('macro regime remains adverse for extended period');
  const h30dFailure = `30d failure: ${h30dFail.join(' and ')}.`;

  const h30dTrigger = 'Quarterly fundamental catalysts, governance events, or macro regime shift.';
  const h30dInvalidation = 'Sustained capital exodus or fundamental thesis invalidation (TVL collapse, security event).';

  return [
    { horizon: '24h', confirmation: h24Confirmation, failure: h24Failure, trigger: h24Trigger, invalidation: h24Invalidation },
    { horizon: '7d', confirmation: h7dConfirmation, failure: h7dFailure, trigger: h7dTrigger, invalidation: h7dInvalidation },
    { horizon: '30d', confirmation: h30dConfirmation, failure: h30dFailure, trigger: h30dTrigger, invalidation: h30dInvalidation },
  ];
}

function buildBullishCase(
  s: SignalSnapshot,
  thesis: JudgmentThesis,
  timing: FullTimingResult,
  cause: JudgmentCause
): string {
  const parts: string[] = [];

  // Lead with what confirmation the thesis needs
  const missing = thesis.primary.missing_evidence;
  if (missing.length > 0) {
    parts.push(missing[0]);
  }

  // Add timing-specific progression requirement
  if (timing.projection.must_happen.length > 0) {
    const mustHappen = timing.projection.must_happen[0];
    if (!parts.some(p => p.toLowerCase().includes(mustHappen.substring(0, 20).toLowerCase()))) {
      parts.push(mustHappen);
    }
  }

  // Signal-specific confirmations based on current weaknesses
  if (s.volume_24h < 0.25 && !parts.some(p => p.toLowerCase().includes('volume'))) {
    parts.push('Spot volume must expand to validate momentum');
  }
  if (s.leverage_pressure > 0.5 && s.funding_rate > 0.5 && !parts.some(p => p.toLowerCase().includes('funding'))) {
    parts.push('Funding rate must normalize without price collapse');
  }
  if (s.whale_activity < 0.2 && !parts.some(p => p.toLowerCase().includes('smart money') || p.toLowerCase().includes('whale'))) {
    parts.push('Smart money entry would strengthen conviction');
  }

  // Cause-specific progression
  if (cause.dominant_cluster === CAUSAL_FAMILIES.NARRATIVE_ACCELERATION && s.fundamentals_strength < 0.3) {
    if (!parts.some(p => p.toLowerCase().includes('fundamental'))) {
      parts.push('Fundamentals must begin confirming the narrative');
    }
  }

  if (parts.length === 0) {
    parts.push('Broad participation continues with declining contradiction load');
  }

  return parts.slice(0, 3).join('. ') + '.';
}

function buildBearishCase(
  s: SignalSnapshot,
  thesis: JudgmentThesis,
  contradictions: ReturnType<typeof detectContradictions>,
  timing: FullTimingResult
): string {
  const parts: string[] = [];

  // Lead with timing invalidation
  if (timing.projection.invalidates_thesis.length > 0) {
    parts.push(timing.projection.invalidates_thesis[0]);
  }

  // Top contradiction worsening
  const topC = contradictions.items[0];
  if (topC) {
    const sev = topC.severity;
    if (sev === 'critical' || sev === 'high') {
      parts.push(`${topC.summary.replace(/\.$/, '')} intensifies`);
    }
  }

  // Signal-specific risks
  if (s.leverage_pressure > 0.5 && !parts.some(p => p.toLowerCase().includes('leverage') || p.toLowerCase().includes('liquidat'))) {
    parts.push('Liquidation cascade triggered by deleveraging event');
  }
  if (s.exchange_inflow > 0.3 && !parts.some(p => p.toLowerCase().includes('exchange') || p.toLowerCase().includes('distribut'))) {
    parts.push('Exchange inflows accelerate as distribution intensifies');
  }
  if (s.narrative_intensity > 0.4 && s.fundamentals_strength < 0.2 && !parts.some(p => p.toLowerCase().includes('narrative'))) {
    parts.push('Narrative momentum fades without fundamental backing');
  }

  // Structural warnings
  if (contradictions.structural_warning && !parts.some(p => p.toLowerCase().includes('structural'))) {
    parts.push('Structural contradiction resolves unfavorably');
  }

  if (parts.length === 0) {
    parts.push('Key support levels break and selling pressure overwhelms demand');
  }

  return parts.slice(0, 3).join('. ') + '.';
}

function buildNextTrigger(
  timing: FullTimingResult,
  contradictions: ReturnType<typeof detectContradictions>,
  s: SignalSnapshot
): string {
  const parts: string[] = [];

  // Timing engine's watch list is the primary source
  if (timing.projection.watch_for.length > 0) {
    parts.push(`Watch for ${timing.projection.watch_for.slice(0, 2).join(' and ').toLowerCase()}`);
  }

  // Most impactful contradiction that could resolve
  const resolvable = contradictions.items.find(c => c.resolvable);
  if (resolvable) {
    parts.push(`Key contradiction to monitor: ${resolvable.summary.split('.')[0].toLowerCase()}`);
  }

  // Signal-specific inflection points
  if (timing.inflections.length > 0) {
    const top = timing.inflections[0];
    const direction = top.type === 'positive' ? 'Positive inflection' : 'Risk signal';
    parts.push(`${direction}: ${top.label.toLowerCase()}`);
  }

  // Fallback
  if (parts.length === 0) {
    if (s.data_completeness < 0.5) {
      parts.push('Await more complete data before drawing conclusions');
    } else {
      parts.push('Monitor volume, funding rate, and exchange flow direction for next signal');
    }
  }

  return parts.slice(0, 2).join('. ') + '.';
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

  // Surface explicitly missing data sources
  const missing = signals._missing;
  if (missing && missing.size > 0) {
    for (const src of missing) {
      stale.push(`No data: ${src}`);
    }
  }

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
