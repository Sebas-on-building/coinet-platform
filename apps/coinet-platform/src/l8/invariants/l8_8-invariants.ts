/**
 * L8.8 — Persistence-and-Serving Invariants
 *
 * §8.8.10.1 — INV-8.8-A through INV-8.8-G as executable functions:
 *
 *   INV-8.8-A : Every L8 write passes through L5-adapted persistence
 *               envelopes only; direct-store bypass is illegal.
 *   INV-8.8-B : Current regime, transition, confidence, and multiplier
 *               authority live in Postgres only; shadow-authority
 *               attempts are rejected.
 *   INV-8.8-C : Historical regime surfaces are append-safe,
 *               replay-identity-bearing, and correction-aware.
 *   INV-8.8-D : Evidence bundles are archive-linked, manifest-linked,
 *               checksum-bearing, and deterministic-path compliant.
 *   INV-8.8-E : Read surfaces are governed; raw-store reads are
 *               blocked; modes and consumers are enforced.
 *   INV-8.8-F : Later layers consume L8 through read surfaces only
 *               and may not rebuild live regime from L6/L7.
 *   INV-8.8-G : Replay and repair preserve regime meaning or mark
 *               legal divergence; repair carries parent + reason.
 */

import {
  L8AuthorityStore,
  L8DurableSurfaceId,
  L8MaterializationMode,
  L8MutationDiscipline,
  L8PersistenceClass,
  L8PersistenceEnvelope,
} from '../contracts/l8-persistence-surface';
import {
  L8CurrentAuthorityClass,
  L8HistoricalFactBase,
} from '../contracts/l8-current-authority';
import {
  L8EvidenceClass,
  L8EvidencePointer,
  L8EvidenceSubjectKind,
  L8_EVIDENCE_CLASS_SUBJECT_KIND,
  evidencePathFor,
} from '../contracts/l8-evidence-storage';
import {
  L8ConsumerClass, L8ReadMode, L8ReadRequest, L8ReadSurfaceId,
} from '../contracts/l8-read-surface';
import {
  getDefaultL8DurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import {
  L8PersistencePolicyValidator,
} from '../persistence/l8-persistence-policy.validator';
import {
  L8CurrentStateAuthorityValidator,
} from '../persistence/l8-current-authority.validator';
import {
  L8HistoricalSurfaceValidator,
} from '../persistence/l8-historical-surface.validator';
import {
  L8EvidenceStorageValidator, buildL8EvidencePointer,
} from '../persistence/l8-evidence-storage.validator';
import { L8ReadSurfaceValidator } from '../read/l8-read-surface.validator';
import {
  L8DownstreamConsumptionValidator,
} from '../read/l8-downstream-consumption.validator';
import { L8PersistenceViolationCode }
  from '../persistence/l8-persistence-violation-codes';

// ── Shared result type ─────────────────────────────────────────────────

export interface L8_8InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── Helpers: build a green envelope / fact / pointer / request ─────────

export function buildGreenL8CurrentRegimeEnvelope():
  L8PersistenceEnvelope {
  return {
    envelope_id: 'penv:subj.M.RISK_ON.BTC:run.1:l8.current_regime_registry',
    surface_id: L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
    persistence_class: L8PersistenceClass.CURRENT_REGIME,
    materialization_mode: L8MaterializationMode.LIVE_CURRENT,
    authority_store: L8AuthorityStore.POSTGRES,
    mutation_discipline: L8MutationDiscipline.CURRENT_SUPERSEDED,
    regime_subject_id: 'subj.MACRO.RISK_ON.BTC-USD.h4',
    scope_type: 'asset',
    scope_id: 'BTC-USD',
    regime_family: 'MACRO',
    regime_result_id: 'res.MACRO.RISK_ON.BTC-USD.h4.20260101',
    transition_profile_id: null,
    confidence_assessment_id: null,
    multiplier_profile_id: null,
    reliance_profile_id: null,
    as_of: '2026-01-01T00:00:00Z',
    effective_at: '2026-01-01T00:00:00Z',
    compute_run_id: 'run.1',
    policy_version: 'l8-policy-v1',
    template_id: 'tpl.MACRO.RISK_ON@1.0.0',
    replay_generation_ref: null,
    replay_hash: 'hash.regime.current.1.abcd',
    superseded_prior_ref: null,
    correction_parent_ref: null,
    correction_reason: null,
    evidence_pointer_refs: ['ev.1'],
    lineage_refs: { trace_id: 'trace.1', manifest_id: 'man.1' },
    payload_schema: 'l8.current_regime.v1',
    payload_hash: 'hash.payload.1',
  };
}

export function buildGreenL8HistoricalRegimeEnvelope():
  L8PersistenceEnvelope {
  return {
    ...buildGreenL8CurrentRegimeEnvelope(),
    envelope_id: 'penv:subj.M.RISK_ON.BTC:run.1:l8.ts_regime_fact_v1',
    surface_id: L8DurableSurfaceId.HISTORICAL_REGIME_FACTS,
    persistence_class: L8PersistenceClass.HISTORICAL_REGIME,
    materialization_mode: L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    authority_store: L8AuthorityStore.CLICKHOUSE,
    mutation_discipline: L8MutationDiscipline.IMMUTABLE_APPEND,
    payload_schema: 'l8.ts_regime_fact_v1',
  };
}

export function buildGreenL8HistoricalFact(): L8HistoricalFactBase {
  return {
    fact_id: 'fact.1',
    regime_subject_id: 'subj.MACRO.RISK_ON.BTC-USD.h4',
    scope_type: 'asset' as unknown as L8HistoricalFactBase['scope_type'],
    scope_id: 'BTC-USD',
    regime_family:
      'MACRO' as unknown as L8HistoricalFactBase['regime_family'],
    as_of: '2026-01-01T00:00:00Z',
    effective_at: '2026-01-01T00:00:00Z',
    compute_run_id: 'run.1',
    replay_generation_ref: null,
    materialization_mode: L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    policy_version: 'l8-policy-v1',
    template_id: 'tpl.MACRO.RISK_ON@1.0.0',
    lineage_refs: { trace_id: 'trace.1', manifest_id: 'man.1' },
    evidence_pack_ref: 'ev.1',
    input_snapshot_ref: 'ev.input.1',
    replay_hash: 'hash.regime.hist.1.abcd',
    correction_parent_ref: null,
    correction_reason: null,
  };
}

export function buildGreenL8EvidencePointer(): L8EvidencePointer {
  return buildL8EvidencePointer({
    evidence_id: 'ev.1',
    evidence_class: L8EvidenceClass.REGIME_EVIDENCE_PACK,
    subject_ref: 'res.MACRO.RISK_ON.BTC-USD.h4.20260101',
    compute_run_id: 'run.1',
    checksum: 'sha256.abcd1234',
    manifest_id: 'man.1',
    trace_id: 'trace.1',
    schema_version: 'v1',
    payload_byte_length: 512,
  });
}

export function buildGreenL8ReadRequest(
  surface: L8ReadSurfaceId, mode: L8ReadMode,
  consumer: L8ConsumerClass = L8ConsumerClass.SCENARIO_WEIGHTER,
): L8ReadRequest {
  const requiresScope = surface !== L8ReadSurfaceId.REGIME_LINEAGE_BY_RUN
    && surface !== L8ReadSurfaceId.REPLAY_VS_LIVE_BY_SUBJECT
    && surface !== L8ReadSurfaceId.REPAIR_LINEAGE_BY_SUBJECT;
  return {
    surface_id: surface, mode,
    consumer_class: consumer,
    consumer_service: 'test.l88',
    regime_subject_id: 'subj.MACRO.RISK_ON.BTC-USD.h4',
    scope_type: requiresScope ? 'asset' : null,
    scope_id: requiresScope ? 'BTC-USD' : null,
    regime_family: 'MACRO',
    window_from_iso: '2025-01-01T00:00:00Z',
    window_to_iso: '2026-12-31T00:00:00Z',
    compute_run_id: 'run.1',
    replay_generation_ref: null,
    as_of_iso: null,
    trace_id: 'trace.1',
    claims_live_rebuild_from_l6_l7: false,
    claims_raw_storage_access: false,
    claims_redis_authoritative_read: false,
  };
}

// ── INV-8.8-A — L5-only writes; direct-store bypass illegal ────────────

export function checkINV_88_A(): L8_8InvariantResult {
  const v = new L8PersistencePolicyValidator();

  // green envelope
  const greenRes = v.validate(
    buildGreenL8CurrentRegimeEnvelope(),
    { source: 'test.a', bypasses_l5: false },
  );

  // bypass flag set → rejected
  const bypassRes = v.validate(
    buildGreenL8CurrentRegimeEnvelope(),
    { source: 'test.a', bypasses_l5: true },
  );
  const bypassRej = !bypassRes.ok &&
    bypassRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.L5_BYPASS_ATTEMPT);

  // direct store target → rejected
  const directRes = v.validate(
    buildGreenL8CurrentRegimeEnvelope(),
    { source: 'test.a', direct_store_target: L8AuthorityStore.POSTGRES },
  );
  const directRej = !directRes.ok &&
    directRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.DIRECT_STORE_BYPASS);

  // missing manifest → L5 bypass
  const envNoL5 = {
    ...buildGreenL8CurrentRegimeEnvelope(),
    lineage_refs: { trace_id: '', manifest_id: '' },
  };
  const noL5Res = v.validate(envNoL5, { source: 'test.a' });
  const noL5Rej = !noL5Res.ok &&
    noL5Res.violations.some(x =>
      x.code === L8PersistenceViolationCode.L5_BYPASS_ATTEMPT);

  const holds = greenRes.ok && bypassRej && directRej && noL5Rej;
  return {
    id: 'INV-8.8-A',
    name: 'All L8 writes route through L5; direct-store bypass illegal',
    holds,
    evidence: `green=${greenRes.ok} bypass_rej=${bypassRej} direct_rej=${directRej} no_l5_rej=${noL5Rej}`,
  };
}

// ── INV-8.8-B — Postgres-only current authority ────────────────────────

export function checkINV_88_B(): L8_8InvariantResult {
  const v = new L8CurrentStateAuthorityValidator();

  const env = buildGreenL8CurrentRegimeEnvelope();
  const greenRes = v.validate(env, {
    authority_class: L8CurrentAuthorityClass.REGIME,
    source: 'test.b', prior_state_exists: false,
  });

  // Redis-as-authority → rejected
  const redisRes = v.validate(env, {
    authority_class: L8CurrentAuthorityClass.REGIME,
    source: 'test.b', prior_state_exists: false,
    redis_as_authority: true,
  });
  const redisRej = !redisRes.ok &&
    redisRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT);

  // OBJECT_STORE authority on current class → rejected
  const osEnv = { ...env, authority_store: L8AuthorityStore.OBJECT_STORE };
  const osRes = v.validate(osEnv, {
    authority_class: L8CurrentAuthorityClass.REGIME,
    source: 'test.b', prior_state_exists: false,
  });
  const osRej = !osRes.ok &&
    osRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.SHADOW_AUTHORITY_DETECTED);

  // supersession required but missing
  const superRes = v.validate(env, {
    authority_class: L8CurrentAuthorityClass.REGIME,
    source: 'test.b', prior_state_exists: true,
  });
  const superRej = !superRes.ok &&
    superRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.SUPERSEDED_PRIOR_REF_MISSING);

  const holds = greenRes.ok && redisRej && osRej && superRej;
  return {
    id: 'INV-8.8-B',
    name: 'Current authority: Postgres only; no shadow authority',
    holds,
    evidence: `green=${greenRes.ok} redis_rej=${redisRej} object_rej=${osRej} super_rej=${superRej}`,
  };
}

// ── INV-8.8-C — Historical append-safe, replay-aware ───────────────────

export function checkINV_88_C(): L8_8InvariantResult {
  const v = new L8HistoricalSurfaceValidator();
  const env = buildGreenL8HistoricalRegimeEnvelope();
  const fact = buildGreenL8HistoricalFact();

  const greenRes = v.validate(env, fact, {
    source: 'test.c', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });

  const destrRes = v.validate(env, fact, {
    source: 'test.c', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: true,
  });
  const destrRej = !destrRes.ok &&
    destrRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE);

  const noReplayFact = { ...fact, replay_hash: '' };
  const noReplayRes = v.validate(env, noReplayFact, {
    source: 'test.c', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  const noReplayRej = !noReplayRes.ok &&
    noReplayRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY);

  const badCorrection = {
    ...fact, correction_parent_ref: null,
    correction_reason: 'invented',
  };
  const badCorrRes = v.validate(env, badCorrection, {
    source: 'test.c', prior_fact_with_same_id: false,
    mutates_current: false, destructive_overwrite: false,
  });
  const badCorrRej = !badCorrRes.ok &&
    badCorrRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT);

  const mutatesCurrentRes = v.validate(env, fact, {
    source: 'test.c', prior_fact_with_same_id: false,
    mutates_current: true, destructive_overwrite: false,
  });
  const mutatesCurrentRej = !mutatesCurrentRes.ok &&
    mutatesCurrentRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY);

  const holds = greenRes.ok && destrRej && noReplayRej &&
    badCorrRej && mutatesCurrentRej;
  return {
    id: 'INV-8.8-C',
    name: 'Historical surfaces are append-safe, replay-identity-bearing, correction-aware',
    holds,
    evidence: `green=${greenRes.ok} destr_rej=${destrRej} noReplay_rej=${noReplayRej} badCorr_rej=${badCorrRej} mutCurrent_rej=${mutatesCurrentRej}`,
  };
}

// ── INV-8.8-D — evidence archive-linked, manifest-linked, deterministic

export function checkINV_88_D(): L8_8InvariantResult {
  const v = new L8EvidenceStorageValidator();
  const p = buildGreenL8EvidencePointer();
  const ctx = {
    expected_subject_ref: p.subject_ref,
    expected_subject_kind: p.subject_kind,
    expected_compute_run_id: p.compute_run_id,
    replay_required: false,
  };

  const greenRes = v.validate(p, ctx);

  const noUri = { ...p, archive_uri: '' };
  const noUriRes = v.validate(noUri, ctx);
  const noUriRej = !noUriRes.ok &&
    noUriRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING);

  const noChecksum = { ...p, checksum: '' };
  const noSumRes = v.validate(noChecksum, ctx);
  const noSumRej = !noSumRes.ok &&
    noSumRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.EVIDENCE_CHECKSUM_MISSING);

  const wrongSubject = {
    ...p,
    subject_kind: L8EvidenceSubjectKind.REGIME_RUN,
  };
  const wrongSubRes = v.validate(wrongSubject, ctx);
  const wrongSubRej = !wrongSubRes.ok &&
    wrongSubRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.EVIDENCE_SUBJECT_KIND_MISMATCH);

  // Non-deterministic archive URI
  const customPath = {
    ...p, archive_uri: 's3://custom-bucket/random/path.json',
  };
  const pathRes = v.validate(customPath, ctx);
  const pathRej = !pathRes.ok &&
    pathRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.EVIDENCE_PATH_NON_DETERMINISTIC);

  // Orphan evidence: mismatched compute_run_id
  const orphan = { ...p, compute_run_id: 'run.different' };
  const orphanRes = v.validate(orphan, ctx);
  const orphanRej = !orphanRes.ok &&
    orphanRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.ORPHAN_EVIDENCE);

  // Deterministic path equals expected path
  const expected = evidencePathFor(
    p.evidence_class, p.subject_ref, p.compute_run_id, p.checksum,
  );
  const pathMatches = p.archive_uri.endsWith(expected);

  const holds = greenRes.ok && noUriRej && noSumRej && wrongSubRej &&
    pathRej && orphanRej && pathMatches;
  return {
    id: 'INV-8.8-D',
    name: 'Evidence: archive-linked, manifest-linked, deterministic path, no orphans',
    holds,
    evidence: `green=${greenRes.ok} noUri_rej=${noUriRej} noSum_rej=${noSumRej} wrongSub_rej=${wrongSubRej} path_rej=${pathRej} orphan_rej=${orphanRej} pathMatch=${pathMatches}`,
  };
}

// ── INV-8.8-E — governed read surfaces (no raw-store reads) ────────────

export function checkINV_88_E(): L8_8InvariantResult {
  const v = new L8ReadSurfaceValidator();

  const greenReq = buildGreenL8ReadRequest(
    L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE, L8ReadMode.LIVE_CURRENT);
  const greenRes = v.validate(greenReq);

  const rawReq = {
    ...greenReq, claims_raw_storage_access: true,
  };
  const rawRes = v.validate(rawReq);
  const rawRej = !rawRes.ok &&
    rawRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT);

  const redisReq = {
    ...greenReq, claims_redis_authoritative_read: true,
  };
  const redisRes = v.validate(redisReq);
  const redisRej = !redisRes.ok &&
    redisRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE);

  const badModeReq = buildGreenL8ReadRequest(
    L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE,
    L8ReadMode.LIVE_HISTORICAL);
  const badModeRes = v.validate(badModeReq);
  const badModeRej = !badModeRes.ok &&
    badModeRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE ||
      x.code === L8PersistenceViolationCode.HISTORICAL_FROM_CURRENT_GUESS);

  const noScopeReq = {
    ...greenReq, scope_type: null, scope_id: null,
  };
  const noScopeRes = v.validate(noScopeReq);
  const noScopeRej = !noScopeRes.ok &&
    noScopeRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.READ_SCOPE_REQUIRED_BUT_MISSING);

  const badConsumerReq = buildGreenL8ReadRequest(
    L8ReadSurfaceId.REGIME_EVIDENCE_BY_SUBJECT,
    L8ReadMode.EVIDENCE_VIEW,
    L8ConsumerClass.DETERMINISTIC_SCORER,
  );
  const badConsRes = v.validate(badConsumerReq);
  const badConsRej = !badConsRes.ok &&
    badConsRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED);

  const holds = greenRes.ok && rawRej && redisRej && badModeRej &&
    noScopeRej && badConsRej;
  return {
    id: 'INV-8.8-E',
    name: 'Read surfaces governed; no raw-store / redis / mode / consumer drift',
    holds,
    evidence: `green=${greenRes.ok} raw_rej=${rawRej} redis_rej=${redisRej} mode_rej=${badModeRej} scope_rej=${noScopeRej} cons_rej=${badConsRej}`,
  };
}

// ── INV-8.8-F — later layers consume through read surfaces only ────────

export function checkINV_88_F(): L8_8InvariantResult {
  const v = new L8DownstreamConsumptionValidator();

  const goodReq = buildGreenL8ReadRequest(
    L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE, L8ReadMode.LIVE_CURRENT,
    L8ConsumerClass.SCENARIO_WEIGHTER);
  const greenRes = v.validate({
    consumer_class: L8ConsumerClass.SCENARIO_WEIGHTER,
    consumer_service: 'scoring',
    read_request: goodReq,
    will_rebuild_regime_from_l6_l7: false,
    will_rebuild_transition_from_l6_l7: false,
    will_rebuild_multiplier_from_l6_l7: false,
    accesses_raw_archive_path: false,
    ignores_reliance_posture: false, ignores_cap_chain: false,
    spoofed_read_mode: false,
  });

  // live rebuild attempt
  const rebuildRes = v.validate({
    consumer_class: L8ConsumerClass.DETERMINISTIC_SCORER,
    consumer_service: 'scoring',
    read_request: goodReq,
    will_rebuild_regime_from_l6_l7: true,
    will_rebuild_transition_from_l6_l7: false,
    will_rebuild_multiplier_from_l6_l7: false,
    accesses_raw_archive_path: false,
    ignores_reliance_posture: false, ignores_cap_chain: false,
    spoofed_read_mode: false,
  });
  const rebuildRej = !rebuildRes.ok &&
    rebuildRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_REGIME_LIVE);

  // bypass read surface entirely
  const bypassRes = v.validate({
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
  const bypassRej = !bypassRes.ok &&
    bypassRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE);

  // ignoring reliance posture
  const ignRes = v.validate({
    consumer_class: L8ConsumerClass.FINAL_JUDGMENT,
    consumer_service: 'judgment',
    read_request: goodReq,
    will_rebuild_regime_from_l6_l7: false,
    will_rebuild_transition_from_l6_l7: false,
    will_rebuild_multiplier_from_l6_l7: false,
    accesses_raw_archive_path: false,
    ignores_reliance_posture: true, ignores_cap_chain: true,
    spoofed_read_mode: false,
  });
  const ignRej = !ignRes.ok &&
    ignRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.DOWNSTREAM_IGNORES_RELIANCE_POSTURE) &&
    ignRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.DOWNSTREAM_IGNORES_CAP_CHAIN);

  // adapter may rebuild (allowed)
  const adapterRes = v.validate({
    consumer_class: L8ConsumerClass.REPLAY_ADAPTER,
    consumer_service: 'replay.adapter',
    read_request: goodReq,
    will_rebuild_regime_from_l6_l7: true,
    will_rebuild_transition_from_l6_l7: true,
    will_rebuild_multiplier_from_l6_l7: true,
    accesses_raw_archive_path: false,
    ignores_reliance_posture: false, ignores_cap_chain: false,
    spoofed_read_mode: false,
  });

  const holds = greenRes.ok && rebuildRej && bypassRej && ignRej &&
    adapterRes.ok;
  return {
    id: 'INV-8.8-F',
    name: 'Later layers consume via read surfaces; no live rebuild; no bypass',
    holds,
    evidence: `green=${greenRes.ok} rebuild_rej=${rebuildRej} bypass_rej=${bypassRej} ign_rej=${ignRej} adapter_ok=${adapterRes.ok}`,
  };
}

// ── INV-8.8-G — replay/repair preserve or mark divergence ──────────────

export function checkINV_88_G(): L8_8InvariantResult {
  const v = new L8PersistencePolicyValidator();

  // replay write to historical is LEGAL
  const replayEnv = {
    ...buildGreenL8HistoricalRegimeEnvelope(),
    materialization_mode: L8MaterializationMode.REPLAY_HISTORICAL,
    replay_generation_ref: 'rgen.42',
  };
  const replayRes = v.validate(replayEnv,
    { source: 'test.g' });

  // replay write to current is ILLEGAL
  const replayCurrentEnv = {
    ...buildGreenL8CurrentRegimeEnvelope(),
    materialization_mode: L8MaterializationMode.REPLAY_HISTORICAL,
  };
  const replayCurRes = v.validate(replayCurrentEnv,
    { source: 'test.g' });
  const replayCurRej = !replayCurRes.ok &&
    replayCurRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE);

  // repair write to current is ILLEGAL
  const repairCurrentEnv = {
    ...buildGreenL8CurrentRegimeEnvelope(),
    materialization_mode: L8MaterializationMode.REPAIR_REBUILD,
  };
  const repairCurRes = v.validate(repairCurrentEnv,
    { source: 'test.g' });
  const repairCurRej = !repairCurRes.ok &&
    repairCurRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.REPAIR_WRITTEN_AS_LIVE);

  // late-data to current is ILLEGAL
  const lateCurrentEnv = {
    ...buildGreenL8CurrentRegimeEnvelope(),
    materialization_mode: L8MaterializationMode.LATE_DATA_REMATERIALIZATION,
  };
  const lateCurRes = v.validate(lateCurrentEnv,
    { source: 'test.g' });
  const lateCurRej = !lateCurRes.ok &&
    lateCurRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.LATE_DATA_WRITTEN_AS_LIVE);

  // live write to historical is ILLEGAL
  const liveHistEnv = {
    ...buildGreenL8HistoricalRegimeEnvelope(),
    materialization_mode: L8MaterializationMode.LIVE_CURRENT,
  };
  const liveHistRes = v.validate(liveHistEnv,
    { source: 'test.g' });
  const liveHistRej = !liveHistRes.ok &&
    liveHistRes.violations.some(x =>
      x.code === L8PersistenceViolationCode.LIVE_WRITTEN_AS_HISTORICAL);

  const holds = replayRes.ok && replayCurRej && repairCurRej &&
    lateCurRej && liveHistRej;
  return {
    id: 'INV-8.8-G',
    name: 'Replay/repair/late-data preserve regime meaning; mode confusions rejected',
    holds,
    evidence: `replay_ok=${replayRes.ok} replayCur_rej=${replayCurRej} repairCur_rej=${repairCurRej} lateCur_rej=${lateCurRej} liveHist_rej=${liveHistRej}`,
  };
}

// ── Aggregate runner ───────────────────────────────────────────────────

export function runAllL8_8Invariants(): readonly L8_8InvariantResult[] {
  return [
    checkINV_88_A(),
    checkINV_88_B(),
    checkINV_88_C(),
    checkINV_88_D(),
    checkINV_88_E(),
    checkINV_88_F(),
    checkINV_88_G(),
  ];
}

export { getDefaultL8DurableSurfaceRegistry };
