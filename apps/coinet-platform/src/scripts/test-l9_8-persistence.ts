/**
 * L9.8 — Persistence & Serving Lawbook — Certification Test Suite
 *
 * §9.8.12 — 5 certification bands:
 *   A — Durable surfaces & authority        (§9.8.3, §9.8.5, INV-9.8-A/B)
 *   B — Historical surfaces                 (§9.8.4, INV-9.8-C)
 *   C — Evidence storage                    (§9.8.6, INV-9.8-D)
 *   D — Read surfaces & downstream          (§9.8.7, §9.8.9, INV-9.8-E/F)
 *   E — Replay/repair + audit + invariants  (§9.8.8, §9.8.10, INV-9.8-G)
 *
 * Pass criterion: every assertion true, all 7 L9.8 invariants green,
 * every clean fixture validates clean, and every crafted offender
 * fails on precisely its targeted `L9P_` code.
 */

import { L5AuthorityStore } from '../l5/authority/authority-store';

// ── Contracts ──
import {
  ALL_L9_DURABLE_SURFACE_IDS,
  ALL_L9_MATERIALIZATION_MODES,
  ALL_L9_MUTATION_DISCIPLINES,
  ALL_L9_PERSISTENCE_CLASSES,
  ALL_L9_SEQUENCE_SERVING_CLASSES,
  L9DurableSurfaceId,
  L9MaterializationMode,
  L9MutationDiscipline,
  L9PersistenceClass,
  L9PersistenceEnvelope,
  L9SequenceServingClass,
  l9IsCurrentAuthoritySurface,
  l9IsEvidenceOrLineageSurface,
  l9IsHistoricalFactSurface,
} from '../l9/contracts/l9-persistence-surface';
import {
  ALL_L9_CURRENT_AUTHORITY_ASPECTS,
  L9CurrentAuthorityAspect,
  L9CurrentAuthoritySupersession,
  L9RedisAccelerationBinding,
  L9_CURRENT_AUTHORITY_LEGAL_MODES,
  L9_CURRENT_AUTHORITY_REQUIRED_STORE,
  L9_CURRENT_AUTHORITY_SURFACE_BY_ASPECT,
  l9CurrentAuthorityAcceptsMode,
} from '../l9/contracts/l9-current-authority';
import {
  ALL_L9_EVIDENCE_CLASSES,
  ALL_L9_EVIDENCE_SUBJECT_KINDS,
  L9EvidenceClass,
  L9EvidencePointer,
  L9EvidenceSubjectKind,
  L9_EVIDENCE_PATH_PREFIX_BY_CLASS,
  L9_EVIDENCE_SUBJECT_KIND_BY_CLASS,
  buildL9DeterministicEvidencePath,
  l9EvidencePointerHasRequiredLinkage,
} from '../l9/contracts/l9-evidence-storage';
import {
  ALL_L9_CONSUMER_CLASSES,
  ALL_L9_READ_GUARD_FLAGS,
  ALL_L9_READ_MODES,
  ALL_L9_READ_SURFACE_IDS,
  L9ConsumerClass,
  L9ReadGuardFlag,
  L9ReadMode,
  L9ReadRequest,
  L9ReadSurfaceId,
  L9_ADAPTER_ONLY_CONSUMERS,
  L9_UPWARD_ENGINE_CONSUMERS,
  l9ConsumerMayRebuildFromLowerLayers,
} from '../l9/contracts/l9-read-surface';

// ── Registries ──
import {
  L9DurableSurfaceRegistry,
  L9_DEFAULT_DURABLE_SURFACES,
} from '../l9/registry/l9-durable-surface.registry';
import {
  L9ReadSurfaceRegistry,
  L9_DEFAULT_READ_SURFACES,
} from '../l9/registry/l9-read-surface.registry';

// ── Persistence validators + policy ──
import {
  evaluateL9Materialization,
} from '../l9/persistence/l9-materialization-policy';
import {
  validateL9PersistenceEnvelope,
} from '../l9/persistence/l9-persistence-policy.validator';
import {
  validateL9CurrentAuthorityWrite,
  validateL9RedisAccelerationBinding,
} from '../l9/persistence/l9-current-authority.validator';
import {
  validateL9HistoricalWrite,
} from '../l9/persistence/l9-historical-surface.validator';
import {
  validateL9EvidencePointer,
} from '../l9/persistence/l9-evidence-storage.validator';
import {
  ALL_L9_PERSISTENCE_VIOLATION_CODES,
  ALL_L9_PERSISTENCE_VIOLATION_TIERS,
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from '../l9/persistence/l9-persistence-violation-codes';

// ── Read services + validators ──
import {
  validateL9ReadRequest,
} from '../l9/read/l9-read-surface.validator';
import {
  validateL9DownstreamConsumption,
} from '../l9/read/l9-downstream-consumption.validator';
import {
  L9CurrentReadService,
} from '../l9/read/l9-current-read.service';
import {
  L9HistoricalReadService,
} from '../l9/read/l9-historical-read.service';
import {
  L9EvidenceReadService,
} from '../l9/read/l9-evidence-read.service';
import {
  L9RunLineageReadService,
} from '../l9/read/l9-run-lineage-read.service';

// ── Audit + invariants ──
import {
  buildL9PersistenceAudit,
  classifyL9PersistenceAuditSeverity,
  hasL9PersistenceBlockingViolations,
  L9PersistenceAuditSeverity,
} from '../l9/constitution/l9-persistence-audit';
import {
  runAllL9_8Invariants,
} from '../l9/invariants/l9_8-invariants';

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
  vs: readonly L9PersistenceViolation[],
  code: L9PersistenceViolationCode,
): boolean {
  return vs.some((v) => v.code === code);
}

const POLICY = 'l9.8@1.0.0';

// ────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────

function currentEnv(
  surface: L9DurableSurfaceId,
  overrides: Partial<L9PersistenceEnvelope> = {},
): L9PersistenceEnvelope {
  return {
    envelope_id: 'env:cur:1',
    durable_surface_id: surface,
    serving_class: servingClassFor(surface),
    sequence_subject_id: 's:cert:1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    materialization_mode: L9MaterializationMode.LIVE_CURRENT,
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
  surface: L9DurableSurfaceId,
  overrides: Partial<L9PersistenceEnvelope> = {},
): L9PersistenceEnvelope {
  return {
    envelope_id: 'env:hist:1',
    durable_surface_id: surface,
    serving_class: L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT,
    sequence_subject_id: 's:cert:hist',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    materialization_mode: L9MaterializationMode.LIVE_HISTORICAL_APPEND,
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

function servingClassFor(surface: L9DurableSurfaceId): L9SequenceServingClass {
  switch (surface) {
    case L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY:
      return L9SequenceServingClass.CURRENT_SEQUENCE_STATE;
    case L9DurableSurfaceId.CURRENT_PHASE_REGISTRY:
      return L9SequenceServingClass.CURRENT_PHASE_STATE;
    case L9DurableSurfaceId.CURRENT_DECAY_REGISTRY:
      return L9SequenceServingClass.CURRENT_DECAY_STATE;
    case L9DurableSurfaceId.CURRENT_SEQUENCE_CONFIDENCE_REGISTRY:
    case L9DurableSurfaceId.CURRENT_SEQUENCE_RESTRICTION_REGISTRY:
    case L9DurableSurfaceId.CURRENT_CAUSAL_RESTRAINT_REGISTRY:
      return L9SequenceServingClass.CURRENT_RELIANCE_STATE;
    default:
      return L9SequenceServingClass.CURRENT_SEQUENCE_STATE;
  }
}

function cleanEvidence(
  evidence_id = 'ev:cert:1',
  overrides: Partial<L9EvidencePointer> = {},
): L9EvidencePointer {
  const base = {
    evidence_id,
    evidence_class: L9EvidenceClass.SEQUENCE_EVIDENCE_PACK,
    subject_kind: L9EvidenceSubjectKind.SEQUENCE_SUBJECT,
    sequence_subject_id: 's:ev:cert',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    manifest_id: 'manifest:1',
    archive_uri: 's3://evidence/cert',
    checksum_sha256: '0'.repeat(64),
    replay_ref: 'h:ev:cert',
    policy_version: POLICY,
    lineage_refs: ['lref:ev:1'],
    ...overrides,
  };
  return {
    ...base,
    deterministic_path: buildL9DeterministicEvidencePath({
      evidence_class: base.evidence_class,
      scope_type: base.scope_type,
      scope_id: base.scope_id,
      as_of: base.as_of,
      evidence_id: base.evidence_id,
    }),
  };
}

function readRequest(
  surface: L9ReadSurfaceId,
  overrides: Partial<L9ReadRequest> = {},
): L9ReadRequest {
  return {
    read_surface_id: surface,
    read_mode: L9ReadMode.LIVE_CURRENT,
    consumer_class: L9ConsumerClass.L10_HYPOTHESIS_ENGINE,
    consumer_instance_id: 'l10:inst:1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    window_start: null,
    window_end: null,
    guard_flags: ALL_L9_READ_GUARD_FLAGS.slice(),
    raw_storage_path_attempted: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// Band A — Durable surfaces & current authority
// ═══════════════════════════════════════════════════════════════
console.log('\n── Band A: Durable surfaces & current authority ──');

// A.1 enums
assert(ALL_L9_DURABLE_SURFACE_IDS.length >= 12,
  'A.1 durable surface ids registered');
assert(ALL_L9_PERSISTENCE_CLASSES.length === 8,
  'A.2 persistence classes complete (8)');
assert(ALL_L9_MUTATION_DISCIPLINES.length === 4,
  'A.3 mutation disciplines (4)');
assert(ALL_L9_MATERIALIZATION_MODES.length === 5,
  'A.4 materialization modes (5)');
assert(ALL_L9_SEQUENCE_SERVING_CLASSES.length === 9,
  'A.5 sequence serving classes (9)');
assert(ALL_L9_CURRENT_AUTHORITY_ASPECTS.length === 6,
  'A.6 current-authority aspects (6)');
assert(L9_CURRENT_AUTHORITY_REQUIRED_STORE === L5AuthorityStore.POSTGRES,
  'A.7 current authority required store is Postgres');
assert(L9_CURRENT_AUTHORITY_LEGAL_MODES.length === 3 &&
       L9_CURRENT_AUTHORITY_LEGAL_MODES.includes(L9MaterializationMode.LIVE_CURRENT) &&
       L9_CURRENT_AUTHORITY_LEGAL_MODES.includes(L9MaterializationMode.REPAIR_REBUILD) &&
       L9_CURRENT_AUTHORITY_LEGAL_MODES.includes(L9MaterializationMode.LATE_DATA_REMATERIALIZATION),
  'A.8 current-authority legal modes exact');
assert(l9CurrentAuthorityAcceptsMode(L9MaterializationMode.LIVE_CURRENT),
  'A.9 accepts LIVE_CURRENT');
assert(!l9CurrentAuthorityAcceptsMode(L9MaterializationMode.LIVE_HISTORICAL_APPEND),
  'A.10 rejects LIVE_HISTORICAL_APPEND for current authority');
assert(!l9CurrentAuthorityAcceptsMode(L9MaterializationMode.REPLAY_HISTORICAL),
  'A.11 rejects REPLAY_HISTORICAL for current authority');

// A.12 registry
const dsReg = L9DurableSurfaceRegistry.default();
assert(dsReg.list().length === L9_DEFAULT_DURABLE_SURFACES.length,
  'A.12 registry loads default surfaces');
assert(dsReg.has(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
  'A.13 registry has current sequence registry');
assert(dsReg.get(L9DurableSurfaceId.SEQUENCE_EVIDENCE_STORE)!.authority_store
  === L5AuthorityStore.OBJECT_STORAGE,
  'A.14 evidence store is OBJECT_STORAGE');
assert(dsReg.get(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1)!.authority_store
  === L5AuthorityStore.CLICKHOUSE,
  'A.15 historical fact is CLICKHOUSE');

// A.16 all current-authority surfaces are Postgres (INV-9.8-B)
const currentSurfaces = dsReg.list().filter(l9IsCurrentAuthoritySurface);
assert(currentSurfaces.length === 6,
  'A.16 six current-authority surfaces');
assert(currentSurfaces.every(s => s.authority_store === L5AuthorityStore.POSTGRES),
  'A.17 all current-authority on Postgres');
assert(currentSurfaces.every(s => s.mutation_discipline === L9MutationDiscipline.SUPERSEDE_WITH_LINKAGE),
  'A.18 current-authority uses SUPERSEDE_WITH_LINKAGE');

// A.19 surface-accepts-mode
assert(dsReg.surfaceAcceptsMode(
  L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, L9MaterializationMode.LIVE_CURRENT),
  'A.19 current accepts LIVE_CURRENT');
assert(!dsReg.surfaceAcceptsMode(
  L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, L9MaterializationMode.LIVE_HISTORICAL_APPEND),
  'A.20 current rejects LIVE_HISTORICAL_APPEND');

// A.21 every surface routes through L5
assert(dsReg.list().every(s => s.routes_through_l5 === true),
  'A.21 all durable surfaces route through L5 (INV-9.8-A)');

// A.22 mapping aspect→surface
for (const aspect of ALL_L9_CURRENT_AUTHORITY_ASPECTS) {
  assert(dsReg.has(L9_CURRENT_AUTHORITY_SURFACE_BY_ASPECT[aspect]),
    `A.22:${aspect} mapping valid`);
}

// A.30 — clean persistence envelope on current surface validates
const cleanCurEnv = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY);
const cleanRes = validateL9PersistenceEnvelope(cleanCurEnv, dsReg);
assert(cleanRes.ok, 'A.30 clean current envelope validates');

// A.31 — unrouted envelope rejected
{
  const bad = { ...cleanCurEnv, routes_through_l5: false } as unknown as L9PersistenceEnvelope;
  const r = validateL9PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5),
    'A.31 unrouted envelope rejected');
}

// A.32 — unregistered surface rejected
{
  const bad = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    durable_surface_id: 'l9.fake' as L9DurableSurfaceId,
  });
  const r = validateL9PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED),
    'A.32 unregistered surface rejected');
}

// A.33 — illegal mode for surface rejected
{
  const bad = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    materialization_mode: L9MaterializationMode.LIVE_HISTORICAL_APPEND,
  });
  const r = validateL9PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.PERSIST_MODE_ILLEGAL_FOR_SURFACE) ||
         hasCode(r.violations, L9PersistenceViolationCode.HIST_MUTATES_CURRENT),
    'A.33 illegal mode rejected');
}

// A.34 — missing policy_version rejected
{
  const bad = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    policy_version: '',
  });
  const r = validateL9PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.PERSIST_POLICY_VERSION_MISSING),
    'A.34 missing policy_version rejected');
}

// A.35 — missing replay_hash on replay-required surface
{
  const bad = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    replay_hash: null,
  });
  const r = validateL9PersistenceEnvelope(bad, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.PERSIST_REPLAY_FIELD_MISSING),
    'A.35 missing replay_hash rejected');
}

// A.36 — serving class mismatch triggers through materialization policy
{
  const bad = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    serving_class: L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT,
  });
  const decision = evaluateL9Materialization({
    envelope: bad,
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: true,
  }, dsReg);
  assert(hasCode(decision.violations, L9PersistenceViolationCode.PERSIST_SERVING_CLASS_MISMATCH),
    'A.36 serving class mismatch rejected');
}

// A.40 — current authority validator: clean write (first row) passes
{
  const r = validateL9CurrentAuthorityWrite({
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    envelope: cleanCurEnv,
    supersession: null,
    registry: dsReg,
  });
  assert(r.ok, 'A.40 clean current-authority first write passes');
}

// A.41 — supersession linkage validated
{
  const supersedes: L9CurrentAuthoritySupersession = {
    durable_surface_id: L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY,
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    sequence_subject_id: 's:cert:1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    prior_envelope_id: 'env:prior:1',
    prior_replay_hash: 'h:prior:1',
    prior_as_of: '2025-12-31T23:00:00Z',
    next_envelope_id: 'env:cur:1',
    next_as_of: '2026-01-01T00:00:00Z',
    next_materialization_mode: L9MaterializationMode.LIVE_CURRENT,
    supersession_reason: 'new sequence state observed',
    lineage_refs: ['lref:1', 'lref:prior:1'],
  };
  const r = validateL9CurrentAuthorityWrite({
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    envelope: cleanCurEnv,
    supersession: supersedes,
    registry: dsReg,
  });
  assert(r.ok, 'A.41 supersession linkage passes');
}

// A.42 — supersession missing prior link
{
  const supersedes: L9CurrentAuthoritySupersession = {
    durable_surface_id: L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY,
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    sequence_subject_id: 's:cert:1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    prior_envelope_id: '',
    prior_replay_hash: null,
    prior_as_of: '',
    next_envelope_id: 'env:cur:1',
    next_as_of: '2026-01-01T00:00:00Z',
    next_materialization_mode: L9MaterializationMode.LIVE_CURRENT,
    supersession_reason: 'reason',
    lineage_refs: ['lref:1'],
  };
  const r = validateL9CurrentAuthorityWrite({
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    envelope: cleanCurEnv,
    supersession: supersedes,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.CURRENT_AUTHORITY_PRIOR_LINK_MISSING),
    'A.42 missing prior link rejected');
}

// A.43 — silent overwrite: envelope claims supersedes_envelope_id but no record
{
  const env = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    supersedes_envelope_id: 'env:prior:1',
  });
  const r = validateL9CurrentAuthorityWrite({
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    envelope: env,
    supersession: null,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.CURRENT_AUTHORITY_SILENT_OVERWRITE),
    'A.43 silent overwrite rejected');
}

// A.44 — REPLAY_HISTORICAL on current authority rejected
{
  const env = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    materialization_mode: L9MaterializationMode.REPLAY_HISTORICAL,
  });
  const r = validateL9CurrentAuthorityWrite({
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    envelope: env,
    supersession: null,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE),
    'A.44 REPLAY_HISTORICAL on current rejected');
}

// A.45 — REPAIR_REBUILD without supersession reason rejected
{
  const env = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    materialization_mode: L9MaterializationMode.REPAIR_REBUILD,
  });
  const r = validateL9CurrentAuthorityWrite({
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    envelope: env,
    supersession: null,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.CURRENT_AUTHORITY_REPAIR_NOT_MARKED),
    'A.45 REPAIR without supersession reason rejected');
}

// A.46 — aspect→surface mismatch rejected
{
  const env = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY);
  const r = validateL9CurrentAuthorityWrite({
    aspect: L9CurrentAuthorityAspect.PHASE_STATE,  // wrong aspect
    envelope: env,
    supersession: null,
    registry: dsReg,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.CURRENT_AUTHORITY_ASPECT_UNREGISTERED),
    'A.46 aspect/surface mismatch rejected');
}

// A.50 — Redis acceleration legal binding
{
  const binding: L9RedisAccelerationBinding = {
    durable_surface_id: L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY,
    cache_namespace: 'l9:cur:seq',
    authoritative: false,
    invalidation_on_supersede: true,
    invalidation_on_repair: true,
    invalidation_on_replay: true,
    ttl_seconds: 30,
  };
  const r = validateL9RedisAccelerationBinding(binding, dsReg);
  assert(r.ok, 'A.50 legal Redis binding accepted');
}

// A.51 — Redis claiming authority rejected
{
  const binding = {
    durable_surface_id: L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY,
    cache_namespace: 'l9:cur:seq',
    authoritative: true as unknown as false,
    invalidation_on_supersede: true as const,
    invalidation_on_repair: true as const,
    invalidation_on_replay: true as const,
    ttl_seconds: null,
  };
  const r = validateL9RedisAccelerationBinding(binding, dsReg);
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW),
    'A.51 Redis authority claim rejected');
}

// A.52 — Redis on non-cacheable surface rejected
{
  const binding: L9RedisAccelerationBinding = {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_EVIDENCE_STORE,
    cache_namespace: 'l9:ev',
    authoritative: false,
    invalidation_on_supersede: true,
    invalidation_on_repair: true,
    invalidation_on_replay: true,
    ttl_seconds: 60,
  };
  const r = validateL9RedisAccelerationBinding(binding, dsReg);
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW),
    'A.52 Redis on non-cacheable surface rejected');
}

// ═══════════════════════════════════════════════════════════════
// Band B — Historical surfaces
// ═══════════════════════════════════════════════════════════════
console.log('\n── Band B: Historical surfaces ──');

// B.1 — historical fact surfaces are ClickHouse + append-only
{
  const histSurfaces = dsReg.list().filter(l9IsHistoricalFactSurface);
  assert(histSurfaces.length === 9,
    'B.1 nine historical fact surfaces');
  assert(histSurfaces.every(s => s.authority_store === L5AuthorityStore.CLICKHOUSE),
    'B.2 all historical on ClickHouse');
  assert(histSurfaces.every(s => s.mutation_discipline === L9MutationDiscipline.APPEND_ONLY),
    'B.3 historical APPEND_ONLY');
}

// B.10 — clean LIVE_HISTORICAL_APPEND passes
{
  const r = validateL9HistoricalWrite({
    envelope: historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1),
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(r.ok, 'B.10 clean historical append passes');
}

// B.11 — destructive overwrite rejected
{
  const r = validateL9HistoricalWrite({
    envelope: historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1),
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: true,
  }, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE),
    'B.11 destructive overwrite rejected');
}

// B.12 — missing replay_hash rejected
{
  const env = historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1, {
    replay_hash: null,
  });
  const r = validateL9HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.HIST_REPLAY_IDENTITY_MISSING),
    'B.12 missing replay_hash rejected');
}

// B.13 — missing lineage_refs rejected
{
  const env = historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1, {
    lineage_refs: [],
  });
  const r = validateL9HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.HIST_LINEAGE_LINK_MISSING),
    'B.13 missing lineage rejected');
}

// B.14 — LIVE_CURRENT on historical rejected
{
  const env = historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1, {
    materialization_mode: L9MaterializationMode.LIVE_CURRENT,
  });
  const r = validateL9HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.HIST_MUTATES_CURRENT),
    'B.14 LIVE_CURRENT on historical rejected');
}

// B.15 — REPAIR_REBUILD requires correction semantics
{
  const env = historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1, {
    materialization_mode: L9MaterializationMode.REPAIR_REBUILD,
  });
  const r = validateL9HistoricalWrite({
    envelope: env,
    correction: { is_correction: true, parent_fact_id: null, reason: null, supersedes_replay_hash: null },
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING),
    'B.15 repair without correction semantics rejected');
}

// B.16 — REPAIR_REBUILD with full correction semantics passes
{
  const env = historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1, {
    materialization_mode: L9MaterializationMode.REPAIR_REBUILD,
  });
  const r = validateL9HistoricalWrite({
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
  const env = historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1, {
    materialization_mode: L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
  });
  const r = validateL9HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING),
    'B.17 late-data requires correction semantics');
}

// B.18 — non-historical surface rejected
{
  const env = historicalEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    serving_class: L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT,
  });
  const r = validateL9HistoricalWrite({
    envelope: env, correction: null, append_safe: true,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.HIST_MUTATES_CURRENT),
    'B.18 non-historical surface rejected');
}

// B.19 — not append_safe rejected
{
  const r = validateL9HistoricalWrite({
    envelope: historicalEnv(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1),
    correction: null,
    append_safe: false,
    destructive_overwrite_attempted: false,
  }, dsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE),
    'B.19 append_safe=false rejected');
}

// B.20 — all 9 historical surfaces accept LIVE_HISTORICAL_APPEND
{
  const histSurfaces = [
    L9DurableSurfaceId.TS_SEQUENCE_FACT_V1,
    L9DurableSurfaceId.TS_PHASE_PROGRESSION_V1,
    L9DurableSurfaceId.TS_SEQUENCE_CONFIDENCE_V1,
    L9DurableSurfaceId.TS_SEQUENCE_DECAY_V1,
    L9DurableSurfaceId.TS_SEQUENCE_RESTRICTION_V1,
    L9DurableSurfaceId.TS_SEQUENCE_CAUSAL_RESTRAINT_V1,
    L9DurableSurfaceId.TS_SEQUENCE_CHANGE_POINT_V1,
    L9DurableSurfaceId.TS_LEAD_LAG_FACT_V1,
    L9DurableSurfaceId.TS_POST_EVENT_WINDOW_V1,
  ];
  for (const s of histSurfaces) {
    const r = validateL9HistoricalWrite({
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
assert(ALL_L9_EVIDENCE_CLASSES.length === 8,
  'C.1 evidence classes (8)');
assert(ALL_L9_EVIDENCE_SUBJECT_KINDS.length === 7,
  'C.2 evidence subject kinds (7)');
for (const cls of ALL_L9_EVIDENCE_CLASSES) {
  assert(L9_EVIDENCE_PATH_PREFIX_BY_CLASS[cls] !== undefined,
    `C.3:${cls} path prefix declared`);
  assert(L9_EVIDENCE_SUBJECT_KIND_BY_CLASS[cls] !== undefined,
    `C.4:${cls} subject kind declared`);
}

// C.5 — deterministic path is reproducible
{
  const a = buildL9DeterministicEvidencePath({
    evidence_class: L9EvidenceClass.SEQUENCE_EVIDENCE_PACK,
    scope_type: 'ASSET', scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z', evidence_id: 'ev:1',
  });
  const b = buildL9DeterministicEvidencePath({
    evidence_class: L9EvidenceClass.SEQUENCE_EVIDENCE_PACK,
    scope_type: 'ASSET', scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z', evidence_id: 'ev:1',
  });
  assert(a === b, 'C.5 deterministic path reproducible');
  assert(a.startsWith('l9/evidence/sequence-pack/'),
    'C.6 path prefix correct');
}

// C.10 — clean pointer validates
{
  const ev = cleanEvidence();
  const r = validateL9EvidencePointer(ev);
  assert(r.ok, 'C.10 clean evidence pointer validates');
}

// C.11 — wrong subject kind rejected
{
  const ev = cleanEvidence('ev:wrong', {
    subject_kind: L9EvidenceSubjectKind.PHASE_STATE,
  });
  const r = validateL9EvidencePointer(ev);
  assert(hasCode(r.violations, L9PersistenceViolationCode.EVID_SUBJECT_KIND_MISMATCH),
    'C.11 wrong subject kind rejected');
}

// C.12 — missing manifest rejected
{
  const ev = cleanEvidence('ev:m', { manifest_id: '' });
  const r = validateL9EvidencePointer(ev);
  assert(hasCode(r.violations, L9PersistenceViolationCode.EVID_MANIFEST_LINK_MISSING),
    'C.12 missing manifest rejected');
}

// C.13 — missing archive_uri rejected
{
  const ev = cleanEvidence('ev:a', { archive_uri: '' });
  const r = validateL9EvidencePointer(ev);
  assert(hasCode(r.violations, L9PersistenceViolationCode.EVID_ARCHIVE_URI_MISSING),
    'C.13 missing archive_uri rejected');
}

// C.14 — missing checksum rejected
{
  const ev = cleanEvidence('ev:c', { checksum_sha256: '' });
  const r = validateL9EvidencePointer(ev);
  assert(hasCode(r.violations, L9PersistenceViolationCode.EVID_CHECKSUM_MISSING),
    'C.14 missing checksum rejected');
}

// C.15 — missing replay_ref rejected
{
  const ev = cleanEvidence('ev:r', { replay_ref: '' });
  const r = validateL9EvidencePointer(ev);
  assert(hasCode(r.violations, L9PersistenceViolationCode.EVID_REPLAY_REF_MISSING),
    'C.15 missing replay_ref rejected');
}

// C.16 — tampered deterministic_path rejected
{
  const ev = cleanEvidence('ev:p');
  const bad = { ...ev, deterministic_path: 'wrong/path' };
  const r = validateL9EvidencePointer(bad);
  assert(hasCode(r.violations, L9PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC),
    'C.16 tampered path rejected');
}

// C.17 — orphan pointer rejected
{
  const base = {
    ...cleanEvidence('ev:orph'),
    manifest_id: '',
    archive_uri: '',
    checksum_sha256: '',
    replay_ref: '',
  };
  const aligned = {
    ...base,
    deterministic_path: buildL9DeterministicEvidencePath({
      evidence_class: base.evidence_class,
      scope_type: base.scope_type,
      scope_id: base.scope_id,
      as_of: base.as_of,
      evidence_id: base.evidence_id,
    }),
  };
  const r = validateL9EvidencePointer(aligned);
  assert(hasCode(r.violations, L9PersistenceViolationCode.EVID_ORPHAN_BUNDLE),
    'C.17 orphan pointer rejected');
  assert(!l9EvidencePointerHasRequiredLinkage(aligned),
    'C.18 helper confirms orphan');
}

// C.20 — unknown evidence class rejected
{
  const ev = {
    ...cleanEvidence('ev:u'),
    evidence_class: 'UNKNOWN_CLASS' as L9EvidenceClass,
  };
  const r = validateL9EvidencePointer(ev);
  assert(hasCode(r.violations, L9PersistenceViolationCode.EVID_CLASS_UNREGISTERED),
    'C.20 unknown evidence class rejected');
}

// C.21 — all 8 evidence classes validate cleanly with matching kind
for (const cls of ALL_L9_EVIDENCE_CLASSES) {
  const kind = L9_EVIDENCE_SUBJECT_KIND_BY_CLASS[cls];
  const ev = cleanEvidence(`ev:${cls}`, {
    evidence_class: cls,
    subject_kind: kind,
  });
  const r = validateL9EvidencePointer(ev);
  assert(r.ok, `C.21:${cls} clean evidence validates`);
}

// ═══════════════════════════════════════════════════════════════
// Band D — Read surfaces & downstream consumption
// ═══════════════════════════════════════════════════════════════
console.log('\n── Band D: Read surfaces & downstream ──');

const rsReg = L9ReadSurfaceRegistry.default();

// D.1 — enum coverage
assert(ALL_L9_READ_SURFACE_IDS.length >= 12,
  'D.1 read surface ids ≥ 12');
assert(ALL_L9_READ_MODES.length === 6, 'D.2 six read modes');
assert(ALL_L9_CONSUMER_CLASSES.length === 7, 'D.3 seven consumer classes');
assert(ALL_L9_READ_GUARD_FLAGS.length === 7, 'D.4 seven guard flags');

// D.5 — registry loads all default surfaces
assert(rsReg.list().length === L9_DEFAULT_READ_SURFACES.length,
  'D.5 registry loads defaults');
assert(rsReg.list().every(s => s.raw_storage_access_banned === true),
  'D.6 all surfaces ban raw storage (INV-9.8-E)');

// D.7 — adapter / upward split
assert(L9_UPWARD_ENGINE_CONSUMERS.length === 4,
  'D.7 four upward engine consumers');
assert(L9_ADAPTER_ONLY_CONSUMERS.length === 3,
  'D.8 three adapter-only consumers');
assert(L9_ADAPTER_ONLY_CONSUMERS.includes(L9ConsumerClass.REPLAY_ADAPTER),
  'D.9 REPLAY_ADAPTER is adapter');
assert(l9ConsumerMayRebuildFromLowerLayers(L9ConsumerClass.REPLAY_ADAPTER),
  'D.10 REPLAY_ADAPTER may rebuild');
assert(!l9ConsumerMayRebuildFromLowerLayers(L9ConsumerClass.L10_HYPOTHESIS_ENGINE),
  'D.11 L10 may NOT rebuild');

// D.20 — clean current-snapshot request passes
{
  const r = validateL9ReadRequest(
    readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE),
    rsReg);
  assert(r.ok, 'D.20 clean current-snapshot read validates');
}

// D.21 — unregistered surface rejected
{
  const r = validateL9ReadRequest(
    readRequest('nope' as L9ReadSurfaceId), rsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.READ_SURFACE_UNREGISTERED),
    'D.21 unregistered surface rejected');
}

// D.22 — wrong mode rejected
{
  const r = validateL9ReadRequest(
    readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE, {
      read_mode: L9ReadMode.REPLAY_HISTORICAL,
    }), rsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE),
    'D.22 wrong read mode rejected');
}

// D.23 — raw bypass rejected
{
  const req = {
    ...readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE),
    raw_storage_path_attempted: true as unknown as false,
  };
  const r = validateL9ReadRequest(req, rsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.READ_RAW_STORAGE_BYPASS),
    'D.23 raw bypass rejected');
}

// D.24 — missing guard flag rejected
{
  const r = validateL9ReadRequest(
    readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE, {
      guard_flags: [],
    }), rsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.READ_GUARD_FLAG_MISSING),
    'D.24 missing guard flag rejected');
}

// D.25 — consumer not allowed rejected (we craft a surface that
// excludes some consumer — but default surfaces allow all upward +
// adapters. We craft by passing a bogus consumer to simulate.)
{
  const r = validateL9ReadRequest(
    readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE, {
      consumer_class: 'BOGUS' as L9ConsumerClass,
    }), rsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.READ_CONSUMER_NOT_ALLOWED),
    'D.25 unknown consumer rejected');
}

// D.26 — scope identity missing rejected
{
  const r = validateL9ReadRequest(
    readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE, {
      scope_type: '', scope_id: '',
    }), rsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.READ_SCOPE_IDENTITY_MISSING),
    'D.26 missing scope identity rejected');
}

// D.27 — window inverted rejected
{
  const r = validateL9ReadRequest(
    readRequest(L9ReadSurfaceId.SEQUENCE_HISTORY_BY_SCOPE_AND_WINDOW, {
      read_mode: L9ReadMode.LIVE_HISTORICAL,
      window_start: '2026-02-01T00:00:00Z',
      window_end: '2026-01-01T00:00:00Z',
    }), rsReg);
  assert(hasCode(r.violations, L9PersistenceViolationCode.READ_WINDOW_INVALID),
    'D.27 inverted window rejected');
}

// D.28 — replay mode on non-replay-capable surface rejected
{
  const r = validateL9ReadRequest(
    readRequest(L9ReadSurfaceId.CURRENT_PHASE_PROFILE_BY_SCOPE, {
      read_mode: L9ReadMode.REPLAY_HISTORICAL,
    }), rsReg);
  assert(hasCode(r.violations,
      L9PersistenceViolationCode.READ_REPLAY_MODE_ON_NON_REPLAY_SURFACE) ||
         hasCode(r.violations,
      L9PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE),
    'D.28 replay on non-replay surface rejected');
}

// D.40 — downstream consumption: clean upward read validates
{
  const req = readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE);
  const r = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L10_HYPOTHESIS_ENGINE,
    consumer_instance_id: 'l10:1',
    rebuilds_from_lower_layers: false,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(r.ok, 'D.40 clean downstream consumption passes');
}

// D.41 — upward engine rebuilds rejected
{
  const req = readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE, {
    consumer_class: L9ConsumerClass.L11_SCORING_ENGINE,
  });
  const r = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L11_SCORING_ENGINE,
    consumer_instance_id: 'l11:1',
    rebuilds_from_lower_layers: true,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS),
    'D.41 upward rebuild rejected');
}

// D.42 — adapter outside governed flow rejected
{
  const req = readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE, {
    consumer_class: L9ConsumerClass.REPLAY_ADAPTER,
  });
  const r = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.REPLAY_ADAPTER,
    consumer_instance_id: 'adapter:1',
    rebuilds_from_lower_layers: true,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.DOWNSTREAM_ADAPTER_OUTSIDE_GOVERNED_FLOW),
    'D.42 adapter outside governed flow rejected');
}

// D.43 — adapter inside governed flow passes
{
  const req = readRequest(L9ReadSurfaceId.SEQUENCE_HISTORY_BY_SCOPE_AND_WINDOW, {
    read_mode: L9ReadMode.REPLAY_HISTORICAL,
    consumer_class: L9ConsumerClass.REPLAY_ADAPTER,
  });
  const r = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.REPLAY_ADAPTER,
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
  const r = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L12_SCENARIO_ENGINE,
    consumer_instance_id: 'l12:1',
    rebuilds_from_lower_layers: false,
    read_requests: [],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE),
    'D.44 no-reads rejected');
}

// D.45 — restriction not consulted rejected
{
  const req = readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE, {
    consumer_class: L9ConsumerClass.L13_JUDGMENT_ENGINE,
  });
  const r = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L13_JUDGMENT_ENGINE,
    consumer_instance_id: 'l13:1',
    rebuilds_from_lower_layers: false,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: false,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION),
    'D.45 missing restriction consultation rejected');
}

// D.46 — read consumer mismatch rejected
{
  const req = readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE, {
    consumer_class: L9ConsumerClass.L10_HYPOTHESIS_ENGINE,
  });
  const r = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L11_SCORING_ENGINE,
    consumer_instance_id: 'l11:1',
    rebuilds_from_lower_layers: false,
    read_requests: [req],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  assert(hasCode(r.violations,
    L9PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE),
    'D.46 consumer/request class mismatch rejected');
}

// D.60 — read services wiring: current service delegates to backend
(async () => {
  const svc = new L9CurrentReadService({
    async readCurrent<T = unknown>() {
      return {
        read_surface_id: L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE,
        scope_type: 'ASSET', scope_id: 'BTC',
        as_of: '2026-01-01T00:00:00Z', compute_run_id: 'r:1',
        policy_version: POLICY, replay_hash: 'h:1',
        payload: { ok: true } as unknown as T,
      };
    },
  }, rsReg);
  const r = await svc.read(
    readRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE));
  assert(r.ok && r.snapshot !== null,
    'D.60 current read service returns snapshot');

  // historical
  const hs = new L9HistoricalReadService({
    async readHistorical<T = unknown>() {
      return [{
        fact_id: 'f:1', sequence_subject_id: 's:1',
        scope_type: 'ASSET', scope_id: 'BTC',
        as_of: '2026-01-01T00:00:00Z',
        read_mode: L9ReadMode.LIVE_HISTORICAL,
        policy_version: POLICY, replay_hash: 'h:1',
        payload: {} as unknown as T,
      }];
    },
  }, rsReg);
  const hr = await hs.read(readRequest(L9ReadSurfaceId.SEQUENCE_HISTORY_BY_SCOPE_AND_WINDOW, {
    read_mode: L9ReadMode.LIVE_HISTORICAL,
  }));
  assert(hr.ok && hr.rows.length === 1,
    'D.61 historical read service returns rows');

  // evidence
  const es = new L9EvidenceReadService({
    async readEvidenceBundle() { return [cleanEvidence('ev:svc:1')]; },
  }, rsReg);
  const er = await es.read(readRequest(L9ReadSurfaceId.SEQUENCE_EVIDENCE_BUNDLE_BY_SUBJECT, {
    read_mode: L9ReadMode.EVIDENCE_VIEW,
  }));
  assert(er.ok && er.pointers.length === 1,
    'D.62 evidence read service returns pointer');

  // lineage
  const ls = new L9RunLineageReadService({
    async readLineage() {
      return [{ lineage_id: 'lin:1', compute_run_id: 'r:1', policy_version: POLICY, replay_hash: 'h:1', parent_compute_run_id: null, corrected_compute_run_id: null, reason_codes: [], mode_at_emission: 'LIVE', archive_uri: null, manifest_ids: [] }];
    },
  }, rsReg);
  const lr = await ls.read(readRequest(L9ReadSurfaceId.SEQUENCE_LINEAGE_BY_RUN_ID, {
    read_mode: L9ReadMode.LINEAGE_VIEW,
  }));
  assert(lr.ok && lr.rows.length === 1,
    'D.63 lineage read service returns rows');

  // D.64 — lineage with missing replay_hash rejected
  const ls2 = new L9RunLineageReadService({
    async readLineage() {
      return [{ lineage_id: 'lin:2', compute_run_id: 'r:2', policy_version: POLICY, replay_hash: null, parent_compute_run_id: null, corrected_compute_run_id: null, reason_codes: [], mode_at_emission: 'LIVE', archive_uri: null, manifest_ids: [] }];
    },
  }, rsReg);
  const lr2 = await ls2.read(readRequest(L9ReadSurfaceId.SEQUENCE_LINEAGE_BY_RUN_ID, {
    read_mode: L9ReadMode.LINEAGE_VIEW,
  }));
  assert(hasCode(lr2.violations, L9PersistenceViolationCode.REPLAY_HASH_MISSING),
    'D.64 lineage missing replay_hash rejected');

  // D.65 — lineage repair without parent rejected
  const ls3 = new L9RunLineageReadService({
    async readLineage() {
      return [{ lineage_id: 'lin:3', compute_run_id: 'r:3', policy_version: POLICY, replay_hash: 'h:3', parent_compute_run_id: null, corrected_compute_run_id: 'r:2', reason_codes: ['REPAIR'], mode_at_emission: 'REPAIR', archive_uri: null, manifest_ids: [] }];
    },
  }, rsReg);
  const lr3 = await ls3.read(readRequest(L9ReadSurfaceId.SEQUENCE_LINEAGE_BY_RUN_ID, {
    read_mode: L9ReadMode.LINEAGE_VIEW,
  }));
  assert(hasCode(lr3.violations, L9PersistenceViolationCode.REPAIR_WITHOUT_PARENT_LINEAGE),
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
  const decision = evaluateL9Materialization({
    envelope: currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
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
  const decision = evaluateL9Materialization({
    envelope: currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: false,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L9PersistenceViolationCode.MAT_READINESS_BLOCKED),
    'E.2 blocked readiness rejected');
}

// E.3 — contract invalid rejected
{
  const decision = evaluateL9Materialization({
    envelope: currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
    readiness: {
      contract_valid: false, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L9PersistenceViolationCode.MAT_CONTRACT_INVALID),
    'E.3 contract invalid rejected');
}

// E.4 — evidence missing rejected
{
  const decision = evaluateL9Materialization({
    envelope: currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: false, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L9PersistenceViolationCode.MAT_EVIDENCE_REQUIRED_MISSING),
    'E.4 evidence missing rejected');
}

// E.5 — lineage incomplete rejected
{
  const decision = evaluateL9Materialization({
    envelope: currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: false,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L9PersistenceViolationCode.MAT_LINEAGE_INCOMPLETE),
    'E.5 lineage incomplete rejected');
}

// E.6 — replay identity missing rejected
{
  const decision = evaluateL9Materialization({
    envelope: currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: false,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L9PersistenceViolationCode.MAT_REPLAY_IDENTITY_MISSING),
    'E.6 replay identity missing rejected');
}

// E.7 — append-pretends-current rejected
{
  const env = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    materialization_mode: L9MaterializationMode.LIVE_HISTORICAL_APPEND,
  });
  const decision = evaluateL9Materialization({
    envelope: env,
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: true,
  }, dsReg);
  assert(hasCode(decision.violations, L9PersistenceViolationCode.MAT_APPEND_PRETENDS_CURRENT),
    'E.7 LIVE_HISTORICAL_APPEND on current surface rejected');
}

// E.8 — repair-pretends-live rejected
{
  const env = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    materialization_mode: L9MaterializationMode.REPAIR_REBUILD,
  });
  const decision = evaluateL9Materialization({
    envelope: env,
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  assert(hasCode(decision.violations, L9PersistenceViolationCode.MAT_REPAIR_PRETENDS_LIVE),
    'E.8 repair pretending live rejected');
}

// E.20 — audit aggregator determinism
{
  const env = currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY, {
    materialization_mode: L9MaterializationMode.LIVE_HISTORICAL_APPEND,
  });
  const decision = evaluateL9Materialization({
    envelope: env,
    readiness: {
      contract_valid: true, readiness_not_blocked: true,
      evidence_present: true, lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, dsReg);
  const a1 = buildL9PersistenceAudit(decision.violations);
  const a2 = buildL9PersistenceAudit(decision.violations);
  assert(a1.total === a2.total, 'E.20 audit total deterministic');
  assert(JSON.stringify(a1.by_code) === JSON.stringify(a2.by_code),
    'E.21 audit by_code deterministic');
  assert(JSON.stringify(a1.by_tier) === JSON.stringify(a2.by_tier),
    'E.22 audit by_tier deterministic');
  assert(a1.highest_severity === a2.highest_severity,
    'E.23 audit severity deterministic');
  assert(hasL9PersistenceBlockingViolations(a1),
    'E.24 blocking violations detected');
}

// E.25 — severity classification
assert(classifyL9PersistenceAuditSeverity(
  L9PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5) ===
  L9PersistenceAuditSeverity.CRITICAL,
  'E.25 PERSIST_NOT_ROUTED_THROUGH_L5 is CRITICAL');
assert(classifyL9PersistenceAuditSeverity(
  L9PersistenceViolationCode.READ_WINDOW_INVALID) ===
  L9PersistenceAuditSeverity.WARNING,
  'E.26 READ_WINDOW_INVALID is WARNING');
assert(classifyL9PersistenceAuditSeverity(
  L9PersistenceViolationCode.PERSIST_IDENTITY_FIELD_MISSING) ===
  L9PersistenceAuditSeverity.ERROR,
  'E.27 identity field missing defaults to ERROR');

// E.28 — every violation code classifies to a tier
for (const code of ALL_L9_PERSISTENCE_VIOLATION_CODES) {
  const tier = l9PersistenceViolationTier(code);
  assert(ALL_L9_PERSISTENCE_VIOLATION_TIERS.includes(tier),
    `E.28:${code} tier valid`);
}

// E.30 — invariants
const invs = runAllL9_8Invariants();
assert(invs.length === 7, 'E.30 seven invariants');
for (const r of invs) {
  assert(r.holds, `E.30:${r.id} ${r.name} holds`);
}

// E.40 — determinism: identical envelope → identical audit
{
  const v1 = validateL9PersistenceEnvelope(
    currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY), dsReg);
  const v2 = validateL9PersistenceEnvelope(
    currentEnv(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY), dsReg);
  assert(v1.ok === v2.ok, 'E.40 clean validation deterministic');
  assert(v1.violations.length === v2.violations.length,
    'E.41 clean validation length identical');
}

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────');
console.log(`L9.8 Persistence Certification Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailed assertions:');
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log('All L9.8 persistence-and-serving certification bands PASSED');
process.exit(0);
}
