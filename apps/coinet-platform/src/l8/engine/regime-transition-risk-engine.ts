/**
 * L8.7 — Regime Transition Risk Engine
 *
 * §8.7.4 — Derives the governance-level transition risk profile from:
 *   - current top / secondary candidates
 *   - prior-run primary
 *   - fired instability signatures
 *   - ambiguity + staleness + degradation posture
 *   - family-local transition pressure signals (from L8.6 templates)
 *   - historical instability flag for the template
 *
 * This engine is DISTINCT from L8.4's `transition-detection-engine`
 * which produces the runtime `L8TransitionOutput` during classification.
 * The L8.7 engine produces the reliance-governance view that downstream
 * layers consume.
 */

import type { L8RegimeCandidate } from '../runtime/regime-execution-context';
import { L8RegimeCoexistenceClass } from '../contracts/regime-state';
import {
  L8RegimeTransitionRiskProfile,
  L8RegimeTransitionRiskClass,
  L8RegimeInstabilityReasonCode,
  resolveL8RegimeTransitionRiskClass,
  L8_REGIME_TRANSITION_RISK_POLICY_VERSION,
} from '../contracts/regime-transition-risk.policy';

export interface L8TransitionRiskEngineInput {
  readonly regime_subject_id: string;
  readonly regime_result_id: string;
  readonly candidates: readonly L8RegimeCandidate[];
  readonly prior_primary_regime_class: string | null;
  readonly fired_signature_refs: readonly string[];
  readonly ambiguity_score: number;
  readonly staleness_score: number;
  readonly degradation_score: number;
  readonly contradiction_unresolved: boolean;
  readonly historical_instability_flag: boolean;
  readonly compute_run_id: string;
  readonly replay_hash: string;
  /**
   * §8.7.4.6 — family-local transition signatures that L8.6 templates
   * register as family transition signatures. The engine treats any
   * fired ref whose prefix matches a family-signature namespace as a
   * family-transition contribution.
   */
  readonly family_signature_prefix: string; // e.g. "macro.family.transition."
}

export interface L8TransitionRiskEngineResult {
  readonly profile: L8RegimeTransitionRiskProfile;
  readonly derivation_log: {
    readonly base_risk: number;
    readonly flip_contribution: number;
    readonly gap_contribution: number;
    readonly signature_contribution: number;
    readonly ambiguity_contribution: number;
    readonly staleness_contribution: number;
    readonly degradation_contribution: number;
    readonly contradiction_contribution: number;
    readonly historical_contribution: number;
  };
}

export function computeL8TransitionRiskProfile(
  input: L8TransitionRiskEngineInput,
): L8TransitionRiskEngineResult {
  const reasons = new Set<L8RegimeInstabilityReasonCode>();
  const candidateFlipRefs: string[] = [];

  if (input.candidates.length === 0) {
    // Defensive: emit UNRESOLVED
    return {
      profile: emitUnresolved(input),
      derivation_log: emptyLog(),
    };
  }

  const top = input.candidates[0];
  const second = input.candidates[1];

  // Base risk: candidates present, transition not stable by default
  let risk = 0.05;
  const log = { ...emptyLog() };

  // §8.7.4.6 — prior-primary flip
  let flipContrib = 0;
  if (input.prior_primary_regime_class &&
      input.prior_primary_regime_class !== top.regime_class) {
    flipContrib = 0.35;
    reasons.add(L8RegimeInstabilityReasonCode.PRIOR_REGIME_FLIP);
    candidateFlipRefs.push(
      `flip:${input.prior_primary_regime_class}->${top.regime_class}`,
    );
  }
  log.flip_contribution = flipContrib;

  // §8.7.4.6 — candidate proximity: primary/secondary gap
  let gapContrib = 0;
  let flipPressure = 0;
  if (second) {
    const gap = top.candidate_strength_score - second.candidate_strength_score;
    if (gap < 0.1) {
      gapContrib = 0.3;
      reasons.add(L8RegimeInstabilityReasonCode.CANDIDATE_PROXIMITY);
      reasons.add(L8RegimeInstabilityReasonCode.PRIMARY_SECONDARY_GAP_NARROW);
      candidateFlipRefs.push(
        `flip:${top.regime_class}<->${second.regime_class}`,
      );
      flipPressure = 0.8;
    } else if (gap < 0.2) {
      gapContrib = 0.15;
      reasons.add(L8RegimeInstabilityReasonCode.CANDIDATE_PROXIMITY);
      flipPressure = 0.5;
    } else {
      flipPressure = Math.max(0, 0.3 - gap);
    }
  }
  log.gap_contribution = gapContrib;

  // §8.7.4.6 — fired signatures contribute, with family-signature
  // prefix contributing to family_transition_pressure separately.
  let sigContrib = 0;
  let familyPressure = 0;
  if (input.fired_signature_refs.length > 0) {
    sigContrib = Math.min(0.3, 0.1 * input.fired_signature_refs.length);
    reasons.add(L8RegimeInstabilityReasonCode.FAMILY_TRANSITION_SIGNATURE);
    const familyCount = input.fired_signature_refs
      .filter(r => r.startsWith(input.family_signature_prefix)).length;
    if (familyCount > 0) {
      familyPressure = Math.min(1, 0.25 + 0.2 * familyCount);
    }
  }
  log.signature_contribution = sigContrib;

  // §8.7.4.6 — ambiguity + staleness + degradation + contradiction
  const amb = clamp01(input.ambiguity_score);
  const stale = clamp01(input.staleness_score);
  const degr = clamp01(input.degradation_score);
  let ambContrib = 0, staleContrib = 0, degrContrib = 0, contContrib = 0;
  if (amb >= 0.5) {
    ambContrib = 0.1 + 0.1 * (amb - 0.5);
    reasons.add(L8RegimeInstabilityReasonCode.AMBIGUITY_PRESSURE);
  }
  if (stale >= 0.5) {
    staleContrib = 0.05 + 0.1 * (stale - 0.5);
    reasons.add(L8RegimeInstabilityReasonCode.STALENESS_ESCALATION);
  }
  if (degr >= 0.5) {
    degrContrib = 0.05 + 0.1 * (degr - 0.5);
    reasons.add(L8RegimeInstabilityReasonCode.DEGRADATION_ESCALATION);
  }
  if (input.contradiction_unresolved) {
    contContrib = 0.15;
    reasons.add(L8RegimeInstabilityReasonCode.CONTRADICTION_ESCALATION);
  }
  log.ambiguity_contribution = ambContrib;
  log.staleness_contribution = staleContrib;
  log.degradation_contribution = degrContrib;
  log.contradiction_contribution = contContrib;

  // §8.7.4.6 — historical instability of the template
  let histContrib = 0;
  if (input.historical_instability_flag) {
    histContrib = 0.1;
    reasons.add(
      L8RegimeInstabilityReasonCode.HISTORICAL_INSTABILITY_PATTERN);
  }
  log.historical_contribution = histContrib;

  risk += flipContrib + gapContrib + sigContrib + ambContrib
    + staleContrib + degrContrib + contContrib + histContrib;
  risk = clamp01(risk);
  log.base_risk = 0.05;

  // Derive class
  const riskClass: L8RegimeTransitionRiskClass =
    resolveL8RegimeTransitionRiskClass(risk);

  // Coexistence class derivation
  let coexistence: L8RegimeCoexistenceClass =
    L8RegimeCoexistenceClass.CLEAN_SINGLE;
  if (flipContrib > 0) {
    coexistence = L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP;
  } else if (second) {
    const gap = top.candidate_strength_score - second.candidate_strength_score;
    if (gap < 0.1) {
      coexistence = L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP;
    } else if (gap < 0.2) {
      coexistence = L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY;
    }
  }

  // HIGH risk requires reasons — inject a generic "CANDIDATE_PROXIMITY"
  // when no other reason is available to satisfy INV-8.7-F.
  if (riskClass === 'HIGH' && reasons.size === 0) {
    reasons.add(L8RegimeInstabilityReasonCode.CANDIDATE_PROXIMITY);
  }

  const profile: L8RegimeTransitionRiskProfile = {
    transition_profile_id: `trp.${input.regime_subject_id}.${input.regime_result_id}`,
    regime_subject_id: input.regime_subject_id,
    regime_result_id: input.regime_result_id,

    transition_risk_score: risk,
    transition_risk_class: riskClass,
    coexistence_class: coexistence,
    candidate_flip_refs: candidateFlipRefs,
    primary_secondary_flip_pressure: clamp01(flipPressure),
    family_transition_pressure: clamp01(familyPressure),
    instability_reason_codes: Array.from(reasons),

    policy_version: L8_REGIME_TRANSITION_RISK_POLICY_VERSION,
    compute_run_id: input.compute_run_id,
    replay_hash: input.replay_hash,
  };

  return { profile, derivation_log: log };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function emptyLog() {
  return {
    base_risk: 0,
    flip_contribution: 0,
    gap_contribution: 0,
    signature_contribution: 0,
    ambiguity_contribution: 0,
    staleness_contribution: 0,
    degradation_contribution: 0,
    contradiction_contribution: 0,
    historical_contribution: 0,
  };
}

function emitUnresolved(
  input: L8TransitionRiskEngineInput,
): L8RegimeTransitionRiskProfile {
  return {
    transition_profile_id: `trp.${input.regime_subject_id}.${input.regime_result_id}`,
    regime_subject_id: input.regime_subject_id,
    regime_result_id: input.regime_result_id,
    transition_risk_score: NaN,
    transition_risk_class: 'UNRESOLVED',
    coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
    candidate_flip_refs: [],
    primary_secondary_flip_pressure: 0,
    family_transition_pressure: 0,
    instability_reason_codes: [],
    policy_version: L8_REGIME_TRANSITION_RISK_POLICY_VERSION,
    compute_run_id: input.compute_run_id,
    replay_hash: input.replay_hash,
  };
}
