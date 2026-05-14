/**
 * L11.5 — Score Visibility Validator (§11.5.5.3 / §11.5.5.4 / INV-11.5-C)
 */

import {
  L11ScoreMissingDataProfile,
  L11ScoreVisibilityClass,
  L11MissingDataReadinessEffect,
  L11RuntimeMissingDataBehaviorClass,
  isL11ScoreVisibilityEmissible,
  ALL_L11_SCORE_VISIBILITY_CLASSES,
  ALL_L11_MISSING_DATA_READINESS_EFFECTS,
} from '../contracts';
import {
  L11MissingRegimeIssue,
  L11MissingRegimeViolationCode,
  makeL11MissingRegimeIssue,
} from './l11-missing-regime-violation-codes';

export interface ValidateScoreVisibilityArgs {
  readonly profile: L11ScoreMissingDataProfile;
  /** Whether the profile is expected to be emitted (i.e. score is
   * being published). When true, BLOCKED_VISIBILITY is illegal. */
  readonly is_emitted?: boolean;
}

export function validateL11ScoreVisibility(
  args: ValidateScoreVisibilityArgs,
): { ok: boolean; issues: readonly L11MissingRegimeIssue[] } {
  const issues: L11MissingRegimeIssue[] = [];
  const p = args.profile;

  if (!p.visibility_class) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_VISIBILITY_CLASS_MISSING,
      'visibility_class missing',
      { missing_profile_id: p.missing_profile_id }));
  } else if (!ALL_L11_SCORE_VISIBILITY_CLASSES.includes(p.visibility_class)) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_VISIBILITY_CLASS_INCONSISTENT,
      `unknown visibility_class ${p.visibility_class}`,
      { missing_profile_id: p.missing_profile_id }));
  }

  if (!ALL_L11_MISSING_DATA_READINESS_EFFECTS.includes(p.readiness_effect)) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_READINESS_EFFECT_INCONSISTENT,
      `unknown readiness_effect ${p.readiness_effect}`,
      { missing_profile_id: p.missing_profile_id }));
  }

  if (args.is_emitted && !isL11ScoreVisibilityEmissible(p.visibility_class)) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_BLOCKED_VISIBILITY_EMITTED,
      `emitted score has BLOCKED_VISIBILITY`,
      { missing_profile_id: p.missing_profile_id, score_id: p.score_id }));
  }

  // Cross-check: BLOCK_SCORE behaviour ⇒ readiness should be SCORE_BLOCKED
  const hasBlockBehavior = p.applied_behaviors.some(
    b => b.behavior === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE,
  );
  if (hasBlockBehavior &&
      p.readiness_effect !== L11MissingDataReadinessEffect.SCORE_BLOCKED) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_READINESS_EFFECT_INCONSISTENT,
      'BLOCK_SCORE behaviour applied but readiness_effect != SCORE_BLOCKED',
      { missing_profile_id: p.missing_profile_id }));
  }

  // Visibility ⇒ readiness coherence
  if (p.visibility_class === L11ScoreVisibilityClass.BLOCKED_VISIBILITY &&
      p.readiness_effect !== L11MissingDataReadinessEffect.SCORE_BLOCKED) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_VISIBILITY_CLASS_INCONSISTENT,
      'BLOCKED_VISIBILITY requires readiness_effect = SCORE_BLOCKED',
      { missing_profile_id: p.missing_profile_id }));
  }

  return { ok: issues.length === 0, issues };
}
