/**
 * L9.8 — Read Surface Registry
 *
 * §9.8.7 — Runtime registry for every read surface later layers may
 * query. The read-surface validator (§9.8.7.6) resolves descriptors
 * through this registry; no engine is permitted to inline the legal
 * read mode or consumer list of a surface.
 */

import {
  L9DurableSurfaceId,
  L9SequenceServingClass,
} from '../contracts/l9-persistence-surface';
import {
  L9ConsumerClass,
  L9_UPWARD_ENGINE_CONSUMERS,
  L9ReadGuardFlag,
  L9ReadMode,
  L9ReadSurface,
  L9ReadSurfaceId,
} from '../contracts/l9-read-surface';

const ADAPTER_CONSUMERS: readonly L9ConsumerClass[] = [
  L9ConsumerClass.REPLAY_ADAPTER,
  L9ConsumerClass.REPAIR_ADAPTER,
  L9ConsumerClass.AUDIT,
];

const ALL_UPWARD: readonly L9ConsumerClass[] = [
  ...L9_UPWARD_ENGINE_CONSUMERS,
  ...ADAPTER_CONSUMERS,
];

/**
 * §9.8.7.1 / §9.8.7.2 — Default descriptor set.
 */
export const L9_DEFAULT_READ_SURFACES: readonly L9ReadSurface[] = [
  // ── Current snapshots ──────────────────────────────────────────
  {
    read_surface_id: L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE,
    allowed_read_modes: [L9ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY],
    served_serving_classes: [L9SequenceServingClass.CURRENT_SEQUENCE_STATE],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_RESTRICTION_POSTURE,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: false,
    repair_view_allowed: false,
    description: 'Current authoritative sequence snapshot per scope.',
  },
  {
    read_surface_id: L9ReadSurfaceId.CURRENT_PHASE_PROFILE_BY_SCOPE,
    allowed_read_modes: [L9ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [L9DurableSurfaceId.CURRENT_PHASE_REGISTRY],
    served_serving_classes: [L9SequenceServingClass.CURRENT_PHASE_STATE],
    required_guard_flags: [L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD],
    raw_storage_access_banned: true,
    replay_view_allowed: false,
    repair_view_allowed: false,
    description: 'Current authoritative phase profile per scope.',
  },
  {
    read_surface_id: L9ReadSurfaceId.CURRENT_DECAY_PROFILE_BY_SCOPE,
    allowed_read_modes: [L9ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [L9DurableSurfaceId.CURRENT_DECAY_REGISTRY],
    served_serving_classes: [L9SequenceServingClass.CURRENT_DECAY_STATE],
    required_guard_flags: [L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD],
    raw_storage_access_banned: true,
    replay_view_allowed: false,
    repair_view_allowed: false,
    description: 'Current authoritative decay profile per scope.',
  },
  {
    read_surface_id:
      L9ReadSurfaceId.CURRENT_SEQUENCE_CONFIDENCE_PROFILE_BY_SCOPE,
    allowed_read_modes: [L9ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [
      L9DurableSurfaceId.CURRENT_SEQUENCE_CONFIDENCE_REGISTRY,
    ],
    served_serving_classes: [L9SequenceServingClass.CURRENT_RELIANCE_STATE],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_RESTRICTION_POSTURE,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: false,
    repair_view_allowed: false,
    description: 'Current sequence confidence profile per scope.',
  },
  {
    read_surface_id:
      L9ReadSurfaceId.CURRENT_SEQUENCE_RESTRICTION_PROFILE_BY_SCOPE,
    allowed_read_modes: [L9ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [
      L9DurableSurfaceId.CURRENT_SEQUENCE_RESTRICTION_REGISTRY,
    ],
    served_serving_classes: [L9SequenceServingClass.CURRENT_RELIANCE_STATE],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_RESTRICTION_POSTURE,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: false,
    repair_view_allowed: false,
    description: 'Current sequence restriction profile per scope.',
  },
  {
    read_surface_id:
      L9ReadSurfaceId.CURRENT_CAUSAL_RESTRAINT_PROFILE_BY_SCOPE,
    allowed_read_modes: [L9ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [
      L9DurableSurfaceId.CURRENT_CAUSAL_RESTRAINT_REGISTRY,
    ],
    served_serving_classes: [L9SequenceServingClass.CURRENT_RELIANCE_STATE],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_CAUSAL_RESTRAINT,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: false,
    repair_view_allowed: false,
    description: 'Current causal-restraint profile per scope.',
  },

  // ── Historical reads ───────────────────────────────────────────
  {
    read_surface_id: L9ReadSurfaceId.SEQUENCE_HISTORY_BY_SCOPE_AND_WINDOW,
    allowed_read_modes: [
      L9ReadMode.LIVE_HISTORICAL,
      L9ReadMode.REPLAY_HISTORICAL,
      L9ReadMode.REPAIR_VIEW,
    ],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [L9DurableSurfaceId.TS_SEQUENCE_FACT_V1],
    served_serving_classes: [
      L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT,
    ],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_REPLAY_SEMANTICS,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: true,
    repair_view_allowed: true,
    description: 'Historical sequence facts by scope and window.',
  },
  {
    read_surface_id: L9ReadSurfaceId.LEAD_LAG_HISTORY_BY_SCOPE_AND_WINDOW,
    allowed_read_modes: [
      L9ReadMode.LIVE_HISTORICAL,
      L9ReadMode.REPLAY_HISTORICAL,
      L9ReadMode.REPAIR_VIEW,
    ],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [L9DurableSurfaceId.TS_LEAD_LAG_FACT_V1],
    served_serving_classes: [
      L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT,
    ],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_REPLAY_SEMANTICS,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: true,
    repair_view_allowed: true,
    description: 'Historical lead-lag facts by scope and window.',
  },
  {
    read_surface_id:
      L9ReadSurfaceId.CHANGE_POINT_HISTORY_BY_SCOPE_AND_WINDOW,
    allowed_read_modes: [
      L9ReadMode.LIVE_HISTORICAL,
      L9ReadMode.REPLAY_HISTORICAL,
      L9ReadMode.REPAIR_VIEW,
    ],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [L9DurableSurfaceId.TS_SEQUENCE_CHANGE_POINT_V1],
    served_serving_classes: [
      L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT,
    ],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_REPLAY_SEMANTICS,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: true,
    repair_view_allowed: true,
    description: 'Historical change-point facts by scope and window.',
  },
  {
    read_surface_id:
      L9ReadSurfaceId.POST_EVENT_WINDOW_HISTORY_BY_SCOPE_AND_WINDOW,
    allowed_read_modes: [
      L9ReadMode.LIVE_HISTORICAL,
      L9ReadMode.REPLAY_HISTORICAL,
      L9ReadMode.REPAIR_VIEW,
    ],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [L9DurableSurfaceId.TS_POST_EVENT_WINDOW_V1],
    served_serving_classes: [
      L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT,
    ],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_REPLAY_SEMANTICS,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: true,
    repair_view_allowed: true,
    description: 'Historical post-event window facts by scope and window.',
  },

  // ── Evidence / lineage ─────────────────────────────────────────
  {
    read_surface_id: L9ReadSurfaceId.SEQUENCE_EVIDENCE_BUNDLE_BY_SUBJECT,
    allowed_read_modes: [L9ReadMode.EVIDENCE_VIEW],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [
      L9DurableSurfaceId.SEQUENCE_EVIDENCE_INDEX,
      L9DurableSurfaceId.SEQUENCE_EVIDENCE_STORE,
    ],
    served_serving_classes: [L9SequenceServingClass.EVIDENCE_POINTER],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_EVIDENCE_BINDING,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: false,
    repair_view_allowed: false,
    description: 'Evidence bundle lookup by sequence subject id.',
  },
  {
    read_surface_id: L9ReadSurfaceId.SEQUENCE_LINEAGE_BY_RUN_ID,
    allowed_read_modes: [L9ReadMode.LINEAGE_VIEW],
    allowed_consumer_classes: ALL_UPWARD,
    backing_durable_surfaces: [
      L9DurableSurfaceId.SEQUENCE_LINEAGE_REGISTRY,
      L9DurableSurfaceId.SEQUENCE_LINEAGE_STORE,
    ],
    served_serving_classes: [L9SequenceServingClass.LINEAGE_POINTER],
    required_guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_LINEAGE_VIEW,
    ],
    raw_storage_access_banned: true,
    replay_view_allowed: false,
    repair_view_allowed: false,
    description: 'Run-lineage lookup by sequence run id.',
  },
];

/**
 * §9.8.7.3 — Read surface registry.
 */
export class L9ReadSurfaceRegistry {
  private readonly byId: Map<L9ReadSurfaceId, L9ReadSurface>;

  constructor(surfaces: readonly L9ReadSurface[]) {
    this.byId = new Map();
    for (const s of surfaces) {
      if (this.byId.has(s.read_surface_id)) {
        throw new Error(
          `L9.8: duplicate read surface ${s.read_surface_id}`,
        );
      }
      this.byId.set(s.read_surface_id, s);
    }
  }

  static default(): L9ReadSurfaceRegistry {
    return new L9ReadSurfaceRegistry(L9_DEFAULT_READ_SURFACES);
  }

  list(): readonly L9ReadSurface[] {
    return Array.from(this.byId.values());
  }

  get(id: L9ReadSurfaceId): L9ReadSurface | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id as L9ReadSurfaceId);
  }
}
