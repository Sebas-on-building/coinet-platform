/**
 * L10.8 — Read Surface Doctrine
 *
 * §10.8.7 — Later layers may only touch hypothesis truth through
 * governed read surfaces. Raw storage reads are banned as official
 * serving truth (INV-10.8-E); rebuilds from L6/L7/L8/L9 are banned
 * (INV-10.8-F). Every request names a surface, a mode, and a consumer.
 */

import { L10DurableSurfaceId } from './l10-persistence-surface';

/**
 * §10.8.7.1 / §10.8.7.2 — Canonical read surfaces. The ID is also the
 * registry key.
 */
export enum L10ReadSurfaceId {
  // §10.8.7.1 — canonical required
  CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE =
    'l10.read.current_hypothesis_snapshot_by_scope',
  CURRENT_HYPOTHESIS_RANKING_BY_SCOPE =
    'l10.read.current_hypothesis_ranking_by_scope',
  CURRENT_HYPOTHESIS_SPREAD_BY_SCOPE =
    'l10.read.current_hypothesis_spread_by_scope',
  HYPOTHESIS_HISTORY_BY_SCOPE_AND_WINDOW =
    'l10.read.hypothesis_history_by_scope_and_window',
  HYPOTHESIS_EVIDENCE_BUNDLE_BY_SUBJECT =
    'l10.read.hypothesis_evidence_bundle_by_subject',
  HYPOTHESIS_LINEAGE_BY_RUN_ID = 'l10.read.hypothesis_lineage_by_run_id',

  // §10.8.7.2 — production-ready extensions
  CURRENT_HYPOTHESIS_CONFIDENCE_PROFILE_BY_SCOPE =
    'l10.read.current_hypothesis_confidence_profile_by_scope',
  CURRENT_HYPOTHESIS_RESTRICTION_PROFILE_BY_SCOPE =
    'l10.read.current_hypothesis_restriction_profile_by_scope',
  CURRENT_HYPOTHESIS_READINESS_PROFILE_BY_SCOPE =
    'l10.read.current_hypothesis_readiness_profile_by_scope',
  CURRENT_CONFIRMATION_POSTURE_BY_SCOPE =
    'l10.read.current_confirmation_posture_by_scope',
  CURRENT_INVALIDATION_POSTURE_BY_SCOPE =
    'l10.read.current_invalidation_posture_by_scope',
  CURRENT_SHIFT_CONDITION_SET_BY_SCOPE =
    'l10.read.current_shift_condition_set_by_scope',
  RANKING_HISTORY_BY_SCOPE_AND_WINDOW =
    'l10.read.ranking_history_by_scope_and_window',
  SPREAD_HISTORY_BY_SCOPE_AND_WINDOW =
    'l10.read.spread_history_by_scope_and_window',
}

export const ALL_L10_READ_SURFACE_IDS: readonly L10ReadSurfaceId[] =
  Object.values(L10ReadSurfaceId);

/**
 * §10.8.7.4 — Read modes.
 */
export enum L10ReadMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL = 'LIVE_HISTORICAL',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_VIEW = 'REPAIR_VIEW',
  LINEAGE_VIEW = 'LINEAGE_VIEW',
  EVIDENCE_VIEW = 'EVIDENCE_VIEW',
}

export const ALL_L10_READ_MODES: readonly L10ReadMode[] =
  Object.values(L10ReadMode);

/**
 * §10.8.7.5 — Consumer classes. Upward-only consumers plus adapter
 * and serving exceptions. Later layers L11–L13 and the serving layer
 * are the official upward handoff surface (§10.8.9.3).
 */
export enum L10ConsumerClass {
  L11_SCORING_ENGINE = 'L11_SCORING_ENGINE',
  L12_SCENARIO_ENGINE = 'L12_SCENARIO_ENGINE',
  L13_JUDGMENT_ENGINE = 'L13_JUDGMENT_ENGINE',
  AUDIT = 'AUDIT',
  REPLAY_ADAPTER = 'REPLAY_ADAPTER',
  REPAIR_ADAPTER = 'REPAIR_ADAPTER',
  SERVING_LAYER = 'SERVING_LAYER',
}

export const ALL_L10_CONSUMER_CLASSES: readonly L10ConsumerClass[] =
  Object.values(L10ConsumerClass);

/**
 * §10.8.9.3 — Upward-engine consumers: the official handoff surface
 * for later-layer code. These are the only consumer classes allowed
 * to pull current hypothesis truth for downstream scoring, scenario,
 * or judgment work.
 */
export const L10_UPWARD_ENGINE_CONSUMERS: readonly L10ConsumerClass[] = [
  L10ConsumerClass.L11_SCORING_ENGINE,
  L10ConsumerClass.L12_SCENARIO_ENGINE,
  L10ConsumerClass.L13_JUDGMENT_ENGINE,
  L10ConsumerClass.SERVING_LAYER,
];

/**
 * §10.8.9.5 — Adapter-only consumers: may rebuild explanatory truth
 * only inside governed replay / repair / audit flows.
 */
export const L10_ADAPTER_ONLY_CONSUMERS: readonly L10ConsumerClass[] = [
  L10ConsumerClass.REPLAY_ADAPTER,
  L10ConsumerClass.REPAIR_ADAPTER,
  L10ConsumerClass.AUDIT,
];

/**
 * §10.8.9.4 / §10.8.9.5 — Whether `consumer` may (ever) legally
 * rebuild hypothesis truth from lower layers. Only adapters and audit
 * may; upward engines may never.
 */
export function l10ConsumerMayRebuildFromLowerLayers(
  consumer: L10ConsumerClass,
): boolean {
  return L10_ADAPTER_ONLY_CONSUMERS.includes(consumer);
}

/**
 * §10.8.7.3 — Guard flags that a read surface may require to be set
 * on a request. Validator rejects requests that don't honour the
 * declared guards.
 */
export enum L10ReadGuardFlag {
  REQUIRES_RAW_STORAGE_BYPASS_BAN = 'REQUIRES_RAW_STORAGE_BYPASS_BAN',
  REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS =
    'REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS',
  REQUIRES_REPLAY_HASH_ON_RESULT = 'REQUIRES_REPLAY_HASH_ON_RESULT',
  REQUIRES_LINEAGE_LINKAGE_ON_RESULT = 'REQUIRES_LINEAGE_LINKAGE_ON_RESULT',
  REQUIRES_EVIDENCE_POINTER_LINKAGE = 'REQUIRES_EVIDENCE_POINTER_LINKAGE',
  REQUIRES_REPAIR_LINEAGE = 'REQUIRES_REPAIR_LINEAGE',
}

export const ALL_L10_READ_GUARD_FLAGS: readonly L10ReadGuardFlag[] =
  Object.values(L10ReadGuardFlag);

/**
 * §10.8.7.3 — Declarative read-surface descriptor. Names the backing
 * durable surfaces and the legal modes / consumers / guards.
 */
export interface L10ReadSurface {
  readonly read_surface_id: L10ReadSurfaceId;
  readonly backing_durable_surfaces: readonly L10DurableSurfaceId[];
  readonly allowed_read_modes: readonly L10ReadMode[];
  readonly allowed_consumer_classes: readonly L10ConsumerClass[];
  readonly required_guard_flags: readonly L10ReadGuardFlag[];
  readonly bans_raw_storage_access: true;
  readonly allows_replay_or_repair_views: boolean;
  readonly description: string;
}

/**
 * §10.8.7.6 — A read request evaluated by the surface validator. All
 * fields are explicit — consumer, mode, guard declaration, and any
 * required scope identifiers.
 */
export interface L10ReadRequest {
  readonly request_id: string;
  readonly read_surface_id: L10ReadSurfaceId;
  readonly read_mode: L10ReadMode;
  readonly consumer_class: L10ConsumerClass;
  readonly declared_guard_flags: readonly L10ReadGuardFlag[];
  readonly hypothesis_subject_id: string | null;
  readonly scope_type: string | null;
  readonly scope_id: string | null;
  readonly window_start: string | null;
  readonly window_end: string | null;
  readonly as_of: string | null;
  readonly compute_run_id: string | null;
  readonly evidence_subject_id: string | null;
  readonly bypasses_read_surface: false;
  readonly rebuilds_from_lower_layers: false;
  readonly declared_at: string;
}

/**
 * §10.8.7.4 — Helper: is a mode one of the historical / replay modes?
 * Used to split current vs historical serving guards.
 */
export function l10IsHistoricalReadMode(mode: L10ReadMode): boolean {
  return (
    mode === L10ReadMode.LIVE_HISTORICAL ||
    mode === L10ReadMode.REPLAY_HISTORICAL
  );
}
