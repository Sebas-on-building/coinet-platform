/**
 * L7.7 — Persistence, Materialization, Read Surfaces, and Downstream
 *        Consumption Certification Test Suite
 *
 * Bands per §7.7.9.2:
 *   A — Durable surfaces + authority law
 *   B — Historical surfaces (append-safe, correction-aware)
 *   C — Evidence storage
 *   D — Read surfaces (current / historical / evidence / downstream)
 *   E — Later-layer integration and invariants
 */

import {
  // Persistence surfaces + contracts
  L7DurableSurfaceId,
  ALL_L7_DURABLE_SURFACE_IDS,
  L7AuthorityStore,
  ALL_L7_AUTHORITY_STORES,
  L7MutationDiscipline,
  ALL_L7_MUTATION_DISCIPLINES,
  L7MaterializationMode,
  ALL_L7_MATERIALIZATION_MODES,
  L7PersistenceClass,
  ALL_L7_PERSISTENCE_CLASSES,
  L7_SURFACE_LEGAL_MODES,
  L7PersistenceEnvelope,
  L7TransitionDeltaKind,
  L7MaterializationStage,
  L7ValidationRunRecord,
  L7ValidationTransitionRecord,
  L7ValidationFailureRecord,
  // Current + historical row shapes
  L7CurrentValidationRow,
  L7CurrentContradictionRow,
  L7CurrentConfidenceRow,
  L7CurrentRestrictionRow,
  L7HistoricalValidationFact,
  L7HistoricalContradictionFact,
  L7HistoricalConfidenceFact,
  L7HistoricalRestrictionFact,
  // Evidence
  L7EvidenceClass,
  ALL_L7_EVIDENCE_CLASSES,
  L7EvidenceSubjectKind,
  L7_EVIDENCE_CLASS_SUBJECT_KIND,
  L7EvidencePointer,
  L7LineagePointer,
  validationEvidencePath,
  contradictionEvidencePath,
  confidenceRationalePath,
  restrictionRationalePath,
  validationForensicPath,
  evidencePathFor,
  isL7EvidenceClass,
  // Read surfaces
  L7ReadSurfaceId,
  ALL_L7_READ_SURFACE_IDS,
  L7ReadMode,
  ALL_L7_READ_MODES,
  L7ConsumerClass,
  ALL_L7_CONSUMER_CLASSES,
  L7ReadRequest,
  // Primitives from earlier sublayers used here
  L7ValidationClass,
  L7ValidationModifier,
  L7ContradictionSeverity,
  L7ContradictionFamily,
  L7ConfidenceBand,
  L7RestrictionRight,
  L7RestrictionReasonCode,
} from '../l7/contracts';

import {
  getDefaultDurableSurfaceRegistry,
  getDefaultReadSurfaceRegistry,
} from '../l7/registry';

import {
  L7PersistenceViolationCode,
  L7_PERSISTENCE_CLASS_TO_SURFACE,
  L7_CURRENT_PERSISTENCE_CLASSES,
  L7_HISTORICAL_PERSISTENCE_CLASSES,
  prepareL7Materialization,
  buildL7PersistenceEnvelope,
  isL7MaterializationReady,
  L7PersistencePolicyValidator,
  L7CurrentStateAuthorityValidator,
  L7HistoricalSurfaceValidator,
  L7EvidenceStorageValidator,
  authorityForPersistenceClass,
  expectedModeSetForClass,
} from '../l7/persistence';

import {
  L7ReadSurfaceValidator,
  L7InMemoryCurrentValidationReadService,
  L7InMemoryCurrentContradictionReadService,
  L7InMemoryHistoricalContradictionReadService,
  L7InMemoryGovernedCurrentConfidenceReadService,
  L7InMemoryGovernedHistoricalConfidenceReadService,
  L7InMemoryGovernedCurrentRestrictionReadService,
  L7InMemoryGovernedHistoricalRestrictionReadService,
  L7InMemoryHistoricalValidationReadService,
  L7InMemoryEvidenceReadService,
  L7InMemoryLineageReadService,
  L7DownstreamConsumptionValidator,
  L7DownstreamConsumptionAttempt,
} from '../l7/read';

import {
  checkL7_7_A_L5OnlyPersistence,
  checkL7_7_B_CurrentAuthorityIsPostgresOnly,
  checkL7_7_C_HistoricalAppendSafety,
  checkL7_7_D_EvidenceArchiveLinked,
  checkL7_7_E_ReadSurfacesGoverned,
  checkL7_7_F_DownstreamUsesReadSurface,
  checkL7_7_G_LineageConsistency,
  validateL7_7_SurfaceAuthorityMap,
} from '../l7/invariants/l7_7-invariants';

import {
  resetPersistenceAuditLog,
  getPersistenceAuditLog,
  getPersistenceViolationsByCode,
  getPersistenceViolationsBySurface,
  hasAnyPersistenceViolations,
  getPersistenceCriticalViolations,
  surfaceForPersistenceViolation,
  defaultSeverityForPersistenceViolation,
} from '../l7/constitution';

// ── Tiny assert harness ────────────────────────────────────────────────

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string): void {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

// ── Shared fixtures ────────────────────────────────────────────────────

const SUBJECT = 's:test:0001';
const SCOPE_TYPE = 'asset';
const SCOPE_ID = 'ETH';
const RUN_ID = 'run-7.7-001';
const TRACE = 'trace-7.7';
const MANIFEST = 'manifest-7.7';
const POLICY = 'pol-7.7-v1';
const REPLAY_HASH = 'rh_7_7_001';
const AS_OF = '2026-04-17T12:00:00.000Z';

const durableRegistry = getDefaultDurableSurfaceRegistry();
const readRegistry = getDefaultReadSurfaceRegistry();

function envelope(
  surface: L7DurableSurfaceId,
  cls: L7PersistenceClass,
  mode: L7MaterializationMode,
  overrides: Partial<L7PersistenceEnvelope> = {},
): L7PersistenceEnvelope {
  const desc = durableRegistry.get(surface)!;
  return {
    envelope_id: `penv:${SUBJECT}:${RUN_ID}:${surface}`,
    surface_id: surface,
    persistence_class: cls,
    materialization_mode: mode,
    authority_store: desc.authority_store,
    mutation_discipline: desc.mutation_discipline,
    subject_id: SUBJECT,
    scope_type: SCOPE_TYPE,
    scope_id: SCOPE_ID,
    validation_result_id: 'vres-1',
    contradiction_bundle_id: null,
    confidence_assessment_id: null,
    restriction_profile_id: null,
    as_of: AS_OF,
    effective_at: AS_OF,
    compute_run_id: RUN_ID,
    policy_version: POLICY,
    replay_generation_ref: null,
    replay_hash: REPLAY_HASH,
    superseded_prior_ref: null,
    correction_parent_ref: null,
    correction_reason: null,
    evidence_pointer_refs: ['evp-1'],
    lineage_refs: { trace_id: TRACE, manifest_id: MANIFEST },
    payload_schema: 'l7.current_validation.v1',
    payload_hash: 'ph-1',
    ...overrides,
  };
}

function currentIdentity(overrides: Partial<L7CurrentValidationRow> = {}): L7CurrentValidationRow {
  return {
    current_state_id: 'cs-1',
    validation_subject_id: SUBJECT,
    scope_type: SCOPE_TYPE,
    scope_id: SCOPE_ID,
    effective_as_of: AS_OF,
    compute_run_id: RUN_ID,
    policy_version: POLICY,
    materialization_mode: L7MaterializationMode.LIVE_CURRENT,
    replay_hash: REPLAY_HASH,
    superseded_prior_ref: null,
    evidence_pointer_refs: ['evp-1'],
    lineage_refs: { trace_id: TRACE, manifest_id: MANIFEST },
    validation_result_id: 'vres-1',
    validation_class: L7ValidationClass.CONFIRMED,
    validation_modifiers: [],
    support_strength_score: 0.9,
    contradiction_bundle_ref: null,
    confidence_assessment_ref: null,
    restriction_profile_ref: null,
    staleness_flag: false,
    incompleteness_flag: false,
    ambiguity_flag: false,
    degradation_flag: false,
    ...overrides,
  };
}

function historicalFact(overrides: Partial<L7HistoricalValidationFact> = {}): L7HistoricalValidationFact {
  return {
    fact_id: 'hf-1',
    validation_subject_id: SUBJECT,
    scope_type: SCOPE_TYPE,
    scope_id: SCOPE_ID,
    as_of: AS_OF,
    effective_at: AS_OF,
    compute_run_id: RUN_ID,
    replay_generation_ref: null,
    materialization_mode: L7MaterializationMode.LIVE_HISTORICAL,
    policy_version: POLICY,
    lineage_refs: { trace_id: TRACE, manifest_id: MANIFEST },
    evidence_pack_ref: 'ev-1',
    input_snapshot_ref: 'snap-1',
    replay_hash: REPLAY_HASH,
    correction_parent_ref: null,
    correction_reason: null,
    validation_class: L7ValidationClass.CONFIRMED,
    validation_modifiers: [],
    support_strength_score: 0.9,
    contradiction_severity: L7ContradictionSeverity.INFO,
    incompleteness_score: 0,
    staleness_score: 0,
    ambiguity_score: 0,
    degradation_score: 0,
    ...overrides,
  };
}

function evidencePointer(overrides: Partial<L7EvidencePointer> = {}): L7EvidencePointer {
  const cls = overrides.evidence_class ?? L7EvidenceClass.VALIDATION_EVIDENCE_PACK;
  const subjectRef = overrides.subject_ref ?? SUBJECT;
  const computeRunId = overrides.compute_run_id ?? RUN_ID;
  const checksum = overrides.checksum ?? 'cksum-1';
  const archiveUri =
    overrides.archive_uri ?? `s3://coinet-archive/${evidencePathFor(cls, subjectRef, computeRunId, checksum)}`;
  return {
    evidence_id: 'evp-1',
    evidence_class: cls,
    subject_kind: L7_EVIDENCE_CLASS_SUBJECT_KIND[cls],
    subject_ref: subjectRef,
    archive_uri: archiveUri,
    checksum,
    manifest_id: MANIFEST,
    content_type: 'application/json',
    schema_version: 'v1',
    compute_run_id: computeRunId,
    replay_generation_ref: null,
    created_at: AS_OF,
    payload_byte_length: 512,
    lineage_refs: { trace_id: TRACE },
    ...overrides,
  };
}

function readReq(overrides: Partial<L7ReadRequest> = {}): L7ReadRequest {
  return {
    surface_id: L7ReadSurfaceId.CURRENT_VALIDATION_BY_SCOPE,
    mode: L7ReadMode.CURRENT_LIVE,
    consumer_class: L7ConsumerClass.REGIME_ENGINE,
    consumer_service: 'regime-engine-v1',
    subject_id: SUBJECT,
    scope_type: SCOPE_TYPE,
    scope_id: SCOPE_ID,
    window_from_iso: null,
    window_to_iso: null,
    compute_run_id: null,
    replay_generation_ref: null,
    as_of_iso: null,
    trace_id: TRACE,
    claims_revalidation_from_l6: false,
    claims_raw_storage_access: false,
    claims_redis_authoritative_read: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// BAND A — DURABLE SURFACES + AUTHORITY LAW
// ═══════════════════════════════════════════════════════════════════════

function bandA_durableSurfaces(): void {
  console.log('\n─── BAND A: durable surfaces + authority law ───');

  // A.1 enum completeness
  assert(ALL_L7_DURABLE_SURFACE_IDS.length === 14, 'exactly 14 durable surfaces registered');
  assert(ALL_L7_AUTHORITY_STORES.length === 3, 'exactly 3 authority stores declared (PG, CH, OBJECT)');
  assert(ALL_L7_MUTATION_DISCIPLINES.length === 6, 'exactly 6 mutation disciplines');
  assert(ALL_L7_MATERIALIZATION_MODES.length === 5, 'exactly 5 materialization modes');
  assert(ALL_L7_PERSISTENCE_CLASSES.length === 14, 'exactly 14 persistence classes');

  assert(!ALL_L7_AUTHORITY_STORES.includes('REDIS' as L7AuthorityStore),
    'Redis is not a registered authority store');

  // A.2 registry integrity
  for (const id of ALL_L7_DURABLE_SURFACE_IDS) {
    const d = durableRegistry.get(id);
    assert(d !== null, `surface ${id} registered`);
    assert(d!.allowed_modes.length > 0, `surface ${id} has allowed modes`);
  }

  // A.3 authority-map integrity (Postgres current, ClickHouse historical)
  for (const cls of L7_CURRENT_PERSISTENCE_CLASSES) {
    const surface = L7_PERSISTENCE_CLASS_TO_SURFACE[cls];
    assert(durableRegistry.authorityFor(surface) === L7AuthorityStore.POSTGRES,
      `current class ${cls} → Postgres authority`);
    assert(durableRegistry.mutationDisciplineFor(surface) === L7MutationDiscipline.CURRENT_SUPERSEDED,
      `current class ${cls} → CURRENT_SUPERSEDED discipline`);
  }
  for (const cls of L7_HISTORICAL_PERSISTENCE_CLASSES) {
    const surface = L7_PERSISTENCE_CLASS_TO_SURFACE[cls];
    assert(durableRegistry.authorityFor(surface) === L7AuthorityStore.CLICKHOUSE,
      `historical class ${cls} → ClickHouse authority`);
    assert(durableRegistry.mutationDisciplineFor(surface) === L7MutationDiscipline.IMMUTABLE_APPEND,
      `historical class ${cls} → IMMUTABLE_APPEND`);
  }

  const sanity = validateL7_7_SurfaceAuthorityMap();
  assert(sanity.ok, 'authority-map sanity passes');

  // Archive pointer + lineage pointer are POSTGRES POINTER_APPEND
  assert(
    durableRegistry.authorityFor(L7DurableSurfaceId.EVIDENCE_POINTERS) === L7AuthorityStore.POSTGRES,
    'evidence_pointers → Postgres',
  );
  assert(
    durableRegistry.mutationDisciplineFor(L7DurableSurfaceId.EVIDENCE_POINTERS) === L7MutationDiscipline.POINTER_APPEND,
    'evidence_pointers → POINTER_APPEND',
  );

  // Helper functions align with registry
  for (const cls of ALL_L7_PERSISTENCE_CLASSES) {
    const surface = L7_PERSISTENCE_CLASS_TO_SURFACE[cls];
    assert(authorityForPersistenceClass(cls) === durableRegistry.authorityFor(surface),
      `authorityForPersistenceClass(${cls}) matches registry`);
    const modes = expectedModeSetForClass(cls);
    assert(modes.length > 0, `class ${cls} has ≥1 legal mode`);
  }

  // A.4 legal-mode map: current registries = LIVE_CURRENT only
  for (const cls of L7_CURRENT_PERSISTENCE_CLASSES) {
    const surface = L7_PERSISTENCE_CLASS_TO_SURFACE[cls];
    const legal = L7_SURFACE_LEGAL_MODES[surface];
    assert(legal.length === 1 && legal[0] === L7MaterializationMode.LIVE_CURRENT,
      `current surface ${surface} accepts LIVE_CURRENT only`);
  }
  for (const cls of L7_HISTORICAL_PERSISTENCE_CLASSES) {
    const surface = L7_PERSISTENCE_CLASS_TO_SURFACE[cls];
    const legal = L7_SURFACE_LEGAL_MODES[surface];
    assert(!legal.includes(L7MaterializationMode.LIVE_CURRENT),
      `historical surface ${surface} does NOT accept LIVE_CURRENT`);
    assert(legal.includes(L7MaterializationMode.REPLAY_HISTORICAL),
      `historical surface ${surface} accepts REPLAY_HISTORICAL`);
    assert(legal.includes(L7MaterializationMode.REPAIR_REBUILD),
      `historical surface ${surface} accepts REPAIR_REBUILD`);
  }

  // A.5 materialization readiness predicate
  assert(
    isL7MaterializationReady({
      contract_legal: true,
      runtime_complete: true,
      payload_hash: 'ph',
      surface_id: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
      materialization_mode: L7MaterializationMode.LIVE_CURRENT,
    }),
    'ready: current + LIVE_CURRENT',
  );
  assert(
    !isL7MaterializationReady({
      contract_legal: false,
      runtime_complete: true,
      payload_hash: 'ph',
      surface_id: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
      materialization_mode: L7MaterializationMode.LIVE_CURRENT,
    }),
    'not ready: contract illegal',
  );
  assert(
    !isL7MaterializationReady({
      contract_legal: true,
      runtime_complete: true,
      payload_hash: 'ph',
      surface_id: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
      materialization_mode: L7MaterializationMode.REPLAY_HISTORICAL,
    }),
    'not ready: mode illegal on current surface',
  );

  // A.6 materialization policy — happy path
  const prep = prepareL7Materialization({
    surface_id: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
    persistence_class: L7PersistenceClass.CURRENT_VALIDATION,
    materialization_mode: L7MaterializationMode.LIVE_CURRENT,
    subject_id: SUBJECT,
    scope_type: SCOPE_TYPE,
    scope_id: SCOPE_ID,
    compute_run_id: RUN_ID,
    policy_version: POLICY,
    replay_hash: REPLAY_HASH,
    replay_generation_ref: null,
    as_of: AS_OF,
    effective_at: AS_OF,
    trace_id: TRACE,
    manifest_id: MANIFEST,
    validation_result_id: 'vres-1',
    evidence_pointer_refs: ['evp-1'],
    contract_legal: true,
    runtime_complete: true,
    payload_schema: 'l7.current_validation.v1',
    payload_hash: 'ph-1',
  });
  assert(prep.ok, 'prepare materialization (current validation, LIVE_CURRENT) succeeds');
  if (prep.ok) {
    assert(prep.envelope.authority_store === L7AuthorityStore.POSTGRES,
      'envelope authority is Postgres');
    assert(prep.envelope.mutation_discipline === L7MutationDiscipline.CURRENT_SUPERSEDED,
      'envelope discipline is CURRENT_SUPERSEDED');
  }

  // A.7 materialization policy — class ↔ surface mismatch
  const prepBadClass = prepareL7Materialization({
    surface_id: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
    persistence_class: L7PersistenceClass.HISTORICAL_VALIDATION,
    materialization_mode: L7MaterializationMode.LIVE_CURRENT,
    subject_id: SUBJECT,
    scope_type: SCOPE_TYPE,
    scope_id: SCOPE_ID,
    compute_run_id: RUN_ID,
    policy_version: POLICY,
    replay_hash: REPLAY_HASH,
    replay_generation_ref: null,
    as_of: AS_OF,
    effective_at: AS_OF,
    trace_id: TRACE,
    manifest_id: MANIFEST,
    evidence_pointer_refs: ['evp-1'],
    contract_legal: true,
    runtime_complete: true,
    payload_schema: 'x',
    payload_hash: 'x',
  });
  assert(!prepBadClass.ok, 'prepare fails: historical class on current surface');
  if (!prepBadClass.ok) {
    const viols = (prepBadClass as { violations: readonly { code: string }[] }).violations;
    assert(
      viols.some(v => v.code === L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE),
      'AUTHORITY_STORE_INVALID_FOR_SURFACE emitted',
    );
  }

  // A.8 replay-written-as-live attempt
  const prepReplayAsLive = prepareL7Materialization({
    surface_id: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
    persistence_class: L7PersistenceClass.CURRENT_VALIDATION,
    materialization_mode: L7MaterializationMode.REPLAY_HISTORICAL,
    subject_id: SUBJECT,
    scope_type: SCOPE_TYPE,
    scope_id: SCOPE_ID,
    compute_run_id: RUN_ID,
    policy_version: POLICY,
    replay_hash: REPLAY_HASH,
    replay_generation_ref: null,
    as_of: AS_OF,
    effective_at: AS_OF,
    trace_id: TRACE,
    manifest_id: MANIFEST,
    evidence_pointer_refs: ['evp-1'],
    contract_legal: true,
    runtime_complete: true,
    payload_schema: 'x',
    payload_hash: 'x',
  });
  assert(!prepReplayAsLive.ok, 'prepare fails: replay mode on current class');
  if (!prepReplayAsLive.ok) {
    const viols = (prepReplayAsLive as { violations: readonly { code: string }[] }).violations;
    assert(
      viols.some(v =>
        v.code === L7PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE ||
        v.code === L7PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID,
      ),
      'REPLAY_WRITTEN_AS_LIVE / mode-invalid emitted',
    );
  }

  // A.9 evidence-required policy
  const prepNoEvidence = prepareL7Materialization({
    surface_id: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
    persistence_class: L7PersistenceClass.CURRENT_VALIDATION,
    materialization_mode: L7MaterializationMode.LIVE_CURRENT,
    subject_id: SUBJECT,
    scope_type: SCOPE_TYPE,
    scope_id: SCOPE_ID,
    compute_run_id: RUN_ID,
    policy_version: POLICY,
    replay_hash: REPLAY_HASH,
    replay_generation_ref: null,
    as_of: AS_OF,
    effective_at: AS_OF,
    trace_id: TRACE,
    manifest_id: MANIFEST,
    evidence_pointer_refs: [],
    contract_legal: true,
    runtime_complete: true,
    payload_schema: 'x',
    payload_hash: 'x',
  });
  assert(!prepNoEvidence.ok, 'prepare fails: current registry requires evidence refs');
  if (!prepNoEvidence.ok) {
    const viols = (prepNoEvidence as { violations: readonly { code: string }[] }).violations;
    assert(
      viols.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_REQUIRED_BUT_ABSENT),
      'EVIDENCE_REQUIRED_BUT_ABSENT emitted',
    );
  }

  // A.10 persistence policy validator — direct-store bypass
  const policyValidator = new L7PersistencePolicyValidator();
  const env1 = envelope(
    L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
    L7PersistenceClass.CURRENT_VALIDATION,
    L7MaterializationMode.LIVE_CURRENT,
  );
  const bypassResult = policyValidator.validate(env1, {
    source: 'ad-hoc.writer',
    bypasses_l5: true,
    direct_store_target: L7AuthorityStore.POSTGRES,
    redis_as_authority: false,
  });
  assert(!bypassResult.ok, 'L5 bypass rejected');
  assert(
    bypassResult.violations.some(v => v.code === L7PersistenceViolationCode.L5_BYPASS_ATTEMPT),
    'L5_BYPASS_ATTEMPT emitted',
  );

  // A.11 Redis-as-authority rejection
  const redisAttempt = policyValidator.validate(env1, {
    source: 'cache.writer',
    redis_as_authority: true,
  });
  assert(!redisAttempt.ok, 'Redis-as-authority rejected');
  assert(
    redisAttempt.violations.some(v => v.code === L7PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT),
    'REDIS_AS_AUTHORITY_ATTEMPT emitted',
  );

  // A.12 direct-store bypass into wrong store
  const env2 = envelope(
    L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS,
    L7PersistenceClass.HISTORICAL_VALIDATION,
    L7MaterializationMode.LIVE_HISTORICAL,
  );
  const wrongStore = policyValidator.validate(env2, {
    source: 'ch.writer',
    direct_store_target: L7AuthorityStore.POSTGRES,
  });
  assert(!wrongStore.ok, 'wrong-store direct target rejected');
  assert(
    wrongStore.violations.some(v => v.code === L7PersistenceViolationCode.DIRECT_STORE_BYPASS),
    'DIRECT_STORE_BYPASS emitted',
  );

  // A.13 mutation-discipline check: IMMUTABLE_APPEND cannot be destructively overwritten
  const envHist = envelope(
    L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS,
    L7PersistenceClass.HISTORICAL_VALIDATION,
    L7MaterializationMode.LIVE_HISTORICAL,
  );
  const destructiveAttempt = policyValidator.validate(envHist, {
    source: 'test',
    destructive_overwrite: true,
  });
  assert(!destructiveAttempt.ok, 'destructive overwrite on IMMUTABLE_APPEND rejected');
  assert(
    destructiveAttempt.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE),
    'HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE emitted',
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BAND B — HISTORICAL SURFACES
// ═══════════════════════════════════════════════════════════════════════

function bandB_historical(): void {
  console.log('\n─── BAND B: historical surfaces (append-safe) ───');

  const hv = new L7HistoricalSurfaceValidator();
  const envOk = envelope(
    L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS,
    L7PersistenceClass.HISTORICAL_VALIDATION,
    L7MaterializationMode.LIVE_HISTORICAL,
  );

  // B.1 happy path
  const r1 = hv.validate(envOk, historicalFact(), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(r1.ok, 'happy path: clean historical fact accepted');

  // B.2 missing replay hash
  const rMissingRH = hv.validate(envOk, historicalFact({ replay_hash: '' }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(!rMissingRH.ok, 'missing replay_hash rejected');
  assert(
    rMissingRH.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY),
    'HISTORICAL_ROW_MISSING_REPLAY_IDENTITY emitted',
  );

  // B.3 missing policy version
  const rMissingPV = hv.validate(envOk, historicalFact({ policy_version: '' }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(
    rMissingPV.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_ROW_POLICY_VERSION_MISSING),
    'HISTORICAL_ROW_POLICY_VERSION_MISSING emitted',
  );

  // B.4 missing lineage
  const rMissingLineage = hv.validate(envOk, historicalFact({ lineage_refs: { trace_id: '', manifest_id: '' } }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(
    rMissingLineage.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE),
    'HISTORICAL_ROW_MISSING_LINEAGE emitted',
  );

  // B.5 missing evidence ref when required
  const rMissingEvidence = hv.validate(envOk, historicalFact({ evidence_pack_ref: null }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(
    rMissingEvidence.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_ROW_EVIDENCE_REF_MISSING),
    'HISTORICAL_ROW_EVIDENCE_REF_MISSING emitted',
  );

  // B.6 destructive overwrite
  const rDestructive = hv.validate(envOk, historicalFact(), {
    destructive_overwrite: true,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(
    rDestructive.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE),
    'destructive overwrite rejected',
  );

  // B.7 silent current mutation from historical write
  const rSilent = hv.validate(envOk, historicalFact(), {
    destructive_overwrite: false,
    mutated_current_state: true,
    evidence_required: true,
  });
  assert(
    rSilent.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY),
    'HISTORICAL_MUTATES_CURRENT_SILENTLY emitted',
  );

  // B.8 LIVE_CURRENT mode on historical surface
  const envBadMode = {
    ...envOk,
    materialization_mode: L7MaterializationMode.LIVE_CURRENT,
  };
  const rBadMode = hv.validate(envBadMode, historicalFact({ materialization_mode: L7MaterializationMode.LIVE_CURRENT }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(
    rBadMode.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_ROW_MODE_MISSING),
    'historical row with LIVE_CURRENT mode rejected',
  );

  // B.9 correction row — happy
  const rCorrection = hv.validate(envOk, historicalFact({
    fact_id: 'hf-correction-1',
    correction_parent_ref: 'hf-1',
    correction_reason: 'late_data_revalidation',
  }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
    expected_parent_fact_id: 'hf-1',
  });
  assert(rCorrection.ok, 'correction row with proper linkage accepted');

  // B.10 correction row missing reason
  const rCorrNoReason = hv.validate(envOk, historicalFact({
    correction_parent_ref: 'hf-1',
    correction_reason: null,
  }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(
    rCorrNoReason.violations.some(v => v.code === L7PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON),
    'CORRECTION_ROW_MISSING_REASON emitted',
  );

  // B.11 correction row missing parent
  const rCorrNoParent = hv.validate(envOk, historicalFact({
    correction_parent_ref: null,
    correction_reason: 'late_data',
  }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(
    rCorrNoParent.violations.some(v => v.code === L7PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT),
    'CORRECTION_ROW_MISSING_PARENT emitted',
  );

  // B.12 correction row parent mismatch
  const rCorrWrongParent = hv.validate(envOk, historicalFact({
    correction_parent_ref: 'hf-999',
    correction_reason: 'late_data',
  }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
    expected_parent_fact_id: 'hf-1',
  });
  assert(
    rCorrWrongParent.violations.some(v => v.code === L7PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT),
    'mismatched parent ref flagged',
  );

  // B.13 REPLAY_HISTORICAL legal
  const envReplay = {
    ...envOk,
    materialization_mode: L7MaterializationMode.REPLAY_HISTORICAL,
  };
  const rReplay = hv.validate(envReplay, historicalFact({
    materialization_mode: L7MaterializationMode.REPLAY_HISTORICAL,
    replay_generation_ref: 'replay-gen-1',
  }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(rReplay.ok, 'REPLAY_HISTORICAL mode on historical surface accepted');

  // B.14 repair rebuild legal
  const envRepair = {
    ...envOk,
    materialization_mode: L7MaterializationMode.REPAIR_REBUILD,
  };
  const rRepair = hv.validate(envRepair, historicalFact({
    materialization_mode: L7MaterializationMode.REPAIR_REBUILD,
    replay_generation_ref: 'repair-gen-1',
  }), {
    destructive_overwrite: false,
    mutated_current_state: false,
    evidence_required: true,
  });
  assert(rRepair.ok, 'REPAIR_REBUILD mode on historical surface accepted');

  // B.15 INV-7.7-C wrapper
  const invC = checkL7_7_C_HistoricalAppendSafety({
    envelope: envOk,
    row: historicalFact(),
    context: {
      destructive_overwrite: false,
      mutated_current_state: false,
      evidence_required: true,
    },
  });
  assert(invC.ok, 'INV-7.7-C satisfied on clean historical write');

  const invCFail = checkL7_7_C_HistoricalAppendSafety({
    envelope: envOk,
    row: historicalFact({ replay_hash: '' }),
    context: {
      destructive_overwrite: false,
      mutated_current_state: false,
      evidence_required: true,
    },
  });
  assert(!invCFail.ok, 'INV-7.7-C fails on missing replay identity');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND C — EVIDENCE STORAGE
// ═══════════════════════════════════════════════════════════════════════

function bandC_evidence(): void {
  console.log('\n─── BAND C: evidence storage ───');

  // C.1 evidence class enum completeness
  assert(ALL_L7_EVIDENCE_CLASSES.length === 5, '5 evidence classes registered');
  for (const c of ALL_L7_EVIDENCE_CLASSES) {
    assert(isL7EvidenceClass(c), `isL7EvidenceClass recognizes ${c}`);
    assert(!!L7_EVIDENCE_CLASS_SUBJECT_KIND[c], `evidence class ${c} mapped to subject kind`);
  }

  // C.2 deterministic path builders
  const p1 = validationEvidencePath('s:1', 'run-1', 'h1');
  assert(p1.startsWith('l7/evidence/validation/'), 'validation evidence path prefix');
  assert(p1.endsWith('.json'), 'validation evidence path ends .json');
  assert(
    validationEvidencePath('s:1', 'run-1', 'h1') === validationEvidencePath('s:1', 'run-1', 'h1'),
    'validation path deterministic',
  );
  assert(contradictionEvidencePath('b:1', 'run-1', 'h').startsWith('l7/evidence/contradiction/'), 'contradiction path prefix');
  assert(confidenceRationalePath('a:1', 'run-1', 'h').startsWith('l7/evidence/confidence/'), 'confidence path prefix');
  assert(restrictionRationalePath('p:1', 'run-1', 'h').startsWith('l7/evidence/restriction/'), 'restriction path prefix');
  assert(validationForensicPath('run-1', 'h').startsWith('l7/evidence/forensic/'), 'forensic path prefix');

  // evidencePathFor dispatch
  for (const c of ALL_L7_EVIDENCE_CLASSES) {
    const p = evidencePathFor(c, 'ref-1', 'run-1', 'h');
    assert(p.startsWith('l7/evidence/') && p.endsWith('.json'), `evidencePathFor(${c}) deterministic`);
  }
  // Path sanitization — dangerous chars stripped.
  const nasty = validationEvidencePath('s:1/../etc', 'run 1', 'h/?');
  assert(!nasty.includes('..'), 'path sanitizer drops traversal dots');
  assert(!nasty.includes(' '), 'path sanitizer strips spaces');

  // C.3 evidence-storage validator happy path
  const ev = new L7EvidenceStorageValidator();
  const ptr = evidencePointer();
  const rOk = ev.validate(ptr, {
    expected_subject_ref: SUBJECT,
    expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
    expected_compute_run_id: RUN_ID,
    replay_required: false,
  });
  assert(rOk.ok, 'happy-path evidence pointer accepted');

  // C.4 missing archive uri
  const rNoUri = ev.validate(evidencePointer({ archive_uri: '' }), {
    expected_subject_ref: SUBJECT,
    expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
    expected_compute_run_id: RUN_ID,
    replay_required: false,
  });
  assert(
    rNoUri.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING),
    'EVIDENCE_ARCHIVE_URI_MISSING emitted',
  );

  // C.5 missing checksum
  const rNoChecksum = ev.validate(evidencePointer({ checksum: '' }), {
    expected_subject_ref: SUBJECT,
    expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
    expected_compute_run_id: RUN_ID,
    replay_required: false,
  });
  assert(
    rNoChecksum.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_CHECKSUM_MISSING),
    'EVIDENCE_CHECKSUM_MISSING emitted',
  );

  // C.6 missing manifest linkage
  const rNoManifest = ev.validate(evidencePointer({ manifest_id: '' }), {
    expected_subject_ref: SUBJECT,
    expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
    expected_compute_run_id: RUN_ID,
    replay_required: false,
  });
  assert(
    rNoManifest.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_MANIFEST_LINKAGE_MISSING),
    'EVIDENCE_MANIFEST_LINKAGE_MISSING emitted',
  );

  // C.7 orphan: subject mismatch
  const rOrphan = ev.validate(evidencePointer({ subject_ref: 'wrong' }), {
    expected_subject_ref: SUBJECT,
    expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
    expected_compute_run_id: RUN_ID,
    replay_required: false,
  });
  assert(
    rOrphan.violations.some(v => v.code === L7PersistenceViolationCode.ORPHAN_EVIDENCE),
    'ORPHAN_EVIDENCE on subject_ref mismatch',
  );

  // C.8 class ↔ subject-kind mismatch
  const rClassMismatch = ev.validate(evidencePointer({
    evidence_class: L7EvidenceClass.VALIDATION_EVIDENCE_PACK,
    subject_kind: L7EvidenceSubjectKind.CONFIDENCE_ASSESSMENT,
  }), {
    expected_subject_ref: SUBJECT,
    expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
    expected_compute_run_id: RUN_ID,
    replay_required: false,
  });
  assert(
    rClassMismatch.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_CLASS_PAYLOAD_MISMATCH),
    'EVIDENCE_CLASS_PAYLOAD_MISMATCH emitted',
  );

  // C.9 replay-required missing
  const rNoReplay = ev.validate(evidencePointer({ replay_generation_ref: null }), {
    expected_subject_ref: SUBJECT,
    expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
    expected_compute_run_id: RUN_ID,
    replay_required: true,
  });
  assert(
    rNoReplay.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_REPLAY_REF_MISSING),
    'EVIDENCE_REPLAY_REF_MISSING emitted',
  );

  // C.10 non-deterministic archive path
  const rBadPath = ev.validate(evidencePointer({ archive_uri: 's3://bucket/wrong/path.json' }), {
    expected_subject_ref: SUBJECT,
    expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
    expected_compute_run_id: RUN_ID,
    replay_required: false,
  });
  assert(
    rBadPath.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_PATH_NON_DETERMINISTIC),
    'EVIDENCE_PATH_NON_DETERMINISTIC emitted',
  );

  // C.11 evidence-required helper
  const rReq = ev.validateEvidenceRequired(SUBJECT, 'l7.current_validation_registry', []);
  assert(
    !rReq.ok &&
      rReq.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_REQUIRED_BUT_ABSENT),
    'validateEvidenceRequired(empty) flagged',
  );

  // C.12 INV-7.7-D wrapper
  const invD = checkL7_7_D_EvidenceArchiveLinked({
    pointer: evidencePointer(),
    context: {
      expected_subject_ref: SUBJECT,
      expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
      expected_compute_run_id: RUN_ID,
      replay_required: false,
    },
  });
  assert(invD.ok, 'INV-7.7-D satisfied on clean evidence pointer');
  const invDFail = checkL7_7_D_EvidenceArchiveLinked({
    pointer: evidencePointer({ archive_uri: '' }),
    context: {
      expected_subject_ref: SUBJECT,
      expected_subject_kind: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
      expected_compute_run_id: RUN_ID,
      replay_required: false,
    },
  });
  assert(!invDFail.ok, 'INV-7.7-D fails on missing archive_uri');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND D — READ SURFACES (runBandD, declared below so main() can await it)
// ═══════════════════════════════════════════════════════════════════════

// NOTE: `bandD_readSurfaces` intentionally unused — the async variant
// `runBandD` supersedes it; left here so future synchronous tests can
// reuse the structure if needed.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _bandD_readSurfaces_unused(): void {
  console.log('\n─── BAND D: read surfaces ───');

  // D.1 registry integrity
  assert(ALL_L7_READ_SURFACE_IDS.length === 13, '13 read surfaces registered');
  assert(ALL_L7_READ_MODES.length === 5, '5 read modes');
  assert(ALL_L7_CONSUMER_CLASSES.length === 9, '9 consumer classes');
  // Current restriction surface explicitly present.
  assert(readRegistry.isRegistered(L7ReadSurfaceId.CURRENT_RESTRICTION_BY_SCOPE),
    'CURRENT_RESTRICTION_BY_SCOPE registered');

  // D.2 read-surface validator
  const rv = new L7ReadSurfaceValidator();
  const rOk = rv.validate(readReq());
  assert(rOk.ok, 'happy-path current validation read accepted');

  // Unknown surface
  const rUnknown = rv.validate(readReq({ surface_id: 'l7.read.nope' as L7ReadSurfaceId }));
  assert(!rOk.ok === false, 'sanity: happy path passed');
  assert(
    rUnknown.violations.some(v => v.code === L7PersistenceViolationCode.READ_SURFACE_NOT_REGISTERED),
    'READ_SURFACE_NOT_REGISTERED emitted',
  );

  // Illegal mode (historical on current surface)
  const rBadMode = rv.validate(readReq({ mode: L7ReadMode.HISTORICAL_WINDOW }));
  assert(
    rBadMode.violations.some(v => v.code === L7PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE),
    'READ_MODE_INVALID_FOR_SURFACE emitted',
  );

  // Illegal consumer class
  const rBadConsumer = rv.validate(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
    mode: L7ReadMode.HISTORICAL_WINDOW,
    consumer_class: L7ConsumerClass.REGIME_ENGINE,
  }));
  assert(
    rBadConsumer.violations.some(v => v.code === L7PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED),
    'CONSUMER_CLASS_NOT_ALLOWED emitted (REGIME_ENGINE on history)',
  );

  // Raw storage claim
  const rRaw = rv.validate(readReq({ claims_raw_storage_access: true }));
  assert(
    rRaw.violations.some(v => v.code === L7PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT),
    'RAW_STORAGE_READ_ATTEMPT emitted',
  );

  // Redis authoritative read claim
  const rRedis = rv.validate(readReq({ claims_redis_authoritative_read: true }));
  assert(
    rRedis.violations.some(v => v.code === L7PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE),
    'REDIS_READ_AS_AUTHORITATIVE emitted',
  );

  // L6 revalidation by non-adapter
  const rL6 = rv.validate(readReq({
    claims_revalidation_from_l6: true,
    consumer_class: L7ConsumerClass.DETERMINISTIC_SCORER,
  }));
  assert(
    rL6.violations.some(v => v.code === L7PersistenceViolationCode.AD_HOC_REVALIDATION_FROM_L6),
    'AD_HOC_REVALIDATION_FROM_L6 emitted',
  );

  // L6 revalidation by REPLAY_ADAPTER under REPLAY_RECONSTRUCTION ✓
  const rL6Legit = rv.validate(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
    mode: L7ReadMode.REPLAY_RECONSTRUCTION,
    consumer_class: L7ConsumerClass.REPLAY_ADAPTER,
    claims_revalidation_from_l6: true,
  }));
  assert(rL6Legit.ok, 'replay adapter + REPLAY_RECONSTRUCTION + L6 rebuild accepted');

  // Missing scope when scope required
  const rNoScope = rv.validate(readReq({ subject_id: null, scope_type: null, scope_id: null }));
  assert(!rNoScope.ok, 'missing scope rejected');

  // Evidence read without subject_id (pointer)
  const rEvNoPtr = rv.validate(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_EVIDENCE_BY_SUBJECT,
    mode: L7ReadMode.FORENSIC_EVIDENCE_VIEW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
    subject_id: null,
    scope_type: null,
    scope_id: null,
  }));
  assert(
    rEvNoPtr.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_READ_WITHOUT_POINTER),
    'EVIDENCE_READ_WITHOUT_POINTER emitted',
  );

  // D.3 Current validation read service (governed)
  const validator = new L7ReadSurfaceValidator();
  const cvSvc = new L7InMemoryCurrentValidationReadService(validator);
  const row = currentIdentity();
  cvSvc.upsert(row);
  const got = await_(cvSvc.getCurrentValidation(readReq()));
  assert(got.ok && got.value?.current_state_id === 'cs-1', 'current validation read returned row');

  // Illegal-mode call
  const gotBad = await_(cvSvc.getCurrentValidation(readReq({ mode: L7ReadMode.HISTORICAL_WINDOW })));
  assert(!gotBad.ok, 'illegal mode on current validation read rejected');

  // D.4 Current contradiction read
  const ccSvc = new L7InMemoryCurrentContradictionReadService(validator);
  const contradictionRow: L7CurrentContradictionRow = {
    ...row,
    current_state_id: 'cs-contra-1',
    contradiction_bundle_id: 'cb-1',
    cluster_count: 2,
    highest_severity: L7ContradictionSeverity.MATERIAL,
    dominant_family: L7ContradictionFamily.CROSS_SOURCE_DISAGREEMENT,
    blocked_confirmation_surfaces: [],
    stale_support_refs: [],
    missing_support_refs: [],
    unresolved: true,
  };
  ccSvc.upsert(contradictionRow);
  const cgot = await_(ccSvc.getCurrentContradiction(readReq({
    surface_id: L7ReadSurfaceId.CURRENT_CONTRADICTION_BY_SCOPE,
  })));
  assert(cgot.ok && cgot.value?.contradiction_bundle_id === 'cb-1', 'current contradiction read returned row');

  // D.5 Governed current confidence read
  const gcSvc = new L7InMemoryGovernedCurrentConfidenceReadService(validator);
  const confRow: L7CurrentConfidenceRow = {
    ...row,
    current_state_id: 'cs-conf-1',
    confidence_assessment_id: 'ca-1',
    raw_score_100: 88,
    capped_score_100: 88,
    confidence_band: L7ConfidenceBand.HIGH,
    cap_classes_applied: [],
    penalty_classes_applied: [],
    restriction_profile_ref: null,
  };
  gcSvc.upsert(confRow);
  const gcGot = await_(gcSvc.getCurrentConfidence(readReq({
    surface_id: L7ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE,
  })));
  assert(gcGot.ok && gcGot.value?.confidence_band === L7ConfidenceBand.HIGH, 'current confidence row HIGH');

  // D.6 Governed current restriction read
  const grSvc = new L7InMemoryGovernedCurrentRestrictionReadService(validator);
  const restrictionRow: L7CurrentRestrictionRow = {
    ...row,
    current_state_id: 'cs-res-1',
    restriction_profile_id: 'rp-1',
    downstream_use_rights: [L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
    restriction_reasons: [L7RestrictionReasonCode.CONFIRMED_NO_RISK],
    requires_contradiction_disclosure: false,
    requires_additional_confirmation: false,
    evidence_only_mode: false,
    blocked_from_score_driving: false,
  };
  grSvc.upsert(restrictionRow);
  const grGot = await_(grSvc.getCurrentRestriction(readReq({
    surface_id: L7ReadSurfaceId.CURRENT_RESTRICTION_BY_SCOPE,
  })));
  assert(grGot.ok && grGot.value?.restriction_profile_id === 'rp-1', 'current restriction row found');

  // D.7 Historical validation window read
  const hvSvc = new L7InMemoryHistoricalValidationReadService(validator);
  hvSvc.append(historicalFact({ fact_id: 'hf-a', as_of: '2026-01-01T00:00:00Z' }));
  hvSvc.append(historicalFact({ fact_id: 'hf-b', as_of: '2026-02-01T00:00:00Z' }));
  hvSvc.append(historicalFact({ fact_id: 'hf-c', as_of: '2026-03-01T00:00:00Z' }));
  const hvGot = await_(hvSvc.getValidationHistory(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
    mode: L7ReadMode.HISTORICAL_WINDOW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
    window_from_iso: '2026-01-15T00:00:00Z',
    window_to_iso: '2026-02-15T00:00:00Z',
  })));
  assert(hvGot.ok && (hvGot.value as readonly unknown[]).length === 1, 'historical window filters correctly');

  // D.8 Evidence read service
  const erSvc = new L7InMemoryEvidenceReadService(validator);
  const ptr = evidencePointer();
  erSvc.putPointer(ptr, '{"evidence":"payload"}');
  const erGot = await_(erSvc.readEvidence(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_EVIDENCE_BY_SUBJECT,
    mode: L7ReadMode.FORENSIC_EVIDENCE_VIEW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
    subject_id: SUBJECT,
    scope_type: null,
    scope_id: null,
  })));
  assert(erGot.ok && erGot.value?.archive_resolved === true, 'evidence pointer resolved');

  // D.9 Lineage read service
  const lrSvc = new L7InMemoryLineageReadService(validator);
  const run: L7ValidationRunRecord = {
    compute_run_id: RUN_ID,
    materialization_mode: L7MaterializationMode.LIVE_HISTORICAL,
    policy_version: POLICY,
    started_at: AS_OF,
    finished_at: AS_OF,
    replay_generation_ref: null,
    parent_run_id: null,
    lineage_refs: { trace_id: TRACE, manifest_id: MANIFEST },
  };
  lrSvc.putRun(run);
  const lp: L7LineagePointer = {
    lineage_id: 'l-1',
    subject_id: SUBJECT,
    state_ref: 'cs-1',
    compute_run_id: RUN_ID,
    replay_generation_ref: null,
    manifest_id: MANIFEST,
    trace_id: TRACE,
    created_at: AS_OF,
  };
  lrSvc.appendLineage(lp);
  const lrGot = await_(lrSvc.getLineage(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_LINEAGE_BY_RUN,
    mode: L7ReadMode.FORENSIC_EVIDENCE_VIEW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
    subject_id: null,
    scope_type: null,
    scope_id: null,
    compute_run_id: RUN_ID,
  })));
  assert(lrGot.ok && lrGot.value?.run.compute_run_id === RUN_ID, 'lineage read returned run');

  // D.10 INV-7.7-E wrapper
  const invE = checkL7_7_E_ReadSurfacesGoverned({ request: readReq() });
  assert(invE.ok, 'INV-7.7-E satisfied on clean read');
  const invEFail = checkL7_7_E_ReadSurfacesGoverned({
    request: readReq({ claims_raw_storage_access: true }),
  });
  assert(!invEFail.ok, 'INV-7.7-E fails on raw-storage attempt');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND E — DOWNSTREAM CONSUMPTION + INVARIANTS
// ═══════════════════════════════════════════════════════════════════════

function bandE_downstreamAndInvariants(): void {
  console.log('\n─── BAND E: later-layer integration + invariants ───');

  resetPersistenceAuditLog();
  const dv = new L7DownstreamConsumptionValidator();

  // E.1 Happy path: regime engine consumes governed current validation surface
  const happy: L7DownstreamConsumptionAttempt = {
    consumer_class: L7ConsumerClass.REGIME_ENGINE,
    consumer_service: 'regime-v1',
    used_read_surface: true,
    read_request: readReq(),
    attempted_raw_l6_rebuild: false,
    attempted_raw_clickhouse_read: false,
    attempted_raw_redis_read: false,
    attempted_raw_archive_access: false,
    respects_restriction_profile: true,
    respects_cap_chain: true,
    action_requires_rights: [L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
    granted_rights: [L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
    spoofed_mode: false,
    trace_id: TRACE,
    subject_id: SUBJECT,
  };
  const rHappy = dv.validate(happy);
  assert(rHappy.ok, 'happy-path downstream consumption accepted');

  // E.2 Bypasses read surface
  const rBypass = dv.validate({ ...happy, used_read_surface: false });
  assert(
    rBypass.violations.some(v => v.code === L7PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE),
    'DOWNSTREAM_BYPASSES_READ_SURFACE emitted',
  );

  // E.3 Live L6 rebuild
  const rL6Rebuild = dv.validate({ ...happy, attempted_raw_l6_rebuild: true });
  assert(
    rL6Rebuild.violations.some(v => v.code === L7PersistenceViolationCode.DOWNSTREAM_REBUILDS_VALIDATION),
    'DOWNSTREAM_REBUILDS_VALIDATION emitted on live L6 rebuild',
  );

  // E.4 Replay adapter may rebuild under REPLAY_RECONSTRUCTION
  const rReplayRebuild = dv.validate({
    ...happy,
    consumer_class: L7ConsumerClass.REPLAY_ADAPTER,
    attempted_raw_l6_rebuild: true,
    read_request: readReq({
      surface_id: L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
      mode: L7ReadMode.REPLAY_RECONSTRUCTION,
      consumer_class: L7ConsumerClass.REPLAY_ADAPTER,
    }),
  });
  assert(rReplayRebuild.ok, 'replay adapter allowed to rebuild under REPLAY_RECONSTRUCTION');

  // E.5 Raw ClickHouse read
  assert(
    dv.validate({ ...happy, attempted_raw_clickhouse_read: true })
      .violations.some(v => v.code === L7PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT),
    'raw ClickHouse read rejected',
  );

  // E.6 Raw Redis read
  assert(
    dv.validate({ ...happy, attempted_raw_redis_read: true })
      .violations.some(v => v.code === L7PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE),
    'raw Redis read rejected',
  );

  // E.7 Raw archive access
  assert(
    dv.validate({ ...happy, attempted_raw_archive_access: true })
      .violations.some(v => v.code === L7PersistenceViolationCode.DOWNSTREAM_RAW_ARCHIVE_ACCESS),
    'raw archive access rejected',
  );

  // E.8 Restriction bypass
  assert(
    dv.validate({ ...happy, respects_restriction_profile: false })
      .violations.some(v => v.code === L7PersistenceViolationCode.DOWNSTREAM_BYPASSES_RESTRICTION),
    'restriction bypass rejected',
  );

  // E.9 Cap-chain ignore
  assert(
    dv.validate({ ...happy, respects_cap_chain: false })
      .violations.some(v => v.code === L7PersistenceViolationCode.DOWNSTREAM_IGNORES_CAP_CHAIN),
    'cap-chain ignored rejected',
  );

  // E.10 Missing required right
  assert(
    dv.validate({
      ...happy,
      action_requires_rights: [L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT],
      granted_rights: [L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
    }).violations.some(v => v.code === L7PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION_POSTURE),
    'missing required right emits IGNORES_RESTRICTION_POSTURE',
  );

  // E.11 Spoofed mode
  assert(
    dv.validate({ ...happy, spoofed_mode: true })
      .violations.some(v => v.code === L7PersistenceViolationCode.DOWNSTREAM_READ_MODE_SPOOFED),
    'DOWNSTREAM_READ_MODE_SPOOFED emitted',
  );

  // ── Invariants ─────────────────────────────────────────────────────

  // INV-7.7-A: happy envelope
  const envOk = envelope(
    L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
    L7PersistenceClass.CURRENT_VALIDATION,
    L7MaterializationMode.LIVE_CURRENT,
  );
  const invA = checkL7_7_A_L5OnlyPersistence({
    envelope: envOk,
    context: { source: 'l7.runtime.materializer' },
  });
  assert(invA.ok, 'INV-7.7-A satisfied on governed L5 path');

  const invAFail = checkL7_7_A_L5OnlyPersistence({
    envelope: envOk,
    context: { source: 'rogue.writer', bypasses_l5: true },
  });
  assert(!invAFail.ok, 'INV-7.7-A fails on L5 bypass');

  // INV-7.7-B
  const invB = checkL7_7_B_CurrentAuthorityIsPostgresOnly({
    envelope: envOk,
    row: currentIdentity(),
    context: {
      has_prior_state: false,
      existing_prior_state_id: null,
      historical_fact_id: 'hf-1',
      historical_append_required: true,
      issued_under_replay_or_repair: false,
    },
  });
  assert(invB.ok, 'INV-7.7-B satisfied on clean current-state write');

  // Supersession law — prior state but no superseded_prior_ref
  const invBSupers = checkL7_7_B_CurrentAuthorityIsPostgresOnly({
    envelope: envOk,
    row: currentIdentity({ superseded_prior_ref: null }),
    context: {
      has_prior_state: true,
      existing_prior_state_id: 'cs-prev',
      historical_fact_id: 'hf-1',
      historical_append_required: true,
      issued_under_replay_or_repair: false,
    },
  });
  assert(!invBSupers.ok, 'INV-7.7-B fails when current overwrite lacks supersession ref');

  // Historical append required but not linked
  const invBNoHist = checkL7_7_B_CurrentAuthorityIsPostgresOnly({
    envelope: envOk,
    row: currentIdentity(),
    context: {
      has_prior_state: false,
      existing_prior_state_id: null,
      historical_fact_id: null,
      historical_append_required: true,
      issued_under_replay_or_repair: false,
    },
  });
  assert(
    !invBNoHist.ok &&
      invBNoHist.violations.some(v => v.code === L7PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY),
    'INV-7.7-B flags missing historical-append linkage',
  );

  // Issued under replay
  const invBReplay = checkL7_7_B_CurrentAuthorityIsPostgresOnly({
    envelope: envOk,
    row: currentIdentity(),
    context: {
      has_prior_state: false,
      existing_prior_state_id: null,
      historical_fact_id: 'hf-1',
      historical_append_required: true,
      issued_under_replay_or_repair: true,
    },
  });
  assert(
    !invBReplay.ok &&
      invBReplay.violations.some(v => v.code === L7PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE),
    'INV-7.7-B flags current write under replay mode',
  );

  // INV-7.7-F — governed consumption happy + violations already covered above
  const invF = checkL7_7_F_DownstreamUsesReadSurface({ attempt: happy });
  assert(invF.ok, 'INV-7.7-F satisfied');

  // INV-7.7-G — lineage consistency happy
  const invG = checkL7_7_G_LineageConsistency({
    current_state_id: 'cs-1',
    current_compute_run_id: RUN_ID,
    current_replay_hash: REPLAY_HASH,
    historical_compute_run_id: RUN_ID,
    historical_replay_hash: REPLAY_HASH,
    replay_generation_ref: null,
    mode: L7MaterializationMode.LIVE_CURRENT,
  }, { subject_id: SUBJECT, surface: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY });
  assert(invG.ok, 'INV-7.7-G satisfied on clean lineage snapshot');

  // INV-7.7-G — drift
  const invGDrift = checkL7_7_G_LineageConsistency({
    current_state_id: 'cs-1',
    current_compute_run_id: RUN_ID,
    current_replay_hash: REPLAY_HASH,
    historical_compute_run_id: RUN_ID,
    historical_replay_hash: 'rh_different',
    replay_generation_ref: null,
    mode: L7MaterializationMode.LIVE_CURRENT,
  }, { subject_id: SUBJECT, surface: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY });
  assert(
    !invGDrift.ok &&
      invGDrift.violations.some(v => v.code === L7PersistenceViolationCode.REPLAY_REPAIR_SEMANTIC_DRIFT),
    'INV-7.7-G flags replay-hash drift between current and historical',
  );

  // INV-7.7-G — missing replay_generation_ref under REPLAY
  const invGNoRef = checkL7_7_G_LineageConsistency({
    current_state_id: null,
    current_compute_run_id: null,
    current_replay_hash: null,
    historical_compute_run_id: RUN_ID,
    historical_replay_hash: REPLAY_HASH,
    replay_generation_ref: null,
    mode: L7MaterializationMode.REPLAY_HISTORICAL,
  }, { subject_id: SUBJECT, surface: L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS });
  assert(
    !invGNoRef.ok &&
      invGNoRef.violations.some(v => v.code === L7PersistenceViolationCode.REPLAY_GENERATION_REF_MISSING),
    'INV-7.7-G flags missing replay_generation_ref under REPLAY mode',
  );

  // ── Audit surface ─────────────────────────────────────────────────
  // After the failing invariant runs above, the audit log must contain
  // typed persistence audit records with proper surface classification.
  assert(hasAnyPersistenceViolations(), 'persistence audit log populated');
  assert(
    getPersistenceViolationsByCode(L7PersistenceViolationCode.L5_BYPASS_ATTEMPT).length >= 1,
    'L5_BYPASS_ATTEMPT recorded in audit log',
  );
  assert(
    getPersistenceViolationsBySurface('DURABLE_SURFACE').length >= 1,
    'DURABLE_SURFACE audit surface populated',
  );
  assert(
    getPersistenceViolationsBySurface('DOWNSTREAM_CONSUMPTION').length === 0,
    'downstream-consumption audit entries only emitted via invariant path, not raw validator',
  );
  assert(
    getPersistenceCriticalViolations().length >= 1,
    'at least one CRITICAL severity audit entry',
  );

  // ── Severity + surface classifiers sanity ─────────────────────────
  assert(
    surfaceForPersistenceViolation(L7PersistenceViolationCode.L5_BYPASS_ATTEMPT) === 'DURABLE_SURFACE',
    'L5_BYPASS_ATTEMPT → DURABLE_SURFACE',
  );
  assert(
    surfaceForPersistenceViolation(L7PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE) === 'HISTORICAL_WRITE',
    'HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE → HISTORICAL_WRITE',
  );
  assert(
    surfaceForPersistenceViolation(L7PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING) === 'EVIDENCE_STORAGE',
    'EVIDENCE_ARCHIVE_URI_MISSING → EVIDENCE_STORAGE',
  );
  assert(
    surfaceForPersistenceViolation(L7PersistenceViolationCode.DOWNSTREAM_REBUILDS_VALIDATION) === 'DOWNSTREAM_CONSUMPTION',
    'DOWNSTREAM_REBUILDS_VALIDATION → DOWNSTREAM_CONSUMPTION',
  );
  assert(
    surfaceForPersistenceViolation(L7PersistenceViolationCode.REPLAY_REPAIR_SEMANTIC_DRIFT) === 'LINEAGE_REPLAY',
    'REPLAY_REPAIR_SEMANTIC_DRIFT → LINEAGE_REPLAY',
  );
  assert(
    defaultSeverityForPersistenceViolation(L7PersistenceViolationCode.L5_BYPASS_ATTEMPT) === 'CRITICAL',
    'L5_BYPASS_ATTEMPT severity CRITICAL',
  );
  assert(
    defaultSeverityForPersistenceViolation(L7PersistenceViolationCode.HISTORICAL_ROW_POLICY_VERSION_MISSING) === 'MEDIUM',
    'missing policy_version severity MEDIUM',
  );

  // ── Replay / repair / late-data semantic-preservation check ───────
  // Simulate repair rebuild that reproduces identical replay hash and
  // compute-run identity — INV-7.7-G must stay green.
  const invGRepair = checkL7_7_G_LineageConsistency({
    current_state_id: 'cs-1',
    current_compute_run_id: 'run-7.7-002',
    current_replay_hash: 'rh_7_7_002',
    historical_compute_run_id: 'run-7.7-002',
    historical_replay_hash: 'rh_7_7_002',
    replay_generation_ref: 'repair-gen-1',
    mode: L7MaterializationMode.REPAIR_REBUILD,
  }, { subject_id: SUBJECT, surface: L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS });
  assert(invGRepair.ok, 'INV-7.7-G satisfied on repair rebuild with matching lineage');
}

// ── Shared async synchronizer (test-only) ──────────────────────────────

function await_<T>(p: Promise<T>): T {
  // Node runs these single-tick; we drain them synchronously for the
  // test harness via a small busy-wait around the promise resolution.
  let done = false;
  let value: T | undefined;
  let err: unknown = undefined;
  p.then(v => { value = v; done = true; }, e => { err = e; done = true; });
  // Drain microtasks.
  // eslint-disable-next-line no-constant-condition
  while (!done) {
    // `deasync` not used — all in-memory services resolve in the next
    // microtask. We yield to the event loop with a synchronous hack.
    const start = Date.now();
    while (Date.now() - start < 0 && !done) { /* spin */ }
    if (!done) {
      // Fall back: run a zero-timeout pass.
      // Since Node's event loop is cooperative, we can't truly
      // synchronously drain — so test calls must resolve in one turn.
      break;
    }
  }
  if (err) throw err;
  return value as T;
}

// ═══════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ L7.7 — Persistence & Serving Constitution — Certification Suite ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  bandA_durableSurfaces();
  bandB_historical();
  bandC_evidence();
  // Bands D + E depend on async reads — run them via promise chains.
  await runBandD();
  await runBandE();

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`  passed: ${passed}    failed: ${failed}    total: ${passed + failed}`);
  console.log('══════════════════════════════════════════════════════════════════');
  if (failed > 0) process.exit(1);
}

async function runBandD(): Promise<void> {
  console.log('\n─── BAND D: read surfaces ───');

  assert(ALL_L7_READ_SURFACE_IDS.length === 13, '13 read surfaces registered');
  assert(ALL_L7_READ_MODES.length === 5, '5 read modes');
  assert(ALL_L7_CONSUMER_CLASSES.length === 9, '9 consumer classes');
  assert(readRegistry.isRegistered(L7ReadSurfaceId.CURRENT_RESTRICTION_BY_SCOPE),
    'CURRENT_RESTRICTION_BY_SCOPE registered');

  const rv = new L7ReadSurfaceValidator();
  const rOk = rv.validate(readReq());
  assert(rOk.ok, 'happy-path current validation read accepted');

  const rUnknown = rv.validate(readReq({ surface_id: 'l7.read.nope' as L7ReadSurfaceId }));
  assert(
    rUnknown.violations.some(v => v.code === L7PersistenceViolationCode.READ_SURFACE_NOT_REGISTERED),
    'READ_SURFACE_NOT_REGISTERED emitted',
  );

  const rBadMode = rv.validate(readReq({ mode: L7ReadMode.HISTORICAL_WINDOW }));
  assert(
    rBadMode.violations.some(v => v.code === L7PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE),
    'READ_MODE_INVALID_FOR_SURFACE emitted',
  );

  const rBadConsumer = rv.validate(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
    mode: L7ReadMode.HISTORICAL_WINDOW,
    consumer_class: L7ConsumerClass.REGIME_ENGINE,
  }));
  assert(
    rBadConsumer.violations.some(v => v.code === L7PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED),
    'CONSUMER_CLASS_NOT_ALLOWED (REGIME_ENGINE on history)',
  );

  const rRaw = rv.validate(readReq({ claims_raw_storage_access: true }));
  assert(
    rRaw.violations.some(v => v.code === L7PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT),
    'RAW_STORAGE_READ_ATTEMPT emitted',
  );

  const rRedis = rv.validate(readReq({ claims_redis_authoritative_read: true }));
  assert(
    rRedis.violations.some(v => v.code === L7PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE),
    'REDIS_READ_AS_AUTHORITATIVE emitted',
  );

  const rL6 = rv.validate(readReq({
    claims_revalidation_from_l6: true,
    consumer_class: L7ConsumerClass.DETERMINISTIC_SCORER,
  }));
  assert(
    rL6.violations.some(v => v.code === L7PersistenceViolationCode.AD_HOC_REVALIDATION_FROM_L6),
    'AD_HOC_REVALIDATION_FROM_L6 emitted',
  );

  const rL6Legit = rv.validate(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
    mode: L7ReadMode.REPLAY_RECONSTRUCTION,
    consumer_class: L7ConsumerClass.REPLAY_ADAPTER,
    claims_revalidation_from_l6: true,
  }));
  assert(rL6Legit.ok, 'replay adapter + REPLAY_RECONSTRUCTION + L6 rebuild accepted');

  const rNoScope = rv.validate(readReq({ subject_id: null, scope_type: null, scope_id: null }));
  assert(!rNoScope.ok, 'missing scope rejected');

  const rEvNoPtr = rv.validate(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_EVIDENCE_BY_SUBJECT,
    mode: L7ReadMode.FORENSIC_EVIDENCE_VIEW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
    subject_id: null,
    scope_type: null,
    scope_id: null,
  }));
  assert(
    rEvNoPtr.violations.some(v => v.code === L7PersistenceViolationCode.EVIDENCE_READ_WITHOUT_POINTER),
    'EVIDENCE_READ_WITHOUT_POINTER emitted',
  );

  // Current validation read
  const validator = new L7ReadSurfaceValidator();
  const cvSvc = new L7InMemoryCurrentValidationReadService(validator);
  cvSvc.upsert(currentIdentity());
  const got = await cvSvc.getCurrentValidation(readReq());
  assert(got.ok && got.value?.current_state_id === 'cs-1', 'current validation read returned row');
  const gotBad = await cvSvc.getCurrentValidation(readReq({ mode: L7ReadMode.HISTORICAL_WINDOW }));
  assert(!gotBad.ok, 'illegal mode on current validation read rejected');

  // Contradiction read
  const ccSvc = new L7InMemoryCurrentContradictionReadService(validator);
  const contradictionRow: L7CurrentContradictionRow = {
    ...currentIdentity(),
    current_state_id: 'cs-contra-1',
    contradiction_bundle_id: 'cb-1',
    cluster_count: 2,
    highest_severity: L7ContradictionSeverity.MATERIAL,
    dominant_family: L7ContradictionFamily.CROSS_SOURCE_DISAGREEMENT,
    blocked_confirmation_surfaces: [],
    stale_support_refs: [],
    missing_support_refs: [],
    unresolved: true,
  };
  ccSvc.upsert(contradictionRow);
  const cgot = await ccSvc.getCurrentContradiction(readReq({
    surface_id: L7ReadSurfaceId.CURRENT_CONTRADICTION_BY_SCOPE,
  }));
  assert(cgot.ok && cgot.value?.contradiction_bundle_id === 'cb-1', 'current contradiction read returned row');

  // Contradiction history
  const chSvc = new L7InMemoryHistoricalContradictionReadService(validator);
  const contradictionFact: L7HistoricalContradictionFact = {
    ...historicalFact(),
    fact_id: 'hcb-1',
    contradiction_bundle_id: 'cb-1',
    cluster_count: 2,
    highest_severity: L7ContradictionSeverity.MATERIAL,
    dominant_family: L7ContradictionFamily.CROSS_SOURCE_DISAGREEMENT,
    blocked_confirmation_surfaces: [],
    stale_support_refs: [],
    missing_support_refs: [],
  };
  chSvc.append(contradictionFact);
  const chGot = await chSvc.getContradictionHistory(readReq({
    surface_id: L7ReadSurfaceId.CONTRADICTION_HISTORY_BY_SCOPE,
    mode: L7ReadMode.HISTORICAL_WINDOW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
  }));
  assert(chGot.ok && (chGot.value as readonly unknown[]).length === 1, 'contradiction history returned 1 row');

  // Confidence read (governed)
  const gcSvc = new L7InMemoryGovernedCurrentConfidenceReadService(validator);
  const confRow: L7CurrentConfidenceRow = {
    ...currentIdentity(),
    current_state_id: 'cs-conf-1',
    confidence_assessment_id: 'ca-1',
    raw_score_100: 88,
    capped_score_100: 88,
    confidence_band: L7ConfidenceBand.HIGH,
    cap_classes_applied: [],
    penalty_classes_applied: [],
    restriction_profile_ref: null,
  };
  gcSvc.upsert(confRow);
  const gcGot = await gcSvc.getCurrentConfidence(readReq({
    surface_id: L7ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE,
  }));
  assert(gcGot.ok && gcGot.value?.confidence_band === L7ConfidenceBand.HIGH, 'current confidence row HIGH');

  // Confidence history (governed)
  const ghcSvc = new L7InMemoryGovernedHistoricalConfidenceReadService(validator);
  const confFact: L7HistoricalConfidenceFact = {
    ...historicalFact(),
    fact_id: 'hcf-1',
    confidence_assessment_id: 'ca-1',
    confidence_score_raw: 88,
    confidence_score_capped: 88,
    confidence_band: L7ConfidenceBand.HIGH,
    factor_breakdown_ref: 'fb-1',
    cap_chain_ref: 'cc-1',
    penalty_chain_ref: 'pc-1',
  };
  ghcSvc.append(confFact);
  const ghcGot = await ghcSvc.getConfidenceHistory(readReq({
    surface_id: L7ReadSurfaceId.CONFIDENCE_HISTORY_BY_SCOPE,
    mode: L7ReadMode.HISTORICAL_WINDOW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
  }));
  assert(ghcGot.ok && (ghcGot.value as readonly unknown[]).length === 1, 'confidence history returned 1 row');

  // Restriction read (governed)
  const grSvc = new L7InMemoryGovernedCurrentRestrictionReadService(validator);
  const restrictionRow: L7CurrentRestrictionRow = {
    ...currentIdentity(),
    current_state_id: 'cs-res-1',
    restriction_profile_id: 'rp-1',
    downstream_use_rights: [L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
    restriction_reasons: [L7RestrictionReasonCode.CONFIRMED_NO_RISK],
    requires_contradiction_disclosure: false,
    requires_additional_confirmation: false,
    evidence_only_mode: false,
    blocked_from_score_driving: false,
  };
  grSvc.upsert(restrictionRow);
  const grGot = await grSvc.getCurrentRestriction(readReq({
    surface_id: L7ReadSurfaceId.CURRENT_RESTRICTION_BY_SCOPE,
  }));
  assert(grGot.ok && grGot.value?.restriction_profile_id === 'rp-1', 'current restriction row found');

  // Restriction history (governed)
  const ghrSvc = new L7InMemoryGovernedHistoricalRestrictionReadService(validator);
  const restrictionFact: L7HistoricalRestrictionFact = {
    ...historicalFact(),
    fact_id: 'hrf-1',
    restriction_profile_id: 'rp-1',
    downstream_rights: [L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
    requires_contradiction_disclosure: false,
    requires_additional_confirmation: false,
    score_driving_eligible: false,
    judgment_eligible: false,
  };
  ghrSvc.append(restrictionFact);
  const ghrGot = await ghrSvc.getRestrictionHistory(readReq({
    surface_id: L7ReadSurfaceId.RESTRICTION_HISTORY_BY_SCOPE,
    mode: L7ReadMode.HISTORICAL_WINDOW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
  }));
  assert(ghrGot.ok && (ghrGot.value as readonly unknown[]).length === 1, 'restriction history returned 1 row');

  // Historical validation window
  const hvSvc = new L7InMemoryHistoricalValidationReadService(validator);
  hvSvc.append(historicalFact({ fact_id: 'hf-a', as_of: '2026-01-01T00:00:00Z' }));
  hvSvc.append(historicalFact({ fact_id: 'hf-b', as_of: '2026-02-01T00:00:00Z' }));
  hvSvc.append(historicalFact({ fact_id: 'hf-c', as_of: '2026-03-01T00:00:00Z' }));
  const hvGot = await hvSvc.getValidationHistory(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
    mode: L7ReadMode.HISTORICAL_WINDOW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
    window_from_iso: '2026-01-15T00:00:00Z',
    window_to_iso: '2026-02-15T00:00:00Z',
  }));
  assert(hvGot.ok && (hvGot.value as readonly unknown[]).length === 1, 'historical window filters correctly');

  // Evidence read
  const erSvc = new L7InMemoryEvidenceReadService(validator);
  erSvc.putPointer(evidencePointer(), '{"evidence":"payload"}');
  const erGot = await erSvc.readEvidence(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_EVIDENCE_BY_SUBJECT,
    mode: L7ReadMode.FORENSIC_EVIDENCE_VIEW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
    subject_id: SUBJECT,
    scope_type: null,
    scope_id: null,
  }));
  assert(erGot.ok && erGot.value?.archive_resolved === true, 'evidence pointer resolved via governed surface');

  // Lineage read
  const lrSvc = new L7InMemoryLineageReadService(validator);
  lrSvc.putRun({
    compute_run_id: RUN_ID,
    materialization_mode: L7MaterializationMode.LIVE_HISTORICAL,
    policy_version: POLICY,
    started_at: AS_OF,
    finished_at: AS_OF,
    replay_generation_ref: null,
    parent_run_id: null,
    lineage_refs: { trace_id: TRACE, manifest_id: MANIFEST },
  });
  lrSvc.appendLineage({
    lineage_id: 'l-1',
    subject_id: SUBJECT,
    state_ref: 'cs-1',
    compute_run_id: RUN_ID,
    replay_generation_ref: null,
    manifest_id: MANIFEST,
    trace_id: TRACE,
    created_at: AS_OF,
  });
  const lrGot = await lrSvc.getLineage(readReq({
    surface_id: L7ReadSurfaceId.VALIDATION_LINEAGE_BY_RUN,
    mode: L7ReadMode.FORENSIC_EVIDENCE_VIEW,
    consumer_class: L7ConsumerClass.FORENSIC_TOOL,
    subject_id: null,
    scope_type: null,
    scope_id: null,
    compute_run_id: RUN_ID,
  }));
  assert(lrGot.ok && lrGot.value?.run.compute_run_id === RUN_ID, 'lineage read returned run');

  const invE = checkL7_7_E_ReadSurfacesGoverned({ request: readReq() });
  assert(invE.ok, 'INV-7.7-E satisfied on clean read');
  const invEFail = checkL7_7_E_ReadSurfacesGoverned({
    request: readReq({ claims_raw_storage_access: true }),
  });
  assert(!invEFail.ok, 'INV-7.7-E fails on raw-storage attempt');
}

async function runBandE(): Promise<void> {
  // Run synchronous band E.
  bandE_downstreamAndInvariants();
}

main().catch(e => { console.error(e); process.exit(2); });
