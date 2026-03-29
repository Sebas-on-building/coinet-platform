/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     FALLBACK DESIGN — Section 4.3 (Governed Truth Loss)                       ║
 * ║                                                                               ║
 * ║   Coinet does not treat fallback as backup infrastructure.                    ║
 * ║   Coinet treats fallback as governed truth loss.                              ║
 * ║                                                                               ║
 * ║   Principle: preserve continuity of operation without preserving              ║
 * ║   the illusion of full knowing.                                               ║
 * ║                                                                               ║
 * ║   See FALLBACK_DESIGN_DOCTRINE.md for the full prose specification.           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { TruthClass } from '../source-systems/registry';
import type {
  FallbackStatus,
  FallbackEpistemicMetadata,
  FallbackSemanticCategory,
  TruthStateKind,
  TrustClass,
  ModeOperationalFlags,
  SubstitutionSemantics,
  JudgmentMeaningfulness,
  ContinuityHierarchyRank,
  TruthLossAccounting,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.3 — THE SIX-STEP FALLBACK SEQUENCE (deterministic, never improvised)
// ═══════════════════════════════════════════════════════════════════════════════

export const FALLBACK_SEQUENCE_STEPS: ReadonlyArray<{ step: number; name: string; description: string }> = [
  { step: 1, name: 'declare_degraded_mode', description: 'Mark system as no longer full-source; machine-readable, source-class-specific.' },
  { step: 2, name: 'classify_nature_of_loss', description: 'Identify semantic fallback category, truth-loss accounting, and what claims weaken.' },
  { step: 3, name: 'attempt_safe_continuity', description: 'Walk continuity hierarchy: equivalent sub → authority sub → retained state → bounded partial → unavailable.' },
  { step: 4, name: 'recompute_trust_and_confidence', description: 'Truth-domain-aware, thesis-aware, regime-aware confidence reduction; never flat.' },
  { step: 5, name: 'continue_bounded_scoring', description: 'Score only where justified; penalize affected families; enforce hard blockers.' },
  { step: 6, name: 'surface_degraded_visibility', description: 'Expose missing layer in machine state and product output — never vague.' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.6 — CONTINUITY HIERARCHY (ranked by semantic integrity, not convenience)
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTINUITY_HIERARCHY: ReadonlyArray<{
  rank: ContinuityHierarchyRank;
  label: string;
  description: string;
}> = [
  { rank: 1, label: 'equivalent_source_substitution', description: 'Another provider in same truth class with equivalent authority.' },
  { rank: 2, label: 'authority_downgrade_substitution', description: 'Domain-valid but less authoritative substitute.' },
  { rank: 3, label: 'retained_trusted_state', description: 'Previously trusted state within freshness policy.' },
  { rank: 4, label: 'bounded_partial_operation', description: 'Operate without the missing domain, under penalties.' },
  { rank: 5, label: 'explicit_non_availability', description: 'Layer unavailable — narrow or suppress claims.' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.12 — INVARIANTS (9 — upgraded from 7)
// ═══════════════════════════════════════════════════════════════════════════════

export const FALLBACK_INVARIANTS: ReadonlyArray<{ id: string; text: string }> = [
  { id: 'I1', text: 'No source failure may remain invisible.' },
  { id: 'I2', text: 'Every fallback must be explicitly represented in machine-readable state.' },
  { id: 'I3', text: 'Fallback must never preserve the illusion of unchanged authority.' },
  { id: 'I4', text: 'Cached or retained state must never masquerade as live state.' },
  { id: 'I5', text: 'Confidence must always respond when fallback materially alters evidence quality.' },
  { id: 'I6', text: 'Fallback semantics must be truth-domain-specific.' },
  { id: 'I7', text: 'If bounded judgment is no longer possible, the system must say so.' },
  { id: 'I8', text: 'Fallback must narrow claims before it suppresses transparency.' },
  { id: 'I9', text: 'User-visible outputs must reflect missing truth domains, not just generic uncertainty.' },
];

/** @deprecated Use FALLBACK_INVARIANTS instead */
export const FALLBACK_INVARIANTS_4_3_7 = FALLBACK_INVARIANTS;

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.13 — PRODUCTION RULES (8 — upgraded from 7)
// ═══════════════════════════════════════════════════════════════════════════════

export const PRODUCTION_FALLBACK_RULES: ReadonlyArray<string> = [
  'R1: Every connector and routing path must define valid fallback options before production use.',
  'R2: Every fallback event must be classified semantically, not just technically.',
  'R3: Retained state may only be reused under freshness-aware and use-case-aware policy.',
  'R4: Confidence penalties must be proportional to truth-domain importance and thesis dependence.',
  'R5: Scoring may continue only where bounded judgment remains justified.',
  'R6: Hard blockers must halt or sharply constrain outputs rather than being silently tolerated.',
  'R7: Missing layers must propagate into both downstream reasoning and user-visible outputs.',
  'R8: No fallback design is acceptable if it hides reduced visibility behind unchanged confidence or unchanged rhetorical certainty.',
];

/** @deprecated Use PRODUCTION_FALLBACK_RULES instead */
export const PRODUCTION_FALLBACK_RULES_4_3_8 = PRODUCTION_FALLBACK_RULES;

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.16 — READER EXECUTION DOCTRINE (8 steps — upgraded from 7)
// ═══════════════════════════════════════════════════════════════════════════════

export const READER_EXECUTION_DOCTRINE: ReadonlyArray<string> = [
  '1. Define fallback as a change in knowing, not just a backup path.',
  '2. Classify fallback types semantically.',
  '3. Define freshness-aware and use-case-aware reuse rules for last trusted state.',
  '4. Build a truth-domain-specific impact matrix.',
  '5. Map fallback effects into confidence, scoring, hypotheses, timing, and scenarios.',
  '6. Define hard blockers versus degradable losses.',
  '7. Require explicit machine-state and user-visible expression of degraded truth.',
  '8. Reject any design that preserves full confidence or full rhetorical certainty under partial blindness.',
];

/** @deprecated Use READER_EXECUTION_DOCTRINE instead */
export const READER_EXECUTION_DOCTRINE_4_3_11 = READER_EXECUTION_DOCTRINE;

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.10 TRUTH-DOMAIN FALLBACK DOCTRINE + 4.3.11 FALLBACK IMPACT MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

export interface TruthDomainFallbackDoctrine {
  truth_class: TruthClass;
  production_doctrine: string;
  main_risk: string;
  base_confidence_penalty: number;
  penalized_score_families: readonly string[];
  /** 4.3.11 — what downstream capabilities weaken */
  downstream_impact: readonly string[];
  /** 4.3.10 — weakened hypothesis types */
  weakened_hypothesis_types: readonly string[];
  /** 4.3.10 — narrowed scenario dimensions */
  narrowed_scenario_dimensions: readonly string[];
  user_visible_template_degraded: string;
  user_visible_template_missing: string;
}

export const TRUTH_DOMAIN_FALLBACK_DOCTRINE: Record<TruthClass, TruthDomainFallbackDoctrine> = {
  market_surface: {
    truth_class: 'market_surface',
    production_doctrine:
      'Broad market providers are relatively substitutable with moderate penalty if freshness OK and asset coverage matches; check pricing spread when possible.',
    main_risk: 'Surface continuity masking metadata degradation or long-tail coverage gaps.',
    base_confidence_penalty: 0.08,
    penalized_score_families: ['signal_confidence', 'thesis_coherence'],
    downstream_impact: ['weaker surface context', 'weaker comparability', 'weaker ranking precision'],
    weakened_hypothesis_types: ['relative_value', 'sector_rotation'],
    narrowed_scenario_dimensions: ['comparative_context'],
    user_visible_template_degraded:
      'Market surface layer degraded — price/volume context is less authoritative; cross-check primary venue if trading.',
    user_visible_template_missing:
      'Market surface unavailable — spot reference and ranking context are structurally limited.',
  },
  dex_emergence: {
    truth_class: 'dex_emergence',
    production_doctrine:
      'Timing-sensitive; cached or slower substitutes preserve continuity but must heavily reduce timing certainty.',
    main_risk: 'False early/late classification from lost temporal precision.',
    base_confidence_penalty: 0.18,
    penalized_score_families: ['timing_score', 'opportunity_score', 'signal_confidence'],
    downstream_impact: ['weaker emergence detection', 'weaker timing precision', 'weaker liquidity assessment'],
    weakened_hypothesis_types: ['early_accumulation', 'liquidity_formation'],
    narrowed_scenario_dimensions: ['timing_classification', 'early_opportunity'],
    user_visible_template_degraded:
      'DEX emergence layer degraded — early liquidity and pair-formation timing are less certain.',
    user_visible_template_missing:
      'DEX emergence unavailable — early-market and pool-quality judgments are structurally limited.',
  },
  derivatives_pressure: {
    truth_class: 'derivatives_pressure',
    production_doctrine:
      'Highly timing-sensitive; be conservative — sharply cut market-structure confidence and weaken leverage hypotheses.',
    main_risk: 'Misreading crowded or fragile leverage conditions.',
    base_confidence_penalty: 0.22,
    penalized_score_families: ['market_structure', 'timing_score', 'risk_score', 'signal_confidence'],
    downstream_impact: ['weaker pressure interpretation', 'weaker structure-based timing', 'weaker crowding detection'],
    weakened_hypothesis_types: ['leverage_led_continuation', 'squeeze_setup', 'crowded_reversal'],
    narrowed_scenario_dimensions: ['leverage_structure', 'forced_liquidation', 'funding_regime'],
    user_visible_template_degraded:
      'Derivatives layer degraded — leverage, crowding, and liquidation interpretation carry elevated uncertainty.',
    user_visible_template_missing:
      'Derivatives data unavailable — leverage-led and crowding conclusions cannot be fully supported.',
  },
  protocol_substance: {
    truth_class: 'protocol_substance',
    production_doctrine:
      'Fundamentals decay slowly; retained trusted state more acceptable but scenario depth and rerating confidence must degrade visibly when stale.',
    main_risk: 'Overstating current improvement using lagged economic truth.',
    base_confidence_penalty: 0.12,
    penalized_score_families: ['protocol_quality', 'opportunity_score', 'scenario_depth'],
    downstream_impact: ['weaker rerating/substance interpretation', 'weaker valuation context'],
    weakened_hypothesis_types: ['fundamental_rerating', 'protocol_improving', 'yield_sustainability'],
    narrowed_scenario_dimensions: ['valuation_quality', 'economic_sustainability'],
    user_visible_template_degraded:
      'Protocol fundamentals degraded or stale — rerating and TVL/fee-based conclusions are less certain.',
    user_visible_template_missing:
      'Protocol fundamentals unavailable — valuation and business-quality depth are structurally limited.',
  },
  onchain_behavior: {
    truth_class: 'onchain_behavior',
    production_doctrine:
      'High authority; missing visibility must strongly weaken whale, treasury, and flow conclusions.',
    main_risk: 'Speaking as if actor behavior were still visible when it is not.',
    base_confidence_penalty: 0.2,
    penalized_score_families: ['whale_conviction', 'thesis_coherence', 'timing_score'],
    downstream_impact: ['weaker behavior and actor confirmation', 'weaker exchange-flow interpretation'],
    weakened_hypothesis_types: ['smart_money_accumulation', 'treasury_rotation', 'exchange_flow_divergence'],
    narrowed_scenario_dimensions: ['actor_behavior', 'flow_confirmation'],
    user_visible_template_degraded:
      'On-chain visibility partial — whale, exchange-flow, and treasury behavior conclusions carry elevated uncertainty.',
    user_visible_template_missing:
      'On-chain behavior unavailable — wallet- and flow-based judgments are structurally limited.',
  },
  structural_safety: {
    truth_class: 'structural_safety',
    production_doctrine:
      'Hard-constraint domain: hard-cap bullish/opportunity confidence for risky launches; state reduced safety visibility explicitly.',
    main_risk: 'Bullish conviction in structurally dangerous setups.',
    base_confidence_penalty: 0.35,
    penalized_score_families: ['fraud_rug_risk', 'opportunity_score', 'signal_confidence'],
    downstream_impact: ['hard cap on positive claims', 'structural caution required'],
    weakened_hypothesis_types: ['safe_early_opportunity'],
    narrowed_scenario_dimensions: ['safety_assessment', 'contract_trust'],
    user_visible_template_degraded:
      'Structural safety visibility reduced — contract and ownership risk assessment is incomplete; opportunity confidence is capped.',
    user_visible_template_missing:
      'Structural safety unavailable — cannot justify strong conviction on early or low-liquidity risk assets.',
  },
  narrative_attention: {
    truth_class: 'narrative_attention',
    production_doctrine:
      'Softer than behavior/security; may not invalidate full judgment if structural layers intact.',
    main_risk: 'Underestimating memetic acceleration, sentiment fragility, or crowd reflexivity.',
    base_confidence_penalty: 0.07,
    penalized_score_families: ['narrative_strength', 'signal_confidence'],
    downstream_impact: ['weaker attention and hype interpretation'],
    weakened_hypothesis_types: ['narrative_driven_pump', 'memetic_acceleration'],
    narrowed_scenario_dimensions: ['social_momentum'],
    user_visible_template_degraded:
      'Narrative layer degraded — attention and social-momentum signals are less reliable.',
    user_visible_template_missing:
      'Narrative attention unavailable — memetic and hype dynamics are under-specified.',
  },
  entity_context: {
    truth_class: 'entity_context',
    production_doctrine:
      'Without labels, transfers may be visible but actor significance and intent are uncertain.',
    main_risk: 'Raw activity visible while actor significance becomes unclear.',
    base_confidence_penalty: 0.14,
    penalized_score_families: ['whale_conviction', 'thesis_coherence'],
    downstream_impact: ['weaker actor significance', 'weaker smart-money attribution'],
    weakened_hypothesis_types: ['smart_money_accumulation', 'institutional_exit'],
    narrowed_scenario_dimensions: ['actor_identity', 'entity_significance'],
    user_visible_template_degraded:
      'Entity context partial — wallet labeling and smart-money attribution are degraded.',
    user_visible_template_missing:
      'Entity context unavailable — "who moved" interpretations carry elevated uncertainty.',
  },
  reasoning_expression: {
    truth_class: 'reasoning_expression',
    production_doctrine:
      'Model substitution acceptable if deterministic engine intact; affects expression more than structured truth.',
    main_risk: 'Weaker communication, not weaker core truth.',
    base_confidence_penalty: 0.04,
    penalized_score_families: [],
    downstream_impact: ['weaker explanation quality'],
    weakened_hypothesis_types: [],
    narrowed_scenario_dimensions: [],
    user_visible_template_degraded:
      'Explanation path degraded — wording may be simpler; structured scores and evidence trail remain authoritative.',
    user_visible_template_missing:
      'Primary explanation path unavailable — fallback expression in use; verify numeric scores and citations.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.11 — FALLBACK IMPACT MATRIX (truth-domain → downstream capability loss)
// ═══════════════════════════════════════════════════════════════════════════════

export function getFallbackImpactMatrix(): Record<TruthClass, {
  downstream_impact: readonly string[];
  penalized_scores: readonly string[];
  weakened_hypotheses: readonly string[];
  narrowed_scenarios: readonly string[];
}> {
  const matrix: Record<string, any> = {};
  for (const [tc, d] of Object.entries(TRUTH_DOMAIN_FALLBACK_DOCTRINE)) {
    matrix[tc] = {
      downstream_impact: d.downstream_impact,
      penalized_scores: d.penalized_score_families,
      weakened_hypotheses: d.weakened_hypothesis_types,
      narrowed_scenarios: d.narrowed_scenario_dimensions,
    };
  }
  return matrix as any;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENALTY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_PENALTY_MULTIPLIER: Record<NonNullable<FallbackSemanticCategory>, number> = {
  source_substitution: 1.0,
  cached_trusted_state: 0.85,
  temporal_downgrade: 1.15,
  authority_downgrade: 1.25,
  partial_layer: 1.1,
  no_fallback_failure: 1.35,
};

export const THESIS_CRITICAL_CONFIDENCE_MULTIPLIER = 1.35;
export const MIN_MATERIAL_CONFIDENCE_PENALTY = 0.02;

// ═══════════════════════════════════════════════════════════════════════════════
// INFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

export function inferTruthStateKind(
  fallbackStatus: FallbackStatus,
  isFallbackExecution: boolean,
): TruthStateKind {
  if (fallbackStatus === 'backfill') return 'historical_backfill_state';
  if (fallbackStatus === 'cached') return 'retained_trusted_state';
  if (fallbackStatus === 'fallback' || isFallbackExecution) return 'fallback_source_truth';
  if (fallbackStatus === 'degraded') return 'retained_trusted_state';
  return 'live_primary_truth';
}

export function inferFallbackSemanticCategory(params: {
  fallbackStatus: FallbackStatus;
  isFallbackExecution: boolean;
  modeOperationalFlags: ModeOperationalFlags;
  partialLayer?: boolean;
  authorityDowngrade?: boolean;
}): FallbackSemanticCategory | null {
  const { fallbackStatus, isFallbackExecution, modeOperationalFlags, partialLayer, authorityDowngrade } =
    params;

  if (fallbackStatus === 'backfill') return null;
  if (partialLayer) return 'partial_layer';
  if (authorityDowngrade && (isFallbackExecution || fallbackStatus === 'fallback')) return 'authority_downgrade';
  if (fallbackStatus === 'cached') return 'cached_trusted_state';
  if (isFallbackExecution || fallbackStatus === 'fallback') return 'source_substitution';
  if (modeOperationalFlags.temporal_downgrade || fallbackStatus === 'degraded') return 'temporal_downgrade';
  if (fallbackStatus === 'primary' && modeOperationalFlags.freshness_below_mode_standard) return 'temporal_downgrade';
  if (fallbackStatus === 'primary' && !modeOperationalFlags.freshness_below_mode_standard) return null;
  return null;
}

export function computeDegradedModeActive(params: {
  fallbackSemanticCategory: FallbackSemanticCategory | null;
  trustClass: TrustClass;
  modeOperationalFlags: ModeOperationalFlags;
}): boolean {
  if (params.fallbackSemanticCategory !== null) return true;
  if (params.modeOperationalFlags.temporal_downgrade) return true;
  if (params.modeOperationalFlags.freshness_below_mode_standard) return true;
  if (params.modeOperationalFlags.latency_exceeds_contract) return true;
  if (params.trustClass === 'degraded' || params.trustClass === 'fallback' || params.trustClass === 'low') return true;
  return false;
}

export function inferContinuityHierarchyRank(
  category: FallbackSemanticCategory | null,
  degradedMode: boolean,
  truthStateKind: TruthStateKind,
): ContinuityHierarchyRank {
  if (!degradedMode && category === null) return 1;
  if (truthStateKind === 'layer_unavailable') return 5;
  if (category === 'no_fallback_failure') return 5;
  if (category === 'source_substitution') return 1;
  if (category === 'authority_downgrade') return 2;
  if (category === 'cached_trusted_state') return 3;
  if (truthStateKind === 'retained_trusted_state') return 3;
  if (category === 'temporal_downgrade' || category === 'partial_layer') return 4;
  return 4;
}

export function inferSubstitutionSemantics(
  category: FallbackSemanticCategory | null,
  degradedMode: boolean,
  authorityDowngrade?: boolean,
): SubstitutionSemantics {
  if (!degradedMode && category === null) return 'not_applicable';
  if (category === null) return 'unknown';
  if (category === 'no_fallback_failure') return 'unknown';
  if (category === 'authority_downgrade') return 'degraded';
  if (category === 'source_substitution') return authorityDowngrade ? 'degraded' : 'unknown';
  if (category === 'cached_trusted_state' || category === 'temporal_downgrade' || category === 'partial_layer') return 'degraded';
  return 'unknown';
}

export function inferJudgmentMeaningfulness(
  category: FallbackSemanticCategory | null,
  degradedMode: boolean,
  truthStateKind: TruthStateKind,
): JudgmentMeaningfulness {
  if (truthStateKind === 'layer_unavailable') return 'unavailable';
  if (!degradedMode && category === null) return 'full';
  if (category === 'no_fallback_failure') return 'unavailable';
  return 'bounded_partial';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.5 Step 2 — TRUTH-LOSS ACCOUNTING
// ═══════════════════════════════════════════════════════════════════════════════

export function buildTruthLossAccounting(
  truthClass: TruthClass,
  category: FallbackSemanticCategory | null,
  degradedMode: boolean,
): TruthLossAccounting | null {
  if (!degradedMode && category === null) return null;
  const doctrine = TRUTH_DOMAIN_FALLBACK_DOCTRINE[truthClass];

  const resolutionLoss = category === 'temporal_downgrade'
    ? 'event-level → periodic/cached snapshot'
    : category === 'partial_layer'
      ? 'full-domain → partial signal subset'
      : category === 'no_fallback_failure'
        ? 'complete loss'
        : 'reduced or substituted';

  const freshnessLoss = category === 'cached_trusted_state'
    ? 'live → retained (age-bound)'
    : category === 'temporal_downgrade'
      ? 'live/fresh → stale/acceptable'
      : category === 'no_fallback_failure'
        ? 'no observation available'
        : 'potentially reduced';

  const timingLoss = category === 'temporal_downgrade'
    ? 'sub-second precision lost — multi-minute or periodic lag'
    : category === 'no_fallback_failure'
      ? 'no timing available'
      : 'timing precision may be reduced';

  const relationalLoss = category === 'partial_layer'
    ? 'subset signals available; relational context reduced'
    : category === 'no_fallback_failure'
      ? 'full relational context lost'
      : 'relational context potentially degraded';

  return {
    lost_truth_class: truthClass,
    lost_resolution: resolutionLoss,
    lost_freshness: freshnessLoss,
    lost_timing_precision: timingLoss,
    lost_relational_context: relationalLoss,
    weakened_hypotheses: doctrine.weakened_hypothesis_types,
    penalized_scores: doctrine.penalized_score_families,
    narrowed_scenarios: doctrine.narrowed_scenario_dimensions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.7 Step 4 — CONFIDENCE RECOMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function buildConfidencePenaltySuggestion(
  truthClass: TruthClass,
  category: FallbackSemanticCategory | null,
  degradedMode: boolean,
): number {
  const doctrine = TRUTH_DOMAIN_FALLBACK_DOCTRINE[truthClass];
  const base = doctrine.base_confidence_penalty;
  if (!degradedMode && category === null) return 0;
  if (category === null) return Math.min(1, base * 0.45);
  const mult = CATEGORY_PENALTY_MULTIPLIER[category];
  let p = Math.min(1, base * mult);
  if (degradedMode && category !== null && p > 0 && p < MIN_MATERIAL_CONFIDENCE_PENALTY) {
    p = MIN_MATERIAL_CONFIDENCE_PENALTY;
  }
  return p;
}

export function applyThesisDependenceToPenalty(
  penalty: number,
  truthClass: TruthClass,
  thesisCriticalTruthClasses?: TruthClass[],
): { penalty: number; thesis_critical_for_query: boolean } {
  if (!thesisCriticalTruthClasses?.length) return { penalty, thesis_critical_for_query: false };
  const critical = thesisCriticalTruthClasses.includes(truthClass);
  if (!critical) return { penalty, thesis_critical_for_query: false };
  return {
    penalty: Math.min(1, penalty * THESIS_CRITICAL_CONFIDENCE_MULTIPLIER),
    thesis_critical_for_query: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.8 Step 5 — HARD BLOCKERS vs DEGRADABLE LOSSES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HardBlockerContext {
  truthClassMissing: boolean;
  truthClass: TruthClass;
  earlyLaunchOrLowLiquidity?: boolean;
  canonicalConfidenceBelow?: number;
  availableSourceClassCount?: number;
  minimumSourceClassesRequired?: number;
}

export function evaluateHardBlocker(ctx: HardBlockerContext): boolean {
  if (ctx.truthClass === 'structural_safety' && ctx.truthClassMissing && ctx.earlyLaunchOrLowLiquidity) {
    return true;
  }
  if (ctx.canonicalConfidenceBelow !== undefined && ctx.canonicalConfidenceBelow < 0.4) {
    return true;
  }
  if (
    ctx.availableSourceClassCount !== undefined &&
    ctx.minimumSourceClassesRequired !== undefined &&
    ctx.availableSourceClassCount < ctx.minimumSourceClassesRequired
  ) {
    return true;
  }
  return false;
}

/** @deprecated Use evaluateHardBlocker instead */
export function isTypicalStructuralSafetyHardBlocker(context: {
  truthClassMissing: boolean;
  earlyLaunchOrLowLiquidity?: boolean;
}): boolean {
  return context.truthClassMissing === true && context.earlyLaunchOrLowLiquidity === true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3.9 Step 6 — USER-VISIBLE LAYER MESSAGING
// ═══════════════════════════════════════════════════════════════════════════════

export function buildUserVisibleLayerMessage(
  truthClass: TruthClass,
  category: FallbackSemanticCategory | null,
  degradedMode: boolean,
): string {
  const d = TRUTH_DOMAIN_FALLBACK_DOCTRINE[truthClass];
  if (!degradedMode && category === null) return '';
  if (category === 'no_fallback_failure') return d.user_visible_template_missing;
  return d.user_visible_template_degraded;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLY — builds the full FallbackEpistemicMetadata for an envelope
// ═══════════════════════════════════════════════════════════════════════════════

export function buildFallbackEpistemicMetadata(params: {
  truthClass: TruthClass;
  primaryProviderId: string;
  effectiveProvider: string;
  fallbackStatus: FallbackStatus;
  isFallbackExecution: boolean;
  trustClass: TrustClass;
  modeOperationalFlags: ModeOperationalFlags;
  partialLayer?: boolean;
  authorityDowngrade?: boolean;
  thesisCriticalTruthClasses?: TruthClass[];
  hardBlockerContext?: Partial<HardBlockerContext>;
}): FallbackEpistemicMetadata {
  // Step 2: classify
  const category = inferFallbackSemanticCategory({
    fallbackStatus: params.fallbackStatus,
    isFallbackExecution: params.isFallbackExecution,
    modeOperationalFlags: params.modeOperationalFlags,
    partialLayer: params.partialLayer,
    authorityDowngrade: params.authorityDowngrade,
  });

  // Step 1: degraded mode
  const degradedMode = computeDegradedModeActive({
    fallbackSemanticCategory: category,
    trustClass: params.trustClass,
    modeOperationalFlags: params.modeOperationalFlags,
  });

  const truthStateKind = inferTruthStateKind(params.fallbackStatus, params.isFallbackExecution);
  const continuityRank = inferContinuityHierarchyRank(category, degradedMode, truthStateKind);
  const truthLoss = buildTruthLossAccounting(params.truthClass, category, degradedMode);

  // Step 4: confidence
  let confidencePenalty = buildConfidencePenaltySuggestion(params.truthClass, category, degradedMode);
  const thesis = applyThesisDependenceToPenalty(confidencePenalty, params.truthClass, params.thesisCriticalTruthClasses);
  confidencePenalty = thesis.penalty;

  const substitutionSemantics = inferSubstitutionSemantics(category, degradedMode, params.authorityDowngrade);
  const judgmentMeaningfulness = inferJudgmentMeaningfulness(category, degradedMode, truthStateKind);

  // Step 5: hard blocker
  const isHardBlocker = evaluateHardBlocker({
    truthClassMissing: category === 'no_fallback_failure',
    truthClass: params.truthClass,
    earlyLaunchOrLowLiquidity: params.hardBlockerContext?.earlyLaunchOrLowLiquidity,
    canonicalConfidenceBelow: params.hardBlockerContext?.canonicalConfidenceBelow,
    availableSourceClassCount: params.hardBlockerContext?.availableSourceClassCount,
    minimumSourceClassesRequired: params.hardBlockerContext?.minimumSourceClassesRequired,
  });

  // Step 6: user message
  const doctrine = TRUTH_DOMAIN_FALLBACK_DOCTRINE[params.truthClass];
  const userMsg = buildUserVisibleLayerMessage(params.truthClass, category, degradedMode);

  const notes: string[] = [
    '4.3.3 six-step sequence: declare degraded → classify loss → attempt continuity → recompute confidence → bounded scoring → surface visibility',
  ];
  if (category) notes.push(`Semantic category: ${category}`);
  notes.push(`Continuity hierarchy rank: ${continuityRank}`);
  notes.push(`Truth state: ${truthStateKind}`);
  if (thesis.thesis_critical_for_query) notes.push('Thesis-critical — penalty amplified (4.3.7)');
  if (isHardBlocker) notes.push('HARD BLOCKER — downstream must constrain or suppress claims (4.3.8)');

  return {
    degraded_mode_active: degradedMode,
    fallback_semantic_category: category,
    truth_state_kind: truthStateKind,
    substitution_semantics: substitutionSemantics,
    judgment_meaningfulness: judgmentMeaningfulness,
    continuity_hierarchy_rank: continuityRank,
    confidence_penalty_suggestion: confidencePenalty,
    thesis_critical_for_query: thesis.thesis_critical_for_query,
    affected_truth_class: params.truthClass,
    truth_loss_accounting: truthLoss,
    penalized_score_families: [...doctrine.penalized_score_families],
    user_visible_layer_message: userMsg,
    effective_provider: params.effectiveProvider,
    primary_provider_id: params.primaryProviderId,
    is_hard_blocker: isHardBlocker,
    epistemic_notes: notes,
  };
}

export function buildFallbackEpistemicMetadataForFailure(params: {
  truthClass: TruthClass;
  primaryProviderId: string;
  failedProvider?: string;
  reason?: string;
  hardBlockerContext?: Partial<HardBlockerContext>;
}): FallbackEpistemicMetadata {
  const doctrine = TRUTH_DOMAIN_FALLBACK_DOCTRINE[params.truthClass];
  const userMsg = doctrine.user_visible_template_missing;
  const notes = [
    'Ingress failure — no acceptable substitute at connector boundary.',
    params.reason ?? '',
  ].filter(Boolean);

  const penalty = Math.min(1, Math.max(
    MIN_MATERIAL_CONFIDENCE_PENALTY,
    doctrine.base_confidence_penalty * CATEGORY_PENALTY_MULTIPLIER.no_fallback_failure,
  ));

  const truthLoss = buildTruthLossAccounting(params.truthClass, 'no_fallback_failure', true);

  const isHardBlocker = evaluateHardBlocker({
    truthClassMissing: true,
    truthClass: params.truthClass,
    ...params.hardBlockerContext,
  });

  if (isHardBlocker) notes.push('HARD BLOCKER — downstream must constrain or suppress claims (4.3.8)');

  return {
    degraded_mode_active: true,
    fallback_semantic_category: 'no_fallback_failure',
    truth_state_kind: 'layer_unavailable',
    substitution_semantics: 'unknown',
    judgment_meaningfulness: 'unavailable',
    continuity_hierarchy_rank: 5,
    confidence_penalty_suggestion: penalty,
    thesis_critical_for_query: false,
    affected_truth_class: params.truthClass,
    truth_loss_accounting: truthLoss,
    penalized_score_families: [...doctrine.penalized_score_families],
    user_visible_layer_message: userMsg,
    effective_provider: params.failedProvider ?? 'none',
    primary_provider_id: params.primaryProviderId,
    is_hard_blocker: isHardBlocker,
    epistemic_notes: notes,
  };
}
