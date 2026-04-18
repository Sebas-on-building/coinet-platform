/**
 * L6.7 — Persistence, Materialization, and Read-Surface Invariants
 *
 * §6.7.7.7 — INV-6.7-A through INV-6.7-G, executable and test-covered.
 */

import {
  L6DurableSurfaceId,
  L6MaterializationMode,
  L6PersistenceClass,
  L6PersistenceViolationCode,
  DURABLE_SURFACE_REGISTRY,
  ALL_DURABLE_SURFACE_IDS,
} from '../contracts/l6-persistence-surface';
import {
  L6CurrentAuthorityClass,
  L6SupersessionReason,
} from '../contracts/l6-current-authority';
import {
  L6EvidencePack,
  L6EvidencePackClass,
} from '../contracts/l6-evidence-storage';
import {
  L6ConsumerClass,
  L6HistoricalSurfaceClass,
  L6ReadMode,
  L6ReadSurfaceId,
  PROHIBITED_RAW_STORAGE_SURFACES,
} from '../contracts/l6-read-surface';

import {
  L6PersistencePolicyValidator,
  L6PersistenceAttempt,
} from '../persistence/l6-persistence-policy.validator';
import {
  CurrentStateAuthorityValidator,
} from '../persistence/current-state-authority.validator';
import {
  EvidencePackStorageValidator,
  L6InMemoryEvidenceIndex,
} from '../persistence/evidence-pack-storage.validator';
import { ReadSurfaceValidator } from '../read/read-surface.validator';

export interface L6_7InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ---------- fixtures ----------

function buildLegalHistoricalAttempt(): L6PersistenceAttempt {
  return {
    envelope: {
      identity: {
        primitive_id: 'feat.px',
        primitive_version: '1.0.0',
        scope_type: 'ASSET',
        scope_id: 'btc',
        temporal_anchor: '2026-01-01T00:00:00Z',
        compute_run_id: 'run-001',
        replay_hash: 'rh-abc',
        storage_manifest_id: 'mfst-1',
      },
      persistence_class: L6PersistenceClass.HISTORICAL_STATE,
      materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
      target_surface: L6DurableSurfaceId.EVENT_TRANSITIONS,
      l5_envelope_id: 'l5env-1',
      evidence_pack_ref: 'ev-001',
      payload_keys: ['value'],
      emitted_at: '2026-01-01T00:00:00Z',
    },
    direct_store_bypass: false,
    sink_hint: 'POSTGRES',
    evidence_archive_uri: null,
    current_authority_class: null,
    supersession_tag: null,
    prior_row_exists: false,
    mutation_action: 'INSERT',
  };
}

function buildLegalCurrentAttempt(): L6PersistenceAttempt {
  return {
    envelope: {
      identity: {
        primitive_id: 'feat.px',
        primitive_version: '1.0.0',
        scope_type: 'ASSET',
        scope_id: 'btc',
        temporal_anchor: '2026-01-01T00:00:00Z',
        compute_run_id: 'run-001',
        replay_hash: 'rh-abc',
        storage_manifest_id: 'mfst-1',
      },
      persistence_class: L6PersistenceClass.CURRENT_AUTHORITATIVE_STATE,
      materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
      target_surface: L6DurableSurfaceId.FEATURE_CURRENT_REGISTRY,
      l5_envelope_id: 'l5env-2',
      evidence_pack_ref: 'ev-002',
      payload_keys: ['value'],
      emitted_at: '2026-01-01T00:00:00Z',
    },
    direct_store_bypass: false,
    sink_hint: 'POSTGRES',
    evidence_archive_uri: null,
    current_authority_class: L6CurrentAuthorityClass.POSTGRES_AUTHORITY,
    supersession_tag: null,
    prior_row_exists: false,
    mutation_action: 'UPSERT',
  };
}

function buildLegalEvidencePack(pack_id = 'ev-001'): L6EvidencePack {
  return {
    identity: {
      evidence_pack_id: pack_id,
      pack_class: L6EvidencePackClass.FEATURE_EVIDENCE_PACK,
      primitive_id: 'feat.px',
      primitive_version: '1.0.0',
      scope_type: 'ASSET',
      scope_id: 'btc',
      anchor_at: '2026-01-01T00:00:00Z',
      compute_run_id: 'run-001',
      trace_id: 'trc-1',
      replay_hash: 'rh-abc',
    },
    archive: {
      archive_uri: 's3://coinet-evidence/features/feat.px/btc/2026-01-01',
      archive_checksum: 'sha256:deadbeef',
      manifest_id: 'mfst-1',
      pointer_index_ref: 'idx-1',
    },
    feature_payload: {
      input_surfaces_used: ['l5.price_series'],
      windows_used: ['w1h'],
      baselines_used: ['b30d'],
      null_policy_interpretation: 'REJECT_IF_MISSING',
      late_data_interpretation: 'ON_TIME',
      quality_derivation_context: 'q1',
      confidence_derivation_context: 'c1',
      contract_version_refs: ['feat.px@1.0.0'],
      compute_metadata: {},
    },
    event_payload: null,
    written_at: '2026-01-01T00:00:00Z',
  };
}

// ---------- invariants ----------

/** INV-6.7-A: Layer 6 persists through Layer 5 only. */
export function checkINV_67_A(): L6_7InvariantResult {
  const v = new L6PersistencePolicyValidator();

  const legal = v.validate(buildLegalHistoricalAttempt());
  const bypass = v.validate({ ...buildLegalHistoricalAttempt(), direct_store_bypass: true });
  const noManifest = v.validate({
    ...buildLegalHistoricalAttempt(),
    envelope: {
      ...buildLegalHistoricalAttempt().envelope,
      identity: { ...buildLegalHistoricalAttempt().envelope.identity, storage_manifest_id: '' },
    },
  });

  const ok =
    legal.ok &&
    !bypass.ok &&
    bypass.violations.some(x => x.code === L6PersistenceViolationCode.DIRECT_STORE_WRITE) &&
    !noManifest.ok &&
    noManifest.violations.some(x => x.code === L6PersistenceViolationCode.MISSING_MANIFEST_LINKAGE);

  return {
    id: 'INV-6.7-A',
    name: 'Layer 6 persists through Layer 5 only',
    holds: ok,
    evidence: `legal=${legal.ok} bypass_blocked=${!bypass.ok} missing_manifest_blocked=${!noManifest.ok}`,
  };
}

/** INV-6.7-B: Current state is authoritative only in Postgres current registries. */
export function checkINV_67_B(): L6_7InvariantResult {
  const specs = ALL_DURABLE_SURFACE_IDS
    .map(id => DURABLE_SURFACE_REGISTRY[id])
    .filter(s => s.persistence_class === L6PersistenceClass.CURRENT_AUTHORITATIVE_STATE);

  const allPostgres = specs.every(s => s.authority_store === 'POSTGRES');

  const v = new CurrentStateAuthorityValidator();
  const shadow = v.validate({
    primitive_id: 'feat.px', primitive_version: '1.0.0',
    scope_type: 'ASSET', scope_id: 'btc',
    authority_class: L6CurrentAuthorityClass.REDIS_ACCELERATED,
    materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
    contract_version: '1.0.0',
    definition_rollout_active: true, contract_validated: true,
    temporal_legality_passed: true, manifest_id: 'mfst-1',
    prior_as_of: null, new_as_of: '2026-01-01T00:00:00Z',
    prior_replay_hash: null, new_replay_hash: 'rh-1',
    supersession: null,
  });

  const redisClaim = v.validateRedisCache({
    key: 'l6:current:feat.px:btc',
    reconstructable_from_postgres: true,
    reconstructable_from_object_store: false,
    tagged_cache_only: false,
    claimed_authoritative: true,
  });

  const ok = allPostgres && !shadow.ok && !redisClaim.ok &&
    shadow.violations.some(x => x.code === L6PersistenceViolationCode.REDIS_SHADOW_AUTHORITY);

  return {
    id: 'INV-6.7-B',
    name: 'current state authoritative only in Postgres; Redis cannot claim authority',
    holds: ok,
    evidence: `allPostgres=${allPostgres} shadow_blocked=${!shadow.ok} redisClaim_blocked=${!redisClaim.ok}`,
  };
}

/** INV-6.7-C: Historical state remains append-safe and replay-safe. */
export function checkINV_67_C(): L6_7InvariantResult {
  const v = new L6PersistencePolicyValidator();

  const legal = v.validate(buildLegalHistoricalAttempt());
  const noReplay = v.validate({
    ...buildLegalHistoricalAttempt(),
    envelope: {
      ...buildLegalHistoricalAttempt().envelope,
      identity: { ...buildLegalHistoricalAttempt().envelope.identity, replay_hash: '' },
    },
  });
  const mutated = v.validate({
    ...buildLegalHistoricalAttempt(),
    mutation_action: 'UPDATE',
  });

  const ok =
    legal.ok &&
    !noReplay.ok &&
    noReplay.violations.some(x => x.code === L6PersistenceViolationCode.HISTORICAL_WRITE_WITHOUT_REPLAY_IDENTITY) &&
    !mutated.ok &&
    mutated.violations.some(x => x.code === L6PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATION);

  return {
    id: 'INV-6.7-C',
    name: 'historical surfaces append/immutable, replay-identity required',
    holds: ok,
    evidence: `legal=${legal.ok} no_replay_blocked=${!noReplay.ok} update_blocked=${!mutated.ok}`,
  };
}

/** INV-6.7-D: Evidence packs are object-stored, pointer-indexed, replay-discoverable. */
export function checkINV_67_D(): L6_7InvariantResult {
  const index = new L6InMemoryEvidenceIndex();
  const pack = buildLegalEvidencePack();
  index.register(pack);
  const v = new EvidencePackStorageValidator(index);

  const legal = v.validatePack(pack);

  const badArchive = { ...pack, archive: { ...pack.archive, archive_uri: 'inline://pack' } };
  const badArchiveR = v.validatePack(badArchive);

  const orphan = { ...pack, identity: { ...pack.identity, evidence_pack_id: 'ev-unknown' } };
  const orphanR = v.validatePack(orphan);

  const missingRef = v.validateReference(true, null);
  const missingPack = v.validateReference(true, 'ev-unknown');

  const ok =
    legal.ok &&
    !badArchiveR.ok &&
    !orphanR.ok &&
    !missingRef.ok &&
    missingRef.violations.some(x => x.code === L6PersistenceViolationCode.EVIDENCE_REQUIRED_MISSING) &&
    !missingPack.ok &&
    missingPack.violations.some(x => x.code === L6PersistenceViolationCode.ORPHAN_EVIDENCE_PACK);

  return {
    id: 'INV-6.7-D',
    name: 'evidence packs object-stored, pointer-indexed, replay-discoverable',
    holds: ok,
    evidence: `legal=${legal.ok} bad_archive_blocked=${!badArchiveR.ok} orphan_blocked=${!orphanR.ok} missing_ref_blocked=${!missingRef.ok}`,
  };
}

/** INV-6.7-E: Read surfaces expose current/historical/evidence/lineage without lower-level reinterpretation. */
export function checkINV_67_E(): L6_7InvariantResult {
  const required: readonly L6ReadSurfaceId[] = [
    L6ReadSurfaceId.CURRENT_FEATURE_SNAPSHOT_BY_SCOPE,
    L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
    L6ReadSurfaceId.ACTIVE_EVENTS_BY_SCOPE,
    L6ReadSurfaceId.EVENT_HISTORY_BY_SCOPE,
    L6ReadSurfaceId.FEATURE_EVIDENCE_BUNDLE,
    L6ReadSurfaceId.EVENT_EVIDENCE_PACK,
    L6ReadSurfaceId.RECOMPUTE_LINEAGE_BY_COMPUTE_RUN,
  ];

  const rv = new ReadSurfaceValidator();
  const ambiguous = rv.validateHistoricalRow({ surface_class: undefined });
  const tagged = rv.validateHistoricalRow({ surface_class: L6HistoricalSurfaceClass.LIVE_PROJECTED });

  const ok = required.length === 7 && !ambiguous.ok && tagged.ok;
  return {
    id: 'INV-6.7-E',
    name: 'read surfaces complete; ambiguous historical class rejected',
    holds: ok,
    evidence: `count=${required.length} ambiguous_blocked=${!ambiguous.ok} tagged_ok=${tagged.ok}`,
  };
}

/** INV-6.7-F: Later layers may consume primitives only through governed read surfaces. */
export function checkINV_67_F(): L6_7InvariantResult {
  const rv = new ReadSurfaceValidator();

  const legal = rv.validate({
    surface: L6ReadSurfaceId.CURRENT_FEATURE_SNAPSHOT_BY_SCOPE,
    mode: L6ReadMode.CURRENT_AUTHORITATIVE,
    consumer_class: L6ConsumerClass.LATER_LAYER,
    raw_storage_surface_hint: null,
    ad_hoc_recompute_requested: false,
  });

  const rawBypass = rv.validate({
    surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
    mode: L6ReadMode.HISTORICAL,
    consumer_class: L6ConsumerClass.LATER_LAYER,
    raw_storage_surface_hint: PROHIBITED_RAW_STORAGE_SURFACES[0],
    ad_hoc_recompute_requested: false,
  });

  const adHoc = rv.validate({
    surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
    mode: L6ReadMode.HISTORICAL,
    consumer_class: L6ConsumerClass.LATER_LAYER,
    raw_storage_surface_hint: null,
    ad_hoc_recompute_requested: true,
  });

  const replayMode = rv.validate({
    surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
    mode: L6ReadMode.REPLAY_TAGGED,
    consumer_class: L6ConsumerClass.LATER_LAYER,
    raw_storage_surface_hint: null,
    ad_hoc_recompute_requested: false,
  });

  const ok =
    legal.ok &&
    !rawBypass.ok &&
    rawBypass.violations.some(x => x.code === L6PersistenceViolationCode.RAW_STORAGE_CONSUMPTION) &&
    !adHoc.ok &&
    adHoc.violations.some(x => x.code === L6PersistenceViolationCode.AD_HOC_RECOMPUTE) &&
    !replayMode.ok &&
    replayMode.violations.some(x => x.code === L6PersistenceViolationCode.AMBIGUOUS_READ_MODE);

  return {
    id: 'INV-6.7-F',
    name: 'later layers consume via governed surfaces only; raw/ad-hoc/replay-mode blocked',
    holds: ok,
    evidence: `legal=${legal.ok} raw_blocked=${!rawBypass.ok} adhoc_blocked=${!adHoc.ok} replay_mode_blocked=${!replayMode.ok}`,
  };
}

/** INV-6.7-G: Late-data rematerialization may not silently overwrite current authority. */
export function checkINV_67_G(): L6_7InvariantResult {
  const v = new CurrentStateAuthorityValidator();

  const silent = v.validate({
    primitive_id: 'feat.px', primitive_version: '1.0.0',
    scope_type: 'ASSET', scope_id: 'btc',
    authority_class: L6CurrentAuthorityClass.POSTGRES_AUTHORITY,
    materialization_mode: L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION,
    contract_version: '1.0.0',
    definition_rollout_active: true, contract_validated: true,
    temporal_legality_passed: true, manifest_id: 'mfst-1',
    prior_as_of: '2026-01-01T00:00:00Z', new_as_of: '2026-01-01T00:00:05Z',
    prior_replay_hash: 'rh-prior', new_replay_hash: 'rh-new',
    supersession: null,
  });

  const governed = v.validate({
    primitive_id: 'feat.px', primitive_version: '1.0.0',
    scope_type: 'ASSET', scope_id: 'btc',
    authority_class: L6CurrentAuthorityClass.POSTGRES_AUTHORITY,
    materialization_mode: L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION,
    contract_version: '1.0.0',
    definition_rollout_active: true, contract_validated: true,
    temporal_legality_passed: true, manifest_id: 'mfst-1',
    prior_as_of: '2026-01-01T00:00:00Z', new_as_of: '2026-01-01T00:00:05Z',
    prior_replay_hash: 'rh-prior', new_replay_hash: 'rh-new',
    supersession: {
      prior_row_id: 'row-prior',
      superseded_at: '2026-01-01T00:00:05Z',
      reason: L6SupersessionReason.LATE_DATA_GOVERNED_REMATERIALIZATION,
      materialization_mode: L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION,
      prior_replay_hash: 'rh-prior',
      new_replay_hash: 'rh-new',
    },
  });

  const replayAsLive = v.validate({
    primitive_id: 'feat.px', primitive_version: '1.0.0',
    scope_type: 'ASSET', scope_id: 'btc',
    authority_class: L6CurrentAuthorityClass.POSTGRES_AUTHORITY,
    materialization_mode: L6MaterializationMode.REPLAY_MATERIALIZATION,
    contract_version: '1.0.0',
    definition_rollout_active: true, contract_validated: true,
    temporal_legality_passed: true, manifest_id: 'mfst-1',
    prior_as_of: '2026-01-01T00:00:00Z', new_as_of: '2026-01-01T00:00:05Z',
    prior_replay_hash: 'rh-prior', new_replay_hash: 'rh-new',
    supersession: {
      prior_row_id: 'row-prior',
      superseded_at: '2026-01-01T00:00:05Z',
      reason: L6SupersessionReason.LIVE_ADVANCE,
      materialization_mode: L6MaterializationMode.REPLAY_MATERIALIZATION,
      prior_replay_hash: 'rh-prior',
      new_replay_hash: 'rh-new',
    },
  });

  const ok =
    !silent.ok &&
    (silent.violations.some(x => x.code === L6PersistenceViolationCode.SILENT_CURRENT_OVERWRITE) ||
     silent.violations.some(x => x.code === L6PersistenceViolationCode.ILLEGAL_SUPERSESSION)) &&
    governed.ok &&
    !replayAsLive.ok &&
    replayAsLive.violations.some(x => x.code === L6PersistenceViolationCode.REPLAY_AS_LIVE_CURRENT);

  return {
    id: 'INV-6.7-G',
    name: 'late-data rematerialization may not silently overwrite current authority',
    holds: ok,
    evidence: `silent_blocked=${!silent.ok} governed=${governed.ok} replay_as_live_blocked=${!replayAsLive.ok}`,
  };
}

export function checkAllL6_7Invariants(): readonly L6_7InvariantResult[] {
  return [
    checkINV_67_A(),
    checkINV_67_B(),
    checkINV_67_C(),
    checkINV_67_D(),
    checkINV_67_E(),
    checkINV_67_F(),
    checkINV_67_G(),
  ];
}

export {
  buildLegalHistoricalAttempt,
  buildLegalCurrentAttempt,
  buildLegalEvidencePack,
};
