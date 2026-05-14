/**
 * L11.4 — Contribution Object Models (§11.4.5 → §11.4.9)
 *
 * Object contracts for component / cap / penalty / modifier /
 * missing-data contributions. These are the canonical surfaces the
 * attribution engine emits and that validators reason over.
 */

import { L11ScoreFamily } from './score-family';
import {
  L11AttributionDriverClass,
  L11ContributionDirection,
} from './attribution-driver';
import { L11AttributionMaterialityClass } from './attribution-materiality';
import { L11CapDirection } from './formula-cap-rule';
import { L11PenaltyApplicationMode } from './formula-penalty-rule';
import { L11ModifierEffect } from './formula-modifier-rule';
import {
  L11InputConditionClass,
} from './formula-missing-data-rule';
import { L11MissingDataBehaviorClass } from './score-component';

/**
 * Alias — penalty type at the attribution layer (§11.4.7) is the
 * same enum the formula layer uses for application mode.
 */
export type L11PenaltyType = L11PenaltyApplicationMode;

/**
 * Alias — missing-input class at the attribution layer (§11.4.9) is
 * the same enum the formula layer uses for input condition.
 */
export type L11MissingInputClass = L11InputConditionClass;

// ─────────────────────────────────────────────────────────────────────
// Component contribution (§11.4.5)
// ─────────────────────────────────────────────────────────────────────

export interface L11ComponentContribution {
  readonly contribution_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;

  readonly component_id: string;
  readonly component_name: string;

  readonly component_raw_value: number;
  readonly component_normalized_value: number;
  readonly component_weight: number;

  readonly weighted_contribution: number;
  readonly contribution_direction: L11ContributionDirection;

  readonly contribution_rank: number;
  readonly materiality_class: L11AttributionMaterialityClass;

  readonly driver_class: L11AttributionDriverClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

// ─────────────────────────────────────────────────────────────────────
// Cap contribution (§11.4.6)
// ─────────────────────────────────────────────────────────────────────

export interface L11CapContribution {
  readonly cap_contribution_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;

  readonly cap_rule_id: string;
  readonly cap_reason_code: string;

  readonly pre_cap_score: number;
  readonly cap_value: number;
  readonly post_cap_score: number;

  readonly cap_effect_magnitude: number;
  readonly cap_direction: L11CapDirection;

  readonly triggered_by_refs: readonly string[];

  readonly driver_class: L11AttributionDriverClass.CAP_DRIVER;
  readonly materiality_class: L11AttributionMaterialityClass;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

// ─────────────────────────────────────────────────────────────────────
// Penalty contribution (§11.4.7)
// ─────────────────────────────────────────────────────────────────────

export interface L11PenaltyContribution {
  readonly penalty_contribution_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;

  readonly penalty_rule_id: string;
  readonly penalty_reason_code: string;

  readonly penalty_type: L11PenaltyType;
  readonly penalty_magnitude: number;

  readonly affected_component_refs: readonly string[];

  readonly score_effect: number;
  readonly contribution_direction: L11ContributionDirection;

  readonly triggered_by_refs: readonly string[];

  readonly driver_class: L11AttributionDriverClass.PENALTY_DRIVER;
  readonly materiality_class: L11AttributionMaterialityClass;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

// ─────────────────────────────────────────────────────────────────────
// Modifier contribution (§11.4.8)
// ─────────────────────────────────────────────────────────────────────

export type L11ModifierSourceLayerLabel = 'L6' | 'L7' | 'L8' | 'L9' | 'L10';

export interface L11ModifierContribution {
  readonly modifier_contribution_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;

  readonly modifier_rule_id: string;
  readonly modifier_source_layer: L11ModifierSourceLayerLabel;

  readonly modifier_type: L11ModifierEffect;
  readonly modifier_magnitude: number;

  readonly affected_component_refs: readonly string[];
  readonly score_effect: number;

  readonly contribution_direction: L11ContributionDirection;

  readonly triggered_by_refs: readonly string[];

  readonly driver_class: L11AttributionDriverClass;

  readonly materiality_class: L11AttributionMaterialityClass;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

// ─────────────────────────────────────────────────────────────────────
// Missing-data contribution (§11.4.9)
// ─────────────────────────────────────────────────────────────────────

export interface L11MissingDataContribution {
  readonly missing_data_contribution_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;

  readonly missing_input_ref: string;
  readonly missing_input_class: L11MissingInputClass;

  readonly missing_data_behavior: L11MissingDataBehaviorClass;

  readonly score_effect: number;
  readonly confidence_effect: number;

  readonly affected_component_refs: readonly string[];

  readonly disclosure_required: boolean;

  readonly driver_class: L11AttributionDriverClass.MISSING_DATA_DRIVER;
  readonly materiality_class: L11AttributionMaterialityClass;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}
