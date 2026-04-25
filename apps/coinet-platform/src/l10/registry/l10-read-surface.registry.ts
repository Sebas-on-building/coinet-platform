/**
 * L10.8 — Read Surface Registry
 *
 * §10.8.7 — Runtime registry for every read surface later layers may
 * query. The read-surface validator (§10.8.7.6) resolves descriptors
 * through this registry; no engine is permitted to inline the legal
 * read mode or consumer list of a surface.
 */

import {
  L10ConsumerClass,
  L10ReadGuardFlag,
  L10ReadMode,
  L10ReadSurface,
  L10ReadSurfaceId,
} from '../contracts/l10-read-surface';
import { L10DurableSurfaceId } from '../contracts/l10-persistence-surface';

const L10_UPWARD_ENGINE_CONSUMERS: readonly L10ConsumerClass[] = [
  L10ConsumerClass.L11_SCORING_ENGINE,
  L10ConsumerClass.L12_SCENARIO_ENGINE,
  L10ConsumerClass.L13_JUDGMENT_ENGINE,
  L10ConsumerClass.SERVING_LAYER,
];

const L10_ADAPTER_CONSUMERS: readonly L10ConsumerClass[] = [
  L10ConsumerClass.REPLAY_ADAPTER,
  L10ConsumerClass.REPAIR_ADAPTER,
  L10ConsumerClass.AUDIT,
];

const ALL_UPWARD: readonly L10ConsumerClass[] = [
  ...L10_UPWARD_ENGINE_CONSUMERS,
  ...L10_ADAPTER_CONSUMERS,
];

/**
 * §10.8.7.1 / §10.8.7.2 — Default descriptor set.
 */
export const L10_DEFAULT_READ_SURFACES: readonly L10ReadSurface[] = [
  // ── Current snapshots ──────────────────────────────────────────
  {
    read_surface_id: L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current authoritative hypothesis snapshot per scope.',
  },
  {
    read_surface_id: L10ReadSurfaceId.CURRENT_HYPOTHESIS_RANKING_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_HYPOTHESIS_RANKING_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current authoritative ranked hypothesis set per scope.',
  },
  {
    read_surface_id: L10ReadSurfaceId.CURRENT_HYPOTHESIS_SPREAD_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_HYPOTHESIS_SPREAD_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current authoritative spread profile per scope.',
  },
  {
    read_surface_id:
      L10ReadSurfaceId.CURRENT_HYPOTHESIS_CONFIDENCE_PROFILE_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_HYPOTHESIS_CONFIDENCE_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current hypothesis confidence profile per scope.',
  },
  {
    read_surface_id:
      L10ReadSurfaceId.CURRENT_HYPOTHESIS_RESTRICTION_PROFILE_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_HYPOTHESIS_RESTRICTION_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current hypothesis restriction profile per scope.',
  },
  {
    read_surface_id:
      L10ReadSurfaceId.CURRENT_HYPOTHESIS_READINESS_PROFILE_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_HYPOTHESIS_READINESS_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current hypothesis readiness class per scope.',
  },
  {
    read_surface_id: L10ReadSurfaceId.CURRENT_CONFIRMATION_POSTURE_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_CONFIRMATION_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current confirmation posture per scope.',
  },
  {
    read_surface_id: L10ReadSurfaceId.CURRENT_INVALIDATION_POSTURE_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current invalidation posture per scope.',
  },
  {
    read_surface_id: L10ReadSurfaceId.CURRENT_SHIFT_CONDITION_SET_BY_SCOPE,
    backing_durable_surfaces: [
      L10DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY,
    ],
    allowed_read_modes: [L10ReadMode.LIVE_CURRENT],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Current shift-condition set per scope.',
  },

  // ── Historical reads ───────────────────────────────────────────
  {
    read_surface_id:
      L10ReadSurfaceId.HYPOTHESIS_HISTORY_BY_SCOPE_AND_WINDOW,
    backing_durable_surfaces: [L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1],
    allowed_read_modes: [
      L10ReadMode.LIVE_HISTORICAL,
      L10ReadMode.REPLAY_HISTORICAL,
      L10ReadMode.REPAIR_VIEW,
    ],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
      L10ReadGuardFlag.REQUIRES_REPLAY_HASH_ON_RESULT,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: true,
    description: 'Historical hypothesis facts by scope and window.',
  },
  {
    read_surface_id: L10ReadSurfaceId.RANKING_HISTORY_BY_SCOPE_AND_WINDOW,
    backing_durable_surfaces: [L10DurableSurfaceId.TS_HYPOTHESIS_RANKING_V1],
    allowed_read_modes: [
      L10ReadMode.LIVE_HISTORICAL,
      L10ReadMode.REPLAY_HISTORICAL,
      L10ReadMode.REPAIR_VIEW,
    ],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
      L10ReadGuardFlag.REQUIRES_REPLAY_HASH_ON_RESULT,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: true,
    description: 'Historical ranking facts by scope and window.',
  },
  {
    read_surface_id: L10ReadSurfaceId.SPREAD_HISTORY_BY_SCOPE_AND_WINDOW,
    backing_durable_surfaces: [L10DurableSurfaceId.TS_HYPOTHESIS_SPREAD_V1],
    allowed_read_modes: [
      L10ReadMode.LIVE_HISTORICAL,
      L10ReadMode.REPLAY_HISTORICAL,
      L10ReadMode.REPAIR_VIEW,
    ],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
      L10ReadGuardFlag.REQUIRES_REPLAY_HASH_ON_RESULT,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: true,
    description: 'Historical spread facts by scope and window.',
  },

  // ── Evidence / lineage ─────────────────────────────────────────
  {
    read_surface_id:
      L10ReadSurfaceId.HYPOTHESIS_EVIDENCE_BUNDLE_BY_SUBJECT,
    backing_durable_surfaces: [
      L10DurableSurfaceId.HYPOTHESIS_EVIDENCE_INDEX,
      L10DurableSurfaceId.HYPOTHESIS_EVIDENCE_STORE,
    ],
    allowed_read_modes: [L10ReadMode.EVIDENCE_VIEW],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
      L10ReadGuardFlag.REQUIRES_EVIDENCE_POINTER_LINKAGE,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Evidence bundle lookup by hypothesis subject id.',
  },
  {
    read_surface_id: L10ReadSurfaceId.HYPOTHESIS_LINEAGE_BY_RUN_ID,
    backing_durable_surfaces: [
      L10DurableSurfaceId.HYPOTHESIS_LINEAGE_REGISTRY,
      L10DurableSurfaceId.HYPOTHESIS_LINEAGE_STORE,
    ],
    allowed_read_modes: [L10ReadMode.LINEAGE_VIEW],
    allowed_consumer_classes: ALL_UPWARD,
    required_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
      L10ReadGuardFlag.REQUIRES_LINEAGE_LINKAGE_ON_RESULT,
    ],
    bans_raw_storage_access: true,
    allows_replay_or_repair_views: false,
    description: 'Run-lineage lookup by hypothesis compute run id.',
  },
];

/**
 * §10.8.7.3 — Read surface registry.
 */
export class L10ReadSurfaceRegistry {
  private readonly byId: Map<L10ReadSurfaceId, L10ReadSurface>;

  constructor(surfaces: readonly L10ReadSurface[]) {
    this.byId = new Map();
    for (const s of surfaces) {
      if (this.byId.has(s.read_surface_id)) {
        throw new Error(
          `L10.8: duplicate read surface ${s.read_surface_id}`,
        );
      }
      this.byId.set(s.read_surface_id, s);
    }
  }

  static default(): L10ReadSurfaceRegistry {
    return new L10ReadSurfaceRegistry(L10_DEFAULT_READ_SURFACES);
  }

  list(): readonly L10ReadSurface[] {
    return Array.from(this.byId.values());
  }

  get(id: L10ReadSurfaceId): L10ReadSurface | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id as L10ReadSurfaceId);
  }
}
