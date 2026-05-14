/**
 * L11.3 — Production Formula Catalogue (§11.3.9 → §11.3.17)
 *
 * Eight v1 production formulas, one per production score family.
 * Each formula declares components, weights, caps, penalties,
 * modifiers, missing-data rules, calibration target, and band policy
 * ref. Reserved families have no production formulas.
 */

import { L11ScoreFamily } from './score-family';
import {
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from './score-direction';
import {
  L11FormulaInputSurface,
} from './formula-input-surface';
import {
  L11ScoreComponentDefinition,
  L11ScoreComponentRole,
  L11ComponentDirectionClass,
  L11MissingDataBehaviorClass,
} from './score-component';
import {
  L11FormulaWeightProfile,
  L11WeightSumPolicy,
  computeL11WeightSums,
} from './formula-weight-profile';
import {
  L11FormulaCapRule,
  L11CapType,
  L11CapDirection,
} from './formula-cap-rule';
import {
  L11FormulaPenaltyRule,
  L11PenaltyApplicationMode,
} from './formula-penalty-rule';
import {
  L11FormulaModifierRule,
  L11ModifierSourceLayer,
  L11ModifierEffect,
} from './formula-modifier-rule';
import {
  L11FormulaMissingDataRule,
  L11InputConditionClass,
} from './formula-missing-data-rule';
import {
  L11ScoreFormulaDefinition,
  L11_FULL_FORMULA_REPLAY_MATERIAL,
} from './score-formula';
import { L11FormulaStatus } from './formula-status';
import { L11DependencySurfaceClass } from './l11-constitutional-types';
import { L11ScoreBand } from './score-band-policy';

export const L11_FORMULA_POLICY_VERSION = 'l11.3.formula.v1';
const DEFAULT_SCOPE_TYPES: readonly string[] = ['ASSET', 'NARRATIVE', 'ECOSYSTEM'];

function fid(family: L11ScoreFamily): string {
  return `l11f.formula.${family.toLowerCase()}.v1`;
}
function meaningRefFor(family: L11ScoreFamily): string {
  return `l11d.meaning_claim.${family.toLowerCase()}.v1`;
}
function bandRefFor(family: L11ScoreFamily): string {
  return `l11d.band_policy.${family.toLowerCase()}.v1`;
}
function calibrationRefFor(family: L11ScoreFamily): string {
  return `l11f.calibration.${family.toLowerCase()}.v1`;
}

function inSurface(
  surface_class: L11DependencySurfaceClass,
  label?: string,
  evidence_only?: boolean,
): L11FormulaInputSurface {
  return { surface_class, label, evidence_only };
}

interface ComponentDraft {
  readonly id: string;
  readonly name: string;
  readonly role: L11ScoreComponentRole;
  readonly direction: L11ComponentDirectionClass;
  readonly required: boolean;
  readonly inputs: readonly L11DependencySurfaceClass[];
  readonly weight: number;
  readonly missing_behavior: L11MissingDataBehaviorClass;
}

function buildComponent(
  family: L11ScoreFamily,
  d: ComponentDraft,
): L11ScoreComponentDefinition {
  return {
    component_id: `l11f.${family.toLowerCase()}.${d.id}.v1`,
    score_family: family,
    component_name: d.name,
    component_role: d.role,
    component_direction: d.direction,
    required_input_surfaces: d.inputs.map(s => inSurface(s)),
    optional_input_surfaces: [],
    normalizer_id: `l11f.normalizer.${d.id}.v1`,
    normalizer_version: 'v1.0.0',
    min_value: 0,
    max_value: 100,
    weight: d.weight,
    missing_data_behavior: d.missing_behavior,
    required_for_formula: d.required,
    attribution_required: true,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
}

function buildWeightProfile(
  family: L11ScoreFamily,
  components: readonly L11ScoreComponentDefinition[],
  policy: L11WeightSumPolicy,
): L11FormulaWeightProfile {
  const weights: Record<string, number> = {};
  for (const c of components) weights[c.component_id] = c.weight;
  const sums = computeL11WeightSums(weights);
  return {
    weight_profile_id: `l11f.weights.${family.toLowerCase()}.v1`,
    score_family: family,
    formula_version: 'v1.0.0',
    component_weights: weights,
    positive_weight_sum: sums.positive,
    penalty_weight_sum: sums.penalty,
    total_absolute_weight_sum: sums.absolute,
    weight_sum_policy: policy,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
}

function buildPenalty(
  family: L11ScoreFamily,
  id: string,
  reason: string,
  affected: readonly string[],
  magnitude: number,
  mode: L11PenaltyApplicationMode = L11PenaltyApplicationMode.ADDITIVE,
  triggers_cap = false,
): L11FormulaPenaltyRule {
  return {
    penalty_rule_id: `l11f.penalty.${family.toLowerCase()}.${id}.v1`,
    score_family: family,
    reason_code: reason,
    affected_component_ids: affected,
    magnitude,
    application_mode: mode,
    triggers_cap,
    attribution_required: true,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
}

function buildCap(
  family: L11ScoreFamily,
  id: string,
  triggerCode: string,
  description: string,
  capType: L11CapType,
  capValue: number,
  capDirection: L11CapDirection,
  reasonCode: string,
  capBand?: L11ScoreBand,
): L11FormulaCapRule {
  return {
    cap_rule_id: `l11f.cap.${family.toLowerCase()}.${id}.v1`,
    score_family: family,
    trigger_condition: { trigger_code: triggerCode, description },
    cap_type: capType,
    cap_value: capValue,
    cap_band: capBand,
    cap_direction: capDirection,
    reason_code: reasonCode,
    attribution_required: true,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
}

function buildModifier(
  family: L11ScoreFamily,
  id: string,
  source: L11ModifierSourceLayer,
  effect: L11ModifierEffect,
  triggerCode: string,
  description: string,
  magnitude: number,
): L11FormulaModifierRule {
  return {
    modifier_rule_id: `l11f.modifier.${family.toLowerCase()}.${id}.v1`,
    score_family: family,
    source_layer: source,
    effect,
    trigger_code: triggerCode,
    description,
    magnitude,
    attribution_required: true,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
}

function buildMissingDataRule(
  family: L11ScoreFamily,
  id: string,
  condition: L11InputConditionClass,
  behavior: L11MissingDataBehaviorClass,
  reasonCode: string,
): L11FormulaMissingDataRule {
  return {
    missing_data_rule_id: `l11f.mdr.${family.toLowerCase()}.${id}.v1`,
    score_family: family,
    input_condition: condition,
    behavior,
    reason_code: reasonCode,
    attribution_required: true,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
}

function defaultMissingDataRules(family: L11ScoreFamily): readonly L11FormulaMissingDataRule[] {
  return [
    buildMissingDataRule(family, 'required_missing', L11InputConditionClass.REQUIRED_MISSING,
      L11MissingDataBehaviorClass.BLOCK_SCORE, 'required_input_missing'),
    buildMissingDataRule(family, 'optional_missing', L11InputConditionClass.OPTIONAL_MISSING,
      L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT, 'optional_input_missing'),
    buildMissingDataRule(family, 'stale', L11InputConditionClass.STALE,
      L11MissingDataBehaviorClass.PENALIZE_SCORE, 'stale_input'),
    buildMissingDataRule(family, 'degraded', L11InputConditionClass.DEGRADED,
      L11MissingDataBehaviorClass.LOWER_CONFIDENCE, 'degraded_input'),
    buildMissingDataRule(family, 'restricted', L11InputConditionClass.RESTRICTED,
      L11MissingDataBehaviorClass.REQUIRE_DISCLOSURE, 'restricted_input'),
    buildMissingDataRule(family, 'evidence_only', L11InputConditionClass.EVIDENCE_ONLY,
      L11MissingDataBehaviorClass.EVIDENCE_ONLY, 'evidence_only_input'),
    buildMissingDataRule(family, 'conflicting', L11InputConditionClass.CONFLICTING,
      L11MissingDataBehaviorClass.PENALIZE_SCORE, 'conflicting_input'),
  ];
}

function assembleFormula(
  family: L11ScoreFamily,
  componentDrafts: readonly ComponentDraft[],
  caps: readonly L11FormulaCapRule[],
  penalties: readonly L11FormulaPenaltyRule[],
  modifiers: readonly L11FormulaModifierRule[],
  evidenceOnlyInputs: readonly L11DependencySurfaceClass[] = [],
): L11ScoreFormulaDefinition {
  const components = componentDrafts.map(d => buildComponent(family, d));
  const weight_profile = buildWeightProfile(
    family,
    components,
    L11WeightSumPolicy.POSITIVE_COMPONENTS_SUM_TO_ONE,
  );
  // Required input surfaces — union of every component's required surfaces
  const reqSet = new Set<L11DependencySurfaceClass>();
  for (const d of componentDrafts) {
    for (const s of d.inputs) reqSet.add(s);
  }
  const required_input_surfaces: L11FormulaInputSurface[] =
    Array.from(reqSet).sort().map(s => inSurface(s));
  const evidence_only_input_surfaces: L11FormulaInputSurface[] =
    evidenceOnlyInputs.map(s => inSurface(s, undefined, true));

  return {
    formula_id: fid(family),
    score_family: family,
    formula_version: 'v1.0.0',
    meaning_claim_ref: meaningRefFor(family),
    score_direction: L11_REQUIRED_DIRECTION_BY_FAMILY[family],
    applicable_scope_types: DEFAULT_SCOPE_TYPES,
    required_input_surfaces,
    optional_input_surfaces: [],
    evidence_only_input_surfaces,
    component_definitions: components,
    weight_profile,
    cap_rules: caps,
    penalty_rules: penalties,
    modifier_rules: modifiers,
    missing_data_rules: defaultMissingDataRules(family),
    calibration_target_ref: calibrationRefFor(family),
    output_band_policy_ref: bandRefFor(family),
    replay_hash_material: L11_FULL_FORMULA_REPLAY_MATERIAL,
    formula_status: L11FormulaStatus.PRODUCTION_ENABLED,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────
// OPPORTUNITY (§11.3.10)
// ─────────────────────────────────────────────────────────────────────

const OPPORTUNITY = assembleFormula(
  L11ScoreFamily.OPPORTUNITY,
  [
    {
      id: 'hypothesis_reliance', name: 'hypothesis_reliance',
      role: L11ScoreComponentRole.PRIMARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.20,
      inputs: [L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'validation_support_quality', name: 'validation_support_quality',
      role: L11ScoreComponentRole.PRIMARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.15,
      inputs: [L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'sequence_phase_quality', name: 'sequence_phase_quality',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.15,
      inputs: [L11DependencySurfaceClass.L9_PHASE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    },
    {
      id: 'regime_compatibility', name: 'regime_compatibility',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.15,
      inputs: [L11DependencySurfaceClass.L8_REGIME_STATE],
      missing_behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    },
    {
      id: 'market_structure_quality', name: 'market_structure_quality',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'flow_or_accumulation_support', name: 'flow_or_accumulation_support',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'thesis_coherence_proxy', name: 'thesis_coherence_proxy',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.15,
      inputs: [L11DependencySurfaceClass.L10_HYPOTHESIS_SPREAD_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
  ],
  [
    buildCap(L11ScoreFamily.OPPORTUNITY, 'narrow_spread_blocks_very_high',
      'L10_NARROW_SPREAD', 'L10 hypothesis spread too narrow',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'narrow_hypothesis_spread', L11ScoreBand.HIGH),
    buildCap(L11ScoreFamily.OPPORTUNITY, 'invalidation_blocks_very_high',
      'L10_INVALIDATION_HIGH', 'active invalidation risk high',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'invalidation_risk_high', L11ScoreBand.HIGH),
    buildCap(L11ScoreFamily.OPPORTUNITY, 'conflicting_validation',
      'L7_CONFLICTING_VALIDATION', 'L7 validation conflicting',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'conflicting_validation', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.OPPORTUNITY, 'late_reflexivity',
      'L9_LATE_REFLEXIVITY', 'L9 late-stage reflexivity dominant',
      L11CapType.UPPER_VALUE, 70, L11CapDirection.LIMIT_UPSIDE,
      'late_stage_reflexivity'),
    buildCap(L11ScoreFamily.OPPORTUNITY, 'required_data_missing',
      'REQUIRED_INPUT_MISSING', 'required support data missing',
      L11CapType.READINESS_CAP, NaN, L11CapDirection.LIMIT_READINESS,
      'required_data_missing'),
  ],
  [
    buildPenalty(L11ScoreFamily.OPPORTUNITY, 'risk_overhang',
      'risk_overhang', ['l11f.opportunity.regime_compatibility.v1'], 10),
    buildPenalty(L11ScoreFamily.OPPORTUNITY, 'invalidation',
      'invalidation_risk', ['l11f.opportunity.hypothesis_reliance.v1'], 15, L11PenaltyApplicationMode.ADDITIVE, true),
    buildPenalty(L11ScoreFamily.OPPORTUNITY, 'missing_data',
      'missing_data', [], 8),
    buildPenalty(L11ScoreFamily.OPPORTUNITY, 'narrow_spread',
      'narrow_hypothesis_spread', ['l11f.opportunity.hypothesis_reliance.v1'], 10, L11PenaltyApplicationMode.ADDITIVE, true),
  ],
  [
    buildModifier(L11ScoreFamily.OPPORTUNITY, 'regime_compatibility',
      L11ModifierSourceLayer.L8_REGIME, L11ModifierEffect.AMPLIFY,
      'L8_COMPATIBLE_REGIME', 'compatible regime amplifies opportunity', 10),
    buildModifier(L11ScoreFamily.OPPORTUNITY, 'hostile_regime',
      L11ModifierSourceLayer.L8_REGIME, L11ModifierEffect.DAMPEN,
      'L8_HOSTILE_REGIME', 'hostile regime dampens opportunity', 15),
    buildModifier(L11ScoreFamily.OPPORTUNITY, 'sequence_late',
      L11ModifierSourceLayer.L9_SEQUENCE, L11ModifierEffect.SHIFT_DOWN,
      'L9_SEQUENCE_LATE', 'late-stage sequence shifts opportunity down', 10),
    buildModifier(L11ScoreFamily.OPPORTUNITY, 'reliance_high',
      L11ModifierSourceLayer.L10_HYPOTHESIS, L11ModifierEffect.AMPLIFY,
      'L10_RELIANCE_HIGH', 'high hypothesis reliance amplifies opportunity', 8),
  ],
  [L11DependencySurfaceClass.L10_HYPOTHESIS_EVIDENCE_BUNDLE],
);

// ─────────────────────────────────────────────────────────────────────
// RISK (§11.3.11)
// ─────────────────────────────────────────────────────────────────────

const RISK = assembleFormula(
  L11ScoreFamily.RISK,
  [
    {
      id: 'contradiction_severity', name: 'contradiction_severity',
      role: L11ScoreComponentRole.PRIMARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.18,
      inputs: [L11DependencySurfaceClass.L7_CONTRADICTION_BUNDLE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'invalidation_risk', name: 'invalidation_risk',
      role: L11ScoreComponentRole.PRIMARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.16,
      inputs: [L11DependencySurfaceClass.L10_CONFIRMATION_INVALIDATION_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'transition_risk', name: 'transition_risk',
      role: L11ScoreComponentRole.SECONDARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.14,
      inputs: [L11DependencySurfaceClass.L8_REGIME_TRANSITION_PROFILE],
      missing_behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    },
    {
      id: 'sequence_decay_or_lateness', name: 'sequence_decay_or_lateness',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L9_DECAY_PROFILE],
      missing_behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    },
    {
      id: 'liquidity_fragility', name: 'liquidity_fragility',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'leverage_crowding', name: 'leverage_crowding',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L6_FEATURE_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'supply_overhang', name: 'supply_overhang',
      role: L11ScoreComponentRole.SECONDARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'manipulation_or_low_quality_pressure', name: 'manipulation_or_low_quality_pressure',
      role: L11ScoreComponentRole.SECONDARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L10_HYPOTHESIS_RANKING_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
  ],
  [
    buildCap(L11ScoreFamily.RISK, 'invalidation_floor',
      'L10_INVALIDATION_HIGH', 'active invalidation high',
      L11CapType.LOWER_VALUE, 60, L11CapDirection.LIMIT_DOWNSIDE,
      'invalidation_floor'),
    buildCap(L11ScoreFamily.RISK, 'severe_contradiction_floor',
      'L7_SEVERE_CONTRADICTION', 'severe contradiction exists',
      L11CapType.LOWER_VALUE, 60, L11CapDirection.LIMIT_DOWNSIDE,
      'severe_contradiction'),
    buildCap(L11ScoreFamily.RISK, 'unlock_overhang_floor',
      'UNLOCK_OVERHANG_CRITICAL', 'unlock overhang critical',
      L11CapType.LOWER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'unlock_overhang_critical', L11ScoreBand.HIGH),
    buildCap(L11ScoreFamily.RISK, 'liquidity_fragility_floor',
      'LIQUIDITY_FRAGILITY_HIGH', 'liquidity fragility high',
      L11CapType.LOWER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'liquidity_fragility_high', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.RISK, 'manipulation_primary_floor',
      'L10_MANIPULATION_PRIMARY', 'manipulation/low-quality hypothesis primary or close secondary',
      L11CapType.LOWER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'manipulation_or_low_quality_primary', L11ScoreBand.HIGH),
  ],
  [
    buildPenalty(L11ScoreFamily.RISK, 'leverage_inflation',
      'leverage_inflation', ['l11f.risk.leverage_crowding.v1'], 5),
    buildPenalty(L11ScoreFamily.RISK, 'restriction_posture',
      'restricted_posture_disclosure', [], 0, L11PenaltyApplicationMode.ADDITIVE),
  ],
  [
    buildModifier(L11ScoreFamily.RISK, 'transition_amplify',
      L11ModifierSourceLayer.L8_REGIME, L11ModifierEffect.AMPLIFY,
      'L8_TRANSITION_HIGH', 'high regime-transition risk amplifies risk', 10),
    buildModifier(L11ScoreFamily.RISK, 'sequence_decay_amplify',
      L11ModifierSourceLayer.L9_SEQUENCE, L11ModifierEffect.AMPLIFY,
      'L9_DECAY_DOMINANT', 'dominant sequence decay amplifies risk', 12),
    buildModifier(L11ScoreFamily.RISK, 'invalidation_amplify',
      L11ModifierSourceLayer.L10_HYPOTHESIS, L11ModifierEffect.AMPLIFY,
      'L10_INVALIDATION_RISING', 'rising invalidation risk amplifies risk', 10),
  ],
);

// ─────────────────────────────────────────────────────────────────────
// TIMING (§11.3.12)
// ─────────────────────────────────────────────────────────────────────

const TIMING = assembleFormula(
  L11ScoreFamily.TIMING,
  [
    {
      id: 'sequence_phase_quality', name: 'sequence_phase_quality',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.22,
      inputs: [L11DependencySurfaceClass.L9_PHASE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'lead_lag_quality', name: 'lead_lag_quality',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.18,
      inputs: [L11DependencySurfaceClass.L9_LEAD_LAG_PROFILE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'decay_inverse', name: 'decay_inverse',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.16,
      inputs: [L11DependencySurfaceClass.L9_DECAY_PROFILE],
      missing_behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    },
    {
      id: 'post_event_window_quality', name: 'post_event_window_quality',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.14,
      inputs: [L11DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'regime_transition_stability', name: 'regime_transition_stability',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L8_REGIME_TRANSITION_PROFILE],
      missing_behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    },
    {
      id: 'hypothesis_readiness', name: 'hypothesis_readiness',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'crowding_inverse', name: 'crowding_inverse',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L6_FEATURE_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
  ],
  [
    buildCap(L11ScoreFamily.TIMING, 'late_reflexivity_cap',
      'L9_LATE_REFLEXIVITY', 'late-stage reflexivity dominant',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'late_reflexivity', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.TIMING, 'dominant_decay_cap',
      'L9_DECAY_DOMINANT', 'dominant decay posture',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'dominant_decay', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.TIMING, 'post_shock_unresolved',
      'L9_POST_SHOCK_UNRESOLVED', 'post-shock window unresolved',
      L11CapType.UPPER_VALUE, 60, L11CapDirection.LIMIT_UPSIDE,
      'post_shock_unresolved'),
    buildCap(L11ScoreFamily.TIMING, 'lead_lag_too_late',
      'L9_LEAD_LAG_TOO_LATE', 'lead-lag relation too late',
      L11CapType.UPPER_VALUE, 55, L11CapDirection.LIMIT_UPSIDE,
      'lead_lag_too_late'),
    buildCap(L11ScoreFamily.TIMING, 'invalidation_active_material',
      'L10_INVALIDATION_MATERIAL', 'active invalidation already material',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'invalidation_material', L11ScoreBand.MEDIUM),
  ],
  [
    buildPenalty(L11ScoreFamily.TIMING, 'late_reflexivity', 'late_reflexivity',
      ['l11f.timing.sequence_phase_quality.v1'], 12, L11PenaltyApplicationMode.ADDITIVE, true),
    buildPenalty(L11ScoreFamily.TIMING, 'dominant_decay', 'dominant_decay',
      ['l11f.timing.decay_inverse.v1'], 10, L11PenaltyApplicationMode.ADDITIVE, true),
    buildPenalty(L11ScoreFamily.TIMING, 'active_shock', 'active_shock',
      ['l11f.timing.post_event_window_quality.v1'], 10),
    buildPenalty(L11ScoreFamily.TIMING, 'unsupported_early_phase', 'unsupported_early_phase',
      ['l11f.timing.sequence_phase_quality.v1'], 8),
  ],
  [
    buildModifier(L11ScoreFamily.TIMING, 'sequence_late_dampen',
      L11ModifierSourceLayer.L9_SEQUENCE, L11ModifierEffect.DAMPEN,
      'L9_SEQUENCE_LATE', 'late sequence dampens timing', 12),
    buildModifier(L11ScoreFamily.TIMING, 'transition_dampen',
      L11ModifierSourceLayer.L8_REGIME, L11ModifierEffect.DAMPEN,
      'L8_TRANSITION_HIGH', 'transition risk dampens timing', 10),
  ],
);

// ─────────────────────────────────────────────────────────────────────
// THESIS_COHERENCE (§11.3.13)
// ─────────────────────────────────────────────────────────────────────

const THESIS_COHERENCE = assembleFormula(
  L11ScoreFamily.THESIS_COHERENCE,
  [
    {
      id: 'validation_agreement', name: 'validation_agreement',
      role: L11ScoreComponentRole.PRIMARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.20,
      inputs: [L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'regime_compatibility', name: 'regime_compatibility',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.17,
      inputs: [L11DependencySurfaceClass.L8_REGIME_STATE],
      missing_behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    },
    {
      id: 'sequence_compatibility', name: 'sequence_compatibility',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.17,
      inputs: [L11DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT],
      missing_behavior: L11MissingDataBehaviorClass.CAP_SCORE,
    },
    {
      id: 'hypothesis_primary_strength', name: 'hypothesis_primary_strength',
      role: L11ScoreComponentRole.PRIMARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.18,
      inputs: [L11DependencySurfaceClass.L10_HYPOTHESIS_RANKING_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'spread_clarity', name: 'spread_clarity',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L10_HYPOTHESIS_SPREAD_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'confirmation_completeness', name: 'confirmation_completeness',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L10_CONFIRMATION_INVALIDATION_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'contradiction_inverse', name: 'contradiction_inverse',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L7_CONTRADICTION_BUNDLE],
      missing_behavior: L11MissingDataBehaviorClass.PENALIZE_SCORE,
    },
  ],
  [
    buildCap(L11ScoreFamily.THESIS_COHERENCE, 'narrow_spread',
      'L10_NARROW_SPREAD', 'primary/secondary spread narrow',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'narrow_spread', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.THESIS_COHERENCE, 'conflicting_validation',
      'L7_CONFLICTING_VALIDATION', 'L7 validation conflicting',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'conflicting_validation', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.THESIS_COHERENCE, 'hostile_regime',
      'L8_HOSTILE_REGIME', 'L8 regime hostile',
      L11CapType.UPPER_VALUE, 60, L11CapDirection.LIMIT_UPSIDE,
      'hostile_regime'),
    buildCap(L11ScoreFamily.THESIS_COHERENCE, 'ambiguous_sequence',
      'L9_SEQUENCE_AMBIGUOUS', 'L9 sequence ambiguous',
      L11CapType.UPPER_VALUE, 60, L11CapDirection.LIMIT_UPSIDE,
      'ambiguous_sequence'),
    buildCap(L11ScoreFamily.THESIS_COHERENCE, 'missing_confirmations',
      'L10_CONFIRMATIONS_MISSING', 'confirmations materially missing',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'missing_confirmations', L11ScoreBand.MEDIUM),
  ],
  [
    buildPenalty(L11ScoreFamily.THESIS_COHERENCE, 'conflicting_validation',
      'conflicting_validation', ['l11f.thesis_coherence.validation_agreement.v1'], 12, L11PenaltyApplicationMode.ADDITIVE, true),
    buildPenalty(L11ScoreFamily.THESIS_COHERENCE, 'hostile_regime',
      'hostile_regime', ['l11f.thesis_coherence.regime_compatibility.v1'], 10),
    buildPenalty(L11ScoreFamily.THESIS_COHERENCE, 'ambiguous_sequence',
      'ambiguous_sequence', ['l11f.thesis_coherence.sequence_compatibility.v1'], 8),
    buildPenalty(L11ScoreFamily.THESIS_COHERENCE, 'missing_confirmation',
      'missing_confirmation', ['l11f.thesis_coherence.confirmation_completeness.v1'], 6),
    buildPenalty(L11ScoreFamily.THESIS_COHERENCE, 'live_alternative_hypothesis',
      'live_alternative_hypothesis', ['l11f.thesis_coherence.spread_clarity.v1'], 8),
  ],
  [
    buildModifier(L11ScoreFamily.THESIS_COHERENCE, 'spread_amplify',
      L11ModifierSourceLayer.L10_HYPOTHESIS, L11ModifierEffect.AMPLIFY,
      'L10_SPREAD_WIDE', 'wide spread amplifies coherence', 8),
    buildModifier(L11ScoreFamily.THESIS_COHERENCE, 'spread_dampen',
      L11ModifierSourceLayer.L10_HYPOTHESIS, L11ModifierEffect.DAMPEN,
      'L10_SPREAD_NARROW', 'narrow spread dampens coherence', 10),
  ],
);

// ─────────────────────────────────────────────────────────────────────
// SIGNAL_CONFIDENCE (§11.3.14)
// ─────────────────────────────────────────────────────────────────────

const SIGNAL_CONFIDENCE = assembleFormula(
  L11ScoreFamily.SIGNAL_CONFIDENCE,
  [
    {
      id: 'source_trust', name: 'source_trust',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.16,
      inputs: [L11DependencySurfaceClass.L3_CONFIDENCE_SCORE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'freshness', name: 'freshness',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.15,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'feature_completeness', name: 'feature_completeness',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.15,
      inputs: [L11DependencySurfaceClass.L6_EVIDENCE_PACK],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'cross_source_agreement', name: 'cross_source_agreement',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.14,
      inputs: [L11DependencySurfaceClass.L3_RECONCILIATION_OUTCOME],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'contradiction_inverse', name: 'contradiction_inverse',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L7_CONTRADICTION_BUNDLE],
      missing_behavior: L11MissingDataBehaviorClass.PENALIZE_SCORE,
    },
    {
      id: 'l7_validation_confidence', name: 'l7_validation_confidence',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L7_CONFIDENCE_ASSESSMENT],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'l8_regime_confidence', name: 'l8_regime_confidence',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L8_REGIME_CONFIDENCE_PROFILE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'l9_sequence_confidence', name: 'l9_sequence_confidence',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.06,
      inputs: [L11DependencySurfaceClass.L9_SEQUENCE_RESTRICTION_PROFILE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'l10_reliance_confidence', name: 'l10_reliance_confidence',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.04,
      inputs: [L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
  ],
  [
    buildCap(L11ScoreFamily.SIGNAL_CONFIDENCE, 'degraded_source',
      'L3_SOURCE_DEGRADED', 'source trust degraded',
      L11CapType.UPPER_VALUE, 50, L11CapDirection.LIMIT_UPSIDE,
      'source_trust_degraded'),
    buildCap(L11ScoreFamily.SIGNAL_CONFIDENCE, 'required_surfaces_missing',
      'REQUIRED_SURFACES_MISSING', 'required surfaces missing',
      L11CapType.READINESS_CAP, NaN, L11CapDirection.LIMIT_READINESS,
      'required_surfaces_missing'),
    buildCap(L11ScoreFamily.SIGNAL_CONFIDENCE, 'unresolved_contradiction',
      'L7_UNRESOLVED_CONTRADICTION', 'unresolved contradiction',
      L11CapType.UPPER_VALUE, 60, L11CapDirection.LIMIT_UPSIDE,
      'unresolved_contradiction'),
    buildCap(L11ScoreFamily.SIGNAL_CONFIDENCE, 'lower_layer_confidence_low',
      'LOWER_LAYER_CONFIDENCE_LOW', 'lower-layer confidence low',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'lower_layer_confidence_low', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.SIGNAL_CONFIDENCE, 'l10_reliance_blocked',
      'L10_RELIANCE_BLOCKED', 'L10 reliance blocked or unresolved',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'l10_reliance_blocked', L11ScoreBand.MEDIUM),
  ],
  [
    buildPenalty(L11ScoreFamily.SIGNAL_CONFIDENCE, 'contradiction',
      'contradiction_present', ['l11f.signal_confidence.contradiction_inverse.v1'], 8),
    buildPenalty(L11ScoreFamily.SIGNAL_CONFIDENCE, 'staleness',
      'stale_inputs', ['l11f.signal_confidence.freshness.v1'], 6),
  ],
  [
    buildModifier(L11ScoreFamily.SIGNAL_CONFIDENCE, 'lower_layer_dampen',
      L11ModifierSourceLayer.L7_VALIDATION, L11ModifierEffect.DAMPEN,
      'L7_CONFIDENCE_LOW', 'low L7 confidence dampens signal confidence', 10),
    buildModifier(L11ScoreFamily.SIGNAL_CONFIDENCE, 'restriction_disclosure',
      L11ModifierSourceLayer.RESTRICTION_POSTURE, L11ModifierEffect.DISCLOSURE_ONLY,
      'RESTRICTION_PRESENT', 'restriction posture present requires disclosure', 0),
  ],
);

// ─────────────────────────────────────────────────────────────────────
// MARKET_STRUCTURE (§11.3.15)
// ─────────────────────────────────────────────────────────────────────

const MARKET_STRUCTURE = assembleFormula(
  L11ScoreFamily.MARKET_STRUCTURE,
  [
    {
      id: 'liquidity_depth', name: 'liquidity_depth',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.18,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'volatility_health', name: 'volatility_health',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.14,
      inputs: [L11DependencySurfaceClass.L6_FEATURE_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'participation_quality', name: 'participation_quality',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.14,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'spot_perp_balance', name: 'spot_perp_balance',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.14,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'derivatives_health', name: 'derivatives_health',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L6_FEATURE_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'volume_quality', name: 'volume_quality',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L6_EVIDENCE_PACK],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'breadth_quality', name: 'breadth_quality',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'dislocation_inverse', name: 'dislocation_inverse',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
  ],
  [
    buildCap(L11ScoreFamily.MARKET_STRUCTURE, 'thin_liquidity',
      'L8_THIN_LIQUIDITY_REGIME', 'thin liquidity fragility regime active',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'thin_liquidity', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.MARKET_STRUCTURE, 'derivatives_crowding',
      'DERIVATIVES_CROWDING_SEVERE', 'derivatives crowding severe',
      L11CapType.UPPER_VALUE, 55, L11CapDirection.LIMIT_UPSIDE,
      'derivatives_crowding'),
    buildCap(L11ScoreFamily.MARKET_STRUCTURE, 'spot_support_weak',
      'SPOT_SUPPORT_WEAK', 'spot support weak',
      L11CapType.UPPER_VALUE, 60, L11CapDirection.LIMIT_UPSIDE,
      'spot_support_weak'),
    buildCap(L11ScoreFamily.MARKET_STRUCTURE, 'liquidity_degraded',
      'LIQUIDITY_DEGRADED', 'liquidity depth missing or degraded',
      L11CapType.READINESS_CAP, NaN, L11CapDirection.LIMIT_READINESS,
      'liquidity_degraded'),
  ],
  [
    buildPenalty(L11ScoreFamily.MARKET_STRUCTURE, 'thin_liquidity',
      'thin_liquidity', ['l11f.market_structure.liquidity_depth.v1'], 10, L11PenaltyApplicationMode.ADDITIVE, true),
    buildPenalty(L11ScoreFamily.MARKET_STRUCTURE, 'leverage_crowding',
      'leverage_crowding', ['l11f.market_structure.derivatives_health.v1'], 8),
    buildPenalty(L11ScoreFamily.MARKET_STRUCTURE, 'high_dislocation',
      'high_dislocation', ['l11f.market_structure.dislocation_inverse.v1'], 8),
    buildPenalty(L11ScoreFamily.MARKET_STRUCTURE, 'poor_volume_quality',
      'poor_volume_quality', ['l11f.market_structure.volume_quality.v1'], 6),
  ],
  [
    buildModifier(L11ScoreFamily.MARKET_STRUCTURE, 'regime_dampen',
      L11ModifierSourceLayer.L8_REGIME, L11ModifierEffect.DAMPEN,
      'L8_FRAGILITY_REGIME', 'fragility regime dampens structure', 10),
  ],
);

// ─────────────────────────────────────────────────────────────────────
// WHALE_CONVICTION (§11.3.16)
// ─────────────────────────────────────────────────────────────────────

const WHALE_CONVICTION = assembleFormula(
  L11ScoreFamily.WHALE_CONVICTION,
  [
    {
      id: 'accumulation_support', name: 'accumulation_support',
      role: L11ScoreComponentRole.PRIMARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.20,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'distribution_inverse', name: 'distribution_inverse',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.16,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'exchange_outflow_quality', name: 'exchange_outflow_quality',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.14,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'exchange_inflow_inverse', name: 'exchange_inflow_inverse',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'smart_wallet_quality', name: 'smart_wallet_quality',
      role: L11ScoreComponentRole.CONFIDENCE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L7_CONFIDENCE_ASSESSMENT],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'cluster_consistency', name: 'cluster_consistency',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L4_GRAPH_RELATION],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'treasury_behavior_quality', name: 'treasury_behavior_quality',
      role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'sequence_timing_quality', name: 'sequence_timing_quality',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
  ],
  [
    buildCap(L11ScoreFamily.WHALE_CONVICTION, 'active_distribution',
      'L7_ACTIVE_DISTRIBUTION_CONTRADICTION', 'active distribution contradiction',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'active_distribution_contradiction', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.WHALE_CONVICTION, 'late_after_hype',
      'WHALE_LATE_AFTER_HYPE', 'whale activity late after hype',
      L11CapType.UPPER_VALUE, 55, L11CapDirection.LIMIT_UPSIDE,
      'late_after_hype'),
    buildCap(L11ScoreFamily.WHALE_CONVICTION, 'inflow_danger_high',
      'EXCHANGE_INFLOW_HIGH', 'exchange inflow danger high',
      L11CapType.UPPER_VALUE, 60, L11CapDirection.LIMIT_UPSIDE,
      'exchange_inflow_high'),
    buildCap(L11ScoreFamily.WHALE_CONVICTION, 'low_smart_wallet_quality',
      'SMART_WALLET_QUALITY_LOW', 'smart-wallet quality low',
      L11CapType.UPPER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'smart_wallet_quality_low', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.WHALE_CONVICTION, 'whale_data_degraded',
      'WHALE_DATA_DEGRADED', 'whale-data confidence degraded',
      L11CapType.READINESS_CAP, NaN, L11CapDirection.LIMIT_READINESS,
      'whale_data_degraded'),
  ],
  [
    buildPenalty(L11ScoreFamily.WHALE_CONVICTION, 'active_distribution',
      'active_distribution', ['l11f.whale_conviction.distribution_inverse.v1'], 12, L11PenaltyApplicationMode.ADDITIVE, true),
    buildPenalty(L11ScoreFamily.WHALE_CONVICTION, 'exchange_inflow',
      'exchange_inflow', ['l11f.whale_conviction.exchange_inflow_inverse.v1'], 10),
    buildPenalty(L11ScoreFamily.WHALE_CONVICTION, 'low_entity_quality',
      'low_entity_quality', ['l11f.whale_conviction.smart_wallet_quality.v1'], 8),
    buildPenalty(L11ScoreFamily.WHALE_CONVICTION, 'late_whale_entry',
      'late_whale_entry', ['l11f.whale_conviction.sequence_timing_quality.v1'], 6),
  ],
  [
    buildModifier(L11ScoreFamily.WHALE_CONVICTION, 'sequence_late_dampen',
      L11ModifierSourceLayer.L9_SEQUENCE, L11ModifierEffect.DAMPEN,
      'L9_LATE_WHALE_ENTRY', 'late whale entry dampens conviction', 10),
    buildModifier(L11ScoreFamily.WHALE_CONVICTION, 'reliance_amplify',
      L11ModifierSourceLayer.L10_HYPOTHESIS, L11ModifierEffect.AMPLIFY,
      'L10_ACCUMULATION_HYPOTHESIS', 'accumulation hypothesis primary amplifies conviction', 8),
  ],
);

// ─────────────────────────────────────────────────────────────────────
// UNLOCK_RISK (§11.3.17)
// ─────────────────────────────────────────────────────────────────────

const UNLOCK_RISK = assembleFormula(
  L11ScoreFamily.UNLOCK_RISK,
  [
    {
      id: 'unlock_proximity', name: 'unlock_proximity',
      role: L11ScoreComponentRole.PRIMARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.18,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'unlock_size_vs_liquidity', name: 'unlock_size_vs_liquidity',
      role: L11ScoreComponentRole.PRIMARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.18,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
    },
    {
      id: 'treasury_exchange_pressure', name: 'treasury_exchange_pressure',
      role: L11ScoreComponentRole.SECONDARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.14,
      inputs: [L11DependencySurfaceClass.L6_EVENT_HISTORY],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'distribution_under_hype_strength', name: 'distribution_under_hype_strength',
      role: L11ScoreComponentRole.SECONDARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L10_HYPOTHESIS_RANKING_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'liquidity_absorption_weakness', name: 'liquidity_absorption_weakness',
      role: L11ScoreComponentRole.STRUCTURE_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.12,
      inputs: [L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'overhang_contradiction_severity', name: 'overhang_contradiction_severity',
      role: L11ScoreComponentRole.SECONDARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.10,
      inputs: [L11DependencySurfaceClass.L7_CONTRADICTION_BUNDLE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'post_unlock_digestive_instability', name: 'post_unlock_digestive_instability',
      role: L11ScoreComponentRole.TIMING_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L9_DECAY_PROFILE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
    {
      id: 'recovery_confirmation_inverse', name: 'recovery_confirmation_inverse',
      role: L11ScoreComponentRole.SECONDARY_RISK_COMPONENT,
      direction: L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE,
      required: true, weight: 0.08,
      inputs: [L11DependencySurfaceClass.L10_CONFIRMATION_INVALIDATION_SURFACE],
      missing_behavior: L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
    },
  ],
  [
    buildCap(L11ScoreFamily.UNLOCK_RISK, 'large_unlock_near',
      'LARGE_UNLOCK_NEAR', 'large unlock near',
      L11CapType.LOWER_VALUE, 50, L11CapDirection.LIMIT_DOWNSIDE,
      'large_unlock_near'),
    buildCap(L11ScoreFamily.UNLOCK_RISK, 'unlock_overwhelms_liquidity',
      'UNLOCK_VS_LIQ_OVERWHELM', 'unlock size overwhelms liquidity',
      L11CapType.LOWER_VALUE, 65, L11CapDirection.LIMIT_DOWNSIDE,
      'unlock_overwhelms_liquidity'),
    buildCap(L11ScoreFamily.UNLOCK_RISK, 'treasury_transfer_active',
      'TREASURY_EXCHANGE_TRANSFER_ACTIVE', 'treasury exchange transfer active',
      L11CapType.LOWER_VALUE, 55, L11CapDirection.LIMIT_DOWNSIDE,
      'treasury_transfer_active'),
    buildCap(L11ScoreFamily.UNLOCK_RISK, 'distribution_hypothesis_strong',
      'L10_DISTRIBUTION_UNDER_HYPE_STRONG', 'distribution-under-hype hypothesis strong',
      L11CapType.LOWER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'distribution_under_hype_strong', L11ScoreBand.MEDIUM),
    buildCap(L11ScoreFamily.UNLOCK_RISK, 'recovery_missing',
      'L10_RECOVERY_MISSING', 'recovery confirmation missing',
      L11CapType.LOWER_BAND, NaN, L11CapDirection.LIMIT_BAND_BAND,
      'recovery_confirmation_missing', L11ScoreBand.LOW),
  ],
  [
    buildPenalty(L11ScoreFamily.UNLOCK_RISK, 'recovery_inverse',
      'recovery_confirmation_inverse', ['l11f.unlock_risk.recovery_confirmation_inverse.v1'], 8),
  ],
  [
    buildModifier(L11ScoreFamily.UNLOCK_RISK, 'liquidity_dampen',
      L11ModifierSourceLayer.L8_REGIME, L11ModifierEffect.AMPLIFY,
      'L8_THIN_LIQUIDITY_REGIME', 'thin liquidity regime amplifies unlock risk', 12),
    buildModifier(L11ScoreFamily.UNLOCK_RISK, 'distribution_amplify',
      L11ModifierSourceLayer.L10_HYPOTHESIS, L11ModifierEffect.AMPLIFY,
      'L10_DISTRIBUTION_PRIMARY', 'distribution hypothesis primary amplifies unlock risk', 10),
  ],
);

// ─────────────────────────────────────────────────────────────────────
// Catalogue
// ─────────────────────────────────────────────────────────────────────

export const L11_PRODUCTION_FORMULAS: readonly L11ScoreFormulaDefinition[] = [
  OPPORTUNITY,
  RISK,
  TIMING,
  THESIS_COHERENCE,
  SIGNAL_CONFIDENCE,
  MARKET_STRUCTURE,
  WHALE_CONVICTION,
  UNLOCK_RISK,
];

export function getL11ProductionFormulaForFamily(
  family: L11ScoreFamily,
): L11ScoreFormulaDefinition | undefined {
  return L11_PRODUCTION_FORMULAS.find(f => f.score_family === family);
}
