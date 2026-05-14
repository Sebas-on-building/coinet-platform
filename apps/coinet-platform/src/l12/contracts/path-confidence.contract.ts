/**
 * L12.3 — Path confidence contract (§12.3.10).
 */

import { L12PathConfidenceBand } from './path-confidence-profile';
import { L12ScenarioReadinessClass } from './scenario-object-readiness';

export interface L12PathConfidenceContract {
  readonly path_confidence_contract_id: string;

  readonly path_confidence_profile_id: string;
  readonly scenario_set_id: string;

  readonly scenario_confidences: Readonly<Record<string, number>>;

  readonly primary_path_confidence_score: number;
  readonly primary_path_confidence_band: L12PathConfidenceBand;

  readonly confidence_spread_to_secondary: number;

  readonly confidence_cap_refs: readonly string[];
  readonly confidence_penalty_refs: readonly string[];

  readonly ambiguity_score: number;
  readonly contradiction_pressure_score: number;
  readonly missing_visibility_score: number;
  readonly transition_risk_score: number;
  readonly drift_pressure_score: number;
  readonly active_invalidation_score: number;
  readonly unresolved_trigger_score: number;

  readonly readiness_class: L12ScenarioReadinessClass;

  readonly cap_reason_refs: readonly string[];
  readonly restriction_reason_refs: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

/**
 * §12.3.10.2 — Inputs that *require* a downward cap on path confidence.
 */
export interface L12ConfidenceCapPosture {
  readonly hasActiveInvalidation: boolean;
  readonly contradictionUnresolved: boolean;
  readonly transitionRiskHigh: boolean;
  readonly decayDominant: boolean;
  readonly hypothesisSpreadNarrow: boolean;
  readonly missingVisibilityMaterial: boolean;
  readonly driftMaterialOrCritical: boolean;
  readonly requiredTriggersUnresolved: boolean;
  readonly scenarioSpreadNarrow: boolean;
}

export function l12RequiresConfidenceCap(p: L12ConfidenceCapPosture): boolean {
  return (
    p.hasActiveInvalidation ||
    p.contradictionUnresolved ||
    p.transitionRiskHigh ||
    p.decayDominant ||
    p.hypothesisSpreadNarrow ||
    p.missingVisibilityMaterial ||
    p.driftMaterialOrCritical ||
    p.requiredTriggersUnresolved ||
    p.scenarioSpreadNarrow
  );
}
