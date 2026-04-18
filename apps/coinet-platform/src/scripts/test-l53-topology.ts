/**
 * L5.3 — Multi-store Architecture
 *
 * Certification Test Suite
 *
 * 6 Bands, ~200 assertions:
 *   A — Reference Topology Integrity
 *   B — Interaction Legality
 *   C — Namespace and Config
 *   D — Constrained Mode Legality
 *   E — Service Boundary Enforcement
 *   F — Anti-Fake Topology
 */

import {
  // Deployment modes
  L5DeploymentMode,
  ALL_DEPLOYMENT_MODES,
  isReferenceMode,
  isConstrainedMode,
  isValidDeploymentMode,

  // Store profiles
  L5StoreKind,
  L5StorePlane,
  ALL_STORE_KINDS,
  ALL_STORE_PLANES,
  REFERENCE_STORE_PROFILES,
  getStoreProfile,
  getStoreForPlane,
  getPlaneForStore,

  // Store ownership
  getOwnedDataClasses,
  getForbiddenDataClasses,
  classifyDataClassOwnership,

  // Interaction
  L5InteractionLegality,
  getInteractionRule,
  getInteractionLegality,
  isLegalInteraction,
  getAllInteractionRules,
  getIllegalInteractions,
  getCoordinationRequiredInteractions,

  // Service boundaries
  L5ServiceRole,
  ALL_SERVICE_ROLES,
  getAllowedWriteStores,
  canWrite,
  registerServiceBoundary,
  assertServiceWriteAccess,
  resetServiceBoundaryRegistry,

  // Namespace
  getNamespacePolicy,
  hasNamespacePolicy,
  resolveNamespace,
  validateNamespaceIsolation,

  // Config
  validateConfigForMode,
  getRequiredConfigKeys,
  getConfigGroupForStore,

  // Constrained
  getLegalSubstitutions,
  getForbiddenConstrainedDrift,
  evaluateConstrainedMode,
  assertNoSilentDowngrade,
  isLegalSubstitution,

  // Invariants
  assertTopologyInvariant,
  assertAllTopologyInvariants,
  enforceAllTopologyInvariants,
  ALL_TOPOLOGY_INVARIANT_IDS,

  // Evaluator
  evaluateL5Topology,
  isTopologyValid,

  // Errors
  L5TopologyErrorCode,
  L5TopologyError,
} from '../l5/topology';

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

// ═══════════════════════════════════════════════════════════════════════════════
// BAND A — REFERENCE TOPOLOGY INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

function bandA(): void {
  banner('BAND A — Reference Topology Integrity');

  suiteHeader('A1: All four store kinds exist');

  assert(ALL_STORE_KINDS.length === 4, '4 store kinds');
  assert(ALL_STORE_KINDS.includes(L5StoreKind.POSTGRES), 'Postgres present');
  assert(ALL_STORE_KINDS.includes(L5StoreKind.CLICKHOUSE), 'ClickHouse present');
  assert(ALL_STORE_KINDS.includes(L5StoreKind.REDIS), 'Redis present');
  assert(ALL_STORE_KINDS.includes(L5StoreKind.OBJECT_STORAGE), 'Object storage present');

  suiteHeader('A2: All four planes exist');

  assert(ALL_STORE_PLANES.length === 4, '4 store planes');
  assert(ALL_STORE_PLANES.includes(L5StorePlane.AUTHORITY), 'Authority plane');
  assert(ALL_STORE_PLANES.includes(L5StorePlane.ANALYTICAL), 'Analytical plane');
  assert(ALL_STORE_PLANES.includes(L5StorePlane.SPEED), 'Speed plane');
  assert(ALL_STORE_PLANES.includes(L5StorePlane.EVIDENCE), 'Evidence plane');

  suiteHeader('A3: Store → Plane mapping is 1:1');

  assert(getPlaneForStore(L5StoreKind.POSTGRES) === L5StorePlane.AUTHORITY, 'Postgres → Authority');
  assert(getPlaneForStore(L5StoreKind.CLICKHOUSE) === L5StorePlane.ANALYTICAL, 'ClickHouse → Analytical');
  assert(getPlaneForStore(L5StoreKind.REDIS) === L5StorePlane.SPEED, 'Redis → Speed');
  assert(getPlaneForStore(L5StoreKind.OBJECT_STORAGE) === L5StorePlane.EVIDENCE, 'Object storage → Evidence');

  suiteHeader('A4: Plane → Store reverse mapping');

  assert(getStoreForPlane(L5StorePlane.AUTHORITY) === L5StoreKind.POSTGRES, 'Authority → Postgres');
  assert(getStoreForPlane(L5StorePlane.ANALYTICAL) === L5StoreKind.CLICKHOUSE, 'Analytical → ClickHouse');
  assert(getStoreForPlane(L5StorePlane.SPEED) === L5StoreKind.REDIS, 'Speed → Redis');
  assert(getStoreForPlane(L5StorePlane.EVIDENCE) === L5StoreKind.OBJECT_STORAGE, 'Evidence → Object storage');

  suiteHeader('A5: Reference store profiles');

  for (const kind of ALL_STORE_KINDS) {
    const p = getStoreProfile(kind);
    assert(p.kind === kind, `Profile kind matches for ${kind}`);
    assert(p.authoritativeFor.length > 0, `${kind} has authoritative data classes`);
    assert(p.forbiddenFor.length > 0, `${kind} has forbidden data classes`);
    assert(p.deploymentRequired === true, `${kind} is deployment-required`);
    assert(!!p.governs, `${kind} has governance description`);
    assert(!!p.referenceVersion, `${kind} has reference version`);
  }

  const chProfile = getStoreProfile(L5StoreKind.CLICKHOUSE);
  assert(chProfile.referenceOnly === true, 'ClickHouse is reference-only');

  const pgProfile = getStoreProfile(L5StoreKind.POSTGRES);
  assert(pgProfile.referenceOnly === false, 'Postgres is not reference-only');

  suiteHeader('A6: Ownership split per store');

  const pgOwns = getOwnedDataClasses(L5StoreKind.POSTGRES);
  assert(pgOwns.includes('canonical_entity_projection'), 'Postgres owns canonical projections');
  assert(pgOwns.includes('write_manifest'), 'Postgres owns manifests');

  const chOwns = getOwnedDataClasses(L5StoreKind.CLICKHOUSE);
  assert(chOwns.includes('price_history'), 'ClickHouse owns price history');
  assert(chOwns.includes('score_history'), 'ClickHouse owns score history');

  const redisOwns = getOwnedDataClasses(L5StoreKind.REDIS);
  assert(redisOwns.includes('hot_metric_snapshot'), 'Redis owns hot snapshots');
  assert(redisOwns.includes('dedupe_token'), 'Redis owns dedupe tokens');

  const osOwns = getOwnedDataClasses(L5StoreKind.OBJECT_STORAGE);
  assert(osOwns.includes('raw_source_payload'), 'Object storage owns raw payloads');
  assert(osOwns.includes('replay_bundle'), 'Object storage owns replay bundles');

  suiteHeader('A7: Forbidden data classes per store');

  const pgForbidden = getForbiddenDataClasses(L5StoreKind.POSTGRES);
  assert(pgForbidden.includes('dense_price_stream'), 'Postgres forbidden: dense price streams');

  const redisForbidden = getForbiddenDataClasses(L5StoreKind.REDIS);
  assert(redisForbidden.includes('durable_registry_truth'), 'Redis forbidden: durable registry truth');
  assert(redisForbidden.includes('canonical_current_state'), 'Redis forbidden: canonical state');

  const chForbidden = getForbiddenDataClasses(L5StoreKind.CLICKHOUSE);
  assert(chForbidden.includes('canonical_identity_authority'), 'ClickHouse forbidden: canonical identity');

  const osForbidden = getForbiddenDataClasses(L5StoreKind.OBJECT_STORAGE);
  assert(osForbidden.includes('live_mutable_registry'), 'Object storage forbidden: live mutable registry');

  suiteHeader('A8: Data class ownership classification');

  assert(classifyDataClassOwnership(L5StoreKind.POSTGRES, 'write_manifest') === 'OWNS', 'PG owns manifests');
  assert(classifyDataClassOwnership(L5StoreKind.POSTGRES, 'dense_price_stream') === 'FORBIDDEN', 'PG forbidden from price streams');
  assert(classifyDataClassOwnership(L5StoreKind.POSTGRES, 'unknown_class') === 'PROJECTION_ONLY', 'Unknown class → PROJECTION_ONLY');

  suiteHeader('A9: Full topology evaluation for reference mode');

  const refTopo = evaluateL5Topology(L5DeploymentMode.REFERENCE_PRODUCTION);
  assert(refTopo.valid === true, 'Reference topology is valid');
  assert(refTopo.invariantsPassed === true, 'All invariants pass in reference mode');
  assert(refTopo.stores.length === 4, '4 stores in reference topology');
  assert(refTopo.violations.length === 0, 'No violations in reference mode');

  suiteHeader('A10: Deployment mode validation');

  assert(isValidDeploymentMode('REFERENCE_PRODUCTION') === true, 'REFERENCE_PRODUCTION valid');
  assert(isValidDeploymentMode('CONSTRAINED_SINGLE_ANALYTICAL_BACKEND') === true, 'CONSTRAINED valid');
  assert(isValidDeploymentMode('LOCAL_DEV') === true, 'LOCAL_DEV valid');
  assert(isValidDeploymentMode('FAKE_MODE') === false, 'FAKE_MODE invalid');
  assert(ALL_DEPLOYMENT_MODES.length === 3, '3 deployment modes');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND B — INTERACTION LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

function bandB(): void {
  banner('BAND B — Interaction Legality');

  suiteHeader('B1: Legal flows pass');

  assert(getInteractionLegality(L5StoreKind.POSTGRES, L5StoreKind.CLICKHOUSE) === L5InteractionLegality.LEGAL,
    'Postgres → ClickHouse is LEGAL');
  assert(getInteractionLegality(L5StoreKind.POSTGRES, L5StoreKind.REDIS) === L5InteractionLegality.LEGAL,
    'Postgres → Redis is LEGAL');
  assert(getInteractionLegality(L5StoreKind.POSTGRES, L5StoreKind.OBJECT_STORAGE) === L5InteractionLegality.LEGAL,
    'Postgres → Object storage is LEGAL');
  assert(getInteractionLegality(L5StoreKind.CLICKHOUSE, L5StoreKind.REDIS) === L5InteractionLegality.LEGAL,
    'ClickHouse → Redis is LEGAL');

  assert(isLegalInteraction(L5StoreKind.POSTGRES, L5StoreKind.CLICKHOUSE) === true, 'PG→CH legal');
  assert(isLegalInteraction(L5StoreKind.POSTGRES, L5StoreKind.REDIS) === true, 'PG→Redis legal');

  suiteHeader('B2: Illegal store-to-store promotion fails');

  assert(getInteractionLegality(L5StoreKind.REDIS, L5StoreKind.POSTGRES) === L5InteractionLegality.ILLEGAL,
    'Redis → Postgres is ILLEGAL');
  assert(getInteractionLegality(L5StoreKind.REDIS, L5StoreKind.CLICKHOUSE) === L5InteractionLegality.ILLEGAL,
    'Redis → ClickHouse is ILLEGAL');
  assert(getInteractionLegality(L5StoreKind.REDIS, L5StoreKind.OBJECT_STORAGE) === L5InteractionLegality.ILLEGAL,
    'Redis → Object storage is ILLEGAL');
  assert(getInteractionLegality(L5StoreKind.CLICKHOUSE, L5StoreKind.POSTGRES) === L5InteractionLegality.ILLEGAL,
    'ClickHouse → Postgres is ILLEGAL');

  assert(isLegalInteraction(L5StoreKind.REDIS, L5StoreKind.POSTGRES) === false, 'Redis→PG not legal');
  assert(isLegalInteraction(L5StoreKind.CLICKHOUSE, L5StoreKind.POSTGRES) === false, 'CH→PG not legal');

  suiteHeader('B3: Coordination-required flows flagged correctly');

  assert(getInteractionLegality(L5StoreKind.OBJECT_STORAGE, L5StoreKind.POSTGRES) === L5InteractionLegality.LEGAL_WITH_COORDINATION,
    'ObjectStorage → Postgres requires coordination');
  assert(getInteractionLegality(L5StoreKind.OBJECT_STORAGE, L5StoreKind.CLICKHOUSE) === L5InteractionLegality.LEGAL_WITH_COORDINATION,
    'ObjectStorage → ClickHouse requires coordination');
  assert(getInteractionLegality(L5StoreKind.CLICKHOUSE, L5StoreKind.OBJECT_STORAGE) === L5InteractionLegality.LEGAL_WITH_COORDINATION,
    'ClickHouse → ObjectStorage requires coordination');

  assert(isLegalInteraction(L5StoreKind.OBJECT_STORAGE, L5StoreKind.POSTGRES) === true,
    'Coordination-required counts as legal');

  suiteHeader('B4: Same-store interaction is legal');

  for (const kind of ALL_STORE_KINDS) {
    assert(getInteractionLegality(kind, kind) === L5InteractionLegality.LEGAL,
      `${kind} → ${kind} is LEGAL`);
  }

  suiteHeader('B5: Object storage → Redis is illegal');

  assert(getInteractionLegality(L5StoreKind.OBJECT_STORAGE, L5StoreKind.REDIS) === L5InteractionLegality.ILLEGAL,
    'ObjectStorage → Redis is ILLEGAL');

  suiteHeader('B6: Interaction rule metadata');

  const allRules = getAllInteractionRules();
  assert(allRules.length === 12, '12 interaction rules (4 stores × 3 targets each)');

  const illegalRules = getIllegalInteractions();
  assert(illegalRules.length >= 4, 'At least 4 illegal interactions');
  for (const r of illegalRules) {
    assert(!!r.reason, `Illegal rule ${r.from}→${r.to} has reason`);
  }

  const coordRules = getCoordinationRequiredInteractions();
  assert(coordRules.length >= 3, 'At least 3 coordination-required interactions');

  suiteHeader('B7: Interaction rule reasons are meaningful');

  const pgToCh = getInteractionRule(L5StoreKind.POSTGRES, L5StoreKind.CLICKHOUSE);
  assert(!!pgToCh, 'PG→CH rule exists');
  assert(pgToCh!.reason.includes('historical') || pgToCh!.reason.includes('analytical'),
    'PG→CH reason mentions historical/analytical');

  const redisToPg = getInteractionRule(L5StoreKind.REDIS, L5StoreKind.POSTGRES);
  assert(!!redisToPg, 'Redis→PG rule exists');
  assert(redisToPg!.reason.includes('promote') || redisToPg!.reason.includes('durable'),
    'Redis→PG reason mentions promotion/durability');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND C — NAMESPACE AND CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

function bandC(): void {
  banner('BAND C — Namespace and Config');

  suiteHeader('C1: All stores have namespace policy');

  for (const kind of ALL_STORE_KINDS) {
    assert(hasNamespacePolicy(kind) === true, `${kind} has namespace policy`);
  }

  suiteHeader('C2: Postgres namespace policy');

  const pgNs = getNamespacePolicy(L5StoreKind.POSTGRES);
  assert(pgNs.namespaces.includes('l3'), 'Postgres has l3 schema');
  assert(pgNs.namespaces.includes('l4'), 'Postgres has l4 schema');
  assert(pgNs.namespaces.includes('l5'), 'Postgres has l5 schema');
  assert(pgNs.namespaces.includes('scoring'), 'Postgres has scoring schema');
  assert(pgNs.namespaces.length >= 8, 'Postgres has at least 8 schemas');

  suiteHeader('C3: ClickHouse namespace policy');

  const chNs = getNamespacePolicy(L5StoreKind.CLICKHOUSE);
  assert(chNs.namespaces.includes('ts_numeric_fact'), 'ClickHouse has ts_numeric_fact');
  assert(chNs.namespaces.includes('ts_ohlcv'), 'ClickHouse has ts_ohlcv');
  assert(chNs.namespaces.includes('rollup'), 'ClickHouse has rollup');

  suiteHeader('C4: Redis namespace policy');

  const redisNs = getNamespacePolicy(L5StoreKind.REDIS);
  assert(!!redisNs.keyPattern, 'Redis has key pattern');
  assert(redisNs.keyPattern!.includes('{env}'), 'Redis key pattern includes env');
  assert(redisNs.keyPattern!.includes('{domain}'), 'Redis key pattern includes domain');
  assert(redisNs.namespaces.includes('l5:hot'), 'Redis has l5:hot namespace');

  suiteHeader('C5: Object storage namespace policy');

  const osNs = getNamespacePolicy(L5StoreKind.OBJECT_STORAGE);
  assert((osNs.pathRoots?.length ?? 0) >= 8, 'Object storage has at least 8 path roots');
  assert(osNs.pathRoots!.includes('raw/'), 'Object storage has raw/ root');
  assert(osNs.pathRoots!.includes('replay/'), 'Object storage has replay/ root');
  assert(osNs.pathRoots!.includes('forensics/'), 'Object storage has forensics/ root');

  suiteHeader('C6: Namespace resolution with env');

  const prodPgNs = resolveNamespace(L5StoreKind.POSTGRES, 'prod');
  assert(prodPgNs.namespaces.some(n => n.startsWith('prod_')), 'Prod Postgres namespaces are prefixed');

  const prodRedisNs = resolveNamespace(L5StoreKind.REDIS, 'prod');
  assert(prodRedisNs.keyPattern!.startsWith('prod:'), 'Prod Redis keys start with prod:');

  const prodOsNs = resolveNamespace(L5StoreKind.OBJECT_STORAGE, 'prod');
  assert(prodOsNs.pathRoots!.some(r => r.startsWith('prod/')), 'Prod object storage paths start with prod/');

  suiteHeader('C7: Namespace isolation between environments');

  assert(validateNamespaceIsolation('prod', 'staging', L5StoreKind.POSTGRES) === true,
    'Prod and staging Postgres namespaces are isolated');
  assert(validateNamespaceIsolation('prod', 'prod', L5StoreKind.POSTGRES) === true,
    'Same env is trivially isolated');

  suiteHeader('C8: Config validation for reference mode');

  const fullEnv = (key: string) => {
    const envMap: Record<string, string> = {
      DATABASE_URL: 'postgres://...', DATABASE_POOL_MIN: '2', DATABASE_POOL_MAX: '10', DATABASE_STATEMENT_TIMEOUT_MS: '5000',
      CLICKHOUSE_URL: 'http://ch:8123', CLICKHOUSE_DATABASE: 'coinet', CLICKHOUSE_USER: 'default', CLICKHOUSE_PASSWORD: 'pw',
      CLICKHOUSE_BATCH_SIZE: '10000', CLICKHOUSE_FLUSH_INTERVAL_MS: '1000',
      REDIS_URL: 'redis://...', REDIS_KEY_PREFIX: 'prod', REDIS_DEFAULT_TTL_SEC: '300',
      OBJECT_STORE_ENDPOINT: 'https://s3...', OBJECT_STORE_REGION: 'us-east-1', OBJECT_STORE_BUCKET: 'coinet',
      OBJECT_STORE_ACCESS_KEY: 'ak', OBJECT_STORE_SECRET_KEY: 'sk', OBJECT_STORE_FORCE_PATH_STYLE: 'false',
      L5_DEPLOYMENT_MODE: 'REFERENCE_PRODUCTION', L5_ARCHIVE_REQUIRED_DEFAULT: 'true',
      L5_REPLAY_MODE: 'ENABLED', L5_ENV_NAMESPACE: 'prod',
    };
    return envMap[key];
  };

  const refConfig = validateConfigForMode(L5DeploymentMode.REFERENCE_PRODUCTION, fullEnv);
  assert(refConfig.valid === true, 'Full env passes reference mode config');
  assert(refConfig.missingKeys.length === 0, 'No missing keys');
  assert(refConfig.checkedGroups === 5, '5 config groups checked in reference mode');

  suiteHeader('C9: Config validation fails with missing keys');

  const partialEnv = (key: string) => {
    if (key === 'CLICKHOUSE_URL' || key === 'DATABASE_URL') return undefined;
    return fullEnv(key);
  };

  const partialConfig = validateConfigForMode(L5DeploymentMode.REFERENCE_PRODUCTION, partialEnv);
  assert(partialConfig.valid === false, 'Missing keys fail config validation');
  assert(partialConfig.missingKeys.includes('CLICKHOUSE_URL'), 'CLICKHOUSE_URL reported missing');
  assert(partialConfig.missingKeys.includes('DATABASE_URL'), 'DATABASE_URL reported missing');

  suiteHeader('C10: Constrained mode does not require ClickHouse config');

  const constrainedConfig = validateConfigForMode(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND, fullEnv);
  assert(constrainedConfig.valid === true, 'Constrained mode config valid');

  const noChEnv = (key: string) => {
    if (key.startsWith('CLICKHOUSE_')) return undefined;
    return fullEnv(key);
  };
  const noChConfig = validateConfigForMode(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND, noChEnv);
  assert(noChConfig.valid === true, 'Constrained mode valid without ClickHouse config');

  suiteHeader('C11: Required config keys per mode');

  const refKeys = getRequiredConfigKeys(L5DeploymentMode.REFERENCE_PRODUCTION);
  assert(refKeys.includes('CLICKHOUSE_URL'), 'Reference mode requires CLICKHOUSE_URL');
  assert(refKeys.includes('DATABASE_URL'), 'Reference mode requires DATABASE_URL');

  const constrainedKeys = getRequiredConfigKeys(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND);
  assert(!constrainedKeys.includes('CLICKHOUSE_URL'), 'Constrained mode does not require CLICKHOUSE_URL');

  suiteHeader('C12: Config group for store');

  const pgConfigGroup = getConfigGroupForStore(L5StoreKind.POSTGRES);
  assert(!!pgConfigGroup, 'Postgres has config group');
  assert(pgConfigGroup!.keys.includes('DATABASE_URL'), 'Postgres config includes DATABASE_URL');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND D — CONSTRAINED MODE LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

function bandD(): void {
  banner('BAND D — Constrained Mode Legality');

  suiteHeader('D1: TimescaleDB substitution allowed only for analytical plane');

  assert(isLegalSubstitution(L5StorePlane.ANALYTICAL, 'TIMESCALEDB') === true,
    'TimescaleDB legal for analytical plane');
  assert(isLegalSubstitution(L5StorePlane.AUTHORITY, 'TIMESCALEDB') === false,
    'TimescaleDB illegal for authority plane');
  assert(isLegalSubstitution(L5StorePlane.SPEED, 'TIMESCALEDB') === false,
    'TimescaleDB illegal for speed plane');
  assert(isLegalSubstitution(L5StorePlane.EVIDENCE, 'TIMESCALEDB') === false,
    'TimescaleDB illegal for evidence plane');

  suiteHeader('D2: Legal substitutions list');

  const subs = getLegalSubstitutions();
  assert(subs.length === 1, 'Exactly 1 legal substitution');
  assert(subs[0].plane === L5StorePlane.ANALYTICAL, 'Substitution is for analytical plane');
  assert(subs[0].referenceKind === L5StoreKind.CLICKHOUSE, 'Substitution replaces ClickHouse');
  assert(subs[0].substituteBackend === 'TIMESCALEDB', 'Substitute is TimescaleDB');
  assert(subs[0].preservesConstitutionalLaw === true, 'Substitution preserves constitutional law');

  suiteHeader('D3: Constrained mode evaluation');

  const constrained = evaluateConstrainedMode(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND);
  assert(constrained.isConstrained === true, 'Is constrained');
  assert(constrained.activeSubstitutions.length === 1, 'One active substitution');
  assert(constrained.planesStillCovered.length === 4, 'All four planes still covered');
  assert(constrained.valid === true, 'Constrained mode is valid');

  suiteHeader('D4: Reference mode evaluation is not constrained');

  const reference = evaluateConstrainedMode(L5DeploymentMode.REFERENCE_PRODUCTION);
  assert(reference.isConstrained === false, 'Reference is not constrained');
  assert(reference.activeSubstitutions.length === 0, 'No substitutions in reference');

  suiteHeader('D5: Silent downgrade detection');

  let threw = false;
  try {
    assertNoSilentDowngrade(L5DeploymentMode.REFERENCE_PRODUCTION, 'TIMESCALEDB');
  } catch (e: any) {
    threw = true;
    assert(e instanceof L5TopologyError, 'Throws L5TopologyError');
    assert(e.code === L5TopologyErrorCode.SILENT_MODE_DOWNGRADE, 'Error code: SILENT_MODE_DOWNGRADE');
  }
  assert(threw, 'Silent downgrade from reference to TimescaleDB throws');

  threw = false;
  try {
    assertNoSilentDowngrade(L5DeploymentMode.REFERENCE_PRODUCTION, 'CLICKHOUSE');
  } catch { threw = true; }
  assert(!threw, 'No throw when reference uses ClickHouse');

  threw = false;
  try {
    assertNoSilentDowngrade(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND, 'TIMESCALEDB');
  } catch { threw = true; }
  assert(!threw, 'No throw when constrained uses TimescaleDB');

  suiteHeader('D6: Forbidden constrained drift');

  const drift = getForbiddenConstrainedDrift();
  assert(drift.length >= 5, 'At least 5 forbidden constrained drift rules');
  assert(drift.some(d => d.rule === 'REDIS_BECOMES_DURABLE'), 'Redis-becomes-durable is forbidden drift');
  assert(drift.some(d => d.rule === 'POSTGRES_BECOMES_RAW_ARCHIVE'), 'PG-becomes-archive is forbidden drift');
  assert(drift.some(d => d.rule === 'TOPOLOGY_LAW_DISAPPEARS'), 'Topology-law-disappears is forbidden drift');

  suiteHeader('D7: Constrained topology evaluation');

  const constrainedTopo = evaluateL5Topology(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND);
  assert(constrainedTopo.constrainedEvaluation.isConstrained === true, 'Constrained topology is constrained');
  assert(constrainedTopo.stores.length === 4, 'Constrained still has 4 store profiles');

  suiteHeader('D8: Local dev topology');

  const localTopo = evaluateL5Topology(L5DeploymentMode.LOCAL_DEV);
  assert(localTopo.constrainedEvaluation.isConstrained === true, 'Local dev is constrained');
  assert(localTopo.constrainedEvaluation.planesStillCovered.length === 4, 'Local dev covers all planes');

  suiteHeader('D9: Deployment mode helpers');

  assert(isReferenceMode(L5DeploymentMode.REFERENCE_PRODUCTION) === true, 'REFERENCE is reference');
  assert(isReferenceMode(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND) === false, 'CONSTRAINED is not reference');
  assert(isConstrainedMode(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND) === true, 'CONSTRAINED is constrained');
  assert(isConstrainedMode(L5DeploymentMode.REFERENCE_PRODUCTION) === false, 'REFERENCE is not constrained');

  suiteHeader('D10: isTopologyValid');

  assert(isTopologyValid(L5DeploymentMode.REFERENCE_PRODUCTION) === true, 'Reference topology valid');
  assert(isTopologyValid(L5DeploymentMode.CONSTRAINED_SINGLE_ANALYTICAL_BACKEND) === true, 'Constrained topology valid');
  assert(isTopologyValid(L5DeploymentMode.LOCAL_DEV) === true, 'Local dev topology valid');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND E — SERVICE BOUNDARY ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function bandE(): void {
  banner('BAND E — Service Boundary Enforcement');
  resetServiceBoundaryRegistry();

  suiteHeader('E1: Allowed write stores per role');

  const authRepoStores = getAllowedWriteStores(L5ServiceRole.AUTHORITY_REPOSITORY);
  assert(authRepoStores.length === 1 && authRepoStores[0] === L5StoreKind.POSTGRES,
    'Authority repository writes only Postgres');

  const batchWriterStores = getAllowedWriteStores(L5ServiceRole.ANALYTICAL_BATCH_WRITER);
  assert(batchWriterStores.length === 1 && batchWriterStores[0] === L5StoreKind.CLICKHOUSE,
    'Batch writer writes only ClickHouse');

  const hotServiceStores = getAllowedWriteStores(L5ServiceRole.HOT_STATE_SERVICE);
  assert(hotServiceStores.length === 1 && hotServiceStores[0] === L5StoreKind.REDIS,
    'Hot state service writes only Redis');

  const archiveClientStores = getAllowedWriteStores(L5ServiceRole.ARCHIVE_CLIENT);
  assert(archiveClientStores.length === 1 && archiveClientStores[0] === L5StoreKind.OBJECT_STORAGE,
    'Archive client writes only Object storage');

  const coordStores = getAllowedWriteStores(L5ServiceRole.L5_COORDINATOR);
  assert(coordStores.length === 4, 'L5 coordinator writes all 4 stores');

  const domainStores = getAllowedWriteStores(L5ServiceRole.DOMAIN_SERVICE);
  assert(domainStores.length === 0, 'Domain service writes no stores directly');

  suiteHeader('E2: canWrite checks');

  assert(canWrite(L5ServiceRole.AUTHORITY_REPOSITORY, L5StoreKind.POSTGRES) === true, 'Auth repo can write PG');
  assert(canWrite(L5ServiceRole.AUTHORITY_REPOSITORY, L5StoreKind.REDIS) === false, 'Auth repo cannot write Redis');
  assert(canWrite(L5ServiceRole.HOT_STATE_SERVICE, L5StoreKind.REDIS) === true, 'Hot service can write Redis');
  assert(canWrite(L5ServiceRole.HOT_STATE_SERVICE, L5StoreKind.POSTGRES) === false, 'Hot service cannot write PG');
  assert(canWrite(L5ServiceRole.DOMAIN_SERVICE, L5StoreKind.POSTGRES) === false, 'Domain service cannot write PG');

  suiteHeader('E3: Valid service registration');

  const validReg = registerServiceBoundary({
    serviceId: 'entity-repository',
    role: L5ServiceRole.AUTHORITY_REPOSITORY,
    declaredWriteStores: [L5StoreKind.POSTGRES],
  });
  assert(validReg.valid === true, 'Valid registration succeeds');
  assert(validReg.violations.length === 0, 'No violations');

  suiteHeader('E4: Invalid service registration — wrong store for role');

  const invalidReg = registerServiceBoundary({
    serviceId: 'bad-service',
    role: L5ServiceRole.AUTHORITY_REPOSITORY,
    declaredWriteStores: [L5StoreKind.POSTGRES, L5StoreKind.REDIS],
  });
  assert(invalidReg.valid === false, 'Invalid registration fails');
  assert(invalidReg.violations.some(v => v.includes('REDIS')), 'Violation mentions Redis');

  suiteHeader('E5: All-store access blocked for non-coordinators');

  const allStoreReg = registerServiceBoundary({
    serviceId: 'greedy-service',
    role: L5ServiceRole.DOMAIN_SERVICE,
    declaredWriteStores: [L5StoreKind.POSTGRES, L5StoreKind.CLICKHOUSE, L5StoreKind.REDIS, L5StoreKind.OBJECT_STORAGE],
  });
  assert(allStoreReg.valid === false, 'All-store access for domain service fails');
  assert(allStoreReg.violations.some(v => v.includes('unrestricted')), 'Violation mentions unrestricted');

  suiteHeader('E6: L5 coordinator all-store access is legal');

  const coordReg = registerServiceBoundary({
    serviceId: 'write-coordinator',
    role: L5ServiceRole.L5_COORDINATOR,
    declaredWriteStores: [L5StoreKind.POSTGRES, L5StoreKind.CLICKHOUSE, L5StoreKind.REDIS, L5StoreKind.OBJECT_STORAGE],
  });
  assert(coordReg.valid === true, 'L5 coordinator all-store access passes');

  suiteHeader('E7: assertServiceWriteAccess enforcement');

  let threw = false;
  try {
    assertServiceWriteAccess('entity-repository', L5StoreKind.POSTGRES);
  } catch { threw = true; }
  assert(!threw, 'Auth repo can assert write to Postgres');

  threw = false;
  try {
    assertServiceWriteAccess('entity-repository', L5StoreKind.REDIS);
  } catch (e: any) {
    threw = true;
    assert(e instanceof L5TopologyError, 'Throws L5TopologyError');
    assert(e.code === L5TopologyErrorCode.UNRESTRICTED_STORE_ACCESS, 'Error code: UNRESTRICTED_STORE_ACCESS');
  }
  assert(threw, 'Auth repo cannot assert write to Redis');

  threw = false;
  try {
    assertServiceWriteAccess('unregistered-service', L5StoreKind.POSTGRES);
  } catch (e: any) {
    threw = true;
    assert(e.code === L5TopologyErrorCode.UNRESTRICTED_STORE_ACCESS, 'Unregistered service throws');
  }
  assert(threw, 'Unregistered service throws on write assert');

  suiteHeader('E8: Service roles enumeration');

  assert(ALL_SERVICE_ROLES.length === 6, '6 service roles');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND F — ANTI-FAKE TOPOLOGY
// ═══════════════════════════════════════════════════════════════════════════════

function bandF(): void {
  banner('BAND F — Anti-Fake Topology');

  suiteHeader('F1: Cache-as-truth topology blocked');

  assert(classifyDataClassOwnership(L5StoreKind.REDIS, 'durable_registry_truth') === 'FORBIDDEN',
    'Redis cannot own durable registry truth');
  assert(classifyDataClassOwnership(L5StoreKind.REDIS, 'canonical_current_state') === 'FORBIDDEN',
    'Redis cannot own canonical state');
  assert(classifyDataClassOwnership(L5StoreKind.REDIS, 'permanent_score_state') === 'FORBIDDEN',
    'Redis cannot own permanent score state');

  suiteHeader('F2: Blob graveyard topology blocked');

  assert(classifyDataClassOwnership(L5StoreKind.OBJECT_STORAGE, 'live_mutable_registry') === 'FORBIDDEN',
    'Object storage cannot own live mutable registry');
  assert(classifyDataClassOwnership(L5StoreKind.OBJECT_STORAGE, 'authority_bearing_current_row') === 'FORBIDDEN',
    'Object storage cannot own authority-bearing current rows');
  assert(classifyDataClassOwnership(L5StoreKind.OBJECT_STORAGE, 'operational_query_join') === 'FORBIDDEN',
    'Object storage cannot own operational query joins');

  suiteHeader('F3: History-as-current-truth topology blocked');

  assert(classifyDataClassOwnership(L5StoreKind.CLICKHOUSE, 'canonical_identity_authority') === 'FORBIDDEN',
    'ClickHouse cannot own canonical identity');
  assert(classifyDataClassOwnership(L5StoreKind.CLICKHOUSE, 'report_registry_authority') === 'FORBIDDEN',
    'ClickHouse cannot own report registry authority');
  assert(classifyDataClassOwnership(L5StoreKind.CLICKHOUSE, 'manifests') === 'FORBIDDEN',
    'ClickHouse cannot own manifests');

  suiteHeader('F4: All invariants pass for reference mode');

  const refCtx = {
    mode: L5DeploymentMode.REFERENCE_PRODUCTION as L5DeploymentMode,
    activeStores: [...ALL_STORE_KINDS] as L5StoreKind[],
    coveredPlanes: [...ALL_STORE_PLANES] as L5StorePlane[],
    analyticalBackend: 'CLICKHOUSE',
    serviceBoundaryViolations: [] as string[],
    dataClassViolations: [] as string[],
  };
  const allResults = assertAllTopologyInvariants(refCtx);
  assert(allResults.length === 12, '12 invariants checked');
  assert(allResults.every(r => r.passed), 'All pass for clean reference context');

  suiteHeader('F5: INV-5.3-A — missing store in reference mode');

  const missingStoreCtx = {
    mode: L5DeploymentMode.REFERENCE_PRODUCTION as L5DeploymentMode,
    activeStores: [L5StoreKind.POSTGRES, L5StoreKind.REDIS, L5StoreKind.OBJECT_STORAGE] as L5StoreKind[],
    coveredPlanes: [...ALL_STORE_PLANES] as L5StorePlane[],
    analyticalBackend: 'CLICKHOUSE',
  };
  const invA = assertTopologyInvariant('INV-5.3-A', missingStoreCtx);
  assert(invA.passed === false, 'INV-5.3-A fails with missing ClickHouse');

  suiteHeader('F6: INV-5.3-G — forbidden data class violation');

  const dataClassViolCtx = {
    mode: L5DeploymentMode.REFERENCE_PRODUCTION as L5DeploymentMode,
    dataClassViolations: ['Redis owns durable_registry_truth'],
  };
  const invG = assertTopologyInvariant('INV-5.3-G', dataClassViolCtx);
  assert(invG.passed === false, 'INV-5.3-G fails with data class violations');

  suiteHeader('F7: INV-5.3-H — missing plane coverage');

  const missingPlaneCtx = {
    mode: L5DeploymentMode.REFERENCE_PRODUCTION as L5DeploymentMode,
    coveredPlanes: [L5StorePlane.AUTHORITY, L5StorePlane.SPEED] as L5StorePlane[],
  };
  const invH = assertTopologyInvariant('INV-5.3-H', missingPlaneCtx);
  assert(invH.passed === false, 'INV-5.3-H fails with missing planes');

  suiteHeader('F8: INV-5.3-I — service boundary violations');

  const svcViolCtx = {
    mode: L5DeploymentMode.REFERENCE_PRODUCTION as L5DeploymentMode,
    serviceBoundaryViolations: ['service-x has all-store access'],
  };
  const invI = assertTopologyInvariant('INV-5.3-I', svcViolCtx);
  assert(invI.passed === false, 'INV-5.3-I fails with service boundary violations');

  suiteHeader('F9: INV-5.3-K — reference mode silent downgrade');

  const downgradeCtx = {
    mode: L5DeploymentMode.REFERENCE_PRODUCTION as L5DeploymentMode,
    analyticalBackend: 'TIMESCALEDB',
  };
  const invK = assertTopologyInvariant('INV-5.3-K', downgradeCtx);
  assert(invK.passed === false, 'INV-5.3-K fails on silent downgrade');

  suiteHeader('F10: INV-5.3-L — constitutional law violation');

  const lawViolCtx = {
    mode: L5DeploymentMode.REFERENCE_PRODUCTION as L5DeploymentMode,
    coveredPlanes: [L5StorePlane.AUTHORITY, L5StorePlane.ANALYTICAL, L5StorePlane.SPEED] as L5StorePlane[],
  };
  const invL = assertTopologyInvariant('INV-5.3-L', lawViolCtx);
  assert(invL.passed === false, 'INV-5.3-L fails when evidence plane removed');

  suiteHeader('F11: enforceAllTopologyInvariants throws on failure');

  let threw = false;
  try {
    enforceAllTopologyInvariants(downgradeCtx);
  } catch (e: any) {
    threw = true;
    assert(e.message.includes('INV-5.3-K'), 'Error message includes failing invariant');
  }
  assert(threw, 'enforceAllTopologyInvariants throws on downgrade');

  suiteHeader('F12: Illegal deployment mode rejected');

  let modeThrew = false;
  try {
    evaluateL5Topology('FAKE_MODE' as L5DeploymentMode);
  } catch (e: any) {
    modeThrew = true;
    assert(e instanceof L5TopologyError, 'Throws L5TopologyError');
    assert(e.code === L5TopologyErrorCode.ILLEGAL_DEPLOYMENT_MODE, 'Error code: ILLEGAL_DEPLOYMENT_MODE');
  }
  assert(modeThrew, 'Fake deployment mode rejected');

  suiteHeader('F13: Plane assignment invariants (C through F)');

  for (const id of ['INV-5.3-C', 'INV-5.3-D', 'INV-5.3-E', 'INV-5.3-F'] as const) {
    const r = assertTopologyInvariant(id, refCtx);
    assert(r.passed === true, `${id} passes for reference topology`);
  }

  suiteHeader('F14: INV-5.3-B — unique plane assignment');

  const invB = assertTopologyInvariant('INV-5.3-B', refCtx);
  assert(invB.passed === true, 'INV-5.3-B passes — each store has unique plane');

  suiteHeader('F15: INV-5.3-J — namespace policy completeness');

  const invJ = assertTopologyInvariant('INV-5.3-J', refCtx);
  assert(invJ.passed === true, 'INV-5.3-J passes — all stores have namespace policy');

  suiteHeader('F16: All topology invariant IDs present');

  assert(ALL_TOPOLOGY_INVARIANT_IDS.length === 12, '12 topology invariants');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

function main(): void {
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║  L5.3 — Multi-store Architecture — Certification Suite               ║');
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
  console.log(`  L5.3 CERTIFICATION: ${failed === 0 ? 'PASSED' : 'FAILED'}`);
  console.log(`  Assertions: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}  |  Time: ${elapsed}ms`);
  console.log('═'.repeat(72));

  if (failed > 0) process.exit(1);
}

main();
