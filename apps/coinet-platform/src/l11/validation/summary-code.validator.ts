/**
 * L11.4 — Summary Code Validator (§11.4.12.3)
 *
 * Verifies every emitted summary code is supported by an actual
 * contribution.
 */

import {
  L11ScoreAttribution,
  L11AttributionSummaryCode,
  ALL_L11_ATTRIBUTION_SUMMARY_CODES,
  L11AttributionMaterialityClass,
  L11AttributionDriverClass,
  isPositiveDirection,
  isNegativeDirection,
  L11ScoreFamily,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11ScoreBand,
  L11InputConditionClass,
  L11MissingDataBehaviorClass,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';

export interface L11SummaryCodeValidationResult {
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

function isMaterial(c: L11AttributionMaterialityClass): boolean {
  return (
    c === L11AttributionMaterialityClass.CRITICAL ||
    c === L11AttributionMaterialityClass.MAJOR ||
    c === L11AttributionMaterialityClass.MATERIAL
  );
}

export function validateL11SummaryCode(
  a: L11ScoreAttribution,
): L11SummaryCodeValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];

  // Code legality: must be a known enum value
  for (const c of a.explanatory_summary_codes) {
    if (!ALL_L11_ATTRIBUTION_SUMMARY_CODES.includes(c)) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_SUMMARY_CODE_INVALID,
        `summary code ${c} is not a registered code`,
        { attribution_id: a.attribution_id }));
    }
  }

  const codes = new Set(a.explanatory_summary_codes);

  const materialCaps = a.cap_contributions.filter(c => isMaterial(c.materiality_class));
  const materialMissing = a.missing_data_contributions.filter(c => isMaterial(c.materiality_class));
  const materialModifiers = a.modifier_contributions.filter(c => isMaterial(c.materiality_class));
  const materialPrimaryPositive = a.component_contributions.filter(c =>
    isMaterial(c.materiality_class) && isPositiveDirection(c.contribution_direction));
  const materialPrimaryNegative = a.component_contributions.filter(c =>
    isMaterial(c.materiality_class) && isNegativeDirection(c.contribution_direction));

  const high = a.score_band === L11ScoreBand.HIGH || a.score_band === L11ScoreBand.VERY_HIGH;
  const low = a.score_band === L11ScoreBand.LOW || a.score_band === L11ScoreBand.VERY_LOW;

  if (codes.has(L11AttributionSummaryCode.SCORE_HIGH_DUE_TO_PRIMARY_COMPONENTS)) {
    if (!high || materialPrimaryPositive.length === 0) {
      issues.push(unsupported(L11AttributionSummaryCode.SCORE_HIGH_DUE_TO_PRIMARY_COMPONENTS, a));
    }
  }
  if (codes.has(L11AttributionSummaryCode.SCORE_LOW_DUE_TO_PRIMARY_WEAKNESS)) {
    if (!low || materialPrimaryNegative.length === 0) {
      issues.push(unsupported(L11AttributionSummaryCode.SCORE_LOW_DUE_TO_PRIMARY_WEAKNESS, a));
    }
  }
  if (codes.has(L11AttributionSummaryCode.SCORE_CAPPED_BY_CONTRADICTION) ||
      codes.has(L11AttributionSummaryCode.SCORE_CAPPED_BY_MISSING_DATA)) {
    if (materialCaps.length === 0) {
      if (codes.has(L11AttributionSummaryCode.SCORE_CAPPED_BY_CONTRADICTION)) {
        issues.push(unsupported(L11AttributionSummaryCode.SCORE_CAPPED_BY_CONTRADICTION, a));
      }
      if (codes.has(L11AttributionSummaryCode.SCORE_CAPPED_BY_MISSING_DATA)) {
        issues.push(unsupported(L11AttributionSummaryCode.SCORE_CAPPED_BY_MISSING_DATA, a));
      }
    }
  }
  if (codes.has(L11AttributionSummaryCode.SCORE_REDUCED_BY_REGIME) ||
      codes.has(L11AttributionSummaryCode.SCORE_RAISED_BY_REGIME)) {
    if (!materialModifiers.some(m => m.driver_class === L11AttributionDriverClass.REGIME_MODIFIER_DRIVER)) {
      if (codes.has(L11AttributionSummaryCode.SCORE_REDUCED_BY_REGIME)) {
        issues.push(unsupported(L11AttributionSummaryCode.SCORE_REDUCED_BY_REGIME, a));
      }
      if (codes.has(L11AttributionSummaryCode.SCORE_RAISED_BY_REGIME)) {
        issues.push(unsupported(L11AttributionSummaryCode.SCORE_RAISED_BY_REGIME, a));
      }
    }
  }
  if (codes.has(L11AttributionSummaryCode.SCORE_REDUCED_BY_SEQUENCE) ||
      codes.has(L11AttributionSummaryCode.SCORE_RAISED_BY_SEQUENCE)) {
    if (!materialModifiers.some(m => m.driver_class === L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER)) {
      if (codes.has(L11AttributionSummaryCode.SCORE_REDUCED_BY_SEQUENCE)) {
        issues.push(unsupported(L11AttributionSummaryCode.SCORE_REDUCED_BY_SEQUENCE, a));
      }
      if (codes.has(L11AttributionSummaryCode.SCORE_RAISED_BY_SEQUENCE)) {
        issues.push(unsupported(L11AttributionSummaryCode.SCORE_RAISED_BY_SEQUENCE, a));
      }
    }
  }
  if (codes.has(L11AttributionSummaryCode.SCORE_REDUCED_BY_HYPOTHESIS_RELIANCE) ||
      codes.has(L11AttributionSummaryCode.SCORE_RAISED_BY_HYPOTHESIS_RELIANCE)) {
    if (!materialModifiers.some(m => m.driver_class === L11AttributionDriverClass.HYPOTHESIS_DRIVER)) {
      if (codes.has(L11AttributionSummaryCode.SCORE_REDUCED_BY_HYPOTHESIS_RELIANCE)) {
        issues.push(unsupported(L11AttributionSummaryCode.SCORE_REDUCED_BY_HYPOTHESIS_RELIANCE, a));
      }
      if (codes.has(L11AttributionSummaryCode.SCORE_RAISED_BY_HYPOTHESIS_RELIANCE)) {
        issues.push(unsupported(L11AttributionSummaryCode.SCORE_RAISED_BY_HYPOTHESIS_RELIANCE, a));
      }
    }
  }
  if (codes.has(L11AttributionSummaryCode.SCORE_LIMITED_BY_MISSING_REQUIRED_INPUTS)) {
    const supports = materialMissing.some(m =>
      m.missing_input_class === L11InputConditionClass.REQUIRED_MISSING ||
      m.missing_data_behavior === L11MissingDataBehaviorClass.BLOCK_SCORE);
    if (!supports) {
      issues.push(unsupported(L11AttributionSummaryCode.SCORE_LIMITED_BY_MISSING_REQUIRED_INPUTS, a));
    }
  }
  if (codes.has(L11AttributionSummaryCode.SCORE_LIMITED_BY_DEGRADED_VISIBILITY)) {
    const supports = materialMissing.some(m =>
      m.missing_input_class === L11InputConditionClass.STALE ||
      m.missing_input_class === L11InputConditionClass.DEGRADED ||
      m.missing_data_behavior === L11MissingDataBehaviorClass.LOWER_CONFIDENCE);
    if (!supports) {
      issues.push(unsupported(L11AttributionSummaryCode.SCORE_LIMITED_BY_DEGRADED_VISIBILITY, a));
    }
  }

  // Helper used to keep family imports referenced
  void isRiskFamily(a.score_family);

  return { ok: issues.length === 0, issues };
}

function unsupported(code: L11AttributionSummaryCode, a: L11ScoreAttribution): L11ScoreAttributionIssue {
  return makeL11ScoreAttributionIssue(
    L11ScoreAttributionViolationCode.L11A_SUMMARY_CODE_UNSUPPORTED,
    `summary code ${code} not supported by contributions`,
    { attribution_id: a.attribution_id });
}
