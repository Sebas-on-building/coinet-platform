/**
 * L11.4 — Score Attribution Engine (§11.4.14)
 *
 * Deterministic engine that converts an `L11ScoreOutput` +
 * `L11FormulaEvaluationResult` + governed inputs into a complete
 * `L11ScoreAttribution` object with replay hash and completeness
 * class.
 */

import {
  L11ScoreOutput,
  L11FormulaEvaluationResult,
  L11ScoreFormulaDefinition,
  L11ScoreAttribution,
  L11AttributionMaterialityThresholds,
  L11AttributionMaterialityClass,
  L11AttributionDriver,
  L11AttributionDriverClass,
  L11ContributionDirection,
  L11AttributionReasonCode,
  L11AttributionCompletenessClass,
  isL11AttributionEmissible,
  L11_ATTRIBUTION_POLICY_VERSION,
  L11TopDriverSelectionPolicy,
  L11_DEFAULT_TOP_DRIVER_POLICY,
  isL11TopDriverPolicyStructurallyValid,
  L11ComponentContribution,
  L11CapContribution,
  L11PenaltyContribution,
  L11ModifierContribution,
  L11MissingDataContribution,
  classifyL11Materiality,
  L11_DEFAULT_MATERIALITY_THRESHOLDS,
  isPositiveDirection,
  isNegativeDirection,
  extractL11AttributionReplayMaterial,
  canonicalScoreAttributionReplayHash,
  L11ScoreFamily,
} from '../contracts';

import { buildL11ComponentContributions } from './component-contribution-builder';
import { buildL11CapContributions } from './cap-contribution-builder';
import { buildL11PenaltyContributions } from './penalty-contribution-builder';
import { buildL11ModifierContributions } from './modifier-contribution-builder';
import { buildL11MissingDataContributions } from './missing-data-contribution-builder';
import { selectL11TopDrivers } from './top-driver-selector';
import { deriveL11SummaryCodes } from './summary-code-deriver';

export interface BuildL11AttributionArgs {
  readonly score: L11ScoreOutput;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly formula: L11ScoreFormulaDefinition;
  readonly thresholds?: L11AttributionMaterialityThresholds;
  readonly top_driver_policy?: L11TopDriverSelectionPolicy;
  readonly evidence_refs_by_component?: Readonly<Record<string, readonly string[]>>;
  readonly lineage_refs?: readonly string[];
  readonly evidence_refs?: readonly string[];
  /** Optional pre-cap score; default is evaluation.raw_score. */
  readonly pre_cap_score?: number;
}

export interface L11AttributionEngineError {
  readonly reason: string;
  readonly code: string;
}

export interface L11AttributionEngineResult {
  readonly ok: boolean;
  readonly attribution: L11ScoreAttribution | null;
  readonly errors: readonly L11AttributionEngineError[];
}

export function runL11ScoreAttributionEngine(
  args: BuildL11AttributionArgs,
): L11AttributionEngineResult {
  const errors: L11AttributionEngineError[] = [];
  const policy = args.top_driver_policy ?? L11_DEFAULT_TOP_DRIVER_POLICY;
  const policyCheck = isL11TopDriverPolicyStructurallyValid(policy);
  if (!policyCheck.ok) {
    errors.push({ reason: policyCheck.reason, code: 'TOP_DRIVER_POLICY_INVALID' });
  }

  // §11.4.14.3 — score / evaluation must align
  if (args.score.score_family !== args.evaluation.score_family) {
    errors.push({ reason: 'score family mismatch', code: 'FAMILY_MISMATCH' });
  }
  if (args.evaluation.formula_id !== args.formula.formula_id) {
    errors.push({ reason: 'formula evaluation references different formula', code: 'FORMULA_MISMATCH' });
  }
  if (args.evaluation.formula_version !== args.formula.formula_version) {
    errors.push({ reason: 'formula version mismatch', code: 'FORMULA_VERSION_MISMATCH' });
  }

  if (errors.length > 0) {
    return { ok: false, attribution: null, errors };
  }

  const thresholds = args.thresholds ?? L11_DEFAULT_MATERIALITY_THRESHOLDS;

  // ── Build contributions
  const component_contributions = buildL11ComponentContributions({
    score_id: args.score.score_id,
    evaluation: args.evaluation,
    component_definitions: args.formula.component_definitions,
    evidence_refs_by_component: args.evidence_refs_by_component,
    lineage_refs: args.lineage_refs,
    thresholds,
  });
  const cap_contributions = buildL11CapContributions({
    score_id: args.score.score_id,
    evaluation: args.evaluation,
    formula: args.formula,
    thresholds,
    lineage_refs: args.lineage_refs,
    pre_cap_score: args.pre_cap_score,
  });
  const penalty_contributions = buildL11PenaltyContributions({
    score_id: args.score.score_id,
    evaluation: args.evaluation,
    formula: args.formula,
    thresholds,
    lineage_refs: args.lineage_refs,
  });
  const modifier_contributions = buildL11ModifierContributions({
    score_id: args.score.score_id,
    evaluation: args.evaluation,
    formula: args.formula,
    thresholds,
    lineage_refs: args.lineage_refs,
  });
  const missing_data_contributions = buildL11MissingDataContributions({
    score_id: args.score.score_id,
    evaluation: args.evaluation,
    formula: args.formula,
    thresholds,
    lineage_refs: args.lineage_refs,
  });

  // ── Build driver candidates
  const drivers: L11AttributionDriver[] = [];
  for (const c of component_contributions) drivers.push(driverFromComponent(c));
  for (const c of cap_contributions) drivers.push(driverFromCap(c));
  for (const c of penalty_contributions) drivers.push(driverFromPenalty(c));
  for (const c of modifier_contributions) drivers.push(driverFromModifier(c));
  for (const c of missing_data_contributions) drivers.push(driverFromMissingData(c));

  // ── Top drivers
  const topResult = selectL11TopDrivers(drivers, policy);

  const positive_driver_refs = drivers
    .filter(d => isPositiveDirection(d.contribution_direction))
    .map(d => d.driver_id);
  const negative_driver_refs = drivers
    .filter(d => isNegativeDirection(d.contribution_direction))
    .map(d => d.driver_id);

  // ── Summary codes
  const explanatory_summary_codes = deriveL11SummaryCodes({
    score_family: args.score.score_family,
    final_score: args.score.final_score,
    score_band: args.score.score_band,
    component_contributions,
    cap_contributions,
    modifier_contributions,
    missing_data_contributions,
  });

  // ── Completeness class
  const completeness_class = classifyL11AttributionCompleteness({
    formula: args.formula,
    evaluation: args.evaluation,
    component_contributions,
    cap_contributions,
    penalty_contributions,
    modifier_contributions,
    missing_data_contributions,
  });

  if (!isL11AttributionEmissible(completeness_class)) {
    errors.push({ reason: `attribution completeness ${completeness_class} blocks emission`, code: 'BLOCKED_COMPLETENESS' });
    return { ok: false, attribution: null, errors };
  }

  const attribution_id = `l11a.attr.${args.score.score_id}`;
  const formula_evaluation_ref = `l11f.eval.${args.evaluation.formula_id}.${args.score.compute_run_id}`;

  const draftAttribution: Omit<L11ScoreAttribution, 'replay_hash'> = {
    attribution_id,
    score_id: args.score.score_id,
    score_family: args.score.score_family,
    formula_id: args.formula.formula_id,
    formula_version: args.formula.formula_version,
    scope_type: args.score.scope_type,
    scope_id: args.score.scope_id,
    as_of: args.score.as_of,
    final_score: args.score.final_score,
    score_band: args.score.score_band,
    positive_driver_refs,
    negative_driver_refs,
    component_contributions,
    cap_contributions,
    penalty_contributions,
    modifier_contributions,
    missing_data_contributions,
    top_positive_driver_refs: topResult.top_positive_drivers.map(d => d.driver_id),
    top_negative_driver_refs: topResult.top_negative_drivers.map(d => d.driver_id),
    explanatory_summary_codes,
    attribution_completeness_class: completeness_class,
    evidence_refs: args.evidence_refs ?? [args.score.evidence_pack_ref],
    lineage_refs: args.lineage_refs ?? [`l11a.lineage.${args.score.score_id}`],
    input_snapshot_ref: args.score.input_snapshot_ref,
    formula_evaluation_ref,
    policy_version: L11_ATTRIBUTION_POLICY_VERSION,
  };
  const replay_hash = canonicalScoreAttributionReplayHash(
    extractL11AttributionReplayMaterial(draftAttribution),
  );
  const attribution: L11ScoreAttribution = { ...draftAttribution, replay_hash };

  return { ok: true, attribution, errors: [] };
}

// ─────────────────────────────────────────────────────────────────────
// Driver assemblers (engine-internal but exported for unit tests)
// ─────────────────────────────────────────────────────────────────────

function reasonForComponent(c: L11ComponentContribution): readonly L11AttributionReasonCode[] {
  if (c.contribution_direction === L11ContributionDirection.LOWERS_SCORE ||
      c.contribution_direction === L11ContributionDirection.NARROWS_CONFIDENCE) {
    return [L11AttributionReasonCode.COMPONENT_WEAK];
  }
  if (c.contribution_direction === L11ContributionDirection.RAISES_SCORE ||
      c.contribution_direction === L11ContributionDirection.INCREASES_RISK_SCORE ||
      c.contribution_direction === L11ContributionDirection.REDUCES_RISK_SCORE) {
    return [L11AttributionReasonCode.COMPONENT_STRONG];
  }
  return [L11AttributionReasonCode.COMPONENT_NEUTRAL];
}

export function driverFromComponent(c: L11ComponentContribution): L11AttributionDriver {
  const normalized_impact = Math.min(1, Math.abs(c.weighted_contribution) / 100);
  return {
    driver_id: `l11a.driver.cc.${c.contribution_id}`,
    score_id: c.score_id,
    score_family: c.score_family as L11ScoreFamily,
    driver_class: c.driver_class,
    driver_name: c.component_name,
    contribution_direction: c.contribution_direction,
    contribution_magnitude: c.weighted_contribution,
    normalized_impact,
    materiality_class: c.materiality_class,
    source_component_ref: c.component_id,
    lower_layer_refs: c.lineage_refs,
    attribution_reason_codes: reasonForComponent(c),
    policy_version: L11_ATTRIBUTION_POLICY_VERSION,
  };
}

export function driverFromCap(c: L11CapContribution): L11AttributionDriver {
  const normalized_impact = Math.min(1, Math.abs(c.cap_effect_magnitude) / 100);
  return {
    driver_id: `l11a.driver.cap.${c.cap_contribution_id}`,
    score_id: c.score_id,
    score_family: c.score_family as L11ScoreFamily,
    driver_class: L11AttributionDriverClass.CAP_DRIVER,
    driver_name: c.cap_reason_code,
    contribution_direction: L11ContributionDirection.CAPS_SCORE,
    contribution_magnitude: c.cap_effect_magnitude,
    normalized_impact,
    materiality_class: c.materiality_class,
    source_cap_ref: c.cap_rule_id,
    lower_layer_refs: c.lineage_refs,
    attribution_reason_codes: [L11AttributionReasonCode.CAP_TRIGGERED],
    policy_version: L11_ATTRIBUTION_POLICY_VERSION,
  };
}

export function driverFromPenalty(c: L11PenaltyContribution): L11AttributionDriver {
  const normalized_impact = Math.min(1, Math.abs(c.score_effect) / 100);
  return {
    driver_id: `l11a.driver.pen.${c.penalty_contribution_id}`,
    score_id: c.score_id,
    score_family: c.score_family as L11ScoreFamily,
    driver_class: L11AttributionDriverClass.PENALTY_DRIVER,
    driver_name: c.penalty_reason_code,
    contribution_direction: c.contribution_direction,
    contribution_magnitude: c.score_effect,
    normalized_impact,
    materiality_class: c.materiality_class,
    source_penalty_ref: c.penalty_rule_id,
    lower_layer_refs: c.lineage_refs,
    attribution_reason_codes: [L11AttributionReasonCode.PENALTY_TRIGGERED],
    policy_version: L11_ATTRIBUTION_POLICY_VERSION,
  };
}

function reasonForModifier(c: L11ModifierContribution): readonly L11AttributionReasonCode[] {
  switch (c.driver_class) {
    case L11AttributionDriverClass.REGIME_MODIFIER_DRIVER:
      return c.contribution_direction === L11ContributionDirection.RAISES_SCORE
        ? [L11AttributionReasonCode.REGIME_AMPLIFIES]
        : [L11AttributionReasonCode.REGIME_DAMPENS];
    case L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER:
      return c.contribution_direction === L11ContributionDirection.RAISES_SCORE
        ? [L11AttributionReasonCode.SEQUENCE_AMPLIFIES]
        : [L11AttributionReasonCode.SEQUENCE_DAMPENS];
    case L11AttributionDriverClass.HYPOTHESIS_DRIVER:
      return c.contribution_direction === L11ContributionDirection.RAISES_SCORE
        ? [L11AttributionReasonCode.HYPOTHESIS_AMPLIFIES]
        : [L11AttributionReasonCode.HYPOTHESIS_DAMPENS];
    case L11AttributionDriverClass.VALIDATION_DRIVER:
      return c.contribution_direction === L11ContributionDirection.RAISES_SCORE
        ? [L11AttributionReasonCode.VALIDATION_SUPPORTS]
        : [L11AttributionReasonCode.VALIDATION_CONFLICTS];
    default:
      return [L11AttributionReasonCode.COMPONENT_NEUTRAL];
  }
}

export function driverFromModifier(c: L11ModifierContribution): L11AttributionDriver {
  const normalized_impact = Math.min(1, Math.abs(c.score_effect) / 100);
  return {
    driver_id: `l11a.driver.mod.${c.modifier_contribution_id}`,
    score_id: c.score_id,
    score_family: c.score_family as L11ScoreFamily,
    driver_class: c.driver_class,
    driver_name: c.modifier_rule_id,
    contribution_direction: c.contribution_direction,
    contribution_magnitude: c.score_effect,
    normalized_impact,
    materiality_class: c.materiality_class,
    source_modifier_ref: c.modifier_rule_id,
    lower_layer_refs: c.lineage_refs,
    attribution_reason_codes: reasonForModifier(c),
    policy_version: L11_ATTRIBUTION_POLICY_VERSION,
  };
}

function reasonForMissing(c: L11MissingDataContribution): readonly L11AttributionReasonCode[] {
  if (c.missing_data_behavior === 'BLOCK_SCORE' as any || c.missing_input_class === 'REQUIRED_MISSING' as any) {
    return [L11AttributionReasonCode.MISSING_REQUIRED_INPUT];
  }
  if (c.missing_input_class === 'STALE' as any) return [L11AttributionReasonCode.STALE_INPUT];
  if (c.missing_input_class === 'DEGRADED' as any) return [L11AttributionReasonCode.DEGRADED_INPUT];
  if (c.missing_input_class === 'EVIDENCE_ONLY' as any) return [L11AttributionReasonCode.EVIDENCE_ONLY_DISCLOSURE];
  return [L11AttributionReasonCode.CONFIDENCE_LOW];
}

export function driverFromMissingData(c: L11MissingDataContribution): L11AttributionDriver {
  const normalized_impact = Math.min(1, Math.abs(c.score_effect + c.confidence_effect) / 100);
  return {
    driver_id: `l11a.driver.mdc.${c.missing_data_contribution_id}`,
    score_id: c.score_id,
    score_family: c.score_family as L11ScoreFamily,
    driver_class: L11AttributionDriverClass.MISSING_DATA_DRIVER,
    driver_name: c.missing_input_ref,
    contribution_direction: c.score_effect > 0
      ? L11ContributionDirection.LOWERS_SCORE
      : L11ContributionDirection.NARROWS_CONFIDENCE,
    contribution_magnitude: c.score_effect + c.confidence_effect,
    normalized_impact,
    materiality_class: c.materiality_class,
    source_missing_data_ref: c.missing_data_contribution_id,
    lower_layer_refs: c.lineage_refs,
    attribution_reason_codes: reasonForMissing(c),
    policy_version: L11_ATTRIBUTION_POLICY_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Completeness classifier (§11.4.13)
// ─────────────────────────────────────────────────────────────────────

interface ClassifyArgs {
  readonly formula: L11ScoreFormulaDefinition;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly component_contributions: readonly L11ComponentContribution[];
  readonly cap_contributions: readonly L11CapContribution[];
  readonly penalty_contributions: readonly L11PenaltyContribution[];
  readonly modifier_contributions: readonly L11ModifierContribution[];
  readonly missing_data_contributions: readonly L11MissingDataContribution[];
}

export function classifyL11AttributionCompleteness(
  args: ClassifyArgs,
): L11AttributionCompletenessClass {
  // Material component coverage
  const requiredComponents = args.formula.component_definitions
    .filter(c => c.required_for_formula).map(c => c.component_id);
  const seenComponents = new Set(args.component_contributions.map(c => c.component_id));
  for (const id of requiredComponents) {
    if (!seenComponents.has(id)) return L11AttributionCompletenessClass.PARTIAL_ATTRIBUTION;
  }

  // Caps / penalties / modifiers / missing-data coverage
  if (args.cap_contributions.length !== args.evaluation.applied_caps.length) {
    return L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE;
  }
  if (args.penalty_contributions.length !== args.evaluation.applied_penalties.length) {
    return L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE;
  }
  if (args.modifier_contributions.length !== args.evaluation.applied_modifiers.length) {
    return L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE;
  }
  if (args.missing_data_contributions.length !== args.evaluation.missing_data_effects.length) {
    return L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE;
  }

  const hasDisclosure =
    args.missing_data_contributions.some(c => c.disclosure_required) ||
    args.evaluation.missing_data_effects.length > 0;

  return hasDisclosure
    ? L11AttributionCompletenessClass.COMPLETE_WITH_DISCLOSURE
    : L11AttributionCompletenessClass.COMPLETE_ATTRIBUTION;
}

/**
 * Quick helper for callers that already classified materiality
 * elsewhere and just need the same severity ladder.
 */
export function isContributionMaterial(
  c: { materiality_class: L11AttributionMaterialityClass },
): boolean {
  return (
    c.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
    c.materiality_class === L11AttributionMaterialityClass.MAJOR ||
    c.materiality_class === L11AttributionMaterialityClass.MATERIAL
  );
}

/**
 * Convenience: classify materiality for a raw normalized impact and
 * compare to an arbitrary class. Used by tests and external callers.
 */
export function isAtLeastMaterial(
  normalized_impact: number,
  thresholds: L11AttributionMaterialityThresholds = L11_DEFAULT_MATERIALITY_THRESHOLDS,
): boolean {
  return isContributionMaterial({
    materiality_class: classifyL11Materiality(normalized_impact, thresholds),
  });
}
