/**
 * L11.2 — Direction Validator (§11.2.6)
 *
 * Confirms a direction declaration matches the canonical map and
 * detects mixed direction semantics in free-form descriptions.
 */

import { L11ScoreFamily } from '../contracts/score-family';
import {
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  detectL11DirectionMixingDoctrine,
} from '../contracts/score-direction';
import {
  L11ScoreDoctrineIssue,
  L11ScoreDoctrineViolationCode,
  makeL11ScoreDoctrineIssue,
} from './l11-score-doctrine-violation-codes';

export interface L11DirectionValidationInput {
  readonly score_family: L11ScoreFamily;
  readonly direction_class: L11ScoreFamilyDirectionClass | null;
  readonly description?: string;
}

export interface L11DirectionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreDoctrineIssue[];
}

export function validateL11Direction(
  input: L11DirectionValidationInput,
): L11DirectionValidationResult {
  const issues: L11ScoreDoctrineIssue[] = [];
  const subj = `direction:${input.score_family}`;

  if (!input.direction_class) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISSING,
        'direction_class missing',
        { subject_ref: subj, score_family: input.score_family },
      ),
    );
    return { ok: false, issues };
  }

  const expected = L11_REQUIRED_DIRECTION_BY_FAMILY[input.score_family];
  if (input.direction_class !== expected) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISMATCH,
        `direction mismatch: expected ${expected}, got ${input.direction_class}`,
        { subject_ref: subj, score_family: input.score_family },
      ),
    );
  }

  if (input.description && detectL11DirectionMixingDoctrine(input.description)) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_DIRECTION_MIXED,
        'direction description mixes higher-is-better and higher-is-worse semantics',
        { subject_ref: subj, score_family: input.score_family },
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}
