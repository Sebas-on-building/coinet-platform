/**
 * L10.1 — Constitutional Position, Mission, and Layer Boundary
 * Certification Test Suite
 *
 * 5 Bands:
 *   A — Mission and boundary legality
 *   B — Dependency law (L3–L9 stable handoff; restriction-, regime-,
 *       and sequence-posture-aware)
 *   C — Capability and prohibition law (competition, causal restraint,
 *       evidence grounding, primary-posture)
 *   D — Output boundary law
 *   E — Audit and invariants (INV-10.1-A..H)
 */

// ── Contracts ──
import {
  L10SubjectClass, ALL_L10_SUBJECT_CLASSES,
  L10AllowedCapability, ALL_L10_ALLOWED_CAPABILITIES,
  L10CapabilityGroup, ALL_L10_CAPABILITY_GROUPS,
  L10ForbiddenAction, ALL_L10_FORBIDDEN_ACTIONS,
  L10DependencyLayer, ALL_L10_DEPENDENCY_LAYERS,
  ALL_L10_DEPENDENCY_SURFACE_CLASSES,
  L10OutputSurfaceClass, ALL_L10_OUTPUT_SURFACE_CLASSES,
  ALL_L10_CAPABILITY_CONTEXTS,
  L10ConstitutionalViolationCode, ALL_L10_VIOLATION_CODES, L10ConstitutionalError,
  L10_MISSION, L10_MISSION_CONSTRAINT,
  isL10LegalOutputClass, isL10ForbiddenOutputClass, matchesL10Mission,
  L10_IS_NOT, L10_DOES_NOT_ANSWER,
  containsL10ForbiddenNaming, isValidL10ComponentName,
  checkL10ForbiddenSemantics, getL10ForbiddenNamePatterns, getL10ValidNameExamples,
  L10_CAPABILITY_POLICY, getL10CapabilityDecision, isL10CapabilityAllowed,
  getL10DeniedCapabilities, getL10CapabilitiesForGroup, getAllL10CapabilityGroups,
  L10_FORBIDDEN_ACTION_DEFINITIONS, getL10ForbiddenActionDefinition,
  getAllL10CriticalForbiddenActions,
  L10_DEPENDENCY_SURFACES, getL10DependencySurface, isL10RegisteredDependency,
  getL10SurfacesForLayer, getL10SurfacesUsableFor, isL10UsableFor,
  getL10RequiredDependencySurfaces, getL10RestrictionAwareSurfaces,
  getL10RegimePostureAwareSurfaces, getL10SequencePostureAwareSurfaces,
  L10_OUTPUT_SURFACES, getL10OutputSurface, isL10RegisteredOutput,
  isL10RegisteredOutputClass, getAllL10RequiredLineageFields,
  getL10AllowedConsumersForOutput,
} from '../l10/contracts';

// ── Constitution ──
import {
  requestL10DependencyAccess, assertL10DependencyAccess, getAllL10RegisteredSurfaceIds,
  validateL10OutputEmission, assertL10OutputEmission, validateL10OutputClassName,
  validateL10DownstreamConsumer, getAllL10RegisteredOutputIds,
  evaluateL10CapabilityClaim, assertL10CapabilityClaim,
  getFullL10CapabilityMatrix, getL10CapabilityPolicyCount,
  checkForL10ForbiddenActions, assertNoL10ForbiddenActions, checkL10ComponentNameLegality,
  getL10RegisteredForbiddenActionCount, getL10CriticalForbiddenActionCount,
  validateL10Component, validateL10OutputSemantics,
  validateL10CompetitionHandling, validateL10PrimaryPosture,
  validateL10CausalRestraint, validateL10RestrictionHandling,
  validateL10RegimeHandling, validateL10SequenceHandling,
  validateL10LowerLayerInteraction, validateL10EvidenceGrounding,
  resetL10ConstitutionalAuditLog, emitL10AuditRecord, getL10ConstitutionalAuditLog,
  getL10CriticalViolations, getL10ViolationsByCode, hasAnyL10Violations, getL10ViolationCount,
  emitL10DependencyViolation, emitL10OutputViolation, emitL10NamingViolation,
  emitL10SingleStoryCollapseViolation, emitL10AlternativeSuppressionViolation,
  emitL10CloseSpreadConcealmentViolation, emitL10ConfirmationGapConcealmentViolation,
  emitL10InvalidationPostureConcealmentViolation, emitL10ExplanationLaunderingViolation,
  emitL10CausalLaunderingViolation, emitL10PrimaryAsFinalTruthViolation,
  emitL10ContradictionOverwriteViolation, emitL10RestrictionBypassViolation,
  emitL10RegimePostureIgnoredViolation, emitL10RegimeReclassificationViolation,
  emitL10SequencePostureIgnoredViolation, emitL10SequenceReinterpretationViolation,
  emitL10L7LiveRevalidationViolation, emitL10RawDataInventionViolation,
  emitL10StorageBypassViolation, emitL10MissingLineageViolation,
  emitL10LowerLayerRedefinitionViolation, emitL10ValidationRedefinitionViolation,
  emitL10EvidenceAsymmetryConcealmentViolation, emitL10LateLayerConsumptionViolation,
} from '../l10/constitution';

// ── Invariants ──
import {
  checkAllL101Invariants,
  checkINV_101_A, checkINV_101_B, checkINV_101_C, checkINV_101_D,
  checkINV_101_E, checkINV_101_F, checkINV_101_G, checkINV_101_H,
} from '../l10/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetL10ConstitutionalAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Mission and Boundary Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Mission and Boundary Legality ═══');
resetAll();

assert(L10_MISSION.name === 'Layer 10 — Hypothesis Engine', 'A.01 Mission name');
assert(L10_MISSION.canonical.includes('competing governed explanations'),
  'A.02 Mission mentions competing governed explanations');
assert(L10_MISSION.canonical.includes('alternatives'),
  'A.03 Mission preserves alternatives');
assert(L10_MISSION.canonical.includes('spread'), 'A.04 Mission mentions spread');
assert(L10_MISSION.canonical.includes('shift'),
  'A.05 Mission mentions shift conditions');
assert(L10_MISSION.canonical.includes('without inventing truth'),
  'A.06 Mission rejects inventing truth');
assert(L10_MISSION.compression.includes('competing'),
  'A.07 Mission compression mentions competing');
assert(L10_MISSION.firstPrinciple.includes('governed competition'),
  'A.08 First principle: governed competition');
assert(L10_MISSION.firstPrinciple.includes('alternative'),
  'A.09 First principle requires alternative');
assert(L10_MISSION.explanationConstructionBoundary.length >= 7,
  `A.10 ≥7 explanation-construction boundary items (got ${L10_MISSION.explanationConstructionBoundary.length})`);
assert((L10_MISSION.explanationConstructionBoundary as readonly string[]).includes('hypothesis candidate'),
  'A.11 hypothesis candidate in boundary');
assert((L10_MISSION.explanationConstructionBoundary as readonly string[]).includes('hypothesis competition'),
  'A.12 hypothesis competition in boundary');
assert((L10_MISSION.explanationConstructionBoundary as readonly string[]).includes('hypothesis ranking'),
  'A.13 hypothesis ranking in boundary');
assert(L10_MISSION.offLimits.length >= 10, 'A.14 off-limits list populated');
assert((L10_MISSION.offLimits as readonly string[]).some(s => s.includes('judgment')),
  'A.15 off-limits contains judgment');
assert((L10_MISSION.offLimits as readonly string[]).some(s => s.includes('recommendation')),
  'A.16 off-limits contains recommendation');
assert((L10_MISSION.offLimits as readonly string[]).some(s => s.includes('single-story')),
  'A.17 off-limits contains single-story');
assert((L10_MISSION.offLimits as readonly string[]).some(s => s.includes('causal certainty')),
  'A.18 off-limits contains causal certainty');

assert(ALL_L10_SUBJECT_CLASSES.length === 8, 'A.19 8 subject classes');
assert(ALL_L10_SUBJECT_CLASSES.includes(L10SubjectClass.HYPOTHESIS_CANDIDATE),
  'A.20 HYPOTHESIS_CANDIDATE');
assert(ALL_L10_SUBJECT_CLASSES.includes(L10SubjectClass.HYPOTHESIS_COMPETITION),
  'A.21 HYPOTHESIS_COMPETITION');
assert(ALL_L10_SUBJECT_CLASSES.includes(L10SubjectClass.HYPOTHESIS_RANKING),
  'A.22 HYPOTHESIS_RANKING');
assert(ALL_L10_SUBJECT_CLASSES.includes(L10SubjectClass.SUPPORT_DOMAIN),
  'A.23 SUPPORT_DOMAIN');
assert(ALL_L10_SUBJECT_CLASSES.includes(L10SubjectClass.CONTRADICTION_DOMAIN),
  'A.24 CONTRADICTION_DOMAIN');
assert(ALL_L10_SUBJECT_CLASSES.includes(L10SubjectClass.CONFIRMATION_GAP),
  'A.25 CONFIRMATION_GAP');
assert(ALL_L10_SUBJECT_CLASSES.includes(L10SubjectClass.INVALIDATION_RISK),
  'A.26 INVALIDATION_RISK');
assert(ALL_L10_SUBJECT_CLASSES.includes(L10SubjectClass.SHIFT_CONDITION),
  'A.27 SHIFT_CONDITION');

assert(L10_MISSION.frozenDependencies.length === 7, 'A.28 7 frozen dependencies (L3–L9)');
for (const layer of [
  L10DependencyLayer.L3, L10DependencyLayer.L4, L10DependencyLayer.L5,
  L10DependencyLayer.L6, L10DependencyLayer.L7, L10DependencyLayer.L8,
  L10DependencyLayer.L9,
]) {
  assert(L10_MISSION.frozenDependencies.includes(layer), `A.dep.${layer}`);
}

assert(L10_IS_NOT.length >= 6, 'A.29 L10_IS_NOT declared');
assert((L10_IS_NOT as readonly string[]).includes('the final judgment layer'),
  'A.30 L10 is not judgment layer');
assert((L10_IS_NOT as readonly string[]).includes('the scenario engine'),
  'A.31 L10 is not scenario engine');
assert((L10_IS_NOT as readonly string[]).includes('the recommendation layer'),
  'A.32 L10 is not recommendation layer');
assert((L10_IS_NOT as readonly string[]).includes('the regime engine'),
  'A.33 L10 is not regime engine');
assert((L10_IS_NOT as readonly string[]).includes('the sequence engine'),
  'A.34 L10 is not sequence engine');
assert((L10_IS_NOT as readonly string[]).includes('the validation layer'),
  'A.35 L10 is not validation layer');
assert(L10_DOES_NOT_ANSWER.length >= 6, 'A.36 L10_DOES_NOT_ANSWER declared');

// Mission matcher
assert(matchesL10Mission('constructs competing hypothesis candidates for a subject'),
  'A.37 hypothesis description matches mission');
assert(matchesL10Mission('ranks candidates with explicit spread and preserved alternative'),
  'A.38 ranking description matches mission');
assert(matchesL10Mission('classifies confirmation gap and invalidation risk for a hypothesis'),
  'A.39 gap/risk description matches mission');
assert(!matchesL10Mission('emits a buy signal when ranking confirms'),
  'A.40 recommendation description rejected');
assert(!matchesL10Mission('picks the winning explanation for a judgment'),
  'A.41 winning-explanation description rejected');
assert(!matchesL10Mission('re-validates the L7 claim live from L6'),
  'A.42 revalidation description rejected');
assert(!matchesL10Mission('produces the final score for an asset'),
  'A.43 final-score description rejected');
assert(!matchesL10Mission('claims causal certainty that narrative caused the move'),
  'A.44 causal certainty description rejected');
assert(!matchesL10Mission('emits highest conviction hypothesis'),
  'A.45 conviction description rejected');

// Component naming legality
assert(isValidL10ComponentName('hypothesis_candidate_narrative_driven'),
  'A.46 valid hypothesis name allowed');
assert(isValidL10ComponentName('hypothesis_ranking_with_spread'),
  'A.47 ranking-with-spread name allowed');
assert(isValidL10ComponentName('contradiction_domain_binding_primary'),
  'A.48 contradiction-binding name allowed');
assert(!isValidL10ComponentName('buy_signal'), 'A.49 buy_signal rejected');
assert(!isValidL10ComponentName('best_explanation'), 'A.50 best_explanation rejected');
assert(!isValidL10ComponentName('winning_explanation'), 'A.51 winning_explanation rejected');
assert(!isValidL10ComponentName('scenario_winner'), 'A.52 scenario_winner rejected');
assert(!isValidL10ComponentName('final_judgment'), 'A.53 final_judgment rejected');
assert(!isValidL10ComponentName('ideal_explanation'), 'A.54 ideal_explanation rejected');
assert(!isValidL10ComponentName('alpha_explanation'), 'A.55 alpha_explanation rejected');
assert(!isValidL10ComponentName('actionable_explanation'),
  'A.56 actionable_explanation rejected');
assert(!isValidL10ComponentName('trade_ready'), 'A.57 trade_ready rejected');
assert(!isValidL10ComponentName('single_story_explanation'),
  'A.58 single_story rejected');
assert(!isValidL10ComponentName('proven_cause'), 'A.59 proven_cause rejected');
assert(!isValidL10ComponentName('causal_certainty'), 'A.60 causal_certainty rejected');
assert(!isValidL10ComponentName('highest_conviction_hypothesis'),
  'A.61 highest_conviction rejected');
assert(!isValidL10ComponentName('CamelCase'), 'A.62 non-snake_case rejected');
assert(!isValidL10ComponentName(''), 'A.63 empty name rejected');

// Valid name examples
assert(getL10ValidNameExamples().length >= 7, 'A.64 valid name examples populated');
for (const n of getL10ValidNameExamples()) {
  assert(isValidL10ComponentName(n), `A.valid_example.${n}`);
}

// Forbidden semantic check
const sem = checkL10ForbiddenSemantics('buy_signal');
assert(sem.forbidden && sem.matchedPattern !== null, 'A.65 checkL10ForbiddenSemantics positive');

// Violation-code enum sanity
assert(ALL_L10_VIOLATION_CODES.length >= 30,
  `A.66 ≥30 violation codes (got ${ALL_L10_VIOLATION_CODES.length})`);
assert(ALL_L10_VIOLATION_CODES.includes(L10ConstitutionalViolationCode.CAUSAL_LAUNDERING),
  'A.67 CAUSAL_LAUNDERING code present');
assert(ALL_L10_VIOLATION_CODES.includes(L10ConstitutionalViolationCode.SINGLE_STORY_COLLAPSE),
  'A.68 SINGLE_STORY_COLLAPSE code present');
assert(ALL_L10_VIOLATION_CODES.includes(L10ConstitutionalViolationCode.REGIME_POSTURE_IGNORED),
  'A.69 REGIME_POSTURE_IGNORED code present');
assert(ALL_L10_VIOLATION_CODES.includes(L10ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED),
  'A.70 SEQUENCE_POSTURE_IGNORED code present');
assert(ALL_L10_VIOLATION_CODES.includes(L10ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION),
  'A.71 LATE_LAYER_CONSUMPTION code present');
assert(ALL_L10_VIOLATION_CODES.includes(L10ConstitutionalViolationCode.PRIMARY_AS_FINAL_TRUTH),
  'A.72 PRIMARY_AS_FINAL_TRUTH code present');

// Error class behaves
const err = new L10ConstitutionalError(
  L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
  'test',
  { foo: 'bar' },
);
assert(err.code === L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
  'A.73 error carries code');
assert(err.details.foo === 'bar', 'A.74 error carries details');

// ═══════════════════════════════════════════════════════════════
// BAND B — Dependency Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Law ═══');
resetAll();

assert(ALL_L10_DEPENDENCY_LAYERS.length === 7, 'B.01 7 dependency layers (L3–L9)');
assert(ALL_L10_DEPENDENCY_SURFACE_CLASSES.length >= 25,
  `B.02 ≥25 dependency surface classes (got ${ALL_L10_DEPENDENCY_SURFACE_CLASSES.length})`);
assert(L10_DEPENDENCY_SURFACES.length >= 25,
  `B.03 ≥25 registered surfaces (got ${L10_DEPENDENCY_SURFACES.length})`);

// Every layer has at least one surface
for (const layer of ALL_L10_DEPENDENCY_LAYERS) {
  const forLayer = getL10SurfacesForLayer(layer);
  assert(forLayer.length >= 1, `B.layer.${layer} has ≥1 surface`);
}

// L7 surfaces are all restriction-aware and stable-handoff
const l7Surfaces = getL10SurfacesForLayer(L10DependencyLayer.L7);
assert(l7Surfaces.length === 5, 'B.04 5 L7 stable handoff surfaces');
assert(l7Surfaces.every(s => s.restrictionAware),
  'B.05 all L7 surfaces are restriction-aware');
assert(l7Surfaces.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.06 all L7 surfaces carry STABLE_HANDOFF authority');

// L8 surfaces are all stable-handoff and regime-posture-aware
const l8Surfaces = getL10SurfacesForLayer(L10DependencyLayer.L8);
assert(l8Surfaces.length === 5, 'B.07 5 L8 stable handoff surfaces');
assert(l8Surfaces.every(s => s.restrictionAware),
  'B.08 all L8 surfaces are restriction-aware');
assert(l8Surfaces.every(s => s.regimePostureAware),
  'B.09 all L8 surfaces are regime-posture-aware');
assert(l8Surfaces.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.10 all L8 surfaces carry STABLE_HANDOFF authority');

// L9 surfaces are all stable-handoff and sequence-posture-aware
const l9Surfaces = getL10SurfacesForLayer(L10DependencyLayer.L9);
assert(l9Surfaces.length === 7, 'B.11 7 L9 stable handoff surfaces');
assert(l9Surfaces.every(s => s.restrictionAware),
  'B.12 all L9 surfaces are restriction-aware');
assert(l9Surfaces.every(s => s.sequencePostureAware),
  'B.13 all L9 surfaces are sequence-posture-aware');
assert(l9Surfaces.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.14 all L9 surfaces carry STABLE_HANDOFF authority');

// Required surfaces present
const required = getL10RequiredDependencySurfaces();
assert(required.length >= 15, `B.15 ≥15 required surfaces (got ${required.length})`);
assert(required.some(s => s.surfaceId === 'l7:validation_assessment'),
  'B.16 l7:validation_assessment required');
assert(required.some(s => s.surfaceId === 'l7:restriction_profile'),
  'B.17 l7:restriction_profile required');
assert(required.some(s => s.surfaceId === 'l8:regime_state'),
  'B.18 l8:regime_state required');
assert(required.some(s => s.surfaceId === 'l9:sequence_assessment'),
  'B.19 l9:sequence_assessment required');
assert(required.some(s => s.surfaceId === 'l9:sequence_restriction_profile'),
  'B.20 l9:sequence_restriction_profile required');
assert(required.some(s => s.surfaceId === 'l5:write_coordination'),
  'B.21 l5:write_coordination required');

// Registry lookup
assert(getL10DependencySurface('l9:sequence_assessment') !== undefined,
  'B.22 registry returns L9 sequence_assessment surface');
assert(getL10DependencySurface('nonexistent') === undefined,
  'B.23 registry returns undefined for missing');
assert(isL10RegisteredDependency('l6:current_feature_state'),
  'B.24 isL10RegisteredDependency true for l6:current_feature_state');
assert(!isL10RegisteredDependency('fake:anything'),
  'B.25 isL10RegisteredDependency false for fake');

// Usability
assert(isL10UsableFor('l6:current_feature_state', 'SUPPORT_EVIDENCE'),
  'B.26 L6 current feature state usable as SUPPORT_EVIDENCE');
assert(!isL10UsableFor('l5:write_coordination', 'SUPPORT_EVIDENCE'),
  'B.27 L5 write coordination NOT usable as SUPPORT_EVIDENCE');
assert(getL10SurfacesUsableFor('SUPPORT_EVIDENCE').length >= 4,
  'B.28 ≥4 surfaces usable as SUPPORT_EVIDENCE');
assert(getL10SurfacesUsableFor('REGIME_CONDITIONING').length >= 3,
  'B.29 ≥3 surfaces usable as REGIME_CONDITIONING');
assert(getL10SurfacesUsableFor('SEQUENCE_CONDITIONING').length >= 3,
  'B.30 ≥3 surfaces usable as SEQUENCE_CONDITIONING');

// Dependency registry runtime — L6 (not posture-aware)
const accessOkL6 = requestL10DependencyAccess({
  surfaceId: 'l6:current_feature_state',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(accessOkL6.allowed, 'B.31 L6 current feature state usable as support evidence');

const accessUnregistered = requestL10DependencyAccess({
  surfaceId: 'fake:nope',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessUnregistered.allowed, 'B.32 unregistered surface denied');
assert(accessUnregistered.violationCode ===
  L10ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
  'B.33 UNREGISTERED_DEPENDENCY code');

const accessWrongUsage = requestL10DependencyAccess({
  surfaceId: 'l5:write_coordination',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessWrongUsage.allowed, 'B.34 wrong usage denied');
assert(accessWrongUsage.violationCode ===
  L10ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
  'B.35 ILLEGAL_DEPENDENCY_USAGE code');

// Restriction-aware enforcement (L7)
const accessL7NoPosture = requestL10DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessL7NoPosture.allowed, 'B.36 L7 access without posture denied');
assert(accessL7NoPosture.violationCode ===
  L10ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
  'B.37 RESTRICTION_POSTURE_IGNORED code');

const L10_FULL_POSTURE = {
  allowsSupportEvidence: true,
  allowsContradictionEvidence: true,
  allowsRankingInput: true,
  allowsConfidenceInput: true,
  allowsRegimeConditioning: true,
  allowsSequenceConditioning: true,
};

const accessL7WeakPosture = requestL10DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: {
    ...L10_FULL_POSTURE,
    allowsSupportEvidence: false,
  },
});
assert(!accessL7WeakPosture.allowed, 'B.38 L7 access with insufficient posture denied');
assert(accessL7WeakPosture.violationCode ===
  L10ConstitutionalViolationCode.RESTRICTION_BYPASS,
  'B.39 RESTRICTION_BYPASS code');

const accessL7FullPosture = requestL10DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SUPPORT_EVIDENCE',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: L10_FULL_POSTURE,
});
assert(accessL7FullPosture.allowed, 'B.40 L7 access with full posture allowed');

// Regime-posture enforcement (L8)
const accessL8NoRegime = requestL10DependencyAccess({
  surfaceId: 'l8:regime_state',
  requestedUsage: 'REGIME_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: L10_FULL_POSTURE,
});
assert(!accessL8NoRegime.allowed, 'B.41 L8 access without honouring regime posture denied');
assert(accessL8NoRegime.violationCode ===
  L10ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
  'B.42 REGIME_POSTURE_IGNORED code');

const accessL8WithRegime = requestL10DependencyAccess({
  surfaceId: 'l8:regime_state',
  requestedUsage: 'REGIME_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: L10_FULL_POSTURE,
  honoursRegimePosture: true,
});
assert(accessL8WithRegime.allowed, 'B.43 L8 access honouring regime posture allowed');

// Sequence-posture enforcement (L9)
const accessL9NoSequence = requestL10DependencyAccess({
  surfaceId: 'l9:sequence_assessment',
  requestedUsage: 'SEQUENCE_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: L10_FULL_POSTURE,
});
assert(!accessL9NoSequence.allowed, 'B.44 L9 access without honouring sequence posture denied');
assert(accessL9NoSequence.violationCode ===
  L10ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED,
  'B.45 SEQUENCE_POSTURE_IGNORED code');

const accessL9WithSequence = requestL10DependencyAccess({
  surfaceId: 'l9:sequence_assessment',
  requestedUsage: 'SEQUENCE_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: L10_FULL_POSTURE,
  honoursSequencePosture: true,
});
assert(accessL9WithSequence.allowed, 'B.46 L9 access honouring sequence posture allowed');

// assert throws
let threw = false;
try {
  assertL10DependencyAccess({
    surfaceId: 'fake:missing',
    requestedUsage: 'SUPPORT_EVIDENCE',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  threw = e instanceof L10ConstitutionalError;
}
assert(threw, 'B.47 assertL10DependencyAccess throws on unregistered');

// Posture-aware sets
const restrictionAware = getL10RestrictionAwareSurfaces();
assert(restrictionAware.length === 17, `B.48 17 restriction-aware surfaces (L7+L8+L9) (got ${restrictionAware.length})`);
assert(restrictionAware.every(s =>
  s.layer === L10DependencyLayer.L7 ||
  s.layer === L10DependencyLayer.L8 ||
  s.layer === L10DependencyLayer.L9),
  'B.49 only L7/L8/L9 surfaces are restriction-aware');

const regimeAware = getL10RegimePostureAwareSurfaces();
assert(regimeAware.length === 5, 'B.50 5 regime-posture-aware surfaces (all L8)');
assert(regimeAware.every(s => s.layer === L10DependencyLayer.L8),
  'B.51 only L8 surfaces are regime-posture-aware');

const sequenceAware = getL10SequencePostureAwareSurfaces();
assert(sequenceAware.length === 7, 'B.52 7 sequence-posture-aware surfaces (all L9)');
assert(sequenceAware.every(s => s.layer === L10DependencyLayer.L9),
  'B.53 only L9 surfaces are sequence-posture-aware');

assert(getAllL10RegisteredSurfaceIds().length === L10_DEPENDENCY_SURFACES.length,
  'B.54 getAllL10RegisteredSurfaceIds matches');

// Lower-layer redefinition spec — behaviour patterns
const goodBehaviour = validateL10LowerLayerInteraction({
  componentId: 'good',
  claimedBehaviors: [
    'consume l6 current feature state',
    'consume l7 validation assessment via stable handoff',
    'consume l8 regime state via stable handoff',
    'consume l9 sequence assessment via stable handoff',
    'persist hypothesis state via l5 write coordination',
  ],
});
assert(goodBehaviour.valid, 'B.55 legal L10 behaviours pass');

const badBehaviour = validateL10LowerLayerInteraction({
  componentId: 'bad',
  claimedBehaviors: [
    're-resolve identity for asset',
    're-validate claim inside hypothesis',
    'ignore contradiction bundle',
    'widen restriction for downstream',
    'bypass l7 restrictions',
    'reinterpret regime locally',
    'override regime from l8',
    'reinterpret sequence locally',
    'override sequence from l9',
    'drop ambiguity flag',
    'live from l6 revalidation',
    'from raw feed compute hypothesis',
    'direct postgres write for hypothesis',
    'consume scenario from l11',
    'causal certainty from temporal adjacency',
    'collapse alternatives into one story',
    'hide close spread between primary and secondary',
    'primary as final explanation',
  ],
});
assert(!badBehaviour.valid, 'B.56 illegal L10 behaviours blocked');
assert(badBehaviour.violations.length >= 14,
  `B.57 multiple illegal behaviours surface violations (got ${badBehaviour.violations.length})`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Capability and Prohibition Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Capability and Prohibition Law ═══');
resetAll();

assert(ALL_L10_ALLOWED_CAPABILITIES.length >= 15,
  `C.01 ≥15 allowed capabilities (got ${ALL_L10_ALLOWED_CAPABILITIES.length})`);
assert(ALL_L10_CAPABILITY_GROUPS.length === 6, 'C.02 6 capability groups');
assert(ALL_L10_FORBIDDEN_ACTIONS.length >= 25,
  `C.03 ≥25 forbidden actions (got ${ALL_L10_FORBIDDEN_ACTIONS.length})`);
assert(ALL_L10_CAPABILITY_CONTEXTS.length === 17,
  `C.04 17 capability contexts (got ${ALL_L10_CAPABILITY_CONTEXTS.length})`);

// Capability groups populated
for (const g of ALL_L10_CAPABILITY_GROUPS) {
  assert(getL10CapabilitiesForGroup(g).length >= 1, `C.group.${g} populated`);
}
assert(getAllL10CapabilityGroups().length === ALL_L10_CAPABILITY_GROUPS.length,
  'C.05 getAllL10CapabilityGroups covers all groups');

// Policy integrity
assert(L10_CAPABILITY_POLICY.length === ALL_L10_ALLOWED_CAPABILITIES.length,
  'C.06 policy covers all capabilities');
for (const entry of L10_CAPABILITY_POLICY) {
  for (const ctx of ALL_L10_CAPABILITY_CONTEXTS) {
    assert(entry.decisions[ctx] !== undefined,
      `C.matrix.${entry.capability}.${ctx}`);
  }
}
assert(getL10CapabilityPolicyCount() === ALL_L10_ALLOWED_CAPABILITIES.length,
  'C.07 policy count matches');
assert(getFullL10CapabilityMatrix().length ===
  ALL_L10_ALLOWED_CAPABILITIES.length * ALL_L10_CAPABILITY_CONTEXTS.length,
  'C.08 full matrix size');

// Specific capability rules
assert(getL10CapabilityDecision(
  L10AllowedCapability.CANDIDATE_GENERATION,
  'CANDIDATE_GENERATION_CTX',
) === 'ALLOWED',
  'C.09 CANDIDATE_GENERATION allowed in CANDIDATE_GENERATION_CTX');
assert(getL10CapabilityDecision(
  L10AllowedCapability.CANDIDATE_RANKING,
  'RANKING_CTX',
) === 'ALLOWED',
  'C.10 CANDIDATE_RANKING allowed in RANKING_CTX');
assert(getL10CapabilityDecision(
  L10AllowedCapability.SHIFT_CONDITION_DERIVATION,
  'SHIFT_CONDITION_CTX',
) === 'ALLOWED',
  'C.11 SHIFT_CONDITION_DERIVATION allowed in SHIFT_CONDITION_CTX');
assert(getL10CapabilityDecision(
  L10AllowedCapability.HYPOTHESIS_PERSISTENCE,
  'REPLAY_PATH',
) === 'DENIED',
  'C.12 HYPOTHESIS_PERSISTENCE denied in REPLAY_PATH');
assert(getL10CapabilityDecision(
  L10AllowedCapability.HYPOTHESIS_READ_SERVING,
  'REPAIR_PATH',
) === 'DENIED',
  'C.13 HYPOTHESIS_READ_SERVING denied in REPAIR_PATH');
assert(isL10CapabilityAllowed(
  L10AllowedCapability.HYPOTHESIS_CONFIDENCE_DERIVATION,
  'RANKING_CTX',
),
  'C.14 HYPOTHESIS_CONFIDENCE_DERIVATION allowed in RANKING_CTX');
assert(!isL10CapabilityAllowed(
  L10AllowedCapability.HYPOTHESIS_PERSISTENCE,
  'REPLAY_PATH',
),
  'C.15 HYPOTHESIS_PERSISTENCE not allowed in REPLAY_PATH');

// Capability claim evaluator
const okClaim = evaluateL10CapabilityClaim({
  capability: L10AllowedCapability.CANDIDATE_GENERATION,
  context: 'CANDIDATE_GENERATION_CTX',
  claimant: 'test',
});
assert(okClaim.allowed, 'C.16 ok claim allowed');

const badClaim = evaluateL10CapabilityClaim({
  capability: L10AllowedCapability.HYPOTHESIS_PERSISTENCE,
  context: 'REPLAY_PATH',
  claimant: 'test',
});
assert(!badClaim.allowed, 'C.17 bad claim denied');

let capThrew = false;
try {
  assertL10CapabilityClaim({
    capability: L10AllowedCapability.HYPOTHESIS_PERSISTENCE,
    context: 'REPLAY_PATH',
    claimant: 'test',
  });
} catch (e) {
  capThrew = e instanceof L10ConstitutionalError;
}
assert(capThrew, 'C.18 assertL10CapabilityClaim throws on denied');

// Denied list per context
const deniedInReplay = getL10DeniedCapabilities('REPLAY_PATH');
assert(deniedInReplay.includes(L10AllowedCapability.HYPOTHESIS_PERSISTENCE),
  'C.19 HYPOTHESIS_PERSISTENCE in replay denied list');

// Forbidden actions
assert(L10_FORBIDDEN_ACTION_DEFINITIONS.length === ALL_L10_FORBIDDEN_ACTIONS.length,
  'C.20 every forbidden action has a definition');
for (const action of ALL_L10_FORBIDDEN_ACTIONS) {
  const def = getL10ForbiddenActionDefinition(action);
  assert(def !== undefined && def.description.length > 0,
    `C.forbidden.${action}`);
}
assert(getAllL10CriticalForbiddenActions().length >= 20,
  `C.21 ≥20 critical forbidden actions (got ${getAllL10CriticalForbiddenActions().length})`);
assert(getL10RegisteredForbiddenActionCount() === L10_FORBIDDEN_ACTION_DEFINITIONS.length,
  'C.22 registered count matches');
assert(getL10CriticalForbiddenActionCount() ===
  getAllL10CriticalForbiddenActions().length,
  'C.23 critical count matches');

// Forbidden-action registry checks
const chkRec = checkForL10ForbiddenActions({
  proposedName: 'buy_signal_hypothesis',
  context: 'component',
});
assert(!chkRec.clean, 'C.24 buy_signal_hypothesis flagged');
assert(chkRec.violations.some(v => v.action ===
  L10ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK),
  'C.25 recommendation leak flagged');

const chkScen = checkForL10ForbiddenActions({
  proposedName: 'scenario_winner',
  context: 'component',
});
assert(!chkScen.clean, 'C.26 scenario_winner flagged');
assert(chkScen.violations.some(v => v.action === L10ForbiddenAction.FINAL_SCENARIO_LEAK),
  'C.27 scenario leak flagged');

const chkJudge = checkForL10ForbiddenActions({
  proposedName: 'best_explanation',
  context: 'component',
});
assert(!chkJudge.clean, 'C.28 best_explanation flagged');
assert(chkJudge.violations.some(v =>
  v.action === L10ForbiddenAction.CONVICTION_LANGUAGE_LEAK ||
  v.action === L10ForbiddenAction.FINAL_JUDGMENT_LEAK),
  'C.29 conviction/judgment leak flagged');

const chkConv = checkForL10ForbiddenActions({
  proposedName: 'highest_conviction_hypothesis',
  context: 'component',
});
assert(!chkConv.clean, 'C.30 highest_conviction_hypothesis flagged');
assert(chkConv.violations.some(v => v.action === L10ForbiddenAction.CONVICTION_LANGUAGE_LEAK),
  'C.31 conviction leak flagged');

const chkSingle = checkForL10ForbiddenActions({
  proposedName: 'single_story_explanation',
  context: 'component',
});
assert(!chkSingle.clean, 'C.32 single_story flagged');
assert(chkSingle.violations.some(v => v.action === L10ForbiddenAction.SINGLE_STORY_COLLAPSE),
  'C.33 single-story collapse flagged');

const chkCausal = checkForL10ForbiddenActions({
  proposedName: 'causal_certainty_hypothesis',
  context: 'component',
});
assert(!chkCausal.clean, 'C.34 causal_certainty flagged');
assert(chkCausal.violations.some(v => v.action === L10ForbiddenAction.CAUSAL_LAUNDERING),
  'C.35 causal laundering flagged');

const chkOverride = checkForL10ForbiddenActions({
  proposedName: 'validation_override_hypothesis',
  context: 'component',
});
assert(!chkOverride.clean, 'C.36 validation_override flagged');
assert(chkOverride.violations.some(v => v.action ===
  L10ForbiddenAction.L7_LIVE_REVALIDATION),
  'C.37 L7 revalidation flagged');

const chkClean = checkForL10ForbiddenActions({
  proposedName: 'hypothesis_candidate_narrative_driven',
  proposedDescription: 'constructs competing hypothesis candidates and alternatives',
  context: 'component',
});
assert(chkClean.clean, 'C.38 clean component passes forbidden-action check');

let fabThrew = false;
try {
  assertNoL10ForbiddenActions({
    proposedName: 'buy_signal',
    context: 'comp',
  });
} catch (e) {
  fabThrew = e instanceof L10ConstitutionalError;
}
assert(fabThrew, 'C.39 assertNoL10ForbiddenActions throws on violation');

// Name legality helper
assert(checkL10ComponentNameLegality('hypothesis_candidate_narrative_driven').legal,
  'C.40 legal name');
assert(!checkL10ComponentNameLegality('Best_Explanation').legal,
  'C.41 bad casing rejected');
assert(!checkL10ComponentNameLegality('buy_signal').legal,
  'C.42 forbidden semantics rejected');

// Competition handling
assert(validateL10CompetitionHandling({
  componentId: 'g',
  preservesAlternatives: true,
  emitsSpread: true,
  hidesCloseSpread: false,
  preservesEvidenceAsymmetry: true,
  emitsShiftConditions: true,
  collapsesToSingleStory: false,
  dropsPlausibleCompetitor: false,
}).valid, 'C.43 clean competition handling passes');

assert(!validateL10CompetitionHandling({
  componentId: 'b1',
  preservesAlternatives: false,
  emitsSpread: true,
  hidesCloseSpread: false,
  preservesEvidenceAsymmetry: true,
  emitsShiftConditions: true,
  collapsesToSingleStory: false,
  dropsPlausibleCompetitor: false,
}).valid, 'C.44 alternative suppression blocked');

assert(!validateL10CompetitionHandling({
  componentId: 'b2',
  preservesAlternatives: true,
  emitsSpread: true,
  hidesCloseSpread: false,
  preservesEvidenceAsymmetry: true,
  emitsShiftConditions: true,
  collapsesToSingleStory: true,
  dropsPlausibleCompetitor: false,
}).valid, 'C.45 single-story collapse blocked');

assert(!validateL10CompetitionHandling({
  componentId: 'b3',
  preservesAlternatives: true,
  emitsSpread: false,
  hidesCloseSpread: false,
  preservesEvidenceAsymmetry: true,
  emitsShiftConditions: true,
  collapsesToSingleStory: false,
  dropsPlausibleCompetitor: false,
}).valid, 'C.46 no spread blocked');

assert(!validateL10CompetitionHandling({
  componentId: 'b4',
  preservesAlternatives: true,
  emitsSpread: true,
  hidesCloseSpread: true,
  preservesEvidenceAsymmetry: true,
  emitsShiftConditions: true,
  collapsesToSingleStory: false,
  dropsPlausibleCompetitor: false,
}).valid, 'C.47 close-spread concealment blocked');

assert(!validateL10CompetitionHandling({
  componentId: 'b5',
  preservesAlternatives: true,
  emitsSpread: true,
  hidesCloseSpread: false,
  preservesEvidenceAsymmetry: false,
  emitsShiftConditions: true,
  collapsesToSingleStory: false,
  dropsPlausibleCompetitor: false,
}).valid, 'C.48 evidence-asymmetry concealment blocked');

// Primary posture
assert(validateL10PrimaryPosture({
  componentId: 'g',
  primaryLabelledAsFinal: false,
  stripsSpreadFields: false,
  stripsAlternativeFields: false,
}).valid, 'C.49 clean primary posture passes');
assert(!validateL10PrimaryPosture({
  componentId: 'b',
  primaryLabelledAsFinal: true,
  stripsSpreadFields: false,
  stripsAlternativeFields: false,
}).valid, 'C.50 primary-as-final blocked');
assert(!validateL10PrimaryPosture({
  componentId: 'b',
  primaryLabelledAsFinal: false,
  stripsSpreadFields: true,
  stripsAlternativeFields: false,
}).valid, 'C.51 spread-stripped blocked');
assert(!validateL10PrimaryPosture({
  componentId: 'b',
  primaryLabelledAsFinal: false,
  stripsSpreadFields: false,
  stripsAlternativeFields: true,
}).valid, 'C.52 alternative-stripped blocked');

// Causal-restraint handling
assert(validateL10CausalRestraint({
  componentId: 'g',
  declaresCausalRestraint: true,
  claimsCausalCertainty: false,
  usesAdjacencyAsCause: false,
  usesRegimeCompatibilityAsCause: false,
  usesLeadLagAsCause: false,
}).valid, 'C.53 clean causal restraint passes');
assert(!validateL10CausalRestraint({
  componentId: 'b1',
  declaresCausalRestraint: true,
  claimsCausalCertainty: true,
  usesAdjacencyAsCause: false,
  usesRegimeCompatibilityAsCause: false,
  usesLeadLagAsCause: false,
}).valid, 'C.54 causal certainty claim blocked');
assert(!validateL10CausalRestraint({
  componentId: 'b2',
  declaresCausalRestraint: false,
  claimsCausalCertainty: false,
  usesAdjacencyAsCause: false,
  usesRegimeCompatibilityAsCause: false,
  usesLeadLagAsCause: false,
}).valid, 'C.55 missing causal restraint blocked');
assert(!validateL10CausalRestraint({
  componentId: 'b3',
  declaresCausalRestraint: true,
  claimsCausalCertainty: false,
  usesAdjacencyAsCause: true,
  usesRegimeCompatibilityAsCause: false,
  usesLeadLagAsCause: false,
}).valid, 'C.56 adjacency-as-cause blocked');
assert(!validateL10CausalRestraint({
  componentId: 'b4',
  declaresCausalRestraint: true,
  claimsCausalCertainty: false,
  usesAdjacencyAsCause: false,
  usesRegimeCompatibilityAsCause: true,
  usesLeadLagAsCause: false,
}).valid, 'C.57 regime-compatibility-as-cause blocked');
assert(!validateL10CausalRestraint({
  componentId: 'b5',
  declaresCausalRestraint: true,
  claimsCausalCertainty: false,
  usesAdjacencyAsCause: false,
  usesRegimeCompatibilityAsCause: false,
  usesLeadLagAsCause: true,
}).valid, 'C.58 lead-lag-as-cause blocked');

// Restriction handling
assert(validateL10RestrictionHandling({
  componentId: 'g',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: false,
  honoursContradictionPosture: true,
  overwritesContradictionPosture: false,
}).valid, 'C.59 clean restriction handling passes');
assert(!validateL10RestrictionHandling({
  componentId: 'b1',
  consumesL7Output: true,
  declaresRestrictionPosture: false,
  widensDownstreamRights: false,
  honoursContradictionPosture: true,
  overwritesContradictionPosture: false,
}).valid, 'C.60 missing posture blocked');
assert(!validateL10RestrictionHandling({
  componentId: 'b2',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: true,
  honoursContradictionPosture: true,
  overwritesContradictionPosture: false,
}).valid, 'C.61 widening rights blocked');
assert(!validateL10RestrictionHandling({
  componentId: 'b3',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: false,
  honoursContradictionPosture: false,
  overwritesContradictionPosture: false,
}).valid, 'C.62 ignoring contradiction blocked');
assert(!validateL10RestrictionHandling({
  componentId: 'b4',
  consumesL7Output: true,
  declaresRestrictionPosture: true,
  widensDownstreamRights: false,
  honoursContradictionPosture: true,
  overwritesContradictionPosture: true,
}).valid, 'C.63 overwriting contradiction blocked');

// Regime handling
assert(validateL10RegimeHandling({
  componentId: 'g',
  consumesL8Output: true,
  honoursRegimePosture: true,
  reinterpretsRegime: false,
}).valid, 'C.64 clean regime handling passes');
assert(!validateL10RegimeHandling({
  componentId: 'b1',
  consumesL8Output: true,
  honoursRegimePosture: false,
  reinterpretsRegime: false,
}).valid, 'C.65 regime posture ignored blocked');
assert(!validateL10RegimeHandling({
  componentId: 'b2',
  consumesL8Output: true,
  honoursRegimePosture: true,
  reinterpretsRegime: true,
}).valid, 'C.66 regime reclassification blocked');

// Sequence handling
assert(validateL10SequenceHandling({
  componentId: 'g',
  consumesL9Output: true,
  honoursSequencePosture: true,
  reinterpretsSequence: false,
  dropsAmbiguityPosture: false,
  dropsCausalRestraintTag: false,
}).valid, 'C.67 clean sequence handling passes');
assert(!validateL10SequenceHandling({
  componentId: 'b1',
  consumesL9Output: true,
  honoursSequencePosture: false,
  reinterpretsSequence: false,
  dropsAmbiguityPosture: false,
  dropsCausalRestraintTag: false,
}).valid, 'C.68 sequence posture ignored blocked');
assert(!validateL10SequenceHandling({
  componentId: 'b2',
  consumesL9Output: true,
  honoursSequencePosture: true,
  reinterpretsSequence: true,
  dropsAmbiguityPosture: false,
  dropsCausalRestraintTag: false,
}).valid, 'C.69 sequence reinterpretation blocked');
assert(!validateL10SequenceHandling({
  componentId: 'b3',
  consumesL9Output: true,
  honoursSequencePosture: true,
  reinterpretsSequence: false,
  dropsAmbiguityPosture: true,
  dropsCausalRestraintTag: false,
}).valid, 'C.70 dropping ambiguity blocked');
assert(!validateL10SequenceHandling({
  componentId: 'b4',
  consumesL9Output: true,
  honoursSequencePosture: true,
  reinterpretsSequence: false,
  dropsAmbiguityPosture: false,
  dropsCausalRestraintTag: true,
}).valid, 'C.71 dropping causal-restraint blocked');

// Evidence-grounding
assert(validateL10EvidenceGrounding({
  componentId: 'g',
  usesEvidenceOnlySurface: true,
  treatsEvidenceAsDecisive: false,
  hasNonEvidencePrimarySupport: true,
  invventsFromRawData: false,
}).valid, 'C.72 evidence used with primary support passes');
assert(!validateL10EvidenceGrounding({
  componentId: 'b1',
  usesEvidenceOnlySurface: true,
  treatsEvidenceAsDecisive: true,
  hasNonEvidencePrimarySupport: true,
  invventsFromRawData: false,
}).valid, 'C.73 evidence-only as decisive blocked');
assert(!validateL10EvidenceGrounding({
  componentId: 'b2',
  usesEvidenceOnlySurface: true,
  treatsEvidenceAsDecisive: false,
  hasNonEvidencePrimarySupport: false,
  invventsFromRawData: false,
}).valid, 'C.74 evidence-only without primary support blocked');
assert(!validateL10EvidenceGrounding({
  componentId: 'b3',
  usesEvidenceOnlySurface: false,
  treatsEvidenceAsDecisive: false,
  hasNonEvidencePrimarySupport: true,
  invventsFromRawData: true,
}).valid, 'C.75 raw-data invention blocked');

// ═══════════════════════════════════════════════════════════════
// BAND D — Output Boundary Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Output Boundary Law ═══');
resetAll();

assert(ALL_L10_OUTPUT_SURFACE_CLASSES.length === 5, 'D.01 5 output classes');
assert(L10_OUTPUT_SURFACES.length === 5, 'D.02 5 output surfaces');

for (const cls of ALL_L10_OUTPUT_SURFACE_CLASSES) {
  assert(isL10RegisteredOutputClass(cls), `D.cls.${cls}`);
  assert(isL10LegalOutputClass(cls), `D.legal.${cls}`);
}

for (const s of L10_OUTPUT_SURFACES) {
  assert(isL10RegisteredOutput(s.surfaceId), `D.reg.${s.surfaceId}`);
  assert(s.replayRequired, `D.replay.${s.surfaceId}`);
  assert(s.lineageRequired, `D.lineage.${s.surfaceId}`);
  assert(s.requiredLineageFields.length >= 3, `D.lineage_fields.${s.surfaceId}`);
  assert(s.l5StorageRoute.length > 0, `D.route.${s.surfaceId}`);
  assert(s.allowedDownstreamConsumers.length >= 1, `D.consumers.${s.surfaceId}`);
  assert(s.evidenceBound, `D.evidence.${s.surfaceId}`);
}

// Output classes map cleanly
for (const cls of ALL_L10_OUTPUT_SURFACE_CLASSES) {
  const surfaces = L10_OUTPUT_SURFACES.filter(s => s.outputClass === cls);
  assert(surfaces.length === 1, `D.class-surface-1to1.${cls}`);
}

// getL10OutputSurface
assert(getL10OutputSurface('l10:hypothesis_assessment') !== undefined,
  'D.03 hypothesis_assessment surface retrievable');
assert(getL10OutputSurface('fake:missing') === undefined, 'D.04 fake surface undefined');

// Lineage aggregation
const allLineage = getAllL10RequiredLineageFields();
assert(allLineage.includes('trace_id'), 'D.05 trace_id in lineage');
assert(allLineage.includes('manifest_id'), 'D.06 manifest_id in lineage');
assert(allLineage.includes('hypothesis_subject_id'), 'D.07 hypothesis_subject_id in lineage');

// Forbidden output classes
const forbiddenOut = [
  'FINAL_SCENARIO_WINNER', 'FINAL_EXPLANATION_WINNER', 'FINAL_EXPLANATION_NARRATIVE',
  'FINAL_SCORE', 'FINAL_JUDGMENT', 'TRADE_RECOMMENDATION',
  'BUY_SIGNAL', 'SELL_SIGNAL', 'AVOID_SIGNAL',
  'CONVICTION_RANKING', 'HIGHEST_CONVICTION_EXPLANATION', 'BEST_OPPORTUNITY',
  'BEST_EXPLANATION', 'WINNING_EXPLANATION', 'WINNING_THESIS',
  'PROVEN_CAUSE', 'CAUSAL_CERTAINTY', 'ALPHA_EXPLANATION',
  'ACTIONABLE_EXPLANATION', 'CLEAR_BUY_EXPLANATION', 'IDEAL_EXPLANATION',
];
for (const cls of forbiddenOut) {
  assert(isL10ForbiddenOutputClass(cls), `D.forbidden.${cls}`);
  assert(!isL10LegalOutputClass(cls), `D.illegal.${cls}`);
  assert(!validateL10OutputClassName(cls).valid,
    `D.validateOutputClassName.${cls}`);
}

// Forbidden output classes trigger correct semantic codes
const scSem = validateL10OutputSemantics('FINAL_SCENARIO_WINNER');
assert(!scSem.valid && scSem.violations.some(v =>
  v.code === L10ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS),
  'D.08 scenario semantics code');
const caSem = validateL10OutputSemantics('CAUSAL_CERTAINTY');
assert(!caSem.valid && caSem.violations.some(v =>
  v.code === L10ConstitutionalViolationCode.CAUSAL_LAUNDERING),
  'D.09 causal certainty triggers causal-laundering code');
const convSem = validateL10OutputSemantics('HIGHEST_CONVICTION_EXPLANATION');
assert(!convSem.valid && convSem.violations.some(v =>
  v.code === L10ConstitutionalViolationCode.FORBIDDEN_CONVICTION_SEMANTICS),
  'D.10 conviction semantics code');
const recSem = validateL10OutputSemantics('BUY_SIGNAL');
assert(!recSem.valid && recSem.violations.some(v =>
  v.code === L10ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS),
  'D.11 recommendation semantics code');
const scoreSem = validateL10OutputSemantics('FINAL_SCORE');
assert(!scoreSem.valid && scoreSem.violations.some(v =>
  v.code === L10ConstitutionalViolationCode.FORBIDDEN_SCORE_SEMANTICS),
  'D.12 score semantics code');
const finalExpSem = validateL10OutputSemantics('FINAL_EXPLANATION_NARRATIVE');
assert(!finalExpSem.valid && finalExpSem.violations.some(v =>
  v.code === L10ConstitutionalViolationCode.FORBIDDEN_FINAL_EXPLANATION_SEMANTICS),
  'D.13 final-explanation semantics code');

// Output emission validator
const emitOk = validateL10OutputEmission({
  surfaceId: 'l10:hypothesis_assessment',
  outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
  lineageFields: {
    hypothesis_subject_id: 'hyp-1',
    assessed_at: new Date().toISOString(),
    trace_id: 'trace-1',
    manifest_id: 'm-1',
  },
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(emitOk.allowed, 'D.14 full-lineage hypothesis_assessment emission allowed');

const emitMissing = validateL10OutputEmission({
  surfaceId: 'l10:hypothesis_assessment',
  outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
  lineageFields: {
    hypothesis_subject_id: 'hyp-1',
    trace_id: 'trace-1',
  },
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(!emitMissing.allowed, 'D.15 missing lineage blocked');
assert(emitMissing.missingLineage.length >= 2, 'D.16 multiple missing lineage fields');
assert(emitMissing.violationCode === L10ConstitutionalViolationCode.MISSING_LINEAGE,
  'D.17 MISSING_LINEAGE code');

const emitUnreg = validateL10OutputEmission({
  surfaceId: 'fake:unreg',
  outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
  lineageFields: {},
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(!emitUnreg.allowed, 'D.18 unregistered surface blocked');
assert(emitUnreg.violationCode === L10ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
  'D.19 UNREGISTERED_OUTPUT code');

let emitThrew = false;
try {
  assertL10OutputEmission({
    surfaceId: 'fake:nope',
    outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
    lineageFields: {},
    emitter: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  emitThrew = e instanceof L10ConstitutionalError;
}
assert(emitThrew, 'D.20 assertL10OutputEmission throws');

// Downstream consumer validator
const consumerOk = validateL10DownstreamConsumer(
  'l10:hypothesis_assessment',
  'L11',
);
assert(consumerOk.valid, 'D.21 L11 allowed for hypothesis_assessment');

const consumerBad = validateL10DownstreamConsumer(
  'l10:hypothesis_assessment',
  'RANDOM_LAYER',
);
assert(!consumerBad.valid, 'D.22 unknown consumer denied');

assert(getL10AllowedConsumersForOutput('l10:hypothesis_assessment').includes('L11'),
  'D.23 hypothesis_assessment consumable by L11');
assert(getAllL10RegisteredOutputIds().length === L10_OUTPUT_SURFACES.length,
  'D.24 getAllL10RegisteredOutputIds matches');

// Full-component validator
const compOk = validateL10Component({
  name: 'hypothesis_candidate_narrative_driven',
  subjectClass: L10SubjectClass.HYPOTHESIS_CANDIDATE,
  outputSurfaceId: 'l10:hypothesis_assessment',
  outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
  dependencySurfaceIds: ['l6:feature_history', 'l6:event_history'],
  dependencyUsage: 'SUPPORT_EVIDENCE',
  description: 'constructs competing hypothesis candidates and alternative explanations',
});
assert(compOk.valid, 'D.25 clean L10 component passes validator');

const compBadName = validateL10Component({
  name: 'buy_signal_hypothesis',
  subjectClass: L10SubjectClass.HYPOTHESIS_CANDIDATE,
  outputSurfaceId: 'l10:hypothesis_assessment',
  outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
  dependencySurfaceIds: ['l6:feature_history'],
  dependencyUsage: 'SUPPORT_EVIDENCE',
  description: 'constructs competing hypothesis candidates and alternatives',
});
assert(!compBadName.valid, 'D.26 forbidden name blocked');
assert(compBadName.violations.some(v =>
  v.code === L10ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS),
  'D.27 FORBIDDEN_JUDGMENT_SEMANTICS reported');

const compBadDep = validateL10Component({
  name: 'hypothesis_ranking_with_spread',
  subjectClass: L10SubjectClass.HYPOTHESIS_RANKING,
  outputSurfaceId: 'l10:hypothesis_ranking',
  outputClass: L10OutputSurfaceClass.HYPOTHESIS_RANKING,
  dependencySurfaceIds: ['fake:unregistered'],
  dependencyUsage: 'RANKING_INPUT',
  description: 'ranks competing hypothesis candidates with explicit spread',
});
assert(!compBadDep.valid, 'D.28 unregistered dep blocked');
assert(compBadDep.violations.some(v =>
  v.code === L10ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY),
  'D.29 UNREGISTERED_DEPENDENCY reported');

const compBadDesc = validateL10Component({
  name: 'hypothesis_candidate_narrative',
  subjectClass: L10SubjectClass.HYPOTHESIS_CANDIDATE,
  outputSurfaceId: 'l10:hypothesis_assessment',
  outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
  dependencySurfaceIds: ['l6:feature_history'],
  dependencyUsage: 'SUPPORT_EVIDENCE',
  description: 'emits a buy signal when hypothesis confirms bullish thesis',
});
assert(!compBadDesc.valid, 'D.30 forbidden description blocked');

const compNonMission = validateL10Component({
  name: 'arbitrary_engine_a1',
  subjectClass: L10SubjectClass.HYPOTHESIS_CANDIDATE,
  outputSurfaceId: 'l10:hypothesis_assessment',
  outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
  dependencySurfaceIds: ['l6:feature_history'],
  dependencyUsage: 'SUPPORT_EVIDENCE',
  description: 'does something vaguely related to the data layer',
});
assert(!compNonMission.valid, 'D.31 non-hypothesis mission description blocked');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

// Audit emission — all typed emitters
emitL10DependencyViolation('fake:x', 'src', 'reason');
emitL10OutputViolation('fake:y', 'src', 'reason');
emitL10NamingViolation('buy_signal', 'src');
emitL10SingleStoryCollapseViolation('c', 'src');
emitL10AlternativeSuppressionViolation('c', 'src', 'dropped competitor');
emitL10CloseSpreadConcealmentViolation('c', 'src');
emitL10ConfirmationGapConcealmentViolation('c', 'src');
emitL10InvalidationPostureConcealmentViolation('c', 'src');
emitL10ExplanationLaunderingViolation('c', 'src', 'weak support boosted');
emitL10CausalLaunderingViolation('c', 'src', 'adjacency promoted');
emitL10PrimaryAsFinalTruthViolation('c', 'src', 'primary as final');
emitL10ContradictionOverwriteViolation('c', 'src');
emitL10RestrictionBypassViolation('c', 'src', 'widened');
emitL10RegimePostureIgnoredViolation('c', 'src');
emitL10RegimeReclassificationViolation('c', 'src');
emitL10SequencePostureIgnoredViolation('c', 'src');
emitL10SequenceReinterpretationViolation('c', 'src');
emitL10L7LiveRevalidationViolation('c', 'src');
emitL10RawDataInventionViolation('c', 'src', 'raw feed');
emitL10StorageBypassViolation('src', 'direct postgres');
emitL10MissingLineageViolation('l10:hypothesis_assessment', 'src', ['trace_id']);
emitL10LowerLayerRedefinitionViolation('src', 'identity redefined');
emitL10ValidationRedefinitionViolation('src', 'L7 truth overridden');
emitL10EvidenceAsymmetryConcealmentViolation('c', 'src');
emitL10LateLayerConsumptionViolation('c', 'src', 'consumed L11 surface');

const all = getL10ConstitutionalAuditLog();
assert(all.length === 25, `E.01 25 audit records (got ${all.length})`);
assert(getL10ViolationCount() === 25, 'E.02 getL10ViolationCount matches');
assert(hasAnyL10Violations(), 'E.03 hasAnyL10Violations true');

// Critical count
const crits = getL10CriticalViolations();
assert(crits.length >= 20, `E.04 ≥20 critical violations (got ${crits.length})`);

// Query by code
assert(getL10ViolationsByCode(
  L10ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY).length === 1,
  'E.05 UNREGISTERED_DEPENDENCY queryable');
assert(getL10ViolationsByCode(
  L10ConstitutionalViolationCode.SINGLE_STORY_COLLAPSE).length === 1,
  'E.06 SINGLE_STORY_COLLAPSE queryable');
assert(getL10ViolationsByCode(
  L10ConstitutionalViolationCode.CAUSAL_LAUNDERING).length === 1,
  'E.07 CAUSAL_LAUNDERING queryable');
assert(getL10ViolationsByCode(
  L10ConstitutionalViolationCode.PRIMARY_AS_FINAL_TRUTH).length === 1,
  'E.08 PRIMARY_AS_FINAL_TRUTH queryable');
assert(getL10ViolationsByCode(
  L10ConstitutionalViolationCode.REGIME_POSTURE_IGNORED).length === 1,
  'E.09 REGIME_POSTURE_IGNORED queryable');
assert(getL10ViolationsByCode(
  L10ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED).length === 1,
  'E.10 SEQUENCE_POSTURE_IGNORED queryable');
assert(getL10ViolationsByCode(
  L10ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION).length === 1,
  'E.11 LATE_LAYER_CONSUMPTION queryable');
assert(getL10ViolationsByCode(
  L10ConstitutionalViolationCode.EVIDENCE_ASYMMETRY_CONCEALMENT).length === 1,
  'E.12 EVIDENCE_ASYMMETRY_CONCEALMENT queryable');

// Custom audit record
const custom = emitL10AuditRecord({
  violationCode: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
  source: 'custom',
  detail: 'fabricated causality',
  context: { componentId: 'x' },
  severity: 'CRITICAL',
});
assert(custom.timestamp.length > 0, 'E.13 audit record has timestamp');
assert(custom.violationCode === L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
  'E.14 audit code preserved');
assert(getL10ConstitutionalAuditLog().length === 26, 'E.15 custom appended');

// Reset
resetAll();
assert(getL10ConstitutionalAuditLog().length === 0, 'E.16 audit log cleared');
assert(!hasAnyL10Violations(), 'E.17 hasAnyL10Violations false after reset');

// Invariants INV-10.1-A .. H
const inv = checkAllL101Invariants();
assert(inv.length === 8, 'E.18 8 L10.1 invariants');
assert(inv.every(r => r.holds), `E.19 all invariants hold: ${
  inv.filter(r => !r.holds).map(r => `${r.id}=${r.evidence}`).join('; ')}`);

const invA = checkINV_101_A(); assert(invA.holds, `E.A ${invA.evidence}`);
const invB = checkINV_101_B(); assert(invB.holds, `E.B ${invB.evidence}`);
const invC = checkINV_101_C(); assert(invC.holds, `E.C ${invC.evidence}`);
const invD = checkINV_101_D(); assert(invD.holds, `E.D ${invD.evidence}`);
const invE = checkINV_101_E(); assert(invE.holds, `E.E ${invE.evidence}`);
const invF = checkINV_101_F(); assert(invF.holds, `E.F ${invF.evidence}`);
const invG = checkINV_101_G(); assert(invG.holds, `E.G ${invG.evidence}`);
const invH = checkINV_101_H(); assert(invH.holds, `E.H ${invH.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L10.1 CONSTITUTION — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 10 constitutional boundary green.');
  process.exit(0);
}
