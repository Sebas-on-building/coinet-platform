/**
 * L11.9 — Downstream Dependency Contract for L12+ (§11.9.9)
 *
 * Frozen contract that L12 (Scenario), L13 (AI Judgment), L14
 * (Delivery), and internal calibration/drift/replay/repair adapters
 * must honor when consuming Layer 11 outputs. Forbidden patterns
 * (recompute, score-only consumption, judgment leakage) are
 * enumerated here for downstream validators.
 */

import { L11FinalOutputSurface } from './l11-layer-inventory';

export const L11_DOWNSTREAM_DEPENDENCY_POLICY_VERSION =
  'l11.9.dependency.v1';

export enum L11DownstreamConsumer {
  L12_SCENARIO_ENGINE = 'L12_SCENARIO_ENGINE',
  L13_AI_JUDGMENT_LAYER = 'L13_AI_JUDGMENT_LAYER',
  L14_DELIVERY_FEEDBACK_CALIBRATION = 'L14_DELIVERY_FEEDBACK_CALIBRATION',
  INTERNAL_CALIBRATION_JOB = 'INTERNAL_CALIBRATION_JOB',
  INTERNAL_DRIFT_JOB = 'INTERNAL_DRIFT_JOB',
  INTERNAL_REPLAY_ADAPTER = 'INTERNAL_REPLAY_ADAPTER',
  INTERNAL_REPAIR_ADAPTER = 'INTERNAL_REPAIR_ADAPTER',
}

export const ALL_L11_DOWNSTREAM_CONSUMERS:
  readonly L11DownstreamConsumer[] = Object.values(L11DownstreamConsumer);

export enum L11ForbiddenDownstreamConsumptionPattern {
  SCORE_VALUE_ONLY_CONSUMPTION = 'SCORE_VALUE_ONLY_CONSUMPTION',
  SCORE_WITHOUT_ATTRIBUTION = 'SCORE_WITHOUT_ATTRIBUTION',
  SCORE_WITHOUT_MISSING_DATA_PROFILE = 'SCORE_WITHOUT_MISSING_DATA_PROFILE',
  SCORE_WITHOUT_DRIFT_STATUS = 'SCORE_WITHOUT_DRIFT_STATUS',
  LIVE_SCORE_RECOMPUTE_FROM_L6_TO_L10 = 'LIVE_SCORE_RECOMPUTE_FROM_L6_TO_L10',
  SCORE_AS_FINAL_JUDGMENT = 'SCORE_AS_FINAL_JUDGMENT',
  SCORE_AS_RECOMMENDATION = 'SCORE_AS_RECOMMENDATION',
  SCORE_AS_SCENARIO_WINNER = 'SCORE_AS_SCENARIO_WINNER',
  REDIS_CACHE_AS_SCORE_AUTHORITY = 'REDIS_CACHE_AS_SCORE_AUTHORITY',
}

export const ALL_L11_FORBIDDEN_DOWNSTREAM_CONSUMPTION_PATTERNS:
  readonly L11ForbiddenDownstreamConsumptionPattern[] =
  Object.values(L11ForbiddenDownstreamConsumptionPattern);

export interface L11ScoreContextBundleRequirement {
  readonly score_output_required: true;
  readonly component_breakdown_required: true;
  readonly attribution_required: true;
  readonly missing_data_profile_required: true;
  readonly modifier_profile_required: true;
  readonly calibration_hook_required: true;
  readonly drift_status_required: true;
  readonly restriction_profile_required: true;
  readonly lineage_required: true;
  readonly replay_hash_required: true;
}

export const L11_SCORE_CONTEXT_BUNDLE_REQUIREMENT:
  L11ScoreContextBundleRequirement = {
  score_output_required: true,
  component_breakdown_required: true,
  attribution_required: true,
  missing_data_profile_required: true,
  modifier_profile_required: true,
  calibration_hook_required: true,
  drift_status_required: true,
  restriction_profile_required: true,
  lineage_required: true,
  replay_hash_required: true,
};

export interface L11ReplayRepairExceptionPolicy {
  readonly recompute_allowed_consumers: readonly L11DownstreamConsumer[];
  readonly recompute_allowed_read_modes: readonly string[];
  readonly recompute_requires_parent_run: true;
  readonly recompute_requires_reason: true;
}

export const L11_REPLAY_REPAIR_EXCEPTION_POLICY:
  L11ReplayRepairExceptionPolicy = {
  recompute_allowed_consumers: [
    L11DownstreamConsumer.INTERNAL_REPLAY_ADAPTER,
    L11DownstreamConsumer.INTERNAL_REPAIR_ADAPTER,
  ],
  recompute_allowed_read_modes: ['REPLAY_HISTORICAL', 'REPAIR_VIEW'],
  recompute_requires_parent_run: true,
  recompute_requires_reason: true,
};

export interface L11DownstreamDependencyContract {
  readonly contract_id: string;

  readonly provider_layer: 'L11';
  readonly allowed_consumers: readonly L11DownstreamConsumer[];

  readonly allowed_read_surfaces: readonly L11FinalOutputSurface[];

  readonly forbidden_consumption_patterns:
    readonly L11ForbiddenDownstreamConsumptionPattern[];

  readonly required_context_bundle: L11ScoreContextBundleRequirement;

  readonly replay_repair_exception_policy: L11ReplayRepairExceptionPolicy;

  readonly policy_version: string;
  readonly replay_hash: string;
}

/** Deterministic FNV-1a 32-bit hash of a string. */
function fnv1a32(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Build the canonical L12 dependency contract. */
export function buildL11DownstreamDependencyContract(
): L11DownstreamDependencyContract {
  const material = JSON.stringify({
    provider: 'L11',
    consumers: ALL_L11_DOWNSTREAM_CONSUMERS,
    surfaces: Object.values(L11FinalOutputSurface),
    forbidden: ALL_L11_FORBIDDEN_DOWNSTREAM_CONSUMPTION_PATTERNS,
    bundle: L11_SCORE_CONTEXT_BUNDLE_REQUIREMENT,
    exception: L11_REPLAY_REPAIR_EXCEPTION_POLICY,
    policy: L11_DOWNSTREAM_DEPENDENCY_POLICY_VERSION,
  });
  return {
    contract_id: 'l11.dependency.v1',
    provider_layer: 'L11',
    allowed_consumers: ALL_L11_DOWNSTREAM_CONSUMERS,
    allowed_read_surfaces: Object.values(L11FinalOutputSurface),
    forbidden_consumption_patterns:
      ALL_L11_FORBIDDEN_DOWNSTREAM_CONSUMPTION_PATTERNS,
    required_context_bundle: L11_SCORE_CONTEXT_BUNDLE_REQUIREMENT,
    replay_repair_exception_policy: L11_REPLAY_REPAIR_EXCEPTION_POLICY,
    policy_version: L11_DOWNSTREAM_DEPENDENCY_POLICY_VERSION,
    replay_hash: `l11.dep.${fnv1a32(material)}`,
  };
}

export function isL11DownstreamDependencyContractValid(
  c: L11DownstreamDependencyContract,
): { ok: boolean; reason: string } {
  if (!c) return { ok: false, reason: 'contract null' };
  if (c.provider_layer !== 'L11') {
    return { ok: false, reason: 'provider_layer must be L11' };
  }
  if (!Array.isArray(c.allowed_consumers) || c.allowed_consumers.length === 0) {
    return { ok: false, reason: 'allowed_consumers must be non-empty' };
  }
  if (!Array.isArray(c.allowed_read_surfaces) ||
      c.allowed_read_surfaces.length === 0) {
    return { ok: false, reason: 'allowed_read_surfaces must be non-empty' };
  }
  if (!Array.isArray(c.forbidden_consumption_patterns) ||
      c.forbidden_consumption_patterns.length === 0) {
    return { ok: false, reason: 'forbidden_consumption_patterns missing' };
  }
  const b = c.required_context_bundle;
  if (!b || !b.attribution_required || !b.missing_data_profile_required ||
      !b.drift_status_required || !b.calibration_hook_required ||
      !b.lineage_required || !b.replay_hash_required) {
    return { ok: false, reason: 'required_context_bundle incomplete' };
  }
  if (!c.replay_hash) {
    return { ok: false, reason: 'replay_hash missing' };
  }
  if (!c.policy_version) {
    return { ok: false, reason: 'policy_version missing' };
  }
  return { ok: true, reason: 'ok' };
}
