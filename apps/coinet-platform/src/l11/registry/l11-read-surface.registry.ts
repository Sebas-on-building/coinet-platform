/**
 * L11.8 — Read Surface Registry (§11.8.11)
 *
 * Maps each governed read surface to its allowed read modes and
 * consumer classes. Read services consult this registry to decide
 * admissibility of a read request.
 */

import {
  L11ReadSurfaceId,
  L11ReadSurfaceDescriptor,
  L11ReadMode,
  L11ConsumerClass,
  ALL_L11_READ_SURFACE_IDS,
} from '../contracts/l11-read-surface';

const ALL_L12_PLUS: readonly L11ConsumerClass[] = [
  L11ConsumerClass.L12_SCENARIO_ENGINE,
  L11ConsumerClass.L13_AI_JUDGMENT_LAYER,
  L11ConsumerClass.L14_DELIVERY_LAYER,
  L11ConsumerClass.OBSERVABILITY,
];

const REPLAY_REPAIR_CONSUMERS: readonly L11ConsumerClass[] = [
  L11ConsumerClass.INTERNAL_REPLAY_ADAPTER,
  L11ConsumerClass.INTERNAL_REPAIR_ADAPTER,
];

const CURRENT_AND_HISTORICAL_MODES: readonly L11ReadMode[] = [
  L11ReadMode.LIVE_CURRENT,
  L11ReadMode.LIVE_HISTORICAL,
  L11ReadMode.REPLAY_HISTORICAL,
  L11ReadMode.REPAIR_VIEW,
];

export const L11_READ_SURFACE_REGISTRY:
  Readonly<Record<L11ReadSurfaceId, L11ReadSurfaceDescriptor>> = {
  [L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE]: {
    read_surface_id: L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE,
    read_modes_allowed: [L11ReadMode.LIVE_CURRENT],
    consumer_classes_allowed: [
      ...ALL_L12_PLUS,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: true,
    current_authority_required: true,
    historical_only: false,
  },
  [L11ReadSurfaceId.CURRENT_SCORE_FAMILY_BY_SCOPE]: {
    read_surface_id: L11ReadSurfaceId.CURRENT_SCORE_FAMILY_BY_SCOPE,
    read_modes_allowed: [L11ReadMode.LIVE_CURRENT],
    consumer_classes_allowed: [
      ...ALL_L12_PLUS,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: true,
    current_authority_required: true,
    historical_only: false,
  },
  [L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID]: {
    read_surface_id: L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
    read_modes_allowed: CURRENT_AND_HISTORICAL_MODES,
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
      L11ConsumerClass.INTERNAL_DRIFT_JOB,
    ],
    requires_lineage: true,
    requires_evidence: true,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: false,
  },
  [L11ReadSurfaceId.SCORE_COMPONENT_BREAKDOWN_BY_SCORE_ID]: {
    read_surface_id: L11ReadSurfaceId.SCORE_COMPONENT_BREAKDOWN_BY_SCORE_ID,
    read_modes_allowed: CURRENT_AND_HISTORICAL_MODES,
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
      L11ConsumerClass.INTERNAL_DRIFT_JOB,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: false,
  },
  [L11ReadSurfaceId.SCORE_MODIFIERS_BY_SCORE_ID]: {
    read_surface_id: L11ReadSurfaceId.SCORE_MODIFIERS_BY_SCORE_ID,
    read_modes_allowed: CURRENT_AND_HISTORICAL_MODES,
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_DRIFT_JOB,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: false,
  },
  [L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID]: {
    read_surface_id: L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID,
    read_modes_allowed: CURRENT_AND_HISTORICAL_MODES,
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_DRIFT_JOB,
      L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: false,
  },
  [L11ReadSurfaceId.SCORE_CALIBRATION_HOOKS_BY_SCORE_ID]: {
    read_surface_id: L11ReadSurfaceId.SCORE_CALIBRATION_HOOKS_BY_SCORE_ID,
    read_modes_allowed: CURRENT_AND_HISTORICAL_MODES,
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
    ],
    requires_lineage: true,
    requires_evidence: true,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: false,
  },
  [L11ReadSurfaceId.SCORE_HISTORY_BY_SCOPE_WINDOW]: {
    read_surface_id: L11ReadSurfaceId.SCORE_HISTORY_BY_SCOPE_WINDOW,
    read_modes_allowed: [
      L11ReadMode.LIVE_HISTORICAL,
      L11ReadMode.REPLAY_HISTORICAL,
      L11ReadMode.REPAIR_VIEW,
    ],
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
      L11ConsumerClass.INTERNAL_DRIFT_JOB,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: true,
  },
  [L11ReadSurfaceId.CALIBRATION_TARGET_BY_SCORE_FAMILY]: {
    read_surface_id: L11ReadSurfaceId.CALIBRATION_TARGET_BY_SCORE_FAMILY,
    read_modes_allowed: [L11ReadMode.LIVE_CURRENT, L11ReadMode.LIVE_HISTORICAL],
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: true,
    current_authority_required: false,
    historical_only: false,
  },
  [L11ReadSurfaceId.DRIFT_REPORT_BY_FORMULA_VERSION]: {
    read_surface_id: L11ReadSurfaceId.DRIFT_REPORT_BY_FORMULA_VERSION,
    read_modes_allowed: [
      L11ReadMode.LIVE_CURRENT, L11ReadMode.LIVE_HISTORICAL,
      L11ReadMode.REPLAY_HISTORICAL, L11ReadMode.REPAIR_VIEW,
    ],
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_DRIFT_JOB,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: false,
  },
  [L11ReadSurfaceId.SCORE_EVIDENCE_BUNDLE]: {
    read_surface_id: L11ReadSurfaceId.SCORE_EVIDENCE_BUNDLE,
    read_modes_allowed: [L11ReadMode.EVIDENCE_VIEW],
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
    ],
    requires_lineage: true,
    requires_evidence: true,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: false,
  },
  [L11ReadSurfaceId.SCORE_LINEAGE_BY_RUN_ID]: {
    read_surface_id: L11ReadSurfaceId.SCORE_LINEAGE_BY_RUN_ID,
    read_modes_allowed: [
      L11ReadMode.LINEAGE_VIEW,
      L11ReadMode.REPLAY_HISTORICAL,
      L11ReadMode.REPAIR_VIEW,
    ],
    consumer_classes_allowed: [
      ...ALL_L12_PLUS, ...REPLAY_REPAIR_CONSUMERS,
      L11ConsumerClass.INTERNAL_DRIFT_JOB,
      L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
    ],
    requires_lineage: true,
    requires_evidence: false,
    requires_replay_hash: true,
    redis_acceleration_allowed: false,
    current_authority_required: false,
    historical_only: false,
  },
};

export function getL11ReadSurfaceDescriptor(
  id: L11ReadSurfaceId,
): L11ReadSurfaceDescriptor | null {
  return L11_READ_SURFACE_REGISTRY[id] ?? null;
}

export function listL11ReadSurfaces():
  readonly L11ReadSurfaceDescriptor[] {
  return ALL_L11_READ_SURFACE_IDS.map(id => L11_READ_SURFACE_REGISTRY[id]);
}

export interface L11ReadSurfaceRegistryReport {
  readonly ok: boolean;
  readonly registered: number;
  readonly missing: readonly L11ReadSurfaceId[];
}

export function buildL11ReadSurfaceRegistryReport():
  L11ReadSurfaceRegistryReport {
  const missing: L11ReadSurfaceId[] = [];
  for (const id of ALL_L11_READ_SURFACE_IDS) {
    if (!L11_READ_SURFACE_REGISTRY[id]) missing.push(id);
  }
  return {
    ok: missing.length === 0,
    registered: ALL_L11_READ_SURFACE_IDS.length - missing.length,
    missing,
  };
}
