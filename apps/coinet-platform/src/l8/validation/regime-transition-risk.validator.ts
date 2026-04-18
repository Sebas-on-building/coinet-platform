/**
 * L8.7 — Regime Transition Risk Validator
 *
 * §8.7.4 — Enforces the transition-risk policy:
 *   - score/class coherence
 *   - independence from regime confidence
 *   - instability reasons required when risk is HIGH
 *   - coexistence class must be honoured under overlap
 *   - flip-pressure coherence
 */

import {
  L8RegimeTransitionRiskProfile,
  resolveL8RegimeTransitionRiskClass,
  transitionRiskIsHigh,
} from '../contracts/regime-transition-risk.policy';
import { L8RegimeCoexistenceClass } from '../contracts/regime-state';
import {
  L8RegimeRelianceViolation,
  L8RegimeRelianceViolationCode,
} from './l8-reliance-violation-codes';

/**
 * Independence context — what the confidence engine emitted, so the
 * validator can detect "transition was absorbed into confidence":
 *   - `confidence_score_capped`: confidence as a final band
 *   - `transition_component`: the `transition_instability` factor from
 *     the confidence breakdown
 *   - `ambiguity_score`: derivation-context ambiguity (for §8.7.4.7)
 */
export interface L8TransitionIndependenceCtx {
  readonly confidence_score_capped: number;
  readonly confidence_transition_instability_component: number;
  readonly ambiguity_score: number;
}

export interface L8TransitionRiskValidationInput {
  readonly profile: L8RegimeTransitionRiskProfile;
  readonly independence: L8TransitionIndependenceCtx;
  readonly subject_ref?: string;
}

export interface L8TransitionRiskValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8RegimeRelianceViolation[];
}

function push(
  v: L8RegimeRelianceViolation[], code: L8RegimeRelianceViolationCode,
  detail: string, subject_ref?: string,
): void { v.push({ code, detail, subject_ref }); }

function inRange01(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1 + 1e-9;
}

export function validateRegimeTransitionRisk(
  input: L8TransitionRiskValidationInput,
): L8TransitionRiskValidationResult {
  const { profile: p, independence, subject_ref } = input;
  const violations: L8RegimeRelianceViolation[] = [];

  // §8.7.4.5 — score + class coherence
  if (!inRange01(p.transition_risk_score)) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_SCORE_OUT_OF_RANGE,
      `score=${p.transition_risk_score}`, subject_ref);
  }
  const expectedClass =
    resolveL8RegimeTransitionRiskClass(p.transition_risk_score);
  if (p.transition_risk_class !== expectedClass &&
      !(p.transition_risk_class === 'UNRESOLVED' &&
        !Number.isFinite(p.transition_risk_score))) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_CLASS_SCORE_MISMATCH,
      `class=${p.transition_risk_class} expected=${expectedClass} score=${p.transition_risk_score}`,
      subject_ref);
  }

  // §8.7.4.7 — HIGH risk must carry instability reasons
  if (transitionRiskIsHigh(p.transition_risk_class) &&
      (!p.instability_reason_codes ||
       p.instability_reason_codes.length === 0)) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_HIGH_WITHOUT_REASONS,
      `risk=HIGH but no instability reasons`, subject_ref);
  }

  // §8.7.4.7 — overlap without coexistence class
  const hasOverlap = p.candidate_flip_refs.length > 0 ||
    p.primary_secondary_flip_pressure >= 0.3;
  if (hasOverlap &&
      p.coexistence_class === L8RegimeCoexistenceClass.CLEAN_SINGLE) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_CLEAN_WITH_OVERLAP,
      `flip_pressure=${p.primary_secondary_flip_pressure} but coexistence=CLEAN_SINGLE`,
      subject_ref);
  }

  // §8.7.4.7 — low transition while ambiguity is materially unresolved
  if (p.transition_risk_class === 'LOW' &&
      independence.ambiguity_score >= 0.6) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_LOW_WITH_AMBIGUITY_UNRESOLVED,
      `risk=LOW but ambiguity_score=${independence.ambiguity_score}`,
      subject_ref);
  }

  // §8.7.4.4 — flip-pressure coherence
  if (!inRange01(p.primary_secondary_flip_pressure)) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_FLIP_PRESSURE_INCOHERENT,
      `primary_secondary_flip_pressure=${p.primary_secondary_flip_pressure}`,
      subject_ref);
  }
  if (!inRange01(p.family_transition_pressure)) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_FAMILY_PRESSURE_INCOHERENT,
      `family_transition_pressure=${p.family_transition_pressure}`,
      subject_ref);
  }
  // HIGH risk without a non-trivial pressure signal is incoherent.
  if (p.transition_risk_class === 'HIGH' &&
      p.primary_secondary_flip_pressure < 0.2 &&
      p.family_transition_pressure < 0.2) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_FLIP_PRESSURE_INCOHERENT,
      `risk=HIGH with flip_pressure=${p.primary_secondary_flip_pressure} family_pressure=${p.family_transition_pressure}`,
      subject_ref);
  }

  // §8.7.4.7 — coexistence class must be present for transitional regimes
  if (p.coexistence_class === L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP &&
      p.transition_risk_score < 0.2) {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_COEXISTENCE_MISSING_WITH_OVERLAP,
      `coexistence=TRANSITIONAL_OVERLAP but score=${p.transition_risk_score}`,
      subject_ref);
  }

  // §8.7.4.2 — independence from confidence. If confidence is HIGH/FULL
  // (≥0.55 capped) but transition_instability factor was low (≤0.15) AND
  // the transition profile reports HIGH risk, something is inconsistent:
  // confidence is hiding the transition instability.
  if (independence.confidence_score_capped >= 0.55 &&
      independence.confidence_transition_instability_component <= 0.15 &&
      p.transition_risk_class === 'HIGH') {
    push(violations,
      L8RegimeRelianceViolationCode.TRANSITION_ABSORBED_INTO_CONFIDENCE,
      `confidence_capped=${independence.confidence_score_capped} instability_factor=${independence.confidence_transition_instability_component} but transition=HIGH`,
      subject_ref);
  }

  return { ok: violations.length === 0, violations };
}
