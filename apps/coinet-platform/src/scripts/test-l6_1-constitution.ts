/**
 * L6.1 — Constitutional Position, Mission, and Layer Boundary
 * Certification Test Suite
 *
 * 5 Bands:
 *   A — Mission and boundary legality
 *   B — Dependency law
 *   C — Forbidden action enforcement
 *   D — Output surface legality
 *   E — Audit, traceability, and constitutional invariants
 */

// ── Contracts ──
import {
  L6PrimitiveClass, ALL_PRIMITIVE_CLASSES,
  L6AllowedCapability, ALL_ALLOWED_CAPABILITIES,
  L6ForbiddenAction, ALL_FORBIDDEN_ACTIONS,
  L6DependencyLayer, ALL_DEPENDENCY_LAYERS,
  L6DependencySurfaceClass, ALL_DEPENDENCY_SURFACE_CLASSES,
  L6OutputSurfaceClass, ALL_OUTPUT_SURFACE_CLASSES,
  ALL_CAPABILITY_CONTEXTS,
  L6BoundaryViolationCode, ALL_VIOLATION_CODES, L6ConstitutionalError,
  L6_MISSION, L6_MISSION_CONSTRAINT, isLegalOutputClass, isForbiddenOutputClass, matchesMission,
  L6_IS_NOT, L6_DOES_NOT_ANSWER, containsForbiddenNaming, isValidPrimitiveName, checkForbiddenSemantics,
  getForbiddenNamePatterns, getValidNameExamples,
  L6_CAPABILITY_POLICY, getCapabilityDecision, isCapabilityAllowed, getDeniedCapabilities,
  FORBIDDEN_ACTION_DEFINITIONS, getForbiddenActionDefinition, getAllCriticalForbiddenActions,
  L6_DEPENDENCY_SURFACES, getDependencySurface, isRegisteredDependency, getSurfacesForLayer,
  getSurfacesUsableFor, isUsableFor,
  L6_OUTPUT_SURFACES, getOutputSurface, isRegisteredOutput, isRegisteredOutputClass,
  getOutputsForPrimitive, getAllRequiredLineageFields,
} from '../l6/contracts';

// ── Constitution ──
import {
  requestDependencyAccess, assertDependencyAccess, getAllRegisteredSurfaceIds,
  validateOutputEmission, assertOutputEmission, validateOutputClassName, getAllRegisteredOutputIds,
  evaluateCapabilityClaim, assertCapabilityClaim, getFullCapabilityMatrix, getCapabilityPolicyCount,
  checkForForbiddenActions, assertNoForbiddenActions, checkPrimitiveNameLegality,
  getRegisteredForbiddenActionCount, getCriticalForbiddenActionCount,
  validatePrimitiveDefinition, validateRawInputAbsence, validateNeutralFillAbsence,
  resetConstitutionalAuditLog, emitAuditRecord, getConstitutionalAuditLog,
  getCriticalViolations, getViolationsByCode, hasAnyViolations, getViolationCount,
  emitDependencyViolation, emitOutputViolation, emitNamingViolation, emitRawInputViolation,
} from '../l6/constitution';

// ── Invariants ──
import { checkAllL61Invariants, checkINV_61_A, checkINV_61_B, checkINV_61_C, checkINV_61_D, checkINV_61_E, checkINV_61_F, checkINV_61_G, checkINV_61_H } from '../l6/invariants';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetConstitutionalAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Mission and Boundary Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Mission and Boundary Legality ═══');
resetAll();

// A.1 — Mission defined
assert(L6_MISSION.name === 'Layer 6 — Feature & Event Engine', 'A.1 — Mission name');
assert(L6_MISSION.canonical.includes('replay-safe'), 'A.2 — Mission mentions replay-safe');
assert(L6_MISSION.canonical.includes('deterministic'), 'A.3 — Mission mentions deterministic');
assert(L6_MISSION.intelligenceBoundary.includes('first governed intelligence primitives'), 'A.4 — Intelligence boundary');

// A.5 — Two primitive classes
assert(ALL_PRIMITIVE_CLASSES.length === 2, 'A.5 — 2 primitive classes');
assert(ALL_PRIMITIVE_CLASSES.includes(L6PrimitiveClass.FEATURE), 'A.6 — FEATURE');
assert(ALL_PRIMITIVE_CLASSES.includes(L6PrimitiveClass.EVENT), 'A.7 — EVENT');

// A.8 — Frozen dependencies
assert(L6_MISSION.frozenDependencies.length === 3, 'A.8 — 3 frozen dependencies');
assert(L6_MISSION.frozenDependencies.includes(L6DependencyLayer.L3), 'A.9 — L3 dependency');
assert(L6_MISSION.frozenDependencies.includes(L6DependencyLayer.L4), 'A.10 — L4 dependency');
assert(L6_MISSION.frozenDependencies.includes(L6DependencyLayer.L5), 'A.11 — L5 dependency');

// A.12 — 4 output classes
assert(L6_MISSION.outputClasses.length === 4, 'A.12 — 4 output classes');
assert(ALL_OUTPUT_SURFACE_CLASSES.length === 4, 'A.13 — 4 output surface classes');

// A.14 — Mission constraint
assert(L6_MISSION_CONSTRAINT.replayCompatibilityRequired === true, 'A.14 — Replay required');
assert(L6_MISSION_CONSTRAINT.storageRoutingRequired === true, 'A.15 — Storage routing required');
assert(L6_MISSION_CONSTRAINT.forbiddenOutputClasses.length >= 7, 'A.16 — ≥7 forbidden output classes');
assert(L6_MISSION_CONSTRAINT.allowedCapabilities.length === 9, 'A.17 — 9 allowed capabilities');

// A.18 — Legal/forbidden output classes
assert(isLegalOutputClass(L6OutputSurfaceClass.FEATURE_HISTORY_FACT), 'A.18 — Feature history legal');
assert(isLegalOutputClass(L6OutputSurfaceClass.CURRENT_FEATURE_STATE), 'A.19 — Current feature legal');
assert(isLegalOutputClass(L6OutputSurfaceClass.EVENT_INSTANCE), 'A.20 — Event instance legal');
assert(isLegalOutputClass(L6OutputSurfaceClass.EVIDENCE_PACK), 'A.21 — Evidence pack legal');
assert(isForbiddenOutputClass('RECOMMENDATION'), 'A.22 — RECOMMENDATION forbidden');
assert(isForbiddenOutputClass('TRADE_SIGNAL'), 'A.23 — TRADE_SIGNAL forbidden');
assert(!isForbiddenOutputClass('FEATURE_HISTORY_FACT'), 'A.24 — Feature history not forbidden');

// A.25 — matchesMission
assert(matchesMission('Compute deterministic feature values from governed state'), 'A.25 — Legal mission matches');
assert(!matchesMission('Generate trade signal recommendations'), 'A.26 — Illegal mission rejected');

// A.27 — Negative boundary
assert(L6_IS_NOT.length === 6, 'A.27 — 6 negative definitions');
assert(L6_DOES_NOT_ANSWER.length === 6, 'A.28 — 6 things L6 does not answer');

// A.29 — Forbidden naming
assert(containsForbiddenNaming('buy_signal'), 'A.29 — buy_signal forbidden');
assert(containsForbiddenNaming('bullish_confirmation'), 'A.30 — bullish_confirmation forbidden');
assert(containsForbiddenNaming('strong_thesis_validated'), 'A.31 — strong_thesis forbidden');
assert(containsForbiddenNaming('avoid_score'), 'A.32 — avoid_score forbidden');
assert(!containsForbiddenNaming('funding_z_score'), 'A.33 — funding_z_score allowed');
assert(!containsForbiddenNaming('whale_accumulation_cluster'), 'A.34 — whale_accumulation allowed');
assert(!containsForbiddenNaming('liquidation_burst'), 'A.35 — liquidation_burst allowed');

// A.36 — Valid primitive names
assert(isValidPrimitiveName('funding_z_score'), 'A.36 — Valid name accepted');
assert(!isValidPrimitiveName('BuySignal'), 'A.37 — PascalCase rejected');
assert(!isValidPrimitiveName(''), 'A.38 — Empty name rejected');
assert(!isValidPrimitiveName('buy_signal'), 'A.39 — Forbidden name rejected');

// A.40 — Semantic check detail
const semCheck = checkForbiddenSemantics('high_conviction_trade_event');
assert(semCheck.forbidden === true, 'A.40 — Semantic check detects violation');
assert(semCheck.matchedPattern !== null, 'A.41 — Pattern reported');

// A.42 — 9 allowed capabilities
assert(ALL_ALLOWED_CAPABILITIES.length === 9, 'A.42 — 9 capabilities');

// A.43 — 10 forbidden actions
assert(ALL_FORBIDDEN_ACTIONS.length === 10, 'A.43 — 10 forbidden actions');

// A.44 — Valid name examples
assert(getValidNameExamples().length >= 7, 'A.44 — ≥7 valid name examples');
assert(getForbiddenNamePatterns().length >= 10, 'A.45 — ≥10 forbidden patterns');

// ═══════════════════════════════════════════════════════════════
// BAND B — Dependency Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Law ═══');
resetAll();

// B.1 — 11 dependency surfaces
assert(L6_DEPENDENCY_SURFACES.length === 11, 'B.1 — 11 dependency surfaces');

// B.2 — L3 surfaces
const l3Surfaces = getSurfacesForLayer(L6DependencyLayer.L3);
assert(l3Surfaces.length === 4, 'B.2 — 4 L3 surfaces');

// B.3 — L4 surfaces
const l4Surfaces = getSurfacesForLayer(L6DependencyLayer.L4);
assert(l4Surfaces.length === 3, 'B.3 — 3 L4 surfaces');

// B.4 — L5 surfaces
const l5Surfaces = getSurfacesForLayer(L6DependencyLayer.L5);
assert(l5Surfaces.length === 4, 'B.4 — 4 L5 surfaces');

// B.5 — All registered
assert(getAllRegisteredSurfaceIds().length === 11, 'B.5 — 11 registered IDs');

// B.6 — Registered access succeeds
const legalReq = requestDependencyAccess({ surfaceId: 'l3:canonical_objects', requestedUsage: 'FEATURE_COMPUTE', requestor: 'test', timestamp: new Date().toISOString() });
assert(legalReq.allowed, 'B.6 — Legal dependency access granted');

// B.7 — Unregistered access fails
const illegalReq = requestDependencyAccess({ surfaceId: 'raw:coingecko_json', requestedUsage: 'FEATURE_COMPUTE', requestor: 'test', timestamp: new Date().toISOString() });
assert(!illegalReq.allowed, 'B.7 — Unregistered dependency blocked');

// B.8 — Wrong usage fails
const wrongUsage = requestDependencyAccess({ surfaceId: 'l3:identity_resolution', requestedUsage: 'FEATURE_COMPUTE', requestor: 'test', timestamp: new Date().toISOString() });
assert(!wrongUsage.allowed, 'B.8 — Identity resolution blocked for FEATURE_COMPUTE');

// B.9 — Evidence-only surfaces
assert(isUsableFor('l3:identity_resolution', 'EVIDENCE_ONLY'), 'B.9 — Identity usable for evidence');
assert(!isUsableFor('l3:identity_resolution', 'FEATURE_COMPUTE'), 'B.10 — Identity not for compute');
assert(!isUsableFor('l3:identity_resolution', 'EVENT_DETECTION'), 'B.11 — Identity not for events');

// B.12 — L5 replay/repair are evidence-only
assert(isUsableFor('l5:replay', 'EVIDENCE_ONLY'), 'B.12 — Replay usable for evidence');
assert(!isUsableFor('l5:replay', 'FEATURE_COMPUTE'), 'B.13 — Replay not for compute');
assert(!isUsableFor('l5:repair', 'FEATURE_COMPUTE'), 'B.14 — Repair not for compute');

// B.15 — assertDependencyAccess throws for unregistered
let threw = false;
try { assertDependencyAccess({ surfaceId: 'fake:surface', requestedUsage: 'FEATURE_COMPUTE', requestor: 'test', timestamp: new Date().toISOString() }); }
catch (e: any) { threw = true; assert(e.code === L6BoundaryViolationCode.UNREGISTERED_DEPENDENCY, 'B.15a — Correct violation code'); }
assert(threw, 'B.15b — assertDependencyAccess throws');

// B.16 — Feature compute surfaces
const featureSurfaces = getSurfacesUsableFor('FEATURE_COMPUTE');
assert(featureSurfaces.length >= 5, 'B.16 — ≥5 feature-compute surfaces');

// B.17 — Baseline construction surfaces
const baselineSurfaces = getSurfacesUsableFor('BASELINE_CONSTRUCTION');
assert(baselineSurfaces.length >= 4, 'B.17 — ≥4 baseline surfaces');

// B.18 — All surfaces are replay compatible
assert(L6_DEPENDENCY_SURFACES.every(s => s.replayCompatible), 'B.18 — All surfaces replay compatible');

// ═══════════════════════════════════════════════════════════════
// BAND C — Forbidden Action Enforcement
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Forbidden Action Enforcement ═══');
resetAll();

// C.1 — 10 forbidden action definitions
assert(FORBIDDEN_ACTION_DEFINITIONS.length === 10, 'C.1 — 10 forbidden actions defined');
assert(getRegisteredForbiddenActionCount() === 10, 'C.2 — 10 registered');

// C.3 — Critical actions
assert(getCriticalForbiddenActionCount() >= 6, 'C.3 — ≥6 critical actions');

// C.4 — Every action has definition
for (const action of ALL_FORBIDDEN_ACTIONS) {
  const def = getForbiddenActionDefinition(action);
  assert(def !== undefined, `C.4 — ${action} has definition`);
  assert(def.examples.length > 0, `C.4a — ${action} has examples`);
}

// C.5 — Forbidden action check: judgment language
const judgmentCheck = checkForForbiddenActions({ proposedName: 'buy_signal', context: 'test' });
assert(!judgmentCheck.clean, 'C.5 — Judgment language detected');
assert(judgmentCheck.violations[0].violationCode === L6BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS, 'C.5a — Correct code');

// C.6 — Clean name passes
const cleanCheck = checkForForbiddenActions({ proposedName: 'volume_anomaly_ratio', context: 'test' });
assert(cleanCheck.clean, 'C.6 — Clean name passes');

// C.7 — assertNoForbiddenActions throws
threw = false;
try { assertNoForbiddenActions({ proposedName: 'bullish_confirmation', context: 'test' }); }
catch (e: any) { threw = true; assert(e instanceof L6ConstitutionalError, 'C.7a — Correct error type'); }
assert(threw, 'C.7b — assertNoForbiddenActions throws');

// C.8 — Raw input validation
const rawResult = validateRawInputAbsence(['raw:provider_json', 'l3:canonical_objects']);
assert(!rawResult.valid, 'C.8 — Raw provider input detected');
assert(rawResult.violations.some(v => v.code === L6BoundaryViolationCode.RAW_PROVIDER_INPUT), 'C.8a — RAW_PROVIDER_INPUT code');

// C.9 — Clean input passes
const cleanInput = validateRawInputAbsence(['l3:canonical_objects', 'l4:graph_relations']);
assert(cleanInput.valid, 'C.9 — Clean inputs pass');

// C.10 — Neutral fill validation
const neutralResult = validateNeutralFillAbsence([
  { field: 'metric', handler: 'default to 0' },
  { field: 'baseline', handler: 'fill normal' },
]);
assert(!neutralResult.valid, 'C.10 — Neutral fill detected');
assert(neutralResult.violations.length === 2, 'C.10a — 2 neutral fill violations');

// C.11 — Explicit missing handling passes
const explicitResult = validateNeutralFillAbsence([
  { field: 'metric', handler: 'propagate_missing_explicitly' },
  { field: 'baseline', handler: 'return_error_with_reason' },
]);
assert(explicitResult.valid, 'C.11 — Explicit missing handling passes');

// C.12 — Primitive name legality
const nameCheck1 = checkPrimitiveNameLegality('funding_z_score');
assert(nameCheck1.legal, 'C.12a — funding_z_score legal');
const nameCheck2 = checkPrimitiveNameLegality('buy_signal');
assert(!nameCheck2.legal, 'C.12b — buy_signal illegal');
const nameCheck3 = checkPrimitiveNameLegality('');
assert(!nameCheck3.legal, 'C.12c — Empty name illegal');
const nameCheck4 = checkPrimitiveNameLegality('CamelCase');
assert(!nameCheck4.legal, 'C.12d — CamelCase illegal');

// C.13 — Storage bypass is forbidden
assert(ALL_FORBIDDEN_ACTIONS.includes(L6ForbiddenAction.ILLEGAL_STORAGE_BYPASS), 'C.13 — Storage bypass forbidden');

// C.14 — Confidence law override is forbidden
assert(ALL_FORBIDDEN_ACTIONS.includes(L6ForbiddenAction.CONFIDENCE_LAW_OVERRIDE), 'C.14 — Confidence override forbidden');

// ═══════════════════════════════════════════════════════════════
// BAND D — Output Surface Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Output Surface Legality ═══');
resetAll();

// D.1 — 4 output surfaces
assert(L6_OUTPUT_SURFACES.length === 4, 'D.1 — 4 output surfaces');
assert(getAllRegisteredOutputIds().length === 4, 'D.2 — 4 registered output IDs');

// D.3 — Feature history
const fhSurface = getOutputSurface('l6:feature_history_fact');
assert(fhSurface !== undefined, 'D.3a — Feature history surface exists');
assert(fhSurface!.authorityMode === 'HISTORICAL', 'D.3b — Historical authority');
assert(fhSurface!.replayRequired === true, 'D.3c — Replay required');
assert(fhSurface!.requiredLineageFields.includes('feature_id'), 'D.3d — feature_id in lineage');
assert(fhSurface!.requiredLineageFields.includes('trace_id'), 'D.3e — trace_id in lineage');

// D.4 — Current feature state
const cfSurface = getOutputSurface('l6:current_feature_state');
assert(cfSurface !== undefined, 'D.4a — Current feature surface exists');
assert(cfSurface!.authorityMode === 'CURRENT', 'D.4b — Current authority');

// D.5 — Event instance
const evSurface = getOutputSurface('l6:event_instance');
assert(evSurface !== undefined, 'D.5a — Event instance surface exists');
assert(evSurface!.authorityMode === 'IMMUTABLE_SNAPSHOT', 'D.5b — Immutable snapshot');
assert(evSurface!.requiredLineageFields.includes('event_id'), 'D.5c — event_id in lineage');
assert(evSurface!.requiredLineageFields.includes('event_type'), 'D.5d — event_type in lineage');

// D.6 — Evidence pack
const epSurface = getOutputSurface('l6:evidence_pack');
assert(epSurface !== undefined, 'D.6a — Evidence pack surface exists');
assert(epSurface!.primitiveClass === 'CROSS_CUTTING', 'D.6b — Cross-cutting');

// D.7 — Feature outputs
const featureOutputs = getOutputsForPrimitive(L6PrimitiveClass.FEATURE);
assert(featureOutputs.length === 2, 'D.7 — 2 feature outputs');

// D.8 — Event outputs
const eventOutputs = getOutputsForPrimitive(L6PrimitiveClass.EVENT);
assert(eventOutputs.length === 1, 'D.8 — 1 event output');

// D.9 — All outputs have L5 storage routes
assert(L6_OUTPUT_SURFACES.every(s => s.l5StorageRoute.length > 0), 'D.9 — All have L5 routes');

// D.10 — All outputs require replay
assert(L6_OUTPUT_SURFACES.every(s => s.replayRequired), 'D.10 — All replay required');

// D.11 — All lineage fields include trace_id and manifest_id
const allLineage = getAllRequiredLineageFields();
assert(allLineage.includes('trace_id'), 'D.11a — trace_id in lineage');
assert(allLineage.includes('manifest_id'), 'D.11b — manifest_id in lineage');

// D.12 — Legal output emission
const legalEmission = validateOutputEmission({
  surfaceId: 'l6:feature_history_fact', outputClass: L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
  lineageFields: { feature_id: 'f1', scope_type: 'COIN', scope_id: 'BTC', computed_at: '2024-01-01', trace_id: 'tr1', manifest_id: 'm1' },
  emitter: 'test', timestamp: new Date().toISOString(),
});
assert(legalEmission.allowed, 'D.12 — Legal emission accepted');

// D.13 — Missing lineage rejected
const missingLineage = validateOutputEmission({
  surfaceId: 'l6:feature_history_fact', outputClass: L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
  lineageFields: { feature_id: 'f1' },
  emitter: 'test', timestamp: new Date().toISOString(),
});
assert(!missingLineage.allowed, 'D.13a — Missing lineage rejected');
assert(missingLineage.missingLineage.length > 0, 'D.13b — Missing fields reported');

// D.14 — Unregistered output rejected
const unregOutput = validateOutputEmission({
  surfaceId: 'l6:fake_output', outputClass: L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
  lineageFields: {}, emitter: 'test', timestamp: new Date().toISOString(),
});
assert(!unregOutput.allowed, 'D.14 — Unregistered output rejected');

// D.15 — Forbidden output class name rejected
const forbiddenClass = validateOutputClassName('RECOMMENDATION');
assert(!forbiddenClass.valid, 'D.15 — Forbidden class name rejected');
const legalClass = validateOutputClassName('FEATURE_HISTORY_FACT');
assert(legalClass.valid, 'D.16 — Legal class name accepted');

// D.17 — assertOutputEmission throws
threw = false;
try {
  assertOutputEmission({
    surfaceId: 'l6:fake', outputClass: L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
    lineageFields: {}, emitter: 'test', timestamp: new Date().toISOString(),
  });
} catch (e: any) { threw = true; assert(e instanceof L6ConstitutionalError, 'D.17a — Correct error type'); }
assert(threw, 'D.17b — assertOutputEmission throws');

// D.18 — Boundary validation: legal primitive definition
const legalDef = validatePrimitiveDefinition({
  name: 'volume_anomaly_ratio', outputSurfaceId: 'l6:feature_history_fact',
  outputClass: L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
  dependencySurfaceIds: ['l3:canonical_objects', 'l3:metric_contracts'],
  dependencyUsage: 'FEATURE_COMPUTE', description: 'Ratio of current volume to historical mean',
});
assert(legalDef.valid, 'D.18 — Legal primitive definition passes');

// D.19 — Boundary validation: forbidden name
const forbiddenDef = validatePrimitiveDefinition({
  name: 'buy_signal', outputSurfaceId: 'l6:feature_history_fact',
  outputClass: L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
  dependencySurfaceIds: ['l3:canonical_objects'],
  dependencyUsage: 'FEATURE_COMPUTE', description: 'A feature',
});
assert(!forbiddenDef.valid, 'D.19a — Forbidden name rejected');
assert(forbiddenDef.violations.some(v => v.code === L6BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS), 'D.19b — Correct code');

// D.20 — Boundary validation: unregistered dependency
const unregDep = validatePrimitiveDefinition({
  name: 'valid_feature', outputSurfaceId: 'l6:feature_history_fact',
  outputClass: L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
  dependencySurfaceIds: ['raw:coingecko_api'],
  dependencyUsage: 'FEATURE_COMPUTE', description: 'A feature',
});
assert(!unregDep.valid, 'D.20a — Unregistered dependency rejected');
assert(unregDep.violations.some(v => v.code === L6BoundaryViolationCode.UNREGISTERED_DEPENDENCY), 'D.20b — Correct code');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit, Traceability, and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit, Traceability, and Invariants ═══');
resetAll();

// E.1 — Audit log starts empty
assert(!hasAnyViolations(), 'E.1 — Audit log starts empty');
assert(getViolationCount() === 0, 'E.2 — 0 violations');

// E.3 — Emit dependency violation
emitDependencyViolation('raw:provider', 'test_engine', 'Unregistered surface accessed');
assert(hasAnyViolations(), 'E.3a — Violations present');
assert(getViolationCount() === 1, 'E.3b — 1 violation');
assert(getCriticalViolations().length === 1, 'E.3c — 1 critical');

// E.4 — Emit output violation
emitOutputViolation('l6:fake', 'test_engine', 'Unregistered output');
assert(getViolationCount() === 2, 'E.4 — 2 violations');

// E.5 — Emit naming violation
emitNamingViolation('buy_signal', 'test_engine');
assert(getViolationCount() === 3, 'E.5 — 3 violations');

// E.6 — Emit raw input violation
emitRawInputViolation('raw:coingecko', 'test_engine');
assert(getViolationCount() === 4, 'E.6 — 4 violations');

// E.7 — Get by code
const depViolations = getViolationsByCode(L6BoundaryViolationCode.UNREGISTERED_DEPENDENCY);
assert(depViolations.length === 1, 'E.7 — 1 dependency violation');

// E.8 — Full audit log
const fullLog = getConstitutionalAuditLog();
assert(fullLog.length === 4, 'E.8a — 4 entries in audit log');
assert(fullLog.every(r => r.timestamp.length > 0), 'E.8b — All have timestamps');
assert(fullLog.every(r => r.source.length > 0), 'E.8c — All have sources');

// E.9 — Reset clears
resetConstitutionalAuditLog();
assert(!hasAnyViolations(), 'E.9 — Reset clears audit log');

// E.10 — Legal paths stay clean
emitAuditRecord({ violationCode: L6BoundaryViolationCode.UNREGISTERED_DEPENDENCY, source: 'test', detail: 'test', context: {}, severity: 'INFO' });
assert(getViolationCount() === 1, 'E.10 — INFO violation recorded');
resetAll();

// E.11 — Capability matrix
const matrix = getFullCapabilityMatrix();
assert(matrix.length === 9 * 7, 'E.11 — 63 cells in capability matrix (9 caps × 7 contexts)');
assert(getCapabilityPolicyCount() === 9, 'E.12 — 9 capability policies');

// E.13 — Legal capability claim
const legalCap = evaluateCapabilityClaim({ capability: L6AllowedCapability.GOVERNED_READ, context: 'FEATURE_RUNTIME', claimant: 'test' });
assert(legalCap.allowed, 'E.13 — Governed read in feature runtime allowed');

// E.14 — Illegal capability claim
const illegalCap = evaluateCapabilityClaim({ capability: L6AllowedCapability.PRIMITIVE_CONSTRUCTION, context: 'EVENT_RUNTIME', claimant: 'test' });
assert(!illegalCap.allowed, 'E.14 — Primitive construction in event runtime denied');

// E.15 — assertCapabilityClaim throws
threw = false;
try { assertCapabilityClaim({ capability: L6AllowedCapability.CHANGE_DETECTION, context: 'FEATURE_DEFINITION', claimant: 'test' }); }
catch (e: any) { threw = true; assert(e.code === L6BoundaryViolationCode.ILLEGAL_CAPABILITY_CLAIM, 'E.15a — Correct code'); }
assert(threw, 'E.15b — assertCapabilityClaim throws');

// E.16 — Violation codes coverage
assert(ALL_VIOLATION_CODES.length === 12, 'E.16 — 12 violation codes');

// ── Constitutional Invariants ──
console.log('\n  ── Constitutional Invariants ──');

// E.17 — INV-6.1-A
const invA = checkINV_61_A();
assert(invA.holds, `E.17 — ${invA.id}: ${invA.name}`);

// E.18 — INV-6.1-B
const invB = checkINV_61_B();
assert(invB.holds, `E.18 — ${invB.id}: ${invB.name}`);

// E.19 — INV-6.1-C
const invC = checkINV_61_C();
assert(invC.holds, `E.19 — ${invC.id}: ${invC.name}`);

// E.20 — INV-6.1-D
const invD = checkINV_61_D();
assert(invD.holds, `E.20 — ${invD.id}: ${invD.name}`);

// E.21 — INV-6.1-E
const invE = checkINV_61_E();
assert(invE.holds, `E.21 — ${invE.id}: ${invE.name}`);

// E.22 — INV-6.1-F
const invF = checkINV_61_F();
assert(invF.holds, `E.22 — ${invF.id}: ${invF.name}`);

// E.23 — INV-6.1-G
const invG = checkINV_61_G();
assert(invG.holds, `E.23 — ${invG.id}: ${invG.name}`);

// E.24 — INV-6.1-H
const invH = checkINV_61_H();
assert(invH.holds, `E.24 — ${invH.id}: ${invH.name}`);

// E.25 — All 8 invariants hold
const allInvariants = checkAllL61Invariants();
assert(allInvariants.length === 8, 'E.25a — 8 invariants checked');
assert(allInvariants.every(i => i.holds), 'E.25b — All 8 invariants hold');

// ═══════════════════════════════════════════════════════════════
// FINAL RESULTS
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`L6.1 Constitution Certification: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log('═══════════════════════════════════════════════════════════');

if (failed > 0) { process.exit(1); }
