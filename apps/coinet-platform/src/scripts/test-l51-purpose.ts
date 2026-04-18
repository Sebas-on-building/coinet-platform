/**
 * L5.1 Purpose — Certification Test Suite
 *
 * Ten suites, ~200 assertions:
 *   1 — State Class Enum and Properties
 *   2 — Write Purpose Classifier
 *   3 — Domain Routing Completeness
 *   4 — Authority Home Registry
 *   5 — Allowed Capability Registry
 *   6 — Forbidden Action Policy Checks
 *   7 — Invariant Engine (INV-5.1-A through J)
 *   8 — Purpose Charter Structural Integrity
 *   9 — Anti-Fake: State-Class Collapse Prevention
 *  10 — Anti-Fake: Constitutional Boundary Enforcement
 */

import {
  L5StateClass,
  ALL_STATE_CLASSES,
  getStateClassProperties,
  type L5PurposeClassification,

  declareAuthorityHome,
  getAuthorityHome,
  getAllAuthorityHomes,
  hasAuthorityHome,
  resetStateClassRegistry,

  AllowedL5Capability,
  ALL_CAPABILITIES,
  registerL5ModuleCapabilities,
  getModuleCapabilities,
  getAllRegisteredModules,
  assertLayer5Capability,
  resetCapabilityRegistry,

  ForbiddenL5Action,
  ALL_FORBIDDEN_ACTIONS,
  type WriteIntentSignals,
  assertNoForbiddenL5Action,
  reportForbiddenAction,
  getForbiddenActionLog,
  resetForbiddenActionLog,

  type L5WriteDomain,
  ALL_WRITE_DOMAINS,
  classifyL5WritePurpose,
  getPrimaryStateClassForDomain,
  getDomainsForStateClass,

  L5_PURPOSE_INVARIANTS,
  assertL5PurposeInvariant,
  enforceL5PurposeInvariants,

  L5_MISSION,
  FAILURE_SIGNATURES,
  LAYER_DEPENDENCIES,
  L5_BOUNDARY_ASSERTION,
  STATE_DOCTRINE,
  L5_PURPOSE_CHARTER,

  L5PurposeErrorCode,
  L5PurposeError,
} from '../l5/purpose';

(function run() {

let passed = 0;
let failed = 0;
function assert(c: boolean, l: string) {
  if (c) passed++;
  else { failed++; console.error(`  FAIL: ${l}`); }
}

function resetAll() {
  resetStateClassRegistry();
  resetCapabilityRegistry();
  resetForbiddenActionLog();
}

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 1 — State Class Enum and Properties (20 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 1 — State Class Enum and Properties ===');
resetAll();

assert(ALL_STATE_CLASSES.length === 4, '1.01 exactly 4 state classes');
assert(ALL_STATE_CLASSES.includes(L5StateClass.RELATIONAL_AUTHORITY), '1.02 RELATIONAL_AUTHORITY exists');
assert(ALL_STATE_CLASSES.includes(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY), '1.03 TIME_SERIES exists');
assert(ALL_STATE_CLASSES.includes(L5StateClass.EPHEMERAL_HOT_STATE), '1.04 EPHEMERAL exists');
assert(ALL_STATE_CLASSES.includes(L5StateClass.IMMUTABLE_ARCHIVE_STATE), '1.05 ARCHIVE exists');

const raProps = getStateClassProperties(L5StateClass.RELATIONAL_AUTHORITY);
assert(raProps.isDurable === true, '1.06 RA is durable');
assert(raProps.isAuthorityBearing === true, '1.07 RA is authority-bearing');
assert(raProps.isEphemeral === false, '1.08 RA is not ephemeral');
assert(raProps.lossConsequence === 'TRUTH_LOSS', '1.09 RA loss = TRUTH_LOSS');
assert(raProps.requiresMutationControl === true, '1.10 RA requires mutation control');

const tsProps = getStateClassProperties(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY);
assert(tsProps.isDurable === true, '1.11 TS is durable');
assert(tsProps.isAuthorityBearing === false, '1.12 TS is not authority-bearing');
assert(tsProps.lossConsequence === 'HISTORY_LOSS', '1.13 TS loss = HISTORY_LOSS');

const ehProps = getStateClassProperties(L5StateClass.EPHEMERAL_HOT_STATE);
assert(ehProps.isDurable === false, '1.14 EH is not durable');
assert(ehProps.isEphemeral === true, '1.15 EH is ephemeral');
assert(ehProps.isAuthorityBearing === false, '1.16 EH is not authority-bearing');
assert(ehProps.lossConsequence === 'SPEED_DEGRADATION', '1.17 EH loss = SPEED_DEGRADATION');

const iaProps = getStateClassProperties(L5StateClass.IMMUTABLE_ARCHIVE_STATE);
assert(iaProps.isDurable === true, '1.18 IA is durable');
assert(iaProps.isImmutable === true, '1.19 IA is immutable');
assert(iaProps.lossConsequence === 'EVIDENCE_LOSS', '1.20 IA loss = EVIDENCE_LOSS');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Write Purpose Classifier (25 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 2 — Write Purpose Classifier ===');
resetAll();

const c1 = classifyL5WritePurpose({ writeDomain: 'CANONICAL_RECORD' });
assert(c1.primaryStateClass === L5StateClass.RELATIONAL_AUTHORITY, '2.01 CANONICAL_RECORD → RA');
assert(c1.isDurable === true, '2.02 canonical is durable');
assert(c1.isReplayRequired === true, '2.03 canonical is replay-required');
assert(c1.isAuthorityBearing === true, '2.04 canonical is authority-bearing');
assert(c1.lateArrivalSensitive === true, '2.05 canonical is late-arrival-sensitive');

const c2 = classifyL5WritePurpose({ writeDomain: 'PRICE_HISTORY' });
assert(c2.primaryStateClass === L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY, '2.06 PRICE_HISTORY → TS');
assert(c2.isDurable === true, '2.07 price history is durable');
assert(c2.isAuthorityBearing === false, '2.08 price history is not authority-bearing');

const c3 = classifyL5WritePurpose({ writeDomain: 'HOT_METRIC_SNAPSHOT' });
assert(c3.primaryStateClass === L5StateClass.EPHEMERAL_HOT_STATE, '2.09 HOT_METRIC → EH');
assert(c3.isEphemeral === true, '2.10 hot metric is ephemeral');
assert(c3.isReplayRequired === false, '2.11 hot metric not replay-required');

const c4 = classifyL5WritePurpose({ writeDomain: 'RAW_SOURCE_PAYLOAD' });
assert(c4.primaryStateClass === L5StateClass.IMMUTABLE_ARCHIVE_STATE, '2.12 RAW_PAYLOAD → IA');
assert(c4.archiveRequired === true, '2.13 raw payload is archive-required');
assert(c4.isReplayRequired === true, '2.14 raw payload is replay-required');

const c5 = classifyL5WritePurpose({ writeDomain: 'SCORE_REGISTRY' });
assert(c5.primaryStateClass === L5StateClass.RELATIONAL_AUTHORITY, '2.15 SCORE_REGISTRY → RA');
assert(c5.projectionTargets.includes(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY), '2.16 score projects to TS');
assert(c5.projectionTargets.includes(L5StateClass.EPHEMERAL_HOT_STATE), '2.17 score projects to EH');

const c6 = classifyL5WritePurpose({ writeDomain: 'DEDUPE_TOKEN' });
assert(c6.primaryStateClass === L5StateClass.EPHEMERAL_HOT_STATE, '2.18 DEDUPE_TOKEN → EH');
assert(c6.isAuthorityBearing === false, '2.19 dedupe is not authority-bearing');
assert(c6.archiveRequired === false, '2.20 dedupe not archive-required');

const c7 = classifyL5WritePurpose({ writeDomain: 'FORENSIC_EXPORT' });
assert(c7.primaryStateClass === L5StateClass.IMMUTABLE_ARCHIVE_STATE, '2.21 FORENSIC_EXPORT → IA');
assert(c7.archiveRequired === true, '2.22 forensic export is archive-required');
assert(c7.isReplayRequired === true, '2.23 forensic export is replay-required');

let threwAmbiguous = false;
try { classifyL5WritePurpose({ writeDomain: 'FAKE_DOMAIN' as any }); } catch (e: any) {
  threwAmbiguous = e.code === L5PurposeErrorCode.L5_PURPOSE_AMBIGUOUS_STATE_CLASS;
}
assert(threwAmbiguous, '2.24 unknown domain throws AMBIGUOUS_STATE_CLASS');

const c8 = classifyL5WritePurpose({ writeDomain: 'ALERT_COOLDOWN' });
assert(c8.primaryStateClass === L5StateClass.EPHEMERAL_HOT_STATE, '2.25 ALERT_COOLDOWN → EH');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Domain Routing Completeness (20 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 3 — Domain Routing Completeness ===');

assert(ALL_WRITE_DOMAINS.length >= 38, '3.01 at least 38 write domains defined');

const raDomains = getDomainsForStateClass(L5StateClass.RELATIONAL_AUTHORITY);
const tsDomains = getDomainsForStateClass(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY);
const ehDomains = getDomainsForStateClass(L5StateClass.EPHEMERAL_HOT_STATE);
const iaDomains = getDomainsForStateClass(L5StateClass.IMMUTABLE_ARCHIVE_STATE);

assert(raDomains.length >= 10, '3.02 RA has >= 10 domains');
assert(tsDomains.length >= 10, '3.03 TS has >= 10 domains');
assert(ehDomains.length >= 7, '3.04 EH has >= 7 domains');
assert(iaDomains.length >= 9, '3.05 IA has >= 9 domains');

assert(raDomains.includes('CANONICAL_RECORD'), '3.06 RA includes CANONICAL_RECORD');
assert(raDomains.includes('SCORE_REGISTRY'), '3.07 RA includes SCORE_REGISTRY');
assert(raDomains.includes('MANIFEST'), '3.08 RA includes MANIFEST');
assert(raDomains.includes('AUDIT_EVENT'), '3.09 RA includes AUDIT_EVENT');

assert(tsDomains.includes('PRICE_HISTORY'), '3.10 TS includes PRICE_HISTORY');
assert(tsDomains.includes('OHLCV'), '3.11 TS includes OHLCV');
assert(tsDomains.includes('SCORE_HISTORY'), '3.12 TS includes SCORE_HISTORY');

assert(ehDomains.includes('HOT_METRIC_SNAPSHOT'), '3.13 EH includes HOT_METRIC_SNAPSHOT');
assert(ehDomains.includes('DEDUPE_TOKEN'), '3.14 EH includes DEDUPE_TOKEN');
assert(ehDomains.includes('ALERT_COOLDOWN'), '3.15 EH includes ALERT_COOLDOWN');

assert(iaDomains.includes('RAW_SOURCE_PAYLOAD'), '3.16 IA includes RAW_SOURCE_PAYLOAD');
assert(iaDomains.includes('MODEL_INPUT'), '3.17 IA includes MODEL_INPUT');
assert(iaDomains.includes('MODEL_OUTPUT'), '3.18 IA includes MODEL_OUTPUT');
assert(iaDomains.includes('FORENSIC_EXPORT'), '3.19 IA includes FORENSIC_EXPORT');

const totalRouted = raDomains.length + tsDomains.length + ehDomains.length + iaDomains.length;
assert(totalRouted === ALL_WRITE_DOMAINS.length, '3.20 every domain maps to exactly one primary class');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Authority Home Registry (20 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 4 — Authority Home Registry ===');
resetAll();

const d1 = declareAuthorityHome({ factClass: 'score_current', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'postgres_primary', registeredAt: new Date().toISOString() });
assert(d1.success === true, '4.01 first authority declaration succeeds');
assert(hasAuthorityHome('score_current'), '4.02 hasAuthorityHome returns true');

const home1 = getAuthorityHome('score_current');
assert(home1 !== undefined, '4.03 getAuthorityHome returns declaration');
assert(home1!.authorityStoreId === 'postgres_primary', '4.04 store ID correct');
assert(home1!.stateClass === L5StateClass.RELATIONAL_AUTHORITY, '4.05 state class correct');

const d2 = declareAuthorityHome({ factClass: 'score_current', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'postgres_primary', registeredAt: new Date().toISOString() });
assert(d2.success === true, '4.06 re-declaration with same store succeeds (idempotent)');

const d3 = declareAuthorityHome({ factClass: 'score_current', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'redis_shadow', registeredAt: new Date().toISOString() });
assert(d3.success === false, '4.07 dual authority declaration fails');
assert(d3.error!.includes('DUAL_AUTHORITY'), '4.08 error mentions DUAL_AUTHORITY');

declareAuthorityHome({ factClass: 'report_current', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'postgres_primary', registeredAt: new Date().toISOString() });
declareAuthorityHome({ factClass: 'user_settings', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'postgres_primary', registeredAt: new Date().toISOString() });

const allHomes = getAllAuthorityHomes();
assert(allHomes.length === 3, '4.09 3 authority homes registered');

assert(!hasAuthorityHome('price_history'), '4.10 TS domain has no authority home');
assert(!hasAuthorityHome('hot_metric'), '4.11 EH domain has no authority home');

resetAll();
assert(!hasAuthorityHome('score_current'), '4.12 reset clears authority homes');
assert(getAllAuthorityHomes().length === 0, '4.13 reset clears all homes');

declareAuthorityHome({ factClass: 'canonical_entity', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'postgres_primary', registeredAt: '2026-01-01T00:00:00Z' });
const ce = getAuthorityHome('canonical_entity');
assert(ce!.registeredAt === '2026-01-01T00:00:00Z', '4.14 registeredAt preserved');

declareAuthorityHome({ factClass: 'watchlist', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'postgres_primary', registeredAt: '2026-01-01T00:00:00Z' });
declareAuthorityHome({ factClass: 'manifest', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'postgres_primary', registeredAt: '2026-01-01T00:00:00Z' });
assert(getAllAuthorityHomes().length === 3, '4.15 3 homes after batch registration');

const d4 = declareAuthorityHome({ factClass: 'watchlist', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'clickhouse_analytics', registeredAt: '2026-01-01T00:00:00Z' });
assert(d4.success === false, '4.16 dual authority on watchlist blocked');

assert(typeof getAuthorityHome('nonexistent') === 'undefined', '4.17 nonexistent returns undefined');
assert(hasAuthorityHome('canonical_entity') === true, '4.18 canonical_entity home exists');
assert(hasAuthorityHome('watchlist') === true, '4.19 watchlist home exists');
assert(hasAuthorityHome('manifest') === true, '4.20 manifest home exists');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Allowed Capability Registry (20 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 5 — Allowed Capability Registry ===');
resetAll();

assert(ALL_CAPABILITIES.length === 7, '5.01 exactly 7 allowed capabilities');

const reg1 = registerL5ModuleCapabilities({
  moduleId: 'write-coordinator',
  declaredCapabilities: [AllowedL5Capability.COORDINATE_CROSS_STORE_WRITE, AllowedL5Capability.ENFORCE_STORAGE_LAW],
  registeredAt: new Date().toISOString(),
});
assert(reg1.success === true, '5.02 module registration succeeds');

const mod1 = getModuleCapabilities('write-coordinator');
assert(mod1 !== undefined, '5.03 module retrievable');
assert(mod1!.declaredCapabilities.length === 2, '5.04 2 capabilities declared');

const chk1 = assertLayer5Capability('write-coordinator', AllowedL5Capability.COORDINATE_CROSS_STORE_WRITE);
assert(chk1.allowed === true, '5.05 declared capability allowed');

const chk2 = assertLayer5Capability('write-coordinator', AllowedL5Capability.PERSIST_GOVERNED_OUTPUT);
assert(chk2.allowed === false, '5.06 undeclared capability denied');
assert(chk2.violation!.includes('CAPABILITY_UNDECLARED'), '5.07 violation is CAPABILITY_UNDECLARED');

const chk3 = assertLayer5Capability('unknown-module', AllowedL5Capability.PERSIST_APP_STATE);
assert(chk3.allowed === false, '5.08 unregistered module denied');
assert(chk3.violation!.includes('MODULE_UNREGISTERED'), '5.09 violation is MODULE_UNREGISTERED');

registerL5ModuleCapabilities({
  moduleId: 'postgres-writer',
  declaredCapabilities: [AllowedL5Capability.PERSIST_GOVERNED_OUTPUT, AllowedL5Capability.PERSIST_APP_STATE],
  registeredAt: new Date().toISOString(),
});
registerL5ModuleCapabilities({
  moduleId: 'replay-engine',
  declaredCapabilities: [AllowedL5Capability.RECONSTRUCT_HISTORICAL_STATE, AllowedL5Capability.BUILD_FORENSIC_TRACE],
  registeredAt: new Date().toISOString(),
});

const allMods = getAllRegisteredModules();
assert(allMods.length === 3, '5.10 3 modules registered');

const chk4 = assertLayer5Capability('postgres-writer', AllowedL5Capability.PERSIST_GOVERNED_OUTPUT);
assert(chk4.allowed === true, '5.11 postgres-writer can persist governed output');

const chk5 = assertLayer5Capability('replay-engine', AllowedL5Capability.RECONSTRUCT_HISTORICAL_STATE);
assert(chk5.allowed === true, '5.12 replay-engine can reconstruct');

const chk6 = assertLayer5Capability('replay-engine', AllowedL5Capability.PERSIST_GOVERNED_OUTPUT);
assert(chk6.allowed === false, '5.13 replay-engine cannot persist governed output');

const badReg = registerL5ModuleCapabilities({
  moduleId: 'bad-module',
  declaredCapabilities: ['INVENT_TRUTH' as any],
  registeredAt: new Date().toISOString(),
});
assert(badReg.success === false, '5.14 unknown capability rejected');
assert(badReg.error!.includes('UNKNOWN_CAPABILITY'), '5.15 error is UNKNOWN_CAPABILITY');

resetAll();
assert(getAllRegisteredModules().length === 0, '5.16 reset clears modules');
assert(assertLayer5Capability('write-coordinator', AllowedL5Capability.ENFORCE_STORAGE_LAW).allowed === false, '5.17 post-reset module check fails');

registerL5ModuleCapabilities({
  moduleId: 'materializer',
  declaredCapabilities: [AllowedL5Capability.MATERIALIZE_READ_PROJECTION],
  registeredAt: new Date().toISOString(),
});
assert(assertLayer5Capability('materializer', AllowedL5Capability.MATERIALIZE_READ_PROJECTION).allowed === true, '5.18 materializer allowed');
assert(assertLayer5Capability('materializer', AllowedL5Capability.ENFORCE_STORAGE_LAW).allowed === false, '5.19 materializer cannot enforce');
assert(getModuleCapabilities('materializer')!.moduleId === 'materializer', '5.20 module ID preserved');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Forbidden Action Policy Checks (25 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 6 — Forbidden Action Policy Checks ===');
resetAll();

assert(ALL_FORBIDDEN_ACTIONS.length === 8, '6.01 exactly 8 forbidden actions');

const clean: WriteIntentSignals = {};
const cleanResult = assertNoForbiddenL5Action('test-module', clean);
assert(cleanResult.length === 0, '6.02 clean signals produce no violations');

const identity: WriteIntentSignals = { inventsCanonicalIdentity: true };
const idResult = assertNoForbiddenL5Action('test-module', identity);
assert(idResult.length === 1, '6.03 invent identity produces 1 violation');
assert(idResult[0].action === ForbiddenL5Action.INVENT_CANONICAL_IDENTITY, '6.04 correct forbidden action');
assert(idResult[0].severity === 'BLOCK', '6.05 severity is BLOCK');

const conf: WriteIntentSignals = { overridesConfidenceRights: true };
assert(assertNoForbiddenL5Action('m', conf)[0].action === ForbiddenL5Action.REINTERPRET_CONFIDENCE, '6.06 confidence override detected');

const metric: WriteIntentSignals = { redefinesMetricMeaning: true };
assert(assertNoForbiddenL5Action('m', metric)[0].action === ForbiddenL5Action.REDEFINE_METRIC_MEANING, '6.07 metric redefine detected');

const graph: WriteIntentSignals = { redefinesGraphSemantics: true };
assert(assertNoForbiddenL5Action('m', graph)[0].action === ForbiddenL5Action.REDEFINE_GRAPH_SEMANTICS, '6.08 graph redefine detected');

const upgrade: WriteIntentSignals = { upgradesUnresolvedSilently: true };
assert(assertNoForbiddenL5Action('m', upgrade)[0].action === ForbiddenL5Action.UPGRADE_UNRESOLVED_SILENTLY, '6.09 silent upgrade detected');

const provider: WriteIntentSignals = { usesProviderNativeAsTruth: true };
assert(assertNoForbiddenL5Action('m', provider)[0].action === ForbiddenL5Action.ACCEPT_PROVIDER_NATIVE_AS_TRUTH, '6.10 provider-as-truth detected');

const shadow: WriteIntentSignals = { createsShadowAuthority: true };
assert(assertNoForbiddenL5Action('m', shadow)[0].action === ForbiddenL5Action.CREATE_SHADOW_AUTHORITY, '6.11 shadow authority detected');

const hide: WriteIntentSignals = { hidesFailure: true };
assert(assertNoForbiddenL5Action('m', hide)[0].action === ForbiddenL5Action.HIDE_FAILURE_WITH_FALLBACK, '6.12 hidden failure detected');

const multi: WriteIntentSignals = { inventsCanonicalIdentity: true, overridesConfidenceRights: true, redefinesMetricMeaning: true };
const multiResult = assertNoForbiddenL5Action('multi-violator', multi);
assert(multiResult.length === 3, '6.13 multiple violations stacked');

const falseSignals: WriteIntentSignals = { inventsCanonicalIdentity: false, overridesConfidenceRights: false };
assert(assertNoForbiddenL5Action('m', falseSignals).length === 0, '6.14 false flags produce no violations');

let reportThrew = false;
try {
  reportForbiddenAction({
    action: ForbiddenL5Action.CREATE_SHADOW_AUTHORITY,
    moduleId: 'rogue-cache',
    description: 'Cache acting as authority',
    severity: 'BLOCK',
    detectedAt: new Date().toISOString(),
    metadata: {},
  });
} catch (e: any) {
  reportThrew = e instanceof L5PurposeError;
}
assert(reportThrew, '6.15 BLOCK report throws L5PurposeError');

resetForbiddenActionLog();
reportForbiddenAction({
  action: ForbiddenL5Action.ACCEPT_PROVIDER_NATIVE_AS_TRUTH,
  moduleId: 'test',
  description: 'test warn',
  severity: 'WARN',
  detectedAt: new Date().toISOString(),
  metadata: {},
});
assert(getForbiddenActionLog().length === 1, '6.16 WARN report logged without throw');

resetForbiddenActionLog();
assert(getForbiddenActionLog().length === 0, '6.17 log cleared on reset');

for (const fa of ALL_FORBIDDEN_ACTIONS) {
  assert(typeof fa === 'string' && fa.length > 0, `6.${18 + ALL_FORBIDDEN_ACTIONS.indexOf(fa)} forbidden action '${fa}' is valid string`);
}

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Invariant Engine (20 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 7 — Invariant Engine ===');
resetAll();

assert(L5_PURPOSE_INVARIANTS.length === 10, '7.01 exactly 10 invariants defined');

const validClassification: L5PurposeClassification = {
  primaryStateClass: L5StateClass.RELATIONAL_AUTHORITY,
  isDurable: true, isReplayRequired: true, isAuthorityBearing: true,
  isEphemeral: false, archiveRequired: false, lateArrivalSensitive: false,
  projectionTargets: [L5StateClass.EPHEMERAL_HOT_STATE],
};

declareAuthorityHome({ factClass: 'test_fact', stateClass: L5StateClass.RELATIONAL_AUTHORITY, authorityStoreId: 'pg', registeredAt: new Date().toISOString() });
const allChecks = assertL5PurposeInvariant(validClassification, { factClass: 'test_fact', hasLineageMetadata: true });
const allPass = allChecks.every(r => r.passed);
assert(allPass, '7.02 valid classification passes all invariants');
assert(allChecks.length === 10, '7.03 10 invariant checks returned');

const ephAuth: L5PurposeClassification = {
  primaryStateClass: L5StateClass.EPHEMERAL_HOT_STATE,
  isDurable: false, isReplayRequired: false, isAuthorityBearing: true,
  isEphemeral: true, archiveRequired: false, lateArrivalSensitive: false,
  projectionTargets: [],
};
const ephChecks = assertL5PurposeInvariant(ephAuth);
const invA = ephChecks.find(r => r.invariantId === 'INV-5.1-A');
assert(invA!.passed === false, '7.04 INV-A catches ephemeral claiming authority');
const invE = ephChecks.find(r => r.invariantId === 'INV-5.1-E');
assert(invE!.passed === false, '7.05 INV-E catches ephemeral authority promotion');

const noLineage: L5PurposeClassification = {
  primaryStateClass: L5StateClass.RELATIONAL_AUTHORITY,
  isDurable: true, isReplayRequired: true, isAuthorityBearing: true,
  isEphemeral: false, archiveRequired: false, lateArrivalSensitive: false,
  projectionTargets: [],
};
const lineageChecks = assertL5PurposeInvariant(noLineage, { hasLineageMetadata: false });
const invD = lineageChecks.find(r => r.invariantId === 'INV-5.1-D');
assert(invD!.passed === false, '7.06 INV-D catches missing replay lineage');

const noHomeChecks = assertL5PurposeInvariant(validClassification, { factClass: 'orphan_fact' });
const invC = noHomeChecks.find(r => r.invariantId === 'INV-5.1-C');
assert(invC!.passed === false, '7.07 INV-C catches missing authority home');

const archiveNoMeta: L5PurposeClassification = {
  primaryStateClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,
  isDurable: true, isReplayRequired: true, isAuthorityBearing: false,
  isEphemeral: false, archiveRequired: true, lateArrivalSensitive: false,
  projectionTargets: [],
};
const archChecks = assertL5PurposeInvariant(archiveNoMeta, { hasArchiveMetadata: false });
const invF = archChecks.find(r => r.invariantId === 'INV-5.1-F');
assert(invF!.passed === false, '7.08 INV-F catches archive without indexable metadata');

const hardenChecks = assertL5PurposeInvariant(validClassification, { factClass: 'test_fact', hardeningUnresolved: true });
const invG = hardenChecks.find(r => r.invariantId === 'INV-5.1-G');
assert(invG!.passed === false, '7.09 INV-G catches silent resolution hardening');

const projLoss = assertL5PurposeInvariant(
  { ...archiveNoMeta, isAuthorityBearing: false },
  { isProjectionLoss: true, reportedAsTruthLoss: true },
);
const invH = projLoss.find(r => r.invariantId === 'INV-5.1-H');
assert(invH!.passed === false, '7.10 INV-H catches projection loss misreported as truth loss');

const lateChecks = assertL5PurposeInvariant(
  { ...validClassification, lateArrivalSensitive: false },
  { factClass: 'test_fact', isLateData: true },
);
const invI = lateChecks.find(r => r.invariantId === 'INV-5.1-I');
assert(invI!.passed === false, '7.11 INV-I catches undeclared late data');

const selfProj: L5PurposeClassification = {
  primaryStateClass: L5StateClass.RELATIONAL_AUTHORITY,
  isDurable: true, isReplayRequired: true, isAuthorityBearing: true,
  isEphemeral: false, archiveRequired: false, lateArrivalSensitive: false,
  projectionTargets: [L5StateClass.RELATIONAL_AUTHORITY],
};
const selfChecks = assertL5PurposeInvariant(selfProj, { factClass: 'test_fact' });
const invJ = selfChecks.find(r => r.invariantId === 'INV-5.1-J');
assert(invJ!.passed === false, '7.12 INV-J catches self-projection breaking read-surface distinction');

let enforceThrew = false;
try { enforceL5PurposeInvariants(ephAuth); } catch (e: any) {
  enforceThrew = e instanceof L5PurposeError;
}
assert(enforceThrew, '7.13 enforceL5PurposeInvariants throws on failure');

const goodTS: L5PurposeClassification = {
  primaryStateClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,
  isDurable: true, isReplayRequired: false, isAuthorityBearing: false,
  isEphemeral: false, archiveRequired: false, lateArrivalSensitive: true,
  projectionTargets: [L5StateClass.EPHEMERAL_HOT_STATE],
};
const tsChecks = assertL5PurposeInvariant(goodTS);
assert(tsChecks.every(r => r.passed), '7.14 valid TS classification passes all invariants');

const goodEH: L5PurposeClassification = {
  primaryStateClass: L5StateClass.EPHEMERAL_HOT_STATE,
  isDurable: false, isReplayRequired: false, isAuthorityBearing: false,
  isEphemeral: true, archiveRequired: false, lateArrivalSensitive: false,
  projectionTargets: [],
};
assert(assertL5PurposeInvariant(goodEH).every(r => r.passed), '7.15 valid EH classification passes all invariants');

const goodIA: L5PurposeClassification = {
  primaryStateClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,
  isDurable: true, isReplayRequired: true, isAuthorityBearing: false,
  isEphemeral: false, archiveRequired: true, lateArrivalSensitive: false,
  projectionTargets: [],
};
assert(assertL5PurposeInvariant(goodIA, { hasArchiveMetadata: true }).every(r => r.passed), '7.16 valid IA classification passes all invariants');

for (const inv of L5_PURPOSE_INVARIANTS) {
  assert(typeof inv.id === 'string' && inv.id.startsWith('INV-5.1-'), `7.${17 + L5_PURPOSE_INVARIANTS.indexOf(inv)} invariant ${inv.id} has valid ID`);
}

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 8 — Purpose Charter Structural Integrity (20 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 8 — Purpose Charter Structural Integrity ===');

assert(L5_MISSION.statement.length > 0, '8.01 mission statement non-empty');
assert(L5_MISSION.qualities.length === 6, '8.02 6 mission qualities');
assert(L5_MISSION.qualities.includes('durable'), '8.03 durable in qualities');
assert(L5_MISSION.qualities.includes('replayable'), '8.04 replayable in qualities');
assert(L5_MISSION.qualities.includes('repairable'), '8.05 repairable in qualities');

assert(FAILURE_SIGNATURES.length === 8, '8.06 8 failure signatures');
for (const fs of FAILURE_SIGNATURES) {
  assert(fs.endangeredClasses.length >= 1, `8.${7 + FAILURE_SIGNATURES.indexOf(fs)} failure ${fs.id} endangers at least 1 class`);
}

assert(LAYER_DEPENDENCIES.length === 3, '8.15 3 layer dependencies');
const l3dep = LAYER_DEPENDENCIES.find(d => d.layerId === 'L3');
assert(l3dep !== undefined, '8.16 L3 dependency defined');
assert(l3dep!.l5MayOverride === false, '8.17 L5 may not override L3');

const l4dep = LAYER_DEPENDENCIES.find(d => d.layerId === 'L4');
assert(l4dep !== undefined, '8.18 L4 dependency defined');
assert(l4dep!.l5MayOverride === false, '8.19 L5 may not override L4');

assert(STATE_DOCTRINE.length === 5, '8.20 5 state doctrine rules');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 9 — Anti-Fake: State-Class Collapse Prevention (15 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 9 — Anti-Fake: State-Class Collapse Prevention ===');
resetAll();

const ehNotAuth = getStateClassProperties(L5StateClass.EPHEMERAL_HOT_STATE);
assert(ehNotAuth.isAuthorityBearing === false, '9.01 EH cannot be authority');

const tsNotAuth = getStateClassProperties(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY);
assert(tsNotAuth.isAuthorityBearing === false, '9.02 TS cannot be authority');

const iaNotAuth = getStateClassProperties(L5StateClass.IMMUTABLE_ARCHIVE_STATE);
assert(iaNotAuth.isAuthorityBearing === false, '9.03 IA cannot be authority');

const raIsAuth = getStateClassProperties(L5StateClass.RELATIONAL_AUTHORITY);
assert(raIsAuth.isAuthorityBearing === true, '9.04 only RA is authority');

const ehClassified = classifyL5WritePurpose({ writeDomain: 'DEDUPE_TOKEN' });
assert(ehClassified.isAuthorityBearing === false, '9.05 dedupe token not authority');
assert(ehClassified.isEphemeral === true, '9.06 dedupe token is ephemeral');

const raClassified = classifyL5WritePurpose({ writeDomain: 'CANONICAL_RECORD' });
assert(raClassified.isAuthorityBearing === true, '9.07 canonical record is authority');
assert(raClassified.isEphemeral === false, '9.08 canonical record not ephemeral');

const iaClassified = classifyL5WritePurpose({ writeDomain: 'RAW_SOURCE_PAYLOAD' });
assert(iaClassified.archiveRequired === true, '9.09 raw payload requires archive');
assert(iaClassified.isAuthorityBearing === false, '9.10 archive not authority');

const mixedSignals = assertNoForbiddenL5Action('bad-cache', { createsShadowAuthority: true });
assert(mixedSignals.length === 1, '9.11 shadow authority detected for bad cache');
assert(mixedSignals[0].action === ForbiddenL5Action.CREATE_SHADOW_AUTHORITY, '9.12 correct forbidden action');

const providerSignals = assertNoForbiddenL5Action('ingester', { usesProviderNativeAsTruth: true });
assert(providerSignals.length === 1, '9.13 provider-as-truth detected');

const upgradeSignals = assertNoForbiddenL5Action('writer', { upgradesUnresolvedSilently: true });
assert(upgradeSignals.length === 1, '9.14 silent upgrade detected');
assert(upgradeSignals[0].severity === 'BLOCK', '9.15 silent upgrade is BLOCK severity');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 10 — Anti-Fake: Constitutional Boundary Enforcement (15 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 10 — Anti-Fake: Constitutional Boundary Enforcement ===');
resetAll();

assert(L5_BOUNDARY_ASSERTION.includes('does not define canonical identity'), '10.01 boundary mentions canonical identity');
assert(L5_BOUNDARY_ASSERTION.includes('confidence law'), '10.02 boundary mentions confidence law');
assert(L5_BOUNDARY_ASSERTION.includes('metric validity'), '10.03 boundary mentions metric validity');
assert(L5_BOUNDARY_ASSERTION.includes('graph semantics'), '10.04 boundary mentions graph semantics');

assert(L5_PURPOSE_CHARTER.schemaVersion === 'v1', '10.05 charter schema v1');
assert(L5_PURPOSE_CHARTER.stateClasses.length === 4, '10.06 charter has 4 state classes');
assert(L5_PURPOSE_CHARTER.allowedCapabilities.length === 7, '10.07 charter has 7 capabilities');
assert(L5_PURPOSE_CHARTER.forbiddenActions.length === 8, '10.08 charter has 8 forbidden actions');
assert(L5_PURPOSE_CHARTER.failureSignatures.length === 8, '10.09 charter has 8 failure signatures');
assert(L5_PURPOSE_CHARTER.layerDependencies.length === 3, '10.10 charter has 3 layer dependencies');
assert(L5_PURPOSE_CHARTER.stateDoctrine.length === 5, '10.11 charter has 5 doctrine rules');

const docReplay = STATE_DOCTRINE.find(d => d.ruleId === 'DOCTRINE-5');
assert(docReplay !== undefined, '10.12 DOCTRINE-5 (historical reconstruction) exists');
assert(docReplay!.law.includes('reconstructable'), '10.13 DOCTRINE-5 mentions reconstructable');

const docAuthority = STATE_DOCTRINE.find(d => d.ruleId === 'DOCTRINE-1');
assert(docAuthority !== undefined, '10.14 DOCTRINE-1 (one legal home) exists');
assert(docAuthority!.law.includes('one authoritative home'), '10.15 DOCTRINE-1 mentions one authoritative home');

// ═════════════════════════════════════════════════════════════════════════════════
// FINAL
// ═════════════════════════════════════════════════════════════════════════════════

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

})();
