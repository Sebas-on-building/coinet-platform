/**
 * L12.6 — Persistence, Read Surfaces, Replay, Repair & Later-Layer Integration
 * Certification Test Suite (§12.6.25)
 *
 * 6 Bands:
 *   A — Durable surfaces and materialization
 *   B — Current, historical, and evidence law
 *   C — Read surfaces
 *   D — Replay and repair
 *   E — Downstream integration
 *   F — Audit and invariants
 */

import {
  // Persistence surface contracts
  ALL_L12_DURABLE_SURFACE_IDS,
  L12DurableSurfaceId,
  L12MaterializationMode,
  L12MutationDiscipline,
  L12StorageAuthorityClass,
  L12_DURABLE_SURFACE_AUTHORITY,
  isL12CurrentAuthoritySurface,
  isL12HistoricalAppendSurface,
  l12ModeMayWriteCurrent,
  l12RunModeMayWriteCurrent,
  L12PersistenceEnvelope,
} from '../l12/contracts/l12-persistence-surface';
import {
  L12CurrentScenarioRecord,
  L12ScenarioSupersessionReason,
  isL12BlockedCurrentReadiness,
  isL12CleanCurrentReadiness,
} from '../l12/contracts/l12-current-authority';
import {
  L12HistoricalFactFamily,
  L12HistoricalScenarioFact,
} from '../l12/contracts/l12-historical-surface';
import {
  L12EvidenceClass,
  L12EvidencePointer,
  L12EvidenceSubjectKind,
  buildL12EvidenceArchivePath,
  isL12EvidenceArchivePathLegal,
} from '../l12/contracts/l12-evidence-storage';
import {
  ALL_L12_READ_SURFACE_IDS,
  L12ConsumerClass,
  L12GovernedReadResult,
  L12ReadFreshnessClass,
  L12ReadMode,
  L12ReadRequest,
  L12ReadSurfaceId,
} from '../l12/contracts/l12-read-surface';
import {
  L12DownstreamLayer,
  L12ScenarioDownstreamUse,
} from '../l12/contracts/l12-downstream-consumption';
import { L12ScenarioOutputReadinessClass } from '../l12/contracts/scenario-output-readiness.contract';
import { L12ScenarioSpreadClass } from '../l12/contracts/scenario-set';
import { L12ScenarioRunMode } from '../l12/runtime/scenario-compute-run';

// Registries
import {
  bootstrapL12DurableSurfaceRegistry,
  getL12DurableSurfaceDescriptor,
  isL12DurableSurfaceRegistered,
  listL12DurableSurfaceDescriptors,
} from '../l12/registry/l12-durable-surface.registry';
import {
  bootstrapL12ReadSurfaceRegistry,
  getL12ReadSurfaceDescriptor,
  listL12ReadSurfaceDescriptors,
} from '../l12/registry/l12-read-surface.registry';

// Persistence validators
import {
  L12PersistenceViolationCode,
} from '../l12/persistence/l12-persistence-violation-codes';
import {
  l12IsModeAllowedForSurface,
  l12CanonicalDisciplineForSurface,
} from '../l12/persistence/l12-materialization-policy';
import { validateL12PersistenceEnvelope } from '../l12/persistence/persistence-envelope.validator';
import { validateL12CurrentScenarioRecord } from '../l12/persistence/current-scenario-authority.validator';
import { validateL12HistoricalScenarioFact } from '../l12/persistence/historical-scenario-fact.validator';
import { validateL12EvidencePointer } from '../l12/persistence/evidence-pointer.validator';
import { validateL12MaterializationPolicy } from '../l12/persistence/materialization-policy.validator';

// Read services + validators
import {
  validateL12ReadRequest,
  validateL12GovernedReadResult,
  l12FreshnessForMode,
} from '../l12/read/l12-read-surface.validator';
import { buildL12CurrentScenarioReadServices } from '../l12/read/current-scenario-read.service';
import { buildL12HistoricalScenarioReadServices } from '../l12/read/historical-scenario-read.service';
import { buildL12ScenarioTriggerReadService } from '../l12/read/scenario-trigger-read.service';
import { buildL12ScenarioInvalidationReadService } from '../l12/read/scenario-invalidation-read.service';
import { buildL12PathConfidenceReadService } from '../l12/read/path-confidence-read.service';
import { buildL12ShiftConditionReadServices } from '../l12/read/scenario-shift-condition-read.service';
import { buildL12ScenarioEvidenceReadService } from '../l12/read/scenario-evidence-read.service';
import { buildL12ScenarioLineageReadService } from '../l12/read/scenario-lineage-read.service';
import { validateL12DownstreamConsumption } from '../l12/read/l12-downstream-consumption.validator';

// Replay
import {
  L12ReplayMode,
  L12ReplayStatus,
  runL12PersistenceReplay,
} from '../l12/replay/l12-persistence-replay-adapter';
import {
  validateL12ReplayRequest,
  validateL12ReplayResult,
} from '../l12/replay/l12-replay-result.validator';

// Repair
import {
  L12RepairReason,
  L12RepairStatus,
  runL12PersistenceRepair,
} from '../l12/repair/l12-persistence-repair-adapter';
import {
  validateL12RepairRequest,
  validateL12RepairResult,
} from '../l12/repair/l12-repair-request.validator';

// Audit
import {
  ALL_L12_PERSISTENCE_AUDIT_SUBJECT_CLASSES,
  L12PersistenceAuditSubjectClass,
  emitL12PersistenceAuditRecords,
  getL12PersistenceAuditLog,
  resetL12PersistenceAuditLog,
  severityForL12PersistenceViolationCode,
} from '../l12/constitution/l12-persistence-audit';

// Invariants
import { runAllL12_6Invariants } from '../l12/invariants/l12_6-invariants';

// ─────────────────────────────────────────────────────────────────────
//  Runner
// ─────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}

const POLICY = 'l12.6.test.v1';

bootstrapL12DurableSurfaceRegistry();
bootstrapL12ReadSurfaceRegistry();
resetL12PersistenceAuditLog();

// ─────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────

function makeEnvelope(overrides: Partial<L12PersistenceEnvelope> = {}): L12PersistenceEnvelope {
  return {
    persistence_envelope_id: 'env.1',
    durable_surface_id: L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
    storage_authority: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L12MutationDiscipline.CURRENT_UPSERT_WITH_SUPERSESSION,
    materialization_mode: L12MaterializationMode.LIVE_CURRENT,
    scenario_subject_id: 'subj.1',
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07T00:00:00Z',
    compute_run_id: 'run.1',
    source_run_mode: L12ScenarioRunMode.LIVE,
    current_authority_allowed: true,
    historical_append_allowed: false,
    evidence_archive_required: true,
    evidence_pack_ref: 'ev.1',
    input_snapshot_ref: 'snap.1',
    lineage_refs: ['lin.1'],
    l5_route_ref: 'l5.route.1',
    direct_write_attempted: false,
    policy_version: POLICY,
    replay_hash: 'h.1',
    ...overrides,
  };
}

function makeCurrentRecord(
  overrides: Partial<L12CurrentScenarioRecord> = {},
): L12CurrentScenarioRecord {
  return {
    current_record_id: 'cur.1',
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07',
    scenario_subject_id: 'subj.1',
    scenario_set_id: 'set.1',
    base_case_ref: 'scn.base',
    primary_scenario_ref: 'scn.primary',
    secondary_scenario_ref: 'scn.secondary',
    scenario_spread_class: L12ScenarioSpreadClass.MODERATE_PRIMARY,
    readiness_class: L12ScenarioOutputReadinessClass.CLEAN_EMISSION,
    path_confidence_profile_ref: 'pcp.1',
    trigger_profile_refs: ['trg.1'],
    invalidation_profile_refs: ['inv.1'],
    shift_condition_set_ref: 'shift.1',
    restriction_profile_ref: 'rest.1',
    evidence_pack_ref: 'ev.1',
    input_snapshot_ref: 'snap.1',
    compute_run_id: 'run.1',
    source_template_version: 'tmpl.v1',
    source_runtime_version: 'rt.v1',
    lineage_refs: ['lin.1'],
    replay_hash: 'h.1',
    created_at: '2026-05-07T00:00:00Z',
    policy_version: POLICY,
    ...overrides,
  };
}

function makeHistoricalFact(
  overrides: Partial<L12HistoricalScenarioFact> = {},
): L12HistoricalScenarioFact {
  return {
    fact_id: 'fact.1',
    fact_family: L12HistoricalFactFamily.TS_SCENARIO_FACT_V1,
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07',
    observed_at: '2026-05-07T00:00:00Z',
    materialized_at: '2026-05-07T00:01:00Z',
    scenario_subject_id: 'subj.1',
    scenario_set_id: 'set.1',
    scenario_ref: 'scn.1',
    fact_payload_ref: 'payload.1',
    compute_run_id: 'run.1',
    run_mode: L12ScenarioRunMode.LIVE,
    evidence_pack_ref: 'ev.1',
    input_snapshot_ref: 'snap.1',
    lineage_refs: ['lin.1'],
    replay_hash: 'h.1',
    policy_version: POLICY,
    ...overrides,
  };
}

function makeEvidencePointer(
  overrides: Partial<L12EvidencePointer> = {},
): L12EvidencePointer {
  const cls = overrides.evidence_class ?? L12EvidenceClass.SCENARIO_SET_EVIDENCE;
  const subj_kind = overrides.subject_kind ?? L12EvidenceSubjectKind.SCENARIO_SET;
  const subject_id = overrides.subject_id ?? 'set.1';
  const archive_uri =
    overrides.archive_uri ??
    buildL12EvidenceArchivePath({
      scope_type: 'instrument',
      scope_id: 'X',
      as_of: '2026-05-07',
      scenario_subject_id: 'subj.1',
      evidence_class: cls,
      subject_id,
      hash: 'abc123',
    });
  return {
    evidence_pointer_id: 'ev.ptr.1',
    evidence_class: cls,
    subject_kind: subj_kind,
    subject_id,
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07',
    scenario_subject_id: 'subj.1',
    archive_uri,
    manifest_ref: 'manifest.json',
    checksum: 'cksum-1',
    replay_safe_ref: 'replay.1',
    lineage_refs: ['lin.1'],
    created_by_run_id: 'run.1',
    policy_version: POLICY,
    replay_hash: 'h.1',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Band A — Durable surfaces and materialization
// ─────────────────────────────────────────────────────────────────────
console.log('\n── Band A: Durable surfaces and materialization ──');

assert(
  ALL_L12_DURABLE_SURFACE_IDS.length === 13,
  'A.1 13 durable surfaces enumerated',
);
assert(
  ALL_L12_DURABLE_SURFACE_IDS.every(id => isL12DurableSurfaceRegistered(id)),
  'A.2 every durable surface registered',
);
assert(
  listL12DurableSurfaceDescriptors().length === ALL_L12_DURABLE_SURFACE_IDS.length,
  'A.3 registry returns descriptor for each surface',
);
assert(
  isL12CurrentAuthoritySurface(L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY),
  'A.4 current scenario registry maps to Postgres current authority',
);
assert(
  L12_DURABLE_SURFACE_AUTHORITY[L12DurableSurfaceId.SCENARIO_TRANSITIONS] ===
    L12StorageAuthorityClass.CLICKHOUSE_HISTORICAL_APPEND,
  'A.5 scenario_transitions maps to ClickHouse historical append',
);
assert(
  isL12HistoricalAppendSurface(L12DurableSurfaceId.SCENARIO_FAILURES),
  'A.6 scenario_failures is historical append surface',
);
assert(
  l12CanonicalDisciplineForSurface(L12DurableSurfaceId.SCENARIO_FAILURES) ===
    L12MutationDiscipline.FAILURE_APPEND_ONLY,
  'A.7 failures use FAILURE_APPEND_ONLY discipline',
);
assert(
  l12CanonicalDisciplineForSurface(L12DurableSurfaceId.SCENARIO_TRANSITIONS) ===
    L12MutationDiscipline.TRANSITION_APPEND_ONLY,
  'A.8 transitions use TRANSITION_APPEND_ONLY discipline',
);

// L5 route required
const noL5 = validateL12PersistenceEnvelope(
  makeEnvelope({ l5_route_ref: '' }),
);
assert(
  !noL5.ok &&
    noL5.issues.some(i => i.code === L12PersistenceViolationCode.L12P_L5_ROUTE_MISSING),
  'A.9 envelope missing L5 route is rejected',
);

// Direct write attempt
const directWrite = validateL12PersistenceEnvelope(
  makeEnvelope({ direct_write_attempted: true as unknown as false }),
);
assert(
  !directWrite.ok &&
    directWrite.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_DIRECT_WRITE_ATTEMPT,
    ),
  'A.10 envelope with direct write attempt is rejected',
);

// Redis as authority
const redisAuth = validateL12PersistenceEnvelope(
  makeEnvelope({
    storage_authority: L12StorageAuthorityClass.REDIS_ACCELERATION_ONLY,
  }),
);
assert(
  !redisAuth.ok &&
    redisAuth.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_REDIS_USED_AS_AUTHORITY,
    ),
  'A.11 envelope claiming Redis as authority is rejected',
);

// Replay writes current rejected
const replayCurrent = validateL12PersistenceEnvelope(
  makeEnvelope({
    materialization_mode: L12MaterializationMode.REPLAY_HISTORICAL,
    source_run_mode: L12ScenarioRunMode.REPLAY,
  }),
);
assert(
  !replayCurrent.ok &&
    replayCurrent.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_REPLAY_WRITES_CURRENT,
    ),
  'A.12 replay-mode envelope writing current registry is rejected',
);

// Shadow writes current rejected (mode not allowed for current surface in policy)
const shadowCurrent = validateL12MaterializationPolicy({
  durable_surface_id: L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
  materialization_mode: L12MaterializationMode.SHADOW_EVALUATION,
  source_run_mode: L12ScenarioRunMode.SHADOW,
  current_authority_allowed: true,
  historical_append_allowed: false,
});
assert(
  !shadowCurrent.ok &&
    shadowCurrent.issues.some(
      i =>
        i.code ===
          L12PersistenceViolationCode.L12P_MATERIALIZATION_MODE_NOT_ALLOWED_FOR_SURFACE ||
        i.code ===
          L12PersistenceViolationCode.L12P_CURRENT_AUTHORITY_WRITTEN_BY_SHADOW,
    ),
  'A.13 shadow evaluation cannot write current authority',
);

// Backfill writes current rejected
const backfillCurrent = validateL12MaterializationPolicy({
  durable_surface_id: L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
  materialization_mode: L12MaterializationMode.BACKFILL_HISTORICAL,
  source_run_mode: L12ScenarioRunMode.BACKFILL,
  current_authority_allowed: true,
  historical_append_allowed: false,
});
assert(
  !backfillCurrent.ok &&
    backfillCurrent.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_BACKFILL_WRITES_CURRENT ||
        i.code ===
          L12PersistenceViolationCode.L12P_MATERIALIZATION_MODE_NOT_ALLOWED_FOR_SURFACE,
    ),
  'A.14 backfill cannot write current authority',
);

// Mode helpers
assert(
  l12ModeMayWriteCurrent(L12MaterializationMode.LIVE_CURRENT) === true,
  'A.15 LIVE_CURRENT mode may write current',
);
assert(
  l12ModeMayWriteCurrent(L12MaterializationMode.REPLAY_HISTORICAL) === false,
  'A.16 REPLAY_HISTORICAL mode may not write current',
);
assert(
  l12RunModeMayWriteCurrent(L12ScenarioRunMode.LIVE) &&
    !l12RunModeMayWriteCurrent(L12ScenarioRunMode.REPLAY),
  'A.17 LIVE run mode may write current; REPLAY may not',
);

// Mode allowed-for-surface table sanity
assert(
  l12IsModeAllowedForSurface(
    L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
    L12MaterializationMode.LIVE_CURRENT,
  ),
  'A.18 LIVE_CURRENT allowed on current scenario registry',
);
assert(
  !l12IsModeAllowedForSurface(
    L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
    L12MaterializationMode.SHADOW_EVALUATION,
  ),
  'A.19 SHADOW_EVALUATION not allowed on current scenario registry',
);

// Legal envelope
const legalEnv = validateL12PersistenceEnvelope(makeEnvelope());
assert(
  legalEnv.ok,
  `A.20 canonical legal envelope is accepted (issues=${legalEnv.issues.map(i => i.code).join(',')})`,
);

// ─────────────────────────────────────────────────────────────────────
//  Band B — Current, historical, and evidence law
// ─────────────────────────────────────────────────────────────────────
console.log('\n── Band B: Current, historical, and evidence law ──');

const okCurrent = validateL12CurrentScenarioRecord(makeCurrentRecord());
assert(
  okCurrent.ok,
  `B.1 canonical current record is accepted (issues=${okCurrent.issues.map(i => i.code).join(',')})`,
);

const noEv = validateL12CurrentScenarioRecord(
  makeCurrentRecord({ evidence_pack_ref: '' }),
);
assert(
  !noEv.ok &&
    noEv.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_CURRENT_RECORD_MISSING_EVIDENCE,
    ),
  'B.2 current record missing evidence is rejected',
);

const noTriggerRefs = validateL12CurrentScenarioRecord(
  makeCurrentRecord({ trigger_profile_refs: [] }),
);
assert(
  !noTriggerRefs.ok &&
    noTriggerRefs.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_CURRENT_RECORD_INCOMPLETE,
    ),
  'B.3 current record without trigger refs is rejected',
);

const supersedingNoReason = validateL12CurrentScenarioRecord(
  makeCurrentRecord({
    supersedes_current_record_id: 'cur.0',
    supersession_reason: undefined,
  }),
);
assert(
  !supersedingNoReason.ok &&
    supersedingNoReason.issues.some(
      i =>
        i.code ===
        L12PersistenceViolationCode.L12P_CURRENT_SUPERSESSION_REASON_MISSING,
    ),
  'B.4 superseding record without reason is rejected',
);

const reasonNoRef = validateL12CurrentScenarioRecord(
  makeCurrentRecord({
    supersession_reason: L12ScenarioSupersessionReason.NEW_LIVE_RUN,
  }),
);
assert(
  !reasonNoRef.ok &&
    reasonNoRef.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_CURRENT_SUPERSEDES_REF_MISSING,
    ),
  'B.5 supersession reason without ref is rejected',
);

const replayProducedCurrent = validateL12CurrentScenarioRecord(
  makeCurrentRecord(),
  { source_run_mode: L12ScenarioRunMode.REPLAY },
);
assert(
  !replayProducedCurrent.ok &&
    replayProducedCurrent.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_CURRENT_WRITE_FROM_NON_LIVE_RUN,
    ),
  'B.6 current record produced by replay run is rejected',
);

const blockedCurrent = validateL12CurrentScenarioRecord(
  makeCurrentRecord({
    readiness_class: L12ScenarioOutputReadinessClass.BLOCKED_BY_RESTRICTION,
  }),
);
assert(
  !blockedCurrent.ok &&
    blockedCurrent.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_CURRENT_RECORD_BLOCKED_READINESS,
    ),
  'B.7 blocked-readiness current record is rejected',
);

assert(
  isL12CleanCurrentReadiness(L12ScenarioOutputReadinessClass.CLEAN_EMISSION) &&
    isL12BlockedCurrentReadiness(
      L12ScenarioOutputReadinessClass.BLOCKED_BY_PREDICTION_THEATER,
    ),
  'B.8 readiness helpers classify clean vs blocked correctly',
);

// Historical
const okHist = validateL12HistoricalScenarioFact(makeHistoricalFact());
assert(okHist.ok, 'B.9 canonical historical fact accepted');

const histNoLineage = validateL12HistoricalScenarioFact(
  makeHistoricalFact({ lineage_refs: [] }),
);
assert(
  !histNoLineage.ok &&
    histNoLineage.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_HISTORICAL_APPEND_MISSING_LINEAGE,
    ),
  'B.10 historical fact without lineage is rejected',
);

const histWrongFamily = validateL12HistoricalScenarioFact(
  makeHistoricalFact({
    fact_family: L12HistoricalFactFamily.TS_SCENARIO_TRIGGER_V1,
    trigger_ref: undefined,
  }),
);
assert(
  !histWrongFamily.ok &&
    histWrongFamily.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_HISTORICAL_FAMILY_REF_MISMATCH,
    ),
  'B.11 trigger fact missing trigger_ref is rejected',
);

const histMutated = validateL12HistoricalScenarioFact(
  makeHistoricalFact({ fact_id: 'fact.dup' }),
  { known_fact_ids: new Set(['fact.dup']) },
);
assert(
  !histMutated.ok &&
    histMutated.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_HISTORICAL_FACT_MUTATED,
    ),
  'B.12 rewriting historical fact id without correction is rejected',
);

const histCorrection = validateL12HistoricalScenarioFact(
  makeHistoricalFact({
    fact_id: 'fact.new',
    correction_of_fact_id: 'fact.old',
    correction_reason: 'late data',
  }),
  { known_fact_ids: new Set(['fact.old']) },
);
assert(histCorrection.ok, 'B.13 correction-aware historical fact is accepted');

const histCorrectionNoReason = validateL12HistoricalScenarioFact(
  makeHistoricalFact({
    fact_id: 'fact.x',
    correction_of_fact_id: 'fact.old',
  }),
);
assert(
  !histCorrectionNoReason.ok &&
    histCorrectionNoReason.issues.some(
      i =>
        i.code ===
        L12PersistenceViolationCode.L12P_HISTORICAL_CORRECTION_MISSING_REASON,
    ),
  'B.14 correction without reason is rejected',
);

// Evidence
const goodEv = validateL12EvidencePointer(makeEvidencePointer());
assert(goodEv.ok, 'B.15 canonical evidence pointer accepted');

const badEvPath = validateL12EvidencePointer(
  makeEvidencePointer({ archive_uri: 'oops/bad/path.json' }),
);
assert(
  !badEvPath.ok &&
    badEvPath.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_EVIDENCE_PATH_NON_DETERMINISTIC,
    ),
  'B.16 non-deterministic evidence path is rejected',
);

const badEvKind = validateL12EvidencePointer(
  makeEvidencePointer({
    evidence_class: L12EvidenceClass.TRIGGER_EVIDENCE,
    subject_kind: L12EvidenceSubjectKind.SCENARIO_SET,
  }),
);
assert(
  !badEvKind.ok &&
    badEvKind.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_EVIDENCE_SUBJECT_KIND_MISMATCH,
    ),
  'B.17 evidence class/subject_kind mismatch is rejected',
);

const orphanEv = validateL12EvidencePointer(makeEvidencePointer(), {
  is_orphaned: true,
});
assert(
  !orphanEv.ok &&
    orphanEv.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_EVIDENCE_ORPHANED,
    ),
  'B.18 orphan evidence pointer is rejected',
);

const noChecksum = validateL12EvidencePointer(
  makeEvidencePointer({ checksum: '' }),
);
assert(
  !noChecksum.ok &&
    noChecksum.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_EVIDENCE_CHECKSUM_MISSING,
    ),
  'B.19 evidence pointer missing checksum is rejected',
);

const noReplaySafe = validateL12EvidencePointer(
  makeEvidencePointer({ replay_safe_ref: '' }),
);
assert(
  !noReplaySafe.ok &&
    noReplaySafe.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_EVIDENCE_REPLAY_REF_MISSING,
    ),
  'B.20 evidence pointer missing replay-safe ref is rejected',
);

assert(
  isL12EvidenceArchivePathLegal(
    buildL12EvidenceArchivePath({
      scope_type: 'i',
      scope_id: 'X',
      as_of: 'd',
      scenario_subject_id: 's',
      evidence_class: L12EvidenceClass.PATH_EVIDENCE,
      subject_id: 'p',
      hash: 'h',
    }),
  ),
  'B.21 buildL12EvidenceArchivePath produces a legal path',
);

// ─────────────────────────────────────────────────────────────────────
//  Band C — Read surfaces
// ─────────────────────────────────────────────────────────────────────
console.log('\n── Band C: Read surfaces ──');

assert(
  ALL_L12_READ_SURFACE_IDS.length === 12,
  'C.1 12 read surfaces enumerated',
);
assert(
  ALL_L12_READ_SURFACE_IDS.every(id => !!getL12ReadSurfaceDescriptor(id)),
  'C.2 every read surface registered',
);
assert(
  listL12ReadSurfaceDescriptors().length === ALL_L12_READ_SURFACE_IDS.length,
  'C.3 read surface registry returns descriptor for each surface',
);

function makeReadRequest(
  overrides: Partial<L12ReadRequest> = {},
): L12ReadRequest {
  return {
    read_request_id: 'req.1',
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
    ...overrides,
  };
}

assert(validateL12ReadRequest(makeReadRequest()).ok, 'C.4 legal L13 LIVE_CURRENT request accepted');

const wrongMode = validateL12ReadRequest(
  makeReadRequest({ read_mode: L12ReadMode.LIVE_HISTORICAL }),
);
assert(
  !wrongMode.ok &&
    wrongMode.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_READ_MODE_ILLEGAL,
    ),
  'C.5 illegal mode on current surface is rejected',
);

const noScope = validateL12ReadRequest(
  makeReadRequest({ scope_type: undefined, scope_id: undefined }),
);
assert(
  !noScope.ok &&
    noScope.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_READ_SCOPE_REQUIRED_BUT_MISSING,
    ),
  'C.6 missing scope is rejected for scope-required surface',
);

const noLineage = validateL12ReadRequest(
  makeReadRequest({ require_lineage: false }),
);
assert(
  !noLineage.ok &&
    noLineage.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_READ_LINEAGE_REQUIRED_BUT_MISSING,
    ),
  'C.7 lineage requirement omission is rejected',
);

const noReplayHash = validateL12ReadRequest(
  makeReadRequest({ require_replay_hash: false }),
);
assert(
  !noReplayHash.ok &&
    noReplayHash.issues.some(
      i =>
        i.code ===
        L12PersistenceViolationCode.L12P_READ_REPLAY_HASH_REQUIRED_BUT_MISSING,
    ),
  'C.8 replay hash requirement omission is rejected',
);

const wrongConsumer = validateL12ReadRequest(
  makeReadRequest({ consumer_class: L12ConsumerClass.REPLAY_SYSTEM }),
);
assert(
  !wrongConsumer.ok &&
    wrongConsumer.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_CONSUMER_NOT_ALLOWED,
    ),
  'C.9 replay system as scenario consumer rejected on current surface',
);

const blockedReadByL13 = validateL12ReadRequest(
  makeReadRequest({ allow_blocked_readiness: true }),
);
assert(
  !blockedReadByL13.ok &&
    blockedReadByL13.issues.some(
      i =>
        i.code ===
        L12PersistenceViolationCode.L12P_BLOCKED_READINESS_READ_BY_UNALLOWED_CONSUMER,
    ),
  'C.10 L13 cannot read blocked-readiness rows',
);

// Service flow: legal current scenario read returns governed result
const services = buildL12CurrentScenarioReadServices(({ scope_type, scope_id }) => {
  if (scope_type !== 'instrument' || scope_id !== 'X') return undefined;
  return makeCurrentRecord();
});
const serviceOutcome = services.currentScenarioSetByScope(makeReadRequest());
assert(
  serviceOutcome.ok && !!serviceOutcome.result,
  'C.11 current scenario read service produces governed result',
);
assert(
  serviceOutcome.result?.cache_authoritative === false,
  'C.12 governed read result never claims cache authority',
);
assert(
  serviceOutcome.result?.freshness_class === L12ReadFreshnessClass.LIVE,
  'C.13 LIVE_CURRENT mode → LIVE freshness',
);
assert(
  l12FreshnessForMode(L12ReadMode.EVIDENCE_VIEW) === L12ReadFreshnessClass.EVIDENCE,
  'C.14 EVIDENCE_VIEW mode → EVIDENCE freshness',
);

// Cache-authoritative true is rejected by the result validator
const fakeAuthoritative = validateL12GovernedReadResult({
  ...(serviceOutcome.result as L12GovernedReadResult<L12CurrentScenarioRecord>),
  cache_authoritative: true as unknown as false,
});
assert(
  !fakeAuthoritative.ok &&
    fakeAuthoritative.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_CACHE_USED_AS_AUTHORITY,
    ),
  'C.15 cache_authoritative=true read result is rejected',
);

// Other read services smoke
const histServices = buildL12HistoricalScenarioReadServices(() => [makeHistoricalFact()]);
const historyOutcome = histServices.scenarioHistoryByScopeWindow({
  read_request_id: 'req.hist',
  read_surface_id: L12ReadSurfaceId.SCENARIO_HISTORY_BY_SCOPE_WINDOW,
  read_mode: L12ReadMode.LIVE_HISTORICAL,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  scope_type: 'instrument',
  scope_id: 'X',
  require_evidence: false,
  require_lineage: true,
  require_replay_hash: true,
  require_restriction_profile: false,
  allow_blocked_readiness: false,
  allow_shadow_outputs: false,
  allow_replay_outputs: false,
  allow_repair_outputs: false,
  policy_version: POLICY,
});
assert(historyOutcome.ok, 'C.16 historical scenario read service legal request accepted');
assert(
  historyOutcome.result?.source_durable_surface_refs.includes(
    L12DurableSurfaceId.SCENARIO_TRANSITIONS,
  ) === true,
  'C.17 history result references SCENARIO_TRANSITIONS source surface',
);

const trgService = buildL12ScenarioTriggerReadService(({ scenario_id }) => ({
  scenario_id,
  trigger_profile_refs: ['trg.1'],
  evidence_refs: [],
  lineage_refs: ['lin.1'],
  replay_hash: 'h.1',
}));
const trgOutcome = trgService({
  read_request_id: 'req.trg',
  read_surface_id: L12ReadSurfaceId.CURRENT_TRIGGER_PROFILE_BY_SCENARIO_ID,
  read_mode: L12ReadMode.LIVE_CURRENT,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  scenario_id: 'scn.1',
  require_evidence: false,
  require_lineage: true,
  require_replay_hash: true,
  require_restriction_profile: false,
  allow_blocked_readiness: false,
  allow_shadow_outputs: false,
  allow_replay_outputs: false,
  allow_repair_outputs: false,
  policy_version: POLICY,
});
assert(trgOutcome.ok, 'C.18 trigger read service legal request accepted');

const invService = buildL12ScenarioInvalidationReadService(({ scenario_id }) => ({
  scenario_id,
  invalidation_profile_refs: ['inv.1'],
  evidence_refs: [],
  lineage_refs: ['lin.1'],
  replay_hash: 'h.1',
}));
assert(
  invService({
    read_request_id: 'req.inv',
    read_surface_id: L12ReadSurfaceId.CURRENT_INVALIDATION_PROFILE_BY_SCENARIO_ID,
    read_mode: L12ReadMode.LIVE_CURRENT,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    scenario_id: 'scn.1',
    require_evidence: false,
    require_lineage: true,
    require_replay_hash: true,
    require_restriction_profile: false,
    allow_blocked_readiness: false,
    allow_shadow_outputs: false,
    allow_replay_outputs: false,
    allow_repair_outputs: false,
    policy_version: POLICY,
  }).ok,
  'C.19 invalidation read service legal request accepted',
);

const pcpService = buildL12PathConfidenceReadService(({ scenario_set_id }) => ({
  scenario_set_id,
  path_confidence_profile_ref: 'pcp.1',
  evidence_refs: [],
  lineage_refs: ['lin.1'],
  replay_hash: 'h.1',
  restriction_profile_ref: 'rest.1',
}));
assert(
  pcpService({
    read_request_id: 'req.pcp',
    read_surface_id: L12ReadSurfaceId.CURRENT_PATH_CONFIDENCE_BY_SCENARIO_SET_ID,
    read_mode: L12ReadMode.LIVE_CURRENT,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    scenario_set_id: 'set.1',
    require_evidence: false,
    require_lineage: true,
    require_replay_hash: true,
    require_restriction_profile: true,
    allow_blocked_readiness: false,
    allow_shadow_outputs: false,
    allow_replay_outputs: false,
    allow_repair_outputs: false,
    policy_version: POLICY,
  }).ok,
  'C.20 path confidence read service legal request accepted',
);

const shiftServices = buildL12ShiftConditionReadServices(
  ({ scenario_set_id }) => ({
    scenario_set_id,
    shift_condition_set_ref: 'shift.1',
    evidence_refs: [],
    lineage_refs: ['lin.1'],
    replay_hash: 'h.1',
  }),
  ({ scenario_set_id }) => ({
    scenario_set_id,
    restriction_profile_ref: 'rest.1',
    evidence_refs: [],
    lineage_refs: ['lin.1'],
    replay_hash: 'h.1',
  }),
);
assert(
  shiftServices.currentShiftConditionsByScenarioSetId({
    read_request_id: 'req.shift',
    read_surface_id: L12ReadSurfaceId.CURRENT_SHIFT_CONDITIONS_BY_SCENARIO_SET_ID,
    read_mode: L12ReadMode.LIVE_CURRENT,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    scenario_set_id: 'set.1',
    require_evidence: false,
    require_lineage: true,
    require_replay_hash: true,
    require_restriction_profile: false,
    allow_blocked_readiness: false,
    allow_shadow_outputs: false,
    allow_replay_outputs: false,
    allow_repair_outputs: false,
    policy_version: POLICY,
  }).ok,
  'C.21 shift conditions read service legal request accepted',
);
assert(
  shiftServices.currentRestrictionsByScenarioSetId({
    read_request_id: 'req.rest',
    read_surface_id: L12ReadSurfaceId.CURRENT_RESTRICTIONS_BY_SCENARIO_SET_ID,
    read_mode: L12ReadMode.LIVE_CURRENT,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    scenario_set_id: 'set.1',
    require_evidence: false,
    require_lineage: true,
    require_replay_hash: true,
    require_restriction_profile: true,
    allow_blocked_readiness: false,
    allow_shadow_outputs: false,
    allow_replay_outputs: false,
    allow_repair_outputs: false,
    policy_version: POLICY,
  }).ok,
  'C.22 restrictions read service legal request accepted',
);

const evService = buildL12ScenarioEvidenceReadService(() => [makeEvidencePointer()]);
assert(
  evService({
    read_request_id: 'req.ev',
    read_surface_id: L12ReadSurfaceId.SCENARIO_EVIDENCE_BUNDLE,
    read_mode: L12ReadMode.EVIDENCE_VIEW,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    scenario_set_id: 'set.1',
    require_evidence: true,
    require_lineage: true,
    require_replay_hash: true,
    require_restriction_profile: false,
    allow_blocked_readiness: false,
    allow_shadow_outputs: false,
    allow_replay_outputs: false,
    allow_repair_outputs: false,
    policy_version: POLICY,
  }).ok,
  'C.23 evidence bundle read service legal request accepted',
);

const lineageService = buildL12ScenarioLineageReadService(({ compute_run_id }) => ({
  run_record: {
    run_record_id: 'rrec.1',
    compute_run_id,
    run_mode: L12ScenarioRunMode.LIVE,
    run_status: 'COMPLETED' as never,
    scenario_subject_id: 'subj.1',
    scope_type: 'instrument',
    scope_id: 'X',
    as_of: '2026-05-07',
    scenario_engine_version: 'r.v1',
    scenario_contract_version: 'c.v1',
    started_at: '2026-05-07T00:00:00Z',
    evidence_pack_refs: ['ev.1'],
    input_snapshot_refs: ['snap.1'],
    output_refs: ['out.1'],
    lineage_refs: ['lin.1'],
    replay_hash: 'h.1',
    policy_version: POLICY,
    created_at: '2026-05-07T00:00:00Z',
  },
  supersession_chain: [],
  correction_chain: [],
}));
assert(
  lineageService({
    read_request_id: 'req.lin',
    read_surface_id: L12ReadSurfaceId.SCENARIO_LINEAGE_BY_RUN_ID,
    read_mode: L12ReadMode.LINEAGE_VIEW,
    consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
    compute_run_id: 'run.1',
    require_evidence: false,
    require_lineage: true,
    require_replay_hash: true,
    require_restriction_profile: false,
    allow_blocked_readiness: false,
    allow_shadow_outputs: false,
    allow_replay_outputs: false,
    allow_repair_outputs: false,
    policy_version: POLICY,
  }).ok,
  'C.24 lineage read service legal request accepted',
);

// ─────────────────────────────────────────────────────────────────────
//  Band D — Replay and repair
// ─────────────────────────────────────────────────────────────────────
console.log('\n── Band D: Replay and repair ──');

const replayMatch = runL12PersistenceReplay(
  {
    replay_request_id: 'replay.req.1',
    source_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    replay_mode: L12ReplayMode.STRICT_HASH_REPLAY,
    requested_by: 'audit',
    reason_code: 'audit',
    require_hash_match: true,
    allow_historical_write: true,
    allow_current_write: false,
    policy_version: POLICY,
  },
  {
    source: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
      input_snapshot_present: true,
    },
    replay: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
      input_snapshot_present: true,
    },
    attempts_to_write_current: false,
    attempts_to_erase_trigger: false,
    attempts_to_erase_invalidation: false,
    attempts_to_upgrade_readiness: false,
    attempts_to_invent_evidence: false,
    ignores_template_version: false,
    source_template_version: 'v1',
    replay_template_version: 'v1',
    source_runtime_version: 'r1',
    replay_runtime_version: 'r1',
    historical_fact_refs: ['hist.1'],
    lineage_refs: ['lin.1'],
    replay_compute_run_id: 'run.replay',
  },
);
assert(replayMatch.replay_status === L12ReplayStatus.MATCH, 'D.1 replay hash match returns MATCH');
assert(
  replayMatch.scenario_set_hash_match &&
    replayMatch.evidence_pack_hash_match &&
    replayMatch.mismatch_reason_codes.length === 0,
  'D.2 replay match returns no mismatch reasons',
);
assert(
  validateL12ReplayResult(replayMatch).ok,
  'D.3 replay match result passes validator',
);

const replayMismatch = runL12PersistenceReplay(
  {
    replay_request_id: 'replay.req.2',
    source_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    replay_mode: L12ReplayMode.STRICT_HASH_REPLAY,
    requested_by: 'audit',
    reason_code: 'audit',
    require_hash_match: true,
    allow_historical_write: true,
    allow_current_write: false,
    policy_version: POLICY,
  },
  {
    source: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
      input_snapshot_present: true,
    },
    replay: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'XX', // drift
      input_snapshot_present: true,
    },
    attempts_to_write_current: false,
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
    lineage_refs: ['lin.1'],
    replay_compute_run_id: 'run.replay',
  },
);
assert(
  replayMismatch.replay_status !== L12ReplayStatus.MATCH &&
    replayMismatch.mismatch_reason_codes.length > 0,
  'D.4 replay drift surfaces non-MATCH status with reasons',
);
assert(
  validateL12ReplayResult(replayMismatch).ok,
  'D.5 mismatch result passes validator (mismatch surfaced, not hidden)',
);

// Forge: status=MATCH while mismatches present → validator must reject
const forged = {
  ...replayMismatch,
  replay_status: L12ReplayStatus.MATCH,
};
assert(
  !validateL12ReplayResult(forged).ok,
  'D.6 forged MATCH status with mismatches is rejected by validator',
);

// Replay write current is BLOCKED
const replayCurrentAttempt = runL12PersistenceReplay(
  {
    replay_request_id: 'replay.req.3',
    source_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    replay_mode: L12ReplayMode.STRICT_HASH_REPLAY,
    requested_by: 'audit',
    reason_code: 'audit',
    require_hash_match: true,
    allow_historical_write: true,
    allow_current_write: false,
    policy_version: POLICY,
  },
  {
    source: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
      input_snapshot_present: true,
    },
    replay: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
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
    lineage_refs: ['lin.1'],
    replay_compute_run_id: 'run.replay',
  },
);
assert(
  replayCurrentAttempt.replay_status === L12ReplayStatus.BLOCKED &&
    replayCurrentAttempt.mismatch_reason_codes.includes('REPLAY_WRITES_CURRENT'),
  'D.7 replay attempting current write is BLOCKED',
);

// Replay request validator
assert(
  validateL12ReplayRequest({
    replay_request_id: 'r.req',
    source_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    replay_mode: L12ReplayMode.STRICT_HASH_REPLAY,
    requested_by: 'audit',
    reason_code: 'audit',
    require_hash_match: true,
    allow_historical_write: true,
    allow_current_write: false,
    policy_version: POLICY,
  }).ok,
  'D.8 legal replay request accepted',
);
assert(
  !validateL12ReplayRequest({
    replay_request_id: 'r.req.bad',
    source_compute_run_id: '',
    scenario_set_id: 'set.1',
    replay_mode: L12ReplayMode.STRICT_HASH_REPLAY,
    requested_by: 'audit',
    reason_code: 'audit',
    require_hash_match: true,
    allow_historical_write: true,
    allow_current_write: false,
    policy_version: POLICY,
  }).ok,
  'D.9 replay request missing source run id rejected',
);

// Repair adapter — happy path
const repairOk = runL12PersistenceRepair(
  {
    repair_request_id: 'repair.req.1',
    parent_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    repair_reason: L12RepairReason.LATE_DATA,
    changed_input_refs: ['inp.1'],
    correction_lineage_refs: ['lin.parent'],
    requested_by: 'gov',
    allow_current_supersession: true,
    allow_historical_correction: true,
    policy_version: POLICY,
  },
  {
    repair_compute_run_id: 'run.repair',
    removed_trigger_refs: [],
    removed_invalidation_refs: [],
    parent_primary_confidence: 0.5,
    repair_primary_confidence: 0.5,
    added_evidence_refs: ['ev.new'],
    invented_evidence_refs: [],
    mutates_parent_run: false,
    masquerades_as_live: false,
    bypasses_supersession: false,
    superseded_current_record_refs: ['cur.0'],
    new_current_record_refs: ['cur.1'],
    corrected_historical_fact_refs: [],
    new_evidence_pack_refs: ['ev.new'],
    lineage_refs: ['lin.repair'],
  },
);
assert(repairOk.repair_status === L12RepairStatus.COMPLETED, 'D.10 legal repair COMPLETED');
assert(
  validateL12RepairResult(repairOk).ok,
  'D.11 legal repair result passes validator',
);

// Repair without reason
assert(
  !validateL12RepairRequest({
    repair_request_id: 'repair.bad',
    parent_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    repair_reason: undefined as unknown as L12RepairReason,
    changed_input_refs: [],
    correction_lineage_refs: ['lin'],
    requested_by: 'gov',
    allow_current_supersession: true,
    allow_historical_correction: true,
    policy_version: POLICY,
  }).ok,
  'D.12 repair without reason rejected by request validator',
);

// Repair without parent
assert(
  !validateL12RepairRequest({
    repair_request_id: 'repair.bad2',
    parent_compute_run_id: '',
    scenario_set_id: 'set.1',
    repair_reason: L12RepairReason.LATE_DATA,
    changed_input_refs: [],
    correction_lineage_refs: ['lin'],
    requested_by: 'gov',
    allow_current_supersession: true,
    allow_historical_correction: true,
    policy_version: POLICY,
  }).ok,
  'D.13 repair without parent rejected',
);

// Repair mutating prior run
const repairMutate = runL12PersistenceRepair(
  {
    repair_request_id: 'repair.req.2',
    parent_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    repair_reason: L12RepairReason.LATE_DATA,
    changed_input_refs: ['inp.1'],
    correction_lineage_refs: ['lin.parent'],
    requested_by: 'gov',
    allow_current_supersession: true,
    allow_historical_correction: true,
    policy_version: POLICY,
  },
  {
    repair_compute_run_id: 'run.parent', // reused
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
    lineage_refs: ['lin'],
  },
);
assert(
  repairMutate.repair_status === L12RepairStatus.REJECTED &&
    repairMutate.repair_change_summary_codes.includes('REPAIR_MUTATES_PRIOR_RUN') &&
    repairMutate.repair_change_summary_codes.includes('REPAIR_REUSES_PARENT_COMPUTE_RUN_ID'),
  'D.14 repair mutating prior run is REJECTED',
);

// Repair removing trigger without evidence correction reason
const repairRemoveTrigger = runL12PersistenceRepair(
  {
    repair_request_id: 'repair.req.3',
    parent_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    repair_reason: L12RepairReason.LATE_DATA,
    changed_input_refs: ['inp.1'],
    correction_lineage_refs: ['lin.parent'],
    requested_by: 'gov',
    allow_current_supersession: true,
    allow_historical_correction: true,
    policy_version: POLICY,
  },
  {
    repair_compute_run_id: 'run.repair',
    removed_trigger_refs: ['trg.1'],
    removed_invalidation_refs: [],
    parent_primary_confidence: 0.5,
    repair_primary_confidence: 0.5,
    added_evidence_refs: [],
    invented_evidence_refs: [],
    mutates_parent_run: false,
    masquerades_as_live: false,
    bypasses_supersession: false,
    superseded_current_record_refs: [],
    new_current_record_refs: [],
    corrected_historical_fact_refs: [],
    new_evidence_pack_refs: [],
    lineage_refs: ['lin.repair'],
  },
);
assert(
  repairRemoveTrigger.repair_change_summary_codes.includes(
    'REPAIR_REMOVED_TRIGGER_WITHOUT_EVIDENCE',
  ),
  'D.15 repair removing trigger without evidence-correction reason flagged',
);

// Repair upgrading confidence without evidence
const repairUpgrade = runL12PersistenceRepair(
  {
    repair_request_id: 'repair.req.4',
    parent_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    repair_reason: L12RepairReason.LATE_DATA,
    changed_input_refs: ['inp.1'],
    correction_lineage_refs: ['lin.parent'],
    requested_by: 'gov',
    allow_current_supersession: true,
    allow_historical_correction: true,
    policy_version: POLICY,
  },
  {
    repair_compute_run_id: 'run.repair',
    removed_trigger_refs: [],
    removed_invalidation_refs: [],
    parent_primary_confidence: 0.4,
    repair_primary_confidence: 0.7,
    added_evidence_refs: [],
    invented_evidence_refs: [],
    mutates_parent_run: false,
    masquerades_as_live: false,
    bypasses_supersession: false,
    superseded_current_record_refs: [],
    new_current_record_refs: [],
    corrected_historical_fact_refs: [],
    new_evidence_pack_refs: [],
    lineage_refs: ['lin.repair'],
  },
);
assert(
  repairUpgrade.repair_change_summary_codes.includes(
    'REPAIR_UPGRADED_CONFIDENCE_WITHOUT_EVIDENCE',
  ),
  'D.16 repair upgrading confidence without evidence flagged',
);

// ─────────────────────────────────────────────────────────────────────
//  Band E — Downstream integration
// ─────────────────────────────────────────────────────────────────────
console.log('\n── Band E: Downstream integration ──');

const legalDownstream = validateL12DownstreamConsumption({
  downstream_request_id: 'down.1',
  consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  requested_use: L12ScenarioDownstreamUse.SCENARIO_WEIGHTING,
  requested_surfaces: [
    L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE,
    L12ReadSurfaceId.CURRENT_PATH_CONFIDENCE_BY_SCENARIO_SET_ID,
  ],
  attempts_lower_layer_rebuild: false,
  lower_layer_refs_requested: [],
  scenario_set_ref: 'set.1',
  scenario_id_refs: ['scn.1'],
  requires_evidence: true,
  requires_lineage: true,
  honors_restriction_profile: true,
  honors_invalidation: true,
  honors_path_confidence: true,
  honors_readiness: true,
  declared_use_text: 'L13 will use scenario set as a weighting input only',
  policy_version: POLICY,
});
assert(legalDownstream.ok, 'E.1 legal L13 downstream consumption accepted');

const rebuildAttempt = validateL12DownstreamConsumption({
  downstream_request_id: 'down.bad.1',
  consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  requested_use: L12ScenarioDownstreamUse.SCENARIO_WEIGHTING,
  requested_surfaces: [],
  attempts_lower_layer_rebuild: true,
  lower_layer_refs_requested: ['l11.score.X', 'l9.sequence.Y'],
  scenario_set_ref: 'set.1',
  requires_evidence: true,
  requires_lineage: true,
  honors_restriction_profile: true,
  honors_invalidation: true,
  honors_path_confidence: true,
  honors_readiness: true,
  declared_use_text: 'reconstruct scenarios from L11 scores',
  policy_version: POLICY,
});
assert(
  !rebuildAttempt.ok &&
    rebuildAttempt.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_DOWNSTREAM_REBUILD_ATTEMPT,
    ) &&
    rebuildAttempt.issues.some(
      i =>
        i.code ===
        L12PersistenceViolationCode.L12P_DOWNSTREAM_LOWER_LAYER_REF_REQUESTED,
    ),
  'E.2 lower-layer rebuild attempt is rejected',
);

const restrictionBypass = validateL12DownstreamConsumption({
  downstream_request_id: 'down.bad.2',
  consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  requested_use: L12ScenarioDownstreamUse.SCENARIO_WEIGHTING,
  requested_surfaces: [L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE],
  attempts_lower_layer_rebuild: false,
  lower_layer_refs_requested: [],
  scenario_set_ref: 'set.1',
  requires_evidence: true,
  requires_lineage: true,
  honors_restriction_profile: false,
  honors_invalidation: true,
  honors_path_confidence: true,
  honors_readiness: true,
  declared_use_text: 'use scenarios',
  policy_version: POLICY,
});
assert(
  !restrictionBypass.ok &&
    restrictionBypass.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_DOWNSTREAM_RESTRICTION_BYPASS,
    ),
  'E.3 restriction bypass rejected',
);

const recommendation = validateL12DownstreamConsumption({
  downstream_request_id: 'down.bad.3',
  consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  requested_use: L12ScenarioDownstreamUse.JUDGMENT_SUPPORT,
  requested_surfaces: [L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE],
  attempts_lower_layer_rebuild: false,
  lower_layer_refs_requested: [],
  scenario_set_ref: 'set.1',
  requires_evidence: true,
  requires_lineage: true,
  honors_restriction_profile: true,
  honors_invalidation: true,
  honors_path_confidence: true,
  honors_readiness: true,
  declared_use_text: 'tell user to BUY this asset',
  policy_version: POLICY,
});
assert(
  !recommendation.ok &&
    recommendation.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_SCENARIO_AS_RECOMMENDATION,
    ),
  'E.4 recommendation framing rejected',
);

const finalJudgment = validateL12DownstreamConsumption({
  downstream_request_id: 'down.bad.4',
  consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  requested_use: L12ScenarioDownstreamUse.JUDGMENT_SUPPORT,
  requested_surfaces: [L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE],
  attempts_lower_layer_rebuild: false,
  lower_layer_refs_requested: [],
  scenario_set_ref: 'set.1',
  requires_evidence: true,
  requires_lineage: true,
  honors_restriction_profile: true,
  honors_invalidation: true,
  honors_path_confidence: true,
  honors_readiness: true,
  declared_use_text: 'present scenario as final judgment',
  policy_version: POLICY,
});
assert(
  !finalJudgment.ok &&
    finalJudgment.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_SCENARIO_AS_FINAL_JUDGMENT,
    ),
  'E.5 final-judgment framing rejected',
);

const ignoreInvalidation = validateL12DownstreamConsumption({
  downstream_request_id: 'down.bad.5',
  consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  requested_use: L12ScenarioDownstreamUse.SCENARIO_WEIGHTING,
  requested_surfaces: [L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE],
  attempts_lower_layer_rebuild: false,
  lower_layer_refs_requested: [],
  scenario_set_ref: 'set.1',
  requires_evidence: true,
  requires_lineage: true,
  honors_restriction_profile: true,
  honors_invalidation: false,
  honors_path_confidence: true,
  honors_readiness: true,
  declared_use_text: 'use scenarios',
  policy_version: POLICY,
});
assert(
  !ignoreInvalidation.ok &&
    ignoreInvalidation.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_DOWNSTREAM_IGNORES_INVALIDATION,
    ),
  'E.6 invalidation omission rejected',
);

const ignoreConfidence = validateL12DownstreamConsumption({
  downstream_request_id: 'down.bad.6',
  consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  requested_use: L12ScenarioDownstreamUse.SCENARIO_WEIGHTING,
  requested_surfaces: [L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE],
  attempts_lower_layer_rebuild: false,
  lower_layer_refs_requested: [],
  scenario_set_ref: 'set.1',
  requires_evidence: true,
  requires_lineage: true,
  honors_restriction_profile: true,
  honors_invalidation: true,
  honors_path_confidence: false,
  honors_readiness: true,
  declared_use_text: 'use scenarios',
  policy_version: POLICY,
});
assert(
  !ignoreConfidence.ok &&
    ignoreConfidence.issues.some(
      i =>
        i.code === L12PersistenceViolationCode.L12P_DOWNSTREAM_IGNORES_CONFIDENCE,
    ),
  'E.7 confidence omission rejected',
);

const ignoreReadiness = validateL12DownstreamConsumption({
  downstream_request_id: 'down.bad.7',
  consumer_layer: L12DownstreamLayer.L13_AI_JUDGMENT_EXPLANATION,
  consumer_class: L12ConsumerClass.L13_SCENARIO_CONSUMER,
  requested_use: L12ScenarioDownstreamUse.SCENARIO_WEIGHTING,
  requested_surfaces: [L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE],
  attempts_lower_layer_rebuild: false,
  lower_layer_refs_requested: [],
  scenario_set_ref: 'set.1',
  requires_evidence: true,
  requires_lineage: true,
  honors_restriction_profile: true,
  honors_invalidation: true,
  honors_path_confidence: true,
  honors_readiness: false,
  declared_use_text: 'use scenarios',
  policy_version: POLICY,
});
assert(
  !ignoreReadiness.ok &&
    ignoreReadiness.issues.some(
      i => i.code === L12PersistenceViolationCode.L12P_DOWNSTREAM_IGNORES_READINESS,
    ),
  'E.8 readiness omission rejected',
);

// ─────────────────────────────────────────────────────────────────────
//  Band F — Audit and invariants
// ─────────────────────────────────────────────────────────────────────
console.log('\n── Band F: Audit and invariants ──');

resetL12PersistenceAuditLog();
const issues = validateL12PersistenceEnvelope(
  makeEnvelope({ l5_route_ref: '', direct_write_attempted: true as unknown as false }),
).issues;
const records = emitL12PersistenceAuditRecords(
  L12PersistenceAuditSubjectClass.PERSISTENCE_ENVELOPE,
  'cert.test',
  issues,
);
assert(records.length === issues.length, 'F.1 audit emits one record per issue');
assert(
  records.every(r => r.subject_class === L12PersistenceAuditSubjectClass.PERSISTENCE_ENVELOPE),
  'F.2 emitted audit records carry correct subject class',
);
assert(
  records.some(r => r.severity === 'CRITICAL') && records.some(r => r.violation_code),
  'F.3 audit records contain at least one CRITICAL severity for L5/direct write',
);
assert(
  getL12PersistenceAuditLog().length === records.length,
  'F.4 audit log accumulates emitted records deterministically',
);
assert(
  severityForL12PersistenceViolationCode(
    L12PersistenceViolationCode.L12P_DOWNSTREAM_REBUILD_ATTEMPT,
  ) === 'CRITICAL',
  'F.5 downstream rebuild attempt is CRITICAL severity',
);
assert(
  severityForL12PersistenceViolationCode(
    L12PersistenceViolationCode.L12P_REPAIR_PARENT_MISSING,
  ) === 'ERROR',
  'F.6 repair parent missing is ERROR severity',
);
assert(
  severityForL12PersistenceViolationCode(
    L12PersistenceViolationCode.L12P_READ_FRESHNESS_MISMATCH,
  ) === 'WARNING',
  'F.7 freshness mismatch is WARNING severity',
);
assert(
  ALL_L12_PERSISTENCE_AUDIT_SUBJECT_CLASSES.length === 12,
  'F.8 12 audit subject classes enumerated',
);

const invariantResults = runAllL12_6Invariants();
assert(
  invariantResults.length === 8,
  'F.9 8 L12.6 invariants reported (INV-12.6-A..H)',
);
for (const r of invariantResults) {
  assert(r.holds, `F.10 ${r.id} holds: ${r.evidence}`);
}

// Replay determinism: same inputs → identical replay hash
const replayDet1 = runL12PersistenceReplay(
  {
    replay_request_id: 'det.1',
    source_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    replay_mode: L12ReplayMode.STRICT_HASH_REPLAY,
    requested_by: 'audit',
    reason_code: 'audit',
    require_hash_match: true,
    allow_historical_write: true,
    allow_current_write: false,
    policy_version: POLICY,
  },
  {
    source: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
      input_snapshot_present: true,
    },
    replay: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
      input_snapshot_present: true,
    },
    attempts_to_write_current: false,
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
    lineage_refs: ['lin.1'],
    replay_compute_run_id: 'run.replay',
  },
);
const replayDet2 = runL12PersistenceReplay(
  {
    replay_request_id: 'det.1',
    source_compute_run_id: 'run.parent',
    scenario_set_id: 'set.1',
    replay_mode: L12ReplayMode.STRICT_HASH_REPLAY,
    requested_by: 'audit',
    reason_code: 'audit',
    require_hash_match: true,
    allow_historical_write: true,
    allow_current_write: false,
    policy_version: POLICY,
  },
  {
    source: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
      input_snapshot_present: true,
    },
    replay: {
      scenario_set_hash: 'A',
      trigger_set_hash: 'B',
      invalidation_set_hash: 'C',
      confidence_hash: 'D',
      shift_condition_hash: 'E',
      evidence_pack_hash: 'F',
      input_snapshot_present: true,
    },
    attempts_to_write_current: false,
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
    lineage_refs: ['lin.1'],
    replay_compute_run_id: 'run.replay',
  },
);
assert(
  replayDet1.replay_hash === replayDet2.replay_hash,
  'F.11 replay result hash is deterministic across identical inputs',
);

// ─────────────────────────────────────────────────────────────────────
//  Lint: ensure all imports used
// ─────────────────────────────────────────────────────────────────────
void L12_DURABLE_SURFACE_AUTHORITY;
void getL12DurableSurfaceDescriptor;

// ─────────────────────────────────────────────────────────────────────
//  Summary
// ─────────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════════════`);
console.log(`L12.6 Persistence Test Suite`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n✓ ALL L12.6 PERSISTENCE ASSERTIONS PASSED`);
