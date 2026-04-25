/**
 * L10.8 — Persistence & Serving Lawbook — Certification Test Suite
 *
 * §10.8.12 — 5 certification bands:
 *   A — Durable surfaces & authority        (§10.8.3, §10.8.5, INV-10.8-A/B)
 *   B — Historical surfaces                 (§10.8.4, INV-10.8-C)
 *   C — Evidence storage                    (§10.8.6, INV-10.8-D)
 *   D — Read surfaces & downstream          (§10.8.7, §10.8.9, INV-10.8-E/F)
 *   E — Replay/repair + audit + invariants  (§10.8.8, §10.8.10, INV-10.8-G)
 *
 * Pass criterion: every assertion true, all 7 L10.8 invariants green,
 * every clean fixture validates clean, and every crafted offender
 * fails on precisely its targeted `L10P_` code.
 */

import { L5AuthorityStore } from '../l5/authority/authority-store';

// ── Contracts ──
import {
  ALL_L10_DURABLE_SURFACE_IDS,
  ALL_L10_HYPOTHESIS_SERVING_CLASSES,
  ALL_L10_MATERIALIZATION_MODES,
  ALL_L10_MUTATION_DISCIPLINES,
  ALL_L10_PERSISTENCE_CLASSES,
  L10DurableSurfaceId,
  L10HypothesisServingClass,
  L10MaterializationMode,
  L10MutationDiscipline,
  L10PersistenceEnvelope,
  l10IsCurrentAuthoritySurface,
  l10IsEvidenceOrLineageSurface,
  l10IsHistoricalFactSurface,
} from '../l10/contracts/l10-persistence-surface';
import {
  ALL_L10_CURRENT_AUTHORITY_ASPECTS,
  L10CurrentAuthorityAspect,
  L10CurrentAuthoritySupersession,
  L10RedisAccelerationBinding,
  L10_CURRENT_AUTHORITY_LEGAL_MODES,
  L10_CURRENT_AUTHORITY_REQUIRED_STORE,
  L10_CURRENT_AUTHORITY_SURFACE_BY_ASPECT,
  l10CurrentAuthorityAcceptsMode,
} from '../l10/contracts/l10-current-authority';
import {
  ALL_L10_EVIDENCE_CLASSES,
  ALL_L10_EVIDENCE_SUBJECT_KINDS,
  L10EvidenceClass,
  L10EvidencePointer,
  L10EvidenceSubjectKind,
  L10_EVIDENCE_CLASS_SUBJECT_KINDS,
  buildL10DeterministicEvidencePath,
  l10IsLegalEvidencePairing,
} from '../l10/contracts/l10-evidence-storage';
import {
  ALL_L10_CONSUMER_CLASSES,
  ALL_L10_READ_GUARD_FLAGS,
  ALL_L10_READ_MODES,
  ALL_L10_READ_SURFACE_IDS,
  L10ConsumerClass,
  L10ReadGuardFlag,
  L10ReadMode,
  L10ReadRequest,
  L10ReadSurfaceId,
  L10_ADAPTER_ONLY_CONSUMERS,
  L10_UPWARD_ENGINE_CONSUMERS,
  l10ConsumerMayRebuildFromLowerLayers,
} from '../l10/contracts/l10-read-surface';

// ── Registries ──
import {
  L10DurableSurfaceRegistry,
  L10_DEFAULT_DURABLE_SURFACES,
} from '../l10/registry/l10-durable-surface.registry';
import {
  L10ReadSurfaceRegistry,
  L10_DEFAULT_READ_SURFACES,
} from '../l10/registry/l10-read-surface.registry';

// ── Persistence validators + policy ──
import {
  evaluateL10Materialization,
} from '../l10/persistence/l10-materialization-policy';
import {
  validateL10PersistenceEnvelope,
} from '../l10/persistence/l10-persistence-policy.validator';
import {
  validateL10CurrentAuthorityWrite,
  validateL10RedisAccelerationBinding,
} from '../l10/persistence/l10-current-authority.validator';
import {
  validateL10HistoricalWrite,
} from '../l10/persistence/l10-historical-surface.validator';
import {
  validateL10EvidencePointer,
} from '../l10/persistence/l10-evidence-storage.validator';
import {
  ALL_L10_PERSISTENCE_VIOLATION_CODES,
  ALL_L10_PERSISTENCE_VIOLATION_TIERS,
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  l10PersistenceViolationTier,
} from '../l10/persistence/l10-persistence-violation-codes';

// ── Read services + validators ──
import {
  validateL10ReadRequest,
} from '../l10/read/l10-read-surface.validator';
import {
  validateL10DownstreamConsumption,
} from '../l10/read/l10-downstream-consumption.validator';
import {
  L10CurrentReadService,
} from '../l10/read/l10-current-read.service';
import {
  L10HistoricalReadService,
} from '../l10/read/l10-historical-read.service';
import {
  L10EvidenceReadService,
} from '../l10/read/l10-evidence-read.service';
import {
  L10RunLineageReadService,
} from '../l10/read/l10-run-lineage-read.service';

// ── Audit + invariants ──
import {
  buildL10PersistenceAudit,
  classifyL10PersistenceAuditSeverity,
  hasL10PersistenceBlockingViolations,
  L10PersistenceAuditSeverity,
} from '../l10/constitution/l10-persistence-audit';
import {
  runAllL10_8Invariants,
} from '../l10/invariants/l10_8-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, description: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(description);
  }
}

function hasCode(
  vs: readonly L10PersistenceViolation[],
  code: L10PersistenceViolationCode,
): boolean {
  return vs.some((v) => v.code === code);
}

const POLICY = 'l10.8@1.0.0';

// ────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────

function currentEnv(
  surface: L10DurableSurfaceId,
  overrides: Partial<L10PersistenceEnvelope> = {},
): L10PersistenceEnvelope {
  return {
    envelope_id: 'env:cur:1',
    durable_surface_id: surface,
    serving_class: servingClassFor(surface),
    hypothesis_subject_id: 'h:cert:1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    materialization_mode: L10MaterializationMode.LIVE_CURRENT,
    compute_run_id: 'run:cert:1',
    supersedes_envelope_id: null,
    supersession_reason: null,
    lineage_refs: ['lref:1'],
    evidence_refs: ['ev:1'],
    replay_hash: 'h:cert:1',
    policy_version: POLICY,
    routes_through_l5: true,
    payload: { ok: true },
    ...overrides,
  };
}

function historicalEnv(
  surface: L10DurableSurfaceId,
  overrides: Partial<L10PersistenceEnvelope> = {},
): L10PersistenceEnvelope {
  return {
    envelope_id: 'env:hist:1',
    durable_surface_id: surface,
    serving_class: L10HypothesisServingClass.HISTORICAL_HYPOTHESIS_FACT,
    hypothesis_subject_id: 'h:cert:hist',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    materialization_mode: L10MaterializationMode.LIVE_HISTORICAL_APPEND,
    compute_run_id: 'run:cert:hist',
    supersedes_envelope_id: null,
    supersession_reason: null,
    lineage_refs: ['lref:hist:1'],
    evidence_refs: ['ev:hist:1'],
    replay_hash: 'h:hist:1',
    policy_version: POLICY,
    routes_through_l5: true,
    payload: { fact_id: 'f:1' },
    ...overrides,
  };
}

function servingClassFor(
  surface: L10DurableSurfaceId,
): L10HypothesisServingClass {
  switch (surface) {
    case L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY:
      return L10HypothesisServingClass.CURRENT_HYPOTHESIS_STATE;
    case L10DurableSurfaceId.CURRENT_HYPOTHESIS_RANKING_REGISTRY:
      return L10HypothesisServingClass.CURRENT_RANKING_STATE;
    case L10DurableSurfaceId.CURRENT_HYPOTHESIS_SPREAD_REGISTRY:
      return L10HypothesisServingClass.CURRENT_SPREAD_STATE;
    case L10DurableSurfaceId.CURRENT_HYPOTHESIS_CONFIDENCE_REGISTRY:
    case L10DurableSurfaceId.CURRENT_HYPOTHESIS_RESTRICTION_REGISTRY:
    case L10DurableSurfaceId.CURRENT_HYPOTHESIS_READINESS_REGISTRY:
      return L10HypothesisServingClass.CURRENT_RELIANCE_STATE;
    case L10DurableSurfaceId.CURRENT_CONFIRMATION_REGISTRY:
      return L10HypothesisServingClass.CURRENT_CONFIRMATION_STATE;
    case L10DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY:
      return L10HypothesisServingClass.CURRENT_INVALIDATION_STATE;
    case L10DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY:
      return L10HypothesisServingClass.CURRENT_SHIFT_STATE;
    default:
      return L10HypothesisServingClass.CURRENT_HYPOTHESIS_STATE;
  }
}

function cleanEvidence(
  evidence_pointer_id = 'ev:cert:1',
  overrides: Partial<L10EvidencePointer> = {},
): L10EvidencePointer {
  const base = {
    evidence_pointer_id,
    evidence_class: L10EvidenceClass.HYPOTHESIS_EVIDENCE_PACK,
    subject_kind: L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
    subject_id: 'h:ev:cert',
    hypothesis_subject_id: 'h:ev:cert',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    compute_run_id: 'run:ev:1',
    archive_uri: 's3://evidence/cert',
    manifest_ref: 'manifest:1',
    checksum: '0'.repeat(64),
    content_bytes: 128,
    replay_ref: 'h:ev:cert',
    policy_version: POLICY,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
  return {
    ...base,
    deterministic_path: buildL10DeterministicEvidencePath({
      evidence_class: base.evidence_class,
      subject_kind: base.subject_kind,
      subject_id: base.subject_id,
      hypothesis_subject_id: base.hypothesis_subject_id,
      scope_type: base.scope_type,
      scope_id: base.scope_id,
      compute_run_id: base.compute_run_id,
    }),
  };
}

function readRequest(
  surface: L10ReadSurfaceId,
  overrides: Partial<L10ReadRequest> = {},
): L10ReadRequest {
  return {
    request_id: 'req:cert:1',
    read_surface_id: surface,
    read_mode: L10ReadMode.LIVE_CURRENT,
    consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
    declared_guard_flags: ALL_L10_READ_GUARD_FLAGS.slice(),
    hypothesis_subject_id: 'h:cert:read',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    window_start: null,
    window_end: null,
    as_of: '2026-01-01T00:00:00Z',
    compute_run_id: 'run:read:1',
    evidence_subject_id: 'h:cert:read',
    bypasses_read_surface: false,
    rebuilds_from_lower_layers: false,
    declared_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// Band A — Durable surfaces & current authority
// ═══════════════════════════════════════════════════════════════
console.log('\n── Band A: Durable surfaces & current authority ──');

// A.1 enums
assert(ALL_L10_DURABLE_SURFACE_IDS.length >= 24,
  'A.1 durable surface ids registered');
assert(ALL_L10_PERSISTENCE_CLASSES.length === 8,
  'A.2 persistence classes complete (8)');
assert(ALL_L10_MUTATION_DISCIPLINES.length === 4,
  'A.3 mutation disciplines (4)');
assert(ALL_L10_MATERIALIZATION_MODES.length === 5,
  'A.4 materialization modes (5)');
assert(ALL_L10_HYPOTHESIS_SERVING_CLASSES.length === 12,
  'A.5 hypothesis serving classes (12)');
assert(ALL_L10_CURRENT_AUTHORITY_ASPECTS.length === 9,
  'A.6 current-authority aspects (9)');
assert(L10_CURRENT_AUTHORITY_REQUIRED_STORE === L5AuthorityStore.POSTGRES,
  'A.7 current authority required store is Postgres');
assert(L10_CURRENT_AUTHORITY_LEGAL_MODES.length === 3 &&
       L10_CURRENT_AUTHORITY_LEGAL_MODES.includes(L10MaterializationMode.LIVE_CURRENT) &&
       L10_CURRENT_AUTHORITY_LEGAL_MODES.includes(L10MaterializationMode.REPAIR_REBUILD) &&
       L10_CURRENT_AUTHORITY_LEGAL_MODES.includes(L10MaterializationMode.LATE_DATA_REMATERIALIZATION),
  'A.8 current-authority legal modes exact');
assert(l10CurrentAuthorityAcceptsMode(L10MaterializationMode.LIVE_CURRENT),
  'A.9 accepts LIVE_CURRENT');
assert(!l10CurrentAuthorityAcceptsMode(L10MaterializationMode.LIVE_HISTORICAL_APPEND),
  'A.10 rejects LIVE_HISTORICAL_APPEND for current authority');
assert(!l10CurrentAuthorityAcceptsMode(L10MaterializationMode.REPLAY_HISTORICAL),
  'A.11 rejects REPLAY_HISTORICAL for current authority');

// A.12 registry
const dsReg = L10DurableSurfaceRegistry.default();
assert(dsReg.list().length === L10_DEFAULT_DURABLE_SURFACES.length,
  'A.12 registry loads default surfaces');
assert(dsReg.has(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
  'A.13 registry has current hypothesis registry');
assert(dsReg.get(L10DurableSurfaceId.HYPOTHESIS_EVIDENCE_STORE)!.authority_store
  === L5AuthorityStore.OBJECT_STORAGE,
  'A.14 evidence store is OBJECT_STORAGE');
assert(dsReg.get(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1)!.authority_store
  === L5AuthorityStore.CLICKHOUSE,
  'A.15 historical fact is CLICKHOUSE');

// A.16 all current-authority surfaces are Postgres (INV-10.8-B)
const currentSurfaces = dsReg.list().filter(l10IsCurrentAuthoritySurface);
assert(currentSurfaces.length === 9,
  'A.16 nine current-authority surfaces');
assert(currentSurfaces.every(s => s.authority_store === L5AuthorityStore.POSTGRES),
  'A.17 all current-authority on Postgres');
assert(currentSurfaces.every(s => s.mutation_discipline === L10MutationDiscipline.SUPERSEDE_WITH_LINKAGE),
  'A.18 current-authority uses SUPERSEDE_WITH_LINKAGE');

// A.19 surface-accepts-mode
assert(dsReg.surfaceAcceptsMode(
  L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, L10MaterializationMode.LIVE_CURRENT),
  'A.19 current accepts LIVE_CURRENT');
assert(!dsReg.surfaceAcceptsMode(
  L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, L10MaterializationMode.LIVE_HISTORICAL_APPEND),
  'A.20 current rejects LIVE_HISTORICAL_APPEND');

// A.21 every surface routes through L5
assert(dsReg.list().every(s => s.routes_through_l5 === true),
  'A.21 all durable surfaces route through L5 (INV-10.8-A)');

// A.22 mapping aspect→surface
for (const aspect of ALL_L10_CURRENT_AUTHORITY_ASPECTS) {
  assert(dsReg.has(L10_CURRENT_AUTHORITY_SURFACE_BY_ASPECT[aspect]),
    `A.22:${aspect} mapping valid`);
}

// A.30 — clean persistence envelope on current surface validates
const cleanCurEnv = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY);
const cleanRes = validateL10PersistenceEnvelope(cleanCurEnv, dsReg);
assert(cleanRes.ok, 'A.30 clean current envelope validates');

// A.31 — unrouted envelope rejected
{
  const bad = { ...cleanCurEnv, routes_through_l5: false } as unknown as L10PersistenceEnvelope;
  const r = validateL10PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5),
    'A.31 unrouted envelope rejected');
}

// A.32 — unregistered surface rejected
{
  const bad = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    durable_surface_id: 'l10.fake' as L10DurableSurfaceId,
  });
  const r = validateL10PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED),
    'A.32 unregistered surface rejected');
}

// A.33 — illegal mode for surface rejected
{
  const bad = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    materialization_mode: L10MaterializationMode.LIVE_HISTORICAL_APPEND,
  });
  const r = validateL10PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.PERSIST_MODE_ILLEGAL_FOR_SURFACE),
    'A.33 illegal mode rejected');
}

// A.34 — missing policy_version rejected
{
  const bad = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    policy_version: '',
  });
  const r = validateL10PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.PERSIST_POLICY_VERSION_MISSING),
    'A.34 missing policy_version rejected');
}

// A.35 — missing replay_hash on replay-required surface
{
  const bad = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    replay_hash: null,
  });
  const r = validateL10PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.PERSIST_REPLAY_FIELD_MISSING),
    'A.35 missing replay_hash rejected');
}

// A.36 — serving class mismatch triggers through materialization policy
{
  const bad = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    serving_class: L10HypothesisServingClass.HISTORICAL_HYPOTHESIS_FACT,
  });
  const decision = evaluateL10Materialization({
    envelope: bad,
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: true,
  }, dsReg);
  assert(hasCode(decision.violations, L10PersistenceViolationCode.PERSIST_SERVING_CLASS_MISMATCH),
    'A.36 serving class mismatch rejected');
}

// A.40 — current authority validator: clean write (first row) passes
{
  const r = validateL10CurrentAuthorityWrite({
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    envelope: cleanCurEnv,
    supersession: null,
    registry: dsReg,
  });
  assert(r.ok, 'A.40 clean current-authority first write passes');
}

// A.41 — supersession linkage validated
{
  const supersedes: L10CurrentAuthoritySupersession = {
    durable_surface_id: L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY,
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    hypothesis_subject_id: 'h:cert:1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    prior_envelope_id: 'env:prior:1',
    prior_replay_hash: 'h:prior:1',
    prior_as_of: '2025-12-31T23:00:00Z',
    next_envelope_id: 'env:cur:1',
    next_as_of: '2026-01-01T00:00:00Z',
    next_materialization_mode: L10MaterializationMode.LIVE_CURRENT,
    supersession_reason: 'new hypothesis state observed',
    lineage_refs: ['lref:1', 'lref:prior:1'],
  };
  const r = validateL10CurrentAuthorityWrite({
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    envelope: cleanCurEnv,
    supersession: supersedes,
    registry: dsReg,
  });
  assert(r.ok, 'A.41 supersession linkage passes');
}

// A.42 — supersession missing prior link
{
  const supersedes: L10CurrentAuthoritySupersession = {
    durable_surface_id: L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY,
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    hypothesis_subject_id: 'h:cert:1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    prior_envelope_id: '',
    prior_replay_hash: null,
    prior_as_of: '',
    next_envelope_id: 'env:cur:1',
    next_as_of: '2026-01-01T00:00:00Z',
    next_materialization_mode: L10MaterializationMode.LIVE_CURRENT,
    supersession_reason: 'reason',
    lineage_refs: ['lref:1'],
  };
  const r = validateL10CurrentAuthorityWrite({
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    envelope: cleanCurEnv,
    supersession: supersedes,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.CURRENT_AUTHORITY_PRIOR_LINK_MISSING),
    'A.42 missing prior link rejected');
}

// A.43 — silent overwrite: envelope claims supersedes_envelope_id but no record
{
  const env = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    supersedes_envelope_id: 'env:prior:1',
  });
  const r = validateL10CurrentAuthorityWrite({
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    envelope: env,
    supersession: null,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.CURRENT_AUTHORITY_SILENT_OVERWRITE),
    'A.43 silent overwrite rejected');
}

// A.44 — REPLAY_HISTORICAL on current authority rejected
{
  const env = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    materialization_mode: L10MaterializationMode.REPLAY_HISTORICAL,
  });
  const r = validateL10CurrentAuthorityWrite({
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    envelope: env,
    supersession: null,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE),
    'A.44 REPLAY_HISTORICAL on current rejected');
}

// A.45 — REPAIR_REBUILD without supersession reason rejected
{
  const env = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    materialization_mode: L10MaterializationMode.REPAIR_REBUILD,
  });
  const r = validateL10CurrentAuthorityWrite({
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    envelope: env,
    supersession: null,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.CURRENT_AUTHORITY_REPAIR_NOT_MARKED),
    'A.45 REPAIR without supersession reason rejected');
}

// A.46 — aspect→surface mismatch rejected
{
  const env = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY);
  const r = validateL10CurrentAuthorityWrite({
    aspect: L10CurrentAuthorityAspect.RANKING_STATE,  // wrong aspect
    envelope: env,
    supersession: null,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.CURRENT_AUTHORITY_ASPECT_UNREGISTERED),
    'A.46 aspect/surface mismatch rejected');
}

// A.50 — Redis acceleration legal binding
{
  const binding: L10RedisAccelerationBinding = {
    durable_surface_id: L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY,
    cache_namespace: 'l10:cur:hyp',
    authoritative: false,
    invalidation_on_supersede: true,
    invalidation_on_repair: true,
    invalidation_on_replay: true,
    ttl_seconds: 30,
  };
  const r = validateL10RedisAccelerationBinding(binding, dsReg);
  assert(r.ok, 'A.50 legal Redis binding accepted');
}

// A.51 — Redis claiming authority rejected
{
  const binding = {
    durable_surface_id: L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY,
    cache_namespace: 'l10:cur:hyp',
    authoritative: true as unknown as false,
    invalidation_on_supersede: true as const,
    invalidation_on_repair: true as const,
    invalidation_on_replay: true as const,
    ttl_seconds: null,
  };
  const r = validateL10RedisAccelerationBinding(binding, dsReg);
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW),
    'A.51 Redis authority claim rejected');
}

// A.52 — Redis on non-cacheable surface rejected
{
  const binding: L10RedisAccelerationBinding = {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_EVIDENCE_STORE,
    cache_namespace: 'l10:ev',
    authoritative: false,
    invalidation_on_supersede: true,
    invalidation_on_repair: true,
    invalidation_on_replay: true,
    ttl_seconds: 60,
  };
  const r = validateL10RedisAccelerationBinding(binding, dsReg);
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW),
    'A.52 Redis on non-cacheable surface rejected');
}

// ═══════════════════════════════════════════════════════════════
// Band B — Historical surfaces
// ═══════════════════════════════════════════════════════════════
console.log('\n── Band B: Historical surfaces ──');

// B.1 — historical fact surfaces are ClickHouse + append-only
{
  const histSurfaces = dsReg.list().filter(l10IsHistoricalFactSurface);
  assert(histSurfaces.length === 10,
    'B.1 ten historical fact surfaces');
  assert(histSurfaces.every(s => s.authority_store === L5AuthorityStore.CLICKHOUSE),
    'B.2 all historical on ClickHouse');
  assert(histSurfaces.every(s => s.mutation_discipline === L10MutationDiscipline.APPEND_ONLY),
    'B.3 historical APPEND_ONLY');
}

// B.10 — clean LIVE_HISTORICAL_APPEND passes
{
  const r = validateL10HistoricalWrite({
    envelope: historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1),
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(r.ok, 'B.10 clean historical append passes');
}

// B.11 — destructive overwrite rejected
{
  const r = validateL10HistoricalWrite({
    envelope: historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1),
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: true,
  }, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE),
    'B.11 destructive overwrite rejected');
}

// B.12 — missing replay_hash rejected
{
  const env = historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1, {
    replay_hash: null,
  });
  const r = validateL10HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.HIST_REPLAY_IDENTITY_MISSING),
    'B.12 missing replay_hash rejected');
}

// B.13 — missing lineage_refs rejected
{
  const env = historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1, {
    lineage_refs: [],
  });
  const r = validateL10HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.HIST_LINEAGE_LINK_MISSING),
    'B.13 missing lineage rejected');
}

// B.14 — LIVE_CURRENT on historical rejected
{
  const env = historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1, {
    materialization_mode: L10MaterializationMode.LIVE_CURRENT,
  });
  const r = validateL10HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.HIST_MUTATES_CURRENT),
    'B.14 LIVE_CURRENT on historical rejected');
}

// B.15 — REPAIR_REBUILD requires correction semantics
{
  const env = historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1, {
    materialization_mode: L10MaterializationMode.REPAIR_REBUILD,
  });
  const r = validateL10HistoricalWrite({
    envelope: env,
    correction: { is_correction: true, parent_fact_id: null, reason: null, supersedes_replay_hash: null },
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING),
    'B.15 repair without correction semantics rejected');
}

// B.16 — REPAIR_REBUILD with full correction semantics passes
{
  const env = historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1, {
    materialization_mode: L10MaterializationMode.REPAIR_REBUILD,
  });
  const r = validateL10HistoricalWrite({
    envelope: env,
    correction: {
      is_correction: true,
      parent_fact_id: 'f:parent:1',
      reason: 'late-data adjustment',
      supersedes_replay_hash: 'h:parent',
    },
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(r.ok, 'B.16 repair with full correction semantics passes');
}

// B.17 — LATE_DATA_REMATERIALIZATION requires correction semantics
{
  const env = historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1, {
    materialization_mode: L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
  });
  const r = validateL10HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING),
    'B.17 late-data requires correction semantics');
}

// B.18 — non-historical surface rejected
{
  const env = historicalEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    serving_class: L10HypothesisServingClass.HISTORICAL_HYPOTHESIS_FACT,
  });
  const r = validateL10HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.HIST_MUTATES_CURRENT),
    'B.18 non-historical surface rejected');
}

// B.19 — not append_safe rejected
{
  const r = validateL10HistoricalWrite({
    envelope: historicalEnv(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1),
    correction: null,
    append_safe: false,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE),
    'B.19 append_safe=false rejected');
}

// B.20 — all 10 historical surfaces accept LIVE_HISTORICAL_APPEND
{
  const histSurfaces = [
    L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_RANKING_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_CONFIDENCE_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_SPREAD_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_RESTRICTION_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_READINESS_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_SHIFT_CONDITION_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_CONFIRMATION_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_INVALIDATION_V1,
    L10DurableSurfaceId.TS_HYPOTHESIS_COMPETITION_TRANSITION_V1,
  ];
  for (const s of histSurfaces) {
    const r = validateL10HistoricalWrite({
      envelope: historicalEnv(s),
      correction: null, append_safe: true,
      destructive_overwrite_attempted: false,
    }, dsReg);
    assert(r.ok, `B.20:${s} accepts historical append`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Band C — Evidence storage
// ═══════════════════════════════════════════════════════════════
console.log('\n── Band C: Evidence storage ──');

// C.1 — enums and mapping coverage
assert(ALL_L10_EVIDENCE_CLASSES.length === 8,
  'C.1 evidence classes (8)');
assert(ALL_L10_EVIDENCE_SUBJECT_KINDS.length === 8,
  'C.2 evidence subject kinds (8)');
for (const cls of ALL_L10_EVIDENCE_CLASSES) {
  assert(L10_EVIDENCE_CLASS_SUBJECT_KINDS[cls] !== undefined,
    `C.3:${cls} subject-kind mapping declared`);
  assert(L10_EVIDENCE_CLASS_SUBJECT_KINDS[cls].length > 0,
    `C.4:${cls} has at least one legal subject kind`);
}

// C.5 — deterministic path is reproducible
{
  const a = buildL10DeterministicEvidencePath({
    evidence_class: L10EvidenceClass.HYPOTHESIS_EVIDENCE_PACK,
    subject_kind: L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
    subject_id: 'h:1', hypothesis_subject_id: 'h:1',
    scope_type: 'ASSET', scope_id: 'BTC',
    compute_run_id: 'r:1',
  });
  const b = buildL10DeterministicEvidencePath({
    evidence_class: L10EvidenceClass.HYPOTHESIS_EVIDENCE_PACK,
    subject_kind: L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
    subject_id: 'h:1', hypothesis_subject_id: 'h:1',
    scope_type: 'ASSET', scope_id: 'BTC',
    compute_run_id: 'r:1',
  });
  assert(a === b, 'C.5 deterministic path reproducible');
  assert(a.startsWith('l10/hypothesis_evidence_pack/'),
    'C.6 path prefix correct');
}

// C.10 — clean pointer validates
{
  const ev = cleanEvidence();
  const r = validateL10EvidencePointer(ev);
  assert(r.ok, 'C.10 clean evidence pointer validates');
}

// C.11 — wrong subject kind rejected
{
  const ev = cleanEvidence('ev:wrong', {
    subject_kind: L10EvidenceSubjectKind.CONTRADICTION_SET,
  });
  const r = validateL10EvidencePointer(ev);
  assert(hasCode(r.violations, L10PersistenceViolationCode.EVID_SUBJECT_KIND_MISMATCH),
    'C.11 wrong subject kind rejected');
}

// C.12 — missing manifest rejected
{
  const ev = cleanEvidence('ev:m', { manifest_ref: '' });
  const r = validateL10EvidencePointer(ev);
  assert(hasCode(r.violations, L10PersistenceViolationCode.EVID_MANIFEST_LINK_MISSING),
    'C.12 missing manifest rejected');
}

// C.13 — missing archive_uri rejected
{
  const ev = cleanEvidence('ev:a', { archive_uri: '' });
  const r = validateL10EvidencePointer(ev);
  assert(hasCode(r.violations, L10PersistenceViolationCode.EVID_ARCHIVE_URI_MISSING),
    'C.13 missing archive_uri rejected');
}

// C.14 — missing checksum rejected
{
  const ev = cleanEvidence('ev:c', { checksum: '' });
  const r = validateL10EvidencePointer(ev);
  assert(hasCode(r.violations, L10PersistenceViolationCode.EVID_CHECKSUM_MISSING),
    'C.14 missing checksum rejected');
}

// C.15 — missing replay_ref rejected
{
  const ev = cleanEvidence('ev:r', { replay_ref: null });
  const r = validateL10EvidencePointer(ev);
  assert(hasCode(r.violations, L10PersistenceViolationCode.EVID_REPLAY_REF_MISSING),
    'C.15 missing replay_ref rejected');
}

// C.16 — tampered deterministic_path rejected
{
  const ev = cleanEvidence('ev:p');
  const bad = { ...ev, deterministic_path: 'wrong/path' };
  const r = validateL10EvidencePointer(bad);
  assert(hasCode(r.violations, L10PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC),
    'C.16 tampered path rejected');
}

// C.17 — orphan pointer rejected
{
  const base = {
    ...cleanEvidence('ev:orph'),
    manifest_ref: '',
    archive_uri: '',
    checksum: '',
    replay_ref: null,
  };
  const aligned = {
    ...base,
    deterministic_path: buildL10DeterministicEvidencePath({
      evidence_class: base.evidence_class,
      subject_kind: base.subject_kind,
      subject_id: base.subject_id,
      hypothesis_subject_id: base.hypothesis_subject_id,
      scope_type: base.scope_type,
      scope_id: base.scope_id,
      compute_run_id: base.compute_run_id,
    }),
  };
  const r = validateL10EvidencePointer(aligned);
  assert(hasCode(r.violations, L10PersistenceViolationCode.EVID_ORPHAN_BUNDLE),
    'C.17 orphan pointer rejected');
}

// C.20 — unknown evidence class rejected
{
  const ev = {
    ...cleanEvidence('ev:u'),
    evidence_class: 'UNKNOWN_CLASS' as L10EvidenceClass,
  };
  const r = validateL10EvidencePointer(ev);
  assert(hasCode(r.violations, L10PersistenceViolationCode.EVID_CLASS_UNREGISTERED),
    'C.20 unknown evidence class rejected');
}

// C.21 — all 8 evidence classes validate cleanly with matching kind
for (const cls of ALL_L10_EVIDENCE_CLASSES) {
  const kind = L10_EVIDENCE_CLASS_SUBJECT_KINDS[cls][0];
  assert(l10IsLegalEvidencePairing(cls, kind),
    `C.21a:${cls} pairing helper agrees`);
  const ev = cleanEvidence(`ev:${cls}`, {
    evidence_class: cls,
    subject_kind: kind,
  });
  const r = validateL10EvidencePointer(ev);
  assert(r.ok, `C.21:${cls} clean evidence validates`);
}

// ═══════════════════════════════════════════════════════════════
// Band D — Read surfaces & downstream consumption
// ═══════════════════════════════════════════════════════════════
console.log('\n── Band D: Read surfaces & downstream ──');

const rsReg = L10ReadSurfaceRegistry.default();

// D.1 — enum coverage
assert(ALL_L10_READ_SURFACE_IDS.length >= 14,
  'D.1 read surface ids ≥ 14');
assert(ALL_L10_READ_MODES.length === 6, 'D.2 six read modes');
assert(ALL_L10_CONSUMER_CLASSES.length === 7, 'D.3 seven consumer classes');
assert(ALL_L10_READ_GUARD_FLAGS.length === 6, 'D.4 six guard flags');

// D.5 — registry loads all default surfaces
assert(rsReg.list().length === L10_DEFAULT_READ_SURFACES.length,
  'D.5 registry loads defaults');
assert(rsReg.list().every(s => s.bans_raw_storage_access === true),
  'D.6 all surfaces ban raw storage (INV-10.8-E)');

// D.7 — adapter / upward split
assert(L10_UPWARD_ENGINE_CONSUMERS.length === 4,
  'D.7 four upward engine consumers');
assert(L10_ADAPTER_ONLY_CONSUMERS.length === 3,
  'D.8 three adapter-only consumers');
assert(L10_ADAPTER_ONLY_CONSUMERS.includes(L10ConsumerClass.REPLAY_ADAPTER),
  'D.9 REPLAY_ADAPTER is adapter');
assert(l10ConsumerMayRebuildFromLowerLayers(L10ConsumerClass.REPLAY_ADAPTER),
  'D.10 REPLAY_ADAPTER may rebuild');
assert(!l10ConsumerMayRebuildFromLowerLayers(L10ConsumerClass.L11_SCORING_ENGINE),
  'D.11 L11 may NOT rebuild');

// D.20 — clean current-snapshot request passes
{
  const r = validateL10ReadRequest(
    readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE),
    rsReg);
  assert(r.ok, 'D.20 clean current-snapshot read validates');
}

// D.21 — unregistered surface rejected
{
  const r = validateL10ReadRequest(
    readRequest('nope' as L10ReadSurfaceId), rsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.READ_SURFACE_UNREGISTERED),
    'D.21 unregistered surface rejected');
}

// D.22 — wrong mode rejected
{
  const r = validateL10ReadRequest(
    readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
      read_mode: L10ReadMode.REPLAY_HISTORICAL,
    }), rsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE),
    'D.22 wrong read mode rejected');
}

// D.23 — raw bypass rejected
{
  const req = {
    ...readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE),
    bypasses_read_surface: true as unknown as false,
  };
  const r = validateL10ReadRequest(req, rsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.READ_RAW_STORAGE_BYPASS),
    'D.23 raw bypass rejected');
}

// D.24 — missing guard flag rejected
{
  const r = validateL10ReadRequest(
    readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
      declared_guard_flags: [],
    }), rsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.READ_GUARD_FLAG_MISSING),
    'D.24 missing guard flag rejected');
}

// D.25 — unknown consumer rejected
{
  const r = validateL10ReadRequest(
    readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
      consumer_class: 'BOGUS' as L10ConsumerClass,
    }), rsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.READ_CONSUMER_NOT_ALLOWED),
    'D.25 unknown consumer rejected');
}

// D.26 — scope identity missing rejected
{
  const r = validateL10ReadRequest(
    readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
      scope_type: null, scope_id: null,
    }), rsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.READ_SCOPE_IDENTITY_MISSING),
    'D.26 missing scope identity rejected');
}

// D.27 — window inverted rejected
{
  const r = validateL10ReadRequest(
    readRequest(L10ReadSurfaceId.HYPOTHESIS_HISTORY_BY_SCOPE_AND_WINDOW, {
      read_mode: L10ReadMode.LIVE_HISTORICAL,
      window_start: '2026-02-01T00:00:00Z',
      window_end: '2026-01-01T00:00:00Z',
    }), rsReg);
  assert(hasCode(r.violations, L10PersistenceViolationCode.READ_WINDOW_INVALID),
    'D.27 inverted window rejected');
}

// D.28 — replay mode on non-replay-capable surface rejected
{
  const r = validateL10ReadRequest(
    readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
      read_mode: L10ReadMode.REPLAY_HISTORICAL,
    }), rsReg);
  assert(hasCode(r.violations,
      L10PersistenceViolationCode.READ_REPLAY_MODE_ON_NON_REPLAY_SURFACE) ||
         hasCode(r.violations,
      L10PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE),
    'D.28 replay on non-replay surface rejected');
}

// D.29 — rebuild-declared request rejected
{
  const req = {
    ...readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE),
    rebuilds_from_lower_layers: true as unknown as false,
  };
  const r = validateL10ReadRequest(req, rsReg);
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS),
    'D.29 rebuild-from-lower-layers declared in request rejected');
}

// D.40 — downstream consumption: clean upward read validates
{
  const req = readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE);
  const r = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
    consumer_instance_id: 'l11:1',
    rebuilds_from_lower_layers: false,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(r.ok, 'D.40 clean downstream consumption passes');
}

// D.41 — upward engine rebuilds rejected
{
  const req = readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
    consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
  });
  const r = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
    consumer_instance_id: 'l11:1',
    rebuilds_from_lower_layers: true,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS),
    'D.41 upward rebuild rejected');
}

// D.42 — adapter outside governed flow rejected
{
  const req = readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
    consumer_class: L10ConsumerClass.REPLAY_ADAPTER,
  });
  const r = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.REPLAY_ADAPTER,
    consumer_instance_id: 'adapter:1',
    rebuilds_from_lower_layers: true,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.DOWNSTREAM_ADAPTER_OUTSIDE_GOVERNED_FLOW),
    'D.42 adapter outside governed flow rejected');
}

// D.43 — adapter inside governed flow passes
{
  const req = readRequest(L10ReadSurfaceId.HYPOTHESIS_HISTORY_BY_SCOPE_AND_WINDOW, {
    read_mode: L10ReadMode.REPLAY_HISTORICAL,
    consumer_class: L10ConsumerClass.REPLAY_ADAPTER,
  });
  const r = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.REPLAY_ADAPTER,
    consumer_instance_id: 'adapter:1',
    rebuilds_from_lower_layers: true,
    read_requests: [req],
    inside_governed_replay_flow: true,
    consulted_restriction_profile: true,
  });
  assert(r.ok, 'D.43 adapter inside governed flow passes');
}

// D.44 — consumer bypassed surfaces rejected
{
  const r = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L12_SCENARIO_ENGINE,
    consumer_instance_id: 'l12:1',
    rebuilds_from_lower_layers: false,
    read_requests: [],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE),
    'D.44 no-reads rejected');
}

// D.45 — restriction not consulted rejected
{
  const req = readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
    consumer_class: L10ConsumerClass.L13_JUDGMENT_ENGINE,
  });
  const r = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L13_JUDGMENT_ENGINE,
    consumer_instance_id: 'l13:1',
    rebuilds_from_lower_layers: false,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: false,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION),
    'D.45 missing restriction consultation rejected');
}

// D.46 — read consumer mismatch rejected
{
  const req = readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE, {
    consumer_class: L10ConsumerClass.L12_SCENARIO_ENGINE,
  });
  const r = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
    consumer_instance_id: 'l11:1',
    rebuilds_from_lower_layers: false,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(hasCode(r.violations,
    L10PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE),
    'D.46 consumer/request class mismatch rejected');
}

// D.60 — read services wiring
(async () => {
  const svc = new L10CurrentReadService({
    async readCurrent<T = unknown>() {
      return {
        read_surface_id: L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE,
        scope_type: 'ASSET', scope_id: 'BTC',
        as_of: '2026-01-01T00:00:00Z', compute_run_id: 'r:1',
        policy_version: POLICY, replay_hash: 'h:1',
        payload: { ok: true } as unknown as T,
      };
    },
  }, rsReg);
  const r = await svc.read(
    readRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE));
  assert(r.ok && r.snapshot !== null,
    'D.60 current read service returns snapshot');

  // historical
  const hs = new L10HistoricalReadService({
    async readHistorical<T = unknown>() {
      return [{
        fact_id: 'f:1', hypothesis_subject_id: 'h:1',
        scope_type: 'ASSET', scope_id: 'BTC',
        as_of: '2026-01-01T00:00:00Z',
        read_mode: L10ReadMode.LIVE_HISTORICAL,
        policy_version: POLICY, replay_hash: 'h:1',
        payload: {} as unknown as T,
      }];
    },
  }, rsReg);
  const hr = await hs.read(
    readRequest(L10ReadSurfaceId.HYPOTHESIS_HISTORY_BY_SCOPE_AND_WINDOW, {
      read_mode: L10ReadMode.LIVE_HISTORICAL,
    }));
  assert(hr.ok && hr.rows.length === 1,
    'D.61 historical read service returns rows');

  // evidence
  const es = new L10EvidenceReadService({
    async readEvidenceBundle() { return [cleanEvidence('ev:svc:1')]; },
  }, rsReg);
  const er = await es.read(
    readRequest(L10ReadSurfaceId.HYPOTHESIS_EVIDENCE_BUNDLE_BY_SUBJECT, {
      read_mode: L10ReadMode.EVIDENCE_VIEW,
    }));
  assert(er.ok && er.pointers.length === 1,
    'D.62 evidence read service returns pointer');

  // lineage
  const ls = new L10RunLineageReadService({
    async readLineage() {
      return [{
        lineage_id: 'lin:1', compute_run_id: 'r:1', policy_version: POLICY,
        replay_hash: 'h:1', parent_compute_run_id: null,
        corrected_compute_run_id: null, reason_codes: [],
        mode_at_emission: 'LIVE', archive_uri: null, manifest_refs: [],
      }];
    },
  }, rsReg);
  const lr = await ls.read(
    readRequest(L10ReadSurfaceId.HYPOTHESIS_LINEAGE_BY_RUN_ID, {
      read_mode: L10ReadMode.LINEAGE_VIEW,
    }));
  assert(lr.ok && lr.rows.length === 1,
    'D.63 lineage read service returns rows');

  // D.64 — lineage with missing replay_hash rejected
  const ls2 = new L10RunLineageReadService({
    async readLineage() {
      return [{
        lineage_id: 'lin:2', compute_run_id: 'r:2', policy_version: POLICY,
        replay_hash: null, parent_compute_run_id: null,
        corrected_compute_run_id: null, reason_codes: [],
        mode_at_emission: 'LIVE', archive_uri: null, manifest_refs: [],
      }];
    },
  }, rsReg);
  const lr2 = await ls2.read(
    readRequest(L10ReadSurfaceId.HYPOTHESIS_LINEAGE_BY_RUN_ID, {
      read_mode: L10ReadMode.LINEAGE_VIEW,
    }));
  assert(hasCode(lr2.violations, L10PersistenceViolationCode.REPLAY_HASH_MISSING),
    'D.64 lineage missing replay_hash rejected');

  // D.65 — lineage repair without parent rejected
  const ls3 = new L10RunLineageReadService({
    async readLineage() {
      return [{
        lineage_id: 'lin:3', compute_run_id: 'r:3', policy_version: POLICY,
        replay_hash: 'h:3', parent_compute_run_id: null,
        corrected_compute_run_id: 'r:2', reason_codes: ['REPAIR'],
        mode_at_emission: 'REPAIR', archive_uri: null, manifest_refs: [],
      }];
    },
  }, rsReg);
  const lr3 = await ls3.read(
    readRequest(L10ReadSurfaceId.HYPOTHESIS_LINEAGE_BY_RUN_ID, {
      read_mode: L10ReadMode.LINEAGE_VIEW,
    }));
  assert(hasCode(lr3.violations, L10PersistenceViolationCode.REPAIR_WITHOUT_PARENT_LINEAGE),
    'D.65 lineage repair missing parent rejected');

  await runBandE();
})();

// ═══════════════════════════════════════════════════════════════
// Band E — Replay/repair, audit, invariants, determinism
// ═══════════════════════════════════════════════════════════════
async function runBandE(): Promise<void> {
console.log('\n── Band E: Replay/repair + audit + invariants ──');

// E.1 — materialization policy accepts clean current LIVE_CURRENT
{
  const decision = evaluateL10Materialization({
    envelope: currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(decision.admissible, 'E.1 clean materialization admissible');
}

// E.2 — blocked readiness rejected
{
  const decision = evaluateL10Materialization({
    envelope: currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: false,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L10PersistenceViolationCode.MAT_READINESS_BLOCKED),
    'E.2 blocked readiness rejected');
}

// E.3 — contract invalid rejected
{
  const decision = evaluateL10Materialization({
    envelope: currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    readiness: {
      contract_valid: false, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L10PersistenceViolationCode.MAT_CONTRACT_INVALID),
    'E.3 contract invalid rejected');
}

// E.4 — evidence missing rejected
{
  const decision = evaluateL10Materialization({
    envelope: currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: false, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L10PersistenceViolationCode.MAT_EVIDENCE_REQUIRED_MISSING),
    'E.4 evidence missing rejected');
}

// E.5 — lineage incomplete rejected
{
  const decision = evaluateL10Materialization({
    envelope: currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: false,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L10PersistenceViolationCode.MAT_LINEAGE_INCOMPLETE),
    'E.5 lineage incomplete rejected');
}

// E.6 — replay identity missing rejected
{
  const decision = evaluateL10Materialization({
    envelope: currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: false,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L10PersistenceViolationCode.MAT_REPLAY_IDENTITY_MISSING),
    'E.6 replay identity missing rejected');
}

// E.7 — append-pretends-current rejected
{
  const env = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    materialization_mode: L10MaterializationMode.LIVE_HISTORICAL_APPEND,
  });
  const decision = evaluateL10Materialization({
    envelope: env,
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: true,
  }, dsReg);
  assert(hasCode(decision.violations, L10PersistenceViolationCode.MAT_APPEND_PRETENDS_CURRENT),
    'E.7 LIVE_HISTORICAL_APPEND on current surface rejected');
}

// E.8 — repair-pretends-live rejected
{
  const env = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    materialization_mode: L10MaterializationMode.REPAIR_REBUILD,
  });
  const decision = evaluateL10Materialization({
    envelope: env,
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L10PersistenceViolationCode.MAT_REPAIR_PRETENDS_LIVE),
    'E.8 repair pretending live rejected');
}

// E.20 — audit aggregator determinism
{
  const env = currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY, {
    materialization_mode: L10MaterializationMode.LIVE_HISTORICAL_APPEND,
  });
  const decision = evaluateL10Materialization({
    envelope: env,
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  const a1 = buildL10PersistenceAudit(decision.violations);
  const a2 = buildL10PersistenceAudit(decision.violations);
  assert(a1.total === a2.total, 'E.20 audit total deterministic');
  assert(JSON.stringify(a1.by_code) === JSON.stringify(a2.by_code),
    'E.21 audit by_code deterministic');
  assert(JSON.stringify(a1.by_tier) === JSON.stringify(a2.by_tier),
    'E.22 audit by_tier deterministic');
  assert(a1.highest_severity === a2.highest_severity,
    'E.23 audit severity deterministic');
  assert(hasL10PersistenceBlockingViolations(a1),
    'E.24 blocking violations detected');
}

// E.25 — severity classification
assert(classifyL10PersistenceAuditSeverity(
  L10PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5) ===
  L10PersistenceAuditSeverity.CRITICAL,
  'E.25 PERSIST_NOT_ROUTED_THROUGH_L5 is CRITICAL');
assert(classifyL10PersistenceAuditSeverity(
  L10PersistenceViolationCode.READ_WINDOW_INVALID) ===
  L10PersistenceAuditSeverity.WARNING,
  'E.26 READ_WINDOW_INVALID is WARNING');
assert(classifyL10PersistenceAuditSeverity(
  L10PersistenceViolationCode.PERSIST_IDENTITY_FIELD_MISSING) ===
  L10PersistenceAuditSeverity.ERROR,
  'E.27 identity field missing defaults to ERROR');

// E.28 — every violation code classifies to a tier
for (const code of ALL_L10_PERSISTENCE_VIOLATION_CODES) {
  const tier = l10PersistenceViolationTier(code);
  assert(ALL_L10_PERSISTENCE_VIOLATION_TIERS.includes(tier),
    `E.28:${code} tier valid`);
}

// E.30 — invariants
const invs = runAllL10_8Invariants();
assert(invs.length === 7, 'E.30 seven invariants');
for (const r of invs) {
  assert(r.holds, `E.30:${r.id} ${r.name} holds — ${r.evidence}`);
}

// E.40 — determinism: identical envelope → identical validation
{
  const v1 = validateL10PersistenceEnvelope(
    currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY), dsReg);
  const v2 = validateL10PersistenceEnvelope(
    currentEnv(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY), dsReg);
  assert(v1.ok === v2.ok, 'E.40 clean validation deterministic');
  assert(v1.violations.length === v2.violations.length,
    'E.41 clean validation length identical');
}

// E.50 — evidence / lineage surface classification helper
{
  const evidenceSurfaces = dsReg.list().filter(l10IsEvidenceOrLineageSurface);
  assert(evidenceSurfaces.length === 4,
    'E.50 four evidence/lineage surfaces (2 evidence + 2 lineage)');
}

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────');
console.log(`L10.8 Persistence Certification Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailed assertions:');
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log('All L10.8 persistence-and-serving certification bands PASSED');
process.exit(0);
}
