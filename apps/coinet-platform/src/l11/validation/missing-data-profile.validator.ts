/**
 * L11.5 — Missing-Data Profile Validator (§11.5.5)
 *
 * The "master" validator for `L11ScoreMissingDataProfile`. Composes
 * `validateL11MissingInputRef`, `validateL11AppliedMissingDataBehavior`,
 * and `validateL11ScoreVisibility`, plus replay-hash + structural
 * checks.
 */

import {
  L11ScoreMissingDataProfile,
  extractL11MissingDataProfileReplayMaterial,
  canonicalMissingDataProfileReplayHash,
} from '../contracts';
import {
  L11MissingRegimeIssue,
  L11MissingRegimeViolationCode,
  makeL11MissingRegimeIssue,
} from './l11-missing-regime-violation-codes';
import { validateL11MissingInputRef } from './missing-input-ref.validator';
import { validateL11AppliedMissingDataBehavior } from './missing-data-behavior.validator';
import { validateL11ScoreVisibility } from './score-visibility.validator';

export interface ValidateL11MissingDataProfileArgs {
  readonly profile: L11ScoreMissingDataProfile;
  readonly is_emitted?: boolean;
}

export function validateL11MissingDataProfile(
  args: ValidateL11MissingDataProfileArgs,
): { ok: boolean; issues: readonly L11MissingRegimeIssue[] } {
  const issues: L11MissingRegimeIssue[] = [];
  const p = args.profile;

  if (!p.missing_profile_id) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_ID_MISSING,
      'missing_profile_id missing'));
  }
  if (!p.score_id) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_SCORE_REF_MISSING,
      'score_id missing',
      { missing_profile_id: p.missing_profile_id }));
  }
  if (!p.formula_id) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_FORMULA_REF_MISSING,
      'formula_id missing',
      { missing_profile_id: p.missing_profile_id }));
  }
  if (!p.formula_version) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_FORMULA_VERSION_MISSING,
      'formula_version missing',
      { missing_profile_id: p.missing_profile_id }));
  }
  if (!p.scope_type || !p.scope_id) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_SCOPE_FIELDS_MISSING,
      'scope_type or scope_id missing',
      { missing_profile_id: p.missing_profile_id }));
  }
  if (!p.as_of) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_AS_OF_MISSING,
      'as_of missing',
      { missing_profile_id: p.missing_profile_id }));
  }
  if (!p.input_snapshot_ref) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_INPUT_SNAPSHOT_REF_MISSING,
      'input_snapshot_ref missing',
      { missing_profile_id: p.missing_profile_id }));
  }
  if (!p.lineage_refs || p.lineage_refs.length === 0) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_LINEAGE_REFS_MISSING,
      'lineage_refs missing',
      { missing_profile_id: p.missing_profile_id }));
  }
  if (!p.policy_version) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_MISSING_PROFILE_POLICY_VERSION_MISSING,
      'policy_version missing',
      { missing_profile_id: p.missing_profile_id }));
  }

  // ── Per-input ref structural validation
  const allInputs = [
    ...p.missing_required_inputs,
    ...p.missing_optional_inputs,
    ...p.stale_inputs,
    ...p.degraded_inputs,
    ...p.evidence_only_inputs,
    ...p.restricted_inputs,
    ...p.conflicting_inputs,
  ];
  for (const r of allInputs) {
    const inner = validateL11MissingInputRef({ ref: r });
    issues.push(...inner.issues);
  }

  // ── Behaviour validation
  const behaviorResult = validateL11AppliedMissingDataBehavior({
    applied_behaviors: p.applied_behaviors,
  });
  issues.push(...behaviorResult.issues);

  // ── Visibility validation
  const visResult = validateL11ScoreVisibility({
    profile: p, is_emitted: args.is_emitted,
  });
  issues.push(...visResult.issues);

  // ── Replay hash
  if (!p.replay_hash) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REPLAY_HASH_MISSING,
      'replay_hash missing',
      { missing_profile_id: p.missing_profile_id }));
  } else {
    const recomputed = canonicalMissingDataProfileReplayHash(
      extractL11MissingDataProfileReplayMaterial(p),
    );
    if (recomputed !== p.replay_hash) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REPLAY_HASH_MISMATCH,
        `replay_hash mismatch stored=${p.replay_hash} recomputed=${recomputed}`,
        { missing_profile_id: p.missing_profile_id }));
    }
  }

  return { ok: issues.every(i => i.severity !== 'CRITICAL' && i.severity !== 'ERROR'), issues };
}
