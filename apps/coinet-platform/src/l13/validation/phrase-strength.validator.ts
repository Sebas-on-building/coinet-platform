/**
 * L13.5 — Phrase Strength Validator
 *
 * §13.5.23 — Validates per-section phrase classifications against
 * the declared allowed_phrase_strength_classes. Returns an issue
 * for every section whose strongest class exceeds the cap.
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

export function validateL13PhraseStrengthProfile(
  profile: L13ConfidencePhrasingProfile,
): L13ExpressionValidationResult {
  const issues: L13ExpressionIssue[] = [];

  const maxRank = Math.max(
    ...profile.allowed_phrase_strength_classes.map(c =>
      l13RankPhraseStrength(c),
    ),
    0,
  );

  for (const section of profile.section_phrase_strengths) {
    if (l13RankPhraseStrength(section.strongest_class) > maxRank) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_PHRASE_CLASS_NOT_PERMITTED,
        severity: SEV.CRITICAL,
        subject_ref: section.section_ref,
        message: `section ${section.section_ref} phrase class ${section.strongest_class} exceeds max allowed`,
      });
    }
    if (
      section.strongest_class ===
      L13PhraseStrengthClass.FORBIDDEN_CERTAINTY
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_FORBIDDEN_CERTAINTY_PHRASE_PRESENT,
        severity: SEV.CRITICAL,
        subject_ref: section.section_ref,
        message: `section ${section.section_ref} classified as FORBIDDEN_CERTAINTY`,
      });
    }
  }

  return l13ExpressionResult(issues);
}
