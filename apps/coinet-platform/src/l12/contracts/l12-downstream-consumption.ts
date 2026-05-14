/**
 * L12.6 — Later-layer (L13+) consumption contracts (§12.6.19).
 *
 * L13+ may *consume* L12 scenario surfaces. L13+ may not rebuild scenarios
 * from L7–L11. The `L12DownstreamConsumptionRequest` captures the consumer's
 * intent so the downstream-consumption validator can detect rebuild attempts,
 * restriction bypass, and prediction-theater reuse.
 */

import { L12ConsumerClass, L12ReadSurfaceId } from './l12-read-surface';

export enum L12DownstreamLayer {
  L13_AI_JUDGMENT_EXPLANATION = 'L13_AI_JUDGMENT_EXPLANATION',
  L14_DELIVERY_FEEDBACK = 'L14_DELIVERY_FEEDBACK',
  L15_CALIBRATION_OUTCOME = 'L15_CALIBRATION_OUTCOME',
  INTERNAL_AUDIT = 'INTERNAL_AUDIT',
}

export const ALL_L12_DOWNSTREAM_LAYERS: readonly L12DownstreamLayer[] =
  Object.values(L12DownstreamLayer);

export enum L12ScenarioDownstreamUse {
  SCENARIO_WEIGHTING = 'SCENARIO_WEIGHTING',
  JUDGMENT_SUPPORT = 'JUDGMENT_SUPPORT',
  EXPLANATION_SUPPORT = 'EXPLANATION_SUPPORT',
  USER_FACING_DISCLOSURE = 'USER_FACING_DISCLOSURE',
  MONITORING_TRIGGER_CREATION = 'MONITORING_TRIGGER_CREATION',
  CALIBRATION_ANALYSIS = 'CALIBRATION_ANALYSIS',
  AUDIT_REVIEW = 'AUDIT_REVIEW',
}

export const ALL_L12_SCENARIO_DOWNSTREAM_USES: readonly L12ScenarioDownstreamUse[] =
  Object.values(L12ScenarioDownstreamUse);

/** Forbidden uses that translate scenarios into prescriptions/judgments. */
export enum L12ForbiddenDownstreamUse {
  SCENARIO_AS_RECOMMENDATION = 'SCENARIO_AS_RECOMMENDATION',
  SCENARIO_AS_FINAL_JUDGMENT = 'SCENARIO_AS_FINAL_JUDGMENT',
  SCENARIO_AS_TRADE_INSTRUCTION = 'SCENARIO_AS_TRADE_INSTRUCTION',
  SCENARIO_AS_PREDICTION_CERTAINTY = 'SCENARIO_AS_PREDICTION_CERTAINTY',
  SCENARIO_REBUILD_FROM_LOWER_LAYERS = 'SCENARIO_REBUILD_FROM_LOWER_LAYERS',
}

export const ALL_L12_FORBIDDEN_DOWNSTREAM_USES: readonly L12ForbiddenDownstreamUse[] =
  Object.values(L12ForbiddenDownstreamUse);

/** §12.6.19.2 — Downstream consumption request. */
export interface L12DownstreamConsumptionRequest {
  readonly downstream_request_id: string;

  readonly consumer_layer: L12DownstreamLayer;
  readonly consumer_class: L12ConsumerClass;

  readonly requested_use: L12ScenarioDownstreamUse;

  readonly requested_surfaces: readonly L12ReadSurfaceId[];

  readonly attempts_lower_layer_rebuild: boolean;
  readonly lower_layer_refs_requested: readonly string[];

  readonly scenario_set_ref?: string;
  readonly scenario_id_refs?: readonly string[];

  readonly requires_evidence: boolean;
  readonly requires_lineage: boolean;

  readonly honors_restriction_profile: boolean;
  readonly honors_invalidation: boolean;
  readonly honors_path_confidence: boolean;
  readonly honors_readiness: boolean;

  readonly declared_use_text: string;

  readonly policy_version: string;
}

/**
 * Lower-layer ref prefixes that a downstream consumer must NOT request as
 * input for scenario rebuild. The validator scans
 * `lower_layer_refs_requested` for these prefixes.
 */
export const L12_FORBIDDEN_LOWER_LAYER_REF_PREFIXES: readonly string[] = [
  'l7.', 'l8.', 'l9.', 'l10.', 'l11.',
];

/** Returns true iff the ref looks like a lower-layer rebuild input. */
export function isL12LowerLayerRebuildRef(ref: string): boolean {
  const lower = ref.toLowerCase();
  return L12_FORBIDDEN_LOWER_LAYER_REF_PREFIXES.some(p => lower.startsWith(p));
}
