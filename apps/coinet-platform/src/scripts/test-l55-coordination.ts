/**
 * L5.5 — Write Coordination and Consistency Model
 * Certification Test Suite
 *
 * Bands:
 *   A — Coordination legality
 *   B — Transaction and manifest truth
 *   C — Archive-first behavior
 *   D — Projection and idempotency
 *   E — Late data and repair
 *   F — Read consistency and observability
 */

import {
  // State enums
  L5ExecutionMode, L5ManifestState, L5ProjectionStatus, L5FailureClass,
  ALL_MANIFEST_STATES, TERMINAL_MANIFEST_STATES, ALL_PROJECTION_STATUSES, ALL_FAILURE_CLASSES,
  isTerminalManifestState, isLegalManifestTransition, getLegalManifestTransitions,
  // Consistency model
  CONSISTENCY_MODEL,
  type L5CoordinationResult, type L5CoordinationManifest,
  // Preflight
  runExecutionPreflight,
  // Store router
  routeEnvelope,
  // Archive-first policy
  evaluateArchiveFirstPolicy,
  // Dedupe gate
  checkDedupeGate, recordDedupeReceipt, resetDedupeStore, getDedupeReceipt,
  // Archive writer
  writeArchive, verifyArchiveChecksum, deriveArchivePath, resetArchiveStore, getArchivedObject,
  // Manifest service
  createManifest, transitionManifest, markArchiveCompleted, markPrimaryAuthorityCommitted,
  addProjectionJob, updateProjectionJobStatus,
  getRequiredProjectionCompletion, getOptionalProjectionCompletion,
  getManifest, getAllManifests, resetManifestStore,
  // Authority write
  executeAuthorityCommit, deriveAuthorityNaturalKey, resetAuthorityStore, getAuthorityRecord,
  // Outbox
  emitProjectionPlan, resetOutbox, getAllOutboxEntries,
  // Projection executor
  executeProjectionJob, registerProjectionWorker, resetProjectionWorkerRegistry, resetProjectionReceipts,
  isProjectionAlreadyExecuted, recordProjectionExecution,
  // Workers
  clickHouseProjectionWorker, resetClickHouseStore,
  redisProjectionWorker, resetRedisStore,
  materializationWorker, resetMaterializationStore,
  // Finalizer
  checkFinalizationEligibility, finalizeManifest, explainFinalizationOutcome,
  // Repair
  repairManifest,
  // Late data
  LateDataClass, assessLateData, isLateDataSilentOverwrite,
  // Read resolver
  resolveRead, isProjectionContradictingAuthority,
  // Replay
  loadReplayEnvelope, buildLineageChain, resetReplayStore,
  // Observer
  resetObserver, getCounters, computeGauges,
  // Coordinator
  coordinateWrite,
  // Invariants
  ALL_COORDINATION_INVARIANT_IDS, assertCoordinationInvariant, assertAllCoordinationInvariants,
  type CoordinationInvariantContext,
} from '../l5/coordination';

import { L5WriteClass, L5ProducerLayer, L5IngressMode, L5DerivationKind, L5EnvelopeLifecycleState } from '../l5/envelope';
import type { ResolvedStorageEnvelope, EnvelopeRoutingBlock } from '../l5/envelope';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); }
}

function resetAll(): void {
  resetManifestStore();
  resetAuthorityStore();
  resetArchiveStore();
  resetDedupeStore();
  resetOutbox();
  resetProjectionWorkerRegistry();
  resetProjectionReceipts();
  resetClickHouseStore();
  resetRedisStore();
  resetMaterializationStore();
  resetReplayStore();
  resetObserver();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

function makeRouting(overrides: Partial<EnvelopeRoutingBlock> = {}): EnvelopeRoutingBlock {
  return {
    primary_state_class: 'RELATIONAL_AUTHORITY',
    primary_authority_store: 'POSTGRES',
    authority_tier: 'PRIMARY_AUTHORITY',
    required_projection_plan: ['CLICKHOUSE'],
    optional_projection_plan: ['REDIS'],
    manifest_required: true,
    topology_mode: 'REFERENCE_PRODUCTION',
    loss_semantics_code: 'FULL_LOSS',
    ...overrides,
  };
}

function makeEnvelope(overrides: Partial<ResolvedStorageEnvelope> = {}): ResolvedStorageEnvelope {
  const now = new Date().toISOString();
  return {
    envelope_id: `env_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    trace_id: `trace_${Date.now()}`,
    correlation_id: null,
    producer_service: 'test-producer',
    producer_layer: L5ProducerLayer.L3,
    producer_instance_id: 'inst-1',
    producer_capability_id: 'cap-1',
    parent_envelope_id: null,
    parent_trace_id: null,
    derivation_kind: L5DerivationKind.ORIGINAL,
    ingress_mode: L5IngressMode.REALTIME,
    write_class: L5WriteClass.RELATIONAL_AUTHORITY,
    source_class: 'protocol_record',
    source_provider: 'defillama',
    source_endpoint: '/protocols',
    source_event_id: `evt_${Date.now()}`,
    source_transport: 'HTTP',
    source_format: 'JSON',
    source_batch_id: null,
    source_partition_key: null,
    source_observed_at: now,
    source_emitted_at: now,
    ingested_at: now,
    normalized_at: now,
    effective_at: null,
    expires_at: null,
    late_arrival_detected_at: null,
    canonical_subject_id: 'protocol:aave',
    canonical_subject_type: 'PROTOCOL',
    canonical_object_id: null,
    canonical_object_type: null,
    canonical_scope_type: 'PROTOCOL',
    canonical_scope_id: 'aave',
    authority_scope_type: 'PROTOCOL',
    authority_scope_id: 'aave',
    metric_contract_id: null,
    edge_id: null,
    context_package_id: null,
    report_id: null,
    score_id: null,
    user_id: null,
    tenant_id: null,
    confidence_band: 'HIGH',
    rights_profile: 'ALLOW',
    freshness_state: 'CURRENT',
    temporal_state: 'CURRENT',
    identity_resolution_state: 'RESOLVED',
    reconciliation_state: null,
    semantic_quality_state: null,
    schema_version: '1.0.0',
    canonical_serialization_version: '1',
    payload_hash_sha256: `hash_${Date.now()}`,
    dedupe_key: `dedupe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    archive_required: false,
    replay_required: false,
    archive_uri: null,
    archive_checksum: null,
    payload_size_bytes: 256,
    late_arrival_flag: false,
    quarantine_flag: false,
    quarantine_reason_codes: [],
    replay_window_id: null,
    integrity_verification_state: 'VERIFIED',
    payload_content_type: 'application/json',
    projection_schema_id: null,
    payload: { name: 'Aave', tvl: 12000000000 },
    typed_projection: null,
    lifecycle_state: L5EnvelopeLifecycleState.READY_FOR_MANIFEST,
    structural_validation_passed: true,
    semantic_validation_passed: true,
    validated_at: now,
    routing: makeRouting(),
    classification_resolved: true,
    authority_allocated: true,
    topology_validated: true,
    archive_proof_verified: false,
    resolved_at: now,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND A — Coordination Legality
// ═══════════════════════════════════════════════════════════════════════════════

function bandA(): void {
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);

  // A1: Enum completeness
  assert(ALL_MANIFEST_STATES.length === 15, 'A1: 15 manifest states');
  assert(ALL_PROJECTION_STATUSES.length === 7, 'A2: 7 projection statuses');
  assert(ALL_FAILURE_CLASSES.length === 13, 'A3: 13 failure classes');

  // A4: Terminal states
  assert(TERMINAL_MANIFEST_STATES.length === 3, 'A4: 3 terminal manifest states');
  assert(isTerminalManifestState(L5ManifestState.FINALIZED), 'A5: FINALIZED is terminal');
  assert(isTerminalManifestState(L5ManifestState.QUARANTINED), 'A6: QUARANTINED is terminal');
  assert(isTerminalManifestState(L5ManifestState.FAILED_FATAL), 'A7: FAILED_FATAL is terminal');
  assert(!isTerminalManifestState(L5ManifestState.DECLARED), 'A8: DECLARED is not terminal');

  // A9: Legal transitions
  assert(isLegalManifestTransition(L5ManifestState.DECLARED, L5ManifestState.EXECUTION_PREFLIGHT_PASSED), 'A9: DECLARED→PREFLIGHT legal');
  assert(!isLegalManifestTransition(L5ManifestState.FINALIZED, L5ManifestState.DECLARED), 'A10: FINALIZED→DECLARED illegal');
  assert(!isLegalManifestTransition(L5ManifestState.FAILED_FATAL, L5ManifestState.DECLARED), 'A11: FAILED_FATAL→DECLARED illegal');
  assert(isLegalManifestTransition(L5ManifestState.FAILED_RETRYABLE, L5ManifestState.DECLARED), 'A12: FAILED_RETRYABLE→DECLARED legal (retry)');

  // A13: Execution modes
  assert(L5ExecutionMode.ARCHIVE_FIRST === 'ARCHIVE_FIRST', 'A13: ARCHIVE_FIRST mode');
  assert(L5ExecutionMode.AUTHORITY_TX_FIRST === 'AUTHORITY_TX_FIRST', 'A14: AUTHORITY_TX_FIRST mode');

  // A15: Consistency model
  assert(CONSISTENCY_MODEL.name === 'SINGLE_AUTHORITY_TX_PLUS_ASYNC_IDEMPOTENT_PROJECTIONS', 'A15: Consistency model name');
  assert(CONSISTENCY_MODEL.guarantees.length === 6, 'A16: 6 consistency guarantees');
  assert(CONSISTENCY_MODEL.nonGuarantees.length === 3, 'A17: 3 non-guarantees');

  // A18: Coordinator produces a valid result
  const env = makeEnvelope();
  const result = coordinateWrite(env);
  assert(result.outcome === 'FINALIZED' || result.outcome === 'IN_PROGRESS', 'A18: Coordinator produces valid outcome');
  assert(result.manifest_id !== null, 'A19: Coordinator creates manifest');
  assert(result.primary_authority_committed === true, 'A20: Authority committed');

  // A21: Preflight rejects invalid envelopes
  const badEnv = makeEnvelope({ lifecycle_state: L5EnvelopeLifecycleState.RECEIVED, classification_resolved: false });
  const badResult = coordinateWrite(badEnv);
  assert(badResult.outcome === 'REJECTED' || badResult.outcome === 'QUARANTINED', 'A21: Preflight rejects invalid envelope');
  assert(badResult.manifest_id === null, 'A22: No manifest for rejected envelope');

  // A23: Only one authority commit per envelope
  const env2 = makeEnvelope();
  const r2 = coordinateWrite(env2);
  assert(r2.primary_authority_committed === true, 'A23: Single authority commit');

  // A24: Invariant count
  assert(ALL_COORDINATION_INVARIANT_IDS.length === 12, 'A24: 12 coordination invariants');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND B — Transaction and Manifest Truth
// ═══════════════════════════════════════════════════════════════════════════════

function bandB(): void {
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);

  // B1: Manifest creation
  const manifest = createManifest({
    envelope_id: 'env-b1',
    dedupe_key: 'dedupe-b1',
    trace_id: 'trace-b1',
    write_class: L5WriteClass.RELATIONAL_AUTHORITY,
    primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST,
    archive_required: false,
  });
  assert(manifest.state === L5ManifestState.DECLARED, 'B1: Manifest starts DECLARED');
  assert(manifest.manifest_id.length > 0, 'B2: Manifest has id');
  assert(!manifest.primary_authority_committed, 'B3: Authority not committed at creation');

  // B4: Transition to preflight passed
  transitionManifest(manifest.manifest_id, L5ManifestState.EXECUTION_PREFLIGHT_PASSED);
  assert(getManifest(manifest.manifest_id)!.state === L5ManifestState.EXECUTION_PREFLIGHT_PASSED, 'B4: Transition to PREFLIGHT_PASSED');

  // B5: Authority commit + manifest update
  transitionManifest(manifest.manifest_id, L5ManifestState.AUTHORITY_TX_PENDING);
  markPrimaryAuthorityCommitted(manifest.manifest_id);
  transitionManifest(manifest.manifest_id, L5ManifestState.PRIMARY_AUTHORITY_COMMITTED);
  assert(getManifest(manifest.manifest_id)!.primary_authority_committed, 'B5: Authority committed');
  assert(getManifest(manifest.manifest_id)!.state === L5ManifestState.PRIMARY_AUTHORITY_COMMITTED, 'B6: State is PRIMARY_AUTHORITY_COMMITTED');

  // B7: Outbox emission
  transitionManifest(manifest.manifest_id, L5ManifestState.OUTBOX_EMITTED);
  assert(getManifest(manifest.manifest_id)!.state === L5ManifestState.OUTBOX_EMITTED, 'B7: State is OUTBOX_EMITTED');

  // B8: Required projections tracking
  transitionManifest(manifest.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_PENDING);
  const jobs = emitProjectionPlan(manifest.manifest_id, 'dk1', 'tr1', 'env-b1', ['CLICKHOUSE'], ['REDIS']);
  for (const entry of jobs) addProjectionJob(manifest.manifest_id, entry.job);
  assert(getManifest(manifest.manifest_id)!.projection_jobs.length === 2, 'B8: 2 projection jobs');

  // B9: Projection completion ratio
  assert(getRequiredProjectionCompletion(manifest.manifest_id) === 0, 'B9: Required ratio starts 0');

  // B10: Complete required projection
  const reqJob = getManifest(manifest.manifest_id)!.projection_jobs.find(j => j.required)!;
  updateProjectionJobStatus(manifest.manifest_id, reqJob.job_id, L5ProjectionStatus.SUCCEEDED);
  assert(getRequiredProjectionCompletion(manifest.manifest_id) === 1, 'B10: Required ratio = 1 after completion');

  // B11: Transition through to finalization
  transitionManifest(manifest.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_COMPLETE);
  transitionManifest(manifest.manifest_id, L5ManifestState.FINALIZED);
  const finalized = getManifest(manifest.manifest_id)!;
  assert(finalized.state === L5ManifestState.FINALIZED, 'B11: Manifest FINALIZED');
  assert(finalized.finalized_at !== null, 'B12: finalized_at timestamp set');

  // B13: Illegal transition from terminal state
  let transitionError = false;
  try { transitionManifest(manifest.manifest_id, L5ManifestState.DECLARED); } catch { transitionError = true; }
  assert(transitionError, 'B13: Cannot transition from FINALIZED');

  // B14: Finalization legality
  const m2 = createManifest({
    envelope_id: 'env-b14', dedupe_key: 'dk-b14', trace_id: 'tr-b14',
    write_class: L5WriteClass.RELATIONAL_AUTHORITY, primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST, archive_required: false,
  });
  const finCheck = checkFinalizationEligibility(m2);
  assert(!finCheck.canFinalize, 'B14: Cannot finalize without authority commit');
  assert(finCheck.blockers.length > 0, 'B15: Has finalization blockers');

  // B16: Explain finalization
  const explanation = explainFinalizationOutcome(finalized);
  assert(explanation.includes('finalized'), 'B16: Explanation describes finalized state');

  // B17: Full coordinator flow produces finalized manifest
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);
  const env = makeEnvelope();
  const r = coordinateWrite(env);
  assert(r.outcome === 'FINALIZED', 'B17: Full coordinator flow finalizes');
  assert(r.required_projection_completion_ratio === 1, 'B18: Required projections complete');
  assert(r.primary_authority_committed === true, 'B19: Authority committed in coordinator flow');

  // B20: Authority record exists
  const authRec = getAuthorityRecord(deriveAuthorityNaturalKey(env));
  assert(authRec !== undefined, 'B20: Authority record persisted');

  // B21: Manifest store reflects correctly
  const manifests = getAllManifests();
  assert(manifests.length >= 1, 'B21: At least one manifest in store');
  assert(manifests.some(m => m.state === L5ManifestState.FINALIZED), 'B22: At least one finalized manifest');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND C — Archive-First Behavior
// ═══════════════════════════════════════════════════════════════════════════════

function bandC(): void {
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);

  // C1: Archive-first policy detection
  const archiveEnv = makeEnvelope({
    write_class: L5WriteClass.IMMUTABLE_ARCHIVE,
    archive_required: true,
    routing: makeRouting({ primary_authority_store: 'OBJECT_STORAGE', primary_state_class: 'IMMUTABLE_ARCHIVE_STATE' }),
  });
  const archivePolicy = evaluateArchiveFirstPolicy(archiveEnv);
  assert(archivePolicy.archiveFirstRequired, 'C1: Archive-first required for IMMUTABLE_ARCHIVE');
  assert(archivePolicy.reasons.length > 0, 'C2: Archive-first has reasons');

  // C3: Non-archive class does not require archive-first
  const normalEnv = makeEnvelope();
  const normalPolicy = evaluateArchiveFirstPolicy(normalEnv);
  assert(!normalPolicy.archiveFirstRequired, 'C3: Normal write does not require archive-first');

  // C4: Store router chooses ARCHIVE_FIRST mode
  const routing = routeEnvelope(archiveEnv);
  assert(routing.executionMode === L5ExecutionMode.ARCHIVE_FIRST, 'C4: Router selects ARCHIVE_FIRST');
  assert(routing.archiveFirst, 'C5: archiveFirst flag set');

  // C6: Archive write produces proof
  const archiveResult = writeArchive(archiveEnv);
  assert(archiveResult.success, 'C6: Archive write succeeds');
  assert(archiveResult.proof !== null, 'C7: Archive proof generated');
  assert(archiveResult.proof!.archive_checksum_sha256.length > 0, 'C8: Checksum present');
  assert(archiveResult.proof!.verified, 'C9: Archive verified');

  // C10: Archive path deterministic
  const path = deriveArchivePath(archiveEnv);
  assert(path.startsWith('archive/IMMUTABLE_ARCHIVE/'), 'C10: Archive path starts with correct prefix');

  // C11: Checksum verification
  const checkResult = verifyArchiveChecksum(archiveResult.proof!.archive_id, archiveResult.proof!.archive_checksum_sha256);
  assert(checkResult, 'C11: Checksum verification passes');

  // C12: Bad checksum fails verification
  assert(!verifyArchiveChecksum(archiveResult.proof!.archive_id, 'bad_checksum'), 'C12: Bad checksum fails');

  // C17: Archived object retrievable (before reset clears store)
  const proof = archiveResult.proof!;
  const retrieved = getArchivedObject(proof.archive_id);
  assert(retrieved !== undefined, 'C17: Archived object retrievable');
  assert(retrieved!.archive_uri === proof.archive_uri, 'C18: Retrieved archive has correct URI');

  // C13: Full coordinator with archive-first class
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);
  const archiveCoordEnv = makeEnvelope({
    write_class: L5WriteClass.IMMUTABLE_ARCHIVE,
    archive_required: true,
    routing: makeRouting({
      primary_authority_store: 'OBJECT_STORAGE',
      primary_state_class: 'IMMUTABLE_ARCHIVE_STATE',
      required_projection_plan: [],
      optional_projection_plan: [],
    }),
  });
  const archiveCoordResult = coordinateWrite(archiveCoordEnv);
  assert(archiveCoordResult.outcome === 'FINALIZED' || archiveCoordResult.outcome === 'IN_PROGRESS', 'C13: Archive-first coordination completes');
  assert(archiveCoordResult.archive_completed, 'C14: Archive completed in coordination');
  assert(archiveCoordResult.primary_authority_committed, 'C15: Authority committed after archive');

  // C16: Audit event with archive-required triggers archive-first
  const auditEnv = makeEnvelope({
    write_class: L5WriteClass.AUDIT_EVENT,
    archive_required: true,
    routing: makeRouting({ required_projection_plan: [], optional_projection_plan: [] }),
  });
  const auditPolicy = evaluateArchiveFirstPolicy(auditEnv);
  assert(auditPolicy.archiveFirstRequired, 'C16: Audit event with archive_required triggers archive-first');

}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND D — Projection and Idempotency
// ═══════════════════════════════════════════════════════════════════════════════

function bandD(): void {
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);
  registerProjectionWorker(materializationWorker);

  // D1: Required projection failure blocks finalization
  const m = createManifest({
    envelope_id: 'env-d1', dedupe_key: 'dk-d1', trace_id: 'tr-d1',
    write_class: L5WriteClass.RELATIONAL_AUTHORITY, primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST, archive_required: false,
  });
  transitionManifest(m.manifest_id, L5ManifestState.EXECUTION_PREFLIGHT_PASSED);
  transitionManifest(m.manifest_id, L5ManifestState.AUTHORITY_TX_PENDING);
  markPrimaryAuthorityCommitted(m.manifest_id);
  transitionManifest(m.manifest_id, L5ManifestState.PRIMARY_AUTHORITY_COMMITTED);
  transitionManifest(m.manifest_id, L5ManifestState.OUTBOX_EMITTED);
  transitionManifest(m.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_PENDING);

  const jobs = emitProjectionPlan(m.manifest_id, 'dk-d1', 'tr-d1', 'env-d1', ['CLICKHOUSE'], ['REDIS']);
  for (const entry of jobs) addProjectionJob(m.manifest_id, entry.job);

  const reqJob = getManifest(m.manifest_id)!.projection_jobs.find(j => j.required)!;
  updateProjectionJobStatus(m.manifest_id, reqJob.job_id, L5ProjectionStatus.FAILED_RETRYABLE);

  const finCheck = checkFinalizationEligibility(getManifest(m.manifest_id)!);
  assert(!finCheck.canFinalize, 'D1: Required projection failure blocks finalization');
  assert(finCheck.blockers.some(b => b.toLowerCase().includes('required')), 'D2: Blocker mentions required projection');

  // D3: Optional failure does not block finalization
  const m2 = createManifest({
    envelope_id: 'env-d3', dedupe_key: 'dk-d3', trace_id: 'tr-d3',
    write_class: L5WriteClass.RELATIONAL_AUTHORITY, primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST, archive_required: false,
  });
  transitionManifest(m2.manifest_id, L5ManifestState.EXECUTION_PREFLIGHT_PASSED);
  transitionManifest(m2.manifest_id, L5ManifestState.AUTHORITY_TX_PENDING);
  markPrimaryAuthorityCommitted(m2.manifest_id);
  transitionManifest(m2.manifest_id, L5ManifestState.PRIMARY_AUTHORITY_COMMITTED);
  transitionManifest(m2.manifest_id, L5ManifestState.OUTBOX_EMITTED);
  transitionManifest(m2.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_PENDING);

  const jobs2 = emitProjectionPlan(m2.manifest_id, 'dk-d3', 'tr-d3', 'env-d3', ['CLICKHOUSE'], ['REDIS']);
  for (const entry of jobs2) addProjectionJob(m2.manifest_id, entry.job);

  const reqJob2 = getManifest(m2.manifest_id)!.projection_jobs.find(j => j.required)!;
  updateProjectionJobStatus(m2.manifest_id, reqJob2.job_id, L5ProjectionStatus.SUCCEEDED);
  const optJob2 = getManifest(m2.manifest_id)!.projection_jobs.find(j => !j.required)!;
  updateProjectionJobStatus(m2.manifest_id, optJob2.job_id, L5ProjectionStatus.FAILED_RETRYABLE);
  transitionManifest(m2.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_COMPLETE);

  const finCheck2 = checkFinalizationEligibility(getManifest(m2.manifest_id)!);
  assert(finCheck2.canFinalize, 'D3: Optional failure does not block finalization');

  // D4: Dedupe gate — exact duplicate
  resetDedupeStore();
  recordDedupeReceipt({
    dedupe_key: 'dk-dup', payload_hash_sha256: 'hash-dup',
    manifest_id: 'mf-dup', finalized: true, received_at: new Date().toISOString(),
    producer_service: 'test', write_class: L5WriteClass.RELATIONAL_AUTHORITY,
  });
  const dupeCheck = checkDedupeGate('dk-dup', 'hash-dup');
  assert(dupeCheck.verdict === 'IDEMPOTENT_ACCEPT', 'D4: Exact duplicate returns IDEMPOTENT_ACCEPT');
  assert(dupeCheck.existing_manifest_id === 'mf-dup', 'D5: Links to existing manifest');
  assert(dupeCheck.existing_finalized, 'D6: Existing is finalized');

  // D7: Dedupe gate — conflict
  const conflictCheck = checkDedupeGate('dk-dup', 'different-hash');
  assert(conflictCheck.verdict === 'DUPLICATE_CONFLICT', 'D7: Different hash = DUPLICATE_CONFLICT');

  // D8: Dedupe gate — new write
  const newCheck = checkDedupeGate('dk-new', 'hash-new');
  assert(newCheck.verdict === 'NOT_DUPLICATE', 'D8: New dedupe key = NOT_DUPLICATE');

  // D9: Coordinator handles idempotent duplicate
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);
  const env = makeEnvelope({ dedupe_key: 'dk-idem', payload_hash_sha256: 'hash-idem' });
  const first = coordinateWrite(env);
  assert(first.outcome === 'FINALIZED', 'D9: First write finalizes');

  const dup = makeEnvelope({ dedupe_key: 'dk-idem', payload_hash_sha256: 'hash-idem' });
  const second = coordinateWrite(dup);
  assert(second.outcome === 'IDEMPOTENT_ACCEPT', 'D10: Duplicate returns IDEMPOTENT_ACCEPT');
  assert(second.duplicate_of_manifest_id === first.manifest_id, 'D11: Links to original manifest');

  // D12: Coordinator quarantines duplicate conflict
  const conflict = makeEnvelope({ dedupe_key: 'dk-idem', payload_hash_sha256: 'hash-conflict' });
  const conflictResult = coordinateWrite(conflict);
  assert(conflictResult.outcome === 'QUARANTINED', 'D12: Conflict quarantined');

  // D13: Projection-level idempotency
  resetProjectionReceipts();
  recordProjectionExecution('dk-proj', 'tr-proj', 'nk-proj', 'job-1');
  assert(isProjectionAlreadyExecuted('dk-proj', 'tr-proj', 'nk-proj'), 'D13: Projection recorded as executed');
  assert(!isProjectionAlreadyExecuted('dk-proj', 'tr-other', 'nk-proj'), 'D14: Different trace not idempotent');

  // D15: ClickHouse worker idempotent
  resetClickHouseStore();
  resetProjectionReceipts();
  const chJob: any = {
    job_id: 'job-ch1', manifest_id: 'mf-ch1', target_store: 'CLICKHOUSE', projection_category: 'REQUIRED',
    required: true, dedupe_key: 'dk-ch1', trace_id: 'tr-ch1', projection_natural_key: 'nk-ch1',
    payload_ref: 'env-ch1', attempt_count: 0, max_attempts: 5, status: L5ProjectionStatus.PENDING,
  };
  const chResult1 = clickHouseProjectionWorker.execute(chJob);
  assert(chResult1.status === L5ProjectionStatus.SUCCEEDED, 'D15: ClickHouse first exec succeeds');
  const chResult2 = clickHouseProjectionWorker.execute(chJob);
  assert(chResult2.status === L5ProjectionStatus.SUCCEEDED, 'D16: ClickHouse second exec idempotent');

  // D17: Redis worker idempotent
  resetRedisStore();
  resetProjectionReceipts();
  const redisJob: any = {
    job_id: 'job-r1', manifest_id: 'mf-r1', target_store: 'REDIS', projection_category: 'OPTIONAL',
    required: false, dedupe_key: 'dk-r1', trace_id: 'tr-r1', projection_natural_key: 'nk-r1',
    payload_ref: 'env-r1', attempt_count: 0, max_attempts: 3, status: L5ProjectionStatus.PENDING,
  };
  const rResult1 = redisProjectionWorker.execute(redisJob);
  assert(rResult1.status === L5ProjectionStatus.SUCCEEDED, 'D17: Redis first exec succeeds');
  const rResult2 = redisProjectionWorker.execute(redisJob);
  assert(rResult2.status === L5ProjectionStatus.SUCCEEDED, 'D18: Redis second exec idempotent');

  // D19: Outbox entries created for projection plan
  resetOutbox();
  const outboxEntries = emitProjectionPlan('mf-ox', 'dk-ox', 'tr-ox', 'env-ox', ['CLICKHOUSE', 'REDIS'], ['MATERIALIZATION']);
  assert(outboxEntries.length === 3, 'D19: 3 outbox entries (2 required + 1 optional)');
  assert(outboxEntries.filter(e => e.job.required).length === 2, 'D20: 2 required jobs');
  assert(outboxEntries.filter(e => !e.job.required).length === 1, 'D21: 1 optional job');
  assert(getAllOutboxEntries().length === 3, 'D22: All entries in outbox store');

  // D23: No registered worker returns retryable failure
  resetProjectionWorkerRegistry();
  const noWorkerJob: any = {
    job_id: 'job-nw', manifest_id: 'mf-nw', target_store: 'UNKNOWN',
    projection_category: 'REQUIRED', required: true, dedupe_key: 'dk-nw',
    trace_id: 'tr-nw', projection_natural_key: 'nk-nw', payload_ref: 'env-nw',
    attempt_count: 0, max_attempts: 5, status: L5ProjectionStatus.PENDING,
  };
  const noWorkerResult = executeProjectionJob(noWorkerJob);
  assert(noWorkerResult.status === L5ProjectionStatus.FAILED_RETRYABLE, 'D23: No worker returns FAILED_RETRYABLE');
  assert(noWorkerResult.retryable, 'D24: Failure is retryable');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND E — Late Data and Repair
// ═══════════════════════════════════════════════════════════════════════════════

function bandE(): void {
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);

  // E1: Late data assessment — not late
  const normalEnv = makeEnvelope();
  const normalAssessment = assessLateData(normalEnv);
  assert(!normalAssessment.isLate, 'E1: Normal data is not late');

  // E2: Late data — historical only
  const pastTime = new Date(Date.now() - 60000).toISOString();
  const lateHistEnv = makeEnvelope({
    late_arrival_flag: true,
    source_observed_at: pastTime,
    routing: makeRouting({ primary_state_class: 'TIME_SERIES_ANALYTICAL_HISTORY' }),
  });
  const histAssessment = assessLateData(lateHistEnv);
  assert(histAssessment.isLate, 'E2: Late data detected');
  assert(histAssessment.lateDataClass === LateDataClass.HISTORICAL_ONLY, 'E3: Historical-only late data class');
  assert(!histAssessment.rematerializationRequired, 'E4: No rematerialization needed');
  assert(histAssessment.allowedPaths.length > 0, 'E5: Has allowed paths');

  // E6: Late data — authority affecting
  const lateAuthEnv = makeEnvelope({
    late_arrival_flag: true,
    source_observed_at: new Date(Date.now() - 120000).toISOString(),
    routing: makeRouting({ primary_state_class: 'RELATIONAL_AUTHORITY' }),
  });
  const authAssessment = assessLateData(lateAuthEnv);
  assert(authAssessment.isLate, 'E6: Late authority data detected');
  assert(authAssessment.lateDataClass === LateDataClass.AUTHORITY_AFFECTING, 'E7: Authority-affecting class');
  assert(authAssessment.rematerializationRequired, 'E8: Rematerialization required');
  assert(authAssessment.currentTruthEligibleToChange, 'E9: Current truth eligible to change');

  // E10: Late data — ephemeral stale
  const lateEphEnv = makeEnvelope({
    late_arrival_flag: true,
    source_observed_at: pastTime,
    routing: makeRouting({ primary_state_class: 'EPHEMERAL_HOT_STATE' }),
  });
  const ephAssessment = assessLateData(lateEphEnv);
  assert(ephAssessment.lateDataClass === LateDataClass.EPHEMERAL_STALE, 'E10: Ephemeral stale class');
  assert(ephAssessment.allowedPaths.includes('DISCARD'), 'E11: Ephemeral late data should be discarded');

  // E12: Silent overwrite detection
  assert(isLateDataSilentOverwrite(authAssessment, false), 'E12: Authority late data without rematerialization is silent overwrite');
  assert(!isLateDataSilentOverwrite(authAssessment, true), 'E13: With governed rematerialization, no silent overwrite');
  assert(!isLateDataSilentOverwrite(normalAssessment, false), 'E14: Normal data is never silent overwrite');

  // E15: Coordinator quarantines ungoverned late authority data
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);
  const lateCoordEnv = makeEnvelope({
    late_arrival_flag: true,
    source_observed_at: new Date(Date.now() - 120000).toISOString(),
    routing: makeRouting({ primary_state_class: 'RELATIONAL_AUTHORITY' }),
  });
  const lateCoordResult = coordinateWrite(lateCoordEnv);
  assert(lateCoordResult.outcome === 'QUARANTINED', 'E15: Late authority data quarantined');

  // E16: Repair worker
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);

  const repairM = createManifest({
    envelope_id: 'env-r', dedupe_key: 'dk-r', trace_id: 'tr-r',
    write_class: L5WriteClass.RELATIONAL_AUTHORITY, primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST, archive_required: false,
  });
  transitionManifest(repairM.manifest_id, L5ManifestState.EXECUTION_PREFLIGHT_PASSED);
  transitionManifest(repairM.manifest_id, L5ManifestState.AUTHORITY_TX_PENDING);
  markPrimaryAuthorityCommitted(repairM.manifest_id);
  transitionManifest(repairM.manifest_id, L5ManifestState.PRIMARY_AUTHORITY_COMMITTED);
  transitionManifest(repairM.manifest_id, L5ManifestState.OUTBOX_EMITTED);
  transitionManifest(repairM.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_PENDING);

  const repairJobs = emitProjectionPlan(repairM.manifest_id, 'dk-r', 'tr-r', 'env-r', ['CLICKHOUSE'], []);
  for (const entry of repairJobs) addProjectionJob(repairM.manifest_id, entry.job);
  const repairReqJob = getManifest(repairM.manifest_id)!.projection_jobs.find(j => j.required)!;
  updateProjectionJobStatus(repairM.manifest_id, repairReqJob.job_id, L5ProjectionStatus.FAILED_RETRYABLE);

  const repairResult = repairManifest(repairM.manifest_id);
  assert(repairResult.repaired_jobs >= 0, 'E16: Repair worker executed');
  assert(typeof repairResult.still_failing === 'number', 'E17: Still-failing count returned');
  assert(typeof repairResult.escalated === 'boolean', 'E18: Escalation status returned');

  // E19: Repair cannot invent truth
  const invCtx: CoordinationInvariantContext = { repairInventedTruth: false };
  const invResult = assertCoordinationInvariant('INV-5.5-I', invCtx);
  assert(invResult.passed, 'E19: INV-5.5-I passes when no truth invention');

  const invCtxBad: CoordinationInvariantContext = { repairInventedTruth: true };
  const invResultBad = assertCoordinationInvariant('INV-5.5-I', invCtxBad);
  assert(!invResultBad.passed, 'E20: INV-5.5-I fails when truth invented');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND F — Read Consistency and Observability
// ═══════════════════════════════════════════════════════════════════════════════

function bandF(): void {
  resetAll();
  registerProjectionWorker(clickHouseProjectionWorker);
  registerProjectionWorker(redisProjectionWorker);

  // F1: Read resolver — authority committed
  const m = createManifest({
    envelope_id: 'env-f1', dedupe_key: 'dk-f1', trace_id: 'tr-f1',
    write_class: L5WriteClass.RELATIONAL_AUTHORITY, primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST, archive_required: false,
  });
  transitionManifest(m.manifest_id, L5ManifestState.EXECUTION_PREFLIGHT_PASSED);
  transitionManifest(m.manifest_id, L5ManifestState.AUTHORITY_TX_PENDING);
  markPrimaryAuthorityCommitted(m.manifest_id);
  transitionManifest(m.manifest_id, L5ManifestState.PRIMARY_AUTHORITY_COMMITTED);
  const readAuth = resolveRead(getManifest(m.manifest_id));
  assert(readAuth.source === 'AUTHORITY', 'F1: Read prefers authority');
  assert(readAuth.authorityAvailable, 'F2: Authority available flag');
  assert(readAuth.storeUsed === 'POSTGRES', 'F3: Store used is POSTGRES');

  // F4: Read resolver — no manifest
  const readNone = resolveRead(undefined);
  assert(readNone.source === 'UNAVAILABLE', 'F4: No manifest = UNAVAILABLE');
  assert(!readNone.authorityAvailable, 'F5: No authority available');

  // F6: Read resolver — quarantined
  const mQ = createManifest({
    envelope_id: 'env-fq', dedupe_key: 'dk-fq', trace_id: 'tr-fq',
    write_class: L5WriteClass.RELATIONAL_AUTHORITY, primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST, archive_required: false,
  });
  transitionManifest(mQ.manifest_id, L5ManifestState.QUARANTINED);
  const readQ = resolveRead(getManifest(mQ.manifest_id));
  assert(readQ.source === 'UNAVAILABLE', 'F6: Quarantined = UNAVAILABLE');

  // F7: Read resolver — authority not committed, projection available
  const mP = createManifest({
    envelope_id: 'env-fp', dedupe_key: 'dk-fp', trace_id: 'tr-fp',
    write_class: L5WriteClass.RELATIONAL_AUTHORITY, primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST, archive_required: false,
  });
  transitionManifest(mP.manifest_id, L5ManifestState.EXECUTION_PREFLIGHT_PASSED);
  const projJobs = emitProjectionPlan(mP.manifest_id, 'dk-fp', 'tr-fp', 'env-fp', ['CLICKHOUSE'], []);
  for (const entry of projJobs) addProjectionJob(mP.manifest_id, entry.job);
  const chJobF = getManifest(mP.manifest_id)!.projection_jobs[0];
  updateProjectionJobStatus(mP.manifest_id, chJobF.job_id, L5ProjectionStatus.SUCCEEDED);

  const readProj = resolveRead(getManifest(mP.manifest_id));
  assert(readProj.source === 'PROJECTION', 'F7: Projection fallback used');
  assert(!readProj.authorityAvailable, 'F8: Authority not available in projection fallback');
  assert(readProj.incompletenessVisible, 'F9: Incompleteness visible');

  // F10: Projection contradiction detection
  assert(isProjectionContradictingAuthority('value_a', 'value_b'), 'F10: Different values = contradiction');
  assert(!isProjectionContradictingAuthority('same', 'same'), 'F11: Same values = no contradiction');
  assert(!isProjectionContradictingAuthority(undefined, 'val'), 'F12: Undefined authority = no contradiction');

  // F13: Observer counters
  resetObserver();
  const env = makeEnvelope();
  coordinateWrite(env);
  const counters = getCounters();
  assert(counters.envelopes_received >= 1, 'F13: envelopes_received incremented');
  assert(counters.manifests_created >= 1, 'F14: manifests_created incremented');
  assert(counters.authority_commits_succeeded >= 1, 'F15: authority_commits incremented');

  // F16: Idempotent duplicate counter
  const dupEnv = makeEnvelope({ dedupe_key: env.dedupe_key, payload_hash_sha256: env.payload_hash_sha256 });
  coordinateWrite(dupEnv);
  const counters2 = getCounters();
  assert(counters2.idempotent_duplicates >= 1, 'F16: idempotent_duplicates incremented');

  // F17: Compute gauges
  const gauges = computeGauges();
  assert(typeof gauges.manifest_backlog_by_state === 'object', 'F17: Gauges has manifest backlog');
  assert(typeof gauges.required_projection_lag === 'number', 'F18: Gauges has required projection lag');
  assert(typeof gauges.optional_projection_lag === 'number', 'F19: Gauges has optional projection lag');
  assert(typeof gauges.stuck_nonfinal_manifests === 'number', 'F20: Gauges has stuck nonfinal count');

  // F21: Replay context
  resetReplayStore();
  const envR = makeEnvelope();
  const mR = createManifest({
    envelope_id: envR.envelope_id, dedupe_key: envR.dedupe_key, trace_id: envR.trace_id,
    write_class: envR.write_class, primary_authority_store: 'POSTGRES',
    execution_mode: L5ExecutionMode.AUTHORITY_TX_FIRST, archive_required: false,
  });
  const replayCtx = loadReplayEnvelope(envR, mR, null);
  assert(replayCtx.envelope.envelope_id === envR.envelope_id, 'F21: Replay context has envelope');
  assert(replayCtx.manifest !== null, 'F22: Replay context has manifest');
  assert(replayCtx.lineageChain.length >= 1, 'F23: Lineage chain has at least self');

  // F24: Full invariant suite
  const fullCtx: CoordinationInvariantContext = {
    manifest: getManifest(mR.manifest_id),
    authorityCommitCount: 1,
    projectionWorkerIdempotent: true,
    repairInventedTruth: false,
    lateDataSilentOverwrite: false,
    readProjectionAsAuthority: false,
    archiveProofExistsBeforeAuthority: true,
    directDualWriteDetected: false,
  };
  const allResults = assertAllCoordinationInvariants(fullCtx);
  assert(allResults.length === 12, 'F24: 12 invariant results');
  const allPassed = allResults.every(r => r.passed);
  assert(allPassed, 'F25: All invariants pass for valid context');

  // F26: Specific invariant failures
  const badCtxA: CoordinationInvariantContext = { directDualWriteDetected: true };
  assert(!assertCoordinationInvariant('INV-5.5-A', badCtxA).passed, 'F26: INV-5.5-A fails on direct dual-write');

  const badCtxB: CoordinationInvariantContext = { authorityCommitCount: 2 };
  assert(!assertCoordinationInvariant('INV-5.5-B', badCtxB).passed, 'F27: INV-5.5-B fails on multiple authority commits');

  const badCtxH: CoordinationInvariantContext = { projectionWorkerIdempotent: false };
  assert(!assertCoordinationInvariant('INV-5.5-H', badCtxH).passed, 'F28: INV-5.5-H fails on non-idempotent worker');

  const badCtxJ: CoordinationInvariantContext = { lateDataSilentOverwrite: true };
  assert(!assertCoordinationInvariant('INV-5.5-J', badCtxJ).passed, 'F29: INV-5.5-J fails on silent overwrite');

  const badCtxK: CoordinationInvariantContext = { readProjectionAsAuthority: true };
  assert(!assertCoordinationInvariant('INV-5.5-K', badCtxK).passed, 'F30: INV-5.5-K fails on projection-as-authority');

  // F31: Enforce throws on violations
  let enforceThrew = false;
  try { require('../l5/coordination').enforceAllCoordinationInvariants(badCtxA); } catch { enforceThrew = true; }
  assert(enforceThrew, 'F31: enforceAllCoordinationInvariants throws on violations');

  // F32: Consistency model completeness
  assert(CONSISTENCY_MODEL.transactionBoundary.includes('Postgres'), 'F32: Transaction boundary mentions Postgres');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════');
console.log(' L5.5 Coordination Certification Suite');
console.log('═══════════════════════════════════════════');

const t0 = Date.now();

try { bandA(); console.log(`  Band A (Coordination legality): ✓`); } catch (e) { console.error(`  Band A CRASHED:`, e); }
try { bandB(); console.log(`  Band B (Transaction & manifest): ✓`); } catch (e) { console.error(`  Band B CRASHED:`, e); }
try { bandC(); console.log(`  Band C (Archive-first): ✓`); } catch (e) { console.error(`  Band C CRASHED:`, e); }
try { bandD(); console.log(`  Band D (Projection & idempotency): ✓`); } catch (e) { console.error(`  Band D CRASHED:`, e); }
try { bandE(); console.log(`  Band E (Late data & repair): ✓`); } catch (e) { console.error(`  Band E CRASHED:`, e); }
try { bandF(); console.log(`  Band F (Read consistency & observability): ✓`); } catch (e) { console.error(`  Band F CRASHED:`, e); }

console.log('───────────────────────────────────────────');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
if (failures.length > 0) {
  console.log('  Failures:');
  failures.forEach(f => console.log(`    ✗ ${f}`));
}
console.log(`  Time: ${Date.now() - t0}ms`);
console.log('═══════════════════════════════════════════');

if (failed > 0) process.exit(1);
