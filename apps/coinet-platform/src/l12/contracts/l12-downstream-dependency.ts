/**
 * L12.7 — Downstream Dependency Contract for L13+ (§12.7.11)
 *
 * Frozen contract that L13 (Judgment), L14 (Delivery), L15
 * (Calibration / Outcome), and internal scenario-replay/repair
 * adapters must honor when consuming Layer 12 outputs.
 *
 * Core handoff law (§12.7.0):
 *   "L13 may consume L12 scenarios. L13 may not rebuild scenarios from
 *    L7–L11."
 */

import {
  L12DownstreamLayer,
  L12ScenarioDownstreamUse,
} from './l12-downstream-consumption';
import { L12ReadSurfaceId } from './l12-read-surface';

export const L12_DOWNSTREAM_DEPENDENCY_POLICY_VERSION =
  'l12.7.dependency.v1';

/** §12.7.11 — patterns L13+ may NEVER use to consume Layer 12. */
export enum L12ProhibitedDownstreamPattern {
  REBUILD_SCENARIO_FROM_LOWER_LAYERS =
    'REBUILD_SCENARIO_FROM_LOWER_LAYERS',
  RECOMPUTE_BASE_CASE_FROM_L7_TO_L11 =
    'RECOMPUTE_BASE_CASE_FROM_L7_TO_L11',
  REBUILD_TRIGGERS_FROM_L7_TO_L11 = 'REBUILD_TRIGGERS_FROM_L7_TO_L11',
  REBUILD_INVALIDATIONS_FROM_L7_TO_L11 =
    'REBUILD_INVALIDATIONS_FROM_L7_TO_L11',
  IGNORE_INVALIDATIONS = 'IGNORE_INVALIDATIONS',
  IGNORE_PATH_CONFIDENCE = 'IGNORE_PATH_CONFIDENCE',
  IGNORE_RESTRICTIONS = 'IGNORE_RESTRICTIONS',
  TREAT_SCENARIO_AS_FINAL_JUDGMENT_WITHOUT_L13_LAYER =
    'TREAT_SCENARIO_AS_FINAL_JUDGMENT_WITHOUT_L13_LAYER',
  TREAT_SCENARIO_AS_RECOMMENDATION =
    'TREAT_SCENARIO_AS_RECOMMENDATION',
  TREAT_SCENARIO_AS_TRADE_INSTRUCTION =
    'TREAT_SCENARIO_AS_TRADE_INSTRUCTION',
  TREAT_SCENARIO_AS_PREDICTION_CERTAINTY =
    'TREAT_SCENARIO_AS_PREDICTION_CERTAINTY',
  USE_REDIS_CACHE_AS_AUTHORITY = 'USE_REDIS_CACHE_AS_AUTHORITY',
}

export const ALL_L12_PROHIBITED_DOWNSTREAM_PATTERNS:
  readonly L12ProhibitedDownstreamPattern[] =
  Object.values(L12ProhibitedDownstreamPattern);

/**
 * §12.7.11 — disclosure requirements for L13+ consumers. Distinct from
 * `L12ScenarioDisclosureRequirement` (which lives on the scenario
 * restriction profile and governs *output* disclosures); this enum
 * governs *consumer* disclosures.
 */
export enum L12DownstreamDisclosureRequirement {
  DISCLOSE_BASE_CASE = 'DISCLOSE_BASE_CASE',
  DISCLOSE_ALTERNATIVES_OR_INSUFFICIENT_DATA =
    'DISCLOSE_ALTERNATIVES_OR_INSUFFICIENT_DATA',
  DISCLOSE_TRIGGERS = 'DISCLOSE_TRIGGERS',
  DISCLOSE_INVALIDATIONS = 'DISCLOSE_INVALIDATIONS',
  DISCLOSE_PATH_CONFIDENCE = 'DISCLOSE_PATH_CONFIDENCE',
  DISCLOSE_CONFIDENCE_CAP_REASONS = 'DISCLOSE_CONFIDENCE_CAP_REASONS',
  DISCLOSE_SHIFT_CONDITIONS = 'DISCLOSE_SHIFT_CONDITIONS',
  DISCLOSE_RESTRICTIONS = 'DISCLOSE_RESTRICTIONS',
  DISCLOSE_EVIDENCE_BUNDLE = 'DISCLOSE_EVIDENCE_BUNDLE',
  DISCLOSE_LINEAGE_REF = 'DISCLOSE_LINEAGE_REF',
  DISCLOSE_REPLAY_HASH = 'DISCLOSE_REPLAY_HASH',
}

export const ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS:
  readonly L12DownstreamDisclosureRequirement[] =
  Object.values(L12DownstreamDisclosureRequirement);

/** §12.7.11 — read surfaces L13+ MUST consume. */
export const L12_REQUIRED_DOWNSTREAM_READ_SURFACES:
  readonly L12ReadSurfaceId[] = [
  L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE,
  L12ReadSurfaceId.CURRENT_BASE_CASE_BY_SCOPE,
  L12ReadSurfaceId.CURRENT_BULLISH_BEARISH_PATHS_BY_SCOPE,
  L12ReadSurfaceId.CURRENT_TRIGGER_PROFILE_BY_SCENARIO_ID,
  L12ReadSurfaceId.CURRENT_INVALIDATION_PROFILE_BY_SCENARIO_ID,
  L12ReadSurfaceId.CURRENT_PATH_CONFIDENCE_BY_SCENARIO_SET_ID,
  L12ReadSurfaceId.CURRENT_RESTRICTIONS_BY_SCENARIO_SET_ID,
  L12ReadSurfaceId.SCENARIO_EVIDENCE_BUNDLE,
  L12ReadSurfaceId.SCENARIO_LINEAGE_BY_RUN_ID,
];

/** §12.7.11 — read surfaces L13+ MAY optionally consume. */
export const L12_OPTIONAL_DOWNSTREAM_READ_SURFACES:
  readonly L12ReadSurfaceId[] = [
  L12ReadSurfaceId.CURRENT_SHIFT_CONDITIONS_BY_SCENARIO_SET_ID,
  L12ReadSurfaceId.SCENARIO_HISTORY_BY_SCOPE_WINDOW,
  L12ReadSurfaceId.SCENARIO_FAILURES_BY_SCOPE,
];

/** §12.7.11 — frozen downstream dependency contract. */
export interface L12DownstreamDependencyContract {
  readonly dependency_contract_id: string;

  readonly provider_layer: 'L12_SCENARIO_ENGINE';

  readonly allowed_consumer_layers: readonly L12DownstreamLayer[];

  readonly required_consumed_surfaces: readonly L12ReadSurfaceId[];
  readonly optional_consumed_surfaces: readonly L12ReadSurfaceId[];

  readonly prohibited_consumption_patterns:
    readonly L12ProhibitedDownstreamPattern[];

  readonly no_rebuild_required: true;

  readonly required_disclosures_for_later_layers:
    readonly L12DownstreamDisclosureRequirement[];

  readonly required_restriction_respect: true;
  readonly required_invalidation_visibility: true;
  readonly required_path_confidence_visibility: true;
  readonly required_evidence_visibility: true;
  readonly required_lineage_visibility: true;

  readonly allowed_downstream_uses:
    readonly L12ScenarioDownstreamUse[];

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

/** Allowed downstream uses (governed scenario consumption). */
const L12_ALLOWED_DOWNSTREAM_USES:
  readonly L12ScenarioDownstreamUse[] = [
  L12ScenarioDownstreamUse.SCENARIO_WEIGHTING,
  L12ScenarioDownstreamUse.JUDGMENT_SUPPORT,
  L12ScenarioDownstreamUse.EXPLANATION_SUPPORT,
  L12ScenarioDownstreamUse.USER_FACING_DISCLOSURE,
  L12ScenarioDownstreamUse.MONITORING_TRIGGER_CREATION,
  L12ScenarioDownstreamUse.CALIBRATION_ANALYSIS,
  L12ScenarioDownstreamUse.AUDIT_REVIEW,
];

/** Build the canonical L12 downstream dependency contract. */
export function buildL12DownstreamDependencyContract(
): L12DownstreamDependencyContract {
  const allowedConsumers: readonly L12DownstreamLayer[] = [
    L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
    L12DownstreamLayer.L14_DELIVERY_FEEDBACK,
    L12DownstreamLayer.L15_CALIBRATION_OUTCOME,
    L12DownstreamLayer.INTERNAL_AUDIT,
  ];

  const material = JSON.stringify({
    provider: 'L12_SCENARIO_ENGINE',
    consumers: allowedConsumers,
    required: L12_REQUIRED_DOWNSTREAM_READ_SURFACES,
    optional: L12_OPTIONAL_DOWNSTREAM_READ_SURFACES,
    prohibited: ALL_L12_PROHIBITED_DOWNSTREAM_PATTERNS,
    disclosures: ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS,
    uses: L12_ALLOWED_DOWNSTREAM_USES,
    policy: L12_DOWNSTREAM_DEPENDENCY_POLICY_VERSION,
  });

  return {
    dependency_contract_id: 'l12.dependency.v1',
    provider_layer: 'L12_SCENARIO_ENGINE',
    allowed_consumer_layers: allowedConsumers,
    required_consumed_surfaces: L12_REQUIRED_DOWNSTREAM_READ_SURFACES,
    optional_consumed_surfaces: L12_OPTIONAL_DOWNSTREAM_READ_SURFACES,
    prohibited_consumption_patterns:
      ALL_L12_PROHIBITED_DOWNSTREAM_PATTERNS,
    no_rebuild_required: true,
    required_disclosures_for_later_layers:
      ALL_L12_DOWNSTREAM_DISCLOSURE_REQUIREMENTS,
    required_restriction_respect: true,
    required_invalidation_visibility: true,
    required_path_confidence_visibility: true,
    required_evidence_visibility: true,
    required_lineage_visibility: true,
    allowed_downstream_uses: L12_ALLOWED_DOWNSTREAM_USES,
    policy_version: L12_DOWNSTREAM_DEPENDENCY_POLICY_VERSION,
    replay_hash: `l12.dep.${fnv1a32(material)}`,
  };
}

/** Quick structural validity check for a dependency contract. */
export function isL12DownstreamDependencyContractValid(
  c: L12DownstreamDependencyContract,
): { ok: boolean; reason: string } {
  if (!c) return { ok: false, reason: 'contract null' };
  if (c.provider_layer !== 'L12_SCENARIO_ENGINE') {
    return { ok: false, reason: 'provider_layer must be L12_SCENARIO_ENGINE' };
  }
  if (!Array.isArray(c.allowed_consumer_layers) ||
      c.allowed_consumer_layers.length === 0) {
    return { ok: false, reason: 'allowed_consumer_layers must be non-empty' };
  }
  if (!Array.isArray(c.required_consumed_surfaces) ||
      c.required_consumed_surfaces.length === 0) {
    return { ok: false, reason: 'required_consumed_surfaces missing' };
  }
  if (!Array.isArray(c.prohibited_consumption_patterns) ||
      c.prohibited_consumption_patterns.length === 0) {
    return { ok: false, reason: 'prohibited_consumption_patterns missing' };
  }
  if (c.no_rebuild_required !== true) {
    return { ok: false, reason: 'no_rebuild_required must be true' };
  }
  if (!c.required_restriction_respect ||
      !c.required_invalidation_visibility ||
      !c.required_path_confidence_visibility ||
      !c.required_evidence_visibility ||
      !c.required_lineage_visibility) {
    return { ok: false, reason: 'required visibility flags missing' };
  }
  if (!c.replay_hash) {
    return { ok: false, reason: 'replay_hash missing' };
  }
  if (!c.policy_version) {
    return { ok: false, reason: 'policy_version missing' };
  }
  // Critical no-rebuild patterns must be present.
  const requiredBans:
    readonly L12ProhibitedDownstreamPattern[] = [
    L12ProhibitedDownstreamPattern.REBUILD_SCENARIO_FROM_LOWER_LAYERS,
    L12ProhibitedDownstreamPattern.RECOMPUTE_BASE_CASE_FROM_L7_TO_L11,
    L12ProhibitedDownstreamPattern.REBUILD_TRIGGERS_FROM_L7_TO_L11,
    L12ProhibitedDownstreamPattern.REBUILD_INVALIDATIONS_FROM_L7_TO_L11,
    L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_RECOMMENDATION,
    L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_TRADE_INSTRUCTION,
    L12ProhibitedDownstreamPattern.TREAT_SCENARIO_AS_PREDICTION_CERTAINTY,
    L12ProhibitedDownstreamPattern
      .TREAT_SCENARIO_AS_FINAL_JUDGMENT_WITHOUT_L13_LAYER,
  ];
  for (const p of requiredBans) {
    if (!c.prohibited_consumption_patterns.includes(p)) {
      return { ok: false, reason: `dependency contract missing ban: ${p}` };
    }
  }
  return { ok: true, reason: 'ok' };
}
