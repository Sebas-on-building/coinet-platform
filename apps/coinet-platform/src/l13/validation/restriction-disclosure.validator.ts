/**
 * L13.3 — Restriction Disclosure Validator
 *
 * §13.3.7 — Validates the restriction disclosure attached to every
 * output. Always-blocked answer modes must appear; constitutional
 * must-avoid flags are fixed `true`; lower-layer restriction refs
 * must be present.
 */

import {
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
} from '../contracts/explanation-restriction-profile';
import type { L13RestrictionDisclosure } from '../contracts/restriction-disclosure';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import {
  l13OutputResult,
  type L13OutputIssue,
  type L13OutputValidationResult,
} from './_l13-output-issue';

const SEV = L13ViolationSeverity;

export function validateL13RestrictionDisclosure(
  disclosure: L13RestrictionDisclosure,
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];

  if (
    !disclosure.restriction_disclosure_id ||
    !disclosure.restriction_statement
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_RESTRICTION_DISCLOSURE_INVALID,
      severity: SEV.ERROR,
      message: 'restriction disclosure missing id or statement',
    });
  }

  if (disclosure.lower_layer_restriction_refs.length === 0) {
    issues.push({
      code: L13OutputViolationCode.L13O_RESTRICTION_DISCLOSURE_INVALID,
      severity: SEV.CRITICAL,
      message: 'lower_layer_restriction_refs missing',
    });
  }

  // Always-blocked modes must appear in the disclosure.
  for (const m of L13_ALWAYS_BLOCKED_ANSWER_MODES) {
    if (!disclosure.blocked_answer_modes.includes(m)) {
      issues.push({
        code: L13OutputViolationCode.L13O_BLOCKED_ANSWER_MODE_VIOLATED,
        severity: SEV.CRITICAL,
        message: `always-blocked answer mode "${m}" missing from disclosure`,
      });
    }
  }

  // Constitutional must-avoid flags MUST be true literals.
  if (
    !disclosure.must_avoid_recommendation_language ||
    !disclosure.must_avoid_prediction_language ||
    !disclosure.must_avoid_final_judgment_language
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_RESTRICTION_BYPASS,
      severity: SEV.CRITICAL,
      message:
        'must_avoid recommendation/prediction/final-judgment flags must always be true',
    });
  }

  if (disclosure.evidence_refs.length === 0) {
    issues.push({
      code: L13OutputViolationCode.L13O_RESTRICTION_DISCLOSURE_INVALID,
      severity: SEV.ERROR,
      message: 'restriction disclosure missing evidence_refs',
    });
  }

  return l13OutputResult(issues);
}
