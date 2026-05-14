/**
 * L11.5 — Missing-Data + Regime Readiness Validator
 *
 * Cross-validator that asserts the readiness story across:
 *  - missing-data profile
 *  - regime modifiers
 *  - interaction objects
 *  - emitted score
 *
 * Used by INV-11.5-G (attribution linkage) and INV-11.5-H (replay).
 */

import {
  L11ScoreOutput,
  L11ScoreMissingDataProfile,
  L11ScoreRegimeModifier,
  L11MissingRegimeInteraction,
  L11MissingDataReadinessEffect,
  L11ScoreVisibilityClass,
} from '../contracts';
import {
  L11MissingRegimeIssue,
  L11MissingRegimeViolationCode,
  makeL11MissingRegimeIssue,
} from './l11-missing-regime-violation-codes';

export interface ValidateMissingDataRegimeReadinessArgs {
  readonly score: L11ScoreOutput;
  readonly profile: L11ScoreMissingDataProfile;
  readonly modifiers: readonly L11ScoreRegimeModifier[];
  readonly interactions: readonly L11MissingRegimeInteraction[];
}

export function validateL11MissingDataRegimeReadiness(
  args: ValidateMissingDataRegimeReadinessArgs,
): { ok: boolean; issues: readonly L11MissingRegimeIssue[] } {
  const issues: L11MissingRegimeIssue[] = [];
  const { score, profile, modifiers, interactions } = args;

  // ── Score must reference profile
  if (score.missing_data_profile_ref &&
      profile.missing_profile_id &&
      score.missing_data_profile_ref !== profile.missing_profile_id) {
    // Some hosts use a stable reference id; we accept ref equality
    // OR ref containment (id appears within ref).
    if (!score.missing_data_profile_ref.includes(profile.missing_profile_id) &&
        !profile.missing_profile_id.includes(score.missing_data_profile_ref)) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_MATERIAL_MISSING_NOT_ATTRIBUTED,
        `score.missing_data_profile_ref ${score.missing_data_profile_ref} != profile.missing_profile_id ${profile.missing_profile_id}`,
        { score_id: score.score_id, missing_profile_id: profile.missing_profile_id }));
    }
  }

  // ── Score must reference each regime modifier
  const referenced = new Set(score.regime_modifier_refs);
  for (const m of modifiers) {
    const matches = referenced.has(m.modifier_id) ||
      Array.from(referenced).some(r => r.includes(m.modifier_id));
    if (!matches) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_MATERIAL_REGIME_MOD_NOT_ATTRIBUTED,
        `score does not reference modifier ${m.modifier_id}`,
        { score_id: score.score_id, modifier_id: m.modifier_id }));
    }
  }

  // ── Readiness must align with score emission semantics
  if (profile.readiness_effect === L11MissingDataReadinessEffect.SCORE_BLOCKED) {
    if (score.final_score > 0 ||
        profile.visibility_class !== L11ScoreVisibilityClass.BLOCKED_VISIBILITY) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_BLOCKED_VISIBILITY_EMITTED,
        `score blocked by missing-data but final_score=${score.final_score} & visibility=${profile.visibility_class}`,
        { score_id: score.score_id, missing_profile_id: profile.missing_profile_id }));
    }
  }

  // ── Interactions must be non-empty when both material missing-data
  //   and active modifiers exist
  const hasMaterialMissing = profile.applied_behaviors.length > 0 ||
    profile.applied_caps.length > 0 || profile.applied_penalties.length > 0;
  if (hasMaterialMissing && modifiers.length > 0 && interactions.length === 0) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_REGIME_INTERACTION_OMITTED,
      'material missing-data + active modifiers but no interactions',
      { score_id: score.score_id, missing_profile_id: profile.missing_profile_id }));
  }

  return { ok: issues.every(i => i.severity !== 'CRITICAL' && i.severity !== 'ERROR'), issues };
}
