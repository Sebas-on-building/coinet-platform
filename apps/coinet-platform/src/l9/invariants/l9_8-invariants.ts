/**
 * L9.8 — Persistence & Serving Invariants
 *
 * §9.8.12 — Seven machine-enforced invariants covering the L9.8
 * lawbook. Every invariant returns a `L9_8InvariantResult` with a
 * boolean `holds` plus an evidence string that replays cleanly under
 * the certification suite.
 *
 *   INV-9.8-A : L5-routed writes — every L9 write routes through L5;
 *               no direct-store write is legal.
 *   INV-9.8-B : Current authority on Postgres — Redis may accelerate
 *               but never defines authority.
 *   INV-9.8-C : Historical append-safety — historical writes are
 *               append-only, replay-identity-bearing, correction-
 *               aware, and lineage-linked.
 *   INV-9.8-D : Evidence integrity — evidence is archive-linked,
 *               manifest-linked, subject-kind-consistent, checksum-
 *               bearing, replay-safe, and written at a deterministic
 *               path.
 *   INV-9.8-E : Governed read surfaces — raw-store reads are illegal
 *               as official L9 truth.
 *   INV-9.8-F : No-rebuild — upward engines must consume L9 surfaces
 *               and may not rebuild sequence from L6/L7/L8.
 *   INV-9.8-G : Mode-safe replay/repair — replay and repair views
 *               remain mode-safe, lineage-safe, and semantically
 *               distinct from untouched live current truth.
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';

import {
  L9DurableSurfaceId,
  L9MaterializationMode,
  L9MutationDiscipline,
  L9PersistenceClass,
  L9PersistenceEnvelope,
  L9SequenceServingClass,
  l9IsCurrentAuthoritySurface,
  l9IsHistoricalFactSurface,
} from '../contracts/l9-persistence-surface';
import {
  L9CurrentAuthorityAspect,
  L9_CURRENT_AUTHORITY_LEGAL_MODES,
  L9_CURRENT_AUTHORITY_SURFACE_BY_ASPECT,
} from '../contracts/l9-current-authority';
import {
  L9EvidenceClass,
  L9EvidencePointer,
  L9EvidenceSubjectKind,
  buildL9DeterministicEvidencePath,
} from '../contracts/l9-evidence-storage';
import {
  L9ConsumerClass,
  L9ReadGuardFlag,
  L9ReadMode,
  L9ReadRequest,
  L9ReadSurfaceId,
} from '../contracts/l9-read-surface';

import { L9DurableSurfaceRegistry } from '../registry/l9-durable-surface.registry';
import { L9ReadSurfaceRegistry } from '../registry/l9-read-surface.registry';

import {
  evaluateL9Materialization,
} from '../persistence/l9-materialization-policy';
import {
  validateL9PersistenceEnvelope,
} from '../persistence/l9-persistence-policy.validator';
import {
  validateL9CurrentAuthorityWrite,
  validateL9RedisAccelerationBinding,
} from '../persistence/l9-current-authority.validator';
import {
  validateL9HistoricalWrite,
} from '../persistence/l9-historical-surface.validator';
import {
  validateL9EvidencePointer,
} from '../persistence/l9-evidence-storage.validator';
import {
  L9PersistenceViolationCode,
} from '../persistence/l9-persistence-violation-codes';

import {
  validateL9ReadRequest,
} from '../read/l9-read-surface.validator';
import {
  validateL9DownstreamConsumption,
} from '../read/l9-downstream-consumption.validator';

import {
  buildL9PersistenceAudit,
} from '../constitution/l9-persistence-audit';

export interface L9_8InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

const POLICY = 'l9.8@1.0.0';

// ────────────────────────────────────────────────────────────────
// Shared deterministic fixtures
// ────────────────────────────────────────────────────────────────

function cleanCurrentEnvelope(
  surface: L9DurableSurfaceId,
  id = 'env:current:1',
): L9PersistenceEnvelope {
  return {
    envelope_id: id,
    durable_surface_id: surface,
    serving_class: servingClassFor(surface),
    sequence_subject_id: 's:inv:clean',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    materialization_mode: L9MaterializationMode.LIVE_CURRENT,
    compute_run_id: 'run:1',
    supersedes_envelope_id: null,
    supersession_reason: null,
    lineage_refs: ['lref:1'],
    evidence_refs: ['ev:1'],
    replay_hash: 'h:clean:1',
    policy_version: POLICY,
    routes_through_l5: true,
    payload: { ok: true },
  };
}

function cleanHistoricalEnvelope(
  surface: L9DurableSurfaceId,
  mode: L9MaterializationMode = L9MaterializationMode.LIVE_HISTORICAL_APPEND,
): L9PersistenceEnvelope {
  return {
    envelope_id: `env:hist:${mode}`,
    durable_surface_id: surface,
    serving_class: L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT,
    sequence_subject_id: 's:inv:hist',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    materialization_mode: mode,
    compute_run_id: 'run:hist:1',
    supersedes_envelope_id: null,
    supersession_reason: null,
    lineage_refs: ['lref:hist:1'],
    evidence_refs: ['ev:hist:1'],
    replay_hash: 'h:hist:1',
    policy_version: POLICY,
    routes_through_l5: true,
    payload: { fact_id: 'f:1' },
  };
}

function cleanEvidencePointer(
  evidence_id = 'ev:clean:1',
): L9EvidencePointer {
  const base = {
    evidence_id,
    evidence_class: L9EvidenceClass.SEQUENCE_EVIDENCE_PACK,
    subject_kind: L9EvidenceSubjectKind.SEQUENCE_SUBJECT,
    sequence_subject_id: 's:inv:ev',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    manifest_id: 'manifest:1',
    archive_uri: 's3://evidence/path',
    checksum_sha256:
      '0000000000000000000000000000000000000000000000000000000000000000',
    replay_ref: 'h:ev:1',
    policy_version: POLICY,
    lineage_refs: ['lref:ev:1'],
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

function cleanReadRequest(
  surface: L9ReadSurfaceId,
  overrides: Partial<L9ReadRequest> = {},
): L9ReadRequest {
  const defaults: L9ReadRequest = {
    read_surface_id: surface,
    read_mode: L9ReadMode.LIVE_CURRENT,
    consumer_class: L9ConsumerClass.L10_HYPOTHESIS_ENGINE,
    consumer_instance_id: 'l10:inst:1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    window_start: null,
    window_end: null,
    guard_flags: [
      L9ReadGuardFlag.ACKNOWLEDGES_NO_REBUILD,
      L9ReadGuardFlag.ACKNOWLEDGES_RESTRICTION_POSTURE,
      L9ReadGuardFlag.ACKNOWLEDGES_CAUSAL_RESTRAINT,
      L9ReadGuardFlag.ACKNOWLEDGES_REPLAY_SEMANTICS,
      L9ReadGuardFlag.ACKNOWLEDGES_REPAIR_SEMANTICS,
      L9ReadGuardFlag.ACKNOWLEDGES_EVIDENCE_BINDING,
      L9ReadGuardFlag.ACKNOWLEDGES_LINEAGE_VIEW,
    ],
    raw_storage_path_attempted: false,
  };
  return { ...defaults, ...overrides };
}

function servingClassFor(
  surface: L9DurableSurfaceId,
): L9SequenceServingClass {
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

// ────────────────────────────────────────────────────────────────
// INV-9.8-A — L5-routed writes
// ────────────────────────────────────────────────────────────────
export function checkINV_98_A(): L9_8InvariantResult {
  const registry = L9DurableSurfaceRegistry.default();

  const cleanEnv = cleanCurrentEnvelope(
    L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY);
  const clean = validateL9PersistenceEnvelope(cleanEnv, registry);
  const cleanOk = clean.ok;

  // Tampered: routes_through_l5=false. We cast through unknown so the
  // readonly literal flag can be perturbed for the invariant check.
  const badEnv = {
    ...cleanEnv,
    routes_through_l5: false,
  } as unknown as L9PersistenceEnvelope;
  const bad = validateL9PersistenceEnvelope(badEnv, registry);
  const badRejected = bad.violations.some(
    (v) => v.code === L9PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5,
  );

  // Every registered surface must declare routes_through_l5 = true.
  const allRouted = registry.list().every((s) => s.routes_through_l5 === true);

  const holds = cleanOk && badRejected && allRouted;
  return {
    id: 'INV-9.8-A',
    name: 'L5-routed writes (no direct-store bypass)',
    holds,
    evidence:
      `cleanOk=${cleanOk} badRejected=${badRejected} ` +
      `allSurfacesRouted=${allRouted} ` +
      `surfaces=${registry.list().length}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.8-B — Current authority on Postgres only
// ────────────────────────────────────────────────────────────────
export function checkINV_98_B(): L9_8InvariantResult {
  const registry = L9DurableSurfaceRegistry.default();

  // All current-authority surfaces must be Postgres.
  const currentSurfaces = registry.list().filter(l9IsCurrentAuthoritySurface);
  const allPostgres = currentSurfaces.every(
    (s) => s.authority_store === L5AuthorityStore.POSTGRES,
  );

  // Redis acceleration binding must be rejected when it claims authority.
  const redisBinding = {
    durable_surface_id: L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY,
    cache_namespace: 'l9:current:seq',
    authoritative: true as unknown as false,
    invalidation_on_supersede: true as const,
    invalidation_on_repair: true as const,
    invalidation_on_replay: true as const,
    ttl_seconds: 60,
  };
  const r = validateL9RedisAccelerationBinding(redisBinding, registry);
  const redisRejected = r.violations.some(
    (v) => v.code === L9PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
  );

  // Current-authority write with REPLAY_HISTORICAL mode is illegal.
  const badEnv = {
    ...cleanCurrentEnvelope(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
    materialization_mode: L9MaterializationMode.REPLAY_HISTORICAL,
  };
  const w = validateL9CurrentAuthorityWrite({
    aspect: L9CurrentAuthorityAspect.SEQUENCE_STATE,
    envelope: badEnv,
    supersession: null,
    registry,
  });
  const replayAsLiveRejected = w.violations.some(
    (v) => v.code === L9PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE,
  );

  // Legal mode set covers exactly { LIVE_CURRENT, REPAIR_REBUILD, LATE_DATA }.
  const expectedModes = new Set(L9_CURRENT_AUTHORITY_LEGAL_MODES);
  const modeSetOk =
    expectedModes.size === 3 &&
    expectedModes.has(L9MaterializationMode.LIVE_CURRENT) &&
    expectedModes.has(L9MaterializationMode.REPAIR_REBUILD) &&
    expectedModes.has(L9MaterializationMode.LATE_DATA_REMATERIALIZATION);

  const holds = allPostgres && redisRejected && replayAsLiveRejected && modeSetOk;
  return {
    id: 'INV-9.8-B',
    name: 'Current authority is Postgres-only',
    holds,
    evidence:
      `currentSurfaces=${currentSurfaces.length} allPostgres=${allPostgres} ` +
      `redisRejected=${redisRejected} ` +
      `replayAsLiveRejected=${replayAsLiveRejected} modeSetOk=${modeSetOk}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.8-C — Historical append-safety
// ────────────────────────────────────────────────────────────────
export function checkINV_98_C(): L9_8InvariantResult {
  const registry = L9DurableSurfaceRegistry.default();

  // Every historical fact surface must be APPEND_ONLY.
  const histSurfaces = registry.list().filter(l9IsHistoricalFactSurface);
  const allAppendOnly = histSurfaces.every(
    (s) => s.mutation_discipline === L9MutationDiscipline.APPEND_ONLY,
  );

  // Clean append-safe write is accepted.
  const cleanR = validateL9HistoricalWrite({
    envelope: cleanHistoricalEnvelope(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1),
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, registry);

  // Destructive overwrite rejected.
  const overR = validateL9HistoricalWrite({
    envelope: cleanHistoricalEnvelope(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1),
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: true,
  }, registry);
  const overRejected = overR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE,
  );

  // Repair correction without parent+reason is rejected.
  const repR = validateL9HistoricalWrite({
    envelope: cleanHistoricalEnvelope(
      L9DurableSurfaceId.TS_SEQUENCE_FACT_V1,
      L9MaterializationMode.REPAIR_REBUILD,
    ),
    correction: {
      is_correction: true,
      parent_fact_id: null,
      reason: null,
      supersedes_replay_hash: null,
    },
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, registry);
  const repRejected = repR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING,
  );

  // Missing replay identity is rejected.
  const missingReplay = {
    ...cleanHistoricalEnvelope(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1),
    replay_hash: null,
  };
  const mR = validateL9HistoricalWrite({
    envelope: missingReplay,
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, registry);
  const missingRejected = mR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.HIST_REPLAY_IDENTITY_MISSING,
  );

  const holds =
    allAppendOnly && cleanR.ok && overRejected && repRejected && missingRejected;
  return {
    id: 'INV-9.8-C',
    name: 'Historical append-safety + correction-aware',
    holds,
    evidence:
      `histSurfaces=${histSurfaces.length} allAppendOnly=${allAppendOnly} ` +
      `cleanOk=${cleanR.ok} overRejected=${overRejected} ` +
      `repairRejected=${repRejected} missingRejected=${missingRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.8-D — Evidence integrity
// ────────────────────────────────────────────────────────────────
export function checkINV_98_D(): L9_8InvariantResult {
  const clean = cleanEvidencePointer();
  const cleanR = validateL9EvidencePointer(clean);

  const wrongKind = { ...clean, subject_kind: L9EvidenceSubjectKind.PHASE_STATE };
  const wrongR = validateL9EvidencePointer(wrongKind);
  const wrongRejected = wrongR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.EVID_SUBJECT_KIND_MISMATCH,
  );

  const brokenPath = { ...clean, deterministic_path: 'not/the/right/path' };
  const bpR = validateL9EvidencePointer(brokenPath);
  const bpRejected = bpR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC,
  );

  const orphan = {
    ...clean,
    evidence_id: 'ev:orphan',
    manifest_id: '',
    archive_uri: '',
    checksum_sha256: '',
    replay_ref: '',
  };
  const orphanAligned = {
    ...orphan,
    deterministic_path: buildL9DeterministicEvidencePath({
      evidence_class: orphan.evidence_class,
      scope_type: orphan.scope_type,
      scope_id: orphan.scope_id,
      as_of: orphan.as_of,
      evidence_id: orphan.evidence_id,
    }),
  };
  const oR = validateL9EvidencePointer(orphanAligned);
  const orphanRejected = oR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.EVID_ORPHAN_BUNDLE,
  );

  const holds = cleanR.ok && wrongRejected && bpRejected && orphanRejected;
  return {
    id: 'INV-9.8-D',
    name: 'Evidence integrity (archive/manifest/path/checksum)',
    holds,
    evidence:
      `cleanOk=${cleanR.ok} wrongKindRejected=${wrongRejected} ` +
      `badPathRejected=${bpRejected} orphanRejected=${orphanRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.8-E — Governed read surfaces
// ────────────────────────────────────────────────────────────────
export function checkINV_98_E(): L9_8InvariantResult {
  const registry = L9ReadSurfaceRegistry.default();

  const cleanR = validateL9ReadRequest(
    cleanReadRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE),
    registry,
  );

  const rawBypass = {
    ...cleanReadRequest(L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE),
    raw_storage_path_attempted: true as unknown as false,
  };
  const rawR = validateL9ReadRequest(rawBypass, registry);
  const rawRejected = rawR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.READ_RAW_STORAGE_BYPASS,
  );

  const badMode = cleanReadRequest(
    L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE,
    { read_mode: L9ReadMode.REPLAY_HISTORICAL },
  );
  const bmR = validateL9ReadRequest(badMode, registry);
  const bmRejected = bmR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
  );

  const unregistered = cleanReadRequest(
    'l9.read.nonexistent' as L9ReadSurfaceId,
  );
  const unR = validateL9ReadRequest(unregistered, registry);
  const unRejected = unR.violations.some(
    (v) => v.code === L9PersistenceViolationCode.READ_SURFACE_UNREGISTERED,
  );

  // All read surfaces must declare raw_storage_access_banned=true.
  const allBanned = registry.list().every(
    (s) => s.raw_storage_access_banned === true,
  );

  const holds = cleanR.ok && rawRejected && bmRejected && unRejected && allBanned;
  return {
    id: 'INV-9.8-E',
    name: 'Read surfaces governed (no raw-store serving)',
    holds,
    evidence:
      `cleanOk=${cleanR.ok} rawRejected=${rawRejected} ` +
      `badModeRejected=${bmRejected} unregisteredRejected=${unRejected} ` +
      `allSurfacesBanRaw=${allBanned}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.8-F — No-rebuild from lower layers
// ────────────────────────────────────────────────────────────────
export function checkINV_98_F(): L9_8InvariantResult {
  const cleanReq = cleanReadRequest(
    L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE,
  );

  const cleanR = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L10_HYPOTHESIS_ENGINE,
    consumer_instance_id: 'l10:1',
    rebuilds_from_lower_layers: false,
    read_requests: [cleanReq],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });

  const rebuildR = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L11_SCORING_ENGINE,
    consumer_instance_id: 'l11:1',
    rebuilds_from_lower_layers: true,
    read_requests: [{
      ...cleanReq,
      consumer_class: L9ConsumerClass.L11_SCORING_ENGINE,
    }],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  const rebuildRejected = rebuildR.violations.some(
    (v) =>
      v.code === L9PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
  );

  const adapterOutside = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.REPLAY_ADAPTER,
    consumer_instance_id: 'adapter:1',
    rebuilds_from_lower_layers: true,
    read_requests: [{
      ...cleanReq,
      consumer_class: L9ConsumerClass.REPLAY_ADAPTER,
    }],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  const adapterRejected = adapterOutside.violations.some(
    (v) =>
      v.code ===
      L9PersistenceViolationCode.DOWNSTREAM_ADAPTER_OUTSIDE_GOVERNED_FLOW,
  );

  const bypass = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L12_SCENARIO_ENGINE,
    consumer_instance_id: 'l12:1',
    rebuilds_from_lower_layers: false,
    read_requests: [],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  const bypassRejected = bypass.violations.some(
    (v) =>
      v.code === L9PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE,
  );

  const noRestriction = validateL9DownstreamConsumption({
    consumer_class: L9ConsumerClass.L13_JUDGMENT_ENGINE,
    consumer_instance_id: 'l13:1',
    rebuilds_from_lower_layers: false,
    read_requests: [{
      ...cleanReq,
      consumer_class: L9ConsumerClass.L13_JUDGMENT_ENGINE,
    }],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: false,
  });
  const noRestrictionRejected = noRestriction.violations.some(
    (v) => v.code === L9PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION,
  );

  const holds =
    cleanR.ok && rebuildRejected && adapterRejected && bypassRejected &&
    noRestrictionRejected;
  return {
    id: 'INV-9.8-F',
    name: 'No-rebuild law for upward engines',
    holds,
    evidence:
      `cleanOk=${cleanR.ok} rebuildRejected=${rebuildRejected} ` +
      `adapterRejected=${adapterRejected} bypassRejected=${bypassRejected} ` +
      `noRestrictionRejected=${noRestrictionRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.8-G — Mode-safe replay/repair + deterministic audit
// ────────────────────────────────────────────────────────────────
export function checkINV_98_G(): L9_8InvariantResult {
  const registry = L9DurableSurfaceRegistry.default();

  // Every CURRENT_AUTHORITY_SURFACE must reject REPLAY_HISTORICAL mode.
  const replayAsLiveBlocked = Object.values(L9CurrentAuthorityAspect).every(
    (aspect) => {
      const surface = L9_CURRENT_AUTHORITY_SURFACE_BY_ASPECT[aspect];
      const env = {
        ...cleanCurrentEnvelope(surface),
        materialization_mode: L9MaterializationMode.REPLAY_HISTORICAL,
      };
      const r = validateL9CurrentAuthorityWrite({
        aspect,
        envelope: env,
        supersession: null,
        registry,
      });
      return r.violations.some(
        (v) =>
          v.code === L9PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE,
      );
    },
  );

  // Materialization policy blocks LIVE_HISTORICAL_APPEND on current authority.
  const env = {
    ...cleanCurrentEnvelope(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
    materialization_mode: L9MaterializationMode.LIVE_HISTORICAL_APPEND,
  };
  const matDecision = evaluateL9Materialization({
    envelope: env,
    readiness: {
      contract_valid: true,
      readiness_not_blocked: true,
      evidence_present: true,
      lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, registry);
  const appendPretendRejected = matDecision.violations.some(
    (v) => v.code === L9PersistenceViolationCode.MAT_APPEND_PRETENDS_CURRENT,
  );

  // Materialization policy blocks REPAIR_REBUILD on current authority
  // when no supersession linkage is recorded.
  const env2 = {
    ...cleanCurrentEnvelope(L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY),
    materialization_mode: L9MaterializationMode.REPAIR_REBUILD,
  };
  const matDecision2 = evaluateL9Materialization({
    envelope: env2,
    readiness: {
      contract_valid: true,
      readiness_not_blocked: true,
      evidence_present: true,
      lineage_complete: true,
      replay_identity_present: true,
    },
    supersession_linkage_recorded: false,
  }, registry);
  const repairPretendRejected = matDecision2.violations.some(
    (v) => v.code === L9PersistenceViolationCode.MAT_REPAIR_PRETENDS_LIVE,
  );

  // Audit aggregator must be deterministic across identical inputs.
  const violationList = [
    ...matDecision.violations,
    ...matDecision2.violations,
  ];
  const a = buildL9PersistenceAudit(violationList);
  const b = buildL9PersistenceAudit(violationList);
  const auditDeterministic =
    a.total === b.total &&
    a.highest_severity === b.highest_severity &&
    JSON.stringify(a.by_code) === JSON.stringify(b.by_code) &&
    JSON.stringify(a.by_tier) === JSON.stringify(b.by_tier);

  // Read surface REPLAY mode on non-replay-capable surface must reject.
  const readR = validateL9ReadRequest(
    cleanReadRequest(
      L9ReadSurfaceId.CURRENT_SEQUENCE_SNAPSHOT_BY_SCOPE,
      { read_mode: L9ReadMode.REPLAY_HISTORICAL },
    ),
    L9ReadSurfaceRegistry.default(),
  );
  const replayOnNonReplayRejected = readR.violations.some(
    (v) =>
      v.code ===
      L9PersistenceViolationCode.READ_REPLAY_MODE_ON_NON_REPLAY_SURFACE ||
      v.code === L9PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
  );

  const holds =
    replayAsLiveBlocked && appendPretendRejected && repairPretendRejected &&
    auditDeterministic && replayOnNonReplayRejected;
  return {
    id: 'INV-9.8-G',
    name: 'Mode-safe replay/repair + deterministic audit',
    holds,
    evidence:
      `replayAsLiveBlocked=${replayAsLiveBlocked} ` +
      `appendPretendRejected=${appendPretendRejected} ` +
      `repairPretendRejected=${repairPretendRejected} ` +
      `auditDeterministic=${auditDeterministic} ` +
      `replayOnNonReplayRejected=${replayOnNonReplayRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// Aggregate runner
// ────────────────────────────────────────────────────────────────
export function runAllL9_8Invariants(): readonly L9_8InvariantResult[] {
  return [
    checkINV_98_A(),
    checkINV_98_B(),
    checkINV_98_C(),
    checkINV_98_D(),
    checkINV_98_E(),
    checkINV_98_F(),
    checkINV_98_G(),
  ];
}
