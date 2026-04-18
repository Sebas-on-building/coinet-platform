/**
 * L5.2 — Core Doctrine and Authority Model
 *
 * Certification Test Suite
 *
 * 6 Bands, ~210 assertions:
 *   A — Authority Allocation
 *   B — Projection Legality
 *   C — Manifest Lifecycle
 *   D — Loss Semantics
 *   E — Repair Law
 *   F — Shadow Authority and Anti-Fake
 */

import {
  L5StateClass,
  ALL_STATE_CLASSES,
  classifyL5WritePurpose,
  type L5WriteDomain,
  ALL_WRITE_DOMAINS,
  getDomainsForStateClass,
  resetStateClassRegistry,
  type L5PurposeClassification,
} from '../l5/purpose';

import {
  L5AuthorityStore,
  ALL_AUTHORITY_STORES,
  L5AuthorityTier,
  ALL_AUTHORITY_TIERS,
  L5ProjectionCategory,
  ALL_PROJECTION_CATEGORIES,
  L5RepairabilityClass,
  ALL_REPAIRABILITY_CLASSES,
  L5AuthorityErrorCode,
  L5AuthorityError,
  ManifestState,
  ALL_MANIFEST_STATES,
  TERMINAL_STATES,

  // Allocation
  allocateL5Authority,
  validateStoreClassLegality,
  getLegalPrimaryStore,
  type L5AuthorityAllocation,

  // Projection
  detectShadowAuthorityRisk,
  validateProjectionPlan,
  registerProjection,
  getProjection,
  getProjectionsForDatumFamily,
  resetProjectionRegistry,
  type ShadowAuthorityCheckInput,

  // Manifest
  isTerminal,
  isLegalTransition,
  getLegalTransitions,
  createManifest,
  transitionManifest,
  validateFinalization,
  getManifest,
  resetManifestRegistry,
  type ManifestRecord,

  // Loss
  getStoreLossConsequence,
  assessLossImpact,
  isRedisLossTruthLoss,

  // Invariants
  assertL5AuthorityInvariant,
  assertAllAuthorityInvariants,
  enforceAllAuthorityInvariants,
  ALL_AUTHORITY_INVARIANT_IDS,
  type AuthorityInvariantContext,

  // Registry
  declareAuthorityHome,
  getAuthorityHome,
  hasAuthorityHome,
  isAuthorityHomeFor,
  resetAuthorityRegistry,

  // Evaluator
  evaluateL5Authority,
  dryRunL5Authority,

  // Tier/Category helpers
  isAuthorityTier,
  isProjectionTier,
  isRepairable,
  requiresHumanReview,
  isCriticalRepair,
  isRequiredProjectionCategory,

  // Store profile
  getStoreSovereigntyProfile,
} from '../l5/authority';

// ═══════════════════════════════════════════════════════════════════════════════
// HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function banner(text: string): void {
  console.log(`\n${'═'.repeat(72)}\n  ${text}\n${'═'.repeat(72)}`);
}

function suiteHeader(text: string): void {
  console.log(`\n  ── ${text} ──`);
}

function resetAll(): void {
  resetProjectionRegistry();
  resetManifestRegistry();
  resetAuthorityRegistry();
  resetStateClassRegistry();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function classifyDomain(domain: L5WriteDomain): L5PurposeClassification {
  return classifyL5WritePurpose({ writeDomain: domain });
}

function makeManifest(overrides: Partial<ManifestRecord> = {}): ManifestRecord {
  return {
    manifestId: overrides.manifestId ?? `mf_${Date.now()}`,
    state: ManifestState.DECLARED,
    intendedAuthorityStore: overrides.intendedAuthorityStore ?? 'POSTGRES',
    intendedRequiredProjections: overrides.intendedRequiredProjections ?? [],
    intendedOptionalProjections: overrides.intendedOptionalProjections ?? [],
    archiveRequired: overrides.archiveRequired ?? false,
    archiveWritten: overrides.archiveWritten ?? false,
    primaryAuthorityCommitted: overrides.primaryAuthorityCommitted ?? false,
    requiredProjectionsComplete: overrides.requiredProjectionsComplete ?? false,
    optionalProjectionsComplete: overrides.optionalProjectionsComplete ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failureReason: null,
    traceId: overrides.traceId ?? 'trace_test',
    schemaVersion: overrides.schemaVersion ?? '1.0.0',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND A — AUTHORITY ALLOCATION
// ═══════════════════════════════════════════════════════════════════════════════

function bandA(): void {
  banner('BAND A — Authority Allocation');
  resetAll();

  suiteHeader('A1: Legal primary store per state class');

  assert(getLegalPrimaryStore(L5StateClass.RELATIONAL_AUTHORITY) === L5AuthorityStore.POSTGRES,
    'Relational authority → Postgres');
  assert(getLegalPrimaryStore(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY) === L5AuthorityStore.CLICKHOUSE,
    'Time-series → ClickHouse');
  assert(getLegalPrimaryStore(L5StateClass.EPHEMERAL_HOT_STATE) === L5AuthorityStore.REDIS,
    'Ephemeral → Redis');
  assert(getLegalPrimaryStore(L5StateClass.IMMUTABLE_ARCHIVE_STATE) === L5AuthorityStore.OBJECT_STORAGE,
    'Archive → Object Storage');

  suiteHeader('A2: Allocation engine for each state class');

  const relAlloc = allocateL5Authority(classifyDomain('CANONICAL_RECORD'));
  assert(relAlloc.primaryAuthorityStore === L5AuthorityStore.POSTGRES, 'Canonical record → Postgres primary');
  assert(relAlloc.primaryStateClass === L5StateClass.RELATIONAL_AUTHORITY, 'Canonical record → relational class');
  assert(relAlloc.authorityTier === L5AuthorityTier.PRIMARY_AUTHORITY, 'Canonical record → primary authority tier');
  assert(relAlloc.lossSemanticsCode === 'LOSS_DURABLE_TRUTH', 'Canonical record → durable truth loss semantics');

  const tsAlloc = allocateL5Authority(classifyDomain('PRICE_HISTORY'));
  assert(tsAlloc.primaryAuthorityStore === L5AuthorityStore.CLICKHOUSE, 'Price history → ClickHouse primary');
  assert(tsAlloc.primaryStateClass === L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY, 'Price history → time-series class');
  assert(tsAlloc.lossSemanticsCode === 'LOSS_ANALYTICAL_HISTORY', 'Price history → analytical loss semantics');

  const ephAlloc = allocateL5Authority(classifyDomain('ALERT_COOLDOWN'));
  assert(ephAlloc.primaryAuthorityStore === L5AuthorityStore.REDIS, 'Alert cooldown → Redis primary');
  assert(ephAlloc.primaryStateClass === L5StateClass.EPHEMERAL_HOT_STATE, 'Alert cooldown → ephemeral class');
  assert(ephAlloc.lossSemanticsCode === 'LOSS_SPEED_ONLY', 'Alert cooldown → speed-only loss semantics');

  const archAlloc = allocateL5Authority(classifyDomain('RAW_SOURCE_PAYLOAD'));
  assert(archAlloc.primaryAuthorityStore === L5AuthorityStore.OBJECT_STORAGE, 'Raw payload → Object Storage primary');
  assert(archAlloc.authorityTier === L5AuthorityTier.IMMUTABLE_EVIDENCE_AUTHORITY, 'Raw payload → evidence authority tier');
  assert(archAlloc.archiveRequired === true, 'Raw payload → archive required');
  assert(archAlloc.lossSemanticsCode === 'LOSS_EVIDENCE_COMPLETENESS', 'Raw payload → evidence loss semantics');

  suiteHeader('A3: Illegal authority combinations reject');

  let threw = false;
  try { validateStoreClassLegality(L5StateClass.RELATIONAL_AUTHORITY, L5AuthorityStore.REDIS); } catch (e: any) {
    threw = true;
    assert(e instanceof L5AuthorityError, 'Throws L5AuthorityError for Redis as relational authority');
    assert(e.code === L5AuthorityErrorCode.ILLEGAL_AUTHORITY_STORE, 'Error code: ILLEGAL_AUTHORITY_STORE');
  }
  assert(threw, 'Redis rejected for relational authority');

  threw = false;
  try { validateStoreClassLegality(L5StateClass.RELATIONAL_AUTHORITY, L5AuthorityStore.CLICKHOUSE); } catch { threw = true; }
  assert(threw, 'ClickHouse rejected for relational authority');

  threw = false;
  try { validateStoreClassLegality(L5StateClass.EPHEMERAL_HOT_STATE, L5AuthorityStore.POSTGRES); } catch { threw = true; }
  assert(threw, 'Postgres rejected for ephemeral state');

  threw = false;
  try { validateStoreClassLegality(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY, L5AuthorityStore.POSTGRES); } catch { threw = true; }
  assert(threw, 'Postgres rejected for time-series authority');

  threw = false;
  try { validateStoreClassLegality(L5StateClass.IMMUTABLE_ARCHIVE_STATE, L5AuthorityStore.REDIS); } catch { threw = true; }
  assert(threw, 'Redis rejected for archive authority');

  suiteHeader('A4: Every write domain allocates without error');

  let allocationErrors = 0;
  for (const domain of ALL_WRITE_DOMAINS) {
    try {
      const c = classifyDomain(domain);
      allocateL5Authority(c, domain);
    } catch {
      allocationErrors++;
    }
  }
  assert(allocationErrors === 0, `All ${ALL_WRITE_DOMAINS.length} domains allocate cleanly`);

  suiteHeader('A5: Manifest required when projections or archive exist');

  const scoreRegAlloc = allocateL5Authority(classifyDomain('SCORE_REGISTRY'));
  assert(scoreRegAlloc.manifestRequired === true, 'Score registry needs manifest (has projections)');

  const reportRegAlloc = allocateL5Authority(classifyDomain('REPORT_REGISTRY'));
  assert(reportRegAlloc.manifestRequired === true, 'Report registry needs manifest (archive required)');

  const watchAlloc = allocateL5Authority(classifyDomain('WATCHLIST'));
  assert(watchAlloc.manifestRequired === false, 'Watchlist needs no manifest (no projections/archive)');

  const cooldownAlloc = allocateL5Authority(classifyDomain('ALERT_COOLDOWN'));
  assert(cooldownAlloc.manifestRequired === false, 'Alert cooldown needs no manifest');

  suiteHeader('A6: Projection targets from L5.1 flow into allocation');

  assert(scoreRegAlloc.requiredProjections.length > 0 || scoreRegAlloc.optionalProjections.length > 0,
    'Score registry has projections');
  const chProjection = scoreRegAlloc.requiredProjections.find(p => p.store === L5AuthorityStore.CLICKHOUSE);
  assert(!!chProjection, 'Score registry has ClickHouse analytical projection');

  suiteHeader('A7: Store sovereignty profiles');

  const pgProfile = getStoreSovereigntyProfile(L5AuthorityStore.POSTGRES);
  assert(pgProfile.isDurable === true, 'Postgres is durable');
  assert(pgProfile.supportsTransactions === true, 'Postgres supports transactions');
  assert(pgProfile.lossConsequenceClass === 'DURABLE_TRUTH_LOSS', 'Postgres loss → durable truth loss');

  const redisProfile = getStoreSovereigntyProfile(L5AuthorityStore.REDIS);
  assert(redisProfile.isDurable === false, 'Redis is not durable');
  assert(redisProfile.lossConsequenceClass === 'EPHEMERAL_SPEED_DEGRADATION', 'Redis loss → speed degradation');

  const chProfile = getStoreSovereigntyProfile(L5AuthorityStore.CLICKHOUSE);
  assert(chProfile.supportsRangeScan === true, 'ClickHouse supports range scan');
  assert(chProfile.lossConsequenceClass === 'ANALYTICAL_HISTORY_LOSS', 'ClickHouse loss → analytical history loss');

  const osProfile = getStoreSovereigntyProfile(L5AuthorityStore.OBJECT_STORAGE);
  assert(osProfile.supportsImmutability === true, 'Object storage supports immutability');
  assert(osProfile.lossConsequenceClass === 'EVIDENCE_COMPLETENESS_LOSS', 'Object storage loss → evidence loss');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND B — PROJECTION LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

function bandB(): void {
  banner('BAND B — Projection Legality');
  resetAll();

  suiteHeader('B1: Required vs optional projections distinguish correctly');

  const alloc = allocateL5Authority(classifyDomain('SCORE_REGISTRY'));
  for (const rp of alloc.requiredProjections) {
    assert(rp.required === true, `Required projection '${rp.reason}' has required=true`);
    assert(rp.idempotent === true, `Required projection '${rp.reason}' is idempotent`);
    assert(rp.lineageRequired === true, `Required projection '${rp.reason}' requires lineage`);
  }
  for (const op of alloc.optionalProjections) {
    assert(op.required === false, `Optional projection '${op.reason}' has required=false`);
  }

  suiteHeader('B2: Projection plan validation');

  const validPlan = {
    store: L5AuthorityStore.REDIS, category: L5ProjectionCategory.ACCELERATION,
    reason: 'hot cache', required: false, idempotent: true, lineageRequired: false,
  };
  const v1 = validateProjectionPlan(validPlan, L5AuthorityStore.POSTGRES);
  assert(v1.valid === true, 'Valid projection plan passes');
  assert(v1.violations.length === 0, 'No violations for valid plan');

  const samStorePlan = {
    store: L5AuthorityStore.POSTGRES, category: L5ProjectionCategory.ACCELERATION,
    reason: 'bad', required: false, idempotent: true, lineageRequired: false,
  };
  const v2 = validateProjectionPlan(samStorePlan, L5AuthorityStore.POSTGRES);
  assert(v2.valid === false, 'Projection to same store as authority is invalid');
  assert(v2.violations.some(v => v.includes('same store')), 'Violation mentions same store');

  const nonIdempotentRequired = {
    store: L5AuthorityStore.CLICKHOUSE, category: L5ProjectionCategory.ANALYTICAL,
    reason: 'bad', required: true, idempotent: false, lineageRequired: true,
  };
  const v3 = validateProjectionPlan(nonIdempotentRequired, L5AuthorityStore.POSTGRES);
  assert(v3.valid === false, 'Non-idempotent required projection is invalid');

  const noLineageRequired = {
    store: L5AuthorityStore.CLICKHOUSE, category: L5ProjectionCategory.ANALYTICAL,
    reason: 'bad', required: true, idempotent: true, lineageRequired: false,
  };
  const v4 = validateProjectionPlan(noLineageRequired, L5AuthorityStore.POSTGRES);
  assert(v4.valid === false, 'Required projection without lineage is invalid');

  suiteHeader('B3: Projection category helper');

  assert(isRequiredProjectionCategory(L5ProjectionCategory.AUTHORITY_ADJACENT_REQUIRED) === true,
    'AUTHORITY_ADJACENT_REQUIRED is required category');
  assert(isRequiredProjectionCategory(L5ProjectionCategory.ACCELERATION) === false,
    'ACCELERATION is not required category');
  assert(isRequiredProjectionCategory(L5ProjectionCategory.ANALYTICAL) === false,
    'ANALYTICAL is not required category');
  assert(isRequiredProjectionCategory(L5ProjectionCategory.PACKAGING) === false,
    'PACKAGING is not required category');

  suiteHeader('B4: Projection registry');

  registerProjection({
    projectionId: 'proj_score_redis',
    sourceAuthorityStore: L5AuthorityStore.POSTGRES,
    targetStore: L5AuthorityStore.REDIS,
    category: L5ProjectionCategory.ACCELERATION,
    tier: L5AuthorityTier.OPTIONAL_PROJECTION,
    datumFamily: 'score_current',
    isLagging: false,
    lastSyncedAt: new Date().toISOString(),
    lineageRef: 'score_reg_v1',
  });

  assert(!!getProjection('proj_score_redis'), 'Registered projection retrievable');
  assert(getProjectionsForDatumFamily('score_current').length === 1, 'Family lookup works');
  assert(getProjectionsForDatumFamily('nonexistent').length === 0, 'Empty family returns empty');

  suiteHeader('B5: Authority tier classification');

  assert(isAuthorityTier(L5AuthorityTier.PRIMARY_AUTHORITY) === true, 'PRIMARY_AUTHORITY is authority');
  assert(isAuthorityTier(L5AuthorityTier.IMMUTABLE_EVIDENCE_AUTHORITY) === true, 'IMMUTABLE_EVIDENCE is authority');
  assert(isAuthorityTier(L5AuthorityTier.MANIFEST_AUTHORITY) === true, 'MANIFEST is authority');
  assert(isProjectionTier(L5AuthorityTier.REQUIRED_PROJECTION) === true, 'REQUIRED_PROJECTION is projection');
  assert(isProjectionTier(L5AuthorityTier.OPTIONAL_PROJECTION) === true, 'OPTIONAL_PROJECTION is projection');
  assert(isProjectionTier(L5AuthorityTier.PRIMARY_AUTHORITY) === false, 'PRIMARY_AUTHORITY is not projection');

  suiteHeader('B6: All enum values present');

  assert(ALL_AUTHORITY_TIERS.length === 5, '5 authority tiers');
  assert(ALL_AUTHORITY_STORES.length === 4, '4 authority stores');
  assert(ALL_PROJECTION_CATEGORIES.length === 4, '4 projection categories');
  assert(ALL_REPAIRABILITY_CLASSES.length === 6, '6 repairability classes');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND C — MANIFEST LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

function bandC(): void {
  banner('BAND C — Manifest Lifecycle');
  resetAll();

  suiteHeader('C1: Legal happy-path transition sequence');

  const m = createManifest(makeManifest({ manifestId: 'mf_happy', archiveRequired: true, intendedRequiredProjections: ['ch_history'] }));
  assert(m.state === ManifestState.DECLARED, 'Created in DECLARED');

  transitionManifest('mf_happy', ManifestState.ARCHIVE_PENDING);
  assert(getManifest('mf_happy')!.state === ManifestState.ARCHIVE_PENDING, '→ ARCHIVE_PENDING');

  transitionManifest('mf_happy', ManifestState.ARCHIVE_WRITTEN);
  assert(getManifest('mf_happy')!.state === ManifestState.ARCHIVE_WRITTEN, '→ ARCHIVE_WRITTEN');

  transitionManifest('mf_happy', ManifestState.PRIMARY_AUTHORITY_COMMITTED);
  assert(getManifest('mf_happy')!.state === ManifestState.PRIMARY_AUTHORITY_COMMITTED, '→ PRIMARY_AUTHORITY_COMMITTED');

  transitionManifest('mf_happy', ManifestState.REQUIRED_PROJECTIONS_PENDING);
  assert(getManifest('mf_happy')!.state === ManifestState.REQUIRED_PROJECTIONS_PENDING, '→ REQUIRED_PROJECTIONS_PENDING');

  transitionManifest('mf_happy', ManifestState.REQUIRED_PROJECTIONS_PARTIAL);
  assert(getManifest('mf_happy')!.state === ManifestState.REQUIRED_PROJECTIONS_PARTIAL, '→ REQUIRED_PROJECTIONS_PARTIAL');

  transitionManifest('mf_happy', ManifestState.REQUIRED_PROJECTIONS_COMPLETE);
  assert(getManifest('mf_happy')!.state === ManifestState.REQUIRED_PROJECTIONS_COMPLETE, '→ REQUIRED_PROJECTIONS_COMPLETE');

  transitionManifest('mf_happy', ManifestState.OPTIONAL_PROJECTIONS_PARTIAL);
  assert(getManifest('mf_happy')!.state === ManifestState.OPTIONAL_PROJECTIONS_PARTIAL, '→ OPTIONAL_PROJECTIONS_PARTIAL');

  transitionManifest('mf_happy', ManifestState.FINALIZED);
  assert(getManifest('mf_happy')!.state === ManifestState.FINALIZED, '→ FINALIZED');
  assert(isTerminal(ManifestState.FINALIZED), 'FINALIZED is terminal');

  suiteHeader('C2: Illegal transitions reject');

  const m2 = createManifest(makeManifest({ manifestId: 'mf_illegal' }));
  let threw = false;
  try { transitionManifest('mf_illegal', ManifestState.FINALIZED); } catch (e: any) {
    threw = true;
    assert(e instanceof L5AuthorityError, 'Throws L5AuthorityError');
    assert(e.code === L5AuthorityErrorCode.ILLEGAL_MANIFEST_TRANSITION, 'Error code: ILLEGAL_MANIFEST_TRANSITION');
  }
  assert(threw, 'DECLARED → FINALIZED is illegal (needs authority commit first)');

  threw = false;
  try { transitionManifest('mf_illegal', ManifestState.REQUIRED_PROJECTIONS_COMPLETE); } catch { threw = true; }
  assert(threw, 'DECLARED → REQUIRED_PROJECTIONS_COMPLETE is illegal');

  suiteHeader('C3: Terminal states cannot transition');

  const m3 = createManifest(makeManifest({ manifestId: 'mf_term' }));
  transitionManifest('mf_term', ManifestState.QUARANTINED);
  assert(isTerminal(ManifestState.QUARANTINED), 'QUARANTINED is terminal');

  threw = false;
  try { transitionManifest('mf_term', ManifestState.DECLARED); } catch { threw = true; }
  assert(threw, 'Cannot transition from QUARANTINED');

  assert(isTerminal(ManifestState.FAILED_FATAL), 'FAILED_FATAL is terminal');
  assert(!isTerminal(ManifestState.FAILED_RETRYABLE), 'FAILED_RETRYABLE is not terminal');

  suiteHeader('C4: Retryable failure can re-enter');

  const m4 = createManifest(makeManifest({ manifestId: 'mf_retry' }));
  transitionManifest('mf_retry', ManifestState.FAILED_RETRYABLE);
  transitionManifest('mf_retry', ManifestState.DECLARED);
  assert(getManifest('mf_retry')!.state === ManifestState.DECLARED, 'FAILED_RETRYABLE → DECLARED allowed');

  suiteHeader('C5: Finalization validation');

  const mf5 = makeManifest({
    manifestId: 'mf_val',
    archiveRequired: true,
    archiveWritten: false,
    primaryAuthorityCommitted: true,
    intendedRequiredProjections: ['ch'],
    requiredProjectionsComplete: true,
  });
  const v5 = validateFinalization(mf5);
  assert(v5.legal === false, 'Cannot finalize without archive written');
  assert(v5.violations.some(v => v.includes('Archive')), 'Violation mentions archive');

  const mf6 = makeManifest({
    manifestId: 'mf_val2',
    archiveRequired: false,
    primaryAuthorityCommitted: false,
    requiredProjectionsComplete: true,
  });
  const v6 = validateFinalization(mf6);
  assert(v6.legal === false, 'Cannot finalize without primary authority committed');

  const mf7 = makeManifest({
    manifestId: 'mf_val3',
    archiveRequired: false,
    primaryAuthorityCommitted: true,
    intendedRequiredProjections: ['ch'],
    requiredProjectionsComplete: false,
  });
  const v7 = validateFinalization(mf7);
  assert(v7.legal === false, 'Cannot finalize with incomplete required projections');

  const mf8 = makeManifest({
    manifestId: 'mf_val4',
    archiveRequired: true,
    archiveWritten: true,
    primaryAuthorityCommitted: true,
    intendedRequiredProjections: ['ch'],
    requiredProjectionsComplete: true,
  });
  const v8 = validateFinalization(mf8);
  assert(v8.legal === true, 'Fully complete manifest is finalizable');
  assert(v8.violations.length === 0, 'No violations for complete manifest');

  suiteHeader('C6: All manifest states enumerated');

  assert(ALL_MANIFEST_STATES.length === 12, '12 manifest states');
  assert(TERMINAL_STATES.length === 3, '3 terminal states');

  suiteHeader('C7: Cannot create manifest in non-DECLARED state');

  threw = false;
  try {
    const bad = makeManifest({ manifestId: 'mf_bad_start' });
    (bad as any).state = ManifestState.FINALIZED;
    createManifest(bad);
  } catch (e: any) {
    threw = true;
    assert(e.code === L5AuthorityErrorCode.ILLEGAL_MANIFEST_TRANSITION, 'Error code on bad create');
  }
  assert(threw, 'Cannot create manifest in non-DECLARED state');

  suiteHeader('C8: Short-path finalization (no archive, no projections)');

  const mfShort = createManifest(makeManifest({
    manifestId: 'mf_short',
    archiveRequired: false,
    intendedRequiredProjections: [],
  }));
  transitionManifest('mf_short', ManifestState.PRIMARY_AUTHORITY_COMMITTED);
  transitionManifest('mf_short', ManifestState.FINALIZED);
  assert(getManifest('mf_short')!.state === ManifestState.FINALIZED, 'Short-path finalization succeeds');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND D — LOSS SEMANTICS
// ═══════════════════════════════════════════════════════════════════════════════

function bandD(): void {
  banner('BAND D — Loss Semantics');
  resetAll();

  suiteHeader('D1: Per-store loss consequence profiles');

  const pgLoss = getStoreLossConsequence(L5AuthorityStore.POSTGRES);
  assert(pgLoss.severity === 'CRITICAL', 'Postgres loss → CRITICAL');
  assert(pgLoss.isDurableTruthLoss === true, 'Postgres loss → durable truth loss');
  assert(pgLoss.isEvidenceLoss === false, 'Postgres loss is not evidence loss');

  const chLoss = getStoreLossConsequence(L5AuthorityStore.CLICKHOUSE);
  assert(chLoss.severity === 'SEVERE', 'ClickHouse loss → SEVERE');
  assert(chLoss.isAnalyticalHistoryLoss === true, 'ClickHouse loss → analytical history loss');
  assert(chLoss.isDurableTruthLoss === false, 'ClickHouse loss is not durable truth loss');

  const redisLoss = getStoreLossConsequence(L5AuthorityStore.REDIS);
  assert(redisLoss.severity === 'MINOR', 'Redis loss → MINOR');
  assert(redisLoss.isDurableTruthLoss === false, 'Redis loss is NOT durable truth loss');
  assert(redisLoss.isSpeedDegradation === true, 'Redis loss → speed degradation');

  const osLoss = getStoreLossConsequence(L5AuthorityStore.OBJECT_STORAGE);
  assert(osLoss.severity === 'SEVERE', 'Object storage loss → SEVERE');
  assert(osLoss.isEvidenceLoss === true, 'Object storage loss → evidence loss');

  suiteHeader('D2: Redis loss never counts as durable truth loss for non-ephemeral');

  assert(isRedisLossTruthLoss(L5StateClass.RELATIONAL_AUTHORITY) === false,
    'Redis loss not truth loss for relational authority');
  assert(isRedisLossTruthLoss(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY) === false,
    'Redis loss not truth loss for time-series');
  assert(isRedisLossTruthLoss(L5StateClass.IMMUTABLE_ARCHIVE_STATE) === false,
    'Redis loss not truth loss for archive');
  assert(isRedisLossTruthLoss(L5StateClass.EPHEMERAL_HOT_STATE) === true,
    'Redis loss IS truth loss for ephemeral (its primary store)');

  suiteHeader('D3: Loss impact assessment — primary store loss');

  for (const sc of ALL_STATE_CLASSES) {
    const primaryStore = getLegalPrimaryStore(sc);
    const impact = assessLossImpact(sc, primaryStore);
    assert(impact.isPrimaryAuthorityLoss === true, `${sc}: losing primary store '${primaryStore}' is primary authority loss`);
    assert(impact.severity === 'CRITICAL', `${sc}: losing primary store is CRITICAL`);
  }

  suiteHeader('D4: Loss impact assessment — non-primary store loss');

  const relRedisImpact = assessLossImpact(L5StateClass.RELATIONAL_AUTHORITY, L5AuthorityStore.REDIS);
  assert(relRedisImpact.isPrimaryAuthorityLoss === false, 'Relational + Redis loss → not primary authority loss');
  assert(relRedisImpact.severity === 'MINOR', 'Relational + Redis loss → MINOR');

  const relChImpact = assessLossImpact(L5StateClass.RELATIONAL_AUTHORITY, L5AuthorityStore.CLICKHOUSE);
  assert(relChImpact.isPrimaryAuthorityLoss === false, 'Relational + ClickHouse loss → not primary authority loss');
  assert(relChImpact.severity === 'MODERATE', 'Relational + ClickHouse loss → MODERATE');

  const archPgImpact = assessLossImpact(L5StateClass.IMMUTABLE_ARCHIVE_STATE, L5AuthorityStore.POSTGRES);
  assert(archPgImpact.isPrimaryAuthorityLoss === false, 'Archive + Postgres loss → not primary (Postgres is projection)');
  assert(archPgImpact.severity === 'MODERATE', 'Archive + Postgres loss → MODERATE');

  suiteHeader('D5: Every store has a loss consequence');

  for (const store of ALL_AUTHORITY_STORES) {
    const lc = getStoreLossConsequence(store);
    assert(!!lc, `Store '${store}' has loss consequence`);
    assert(!!lc.description, `Store '${store}' loss has description`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND E — REPAIR LAW
// ═══════════════════════════════════════════════════════════════════════════════

function bandE(): void {
  banner('BAND E — Repair Law');
  resetAll();

  suiteHeader('E1: Repairability class properties');

  assert(isRepairable(L5RepairabilityClass.R0_NO_REPAIR_NEEDED) === true, 'R0 is repairable');
  assert(isRepairable(L5RepairabilityClass.R1_OPTIONAL_REPAIR) === true, 'R1 is repairable');
  assert(isRepairable(L5RepairabilityClass.R2_REQUIRED_PROJECTION_REPAIR) === true, 'R2 is repairable');
  assert(isRepairable(L5RepairabilityClass.R3_ARCHIVE_COMPLETENESS_REPAIR) === true, 'R3 is repairable');
  assert(isRepairable(L5RepairabilityClass.R4_QUARANTINE_REPAIR) === true, 'R4 is repairable');
  assert(isRepairable(L5RepairabilityClass.R5_FATAL_NON_REPAIRABLE) === false, 'R5 is NOT repairable');

  suiteHeader('E2: Human review required');

  assert(requiresHumanReview(L5RepairabilityClass.R4_QUARANTINE_REPAIR) === true, 'R4 requires human review');
  assert(requiresHumanReview(L5RepairabilityClass.R0_NO_REPAIR_NEEDED) === false, 'R0 does not require human review');
  assert(requiresHumanReview(L5RepairabilityClass.R2_REQUIRED_PROJECTION_REPAIR) === false, 'R2 does not require human review');

  suiteHeader('E3: Critical repair classification');

  assert(isCriticalRepair(L5RepairabilityClass.R3_ARCHIVE_COMPLETENESS_REPAIR) === true, 'R3 is critical');
  assert(isCriticalRepair(L5RepairabilityClass.R4_QUARANTINE_REPAIR) === true, 'R4 is critical');
  assert(isCriticalRepair(L5RepairabilityClass.R5_FATAL_NON_REPAIRABLE) === true, 'R5 is critical');
  assert(isCriticalRepair(L5RepairabilityClass.R0_NO_REPAIR_NEEDED) === false, 'R0 is not critical');
  assert(isCriticalRepair(L5RepairabilityClass.R1_OPTIONAL_REPAIR) === false, 'R1 is not critical');

  suiteHeader('E4: Authority mutation during repair rejected (INV-5.2-I)');

  const invI = assertL5AuthorityInvariant('INV-5.2-I', { repairAttemptingAuthorityMutation: true });
  assert(invI.passed === false, 'INV-5.2-I fails when repair mutates authority');
  assert(invI.reason.includes('mutating'), 'Reason mentions mutation');

  const invIOk = assertL5AuthorityInvariant('INV-5.2-I', { repairAttemptingAuthorityMutation: false });
  assert(invIOk.passed === true, 'INV-5.2-I passes when repair does not mutate authority');

  suiteHeader('E5: Archive completeness repair scenario');

  const mfRepair = createManifest(makeManifest({
    manifestId: 'mf_repair',
    archiveRequired: true,
    archiveWritten: false,
    primaryAuthorityCommitted: true,
    intendedRequiredProjections: [],
    requiredProjectionsComplete: true,
  }));

  const finVal = validateFinalization(mfRepair);
  assert(finVal.legal === false, 'Cannot finalize without archive — needs R3 repair');

  const mfRef = getManifest('mf_repair')!;
  mfRef.archiveWritten = true;
  const finVal2 = validateFinalization(mfRef);
  assert(finVal2.legal === true, 'After archive repair, finalization is legal');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND F — SHADOW AUTHORITY AND ANTI-FAKE
// ═══════════════════════════════════════════════════════════════════════════════

function bandF(): void {
  banner('BAND F — Shadow Authority and Anti-Fake');
  resetAll();

  suiteHeader('F1: Cache-as-truth detection');

  const cacheAsTruth: ShadowAuthorityCheckInput = {
    projectionStore: L5AuthorityStore.REDIS,
    projectionTier: L5AuthorityTier.OPTIONAL_PROJECTION,
    authorityStore: L5AuthorityStore.POSTGRES,
    isProjectionFresherThanAuthority: false,
    isProjectionUsedAsDirectTruthSource: true,
    hasLineageToAuthority: true,
    datumFamily: 'score_current',
  };
  assert(detectShadowAuthorityRisk(cacheAsTruth) === 'CACHE_AS_TRUTH', 'Redis used as direct truth → CACHE_AS_TRUTH');

  suiteHeader('F2: History-as-truth detection');

  const historyAsTruth: ShadowAuthorityCheckInput = {
    projectionStore: L5AuthorityStore.CLICKHOUSE,
    projectionTier: L5AuthorityTier.REQUIRED_PROJECTION,
    authorityStore: L5AuthorityStore.POSTGRES,
    isProjectionFresherThanAuthority: false,
    isProjectionUsedAsDirectTruthSource: true,
    hasLineageToAuthority: true,
    datumFamily: 'score_current',
  };
  assert(detectShadowAuthorityRisk(historyAsTruth) === 'HISTORY_AS_TRUTH', 'ClickHouse used as direct truth → HISTORY_AS_TRUTH');

  suiteHeader('F3: Blob-as-state detection');

  const blobAsState: ShadowAuthorityCheckInput = {
    projectionStore: L5AuthorityStore.OBJECT_STORAGE,
    projectionTier: L5AuthorityTier.OPTIONAL_PROJECTION,
    authorityStore: L5AuthorityStore.POSTGRES,
    isProjectionFresherThanAuthority: false,
    isProjectionUsedAsDirectTruthSource: true,
    hasLineageToAuthority: true,
    datumFamily: 'entity_state',
  };
  assert(detectShadowAuthorityRisk(blobAsState) === 'BLOB_AS_STATE', 'Object storage used as state truth → BLOB_AS_STATE');

  suiteHeader('F4: Projection fresher than authority detection');

  const fresherProjection: ShadowAuthorityCheckInput = {
    projectionStore: L5AuthorityStore.REDIS,
    projectionTier: L5AuthorityTier.OPTIONAL_PROJECTION,
    authorityStore: L5AuthorityStore.POSTGRES,
    isProjectionFresherThanAuthority: true,
    isProjectionUsedAsDirectTruthSource: false,
    hasLineageToAuthority: true,
    datumFamily: 'score_current',
  };
  assert(detectShadowAuthorityRisk(fresherProjection) === 'PROJECTION_FRESHER_THAN_AUTHORITY',
    'Fresher projection detected');

  suiteHeader('F5: Projection drift detection');

  const driftedProjection: ShadowAuthorityCheckInput = {
    projectionStore: L5AuthorityStore.REDIS,
    projectionTier: L5AuthorityTier.OPTIONAL_PROJECTION,
    authorityStore: L5AuthorityStore.POSTGRES,
    isProjectionFresherThanAuthority: false,
    isProjectionUsedAsDirectTruthSource: false,
    hasLineageToAuthority: false,
    datumFamily: 'score_current',
  };
  assert(detectShadowAuthorityRisk(driftedProjection) === 'PROJECTION_DRIFT', 'No lineage → PROJECTION_DRIFT');

  suiteHeader('F6: Clean projection returns NONE');

  const cleanProjection: ShadowAuthorityCheckInput = {
    projectionStore: L5AuthorityStore.REDIS,
    projectionTier: L5AuthorityTier.OPTIONAL_PROJECTION,
    authorityStore: L5AuthorityStore.POSTGRES,
    isProjectionFresherThanAuthority: false,
    isProjectionUsedAsDirectTruthSource: false,
    hasLineageToAuthority: true,
    datumFamily: 'score_current',
  };
  assert(detectShadowAuthorityRisk(cleanProjection) === 'NONE', 'Clean projection → NONE');

  suiteHeader('F7: Authority tier is never detected as shadow');

  const authTierCheck: ShadowAuthorityCheckInput = {
    projectionStore: L5AuthorityStore.POSTGRES,
    projectionTier: L5AuthorityTier.PRIMARY_AUTHORITY,
    authorityStore: L5AuthorityStore.POSTGRES,
    isProjectionFresherThanAuthority: false,
    isProjectionUsedAsDirectTruthSource: true,
    hasLineageToAuthority: true,
    datumFamily: 'score_current',
  };
  assert(detectShadowAuthorityRisk(authTierCheck) === 'NONE',
    'PRIMARY_AUTHORITY tier is not flagged as shadow');

  suiteHeader('F8: Dual-authority attempts blocked');

  declareAuthorityHome('score_current', L5AuthorityStore.POSTGRES, 'score-service');
  let dualThrew = false;
  try {
    declareAuthorityHome('score_current', L5AuthorityStore.CLICKHOUSE, 'analytics-service');
  } catch (e: any) {
    dualThrew = true;
    assert(e instanceof L5AuthorityError, 'Throws L5AuthorityError');
    assert(e.code === L5AuthorityErrorCode.DUAL_AUTHORITY, 'Error code: DUAL_AUTHORITY');
  }
  assert(dualThrew, 'Dual authority declaration throws');

  const sameStoreOk = declareAuthorityHome('score_current', L5AuthorityStore.POSTGRES, 'score-service-v2');
  assert(sameStoreOk.authorityStore === L5AuthorityStore.POSTGRES, 'Same-store re-declaration is idempotent');

  suiteHeader('F9: Authority registry queries');

  assert(hasAuthorityHome('score_current') === true, 'Has authority home');
  assert(hasAuthorityHome('nonexistent') === false, 'No authority home for unknown');
  assert(isAuthorityHomeFor('score_current', L5AuthorityStore.POSTGRES) === true, 'Correct authority home');
  assert(isAuthorityHomeFor('score_current', L5AuthorityStore.REDIS) === false, 'Incorrect authority home');

  suiteHeader('F10: Projection loss misreport detection (INV-5.2-J)');

  const invJ = assertL5AuthorityInvariant('INV-5.2-J', { projectionLossReportedAsTruthLoss: true });
  assert(invJ.passed === false, 'INV-5.2-J fails on misreport');

  const invJOk = assertL5AuthorityInvariant('INV-5.2-J', { projectionLossReportedAsTruthLoss: false });
  assert(invJOk.passed === true, 'INV-5.2-J passes when correct');

  suiteHeader('F11: Full invariant suite passes for valid allocation');

  resetAuthorityRegistry();
  const evalResult = evaluateL5Authority('CANONICAL_RECORD', 'canonical_entity', 'ingestion-service');
  assert(evalResult.invariantsPassed === true, 'All invariants pass for canonical record evaluation');
  assert(evalResult.allocation.primaryAuthorityStore === L5AuthorityStore.POSTGRES, 'Evaluation → Postgres');
  assert(evalResult.authorityRegistration.authorityStore === L5AuthorityStore.POSTGRES, 'Registry entry → Postgres');
  assert(evalResult.lossImpacts.length === 4, '4 loss impact assessments');

  suiteHeader('F12: Dry-run evaluation does not register');

  resetAuthorityRegistry();
  const dryResult = dryRunL5Authority('PRICE_HISTORY', 'history-service');
  assert(dryResult.invariantsPassed === true, 'Dry-run invariants pass');
  assert(!hasAuthorityHome('price_history'), 'Dry-run does not register authority');

  suiteHeader('F13: INV-5.2-L — allocation contradicts classification');

  const fakeAllocation = {
    primaryStateClass: L5StateClass.EPHEMERAL_HOT_STATE,
    primaryAuthorityStore: L5AuthorityStore.REDIS,
    authorityTier: L5AuthorityTier.PRIMARY_AUTHORITY,
    requiredProjections: [],
    optionalProjections: [],
    archiveRequired: false,
    replayRequired: false,
    manifestRequired: false,
    lossSemanticsCode: 'LOSS_SPEED_ONLY',
  };
  const relClassification = classifyDomain('CANONICAL_RECORD');
  const invL = assertL5AuthorityInvariant('INV-5.2-L', {
    allocation: fakeAllocation,
    classification: relClassification,
  });
  assert(invL.passed === false, 'INV-5.2-L fails when allocation contradicts classification');

  suiteHeader('F14: INV-5.2-K — archive-required finalized without archive');

  const badManifest: ManifestRecord = {
    manifestId: 'mf_inv_k',
    state: ManifestState.FINALIZED,
    intendedAuthorityStore: 'OBJECT_STORAGE',
    intendedRequiredProjections: [],
    intendedOptionalProjections: [],
    archiveRequired: true,
    archiveWritten: false,
    primaryAuthorityCommitted: true,
    requiredProjectionsComplete: true,
    optionalProjectionsComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failureReason: null,
    traceId: 'trace_bad',
    schemaVersion: '1.0.0',
  };
  const invK = assertL5AuthorityInvariant('INV-5.2-K', { manifest: badManifest });
  assert(invK.passed === false, 'INV-5.2-K fails: finalized without archive written');

  suiteHeader('F15: All 12 invariants run');

  const allResults = assertAllAuthorityInvariants({
    allocation: evalResult.allocation,
    classification: evalResult.classification,
  });
  assert(allResults.length === 12, '12 invariants checked');
  assert(allResults.every(r => r.passed), 'All pass for valid context');

  suiteHeader('F16: enforceAllAuthorityInvariants throws on failure');

  let enforceThrew = false;
  try {
    enforceAllAuthorityInvariants({
      allocation: fakeAllocation,
      classification: relClassification,
    });
  } catch (e: any) {
    enforceThrew = true;
    assert(e.message.includes('INV-5.2-L'), 'Error message includes failing invariant');
  }
  assert(enforceThrew, 'enforceAllAuthorityInvariants throws on failure');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

function main(): void {
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║  L5.2 — Core Doctrine and Authority Model — Certification Suite      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');

  const t0 = Date.now();

  bandA();
  bandB();
  bandC();
  bandD();
  bandE();
  bandF();

  const elapsed = Date.now() - t0;

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  L5.2 CERTIFICATION: ${failed === 0 ? 'PASSED' : 'FAILED'}`);
  console.log(`  Assertions: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}  |  Time: ${elapsed}ms`);
  console.log('═'.repeat(72));

  if (failed > 0) process.exit(1);
}

main();
