/**
 * L10.8 — Persistence & Serving Invariants
 *
 * §10.8.12 — Seven machine-enforced invariants covering the L10.8
 * lawbook. Every invariant returns a `L10_8InvariantResult` with a
 * boolean `holds` plus an evidence string that replays cleanly under
 * the certification suite.
 *
 *   INV-10.8-A : L5-routed writes — every L10 write routes through
 *                L5; no direct-store write is legal.
 *   INV-10.8-B : Current authority on Postgres — Redis may accelerate
 *                but never defines authority.
 *   INV-10.8-C : Historical append-safety — historical writes are
 *                append-only, replay-identity-bearing, correction-
 *                aware, and lineage-linked.
 *   INV-10.8-D : Evidence integrity — evidence is archive-linked,
 *                manifest-linked, subject-kind-consistent, checksum-
 *                bearing, replay-safe, and written at a deterministic
 *                path.
 *   INV-10.8-E : Governed read surfaces — raw-store reads are illegal
 *                as official L10 truth.
 *   INV-10.8-F : No-rebuild — upward engines consume L10 surfaces and
 *                may not rebuild hypotheses from L6/L7/L8/L9.
 *   INV-10.8-G : Mode-safe replay/repair — replay and repair views
 *                remain mode-safe, lineage-safe, and semantically
 *                distinct from untouched live current truth.
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';

import {
  L10DurableSurfaceId,
  L10HypothesisServingClass,
  L10MaterializationMode,
  L10MutationDiscipline,
  L10PersistenceClass,
  L10PersistenceEnvelope,
  l10IsCurrentAuthoritySurface,
  l10IsHistoricalFactSurface,
} from '../contracts/l10-persistence-surface';
import {
  L10CurrentAuthorityAspect,
  L10_CURRENT_AUTHORITY_LEGAL_MODES,
  L10_CURRENT_AUTHORITY_SURFACE_BY_ASPECT,
} from '../contracts/l10-current-authority';
import {
  L10EvidenceClass,
  L10EvidencePointer,
  L10EvidenceSubjectKind,
  buildL10DeterministicEvidencePath,
} from '../contracts/l10-evidence-storage';
import {
  L10ConsumerClass,
  L10ReadGuardFlag,
  L10ReadMode,
  L10ReadRequest,
  L10ReadSurfaceId,
} from '../contracts/l10-read-surface';

import { L10DurableSurfaceRegistry } from '../registry/l10-durable-surface.registry';
import { L10ReadSurfaceRegistry } from '../registry/l10-read-surface.registry';

import {
  evaluateL10Materialization,
} from '../persistence/l10-materialization-policy';
import {
  validateL10PersistenceEnvelope,
} from '../persistence/l10-persistence-policy.validator';
import {
  validateL10CurrentAuthorityWrite,
  validateL10RedisAccelerationBinding,
} from '../persistence/l10-current-authority.validator';
import {
  validateL10HistoricalWrite,
} from '../persistence/l10-historical-surface.validator';
import {
  validateL10EvidencePointer,
} from '../persistence/l10-evidence-storage.validator';
import {
  L10PersistenceViolationCode,
} from '../persistence/l10-persistence-violation-codes';

import {
  validateL10ReadRequest,
} from '../read/l10-read-surface.validator';
import {
  validateL10DownstreamConsumption,
} from '../read/l10-downstream-consumption.validator';

import {
  buildL10PersistenceAudit,
} from '../constitution/l10-persistence-audit';

export interface L10_8InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

const POLICY = 'l10.8@1.0.0';

// ────────────────────────────────────────────────────────────────
// Shared deterministic fixtures
// ────────────────────────────────────────────────────────────────

function cleanCurrentEnvelope(
  surface: L10DurableSurfaceId,
  id = 'env:current:1',
): L10PersistenceEnvelope {
  return {
    envelope_id: id,
    durable_surface_id: surface,
    serving_class: servingClassFor(surface),
    hypothesis_subject_id: 'h:inv:clean',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-01-01T00:00:00Z',
    materialization_mode: L10MaterializationMode.LIVE_CURRENT,
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
  surface: L10DurableSurfaceId,
  mode: L10MaterializationMode = L10MaterializationMode.LIVE_HISTORICAL_APPEND,
): L10PersistenceEnvelope {
  return {
    envelope_id: `env:hist:${mode}`,
    durable_surface_id: surface,
    serving_class: L10HypothesisServingClass.HISTORICAL_HYPOTHESIS_FACT,
    hypothesis_subject_id: 'h:inv:hist',
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
  evidence_pointer_id = 'ev:clean:1',
): L10EvidencePointer {
  const base = {
    evidence_pointer_id,
    evidence_class: L10EvidenceClass.HYPOTHESIS_EVIDENCE_PACK,
    subject_kind: L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
    subject_id: 'h:inv:ev',
    hypothesis_subject_id: 'h:inv:ev',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    compute_run_id: 'run:ev:1',
    archive_uri: 's3://evidence/path',
    manifest_ref: 'manifest:1',
    checksum:
      '0000000000000000000000000000000000000000000000000000000000000000',
    content_bytes: 128,
    replay_ref: 'h:ev:1',
    policy_version: POLICY,
    created_at: '2026-01-01T00:00:00Z',
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

function cleanReadRequest(
  surface: L10ReadSurfaceId,
  overrides: Partial<L10ReadRequest> = {},
): L10ReadRequest {
  const defaults: L10ReadRequest = {
    request_id: 'req:inv:1',
    read_surface_id: surface,
    read_mode: L10ReadMode.LIVE_CURRENT,
    consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
    declared_guard_flags: [
      L10ReadGuardFlag.REQUIRES_RAW_STORAGE_BYPASS_BAN,
      L10ReadGuardFlag.REQUIRES_NO_REBUILD_FROM_LOWER_LAYERS,
      L10ReadGuardFlag.REQUIRES_REPLAY_HASH_ON_RESULT,
      L10ReadGuardFlag.REQUIRES_LINEAGE_LINKAGE_ON_RESULT,
      L10ReadGuardFlag.REQUIRES_EVIDENCE_POINTER_LINKAGE,
      L10ReadGuardFlag.REQUIRES_REPAIR_LINEAGE,
    ],
    hypothesis_subject_id: 'h:inv:read',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    window_start: null,
    window_end: null,
    as_of: '2026-01-01T00:00:00Z',
    compute_run_id: 'run:read:1',
    evidence_subject_id: 'h:inv:read',
    bypasses_read_surface: false,
    rebuilds_from_lower_layers: false,
    declared_at: '2026-01-01T00:00:00Z',
  };
  return { ...defaults, ...overrides };
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

// ────────────────────────────────────────────────────────────────
// INV-10.8-A — L5-routed writes
// ────────────────────────────────────────────────────────────────
export function checkINV_108_A(): L10_8InvariantResult {
  const registry = L10DurableSurfaceRegistry.default();

  const cleanEnv = cleanCurrentEnvelope(
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY);
  const clean = validateL10PersistenceEnvelope(cleanEnv, registry);
  const cleanOk = clean.ok;

  const badEnv = {
    ...cleanEnv,
    routes_through_l5: false,
  } as unknown as L10PersistenceEnvelope;
  const bad = validateL10PersistenceEnvelope(badEnv, registry);
  const badRejected = bad.violations.some(
    (v) => v.code === L10PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5,
  );

  const allRouted = registry.list().every((s) => s.routes_through_l5 === true);

  const holds = cleanOk && badRejected && allRouted;
  return {
    id: 'INV-10.8-A',
    name: 'L5-routed writes (no direct-store bypass)',
    holds,
    evidence:
      `cleanOk=${cleanOk} badRejected=${badRejected} ` +
      `allSurfacesRouted=${allRouted} ` +
      `surfaces=${registry.list().length}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-10.8-B — Current authority on Postgres only
// ────────────────────────────────────────────────────────────────
export function checkINV_108_B(): L10_8InvariantResult {
  const registry = L10DurableSurfaceRegistry.default();

  const currentSurfaces = registry.list().filter(l10IsCurrentAuthoritySurface);
  const allPostgres = currentSurfaces.every(
    (s) => s.authority_store === L5AuthorityStore.POSTGRES,
  );

  const allSupersede = currentSurfaces.every(
    (s) => s.mutation_discipline === L10MutationDiscipline.SUPERSEDE_WITH_LINKAGE,
  );

  const redisBinding = {
    durable_surface_id: L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY,
    cache_namespace: 'l10:current:hyp',
    authoritative: true as unknown as false,
    invalidation_on_supersede: true as const,
    invalidation_on_repair: true as const,
    invalidation_on_replay: true as const,
    ttl_seconds: 60,
  };
  const r = validateL10RedisAccelerationBinding(redisBinding, registry);
  const redisRejected = r.violations.some(
    (v) => v.code === L10PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
  );

  const badEnv = {
    ...cleanCurrentEnvelope(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    materialization_mode: L10MaterializationMode.REPLAY_HISTORICAL,
  };
  const w = validateL10CurrentAuthorityWrite({
    aspect: L10CurrentAuthorityAspect.HYPOTHESIS_STATE,
    envelope: badEnv,
    supersession: null,
    registry,
  });
  const replayAsLiveRejected = w.violations.some(
    (v) =>
      v.code === L10PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE,
  );

  const expectedModes = new Set(L10_CURRENT_AUTHORITY_LEGAL_MODES);
  const modeSetOk =
    expectedModes.size === 3 &&
    expectedModes.has(L10MaterializationMode.LIVE_CURRENT) &&
    expectedModes.has(L10MaterializationMode.REPAIR_REBUILD) &&
    expectedModes.has(L10MaterializationMode.LATE_DATA_REMATERIALIZATION);

  const holds =
    allPostgres && allSupersede && redisRejected && replayAsLiveRejected &&
    modeSetOk;
  return {
    id: 'INV-10.8-B',
    name: 'Current authority is Postgres-only',
    holds,
    evidence:
      `currentSurfaces=${currentSurfaces.length} allPostgres=${allPostgres} ` +
      `allSupersedeLinkage=${allSupersede} redisRejected=${redisRejected} ` +
      `replayAsLiveRejected=${replayAsLiveRejected} modeSetOk=${modeSetOk}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-10.8-C — Historical append-safety
// ────────────────────────────────────────────────────────────────
export function checkINV_108_C(): L10_8InvariantResult {
  const registry = L10DurableSurfaceRegistry.default();

  const histSurfaces = registry.list().filter(l10IsHistoricalFactSurface);
  const allAppendOnly = histSurfaces.every(
    (s) => s.mutation_discipline === L10MutationDiscipline.APPEND_ONLY,
  );

  const cleanR = validateL10HistoricalWrite({
    envelope: cleanHistoricalEnvelope(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1),
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, registry);

  const overR = validateL10HistoricalWrite({
    envelope: cleanHistoricalEnvelope(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1),
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: true,
  }, registry);
  const overRejected = overR.violations.some(
    (v) => v.code === L10PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE,
  );

  const repR = validateL10HistoricalWrite({
    envelope: cleanHistoricalEnvelope(
      L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1,
      L10MaterializationMode.REPAIR_REBUILD,
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
    (v) =>
      v.code === L10PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING,
  );

  const missingReplay = {
    ...cleanHistoricalEnvelope(L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1),
    replay_hash: null,
  };
  const mR = validateL10HistoricalWrite({
    envelope: missingReplay,
    correction: null,
    append_safe: true,
    destructive_overwrite_attempted: false,
  }, registry);
  const missingRejected = mR.violations.some(
    (v) => v.code === L10PersistenceViolationCode.HIST_REPLAY_IDENTITY_MISSING,
  );

  const holds =
    allAppendOnly && cleanR.ok && overRejected && repRejected && missingRejected;
  return {
    id: 'INV-10.8-C',
    name: 'Historical append-safety + correction-aware',
    holds,
    evidence:
      `histSurfaces=${histSurfaces.length} allAppendOnly=${allAppendOnly} ` +
      `cleanOk=${cleanR.ok} overRejected=${overRejected} ` +
      `repairRejected=${repRejected} missingRejected=${missingRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-10.8-D — Evidence integrity
// ────────────────────────────────────────────────────────────────
export function checkINV_108_D(): L10_8InvariantResult {
  const clean = cleanEvidencePointer();
  const cleanR = validateL10EvidencePointer(clean);

  const wrongKind = {
    ...clean,
    subject_kind: L10EvidenceSubjectKind.CONTRADICTION_SET,
  };
  const wrongR = validateL10EvidencePointer(wrongKind);
  const wrongRejected = wrongR.violations.some(
    (v) => v.code === L10PersistenceViolationCode.EVID_SUBJECT_KIND_MISMATCH,
  );

  const brokenPath = { ...clean, deterministic_path: 'not/the/right/path' };
  const bpR = validateL10EvidencePointer(brokenPath);
  const bpRejected = bpR.violations.some(
    (v) => v.code === L10PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC,
  );

  const orphan = {
    ...clean,
    evidence_pointer_id: 'ev:orphan',
    manifest_ref: '',
    archive_uri: '',
    checksum: '',
    replay_ref: '',
  };
  const orphanAligned = {
    ...orphan,
    deterministic_path: buildL10DeterministicEvidencePath({
      evidence_class: orphan.evidence_class,
      subject_kind: orphan.subject_kind,
      subject_id: orphan.subject_id,
      hypothesis_subject_id: orphan.hypothesis_subject_id,
      scope_type: orphan.scope_type,
      scope_id: orphan.scope_id,
      compute_run_id: orphan.compute_run_id,
    }),
  };
  const oR = validateL10EvidencePointer(orphanAligned);
  const orphanRejected = oR.violations.some(
    (v) => v.code === L10PersistenceViolationCode.EVID_ORPHAN_BUNDLE,
  );

  const holds = cleanR.ok && wrongRejected && bpRejected && orphanRejected;
  return {
    id: 'INV-10.8-D',
    name: 'Evidence integrity (archive/manifest/path/checksum)',
    holds,
    evidence:
      `cleanOk=${cleanR.ok} wrongKindRejected=${wrongRejected} ` +
      `badPathRejected=${bpRejected} orphanRejected=${orphanRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-10.8-E — Governed read surfaces
// ────────────────────────────────────────────────────────────────
export function checkINV_108_E(): L10_8InvariantResult {
  const registry = L10ReadSurfaceRegistry.default();

  const cleanR = validateL10ReadRequest(
    cleanReadRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE),
    registry,
  );

  const rawBypass = {
    ...cleanReadRequest(L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE),
    bypasses_read_surface: true as unknown as false,
  };
  const rawR = validateL10ReadRequest(rawBypass, registry);
  const rawRejected = rawR.violations.some(
    (v) => v.code === L10PersistenceViolationCode.READ_RAW_STORAGE_BYPASS,
  );

  const badMode = cleanReadRequest(
    L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE,
    { read_mode: L10ReadMode.REPLAY_HISTORICAL },
  );
  const bmR = validateL10ReadRequest(badMode, registry);
  const bmRejected = bmR.violations.some(
    (v) => v.code === L10PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
  );

  const unregistered = cleanReadRequest(
    'l10.read.nonexistent' as L10ReadSurfaceId,
  );
  const unR = validateL10ReadRequest(unregistered, registry);
  const unRejected = unR.violations.some(
    (v) => v.code === L10PersistenceViolationCode.READ_SURFACE_UNREGISTERED,
  );

  const allBanned = registry.list().every(
    (s) => s.bans_raw_storage_access === true,
  );

  const holds = cleanR.ok && rawRejected && bmRejected && unRejected && allBanned;
  return {
    id: 'INV-10.8-E',
    name: 'Read surfaces governed (no raw-store serving)',
    holds,
    evidence:
      `cleanOk=${cleanR.ok} rawRejected=${rawRejected} ` +
      `badModeRejected=${bmRejected} unregisteredRejected=${unRejected} ` +
      `allSurfacesBanRaw=${allBanned}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-10.8-F — No-rebuild from lower layers
// ────────────────────────────────────────────────────────────────
export function checkINV_108_F(): L10_8InvariantResult {
  const cleanReq = cleanReadRequest(
    L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE,
  );

  const cleanR = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
    consumer_instance_id: 'l11:1',
    rebuilds_from_lower_layers: false,
    read_requests: [cleanReq],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });

  const rebuildR = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
    consumer_instance_id: 'l11:2',
    rebuilds_from_lower_layers: true,
    read_requests: [{
      ...cleanReq,
      consumer_class: L10ConsumerClass.L11_SCORING_ENGINE,
    }],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  const rebuildRejected = rebuildR.violations.some(
    (v) =>
      v.code ===
      L10PersistenceViolationCode.DOWNSTREAM_REBUILD_FROM_LOWER_LAYERS,
  );

  const adapterOutside = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.REPLAY_ADAPTER,
    consumer_instance_id: 'adapter:1',
    rebuilds_from_lower_layers: true,
    read_requests: [{
      ...cleanReq,
      consumer_class: L10ConsumerClass.REPLAY_ADAPTER,
    }],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  const adapterRejected = adapterOutside.violations.some(
    (v) =>
      v.code ===
      L10PersistenceViolationCode.DOWNSTREAM_ADAPTER_OUTSIDE_GOVERNED_FLOW,
  );

  const bypass = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L12_SCENARIO_ENGINE,
    consumer_instance_id: 'l12:1',
    rebuilds_from_lower_layers: false,
    read_requests: [],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: true,
  });
  const bypassRejected = bypass.violations.some(
    (v) =>
      v.code === L10PersistenceViolationCode.DOWNSTREAM_CONSUMER_BYPASSED_SURFACE,
  );

  const noRestriction = validateL10DownstreamConsumption({
    consumer_class: L10ConsumerClass.L13_JUDGMENT_ENGINE,
    consumer_instance_id: 'l13:1',
    rebuilds_from_lower_layers: false,
    read_requests: [{
      ...cleanReq,
      consumer_class: L10ConsumerClass.L13_JUDGMENT_ENGINE,
    }],
    inside_governed_replay_flow: false,
    consulted_restriction_profile: false,
  });
  const noRestrictionRejected = noRestriction.violations.some(
    (v) => v.code === L10PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION,
  );

  const holds =
    cleanR.ok && rebuildRejected && adapterRejected && bypassRejected &&
    noRestrictionRejected;
  return {
    id: 'INV-10.8-F',
    name: 'No-rebuild law for upward engines',
    holds,
    evidence:
      `cleanOk=${cleanR.ok} rebuildRejected=${rebuildRejected} ` +
      `adapterRejected=${adapterRejected} bypassRejected=${bypassRejected} ` +
      `noRestrictionRejected=${noRestrictionRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-10.8-G — Mode-safe replay/repair + deterministic audit
// ────────────────────────────────────────────────────────────────
export function checkINV_108_G(): L10_8InvariantResult {
  const registry = L10DurableSurfaceRegistry.default();

  const replayAsLiveBlocked = Object.values(L10CurrentAuthorityAspect).every(
    (aspect) => {
      const surface = L10_CURRENT_AUTHORITY_SURFACE_BY_ASPECT[aspect];
      const env = {
        ...cleanCurrentEnvelope(surface),
        materialization_mode: L10MaterializationMode.REPLAY_HISTORICAL,
      };
      const r = validateL10CurrentAuthorityWrite({
        aspect,
        envelope: env,
        supersession: null,
        registry,
      });
      return r.violations.some(
        (v) =>
          v.code ===
          L10PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE,
      );
    },
  );

  // Materialization policy blocks LIVE_HISTORICAL_APPEND on current authority.
  const env = {
    ...cleanCurrentEnvelope(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    materialization_mode: L10MaterializationMode.LIVE_HISTORICAL_APPEND,
  };
  const matDecision = evaluateL10Materialization({
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
    (v) => v.code === L10PersistenceViolationCode.MAT_APPEND_PRETENDS_CURRENT,
  );

  // Materialization policy blocks REPAIR_REBUILD on current authority
  // when no supersession linkage is recorded.
  const env2 = {
    ...cleanCurrentEnvelope(L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY),
    materialization_mode: L10MaterializationMode.REPAIR_REBUILD,
  };
  const matDecision2 = evaluateL10Materialization({
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
    (v) => v.code === L10PersistenceViolationCode.MAT_REPAIR_PRETENDS_LIVE,
  );

  // Audit aggregator must be deterministic across identical inputs.
  const violationList = [
    ...matDecision.violations,
    ...matDecision2.violations,
  ];
  const a = buildL10PersistenceAudit(violationList);
  const b = buildL10PersistenceAudit(violationList);
  const auditDeterministic =
    a.total === b.total &&
    a.highest_severity === b.highest_severity &&
    JSON.stringify(a.by_code) === JSON.stringify(b.by_code) &&
    JSON.stringify(a.by_tier) === JSON.stringify(b.by_tier);

  // Read surface REPLAY mode on non-replay-capable surface must reject.
  const readR = validateL10ReadRequest(
    cleanReadRequest(
      L10ReadSurfaceId.CURRENT_HYPOTHESIS_SNAPSHOT_BY_SCOPE,
      { read_mode: L10ReadMode.REPLAY_HISTORICAL },
    ),
    L10ReadSurfaceRegistry.default(),
  );
  const replayOnNonReplayRejected = readR.violations.some(
    (v) =>
      v.code ===
        L10PersistenceViolationCode.READ_REPLAY_MODE_ON_NON_REPLAY_SURFACE ||
      v.code === L10PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
  );

  const holds =
    replayAsLiveBlocked && appendPretendRejected && repairPretendRejected &&
    auditDeterministic && replayOnNonReplayRejected;
  return {
    id: 'INV-10.8-G',
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
export function runAllL10_8Invariants(): readonly L10_8InvariantResult[] {
  return [
    checkINV_108_A(),
    checkINV_108_B(),
    checkINV_108_C(),
    checkINV_108_D(),
    checkINV_108_E(),
    checkINV_108_F(),
    checkINV_108_G(),
  ];
}
