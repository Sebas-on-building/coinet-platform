/**
 * L9.1 — Constitutional Position, Mission, and Layer Boundary
 * Certification Test Suite
 *
 * 5 Bands:
 *   A — Mission and boundary legality
 *   B — Dependency law (L3–L8 stable handoff, restriction- and
 *       regime-posture-aware)
 *   C — Capability and prohibition law
 *   D — Output boundary law
 *   E — Audit and invariants (INV-9.1-A..H)
 */

// ── Contracts ──
import {
  L9SubjectClass, ALL_L9_SUBJECT_CLASSES,
  L9AllowedCapability, ALL_L9_ALLOWED_CAPABILITIES,
  L9CapabilityGroup, ALL_L9_CAPABILITY_GROUPS,
  L9ForbiddenAction, ALL_L9_FORBIDDEN_ACTIONS,
  L9DependencyLayer, ALL_L9_DEPENDENCY_LAYERS,
  ALL_L9_DEPENDENCY_SURFACE_CLASSES,
  L9OutputSurfaceClass, ALL_L9_OUTPUT_SURFACE_CLASSES,
  ALL_L9_CAPABILITY_CONTEXTS,
  L9ConstitutionalViolationCode, ALL_L9_VIOLATION_CODES, L9ConstitutionalError,
  L9_MISSION, L9_MISSION_CONSTRAINT,
  isL9LegalOutputClass, isL9ForbiddenOutputClass, matchesL9Mission,
  L9_IS_NOT, L9_DOES_NOT_ANSWER,
  containsL9ForbiddenNaming, isValidL9ComponentName,
  checkL9ForbiddenSemantics, getL9ForbiddenNamePatterns, getL9ValidNameExamples,
  L9_CAPABILITY_POLICY, getL9CapabilityDecision, isL9CapabilityAllowed,
  getL9DeniedCapabilities, getL9CapabilitiesForGroup, getAllL9CapabilityGroups,
  L9_FORBIDDEN_ACTION_DEFINITIONS, getL9ForbiddenActionDefinition,
  getAllL9CriticalForbiddenActions,
  L9_DEPENDENCY_SURFACES, getL9DependencySurface, isL9RegisteredDependency,
  getL9SurfacesForLayer, getL9SurfacesUsableFor, isL9UsableFor,
  getL9RequiredDependencySurfaces, getL9RestrictionAwareSurfaces,
  getL9RegimePostureAwareSurfaces,
  L9_OUTPUT_SURFACES, getL9OutputSurface, isL9RegisteredOutput,
  isL9RegisteredOutputClass, getAllL9RequiredLineageFields,
  getL9AllowedConsumersForOutput,
} from '../l9/contracts';

// ── Constitution ──
import {
  requestL9DependencyAccess, assertL9DependencyAccess, getAllL9RegisteredSurfaceIds,
  validateL9OutputEmission, assertL9OutputEmission, validateL9OutputClassName,
  validateL9DownstreamConsumer, getAllL9RegisteredOutputIds,
  evaluateL9CapabilityClaim, assertL9CapabilityClaim,
  getFullL9CapabilityMatrix, getL9CapabilityPolicyCount,
  checkForL9ForbiddenActions, assertNoL9ForbiddenActions, checkL9ComponentNameLegality,
  getL9RegisteredForbiddenActionCount, getL9CriticalForbiddenActionCount,
  validateL9Component, validateL9OutputSemantics,
  validateL9AmbiguityHandling, validateL9CausalRestraint,
  validateL9RestrictionHandling, validateL9RegimeHandling,
  validateL9StalenessHandling, validateL9LowerLayerInteraction,
  validateL9EvidenceGrounding,
  resetL9ConstitutionalAuditLog, emitL9AuditRecord, getL9ConstitutionalAuditLog,
  getL9CriticalViolations, getL9ViolationsByCode, hasAnyL9Violations, getL9ViolationCount,
  emitL9DependencyViolation, emitL9OutputViolation, emitL9NamingViolation,
  emitL9ActionBiasViolation, emitL9AmbiguityLaunderingViolation,
  emitL9CausalLaunderingViolation, emitL9TemporalTheatricsViolation,
  emitL9ContradictionIgnoredViolation, emitL9RestrictionBypassViolation,
  emitL9RegimePostureIgnoredViolation, emitL9RegimeReinterpretationViolation,
  emitL9StaleSequenceViolation, emitL9RawDataInventionViolation,
  emitL9StorageBypassViolation, emitL9LowerLayerRedefinitionViolation,
  emitL9ValidationRedefinitionViolation, emitL9EvidenceOnlyAsDecisiveViolation,
  emitL9LateLayerConsumptionViolation,
} from '../l9/constitution';

// ── Invariants ──
import {
  checkAllL91Invariants,
  checkINV_91_A, checkINV_91_B, checkINV_91_C, checkINV_91_D,
  checkINV_91_E, checkINV_91_F, checkINV_91_G, checkINV_91_H,
} from '../l9/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetL9ConstitutionalAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Mission and Boundary Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Mission and Boundary Legality ═══');
resetAll();

assert(L9_MISSION.name === 'Layer 9 — Sequence & Temporal Engine', 'A.01 Mission name');
assert(L9_MISSION.canonical.includes('governed temporal meaning'),
  'A.02 Mission mentions governed temporal meaning');
assert(L9_MISSION.canonical.includes('ordered signal chains'),
  'A.03 Mission describes ordered signal chains');
assert(L9_MISSION.canonical.includes('lead-lag'), 'A.04 Mission mentions lead-lag');
assert(L9_MISSION.canonical.includes('phase progression'),
  'A.05 Mission mentions phase progression');
assert(L9_MISSION.canonical.includes('decay posture'),
  'A.06 Mission mentions decay posture');
assert(L9_MISSION.compression.includes('unfolded through time'),
  'A.07 Mission compression');
assert(L9_MISSION.firstPrinciple.includes('ordered evidence'),
  'A.08 First principle: ordered evidence');
assert(L9_MISSION.firstPrinciple.includes('rhetorical storytelling'),
  'A.09 First principle rejects rhetorical storytelling');
assert(L9_MISSION.truthTestingBoundary.length >= 7,
  `A.10 ≥7 truth-testing boundary items (got ${L9_MISSION.truthTestingBoundary.length})`);
assert((L9_MISSION.truthTestingBoundary as readonly string[]).includes('ordered signal chain'),
  'A.11 ordered signal chain in boundary');
assert((L9_MISSION.truthTestingBoundary as readonly string[]).includes('lead-lag structure'),
  'A.12 lead-lag structure in boundary');
assert((L9_MISSION.truthTestingBoundary as readonly string[]).includes('phase progression'),
  'A.13 phase progression in boundary');
assert(L9_MISSION.offLimits.length >= 10, 'A.14 off-limits list populated');
assert((L9_MISSION.offLimits as readonly string[]).some(s => s.includes('judgment')),
  'A.15 off-limits contains judgment');
assert((L9_MISSION.offLimits as readonly string[]).some(s => s.includes('recommendation')),
  'A.16 off-limits contains recommendation');
assert((L9_MISSION.offLimits as readonly string[]).some(s => s.includes('causal')),
  'A.17 off-limits contains causal certainty');

assert(ALL_L9_SUBJECT_CLASSES.length === 6, 'A.18 6 subject classes');
assert(ALL_L9_SUBJECT_CLASSES.includes(L9SubjectClass.ORDERED_SIGNAL_CHAIN),
  'A.19 ORDERED_SIGNAL_CHAIN');
assert(ALL_L9_SUBJECT_CLASSES.includes(L9SubjectClass.LEAD_LAG_STRUCTURE),
  'A.20 LEAD_LAG_STRUCTURE');
assert(ALL_L9_SUBJECT_CLASSES.includes(L9SubjectClass.PHASE_PROGRESSION),
  'A.21 PHASE_PROGRESSION');
assert(ALL_L9_SUBJECT_CLASSES.includes(L9SubjectClass.CHANGE_POINT_EVIDENCE),
  'A.22 CHANGE_POINT_EVIDENCE');
assert(ALL_L9_SUBJECT_CLASSES.includes(L9SubjectClass.DECAY_STATE),
  'A.23 DECAY_STATE');
assert(ALL_L9_SUBJECT_CLASSES.includes(L9SubjectClass.POST_EVENT_WINDOW),
  'A.24 POST_EVENT_WINDOW');

assert(L9_MISSION.frozenDependencies.length === 6, 'A.25 6 frozen dependencies');
assert(L9_MISSION.frozenDependencies.includes(L9DependencyLayer.L3), 'A.26 depends on L3');
assert(L9_MISSION.frozenDependencies.includes(L9DependencyLayer.L4), 'A.27 depends on L4');
assert(L9_MISSION.frozenDependencies.includes(L9DependencyLayer.L5), 'A.28 depends on L5');
assert(L9_MISSION.frozenDependencies.includes(L9DependencyLayer.L6), 'A.29 depends on L6');
assert(L9_MISSION.frozenDependencies.includes(L9DependencyLayer.L7), 'A.30 depends on L7');
assert(L9_MISSION.frozenDependencies.includes(L9DependencyLayer.L8), 'A.31 depends on L8');

assert(L9_IS_NOT.length >= 6, 'A.32 L9_IS_NOT declared');
assert((L9_IS_NOT as readonly string[]).includes('the final judgment layer'),
  'A.33 L9 is not judgment layer');
assert((L9_IS_NOT as readonly string[]).includes('the scenario engine'),
  'A.34 L9 is not scenario engine');
assert((L9_IS_NOT as readonly string[]).includes('the recommendation layer'),
  'A.35 L9 is not recommendation layer');
assert((L9_IS_NOT as readonly string[]).includes('the regime engine'),
  'A.36 L9 is not regime engine');
assert((L9_IS_NOT as readonly string[]).includes('the validation layer'),
  'A.37 L9 is not validation layer');
assert(L9_DOES_NOT_ANSWER.length >= 6, 'A.38 L9_DOES_NOT_ANSWER declared');

// Mission matcher
assert(matchesL9Mission('classifies the ordered signal chain for a subject over a window'),
  'A.39 sequence description matches mission');
assert(matchesL9Mission('derives lead-lag structure between spot and funding'),
  'A.40 lead-lag description matches mission');
assert(matchesL9Mission('detects phase progression through validated accumulation'),
  'A.41 phase description matches mission');
assert(!matchesL9Mission('emits a buy signal when momentum confirms'),
  'A.42 recommendation description rejected');
assert(!matchesL9Mission('picks the winning scenario for a judgment'),
  'A.43 scenario-winner description rejected');
assert(!matchesL9Mission('re-validates the L7 claim live from L6'),
  'A.44 revalidation description rejected');
assert(!matchesL9Mission('produces the final score for an asset'),
  'A.45 final-score description rejected');
assert(!matchesL9Mission('claims causal certainty that A caused B'),
  'A.46 causal certainty description rejected');

// Component naming legality
assert(isValidL9ComponentName('ordered_signal_chain_macro'),
  'A.47 valid snake_case chain name allowed');
assert(isValidL9ComponentName('lead_lag_structure_spot_vs_funding'),
  'A.48 lead-lag name allowed');
assert(!isValidL9ComponentName('buy_signal'), 'A.49 buy_signal rejected');
assert(!isValidL9ComponentName('best_sequence'), 'A.50 best_sequence rejected');
assert(!isValidL9ComponentName('winning_sequence'), 'A.51 winning_sequence rejected');
assert(!isValidL9ComponentName('scenario_winner'), 'A.52 scenario_winner rejected');
assert(!isValidL9ComponentName('final_judgment'), 'A.53 final_judgment rejected');
assert(!isValidL9ComponentName('ideal_timing'), 'A.54 ideal_timing rejected');
assert(!isValidL9ComponentName('alpha_phase_entry'),
  'A.55 alpha_phase_entry rejected');
assert(!isValidL9ComponentName('actionable_setup'),
  'A.56 actionable_setup rejected');
assert(!isValidL9ComponentName('trade_ready_sequence'),
  'A.57 trade_ready_sequence rejected');
assert(!isValidL9ComponentName('hypothesis_sequence'),
  'A.58 hypothesis_sequence rejected');
assert(!isValidL9ComponentName('causal_certainty'),
  'A.59 causal_certainty rejected');
assert(!isValidL9ComponentName('CamelCase'), 'A.60 non-snake_case rejected');
assert(!isValidL9ComponentName(''), 'A.61 empty name rejected');

// Valid name examples
assert(getL9ValidNameExamples().length >= 7, 'A.62 valid name examples populated');
for (const n of getL9ValidNameExamples()) {
  assert(isValidL9ComponentName(n), `A.valid_example.${n}`);
}

// Forbidden semantic check
const sem = checkL9ForbiddenSemantics('buy_signal');
assert(sem.forbidden && sem.matchedPattern !== null, 'A.63 checkL9ForbiddenSemantics positive');

// Violation-code enum sanity
assert(ALL_L9_VIOLATION_CODES.length >= 25,
  `A.64 ≥25 violation codes (got ${ALL_L9_VIOLATION_CODES.length})`);
assert(ALL_L9_VIOLATION_CODES.includes(L9ConstitutionalViolationCode.CAUSAL_LAUNDERING),
  'A.65 CAUSAL_LAUNDERING code present');
assert(ALL_L9_VIOLATION_CODES.includes(L9ConstitutionalViolationCode.TEMPORAL_THEATRICS),
  'A.66 TEMPORAL_THEATRICS code present');
assert(ALL_L9_VIOLATION_CODES.includes(L9ConstitutionalViolationCode.REGIME_POSTURE_IGNORED),
  'A.67 REGIME_POSTURE_IGNORED code present');
assert(ALL_L9_VIOLATION_CODES.includes(L9ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION),
  'A.68 LATE_LAYER_CONSUMPTION code present');

// Error class behaves
const err = new L9ConstitutionalError(
  L9ConstitutionalViolationCode.CAUSAL_LAUNDERING,
  'test',
  { foo: 'bar' },
);
assert(err.code === L9ConstitutionalViolationCode.CAUSAL_LAUNDERING,
  'A.69 error carries code');
assert(err.details.foo === 'bar', 'A.70 error carries details');

// ═══════════════════════════════════════════════════════════════
// BAND B — Dependency Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Law ═══');
resetAll();

assert(ALL_L9_DEPENDENCY_LAYERS.length === 6, 'B.01 6 dependency layers');
assert(ALL_L9_DEPENDENCY_SURFACE_CLASSES.length >= 20,
  `B.02 ≥20 dependency surface classes (got ${ALL_L9_DEPENDENCY_SURFACE_CLASSES.length})`);
assert(L9_DEPENDENCY_SURFACES.length >= 20,
  `B.03 ≥20 registered surfaces (got ${L9_DEPENDENCY_SURFACES.length})`);

// Every layer has at least one surface
for (const layer of ALL_L9_DEPENDENCY_LAYERS) {
  const forLayer = getL9SurfacesForLayer(layer);
  assert(forLayer.length >= 1, `B.layer.${layer} has ≥1 surface`);
}

// L7 surfaces are all restriction-aware and stable-handoff
const l7Surfaces = getL9SurfacesForLayer(L9DependencyLayer.L7);
assert(l7Surfaces.length === 5, 'B.04 5 L7 stable handoff surfaces');
assert(l7Surfaces.every(s => s.restrictionAware),
  'B.05 all L7 surfaces are restriction-aware');
assert(l7Surfaces.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.06 all L7 surfaces carry STABLE_HANDOFF authority');

// L8 surfaces are all stable-handoff and regime-posture-aware
const l8Surfaces = getL9SurfacesForLayer(L9DependencyLayer.L8);
assert(l8Surfaces.length === 5, 'B.07 5 L8 stable handoff surfaces');
assert(l8Surfaces.every(s => s.restrictionAware),
  'B.08 all L8 surfaces are restriction-aware');
assert(l8Surfaces.every(s => s.regimePostureAware),
  'B.09 all L8 surfaces are regime-posture-aware');
assert(l8Surfaces.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.10 all L8 surfaces carry STABLE_HANDOFF authority');

// Required surfaces present
const required = getL9RequiredDependencySurfaces();
assert(required.length >= 10, `B.11 ≥10 required surfaces (got ${required.length})`);
assert(required.some(s => s.surfaceId === 'l7:validation_assessment'),
  'B.12 l7:validation_assessment required');
assert(required.some(s => s.surfaceId === 'l7:restriction_profile'),
  'B.13 l7:restriction_profile required');
assert(required.some(s => s.surfaceId === 'l8:regime_state'),
  'B.14 l8:regime_state required');
assert(required.some(s => s.surfaceId === 'l5:write_coordination'),
  'B.15 l5:write_coordination required');

// Registry lookup
assert(getL9DependencySurface('l8:regime_state') !== undefined,
  'B.16 registry returns L8 regime_state surface');
assert(getL9DependencySurface('nonexistent') === undefined,
  'B.17 registry returns undefined for missing');
assert(isL9RegisteredDependency('l6:current_feature_state'),
  'B.18 isL9RegisteredDependency true for l6:current_feature_state');
assert(!isL9RegisteredDependency('fake:anything'),
  'B.19 isL9RegisteredDependency false for fake');

// Usability
assert(isL9UsableFor('l6:current_feature_state', 'SEQUENCE_SIGNAL'),
  'B.20 L6 current feature state usable as SEQUENCE_SIGNAL');
assert(!isL9UsableFor('l5:write_coordination', 'SEQUENCE_SIGNAL'),
  'B.21 L5 write coordination NOT usable as SEQUENCE_SIGNAL');
assert(getL9SurfacesUsableFor('SEQUENCE_SIGNAL').length >= 4,
  'B.22 ≥4 surfaces usable as SEQUENCE_SIGNAL');
assert(getL9SurfacesUsableFor('REGIME_CONDITIONING').length >= 3,
  'B.23 ≥3 surfaces usable as REGIME_CONDITIONING');

// Dependency registry runtime — L6 (not posture-aware)
const accessOkL6 = requestL9DependencyAccess({
  surfaceId: 'l6:current_feature_state',
  requestedUsage: 'SEQUENCE_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(accessOkL6.allowed, 'B.24 L6 current feature state usable as sequence signal');

const accessUnregistered = requestL9DependencyAccess({
  surfaceId: 'fake:nope',
  requestedUsage: 'SEQUENCE_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessUnregistered.allowed, 'B.25 unregistered surface denied');
assert(accessUnregistered.violationCode ===
  L9ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
  'B.26 UNREGISTERED_DEPENDENCY code');

const accessWrongUsage = requestL9DependencyAccess({
  surfaceId: 'l5:write_coordination',
  requestedUsage: 'SEQUENCE_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessWrongUsage.allowed, 'B.27 wrong usage denied');
assert(accessWrongUsage.violationCode ===
  L9ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
  'B.28 ILLEGAL_DEPENDENCY_USAGE code');

// Restriction-aware enforcement (L7)
const accessL7NoPosture = requestL9DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SEQUENCE_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessL7NoPosture.allowed, 'B.29 L7 access without posture denied');
assert(accessL7NoPosture.violationCode ===
  L9ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
  'B.30 RESTRICTION_POSTURE_IGNORED code');

const accessL7WeakPosture = requestL9DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SEQUENCE_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: {
    allowsSequenceConditioning: false,
    allowsConfidenceInput: true,
    allowsRegimeConditioning: false,
  },
});
assert(!accessL7WeakPosture.allowed, 'B.31 L7 access with insufficient posture denied');
assert(accessL7WeakPosture.violationCode ===
  L9ConstitutionalViolationCode.RESTRICTION_BYPASS,
  'B.32 RESTRICTION_BYPASS code');

const accessL7FullPosture = requestL9DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SEQUENCE_SIGNAL',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: {
    allowsSequenceConditioning: true,
    allowsConfidenceInput: true,
    allowsRegimeConditioning: false,
  },
});
assert(accessL7FullPosture.allowed, 'B.33 L7 access with full posture allowed');

// Regime-posture enforcement (L8)
const accessL8NoRegime = requestL9DependencyAccess({
  surfaceId: 'l8:regime_state',
  requestedUsage: 'REGIME_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: {
    allowsSequenceConditioning: true,
    allowsConfidenceInput: true,
    allowsRegimeConditioning: true,
  },
});
assert(!accessL8NoRegime.allowed, 'B.34 L8 access without honouring regime posture denied');
assert(accessL8NoRegime.violationCode ===
  L9ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
  'B.35 REGIME_POSTURE_IGNORED code');

const accessL8WithRegime = requestL9DependencyAccess({
  surfaceId: 'l8:regime_state',
  requestedUsage: 'REGIME_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: {
    allowsSequenceConditioning: true,
    allowsConfidenceInput: true,
    allowsRegimeConditioning: true,
  },
  honoursRegimePosture: true,
});
assert(accessL8WithRegime.allowed, 'B.36 L8 access honouring regime posture allowed');

// assert throws
let threw = false;
try {
  assertL9DependencyAccess({
    surfaceId: 'fake:missing',
    requestedUsage: 'SEQUENCE_SIGNAL',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  threw = e instanceof L9ConstitutionalError;
}
assert(threw, 'B.37 assertL9DependencyAccess throws on unregistered');

// Restriction-aware set
const restrictionAware = getL9RestrictionAwareSurfaces();
assert(restrictionAware.length === 10, 'B.38 10 restriction-aware surfaces (L7+L8)');
assert(restrictionAware.every(s =>
  s.layer === L9DependencyLayer.L7 || s.layer === L9DependencyLayer.L8),
  'B.39 only L7/L8 surfaces are restriction-aware');

const regimeAware = getL9RegimePostureAwareSurfaces();
assert(regimeAware.length === 5, 'B.40 5 regime-posture-aware surfaces (all L8)');
assert(regimeAware.every(s => s.layer === L9DependencyLayer.L8),
  'B.41 only L8 surfaces are regime-posture-aware');

assert(getAllL9RegisteredSurfaceIds().length === L9_DEPENDENCY_SURFACES.length,
  'B.42 getAllL9RegisteredSurfaceIds matches');

// Lower-layer redefinition spec — behaviour patterns
const goodBehaviour = validateL9LowerLayerInteraction({
  componentId: 'good',
  claimedBehaviors: [
    'consume l6 current feature state',
    'consume l7 validation assessment via stable handoff',
    'consume l8 regime state via stable handoff',
    'persist sequence state via l5 write coordination',
  ],
});
assert(goodBehaviour.valid, 'B.43 legal L9 behaviours pass');

const badBehaviour = validateL9LowerLayerInteraction({
  componentId: 'bad',
  claimedBehaviors: [
    're-resolve identity for asset',
    'override confidence',
    're-validate claim inside sequence',
    'ignore contradiction bundle',
    'widen restriction for downstream',
    'bypass l7 restrictions',
    'reinterpret regime locally',
    'override regime from l8',
    'live from l6 revalidation',
    'from raw feed compute sequence',
    'direct postgres write for sequence',
    'consume scenario from l10',
    'causal certainty from temporal adjacency',
  ],
});
assert(!badBehaviour.valid, 'B.44 illegal L9 behaviours blocked');
assert(badBehaviour.violations.length >= 10,
  `B.45 multiple illegal behaviours surface violations (got ${badBehaviour.violations.length})`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Capability and Prohibition Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Capability and Prohibition Law ═══');
resetAll();

assert(ALL_L9_ALLOWED_CAPABILITIES.length >= 15,
  `C.01 ≥15 allowed capabilities (got ${ALL_L9_ALLOWED_CAPABILITIES.length})`);
assert(ALL_L9_CAPABILITY_GROUPS.length === 4, 'C.02 4 capability groups');
assert(ALL_L9_FORBIDDEN_ACTIONS.length >= 20,
  `C.03 ≥20 forbidden actions (got ${ALL_L9_FORBIDDEN_ACTIONS.length})`);
assert(ALL_L9_CAPABILITY_CONTEXTS.length === 12, 'C.04 12 capability contexts');

// Capability groups populated
for (const g of ALL_L9_CAPABILITY_GROUPS) {
  assert(getL9CapabilitiesForGroup(g).length >= 1, `C.group.${g} populated`);
}
assert(getAllL9CapabilityGroups().length === ALL_L9_CAPABILITY_GROUPS.length,
  'C.05 getAllL9CapabilityGroups covers all groups');

// Policy integrity
assert(L9_CAPABILITY_POLICY.length === ALL_L9_ALLOWED_CAPABILITIES.length,
  'C.06 policy covers all capabilities');
for (const entry of L9_CAPABILITY_POLICY) {
  for (const ctx of ALL_L9_CAPABILITY_CONTEXTS) {
    assert(entry.decisions[ctx] !== undefined,
      `C.matrix.${entry.capability}.${ctx}`);
  }
}
assert(getL9CapabilityPolicyCount() === ALL_L9_ALLOWED_CAPABILITIES.length,
  'C.07 policy count matches');
assert(getFullL9CapabilityMatrix().length ===
  ALL_L9_ALLOWED_CAPABILITIES.length * ALL_L9_CAPABILITY_CONTEXTS.length,
  'C.08 full matrix size');

// Specific capability rules
assert(getL9CapabilityDecision(
  L9AllowedCapability.ORDERED_CHAIN_ASSEMBLY,
  'SEQUENCE_ASSEMBLY',
) === 'ALLOWED',
  'C.09 ORDERED_CHAIN_ASSEMBLY allowed in SEQUENCE_ASSEMBLY');
assert(getL9CapabilityDecision(
  L9AllowedCapability.LEAD_LAG_DETECTION,
  'LEAD_LAG_DETECTION_CTX',
) === 'ALLOWED',
  'C.10 LEAD_LAG_DETECTION allowed in LEAD_LAG_DETECTION_CTX');
assert(getL9CapabilityDecision(
  L9AllowedCapability.CAUSAL_RESTRAINT_TAGGING,
  'LEAD_LAG_DETECTION_CTX',
) === 'ALLOWED',
  'C.11 CAUSAL_RESTRAINT_TAGGING allowed in LEAD_LAG_DETECTION_CTX');
assert(getL9CapabilityDecision(
  L9AllowedCapability.SEQUENCE_PERSISTENCE,
  'REPLAY_PATH',
) === 'DENIED',
  'C.12 SEQUENCE_PERSISTENCE denied in REPLAY_PATH');
assert(getL9CapabilityDecision(
  L9AllowedCapability.SEQUENCE_READ_SERVING,
  'REPAIR_PATH',
) === 'DENIED',
  'C.13 SEQUENCE_READ_SERVING denied in REPAIR_PATH');
assert(isL9CapabilityAllowed(
  L9AllowedCapability.SEQUENCE_CONFIDENCE_DERIVATION,
  'CONFIDENCE_DERIVATION_CTX',
),
  'C.14 SEQUENCE_CONFIDENCE_DERIVATION allowed in CONFIDENCE_DERIVATION_CTX');
assert(!isL9CapabilityAllowed(
  L9AllowedCapability.SEQUENCE_PERSISTENCE,
  'REPLAY_PATH',
),
  'C.15 SEQUENCE_PERSISTENCE not allowed in REPLAY_PATH');

// Capability claim evaluator
const okClaim = evaluateL9CapabilityClaim({
  capability: L9AllowedCapability.ORDERED_CHAIN_ASSEMBLY,
  context: 'SEQUENCE_ASSEMBLY',
  claimant: 'test',
});
assert(okClaim.allowed, 'C.16 ok claim allowed');

const badClaim = evaluateL9CapabilityClaim({
  capability: L9AllowedCapability.SEQUENCE_PERSISTENCE,
  context: 'REPLAY_PATH',
  claimant: 'test',
});
assert(!badClaim.allowed, 'C.17 bad claim denied');

let capThrew = false;
try {
  assertL9CapabilityClaim({
    capability: L9AllowedCapability.SEQUENCE_PERSISTENCE,
    context: 'REPLAY_PATH',
    claimant: 'test',
  });
} catch (e) {
  capThrew = e instanceof L9ConstitutionalError;
}
assert(capThrew, 'C.18 assertL9CapabilityClaim throws on denied');

// Denied list per context
const deniedInReplay = getL9DeniedCapabilities('REPLAY_PATH');
assert(deniedInReplay.includes(L9AllowedCapability.SEQUENCE_PERSISTENCE),
  'C.19 SEQUENCE_PERSISTENCE in replay denied list');

// Forbidden actions
assert(L9_FORBIDDEN_ACTION_DEFINITIONS.length === ALL_L9_FORBIDDEN_ACTIONS.length,
  'C.20 every forbidden action has a definition');
for (const action of ALL_L9_FORBIDDEN_ACTIONS) {
  const def = getL9ForbiddenActionDefinition(action);
  assert(def !== undefined && def.description.length > 0,
    `C.forbidden.${action}`);
}
assert(getAllL9CriticalForbiddenActions().length >= 15,
  `C.21 ≥15 critical forbidden actions (got ${getAllL9CriticalForbiddenActions().length})`);
assert(getL9RegisteredForbiddenActionCount() === L9_FORBIDDEN_ACTION_DEFINITIONS.length,
  'C.22 registered count matches');
assert(getL9CriticalForbiddenActionCount() ===
  getAllL9CriticalForbiddenActions().length,
  'C.23 critical count matches');

// Forbidden-action registry checks
const chkRec = checkForL9ForbiddenActions({
  proposedName: 'buy_signal_sequence',
  context: 'component',
});
assert(!chkRec.clean, 'C.24 buy_signal_sequence flagged');
assert(chkRec.violations.some(v => v.action ===
  L9ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK),
  'C.25 recommendation leak flagged');

const chkScen = checkForL9ForbiddenActions({
  proposedName: 'scenario_winner',
  context: 'component',
});
assert(!chkScen.clean, 'C.26 scenario_winner flagged');
assert(chkScen.violations.some(v => v.action === L9ForbiddenAction.FINAL_SCENARIO_LEAK),
  'C.27 scenario leak flagged');

const chkJudge = checkForL9ForbiddenActions({
  proposedName: 'best_sequence',
  context: 'component',
});
assert(!chkJudge.clean, 'C.28 best_sequence flagged');
assert(chkJudge.violations.some(v => v.action === L9ForbiddenAction.FINAL_JUDGMENT_LEAK),
  'C.29 judgment leak flagged');

const chkHyp = checkForL9ForbiddenActions({
  proposedName: 'hypothesis_sequence',
  context: 'component',
});
assert(!chkHyp.clean, 'C.30 hypothesis_sequence flagged');
assert(chkHyp.violations.some(v => v.action === L9ForbiddenAction.HYPOTHESIS_LEAK),
  'C.31 hypothesis leak flagged');

const chkAction = checkForL9ForbiddenActions({
  proposedName: 'risk_on_buy_sequence',
  context: 'component',
});
assert(!chkAction.clean, 'C.32 risk_on_buy flagged');
assert(chkAction.violations.some(v => v.action ===
  L9ForbiddenAction.ACTION_BIAS_IN_SEQUENCE_NAME),
  'C.33 action-bias flagged');

const chkCausal = checkForL9ForbiddenActions({
  proposedName: 'causal_certainty_chain',
  context: 'component',
});
assert(!chkCausal.clean, 'C.34 causal_certainty flagged');
assert(chkCausal.violations.some(v => v.action === L9ForbiddenAction.CAUSAL_LAUNDERING),
  'C.35 causal laundering flagged');

const chkOverride = checkForL9ForbiddenActions({
  proposedName: 'validation_override_engine',
  context: 'component',
});
assert(!chkOverride.clean, 'C.36 validation_override flagged');
assert(chkOverride.violations.some(v => v.action ===
  L9ForbiddenAction.VALIDATION_TRUTH_REDEFINITION),
  'C.37 validation redefinition flagged');

const chkClean = checkForL9ForbiddenActions({
  proposedName: 'ordered_signal_chain_macro',
  proposedDescription: 'classifies the ordered signal chain for a subject',
  context: 'component',
});
assert(chkClean.clean, 'C.38 clean component passes forbidden-action check');

let fabThrew = false;
try {
  assertNoL9ForbiddenActions({
    proposedName: 'buy_signal',
    context: 'comp',
  });
} catch (e) {
  fabThrew = e instanceof L9ConstitutionalError;
}
assert(fabThrew, 'C.39 assertNoL9ForbiddenActions throws on violation');

// Name legality helper
assert(checkL9ComponentNameLegality('ordered_signal_chain_macro').legal,
  'C.40 legal name');
assert(!checkL9ComponentNameLegality('Best_Sequence').legal, 'C.41 bad casing rejected');
assert(!checkL9ComponentNameLegality('buy_signal').legal,
  'C.42 forbidden semantics rejected');

// Ambiguity handling
for (const s of [
  'PRESERVE_AMBIGUITY_POSTURE',
  'EXPLICIT_AMBIGUOUS_FLAG',
  'EXPLICIT_LOW_CONFIDENCE',
] as const) {
  assert(validateL9AmbiguityHandling({ componentId: 'x', strategy: s }).valid,
    `C.amb.ok.${s}`);
}
for (const s of [
  'TIE_BREAK_BY_RECENT_PRICE',
  'TIE_BREAK_BY_PREFERRED_NARRATIVE',
  'FLATTEN_TO_CLEAN_CHAIN',
  'DROP_AMBIGUITY_FLAG',
] as const) {
  const r = validateL9AmbiguityHandling({ componentId: 'x', strategy: s });
  assert(!r.valid, `C.amb.bad.${s}`);
  assert(r.violations[0].code === L9ConstitutionalViolationCode.AMBIGUITY_LAUNDERING,
    `C.amb.code.${s}`);
}

// Causal-restraint handling
assert(validateL9CausalRestraint({
  componentId: 'g',
  declaresCausalRestraint: true,
  claimsCausalCertainty: false,
}).valid, 'C.43 clean causal restraint passes');
assert(!validateL9CausalRestraint({
  componentId: 'b1',
  declaresCausalRestraint: true,
  claimsCausalCertainty: true,
}).valid, 'C.44 causal certainty claim blocked');
assert(!validateL9CausalRestraint({
  componentId: 'b2',
  declaresCausalRestraint: false,
  claimsCausalCertainty: false,
}).valid, 'C.45 missing causal restraint blocked');

// Restriction handling
assert(validateL9RestrictionHandling({
  componentId: 'g',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: false,
  honoursContradictionPosture: true,
}).valid, 'C.46 clean restriction handling passes');

assert(!validateL9RestrictionHandling({
  componentId: 'b1',
  consumesL7Output: true,
  declaresRestrictionPosture: false,
  widensDownstreamRights: false,
  honoursContradictionPosture: true,
}).valid, 'C.47 missing posture blocked');

assert(!validateL9RestrictionHandling({
  componentId: 'b2',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: true,
  honoursContradictionPosture: true,
}).valid, 'C.48 widening rights blocked');

assert(!validateL9RestrictionHandling({
  componentId: 'b3',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: false,
  honoursContradictionPosture: false,
}).valid, 'C.49 ignoring contradiction blocked');

// Regime handling
assert(validateL9RegimeHandling({
  componentId: 'g',
  consumesL8Output: true,
  honoursRegimePosture: true,
  reinterpretsRegime: false,
}).valid, 'C.50 clean regime handling passes');
assert(!validateL9RegimeHandling({
  componentId: 'b1',
  consumesL8Output: true,
  honoursRegimePosture: false,
  reinterpretsRegime: false,
}).valid, 'C.51 regime posture ignored blocked');
assert(!validateL9RegimeHandling({
  componentId: 'b2',
  consumesL8Output: true,
  honoursRegimePosture: true,
  reinterpretsRegime: true,
}).valid, 'C.52 regime reinterpretation blocked');

// Staleness handling
assert(!validateL9StalenessHandling({
  componentId: 'x',
  explicitStalenessClassification: false,
  invalidatesOnInputStaleness: false,
  silentFallbackToLastKnown: true,
}).valid, 'C.53 silent stale fallback blocked');

assert(validateL9StalenessHandling({
  componentId: 'x',
  explicitStalenessClassification: true,
  invalidatesOnInputStaleness: false,
  silentFallbackToLastKnown: false,
}).valid, 'C.54 explicit staleness passes');

assert(validateL9StalenessHandling({
  componentId: 'x',
  explicitStalenessClassification: false,
  invalidatesOnInputStaleness: true,
  silentFallbackToLastKnown: false,
}).valid, 'C.55 invalidate-on-stale passes');

// Evidence-grounding
assert(validateL9EvidenceGrounding({
  componentId: 'g',
  usesEvidenceOnlySurface: true,
  treatsEvidenceAsDecisive: false,
  hasNonEvidencePrimarySupport: true,
}).valid, 'C.56 evidence used with primary support passes');
assert(!validateL9EvidenceGrounding({
  componentId: 'b1',
  usesEvidenceOnlySurface: true,
  treatsEvidenceAsDecisive: true,
  hasNonEvidencePrimarySupport: true,
}).valid, 'C.57 evidence-only as decisive blocked');
assert(!validateL9EvidenceGrounding({
  componentId: 'b2',
  usesEvidenceOnlySurface: true,
  treatsEvidenceAsDecisive: false,
  hasNonEvidencePrimarySupport: false,
}).valid, 'C.58 evidence-only without primary support blocked');

// ═══════════════════════════════════════════════════════════════
// BAND D — Output Boundary Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Output Boundary Law ═══');
resetAll();

assert(ALL_L9_OUTPUT_SURFACE_CLASSES.length === 7, 'D.01 7 output classes');
assert(L9_OUTPUT_SURFACES.length === 7, 'D.02 7 output surfaces');

for (const cls of ALL_L9_OUTPUT_SURFACE_CLASSES) {
  assert(isL9RegisteredOutputClass(cls), `D.cls.${cls}`);
  assert(isL9LegalOutputClass(cls), `D.legal.${cls}`);
}

for (const s of L9_OUTPUT_SURFACES) {
  assert(isL9RegisteredOutput(s.surfaceId), `D.reg.${s.surfaceId}`);
  assert(s.replayRequired, `D.replay.${s.surfaceId}`);
  assert(s.lineageRequired, `D.lineage.${s.surfaceId}`);
  assert(s.requiredLineageFields.length >= 3, `D.lineage_fields.${s.surfaceId}`);
  assert(s.l5StorageRoute.length > 0, `D.route.${s.surfaceId}`);
  assert(s.allowedDownstreamConsumers.length >= 1, `D.consumers.${s.surfaceId}`);
  assert(s.evidenceBound, `D.evidence.${s.surfaceId}`);
}

// Output classes map cleanly
for (const cls of ALL_L9_OUTPUT_SURFACE_CLASSES) {
  const surfaces = L9_OUTPUT_SURFACES.filter(s => s.outputClass === cls);
  assert(surfaces.length === 1, `D.class-surface-1to1.${cls}`);
}

// getL9OutputSurface
assert(getL9OutputSurface('l9:sequence_assessment') !== undefined,
  'D.03 sequence_assessment surface retrievable');
assert(getL9OutputSurface('fake:missing') === undefined, 'D.04 fake surface undefined');

// Lineage aggregation
const allLineage = getAllL9RequiredLineageFields();
assert(allLineage.includes('trace_id'), 'D.05 trace_id in lineage');
assert(allLineage.includes('manifest_id'), 'D.06 manifest_id in lineage');
assert(allLineage.includes('sequence_subject_id'), 'D.07 sequence_subject_id in lineage');

// Forbidden output classes
const forbiddenOut = [
  'FINAL_SCENARIO_WINNER', 'FINAL_SCORE', 'FINAL_OPPORTUNITY_RANKING',
  'FINAL_ACTION_RECOMMENDATION', 'FINAL_JUDGMENT', 'TRADE_RECOMMENDATION',
  'BUY_SIGNAL', 'SELL_SIGNAL', 'AVOID_SIGNAL',
  'BEST_SEQUENCE', 'WINNING_SEQUENCE', 'IDEAL_TIMING', 'ALPHA_PHASE',
  'ACTIONABLE_SETUP', 'TRADE_READY_SEQUENCE', 'CONVICTION_SEQUENCE',
  'HYPOTHESIS_SEQUENCE', 'SCENARIO_CHAIN', 'CAUSAL_CERTAINTY',
];
for (const cls of forbiddenOut) {
  assert(isL9ForbiddenOutputClass(cls), `D.forbidden.${cls}`);
  assert(!isL9LegalOutputClass(cls), `D.illegal.${cls}`);
  assert(!validateL9OutputClassName(cls).valid,
    `D.validateOutputClassName.${cls}`);
}

// Forbidden output classes trigger correct semantic codes
const scSem = validateL9OutputSemantics('FINAL_SCENARIO_WINNER');
assert(!scSem.valid && scSem.violations.some(v =>
  v.code === L9ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS),
  'D.08 scenario semantics code');
const hySem = validateL9OutputSemantics('HYPOTHESIS_SEQUENCE');
assert(!hySem.valid && hySem.violations.some(v =>
  v.code === L9ConstitutionalViolationCode.FORBIDDEN_HYPOTHESIS_SEMANTICS),
  'D.09 hypothesis semantics code');
const caSem = validateL9OutputSemantics('CAUSAL_CERTAINTY');
assert(!caSem.valid && caSem.violations.some(v =>
  v.code === L9ConstitutionalViolationCode.CAUSAL_LAUNDERING),
  'D.10 causal certainty triggers causal-laundering code');
const jdSem = validateL9OutputSemantics('BEST_SEQUENCE');
assert(!jdSem.valid && jdSem.violations.some(v =>
  v.code === L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS),
  'D.11 judgment semantics code');
const recSem = validateL9OutputSemantics('BUY_SIGNAL');
assert(!recSem.valid && recSem.violations.some(v =>
  v.code === L9ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS),
  'D.12 recommendation semantics code');
const scoreSem = validateL9OutputSemantics('FINAL_SCORE');
assert(!scoreSem.valid && scoreSem.violations.some(v =>
  v.code === L9ConstitutionalViolationCode.FORBIDDEN_SCORE_SEMANTICS),
  'D.13 score semantics code');

// Output emission validator
const emitOk = validateL9OutputEmission({
  surfaceId: 'l9:sequence_assessment',
  outputClass: L9OutputSurfaceClass.SEQUENCE_ASSESSMENT,
  lineageFields: {
    sequence_subject_id: 'subj-1',
    assessed_at: new Date().toISOString(),
    trace_id: 'trace-1',
    manifest_id: 'm-1',
  },
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(emitOk.allowed, 'D.14 full-lineage sequence_assessment emission allowed');

const emitMissing = validateL9OutputEmission({
  surfaceId: 'l9:sequence_assessment',
  outputClass: L9OutputSurfaceClass.SEQUENCE_ASSESSMENT,
  lineageFields: {
    sequence_subject_id: 'subj-1',
    trace_id: 'trace-1',
    // missing assessed_at, manifest_id
  },
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(!emitMissing.allowed, 'D.15 missing lineage blocked');
assert(emitMissing.missingLineage.length >= 2, 'D.16 multiple missing lineage fields');
assert(emitMissing.violationCode === L9ConstitutionalViolationCode.MISSING_LINEAGE,
  'D.17 MISSING_LINEAGE code');

const emitUnreg = validateL9OutputEmission({
  surfaceId: 'fake:unreg',
  outputClass: L9OutputSurfaceClass.SEQUENCE_ASSESSMENT,
  lineageFields: {},
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(!emitUnreg.allowed, 'D.18 unregistered surface blocked');
assert(emitUnreg.violationCode === L9ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
  'D.19 UNREGISTERED_OUTPUT code');

let emitThrew = false;
try {
  assertL9OutputEmission({
    surfaceId: 'fake:nope',
    outputClass: L9OutputSurfaceClass.SEQUENCE_ASSESSMENT,
    lineageFields: {},
    emitter: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  emitThrew = e instanceof L9ConstitutionalError;
}
assert(emitThrew, 'D.20 assertL9OutputEmission throws');

// Downstream consumer validator
const consumerOk = validateL9DownstreamConsumer(
  'l9:sequence_assessment',
  'L10_SCENARIO',
);
assert(consumerOk.valid, 'D.21 L10_SCENARIO allowed for sequence_assessment');

const consumerBad = validateL9DownstreamConsumer(
  'l9:sequence_assessment',
  'RANDOM_LAYER',
);
assert(!consumerBad.valid, 'D.22 unknown consumer denied');

assert(getL9AllowedConsumersForOutput('l9:sequence_assessment').includes('L10_SCENARIO'),
  'D.23 sequence_assessment consumable by L10_SCENARIO');
assert(getAllL9RegisteredOutputIds().length === L9_OUTPUT_SURFACES.length,
  'D.24 getAllL9RegisteredOutputIds matches');

// Full-component validator
const compOk = validateL9Component({
  name: 'ordered_signal_chain_macro',
  subjectClass: L9SubjectClass.ORDERED_SIGNAL_CHAIN,
  outputSurfaceId: 'l9:sequence_chain',
  outputClass: L9OutputSurfaceClass.SEQUENCE_CHAIN,
  dependencySurfaceIds: ['l6:feature_history', 'l6:event_history'],
  dependencyUsage: 'SEQUENCE_SIGNAL',
  description: 'classifies the ordered signal chain for a subject over a window',
});
assert(compOk.valid, 'D.25 clean L9 component passes validator');

const compBadName = validateL9Component({
  name: 'buy_signal_engine',
  subjectClass: L9SubjectClass.ORDERED_SIGNAL_CHAIN,
  outputSurfaceId: 'l9:sequence_chain',
  outputClass: L9OutputSurfaceClass.SEQUENCE_CHAIN,
  dependencySurfaceIds: ['l6:feature_history'],
  dependencyUsage: 'SEQUENCE_SIGNAL',
  description: 'classifies sequence chains using governed primitives',
});
assert(!compBadName.valid, 'D.26 forbidden name blocked');
assert(compBadName.violations.some(v =>
  v.code === L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS),
  'D.27 FORBIDDEN_JUDGMENT_SEMANTICS reported');

const compBadDep = validateL9Component({
  name: 'lead_lag_structure_spot_vs_funding',
  subjectClass: L9SubjectClass.LEAD_LAG_STRUCTURE,
  outputSurfaceId: 'l9:lead_lag_profile',
  outputClass: L9OutputSurfaceClass.LEAD_LAG_PROFILE,
  dependencySurfaceIds: ['fake:unregistered'],
  dependencyUsage: 'SEQUENCE_SIGNAL',
  description: 'classifies lead-lag structure across related signals',
});
assert(!compBadDep.valid, 'D.28 unregistered dep blocked');
assert(compBadDep.violations.some(v =>
  v.code === L9ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY),
  'D.29 UNREGISTERED_DEPENDENCY reported');

const compBadDesc = validateL9Component({
  name: 'phase_progression_ok_name',
  subjectClass: L9SubjectClass.PHASE_PROGRESSION,
  outputSurfaceId: 'l9:phase_state',
  outputClass: L9OutputSurfaceClass.PHASE_STATE,
  dependencySurfaceIds: ['l6:feature_history'],
  dependencyUsage: 'PHASE_SIGNAL',
  description: 'emits a buy signal when phase confirms bullish thesis',
});
assert(!compBadDesc.valid, 'D.30 forbidden description blocked');

const compNonMission = validateL9Component({
  name: 'arbitrary_engine_a1',
  subjectClass: L9SubjectClass.ORDERED_SIGNAL_CHAIN,
  outputSurfaceId: 'l9:sequence_chain',
  outputClass: L9OutputSurfaceClass.SEQUENCE_CHAIN,
  dependencySurfaceIds: ['l6:feature_history'],
  dependencyUsage: 'SEQUENCE_SIGNAL',
  description: 'does something vaguely related to the data layer',
});
assert(!compNonMission.valid, 'D.31 non-sequence mission description blocked');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

// Audit emission — all typed emitters
emitL9DependencyViolation('fake:x', 'src', 'reason');
emitL9OutputViolation('fake:y', 'src', 'reason');
emitL9NamingViolation('buy_signal', 'src');
emitL9ActionBiasViolation('risk_on_buy_sequence', 'src');
emitL9AmbiguityLaunderingViolation('c', 'src', 'flatten');
emitL9CausalLaunderingViolation('c', 'src', 'adjacency promoted');
emitL9TemporalTheatricsViolation('c', 'src', 'elegant story');
emitL9ContradictionIgnoredViolation('c', 'src');
emitL9RestrictionBypassViolation('c', 'src', 'widened');
emitL9RegimePostureIgnoredViolation('c', 'src');
emitL9RegimeReinterpretationViolation('c', 'src');
emitL9StaleSequenceViolation('c', 'src');
emitL9RawDataInventionViolation('c', 'src', 'raw feed');
emitL9StorageBypassViolation('src', 'direct postgres');
emitL9LowerLayerRedefinitionViolation('src', 'identity redefined');
emitL9ValidationRedefinitionViolation('src', 'L7 truth overridden');
emitL9EvidenceOnlyAsDecisiveViolation('c', 'src', 'evidence-only treated as decisive');
emitL9LateLayerConsumptionViolation('c', 'src', 'consumed L10 surface');

const all = getL9ConstitutionalAuditLog();
assert(all.length === 18, `E.01 18 audit records (got ${all.length})`);
assert(getL9ViolationCount() === 18, 'E.02 getL9ViolationCount matches');
assert(hasAnyL9Violations(), 'E.03 hasAnyL9Violations true');

// Critical count
const crits = getL9CriticalViolations();
assert(crits.length >= 12, `E.04 ≥12 critical violations (got ${crits.length})`);

// Query by code
assert(getL9ViolationsByCode(
  L9ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY).length === 1,
  'E.05 UNREGISTERED_DEPENDENCY queryable');
assert(getL9ViolationsByCode(
  L9ConstitutionalViolationCode.AMBIGUITY_LAUNDERING).length === 1,
  'E.06 AMBIGUITY_LAUNDERING queryable');
assert(getL9ViolationsByCode(
  L9ConstitutionalViolationCode.CAUSAL_LAUNDERING).length === 1,
  'E.07 CAUSAL_LAUNDERING queryable');
assert(getL9ViolationsByCode(
  L9ConstitutionalViolationCode.TEMPORAL_THEATRICS).length === 1,
  'E.08 TEMPORAL_THEATRICS queryable');
assert(getL9ViolationsByCode(
  L9ConstitutionalViolationCode.REGIME_POSTURE_IGNORED).length === 1,
  'E.09 REGIME_POSTURE_IGNORED queryable');
assert(getL9ViolationsByCode(
  L9ConstitutionalViolationCode.REGIME_REINTERPRETATION).length === 1,
  'E.10 REGIME_REINTERPRETATION queryable');
assert(getL9ViolationsByCode(
  L9ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION).length === 1,
  'E.11 LATE_LAYER_CONSUMPTION queryable');
assert(getL9ViolationsByCode(
  L9ConstitutionalViolationCode.EVIDENCE_ONLY_AS_DECISIVE).length === 1,
  'E.12 EVIDENCE_ONLY_AS_DECISIVE queryable');

// Custom audit record
const custom = emitL9AuditRecord({
  violationCode: L9ConstitutionalViolationCode.CAUSAL_LAUNDERING,
  source: 'custom',
  detail: 'fabricated causality',
  context: { componentId: 'x' },
  severity: 'CRITICAL',
});
assert(custom.timestamp.length > 0, 'E.13 audit record has timestamp');
assert(custom.violationCode === L9ConstitutionalViolationCode.CAUSAL_LAUNDERING,
  'E.14 audit code preserved');
assert(getL9ConstitutionalAuditLog().length === 19, 'E.15 custom appended');

// Reset
resetAll();
assert(getL9ConstitutionalAuditLog().length === 0, 'E.16 audit log cleared');
assert(!hasAnyL9Violations(), 'E.17 hasAnyL9Violations false after reset');

// Invariants INV-9.1-A .. H
const inv = checkAllL91Invariants();
assert(inv.length === 8, 'E.18 8 L9.1 invariants');
assert(inv.every(r => r.holds), `E.19 all invariants hold: ${
  inv.filter(r => !r.holds).map(r => `${r.id}=${r.evidence}`).join('; ')}`);

const invA = checkINV_91_A(); assert(invA.holds, `E.A ${invA.evidence}`);
const invB = checkINV_91_B(); assert(invB.holds, `E.B ${invB.evidence}`);
const invC = checkINV_91_C(); assert(invC.holds, `E.C ${invC.evidence}`);
const invD = checkINV_91_D(); assert(invD.holds, `E.D ${invD.evidence}`);
const invE = checkINV_91_E(); assert(invE.holds, `E.E ${invE.evidence}`);
const invF = checkINV_91_F(); assert(invF.holds, `E.F ${invF.evidence}`);
const invG = checkINV_91_G(); assert(invG.holds, `E.G ${invG.evidence}`);
const invH = checkINV_91_H(); assert(invH.holds, `E.H ${invH.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L9.1 CONSTITUTION — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 9 constitutional boundary green.');
  process.exit(0);
}
