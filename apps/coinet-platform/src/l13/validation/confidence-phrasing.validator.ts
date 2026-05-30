/**
 * L13.5 — Confidence Phrasing Validator
 *
 * §13.5.23 — Validates the `L13ConfidencePhrasingProfile`.
 */

import type { L13ConfidencePhrasingProfile } from '../contracts/confidence-phrasing-profile';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import {
  L13PhraseStrengthClass,
  l13RankPhraseStrength,
} from '../contracts/phrase-strength';
import { L13ExpressionViolationCode } from './l13-expression-violation-codes';
import {
  l13ExpressionResult,
  type L13ExpressionIssue,
  type L13ExpressionValidationResult,
} from './_l13-expression-issue';

const SEV = L13ViolationSeverity;

export function validateL13ConfidencePhrasingProfile(
  profile: L13ConfidencePhrasingProfile,
): L13ExpressionValidationResult {
  const issues: L13ExpressionIssue[] = [];

  if (!profile.phrasing_profile_id) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONFIDENCE_CEILING_MISSING,
      severity: SEV.CRITICAL,
      message: 'phrasing_profile_id missing',
    });
  }
  if (!profile.replay_hash) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (!profile.confidence_ceiling) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONFIDENCE_CEILING_MISSING,
      severity: SEV.CRITICAL,
      message: 'confidence_ceiling missing',
    });
  }

  // Absolute forbidden phrases are critical.
  if (profile.absolute_forbidden_phrases_detected.length > 0) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_FORBIDDEN_CERTAINTY_PHRASE_PRESENT,
      severity: SEV.CRITICAL,
      message: `absolute forbidden phrases present: ${profile.absolute_forbidden_phrases_detected.join(
        ',',
      )}`,
    });
  }

  // Contextually forbidden phrases under narrowed ceiling are
  // critical.
  if (profile.contextually_forbidden_phrases_detected.length > 0) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_FORBIDDEN_CERTAINTY_PHRASE_PRESENT,
      severity: SEV.CRITICAL,
      message: `contextually forbidden phrases under narrowed ceiling: ${profile.contextually_forbidden_phrases_detected.join(
        ',',
      )}`,
    });
  }

  // Phrase class must be within allowed set.
  if (
    !profile.allowed_phrase_strength_classes.includes(
      profile.strongest_phrase_class_used,
    )
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_PHRASE_CLASS_NOT_PERMITTED,
      severity: SEV.CRITICAL,
      message: `strongest_phrase_class_used=${profile.strongest_phrase_class_used} not in allowed_phrase_strength_classes`,
    });
  }

  // FORBIDDEN_CERTAINTY must never appear in allowed set.
  if (
    profile.allowed_phrase_strength_classes.includes(
      L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
    )
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_ALLOWED_PHRASE_STRENGTH_EXCEEDS_RESTRICTION,
      severity: SEV.CRITICAL,
      message:
        'FORBIDDEN_CERTAINTY class present in allowed_phrase_strength_classes',
    });
  }

  // Outrun flag and rewrite/block flags must be consistent.
  if (profile.confidence_outrun_detected) {
    if (
      !profile.output_must_be_rewritten &&
      !profile.output_must_be_blocked
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_REWRITE_REQUIRED_BUT_NOT_MARKED,
        severity: SEV.CRITICAL,
        message:
          'confidence_outrun_detected=true but neither rewrite nor block required flag set',
      });
    }
  }

  // Strongest section phrase rank must be ≤ max allowed.
  const maxRank = Math.max(
    ...profile.allowed_phrase_strength_classes.map(c =>
      l13RankPhraseStrength(c),
    ),
    0,
  );
  if (
    l13RankPhraseStrength(profile.strongest_phrase_class_used) >
      maxRank &&
    !profile.confidence_outrun_detected
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONFIDENCE_OUTRUN,
      severity: SEV.CRITICAL,
      message:
        'strongest phrase exceeds max allowed but confidence_outrun_detected=false',
    });
  }

  return l13ExpressionResult(issues);
}
