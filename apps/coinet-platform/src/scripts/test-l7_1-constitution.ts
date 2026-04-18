/**
 * L7.1 — Constitutional Position, Mission, and Layer Boundary
 * Certification Test Suite
 *
 * 5 Bands:
 *   A — Mission and boundary legality
 *   B — Dependency law
 *   C — Capability and prohibition law
 *   D — Output boundary law
 *   E — Audit and invariants
 */

// ── Contracts ──
import {
  L7SubjectClass, ALL_SUBJECT_CLASSES,
  L7AllowedCapability, ALL_ALLOWED_CAPABILITIES,
  L7CapabilityGroup, ALL_CAPABILITY_GROUPS,
  L7ForbiddenAction, ALL_FORBIDDEN_ACTIONS,
  L7DependencyLayer, ALL_DEPENDENCY_LAYERS,
  L7DependencySurfaceClass, ALL_DEPENDENCY_SURFACE_CLASSES,
  L7OutputSurfaceClass, ALL_OUTPUT_SURFACE_CLASSES,
  ALL_CAPABILITY_CONTEXTS,
  L7BoundaryViolationCode, ALL_VIOLATION_CODES, L7ConstitutionalError,
  L7_MISSION, L7_MISSION_CONSTRAINT, isLegalOutputClass, isForbiddenOutputClass, matchesMission,
  L7_IS_NOT, L7_DOES_NOT_ANSWER, containsForbiddenNaming, isValidValidationName,
  checkForbiddenSemantics, getForbiddenNamePatterns, getValidNameExamples,
  L7_CAPABILITY_POLICY, getCapabilityDecision, isCapabilityAllowed, getDeniedCapabilities,
  getCapabilitiesForGroup, getAllCapabilityGroups,
  FORBIDDEN_ACTION_DEFINITIONS, getForbiddenActionDefinition, getAllCriticalForbiddenActions,
  L7_DEPENDENCY_SURFACES, getDependencySurface, isRegisteredDependency, getSurfacesForLayer,
  getSurfacesUsableFor, isUsableFor, getRequiredDependencySurfaces,
  L7_OUTPUT_SURFACES, getOutputSurface, isRegisteredOutput, isRegisteredOutputClass,
  getAllRequiredLineageFields, getAllowedConsumersForOutput,
} from '../l7/contracts';

// ── Constitution ──
import {
  requestDependencyAccess, assertDependencyAccess, getAllRegisteredSurfaceIds,
  validateOutputEmission, assertOutputEmission, validateOutputClassName,
  validateDownstreamConsumer, getAllRegisteredOutputIds,
  evaluateCapabilityClaim, assertCapabilityClaim, getFullCapabilityMatrix, getCapabilityPolicyCount,
  checkForForbiddenActions, assertNoForbiddenActions, checkValidationNameLegality,
  getRegisteredForbiddenActionCount, getCriticalForbiddenActionCount,
  validateValidationComponent, validateOutputSemantics,
  validateContradictionHandling, validateAmbiguityHandling,
  validateStalenessHandling, validateIncompletenessHandling,
  validateLowerLayerInteraction,
  resetConstitutionalAuditLog, emitAuditRecord, getConstitutionalAuditLog,
  getCriticalViolations, getViolationsByCode, hasAnyViolations, getViolationCount,
  emitDependencyViolation, emitOutputViolation, emitNamingViolation,
  emitContradictionLaunderingViolation, emitAmbiguityViolation,
  emitStalenessViolation, emitIncompletenessViolation, emitStorageBypassViolation,
  emitLowerLayerRedefinitionViolation,
} from '../l7/constitution';

// ── Invariants ──
import {
  checkAllL71Invariants,
  checkINV_71_A, checkINV_71_B, checkINV_71_C, checkINV_71_D,
  checkINV_71_E, checkINV_71_F, checkINV_71_G,
} from '../l7/invariants';

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

assert(L7_MISSION.name === 'Layer 7 — Validation & Contradiction Engine', 'A.1 — Mission name');
assert(L7_MISSION.canonical.includes('governed primitives'), 'A.2 — Mission mentions governed primitives');
assert(L7_MISSION.canonical.includes('confirmed'), 'A.3 — Mission enumerates validation classes');
assert(L7_MISSION.compression.includes('tests whether governed primitives'), 'A.4 — Mission compression');
assert(L7_MISSION.truthTestingBoundary.length === 7, 'A.5 — 7 truth-testing boundary items');
assert(L7_MISSION.truthTestingBoundary.includes('contradiction'), 'A.6 — contradiction in boundary');
assert(L7_MISSION.truthTestingBoundary.includes('staleness'), 'A.7 — staleness in boundary');
assert(L7_MISSION.offLimits.length >= 5, 'A.8 — off-limits list populated');

assert(ALL_SUBJECT_CLASSES.length === 3, 'A.9 — 3 subject classes');
assert(ALL_SUBJECT_CLASSES.includes(L7SubjectClass.CLAIM_CANDIDATE), 'A.10 — CLAIM_CANDIDATE');
assert(ALL_SUBJECT_CLASSES.includes(L7SubjectClass.MARKET_STORY), 'A.11 — MARKET_STORY');
assert(ALL_SUBJECT_CLASSES.includes(L7SubjectClass.COMPOSITE_SIGNAL_STATE), 'A.12 — COMPOSITE_SIGNAL_STATE');

assert(L7_MISSION.frozenDependencies.length === 4, 'A.13 — 4 frozen dependencies');
assert(L7_MISSION.frozenDependencies.includes(L7DependencyLayer.L3), 'A.14 — depends on L3');
assert(L7_MISSION.frozenDependencies.includes(L7DependencyLayer.L4), 'A.15 — depends on L4');
assert(L7_MISSION.frozenDependencies.includes(L7DependencyLayer.L5), 'A.16 — depends on L5');
assert(L7_MISSION.frozenDependencies.includes(L7DependencyLayer.L6), 'A.17 — depends on L6');

assert(L7_MISSION_CONSTRAINT.contradictionPreservationRequired, 'A.18 — contradiction preservation required');
assert(L7_MISSION_CONSTRAINT.ambiguityPreservationRequired, 'A.19 — ambiguity preservation required');
assert(L7_MISSION_CONSTRAINT.stalenessVisibilityRequired, 'A.20 — staleness visibility required');
assert(L7_MISSION_CONSTRAINT.storageRoutingRequired, 'A.21 — storage routing required');
assert(L7_MISSION_CONSTRAINT.forbiddenOutputClasses.length >= 8, 'A.22 — forbidden output classes enumerated');

assert(L7_IS_NOT.length === 7, 'A.23 — 7 negative-definition items');
assert(L7_IS_NOT.includes('a regime engine'), 'A.24 — not a regime engine');
assert(L7_IS_NOT.includes('a recommendation layer'), 'A.25 — not a recommendation layer');
assert(L7_DOES_NOT_ANSWER.length >= 4, 'A.26 — negative answers populated');

assert(matchesMission('Tests support and contradiction for a claim'), 'A.27 — mission accepts support/contradiction');
assert(matchesMission('Classifies staleness and incompleteness of validation'), 'A.28 — mission accepts staleness');
assert(!matchesMission('Emits a trade signal with final score'), 'A.29 — rejects trade signal description');
assert(!matchesMission('Final scenario winner with actionability'), 'A.30 — rejects final scenario');
assert(!matchesMission('Provides a buy signal based on strong thesis'), 'A.31 — rejects buy signal');

// Forbidden naming
assert(containsForbiddenNaming('buy_ready_validation'), 'A.32 — buy_ready_validation blocked');
assert(containsForbiddenNaming('final_bullish_truth'), 'A.33 — final_bullish_truth blocked');
assert(containsForbiddenNaming('best_trade_confirmed'), 'A.34 — best_trade_confirmed blocked');
assert(containsForbiddenNaming('highest_conviction_opportunity'), 'A.35 — highest_conviction_opportunity blocked');
assert(containsForbiddenNaming('scenario_winner'), 'A.36 — scenario_winner blocked');
assert(containsForbiddenNaming('judgment_override'), 'A.37 — judgment_override blocked');
assert(containsForbiddenNaming('trade_signal'), 'A.38 — trade_signal blocked');
assert(!containsForbiddenNaming('story_support_assessment'), 'A.39 — story_support_assessment ok');
assert(!containsForbiddenNaming('contradiction_bundle_funding'), 'A.40 — contradiction bundle ok');
assert(isValidValidationName('story_support_assessment'), 'A.41 — valid name accepted');
assert(!isValidValidationName('Buy_Signal'), 'A.42 — invalid case rejected');
assert(!isValidValidationName('scenario_winner'), 'A.43 — forbidden name rejected');
assert(getForbiddenNamePatterns().length >= 15, 'A.44 — sufficient forbidden patterns');
assert(getValidNameExamples().length >= 5, 'A.45 — valid name examples present');

const semCheck = checkForbiddenSemantics('buy_signal');
assert(semCheck.forbidden, 'A.46 — semantic check flags buy_signal');
assert(semCheck.matchedPattern !== null, 'A.47 — matched pattern reported');

// ═══════════════════════════════════════════════════════════════
// BAND B — Dependency Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Law ═══');
resetAll();

assert(L7_DEPENDENCY_SURFACES.length >= 18, 'B.1 — dependency surfaces populated');
assert(ALL_DEPENDENCY_SURFACE_CLASSES.length >= 18, 'B.2 — dep surface classes populated');
assert(ALL_DEPENDENCY_LAYERS.length === 4, 'B.3 — 4 dependency layers');

const l3 = getSurfacesForLayer(L7DependencyLayer.L3);
const l4 = getSurfacesForLayer(L7DependencyLayer.L4);
const l5 = getSurfacesForLayer(L7DependencyLayer.L5);
const l6 = getSurfacesForLayer(L7DependencyLayer.L6);
assert(l3.length >= 4, 'B.4 — L3 surfaces present');
assert(l4.length >= 3, 'B.5 — L4 surfaces present');
assert(l5.length >= 4, 'B.6 — L5 surfaces present');
assert(l6.length >= 6, 'B.7 — L6 surfaces present');

// Specific L6 surfaces required
for (const sid of [
  'l6:current_feature_state',
  'l6:feature_history',
  'l6:event_instance',
  'l6:event_history',
  'l6:evidence_pack',
  'l6:quality_confidence_metadata',
]) {
  assert(isRegisteredDependency(sid), `B.8 — L6 surface registered: ${sid}`);
}

for (const sid of ['l3:canonical_objects', 'l3:confidence_scores', 'l3:metric_contracts']) {
  assert(isRegisteredDependency(sid), `B.9 — L3 surface registered: ${sid}`);
}
for (const sid of ['l5:write_coordination', 'l5:read_resolution']) {
  assert(isRegisteredDependency(sid), `B.10 — L5 surface registered: ${sid}`);
}

// Runtime registry access
const okReq = requestDependencyAccess({
  surfaceId: 'l6:current_feature_state',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test:component_a',
  timestamp: new Date().toISOString(),
});
assert(okReq.allowed, 'B.11 — legal dependency access granted');
assert(okReq.surface !== null, 'B.12 — legal access returns descriptor');

const badReq = requestDependencyAccess({
  surfaceId: 'fake:unknown_surface',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test:component_a',
  timestamp: new Date().toISOString(),
});
assert(!badReq.allowed, 'B.13 — unregistered surface denied');
assert(badReq.reason.includes('not registered'), 'B.14 — denial reason correct');

const misuseReq = requestDependencyAccess({
  surfaceId: 'l5:write_coordination',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test:component_a',
  timestamp: new Date().toISOString(),
});
assert(!misuseReq.allowed, 'B.15 — illegal usage denied');

// Assert throws
let threwUnreg = false;
try {
  assertDependencyAccess({
    surfaceId: 'fake:nonexistent',
    requestedUsage: 'SUPPORT_EVIDENCE',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  if (e instanceof L7ConstitutionalError) {
    threwUnreg = e.code === L7BoundaryViolationCode.UNREGISTERED_DEPENDENCY;
  }
}
assert(threwUnreg, 'B.16 — unregistered dep throws L7ConstitutionalError');

let threwMisuse = false;
try {
  assertDependencyAccess({
    surfaceId: 'l5:write_coordination',
    requestedUsage: 'SUPPORT_EVIDENCE',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  if (e instanceof L7ConstitutionalError) {
    threwMisuse = e.code === L7BoundaryViolationCode.ILLEGAL_DEPENDENCY_USAGE;
  }
}
assert(threwMisuse, 'B.17 — illegal usage throws correct code');

assert(getAllRegisteredSurfaceIds().length === L7_DEPENDENCY_SURFACES.length, 'B.18 — all surface ids enumerable');
assert(getRequiredDependencySurfaces().length >= 4, 'B.19 — required surfaces present');
assert(isUsableFor('l6:current_feature_state', 'SUPPORT_EVIDENCE'), 'B.20 — feature state usable for support');
assert(!isUsableFor('l5:write_coordination', 'SUPPORT_EVIDENCE'), 'B.21 — write coordination not usable for support');
assert(getSurfacesUsableFor('PERSISTENCE_PATH').length >= 1, 'B.22 — at least one persistence surface');

// Lower-layer redefinition blocked
const redefineCheck = validateLowerLayerInteraction({
  componentId: 'bad',
  claimedBehaviors: [
    're-resolve identity',
    'override confidence',
    'reinterpret feature meaning',
    'direct postgres insert',
    'invent propagation semantics',
    'redefine feature contract',
  ],
});
assert(!redefineCheck.valid, 'B.23 — lower-layer redefinition rejected');
assert(redefineCheck.violations.length >= 6, 'B.24 — each redefinition attempt caught');

const cleanLower = validateLowerLayerInteraction({
  componentId: 'good',
  claimedBehaviors: [
    'consume l6 current feature state',
    'persist through l5 write coordination',
    'read l3 confidence scores',
  ],
});
assert(cleanLower.valid, 'B.25 — legal lower-layer interaction accepted');

assert(getDependencySurface('l6:evidence_pack')!.authorityClass === 'EVIDENCE', 'B.26 — evidence pack authority class');

// ═══════════════════════════════════════════════════════════════
// BAND C — Capability and Prohibition Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Capability and Prohibition Law ═══');
resetAll();

assert(ALL_ALLOWED_CAPABILITIES.length === L7_CAPABILITY_POLICY.length, 'C.1 — capability policy covers all capabilities');
assert(L7_CAPABILITY_POLICY.length === 12, 'C.2 — 12 allowed capabilities defined');
assert(ALL_CAPABILITY_GROUPS.length === 6, 'C.3 — 6 capability groups');
assert(ALL_CAPABILITY_CONTEXTS.length === 9, 'C.4 — 9 capability contexts');
assert(getCapabilityPolicyCount() === L7_CAPABILITY_POLICY.length, 'C.5 — policy count matches');

// Governed ingestion allowed in subject assembly
assert(isCapabilityAllowed(L7AllowedCapability.GOVERNED_INGESTION, 'SUBJECT_ASSEMBLY'), 'C.6 — GOVERNED_INGESTION allowed in SUBJECT_ASSEMBLY');
assert(isCapabilityAllowed(L7AllowedCapability.CLAIM_ASSEMBLY, 'SUBJECT_ASSEMBLY'), 'C.7 — CLAIM_ASSEMBLY allowed in SUBJECT_ASSEMBLY');
assert(!isCapabilityAllowed(L7AllowedCapability.CLAIM_ASSEMBLY, 'CONFIDENCE_DERIVATION_CTX'), 'C.8 — CLAIM_ASSEMBLY denied in confidence ctx');

// Truth testing
assert(isCapabilityAllowed(L7AllowedCapability.SUPPORT_TESTING, 'VALIDATION_CLASSIFICATION'), 'C.9 — SUPPORT_TESTING allowed');
assert(isCapabilityAllowed(L7AllowedCapability.CONTRADICTION_TESTING, 'CONTRADICTION_DETECTION'), 'C.10 — CONTRADICTION_TESTING allowed');
assert(isCapabilityAllowed(L7AllowedCapability.STALENESS_CLASSIFICATION, 'VALIDATION_CLASSIFICATION'), 'C.11 — STALENESS_CLASSIFICATION allowed');
assert(isCapabilityAllowed(L7AllowedCapability.AMBIGUITY_CLASSIFICATION, 'VALIDATION_CLASSIFICATION'), 'C.12 — AMBIGUITY_CLASSIFICATION allowed');
assert(isCapabilityAllowed(L7AllowedCapability.DEGRADATION_CLASSIFICATION, 'VALIDATION_CLASSIFICATION'), 'C.13 — DEGRADATION_CLASSIFICATION allowed');
assert(isCapabilityAllowed(L7AllowedCapability.INCOMPLETENESS_CLASSIFICATION, 'VALIDATION_CLASSIFICATION'), 'C.14 — INCOMPLETENESS_CLASSIFICATION allowed');

// Persistence / serving
assert(isCapabilityAllowed(L7AllowedCapability.VALIDATION_PERSISTENCE, 'PERSISTENCE_CTX'), 'C.15 — persistence allowed in PERSISTENCE_CTX');
assert(!isCapabilityAllowed(L7AllowedCapability.VALIDATION_PERSISTENCE, 'REPLAY_PATH'), 'C.16 — persistence denied in replay');
assert(isCapabilityAllowed(L7AllowedCapability.VALIDATION_READ_SERVING, 'DOWNSTREAM_READ_CTX'), 'C.17 — read serving allowed');
assert(!isCapabilityAllowed(L7AllowedCapability.VALIDATION_READ_SERVING, 'REPAIR_PATH'), 'C.18 — read serving denied in repair');

// Evaluate claims
const claim = evaluateCapabilityClaim({
  capability: L7AllowedCapability.SUPPORT_TESTING,
  context: 'VALIDATION_CLASSIFICATION',
  claimant: 'comp-a',
});
assert(claim.allowed, 'C.19 — legal claim allowed');
assert(claim.decision === 'ALLOWED', 'C.20 — decision correct');

const badClaim = evaluateCapabilityClaim({
  capability: L7AllowedCapability.VALIDATION_PERSISTENCE,
  context: 'REPLAY_PATH',
  claimant: 'comp-b',
});
assert(!badClaim.allowed, 'C.21 — illegal claim denied');
assert(badClaim.decision === 'DENIED', 'C.22 — denial decision correct');

let threwClaim = false;
try {
  assertCapabilityClaim({
    capability: L7AllowedCapability.VALIDATION_PERSISTENCE,
    context: 'REPLAY_PATH',
    claimant: 'comp-b',
  });
} catch (e) {
  if (e instanceof L7ConstitutionalError) {
    threwClaim = e.code === L7BoundaryViolationCode.ILLEGAL_CAPABILITY_CLAIM;
  }
}
assert(threwClaim, 'C.23 — illegal claim throws correct code');

// Matrix
const matrix = getFullCapabilityMatrix();
assert(matrix.length === ALL_ALLOWED_CAPABILITIES.length * ALL_CAPABILITY_CONTEXTS.length, 'C.24 — full matrix size');
assert(getDeniedCapabilities('PERSISTENCE_CTX').length >= 6, 'C.25 — persistence ctx denies most caps');

// Capability groups
assert(getCapabilitiesForGroup(L7CapabilityGroup.C_TRUTH_TESTING).length >= 6, 'C.26 — truth-testing group populated');
assert(getAllCapabilityGroups().length === 6, 'C.27 — all capability groups enumerated');

// Forbidden action registry
assert(FORBIDDEN_ACTION_DEFINITIONS.length === ALL_FORBIDDEN_ACTIONS.length, 'C.28 — all forbidden actions defined');
assert(FORBIDDEN_ACTION_DEFINITIONS.length >= 12, 'C.29 — at least 12 forbidden actions');
assert(getRegisteredForbiddenActionCount() === FORBIDDEN_ACTION_DEFINITIONS.length, 'C.30 — registered count matches');
assert(getCriticalForbiddenActionCount() >= 8, 'C.31 — many critical actions');
assert(getAllCriticalForbiddenActions().length >= 8, 'C.32 — critical actions list');

// Required codes present
for (const action of [
  L7ForbiddenAction.ILLEGAL_PRIMITIVE_REINTERPRETATION,
  L7ForbiddenAction.CONTRADICTION_LAUNDERING,
  L7ForbiddenAction.AMBIGUITY_SILENT_RESOLUTION,
  L7ForbiddenAction.STALE_SUPPORT_MASQUERADE,
  L7ForbiddenAction.FINAL_SCENARIO_LEAK,
  L7ForbiddenAction.FINAL_JUDGMENT_LEAK,
  L7ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
  L7ForbiddenAction.ILLEGAL_L5_BYPASS,
  L7ForbiddenAction.LOWER_LAYER_CONFIDENCE_OVERRIDE,
]) {
  assert(!!getForbiddenActionDefinition(action), `C.33 — definition for ${action}`);
}

// Forbidden action checks
const fbName = checkForForbiddenActions({ proposedName: 'buy_signal_validation', context: 't' });
assert(!fbName.clean, 'C.34 — bad name flagged');
assert(fbName.violations[0].violationCode === L7BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS, 'C.35 — correct violation code');

const fbDesc = checkForForbiddenActions({ proposedDescription: 'emits best_trade_confirmed outputs', context: 't' });
assert(!fbDesc.clean, 'C.36 — bad description flagged');

const fbCls = checkForForbiddenActions({ proposedOutputClass: 'FINAL_SCENARIO_WINNER', context: 't' });
assert(!fbCls.clean, 'C.37 — bad output class flagged');
assert(fbCls.violations[0].violationCode === L7BoundaryViolationCode.FORBIDDEN_SCENARIO_SEMANTICS, 'C.38 — scenario code');

const fbAct = checkForForbiddenActions({
  proposedAction: L7ForbiddenAction.CONTRADICTION_LAUNDERING,
  context: 't',
});
assert(!fbAct.clean, 'C.39 — forbidden action flagged');

const fbClean = checkForForbiddenActions({ proposedName: 'story_support_assessment', context: 't' });
assert(fbClean.clean, 'C.40 — clean name passes');

let threwForbidden = false;
try {
  assertNoForbiddenActions({ proposedName: 'buy_ready_validation', context: 't' });
} catch (e) {
  if (e instanceof L7ConstitutionalError) threwForbidden = true;
}
assert(threwForbidden, 'C.41 — assertNoForbiddenActions throws');

const legal = checkValidationNameLegality('contradiction_bundle_funding');
assert(legal.legal, 'C.42 — legal name passes legality check');
const illegal = checkValidationNameLegality('Scenario_Winner');
assert(!illegal.legal, 'C.43 — illegal name rejected');
assert(illegal.violations.length >= 2, 'C.44 — multiple violations reported');

// Contradiction laundering blocked
for (const strat of ['AVERAGE_AWAY', 'SILENT_DROP', 'SILENT_REWEIGHT_TO_SUPPORT', 'DOWNGRADE_WITHOUT_LAW'] as const) {
  const r = validateContradictionHandling({ componentId: 'c', strategy: strat });
  assert(!r.valid, `C.45 — contradiction laundering "${strat}" blocked`);
}
for (const strat of ['PRESERVE_ALL', 'PRESERVE_WITH_LINEAGE'] as const) {
  const r = validateContradictionHandling({ componentId: 'c', strategy: strat });
  assert(r.valid, `C.46 — contradiction preservation "${strat}" allowed`);
}

// Ambiguity silent resolution blocked
for (const strat of [
  'RESOLVE_BY_RECENT_PRICE',
  'RESOLVE_BY_PREFERRED_NARRATIVE',
  'RESOLVE_BY_SELECTIVE_WEIGHTING',
  'IGNORE_MISSING_CONFIRMATION',
] as const) {
  const r = validateAmbiguityHandling({ componentId: 'a', strategy: strat });
  assert(!r.valid, `C.47 — ambiguity silent resolution "${strat}" blocked`);
}
for (const strat of ['PRESERVE_AMBIGUITY', 'EXPLICIT_LEGAL_RESOLUTION'] as const) {
  const r = validateAmbiguityHandling({ componentId: 'a', strategy: strat });
  assert(r.valid, `C.48 — ambiguity preservation "${strat}" allowed`);
}

// Staleness masquerade blocked
assert(!validateStalenessHandling({
  componentId: 's',
  propagatesToValidationClass: false,
  propagatesToConfidence: false,
  propagatesToRestriction: false,
  explicitStalenessModifier: false,
}).valid, 'C.49 — staleness masquerade blocked');
assert(validateStalenessHandling({
  componentId: 's',
  propagatesToValidationClass: true,
  propagatesToConfidence: true,
  propagatesToRestriction: true,
  explicitStalenessModifier: true,
}).valid, 'C.50 — visible staleness allowed');

// Incompleteness neglect blocked
assert(!validateIncompletenessHandling({
  componentId: 'i',
  missingSurfaceAction: 'SILENT_FILL_AS_CONFIRMED',
}).valid, 'C.51 — silent fill blocked');
assert(!validateIncompletenessHandling({
  componentId: 'i',
  missingSurfaceAction: 'SILENT_IGNORE',
}).valid, 'C.52 — silent ignore blocked');
assert(validateIncompletenessHandling({
  componentId: 'i',
  missingSurfaceAction: 'PROPAGATE_INCOMPLETE_CLASS',
}).valid, 'C.53 — propagate incomplete allowed');
assert(validateIncompletenessHandling({
  componentId: 'i',
  missingSurfaceAction: 'EXPLICIT_MISSING_EVIDENCE_REASON',
}).valid, 'C.54 — explicit missing evidence allowed');

// ═══════════════════════════════════════════════════════════════
// BAND D — Output Boundary Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Output Boundary Law ═══');
resetAll();

assert(L7_OUTPUT_SURFACES.length === 5, 'D.1 — exactly 5 output surfaces');
assert(ALL_OUTPUT_SURFACE_CLASSES.length === 5, 'D.2 — 5 output classes');

for (const cls of [
  L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
  L7OutputSurfaceClass.CONTRADICTION_BUNDLE,
  L7OutputSurfaceClass.CONFIDENCE_ASSESSMENT,
  L7OutputSurfaceClass.RESTRICTION_PROFILE,
  L7OutputSurfaceClass.VALIDATION_EVIDENCE_READ_SURFACE,
]) {
  assert(isRegisteredOutputClass(cls), `D.3 — class registered: ${cls}`);
  assert(isLegalOutputClass(cls), `D.4 — class legal: ${cls}`);
}

assert(L7_OUTPUT_SURFACES.every(s => s.replayRequired), 'D.5 — all outputs replay-required');
assert(L7_OUTPUT_SURFACES.every(s => s.lineageRequired), 'D.6 — all outputs require lineage');
assert(L7_OUTPUT_SURFACES.every(s => s.l5StorageRoute.length > 0), 'D.7 — all outputs have L5 route');
assert(L7_OUTPUT_SURFACES.every(s => s.evidenceBound), 'D.8 — all outputs evidence-bound');
assert(L7_OUTPUT_SURFACES.every(s => s.allowedDownstreamConsumers.length > 0), 'D.9 — consumers declared');

assert(getAllRequiredLineageFields().includes('trace_id'), 'D.10 — trace_id in lineage');
assert(getAllRequiredLineageFields().includes('manifest_id'), 'D.11 — manifest_id in lineage');
assert(getAllRequiredLineageFields().includes('subject_id'), 'D.12 — subject_id in lineage');

// Output emission
const okEmit = validateOutputEmission({
  surfaceId: 'l7:validation_assessment',
  outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
  lineageFields: {
    subject_id: 's1',
    subject_class: 'MARKET_STORY',
    assessed_at: '2026-04-17T00:00:00Z',
    trace_id: 't1',
    manifest_id: 'm1',
  },
  emitter: 'e',
  timestamp: new Date().toISOString(),
});
assert(okEmit.allowed, 'D.13 — legal output emission allowed');

const missingEmit = validateOutputEmission({
  surfaceId: 'l7:validation_assessment',
  outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
  lineageFields: { subject_id: 's1' },
  emitter: 'e',
  timestamp: new Date().toISOString(),
});
assert(!missingEmit.allowed, 'D.14 — missing lineage rejected');
assert(missingEmit.missingLineage.length >= 3, 'D.15 — missing fields enumerated');

const unregEmit = validateOutputEmission({
  surfaceId: 'l7:fake_surface',
  outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
  lineageFields: {},
  emitter: 'e',
  timestamp: new Date().toISOString(),
});
assert(!unregEmit.allowed, 'D.16 — unregistered output rejected');

let threwMissing = false;
try {
  assertOutputEmission({
    surfaceId: 'l7:validation_assessment',
    outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
    lineageFields: { subject_id: 's1' },
    emitter: 'e',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  if (e instanceof L7ConstitutionalError) {
    threwMissing = e.code === L7BoundaryViolationCode.MISSING_LINEAGE;
  }
}
assert(threwMissing, 'D.17 — missing lineage throws correct code');

let threwUnreg2 = false;
try {
  assertOutputEmission({
    surfaceId: 'l7:fake',
    outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
    lineageFields: {},
    emitter: 'e',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  if (e instanceof L7ConstitutionalError) {
    threwUnreg2 = e.code === L7BoundaryViolationCode.UNREGISTERED_OUTPUT;
  }
}
assert(threwUnreg2, 'D.18 — unregistered output throws correct code');

// Output class name legality
assert(validateOutputClassName('VALIDATION_ASSESSMENT').valid, 'D.19 — legal class name accepted');
assert(!validateOutputClassName('FINAL_SCENARIO_WINNER').valid, 'D.20 — scenario winner rejected');
assert(!validateOutputClassName('TRADE_RECOMMENDATION').valid, 'D.21 — trade recommendation rejected');
assert(!validateOutputClassName('BUY_SIGNAL').valid, 'D.22 — buy signal rejected');

// Downstream consumer gating
const consumerOk = validateDownstreamConsumer('l7:validation_assessment', 'L8_SCENARIO');
assert(consumerOk.valid, 'D.23 — allowed consumer passes');
const consumerBad = validateDownstreamConsumer('l7:validation_assessment', 'MARKETING_APP');
assert(!consumerBad.valid, 'D.24 — unauthorised consumer rejected');
const consumerMissing = validateDownstreamConsumer('l7:nonexistent', 'L8_SCENARIO');
assert(!consumerMissing.valid, 'D.25 — unknown surface rejected');
assert(getAllowedConsumersForOutput('l7:validation_assessment').length >= 2, 'D.26 — consumers enumerated');

assert(getAllRegisteredOutputIds().length === L7_OUTPUT_SURFACES.length, 'D.27 — registered outputs enumerable');
assert(getOutputSurface('l7:contradiction_bundle')!.authorityMode === 'IMMUTABLE_SNAPSHOT',
  'D.28 — contradiction bundle is immutable');

// Output semantics validator
assert(validateOutputSemantics('VALIDATION_ASSESSMENT').valid, 'D.29 — legal class semantics ok');
const badSem = validateOutputSemantics('FINAL_SCENARIO_WINNER');
assert(!badSem.valid, 'D.30 — scenario class rejected');
assert(badSem.violations[0].code === L7BoundaryViolationCode.FORBIDDEN_SCENARIO_SEMANTICS, 'D.31 — scenario code assigned');
const badRec = validateOutputSemantics('TRADE_RECOMMENDATION');
assert(!badRec.valid, 'D.32 — recommendation class rejected');
assert(badRec.violations[0].code === L7BoundaryViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS, 'D.33 — recommendation code assigned');

// Component validation end-to-end
const goodComp = validateValidationComponent({
  name: 'story_support_assessment',
  subjectClass: L7SubjectClass.MARKET_STORY,
  outputSurfaceId: 'l7:validation_assessment',
  outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
  dependencySurfaceIds: ['l6:current_feature_state', 'l6:event_instance'],
  dependencyUsage: 'SUPPORT_EVIDENCE',
  description: 'Tests whether governed primitives support a market story claim',
});
assert(goodComp.valid, 'D.34 — legal component accepted');

const badNameComp = validateValidationComponent({
  name: 'buy_signal_validation',
  subjectClass: L7SubjectClass.CLAIM_CANDIDATE,
  outputSurfaceId: 'l7:validation_assessment',
  outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
  dependencySurfaceIds: ['l6:current_feature_state'],
  dependencyUsage: 'SUPPORT_EVIDENCE',
  description: 'Tests support for a buy signal',
});
assert(!badNameComp.valid, 'D.35 — forbidden-name component rejected');

const badDepComp = validateValidationComponent({
  name: 'story_support_assessment',
  subjectClass: L7SubjectClass.CLAIM_CANDIDATE,
  outputSurfaceId: 'l7:validation_assessment',
  outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
  dependencySurfaceIds: ['raw:provider_json'],
  dependencyUsage: 'SUPPORT_EVIDENCE',
  description: 'Tests support for a claim candidate',
});
assert(!badDepComp.valid, 'D.36 — unregistered dep rejected');
assert(badDepComp.violations.some(v => v.code === L7BoundaryViolationCode.UNREGISTERED_DEPENDENCY),
  'D.37 — unregistered dep code emitted');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

assert(getConstitutionalAuditLog().length === 0, 'E.1 — audit log starts empty');
assert(!hasAnyViolations(), 'E.2 — no violations initially');
assert(getViolationCount() === 0, 'E.3 — count zero');

emitDependencyViolation('fake:surface', 'comp-a', 'not registered');
emitOutputViolation('l7:fake', 'comp-b', 'unregistered output');
emitNamingViolation('buy_signal', 'comp-c');
emitContradictionLaunderingViolation('comp-d', 'engine-x', 'AVERAGE_AWAY');
emitAmbiguityViolation('comp-e', 'engine-y', 'RESOLVE_BY_RECENT_PRICE');
emitStalenessViolation('comp-f', 'engine-z');
emitIncompletenessViolation('comp-g', 'engine-w');
emitStorageBypassViolation('comp-h', 'direct redis set');
emitLowerLayerRedefinitionViolation('comp-i', 'reinterpret feature');
emitAuditRecord({
  violationCode: L7BoundaryViolationCode.ILLEGAL_CAPABILITY_CLAIM,
  source: 'comp-j',
  detail: 'claim illegal',
  context: {},
  severity: 'MEDIUM',
});

assert(getConstitutionalAuditLog().length === 10, 'E.4 — all audit records recorded');
assert(hasAnyViolations(), 'E.5 — violations detected');
assert(getViolationCount() === 10, 'E.6 — violation count correct');
assert(getCriticalViolations().length >= 6, 'E.7 — critical violations present');

assert(getViolationsByCode(L7BoundaryViolationCode.UNREGISTERED_DEPENDENCY).length === 1, 'E.8 — dep violations by code');
assert(getViolationsByCode(L7BoundaryViolationCode.CONTRADICTION_LAUNDERING).length === 1, 'E.9 — contradiction laundering by code');
assert(getViolationsByCode(L7BoundaryViolationCode.AMBIGUITY_SILENT_RESOLUTION).length === 1, 'E.10 — ambiguity by code');
assert(getViolationsByCode(L7BoundaryViolationCode.STALE_SUPPORT_MASQUERADE).length === 1, 'E.11 — staleness by code');
assert(getViolationsByCode(L7BoundaryViolationCode.INCOMPLETENESS_NEGLECT).length === 1, 'E.12 — incompleteness by code');
assert(getViolationsByCode(L7BoundaryViolationCode.STORAGE_BYPASS).length === 1, 'E.13 — storage bypass by code');
assert(getViolationsByCode(L7BoundaryViolationCode.LOWER_LAYER_REDEFINITION).length === 1, 'E.14 — lower-layer redefinition by code');
assert(getViolationsByCode(L7BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS).length === 1, 'E.15 — naming violation by code');

assert(ALL_VIOLATION_CODES.length >= 15, 'E.16 — rich violation code catalogue');

// Invariant suite
const invs = checkAllL71Invariants();
assert(invs.length === 7, 'E.17 — 7 invariants defined');
for (const inv of invs) {
  assert(inv.holds, `E.18 — ${inv.id} holds (${inv.evidence})`);
}
assert(checkINV_71_A().holds, 'E.19 — INV-7.1-A holds');
assert(checkINV_71_B().holds, 'E.20 — INV-7.1-B holds');
assert(checkINV_71_C().holds, 'E.21 — INV-7.1-C holds');
assert(checkINV_71_D().holds, 'E.22 — INV-7.1-D holds');
assert(checkINV_71_E().holds, 'E.23 — INV-7.1-E holds');
assert(checkINV_71_F().holds, 'E.24 — INV-7.1-F holds');
assert(checkINV_71_G().holds, 'E.25 — INV-7.1-G holds');

// ═══════════════════════════════════════════════════════════════
// Final report
// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(64)}`);
console.log(`L7.1 Certification: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(64));

if (failed > 0) {
  process.exit(1);
}
