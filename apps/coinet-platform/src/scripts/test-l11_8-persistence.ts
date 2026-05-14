/**
 * L11.8 — Persistence, Read, Replay, Repair, and Downstream
 * Certification Test Suite (§11.8.21)
 *
 * 5 Bands:
 *   A — Durable surfaces and L5 persistence
 *   B — Current and historical authority
 *   C — Evidence storage
 *   D — Read surfaces and downstream consumption
 *   E — Replay, repair, audit, and invariants
 */

import {
  L11ScoreFamily,
  L11ScoreBand,

  // L11.8 contracts
  L11DurableSurfaceId,
  ALL_L11_DURABLE_SURFACE_IDS,
  L11StorageAuthorityClass,
  ALL_L11_STORAGE_AUTHORITY_CLASSES,
  L11MutationDiscipline,
  ALL_L11_MUTATION_DISCIPLINES,
  L11MaterializationMode,
  ALL_L11_MATERIALIZATION_MODES,
  L11PersistenceClass,
  ALL_L11_PERSISTENCE_CLASSES,
  L11_PERSISTENCE_CLASS_FOR_SURFACE,
  isL11PersistenceClassMatchingSurface,
  L11_PERSISTENCE_POLICY_VERSION,
  L11PersistenceEnvelope,

  L11CurrentScoreRecord,
  L11ScoreSupersessionReason,
  ALL_L11_SCORE_SUPERSESSION_REASONS,
  L11_CURRENT_AUTHORITY_POLICY_VERSION,
  isL11MaterializationModeAuthorizedForCurrent,
  l11SupersessionReasonRequiresPriorRef,

  L11HistoricalScoreFact,
  L11HistoricalFactFamily,
  ALL_L11_HISTORICAL_FACT_FAMILIES,
  L11_HISTORICAL_FACT_POLICY_VERSION,

  L11EvidencePointer,
  L11EvidenceClass,
  ALL_L11_EVIDENCE_CLASSES,
  L11EvidenceSubjectKind,
  ALL_L11_EVIDENCE_SUBJECT_KINDS,
  L11_EVIDENCE_CLASS_TO_SUBJECT_KIND,
  L11_EVIDENCE_POLICY_VERSION,
  buildL11DeterministicEvidencePath,
  isL11DeterministicPathValid,

  L11ReadRequest,
  L11ReadSurfaceId,
  ALL_L11_READ_SURFACE_IDS,
  L11ReadMode,
  ALL_L11_READ_MODES,
  L11ConsumerClass,
  ALL_L11_CONSUMER_CLASSES,
  L11_READ_SURFACE_POLICY_VERSION,

  L11ScoreRunMode,
  ALL_L11_SCORE_RUN_MODES,
  L11ScoreRunStatus,
  L11ScoreFailureStage,
  L11ScoreRecoveryAction,
  L11_SCORE_RUN_POLICY_VERSION,

  L11DownstreamConsumptionRequest,
  L11DownstreamScoreUse,
  ALL_L11_DOWNSTREAM_SCORE_USES,
  L11_DOWNSTREAM_POLICY_VERSION,
  L11_RECOMPUTE_ALLOWED_CONSUMERS,
  L11_RECOMPUTE_ALLOWED_READ_MODES,
  L11_SCORING_SENSITIVE_USES,
} from '../l11/contracts';

import {
  L11_DURABLE_SURFACE_REGISTRY,
  L11_READ_SURFACE_REGISTRY,
  getL11DurableSurfaceDescriptor,
  getL11ReadSurfaceDescriptor,
  buildL11DurableSurfaceRegistryReport,
  buildL11ReadSurfaceRegistryReport,
} from '../l11/registry';

import {
  L11PersistenceViolationCode,
  ALL_L11_PERSISTENCE_VIOLATION_CODES,
  validateL11PersistenceEnvelope,
  validateL11CurrentScoreRecord,
  validateL11HistoricalScoreFact,
  validateL11EvidencePointer,
  evaluateL11MaterializationPolicy,
  isL11SurfacePostgresAuthority,
  isL11SurfaceCurrentAuthority,
  isL11SurfaceAppendOnly,
  isL11ReplayWritingCurrent,
  isL11FailureWrittenAsScoreState,
} from '../l11/persistence';

import {
  validateL11ReadRequest,
  validateL11DownstreamConsumption,
  admitL11Read,
  admitL11CurrentScoreSnapshotRead,
  admitL11CurrentScoreFamilyRead,
  admitL11HistoricalScoreRead,
  admitL11AttributionRead,
  admitL11ComponentBreakdownRead,
  admitL11ScoreModifiersRead,
  admitL11MissingDataProfileRead,
  admitL11CalibrationHooksRead,
  admitL11CalibrationTargetRead,
  admitL11DriftReportRead,
  admitL11EvidenceBundleRead,
  admitL11RunLineageRead,
} from '../l11/read';

import {
  L11ReplayStatus,
  ALL_L11_REPLAY_STATUSES,
  L11ReplayDifferenceKind,
  L11_REPLAY_POLICY_VERSION,
  runL11Replay,
  validateL11ReplayResult,
} from '../l11/replay';

import {
  L11RepairTrigger,
  ALL_L11_REPAIR_TRIGGERS,
  L11_REPAIR_POLICY_VERSION,
  L11RepairRequest,
  admitL11RepairRequest,
  validateL11RepairRequest,
} from '../l11/repair';

import {
  L11PersistenceAuditSubjectClass,
  ALL_L11_PERSISTENCE_AUDIT_SUBJECT_CLASSES,
  L11PersistenceAuditSeverity,
  severityForL11PersistenceCode,
  makeL11PersistenceAuditRecord,
  emitL11PersistenceAuditRecords,
  emitL11PersistenceAuditBatch,
} from '../l11/constitution/l11-persistence-audit';

import {
  invariantA_l5OnlyPersistence,
  invariantB_currentAuthority,
  invariantC_historicalAppendSafety,
  invariantD_evidenceIntegrity,
  invariantE_governedReadSurfaces,
  invariantF_laterLayerNoRebuild,
  invariantG_replayAndRepairSafety,
  invariantH_scoreObjectCompleteness,
  runAllL11_8Invariants,
} from '../l11/invariants/l11_8-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

const T0 = '2026-05-05T00:00:00Z';

// ─────────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────────

function buildEnvelope(overrides: Partial<L11PersistenceEnvelope<unknown>> = {}):
  L11PersistenceEnvelope<unknown> {
  const base: L11PersistenceEnvelope<unknown> = {
    envelope_id: 'l11p.env.001',
    surface_id: L11DurableSurfaceId.CURRENT_SCORE_REGISTRY,
    persistence_class: L11PersistenceClass.CURRENT_SCORE,
    materialization_mode: L11MaterializationMode.LIVE_CURRENT,
    score_family: L11ScoreFamily.OPPORTUNITY,
    score_id: 'l11.score.opp.001',
    run_id: 'run.l11.001',
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: T0,
    payload: { final_score: 75 },
    lineage_refs: ['l11.lineage.opp.001'],
    evidence_refs: ['l11.evidence.opp.001'],
    input_snapshot_ref: 'l11.snapshot.opp.001',
    replay_hash: 'l11.h.opp.001',
    policy_version: L11_PERSISTENCE_POLICY_VERSION,
    l5_route_ref: 'l5.route.postgres.current_score',
    direct_store_write_attempted: false,
  };
  return { ...base, ...overrides };
}

function buildCurrentRecord(overrides: Partial<L11CurrentScoreRecord> = {}):
  L11CurrentScoreRecord {
  const base: L11CurrentScoreRecord = {
    current_record_id: 'l11p.cur.001',
    score_id: 'l11.score.opp.001',
    score_family: L11ScoreFamily.OPPORTUNITY,
    score_version: 'v1.0.0',
    formula_id: 'l11.formula.opp.v1',
    formula_version: 'v1.0.0',
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: T0,
    raw_score: 75,
    modified_score: 75,
    final_score: 75,
    score_band: L11ScoreBand.HIGH,
    attribution_ref: 'l11.attr.opp.001',
    component_breakdown_ref: 'l11.comp.opp.001',
    missing_data_profile_ref: 'l11.missing.opp.001',
    modifier_profile_refs: ['l11.mod.opp.001'],
    calibration_hook_refs: ['l11.cal.opp.001'],
    drift_report_refs: [],
    restriction_profile_ref: 'l11.restriction.opp.001',
    run_id: 'run.l11.001',
    replay_hash: 'l11.h.opp.001',
    lineage_refs: ['l11.lineage.opp.001'],
    evidence_refs: ['l11.evidence.opp.001'],
    materialization_mode: L11MaterializationMode.LIVE_CURRENT,
    policy_version: L11_CURRENT_AUTHORITY_POLICY_VERSION,
  };
  return { ...base, ...overrides };
}

function buildHistoricalFact(overrides: Partial<L11HistoricalScoreFact> = {}):
  L11HistoricalScoreFact {
  const base: L11HistoricalScoreFact = {
    historical_fact_id: 'l11p.hist.001',
    fact_family: L11HistoricalFactFamily.TS_SCORE_FACT_V1,
    score_id: 'l11.score.opp.001',
    score_family: L11ScoreFamily.OPPORTUNITY,
    score_version: 'v1.0.0',
    formula_id: 'l11.formula.opp.v1',
    formula_version: 'v1.0.0',
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: T0,
    materialized_at: T0,
    raw_score: 75,
    modified_score: 75,
    final_score: 75,
    score_band: L11ScoreBand.HIGH,
    component_fact_refs: ['l11.comp.fact.001'],
    attribution_fact_ref: 'l11.attr.fact.001',
    modifier_fact_refs: [],
    missing_data_fact_ref: 'l11.missing.fact.001',
    calibration_fact_refs: [],
    drift_fact_refs: [],
    run_id: 'run.l11.001',
    replay_hash: 'l11.h.opp.001',
    lineage_refs: ['l11.lineage.opp.001'],
    evidence_refs: ['l11.evidence.opp.001'],
    policy_version: L11_HISTORICAL_FACT_POLICY_VERSION,
  };
  return { ...base, ...overrides };
}

function buildEvidencePointer(overrides: Partial<L11EvidencePointer> = {}):
  L11EvidencePointer {
  const base: L11EvidencePointer = {
    evidence_pointer_id: 'l11p.evid.001',
    evidence_class: L11EvidenceClass.SCORE_EVIDENCE_PACK,
    score_id: 'l11.score.opp.001',
    score_family: L11ScoreFamily.OPPORTUNITY,
    run_id: 'run.l11.001',
    subject_kind: L11EvidenceSubjectKind.SCORE_OUTPUT,
    subject_id: 'l11.score.opp.001',
    archive_uri: 's3://l5-archive/l11/evidence/opp/001.json',
    manifest_ref: 'l11.manifest.opp.001',
    checksum: 'sha256:abc',
    replay_safe_ref: 'l11.replay.opp.001',
    deterministic_path: buildL11DeterministicEvidencePath({
      evidence_class: L11EvidenceClass.SCORE_EVIDENCE_PACK,
      score_family: L11ScoreFamily.OPPORTUNITY,
      scope_type: 'ASSET', scope_id: 'asset_btc',
      as_of: '2026_05_05T00_00_00Z', subject_id: 'l11_score_opp_001',
    }),
    created_at: T0,
    policy_version: L11_EVIDENCE_POLICY_VERSION,
  };
  return { ...base, ...overrides };
}

function buildReadRequest(overrides: Partial<L11ReadRequest> = {}): L11ReadRequest {
  const base: L11ReadRequest = {
    read_request_id: 'l11p.read.001',
    read_surface_id: L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE,
    read_mode: L11ReadMode.LIVE_CURRENT,
    consumer_class: L11ConsumerClass.L12_SCENARIO_ENGINE,
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    require_current_authority: true,
    allow_cache_acceleration: true,
    require_lineage: true,
    require_evidence: false,
    require_replay_hash: true,
    policy_version: L11_READ_SURFACE_POLICY_VERSION,
  };
  return { ...base, ...overrides };
}

function buildDownstream(overrides: Partial<L11DownstreamConsumptionRequest> = {}):
  L11DownstreamConsumptionRequest {
  const base: L11DownstreamConsumptionRequest = {
    request_id: 'l11p.down.001',
    consumer_class: L11ConsumerClass.L12_SCENARIO_ENGINE,
    intended_use: L11DownstreamScoreUse.SCENARIO_WEIGHTING,
    requested_surfaces: [
      L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE,
      L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
      L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID,
      L11ReadSurfaceId.DRIFT_REPORT_BY_FORMULA_VERSION,
    ],
    score_family: L11ScoreFamily.OPPORTUNITY,
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    uses_score_value: true,
    uses_component_breakdown: true,
    uses_attribution: true,
    uses_missing_data_profile: true,
    uses_modifiers: false,
    uses_calibration_hooks: false,
    uses_drift_reports: true,
    attempts_recompute: false,
    read_mode: L11ReadMode.LIVE_CURRENT,
    policy_version: L11_DOWNSTREAM_POLICY_VERSION,
  };
  return { ...base, ...overrides };
}

function buildRepair(overrides: Partial<L11RepairRequest> = {}): L11RepairRequest {
  const base: L11RepairRequest = {
    repair_request_id: 'l11p.rep.001',
    parent_run_id: 'run.l11.001',
    new_run_id: 'run.l11.002',
    repair_reason: 'late data correction for asset_btc',
    trigger: L11RepairTrigger.LATE_DATA_CORRECTION,
    score_family: L11ScoreFamily.OPPORTUNITY,
    changed_input_refs: ['l11.input.opp.001'],
    correction_lineage_refs: ['l11.lineage.opp.correction.001'],
    prior_current_record_ref: 'l11p.cur.001',
    materialization_mode: L11MaterializationMode.REPAIR_REBUILD,
    invents_new_evidence: false,
    masquerades_as_live: false,
    destructive_historical_mutation: false,
    policy_version: L11_REPAIR_POLICY_VERSION,
  };
  return { ...base, ...overrides };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Durable surfaces and L5 persistence
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Durable surfaces and L5 persistence ═══');

assert(ALL_L11_DURABLE_SURFACE_IDS.length === 12,
  'A.01 12 durable surfaces enumerated');
assert(ALL_L11_DURABLE_SURFACE_IDS.includes(L11DurableSurfaceId.CURRENT_SCORE_REGISTRY),
  'A.02 current_score_registry registered');
assert(ALL_L11_DURABLE_SURFACE_IDS.includes(L11DurableSurfaceId.CURRENT_DRIFT_REGISTRY),
  'A.03 current_drift_registry registered');
assert(ALL_L11_DURABLE_SURFACE_IDS.includes(L11DurableSurfaceId.SCORE_FAILURES),
  'A.04 score_failures registered');

const surfaceReport = buildL11DurableSurfaceRegistryReport();
assert(surfaceReport.ok && surfaceReport.registered === 12,
  'A.05 durable surface registry report green');
assert(surfaceReport.current_authority_count === 7,
  `A.06 7 current-authority surfaces (got ${surfaceReport.current_authority_count})`);
assert(surfaceReport.historical_count >= 4,
  'A.07 at least 4 append-only historical/definition surfaces');
assert(surfaceReport.missing.length === 0,
  'A.08 no missing surface descriptors');

assert(ALL_L11_STORAGE_AUTHORITY_CLASSES.length === 4,
  'A.09 4 storage authority classes');
assert(ALL_L11_MUTATION_DISCIPLINES.length === 6,
  'A.10 6 mutation disciplines');
assert(ALL_L11_MATERIALIZATION_MODES.length === 8,
  'A.11 8 materialization modes');
assert(ALL_L11_PERSISTENCE_CLASSES.length >= 18,
  'A.12 at least 18 persistence classes');

// Persistence-class ↔ surface mapping is surjective (every surface has at least one class)
assert(ALL_L11_DURABLE_SURFACE_IDS.every(s =>
  L11_PERSISTENCE_CLASS_FOR_SURFACE[s].length >= 1),
  'A.13 every surface has at least one persistence class');

// Helpers
assert(isL11PersistenceClassMatchingSurface(
  L11PersistenceClass.CURRENT_SCORE,
  L11DurableSurfaceId.CURRENT_SCORE_REGISTRY),
  'A.14 CURRENT_SCORE matches current_score_registry');
assert(!isL11PersistenceClassMatchingSurface(
  L11PersistenceClass.CURRENT_SCORE,
  L11DurableSurfaceId.SCORE_RUNS),
  'A.15 CURRENT_SCORE does not match score_runs');

// Materialization policy
assert(evaluateL11MaterializationPolicy({
  surface_id: L11DurableSurfaceId.CURRENT_SCORE_REGISTRY,
  mode: L11MaterializationMode.LIVE_CURRENT,
  persistence_class: L11PersistenceClass.CURRENT_SCORE,
}).admitted, 'A.16 LIVE_CURRENT into current_score_registry admitted');
assert(!evaluateL11MaterializationPolicy({
  surface_id: L11DurableSurfaceId.CURRENT_SCORE_REGISTRY,
  mode: L11MaterializationMode.REPLAY_HISTORICAL,
  persistence_class: L11PersistenceClass.CURRENT_SCORE,
}).admitted, 'A.17 REPLAY_HISTORICAL into current_score_registry rejected');
assert(!evaluateL11MaterializationPolicy({
  surface_id: L11DurableSurfaceId.CURRENT_SCORE_REGISTRY,
  mode: L11MaterializationMode.LIVE_CURRENT,
  persistence_class: L11PersistenceClass.CURRENT_DRIFT_REPORT,
}).admitted, 'A.18 wrong persistence class for surface rejected');

// Surface helpers
assert(isL11SurfacePostgresAuthority(L11DurableSurfaceId.CURRENT_SCORE_REGISTRY),
  'A.19 current_score_registry is Postgres authority');
assert(isL11SurfaceCurrentAuthority(L11DurableSurfaceId.CURRENT_DRIFT_REGISTRY),
  'A.20 current_drift_registry is current authority');
assert(isL11SurfaceAppendOnly(L11DurableSurfaceId.SCORE_FAILURES),
  'A.21 score_failures is append-only');
assert(isL11ReplayWritingCurrent({
  surface_id: L11DurableSurfaceId.CURRENT_SCORE_REGISTRY,
  mode: L11MaterializationMode.REPLAY_HISTORICAL,
}), 'A.22 replay-into-current detected');

// Envelope: legal
const goodEnv = buildEnvelope();
const goodEnvIssues = validateL11PersistenceEnvelope(goodEnv);
assert(goodEnvIssues.length === 0,
  `A.23 legal envelope has no violations (got ${goodEnvIssues.length})`);

// Envelope: missing L5 route
const noRouteEnv = buildEnvelope({ l5_route_ref: '' });
assert(validateL11PersistenceEnvelope(noRouteEnv).some(i =>
  i.code === L11PersistenceViolationCode.L11P_L5_ROUTE_MISSING),
  'A.24 missing L5 route raises L11P_L5_ROUTE_MISSING');

// Envelope: direct store write
const directEnv = buildEnvelope({
  direct_store_write_attempted: true as unknown as false,
});
assert(validateL11PersistenceEnvelope(directEnv).some(i =>
  i.code === L11PersistenceViolationCode.L11P_DIRECT_STORE_WRITE_ATTEMPT),
  'A.25 direct_store_write_attempted=true raises L11P_DIRECT_STORE_WRITE_ATTEMPT');

// Envelope: surface unregistered
const fakeSurfaceEnv = buildEnvelope({
  surface_id: 'l11.fake_surface' as L11DurableSurfaceId,
});
assert(validateL11PersistenceEnvelope(fakeSurfaceEnv).some(i =>
  i.code === L11PersistenceViolationCode.L11P_SURFACE_UNREGISTERED),
  'A.26 unknown surface raises L11P_SURFACE_UNREGISTERED');

// Envelope: persistence-class / surface mismatch
const wrongClassEnv = buildEnvelope({
  persistence_class: L11PersistenceClass.HISTORICAL_SCORE_FACT,
});
assert(validateL11PersistenceEnvelope(wrongClassEnv).some(i =>
  i.code === L11PersistenceViolationCode.L11P_PERSISTENCE_CLASS_SURFACE_MISMATCH),
  'A.27 wrong persistence class raises L11P_PERSISTENCE_CLASS_SURFACE_MISMATCH');

// Envelope: mode not allowed for surface
const badModeEnv = buildEnvelope({
  materialization_mode: L11MaterializationMode.REPLAY_HISTORICAL,
});
assert(validateL11PersistenceEnvelope(badModeEnv).some(i =>
  i.code === L11PersistenceViolationCode.L11P_MODE_NOT_ALLOWED_FOR_SURFACE),
  'A.28 REPLAY_HISTORICAL on current registry raises mode-not-allowed');

// Envelope: missing replay hash
assert(validateL11PersistenceEnvelope(buildEnvelope({ replay_hash: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_REPLAY_HASH_MISSING),
  'A.29 missing replay_hash raises L11P_REPLAY_HASH_MISSING');

// Envelope: missing lineage
assert(validateL11PersistenceEnvelope(buildEnvelope({ lineage_refs: [] })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_LINEAGE_REFS_MISSING),
  'A.30 empty lineage raises L11P_LINEAGE_REFS_MISSING');

// Envelope: missing evidence on surface that requires it
const noEvidenceEnv = buildEnvelope({ evidence_refs: [] });
assert(validateL11PersistenceEnvelope(noEvidenceEnv).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_REF_MISSING),
  'A.31 missing evidence on current_score_registry raises L11P_EVIDENCE_REF_MISSING');

// Envelope: failure persistence on non-failure surface
const wrongFailureEnv = buildEnvelope({
  surface_id: L11DurableSurfaceId.CURRENT_SCORE_REGISTRY,
  persistence_class: L11PersistenceClass.SCORE_FAILURE,
});
assert(isL11FailureWrittenAsScoreState({
  surface_id: L11DurableSurfaceId.CURRENT_SCORE_REGISTRY,
  persistence_class: L11PersistenceClass.SCORE_FAILURE,
}), 'A.32 SCORE_FAILURE on non-failure surface flagged');
assert(validateL11PersistenceEnvelope(wrongFailureEnv).some(i =>
  i.code === L11PersistenceViolationCode.L11P_PERSISTENCE_CLASS_SURFACE_MISMATCH),
  'A.33 SCORE_FAILURE persistence class on non-failure surface rejected');

// ═══════════════════════════════════════════════════════════════
// BAND B — Current and historical authority
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Current and historical authority ═══');

assert(ALL_L11_SCORE_SUPERSESSION_REASONS.length === 7,
  'B.01 7 supersession reasons');
assert(l11SupersessionReasonRequiresPriorRef(
  L11ScoreSupersessionReason.NEWER_LIVE_RUN),
  'B.02 NEWER_LIVE_RUN requires prior ref');
assert(isL11MaterializationModeAuthorizedForCurrent(L11MaterializationMode.LIVE_CURRENT),
  'B.03 LIVE_CURRENT authorized for current authority');
assert(!isL11MaterializationModeAuthorizedForCurrent(L11MaterializationMode.REPLAY_HISTORICAL),
  'B.04 REPLAY_HISTORICAL not authorized for current authority');

// Legal current record
const goodCurrent = buildCurrentRecord();
assert(validateL11CurrentScoreRecord(goodCurrent).length === 0,
  'B.05 legal current record has no violations');

// Missing attribution ref
assert(validateL11CurrentScoreRecord(buildCurrentRecord({ attribution_ref: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_CURRENT_ATTRIBUTION_REF_MISSING),
  'B.06 missing attribution_ref rejected');

// Missing component ref
assert(validateL11CurrentScoreRecord(buildCurrentRecord({ component_breakdown_ref: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_CURRENT_COMPONENT_REF_MISSING),
  'B.07 missing component_breakdown_ref rejected');

// Missing missing-data ref
assert(validateL11CurrentScoreRecord(buildCurrentRecord({ missing_data_profile_ref: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_CURRENT_MISSING_DATA_REF_MISSING),
  'B.08 missing missing_data_profile_ref rejected');

// Missing formula version
assert(validateL11CurrentScoreRecord(buildCurrentRecord({ formula_version: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_CURRENT_FORMULA_VERSION_MISSING),
  'B.09 missing formula_version rejected');

// Replay-mode written into current authority
const replayCurrent = buildCurrentRecord({
  materialization_mode: L11MaterializationMode.REPLAY_HISTORICAL,
});
assert(validateL11CurrentScoreRecord(replayCurrent).some(i =>
  i.code === L11PersistenceViolationCode.L11P_CURRENT_WRITTEN_UNDER_REPLAY),
  'B.10 replay mode into current authority rejected');

// Supersession without prior ref
const supersedeNoPrior = buildCurrentRecord({
  supersession_reason: L11ScoreSupersessionReason.LATE_DATA_CORRECTION,
  prior_current_record_ref: undefined,
});
assert(validateL11CurrentScoreRecord(supersedeNoPrior).some(i =>
  i.code === L11PersistenceViolationCode.L11P_SUPERSESSION_PRIOR_REF_MISSING),
  'B.11 supersession reason without prior ref rejected');

// Prior ref without supersession reason
const priorNoReason = buildCurrentRecord({
  prior_current_record_ref: 'l11p.cur.previous',
  supersession_reason: undefined,
});
assert(validateL11CurrentScoreRecord(priorNoReason).some(i =>
  i.code === L11PersistenceViolationCode.L11P_SUPERSESSION_REASON_MISSING),
  'B.12 prior ref without supersession reason rejected');

// Legal supersession
const legalSupersede = buildCurrentRecord({
  current_record_id: 'l11p.cur.002',
  prior_current_record_ref: 'l11p.cur.001',
  supersession_reason: L11ScoreSupersessionReason.NEWER_LIVE_RUN,
});
assert(validateL11CurrentScoreRecord(legalSupersede).length === 0,
  'B.13 legal supersession with prior ref accepted');

// Historical fact: legal
const goodHist = buildHistoricalFact();
assert(validateL11HistoricalScoreFact(goodHist).length === 0,
  'B.14 legal historical fact has no violations');

// Missing replay hash
assert(validateL11HistoricalScoreFact(buildHistoricalFact({ replay_hash: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_HISTORICAL_REPLAY_HASH_MISSING),
  'B.15 missing replay hash rejected');

// Missing formula version
assert(validateL11HistoricalScoreFact(buildHistoricalFact({ formula_version: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_HISTORICAL_FORMULA_VERSION_MISSING),
  'B.16 missing formula_version rejected');

// Missing attribution fact ref
assert(validateL11HistoricalScoreFact(buildHistoricalFact({ attribution_fact_ref: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_HISTORICAL_ATTRIBUTION_REF_MISSING),
  'B.17 missing attribution_fact_ref rejected');

// Missing component fact refs
assert(validateL11HistoricalScoreFact(buildHistoricalFact({ component_fact_refs: [] })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_HISTORICAL_COMPONENT_REFS_MISSING),
  'B.18 missing component_fact_refs rejected');

// Correction without reason
const halfCorrection = buildHistoricalFact({
  correction_of_fact_id: 'l11p.hist.000',
  correction_reason: undefined,
});
assert(validateL11HistoricalScoreFact(halfCorrection).some(i =>
  i.code === L11PersistenceViolationCode.L11P_HISTORICAL_CORRECTION_LINK_MISSING),
  'B.19 partial correction link rejected');

// Legal correction
const goodCorrection = buildHistoricalFact({
  historical_fact_id: 'l11p.hist.002',
  correction_of_fact_id: 'l11p.hist.001',
  correction_reason: 'late-data correction',
});
assert(validateL11HistoricalScoreFact(goodCorrection).length === 0,
  'B.20 legal correction historical fact accepted');

// 7 historical fact families (incl. ts_score_missing_data_v1)
assert(ALL_L11_HISTORICAL_FACT_FAMILIES.length === 7,
  'B.21 7 historical fact families (incl. ts_score_missing_data_v1)');
assert(ALL_L11_HISTORICAL_FACT_FAMILIES.includes(
  L11HistoricalFactFamily.TS_SCORE_MISSING_DATA_V1),
  'B.22 ts_score_missing_data_v1 registered');

// ═══════════════════════════════════════════════════════════════
// BAND C — Evidence storage
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Evidence storage ═══');

assert(ALL_L11_EVIDENCE_CLASSES.length === 10,
  'C.01 10 evidence classes');
assert(ALL_L11_EVIDENCE_SUBJECT_KINDS.length === 10,
  'C.02 10 evidence subject kinds');
assert(ALL_L11_EVIDENCE_CLASSES.every(c =>
  L11_EVIDENCE_CLASS_TO_SUBJECT_KIND[c].length >= 1),
  'C.03 every evidence class has at least one subject kind mapping');

// Deterministic path build
const path = buildL11DeterministicEvidencePath({
  evidence_class: L11EvidenceClass.SCORE_EVIDENCE_PACK,
  score_family: L11ScoreFamily.OPPORTUNITY,
  scope_type: 'ASSET', scope_id: 'asset_btc',
  as_of: '2026_05_05T00_00_00Z', subject_id: 'l11_score_opp_001',
});
assert(path.startsWith('l11/evidence/SCORE_EVIDENCE_PACK/'),
  'C.04 deterministic path starts under l11/evidence/');
assert(path.endsWith('.json'), 'C.05 path ends with .json');
assert(isL11DeterministicPathValid(path).ok, 'C.06 built path passes validator');

// Sanitization: forbidden characters get replaced
const dangerousPath = buildL11DeterministicEvidencePath({
  evidence_class: L11EvidenceClass.SCORE_EVIDENCE_PACK,
  score_family: L11ScoreFamily.OPPORTUNITY,
  scope_type: 'ASSET',
  scope_id: '../../../etc/passwd',
  as_of: '2026-05-05T00:00:00Z',
  subject_id: 'evil/payload',
});
assert(isL11DeterministicPathValid(dangerousPath).ok,
  'C.07 sanitized path with caller-supplied traversal still valid');
assert(!dangerousPath.includes('..'),
  'C.08 sanitized path contains no traversal segments');

// Manual traversal attempt
assert(!isL11DeterministicPathValid('l11/evidence/SCORE_EVIDENCE_PACK/OPPORTUNITY/../etc/passwd.json').ok,
  'C.09 traversal path rejected');
assert(!isL11DeterministicPathValid('l11/evidence/x/y/z.json').ok,
  'C.10 too-few-segment path rejected');
assert(!isL11DeterministicPathValid('foo/bar/baz.json').ok,
  'C.11 wrong root path rejected');
assert(!isL11DeterministicPathValid('l11/evidence/x/y/z/w/v/u.txt').ok,
  'C.12 non-json extension rejected');

// Pointer validators
const goodPtr = buildEvidencePointer();
assert(validateL11EvidencePointer(goodPtr).length === 0,
  'C.13 legal evidence pointer has no violations');

assert(validateL11EvidencePointer(buildEvidencePointer({ archive_uri: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_ARCHIVE_URI_MISSING),
  'C.14 missing archive_uri rejected');
assert(validateL11EvidencePointer(buildEvidencePointer({ manifest_ref: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_MANIFEST_MISSING),
  'C.15 missing manifest_ref rejected');
assert(validateL11EvidencePointer(buildEvidencePointer({ checksum: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_CHECKSUM_MISSING),
  'C.16 missing checksum rejected');
assert(validateL11EvidencePointer(buildEvidencePointer({ replay_safe_ref: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_REPLAY_REF_MISSING),
  'C.17 missing replay_safe_ref rejected');

// Subject kind mismatch
const subjectMismatch = buildEvidencePointer({
  subject_kind: L11EvidenceSubjectKind.ATTRIBUTION,
});
assert(validateL11EvidencePointer(subjectMismatch).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_SUBJECT_KIND_MISMATCH),
  'C.18 subject_kind not allowed for evidence_class rejected');

// Path traversal
const traversal = buildEvidencePointer({
  deterministic_path:
    'l11/evidence/SCORE_EVIDENCE_PACK/OPPORTUNITY/../etc/passwd.json',
});
assert(validateL11EvidencePointer(traversal).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_PATH_TRAVERSAL),
  'C.19 path traversal rejected with L11P_EVIDENCE_PATH_TRAVERSAL');

// Path invalid (non-traversal)
const badPath = buildEvidencePointer({
  deterministic_path: 'l11/evidence/x/y/z.json',
});
assert(validateL11EvidencePointer(badPath).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_PATH_INVALID),
  'C.20 invalid path raises L11P_EVIDENCE_PATH_INVALID');

// Orphan pointer
const orphan = buildEvidencePointer({ score_id: undefined, run_id: undefined });
assert(validateL11EvidencePointer(orphan).some(i =>
  i.code === L11PersistenceViolationCode.L11P_EVIDENCE_POINTER_ORPHANED),
  'C.21 orphan evidence pointer rejected');

// ═══════════════════════════════════════════════════════════════
// BAND D — Read surfaces and downstream consumption
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Read surfaces and downstream consumption ═══');

assert(ALL_L11_READ_SURFACE_IDS.length === 12,
  'D.01 12 read surfaces');
assert(ALL_L11_READ_MODES.length === 6, 'D.02 6 read modes');
assert(ALL_L11_CONSUMER_CLASSES.length === 8, 'D.03 8 consumer classes');

const readReport = buildL11ReadSurfaceRegistryReport();
assert(readReport.ok && readReport.registered === 12,
  'D.04 read surface registry report green');

// Legal read request
const goodRead = buildReadRequest();
assert(validateL11ReadRequest(goodRead).length === 0,
  'D.05 legal read request has no violations');

// Unregistered read surface
assert(validateL11ReadRequest(buildReadRequest({
  read_surface_id: 'FAKE_SURFACE' as L11ReadSurfaceId,
})).some(i => i.code === L11PersistenceViolationCode.L11P_READ_SURFACE_UNREGISTERED),
  'D.06 unknown read surface rejected');

// Read mode not allowed
assert(validateL11ReadRequest(buildReadRequest({
  read_mode: L11ReadMode.LINEAGE_VIEW,
})).some(i => i.code === L11PersistenceViolationCode.L11P_READ_MODE_NOT_ALLOWED),
  'D.07 LINEAGE_VIEW not allowed on CURRENT_SCORE_SNAPSHOT_BY_SCOPE');

// Consumer not allowed
assert(validateL11ReadRequest(buildReadRequest({
  consumer_class: L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
})).some(i => i.code === L11PersistenceViolationCode.L11P_CONSUMER_NOT_ALLOWED),
  'D.08 INTERNAL_CALIBRATION_JOB not allowed on snapshot surface');

// Current authority required but caller asked for non-LIVE_CURRENT mode
assert(validateL11ReadRequest(buildReadRequest({
  read_mode: L11ReadMode.LIVE_HISTORICAL,
})).some(i => i.code === L11PersistenceViolationCode.L11P_CURRENT_READ_BYPASSES_CURRENT_REGISTRY ||
              i.code === L11PersistenceViolationCode.L11P_READ_MODE_NOT_ALLOWED),
  'D.09 historical mode on current-authority surface rejected');

// Required lineage absent
assert(validateL11ReadRequest(buildReadRequest({ require_lineage: false })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_LINEAGE_REQUIRED_BUT_ABSENT),
  'D.10 missing required lineage flag rejected');

// Required replay hash absent
assert(validateL11ReadRequest(buildReadRequest({ require_replay_hash: false })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_REPLAY_HASH_REQUIRED_BUT_ABSENT),
  'D.11 missing required replay-hash flag rejected');

// Cache acceleration on surface that doesn't allow it
const noCacheReq = buildReadRequest({
  read_surface_id: L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
  consumer_class: L11ConsumerClass.L12_SCENARIO_ENGINE,
  require_current_authority: false,
  require_evidence: true,
  allow_cache_acceleration: true,
});
assert(validateL11ReadRequest(noCacheReq).some(i =>
  i.code === L11PersistenceViolationCode.L11P_REDIS_AS_AUTHORITY_READ),
  'D.12 cache acceleration on no-cache surface rejected');

// Per-surface admission services
assert(admitL11CurrentScoreSnapshotRead(goodRead).admitted,
  'D.13 current snapshot read admitted');
assert(admitL11AttributionRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
  require_current_authority: false,
  require_evidence: true,
  allow_cache_acceleration: false,
})).admitted, 'D.14 attribution read admitted with evidence flag');
assert(!admitL11ComponentBreakdownRead(goodRead).admitted,
  'D.15 component service rejects request with wrong surface');

// Wrap admissions for the rest
const histRequest = buildReadRequest({
  read_surface_id: L11ReadSurfaceId.SCORE_HISTORY_BY_SCOPE_WINDOW,
  read_mode: L11ReadMode.LIVE_HISTORICAL,
  require_current_authority: false,
  allow_cache_acceleration: false,
});
assert(admitL11HistoricalScoreRead(histRequest).admitted,
  'D.16 historical read admitted');
assert(admitL11ScoreModifiersRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.SCORE_MODIFIERS_BY_SCORE_ID,
  read_mode: L11ReadMode.LIVE_CURRENT,
  require_current_authority: false,
  allow_cache_acceleration: false,
})).admitted, 'D.17 score modifiers read admitted');
assert(admitL11MissingDataProfileRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID,
  read_mode: L11ReadMode.LIVE_CURRENT,
  require_current_authority: false,
  allow_cache_acceleration: false,
})).admitted, 'D.18 missing-data profile read admitted');
assert(admitL11CalibrationHooksRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.SCORE_CALIBRATION_HOOKS_BY_SCORE_ID,
  read_mode: L11ReadMode.LIVE_CURRENT,
  require_current_authority: false,
  require_evidence: true,
  allow_cache_acceleration: false,
})).admitted, 'D.19 calibration hooks read admitted');
assert(admitL11CalibrationTargetRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.CALIBRATION_TARGET_BY_SCORE_FAMILY,
  read_mode: L11ReadMode.LIVE_CURRENT,
  require_current_authority: false,
  allow_cache_acceleration: true,
})).admitted, 'D.20 calibration target read admitted');
assert(admitL11DriftReportRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.DRIFT_REPORT_BY_FORMULA_VERSION,
  read_mode: L11ReadMode.LIVE_CURRENT,
  require_current_authority: false,
  allow_cache_acceleration: false,
})).admitted, 'D.21 drift report read admitted');
assert(admitL11EvidenceBundleRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.SCORE_EVIDENCE_BUNDLE,
  read_mode: L11ReadMode.EVIDENCE_VIEW,
  require_current_authority: false,
  require_evidence: true,
  allow_cache_acceleration: false,
})).admitted, 'D.22 evidence bundle read admitted');
assert(admitL11RunLineageRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.SCORE_LINEAGE_BY_RUN_ID,
  read_mode: L11ReadMode.LINEAGE_VIEW,
  require_current_authority: false,
  allow_cache_acceleration: false,
})).admitted, 'D.23 run lineage read admitted');
assert(admitL11CurrentScoreFamilyRead(buildReadRequest({
  read_surface_id: L11ReadSurfaceId.CURRENT_SCORE_FAMILY_BY_SCOPE,
})).admitted, 'D.24 current score family read admitted');

// admitL11Read base mismatch
const baseMismatch = admitL11Read({
  request: goodRead,
  expected_surface: L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
});
assert(!baseMismatch.admitted, 'D.25 base admission rejects surface mismatch');

// Downstream legal
const goodDown = buildDownstream();
assert(validateL11DownstreamConsumption(goodDown).length === 0,
  'D.26 legal downstream request has no violations');

// L12 attempts live recompute
const recomputeLive = buildDownstream({
  attempts_recompute: true,
  read_mode: L11ReadMode.LIVE_CURRENT,
});
assert(validateL11DownstreamConsumption(recomputeLive).some(i =>
  i.code === L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_ATTEMPT),
  'D.27 L12 live recompute rejected');

// Recompute by replay adapter under REPLAY_HISTORICAL legal
const replayLegal = buildDownstream({
  consumer_class: L11ConsumerClass.INTERNAL_REPLAY_ADAPTER,
  attempts_recompute: true,
  recompute_reason: 'historical replay reconstruction',
  read_mode: L11ReadMode.REPLAY_HISTORICAL,
  intended_use: L11DownstreamScoreUse.REPLAY_RECONSTRUCTION,
  uses_drift_reports: false,
  requested_surfaces: [
    L11ReadSurfaceId.SCORE_HISTORY_BY_SCOPE_WINDOW,
    L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
    L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID,
    L11ReadSurfaceId.SCORE_LINEAGE_BY_RUN_ID,
  ],
});
assert(validateL11DownstreamConsumption(replayLegal).length === 0,
  'D.28 replay-adapter recompute under REPLAY_HISTORICAL admitted');

// Recompute reason missing
const recomputeNoReason = buildDownstream({
  consumer_class: L11ConsumerClass.INTERNAL_REPLAY_ADAPTER,
  attempts_recompute: true,
  read_mode: L11ReadMode.REPLAY_HISTORICAL,
  intended_use: L11DownstreamScoreUse.REPLAY_RECONSTRUCTION,
  requested_surfaces: [L11ReadSurfaceId.SCORE_HISTORY_BY_SCOPE_WINDOW],
  uses_score_value: false,
  uses_drift_reports: false,
});
assert(validateL11DownstreamConsumption(recomputeNoReason).some(i =>
  i.code === L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_REASON_MISSING),
  'D.29 recompute without reason rejected');

// Score value used without attribution
const noAttr = buildDownstream({
  uses_attribution: false,
  requested_surfaces: [
    L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE,
    L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID,
    L11ReadSurfaceId.DRIFT_REPORT_BY_FORMULA_VERSION,
  ],
});
assert(validateL11DownstreamConsumption(noAttr).some(i =>
  i.code === L11PersistenceViolationCode.L11P_DOWNSTREAM_USES_SCORE_WITHOUT_ATTRIBUTION),
  'D.30 score-value use without attribution rejected');

// Score value used without missing-data profile
const noMd = buildDownstream({
  uses_missing_data_profile: false,
  requested_surfaces: [
    L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE,
    L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
    L11ReadSurfaceId.DRIFT_REPORT_BY_FORMULA_VERSION,
  ],
});
assert(validateL11DownstreamConsumption(noMd).some(i =>
  i.code === L11PersistenceViolationCode.L11P_DOWNSTREAM_USES_SCORE_WITHOUT_MISSING_DATA),
  'D.31 score-value use without missing-data rejected');

// Scoring-sensitive use without drift surface
const noDrift = buildDownstream({
  uses_drift_reports: false,
  requested_surfaces: [
    L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE,
    L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
    L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID,
  ],
});
assert(validateL11DownstreamConsumption(noDrift).some(i =>
  i.code === L11PersistenceViolationCode.L11P_DOWNSTREAM_SCORING_USE_WITHOUT_DRIFT),
  'D.32 scoring-sensitive use without drift surface rejected');

// Surface consumer not allowed
const consumerOnSurfaceForbidden = buildDownstream({
  consumer_class: L11ConsumerClass.INTERNAL_CALIBRATION_JOB,
  intended_use: L11DownstreamScoreUse.CALIBRATION_EVALUATION,
  requested_surfaces: [
    L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE,
  ],
  read_mode: L11ReadMode.LIVE_CURRENT,
  uses_score_value: false,
  uses_drift_reports: false,
});
assert(validateL11DownstreamConsumption(consumerOnSurfaceForbidden).some(i =>
  i.code === L11PersistenceViolationCode.L11P_DOWNSTREAM_CONSUMER_NOT_ALLOWED),
  'D.33 consumer not allowed on surface rejected');

// Scoring sensitive uses constants
assert(L11_SCORING_SENSITIVE_USES.has(L11DownstreamScoreUse.SCENARIO_WEIGHTING),
  'D.34 SCENARIO_WEIGHTING is scoring-sensitive');
assert(L11_RECOMPUTE_ALLOWED_CONSUMERS.has(L11ConsumerClass.INTERNAL_REPLAY_ADAPTER),
  'D.35 INTERNAL_REPLAY_ADAPTER allowed for recompute');
assert(L11_RECOMPUTE_ALLOWED_READ_MODES.has(L11ReadMode.REPLAY_HISTORICAL),
  'D.36 REPLAY_HISTORICAL allowed for recompute');
assert(ALL_L11_DOWNSTREAM_SCORE_USES.length === 9,
  'D.37 9 downstream score uses');

// ═══════════════════════════════════════════════════════════════
// BAND E — Replay, repair, audit, and invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Replay, repair, audit, and invariants ═══');

assert(ALL_L11_REPLAY_STATUSES.length === 9, 'E.01 9 replay statuses');
assert(L11_REPLAY_POLICY_VERSION === 'l11.8.replay.v1', 'E.02 replay policy version pinned');

// Identical replay
const identical = runL11Replay({
  replay_id: 'l11.replay.001',
  source_run_id: 'run.l11.001',
  score_family: L11ScoreFamily.OPPORTUNITY,
  recorded: {
    score_replay_hash: 's',
    attribution_replay_hash: 'a',
    missing_data_replay_hash: 'm',
    modifier_replay_hash: 'mod',
    calibration_replay_hash: 'c',
    formula_version: 'v1',
    threshold_policy_version: 't1',
  },
  recomputed: {
    score_replay_hash: 's',
    attribution_replay_hash: 'a',
    missing_data_replay_hash: 'm',
    modifier_replay_hash: 'mod',
    calibration_replay_hash: 'c',
    formula_version: 'v1',
    threshold_policy_version: 't1',
  },
  lineage_refs: ['l11.lineage.replay.001'],
});
assert(identical.replay_status === L11ReplayStatus.IDENTICAL,
  'E.03 identical inputs → IDENTICAL status');
assert(identical.score_hash_match && identical.formula_version_match,
  'E.04 identical replay hashes match');
assert(validateL11ReplayResult(identical).length === 0,
  'E.05 identical replay result has no violations');

// Score hash mismatch
const scoreMismatch = runL11Replay({
  replay_id: 'l11.replay.002',
  source_run_id: 'run.l11.001',
  score_family: L11ScoreFamily.OPPORTUNITY,
  recorded: {
    score_replay_hash: 's', attribution_replay_hash: 'a',
    missing_data_replay_hash: 'm', modifier_replay_hash: 'mod',
    calibration_replay_hash: 'c', formula_version: 'v1',
    threshold_policy_version: 't1',
  },
  recomputed: {
    score_replay_hash: 's2', attribution_replay_hash: 'a',
    missing_data_replay_hash: 'm', modifier_replay_hash: 'mod',
    calibration_replay_hash: 'c', formula_version: 'v1',
    threshold_policy_version: 't1',
  },
  lineage_refs: ['l11.lineage.replay.002'],
});
assert(scoreMismatch.replay_status === L11ReplayStatus.SCORE_HASH_MISMATCH,
  'E.06 score hash mismatch detected');
assert(validateL11ReplayResult(scoreMismatch).some(i =>
  i.code === L11PersistenceViolationCode.L11P_REPLAY_HASH_MISMATCH),
  'E.07 score hash mismatch raises L11P_REPLAY_HASH_MISMATCH');

// Formula version mismatch trumps everything
const formulaMismatch = runL11Replay({
  replay_id: 'l11.replay.003',
  source_run_id: 'run.l11.001',
  score_family: L11ScoreFamily.OPPORTUNITY,
  recorded: {
    score_replay_hash: 's', attribution_replay_hash: 'a',
    missing_data_replay_hash: 'm', modifier_replay_hash: 'mod',
    calibration_replay_hash: 'c', formula_version: 'v1',
    threshold_policy_version: 't1',
  },
  recomputed: {
    score_replay_hash: 's', attribution_replay_hash: 'a',
    missing_data_replay_hash: 'm', modifier_replay_hash: 'mod',
    calibration_replay_hash: 'c', formula_version: 'v2',
    threshold_policy_version: 't1',
  },
  lineage_refs: ['l11.lineage.replay.003'],
});
assert(formulaMismatch.replay_status === L11ReplayStatus.FORMULA_VERSION_MISMATCH,
  'E.08 formula version mismatch trumps other matches');
assert(validateL11ReplayResult(formulaMismatch).some(i =>
  i.code === L11PersistenceViolationCode.L11P_REPLAY_FORMULA_VERSION_MISMATCH),
  'E.09 formula version mismatch validator');

// Threshold policy mismatch
const thresholdMismatch = runL11Replay({
  ...identical, replay_id: 'l11.replay.004',
  recomputed: { ...identical.differences[0]?.actual ? {} : {},
    score_replay_hash: 's', attribution_replay_hash: 'a',
    missing_data_replay_hash: 'm', modifier_replay_hash: 'mod',
    calibration_replay_hash: 'c', formula_version: 'v1',
    threshold_policy_version: 't2',
  } as never,
  recorded: identical.differences.length === 0 ? {
    score_replay_hash: 's', attribution_replay_hash: 'a',
    missing_data_replay_hash: 'm', modifier_replay_hash: 'mod',
    calibration_replay_hash: 'c', formula_version: 'v1',
    threshold_policy_version: 't1',
  } : (identical as never),
} as never);
assert(thresholdMismatch.replay_status === L11ReplayStatus.THRESHOLD_POLICY_MISMATCH,
  'E.10 threshold policy mismatch detected');

// Repair: legal
const goodRep = buildRepair();
assert(admitL11RepairRequest(goodRep).admitted,
  'E.11 legal repair admitted');
assert(validateL11RepairRequest(goodRep).length === 0,
  'E.12 legal repair has no violations');

// Repair without parent
assert(validateL11RepairRequest(buildRepair({ parent_run_id: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_REPAIR_PARENT_RUN_MISSING),
  'E.13 missing parent_run_id rejected');

// Repair without reason
assert(validateL11RepairRequest(buildRepair({ repair_reason: '' })).some(i =>
  i.code === L11PersistenceViolationCode.L11P_REPAIR_REASON_MISSING),
  'E.14 missing repair_reason rejected');

// Repair reuses run id
assert(validateL11RepairRequest(buildRepair({
  new_run_id: 'run.l11.001',
})).some(i => i.code === L11PersistenceViolationCode.L11P_REPAIR_REUSES_RUN_ID),
  'E.15 reused run_id rejected');

// Repair without correction refs
assert(validateL11RepairRequest(buildRepair({
  correction_lineage_refs: [],
})).some(i => i.code === L11PersistenceViolationCode.L11P_REPAIR_NO_CORRECTION_REFS),
  'E.16 missing correction lineage rejected');

// Repair invents evidence
assert(validateL11RepairRequest(buildRepair({
  invents_new_evidence: true,
})).some(i => i.code === L11PersistenceViolationCode.L11P_REPAIR_INVENTS_EVIDENCE),
  'E.17 repair inventing evidence rejected');

// Repair masquerades as live
assert(validateL11RepairRequest(buildRepair({
  masquerades_as_live: true,
})).some(i => i.code === L11PersistenceViolationCode.L11P_REPAIR_MASQUERADES_AS_LIVE),
  'E.18 masquerade-as-live rejected');

// Repair destructive historical mutation
assert(validateL11RepairRequest(buildRepair({
  destructive_historical_mutation: true,
})).some(i => i.code === L11PersistenceViolationCode.L11P_REPAIR_DESTRUCTIVE_HISTORICAL_MUTATION),
  'E.19 destructive historical mutation rejected');

// Audit subjects
assert(ALL_L11_PERSISTENCE_AUDIT_SUBJECT_CLASSES.length === 12,
  'E.20 12 persistence audit subject classes');
assert(severityForL11PersistenceCode(
  L11PersistenceViolationCode.L11P_DIRECT_STORE_WRITE_ATTEMPT)
    === L11PersistenceAuditSeverity.CRITICAL,
  'E.21 direct store write is CRITICAL');
assert(severityForL11PersistenceCode(
  L11PersistenceViolationCode.L11P_REDIS_USED_AS_AUTHORITY)
    === L11PersistenceAuditSeverity.CRITICAL,
  'E.22 Redis as authority is CRITICAL');
assert(severityForL11PersistenceCode(
  L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_ATTEMPT)
    === L11PersistenceAuditSeverity.CRITICAL,
  'E.23 downstream recompute attempt is CRITICAL');
assert(severityForL11PersistenceCode(
  L11PersistenceViolationCode.L11P_REPLAY_HASH_MISMATCH)
    === L11PersistenceAuditSeverity.ERROR,
  'E.24 replay hash mismatch is ERROR');
assert(severityForL11PersistenceCode(
  L11PersistenceViolationCode.L11P_REPAIR_PARENT_RUN_MISSING)
    === L11PersistenceAuditSeverity.ERROR,
  'E.25 repair parent missing is ERROR');

const auditIssue = {
  code: L11PersistenceViolationCode.L11P_DIRECT_STORE_WRITE_ATTEMPT,
  message: 'direct write attempt',
  context: { envelope_id: 'l11p.env.bad' },
};
const auditRec = makeL11PersistenceAuditRecord(
  L11PersistenceAuditSubjectClass.PERSISTENCE_ENVELOPE,
  'l11p.env.bad', auditIssue, T0);
assert(auditRec.audit_id.startsWith('l11p.audit.'),
  'E.26 audit record has deterministic l11p.audit. id');
const auditRec2 = makeL11PersistenceAuditRecord(
  L11PersistenceAuditSubjectClass.PERSISTENCE_ENVELOPE,
  'l11p.env.bad', auditIssue, T0);
assert(auditRec.audit_id === auditRec2.audit_id,
  'E.27 same input → same audit_id (determinism)');

const recs = emitL11PersistenceAuditRecords(
  L11PersistenceAuditSubjectClass.PERSISTENCE_ENVELOPE,
  'l11p.env.bad', [auditIssue, auditIssue], T0);
assert(recs.length === 2, 'E.28 emit one record per issue');

const batch = emitL11PersistenceAuditBatch(
  L11PersistenceAuditSubjectClass.PERSISTENCE_ENVELOPE,
  'default.ref', [auditIssue], T0);
assert(batch[0].subject_ref === 'l11p.env.bad',
  'E.29 batch emitter prefers context envelope_id over default ref');

// Invariants
const envelopes = [goodEnv];
const currents = [goodCurrent];
const facts = [goodHist];
const ptrs = [goodPtr];
const reads = [goodRead];
const downstreams = [goodDown];
const replays = [identical];
const repairs = [goodRep];

const invA = invariantA_l5OnlyPersistence(envelopes);
assert(invA.ok, 'E.30 INV-11.8-A passes for legal envelope');
const invAFail = invariantA_l5OnlyPersistence([buildEnvelope({ l5_route_ref: '' })]);
assert(!invAFail.ok, 'E.31 INV-11.8-A fails when L5 route missing');

const invB = invariantB_currentAuthority(currents);
assert(invB.ok, 'E.32 INV-11.8-B passes for legal current record');
const invBFail = invariantB_currentAuthority([buildCurrentRecord({ attribution_ref: '' })]);
assert(!invBFail.ok, 'E.33 INV-11.8-B fails when attribution_ref missing');

const invC = invariantC_historicalAppendSafety(facts);
assert(invC.ok, 'E.34 INV-11.8-C passes for legal historical fact');
const invCFail = invariantC_historicalAppendSafety([buildHistoricalFact({ replay_hash: '' })]);
assert(!invCFail.ok, 'E.35 INV-11.8-C fails when replay hash missing');

const invD = invariantD_evidenceIntegrity(ptrs);
assert(invD.ok, 'E.36 INV-11.8-D passes for legal pointer');
const invDFail = invariantD_evidenceIntegrity([buildEvidencePointer({
  deterministic_path: 'l11/evidence/SCORE_EVIDENCE_PACK/OPPORTUNITY/../etc/passwd.json',
})]);
assert(!invDFail.ok, 'E.37 INV-11.8-D fails on path traversal');

const invE = invariantE_governedReadSurfaces(reads);
assert(invE.ok, 'E.38 INV-11.8-E passes for legal read');
const invEFail = invariantE_governedReadSurfaces([buildReadRequest({
  read_surface_id: 'FAKE' as L11ReadSurfaceId,
})]);
assert(!invEFail.ok, 'E.39 INV-11.8-E fails on unregistered surface');

const invF = invariantF_laterLayerNoRebuild(downstreams);
assert(invF.ok, 'E.40 INV-11.8-F passes for legal downstream');
const invFFail = invariantF_laterLayerNoRebuild([buildDownstream({
  attempts_recompute: true, read_mode: L11ReadMode.LIVE_CURRENT,
})]);
assert(!invFFail.ok, 'E.41 INV-11.8-F fails on later-layer live recompute');

const invG = invariantG_replayAndRepairSafety({ replays, repairs });
assert(invG.ok, 'E.42 INV-11.8-G passes for legal replay/repair');
const invGFail = invariantG_replayAndRepairSafety({
  replays, repairs: [buildRepair({ parent_run_id: '' })],
});
assert(!invGFail.ok, 'E.43 INV-11.8-G fails on missing parent run');

const invH = invariantH_scoreObjectCompleteness(currents);
assert(invH.ok, 'E.44 INV-11.8-H passes for complete current record');
const invHFail = invariantH_scoreObjectCompleteness([buildCurrentRecord({
  attribution_ref: '',
})]);
assert(!invHFail.ok, 'E.45 INV-11.8-H fails when attribution_ref missing');

// All invariants in one shot
const all = runAllL11_8Invariants({
  envelopes, current_records: currents, historical_facts: facts,
  evidence_pointers: ptrs, read_requests: reads,
  downstream_requests: downstreams, replays, repairs,
});
assert(all.length === 8, 'E.46 8 invariants returned');
assert(all.every(r => r.result.ok), 'E.47 all 8 L11.8 invariants pass on golden inputs');

// Violation-code namespace coverage
assert(ALL_L11_PERSISTENCE_VIOLATION_CODES.length >= 60,
  `E.48 at least 60 L11P_ codes (got ${ALL_L11_PERSISTENCE_VIOLATION_CODES.length})`);
assert(ALL_L11_PERSISTENCE_VIOLATION_CODES.every(c => c.startsWith('L11P_')),
  'E.49 all L11.8 violation codes use L11P_ namespace');

// Repair triggers
assert(ALL_L11_REPAIR_TRIGGERS.length === 7, 'E.50 7 repair triggers');
assert(ALL_L11_SCORE_RUN_MODES.length === 6, 'E.51 6 run modes');

// Run record helpers
void L11ScoreFailureStage;
void L11ScoreRecoveryAction;
void L11ScoreRunStatus;
void L11_SCORE_RUN_POLICY_VERSION;
void L11ReplayDifferenceKind;
void L11_DURABLE_SURFACE_REGISTRY;
void L11_READ_SURFACE_REGISTRY;
void getL11DurableSurfaceDescriptor;
void getL11ReadSurfaceDescriptor;
void thresholdMismatch;

// ─────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════════════`);
console.log(`L11.8 Persistence Test Suite`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n✓ ALL L11.8 PERSISTENCE ASSERTIONS PASSED`);
