/**
 * L8.8 — Persistence, Read Surfaces, Replay, Repair, and Lower-Layer
 * Integration Certification Test Suite
 *
 * 5 Bands (§8.8.10.2):
 *   A — Durable surfaces and authority
 *   B — Historical surfaces (append-safe + correction-aware)
 *   C — Evidence storage
 *   D — Read surfaces + downstream consumption
 *   E — Audit and invariants
 */

// ── Contracts ──
import {
  L8AuthorityStore, ALL_L8_AUTHORITY_STORES,
  L8DurableSurfaceId, ALL_L8_DURABLE_SURFACE_IDS,
  L8MaterializationMode, ALL_L8_MATERIALIZATION_MODES,
  L8MutationDiscipline, ALL_L8_MUTATION_DISCIPLINES,
  L8PersistenceClass, ALL_L8_PERSISTENCE_CLASSES,
  L8_SURFACE_LEGAL_MODES,
  L8PersistenceEnvelope,
  L8TransitionDeltaKind, ALL_L8_TRANSITION_DELTA_KINDS,
  L8MaterializationStage, ALL_L8_MATERIALIZATION_STAGES,
  L8RegimeRunRecord,
  isL8DurableSurfaceId, isL8AuthorityStore, isL8MaterializationMode,
} from '../l8/contracts/l8-persistence-surface';

import {
  L8CurrentAuthorityClass, ALL_L8_CURRENT_AUTHORITY_CLASSES,
  L8CurrentRegimeRow, L8HistoricalRegimeFact,
  L8HistoricalFactBase, L8SupersessionLink,
} from '../l8/contracts/l8-current-authority';

import {
  L8EvidenceClass, ALL_L8_EVIDENCE_CLASSES,
  L8EvidenceSubjectKind,
  L8_EVIDENCE_CLASS_SUBJECT_KIND,
  evidencePathFor,
  regimeEvidencePackPath,
  transitionEvidenceBundlePath,
  inputSnapshotPath,
  candidateSnapshotPath,
  classificationRationalePath,
  confidenceFactorSnapshotPath,
  multiplierDerivationPath,
  regimeForensicPath,
  L8LineagePointer,
} from '../l8/contracts/l8-evidence-storage';

import {
  L8ReadSurfaceId, ALL_L8_READ_SURFACE_IDS,
  L8ReadMode, ALL_L8_READ_MODES,
  L8ConsumerClass, ALL_L8_CONSUMER_CLASSES,
  isL8ReadSurfaceId, isL8ReadMode, isL8ConsumerClass,
} from '../l8/contracts/l8-read-surface';

// ── Persistence ──
import {
  L8PersistenceViolationCode,
  ALL_L8_PERSISTENCE_VIOLATION_CODES,
  buildL8PersistenceViolation,
  L8PersistencePolicyValidator,
  L8CurrentStateAuthorityValidator,
  L8_CURRENT_AUTHORITY_CLASS_TO_SURFACE,
  L8_CURRENT_AUTHORITY_CLASS_TO_PERSISTENCE,
  validateL8SupersessionLink,
  L8EvidenceStorageValidator,
  buildL8EvidencePointer,
  L8HistoricalSurfaceValidator,
  prepareL8Materialization,
  buildL8PersistenceEnvelope,
  isL8MaterializationReady,
  L8_PERSISTENCE_CLASS_TO_SURFACE,
  L8_CURRENT_PERSISTENCE_CLASSES,
  L8_HISTORICAL_PERSISTENCE_CLASSES,
} from '../l8/persistence';

// ── Registries ──
import {
  L8DurableSurfaceRegistry,
  getDefaultL8DurableSurfaceRegistry,
  L8_DURABLE_SURFACE_REGISTRY,
} from '../l8/registry/durable-surface.registry';
import {
  L8ReadSurfaceRegistry,
  getDefaultL8ReadSurfaceRegistry,
  L8_READ_SURFACE_REGISTRY,
} from '../l8/registry/read-surface.registry';

// ── Read services ──
import {
  L8ReadSurfaceValidator,
  L8CurrentReadService,
  L8HistoricalReadService,
  L8EvidenceReadService,
  L8RunLineageReadService,
  L8DownstreamConsumptionValidator,
} from '../l8/read';

// ── Audit ──
import {
  resetL8PersistenceAuditLog,
  emitL8PersistenceAuditRecord,
  emitL8PersistenceViolation,
  emitL8ReadSurfaceViolation,
  emitL8DownstreamViolation,
  emitL8PersistenceInvariantFailure,
  getL8PersistenceAuditLog,
  getL8PersistenceViolationsByCode,
  getL8PersistenceViolationsBySurface,
  hasAnyL8PersistenceViolations,
  getL8PersistenceViolationCount,
  getL8PersistenceCriticalViolations,
  surfaceForL8PersistenceViolation,
  defaultSeverityForL8PersistenceViolation,
} from '../l8/constitution/l8-persistence-audit';

// ── Invariants ──
import {
  runAllL8_8Invariants,
  checkINV_88_A, checkINV_88_B, checkINV_88_C, checkINV_88_D,
  checkINV_88_E, checkINV_88_F, checkINV_88_G,
  buildGreenL8CurrentRegimeEnvelope,
  buildGreenL8HistoricalRegimeEnvelope,
  buildGreenL8HistoricalFact,
  buildGreenL8EvidencePointer,
  buildGreenL8ReadRequest,
} from '../l8/invariants/l8_8-invariants';

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}
function resetAll(): void { resetL8PersistenceAuditLog(); }

// ═══════════════════════════════════════════════════════════════
// BAND A — Durable surfaces and authority
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Durable surfaces and authority ═══');
resetAll();

// A.01..A.08 — enum completeness
assert(ALL_L8_DURABLE_SURFACE_IDS.length === 14,
  `A.01 14 durable surface ids (got ${ALL_L8_DURABLE_SURFACE_IDS.length})`);
assert(ALL_L8_AUTHORITY_STORES.length === 3, 'A.02 3 authority stores');
assert(ALL_L8_MATERIALIZATION_MODES.length === 5, 'A.03 5 materialization modes');
assert(ALL_L8_MUTATION_DISCIPLINES.length === 6, 'A.04 6 mutation disciplines');
assert(ALL_L8_PERSISTENCE_CLASSES.length === 14, 'A.05 14 persistence classes');
assert(ALL_L8_CURRENT_AUTHORITY_CLASSES.length === 4,
  'A.06 4 current authority classes');
assert(ALL_L8_EVIDENCE_CLASSES.length === 8, 'A.07 8 evidence classes');
assert(ALL_L8_PERSISTENCE_VIOLATION_CODES.length >= 55,
  `A.08 ≥55 violation codes (got ${ALL_L8_PERSISTENCE_VIOLATION_CODES.length})`);

// A.09..A.12 — guards
assert(isL8DurableSurfaceId('l8.current_regime_registry'),
  'A.09 isL8DurableSurfaceId positive');
assert(!isL8DurableSurfaceId('not.a.surface'),
  'A.10 isL8DurableSurfaceId negative');
assert(isL8AuthorityStore('POSTGRES'), 'A.11 isL8AuthorityStore positive');
assert(isL8MaterializationMode('REPAIR_REBUILD'),
  'A.12 isL8MaterializationMode positive');

// A.13..A.17 — registry authoritative-store mapping
const durReg = getDefaultL8DurableSurfaceRegistry();
for (const cls of L8_CURRENT_PERSISTENCE_CLASSES) {
  const surface = L8_PERSISTENCE_CLASS_TO_SURFACE[cls];
  const d = durReg.get(surface)!;
  assert(d.authority_store === L8AuthorityStore.POSTGRES,
    `A.xx current class ${cls} → POSTGRES`);
}
for (const cls of L8_HISTORICAL_PERSISTENCE_CLASSES) {
  const surface = L8_PERSISTENCE_CLASS_TO_SURFACE[cls];
  const d = durReg.get(surface)!;
  assert(d.authority_store === L8AuthorityStore.CLICKHOUSE,
    `A.xx historical class ${cls} → CLICKHOUSE`);
}

// A.18..A.22 — legal-mode table enforces current vs historical split
for (const id of ALL_L8_DURABLE_SURFACE_IDS) {
  const modes = L8_SURFACE_LEGAL_MODES[id];
  assert(modes.length >= 1, `A.xx surface ${id} has at least 1 legal mode`);
}
const currentRegimeModes = L8_SURFACE_LEGAL_MODES[
  L8DurableSurfaceId.CURRENT_REGIME_REGISTRY];
assert(currentRegimeModes.length === 1 &&
  currentRegimeModes[0] === L8MaterializationMode.LIVE_CURRENT,
  'A.18 current regime only LIVE_CURRENT');
const histRegimeModes = L8_SURFACE_LEGAL_MODES[
  L8DurableSurfaceId.HISTORICAL_REGIME_FACTS];
assert(!histRegimeModes.includes(L8MaterializationMode.LIVE_CURRENT),
  'A.19 historical regime forbids LIVE_CURRENT');
assert(histRegimeModes.includes(L8MaterializationMode.REPLAY_HISTORICAL),
  'A.20 historical regime allows REPLAY_HISTORICAL');
assert(histRegimeModes.includes(L8MaterializationMode.REPAIR_REBUILD),
  'A.21 historical regime allows REPAIR_REBUILD');
assert(histRegimeModes.includes(
  L8MaterializationMode.LATE_DATA_REMATERIALIZATION),
  'A.22 historical regime allows LATE_DATA_REMATERIALIZATION');

// A.23..A.27 — class → surface map is bijective on core classes
for (const cls of ALL_L8_PERSISTENCE_CLASSES) {
  const s = L8_PERSISTENCE_CLASS_TO_SURFACE[cls];
  const d = durReg.get(s)!;
  assert(d.persistence_class === cls,
    `A.xx round-trip class ↔ surface ${cls}`);
}

// A.28..A.35 — materialization-ready predicate
const okPrep = prepareL8Materialization({
  surface_id: L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
  persistence_class: L8PersistenceClass.CURRENT_REGIME,
  materialization_mode: L8MaterializationMode.LIVE_CURRENT,
  regime_subject_id: 'subj.MACRO.RISK_ON.BTC-USD.h4',
  scope_type: 'asset', scope_id: 'BTC-USD', regime_family: 'MACRO',
  compute_run_id: 'run.1',
  policy_version: 'l8-policy-v1',
  template_id: 'tpl.MACRO.RISK_ON@1.0.0',
  replay_hash: 'hash.1.abcd',
  replay_generation_ref: null,
  as_of: '2026-01-01T00:00:00Z',
  effective_at: '2026-01-01T00:00:00Z',
  trace_id: 'trace.1', manifest_id: 'man.1',
  regime_result_id: 'res.1',
  evidence_pointer_refs: ['ev.1'],
  contract_legal: true, runtime_complete: true,
  payload_schema: 'v1', payload_hash: 'hash.payload.1',
});
assert(okPrep.ok, 'A.28 prepareL8Materialization green');
if (okPrep.ok) {
  assert(okPrep.envelope.surface_id === L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
    'A.29 envelope surface set');
  assert(okPrep.envelope.authority_store === L8AuthorityStore.POSTGRES,
    'A.30 envelope authority = POSTGRES');
  assert(okPrep.envelope.mutation_discipline
    === L8MutationDiscipline.CURRENT_SUPERSEDED,
    'A.31 envelope discipline = CURRENT_SUPERSEDED');
}
assert(isL8MaterializationReady({
  contract_legal: true, runtime_complete: true, payload_hash: 'h',
  surface_id: L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
  materialization_mode: L8MaterializationMode.LIVE_CURRENT,
}), 'A.32 ready predicate green');
assert(!isL8MaterializationReady({
  contract_legal: false, runtime_complete: true, payload_hash: 'h',
  surface_id: L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
  materialization_mode: L8MaterializationMode.LIVE_CURRENT,
}), 'A.33 contract-illegal blocks ready');
assert(!isL8MaterializationReady({
  contract_legal: true, runtime_complete: true, payload_hash: 'h',
  surface_id: L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
  materialization_mode: L8MaterializationMode.REPLAY_HISTORICAL,
}), 'A.34 replay on current surface blocks ready');
assert(!isL8MaterializationReady({
  contract_legal: true, runtime_complete: true, payload_hash: '',
  surface_id: L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
  materialization_mode: L8MaterializationMode.LIVE_CURRENT,
}), 'A.35 missing payload blocks ready');

// A.36..A.44 — policy validator: green + 4 bypass forms
const pv = new L8PersistencePolicyValidator();
const greenEnv = buildGreenL8CurrentRegimeEnvelope();
assert(pv.validate(greenEnv, { source: 'test' }).ok,
  'A.36 policy validator green');

const bypassed = pv.validate(greenEnv, {
  source: 'test', bypasses_l5: true,
});
assert(!bypassed.ok && bypassed.violations.some(v =>
  v.code === L8PersistenceViolationCode.L5_BYPASS_ATTEMPT),
  'A.37 L5 bypass detected');

const direct = pv.validate(greenEnv, {
  source: 'test', direct_store_target: L8AuthorityStore.POSTGRES,
});
assert(!direct.ok && direct.violations.some(v =>
  v.code === L8PersistenceViolationCode.DIRECT_STORE_BYPASS),
  'A.38 direct-store bypass detected');

const redis = pv.validate(greenEnv, {
  source: 'test', redis_as_authority: true,
});
assert(!redis.ok && redis.violations.some(v =>
  v.code === L8PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT),
  'A.39 Redis-as-authority detected');

const wrongAuth = pv.validate({
  ...greenEnv, authority_store: L8AuthorityStore.CLICKHOUSE,
}, { source: 'test' });
assert(!wrongAuth.ok && wrongAuth.violations.some(v =>
  v.code === L8PersistenceViolationCode.AUTHORITY_STORE_MISMATCH),
  'A.40 authority-store mismatch detected');

const wrongClass = pv.validate({
  ...greenEnv, persistence_class: L8PersistenceClass.HISTORICAL_REGIME,
}, { source: 'test' });
assert(!wrongClass.ok && wrongClass.violations.some(v =>
  v.code === L8PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE),
  'A.41 class/surface mismatch detected');

const osOnCurrent = pv.validate({
  ...greenEnv, authority_store: L8AuthorityStore.OBJECT_STORE,
}, { source: 'test' });
assert(!osOnCurrent.ok && osOnCurrent.violations.some(v =>
  v.code === L8PersistenceViolationCode.OBJECT_STORE_AS_CURRENT_AUTHORITY ||
  v.code === L8PersistenceViolationCode.AUTHORITY_STORE_MISMATCH),
  'A.42 object-store as current authority detected');

const chOnCurrent = pv.validate({
  ...greenEnv, authority_store: L8AuthorityStore.CLICKHOUSE,
}, { source: 'test' });
assert(!chOnCurrent.ok && chOnCurrent.violations.some(v =>
  v.code === L8PersistenceViolationCode.CLICKHOUSE_AS_CURRENT_AUTHORITY ||
  v.code === L8PersistenceViolationCode.AUTHORITY_STORE_MISMATCH),
  'A.43 clickhouse as current authority detected');

const destructive = pv.validate({
  ...buildGreenL8HistoricalRegimeEnvelope(),
}, { source: 'test', destructive_overwrite: true });
assert(!destructive.ok && destructive.violations.some(v =>
  v.code === L8PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE),
  'A.44 destructive overwrite on immutable detected');

// A.45..A.52 — current-state authority validator
const ca = new L8CurrentStateAuthorityValidator();
const caGreen = ca.validate(greenEnv, {
  authority_class: L8CurrentAuthorityClass.REGIME,
  source: 'test', prior_state_exists: false,
});
assert(caGreen.ok, 'A.45 current-authority green');

const caReplay = ca.validate(
  { ...greenEnv, materialization_mode:
    L8MaterializationMode.REPLAY_HISTORICAL },
  { authority_class: L8CurrentAuthorityClass.REGIME,
    source: 'test', prior_state_exists: false });
assert(!caReplay.ok, 'A.46 replay-as-live rejected');

const caClassMismatch = ca.validate(greenEnv, {
  authority_class: L8CurrentAuthorityClass.MULTIPLIER,
  source: 'test', prior_state_exists: false,
});
assert(!caClassMismatch.ok && caClassMismatch.violations.some(v =>
  v.code === L8PersistenceViolationCode.AUTHORITY_CLASS_SURFACE_MISMATCH),
  'A.47 authority class/surface mismatch detected');

const caSupersedeOk = ca.validate(
  { ...greenEnv, superseded_prior_ref: 'prior.1' },
  { authority_class: L8CurrentAuthorityClass.REGIME,
    source: 'test', prior_state_exists: true });
assert(caSupersedeOk.ok, 'A.48 supersession ok with prior');

const caSupersedeMissing = ca.validate(greenEnv, {
  authority_class: L8CurrentAuthorityClass.REGIME,
  source: 'test', prior_state_exists: true,
});
assert(!caSupersedeMissing.ok && caSupersedeMissing.violations.some(v =>
  v.code === L8PersistenceViolationCode.SUPERSEDED_PRIOR_REF_MISSING),
  'A.49 missing supersession ref detected');

const caSupersedeInvented = ca.validate(
  { ...greenEnv, superseded_prior_ref: 'invented' },
  { authority_class: L8CurrentAuthorityClass.REGIME,
    source: 'test', prior_state_exists: false });
assert(!caSupersedeInvented.ok && caSupersedeInvented.violations.some(v =>
  v.code === L8PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION),
  'A.50 invented supersession ref detected');

// A.51 — supersession-link validator
const linkOk = validateL8SupersessionLink({
  prior_state_id: 'p.1', new_state_id: 'n.1',
  supersession_reason: 'late-data arrival',
  materialization_mode: L8MaterializationMode.LIVE_CURRENT,
});
assert(linkOk.ok, 'A.51 supersession link green');
const linkSame = validateL8SupersessionLink({
  prior_state_id: 'p.1', new_state_id: 'p.1',
  supersession_reason: 'late-data arrival',
  materialization_mode: L8MaterializationMode.LIVE_CURRENT,
});
assert(!linkSame.ok, 'A.52 supersession link same ids detected');

// A.53..A.55 — authority class mapping
for (const c of ALL_L8_CURRENT_AUTHORITY_CLASSES) {
  const s = L8_CURRENT_AUTHORITY_CLASS_TO_SURFACE[c];
  const cls = L8_CURRENT_AUTHORITY_CLASS_TO_PERSISTENCE[c];
  assert(!!s && !!cls, `A.xx authority class ${c} has surface + class`);
}

console.log(`  Band A: passed=${passed} failed=${failed}`);
const bandAStart = 0;

// ═══════════════════════════════════════════════════════════════
// BAND B — Historical surfaces
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Historical surfaces ═══');
const hv = new L8HistoricalSurfaceValidator();

// B.01 — green
const histEnv = buildGreenL8HistoricalRegimeEnvelope();
const histFact = buildGreenL8HistoricalFact();
assert(hv.validate(histEnv, histFact, {
  source: 'test', prior_fact_with_same_id: false,
  mutates_current: false, destructive_overwrite: false,
}).ok, 'B.01 historical green');

// B.02 — destructive overwrite
{
  const r = hv.validate(histEnv, histFact, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: true,
  });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE),
    'B.02 destructive overwrite detected');
}

// B.03 — prior fact with same id → destructive overwrite
{
  const r = hv.validate(histEnv, histFact, {
    source: 'test', prior_fact_with_same_id: true,
    mutates_current: false, destructive_overwrite: false,
  });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE),
    'B.03 prior fact id collision detected');
}

// B.04..B.07 — missing replay, lineage, mode, policy
for (const field of ['replay_hash', 'policy_version'] as const) {
  const f = { ...histFact, [field]: '' } as L8HistoricalFactBase;
  const r = hv.validate(histEnv, f, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  assert(!r.ok, `B.xx historical missing ${field}`);
}

// B.08 — missing lineage
{
  const f = { ...histFact, lineage_refs: { trace_id: '', manifest_id: '' } };
  const r = hv.validate(histEnv, f, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE),
    'B.08 missing lineage detected');
}

// B.09 — mode mismatch between fact and envelope
{
  const f = { ...histFact, materialization_mode:
    L8MaterializationMode.REPLAY_HISTORICAL };
  const r = hv.validate(histEnv, f, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  assert(!r.ok, 'B.09 fact/env mode mismatch detected');
}

// B.10 — correction with no parent
{
  const f = { ...histFact, correction_reason: 'rework', correction_parent_ref: null };
  const r = hv.validate(histEnv, f, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT),
    'B.10 correction without parent detected');
}

// B.11 — correction with no reason
{
  const f = { ...histFact, correction_parent_ref: 'parent.1', correction_reason: null };
  const r = hv.validate(histEnv, f, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON),
    'B.11 correction without reason detected');
}

// B.12 — historical silently mutates current
{
  const r = hv.validate(histEnv, histFact, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: true, destructive_overwrite: false,
  });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY),
    'B.12 historical-mutates-current detected');
}

// B.13 — histowrical non-historical class routes fail
{
  const env = buildGreenL8CurrentRegimeEnvelope();
  const r = hv.validate(env, histFact, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  assert(!r.ok, 'B.13 historical validator rejects non-historical class');
}

// B.14 — evidence-ref required for regime/transition/confidence historical
{
  const f = { ...histFact, evidence_pack_ref: null };
  const r = hv.validate(histEnv, f, {
    source: 'test', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.HISTORICAL_ROW_EVIDENCE_REF_MISSING),
    'B.14 missing evidence_pack_ref detected');
}

// B.15..B.18 — immutable append works: many facts with different ids
const histService = new L8HistoricalReadService();
for (let i = 0; i < 4; i++) {
  histService.appendRegime({
    ...histFact,
    fact_id: `fact.${i}`,
    as_of: `2026-01-0${i + 1}T00:00:00Z`,
    effective_at: `2026-01-0${i + 1}T00:00:00Z`,
  } as L8HistoricalRegimeFact);
}
{
  const r = histService.read({
    ...buildGreenL8ReadRequest(
      L8ReadSurfaceId.REGIME_HISTORY_BY_SCOPE,
      L8ReadMode.LIVE_HISTORICAL),
    window_from_iso: '2026-01-01T00:00:00Z',
    window_to_iso: '2026-01-04T00:00:00Z',
  });
  assert(r.ok, 'B.15 historical read green');
  assert(r.rows.length === 4, `B.16 4 facts returned (got ${r.rows.length})`);
  const windowed = histService.read({
    ...buildGreenL8ReadRequest(
      L8ReadSurfaceId.REGIME_HISTORY_BY_SCOPE,
      L8ReadMode.LIVE_HISTORICAL),
    window_from_iso: '2026-01-02T00:00:00Z',
    window_to_iso: '2026-01-03T00:00:00Z',
  });
  assert(windowed.rows.length === 2,
    `B.17 window filter returns 2 (got ${windowed.rows.length})`);
}

// B.18..B.20 — delta kinds + stages completeness
assert(ALL_L8_TRANSITION_DELTA_KINDS.length === 8,
  `B.18 8 transition delta kinds (got ${ALL_L8_TRANSITION_DELTA_KINDS.length})`);
assert(ALL_L8_MATERIALIZATION_STAGES.length === 8,
  `B.19 8 materialization stages (got ${ALL_L8_MATERIALIZATION_STAGES.length})`);
assert(ALL_L8_TRANSITION_DELTA_KINDS.includes(
  L8TransitionDeltaKind.PRIMARY_REGIME_CHANGED) &&
  ALL_L8_TRANSITION_DELTA_KINDS.includes(
    L8TransitionDeltaKind.RELIANCE_READINESS_CHANGED),
  'B.20 key transition delta kinds present');

console.log(`  Band B cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Evidence storage
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Evidence storage ═══');
const ev = new L8EvidenceStorageValidator();
const pointer = buildGreenL8EvidencePointer();
const ctx = {
  expected_subject_ref: pointer.subject_ref,
  expected_subject_kind: pointer.subject_kind,
  expected_compute_run_id: pointer.compute_run_id,
  replay_required: false,
};

// C.01 — green
assert(ev.validate(pointer, ctx).ok, 'C.01 evidence pointer green');

// C.02..C.09 — class/subject mapping completeness
for (const cls of ALL_L8_EVIDENCE_CLASSES) {
  assert(!!L8_EVIDENCE_CLASS_SUBJECT_KIND[cls],
    `C.xx evidence class ${cls} has subject kind`);
}

// C.10..C.17 — deterministic path builders deterministic
{
  const p1 = regimeEvidencePackPath('a', 'r1', 'h1');
  const p2 = regimeEvidencePackPath('a', 'r1', 'h1');
  assert(p1 === p2, 'C.10 regime evidence path deterministic');
  const bad = regimeEvidencePackPath('a/../b', 'r1', 'h1');
  assert(!bad.includes('..'), 'C.11 path traversal neutralized');
  assert(transitionEvidenceBundlePath('x', 'r', 'h').includes('transition'),
    'C.12 transition path labeled');
  assert(inputSnapshotPath('x', 'r', 'h').includes('input'),
    'C.13 input snapshot path labeled');
  assert(candidateSnapshotPath('x', 'r', 'h').includes('candidates'),
    'C.14 candidate path labeled');
  assert(classificationRationalePath('x', 'r', 'h').includes('rationale'),
    'C.15 rationale path labeled');
  assert(confidenceFactorSnapshotPath('x', 'r', 'h').includes('confidence'),
    'C.16 confidence path labeled');
  assert(multiplierDerivationPath('x', 'r', 'h').includes('multiplier'),
    'C.17 multiplier path labeled');
  assert(regimeForensicPath('r', 'h').includes('forensic'),
    'C.18 forensic path labeled');
}

// C.19 — evidencePathFor covers every class
for (const cls of ALL_L8_EVIDENCE_CLASSES) {
  const path = evidencePathFor(cls, 'sub', 'run', 'hash');
  assert(path.startsWith('l8/evidence/'),
    `C.xx evidencePathFor(${cls}) returns l8 root`);
}

// C.20 — missing archive uri
{
  const bad = { ...pointer, archive_uri: '' };
  const r = ev.validate(bad, ctx);
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING),
    'C.20 missing archive_uri detected');
}

// C.21 — missing checksum
{
  const bad = { ...pointer, checksum: '' };
  const r = ev.validate(bad, ctx);
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.EVIDENCE_CHECKSUM_MISSING),
    'C.21 missing checksum detected');
}

// C.22 — missing manifest
{
  const bad = { ...pointer, manifest_id: '' };
  const r = ev.validate(bad, ctx);
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.EVIDENCE_MANIFEST_LINKAGE_MISSING),
    'C.22 missing manifest detected');
}

// C.23 — subject kind mismatch with class
{
  const bad = { ...pointer,
    subject_kind: L8EvidenceSubjectKind.REGIME_RUN };
  const r = ev.validate(bad, ctx);
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.EVIDENCE_SUBJECT_KIND_MISMATCH),
    'C.23 subject-kind/class mismatch detected');
}

// C.24 — orphan evidence (wrong compute_run)
{
  const bad = { ...pointer, compute_run_id: 'different' };
  const r = ev.validate(bad, ctx);
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.ORPHAN_EVIDENCE),
    'C.24 orphan evidence detected');
}

// C.25 — subject-ref mismatch
{
  const bad = { ...pointer, subject_ref: 'elsewhere' };
  const r = ev.validate(bad, ctx);
  assert(!r.ok, 'C.25 subject-ref mismatch detected');
}

// C.26 — replay-required but ref missing
{
  const r = ev.validate(pointer, { ...ctx, replay_required: true });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.EVIDENCE_REPLAY_REF_MISSING),
    'C.26 missing replay_generation_ref detected');
}

// C.27 — non-deterministic path
{
  const bad = { ...pointer,
    archive_uri: 's3://random/nonstandard/path.json' };
  const r = ev.validate(bad, ctx);
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.EVIDENCE_PATH_NON_DETERMINISTIC),
    'C.27 non-deterministic path detected');
}

// C.28 — evidence read service
const evRead = new L8EvidenceReadService();
evRead.register(pointer);
{
  const req = {
    ...buildGreenL8ReadRequest(
      L8ReadSurfaceId.REGIME_EVIDENCE_BY_SUBJECT,
      L8ReadMode.EVIDENCE_VIEW,
      L8ConsumerClass.FORENSIC_TOOL),
    regime_subject_id: pointer.subject_ref,
  };
  const res = evRead.read(req);
  assert(res.ok, 'C.28 evidence read green');
  assert(res.pointers.length === 1, 'C.29 pointer returned');
}
{
  const res = evRead.read(buildGreenL8ReadRequest(
    L8ReadSurfaceId.REGIME_EVIDENCE_BY_SUBJECT,
    L8ReadMode.LIVE_CURRENT,
    L8ConsumerClass.FORENSIC_TOOL,
  ));
  assert(!res.ok, 'C.30 wrong mode on evidence surface rejected');
}

console.log(`  Band C cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND D — Read surfaces + downstream consumption
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Read surfaces + downstream consumption ═══');
const readReg = getDefaultL8ReadSurfaceRegistry();
const rv = new L8ReadSurfaceValidator();
const dv = new L8DownstreamConsumptionValidator();

// D.01..D.06 — registry completeness
assert(ALL_L8_READ_SURFACE_IDS.length === 16,
  `D.01 16 read surface ids (got ${ALL_L8_READ_SURFACE_IDS.length})`);
assert(ALL_L8_READ_MODES.length === 6,
  'D.02 6 read modes');
assert(ALL_L8_CONSUMER_CLASSES.length === 8,
  'D.03 8 consumer classes');
for (const id of ALL_L8_READ_SURFACE_IDS) {
  assert(!!readReg.get(id), `D.xx read surface ${id} registered`);
}

// D.07 — guard functions
assert(isL8ReadSurfaceId('l8.read.current_regime_by_scope'),
  'D.07 isL8ReadSurfaceId positive');
assert(!isL8ReadSurfaceId('l8.read.nope'),
  'D.08 isL8ReadSurfaceId negative');
assert(isL8ReadMode('LIVE_CURRENT'), 'D.09 isL8ReadMode positive');
assert(isL8ConsumerClass('SCENARIO_WEIGHTER'),
  'D.10 isL8ConsumerClass positive');

// D.11..D.14 — green current read
const currentSvc = new L8CurrentReadService();
const regimeRow: L8CurrentRegimeRow = {
  current_state_id: 'cs.1',
  regime_subject_id: 'subj.MACRO.RISK_ON.BTC-USD.h4',
  scope_type: 'asset' as unknown as L8CurrentRegimeRow['scope_type'],
  scope_id: 'BTC-USD',
  regime_family: 'MACRO' as unknown as L8CurrentRegimeRow['regime_family'],
  effective_as_of: '2026-01-01T00:00:00Z',
  compute_run_id: 'run.1',
  policy_version: 'l8-policy-v1',
  template_id: 'tpl.MACRO.RISK_ON@1.0.0',
  materialization_mode: L8MaterializationMode.LIVE_CURRENT,
  replay_hash: 'hash.current.1',
  superseded_prior_ref: null,
  evidence_pointer_refs: ['ev.1'],
  lineage_refs: { trace_id: 'trace.1', manifest_id: 'man.1' },
  regime_result_id: 'res.1',
  primary_regime: 'RISK_ON' as unknown as L8CurrentRegimeRow['primary_regime'],
  secondary_regime: null,
  coexistence_class:
    'CLEAN_SINGLE' as unknown as L8CurrentRegimeRow['coexistence_class'],
  blocked_for_downstream: false,
  ambiguity_flag: false, staleness_flag: false, degradation_flag: false,
};
currentSvc.upsertRegime(regimeRow);
{
  const req = buildGreenL8ReadRequest(
    L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE, L8ReadMode.LIVE_CURRENT);
  const r = currentSvc.read(req);
  assert(r.ok, 'D.11 current read green');
  assert(r.row !== null, 'D.12 row returned');
}
{
  const badMode = {
    ...buildGreenL8ReadRequest(L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE,
      L8ReadMode.LIVE_CURRENT),
    mode: L8ReadMode.LIVE_HISTORICAL,
  };
  const r = currentSvc.read(badMode);
  assert(!r.ok, 'D.13 wrong-mode current read rejected');
}
{
  const req = {
    ...buildGreenL8ReadRequest(L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE,
      L8ReadMode.LIVE_CURRENT),
    claims_raw_storage_access: true,
  };
  const r = currentSvc.read(req);
  assert(!r.ok, 'D.14 raw-storage claim rejected');
}

// D.15..D.18 — raw storage / redis / scope / consumer rejections
{
  const r = rv.validate({
    ...buildGreenL8ReadRequest(L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE,
      L8ReadMode.LIVE_CURRENT),
    claims_redis_authoritative_read: true,
  });
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE),
    'D.15 redis-auth read detected');
}
{
  const r = rv.validate(buildGreenL8ReadRequest(
    L8ReadSurfaceId.REGIME_EVIDENCE_BY_SUBJECT,
    L8ReadMode.EVIDENCE_VIEW,
    L8ConsumerClass.SCENARIO_WEIGHTER));
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED),
    'D.16 evidence read consumer gate enforced');
}
{
  const req = {
    ...buildGreenL8ReadRequest(L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE,
      L8ReadMode.LIVE_CURRENT),
    scope_type: null, scope_id: null,
  };
  const r = rv.validate(req);
  assert(!r.ok && r.violations.some(v =>
    v.code === L8PersistenceViolationCode.READ_SCOPE_REQUIRED_BUT_MISSING),
    'D.17 scope required detected');
}
{
  const r = rv.validate(buildGreenL8ReadRequest(
    L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE,
    L8ReadMode.REPLAY_HISTORICAL));
  assert(!r.ok, 'D.18 replay mode on current-only surface rejected');
}

// D.19..D.22 — downstream consumption
{
  const res = dv.validate({
    consumer_class: L8ConsumerClass.SCENARIO_WEIGHTER,
    consumer_service: 'scoring',
    read_request: buildGreenL8ReadRequest(
      L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE, L8ReadMode.LIVE_CURRENT),
    will_rebuild_regime_from_l6_l7: false,
    will_rebuild_transition_from_l6_l7: false,
    will_rebuild_multiplier_from_l6_l7: false,
    accesses_raw_archive_path: false,
    ignores_reliance_posture: false, ignores_cap_chain: false,
    spoofed_read_mode: false,
  });
  assert(res.ok, 'D.19 downstream green');
}
{
  const res = dv.validate({
    consumer_class: L8ConsumerClass.SCENARIO_WEIGHTER,
    consumer_service: 'scoring',
    read_request: null,
    will_rebuild_regime_from_l6_l7: false,
    will_rebuild_transition_from_l6_l7: false,
    will_rebuild_multiplier_from_l6_l7: false,
    accesses_raw_archive_path: false,
    ignores_reliance_posture: false, ignores_cap_chain: false,
    spoofed_read_mode: false,
  });
  assert(!res.ok && res.violations.some(v =>
    v.code === L8PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE),
    'D.20 no-read-request downstream detected');
}
{
  const res = dv.validate({
    consumer_class: L8ConsumerClass.DETERMINISTIC_SCORER,
    consumer_service: 'scoring',
    read_request: buildGreenL8ReadRequest(
      L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE, L8ReadMode.LIVE_CURRENT),
    will_rebuild_regime_from_l6_l7: true,
    will_rebuild_transition_from_l6_l7: true,
    will_rebuild_multiplier_from_l6_l7: true,
    accesses_raw_archive_path: true,
    ignores_reliance_posture: true, ignores_cap_chain: true,
    spoofed_read_mode: true,
  });
  assert(!res.ok, 'D.21 multi-violation downstream rejected');
  assert(res.violations.length >= 6, `D.22 ≥6 violations (got ${res.violations.length})`);
}

// D.23..D.25 — lineage / replay-vs-live / repair chain
const runSvc = new L8RunLineageReadService();
const run: L8RegimeRunRecord = {
  compute_run_id: 'run.1',
  materialization_mode: L8MaterializationMode.LIVE_CURRENT,
  policy_version: 'l8-policy-v1',
  template_id: 'tpl.MACRO.RISK_ON@1.0.0',
  started_at: '2026-01-01T00:00:00Z',
  finished_at: '2026-01-01T00:00:05Z',
  replay_generation_ref: null, parent_run_id: null,
  lineage_refs: { trace_id: 'trace.1', manifest_id: 'man.1' },
};
runSvc.registerRun(run);
runSvc.registerLineagePointer({
  lineage_id: 'lin.1',
  regime_subject_id: 'subj.MACRO.RISK_ON.BTC-USD.h4',
  state_ref: 'res.1', compute_run_id: 'run.1',
  replay_generation_ref: null,
  manifest_id: 'man.1', trace_id: 'trace.1',
  created_at: '2026-01-01T00:00:00Z',
} as L8LineagePointer);
runSvc.registerReplayVsLiveDelta({
  regime_subject_id: 'subj.MACRO.RISK_ON.BTC-USD.h4',
  live_run_id: 'run.1', replay_run_id: 'rgen.42',
  live_regime: 'RISK_ON', replay_regime: 'RISK_ON',
  drift: false,
});
{
  const r = runSvc.readLineageByRun(
    { ...buildGreenL8ReadRequest(
      L8ReadSurfaceId.REGIME_LINEAGE_BY_RUN,
      L8ReadMode.LINEAGE_VIEW),
      compute_run_id: 'run.1',
    });
  assert(r.ok, 'D.23 lineage read green');
  assert(r.run !== null && r.pointers.length >= 1,
    'D.24 lineage run+pointers returned');
}
{
  const r = runSvc.readReplayVsLive(buildGreenL8ReadRequest(
    L8ReadSurfaceId.REPLAY_VS_LIVE_BY_SUBJECT,
    L8ReadMode.REPLAY_HISTORICAL,
    L8ConsumerClass.REPLAY_ADAPTER));
  assert(r.ok, 'D.25 replay-vs-live read green');
  assert(r.deltas.length === 1, 'D.26 delta returned');
}
{
  const r = runSvc.readRepairChain(buildGreenL8ReadRequest(
    L8ReadSurfaceId.REPAIR_LINEAGE_BY_SUBJECT,
    L8ReadMode.REPAIR_VIEW,
    L8ConsumerClass.REPAIR_ADAPTER));
  assert(r.ok, 'D.27 repair lineage read green');
  assert(r.chain !== null, 'D.28 repair chain returned');
}

// D.29..D.31 — cross-registry: read registry backs durable surfaces
const durAllIds = new Set(ALL_L8_DURABLE_SURFACE_IDS);
for (const id of ALL_L8_READ_SURFACE_IDS) {
  const d = readReg.get(id)!;
  for (const b of d.backing_durable_surfaces) {
    assert(durAllIds.has(b),
      `D.xx read surface ${id} backed by registered durable ${b}`);
  }
}

console.log(`  Band D cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and invariants ═══');
resetL8PersistenceAuditLog();

// E.01..E.06 — audit emitters
emitL8PersistenceAuditRecord({
  violationCode: L8PersistenceViolationCode.L5_BYPASS_ATTEMPT,
  source: 'test.E.01',
  auditSurface: 'DURABLE_SURFACE',
  regimeSubjectId: 'subj.1', durableSurfaceId: 'x',
  readSurfaceId: null, consumerClass: null, materializationMode: null,
  detail: 'manual', context: {}, severity: 'CRITICAL',
});
emitL8PersistenceViolation('test.E.02',
  L8PersistenceViolationCode.AUTHORITY_STORE_MISMATCH,
  'subj.1', L8DurableSurfaceId.CURRENT_REGIME_REGISTRY, 'mismatch');
emitL8ReadSurfaceViolation('test.E.03',
  L8PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT,
  'subj.1', L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE,
  L8ConsumerClass.SCENARIO_WEIGHTER, 'raw access');
emitL8DownstreamViolation('test.E.04',
  L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_REGIME_LIVE,
  'subj.1', L8ConsumerClass.DETERMINISTIC_SCORER, 'rebuild');
emitL8PersistenceInvariantFailure('test.E.05',
  'INV-8.8-Z', 'synthetic', { extra: true });

assert(getL8PersistenceViolationCount() === 5,
  `E.01 count=5 (got ${getL8PersistenceViolationCount()})`);
assert(hasAnyL8PersistenceViolations(), 'E.02 hasAny=true');
assert(getL8PersistenceCriticalViolations().length >= 3,
  `E.03 ≥3 critical (got ${getL8PersistenceCriticalViolations().length})`);
assert(getL8PersistenceViolationsByCode(
  L8PersistenceViolationCode.L5_BYPASS_ATTEMPT).length === 1,
  'E.04 lookup by code');
assert(getL8PersistenceViolationsBySurface('DURABLE_SURFACE').length >= 2,
  'E.05 lookup by surface');

// E.06 — reset
resetL8PersistenceAuditLog();
assert(getL8PersistenceAuditLog().length === 0, 'E.06 log reset');

// E.07..E.09 — surface + severity classifier
assert(surfaceForL8PersistenceViolation(
  L8PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT) === 'DURABLE_SURFACE',
  'E.07 redis classifier');
assert(surfaceForL8PersistenceViolation(
  L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_REGIME_LIVE)
  === 'DOWNSTREAM_CONSUMPTION', 'E.08 downstream classifier');
assert(defaultSeverityForL8PersistenceViolation(
  L8PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT) === 'CRITICAL',
  'E.09 redis severity');

// E.10..E.17 — invariants
const invA = checkINV_88_A();
assert(invA.holds, `E.10 ${invA.id} holds: ${invA.evidence}`);
const invB = checkINV_88_B();
assert(invB.holds, `E.11 ${invB.id} holds: ${invB.evidence}`);
const invC = checkINV_88_C();
assert(invC.holds, `E.12 ${invC.id} holds: ${invC.evidence}`);
const invD = checkINV_88_D();
assert(invD.holds, `E.13 ${invD.id} holds: ${invD.evidence}`);
const invE = checkINV_88_E();
assert(invE.holds, `E.14 ${invE.id} holds: ${invE.evidence}`);
const invF = checkINV_88_F();
assert(invF.holds, `E.15 ${invF.id} holds: ${invF.evidence}`);
const invG = checkINV_88_G();
assert(invG.holds, `E.16 ${invG.id} holds: ${invG.evidence}`);

const all = runAllL8_8Invariants();
assert(all.length === 7, `E.17 7 invariants (got ${all.length})`);
assert(all.every(i => i.holds),
  `E.18 all invariants hold: ${all.filter(i => !i.holds).map(i => i.id).join(', ')}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ Summary ═══');
console.log(`passed=${passed} failed=${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
