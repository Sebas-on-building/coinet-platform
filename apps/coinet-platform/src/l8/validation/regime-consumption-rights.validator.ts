/**
 * L8.5 — Regime Consumption Rights Validator
 *
 * §8.5.8.4 / §8.5.8.5 — Given a binding's admissibility + dependency
 * class, validates whether a proposed downstream consumption (primary
 * classification / secondary / transition / confidence / multiplier)
 * is lawful.
 */

import {
  L8RegimeConsumptionRight,
  getL8ConsumptionRights,
  L8RegimeInputViolationCode,
} from '../contracts/regime-consumption-rights';
import type {
  L8RegimeDependencyClass,
} from '../contracts/regime-input-binding';
import type {
  L8RegimeInputAdmissibilityClass,
} from '../contracts/regime-admissibility';

export interface L8ConsumptionCheckRequest {
  readonly ref: string;
  readonly dependency_class: L8RegimeDependencyClass;
  readonly admissibility: L8RegimeInputAdmissibilityClass;
  readonly proposed_right: L8RegimeConsumptionRight;
}

export interface L8ConsumptionIssue {
  readonly code: L8RegimeInputViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8ConsumptionReport {
  readonly valid: boolean;
  readonly issues: readonly L8ConsumptionIssue[];
}

function rightToCode(
  right: L8RegimeConsumptionRight,
): L8RegimeInputViolationCode {
  switch (right) {
    case L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION:
      return L8RegimeInputViolationCode.RIGHT_PRIMARY_NOT_GRANTED;
    case L8RegimeConsumptionRight.INFLUENCE_SECONDARY_CLASSIFICATION:
      return L8RegimeInputViolationCode.RIGHT_SECONDARY_NOT_GRANTED;
    case L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK:
      return L8RegimeInputViolationCode.RIGHT_TRANSITION_NOT_GRANTED;
    case L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE:
      return L8RegimeInputViolationCode.RIGHT_CONFIDENCE_NOT_GRANTED;
    case L8RegimeConsumptionRight.INFLUENCE_MULTIPLIER:
      return L8RegimeInputViolationCode.RIGHT_MULTIPLIER_NOT_GRANTED;
    case L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY:
      return L8RegimeInputViolationCode.RIGHT_PRIMARY_NOT_GRANTED;
  }
}

export function validateRegimeConsumptionRight(
  req: L8ConsumptionCheckRequest,
): L8ConsumptionReport {
  const rights = getL8ConsumptionRights(
    req.dependency_class, req.admissibility,
  );
  if (rights.includes(req.proposed_right)) {
    return { valid: true, issues: [] };
  }
  return {
    valid: false,
    issues: [{
      code: rightToCode(req.proposed_right),
      message:
        `${req.dependency_class} × ${req.admissibility} does not grant ${req.proposed_right}`,
      details: { granted: rights },
    }],
  };
}

export function validateRegimeConsumptionBatch(
  requests: readonly L8ConsumptionCheckRequest[],
): L8ConsumptionReport {
  const issues: L8ConsumptionIssue[] = [];
  for (const r of requests) {
    const rep = validateRegimeConsumptionRight(r);
    for (const i of rep.issues) issues.push(i);
  }
  return { valid: issues.length === 0, issues };
}
