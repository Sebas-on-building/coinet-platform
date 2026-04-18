/**
 * L8.1 — Constitutional Position, Mission, and Layer Boundary
 * Certification Test Suite
 *
 * 5 Bands:
 *   A — Mission and boundary legality
 *   B — Dependency law (L3–L7 stable handoff)
 *   C — Capability and prohibition law
 *   D — Output boundary law
 *   E — Audit and invariants
 */

// ── Contracts ──
import {
  L8SubjectClass, ALL_L8_SUBJECT_CLASSES,
  L8AllowedCapability, ALL_L8_ALLOWED_CAPABILITIES,
  L8CapabilityGroup, ALL_L8_CAPABILITY_GROUPS,
  L8ForbiddenAction, ALL_L8_FORBIDDEN_ACTIONS,
  L8DependencyLayer, ALL_L8_DEPENDENCY_LAYERS,
  L8DependencySurfaceClass, ALL_L8_DEPENDENCY_SURFACE_CLASSES,
  L8OutputSurfaceClass, ALL_L8_OUTPUT_SURFACE_CLASSES,
  ALL_L8_CAPABILITY_CONTEXTS,
  L8ConstitutionalViolationCode, ALL_L8_VIOLATION_CODES, L8ConstitutionalError,
  L8_MISSION, L8_MISSION_CONSTRAINT,
  isL8LegalOutputClass, isL8ForbiddenOutputClass, matchesL8Mission,
  L8_IS_NOT, L8_DOES_NOT_ANSWER,
  containsL8ForbiddenNaming, isValidL8ComponentName,
  checkL8ForbiddenSemantics, getL8ForbiddenNamePatterns, getL8ValidNameExamples,
  L8_CAPABILITY_POLICY, getL8CapabilityDecision, isL8CapabilityAllowed,
  getL8DeniedCapabilities, getL8CapabilitiesForGroup, getAllL8CapabilityGroups,
  L8_FORBIDDEN_ACTION_DEFINITIONS, getL8ForbiddenActionDefinition,
  getAllL8CriticalForbiddenActions,
  L8_DEPENDENCY_SURFACES, getL8DependencySurface, isL8RegisteredDependency,
  getL8SurfacesForLayer, getL8SurfacesUsableFor, isL8UsableFor,
  getL8RequiredDependencySurfaces, getL8RestrictionAwareSurfaces,
  L8_OUTPUT_SURFACES, getL8OutputSurface, isL8RegisteredOutput,
  isL8RegisteredOutputClass, getAllL8RequiredLineageFields,
  getL8AllowedConsumersForOutput,
} from '../l8/contracts';

// ── Constitution ──
import {
  requestL8DependencyAccess, assertL8DependencyAccess, getAllL8RegisteredSurfaceIds,
  validateL8OutputEmission, assertL8OutputEmission, validateL8OutputClassName,
  validateL8DownstreamConsumer, getAllL8RegisteredOutputIds,
  evaluateL8CapabilityClaim, assertL8CapabilityClaim,
  getFullL8CapabilityMatrix, getL8CapabilityPolicyCount,
  checkForL8ForbiddenActions, assertNoL8ForbiddenActions, checkL8ComponentNameLegality,
  getL8RegisteredForbiddenActionCount, getL8CriticalForbiddenActionCount,
  validateL8Component, validateL8OutputSemantics,
  validateL8AmbiguityHandling, validateL8RestrictionHandling,
  validateL8StalenessHandling, validateL8LowerLayerInteraction,
  validateL8MultiplierGrounding,
  resetL8ConstitutionalAuditLog, emitL8AuditRecord, getL8ConstitutionalAuditLog,
  getL8CriticalViolations, getL8ViolationsByCode, hasAnyL8Violations, getL8ViolationCount,
  emitL8DependencyViolation, emitL8OutputViolation, emitL8NamingViolation,
  emitL8ActionBiasViolation, emitL8AmbiguityLaunderingViolation,
  emitL8ContradictionIgnoredViolation, emitL8RestrictionBypassViolation,
  emitL8StaleRegimeViolation, emitL8RawDataInventionViolation,
  emitL8StorageBypassViolation, emitL8LowerLayerRedefinitionViolation,
  emitL8ValidationRedefinitionViolation,
} from '../l8/constitution';

// ── Invariants ──
import {
  checkAllL81Invariants,
  checkINV_81_A, checkINV_81_B, checkINV_81_C, checkINV_81_D,
  checkINV_81_E, checkINV_81_F, checkINV_81_G,
} from '../l8/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetL8ConstitutionalAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Mission and Boundary Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Mission and Boundary Legality ═══');
resetAll();

assert(L8_MISSION.name === 'Layer 8 — Regime Engine', 'A.01 Mission name');
assert(L8_MISSION.canonical.includes('governed primitives'),
  'A.02 Mission mentions governed primitives');
assert(L8_MISSION.canonical.includes('classifies'),
  'A.03 Mission describes classification');
assert(L8_MISSION.canonical.includes('environment'),
  'A.04 Mission describes environment');
assert(L8_MISSION.compression.includes('classifies the environment'),
  'A.05 Mission compression');
assert(L8_MISSION.firstPrinciple.includes('does not mean the same thing'),
  'A.06 First principle declares environment-dependence');
assert(L8_MISSION.truthTestingBoundary.length === 7,
  'A.07 7 truth-testing boundary items');
assert(L8_MISSION.truthTestingBoundary.includes('primary regime'),
  'A.08 primary regime in boundary');
assert(L8_MISSION.truthTestingBoundary.includes('transition detection'),
  'A.09 transition detection in boundary');
assert(L8_MISSION.truthTestingBoundary.includes('regime multiplier'),
  'A.10 regime multiplier in boundary');
assert(L8_MISSION.offLimits.length >= 7, 'A.11 off-limits list populated');
assert((L8_MISSION.offLimits as readonly string[]).some(s => s.includes('judgment')),
  'A.12 off-limits contains judgment');
assert((L8_MISSION.offLimits as readonly string[]).some(s => s.includes('recommendation')),
  'A.13 off-limits contains recommendation');

assert(ALL_L8_SUBJECT_CLASSES.length === 5, 'A.14 5 subject classes');
assert(ALL_L8_SUBJECT_CLASSES.includes(L8SubjectClass.MARKET_REGIME),
  'A.15 MARKET_REGIME');
assert(ALL_L8_SUBJECT_CLASSES.includes(L8SubjectClass.SECTOR_REGIME),
  'A.16 SECTOR_REGIME');
assert(ALL_L8_SUBJECT_CLASSES.includes(L8SubjectClass.ASSET_REGIME),
  'A.17 ASSET_REGIME');
assert(ALL_L8_SUBJECT_CLASSES.includes(L8SubjectClass.LEVERAGE_REGIME),
  'A.18 LEVERAGE_REGIME');
assert(ALL_L8_SUBJECT_CLASSES.includes(L8SubjectClass.LIQUIDITY_REGIME),
  'A.19 LIQUIDITY_REGIME');

assert(L8_MISSION.frozenDependencies.length === 5, 'A.20 5 frozen dependencies');
assert(L8_MISSION.frozenDependencies.includes(L8DependencyLayer.L3), 'A.21 depends on L3');
assert(L8_MISSION.frozenDependencies.includes(L8DependencyLayer.L4), 'A.22 depends on L4');
assert(L8_MISSION.frozenDependencies.includes(L8DependencyLayer.L5), 'A.23 depends on L5');
assert(L8_MISSION.frozenDependencies.includes(L8DependencyLayer.L6), 'A.24 depends on L6');
assert(L8_MISSION.frozenDependencies.includes(L8DependencyLayer.L7), 'A.25 depends on L7');

assert(L8_IS_NOT.length >= 5, 'A.26 L8_IS_NOT declared');
assert((L8_IS_NOT as readonly string[]).includes('the final judgment layer'),
  'A.27 L8 is not judgment layer');
assert((L8_IS_NOT as readonly string[]).includes('the scenario engine'),
  'A.28 L8 is not scenario engine');
assert((L8_IS_NOT as readonly string[]).includes('the recommendation layer'),
  'A.29 L8 is not recommendation layer');
assert((L8_IS_NOT as readonly string[]).includes('the validation layer'),
  'A.30 L8 is not validation layer');
assert(L8_DOES_NOT_ANSWER.length >= 5, 'A.31 L8_DOES_NOT_ANSWER declared');

// Mission matcher
assert(matchesL8Mission('classifies the current market regime and transition risk'),
  'A.32 regime-classification description matches mission');
assert(!matchesL8Mission('emits a buy signal when momentum confirms'),
  'A.33 recommendation description rejected');
assert(!matchesL8Mission('picks the winning scenario for a judgment'),
  'A.34 scenario-winner description rejected');
assert(!matchesL8Mission('re-validates the L7 claim live from L6'),
  'A.35 revalidation description rejected');
assert(!matchesL8Mission('produces the final score for an asset'),
  'A.36 final-score description rejected');

// Component naming legality
assert(isValidL8ComponentName('market_regime_macro_risk_on'),
  'A.37 valid snake_case regime name allowed');
assert(!isValidL8ComponentName('buy_signal'), 'A.38 buy_signal rejected');
assert(!isValidL8ComponentName('best_regime'), 'A.39 best_regime rejected');
assert(!isValidL8ComponentName('scenario_winner'), 'A.40 scenario_winner rejected');
assert(!isValidL8ComponentName('final_judgment'), 'A.41 final_judgment rejected');
assert(!isValidL8ComponentName('risk_on_buy'), 'A.42 risk_on_buy rejected');
assert(!isValidL8ComponentName('attractive_regime'), 'A.43 attractive_regime rejected');
assert(!isValidL8ComponentName('bullish_confirmed_regime'),
  'A.44 bullish_confirmed_regime rejected');
assert(!isValidL8ComponentName('CamelCase'), 'A.45 non-snake_case rejected');
assert(!isValidL8ComponentName(''), 'A.46 empty name rejected');

// Valid name examples
assert(getL8ValidNameExamples().length >= 5, 'A.47 valid name examples populated');
for (const n of getL8ValidNameExamples()) {
  assert(isValidL8ComponentName(n), `A.valid_example.${n}`);
}

// Violation-code enum sanity
assert(ALL_L8_VIOLATION_CODES.length >= 20,
  `A.48 ≥20 violation codes (got ${ALL_L8_VIOLATION_CODES.length})`);
assert(ALL_L8_VIOLATION_CODES.includes(L8ConstitutionalViolationCode.RESTRICTION_BYPASS),
  'A.49 RESTRICTION_BYPASS code present');
assert(ALL_L8_VIOLATION_CODES.includes(
  L8ConstitutionalViolationCode.AMBIGUITY_LAUNDERING),
  'A.50 AMBIGUITY_LAUNDERING code present');
assert(ALL_L8_VIOLATION_CODES.includes(
  L8ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION),
  'A.51 VALIDATION_TRUTH_REDEFINITION code present');

// Error class behaves
const err = new L8ConstitutionalError(
  L8ConstitutionalViolationCode.RESTRICTION_BYPASS,
  'test',
  { foo: 'bar' },
);
assert(err.code === L8ConstitutionalViolationCode.RESTRICTION_BYPASS,
  'A.52 error carries code');
assert(err.details.foo === 'bar', 'A.53 error carries details');

// ═══════════════════════════════════════════════════════════════
// BAND B — Dependency Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Law ═══');
resetAll();

assert(ALL_L8_DEPENDENCY_LAYERS.length === 5, 'B.01 5 dependency layers');
assert(ALL_L8_DEPENDENCY_SURFACE_CLASSES.length >= 15,
  `B.02 ≥15 dependency surface classes (got ${ALL_L8_DEPENDENCY_SURFACE_CLASSES.length})`);
assert(L8_DEPENDENCY_SURFACES.length >= 18,
  `B.03 ≥18 registered surfaces (got ${L8_DEPENDENCY_SURFACES.length})`);

// Every layer has at least one surface
for (const layer of ALL_L8_DEPENDENCY_LAYERS) {
  const forLayer = getL8SurfacesForLayer(layer);
  assert(forLayer.length >= 1, `B.layer.${layer} has ≥1 surface`);
}

// L7 surfaces are all restriction-aware (stable handoff law §8.1.3.6)
const l7Surfaces = getL8SurfacesForLayer(L8DependencyLayer.L7);
assert(l7Surfaces.length === 5, 'B.04 5 L7 stable handoff surfaces');
assert(l7Surfaces.every(s => s.restrictionAware),
  'B.05 all L7 surfaces are restriction-aware');
assert(l7Surfaces.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.06 all L7 surfaces carry STABLE_HANDOFF authority');

// Required surfaces present
const required = getL8RequiredDependencySurfaces();
assert(required.length >= 8, `B.07 ≥8 required surfaces (got ${required.length})`);
assert(required.some(s => s.surfaceId === 'l7:validation_assessment'),
  'B.08 l7:validation_assessment required');
assert(required.some(s => s.surfaceId === 'l7:restriction_profile'),
  'B.09 l7:restriction_profile required');
assert(required.some(s => s.surfaceId === 'l5:write_coordination'),
  'B.10 l5:write_coordination required');

// Registry lookup
assert(getL8DependencySurface('l7:validation_assessment') !== undefined,
  'B.11 registry returns L7 validation surface');
assert(getL8DependencySurface('nonexistent') === undefined,
  'B.12 registry returns undefined for missing');
assert(isL8RegisteredDependency('l6:current_feature_state'),
  'B.13 isL8RegisteredDependency true for l6:current_feature_state');
assert(!isL8RegisteredDependency('fake:anything'),
  'B.14 isL8RegisteredDependency false for fake');

// Usability
assert(isL8UsableFor('l7:validation_assessment', 'MULTIPLIER_INPUT'),
  'B.15 L7 validation usable for MULTIPLIER_INPUT');
assert(!isL8UsableFor('l5:write_coordination', 'REGIME_SIGNAL'),
  'B.16 L5 write coordination NOT usable as regime signal');
assert(getL8SurfacesUsableFor('REGIME_SIGNAL').length >= 5,
  'B.17 ≥5 surfaces usable as REGIME_SIGNAL');

// Dependency registry runtime
const accessOk = requestL8DependencyAccess({
  surfaceId: 'l6:current_feature_state',
  requestedUsage: 'REGIME_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(accessOk.allowed, 'B.18 L6 current feature state usable as regime signal');

const accessUnregistered = requestL8DependencyAccess({
  surfaceId: 'fake:nope',
  requestedUsage: 'REGIME_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessUnregistered.allowed, 'B.19 unregistered surface denied');
assert(accessUnregistered.violationCode ===
  L8ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
  'B.20 UNREGISTERED_DEPENDENCY code');

const accessWrongUsage = requestL8DependencyAccess({
  surfaceId: 'l5:write_coordination',
  requestedUsage: 'REGIME_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessWrongUsage.allowed, 'B.21 wrong usage denied');
assert(accessWrongUsage.violationCode ===
  L8ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
  'B.22 ILLEGAL_DEPENDENCY_USAGE code');

// Restriction-aware enforcement
const accessL7NoPosture = requestL8DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'MULTIPLIER_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessL7NoPosture.allowed, 'B.23 L7 access without posture denied');
assert(accessL7NoPosture.violationCode ===
  L8ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
  'B.24 RESTRICTION_POSTURE_IGNORED code');

const accessL7WeakPosture = requestL8DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'MULTIPLIER_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  l7RestrictionPosture: {
    allowsRegimeConditioning: true,
    allowsMultiplierInput: false,
    allowsConfidenceInput: true,
  },
});
assert(!accessL7WeakPosture.allowed, 'B.25 L7 access with insufficient posture denied');
assert(accessL7WeakPosture.violationCode ===
  L8ConstitutionalViolationCode.RESTRICTION_BYPASS,
  'B.26 RESTRICTION_BYPASS code');

const accessL7FullPosture = requestL8DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'MULTIPLIER_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  l7RestrictionPosture: {
    allowsRegimeConditioning: true,
    allowsMultiplierInput: true,
    allowsConfidenceInput: true,
  },
});
assert(accessL7FullPosture.allowed, 'B.27 L7 access with full posture allowed');

// assert throws
let threw = false;
try {
  assertL8DependencyAccess({
    surfaceId: 'fake:missing',
    requestedUsage: 'REGIME_SIGNAL',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  threw = e instanceof L8ConstitutionalError;
}
assert(threw, 'B.28 assertL8DependencyAccess throws on unregistered');

// Restriction-aware set
const restrictionAware = getL8RestrictionAwareSurfaces();
assert(restrictionAware.length === 5, 'B.29 5 restriction-aware surfaces');
assert(restrictionAware.every(s => s.layer === L8DependencyLayer.L7),
  'B.30 only L7 surfaces are restriction-aware');

assert(getAllL8RegisteredSurfaceIds().length === L8_DEPENDENCY_SURFACES.length,
  'B.31 getAllL8RegisteredSurfaceIds matches');

// Lower-layer redefinition spec — behaviour patterns
const goodBehaviour = validateL8LowerLayerInteraction({
  componentId: 'good',
  claimedBehaviors: [
    'consume l6 current feature state',
    'consume l7 validation assessment via stable handoff',
    'persist regime state via l5 write coordination',
  ],
});
assert(goodBehaviour.valid, 'B.32 legal L8 behaviours pass');

const badBehaviour = validateL8LowerLayerInteraction({
  componentId: 'bad',
  claimedBehaviors: [
    're-resolve identity for asset',
    'override confidence',
    're-validate claim inside regime',
    'ignore contradiction bundle',
    'widen restriction for downstream',
    'bypass l7 restrictions',
    'live from l6 revalidation',
    'from raw feed compute regime',
    'direct postgres write for regime',
  ],
});
assert(!badBehaviour.valid, 'B.33 illegal L8 behaviours blocked');
assert(badBehaviour.violations.length >= 7,
  `B.34 multiple illegal behaviours surface violations (got ${badBehaviour.violations.length})`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Capability and Prohibition Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Capability and Prohibition Law ═══');
resetAll();

assert(ALL_L8_ALLOWED_CAPABILITIES.length === 13,
  `C.01 13 allowed capabilities (got ${ALL_L8_ALLOWED_CAPABILITIES.length})`);
assert(ALL_L8_CAPABILITY_GROUPS.length === 4, 'C.02 4 capability groups');
assert(ALL_L8_FORBIDDEN_ACTIONS.length >= 15,
  `C.03 ≥15 forbidden actions (got ${ALL_L8_FORBIDDEN_ACTIONS.length})`);
assert(ALL_L8_CAPABILITY_CONTEXTS.length === 9, 'C.04 9 capability contexts');

// Capability groups populated
for (const g of ALL_L8_CAPABILITY_GROUPS) {
  assert(getL8CapabilitiesForGroup(g).length >= 1, `C.group.${g} populated`);
}

// Policy integrity
assert(L8_CAPABILITY_POLICY.length === ALL_L8_ALLOWED_CAPABILITIES.length,
  'C.05 policy covers all capabilities');
for (const entry of L8_CAPABILITY_POLICY) {
  for (const ctx of ALL_L8_CAPABILITY_CONTEXTS) {
    assert(entry.decisions[ctx] !== undefined,
      `C.matrix.${entry.capability}.${ctx}`);
  }
}
assert(getL8CapabilityPolicyCount() === ALL_L8_ALLOWED_CAPABILITIES.length,
  'C.06 policy count matches');
assert(getFullL8CapabilityMatrix().length ===
  ALL_L8_ALLOWED_CAPABILITIES.length * ALL_L8_CAPABILITY_CONTEXTS.length,
  'C.07 full matrix size');

// Specific capability rules
assert(getL8CapabilityDecision(
  L8AllowedCapability.PRIMARY_REGIME_CLASSIFICATION,
  'REGIME_CLASSIFICATION',
) === 'ALLOWED',
  'C.08 PRIMARY_REGIME_CLASSIFICATION allowed in REGIME_CLASSIFICATION');
assert(getL8CapabilityDecision(
  L8AllowedCapability.MULTIPLIER_DERIVATION,
  'MULTIPLIER_DERIVATION_CTX',
) === 'ALLOWED',
  'C.09 MULTIPLIER_DERIVATION allowed in MULTIPLIER_DERIVATION_CTX');
assert(getL8CapabilityDecision(
  L8AllowedCapability.REGIME_PERSISTENCE,
  'REPLAY_PATH',
) === 'DENIED',
  'C.10 REGIME_PERSISTENCE denied in REPLAY_PATH (writes in replay forbidden)');
assert(getL8CapabilityDecision(
  L8AllowedCapability.MULTIPLIER_DERIVATION,
  'REGIME_ASSEMBLY',
) === 'DENIED',
  'C.11 MULTIPLIER_DERIVATION denied in REGIME_ASSEMBLY');
assert(isL8CapabilityAllowed(
  L8AllowedCapability.REGIME_CONFIDENCE_DERIVATION,
  'CONFIDENCE_DERIVATION_CTX',
),
  'C.12 REGIME_CONFIDENCE_DERIVATION allowed in CONFIDENCE_DERIVATION_CTX');
assert(!isL8CapabilityAllowed(
  L8AllowedCapability.REGIME_PERSISTENCE,
  'REPLAY_PATH',
),
  'C.13 REGIME_PERSISTENCE not allowed in REPLAY_PATH');

// Capability claim evaluator
const okClaim = evaluateL8CapabilityClaim({
  capability: L8AllowedCapability.PRIMARY_REGIME_CLASSIFICATION,
  context: 'REGIME_CLASSIFICATION',
  claimant: 'test',
});
assert(okClaim.allowed, 'C.14 ok claim allowed');

const badClaim = evaluateL8CapabilityClaim({
  capability: L8AllowedCapability.REGIME_PERSISTENCE,
  context: 'REPLAY_PATH',
  claimant: 'test',
});
assert(!badClaim.allowed, 'C.15 bad claim denied');

let capThrew = false;
try {
  assertL8CapabilityClaim({
    capability: L8AllowedCapability.REGIME_PERSISTENCE,
    context: 'REPLAY_PATH',
    claimant: 'test',
  });
} catch (e) {
  capThrew = e instanceof L8ConstitutionalError;
}
assert(capThrew, 'C.16 assertL8CapabilityClaim throws on denied');

// Denied list per context
const deniedInReplay = getL8DeniedCapabilities('REPLAY_PATH');
assert(deniedInReplay.includes(L8AllowedCapability.REGIME_PERSISTENCE),
  'C.17 REGIME_PERSISTENCE in replay denied list');

// Forbidden actions
assert(L8_FORBIDDEN_ACTION_DEFINITIONS.length === ALL_L8_FORBIDDEN_ACTIONS.length,
  'C.18 every forbidden action has a definition');
for (const action of ALL_L8_FORBIDDEN_ACTIONS) {
  const def = getL8ForbiddenActionDefinition(action);
  assert(def !== undefined && def.description.length > 0,
    `C.forbidden.${action}`);
}
assert(getAllL8CriticalForbiddenActions().length >= 10,
  `C.19 ≥10 critical forbidden actions (got ${getAllL8CriticalForbiddenActions().length})`);
assert(getL8RegisteredForbiddenActionCount() === L8_FORBIDDEN_ACTION_DEFINITIONS.length,
  'C.20 registered count matches');
assert(getL8CriticalForbiddenActionCount() ===
  getAllL8CriticalForbiddenActions().length,
  'C.21 critical count matches');

// Forbidden-action registry checks
const chkRec = checkForL8ForbiddenActions({
  proposedName: 'buy_signal_regime',
  context: 'component',
});
assert(!chkRec.clean, 'C.22 buy_signal_regime flagged');
assert(chkRec.violations.some(v => v.action ===
  L8ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK),
  'C.23 recommendation leak flagged');

const chkScen = checkForL8ForbiddenActions({
  proposedName: 'scenario_winner',
  context: 'component',
});
assert(!chkScen.clean, 'C.24 scenario_winner flagged');
assert(chkScen.violations.some(v => v.action === L8ForbiddenAction.FINAL_SCENARIO_LEAK),
  'C.25 scenario leak flagged');

const chkJudge = checkForL8ForbiddenActions({
  proposedName: 'attractive_regime',
  context: 'component',
});
assert(!chkJudge.clean, 'C.26 attractive_regime flagged');
assert(chkJudge.violations.some(v => v.action === L8ForbiddenAction.FINAL_JUDGMENT_LEAK),
  'C.27 judgment leak flagged');

const chkAction = checkForL8ForbiddenActions({
  proposedName: 'risk_on_buy_regime',
  context: 'component',
});
assert(!chkAction.clean, 'C.28 risk_on_buy flagged');
assert(chkAction.violations.some(v => v.action ===
  L8ForbiddenAction.ACTION_BIAS_IN_REGIME_NAME),
  'C.29 action-bias flagged');

const chkOverride = checkForL8ForbiddenActions({
  proposedName: 'validation_override_engine',
  context: 'component',
});
assert(!chkOverride.clean, 'C.30 validation_override flagged');
assert(chkOverride.violations.some(v => v.action ===
  L8ForbiddenAction.VALIDATION_TRUTH_REDEFINITION),
  'C.31 validation redefinition flagged');

const chkClean = checkForL8ForbiddenActions({
  proposedName: 'market_regime_macro_risk_on',
  proposedDescription: 'classifies the broad market environment',
  context: 'component',
});
assert(chkClean.clean, 'C.32 clean component passes forbidden-action check');

let fabThrew = false;
try {
  assertNoL8ForbiddenActions({
    proposedName: 'buy_signal',
    context: 'comp',
  });
} catch (e) {
  fabThrew = e instanceof L8ConstitutionalError;
}
assert(fabThrew, 'C.33 assertNoL8ForbiddenActions throws on violation');

// Name legality helper
assert(checkL8ComponentNameLegality('market_regime_macro_risk_on').legal,
  'C.34 legal name');
assert(!checkL8ComponentNameLegality('Best_Trade').legal, 'C.35 bad casing rejected');
assert(!checkL8ComponentNameLegality('buy_signal').legal,
  'C.36 forbidden semantics rejected');

// Ambiguity handling
for (const s of ['PRESERVE_COEXISTENCE', 'EXPLICIT_TRANSITION_FLAG',
                 'EXPLICIT_LOW_CONFIDENCE'] as const) {
  assert(validateL8AmbiguityHandling({ componentId: 'x', strategy: s }).valid,
    `C.amb.ok.${s}`);
}
for (const s of ['TIE_BREAK_BY_RECENT_PRICE', 'TIE_BREAK_BY_PREFERRED_NARRATIVE',
                 'FLATTEN_TO_SINGLE_REGIME', 'DROP_TRANSITION_DURING_TRANSITION'] as const) {
  const r = validateL8AmbiguityHandling({ componentId: 'x', strategy: s });
  assert(!r.valid, `C.amb.bad.${s}`);
  assert(r.violations[0].code === L8ConstitutionalViolationCode.AMBIGUITY_LAUNDERING,
    `C.amb.code.${s}`);
}

// Restriction handling
assert(validateL8RestrictionHandling({
  componentId: 'g',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: false,
  honoursContradictionPosture: true,
}).valid, 'C.37 clean restriction handling passes');

assert(!validateL8RestrictionHandling({
  componentId: 'b1',
  consumesL7Output: true,
  declaresRestrictionPosture: false,
  widensDownstreamRights: false,
  honoursContradictionPosture: true,
}).valid, 'C.38 missing posture blocked');

assert(!validateL8RestrictionHandling({
  componentId: 'b2',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: true,
  honoursContradictionPosture: true,
}).valid, 'C.39 widening rights blocked');

assert(!validateL8RestrictionHandling({
  componentId: 'b3',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: false,
  honoursContradictionPosture: false,
}).valid, 'C.40 ignoring contradiction blocked');

// Staleness handling
assert(!validateL8StalenessHandling({
  componentId: 'x',
  explicitStalenessClassification: false,
  invalidatesOnInputStaleness: false,
  silentFallbackToLastKnown: true,
}).valid, 'C.41 silent stale fallback blocked');

assert(validateL8StalenessHandling({
  componentId: 'x',
  explicitStalenessClassification: true,
  invalidatesOnInputStaleness: false,
  silentFallbackToLastKnown: false,
}).valid, 'C.42 explicit staleness passes');

assert(validateL8StalenessHandling({
  componentId: 'x',
  explicitStalenessClassification: false,
  invalidatesOnInputStaleness: true,
  silentFallbackToLastKnown: false,
}).valid, 'C.43 invalidate-on-stale passes');

// Multiplier grounding
assert(validateL8MultiplierGrounding({
  componentId: 'm',
  multiplierBoundToRegime: true,
  honoursRestrictionPosture: true,
  isFinalScoreShape: false,
}).valid, 'C.44 grounded multiplier passes');

assert(!validateL8MultiplierGrounding({
  componentId: 'm',
  multiplierBoundToRegime: false,
  honoursRestrictionPosture: true,
  isFinalScoreShape: false,
}).valid, 'C.45 ungrounded multiplier blocked');

assert(!validateL8MultiplierGrounding({
  componentId: 'm',
  multiplierBoundToRegime: true,
  honoursRestrictionPosture: false,
  isFinalScoreShape: false,
}).valid, 'C.46 multiplier ignoring restriction blocked');

const scoreShaped = validateL8MultiplierGrounding({
  componentId: 'm',
  multiplierBoundToRegime: true,
  honoursRestrictionPosture: true,
  isFinalScoreShape: true,
});
assert(!scoreShaped.valid, 'C.47 score-shaped multiplier blocked');
assert(scoreShaped.violations.some(v =>
  v.code === L8ConstitutionalViolationCode.FORBIDDEN_SCORE_OVERRIDE),
  'C.48 FORBIDDEN_SCORE_OVERRIDE code on score shape');

// ═══════════════════════════════════════════════════════════════
// BAND D — Output Boundary Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Output Boundary Law ═══');
resetAll();

assert(ALL_L8_OUTPUT_SURFACE_CLASSES.length === 5, 'D.01 5 output classes');
assert(L8_OUTPUT_SURFACES.length === 5, 'D.02 5 output surfaces');

for (const cls of ALL_L8_OUTPUT_SURFACE_CLASSES) {
  assert(isL8RegisteredOutputClass(cls), `D.cls.${cls}`);
  assert(isL8LegalOutputClass(cls), `D.legal.${cls}`);
}

for (const s of L8_OUTPUT_SURFACES) {
  assert(isL8RegisteredOutput(s.surfaceId), `D.reg.${s.surfaceId}`);
  assert(s.replayRequired, `D.replay.${s.surfaceId}`);
  assert(s.lineageRequired, `D.lineage.${s.surfaceId}`);
  assert(s.requiredLineageFields.length >= 3, `D.lineage_fields.${s.surfaceId}`);
  assert(s.l5StorageRoute.length > 0, `D.route.${s.surfaceId}`);
  assert(s.allowedDownstreamConsumers.length >= 1, `D.consumers.${s.surfaceId}`);
  assert(s.evidenceBound, `D.evidence.${s.surfaceId}`);
}

// Output classes map cleanly
for (const cls of ALL_L8_OUTPUT_SURFACE_CLASSES) {
  const surfaces = L8_OUTPUT_SURFACES.filter(s => s.outputClass === cls);
  assert(surfaces.length === 1, `D.class-surface-1to1.${cls}`);
}

// getL8OutputSurface
assert(getL8OutputSurface('l8:regime_state') !== undefined,
  'D.03 regime_state surface retrievable');
assert(getL8OutputSurface('fake:missing') === undefined, 'D.04 fake surface undefined');

// Lineage aggregation
const allLineage = getAllL8RequiredLineageFields();
assert(allLineage.includes('trace_id'), 'D.05 trace_id in lineage');
assert(allLineage.includes('manifest_id'), 'D.06 manifest_id in lineage');
assert(allLineage.includes('regime_subject_id'), 'D.07 regime_subject_id in lineage');

// Forbidden output classes
const forbiddenOut = [
  'FINAL_SCENARIO_WINNER', 'FINAL_SCORE', 'FINAL_OPPORTUNITY_RANKING',
  'FINAL_ACTION_RECOMMENDATION', 'FINAL_JUDGMENT', 'TRADE_RECOMMENDATION',
  'BUY_SIGNAL', 'SELL_SIGNAL', 'AVOID_SIGNAL', 'BEST_REGIME_WINNER',
  'WINNING_THESIS', 'CONVICTION_TRADE',
];
for (const cls of forbiddenOut) {
  assert(isL8ForbiddenOutputClass(cls), `D.forbidden.${cls}`);
  assert(!isL8LegalOutputClass(cls), `D.illegal.${cls}`);
  assert(!validateL8OutputClassName(cls).valid,
    `D.validateOutputClassName.${cls}`);
}

// Forbidden output classes trigger correct semantic codes
const scSem = validateL8OutputSemantics('FINAL_SCENARIO_WINNER');
assert(!scSem.valid && scSem.violations.some(v =>
  v.code === L8ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS),
  'D.08 scenario semantics code');
const jdSem = validateL8OutputSemantics('WINNING_THESIS');
assert(!jdSem.valid && jdSem.violations.some(v =>
  v.code === L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS),
  'D.09 judgment semantics code');
const recSem = validateL8OutputSemantics('BUY_SIGNAL');
assert(!recSem.valid && recSem.violations.some(v =>
  v.code === L8ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS),
  'D.10 recommendation semantics code');

// Output emission validator
const emitOk = validateL8OutputEmission({
  surfaceId: 'l8:regime_state',
  outputClass: L8OutputSurfaceClass.REGIME_STATE,
  lineageFields: {
    regime_subject_id: 'subj-1',
    regime_family: 'MARKET_REGIME',
    classified_at: new Date().toISOString(),
    trace_id: 'trace-1',
    manifest_id: 'm-1',
  },
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(emitOk.allowed, 'D.11 full-lineage regime_state emission allowed');

const emitMissing = validateL8OutputEmission({
  surfaceId: 'l8:regime_state',
  outputClass: L8OutputSurfaceClass.REGIME_STATE,
  lineageFields: {
    regime_subject_id: 'subj-1',
    classified_at: new Date().toISOString(),
    trace_id: 'trace-1',
    // missing regime_family, manifest_id
  },
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(!emitMissing.allowed, 'D.12 missing lineage blocked');
assert(emitMissing.missingLineage.length >= 2, 'D.13 multiple missing lineage fields');
assert(emitMissing.violationCode === L8ConstitutionalViolationCode.MISSING_LINEAGE,
  'D.14 MISSING_LINEAGE code');

const emitUnreg = validateL8OutputEmission({
  surfaceId: 'fake:unreg',
  outputClass: L8OutputSurfaceClass.REGIME_STATE,
  lineageFields: {},
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(!emitUnreg.allowed, 'D.15 unregistered surface blocked');
assert(emitUnreg.violationCode === L8ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
  'D.16 UNREGISTERED_OUTPUT code');

let emitThrew = false;
try {
  assertL8OutputEmission({
    surfaceId: 'fake:nope',
    outputClass: L8OutputSurfaceClass.REGIME_STATE,
    lineageFields: {},
    emitter: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  emitThrew = e instanceof L8ConstitutionalError;
}
assert(emitThrew, 'D.17 assertL8OutputEmission throws');

// Downstream consumer validator
const consumerOk = validateL8DownstreamConsumer(
  'l8:regime_multiplier_profile',
  'L9_SCENARIO',
);
assert(consumerOk.valid, 'D.18 L9_SCENARIO allowed for multiplier profile');

const consumerBad = validateL8DownstreamConsumer(
  'l8:regime_state',
  'RANDOM_LAYER',
);
assert(!consumerBad.valid, 'D.19 unknown consumer denied');

assert(getL8AllowedConsumersForOutput('l8:regime_state').includes('L9_SCENARIO'),
  'D.20 regime_state consumable by L9_SCENARIO');
assert(getAllL8RegisteredOutputIds().length === L8_OUTPUT_SURFACES.length,
  'D.21 getAllL8RegisteredOutputIds matches');

// Full-component validator
const compOk = validateL8Component({
  name: 'market_regime_macro_risk_on',
  subjectClass: L8SubjectClass.MARKET_REGIME,
  outputSurfaceId: 'l8:regime_state',
  outputClass: L8OutputSurfaceClass.REGIME_STATE,
  dependencySurfaceIds: ['l6:current_feature_state', 'l6:feature_history'],
  dependencyUsage: 'REGIME_SIGNAL',
  description: 'classifies the macro risk-on environment across the market',
});
assert(compOk.valid, 'D.22 clean L8 component passes validator');

const compBadName = validateL8Component({
  name: 'buy_signal_engine',
  subjectClass: L8SubjectClass.MARKET_REGIME,
  outputSurfaceId: 'l8:regime_state',
  outputClass: L8OutputSurfaceClass.REGIME_STATE,
  dependencySurfaceIds: ['l6:current_feature_state'],
  dependencyUsage: 'REGIME_SIGNAL',
  description: 'classifies regimes using governed features',
});
assert(!compBadName.valid, 'D.23 forbidden name blocked');
assert(compBadName.violations.some(v =>
  v.code === L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS),
  'D.24 FORBIDDEN_JUDGMENT_SEMANTICS reported');

const compBadDep = validateL8Component({
  name: 'sector_regime_expansion',
  subjectClass: L8SubjectClass.SECTOR_REGIME,
  outputSurfaceId: 'l8:regime_state',
  outputClass: L8OutputSurfaceClass.REGIME_STATE,
  dependencySurfaceIds: ['fake:unregistered'],
  dependencyUsage: 'REGIME_SIGNAL',
  description: 'classifies sector-level regime transitions',
});
assert(!compBadDep.valid, 'D.25 unregistered dep blocked');
assert(compBadDep.violations.some(v =>
  v.code === L8ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY),
  'D.26 UNREGISTERED_DEPENDENCY reported');

const compBadDesc = validateL8Component({
  name: 'asset_regime_ok_name',
  subjectClass: L8SubjectClass.ASSET_REGIME,
  outputSurfaceId: 'l8:regime_state',
  outputClass: L8OutputSurfaceClass.REGIME_STATE,
  dependencySurfaceIds: ['l6:current_feature_state'],
  dependencyUsage: 'REGIME_SIGNAL',
  description: 'emits a buy signal when regime confirms bullish thesis',
});
assert(!compBadDesc.valid, 'D.27 forbidden description blocked');

const compNonMission = validateL8Component({
  name: 'arbitrary_engine_a1',
  subjectClass: L8SubjectClass.MARKET_REGIME,
  outputSurfaceId: 'l8:regime_state',
  outputClass: L8OutputSurfaceClass.REGIME_STATE,
  dependencySurfaceIds: ['l6:current_feature_state'],
  dependencyUsage: 'REGIME_SIGNAL',
  description: 'does something vaguely related to the data layer',
});
assert(!compNonMission.valid, 'D.28 non-regime mission description blocked');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

// Audit emission — all typed emitters
emitL8DependencyViolation('fake:x', 'src', 'reason');
emitL8OutputViolation('fake:y', 'src', 'reason');
emitL8NamingViolation('buy_signal', 'src');
emitL8ActionBiasViolation('risk_on_buy_regime', 'src');
emitL8AmbiguityLaunderingViolation('c', 'src', 'flatten');
emitL8ContradictionIgnoredViolation('c', 'src');
emitL8RestrictionBypassViolation('c', 'src', 'widened');
emitL8StaleRegimeViolation('c', 'src');
emitL8RawDataInventionViolation('c', 'src', 'raw feed');
emitL8StorageBypassViolation('src', 'direct postgres');
emitL8LowerLayerRedefinitionViolation('src', 'identity redefined');
emitL8ValidationRedefinitionViolation('src', 'L7 truth overridden');

const all = getL8ConstitutionalAuditLog();
assert(all.length === 12, `E.01 12 audit records (got ${all.length})`);
assert(getL8ViolationCount() === 12, 'E.02 getL8ViolationCount matches');
assert(hasAnyL8Violations(), 'E.03 hasAnyL8Violations true');

// Critical count
const crits = getL8CriticalViolations();
assert(crits.length >= 8, `E.04 ≥8 critical violations (got ${crits.length})`);

// Query by code
assert(getL8ViolationsByCode(
  L8ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY).length === 1,
  'E.05 UNREGISTERED_DEPENDENCY queryable');
assert(getL8ViolationsByCode(
  L8ConstitutionalViolationCode.AMBIGUITY_LAUNDERING).length === 1,
  'E.06 AMBIGUITY_LAUNDERING queryable');
assert(getL8ViolationsByCode(
  L8ConstitutionalViolationCode.RESTRICTION_BYPASS).length === 1,
  'E.07 RESTRICTION_BYPASS queryable');
assert(getL8ViolationsByCode(
  L8ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION).length === 1,
  'E.08 VALIDATION_TRUTH_REDEFINITION queryable');

// Custom audit record
const custom = emitL8AuditRecord({
  violationCode: L8ConstitutionalViolationCode.MULTIPLIER_WITHOUT_REGIME_GROUND,
  source: 'custom',
  detail: 'ungrounded',
  context: { componentId: 'x' },
  severity: 'CRITICAL',
});
assert(custom.timestamp.length > 0, 'E.09 audit record has timestamp');
assert(custom.violationCode ===
  L8ConstitutionalViolationCode.MULTIPLIER_WITHOUT_REGIME_GROUND,
  'E.10 audit code preserved');
assert(getL8ConstitutionalAuditLog().length === 13, 'E.11 custom appended');

// Reset
resetAll();
assert(getL8ConstitutionalAuditLog().length === 0, 'E.12 audit log cleared');
assert(!hasAnyL8Violations(), 'E.13 hasAnyL8Violations false after reset');

// Invariants INV-8.1-A .. G
const inv = checkAllL81Invariants();
assert(inv.length === 7, 'E.14 7 L8.1 invariants');
assert(inv.every(r => r.holds), `E.15 all invariants hold: ${
  inv.filter(r => !r.holds).map(r => `${r.id}=${r.evidence}`).join('; ')}`);

const invA = checkINV_81_A(); assert(invA.holds, `E.A ${invA.evidence}`);
const invB = checkINV_81_B(); assert(invB.holds, `E.B ${invB.evidence}`);
const invC = checkINV_81_C(); assert(invC.holds, `E.C ${invC.evidence}`);
const invD = checkINV_81_D(); assert(invD.holds, `E.D ${invD.evidence}`);
const invE = checkINV_81_E(); assert(invE.holds, `E.E ${invE.evidence}`);
const invF = checkINV_81_F(); assert(invF.holds, `E.F ${invF.evidence}`);
const invG = checkINV_81_G(); assert(invG.holds, `E.G ${invG.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L8.1 CONSTITUTION — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 8 constitutional boundary green.');
  process.exit(0);
}
