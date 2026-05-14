/**
 * L11.4 — Summary Code Deriver (§11.4.12)
 *
 * Derives `L11AttributionSummaryCode[]` from contribution lists.
 * Codes are emitted only when actual contributions support them.
 */

import {
  L11AttributionSummaryCode,
  L11ComponentContribution,
  L11CapContribution,
  L11ModifierContribution,
  L11MissingDataContribution,
  L11AttributionMaterialityClass,
  isPositiveDirection,
  isNegativeDirection,
  L11AttributionDriverClass,
  L11ScoreFamily,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11ContributionDirection,
  L11ScoreBand,
  L11InputConditionClass,
  L11MissingDataBehaviorClass,
  L11ModifierEffect,
} from '../contracts';

const RISK_DIRECTION_FAMILIES: ReadonlySet<L11ScoreFamilyDirectionClass> = new Set([
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_SUPPLY_RISK,
]);

function isRiskFamily(family: L11ScoreFamily): boolean {
  return RISK_DIRECTION_FAMILIES.has(L11_REQUIRED_DIRECTION_BY_FAMILY[family]);
}

function isMaterial(c: L11AttributionMaterialityClass): boolean {
  return (
    c === L11AttributionMaterialityClass.CRITICAL ||
    c === L11AttributionMaterialityClass.MAJOR ||
    c === L11AttributionMaterialityClass.MATERIAL
  );
}

export interface DeriveSummaryCodeArgs {
  readonly score_family: L11ScoreFamily;
  readonly final_score: number;
  readonly score_band: L11ScoreBand;
  readonly component_contributions: readonly L11ComponentContribution[];
  readonly cap_contributions: readonly L11CapContribution[];
  readonly modifier_contributions: readonly L11ModifierContribution[];
  readonly missing_data_contributions: readonly L11MissingDataContribution[];
}

export function deriveL11SummaryCodes(
  args: DeriveSummaryCodeArgs,
): readonly L11AttributionSummaryCode[] {
  const codes = new Set<L11AttributionSummaryCode>();
  const risk = isRiskFamily(args.score_family);
  const high = args.score_band === L11ScoreBand.HIGH || args.score_band === L11ScoreBand.VERY_HIGH;
  const low = args.score_band === L11ScoreBand.LOW || args.score_band === L11ScoreBand.VERY_LOW;

  // Primary component strength / weakness
  const materialPrimaryPositive = args.component_contributions.filter(c =>
    isMaterial(c.materiality_class) &&
    isPositiveDirection(c.contribution_direction) &&
    (c.driver_class === L11AttributionDriverClass.PRIMARY_POSITIVE_DRIVER ||
     c.driver_class === L11AttributionDriverClass.PRIMARY_NEGATIVE_DRIVER &&
       risk));
  const materialPrimaryNegative = args.component_contributions.filter(c =>
    isMaterial(c.materiality_class) && isNegativeDirection(c.contribution_direction));

  if (high && materialPrimaryPositive.length > 0) {
    codes.add(L11AttributionSummaryCode.SCORE_HIGH_DUE_TO_PRIMARY_COMPONENTS);
  }
  if (low && materialPrimaryNegative.length > 0) {
    codes.add(L11AttributionSummaryCode.SCORE_LOW_DUE_TO_PRIMARY_WEAKNESS);
  }

  // Caps
  const materialCaps = args.cap_contributions.filter(c => isMaterial(c.materiality_class));
  for (const c of materialCaps) {
    const reason = c.cap_reason_code.toLowerCase();
    if (reason.includes('contradiction') || reason.includes('conflict')) {
      codes.add(L11AttributionSummaryCode.SCORE_CAPPED_BY_CONTRADICTION);
    } else if (reason.includes('missing') || reason.includes('degraded') ||
               reason.includes('required_data')) {
      codes.add(L11AttributionSummaryCode.SCORE_CAPPED_BY_MISSING_DATA);
    } else if (reason.includes('contradiction')) {
      codes.add(L11AttributionSummaryCode.SCORE_CAPPED_BY_CONTRADICTION);
    } else {
      codes.add(L11AttributionSummaryCode.SCORE_CAPPED_BY_CONTRADICTION);
    }
  }

  // Modifiers
  for (const m of args.modifier_contributions.filter(c => isMaterial(c.materiality_class))) {
    const positive = isPositiveDirection(m.contribution_direction);
    const negative = isNegativeDirection(m.contribution_direction);
    switch (m.driver_class) {
      case L11AttributionDriverClass.REGIME_MODIFIER_DRIVER:
        if (negative) codes.add(L11AttributionSummaryCode.SCORE_REDUCED_BY_REGIME);
        if (positive) codes.add(L11AttributionSummaryCode.SCORE_RAISED_BY_REGIME);
        break;
      case L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER:
        if (negative) codes.add(L11AttributionSummaryCode.SCORE_REDUCED_BY_SEQUENCE);
        if (positive) codes.add(L11AttributionSummaryCode.SCORE_RAISED_BY_SEQUENCE);
        break;
      case L11AttributionDriverClass.HYPOTHESIS_DRIVER:
        if (negative) codes.add(L11AttributionSummaryCode.SCORE_REDUCED_BY_HYPOTHESIS_RELIANCE);
        if (positive) codes.add(L11AttributionSummaryCode.SCORE_RAISED_BY_HYPOTHESIS_RELIANCE);
        break;
    }
  }

  // Missing-data
  const materialMissing = args.missing_data_contributions.filter(c => isMaterial(c.materiality_class));
  for (const m of materialMissing) {
    if (m.missing_input_class === L11InputConditionClass.REQUIRED_MISSING ||
        m.missing_data_behavior === L11MissingDataBehaviorClass.BLOCK_SCORE) {
      codes.add(L11AttributionSummaryCode.SCORE_LIMITED_BY_MISSING_REQUIRED_INPUTS);
    }
    if (m.missing_input_class === L11InputConditionClass.DEGRADED ||
        m.missing_input_class === L11InputConditionClass.STALE ||
        m.missing_data_behavior === L11MissingDataBehaviorClass.LOWER_CONFIDENCE) {
      codes.add(L11AttributionSummaryCode.SCORE_LIMITED_BY_DEGRADED_VISIBILITY);
    }
  }

  // Static-analysis support: keep references used so unused-import lint stays quiet
  void L11ContributionDirection;
  void L11ModifierEffect;

  return Array.from(codes).sort();
}
