/**
 * L11.2 — Meaning-Claim Validator (§11.2.5.2 / §11.2.16)
 */

import {
  L11ScoreFamilyMeaningClaim,
  L11_REQUIRED_FORBIDDEN_USES,
} from '../contracts/score-meaning-claim';
import {
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts/score-direction';
import {
  L11ScoreDoctrineViolationCode,
  L11ScoreDoctrineIssue,
  makeL11ScoreDoctrineIssue,
} from './l11-score-doctrine-violation-codes';

export interface L11MeaningClaimValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreDoctrineIssue[];
}

export function validateL11ScoreFamilyMeaningClaim(
  c: L11ScoreFamilyMeaningClaim,
): L11MeaningClaimValidationResult {
  const issues: L11ScoreDoctrineIssue[] = [];
  const subj = `meaning_claim:${c.meaning_claim_id || '<missing>'}`;

  if (!c.meaning_claim_id) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_ID_MISSING,
        'meaning_claim_id missing',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.score_family) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_INCOMPLETE,
        'score_family missing',
        { subject_ref: subj },
      ),
    );
  }
  if (!c.score_name) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_INCOMPLETE,
        'score_name missing',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.meaning_claim || c.meaning_claim.trim() === '') {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_MISSING,
        'meaning_claim text empty',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.measures || c.measures.length === 0) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_INCOMPLETE,
        'measures must be non-empty',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.does_not_measure || c.does_not_measure.length === 0) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_INCOMPLETE,
        'does_not_measure must be non-empty',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.high_value_means || c.high_value_means.trim() === '') {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_HIGH_LOW_MISSING,
        'high_value_means missing',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.low_value_means || c.low_value_means.trim() === '') {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_HIGH_LOW_MISSING,
        'low_value_means missing',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.illegal_interpretations || c.illegal_interpretations.length === 0) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
        'illegal_interpretations must be non-empty',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }

  if (!c.direction_class) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISSING,
        'direction_class missing',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  } else if (c.score_family) {
    const expected = L11_REQUIRED_DIRECTION_BY_FAMILY[c.score_family];
    if (c.direction_class !== expected) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISMATCH,
          `direction mismatch: expected ${expected}, got ${c.direction_class}`,
          { subject_ref: subj, score_family: c.score_family },
        ),
      );
    }
  }

  if (!c.calibration_category) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_CALIBRATION_TARGET_MISSING,
        'calibration_category missing',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.production_status) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_PRODUCTION_STATUS_MISSING,
        'production_status missing on meaning claim',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }
  if (!c.policy_version) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_POLICY_VERSION_MISSING,
        'policy_version missing on meaning claim',
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }

  const missingForbidden = L11_REQUIRED_FORBIDDEN_USES.filter(
    f => !c.forbidden_downstream_uses?.includes(f),
  );
  if (missingForbidden.length > 0) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_FORBIDDEN_USES_INCOMPLETE,
        `meaning claim missing required forbidden uses: ${missingForbidden.join(',')}`,
        { subject_ref: subj, score_family: c.score_family },
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}

export function validateL11MeaningClaimUniqueness(
  claims: readonly L11ScoreFamilyMeaningClaim[],
): L11MeaningClaimValidationResult {
  const issues: L11ScoreDoctrineIssue[] = [];
  const ids = new Set<string>();
  const families = new Set<string>();
  for (const c of claims) {
    if (c.meaning_claim_id && ids.has(c.meaning_claim_id)) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_DUPLICATE,
          `duplicate meaning_claim_id ${c.meaning_claim_id}`,
          { score_family: c.score_family, meaning_claim_id: c.meaning_claim_id },
        ),
      );
    } else if (c.meaning_claim_id) {
      ids.add(c.meaning_claim_id);
    }
    if (c.score_family && families.has(c.score_family)) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_DUPLICATE,
          `duplicate meaning claim for family ${c.score_family}`,
          { score_family: c.score_family, meaning_claim_id: c.meaning_claim_id },
        ),
      );
    } else if (c.score_family) {
      families.add(c.score_family);
    }
  }
  return { ok: issues.length === 0, issues };
}
