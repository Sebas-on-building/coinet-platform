/**
 * L12.6 — Read surface registry (§12.6.14).
 *
 * Single source of truth for the L12 read surface descriptors. Each
 * descriptor declares backing durable surfaces, allowed read modes, allowed
 * consumer classes, scope/run-id requirements, evidence/lineage/replay-hash
 * requirements, and which exposure flags it carries.
 */

import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import {
  ALL_L12_READ_SURFACE_IDS,
  L12ConsumerClass,
  L12ReadMode,
  L12ReadSurfaceDescriptor,
  L12ReadSurfaceId,
} from '../contracts/l12-read-surface';

const POLICY = 'l12.6.read_surface_registry.v1';

const READ_DESCRIPTORS: Map<L12ReadSurfaceId, L12ReadSurfaceDescriptor> = new Map();

function makeDescriptor(
  read_surface_id: L12ReadSurfaceId,
  cfg: Omit<L12ReadSurfaceDescriptor, 'read_surface_id' | 'policy_version'>,
): L12ReadSurfaceDescriptor {
  return { read_surface_id, policy_version: POLICY, ...cfg };
}

const ALL_LIVE_CURRENT: readonly L12ReadMode[] = [L12ReadMode.LIVE_CURRENT];
const ALL_HISTORICAL: readonly L12ReadMode[] = [L12ReadMode.LIVE_HISTORICAL];
const ALL_EVIDENCE: readonly L12ReadMode[] = [L12ReadMode.EVIDENCE_VIEW];
const ALL_LINEAGE: readonly L12ReadMode[] = [L12ReadMode.LINEAGE_VIEW];

const SCENARIO_CONSUMERS: readonly L12ConsumerClass[] = [
  L12ConsumerClass.L13_SCENARIO_CONSUMER,
  L12ConsumerClass.L14_JUDGMENT_SUPPORT,
  L12ConsumerClass.DELIVERY_LAYER,
  L12ConsumerClass.AUDIT_SYSTEM,
  L12ConsumerClass.CALIBRATION_SYSTEM,
  L12ConsumerClass.INTERNAL_MONITORING,
];

const REPLAY_REPAIR_CONSUMERS: readonly L12ConsumerClass[] = [
  L12ConsumerClass.REPLAY_SYSTEM,
  L12ConsumerClass.REPAIR_SYSTEM,
  L12ConsumerClass.AUDIT_SYSTEM,
];

function buildDefaultDescriptor(id: L12ReadSurfaceId): L12ReadSurfaceDescriptor {
  switch (id) {
    case L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY],
        allowed_read_modes: ALL_LIVE_CURRENT,
        allowed_consumers: SCENARIO_CONSUMERS,
        requires_scope: true,
        requires_scenario_id: false,
        requires_scenario_set_id: false,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: true,
        exposes_current_authority: true,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.CURRENT_BASE_CASE_BY_SCOPE:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY],
        allowed_read_modes: ALL_LIVE_CURRENT,
        allowed_consumers: SCENARIO_CONSUMERS,
        requires_scope: true,
        requires_scenario_id: false,
        requires_scenario_set_id: false,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: true,
        exposes_current_authority: true,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.CURRENT_BULLISH_BEARISH_PATHS_BY_SCOPE:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY],
        allowed_read_modes: ALL_LIVE_CURRENT,
        allowed_consumers: SCENARIO_CONSUMERS,
        requires_scope: true,
        requires_scenario_id: false,
        requires_scenario_set_id: false,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: true,
        exposes_current_authority: true,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.CURRENT_TRIGGER_PROFILE_BY_SCENARIO_ID:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_TRIGGER_REGISTRY],
        allowed_read_modes: ALL_LIVE_CURRENT,
        allowed_consumers: SCENARIO_CONSUMERS,
        requires_scope: false,
        requires_scenario_id: true,
        requires_scenario_set_id: false,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: false,
        exposes_current_authority: true,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.CURRENT_INVALIDATION_PROFILE_BY_SCENARIO_ID:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY],
        allowed_read_modes: ALL_LIVE_CURRENT,
        allowed_consumers: SCENARIO_CONSUMERS,
        requires_scope: false,
        requires_scenario_id: true,
        requires_scenario_set_id: false,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: false,
        exposes_current_authority: true,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.CURRENT_PATH_CONFIDENCE_BY_SCENARIO_SET_ID:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_PATH_CONFIDENCE_REGISTRY],
        allowed_read_modes: ALL_LIVE_CURRENT,
        allowed_consumers: SCENARIO_CONSUMERS,
        requires_scope: false,
        requires_scenario_id: false,
        requires_scenario_set_id: true,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: true,
        exposes_current_authority: true,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.CURRENT_SHIFT_CONDITIONS_BY_SCENARIO_SET_ID:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY],
        allowed_read_modes: ALL_LIVE_CURRENT,
        allowed_consumers: SCENARIO_CONSUMERS,
        requires_scope: false,
        requires_scenario_id: false,
        requires_scenario_set_id: true,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: false,
        exposes_current_authority: true,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.CURRENT_RESTRICTIONS_BY_SCENARIO_SET_ID:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_SCENARIO_RESTRICTION_REGISTRY],
        allowed_read_modes: ALL_LIVE_CURRENT,
        allowed_consumers: SCENARIO_CONSUMERS,
        requires_scope: false,
        requires_scenario_id: false,
        requires_scenario_set_id: true,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: true,
        exposes_current_authority: true,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.SCENARIO_HISTORY_BY_SCOPE_WINDOW:
      return makeDescriptor(id, {
        backing_durable_surfaces: [
          L12DurableSurfaceId.SCENARIO_TRANSITIONS,
        ],
        allowed_read_modes: ALL_HISTORICAL,
        allowed_consumers: [
          ...SCENARIO_CONSUMERS,
          L12ConsumerClass.REPLAY_SYSTEM,
          L12ConsumerClass.REPAIR_SYSTEM,
        ],
        requires_scope: true,
        requires_scenario_id: false,
        requires_scenario_set_id: false,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: false,
        exposes_current_authority: false,
        exposes_historical: true,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.SCENARIO_EVIDENCE_BUNDLE:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.CURRENT_SCENARIO_EVIDENCE_INDEX],
        allowed_read_modes: ALL_EVIDENCE,
        allowed_consumers: [
          ...SCENARIO_CONSUMERS,
          ...REPLAY_REPAIR_CONSUMERS,
        ],
        requires_scope: false,
        requires_scenario_id: false,
        requires_scenario_set_id: true,
        requires_run_id: false,
        requires_evidence: true,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: false,
        exposes_current_authority: false,
        exposes_historical: false,
        exposes_evidence: true,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.SCENARIO_LINEAGE_BY_RUN_ID:
      return makeDescriptor(id, {
        backing_durable_surfaces: [
          L12DurableSurfaceId.CURRENT_SCENARIO_LINEAGE_INDEX,
          L12DurableSurfaceId.SCENARIO_RUNS,
        ],
        allowed_read_modes: ALL_LINEAGE,
        allowed_consumers: [
          ...SCENARIO_CONSUMERS,
          ...REPLAY_REPAIR_CONSUMERS,
        ],
        requires_scope: false,
        requires_scenario_id: false,
        requires_scenario_set_id: false,
        requires_run_id: true,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: true,
        requires_restriction_profile: false,
        exposes_current_authority: false,
        exposes_historical: false,
        exposes_evidence: false,
        exposes_lineage: true,
      });
    case L12ReadSurfaceId.SCENARIO_FAILURES_BY_SCOPE:
      return makeDescriptor(id, {
        backing_durable_surfaces: [L12DurableSurfaceId.SCENARIO_FAILURES],
        allowed_read_modes: ALL_HISTORICAL,
        allowed_consumers: [
          L12ConsumerClass.AUDIT_SYSTEM,
          L12ConsumerClass.INTERNAL_MONITORING,
          L12ConsumerClass.REPAIR_SYSTEM,
          L12ConsumerClass.CALIBRATION_SYSTEM,
        ],
        requires_scope: true,
        requires_scenario_id: false,
        requires_scenario_set_id: false,
        requires_run_id: false,
        requires_evidence: false,
        requires_lineage: true,
        requires_replay_hash: false,
        requires_restriction_profile: false,
        exposes_current_authority: false,
        exposes_historical: true,
        exposes_evidence: false,
        exposes_lineage: true,
      });
  }
}

function ensureBootstrapped(): void {
  if (READ_DESCRIPTORS.size === ALL_L12_READ_SURFACE_IDS.length) return;
  for (const id of ALL_L12_READ_SURFACE_IDS) {
    if (!READ_DESCRIPTORS.has(id)) READ_DESCRIPTORS.set(id, buildDefaultDescriptor(id));
  }
}

export function getL12ReadSurfaceDescriptor(
  id: L12ReadSurfaceId,
): L12ReadSurfaceDescriptor | undefined {
  ensureBootstrapped();
  return READ_DESCRIPTORS.get(id);
}

export function listL12ReadSurfaceDescriptors(): readonly L12ReadSurfaceDescriptor[] {
  ensureBootstrapped();
  return [...READ_DESCRIPTORS.values()].sort((a, b) =>
    a.read_surface_id.localeCompare(b.read_surface_id),
  );
}

export function isL12ReadSurfaceRegistered(id: L12ReadSurfaceId): boolean {
  ensureBootstrapped();
  return READ_DESCRIPTORS.has(id);
}

export function clearL12ReadSurfaceRegistry(): void {
  READ_DESCRIPTORS.clear();
}

export function bootstrapL12ReadSurfaceRegistry(): void {
  READ_DESCRIPTORS.clear();
  ensureBootstrapped();
}
