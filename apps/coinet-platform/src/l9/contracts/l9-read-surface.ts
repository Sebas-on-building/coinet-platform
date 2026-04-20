/**
 * L9.8 — Read Surface Doctrine
 *
 * §9.8.7 — Later layers must consume sequence truth through governed
 * read surfaces. Raw-store reads are illegal as official L9 truth
 * (§9.8.7.6 / INV-9.8-E). The no-rebuild law (§9.8.9 / INV-9.8-F) is
 * enforced by pairing each surface with a consumer-class allowlist.
 */

import {
  L9DurableSurfaceId,
  L9SequenceServingClass,
} from './l9-persistence-surface';

/**
 * §9.8.7.1 / §9.8.7.2 — Canonical read surface identifiers.
 */
export enum L9ReadSurfaceId {
  // §9.8.7.1 — canonical
  CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE =
    'l9.read.current_sequence_snapshot_by_scope',
  CURRENT_PHASE_PROFILE_BY_SCOPE =
    'l9.read.current_phase_profile_by_scope',
  CURRENT_DECAY_PROFILE_BY_SCOPE =
    'l9.read.current_decay_profile_by_scope',
  SEQUENCE_HISTORY_BY_SCOPE_AND_WINDOW =
    'l9.read.sequence_history_by_scope_and_window',
  SEQUENCE_EVIDENCE_BUNDLE_BY_SUBJECT =
    'l9.read.sequence_evidence_bundle_by_subject',
  SEQUENCE_LINEAGE_BY_RUN_ID = 'l9.read.sequence_lineage_by_run_id',

  // §9.8.7.2 — production-ready
  CURRENT_SEQUENCE_CONFIDENCE_PROFILE_BY_SCOPE =
    'l9.read.current_sequence_confidence_profile_by_scope',
  CURRENT_SEQUENCE_RESTRICTION_PROFILE_BY_SCOPE =
    'l9.read.current_sequence_restriction_profile_by_scope',
  CURRENT_CAUSAL_RESTRAINT_PROFILE_BY_SCOPE =
    'l9.read.current_causal_restraint_profile_by_scope',
  LEAD_LAG_HISTORY_BY_SCOPE_AND_WINDOW =
    'l9.read.lead_lag_history_by_scope_and_window',
  CHANGE_POINT_HISTORY_BY_SCOPE_AND_WINDOW =
    'l9.read.change_point_history_by_scope_and_window',
  POST_EVENT_WINDOW_HISTORY_BY_SCOPE_AND_WINDOW =
    'l9.read.post_event_window_history_by_scope_and_window',
}

export const ALL_L9_READ_SURFACE_IDS: readonly L9ReadSurfaceId[] =
  Object.values(L9ReadSurfaceId);

/**
 * §9.8.7.4 — Read modes. Separate enum from materialization modes:
 * a REPLAY_HISTORICAL materialization may produce rows that read as
 * LIVE_HISTORICAL or REPLAY_HISTORICAL, never as LIVE_CURRENT.
 */
export enum L9ReadMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL = 'LIVE_HISTORICAL',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_VIEW = 'REPAIR_VIEW',
  LINEAGE_VIEW = 'LINEAGE_VIEW',
  EVIDENCE_VIEW = 'EVIDENCE_VIEW',
}

export const ALL_L9_READ_MODES: readonly L9ReadMode[] =
  Object.values(L9ReadMode);

/**
 * §9.8.7.5 — Consumer classes. `L10_HYPOTHESIS_ENGINE` / `L11_SCORING_ENGINE`
 * / etc. are the upward consumers; `AUDIT` / `REPLAY_ADAPTER` /
 * `REPAIR_ADAPTER` are the governed reconstruction exceptions
 * (§9.8.9.5).
 */
export enum L9ConsumerClass {
  L10_HYPOTHESIS_ENGINE = 'L10_HYPOTHESIS_ENGINE',
  L11_SCORING_ENGINE = 'L11_SCORING_ENGINE',
  L12_SCENARIO_ENGINE = 'L12_SCENARIO_ENGINE',
  L13_JUDGMENT_ENGINE = 'L13_JUDGMENT_ENGINE',
  AUDIT = 'AUDIT',
  REPLAY_ADAPTER = 'REPLAY_ADAPTER',
  REPAIR_ADAPTER = 'REPAIR_ADAPTER',
}

export const ALL_L9_CONSUMER_CLASSES: readonly L9ConsumerClass[] =
  Object.values(L9ConsumerClass);

/**
 * §9.8.9.5 — Adapter-only consumers. Validators use this to enforce
 * that replay/repair views are never requested by upward engines.
 */
export const L9_ADAPTER_ONLY_CONSUMERS: readonly L9ConsumerClass[] = [
  L9ConsumerClass.REPLAY_ADAPTER,
  L9ConsumerClass.REPAIR_ADAPTER,
  L9ConsumerClass.AUDIT,
];

/**
 * §9.8.9.3 — Upward engines permitted to consume L9 serving truth.
 */
export const L9_UPWARD_ENGINE_CONSUMERS: readonly L9ConsumerClass[] = [
  L9ConsumerClass.L10_HYPOTHESIS_ENGINE,
  L9ConsumerClass.L11_SCORING_ENGINE,
  L9ConsumerClass.L12_SCENARIO_ENGINE,
  L9ConsumerClass.L13_JUDGMENT_ENGINE,
];

/**
 * §9.8.7.3 — Declarative descriptor for one read surface. Registry
 * consumers always match against this descriptor rather than
 * interpreting the surface name.
 */
export interface L9ReadSurface {
  readonly read_surface_id: L9ReadSurfaceId;
  readonly allowed_read_modes: readonly L9ReadMode[];
  readonly allowed_consumer_classes: readonly L9ConsumerClass[];
  readonly backing_durable_surfaces: readonly L9DurableSurfaceId[];
  readonly served_serving_classes: readonly L9SequenceServingClass[];
  /** §9.8.7.3 — required guard flags a caller must pass. */
  readonly required_guard_flags: readonly L9ReadGuardFlag[];
  /** §9.8.7.6 — raw storage access ban at surface level. */
  readonly raw_storage_access_banned: true;
  /** §9.8.7.3 — whether replay/repair views are legal on this surface. */
  readonly replay_view_allowed: boolean;
  readonly repair_view_allowed: boolean;
  readonly description: string;
}

/**
 * §9.8.7.3 / §9.8.7.6 — Guard flags. Every read request carries the
 * caller's intent; the validator cross-checks against the surface's
 * declared `required_guard_flags`.
 */
export enum L9ReadGuardFlag {
  ACKNOWLEDGES_NO_REBUILD = 'ACKNOWLEDGES_NO_REBUILD',
  ACKNOWLEDGES_RESTRICTION_POSTURE = 'ACKNOWLEDGES_RESTRICTION_POSTURE',
  ACKNOWLEDGES_CAUSAL_RESTRAINT = 'ACKNOWLEDGES_CAUSAL_RESTRAINT',
  ACKNOWLEDGES_REPLAY_SEMANTICS = 'ACKNOWLEDGES_REPLAY_SEMANTICS',
  ACKNOWLEDGES_REPAIR_SEMANTICS = 'ACKNOWLEDGES_REPAIR_SEMANTICS',
  ACKNOWLEDGES_EVIDENCE_BINDING = 'ACKNOWLEDGES_EVIDENCE_BINDING',
  ACKNOWLEDGES_LINEAGE_VIEW = 'ACKNOWLEDGES_LINEAGE_VIEW',
}

export const ALL_L9_READ_GUARD_FLAGS: readonly L9ReadGuardFlag[] =
  Object.values(L9ReadGuardFlag);

/**
 * §9.8.7.6 — Read request descriptor. The validator rejects requests
 * with unregistered surfaces, illegal modes, illegal consumers,
 * missing guards, or raw-path spoofing.
 */
export interface L9ReadRequest {
  readonly read_surface_id: L9ReadSurfaceId;
  readonly read_mode: L9ReadMode;
  readonly consumer_class: L9ConsumerClass;
  readonly consumer_instance_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string | null;
  readonly window_start: string | null;
  readonly window_end: string | null;
  readonly guard_flags: readonly L9ReadGuardFlag[];
  /** §9.8.7.6 — must be false for any governed read. */
  readonly raw_storage_path_attempted: false;
}

/**
 * §9.8.9.4 — Helper: is this consumer allowed to rebuild sequence
 * from lower layers? Only REPLAY_ADAPTER and REPAIR_ADAPTER may,
 * and even they must route through governed replay/repair interfaces.
 */
export function l9ConsumerMayRebuildFromLowerLayers(
  consumer: L9ConsumerClass,
): boolean {
  return (
    consumer === L9ConsumerClass.REPLAY_ADAPTER ||
    consumer === L9ConsumerClass.REPAIR_ADAPTER
  );
}
