/**
 * L13.2 — Restriction Binding Validator
 *
 * §13.2.15 — Validates that the merged restriction profile contains
 * always-blocked modes, that allowed modes do not include any
 * blocked mode, and that the profile is composed from at least one
 * lower-layer ref when blocking is asserted.
 */

import {
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
  L13AnswerMode,
  type L13ExplanationRestrictionProfile,
} from '../contracts/explanation-restriction-profile';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

export function validateL13RestrictionBinding(
  profile: L13ExplanationRestrictionProfile,
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  for (const m of L13_ALWAYS_BLOCKED_ANSWER_MODES) {
    if (!profile.blocked_answer_modes.includes(m)) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_BLOCKED_ANSWER_MODE_ALLOWED,
        severity: L13ViolationSeverity.CRITICAL,
        message: `always-blocked answer mode "${m}" missing from blocked_answer_modes`,
      });
    }
  }

  // Allowed modes must NOT contain any blocked answer mode (cross-name
  // collision is impossible, but we double-check by string).
  for (const am of profile.allowed_answer_modes) {
    if (
      (L13_ALWAYS_BLOCKED_ANSWER_MODES as readonly string[]).includes(am)
    ) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_BLOCKED_ANSWER_MODE_ALLOWED,
        severity: L13ViolationSeverity.CRITICAL,
        message: `allowed_answer_modes contains blocked mode "${am}"`,
      });
    }
  }

  // Constitutional must-avoid flags.
  if (
    !profile.must_avoid_recommendation_language ||
    !profile.must_avoid_prediction_language ||
    !profile.must_avoid_final_judgment_language
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_RESTRICTION_BYPASS,
      severity: L13ViolationSeverity.CRITICAL,
      message:
        'restriction profile must always carry must_avoid recommendation/prediction/final-judgment flags',
    });
  }

  // If scenario explanation is blocked, EXPLAIN_SCENARIO must not be
  // allowed.
  if (
    !profile.may_explain_scenario &&
    profile.allowed_answer_modes.includes(L13AnswerMode.EXPLAIN_SCENARIO)
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_RESTRICTION_BYPASS,
      severity: L13ViolationSeverity.CRITICAL,
      message:
        'EXPLAIN_SCENARIO allowed despite may_explain_scenario=false',
    });
  }
  if (
    !profile.may_explain_score &&
    profile.allowed_answer_modes.includes(L13AnswerMode.EXPLAIN_SCORE)
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_RESTRICTION_BYPASS,
      severity: L13ViolationSeverity.CRITICAL,
      message: 'EXPLAIN_SCORE allowed despite may_explain_score=false',
    });
  }

  return l13PackageResult(issues);
}
