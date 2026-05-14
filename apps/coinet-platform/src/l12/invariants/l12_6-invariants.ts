/**
 * L12.6 — Persistence / read / replay / repair / downstream invariants
 * (§12.6.24).
 *
 *   INV-12.6-A : L5-only persistence law
 *   INV-12.6-B : current authority law
 *   INV-12.6-C : historical append law
 *   INV-12.6-D : evidence integrity law
 *   INV-12.6-E : read surface law
 *   INV-12.6-F : downstream no-rebuild law
 *   INV-12.6-G : replay safety law
 *   INV-12.6-H : repair safety law
 */

import {
  ALL_L12_DURABLE_SURFACE_IDS,
  L12DurableSurfaceId,
  L12MaterializationMode,
  L12MutationDiscipline,
  L12StorageAuthorityClass,
} from '../contracts/l12-persistence-surface';
import {
  L12ScenarioSupersessionReason,
} from '../contracts/l12-current-authority';
import {
  L12HistoricalFactFamily,
} from '../contracts/l12-historical-surface';
import {
  L12EvidenceClass,
  L12EvidenceSubjectKind,
  buildL12EvidenceArchivePath,
} from '../contracts/l12-evidence-storage';
import {
  ALL_L12_READ_SURFACE_IDS,
  L12ConsumerClass,
  L12ReadMode,
  L12ReadSurfaceId,
} from '../contracts/l12-read-surface';
import {
  L12DownstreamLayer,
  L12ScenarioDownstreamUse,
} from '../contracts/l12-downstream-consumption';
import { L12ScenarioOutputReadinessClass } from '../contracts/scenario-output-readiness.contract';
import { L12ScenarioSpreadClass } from '../contracts/scenario-set';
import { L12ScenarioRunMode } from '../runtime/scenario-compute-run';

import {
  bootstrapL12DurableSurfaceRegistry,
  getL12DurableSurfaceDescriptor,
  isL12DurableSurfaceRegistered,
} from '../registry/l12-durable-surface.registry';
import {
  bootstrapL12ReadSurfaceRegistry,
  getL12ReadSurfaceDescriptor,
} from '../registry/l12-read-surface.registry';

import { validateL12PersistenceEnvelope } from '../persistence/persistence-envelope.validator';
import { validateL12CurrentScenarioRecord } from '../persistence/current-scenario-authority.validator';
import { validateL12HistoricalScenarioFact } from '../persistence/historical-scenario-fact.validator';
import { validateL12EvidencePointer } from '../persistence/evidence-pointer.validator';
import { validateL12ReadRequest } from '../read/l12-read-surface.validator';
import { validateL12DownstreamConsumption } from '../read/l12-downstream-consumption.validator';
import {
  L12ReplayMode,
  L12ReplayStatus,
  runL12PersistenceReplay,
} from '../replay/l12-persistence-replay-adapter';
import {
  L12RepairReason,
  L12RepairStatus,
  runL12PersistenceRepair,
} from '../repair/l12-persistence-repair-adapter';

const POLICY = 'l12.6.invariants.v1';

export interface L12_6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function bootstrap(): void {
  bootstrapL12DurableSurfaceRegistry();
  bootstrapL12ReadSurfaceRegistry();
}

/* ─────────────────────────  INV-12.6-A  ───────────────────────── */

export function INV_12_6_A_l5_only_persistence(): L12_6InvariantResult {
  bootstrap();
  // Offender envelope: missing L5 route + direct write attempt should be
  // rejected on every authority class.
  const r1 = validateL12PersistenceEnvelope({
    persistence_envelope_id: 'inv.a.bad',
    durable_surface_id: L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
    storage_authority: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L12MutationDiscipline.CURRENT_UPSERT_WITH_SUPERSESSION,
    materialization_mode: L12MaterializationMode.LIVE_CURRENT,
    scenario_subject_id: 'inv.a.subj',
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07T00:00:00Z',
    compute_run_id: 'inv.a.run',
    source_run_mode: L12ScenarioRunMode.LIVE,
    current_authority_allowed: true,
    historical_append_allowed: false,
    evidence_archive_required: false,
    lineage_refs: ['lin.1'],
    l5_route_ref: '',
    direct_write_attempted: true as unknown as false,
    policy_version: POLICY,
    replay_hash: 'inv.a.hash',
  });
  const blocked = !r1.ok && r1.issues.some(i => i.code === 'L12P_L5_ROUTE_MISSING');
  return {
    id: 'INV-12.6-A',
    name: 'L5-only persistence law',
    holds: blocked,
    evidence: blocked
      ? 'envelope missing L5 route + direct_write_attempted is rejected'
      : 'envelope without L5 route was accepted',
  };
}

/* ─────────────────────────  INV-12.6-B  ───────────────────────── */

export function INV_12_6_B_current_authority(): L12_6InvariantResult {
  bootstrap();
  // Every current registry surface must be Postgres-authority.
  const currentRegistries: readonly L12DurableSurfaceId[] = [
    L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
    L12DurableSurfaceId.CURRENT_TRIGGER_REGISTRY,
    L12DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY,
    L12DurableSurfaceId.CURRENT_PATH_CONFIDENCE_REGISTRY,
    L12DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY,
    L12DurableSurfaceId.CURRENT_SCENARIO_RESTRICTION_REGISTRY,
  ];
  for (const s of currentRegistries) {
    const desc = getL12DurableSurfaceDescriptor(s);
    if (!desc) {
      return {
        id: 'INV-12.6-B',
        name: 'current authority law',
        holds: false,
        evidence: `surface ${s} not registered`,
      };
    }
    if (desc.storage_authority !== L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY) {
      return {
        id: 'INV-12.6-B',
        name: 'current authority law',
        holds: false,
        evidence: `surface ${s} authority=${desc.storage_authority}`,
      };
    }
  }
  // Replay-mode current write must be rejected.
  const replayWriteAttempt = validateL12PersistenceEnvelope({
    persistence_envelope_id: 'inv.b.bad',
    durable_surface_id: L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
    storage_authority: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L12MutationDiscipline.CURRENT_UPSERT_WITH_SUPERSESSION,
    materialization_mode: L12MaterializationMode.REPLAY_HISTORICAL,
    scenario_subject_id: 'inv.b.subj',
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07T00:00:00Z',
    compute_run_id: 'inv.b.run',
    source_run_mode: L12ScenarioRunMode.REPLAY,
    current_authority_allowed: true,
    historical_append_allowed: false,
    evidence_archive_required: false,
    lineage_refs: ['lin.1'],
    l5_route_ref: 'l5.route.b',
    direct_write_attempted: false,
    policy_version: POLICY,
    replay_hash: 'inv.b.hash',
  });
  const replayRejected =
    !replayWriteAttempt.ok &&
    replayWriteAttempt.issues.some(i => i.code === 'L12P_REPLAY_WRITES_CURRENT');
  return {
    id: 'INV-12.6-B',
    name: 'current authority law',
    holds: replayRejected,
    evidence: replayRejected
      ? 'all current registries Postgres-authority; replay current write rejected'
      : 'replay-mode current write was accepted',
  };
}

/* ─────────────────────────  INV-12.6-C  ───────────────────────── */

export function INV_12_6_C_historical_append(): L12_6InvariantResult {
  bootstrap();
  // Re-writing a known fact id without correction is rejected.
  const known = new Set<string>(['fact-1']);
  const v = validateL12HistoricalScenarioFact(
    {
      fact_id: 'fact-1',
      fact_family: L12HistoricalFactFamily.TS_SCENARIO_FACT_V1,
      scope_type: 'instrument',
      scope_id: 'X',
      as_of: '2026-05-07',
      observed_at: '2026-05-07T00:00:00Z',
      materialized_at: '2026-05-07T00:01:00Z',
      scenario_subject_id: 'subj',
      scenario_set_id: 'set',
      scenario_ref: 'scn',
      fact_payload_ref: 'payload',
      compute_run_id: 'run-1',
      run_mode: L12ScenarioRunMode.LIVE,
      evidence_pack_ref: 'ev-1',
      input_snapshot_ref: 'snap-1',
      lineage_refs: ['lin-1'],
      replay_hash: 'h1',
      policy_version: POLICY,
    },
    { known_fact_ids: known },
  );
  const rejected =
    !v.ok && v.issues.some(i => i.code === 'L12P_HISTORICAL_FACT_MUTATED');
  return {
    id: 'INV-12.6-C',
    name: 'historical append law',
    holds: rejected,
    evidence: rejected
      ? 'rewriting historical fact without correction is rejected'
      : 'historical fact mutation was accepted',
  };
}

/* ─────────────────────────  INV-12.6-D  ───────────────────────── */

export function INV_12_6_D_evidence_integrity(): L12_6InvariantResult {
  bootstrap();
  const archive_uri = buildL12EvidenceArchivePath({
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07',
    scenario_subject_id: 'subj',
    evidence_class: L12EvidenceClass.SCENARIO_SET_EVIDENCE,
    subject_id: 'set-1',
    hash: 'abc',
  });
  const v = validateL12EvidencePointer({
    evidence_pointer_id: 'ev.ptr.1',
    evidence_class: L12EvidenceClass.SCENARIO_SET_EVIDENCE,
    subject_kind: L12EvidenceSubjectKind.SCENARIO_SET,
    subject_id: 'set-1',
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07',
    scenario_subject_id: 'subj',
    archive_uri,
    manifest_ref: 'manifest.json',
    checksum: 'cksum-1',
    replay_safe_ref: 'replay-1',
    lineage_refs: ['lin-1'],
    created_by_run_id: 'run-1',
    policy_version: POLICY,
    replay_hash: 'h1',
  });
  // Offender — checksum missing.
  const bad = validateL12EvidencePointer({
    evidence_pointer_id: 'ev.ptr.bad',
    evidence_class: L12EvidenceClass.SCENARIO_SET_EVIDENCE,
    subject_kind: L12EvidenceSubjectKind.SCENARIO_SET,
    subject_id: 'set-1',
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07',
    scenario_subject_id: 'subj',
    archive_uri,
    manifest_ref: 'manifest.json',
    checksum: '',
    replay_safe_ref: 'replay-1',
    lineage_refs: ['lin-1'],
    created_by_run_id: 'run-1',
    policy_version: POLICY,
    replay_hash: 'h1',
  });
  const ok = v.ok && !bad.ok;
  return {
    id: 'INV-12.6-D',
    name: 'evidence integrity law',
    holds: ok,
    evidence: ok
      ? 'deterministic evidence pointer accepted; missing checksum rejected'
      : `legal=${v.ok} bad=${bad.ok}`,
  };
}

/* ─────────────────────────  INV-12.6-E  ───────────────────────── */

export function INV_12_6_E_read_surface(): L12_6InvariantResult {
  bootstrap();
  // Every read surface must be registered.
  for (const id of ALL_L12_READ_SURFACE_IDS) {
    if (!getL12ReadSurfaceDescriptor(id)) {
      return {
        id: 'INV-12.6-E',
        name: 'read surface law',
        holds: false,
        evidence: `read surface ${id} unregistered`,
      };
    }
  }

  // L13 reading current scenario set with consumer L13_SCENARIO_CONSUMER is OK.
  const ok = validateL12ReadRequest({
    read_request_id: 'inv.e.ok',
    read_surface_id: L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE,
    read_mode: L12ReadMode.LIVE_CURRENT,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    scope_type: 'instrument',
    scope_id: 'X',
    require_evidence: false,
    require_lineage: true,
    require_replay_hash: true,
    require_restriction_profile: true,
    allow_blocked_readiness: false,
    allow_shadow_outputs: false,
    allow_replay_outputs: false,
    allow_repair_outputs: false,
    policy_version: POLICY,
  });
  // Illegal mode (LIVE_HISTORICAL on current surface) must be rejected.
  const bad = validateL12ReadRequest({
    read_request_id: 'inv.e.bad',
    read_surface_id: L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE,
    read_mode: L12ReadMode.LIVE_HISTORICAL,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    scope_type: 'instrument',
    scope_id: 'X',
    require_evidence: false,
    require_lineage: true,
    require_replay_hash: true,
    require_restriction_profile: true,
    allow_blocked_readiness: false,
    allow_shadow_outputs: false,
    allow_replay_outputs: false,
    allow_repair_outputs: false,
    policy_version: POLICY,
  });
  const passes = ok.ok && !bad.ok;
  return {
    id: 'INV-12.6-E',
    name: 'read surface law',
    holds: passes,
    evidence: passes
      ? 'all read surfaces registered; legal request accepted; illegal mode rejected'
      : `ok=${ok.ok} bad=${bad.ok}`,
  };
}

/* ─────────────────────────  INV-12.6-F  ───────────────────────── */

export function INV_12_6_F_downstream_no_rebuild(): L12_6InvariantResult {
  bootstrap();
  const result = validateL12DownstreamConsumption({
    downstream_request_id: 'inv.f.bad',
    consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    requested_use: L12ScenarioDownstreamUse.SCENARIO_WEIGHTING,
    requested_surfaces: [L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE],
    attempts_lower_layer_rebuild: true,
    lower_layer_refs_requested: ['l11.score.X', 'l9.sequence.Y'],
    requires_evidence: true,
    requires_lineage: true,
    honors_restriction_profile: true,
    honors_invalidation: true,
    honors_path_confidence: true,
    honors_readiness: true,
    declared_use_text: 'scenario weighting only',
    scenario_set_ref: 'set-1',
    policy_version: POLICY,
  });
  const rejected =
    !result.ok &&
    result.issues.some(i => i.code === 'L12P_DOWNSTREAM_REBUILD_ATTEMPT') &&
    result.issues.some(i => i.code === 'L12P_DOWNSTREAM_LOWER_LAYER_REF_REQUESTED');
  return {
    id: 'INV-12.6-F',
    name: 'downstream no-rebuild law',
    holds: rejected,
    evidence: rejected
      ? 'L13 lower-layer rebuild attempt is rejected'
      : 'rebuild attempt was accepted',
  };
}

/* ─────────────────────────  INV-12.6-G  ───────────────────────── */

export function INV_12_6_G_replay_safety(): L12_6InvariantResult {
  bootstrap();
  const offender = runL12PersistenceReplay(
    {
      replay_request_id: 'inv.g.req',
      source_compute_run_id: 'run.parent',
      scenario_set_id: 'set-1',
      replay_mode: L12ReplayMode.STRICT_HASH_REPLAY,
      requested_by: 'inv',
      reason_code: 'INV',
      require_hash_match: true,
      allow_historical_write: true,
      allow_current_write: false,
      policy_version: POLICY,
    },
    {
      source: {
        scenario_set_hash: 'A',
        trigger_set_hash: 'A',
        invalidation_set_hash: 'A',
        confidence_hash: 'A',
        shift_condition_hash: 'A',
        evidence_pack_hash: 'A',
        input_snapshot_present: true,
      },
      replay: {
        scenario_set_hash: 'A',
        trigger_set_hash: 'A',
        invalidation_set_hash: 'A',
        confidence_hash: 'A',
        shift_condition_hash: 'A',
        evidence_pack_hash: 'B',
        input_snapshot_present: true,
      },
      attempts_to_write_current: true,
      attempts_to_erase_trigger: false,
      attempts_to_erase_invalidation: false,
      attempts_to_upgrade_readiness: false,
      attempts_to_invent_evidence: false,
      ignores_template_version: false,
      source_template_version: 'v1',
      replay_template_version: 'v1',
      source_runtime_version: 'r1',
      replay_runtime_version: 'r1',
      historical_fact_refs: [],
      lineage_refs: ['lin'],
      replay_compute_run_id: 'run.replay',
    },
  );
  const blocked =
    offender.replay_status === L12ReplayStatus.BLOCKED &&
    offender.mismatch_reason_codes.includes('REPLAY_WRITES_CURRENT');
  return {
    id: 'INV-12.6-G',
    name: 'replay safety law',
    holds: blocked,
    evidence: blocked
      ? 'replay attempting current write is blocked'
      : `status=${offender.replay_status} reasons=${offender.mismatch_reason_codes.join(',')}`,
  };
}

/* ─────────────────────────  INV-12.6-H  ───────────────────────── */

export function INV_12_6_H_repair_safety(): L12_6InvariantResult {
  bootstrap();
  const offender = runL12PersistenceRepair(
    {
      repair_request_id: 'inv.h.req',
      parent_compute_run_id: 'run.parent',
      scenario_set_id: 'set-1',
      repair_reason: L12RepairReason.LATE_DATA,
      changed_input_refs: ['inp-1'],
      correction_lineage_refs: ['lin-1'],
      requested_by: 'inv',
      allow_current_supersession: true,
      allow_historical_correction: true,
      policy_version: POLICY,
    },
    {
      repair_compute_run_id: 'run.parent',
      removed_trigger_refs: [],
      removed_invalidation_refs: [],
      parent_primary_confidence: 0.5,
      repair_primary_confidence: 0.5,
      added_evidence_refs: [],
      invented_evidence_refs: [],
      mutates_parent_run: true,
      masquerades_as_live: false,
      bypasses_supersession: false,
      superseded_current_record_refs: [],
      new_current_record_refs: [],
      corrected_historical_fact_refs: [],
      new_evidence_pack_refs: [],
      lineage_refs: ['lin-2'],
    },
  );
  const rejected =
    offender.repair_status === L12RepairStatus.REJECTED &&
    offender.repair_change_summary_codes.includes('REPAIR_MUTATES_PRIOR_RUN') &&
    offender.repair_change_summary_codes.includes('REPAIR_REUSES_PARENT_COMPUTE_RUN_ID');
  return {
    id: 'INV-12.6-H',
    name: 'repair safety law',
    holds: rejected,
    evidence: rejected
      ? 'repair mutating prior run / reusing parent id is rejected'
      : `status=${offender.repair_status} codes=${offender.repair_change_summary_codes.join(',')}`,
  };
}

/* ─────────────────────────  Aggregate  ────────────────────────── */

export function runAllL12_6Invariants(): readonly L12_6InvariantResult[] {
  return [
    INV_12_6_A_l5_only_persistence(),
    INV_12_6_B_current_authority(),
    INV_12_6_C_historical_append(),
    INV_12_6_D_evidence_integrity(),
    INV_12_6_E_read_surface(),
    INV_12_6_F_downstream_no_rebuild(),
    INV_12_6_G_replay_safety(),
    INV_12_6_H_repair_safety(),
  ];
}

/** Reachable surfaces helper (used by certification). */
export function listAllL12DurableSurfaceIds(): readonly L12DurableSurfaceId[] {
  return ALL_L12_DURABLE_SURFACE_IDS;
}

export function isAllReadiness(c: L12ScenarioOutputReadinessClass): boolean {
  return c === L12ScenarioOutputReadinessClass.CLEAN_EMISSION;
}

export function isAllRegistered(): boolean {
  return ALL_L12_DURABLE_SURFACE_IDS.every(isL12DurableSurfaceRegistered);
}

/** Suppress unused import warnings. */
const _UNUSED: ReadonlyArray<unknown> = [
  L12ScenarioSupersessionReason.NEW_LIVE_RUN,
  L12ScenarioSpreadClass.CLEAR_PRIMARY,
];
void _UNUSED;
