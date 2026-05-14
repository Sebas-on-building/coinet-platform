/**
 * L11.2 — Score Family Validator (§11.2.13 / §11.2.14 / §11.2.16)
 *
 * Validates a `L11ScoreFamilyDefinition` against doctrine. Returns
 * structured issues — never throws unless given a clearly malformed
 * value (e.g. `null`).
 */

import {
  L11ScoreFamily,
  isL11ProductionScoreFamily,
  isL11ReservedScoreFamily,
} from '../contracts/score-family';
import {
  L11ScoreFamilyDefinition,
} from '../contracts/score-family-catalogue';
import {
  L11ScoreProductionStatus,
} from '../contracts/score-production-status';
import {
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts/score-direction';
import {
  L11ForbiddenScoreUse,
  L11_REQUIRED_FORBIDDEN_USES,
} from '../contracts/score-meaning-claim';
import {
  L11ScoreDoctrineViolationCode,
  L11ScoreDoctrineIssue,
  makeL11ScoreDoctrineIssue,
} from './l11-score-doctrine-violation-codes';

export interface L11ScoreFamilyValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreDoctrineIssue[];
}

export function validateL11ScoreFamilyDefinition(
  def: L11ScoreFamilyDefinition,
): L11ScoreFamilyValidationResult {
  const issues: L11ScoreDoctrineIssue[] = [];
  const family = def.score_family;
  const subj = `family:${family}`;

  if (!isL11ProductionScoreFamily(family) && !isL11ReservedScoreFamily(family)) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_FAMILY_UNREGISTERED,
        `family ${family} is not in canonical family enumeration`,
        { subject_ref: subj, score_family: family },
      ),
    );
  }

  if (!def.score_name || def.score_name.trim() === '') {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_PRODUCTION_FAMILY_INCOMPLETE,
        'score_name missing',
        { subject_ref: subj, score_family: family },
      ),
    );
  }

  if (!def.production_status) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_PRODUCTION_STATUS_MISSING,
        'production_status missing',
        { subject_ref: subj, score_family: family },
      ),
    );
  }

  if (!def.meaning_claim_ref) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_MISSING,
        'meaning_claim_ref missing on family definition',
        { subject_ref: subj, score_family: family },
      ),
    );
  }

  if (!def.direction_class) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISSING,
        'direction_class missing',
        { subject_ref: subj, score_family: family },
      ),
    );
  } else {
    const expected = L11_REQUIRED_DIRECTION_BY_FAMILY[family];
    if (def.direction_class !== expected) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISMATCH,
          `direction mismatch: expected ${expected}, got ${def.direction_class}`,
          { subject_ref: subj, score_family: family },
        ),
      );
    }
  }

  if (!def.band_policy_ref) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_SCORE_BAND_POLICY_MISSING,
        'band_policy_ref missing',
        { subject_ref: subj, score_family: family },
      ),
    );
  }

  if (!def.policy_version) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_POLICY_VERSION_MISSING,
        'policy_version missing on family definition',
        { subject_ref: subj, score_family: family },
      ),
    );
  }

  if (def.production_status === L11ScoreProductionStatus.PRODUCTION_ENABLED) {
    if (def.required_lower_layer_surfaces.length === 0) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_FAMILY_DEPENDENCY_MISSING,
          'production family has no required_lower_layer_surfaces',
          { subject_ref: subj, score_family: family },
        ),
      );
    }
    if (def.required_output_surfaces.length === 0) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_FAMILY_OUTPUT_SURFACE_MISSING,
          'production family has no required_output_surfaces',
          { subject_ref: subj, score_family: family },
        ),
      );
    }
    if (def.required_disclosure_requirements.length === 0) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_FAMILY_DISCLOSURE_MISSING,
          'production family has no required_disclosure_requirements',
          { subject_ref: subj, score_family: family },
        ),
      );
    }
    if (def.illegal_interpretations.length === 0) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
          'production family declares no illegal_interpretations',
          { subject_ref: subj, score_family: family },
        ),
      );
    }
    const missingForbidden = L11_REQUIRED_FORBIDDEN_USES.filter(
      (u: L11ForbiddenScoreUse) => !def.forbidden_downstream_uses.includes(u),
    );
    if (missingForbidden.length > 0) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_FORBIDDEN_USES_INCOMPLETE,
          `family forbidden uses missing: ${missingForbidden.join(',')}`,
          { subject_ref: subj, score_family: family },
        ),
      );
    }
  } else if (
    def.production_status === L11ScoreProductionStatus.RESERVED ||
    def.production_status === L11ScoreProductionStatus.EXPERIMENTAL_BLOCKED
  ) {
    if (def.required_lower_layer_surfaces.length > 0) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_RESERVED_FAMILY_MISCONFIGURED,
          'reserved/experimental family must not declare lower-layer surfaces',
          { subject_ref: subj, score_family: family },
        ),
      );
    }
    if (def.required_output_surfaces.length > 0) {
      issues.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_RESERVED_FAMILY_MISCONFIGURED,
          'reserved/experimental family must not declare output surfaces',
          { subject_ref: subj, score_family: family },
        ),
      );
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Convenience for validating the entire catalogue.
 */
export function validateL11ScoreFamilyDefinitions(
  defs: readonly L11ScoreFamilyDefinition[],
): L11ScoreFamilyValidationResult {
  const all: L11ScoreDoctrineIssue[] = [];
  const seen = new Set<L11ScoreFamily>();
  for (const d of defs) {
    if (seen.has(d.score_family)) {
      all.push(
        makeL11ScoreDoctrineIssue(
          L11ScoreDoctrineViolationCode.L11D_FAMILY_DUPLICATE,
          `duplicate family ${d.score_family}`,
          { subject_ref: `family:${d.score_family}`, score_family: d.score_family },
        ),
      );
      continue;
    }
    seen.add(d.score_family);
    all.push(...validateL11ScoreFamilyDefinition(d).issues);
  }
  return { ok: all.length === 0, issues: all };
}
