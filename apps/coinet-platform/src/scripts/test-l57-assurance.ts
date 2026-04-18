/**
 * L5.7 — Replay, Repair, Security, Tests, and Done Definition
 * Certification Test Suite
 *
 * 7 Bands:
 *   A — Replay entry points, fidelity, and legality
 *   B — Replay engine: lookup, bundle, integrity, execution policy
 *   C — Repair classes, scan policy, projection repair, late-data, archive reconciliation
 *   D — Failure ontology, failure records, failure handling doctrine
 *   E — Security surfaces, access policy, PII minimization
 *   F — Done-gate evaluator
 *   G — Constitutional invariants INV-5.7-A through L
 */

import {
  // Replay fidelity
  L5ReplayFidelity, ALL_REPLAY_FIDELITIES, FIDELITY_REQUIREMENTS, getFidelityRequirements,
  // Replay entry points
  type L5ReplayRequest, type ReplayEntryPointType, ALL_ENTRY_POINT_TYPES, isValidReplayRequest,
  // Replay lookup
  lookupReplay, registerReplayableWrite, resetReplayLookupStore,
  // Replay loader
  type ReplayArtifactKind, ALL_ARTIFACT_KINDS, storeReplayArtifact, loadReplayArtifacts, resetReplayArtifactStore,
  // Replay bundle
  buildReplayBundle,
  // Replay integrity
  verifyReplayIntegrity,
  // Replay execution policy
  determineReplayExecutionMode, checkReplayLegality,
  // Repair classes
  L5RepairClass, ALL_REPAIR_CLASSES, isRepairable, isAutomatable, requiresHumanReview, blocksFinalisation,
  // Repair scan
  registerRepairCandidate, scanForRepairs, recordRepairAttempt, getRepairAttempts, resetRepairStore, DEFAULT_REPAIR_SCAN_POLICY,
  // Projection repair
  repairProjection,
  // Late data
  reprojectLateData,
  // Archive reconciliation
  reconcileArchivePointer,
  // Failure ontology
  L5FailureFamily, L5FailureCode, ALL_FAILURE_CODES, ALL_FAILURE_FAMILIES, FAILURE_FAMILY_MAP, getFailureFamily,
  // Failure records
  recordFailure, getFailureRecords, getFailuresByFamily, getCriticalFailures, hasInvisibleFailures, resetFailureStore,
  // Failure handling
  getHandlingPolicy, isAbortFailure, preservesAuthority, opensRepairPath, allFailuresVisible,
  // Security
  ALL_SERVICE_ROLES, canWrite, canReplay, canReadSensitive, isPublicAccessAllowed, WRITE_SURFACE_LAW, STORE_SECURITY_POLICIES, ALL_SENSITIVE_ARTIFACT_CLASSES,
  // Access policy
  evaluateAccess, getAccessAuditLog, resetAccessAuditLog,
  // PII
  classifyField, validateClickHouseFields, validateRedisFields, validateObjectTags, hasAnyPIIViolation,
  // PII constants
  PROHIBITED_CLICKHOUSE_FIELDS, PROHIBITED_REDIS_FIELDS, PROHIBITED_TAG_FIELDS,
  // Done gate
  L5DoneRecommendation, evaluateL5DoneState,
  // Invariants
  checkAllAssuranceInvariants,
  checkINV_57_A, checkINV_57_B, checkINV_57_C, checkINV_57_D,
  checkINV_57_E, checkINV_57_F, checkINV_57_G, checkINV_57_H,
  checkINV_57_I, checkINV_57_J, checkINV_57_K, checkINV_57_L,
} from '../l5/assurance';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetReplayLookupStore();
  resetReplayArtifactStore();
  resetRepairStore();
  resetFailureStore();
  resetAccessAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Replay entry points, fidelity, and legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Replay Entry Points, Fidelity, Legality ═══');
resetAll();

// A.1 — All 7 entry point types defined
assert(ALL_ENTRY_POINT_TYPES.length === 7, 'A.1 — 7 entry point types');
assert(ALL_ENTRY_POINT_TYPES.includes('TRACE_ID'), 'A.1a — TRACE_ID');
assert(ALL_ENTRY_POINT_TYPES.includes('REPLAY_WINDOW_ID'), 'A.1b — REPLAY_WINDOW_ID');
assert(ALL_ENTRY_POINT_TYPES.includes('CANONICAL_SCOPE_TIME_RANGE'), 'A.1c — CANONICAL_SCOPE_TIME_RANGE');
assert(ALL_ENTRY_POINT_TYPES.includes('REPORT_ID'), 'A.1d — REPORT_ID');
assert(ALL_ENTRY_POINT_TYPES.includes('SCORE_ID'), 'A.1e — SCORE_ID');
assert(ALL_ENTRY_POINT_TYPES.includes('MANIFEST_ID'), 'A.1f — MANIFEST_ID');
assert(ALL_ENTRY_POINT_TYPES.includes('ENVELOPE_ID'), 'A.1g — ENVELOPE_ID');

// A.2 — Three fidelity levels
assert(ALL_REPLAY_FIDELITIES.length === 3, 'A.2 — 3 fidelity levels');
assert(ALL_REPLAY_FIDELITIES.includes(L5ReplayFidelity.STRUCTURAL), 'A.2a — STRUCTURAL');
assert(ALL_REPLAY_FIDELITIES.includes(L5ReplayFidelity.ANALYTICAL), 'A.2b — ANALYTICAL');
assert(ALL_REPLAY_FIDELITIES.includes(L5ReplayFidelity.FORENSIC), 'A.2c — FORENSIC');

// A.3 — Structural requires manifest, envelope, projections
const structReq = getFidelityRequirements(L5ReplayFidelity.STRUCTURAL);
assert(structReq.requiresManifest, 'A.3a — Structural requires manifest');
assert(structReq.requiresEnvelope, 'A.3b — Structural requires envelope');
assert(structReq.requiresProjections, 'A.3c — Structural requires projections');
assert(!structReq.requiresRawArchive, 'A.3d — Structural does NOT require raw archive');
assert(!structReq.requiresTransitionHistory, 'A.3e — Structural does NOT require transitions');

// A.4 — Forensic requires everything
const forensicReq = getFidelityRequirements(L5ReplayFidelity.FORENSIC);
assert(forensicReq.requiresRawArchive, 'A.4a — Forensic requires raw archive');
assert(forensicReq.requiresNormalizedEnvelope, 'A.4b — Forensic requires normalized envelope');
assert(forensicReq.requiresTransitionHistory, 'A.4c — Forensic requires transition history');
assert(forensicReq.requiresAuditEvents, 'A.4d — Forensic requires audit events');
assert(forensicReq.requiresBundleLineage, 'A.4e — Forensic requires bundle lineage');
assert(forensicReq.requiresRepairHistory, 'A.4f — Forensic requires repair history');

// A.5 — Analytical is mid-tier
const analyticalReq = getFidelityRequirements(L5ReplayFidelity.ANALYTICAL);
assert(analyticalReq.requiresAnalyticalRows, 'A.5a — Analytical requires analytical rows');
assert(analyticalReq.requiresFeatureHistories, 'A.5b — Analytical requires feature histories');
assert(analyticalReq.requiresScoreHistories, 'A.5c — Analytical requires score histories');
assert(!analyticalReq.requiresRawArchive, 'A.5d — Analytical does NOT require raw archive');

// A.6 — Valid replay request: string value
const validReq: L5ReplayRequest = { entry_point_type: 'TRACE_ID', value: 'tr_001', fidelity: L5ReplayFidelity.STRUCTURAL };
assert(isValidReplayRequest(validReq), 'A.6 — Valid string replay request');

// A.7 — Valid replay request: scope time range
const scopeReq: L5ReplayRequest = {
  entry_point_type: 'CANONICAL_SCOPE_TIME_RANGE',
  value: { scope_type: 'COIN', scope_id: 'BTC', start_at: '2024-01-01', end_at: '2024-12-31' },
  fidelity: L5ReplayFidelity.ANALYTICAL,
};
assert(isValidReplayRequest(scopeReq), 'A.7 — Valid scope time range request');

// A.8 — Invalid: scope type with string value
const badScopeReq: L5ReplayRequest = { entry_point_type: 'CANONICAL_SCOPE_TIME_RANGE', value: 'bad', fidelity: L5ReplayFidelity.STRUCTURAL };
assert(!isValidReplayRequest(badScopeReq), 'A.8 — Scope type rejects string value');

// A.9 — Invalid: empty value
const emptyReq: L5ReplayRequest = { entry_point_type: 'TRACE_ID', value: '', fidelity: L5ReplayFidelity.STRUCTURAL };
assert(!isValidReplayRequest(emptyReq), 'A.9 — Empty value rejected');

// ═══════════════════════════════════════════════════════════════
// BAND B — Replay engine: lookup, bundle, integrity, execution
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Replay Engine ═══');
resetAll();

// B.1 — Register and lookup
registerReplayableWrite('tr_100', { trace_id: 'tr_100', manifest_id: 'm_100', envelope_id: 'e_100', archive_id: 'a_100' });
const lookup1 = lookupReplay({ entry_point_type: 'TRACE_ID', value: 'tr_100', fidelity: L5ReplayFidelity.STRUCTURAL });
assert(lookup1.completeness === 'COMPLETE', 'B.1a — Complete structural lookup');
assert(lookup1.resolved_trace_ids.includes('tr_100'), 'B.1b — Trace resolved');
assert(lookup1.resolved_manifest_ids.includes('m_100'), 'B.1c — Manifest resolved');

// B.2 — Missing lineage returns INSUFFICIENT
const lookup2 = lookupReplay({ entry_point_type: 'TRACE_ID', value: 'tr_999', fidelity: L5ReplayFidelity.FORENSIC });
assert(lookup2.completeness === 'INSUFFICIENT', 'B.2 — Missing lineage is INSUFFICIENT');

// B.3 — Partial lookup (no archive)
registerReplayableWrite('tr_200', { trace_id: 'tr_200', manifest_id: 'm_200', envelope_id: 'e_200', archive_id: null });
const lookup3 = lookupReplay({ entry_point_type: 'TRACE_ID', value: 'tr_200', fidelity: L5ReplayFidelity.FORENSIC });
assert(lookup3.completeness === 'PARTIAL', 'B.3 — No archive is PARTIAL for forensic');
assert(lookup3.missing_surfaces.length > 0, 'B.3a — Missing surfaces reported');

// B.4 — Build replay bundle
const bundle1 = buildReplayBundle(lookup1);
assert(bundle1.bundle_id.length > 0, 'B.4a — Bundle ID assigned');
assert(bundle1.fidelity === L5ReplayFidelity.STRUCTURAL, 'B.4b — Fidelity preserved');
assert(bundle1.checksum_sha256.length >= 32, 'B.4c — Checksum computed');
assert(bundle1.evidence_manifest.length > 0, 'B.4d — Evidence manifest populated');
assert(bundle1.coverage_summary.coverage_ratio === 1, 'B.4e — Full coverage');

// B.5 — Verify replay integrity on complete bundle
const integrity1 = verifyReplayIntegrity(bundle1);
assert(integrity1.overall === 'INTACT', 'B.5a — Complete bundle is INTACT');
assert(integrity1.checks_failed === 0, 'B.5b — No failures');

// B.6 — Verify replay integrity on degraded bundle
const bundle2 = buildReplayBundle(lookup3);
const integrity2 = verifyReplayIntegrity(bundle2);
assert(integrity2.violations.length > 0, 'B.6 — Degraded bundle has violations');

// B.7 — Replay execution mode: read-only structural
const exec1 = determineReplayExecutionMode(L5ReplayFidelity.STRUCTURAL, false);
assert(exec1.mode === 'READ_ONLY_STRUCTURAL', 'B.7a — Read-only structural');
assert(!exec1.mayMutateAuthority, 'B.7b — No authority mutation');

// B.8 — Replay execution mode: read-only forensic
const exec2 = determineReplayExecutionMode(L5ReplayFidelity.FORENSIC, false);
assert(exec2.mode === 'READ_ONLY_FORENSIC', 'B.8 — Read-only forensic');

// B.9 — Derivation-emitting replay
const exec3 = determineReplayExecutionMode(L5ReplayFidelity.ANALYTICAL, true);
assert(exec3.mode === 'DERIVATION_EMITTING', 'B.9a — Derivation emitting');
assert(exec3.requiresRematerializationLaw, 'B.9b — Requires rematerialization law');
assert(!exec3.mayMutateAuthority, 'B.9c — Still cannot mutate authority');

// B.10 — Replay legality on complete bundle
const legality1 = checkReplayLegality(bundle1);
assert(legality1.legal, 'B.10 — Complete bundle is legal for replay');

// B.11 — Replay loader
storeReplayArtifact('tr_100', { kind: 'MANIFEST', id: 'm_100', data: { state: 'FINALIZED' }, loaded_at: new Date().toISOString() });
storeReplayArtifact('tr_100', { kind: 'NORMALIZED_ENVELOPE', id: 'e_100', data: {}, loaded_at: new Date().toISOString() });
const loadResult = loadReplayArtifacts('tr_100', ['MANIFEST', 'NORMALIZED_ENVELOPE', 'RAW_ARCHIVE']);
assert(loadResult.total_artifacts === 2, 'B.11a — 2 artifacts loaded');
assert(loadResult.missing_kinds.includes('RAW_ARCHIVE'), 'B.11b — RAW_ARCHIVE missing detected');

// B.12 — All artifact kinds defined
assert(ALL_ARTIFACT_KINDS.length === 14, 'B.12 — 14 artifact kinds');

// ═══════════════════════════════════════════════════════════════
// BAND C — Repair classes, scan, projection repair, late-data, archive
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Repair Infrastructure ═══');
resetAll();

// C.1 — 8 repair classes
assert(ALL_REPAIR_CLASSES.length === 8, 'C.1 — 8 repair classes');

// C.2 — Repairable classification
assert(!isRepairable(L5RepairClass.RP0_NO_REPAIR_NEEDED), 'C.2a — RP0 not repairable');
assert(isRepairable(L5RepairClass.RP1_OPTIONAL_ACCELERATION_REPAIR), 'C.2b — RP1 repairable');
assert(isRepairable(L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR), 'C.2c — RP2 repairable');
assert(isRepairable(L5RepairClass.RP3_ARCHIVE_COMPLETENESS_REPAIR), 'C.2d — RP3 repairable');
assert(isRepairable(L5RepairClass.RP4_LATE_DATA_REPROJECTION), 'C.2e — RP4 repairable');
assert(isRepairable(L5RepairClass.RP5_REPLAY_BUNDLE_REGENERATION), 'C.2f — RP5 repairable');
assert(isRepairable(L5RepairClass.RP6_QUARANTINE_BOUND_REPAIR), 'C.2g — RP6 repairable');
assert(!isRepairable(L5RepairClass.RP7_FATAL_NON_REPAIRABLE), 'C.2h — RP7 not repairable');

// C.3 — Automatable classification
assert(isAutomatable(L5RepairClass.RP1_OPTIONAL_ACCELERATION_REPAIR), 'C.3a — RP1 automatable');
assert(isAutomatable(L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR), 'C.3b — RP2 automatable');
assert(!isAutomatable(L5RepairClass.RP3_ARCHIVE_COMPLETENESS_REPAIR), 'C.3c — RP3 not auto');
assert(isAutomatable(L5RepairClass.RP4_LATE_DATA_REPROJECTION), 'C.3d — RP4 automatable');
assert(isAutomatable(L5RepairClass.RP5_REPLAY_BUNDLE_REGENERATION), 'C.3e — RP5 automatable');
assert(!isAutomatable(L5RepairClass.RP6_QUARANTINE_BOUND_REPAIR), 'C.3f — RP6 not auto');

// C.4 — Human review classification
assert(requiresHumanReview(L5RepairClass.RP6_QUARANTINE_BOUND_REPAIR), 'C.4a — RP6 requires review');
assert(requiresHumanReview(L5RepairClass.RP7_FATAL_NON_REPAIRABLE), 'C.4b — RP7 requires review');
assert(!requiresHumanReview(L5RepairClass.RP1_OPTIONAL_ACCELERATION_REPAIR), 'C.4c — RP1 no review');

// C.5 — Blocks finalization
assert(blocksFinalisation(L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR), 'C.5a — RP2 blocks finalization');
assert(blocksFinalisation(L5RepairClass.RP3_ARCHIVE_COMPLETENESS_REPAIR), 'C.5b — RP3 blocks finalization');
assert(blocksFinalisation(L5RepairClass.RP7_FATAL_NON_REPAIRABLE), 'C.5c — RP7 blocks finalization');
assert(!blocksFinalisation(L5RepairClass.RP1_OPTIONAL_ACCELERATION_REPAIR), 'C.5d — RP1 does not block');

// C.6 — Repair scan policy defaults
assert(DEFAULT_REPAIR_SCAN_POLICY.max_retry_attempts === 5, 'C.6a — Max 5 retries');
assert(DEFAULT_REPAIR_SCAN_POLICY.auto_repair_classes.length === 4, 'C.6b — 4 auto-repair classes');

// C.7 — Register and scan repair candidates
registerRepairCandidate({ manifest_id: 'm_300', trace_id: 'tr_300', repair_class: L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR, age_ms: 5000, reason: 'CH failed', eligible_for_auto_repair: true });
registerRepairCandidate({ manifest_id: 'm_301', trace_id: 'tr_301', repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE, age_ms: 10000, reason: 'Corrupt', eligible_for_auto_repair: false });
const scan1 = scanForRepairs();
assert(scan1.total_candidates === 1, 'C.7a — 1 repairable candidate');
assert(scan1.auto_eligible === 1, 'C.7b — 1 auto-eligible');
assert(scan1.fatal_non_repairable === 1, 'C.7c — 1 fatal');

// C.8 — Projection repair: successful ClickHouse repair
const repResult1 = repairProjection(
  { manifest_id: 'm_300', trace_id: 'tr_300', repair_class: L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR, age_ms: 5000, reason: 'CH failed', eligible_for_auto_repair: true },
  'CLICKHOUSE',
);
assert(repResult1.outcome === 'SUCCEEDED', 'C.8a — CH repair succeeded');
assert(repResult1.attempt_id.startsWith('rpr_'), 'C.8b — Attempt ID assigned');

// C.9 — Projection repair: fatal class rejected
const repResult2 = repairProjection(
  { manifest_id: 'm_301', trace_id: 'tr_301', repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE, age_ms: 10000, reason: 'Corrupt', eligible_for_auto_repair: false },
  'CLICKHOUSE',
);
assert(repResult2.outcome === 'FAILED_FATAL', 'C.9 — Fatal class repair rejected');

// C.10 — Repair attempts are recorded
const attempts = getRepairAttempts();
assert(attempts.length >= 2, 'C.10 — At least 2 repair attempts logged');

// C.11 — Late data reprojection
const lateResult = reprojectLateData({
  manifest_id: 'm_400', trace_id: 'tr_400', late_data_kind: 'HISTORICAL_ANALYTICAL_FACT',
  original_timestamp: '2024-01-01T00:00:00Z', arrival_timestamp: new Date().toISOString(), requires_rollup_refresh: true,
});
assert(lateResult.outcome === 'REPROJECTED', 'C.11a — Late data reprojected');
assert(lateResult.authority_mutated === false, 'C.11b — Authority NOT mutated');
assert(lateResult.projections_updated.includes('CLICKHOUSE_ANALYTICAL'), 'C.11c — Analytical projection updated');
assert(lateResult.projections_updated.includes('CLICKHOUSE_ROLLUP'), 'C.11d — Rollup refreshed');

// C.12 — Archive pointer reconciliation: consistent
const arcRes1 = reconcileArchivePointer({ manifest_id: 'm_500', trace_id: 'tr_500', expected_archive_uri: 's3://ok', object_exists: true, pointer_exists: true, tag_mismatch: false, checksum_match: true });
assert(arcRes1.outcome === 'ALREADY_CONSISTENT', 'C.12 — Consistent pointer');

// C.13 — Archive pointer: missing object is fatal
const arcRes2 = reconcileArchivePointer({ manifest_id: 'm_501', trace_id: 'tr_501', expected_archive_uri: 's3://missing', object_exists: false, pointer_exists: false, tag_mismatch: false, checksum_match: false });
assert(arcRes2.outcome === 'OBJECT_MISSING_FATAL', 'C.13a — Missing object is fatal');
assert(arcRes2.repair_class === L5RepairClass.RP7_FATAL_NON_REPAIRABLE, 'C.13b — RP7 classification');

// C.14 — Archive pointer: checksum mismatch is fatal
const arcRes3 = reconcileArchivePointer({ manifest_id: 'm_502', trace_id: 'tr_502', expected_archive_uri: 's3://bad', object_exists: true, pointer_exists: true, tag_mismatch: false, checksum_match: false });
assert(arcRes3.outcome === 'CHECKSUM_MISMATCH_FATAL', 'C.14 — Checksum mismatch fatal');

// C.15 — Archive pointer: tag mismatch repairable
const arcRes4 = reconcileArchivePointer({ manifest_id: 'm_503', trace_id: 'tr_503', expected_archive_uri: 's3://tags', object_exists: true, pointer_exists: true, tag_mismatch: true, checksum_match: true });
assert(arcRes4.outcome === 'TAGS_REPAIRED', 'C.15a — Tags repaired');
assert(arcRes4.repair_class === L5RepairClass.RP3_ARCHIVE_COMPLETENESS_REPAIR, 'C.15b — RP3');

// C.16 — Archive pointer: missing pointer created
const arcRes5 = reconcileArchivePointer({ manifest_id: 'm_504', trace_id: 'tr_504', expected_archive_uri: 's3://new', object_exists: true, pointer_exists: false, tag_mismatch: false, checksum_match: true });
assert(arcRes5.outcome === 'POINTER_CREATED', 'C.16 — Pointer created');

// ═══════════════════════════════════════════════════════════════
// BAND D — Failure ontology, records, handling
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Failure Ontology ═══');
resetAll();

// D.1 — 7 failure families
assert(ALL_FAILURE_FAMILIES.length === 7, 'D.1 — 7 failure families');

// D.2 — All failure codes mapped to a family
assert(ALL_FAILURE_CODES.every(c => FAILURE_FAMILY_MAP[c] !== undefined), 'D.2 — All codes mapped');

// D.3 — F1 family codes
const f1Codes = ALL_FAILURE_CODES.filter(c => getFailureFamily(c) === L5FailureFamily.F1_INGRESS_VALIDATION);
assert(f1Codes.length === 7, 'D.3 — 7 ingress/validation codes');

// D.4 — F2 family codes
const f2Codes = ALL_FAILURE_CODES.filter(c => getFailureFamily(c) === L5FailureFamily.F2_QUARANTINE_SEMANTIC);
assert(f2Codes.length === 6, 'D.4 — 6 quarantine/semantic codes');

// D.5 — F3 family codes
const f3Codes = ALL_FAILURE_CODES.filter(c => getFailureFamily(c) === L5FailureFamily.F3_ARCHIVE_INTEGRITY);
assert(f3Codes.length === 5, 'D.5 — 5 archive/integrity codes');

// D.6 — F4 family codes
const f4Codes = ALL_FAILURE_CODES.filter(c => getFailureFamily(c) === L5FailureFamily.F4_TRANSACTION_COORDINATION);
assert(f4Codes.length === 5, 'D.6 — 5 transaction/coordination codes');

// D.7 — F5 family codes
const f5Codes = ALL_FAILURE_CODES.filter(c => getFailureFamily(c) === L5FailureFamily.F5_PROJECTION_MATERIALIZATION);
assert(f5Codes.length === 5, 'D.7 — 5 projection/materialization codes');

// D.8 — F6 family codes
const f6Codes = ALL_FAILURE_CODES.filter(c => getFailureFamily(c) === L5FailureFamily.F6_SECURITY_ACCESS);
assert(f6Codes.length === 5, 'D.8 — 5 security/access codes');

// D.9 — F7 family codes
const f7Codes = ALL_FAILURE_CODES.filter(c => getFailureFamily(c) === L5FailureFamily.F7_REPLAY_REPAIR);
assert(f7Codes.length === 4, 'D.9 — 4 replay/repair codes');

// D.10 — Total failure codes = 37
assert(ALL_FAILURE_CODES.length === 37, 'D.10 — 37 total failure codes');

// D.11 — Record a failure
const failRec = recordFailure({
  failure_code: L5FailureCode.CLICKHOUSE_PROJECTION_FAILED, severity: 'ERROR',
  manifest_id: 'm_600', trace_id: 'tr_600', target_store: 'CLICKHOUSE',
  repairability_class: L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR,
  explanation: 'Insert batch failed',
});
assert(failRec.failure_family === L5FailureFamily.F5_PROJECTION_MATERIALIZATION, 'D.11a — Correct family');
assert(failRec.visibility_scope === 'OPERATOR', 'D.11b — Operator visibility');
assert(failRec.attempt_count === 1, 'D.11c — First attempt');

// D.12 — Critical failure recording
const critFail = recordFailure({
  failure_code: L5FailureCode.CHECKSUM_MISMATCH, severity: 'FATAL',
  manifest_id: 'm_601', repairability_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE,
  explanation: 'Irrecoverable',
});
assert(critFail.visibility_scope === 'AUDIT', 'D.12a — AUDIT visibility for FATAL');
const criticals = getCriticalFailures();
assert(criticals.length >= 1, 'D.12b — Critical failures retrievable');

// D.13 — Get by family
const f5Fails = getFailuresByFamily(L5FailureFamily.F5_PROJECTION_MATERIALIZATION);
assert(f5Fails.length >= 1, 'D.13 — F5 failures retrievable');

// D.14 — No invisible failures
assert(!hasInvisibleFailures(), 'D.14 — No invisible failures');

// D.15 — Failure handling: archive write failure aborts
assert(isAbortFailure(L5FailureCode.ARCHIVE_WRITE_FAILED), 'D.15a — Archive write aborts');
assert(isAbortFailure(L5FailureCode.POSTGRES_TX_FAILED), 'D.15b — Postgres tx aborts');
assert(isAbortFailure(L5FailureCode.VALIDATION_REJECTED), 'D.15c — Validation aborts');

// D.16 — Projection failures preserve authority
assert(preservesAuthority(L5FailureCode.CLICKHOUSE_PROJECTION_FAILED), 'D.16a — CH preserves authority');
assert(preservesAuthority(L5FailureCode.REDIS_PROJECTION_FAILED), 'D.16b — Redis preserves authority');

// D.17 — Redis failure does not block finalization
const redisPol = getHandlingPolicy(L5FailureCode.REDIS_PROJECTION_FAILED);
assert(!redisPol.blocks_finalization, 'D.17a — Redis no finalization block');
assert(redisPol.opens_repair_path, 'D.17b — Redis opens repair');

// D.18 — ClickHouse failure blocks finalization
const chPol = getHandlingPolicy(L5FailureCode.CLICKHOUSE_PROJECTION_FAILED);
assert(chPol.blocks_finalization, 'D.18a — CH blocks finalization');
assert(chPol.opens_repair_path, 'D.18b — CH opens repair');

// D.19 — Non-identical duplicates quarantine
const dupPol = getHandlingPolicy(L5FailureCode.DUPLICATE_PAYLOAD_CONFLICT);
assert(dupPol.quarantine_required, 'D.19a — Duplicates quarantine');
assert(dupPol.abort_durable_flow, 'D.19b — Duplicates abort');

// D.20 — All failures visible in metrics
assert(allFailuresVisible(), 'D.20 — All failures visible');

// D.21 — Security failures have immediate rejection
assert(getHandlingPolicy(L5FailureCode.UNAUTHORIZED_WRITE_ATTEMPT).rejection_immediate, 'D.21a — Unauthorized write rejected');
assert(getHandlingPolicy(L5FailureCode.UNAUTHORIZED_REPLAY_ATTEMPT).rejection_immediate, 'D.21b — Unauthorized replay rejected');

// ═══════════════════════════════════════════════════════════════
// BAND E — Security, access policy, PII
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Security & Access ═══');
resetAll();

// E.1 — Write surface law
assert(WRITE_SURFACE_LAW.directPublicWriteAllowed === false, 'E.1a — No public write');
assert(WRITE_SURFACE_LAW.browserDirectWriteAllowed === false, 'E.1b — No browser write');
assert(WRITE_SURFACE_LAW.publicArtifactUploadAllowed === false, 'E.1c — No public upload');
assert(WRITE_SURFACE_LAW.trustedInternalServiceRequired === true, 'E.1d — Trusted service required');

// E.2 — 9 service roles defined
assert(ALL_SERVICE_ROLES.length === 9, 'E.2 — 9 service roles');

// E.3 — Write permissions
assert(canWrite('INGRESS_WRITER'), 'E.3a — Ingress can write');
assert(canWrite('PROJECTION_WORKER'), 'E.3b — Projection worker can write');
assert(canWrite('REPAIR_WORKER'), 'E.3c — Repair worker can write');
assert(canWrite('ADMIN_OPERATOR'), 'E.3d — Admin can write');
assert(!canWrite('PUBLIC_READER'), 'E.3e — Public cannot write');
assert(!canWrite('ANALYTICAL_READER'), 'E.3f — Analytical reader cannot write');
assert(!canWrite('REPORT_READER'), 'E.3g — Report reader cannot write');

// E.4 — Replay permissions
assert(canReplay('REPLAY_OPERATOR'), 'E.4a — Replay operator can replay');
assert(canReplay('ADMIN_OPERATOR'), 'E.4b — Admin can replay');
assert(canReplay('AUDIT_READER'), 'E.4c — Audit reader can replay');
assert(!canReplay('PUBLIC_READER'), 'E.4d — Public cannot replay');
assert(!canReplay('INGRESS_WRITER'), 'E.4e — Ingress writer cannot replay');

// E.5 — Sensitive read permissions
assert(canReadSensitive('ADMIN_OPERATOR'), 'E.5a — Admin reads sensitive');
assert(canReadSensitive('AUDIT_READER'), 'E.5b — Audit reads sensitive');
assert(!canReadSensitive('PUBLIC_READER'), 'E.5c — Public cannot read sensitive');
assert(!canReadSensitive('ANALYTICAL_READER'), 'E.5d — Analytical cannot read sensitive');

// E.6 — No public access
assert(!isPublicAccessAllowed(), 'E.6 — No public access');

// E.7 — Store security policies
assert(STORE_SECURITY_POLICIES.length === 4, 'E.7a — 4 store policies');
const pgPolicy = STORE_SECURITY_POLICIES.find(p => p.store === 'POSTGRES')!;
assert(pgPolicy.requires_role_separation, 'E.7b — PG role separation');
assert(!pgPolicy.allows_public_access, 'E.7c — PG no public');
const objPolicy = STORE_SECURITY_POLICIES.find(p => p.store === 'OBJECT_STORAGE')!;
assert(!objPolicy.allows_public_access, 'E.7d — Obj no public');
assert(objPolicy.requires_encryption_at_rest, 'E.7e — Obj encryption at rest');

// E.8 — 7 sensitive artifact classes
assert(ALL_SENSITIVE_ARTIFACT_CLASSES.length === 7, 'E.8 — 7 sensitive classes');

// E.9 — Access policy: allowed write
const writeDecision = evaluateAccess({ actor_id: 'svc-1', service_role: 'INGRESS_WRITER', action: 'WRITE', object_class: 'envelope', object_id: 'e_700', timestamp: new Date().toISOString() });
assert(writeDecision.allowed, 'E.9 — Ingress write allowed');

// E.10 — Access policy: denied write
const deniedWrite = evaluateAccess({ actor_id: 'user-1', service_role: 'PUBLIC_READER', action: 'WRITE', object_class: 'envelope', object_id: 'e_701', timestamp: new Date().toISOString() });
assert(!deniedWrite.allowed, 'E.10 — Public write denied');

// E.11 — Access policy: denied replay
const deniedReplay = evaluateAccess({ actor_id: 'svc-2', service_role: 'PROJECTION_WORKER', action: 'REPLAY', object_class: 'REPLAY_BUNDLE', object_id: 'rb_1', timestamp: new Date().toISOString() });
assert(!deniedReplay.allowed, 'E.11 — Projection worker cannot replay');

// E.12 — Access policy: allowed replay
const allowedReplay = evaluateAccess({ actor_id: 'svc-3', service_role: 'REPLAY_OPERATOR', action: 'REPLAY', object_class: 'REPLAY_BUNDLE', object_id: 'rb_2', timestamp: new Date().toISOString() });
assert(allowedReplay.allowed, 'E.12 — Replay operator can replay');

// E.13 — Access policy: denied sensitive read
const deniedSensitive = evaluateAccess({ actor_id: 'user-2', service_role: 'PUBLIC_READER', action: 'INSPECT_FORENSICS', object_class: 'FORENSIC_ARTIFACT', object_id: 'fa_1', timestamp: new Date().toISOString() });
assert(!deniedSensitive.allowed, 'E.13 — Public cannot inspect forensics');

// E.14 — Audit log populated
const auditLog = getAccessAuditLog();
assert(auditLog.length >= 5, 'E.14a — Audit log has entries');
assert(auditLog.some(e => e.outcome === 'DENIED'), 'E.14b — Denied entries logged');
assert(auditLog.some(e => e.outcome === 'ALLOWED'), 'E.14c — Allowed entries logged');

// E.15 — PII classification
assert(classifyField('email') === 'DIRECT_IDENTIFIER', 'E.15a — email is direct');
assert(classifyField('full_name') === 'QUASI_IDENTIFIER', 'E.15b — name is quasi');
assert(classifyField('score') === 'NON_PII', 'E.15c — score is non-PII');
assert(classifyField('income') === 'SENSITIVE_ATTRIBUTE', 'E.15d — income is sensitive');

// E.16 — ClickHouse PII validation
const chValidation = validateClickHouseFields(['metric_value', 'email', 'timestamp', 'ssn']);
assert(hasAnyPIIViolation(chValidation), 'E.16a — CH PII violation detected');
assert(chValidation.filter(c => !c.allowed).length === 2, 'E.16b — 2 violations');

// E.17 — Redis PII validation
const redisValidation = validateRedisFields(['hot_value', 'phone']);
assert(hasAnyPIIViolation(redisValidation), 'E.17 — Redis PII violation');

// E.18 — Object tag PII validation
const tagValidation = validateObjectTags(['trace_id', 'email', 'envelope_id']);
assert(hasAnyPIIViolation(tagValidation), 'E.18 — Tag PII violation');

// E.19 — Clean fields pass
const cleanCh = validateClickHouseFields(['metric_value', 'timestamp', 'entity_id']);
assert(!hasAnyPIIViolation(cleanCh), 'E.19 — Clean CH fields pass');

// E.20 — Prohibited field lists populated
assert(PROHIBITED_CLICKHOUSE_FIELDS.length >= 10, 'E.20a — CH prohibited >= 10');
assert(PROHIBITED_REDIS_FIELDS.length >= 8, 'E.20b — Redis prohibited >= 8');
assert(PROHIBITED_TAG_FIELDS.length >= 10, 'E.20c — Tag prohibited >= 10');

// ═══════════════════════════════════════════════════════════════
// BAND F — Done-Gate Evaluator
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Done-Gate Evaluator ═══');
resetAll();

// F.1 — All conditions false → NOT_DONE
const allFalseAssessment = evaluateL5DoneState(
  { endToEndGoverned: false, multiStoreScoreCoherence: false, userStateSurvivesCacheLoss: false, idempotencyIntegrity: false, lateDataHonesty: false },
  { stuckManifestsRepairable: false, boundedRetries: false, redisDegradationHonesty: false, replayCompleteness: false, artifactIntegrity: false, securityClosure: false },
  { noInventedIdentity: false, noMetriclessTimeSeries: false, noSilentUnresolvedUpgrade: false, noArchivelessFinalization: false, noFailureHiddenByProjection: false, noLowerLayerRedefinition: false, noSilentSecurityCompromise: false },
);
assert(allFalseAssessment.recommendation === L5DoneRecommendation.NOT_DONE, 'F.1a — All false = NOT_DONE');
assert(!allFalseAssessment.functional_complete, 'F.1b — Functional incomplete');
assert(!allFalseAssessment.operational_complete, 'F.1c — Operational incomplete');
assert(!allFalseAssessment.constitutional_complete, 'F.1d — Constitutional incomplete');
assert(allFalseAssessment.critical_blockers.length > 0, 'F.1e — Blockers present');

// F.2 — All conditions true → DONE
const allTrueAssessment = evaluateL5DoneState(
  { endToEndGoverned: true, multiStoreScoreCoherence: true, userStateSurvivesCacheLoss: true, idempotencyIntegrity: true, lateDataHonesty: true },
  { stuckManifestsRepairable: true, boundedRetries: true, redisDegradationHonesty: true, replayCompleteness: true, artifactIntegrity: true, securityClosure: true },
  { noInventedIdentity: true, noMetriclessTimeSeries: true, noSilentUnresolvedUpgrade: true, noArchivelessFinalization: true, noFailureHiddenByProjection: true, noLowerLayerRedefinition: true, noSilentSecurityCompromise: true },
);
assert(allTrueAssessment.recommendation === L5DoneRecommendation.DONE, 'F.2a — All true = DONE');
assert(allTrueAssessment.functional_complete, 'F.2b — Functional complete');
assert(allTrueAssessment.operational_complete, 'F.2c — Operational complete');
assert(allTrueAssessment.constitutional_complete, 'F.2d — Constitutional complete');
assert(allTrueAssessment.critical_blockers.length === 0, 'F.2e — No blockers');
assert(allTrueAssessment.warning_backlog.length === 0, 'F.2f — No warnings');

// F.3 — DONE_WITH_WARNINGS (only redis degradation honesty off)
const warningAssessment = evaluateL5DoneState(
  { endToEndGoverned: true, multiStoreScoreCoherence: true, userStateSurvivesCacheLoss: true, idempotencyIntegrity: true, lateDataHonesty: true },
  { stuckManifestsRepairable: true, boundedRetries: true, redisDegradationHonesty: false, replayCompleteness: true, artifactIntegrity: true, securityClosure: true },
  { noInventedIdentity: true, noMetriclessTimeSeries: true, noSilentUnresolvedUpgrade: true, noArchivelessFinalization: true, noFailureHiddenByProjection: true, noLowerLayerRedefinition: true, noSilentSecurityCompromise: true },
);
assert(warningAssessment.recommendation === L5DoneRecommendation.DONE_WITH_WARNINGS, 'F.3a — DONE_WITH_WARNINGS');
assert(warningAssessment.warning_backlog.length > 0, 'F.3b — Warning present');

// F.4 — Single constitutional failure blocks DONE
const constFail = evaluateL5DoneState(
  { endToEndGoverned: true, multiStoreScoreCoherence: true, userStateSurvivesCacheLoss: true, idempotencyIntegrity: true, lateDataHonesty: true },
  { stuckManifestsRepairable: true, boundedRetries: true, redisDegradationHonesty: true, replayCompleteness: true, artifactIntegrity: true, securityClosure: true },
  { noInventedIdentity: false, noMetriclessTimeSeries: true, noSilentUnresolvedUpgrade: true, noArchivelessFinalization: true, noFailureHiddenByProjection: true, noLowerLayerRedefinition: true, noSilentSecurityCompromise: true },
);
assert(constFail.recommendation === L5DoneRecommendation.NOT_DONE, 'F.4a — Constitutional fail = NOT_DONE');
assert(constFail.critical_blockers.some(b => b.includes('CONSTITUTIONAL')), 'F.4b — Constitutional blocker present');

// F.5 — Evidence summary populated on success
assert(allTrueAssessment.evidence_summary.length === 3, 'F.5 — 3 evidence summaries (functional, operational, constitutional)');

// F.6 — 5 functional conditions tracked
assert(allFalseAssessment.critical_blockers.filter(b => !b.includes('CONSTITUTIONAL')).length >= 5, 'F.6 — Functional blockers visible');

// F.7 — 7 constitutional conditions tracked
const constBlockers = allFalseAssessment.critical_blockers.filter(b => b.includes('CONSTITUTIONAL'));
assert(constBlockers.length === 7, 'F.7 — 7 constitutional blockers');

// ═══════════════════════════════════════════════════════════════
// BAND G — Constitutional Invariants INV-5.7-A through L
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND G: Constitutional Invariants ═══');
resetAll();

// G.1 — INV-5.7-A: Replay-required writes reconstructable
const invA = checkINV_57_A();
assert(invA.holds, `G.1 — ${invA.id}: ${invA.name}`);

// G.2 — INV-5.7-B: Repair cannot invent truth
const invB = checkINV_57_B();
assert(invB.holds, `G.2 — ${invB.id}: ${invB.name}`);

// G.3 — INV-5.7-C: All failures classed and visible
const invC = checkINV_57_C();
assert(invC.holds, `G.3 — ${invC.id}: ${invC.name}`);

// G.4 — INV-5.7-D: Archive failure aborts durable completion
const invD = checkINV_57_D();
assert(invD.holds, `G.4 — ${invD.id}: ${invD.name}`);

// G.5 — INV-5.7-E: Redis degrades speed only
const invE = checkINV_57_E();
assert(invE.holds, `G.5 — ${invE.id}: ${invE.name}`);

// G.6 — INV-5.7-F: Replay bundle regeneration preserves meaning
const invF = checkINV_57_F();
assert(invF.holds, `G.6 — ${invF.id}: ${invF.name}`);

// G.7 — INV-5.7-G: No public write path
const invG = checkINV_57_G();
assert(invG.holds, `G.7 — ${invG.id}: ${invG.name}`);

// G.8 — INV-5.7-H: Sensitive artifacts governed
const invH = checkINV_57_H();
assert(invH.holds, `G.8 — ${invH.id}: ${invH.name}`);

// G.9 — INV-5.7-I: Analytical stores exclude PII
const invI = checkINV_57_I();
assert(invI.holds, `G.9 — ${invI.id}: ${invI.name}`);

// G.10 — INV-5.7-J: No invisible failures
const invJ = checkINV_57_J();
assert(invJ.holds, `G.10 — ${invJ.id}: ${invJ.name}`);

// G.11 — INV-5.7-K: Late data cannot silently mutate authority
const invK = checkINV_57_K();
assert(invK.holds, `G.11 — ${invK.id}: ${invK.name}`);

// G.12 — INV-5.7-L: Done-gate evaluation is executable
const invL = checkINV_57_L();
assert(invL.holds, `G.12 — ${invL.id}: ${invL.name}`);

// G.13 — All 12 invariants hold simultaneously
const allInvariants = checkAllAssuranceInvariants();
assert(allInvariants.length === 12, 'G.13a — 12 invariants checked');
assert(allInvariants.every(i => i.holds), 'G.13b — All invariants hold');

// ═══════════════════════════════════════════════════════════════
// FINAL RESULTS
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log(`L5.7 Assurance Certification: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log('═══════════════════════════════════════════════');

if (failed > 0) { process.exit(1); }
