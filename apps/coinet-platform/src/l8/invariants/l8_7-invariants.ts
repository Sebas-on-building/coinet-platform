/**
 * L8.7 — Reliance-Governance Invariants
 *
 * §8.7.10.1 — INV-8.7-A through INV-8.7-G as executable functions.
 *
 *   INV-8.7-A : Every regime output must carry separate regime
 *               confidence, transition risk, and multiplier posture.
 *   INV-8.7-B : Regime confidence must be derived from declared factor
 *               groups and may not outrun cap-chain law.
 *   INV-8.7-C : Transition risk remains independent of confidence and
 *               may not be silently absorbed into it.
 *   INV-8.7-D : Multiplier profiles remain interpretive objects and
 *               may not become final scores or recommendation outputs.
 *   INV-8.7-E : L7 restriction posture and contradiction posture must
 *               narrow reliance where required.
 *   INV-8.7-F : High ambiguity, high transition, weak freshness, or
 *               material degradation may not emit as clean strong
 *               reliance.
 *   INV-8.7-G : Cap chains and multiplier narrowing remain explicit,
 *               queryable, and replay-safe.
 */

import { L8RegimeConfidenceBand, L8RegimeCoexistenceClass }
  from '../contracts/regime-state';
import {
  L8RegimeCapChain, L8RegimeCapReason,
  deriveL8CapChainReadinessHint, dominantL8CapReason,
} from '../contracts/regime-cap-chain';
import {
  L8_FACTOR_GROUP_TO_BREAKDOWN_KEY,
  L8_REGIME_CONFIDENCE_POLICY_VERSION,
  ALL_L8_REGIME_CONFIDENCE_FACTOR_GROUPS,
  requiredL8RegimeCapReasons,
  resolveL8RegimeConfidenceBandFromScore,
} from '../contracts/regime-confidence.policy';
import {
  L8RegimeTransitionRiskProfile,
  L8_REGIME_TRANSITION_RISK_POLICY_VERSION,
  L8RegimeInstabilityReasonCode,
  resolveL8RegimeTransitionRiskClass,
} from '../contracts/regime-transition-risk.policy';
import {
  L8RegimeMultiplierNarrowingReason,
  L8_REGIME_MULTIPLIER_POLICY_VERSION,
  L8_REGIME_DEFAULT_MULTIPLIER_POSTURE,
  resolveL8DefaultMultiplierPosture,
} from '../contracts/regime-multiplier.policy';
import {
  L8RegimeRelianceProfile, L8RegimeRelianceReadinessClass,
  deriveL8RegimeRelianceReadinessClass,
  L8_REGIME_RELIANCE_CONTRACT_VERSION,
  L8_REGIME_RELIANCE_POLICY_VERSION,
} from '../contracts/regime-reliance-profile';
import {
  L8RegimeConfidenceContract,
} from '../contracts/regime-confidence.contract';
import {
  L8RegimeMultiplierProfileContract,
} from '../contracts/regime-multiplier-profile.contract';

import { validateRegimeCapChain }
  from '../validation/regime-cap-chain.validator';
import { validateRegimeConfidencePolicy }
  from '../validation/regime-confidence-policy.validator';
import { validateRegimeTransitionRisk }
  from '../validation/regime-transition-risk.validator';
import { validateRegimeMultiplierPolicy }
  from '../validation/regime-multiplier-policy.validator';
import { validateRegimeRelianceProfile }
  from '../validation/regime-reliance-profile.validator';

import { L8MacroRegimeClass } from '../contracts/regime-class';

export interface L8_7InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ──────────────────────────────────────────────────────────────────
// Helper: build a green reliance triple for drift / rejection tests.
// ──────────────────────────────────────────────────────────────────

export interface L8GreenRelianceBundle {
  readonly confidence: L8RegimeConfidenceContract;
  readonly transition: L8RegimeTransitionRiskProfile;
  readonly multiplier: L8RegimeMultiplierProfileContract;
  readonly reliance: L8RegimeRelianceProfile;
  readonly capChain: L8RegimeCapChain;
}

export function buildGreenRelianceBundle(): L8GreenRelianceBundle {
  const subjectId = 'subj.MACRO.RISK_ON.BTC-USD.h4';
  const resultId = 'res.MACRO.RISK_ON.BTC-USD.h4.20260101';
  const confId = `conf.${resultId}`;
  const transId = `trp.${subjectId}.${resultId}`;
  const multId = `mult.${subjectId}.${resultId}`;

  const confidence: L8RegimeConfidenceContract = {
    confidence_assessment_id: confId,
    regime_subject_id: subjectId,
    regime_result_id: resultId,
    confidence_contract_version: 'v1.0.0',
    schema_version: 'l8.3-confidence-v1',
    policy_version: L8_REGIME_CONFIDENCE_POLICY_VERSION,
    confidence_score_raw: 0.72,
    confidence_score_capped: 0.72,
    confidence_band: L8RegimeConfidenceBand.HIGH,
    factor_breakdown: {
      support_breadth: 0.8,
      freshness: 0.85,
      validation_quality_posture: 0.78,
      contradiction_pressure: 0.1,
      transition_instability: 0.15,
      cross_domain_agreement: 0.75,
      historical_reliability: 0.7,
      ambiguity_pressure: 0.15,
    },
    cap_chain: [],
    rationale_codes: ['BROAD_SUPPORT', 'RECENT_EVIDENCE'],
    l7_restriction_profile_refs: [],
    l7_contradiction_bundle_refs: [],
    lineage_refs: { trace_id: 'trace.1', manifest_id: 'man.1' },
    compute_run_id: 'run.1',
    replay_hash: 'hash.conf.1.abcd',
  };

  const transition: L8RegimeTransitionRiskProfile = {
    transition_profile_id: transId,
    regime_subject_id: subjectId,
    regime_result_id: resultId,
    transition_risk_score: 0.12,
    transition_risk_class: 'LOW',
    coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
    candidate_flip_refs: [],
    primary_secondary_flip_pressure: 0.1,
    family_transition_pressure: 0.0,
    instability_reason_codes: [],
    policy_version: L8_REGIME_TRANSITION_RISK_POLICY_VERSION,
    compute_run_id: 'run.1',
    replay_hash: 'hash.trans.1.efgh',
  };

  const multiplier: L8RegimeMultiplierProfileContract = {
    multiplier_profile_id: multId,
    regime_subject_id: subjectId,
    regime_result_id: resultId,
    multiplier_contract_version: 'v1.0.0',
    schema_version: 'l8.3-multiplier-v1',
    policy_version: L8_REGIME_MULTIPLIER_POLICY_VERSION,
    primary_regime: L8MacroRegimeClass.RISK_ON,
    secondary_regime: null,
    regime_confidence_band: L8RegimeConfidenceBand.HIGH,
    transition_risk_class: 'STABLE' as unknown as
      L8RegimeMultiplierProfileContract['transition_risk_class'],
    dimensions: resolveL8DefaultMultiplierPosture(L8MacroRegimeClass.RISK_ON),
    derivation_spec_ref: 'mult.derivation.v1',
    restriction_consumption_refs: [],
    lineage_refs: { trace_id: 'trace.1', manifest_id: 'man.1' },
    compute_run_id: 'run.1',
    replay_hash: 'hash.mult.1.ijkl',
    description:
      'Macro RISK_ON default posture: momentum trust up, breakout skepticism down.',
  };

  const capChain: L8RegimeCapChain = {
    pre_cap_score: 0.72,
    capped_score: 0.72,
    dominant_cap_reason: null,
    applied_caps: [],
    required_cap_reasons: [],
    readiness_hint: 'CLEAN',
  };

  const reliance: L8RegimeRelianceProfile = {
    reliance_profile_id: `rel.${resultId}`,
    regime_subject_id: subjectId,
    regime_result_id: resultId,
    reliance_contract_version: L8_REGIME_RELIANCE_CONTRACT_VERSION,
    schema_version: 'l8.7-reliance-v1',
    policy_version: L8_REGIME_RELIANCE_POLICY_VERSION,
    confidence_assessment_id: confId,
    transition_profile_id: transId,
    multiplier_profile_id: multId,
    confidence_band: L8RegimeConfidenceBand.HIGH,
    transition_risk_class: 'LOW',
    readiness_class: L8RegimeRelianceReadinessClass.STRONG,
    cap_chain: capChain,
    narrowing_reason_codes: [],
    l7_restriction_profile_refs: [],
    l7_contradiction_bundle_refs: [],
    lineage_refs: { trace_id: 'trace.1', manifest_id: 'man.1' },
    compute_run_id: 'run.1',
    replay_hash: 'hash.rel.1.mnop',
  };

  return { confidence, transition, multiplier, reliance, capChain };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.7-A — separate reliance surfaces
// ──────────────────────────────────────────────────────────────────

export function checkINV_87_A(): L8_7InvariantResult {
  const b = buildGreenRelianceBundle();
  const r = b.reliance;
  const ok =
    !!r.confidence_assessment_id &&
    !!r.transition_profile_id &&
    !!r.multiplier_profile_id &&
    r.confidence_assessment_id !== r.transition_profile_id &&
    r.confidence_assessment_id !== r.multiplier_profile_id &&
    r.transition_profile_id !== r.multiplier_profile_id;

  // Collapsed reliance must be rejected
  const collapsed: L8RegimeRelianceProfile = {
    ...r,
    transition_profile_id: r.confidence_assessment_id,
    multiplier_profile_id: r.confidence_assessment_id,
  };
  const badRes = validateRegimeRelianceProfile({ reliance: collapsed });
  const rejected = !badRes.ok &&
    badRes.violations.some(v => v.code === 'RELIANCE_SURFACES_COLLAPSED');

  const holds = ok && rejected;
  return {
    id: 'INV-8.7-A',
    name: 'Reliance surfaces remain separate and first-class',
    holds,
    evidence: `distinct_refs=${ok} collapsed_rejected=${rejected}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.7-B — confidence factor groups + cap-chain law
// ──────────────────────────────────────────────────────────────────

export function checkINV_87_B(): L8_7InvariantResult {
  const b = buildGreenRelianceBundle();

  // 1) Every factor-group key is present in the breakdown.
  const missingGroups: string[] = [];
  for (const g of ALL_L8_REGIME_CONFIDENCE_FACTOR_GROUPS) {
    const key = L8_FACTOR_GROUP_TO_BREAKDOWN_KEY[g];
    const present = (b.confidence.factor_breakdown as
      unknown as Record<string, number>)[key] !== undefined;
    if (!present) missingGroups.push(`${g}→${key}`);
  }
  const allGroupsPresent = missingGroups.length === 0;

  // 2) Band matches score.
  const expectedBand =
    resolveL8RegimeConfidenceBandFromScore(b.confidence.confidence_score_capped);
  const bandOk = b.confidence.confidence_band === expectedBand;

  // 3) Cap-chain law: when derivation context requires caps, validator
  //    must reject a confidence object without those caps.
  const offender: L8RegimeConfidenceContract = {
    ...b.confidence,
    confidence_score_raw: 0.92,
    confidence_score_capped: 0.92,
    confidence_band: L8RegimeConfidenceBand.FULL,
    cap_chain: [],
  };
  const badRes = validateRegimeConfidencePolicy({
    confidence: offender,
    derivation_context: {
      transition_risk_score: 0.8,
      ambiguity_score: 0.1,
      staleness_score: 0.1,
      degradation_score: 0.1,
      restriction_narrowed: false,
      contradiction_unresolved: false,
      historical_reliability_weak: false,
    },
  });
  const capOk = !badRes.ok &&
    badRes.violations.some(v =>
      v.code === 'CONFIDENCE_CAP_REQUIRED_BUT_MISSING' ||
      v.code === 'CONFIDENCE_MASQUERADE_CLEAN');

  const holds = allGroupsPresent && bandOk && capOk;
  return {
    id: 'INV-8.7-B',
    name: 'Confidence = factor-derived + cap-chain enforced',
    holds,
    evidence: `all_groups=${allGroupsPresent} band_ok=${bandOk} cap_ok=${capOk}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.7-C — transition independence from confidence
// ──────────────────────────────────────────────────────────────────

export function checkINV_87_C(): L8_7InvariantResult {
  const b = buildGreenRelianceBundle();

  // 1) Green profile has independent transition score.
  const greenRes = validateRegimeTransitionRisk({
    profile: b.transition,
    independence: {
      confidence_score_capped: b.confidence.confidence_score_capped,
      confidence_transition_instability_component:
        b.confidence.factor_breakdown.transition_instability,
      ambiguity_score: 0.1,
    },
  });

  // 2) Confidence-absorbed case is rejected: HIGH confidence, low
  //    transition_instability component, but HIGH transition risk.
  const offender: L8RegimeTransitionRiskProfile = {
    ...b.transition,
    transition_risk_score: 0.9,
    transition_risk_class: 'HIGH',
    primary_secondary_flip_pressure: 0.7,
    family_transition_pressure: 0.5,
    instability_reason_codes: [
      L8RegimeInstabilityReasonCode.CANDIDATE_PROXIMITY,
    ],
  };
  const badRes = validateRegimeTransitionRisk({
    profile: offender,
    independence: {
      confidence_score_capped: 0.9,
      confidence_transition_instability_component: 0.05,
      ambiguity_score: 0.05,
    },
  });

  const hiddenOk = !badRes.ok &&
    badRes.violations.some(v =>
      v.code === 'TRANSITION_ABSORBED_INTO_CONFIDENCE');

  const holds = greenRes.ok && hiddenOk;
  return {
    id: 'INV-8.7-C',
    name: 'Transition risk remains independent of confidence',
    holds,
    evidence: `green_ok=${greenRes.ok} absorbed_rejected=${hiddenOk}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.7-D — multipliers stay interpretive (not score / not action)
// ──────────────────────────────────────────────────────────────────

export function checkINV_87_D(): L8_7InvariantResult {
  const b = buildGreenRelianceBundle();

  // Score-shaped profile (all dims collapse to 2.5) must be rejected.
  const scoreShaped: L8RegimeMultiplierProfileContract = {
    ...b.multiplier,
    dimensions: {
      trend_amplification: 2.5,
      momentum_trust_multiplier: 2.5,
      breakout_skepticism_multiplier: 2.5,
      leverage_risk_multiplier: 2.5,
      liquidity_fragility_multiplier: 2.5,
      narrative_sensitivity_multiplier: 2.5,
      risk_overhang_sensitivity_multiplier: 2.5,
    },
    description: 'Overall score for RISK_ON — strong setup.',
  };
  const scoreShapedRes = validateRegimeMultiplierPolicy({
    multiplier: scoreShaped,
    derivation_context: {
      restriction_narrowed: false, contradiction_unresolved: false,
      transition_high: false, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });
  const scoreReject = !scoreShapedRes.ok &&
    scoreShapedRes.violations.some(v =>
      v.code === 'MULTIPLIER_SCORE_SHAPED' ||
      v.code === 'MULTIPLIER_UNIFORMLY_DIRECTIONAL');

  // Action-biased description must also be rejected.
  const action: L8RegimeMultiplierProfileContract = {
    ...b.multiplier,
    description: 'Buy signal under RISK_ON — recommendation to add exposure.',
  };
  const actionRes = validateRegimeMultiplierPolicy({
    multiplier: action,
    derivation_context: {
      restriction_narrowed: false, contradiction_unresolved: false,
      transition_high: false, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });
  const actionReject = !actionRes.ok &&
    actionRes.violations.some(v => v.code === 'MULTIPLIER_ACTION_BIASED');

  // Green profile passes.
  const greenRes = validateRegimeMultiplierPolicy({
    multiplier: b.multiplier,
    derivation_context: {
      restriction_narrowed: false, contradiction_unresolved: false,
      transition_high: false, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });

  const holds = scoreReject && actionReject && greenRes.ok;
  return {
    id: 'INV-8.7-D',
    name: 'Multipliers remain interpretive, not final-score or action-biased',
    holds,
    evidence: `score_reject=${scoreReject} action_reject=${actionReject} green=${greenRes.ok}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.7-E — L7 restriction + contradiction must narrow reliance
// ──────────────────────────────────────────────────────────────────

export function checkINV_87_E(): L8_7InvariantResult {
  const b = buildGreenRelianceBundle();

  // If restriction_narrowed=true but confidence has no restriction_refs
  // and no cap for restriction, reject.
  const offender: L8RegimeConfidenceContract = {
    ...b.confidence,
    l7_restriction_profile_refs: [],
    l7_contradiction_bundle_refs: [],
    cap_chain: [],
  };
  const confRes = validateRegimeConfidencePolicy({
    confidence: offender,
    derivation_context: {
      transition_risk_score: 0.1, ambiguity_score: 0.1,
      staleness_score: 0.1, degradation_score: 0.1,
      restriction_narrowed: true,
      contradiction_unresolved: true,
      historical_reliability_weak: false,
    },
  });
  const confReject = !confRes.ok &&
    confRes.violations.some(v =>
      v.code === 'CONFIDENCE_RESTRICTION_NOT_CONSUMED' ||
      v.code === 'CONFIDENCE_CONTRADICTION_NOT_CONSUMED' ||
      v.code === 'CONFIDENCE_CAP_REQUIRED_BUT_MISSING');

  // If multiplier context says restriction_narrowed but no narrowing
  // reason declared → reject.
  const multRes = validateRegimeMultiplierPolicy({
    multiplier: b.multiplier,
    derivation_context: {
      restriction_narrowed: true,
      contradiction_unresolved: true,
      transition_high: false, ambiguity_high: false,
      staleness_material: false, degradation_material: false,
    },
    declared_narrowing_reasons: [],
  });
  const multReject = !multRes.ok &&
    multRes.violations.some(v =>
      v.code === 'MULTIPLIER_IGNORES_RESTRICTION' ||
      v.code === 'MULTIPLIER_IGNORES_CONTRADICTION' ||
      v.code === 'MULTIPLIER_NARROWING_REASON_MISSING');

  const holds = confReject && multReject;
  return {
    id: 'INV-8.7-E',
    name: 'L7 restriction/contradiction narrows reliance where required',
    holds,
    evidence: `conf_reject=${confReject} mult_reject=${multReject}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.7-F — ambiguity/transition/freshness/degradation caps strong
// ──────────────────────────────────────────────────────────────────

export function checkINV_87_F(): L8_7InvariantResult {
  const b = buildGreenRelianceBundle();

  // Scenario: high ambiguity + high transition, yet emitted as STRONG.
  const offender: L8RegimeRelianceProfile = {
    ...b.reliance,
    confidence_band: L8RegimeConfidenceBand.HIGH,
    transition_risk_class: 'HIGH',
    readiness_class: L8RegimeRelianceReadinessClass.STRONG,
    cap_chain: {
      pre_cap_score: 0.75,
      capped_score: 0.75,
      dominant_cap_reason: null,
      applied_caps: [],
      required_cap_reasons: [],
      readiness_hint: 'CLEAN',
    },
  };
  const res = validateRegimeRelianceProfile({ reliance: offender });
  const rejected = !res.ok &&
    res.violations.some(v =>
      v.code === 'RELIANCE_RISK_CLASS_MISMATCH' ||
      v.code === 'RELIANCE_READINESS_INCOHERENT');

  // Degradation-material with readiness=STRONG and critical cap applied
  // is also rejected.
  const degraded: L8RegimeRelianceProfile = {
    ...b.reliance,
    readiness_class: L8RegimeRelianceReadinessClass.STRONG,
    cap_chain: {
      pre_cap_score: 0.9,
      capped_score: 0.4,
      dominant_cap_reason: L8RegimeCapReason.CAP_DEGRADATION_MATERIAL,
      applied_caps: [{
        cap_id: 'c.degr',
        cap_reason: L8RegimeCapReason.CAP_DEGRADATION_MATERIAL,
        max_after_cap: 0.4,
        applied: true,
      }],
      required_cap_reasons: [L8RegimeCapReason.CAP_DEGRADATION_MATERIAL],
      readiness_hint: 'DEGRADED',
    },
  };
  const degRes = validateRegimeRelianceProfile({ reliance: degraded });
  const degReject = !degRes.ok &&
    degRes.violations.some(v =>
      v.code === 'RELIANCE_STRONG_WITH_CRITICAL_CAP' ||
      v.code === 'RELIANCE_READINESS_INCOHERENT');

  const holds = rejected && degReject;
  return {
    id: 'INV-8.7-F',
    name: 'High ambiguity/transition/staleness/degradation blocks clean STRONG',
    holds,
    evidence: `high_transition_rejected=${rejected} degraded_rejected=${degReject}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.7-G — cap chains + narrowing remain explicit and replay-safe
// ──────────────────────────────────────────────────────────────────

export function checkINV_87_G(): L8_7InvariantResult {
  const b = buildGreenRelianceBundle();

  // Build a cap chain with multiple caps; dominant must be the
  // highest-precedence applied cap.
  const chain: L8RegimeCapChain = {
    pre_cap_score: 0.9,
    capped_score: 0.4,
    dominant_cap_reason: L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION,
    applied_caps: [
      {
        cap_id: 'c.cd',
        cap_reason: L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION,
        max_after_cap: 0.4,
        applied: true,
      },
      {
        cap_id: 'c.tr',
        cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
        max_after_cap: 0.7,
        applied: true,
      },
      {
        cap_id: 'c.fr',
        cap_reason: L8RegimeCapReason.CAP_FRESHNESS_WEAK,
        max_after_cap: 0.6,
        applied: false,
      },
    ],
    required_cap_reasons: [
      L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION,
      L8RegimeCapReason.CAP_TRANSITION_HIGH,
    ],
    readiness_hint: 'DEGRADED',
  };
  const chainRes = validateRegimeCapChain({
    cap_chain: chain,
    required_cap_reasons: chain.required_cap_reasons,
  });

  // Wrong dominant must be rejected.
  const wrong: L8RegimeCapChain = {
    ...chain,
    dominant_cap_reason: L8RegimeCapReason.CAP_TRANSITION_HIGH,
  };
  const wrongRes = validateRegimeCapChain({
    cap_chain: wrong,
    required_cap_reasons: wrong.required_cap_reasons,
  });
  const wrongReject = !wrongRes.ok &&
    wrongRes.violations.some(v =>
      v.code === 'CAP_CHAIN_DOMINANT_WRONG_PRECEDENCE');

  // Readiness hint must match derivation.
  const expectedHint = deriveL8CapChainReadinessHint(
    chain.pre_cap_score, chain.capped_score, chain.applied_caps);
  const hintOk = chain.readiness_hint === expectedHint;

  // Replay-hash is non-trivial (sanity).
  const hashOk = !!b.reliance.replay_hash && b.reliance.replay_hash.length >= 8;

  const holds = chainRes.ok && wrongReject && hintOk && hashOk;
  return {
    id: 'INV-8.7-G',
    name: 'Cap chains + narrowing are explicit, queryable, replay-safe',
    holds,
    evidence: `green_chain=${chainRes.ok} wrong_rejected=${wrongReject} hint_ok=${hintOk} hash_ok=${hashOk}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Aggregate runner
// ──────────────────────────────────────────────────────────────────

export function runAllL8_7Invariants(): readonly L8_7InvariantResult[] {
  return [
    checkINV_87_A(),
    checkINV_87_B(),
    checkINV_87_C(),
    checkINV_87_D(),
    checkINV_87_E(),
    checkINV_87_F(),
    checkINV_87_G(),
  ];
}

// ──────────────────────────────────────────────────────────────────
// Utility re-exports for consumers
// ──────────────────────────────────────────────────────────────────

export { deriveL8RegimeRelianceReadinessClass };
export { resolveL8DefaultMultiplierPosture };
export { L8_REGIME_DEFAULT_MULTIPLIER_POSTURE };
export { resolveL8RegimeTransitionRiskClass };
export { dominantL8CapReason };
export { requiredL8RegimeCapReasons };
export { L8RegimeMultiplierNarrowingReason };
