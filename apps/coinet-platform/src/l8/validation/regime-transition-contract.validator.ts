/**
 * L8.3 — Regime Transition Contract Validator
 *
 * §8.3.5.4 — Enforces completeness and legality of
 * `L8RegimeTransitionContract`: risk score/class consistency, coexistence
 * linkage, candidate flips, instability reasons when required, and
 * replay identity.
 */

import {
  L8RegimeTransitionContract,
  resolveL8TransitionRiskClass,
  transitionIsHighRisk,
} from '../contracts/regime-transition.contract';
import { L8RegimeContractViolationCode } from './l8-contract-violation-codes';

export interface L8TransitionContractIssue {
  readonly code: L8RegimeContractViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8TransitionContractReport {
  readonly valid: boolean;
  readonly issues: readonly L8TransitionContractIssue[];
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

function inUnit(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

export interface L8TransitionValidationContext {
  /** Ambiguity score of the parent regime output. */
  readonly ambiguity_score: number;
}

export function validateRegimeTransitionContract(
  t: L8RegimeTransitionContract,
  ctx?: L8TransitionValidationContext,
): L8TransitionContractReport {
  const issues: L8TransitionContractIssue[] = [];

  if (!t.transition_profile_id) {
    issues.push({
      code: L8RegimeContractViolationCode.TRANSITION_MISSING_IDENTITY,
      message: 'transition_profile_id missing',
    });
  }
  if (!t.regime_subject_id) {
    issues.push({
      code: L8RegimeContractViolationCode.TRANSITION_MISSING_IDENTITY,
      message: 'regime_subject_id missing',
    });
  }
  if (!t.regime_result_id) {
    issues.push({
      code: L8RegimeContractViolationCode.TRANSITION_MISSING_RESULT_REF,
      message: 'regime_result_id missing',
    });
  }
  if (!t.transition_contract_version ||
      !SEMVER.test(t.transition_contract_version)) {
    issues.push({
      code: L8RegimeContractViolationCode.TRANSITION_MISSING_CONTRACT_VERSION,
      message:
        `transition_contract_version missing or not semver: ${t.transition_contract_version}`,
    });
  }

  if (!inUnit(t.transition_risk_score)) {
    issues.push({
      code: L8RegimeContractViolationCode.TRANSITION_SCORE_OUT_OF_RANGE,
      message: `transition_risk_score OOR: ${t.transition_risk_score}`,
    });
  } else {
    const expected = resolveL8TransitionRiskClass(t.transition_risk_score);
    if (t.transition_risk_class !== expected) {
      issues.push({
        code: L8RegimeContractViolationCode.TRANSITION_CLASS_INCONSISTENT,
        message:
          `transition_risk_class ${t.transition_risk_class} inconsistent with score ${t.transition_risk_score} (expected ${expected})`,
      });
    }
  }

  if (!t.coexistence_class) {
    issues.push({
      code: L8RegimeContractViolationCode.TRANSITION_MISSING_COEXISTENCE,
      message: 'coexistence_class missing',
    });
  }

  // Instability reasons required when HIGH/CRITICAL
  if (transitionIsHighRisk(t)) {
    if (!t.instability_reasons || t.instability_reasons.length === 0) {
      issues.push({
        code:
          L8RegimeContractViolationCode.TRANSITION_MISSING_INSTABILITY_REASONS,
        message:
          `transition_risk_class=${t.transition_risk_class} but instability_reasons empty`,
      });
    }
  }

  // Stable-while-ambiguous guard
  if (ctx && ctx.ambiguity_score >= 0.5 &&
      (t.transition_risk_class === 'STABLE' ||
       t.transition_risk_class === 'MILD')) {
    issues.push({
      code: L8RegimeContractViolationCode.TRANSITION_STABLE_WHILE_AMBIGUOUS,
      message:
        `transition_risk_class=${t.transition_risk_class} with ambiguity_score=${ctx.ambiguity_score}`,
    });
  }

  if (!t.replay_hash) {
    issues.push({
      code: L8RegimeContractViolationCode.TRANSITION_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  return { valid: issues.length === 0, issues };
}
