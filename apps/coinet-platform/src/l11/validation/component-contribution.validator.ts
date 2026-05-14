/**
 * L11.4 — Component Contribution Validator (§11.4.5.2)
 */

import {
  L11ComponentContribution,
  L11AttributionMaterialityClass,
  L11ContributionDirection,
  L11ScoreFamily,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';

export interface L11ComponentContributionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreAttributionIssue[];
}

const RISK_DIRECTIONS: ReadonlySet<L11ScoreFamilyDirectionClass> = new Set([
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_SUPPLY_RISK,
]);

function isRiskFamily(family: L11ScoreFamily): boolean {
  return RISK_DIRECTIONS.has(L11_REQUIRED_DIRECTION_BY_FAMILY[family]);
}

function isMaterialOrAbove(c: L11AttributionMaterialityClass): boolean {
  return (
    c === L11AttributionMaterialityClass.CRITICAL ||
    c === L11AttributionMaterialityClass.MAJOR ||
    c === L11AttributionMaterialityClass.MATERIAL
  );
}

export function validateL11ComponentContribution(
  c: L11ComponentContribution,
): L11ComponentContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];

  if (!c.component_id) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_INVALID,
      'component_id missing', { contribution_id: c.contribution_id },
    ));
  }
  if (!Number.isFinite(c.component_raw_value) ||
      !Number.isFinite(c.component_normalized_value) ||
      !Number.isFinite(c.component_weight) ||
      !Number.isFinite(c.weighted_contribution)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_INVALID,
      'numeric fields must be finite', { contribution_id: c.contribution_id },
    ));
  }
  if (c.component_normalized_value < 0 || c.component_normalized_value > 100) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_OUT_OF_BOUNDS,
      `normalized value ${c.component_normalized_value} outside [0,100]`,
      { contribution_id: c.contribution_id },
    ));
  }
  if (!Number.isInteger(c.contribution_rank) || c.contribution_rank <= 0) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_INVALID,
      'contribution_rank must be positive integer',
      { contribution_id: c.contribution_id },
    ));
  }
  if (!c.contribution_direction) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_INVALID,
      'contribution_direction missing',
      { contribution_id: c.contribution_id },
    ));
  }

  // §11.4.5.2 — material components must carry evidence_refs
  if (isMaterialOrAbove(c.materiality_class) && c.evidence_refs.length === 0) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MATERIAL_COMPONENT_LACKS_EVIDENCE,
      `material component ${c.component_id} lacks evidence_refs`,
      { contribution_id: c.contribution_id },
    ));
  }

  // §11.4.5.2 — direction may not contradict family direction. For
  // risk families a "RAISES_SCORE" direction is illegal because the
  // raise raises risk; same applies in reverse.
  if (isRiskFamily(c.score_family)) {
    if (c.contribution_direction === L11ContributionDirection.RAISES_SCORE ||
        c.contribution_direction === L11ContributionDirection.LOWERS_SCORE) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_COMPONENT_DIRECTION_MISMATCH,
        `risk family ${c.score_family} requires risk-family direction`,
        { contribution_id: c.contribution_id },
      ));
    }
  } else {
    if (c.contribution_direction === L11ContributionDirection.INCREASES_RISK_SCORE ||
        c.contribution_direction === L11ContributionDirection.REDUCES_RISK_SCORE) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_COMPONENT_DIRECTION_MISMATCH,
        `non-risk family ${c.score_family} cannot use risk-family direction`,
        { contribution_id: c.contribution_id },
      ));
    }
  }

  return { ok: issues.length === 0, issues };
}

export function validateL11ComponentContributions(
  cs: readonly L11ComponentContribution[],
): L11ComponentContributionValidationResult {
  const all: L11ScoreAttributionIssue[] = [];
  for (const c of cs) all.push(...validateL11ComponentContribution(c).issues);
  return { ok: all.length === 0, issues: all };
}
