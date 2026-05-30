/**
 * L13.5 — Restriction Composition Validator
 *
 * §13.5.23 — Validates the `L13RestrictionCompositionProfile`. The
 * primary law (§13.5.13.4): most-restrictive-wins must hold, and
 * always-blocked uses may never be reopened.
 */

import {
  L13AllowedOutputUse,
  L13BlockedOutputUse,
  L13RestrictionLevel,
  L13_ALWAYS_BLOCKED_OUTPUT_USES,
  type L13RestrictionCompositionProfile,
} from '../contracts/restriction-composition';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13PhraseStrengthClass } from '../contracts/phrase-strength';
import { L13ExpressionViolationCode } from './l13-expression-violation-codes';
import {
  l13ExpressionResult,
  type L13ExpressionIssue,
  type L13ExpressionValidationResult,
} from './_l13-expression-issue';

const SEV = L13ViolationSeverity;

export function validateL13RestrictionCompositionProfile(
  profile: L13RestrictionCompositionProfile,
): L13ExpressionValidationResult {
  const issues: L13ExpressionIssue[] = [];

  if (!profile.restriction_composition_id) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_RESTRICTION_PROFILE_MISSING,
      severity: SEV.CRITICAL,
      message: 'restriction_composition_id missing',
    });
  }
  if (!profile.replay_hash) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }

  // BLOCKED implies output_allowed=false.
  if (
    profile.composed_restriction_level === L13RestrictionLevel.BLOCKED &&
    profile.output_allowed
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_RESTRICTION_COMPOSITION_ILLEGAL,
      severity: SEV.CRITICAL,
      message:
        'composed_restriction_level=BLOCKED but output_allowed=true',
    });
  }

  // Always-blocked uses must remain blocked.
  for (const always of L13_ALWAYS_BLOCKED_OUTPUT_USES) {
    if (!profile.blocked_output_uses.includes(always)) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_BLOCKED_USE_REOPENED,
        severity: SEV.CRITICAL,
        message: `always-blocked use ${always} not present in blocked_output_uses`,
      });
    }
    if (
      profile.allowed_output_uses.includes(
        always as unknown as L13AllowedOutputUse,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_BLOCKED_USE_REOPENED,
        severity: SEV.CRITICAL,
        message: `always-blocked use ${always} appears in allowed_output_uses`,
      });
    }
  }

  // EVIDENCE_ONLY must cap allowed_phrase_strength_classes at
  // CONDITIONAL_MEDIUM.
  if (
    profile.composed_restriction_level === L13RestrictionLevel.EVIDENCE_ONLY
  ) {
    for (const cls of profile.allowed_phrase_strength_classes) {
      if (
        cls === L13PhraseStrengthClass.EXPLANATORY_MEDIUM ||
        cls === L13PhraseStrengthClass.EXPLANATORY_HIGH ||
        cls === L13PhraseStrengthClass.ASSERTIVE_HIGH ||
        cls === L13PhraseStrengthClass.FORBIDDEN_CERTAINTY
      ) {
        issues.push({
          code: L13ExpressionViolationCode.L13U_ALLOWED_PHRASE_STRENGTH_EXCEEDS_RESTRICTION,
          severity: SEV.CRITICAL,
          message: `phrase class ${cls} not permitted under EVIDENCE_ONLY restriction`,
        });
      }
    }
  }

  // NARROWED must cap at EXPLANATORY_MEDIUM.
  if (
    profile.composed_restriction_level === L13RestrictionLevel.NARROWED
  ) {
    for (const cls of profile.allowed_phrase_strength_classes) {
      if (
        cls === L13PhraseStrengthClass.EXPLANATORY_HIGH ||
        cls === L13PhraseStrengthClass.ASSERTIVE_HIGH ||
        cls === L13PhraseStrengthClass.FORBIDDEN_CERTAINTY
      ) {
        issues.push({
          code: L13ExpressionViolationCode.L13U_ALLOWED_PHRASE_STRENGTH_EXCEEDS_RESTRICTION,
          severity: SEV.CRITICAL,
          message: `phrase class ${cls} not permitted under NARROWED restriction`,
        });
      }
    }
  }

  // FORBIDDEN_CERTAINTY must never be in allowed set.
  if (
    profile.allowed_phrase_strength_classes.includes(
      L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
    )
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_ALLOWED_PHRASE_STRENGTH_EXCEEDS_RESTRICTION,
      severity: SEV.CRITICAL,
      message:
        'FORBIDDEN_CERTAINTY appears in allowed_phrase_strength_classes',
    });
  }

  // Disjointness: allowed and blocked uses must not overlap.
  for (const allowed of profile.allowed_output_uses) {
    const asBlocked = allowed as unknown as L13BlockedOutputUse;
    if (
      profile.blocked_output_uses.includes(asBlocked) &&
      L13_ALWAYS_BLOCKED_OUTPUT_USES.includes(asBlocked)
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_BLOCKED_USE_REOPENED,
        severity: SEV.CRITICAL,
        message: `${allowed} appears in both allowed and blocked uses`,
      });
    }
  }

  // Must-disclose-restriction implies non-empty phrase requirements
  // at NARROWED/EVIDENCE_ONLY/BLOCKED.
  if (
    profile.must_disclose_restriction &&
    profile.required_restriction_phrases.length === 0
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_RESTRICTION_COMPOSITION_ILLEGAL,
      severity: SEV.CRITICAL,
      message:
        'must_disclose_restriction=true but required_restriction_phrases empty',
    });
  }

  return l13ExpressionResult(issues);
}
