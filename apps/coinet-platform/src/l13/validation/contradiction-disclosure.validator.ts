/**
 * L13.5 — Contradiction Disclosure Validator
 *
 * §13.5.23 — Validates the `L13ContradictionDisclosureProfile`.
 */

import {
  L13ContradictionDisclosureEffectClass,
  type L13ContradictionDisclosureProfile,
} from '../contracts/contradiction-disclosure-profile';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ExpressionViolationCode } from './l13-expression-violation-codes';
import {
  l13ExpressionResult,
  type L13ExpressionIssue,
  type L13ExpressionValidationResult,
} from './_l13-expression-issue';

const SEV = L13ViolationSeverity;

export function validateL13ContradictionDisclosureProfile(
  profile: L13ContradictionDisclosureProfile,
): L13ExpressionValidationResult {
  const issues: L13ExpressionIssue[] = [];

  if (!profile.contradiction_disclosure_id) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONTRADICTION_DISCLOSURE_MISSING,
      severity: SEV.CRITICAL,
      message: 'contradiction_disclosure_id missing',
    });
  }
  if (!profile.replay_hash) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }

  if (profile.contradiction_hidden_detected) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONTRADICTION_HIDDEN,
      severity: SEV.CRITICAL,
      message: 'contradiction hidden by output text',
    });
  }
  if (profile.contradiction_minimized_detected) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONTRADICTION_MINIMIZED,
      severity: SEV.CRITICAL,
      message: 'contradiction minimized by output text',
    });
  }
  if (profile.contradiction_overridden_detected) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONTRADICTION_OVERRIDDEN,
      severity: SEV.CRITICAL,
      message:
        'contradiction overridden by positive evidence in output text',
    });
  }
  if (
    profile.contradiction_section_required &&
    !profile.contradiction_section_ref
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONTRADICTION_DISCLOSURE_MISSING,
      severity: SEV.CRITICAL,
      message:
        'contradiction_section_required=true but contradiction_section_ref missing',
    });
  }
  if (
    profile.contradiction_effect_class ===
      L13ContradictionDisclosureEffectClass.BLOCKS_OUTPUT &&
    profile.output_allowed
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_BLOCK_REQUIRED_BUT_OUTPUT_ALLOWED,
      severity: SEV.CRITICAL,
      message:
        'contradiction effect BLOCKS_OUTPUT but output_allowed=true',
    });
  }
  if (
    profile.must_mention_contradiction &&
    profile.contradiction_phrase_requirements.length === 0
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONTRADICTION_DISCLOSURE_MISSING,
      severity: SEV.CRITICAL,
      message:
        'must_mention_contradiction=true but contradiction_phrase_requirements empty',
    });
  }

  return l13ExpressionResult(issues);
}
