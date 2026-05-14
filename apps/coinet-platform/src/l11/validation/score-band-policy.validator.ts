/**
 * L11.2 — Band-Policy Validator (§11.2.12.4)
 */

import {
  L11ScoreBandPolicy,
  checkL11BandThresholdIntegrity,
} from '../contracts/score-band-policy';
import {
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts/score-direction';
import {
  L11ScoreDoctrineIssue,
  L11ScoreDoctrineViolationCode,
  makeL11ScoreDoctrineIssue,
} from './l11-score-doctrine-violation-codes';

export interface L11BandPolicyValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreDoctrineIssue[];
}

export function validateL11ScoreBandPolicy(
  p: L11ScoreBandPolicy,
): L11BandPolicyValidationResult {
  const issues: L11ScoreDoctrineIssue[] = [];
  const subj = `band_policy:${p.band_policy_id || '<missing>'}`;

  if (!p.band_policy_id) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_SCORE_BAND_POLICY_MISSING,
        'band_policy_id missing',
        { subject_ref: subj, score_family: p.score_family },
      ),
    );
  }
  if (!p.policy_version) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_POLICY_VERSION_MISSING,
        'policy_version missing on band policy',
        { subject_ref: subj, score_family: p.score_family, band_policy_id: p.band_policy_id },
      ),
    );
  }
  if (p.min_score !== 0 || p.max_score !== 100) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_BAND_THRESHOLD_GAP_OR_OVERLAP,
        `band policy bounds must be [0, 100], got [${p.min_score}, ${p.max_score}]`,
        { subject_ref: subj, score_family: p.score_family, band_policy_id: p.band_policy_id },
      ),
    );
  }
  const integrity = checkL11BandThresholdIntegrity(p.thresholds);
  if (!integrity.ok) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_BAND_THRESHOLD_GAP_OR_OVERLAP,
        `threshold integrity failure: ${integrity.reason}`,
        { subject_ref: subj, score_family: p.score_family, band_policy_id: p.band_policy_id },
      ),
    );
  }

  if (p.score_family && p.direction_class) {
    const expected = L11_REQUIRED_DIRECTION_BY_FAMILY[p.score_family];
    if (p.direction_class !== expected) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISMATCH,
          `band policy direction mismatch: expected ${expected}, got ${p.direction_class}`,
          { subject_ref: subj, score_family: p.score_family, band_policy_id: p.band_policy_id },
        ),
      );
    }
  } else if (p.score_family && !p.direction_class) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISSING,
        'band policy direction_class missing',
        { subject_ref: subj, score_family: p.score_family, band_policy_id: p.band_policy_id },
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}
