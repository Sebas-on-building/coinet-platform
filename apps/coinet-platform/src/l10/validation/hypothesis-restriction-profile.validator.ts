/**
 * L10.2 — HypothesisRestrictionProfile Validator §10.2.16.4
 */

import {
  L10HypothesisRestrictionProfile,
  L10_MANDATORY_BLOCKED_USES,
  ALL_L10_RESTRICTION_RIGHTS,
  ALL_L10_BLOCKED_USES,
  ALL_L10_RELIANCE_BANDS,
} from '../contracts/hypothesis-restriction-profile';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

export interface L10RestrictionValidationInput {
  readonly profile: L10HypothesisRestrictionProfile;
  /** §10.2.16.4 — Narrow spreads must carry narrowing reasons. */
  readonly rankingCompetitionClose: boolean;
}

export function validateL10HypothesisRestrictionProfile(
  input: L10RestrictionValidationInput,
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];
  const p = input.profile;

  if (!p.hypothesis_restriction_profile_id) {
    issues.push({ code: L10ObjectViolationCode.RESTRICTION_MISSING_ID, message: 'hypothesis_restriction_profile_id required' });
  }
  if (!p.reliance_band) {
    issues.push({ code: L10ObjectViolationCode.RESTRICTION_MISSING_BAND, message: 'reliance_band required' });
  } else if (!ALL_L10_RELIANCE_BANDS.includes(p.reliance_band)) {
    issues.push({
      code: L10ObjectViolationCode.RESTRICTION_BAND_UNREGISTERED,
      message: `reliance_band ${p.reliance_band} unregistered`,
    });
  }
  if (p.allowed_downstream_uses.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.RESTRICTION_MISSING_ALLOWED_USES,
      message: 'allowed_downstream_uses must not be empty',
    });
  } else {
    for (const r of p.allowed_downstream_uses) {
      if (!ALL_L10_RESTRICTION_RIGHTS.includes(r)) {
        issues.push({
          code: L10ObjectViolationCode.RESTRICTION_UNREGISTERED_RIGHT,
          message: `allowed use ${r} is not a registered L10 restriction right`,
        });
      }
    }
  }
  if (p.blocked_uses.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.RESTRICTION_MISSING_BLOCKED_USES,
      message: 'blocked_uses must not be empty',
    });
  } else {
    for (const b of p.blocked_uses) {
      if (!ALL_L10_BLOCKED_USES.includes(b)) {
        issues.push({
          code: L10ObjectViolationCode.RESTRICTION_UNREGISTERED_BLOCKED_USE,
          message: `blocked use ${b} is not a registered L10 blocked use`,
        });
      }
    }
  }
  // §10.2.16.4 — Mandatory blocked uses must be present regardless of
  // whether any blocked_uses were declared. An empty blocked_uses list
  // still fails mandatory-use enforcement.
  for (const m of L10_MANDATORY_BLOCKED_USES) {
    if (!p.blocked_uses.includes(m)) {
      issues.push({
        code: L10ObjectViolationCode.RESTRICTION_MISSING_MANDATORY_BLOCKED_USES,
        message: `mandatory blocked use ${m} missing`,
      });
    }
  }
  if (input.rankingCompetitionClose && p.narrowing_reasons.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.RESTRICTION_MISSING_NARROWING_REASONS,
      message: 'narrowing_reasons required when ranking competition is close',
    });
  }
  if (!p.lineage_refs || p.lineage_refs.length === 0) {
    issues.push({ code: L10ObjectViolationCode.RESTRICTION_MISSING_LINEAGE, message: 'lineage_refs required' });
  }

  return { valid: issues.length === 0, issues };
}
