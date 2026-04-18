/**
 * L6.7 — Persistence, Materialization, and Read-Surface
 * Certification Test Suite
 *
 * 6 Bands:
 *   A — Persistence routing (L5 only, manifest linkage, direct-store bypass)
 *   B — Durable surfaces (registry, authority mapping, supersession, mutation discipline)
 *   C — Historical surfaces (append-safe, replay-safe, repair tags)
 *   D — Evidence storage (archive, pointer index, discoverability, immutability)
 *   E — Read surfaces (current, historical, evidence, lineage, ambiguous mode)
 *   F — Later-layer consumption + invariants + audit
 */

import {
  L6PersistenceClass,
  ALL_PERSISTENCE_CLASSES,
  L6MaterializationMode,
  ALL_MATERIALIZATION_MODES,
  isRematerializationMode,
  isHistoricalMaterializationMode,
  L6DurableSurfaceId,
  ALL_DURABLE_SURFACE_IDS,
  DURABLE_SURFACE_REGISTRY,
  L6AuthorityStore,
  L6MutationDiscipline,
  L6PersistenceViolationCode,
  ALL_PERSISTENCE_VIOLATION_CODES,
  L6CurrentAuthorityClass,
  ALL_CURRENT_AUTHORITY_CLASSES,
  isShadowAuthority,
  L6SupersessionReason,
  ALL_SUPERSESSION_REASONS,
  LEGAL_SUPERSESSION_BY_MODE,
  requiresExplicitSupersession,
  L6EvidencePackClass,
  ALL_EVIDENCE_PACK_CLASSES,
  featureEvidencePath,
  eventEvidencePath,
  L6ReadSurfaceId,
  ALL_READ_SURFACE_IDS,
  L6HistoricalSurfaceClass,
  ALL_HISTORICAL_SURFACE_CLASSES,
  L6ReadMode,
  ALL_READ_MODES,
  L6ConsumerClass,
  ALL_CONSUMER_CLASSES,
  PROHIBITED_RAW_STORAGE_SURFACES,
} from '../l6/contracts';

import {
  L6PersistencePolicyValidator,
  CurrentStateAuthorityValidator,
  EvidencePackStorageValidator,
  L6InMemoryEvidenceIndex,
  prepareMaterialization,
  L6MaterializationPipelineStep,
} from '../l6/persistence';

import {
  ReadSurfaceValidator,
  L6CurrentReadService,
  L6HistoricalReadService,
  L6EvidenceReadService,
  L6ComputeRunReadService,
} from '../l6/read';

import {
  emitPersistenceAudit,
  getPersistenceAuditLog,
  findPersistenceAuditsByCode,
  findPersistenceAuditsByRun,
  findPersistenceAuditsBySurface,
  clearPersistenceAuditLog,
  L6PersistenceAuditSeverity,
} from '../l6/constitution';

import {
  checkAllL6_7Invariants,
  checkINV_67_A, checkINV_67_B, checkINV_67_C,
  checkINV_67_D, checkINV_67_E, checkINV_67_F, checkINV_67_G,
  buildLegalHistoricalAttempt,
  buildLegalCurrentAttempt,
  buildLegalEvidencePack,
} from '../l6/invariants';

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

async function main(): Promise<void> {
  const t0 = Date.now();

  // ═══════════════════════════════════════════════════════════════════════
  // BAND A — Persistence routing
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n═══ BAND A: Persistence Routing ═══');

  assert(ALL_PERSISTENCE_CLASSES.length === 5, 'A.1 — 5 persistence classes');
  assert(ALL_MATERIALIZATION_MODES.length === 4, 'A.2 — 4 materialization modes');
  assert(ALL_PERSISTENCE_VIOLATION_CODES.length >= 20, 'A.3 — at least 20 persistence violation codes');

  assert(isHistoricalMaterializationMode(L6MaterializationMode.REPLAY_MATERIALIZATION),
    'A.4 — replay is historical materialization');
  assert(isHistoricalMaterializationMode(L6MaterializationMode.REPAIR_MATERIALIZATION),
    'A.5 — repair is historical materialization');
  assert(!isHistoricalMaterializationMode(L6MaterializationMode.LIVE_MATERIALIZATION),
    'A.6 — live is not historical materialization');
  assert(isRematerializationMode(L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION),
    'A.7 — late-data governed is rematerialization');
  assert(isRematerializationMode(L6MaterializationMode.REPAIR_MATERIALIZATION),
    'A.8 — repair is rematerialization');
  assert(!isRematerializationMode(L6MaterializationMode.LIVE_MATERIALIZATION),
    'A.9 — live is not rematerialization');

  {
    const v = new L6PersistencePolicyValidator();
    const legal = v.validate(buildLegalHistoricalAttempt());
    assert(legal.ok, 'A.10 — legal historical persistence attempt accepted');

    const bypass = v.validate({ ...buildLegalHistoricalAttempt(), direct_store_bypass: true });
    assert(!bypass.ok, 'A.11 — direct store bypass blocked');
    assert(bypass.violations.some(x => x.code === L6PersistenceViolationCode.DIRECT_STORE_WRITE),
      'A.12 — DIRECT_STORE_WRITE code emitted');
  }

  {
    const v = new L6PersistencePolicyValidator();
    const base = buildLegalHistoricalAttempt();
    const noManifest = v.validate({
      ...base,
      envelope: {
        ...base.envelope,
        identity: { ...base.envelope.identity, storage_manifest_id: '' },
      },
    });
    assert(!noManifest.ok, 'A.13 — missing manifest linkage blocked');
    assert(noManifest.violations.some(x => x.code === L6PersistenceViolationCode.MISSING_MANIFEST_LINKAGE),
      'A.14 — MISSING_MANIFEST_LINKAGE code emitted');
  }

  {
    const v = new L6PersistencePolicyValidator();
    const base = buildLegalHistoricalAttempt();

    const badSink = v.validate({ ...base, sink_hint: 's3-external' });
    assert(!badSink.ok, 'A.15 — illegal sink hint rejected');

    const misroute = v.validate({ ...base, sink_hint: 'CLICKHOUSE' });
    assert(!misroute.ok, 'A.16 — authority misroute blocked');
    assert(misroute.violations.some(x => x.code === L6PersistenceViolationCode.AUTHORITY_MISROUTE),
      'A.17 — AUTHORITY_MISROUTE code emitted');
  }

  {
    const req = {
      identity: buildLegalHistoricalAttempt().envelope.identity,
      persistence_class: L6PersistenceClass.HISTORICAL_STATE,
      materialization_mode: L6MaterializationMode.LIVE_MATERIALIZATION,
      target_surface: L6DurableSurfaceId.EVENT_TRANSITIONS,
      evidence_pack_ref: 'ev-001',
      payload_keys: ['value'],
      contract_legal: true,
      temporal_legal: true,
    };
    const decision = prepareMaterialization(req);
    assert(decision.ok, 'A.18 — prepareMaterialization produces legal decision');
    assert(decision.pipeline.length === 8, 'A.19 — pipeline has all 8 steps');
    assert(decision.pipeline[0] === L6MaterializationPipelineStep.CONTRACT_LEGALITY,
      'A.20 — pipeline starts with contract legality');
    assert(decision.envelope !== null, 'A.21 — envelope prepared');

    const noContract = prepareMaterialization({ ...req, contract_legal: false });
    assert(!noContract.ok, 'A.22 — contract-illegal request blocked pre-pipeline');

    const mismatch = prepareMaterialization({
      ...req,
      target_surface: L6DurableSurfaceId.FEATURE_CURRENT_REGISTRY,
    });
    assert(!mismatch.ok, 'A.23 — persistence-class/surface mismatch blocked');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BAND B — Durable surfaces
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n═══ BAND B: Durable Surfaces ═══');

  assert(ALL_DURABLE_SURFACE_IDS.length === 9, 'B.1 — 9 durable logical surfaces');
  {
    const required: readonly L6DurableSurfaceId[] = [
      L6DurableSurfaceId.FEATURE_DEFINITIONS,
      L6DurableSurfaceId.EVENT_DEFINITIONS,
      L6DurableSurfaceId.COMPUTE_RUNS,
      L6DurableSurfaceId.FEATURE_CURRENT_REGISTRY,
      L6DurableSurfaceId.EVENT_CURRENT_REGISTRY,
      L6DurableSurfaceId.EVENT_TRANSITIONS,
      L6DurableSurfaceId.DEPENDENCY_WATERMARKS,
      L6DurableSurfaceId.COMPUTE_FAILURES,
      L6DurableSurfaceId.EVIDENCE_PACK_INDEX,
    ];
    for (const id of required) {
      assert(ALL_DURABLE_SURFACE_IDS.includes(id), `B.2 — ${id} present`);
    }
  }

  {
    const current = ALL_DURABLE_SURFACE_IDS
      .map(id => DURABLE_SURFACE_REGISTRY[id])
      .filter(s => s.persistence_class === L6PersistenceClass.CURRENT_AUTHORITATIVE_STATE);
    assert(current.length === 2, 'B.3 — 2 current-state registries');
    for (const s of current) {
      assert(s.authority_store === L6AuthorityStore.POSTGRES,
        `B.4 — ${s.surface_id} authoritative on Postgres`);
      assert(s.mutation_discipline === L6MutationDiscipline.SUPERSEDING_CURRENT_AUTHORITY,
        `B.5 — ${s.surface_id} uses superseding discipline`);
    }
  }

  {
    const specs = ALL_DURABLE_SURFACE_IDS.map(id => DURABLE_SURFACE_REGISTRY[id]);
    for (const spec of specs) {
      assert(spec.required_fields.length > 0, `B.6 — ${spec.surface_id} declares required fields`);
      assert(!!spec.description, `B.7 — ${spec.surface_id} has description`);
    }
    const def = specs.filter(s => s.persistence_class === L6PersistenceClass.DEFINITION_STATE);
    for (const s of def) {
      assert(s.mutation_discipline === L6MutationDiscipline.APPEND_ONLY,
        `B.8 — definition surface ${s.surface_id} is append-only`);
    }
    const evt = DURABLE_SURFACE_REGISTRY[L6DurableSurfaceId.EVENT_TRANSITIONS];
    assert(evt.mutation_discipline === L6MutationDiscipline.IMMUTABLE,
      'B.9 — event transitions immutable');
  }

  {
    const v = new L6PersistencePolicyValidator();
    const legal = v.validate(buildLegalCurrentAttempt());
    assert(legal.ok, 'B.10 — legal current-state write accepted');

    const noAuthority = v.validate({
      ...buildLegalCurrentAttempt(),
      current_authority_class: null,
    });
    assert(!noAuthority.ok, 'B.11 — current write without authority class blocked');
    assert(noAuthority.violations.some(x =>
      x.code === L6PersistenceViolationCode.CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS),
      'B.12 — CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS code emitted');
  }

  {
    const v = new L6PersistencePolicyValidator();
    const base = buildLegalHistoricalAttempt();
    const update = v.validate({ ...base, mutation_action: 'UPDATE' });
    assert(!update.ok, 'B.13 — immutable surface UPDATE blocked');
    assert(update.violations.some(x => x.code === L6PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATION),
      'B.14 — MUTATION_DISCIPLINE_VIOLATION code emitted');
  }

  for (const mode of ALL_MATERIALIZATION_MODES) {
    const reason = LEGAL_SUPERSESSION_BY_MODE[mode];
    assert(ALL_SUPERSESSION_REASONS.includes(reason),
      `B.15 — ${mode} maps to legal supersession reason`);
  }
  assert(requiresExplicitSupersession(L6MaterializationMode.REPAIR_MATERIALIZATION),
    'B.16 — repair requires explicit supersession');
  assert(requiresExplicitSupersession(L6MaterializationMode.REPLAY_MATERIALIZATION),
    'B.17 — replay requires explicit supersession');
  assert(!requiresExplicitSupersession(L6MaterializationMode.LIVE_MATERIALIZATION),
    'B.18 — live does not require explicit supersession');

  // ═══════════════════════════════════════════════════════════════════════
  // BAND C — Historical surfaces
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n═══ BAND C: Historical Surfaces ═══');

  {
    const v = new L6PersistencePolicyValidator();
    const base = buildLegalHistoricalAttempt();

    const legal = v.validate(base);
    assert(legal.ok, 'C.1 — legal historical write accepted');

    const noReplay = v.validate({
      ...base,
      envelope: {
        ...base.envelope,
        identity: { ...base.envelope.identity, replay_hash: '' },
      },
    });
    assert(!noReplay.ok, 'C.2 — historical without replay identity blocked');
    assert(noReplay.violations.some(x =>
      x.code === L6PersistenceViolationCode.HISTORICAL_WRITE_WITHOUT_REPLAY_IDENTITY),
      'C.3 — HISTORICAL_WRITE_WITHOUT_REPLAY_IDENTITY code emitted');
  }

  assert(ALL_HISTORICAL_SURFACE_CLASSES.length === 4, 'C.4 — 4 historical surface classes');
  {
    const required: readonly L6HistoricalSurfaceClass[] = [
      L6HistoricalSurfaceClass.LIVE_PROJECTED,
      L6HistoricalSurfaceClass.REPLAY_TAGGED,
      L6HistoricalSurfaceClass.REPAIR_TAGGED,
      L6HistoricalSurfaceClass.LATE_DATA_REMATERIALIZED,
    ];
    for (const cls of required) {
      assert(ALL_HISTORICAL_SURFACE_CLASSES.includes(cls), `C.5 — ${cls} present`);
    }
  }

  {
    const rv = new ReadSurfaceValidator();
    const ambig = rv.validateHistoricalRow({ surface_class: undefined });
    assert(!ambig.ok, 'C.6 — ambiguous historical row rejected');
    const tagged = rv.validateHistoricalRow({ surface_class: L6HistoricalSurfaceClass.REPLAY_TAGGED });
    assert(tagged.ok, 'C.7 — replay-tagged row accepted');
    const repaired = rv.validateHistoricalRow({ surface_class: L6HistoricalSurfaceClass.REPAIR_TAGGED });
    assert(repaired.ok, 'C.8 — repair-tagged row accepted');
  }

  {
    const evt = DURABLE_SURFACE_REGISTRY[L6DurableSurfaceId.EVENT_TRANSITIONS];
    assert(evt.replay_identity_required, 'C.9 — event transitions require replay identity');
    assert(evt.manifest_linkage_required, 'C.10 — event transitions require manifest linkage');
    assert(!evt.redis_cache_permitted, 'C.11 — event transitions not redis-cacheable as authority');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BAND D — Evidence storage
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n═══ BAND D: Evidence Storage ═══');

  assert(ALL_EVIDENCE_PACK_CLASSES.length === 2, 'D.1 — 2 evidence pack classes');
  assert(ALL_EVIDENCE_PACK_CLASSES.includes(L6EvidencePackClass.FEATURE_EVIDENCE_PACK),
    'D.2 — feature evidence pack class present');
  assert(ALL_EVIDENCE_PACK_CLASSES.includes(L6EvidencePackClass.EVENT_EVIDENCE_PACK),
    'D.3 — event evidence pack class present');

  {
    const fp = featureEvidencePath('feat.px', '1.0.0', 'btc', '2026-01-01T00:00:00Z');
    assert(fp.startsWith('evidence/features/'), 'D.4 — feature evidence path prefix');
    assert(fp.includes('feature_id=feat.px'), 'D.5 — feature id in path');
    assert(fp.includes('version=1.0.0'), 'D.6 — version in path');

    const ep = eventEvidencePath('evt.whale', 'inst-1', 'CONFIRMED');
    assert(ep.startsWith('evidence/events/'), 'D.7 — event evidence path prefix');
    assert(ep.includes('event_id=evt.whale'), 'D.8 — event id in path');
    assert(ep.includes('instance=inst-1'), 'D.9 — instance in path');
  }

  {
    const index = new L6InMemoryEvidenceIndex();
    const pack = buildLegalEvidencePack();
    index.register(pack);
    const v = new EvidencePackStorageValidator(index);

    const legal = v.validatePack(pack);
    assert(legal.ok, 'D.10 — legal evidence pack accepted');

    const noUri = v.validatePack({ ...pack, archive: { ...pack.archive, archive_uri: '' } });
    assert(!noUri.ok, 'D.11 — pack without archive URI blocked');
    assert(noUri.violations.some(x =>
      x.code === L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE),
      'D.12 — MISSING_EVIDENCE_ARCHIVE code emitted');

    const noManifest = v.validatePack({ ...pack, archive: { ...pack.archive, manifest_id: '' } });
    assert(!noManifest.ok, 'D.13 — pack without manifest linkage blocked');
    assert(noManifest.violations.some(x =>
      x.code === L6PersistenceViolationCode.EVIDENCE_WITHOUT_MANIFEST),
      'D.14 — EVIDENCE_WITHOUT_MANIFEST code emitted');
  }

  {
    const index = new L6InMemoryEvidenceIndex();
    const pack = buildLegalEvidencePack('ev-D');
    index.register(pack);
    const v = new EvidencePackStorageValidator(index);

    const orphan = v.validatePack({
      ...pack,
      identity: { ...pack.identity, evidence_pack_id: 'ev-missing' },
    });
    assert(!orphan.ok, 'D.15 — orphan pack blocked');
    assert(orphan.violations.some(x =>
      x.code === L6PersistenceViolationCode.ORPHAN_EVIDENCE_PACK),
      'D.16 — ORPHAN_EVIDENCE_PACK code emitted');

    const refOk = v.validateReference(true, 'ev-D');
    assert(refOk.ok, 'D.17 — legal evidence reference accepted');
    const refMissing = v.validateReference(true, null);
    assert(!refMissing.ok, 'D.18 — required evidence missing blocked');
    assert(refMissing.violations.some(x =>
      x.code === L6PersistenceViolationCode.EVIDENCE_REQUIRED_MISSING),
      'D.19 — EVIDENCE_REQUIRED_MISSING code emitted');
    const refUnknown = v.validateReference(true, 'ev-unknown');
    assert(!refUnknown.ok, 'D.20 — reference to unknown pack blocked');
  }

  {
    const index = new L6InMemoryEvidenceIndex();
    const pack = buildLegalEvidencePack();
    index.register(pack);
    const v = new EvidencePackStorageValidator(index);

    const payloadMismatch = v.validatePack({
      ...pack,
      identity: { ...pack.identity, pack_class: L6EvidencePackClass.EVENT_EVIDENCE_PACK },
    });
    assert(!payloadMismatch.ok, 'D.21 — payload/class mismatch blocked');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BAND E — Read surfaces
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n═══ BAND E: Read Surfaces ═══');

  assert(ALL_READ_SURFACE_IDS.length === 7, 'E.1 — 7 read surfaces');
  assert(ALL_READ_MODES.length === 6, 'E.2 — 6 read modes');
  assert(ALL_CONSUMER_CLASSES.length === 5, 'E.3 — 5 consumer classes');

  {
    const rv = new ReadSurfaceValidator();

    const laterLegal = rv.validate({
      surface: L6ReadSurfaceId.CURRENT_FEATURE_SNAPSHOT_BY_SCOPE,
      mode: L6ReadMode.CURRENT_AUTHORITATIVE,
      consumer_class: L6ConsumerClass.LATER_LAYER,
      raw_storage_surface_hint: null, ad_hoc_recompute_requested: false,
    });
    assert(laterLegal.ok, 'E.4 — later layer may read current authoritative');

    const laterReplay = rv.validate({
      surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
      mode: L6ReadMode.REPLAY_TAGGED,
      consumer_class: L6ConsumerClass.LATER_LAYER,
      raw_storage_surface_hint: null, ad_hoc_recompute_requested: false,
    });
    assert(!laterReplay.ok, 'E.5 — later layer may not read in replay-tagged mode');
    assert(laterReplay.violations.some(x => x.code === L6PersistenceViolationCode.AMBIGUOUS_READ_MODE),
      'E.6 — AMBIGUOUS_READ_MODE code emitted');

    const raw = rv.validate({
      surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
      mode: L6ReadMode.HISTORICAL,
      consumer_class: L6ConsumerClass.LATER_LAYER,
      raw_storage_surface_hint: PROHIBITED_RAW_STORAGE_SURFACES[0],
      ad_hoc_recompute_requested: false,
    });
    assert(!raw.ok, 'E.7 — raw storage consumption blocked for later layer');
    assert(raw.violations.some(x => x.code === L6PersistenceViolationCode.RAW_STORAGE_CONSUMPTION),
      'E.8 — RAW_STORAGE_CONSUMPTION code emitted');

    const adHoc = rv.validate({
      surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
      mode: L6ReadMode.HISTORICAL,
      consumer_class: L6ConsumerClass.LATER_LAYER,
      raw_storage_surface_hint: null, ad_hoc_recompute_requested: true,
    });
    assert(!adHoc.ok, 'E.9 — later layer ad-hoc recompute blocked');
    assert(adHoc.violations.some(x => x.code === L6PersistenceViolationCode.AD_HOC_RECOMPUTE),
      'E.10 — AD_HOC_RECOMPUTE code emitted');

    const replayRunner = rv.validate({
      surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
      mode: L6ReadMode.REPLAY_TAGGED,
      consumer_class: L6ConsumerClass.REPLAY_RUNNER,
      raw_storage_surface_hint: null, ad_hoc_recompute_requested: true,
    });
    assert(replayRunner.ok, 'E.11 — replay runner may recompute in replay-tagged mode');

    const repairRunner = rv.validate({
      surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
      mode: L6ReadMode.REPAIRED_REMATERIALIZED,
      consumer_class: L6ConsumerClass.REPAIR_RUNNER,
      raw_storage_surface_hint: null, ad_hoc_recompute_requested: true,
    });
    assert(repairRunner.ok, 'E.12 — repair runner may recompute in repair mode');
  }

  {
    const svc = new L6CurrentReadService({
      async fetchCurrentFeatureSnapshot() { return []; },
      async fetchActiveEvents() { return []; },
    });
    const r = await svc.currentFeatureSnapshot(
      { scope_type: 'ASSET', scope_id: 'btc' },
      L6ConsumerClass.LATER_LAYER,
    );
    assert(r.ok, 'E.13 — current-read service legal path');

    const r2 = await svc.activeEvents(
      { scope_type: 'ASSET', scope_id: 'btc' },
      L6ConsumerClass.LATER_LAYER,
    );
    assert(r2.ok, 'E.14 — active events read service legal path');
  }

  {
    const histBackend = {
      async fetchFeatureHistory() {
        return [{
          feature_id: 'feat.px', feature_version: '1.0.0',
          scope_type: 'ASSET', scope_id: 'btc',
          as_of: '2026-01-01T00:00:00Z',
          window_start: '2026-01-01T00:00:00Z',
          window_end: '2026-01-01T01:00:00Z',
          baseline_ref: null,
          surface_class: L6HistoricalSurfaceClass.LIVE_PROJECTED,
          validity_state: 'VALID', quality_state: 'HIGH',
          evidence_pack_ref: 'ev-1', compute_run_id: 'run-1',
          replay_hash: 'rh-1',
        }];
      },
      async fetchEventHistory() { return []; },
    };
    const svc = new L6HistoricalReadService(histBackend);
    const r = await svc.featureHistory({
      feature_id: 'feat.px',
      scope_type: 'ASSET', scope_id: 'btc',
      window_start: '2026-01-01T00:00:00Z',
      window_end: '2026-01-01T23:59:59Z',
    }, L6ConsumerClass.LATER_LAYER);
    assert(r.ok, 'E.15 — historical-read service legal path');
    assert(r.rows.length === 1, 'E.16 — returned tagged rows');

    const badBackend = {
      async fetchFeatureHistory() {
        return [{
          feature_id: 'feat.px', feature_version: '1.0.0',
          scope_type: 'ASSET', scope_id: 'btc',
          as_of: '2026-01-01T00:00:00Z',
          window_start: null, window_end: null, baseline_ref: null,
          surface_class: undefined as unknown as L6HistoricalSurfaceClass,
          validity_state: 'VALID', quality_state: 'HIGH',
          evidence_pack_ref: null, compute_run_id: 'run-1',
          replay_hash: 'rh-1',
        }];
      },
      async fetchEventHistory() { return []; },
    };
    const svc2 = new L6HistoricalReadService(badBackend);
    const r2 = await svc2.featureHistory({
      feature_id: 'feat.px', scope_type: 'ASSET', scope_id: 'btc',
      window_start: '2026-01-01T00:00:00Z', window_end: '2026-01-01T23:59:59Z',
    }, L6ConsumerClass.LATER_LAYER);
    assert(!r2.ok, 'E.17 — historical-read blocks ambiguous rows');
  }

  {
    const index = new L6InMemoryEvidenceIndex();
    const pack = buildLegalEvidencePack('ev-E1');
    index.register(pack);
    const svc = new L6EvidenceReadService(index, {
      findFeaturePack: () => 'ev-E1',
      findEventPack: () => null,
    });
    const r = svc.featureEvidenceBundle({
      feature_id: 'feat.px', scope_type: 'ASSET', scope_id: 'btc',
      as_of: '2026-01-01T00:00:00Z',
    }, L6ConsumerClass.LATER_LAYER);
    assert(r.ok, 'E.18 — feature evidence bundle resolvable');
    assert(r.pack !== null, 'E.19 — pack returned');

    const r2 = svc.eventEvidencePack({ event_instance_id: 'inst-1' }, L6ConsumerClass.LATER_LAYER);
    assert(!r2.ok && r2.pack === null, 'E.20 — missing event evidence returns not-ok');
  }

  {
    const svc = new L6ComputeRunReadService({
      async fetchLineage(req) {
        return {
          compute_run_id: req.compute_run_id,
          mode: 'LIVE', trigger_source: 'scheduler',
          parent_run_id: null, definition_version_set: ['feat.px@1.0.0'],
          affected_scopes: ['ASSET:btc'], outputs_emitted: 1, failures: 0,
          evidence_refs: ['ev-1'],
          started_at: '2026-01-01T00:00:00Z',
          completed_at: '2026-01-01T00:00:01Z',
        };
      },
    });
    const r = await svc.lineage({ compute_run_id: 'run-1' }, L6ConsumerClass.GOVERNED_AUDIT);
    assert(r.ok, 'E.21 — compute-run lineage service legal path');
    assert(r.lineage?.compute_run_id === 'run-1', 'E.22 — lineage echoes run id');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BAND F — Later-layer consumption, invariants, audit
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n═══ BAND F: Invariants and Audit ═══');

  assert(ALL_CURRENT_AUTHORITY_CLASSES.length === 2, 'F.1 — 2 current authority classes');
  assert(!isShadowAuthority(L6CurrentAuthorityClass.POSTGRES_AUTHORITY),
    'F.2 — Postgres authority is not shadow');
  assert(!isShadowAuthority(L6CurrentAuthorityClass.REDIS_ACCELERATED),
    'F.3 — Redis accelerated is recognized');
  assert(isShadowAuthority('MEMCACHE' as unknown as L6CurrentAuthorityClass),
    'F.4 — unknown store detected as shadow');

  {
    const v = new CurrentStateAuthorityValidator();

    const redisShadow = v.validateRedisCache({
      key: 'l6:current:feat.px:btc',
      reconstructable_from_postgres: true,
      reconstructable_from_object_store: false,
      tagged_cache_only: false,
      claimed_authoritative: true,
    });
    assert(!redisShadow.ok, 'F.5 — redis shadow authority blocked');
    assert(redisShadow.violations.some(x =>
      x.code === L6PersistenceViolationCode.REDIS_SHADOW_AUTHORITY),
      'F.6 — REDIS_SHADOW_AUTHORITY code emitted');

    const redisOk = v.validateRedisCache({
      key: 'l6:current:feat.px:btc',
      reconstructable_from_postgres: true,
      reconstructable_from_object_store: true,
      tagged_cache_only: true,
      claimed_authoritative: false,
    });
    assert(redisOk.ok, 'F.7 — legal redis cache accepted');
  }

  {
    const v = new CurrentStateAuthorityValidator();

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
    assert(!replayAsLive.ok, 'F.8 — replay overwriting current as live blocked');
    assert(replayAsLive.violations.some(x =>
      x.code === L6PersistenceViolationCode.REPLAY_AS_LIVE_CURRENT),
      'F.9 — REPLAY_AS_LIVE_CURRENT code emitted');

    const repairUntagged = v.validate({
      primitive_id: 'feat.px', primitive_version: '1.0.0',
      scope_type: 'ASSET', scope_id: 'btc',
      authority_class: L6CurrentAuthorityClass.POSTGRES_AUTHORITY,
      materialization_mode: L6MaterializationMode.REPAIR_MATERIALIZATION,
      contract_version: '1.0.0',
      definition_rollout_active: true, contract_validated: true,
      temporal_legality_passed: true, manifest_id: 'mfst-1',
      prior_as_of: '2026-01-01T00:00:00Z', new_as_of: '2026-01-01T00:00:05Z',
      prior_replay_hash: 'rh-prior', new_replay_hash: 'rh-new',
      supersession: {
        prior_row_id: 'row-prior',
        superseded_at: '2026-01-01T00:00:05Z',
        reason: L6SupersessionReason.LIVE_ADVANCE,
        materialization_mode: L6MaterializationMode.REPAIR_MATERIALIZATION,
        prior_replay_hash: 'rh-prior',
        new_replay_hash: 'rh-new',
      },
    });
    assert(!repairUntagged.ok, 'F.10 — repair overwriting current without repair tag blocked');
    assert(repairUntagged.violations.some(x =>
      x.code === L6PersistenceViolationCode.REPAIR_WITHOUT_TAG),
      'F.11 — REPAIR_WITHOUT_TAG code emitted');

    const outOfOrder = v.validate({
      primitive_id: 'feat.px', primitive_version: '1.0.0',
      scope_type: 'ASSET', scope_id: 'btc',
      authority_class: L6CurrentAuthorityClass.POSTGRES_AUTHORITY,
      materialization_mode: L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION,
      contract_version: '1.0.0',
      definition_rollout_active: true, contract_validated: true,
      temporal_legality_passed: true, manifest_id: 'mfst-1',
      prior_as_of: '2026-01-01T01:00:00Z', new_as_of: '2026-01-01T00:00:00Z',
      prior_replay_hash: 'rh-prior', new_replay_hash: 'rh-new',
      supersession: {
        prior_row_id: 'row-prior',
        superseded_at: '2026-01-01T01:00:00Z',
        reason: L6SupersessionReason.LATE_DATA_GOVERNED_REMATERIALIZATION,
        materialization_mode: L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION,
        prior_replay_hash: 'rh-prior',
        new_replay_hash: 'rh-new',
      },
    });
    assert(!outOfOrder.ok, 'F.12 — supersession out of temporal order blocked');
  }

  {
    clearPersistenceAuditLog();
    emitPersistenceAudit(
      { code: L6PersistenceViolationCode.DIRECT_STORE_WRITE, field: 'bypass', detail: 'direct' },
      { primitive_id: 'feat.px', compute_run_id: 'run-1', surface: L6DurableSurfaceId.FEATURE_CURRENT_REGISTRY },
    );
    emitPersistenceAudit(
      { code: L6PersistenceViolationCode.REDIS_SHADOW_AUTHORITY, field: 'redis', detail: 'shadow' },
      { compute_run_id: 'run-1', trace_id: 'trc-1' },
    );
    emitPersistenceAudit(
      { code: L6PersistenceViolationCode.AMBIGUOUS_READ_MODE, field: 'mode', detail: 'amb' },
      { compute_run_id: 'run-2' },
    );

    const all = getPersistenceAuditLog();
    assert(all.length === 3, 'F.13 — 3 audit records');
    const fatals = all.filter(r => r.severity === L6PersistenceAuditSeverity.FATAL);
    assert(fatals.length === 2, 'F.14 — 2 FATAL-severity audits');

    const byCode = findPersistenceAuditsByCode(L6PersistenceViolationCode.DIRECT_STORE_WRITE);
    assert(byCode.length === 1, 'F.15 — find by code returns matching audit');
    const byRun = findPersistenceAuditsByRun('run-1');
    assert(byRun.length === 2, 'F.16 — find by run returns matching audits');
    const bySurface = findPersistenceAuditsBySurface(L6DurableSurfaceId.FEATURE_CURRENT_REGISTRY);
    assert(bySurface.length === 1, 'F.17 — find by surface returns matching audit');
    clearPersistenceAuditLog();
  }

  {
    const results = checkAllL6_7Invariants();
    assert(results.length === 7, 'F.18 — 7 invariant results');
    for (const r of results) {
      assert(r.holds, `F.19 — ${r.id} holds (${r.evidence})`);
    }
    assert(checkINV_67_A().holds, 'F.20 — INV-6.7-A holds');
    assert(checkINV_67_B().holds, 'F.21 — INV-6.7-B holds');
    assert(checkINV_67_C().holds, 'F.22 — INV-6.7-C holds');
    assert(checkINV_67_D().holds, 'F.23 — INV-6.7-D holds');
    assert(checkINV_67_E().holds, 'F.24 — INV-6.7-E holds');
    assert(checkINV_67_F().holds, 'F.25 — INV-6.7-F holds');
    assert(checkINV_67_G().holds, 'F.26 — INV-6.7-G holds');
  }

  const elapsed = Date.now() - t0;
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`L6.7 CERTIFICATION: ${passed} passed / ${failed} failed (${elapsed}ms)`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
