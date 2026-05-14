/**
 * L12.4 — Engine 8: PathConfidenceEngine (§12.4.20).
 *
 * Computes a contract-valid `L12PathConfidenceContract` from constructed
 * paths and the runtime confidence cap posture. The engine MUST cap
 * confidence under any active invalidation, unresolved contradiction,
 * material drift, missing visibility, narrow spread, etc.
 */

import {
  buildL12PathConfidenceProfileId,
  buildL12ScenarioReplayHash,
} from '../contracts/scenario-ids';
import {
  L12PathConfidenceBand,
  l12ConfidenceBandFor,
} from '../contracts/path-confidence-profile';
import type {
  L12ConfidenceCapPosture,
  L12PathConfidenceContract,
} from '../contracts/path-confidence.contract';
import { l12RequiresConfidenceCap } from '../contracts/path-confidence.contract';
import { L12ScenarioReadinessClass } from '../contracts/scenario-object-readiness';

import type { L12ConstructedScenarioPaths } from './scenario-path-construction-engine';
import type { L12ResolvedInvalidationSet } from './scenario-invalidation-engine';
import type { L12ResolvedTriggerSet } from './scenario-trigger-engine';

export enum L12PathConfidenceFactor {
  VALIDATION_SUPPORT = 'VALIDATION_SUPPORT',
  CONTRADICTION_PRESSURE = 'CONTRADICTION_PRESSURE',
  REGIME_COMPATIBILITY = 'REGIME_COMPATIBILITY',
  TRANSITION_RISK = 'TRANSITION_RISK',
  SEQUENCE_QUALITY = 'SEQUENCE_QUALITY',
  SEQUENCE_DECAY = 'SEQUENCE_DECAY',
  HYPOTHESIS_STRENGTH = 'HYPOTHESIS_STRENGTH',
  HYPOTHESIS_SPREAD = 'HYPOTHESIS_SPREAD',
  SCORE_CONTEXT_SUPPORT = 'SCORE_CONTEXT_SUPPORT',
  MISSING_VISIBILITY = 'MISSING_VISIBILITY',
  DRIFT_PRESSURE = 'DRIFT_PRESSURE',
  TRIGGER_COMPLETENESS = 'TRIGGER_COMPLETENESS',
  INVALIDATION_PRESSURE = 'INVALIDATION_PRESSURE',
}

export const ALL_L12_PATH_CONFIDENCE_FACTORS: readonly L12PathConfidenceFactor[] =
  Object.values(L12PathConfidenceFactor);

/** Cap thresholds applied under each posture. */
export const L12_CAP_UNDER_ACTIVE_INVALIDATION = 0.5;
export const L12_CAP_UNDER_UNRESOLVED_CONTRADICTION = 0.6;
export const L12_CAP_UNDER_MATERIAL_DRIFT = 0.55;
export const L12_CAP_UNDER_MISSING_VISIBILITY = 0.6;
export const L12_CAP_UNDER_NARROW_SPREAD = 0.65;

export interface ComputeL12PathConfidenceArgs {
  readonly constructed: L12ConstructedScenarioPaths;
  readonly trigger_set: L12ResolvedTriggerSet;
  readonly invalidation_set: L12ResolvedInvalidationSet;
  readonly posture: L12ConfidenceCapPosture;
  readonly readiness_class: L12ScenarioReadinessClass;
  readonly secondary_path_score?: number;
  readonly factor_scores: Readonly<Record<L12PathConfidenceFactor, number>>;
  readonly policy_version: string;
}

export interface ComputeL12PathConfidenceResult {
  readonly ok: boolean;
  readonly contract?: L12PathConfidenceContract;
  readonly issues: readonly string[];
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function computeL12PathConfidence(
  args: ComputeL12PathConfidenceArgs,
): ComputeL12PathConfidenceResult {
  const issues: string[] = [];
  const p = args.posture;

  const cap_reason_refs: string[] = [];
  let dynamicCap = 1.0;
  if (p.hasActiveInvalidation) {
    cap_reason_refs.push('CAP_ACTIVE_INVALIDATION');
    dynamicCap = Math.min(dynamicCap, L12_CAP_UNDER_ACTIVE_INVALIDATION);
  }
  if (p.contradictionUnresolved) {
    cap_reason_refs.push('CAP_UNRESOLVED_CONTRADICTION');
    dynamicCap = Math.min(dynamicCap, L12_CAP_UNDER_UNRESOLVED_CONTRADICTION);
  }
  if (p.driftMaterialOrCritical) {
    cap_reason_refs.push('CAP_MATERIAL_DRIFT');
    dynamicCap = Math.min(dynamicCap, L12_CAP_UNDER_MATERIAL_DRIFT);
  }
  if (p.missingVisibilityMaterial) {
    cap_reason_refs.push('CAP_MISSING_VISIBILITY');
    dynamicCap = Math.min(dynamicCap, L12_CAP_UNDER_MISSING_VISIBILITY);
  }
  if (p.transitionRiskHigh) cap_reason_refs.push('CAP_TRANSITION_RISK');
  if (p.decayDominant) cap_reason_refs.push('CAP_DECAY_DOMINANT');
  if (p.hypothesisSpreadNarrow) cap_reason_refs.push('CAP_HYPOTHESIS_SPREAD_NARROW');
  if (p.requiredTriggersUnresolved) cap_reason_refs.push('CAP_TRIGGERS_UNRESOLVED');
  if (p.scenarioSpreadNarrow) {
    cap_reason_refs.push('CAP_SCENARIO_SPREAD_NARROW');
    dynamicCap = Math.min(dynamicCap, L12_CAP_UNDER_NARROW_SPREAD);
  }
  cap_reason_refs.sort();

  const requireCap = l12RequiresConfidenceCap(p);
  if (requireCap && cap_reason_refs.length === 0) {
    issues.push('cap required by posture but no cap reasons recorded');
  }

  const scenario_confidences: Record<string, number> = {};
  for (const path of args.constructed.scenario_paths) {
    scenario_confidences[path.scenario_id] = clamp01(
      Math.min(path.path_confidence_score, dynamicCap),
    );
  }
  const ranked = [...Object.entries(scenario_confidences)].sort((a, b) => b[1] - a[1]);
  const primary = ranked[0]?.[1] ?? 0;
  const secondary = args.secondary_path_score ?? ranked[1]?.[1] ?? 0;
  const primaryBand: L12PathConfidenceBand = l12ConfidenceBandFor(primary);
  const spread = primary - secondary;

  if (
    requireCap &&
    (primaryBand === L12PathConfidenceBand.HIGH ||
      primaryBand === L12PathConfidenceBand.VERY_HIGH)
  ) {
    issues.push(`primary band ${primaryBand} contradicts required cap`);
  }

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.path_confidence.contract',
    policy_version: args.policy_version,
    material: {
      scenario_set_id: args.constructed.scenario_set_id,
      scenario_confidences: Object.fromEntries(
        Object.entries(scenario_confidences).sort(([a], [b]) => (a < b ? -1 : 1)),
      ),
      cap_reasons: [...cap_reason_refs].sort(),
      readiness_class: args.readiness_class,
    },
  });
  const path_confidence_profile_id = buildL12PathConfidenceProfileId({
    scenario_set_id: args.constructed.scenario_set_id,
    policy_version: args.policy_version,
  });
  const contract: L12PathConfidenceContract = {
    path_confidence_contract_id: `l12.path_confidence.contract.${replay_hash}`,
    path_confidence_profile_id,
    scenario_set_id: args.constructed.scenario_set_id,
    scenario_confidences,
    primary_path_confidence_score: primary,
    primary_path_confidence_band: primaryBand,
    confidence_spread_to_secondary: clamp01(spread),
    confidence_cap_refs: cap_reason_refs,
    confidence_penalty_refs: [],
    ambiguity_score: clamp01(1 - spread),
    contradiction_pressure_score: p.contradictionUnresolved ? 1 : 0,
    missing_visibility_score: p.missingVisibilityMaterial ? 1 : 0,
    transition_risk_score: p.transitionRiskHigh ? 1 : 0,
    drift_pressure_score: p.driftMaterialOrCritical ? 1 : 0,
    active_invalidation_score: p.hasActiveInvalidation ? 1 : 0,
    unresolved_trigger_score: p.requiredTriggersUnresolved ? 1 : 0,
    readiness_class: args.readiness_class,
    cap_reason_refs,
    restriction_reason_refs: [],
    lineage_refs: [...args.constructed.lineage_refs].sort(),
    replay_hash,
    policy_version: args.policy_version,
  };
  return { ok: issues.length === 0, contract, issues };
}
