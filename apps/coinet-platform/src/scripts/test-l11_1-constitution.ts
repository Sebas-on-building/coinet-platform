/**
 * L11.1 — Constitutional Position, Mission, and Boundary
 * Certification Test Suite (§11.1.18)
 *
 * 5 Bands:
 *   A — Mission and boundary legality (§11.1.18.1)
 *   B — Dependency law: L3–L10 stable handoff, posture awareness (§11.1.18.2)
 *   C — Score meaning law (§11.1.18.3)
 *   D — Output and capability law (§11.1.18.4)
 *   E — Audit and invariants INV-11.1-A..H (§11.1.18.5)
 */

import {
  ALL_L11_ALLOWED_CAPABILITIES,
  ALL_L11_CAPABILITY_CONTEXTS,
  ALL_L11_CAPABILITY_GROUPS,
  ALL_L11_DEPENDENCY_LAYERS,
  ALL_L11_DEPENDENCY_SURFACE_CLASSES,
  ALL_L11_FORBIDDEN_ACTIONS,
  ALL_L11_OUTPUT_SURFACE_CLASSES,
  ALL_L11_SCORE_DIRECTION_CLASSES,
  ALL_L11_SCORE_MEANING_CLAIM_CLASSES,
  ALL_L11_SCORE_RESTRICTION_FLAGS,
  ALL_L11_SUBJECT_CLASSES,
  ALL_L11_VIOLATION_CODES,
  L11_CAPABILITY_POLICY,
  L11_DEFAULT_MEANING_CLAIM_CATALOGUE,
  L11_DEPENDENCY_SURFACES,
  L11_DOES_NOT_ANSWER,
  L11_FORBIDDEN_ACTION_DEFINITIONS,
  L11_IS_NOT,
  L11_MISSION,
  L11_MISSION_CONSTRAINT,
  L11_OUTPUT_SURFACES,
  L11AllowedCapability,
  L11CapabilityGroup,
  L11ConstitutionalError,
  L11ConstitutionalViolationCode,
  L11DependencyLayer,
  L11ForbiddenAction,
  L11OutputSurfaceClass,
  L11ScoreDirectionClass,
  L11ScoreMeaningClaimClass,
  L11ScoreRestrictionFlag,
  L11SubjectClass,
  checkL11ForbiddenSemantics,
  containsL11ForbiddenNaming,
  detectL11DirectionMixing,
  getAllL11CriticalForbiddenActions,
  getL11AllowedConsumersForOutput,
  getAllL11RequiredLineageFields,
  getL11CapabilityDecision,
  getL11CapabilitiesForGroup,
  getL11DefaultDirectionForClass,
  getL11DefaultMeaningClaimForClass,
  getL11DefaultRestrictionProfile,
  getL11DependencySurface,
  getL11ForbiddenActionDefinition,
  getL11ForbiddenNamePatterns,
  getL11HypothesisPostureAwareSurfaces,
  getL11OutputSurface,
  getL11OutputsRequiringAttribution,
  getL11OutputsRequiringDirection,
  getL11OutputsRequiringLineage,
  getL11OutputsRequiringMeaningClaim,
  getL11OutputsRequiringReplay,
  getL11RegimePostureAwareSurfaces,
  getL11RequiredDependencySurfaces,
  getL11RestrictionAwareSurfaces,
  getL11SequencePostureAwareSurfaces,
  getL11SurfacesForLayer,
  getL11SurfacesUsableFor,
  getL11ValidNameExamples,
  isL11AllowedDownstreamConsumer,
  isL11ForbiddenOutputClass,
  isL11LegalOutputClass,
  isL11RegisteredDependency,
  isL11RegisteredOutput,
  isL11RegisteredOutputClass,
  isL11UsableFor,
  isValidL11ComponentName,
  isValidL11DirectionDeclaration,
  isValidL11MeaningClaim,
  isValidL11RestrictionProfile,
  matchesL11Mission,
} from '../l11/contracts';

import {
  assertL11CapabilityClaim,
  assertL11DependencyAccess,
  assertL11OutputEmission,
  assertNoL11ForbiddenActions,
  checkForL11ForbiddenActions,
  checkL11ComponentNameLegality,
  emitL11AttributionAbsentViolation,
  emitL11AuditRecord,
  emitL11CalibrationHookAbsentViolation,
  emitL11ContradictionLaunderingViolation,
  emitL11DependencyViolation,
  emitL11DirectionMixedViolation,
  emitL11DirectionUndeclaredViolation,
  emitL11DriftHookAbsentViolation,
  emitL11GraphRedefinitionViolation,
  emitL11HypothesisPostureIgnoredViolation,
  emitL11HypothesisRelianceIgnoredViolation,
  emitL11HypothesisSpreadIgnoredViolation,
  emitL11IdentityRedefinitionViolation,
  emitL11L10HypothesisRebuildViolation,
  emitL11L7LiveRevalidationViolation,
  emitL11LateLayerConsumptionViolation,
  emitL11LowerLayerRebuildViolation,
  emitL11MeaningClaimAbsentViolation,
  emitL11MetricRedefinitionViolation,
  emitL11MissingDataLaunderingViolation,
  emitL11MissingLineageViolation,
  emitL11NamingViolation,
  emitL11OutputViolation,
  emitL11PrimitiveRedefinitionViolation,
  emitL11RegimeOverrideViolation,
  emitL11RegimePostureIgnoredViolation,
  emitL11RestrictionBypassViolation,
  emitL11RestrictionPostureIgnoredViolation,
  emitL11ScoreAsActionViolation,
  emitL11SequenceOverrideViolation,
  emitL11SequencePostureIgnoredViolation,
  emitL11StorageBypassViolation,
  emitL11VersionAbsentViolation,
  emitL11VibeScoreViolation,
  evaluateL11CapabilityClaim,
  getAllL11RegisteredOutputIds,
  getAllL11RegisteredSurfaceIds,
  getFullL11CapabilityMatrix,
  getL11CapabilityPolicyCount,
  getL11ConstitutionalAuditLog,
  getL11CriticalForbiddenActionCount,
  getL11CriticalViolations,
  getL11RegisteredForbiddenActionCount,
  getL11ViolationCount,
  getL11ViolationsByCode,
  hasAnyL11Violations,
  requestL11DependencyAccess,
  resetL11ConstitutionalAuditLog,
  validateL11AttributionRequirement,
  validateL11CalibrationRequirement,
  validateL11Component,
  validateL11ContradictionHandling,
  validateL11DownstreamConsumer,
  validateL11JudgmentLeakage,
  validateL11LowerLayerInteraction,
  validateL11MissingDataHandling,
  validateL11OutputClassName,
  validateL11OutputEmission,
  validateL11OutputSemantics,
  validateL11RecommendationLeakage,
  validateL11ScenarioLeakage,
  validateL11ScoreDirection,
  validateL11ScoreMeaning,
  validateL11ScoreRestrictionProfile,
} from '../l11/constitution';

import {
  checkAllL111Invariants,
  checkINV_111_A,
  checkINV_111_B,
  checkINV_111_C,
  checkINV_111_D,
  checkINV_111_E,
  checkINV_111_F,
  checkINV_111_G,
  checkINV_111_H,
} from '../l11/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetL11ConstitutionalAuditLog();
}

const FULL_RESTRICTION_POSTURE = {
  allowsSupportInput: true,
  allowsConfidenceInput: true,
  allowsRegimeConditioning: true,
  allowsSequenceConditioning: true,
  allowsHypothesisConditioning: true,
  allowsRankingInput: true,
  allowsAttributionInput: true,
  allowsCalibrationInput: true,
};

// ═══════════════════════════════════════════════════════════════
// BAND A — Mission and Boundary Legality (§11.1.18.1)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Mission and Boundary Legality ═══');
resetAll();

assert(L11_MISSION.name === 'Layer 11 — Deterministic Scoring Engine',
  'A.01 Mission name');
assert(L11_MISSION.canonical.includes('Deterministic Scoring Engine'),
  'A.02 Mission references Deterministic Scoring Engine');
assert(L11_MISSION.canonical.includes('L3–L10'),
  'A.03 Mission references L3–L10 governed truth');
assert(L11_MISSION.canonical.includes('attributable'),
  'A.04 Mission requires attribution');
assert(L11_MISSION.canonical.includes('versioned'),
  'A.05 Mission requires versioning');
assert(L11_MISSION.canonical.includes('meaning'),
  'A.06 Mission requires meaning');
assert(L11_MISSION.canonical.includes('calibration hook'),
  'A.07 Mission requires calibration hook');
assert(L11_MISSION.canonical.includes('without inventing new truth'),
  'A.08 Mission rejects inventing new truth');
assert(L11_MISSION.canonical.includes('final judgment'),
  'A.09 Mission rejects final judgment');
assert(L11_MISSION.canonical.includes('recommendation'),
  'A.10 Mission rejects recommendation');
assert(L11_MISSION.compression.includes('meaning-claim scores'),
  'A.11 Mission compression mentions meaning-claim scores');
assert(L11_MISSION.firstPrinciple.includes('governed meaning claim'),
  'A.12 First principle: governed meaning claim');
assert(L11_MISSION.firstPrinciple.includes('not a number with vibes'),
  'A.13 First principle: not a vibe-number');
assert(L11_MISSION.scoreConstructionBoundary.length >= 10,
  `A.14 ≥10 score-construction boundary items (got ${L11_MISSION.scoreConstructionBoundary.length})`);
assert(L11_MISSION.offLimits.length >= 18,
  `A.15 ≥18 off-limits items (got ${L11_MISSION.offLimits.length})`);

const offLimits = L11_MISSION.offLimits as readonly string[];
for (const phrase of [
  'final judgment emission',
  'final recommendation emission',
  'scenario winner selection',
  'trade action emission',
  'vibe score creation',
  'unattributed score emission',
  'unversioned score emission',
  'meaning claim absence',
  'direction undeclared',
  'direction mixing',
  'missing data laundering',
  'contradiction laundering',
  'lower-layer rebuild',
  'L10 hypothesis rebuild',
  'regime override',
  'sequence override',
  'L7 live revalidation',
  'persistence bypass',
  'late-layer (L12+) consumption',
  'restriction bypass',
  'calibration hook absence',
  'score as action',
]) {
  assert(offLimits.includes(phrase), `A.off.${phrase}`);
}

// Subject classes
assert(ALL_L11_SUBJECT_CLASSES.length === 7, 'A.16 7 subject classes');
for (const sc of [
  L11SubjectClass.SCORE_SUBJECT,
  L11SubjectClass.SCORE_FAMILY_SUBJECT,
  L11SubjectClass.SCORE_FORMULA_SUBJECT,
  L11SubjectClass.SCORE_COMPONENT_SUBJECT,
  L11SubjectClass.SCORE_ATTRIBUTION_SUBJECT,
  L11SubjectClass.SCORE_CALIBRATION_SUBJECT,
  L11SubjectClass.SCORE_DRIFT_SUBJECT,
]) {
  assert(ALL_L11_SUBJECT_CLASSES.includes(sc), `A.subject.${sc}`);
}

// Frozen dependencies — L3..L10
assert(L11_MISSION.frozenDependencies.length === 8,
  'A.17 8 frozen dependencies (L3–L10)');
for (const layer of [
  L11DependencyLayer.L3, L11DependencyLayer.L4, L11DependencyLayer.L5,
  L11DependencyLayer.L6, L11DependencyLayer.L7, L11DependencyLayer.L8,
  L11DependencyLayer.L9, L11DependencyLayer.L10,
]) {
  assert(L11_MISSION.frozenDependencies.includes(layer), `A.dep.${layer}`);
}

// Negative definition (§11.1.5)
assert(L11_IS_NOT.length >= 8, 'A.18 L11_IS_NOT declared');
for (const phrase of [
  'the validation layer',
  'the contradiction engine',
  'the regime engine',
  'the sequence engine',
  'the hypothesis engine',
  'the scenario engine',
  'the final judgment layer',
  'the recommendation layer',
  'the portfolio allocation layer',
  'the trade execution layer',
]) {
  assert((L11_IS_NOT as readonly string[]).includes(phrase),
    `A.is_not.${phrase}`);
}
assert(L11_DOES_NOT_ANSWER.length >= 6, 'A.19 L11_DOES_NOT_ANSWER declared');
for (const phrase of [
  'what trade should be taken',
  'which scenario wins',
  'what final judgment should be emitted',
  'whether the user should buy, sell, hold, or avoid',
]) {
  assert((L11_DOES_NOT_ANSWER as readonly string[]).includes(phrase),
    `A.does_not_answer.${phrase}`);
}

// Mission matcher — positive
assert(matchesL11Mission(
  'computes deterministic opportunity score with explicit meaning claim'),
  'A.20 score description matches mission');
assert(matchesL11Mission(
  'attaches calibration hook to a thesis coherence score'),
  'A.21 calibration description matches mission');
assert(matchesL11Mission(
  'declares score direction and component breakdown for risk score'),
  'A.22 direction/breakdown description matches mission');
assert(matchesL11Mission(
  'attaches score attribution surface for governed quantitative interpretation'),
  'A.23 attribution description matches mission');
assert(matchesL11Mission(
  'monitors score drift against governed L7 confidence assessments'),
  'A.24 drift description matches mission');

// Mission matcher — negative
assert(!matchesL11Mission(
  'emits a final recommendation when opportunity score is high'),
  'A.25 recommendation description rejected');
assert(!matchesL11Mission(
  'selects the winning scenario based on score magnitude'),
  'A.26 winning scenario description rejected');
assert(!matchesL11Mission(
  'emits a buy signal because the score crossed threshold'),
  'A.27 buy signal description rejected');
assert(!matchesL11Mission(
  'rebuild hypothesis from raw l6 inputs inside score formula'),
  'A.28 hypothesis rebuild description rejected');
assert(!matchesL11Mission(
  'override regime classification to lift score above threshold'),
  'A.29 regime override description rejected');
assert(!matchesL11Mission(
  'launder missing data into a clean opportunity score'),
  'A.30 missing-data laundering description rejected');
assert(!matchesL11Mission(
  'launder contradiction into a clean signal trustworthiness score'),
  'A.31 contradiction laundering description rejected');
assert(!matchesL11Mission(
  'declare a vibe score for general thesis quality'),
  'A.32 vibe score description rejected');

// Component naming legality — positive
for (const n of getL11ValidNameExamples()) {
  assert(isValidL11ComponentName(n), `A.valid_name.${n}`);
}

// Component naming legality — negative
for (const n of [
  'buy_signal',
  'sell_signal',
  'avoid_signal',
  'trade_signal',
  'recommendation_engine',
  'final_judgment_score',
  'scenario_winner',
  'final_scenario',
  'winning_thesis',
  'best_trade',
  'best_opportunity',
  'clear_buy_score',
  'clear_sell_score',
  'trade_ready_score',
  'entry_ready_score',
  'guaranteed_setup',
  'safest_trade',
  'highest_conviction',
  'conviction_signal',
  'conviction_score',
  'actionable_score',
  'actionable_setup',
  'alpha_score',
  'alpha_signal',
  'ideal_setup',
  'vibe_score',
  'unattributed_score',
  'unversioned_score',
  'rebuild_hypothesis',
  'override_regime',
  'override_sequence',
  'launder_missing_data',
  'launder_contradiction',
  'hide_contradiction',
  'hide_missing_data',
  'score_as_action',
  'score_says_buy',
  'score_says_sell',
  'score_override',
  'CamelCaseScore',
  '',
]) {
  assert(!isValidL11ComponentName(n), `A.invalid_name.${n || '<empty>'}`);
}

// Forbidden semantic check
const semBuy = checkL11ForbiddenSemantics('buy_signal');
assert(semBuy.forbidden && semBuy.matchedPattern !== null,
  'A.33 checkL11ForbiddenSemantics positive');
const semClean = checkL11ForbiddenSemantics('opportunity_score_v1');
assert(!semClean.forbidden && semClean.matchedPattern === null,
  'A.34 checkL11ForbiddenSemantics negative');

// Forbidden name patterns ≥40
assert(getL11ForbiddenNamePatterns().length >= 40,
  `A.35 ≥40 forbidden name patterns (got ${getL11ForbiddenNamePatterns().length})`);

// Violation-code enum sanity
assert(ALL_L11_VIOLATION_CODES.length >= 30,
  `A.36 ≥30 violation codes (got ${ALL_L11_VIOLATION_CODES.length})`);
for (const code of [
  L11ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
  L11ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
  L11ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
  L11ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
  L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
  L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
  L11ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS,
  L11ConstitutionalViolationCode.FORBIDDEN_TRADE_ACTION_SEMANTICS,
  L11ConstitutionalViolationCode.FORBIDDEN_VIBE_SCORE,
  L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
  L11ConstitutionalViolationCode.DIRECTION_UNDECLARED,
  L11ConstitutionalViolationCode.DIRECTION_MIXED,
  L11ConstitutionalViolationCode.ATTRIBUTION_ABSENT,
  L11ConstitutionalViolationCode.VERSION_ABSENT,
  L11ConstitutionalViolationCode.MISSING_DATA_LAUNDERING,
  L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING,
  L11ConstitutionalViolationCode.HYPOTHESIS_SPREAD_IGNORED,
  L11ConstitutionalViolationCode.HYPOTHESIS_RELIANCE_IGNORED,
  L11ConstitutionalViolationCode.HYPOTHESIS_POSTURE_IGNORED,
  L11ConstitutionalViolationCode.L10_HYPOTHESIS_REBUILD,
  L11ConstitutionalViolationCode.LOWER_LAYER_REBUILD,
  L11ConstitutionalViolationCode.L7_LIVE_REVALIDATION,
  L11ConstitutionalViolationCode.REGIME_RECLASSIFICATION,
  L11ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION,
  L11ConstitutionalViolationCode.RESTRICTION_BYPASS,
  L11ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
  L11ConstitutionalViolationCode.STORAGE_BYPASS,
  L11ConstitutionalViolationCode.MISSING_LINEAGE,
  L11ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION,
  L11ConstitutionalViolationCode.CALIBRATION_HOOK_ABSENT,
  L11ConstitutionalViolationCode.SCORE_AS_ACTION,
]) {
  assert(ALL_L11_VIOLATION_CODES.includes(code), `A.code.${code}`);
}

// Error class
const err = new L11ConstitutionalError(
  L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
  'test',
  { foo: 'bar' },
);
assert(err.code === L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
  'A.37 error carries code');
assert(err.details.foo === 'bar', 'A.38 error carries details');

// ═══════════════════════════════════════════════════════════════
// BAND B — Dependency Law (§11.1.18.2)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Law ═══');
resetAll();

assert(ALL_L11_DEPENDENCY_LAYERS.length === 8,
  'B.01 8 dependency layers (L3–L10)');
assert(ALL_L11_DEPENDENCY_SURFACE_CLASSES.length >= 35,
  `B.02 ≥35 dependency surface classes (got ${ALL_L11_DEPENDENCY_SURFACE_CLASSES.length})`);
assert(L11_DEPENDENCY_SURFACES.length >= 35,
  `B.03 ≥35 registered surfaces (got ${L11_DEPENDENCY_SURFACES.length})`);

// Each layer populated
for (const layer of ALL_L11_DEPENDENCY_LAYERS) {
  const forLayer = getL11SurfacesForLayer(layer);
  assert(forLayer.length >= 1, `B.layer.${layer}`);
}

// L7 — stable handoff and restriction-aware
const l7 = getL11SurfacesForLayer(L11DependencyLayer.L7);
assert(l7.length === 5, 'B.04 5 L7 surfaces');
assert(l7.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.05 all L7 surfaces are STABLE_HANDOFF');
assert(l7.every(s => s.restrictionAware),
  'B.06 all L7 surfaces are restriction-aware');

// L8 — stable handoff, regime-posture-aware
const l8 = getL11SurfacesForLayer(L11DependencyLayer.L8);
assert(l8.length === 5, 'B.07 5 L8 surfaces');
assert(l8.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.08 all L8 surfaces are STABLE_HANDOFF');
assert(l8.every(s => s.regimePostureAware),
  'B.09 all L8 surfaces are regime-posture-aware');

// L9 — stable handoff, sequence-posture-aware
const l9 = getL11SurfacesForLayer(L11DependencyLayer.L9);
assert(l9.length === 7, 'B.10 7 L9 surfaces');
assert(l9.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.11 all L9 surfaces are STABLE_HANDOFF');
assert(l9.every(s => s.sequencePostureAware),
  'B.12 all L9 surfaces are sequence-posture-aware');

// L10 — stable handoff, hypothesis-posture-aware
const l10 = getL11SurfacesForLayer(L11DependencyLayer.L10);
assert(l10.length === 8, `B.13 8 L10 surfaces (got ${l10.length})`);
assert(l10.every(s => s.authorityClass === 'STABLE_HANDOFF'),
  'B.14 all L10 surfaces are STABLE_HANDOFF');
assert(l10.every(s => s.hypothesisPostureAware),
  'B.15 all L10 surfaces are hypothesis-posture-aware');

// Required surfaces present
const required = getL11RequiredDependencySurfaces();
assert(required.length >= 15,
  `B.16 ≥15 required surfaces (got ${required.length})`);
for (const id of [
  'l7:validation_assessment',
  'l7:restriction_profile',
  'l8:regime_state',
  'l9:sequence_assessment',
  'l9:sequence_restriction_profile',
  'l10:hypothesis_ranking_surface',
  'l10:hypothesis_spread_surface',
  'l10:hypothesis_reliance_surface',
  'l5:write_coordination',
  'l5:read_resolution',
]) {
  assert(required.some(s => s.surfaceId === id), `B.required.${id}`);
}

// Registry lookups
assert(getL11DependencySurface('l10:hypothesis_ranking_surface') !== undefined,
  'B.17 registry returns L10 hypothesis ranking');
assert(getL11DependencySurface('nonexistent') === undefined,
  'B.18 registry returns undefined for missing');
assert(isL11RegisteredDependency('l6:current_feature_state'),
  'B.19 isL11RegisteredDependency true');
assert(!isL11RegisteredDependency('fake:anything'),
  'B.20 isL11RegisteredDependency false');

// Usability
assert(isL11UsableFor('l6:current_feature_state', 'SUPPORT_INPUT'),
  'B.21 L6 feature usable as SUPPORT_INPUT');
assert(!isL11UsableFor('l5:write_coordination', 'SUPPORT_INPUT'),
  'B.22 L5 write NOT usable as SUPPORT_INPUT');
assert(getL11SurfacesUsableFor('SUPPORT_INPUT').length >= 4,
  'B.23 ≥4 surfaces usable as SUPPORT_INPUT');
assert(getL11SurfacesUsableFor('REGIME_CONDITIONING').length >= 4,
  'B.24 ≥4 surfaces usable as REGIME_CONDITIONING');
assert(getL11SurfacesUsableFor('SEQUENCE_CONDITIONING').length >= 4,
  'B.25 ≥4 surfaces usable as SEQUENCE_CONDITIONING');
assert(getL11SurfacesUsableFor('HYPOTHESIS_CONDITIONING').length >= 4,
  'B.26 ≥4 surfaces usable as HYPOTHESIS_CONDITIONING');

// Runtime registry — L6 (no posture)
const accessL6 = requestL11DependencyAccess({
  surfaceId: 'l6:current_feature_state',
  requestedUsage: 'SUPPORT_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(accessL6.allowed, 'B.27 L6 feature usable as support input');

const accessUnreg = requestL11DependencyAccess({
  surfaceId: 'fake:nope',
  requestedUsage: 'SUPPORT_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessUnreg.allowed, 'B.28 unregistered surface denied');
assert(accessUnreg.violationCode === L11ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
  'B.29 UNREGISTERED_DEPENDENCY code');

const accessWrong = requestL11DependencyAccess({
  surfaceId: 'l5:write_coordination',
  requestedUsage: 'SUPPORT_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessWrong.allowed, 'B.30 wrong usage denied');
assert(accessWrong.violationCode === L11ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
  'B.31 ILLEGAL_DEPENDENCY_USAGE code');

// L7 restriction-aware enforcement
const accessL7NoPosture = requestL11DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SUPPORT_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
});
assert(!accessL7NoPosture.allowed, 'B.32 L7 access without posture denied');
assert(accessL7NoPosture.violationCode === L11ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
  'B.33 RESTRICTION_POSTURE_IGNORED code');

const accessL7WeakPosture = requestL11DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SUPPORT_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: { ...FULL_RESTRICTION_POSTURE, allowsSupportInput: false },
});
assert(!accessL7WeakPosture.allowed, 'B.34 L7 access with insufficient posture denied');
assert(accessL7WeakPosture.violationCode === L11ConstitutionalViolationCode.RESTRICTION_BYPASS,
  'B.35 RESTRICTION_BYPASS code');

const accessL7Full = requestL11DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'SUPPORT_INPUT',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: FULL_RESTRICTION_POSTURE,
});
assert(accessL7Full.allowed, 'B.36 L7 access with full posture allowed');

// L8 regime-posture enforcement
const accessL8NoRegime = requestL11DependencyAccess({
  surfaceId: 'l8:regime_state',
  requestedUsage: 'REGIME_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: FULL_RESTRICTION_POSTURE,
});
assert(!accessL8NoRegime.allowed, 'B.37 L8 access without honouring regime posture denied');
assert(accessL8NoRegime.violationCode === L11ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
  'B.38 REGIME_POSTURE_IGNORED code');

const accessL8WithRegime = requestL11DependencyAccess({
  surfaceId: 'l8:regime_state',
  requestedUsage: 'REGIME_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: FULL_RESTRICTION_POSTURE,
  honoursRegimePosture: true,
});
assert(accessL8WithRegime.allowed, 'B.39 L8 access honouring regime posture allowed');

// L9 sequence-posture enforcement
const accessL9NoSequence = requestL11DependencyAccess({
  surfaceId: 'l9:sequence_assessment',
  requestedUsage: 'SEQUENCE_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: FULL_RESTRICTION_POSTURE,
});
assert(!accessL9NoSequence.allowed, 'B.40 L9 access without honouring sequence posture denied');
assert(accessL9NoSequence.violationCode === L11ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED,
  'B.41 SEQUENCE_POSTURE_IGNORED code');

const accessL9WithSequence = requestL11DependencyAccess({
  surfaceId: 'l9:sequence_assessment',
  requestedUsage: 'SEQUENCE_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: FULL_RESTRICTION_POSTURE,
  honoursSequencePosture: true,
});
assert(accessL9WithSequence.allowed, 'B.42 L9 access honouring sequence posture allowed');

// L10 hypothesis-posture enforcement
const accessL10NoHypothesis = requestL11DependencyAccess({
  surfaceId: 'l10:hypothesis_ranking_surface',
  requestedUsage: 'HYPOTHESIS_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: FULL_RESTRICTION_POSTURE,
});
assert(!accessL10NoHypothesis.allowed,
  'B.43 L10 access without honouring hypothesis posture denied');
assert(accessL10NoHypothesis.violationCode === L11ConstitutionalViolationCode.HYPOTHESIS_POSTURE_IGNORED,
  'B.44 HYPOTHESIS_POSTURE_IGNORED code');

const accessL10WithHypothesis = requestL11DependencyAccess({
  surfaceId: 'l10:hypothesis_ranking_surface',
  requestedUsage: 'HYPOTHESIS_CONDITIONING',
  requestor: 'test',
  timestamp: new Date().toISOString(),
  restrictionPosture: FULL_RESTRICTION_POSTURE,
  honoursHypothesisPosture: true,
});
assert(accessL10WithHypothesis.allowed,
  'B.45 L10 access honouring hypothesis posture allowed');

// assertL11DependencyAccess throws
let depThrew = false;
try {
  assertL11DependencyAccess({
    surfaceId: 'fake:missing',
    requestedUsage: 'SUPPORT_INPUT',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) { depThrew = e instanceof L11ConstitutionalError; }
assert(depThrew, 'B.46 assertL11DependencyAccess throws');

// Posture-aware sets
const restrictionAware = getL11RestrictionAwareSurfaces();
assert(restrictionAware.length >= l7.length + l8.length + l9.length + l10.length,
  `B.47 ≥${l7.length + l8.length + l9.length + l10.length} restriction-aware surfaces (got ${restrictionAware.length})`);
assert(restrictionAware.every(s =>
  s.layer === L11DependencyLayer.L7 || s.layer === L11DependencyLayer.L8 ||
  s.layer === L11DependencyLayer.L9 || s.layer === L11DependencyLayer.L10),
  'B.48 only L7/L8/L9/L10 restriction-aware');

const regimeAware = getL11RegimePostureAwareSurfaces();
assert(regimeAware.every(s => s.layer === L11DependencyLayer.L8),
  'B.49 only L8 regime-posture-aware');

const sequenceAware = getL11SequencePostureAwareSurfaces();
assert(sequenceAware.every(s => s.layer === L11DependencyLayer.L9),
  'B.50 only L9 sequence-posture-aware');

const hypothesisAware = getL11HypothesisPostureAwareSurfaces();
assert(hypothesisAware.every(s => s.layer === L11DependencyLayer.L10),
  'B.51 only L10 hypothesis-posture-aware');

assert(getAllL11RegisteredSurfaceIds().length === L11_DEPENDENCY_SURFACES.length,
  'B.52 getAllL11RegisteredSurfaceIds matches');

// Lower-layer behaviour patterns
const goodBehavior = validateL11LowerLayerInteraction({
  componentId: 'good',
  claimedBehaviors: [
    'consume l6 current feature state for score primitive',
    'consume l7 validation assessment via stable handoff',
    'consume l8 regime state via stable handoff',
    'consume l9 sequence assessment via stable handoff',
    'consume l10 hypothesis ranking surface via stable handoff',
    'persist score via l5 write coordination',
  ],
});
assert(goodBehavior.valid, 'B.53 legal L11 behaviours pass');

const badBehavior = validateL11LowerLayerInteraction({
  componentId: 'bad',
  claimedBehaviors: [
    're-resolve identity for asset',
    'shadow identity map for score',
    'redefine metric in score',
    'invent graph edge in score',
    'redefine feature in score',
    'reinterpret event in score',
    're-validate claim live from l6',
    'override validation in score',
    'live from l6 revalidation',
    'bypass l7 inside score',
    'ignore contradiction in score',
    'launder contradiction in score',
    'hide contradiction in score',
    'launder missing data in score',
    'hide missing data in score',
    'widen restriction in score',
    'ignore restriction in score',
    'reinterpret regime in score',
    'override regime in score',
    'ignore regime in score',
    'reinterpret sequence in score',
    'override sequence in score',
    'ignore sequence in score',
    'rebuild hypothesis from raw inputs',
    'rebuild hypotheses inside score',
    'derive hypothesis from l6 raw',
    'ignore hypothesis spread in score',
    'hide hypothesis spread in score',
    'ignore hypothesis reliance in score',
    'ignore hypothesis posture in score',
    'ignore invalidation in score',
    'from raw feed compute score',
    'bypass l5 in score',
    'direct postgres for score',
    'consume l12 surface',
    'consume scenario from l13',
    'consume judgment from l14',
    'consume recommendation from l15',
    'score as action',
    'score means buy',
    'score means sell',
    'rebuild l6 primitives in score',
    'rebuild l7 validation in score',
    'recompute validation in score',
    'recompute regime in score',
  ],
});
assert(!badBehavior.valid, 'B.54 illegal L11 behaviours blocked');
assert(badBehavior.violations.length >= 30,
  `B.55 ≥30 violations surfaced (got ${badBehavior.violations.length})`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Score Meaning Law (§11.1.18.3)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Score Meaning Law ═══');
resetAll();

assert(ALL_L11_SCORE_MEANING_CLAIM_CLASSES.length >= 9,
  `C.01 ≥9 meaning classes (got ${ALL_L11_SCORE_MEANING_CLAIM_CLASSES.length})`);
assert(ALL_L11_SCORE_DIRECTION_CLASSES.length === 4, 'C.02 4 direction classes');
assert(ALL_L11_SCORE_RESTRICTION_FLAGS.length >= 6,
  `C.03 ≥6 restriction flags (got ${ALL_L11_SCORE_RESTRICTION_FLAGS.length})`);
assert(L11_DEFAULT_MEANING_CLAIM_CATALOGUE.length === ALL_L11_SCORE_MEANING_CLAIM_CLASSES.length,
  'C.04 default catalogue covers every meaning class');

// Meaning claim — required for SCORE_OUTPUT
const meaningRequired = getL11OutputsRequiringMeaningClaim();
assert(meaningRequired.length >= 7,
  `C.05 ≥7 outputs require meaning claim (got ${meaningRequired.length})`);

// Direction declaration — required for SCORE_OUTPUT and SCORE_COMPONENT_BREAKDOWN
const directionRequired = getL11OutputsRequiringDirection();
assert(directionRequired.length >= 2,
  `C.06 ≥2 outputs require direction (got ${directionRequired.length})`);

// Attribution
const attributionRequired = getL11OutputsRequiringAttribution();
assert(attributionRequired.length >= 6,
  `C.07 ≥6 outputs require attribution (got ${attributionRequired.length})`);

// Default catalogue validity
for (const cls of ALL_L11_SCORE_MEANING_CLAIM_CLASSES) {
  assert(isValidL11MeaningClaim(getL11DefaultMeaningClaimForClass(cls)),
    `C.default_meaning.${cls}`);
  assert(isValidL11DirectionDeclaration(getL11DefaultDirectionForClass(cls)),
    `C.default_direction.${cls}`);
}

// Default restriction profile
const restrictionProfile = getL11DefaultRestrictionProfile();
assert(isValidL11RestrictionProfile(restrictionProfile),
  'C.08 default restriction profile valid');
assert(restrictionProfile.flags.includes(L11ScoreRestrictionFlag.FINAL_RECOMMENDATION_BLOCKED),
  'C.09 default profile blocks final recommendation');
assert(restrictionProfile.flags.includes(L11ScoreRestrictionFlag.REQUIRES_ATTRIBUTION_DISCLOSURE),
  'C.10 default profile requires attribution disclosure');
assert(restrictionProfile.flags.includes(L11ScoreRestrictionFlag.REQUIRES_MISSING_DATA_DISCLOSURE),
  'C.11 default profile requires missing-data disclosure');
assert(restrictionProfile.bounded_by_lower_layer_restrictions,
  'C.12 default profile bounded by lower-layer restrictions');

// Score-meaning validator — absent
const meaningAbsent = validateL11ScoreMeaning(undefined, 'noclaim');
assert(!meaningAbsent.valid, 'C.13 absent meaning blocked');
assert(meaningAbsent.violations.length === 1, 'C.14 single violation for absent meaning');
assert(meaningAbsent.violations[0].code === L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
  'C.15 MEANING_CLAIM_ABSENT code');

// Score-meaning validator — incomplete
const meaningIncomplete = validateL11ScoreMeaning(
  {
    meaning_class: L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY,
    measures: '',
    does_not_measure: 'a buy signal',
    intended_consumers: ['L12_SCENARIO_WEIGHTING'],
    calibration_target_category: 'governed',
    required_attribution_surfaces: ['l11:score_attribution'],
    legal_interpretation: 'gov',
    illegal_interpretation: 'rec',
  },
  'incomplete',
);
assert(!meaningIncomplete.valid, 'C.16 incomplete meaning blocked');

// Score-meaning validator — ok
const meaningOk = validateL11ScoreMeaning(
  getL11DefaultMeaningClaimForClass(L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY),
  'ok',
);
assert(meaningOk.valid, 'C.17 valid meaning passes');

// Direction validator — undeclared
const dirUndeclared = validateL11ScoreDirection(undefined,
  'opportunity score: higher means better quality', 'nodir');
assert(!dirUndeclared.valid, 'C.18 undeclared direction blocked');
assert(dirUndeclared.violations[0].code === L11ConstitutionalViolationCode.DIRECTION_UNDECLARED,
  'C.19 DIRECTION_UNDECLARED code');

// Direction validator — ok
const dirOk = validateL11ScoreDirection(
  getL11DefaultDirectionForClass(L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY),
  'opportunity score: higher means better quality',
  'okdir',
);
assert(dirOk.valid, 'C.20 valid direction passes');

// Direction validator — mixed
const dirMixed = validateL11ScoreDirection(
  getL11DefaultDirectionForClass(L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY),
  'this score is higher is better and also higher is worse for the same metric',
  'mixed',
);
assert(!dirMixed.valid, 'C.21 mixed direction blocked');
assert(dirMixed.violations.some(v => v.code === L11ConstitutionalViolationCode.DIRECTION_MIXED),
  'C.22 DIRECTION_MIXED code');

// detectL11DirectionMixing
assert(detectL11DirectionMixing('higher is better and higher is worse'),
  'C.23 detect direction mixing positive');
assert(!detectL11DirectionMixing('higher is better with stable direction'),
  'C.24 detect direction mixing negative');

// Attribution requirement
const attrMissing = validateL11AttributionRequirement({
  componentId: 'attr1',
  hasAttribution: false,
  hasFormulaVersion: true,
});
assert(!attrMissing.valid, 'C.25 missing attribution blocked');
assert(attrMissing.violations[0].code === L11ConstitutionalViolationCode.ATTRIBUTION_ABSENT,
  'C.26 ATTRIBUTION_ABSENT code');

const verMissing = validateL11AttributionRequirement({
  componentId: 'ver1',
  hasAttribution: true,
  hasFormulaVersion: false,
});
assert(!verMissing.valid, 'C.27 missing version blocked');
assert(verMissing.violations[0].code === L11ConstitutionalViolationCode.VERSION_ABSENT,
  'C.28 VERSION_ABSENT code');

const attrVerOk = validateL11AttributionRequirement({
  componentId: 'okattr',
  hasAttribution: true,
  hasFormulaVersion: true,
});
assert(attrVerOk.valid, 'C.29 attribution + version passes');

// Missing-data handling
const missingData_no = validateL11MissingDataHandling({
  componentId: 'm1',
  disclosesMissingData: false,
  laundersMissingData: false,
});
assert(!missingData_no.valid, 'C.30 no missing-data disclosure blocked');

const missingData_launder = validateL11MissingDataHandling({
  componentId: 'm2',
  disclosesMissingData: true,
  laundersMissingData: true,
});
assert(!missingData_launder.valid, 'C.31 missing-data laundering blocked');

const missingData_ok = validateL11MissingDataHandling({
  componentId: 'm3',
  disclosesMissingData: true,
  laundersMissingData: false,
});
assert(missingData_ok.valid, 'C.32 clean missing-data disclosure passes');

// Contradiction handling
const contra_no = validateL11ContradictionHandling({
  componentId: 'c1',
  disclosesContradiction: false,
  laundersContradiction: false,
});
assert(!contra_no.valid, 'C.33 no contradiction disclosure blocked');

const contra_launder = validateL11ContradictionHandling({
  componentId: 'c2',
  disclosesContradiction: true,
  laundersContradiction: true,
});
assert(!contra_launder.valid, 'C.34 contradiction laundering blocked');

const contra_ok = validateL11ContradictionHandling({
  componentId: 'c3',
  disclosesContradiction: true,
  laundersContradiction: false,
});
assert(contra_ok.valid, 'C.35 clean contradiction disclosure passes');

// Restriction profile validator
const profileMissing = validateL11ScoreRestrictionProfile(undefined, 'p');
assert(!profileMissing.valid, 'C.36 missing restriction profile blocked');
assert(profileMissing.violations[0].code === L11ConstitutionalViolationCode.RESTRICTION_BYPASS,
  'C.37 RESTRICTION_BYPASS for missing profile');

const profileOk = validateL11ScoreRestrictionProfile(getL11DefaultRestrictionProfile(), 'p');
assert(profileOk.valid, 'C.38 default restriction profile passes');

// Recommendation/judgment/scenario/trade-action leakage
const recLeak = validateL11RecommendationLeakage({
  componentId: 'r',
  emitsRecommendation: true,
  emitsJudgment: false,
  emitsScenarioWinner: false,
  emitsTradeAction: false,
  treatsScoreAsAction: false,
});
assert(!recLeak.valid, 'C.39 recommendation leakage blocked');
assert(recLeak.violations.some(v => v.code === L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS),
  'C.40 FORBIDDEN_RECOMMENDATION_SEMANTICS code');

const scoreActLeak = validateL11RecommendationLeakage({
  componentId: 'sa',
  emitsRecommendation: false,
  emitsJudgment: false,
  emitsScenarioWinner: false,
  emitsTradeAction: false,
  treatsScoreAsAction: true,
});
assert(!scoreActLeak.valid, 'C.41 score-as-action leakage blocked');
assert(scoreActLeak.violations.some(v => v.code === L11ConstitutionalViolationCode.SCORE_AS_ACTION),
  'C.42 SCORE_AS_ACTION code');

const judgeLeak = validateL11JudgmentLeakage({
  componentId: 'j',
  emitsRecommendation: false,
  emitsJudgment: true,
  emitsScenarioWinner: false,
  emitsTradeAction: false,
  treatsScoreAsAction: false,
});
assert(!judgeLeak.valid, 'C.43 judgment leakage blocked');
assert(judgeLeak.violations.some(v => v.code === L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS),
  'C.44 FORBIDDEN_JUDGMENT_SEMANTICS code');

const scenLeak = validateL11ScenarioLeakage({
  componentId: 's',
  emitsRecommendation: false,
  emitsJudgment: false,
  emitsScenarioWinner: true,
  emitsTradeAction: false,
  treatsScoreAsAction: false,
});
assert(!scenLeak.valid, 'C.45 scenario leakage blocked');
assert(scenLeak.violations.some(v => v.code === L11ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS),
  'C.46 FORBIDDEN_SCENARIO_SEMANTICS code');

const tradeLeak = validateL11ScenarioLeakage({
  componentId: 't',
  emitsRecommendation: false,
  emitsJudgment: false,
  emitsScenarioWinner: false,
  emitsTradeAction: true,
  treatsScoreAsAction: false,
});
assert(!tradeLeak.valid, 'C.47 trade action leakage blocked');
assert(tradeLeak.violations.some(v => v.code === L11ConstitutionalViolationCode.FORBIDDEN_TRADE_ACTION_SEMANTICS),
  'C.48 FORBIDDEN_TRADE_ACTION_SEMANTICS code');

const cleanLeak = validateL11RecommendationLeakage({
  componentId: 'cl',
  emitsRecommendation: false,
  emitsJudgment: false,
  emitsScenarioWinner: false,
  emitsTradeAction: false,
  treatsScoreAsAction: false,
});
assert(cleanLeak.valid, 'C.49 clean leakage check passes');

// Calibration requirement
const calProdMissing = validateL11CalibrationRequirement({
  componentId: 'cp',
  hasCalibrationHook: false,
  productionGrade: true,
});
assert(!calProdMissing.valid, 'C.50 production missing calibration blocked');
assert(calProdMissing.violations[0].code === L11ConstitutionalViolationCode.CALIBRATION_HOOK_ABSENT,
  'C.51 CALIBRATION_HOOK_ABSENT code');

const calProdWith = validateL11CalibrationRequirement({
  componentId: 'cpw',
  hasCalibrationHook: true,
  productionGrade: true,
});
assert(calProdWith.valid, 'C.52 production with calibration passes');

const calNonProd = validateL11CalibrationRequirement({
  componentId: 'cnp',
  hasCalibrationHook: false,
  productionGrade: false,
});
assert(calNonProd.valid, 'C.53 non-production missing calibration passes');

// ═══════════════════════════════════════════════════════════════
// BAND D — Output and Capability Law (§11.1.18.4)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Output and Capability Law ═══');
resetAll();

assert(ALL_L11_OUTPUT_SURFACE_CLASSES.length === 8, 'D.01 8 output classes');
assert(L11_OUTPUT_SURFACES.length === 8, 'D.02 8 output surfaces');

for (const cls of ALL_L11_OUTPUT_SURFACE_CLASSES) {
  assert(isL11RegisteredOutputClass(cls), `D.cls.${cls}`);
  assert(isL11LegalOutputClass(cls), `D.legal.${cls}`);
}

// Each surface lineage / replay / route requirements
for (const s of L11_OUTPUT_SURFACES) {
  assert(isL11RegisteredOutput(s.surfaceId), `D.reg.${s.surfaceId}`);
  assert(s.replayRequired, `D.replay.${s.surfaceId}`);
  assert(s.lineageRequired, `D.lineage.${s.surfaceId}`);
  assert(s.requiredLineageFields.length >= 3, `D.lineage_fields.${s.surfaceId}`);
  assert(s.l5StorageRoute.length > 0, `D.route.${s.surfaceId}`);
  assert(s.evidenceBound, `D.evidence.${s.surfaceId}`);
  assert(s.versionRequired, `D.version.${s.surfaceId}`);
  assert(s.allowedDownstreamConsumers.length >= 1, `D.consumers.${s.surfaceId}`);
  assert(s.nonFinalJudgment, `D.non_final.${s.surfaceId}`);
  assert(s.nonRecommendation, `D.non_rec.${s.surfaceId}`);
}

// 1:1 mapping output class -> surface
for (const cls of ALL_L11_OUTPUT_SURFACE_CLASSES) {
  const surfaces = L11_OUTPUT_SURFACES.filter(s => s.outputClass === cls);
  assert(surfaces.length === 1, `D.class-1to1.${cls}`);
}

// Lookups
assert(getL11OutputSurface('l11:score_output') !== undefined,
  'D.03 score_output surface retrievable');
assert(getL11OutputSurface('fake:missing') === undefined,
  'D.04 fake surface undefined');

// Lineage aggregation
const lineageFields = getAllL11RequiredLineageFields();
assert(lineageFields.includes('trace_id'), 'D.05 trace_id in lineage');
assert(lineageFields.includes('manifest_id'), 'D.06 manifest_id in lineage');
assert(lineageFields.includes('formula_version'), 'D.07 formula_version in lineage');
assert(lineageFields.includes('score_subject_id'), 'D.08 score_subject_id in lineage');

// Output replay/lineage subsets
assert(getL11OutputsRequiringLineage().length === L11_OUTPUT_SURFACES.length,
  'D.09 all outputs require lineage');
assert(getL11OutputsRequiringReplay().length === L11_OUTPUT_SURFACES.length,
  'D.10 all outputs require replay');

// Forbidden output classes
const forbiddenOut = [
  'FINAL_JUDGMENT', 'FINAL_RECOMMENDATION', 'TRADE_RECOMMENDATION',
  'SCENARIO_WINNER', 'FINAL_SCENARIO',
  'BUY_SIGNAL', 'SELL_SIGNAL', 'AVOID_SIGNAL', 'TRADE_SIGNAL',
  'PORTFOLIO_ALLOCATION', 'BEST_TRADE', 'BEST_OPPORTUNITY',
  'WINNING_SCORE', 'WINNING_SCENARIO',
  'CAUSAL_PROOF', 'UNVERSIONED_SCORE', 'UNATTRIBUTED_SCORE',
  'VIBE_SCORE', 'CONVICTION_SIGNAL', 'ACTIONABLE_SCORE',
  'TRADE_READY_SCORE', 'ENTRY_READY_SCORE',
  'GUARANTEED_SETUP', 'SAFEST_TRADE',
  'CLEAR_BUY_SCORE', 'CLEAR_SELL_SCORE',
];
for (const cls of forbiddenOut) {
  assert(isL11ForbiddenOutputClass(cls), `D.forbidden.${cls}`);
  assert(!isL11LegalOutputClass(cls), `D.illegal.${cls}`);
  assert(!validateL11OutputClassName(cls).valid,
    `D.validateClassName.${cls}`);
}

// Output semantics validator — codes
const scenSem = validateL11OutputSemantics('FINAL_SCENARIO');
assert(!scenSem.valid && scenSem.violations.some(v =>
  v.code === L11ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS),
  'D.11 scenario semantics code');
const tradeSem = validateL11OutputSemantics('PORTFOLIO_ALLOCATION');
assert(!tradeSem.valid && tradeSem.violations.some(v =>
  v.code === L11ConstitutionalViolationCode.FORBIDDEN_TRADE_ACTION_SEMANTICS),
  'D.12 trade action semantics code');
const recSemD = validateL11OutputSemantics('BUY_SIGNAL');
assert(!recSemD.valid && recSemD.violations.some(v =>
  v.code === L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS),
  'D.13 recommendation semantics code');
const judgeSem = validateL11OutputSemantics('FINAL_JUDGMENT');
assert(!judgeSem.valid && judgeSem.violations.some(v =>
  v.code === L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS),
  'D.14 judgment semantics code');
const vibeSem = validateL11OutputSemantics('VIBE_SCORE');
assert(!vibeSem.valid && vibeSem.violations.some(v =>
  v.code === L11ConstitutionalViolationCode.FORBIDDEN_VIBE_SCORE),
  'D.15 vibe semantics code');
const unattrSem = validateL11OutputSemantics('UNATTRIBUTED_SCORE');
assert(!unattrSem.valid && unattrSem.violations.some(v =>
  v.code === L11ConstitutionalViolationCode.ATTRIBUTION_ABSENT),
  'D.16 unattributed semantics code');
const unverSem = validateL11OutputSemantics('UNVERSIONED_SCORE');
assert(!unverSem.valid && unverSem.violations.some(v =>
  v.code === L11ConstitutionalViolationCode.VERSION_ABSENT),
  'D.17 unversioned semantics code');

// Output emission validator — full lineage
const emitOk = validateL11OutputEmission({
  surfaceId: 'l11:score_output',
  outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
  lineageFields: {
    score_subject_id: 'sub-1',
    score_family_id: 'fam-1',
    formula_version: 'v1',
    computed_at: new Date().toISOString(),
    trace_id: 'tr-1',
    manifest_id: 'mn-1',
  },
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(emitOk.allowed, 'D.18 full-lineage score_output emission allowed');

// Output emission validator — missing
const emitMissing = validateL11OutputEmission({
  surfaceId: 'l11:score_output',
  outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
  lineageFields: { score_subject_id: 'sub-1', trace_id: 'tr-1' },
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(!emitMissing.allowed, 'D.19 missing lineage blocked');
assert(emitMissing.missingLineage.length >= 3, 'D.20 missing lineage fields');
assert(emitMissing.violationCode === L11ConstitutionalViolationCode.MISSING_LINEAGE,
  'D.21 MISSING_LINEAGE code');

// Output emission — unregistered
const emitUnreg = validateL11OutputEmission({
  surfaceId: 'fake:nope',
  outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
  lineageFields: {},
  emitter: 'test',
  timestamp: new Date().toISOString(),
});
assert(!emitUnreg.allowed, 'D.22 unregistered output blocked');
assert(emitUnreg.violationCode === L11ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
  'D.23 UNREGISTERED_OUTPUT code');

let emitThrew = false;
try {
  assertL11OutputEmission({
    surfaceId: 'fake:nope',
    outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
    lineageFields: {},
    emitter: 'test',
    timestamp: new Date().toISOString(),
  });
} catch (e) { emitThrew = e instanceof L11ConstitutionalError; }
assert(emitThrew, 'D.24 assertL11OutputEmission throws');

// Downstream consumer validator
const consumerOk = validateL11DownstreamConsumer('l11:score_output', 'L12');
assert(consumerOk.valid, 'D.25 L12 consumer allowed for score_output');
const consumerBad = validateL11DownstreamConsumer('l11:score_output', 'RANDOM_LAYER');
assert(!consumerBad.valid, 'D.26 unknown consumer blocked');
assert(getL11AllowedConsumersForOutput('l11:score_output').includes('L13'),
  'D.27 L13 consumer recognised');
assert(isL11AllowedDownstreamConsumer('l11:score_output', 'L14'),
  'D.28 L14 isL11AllowedDownstreamConsumer');
assert(getAllL11RegisteredOutputIds().length === L11_OUTPUT_SURFACES.length,
  'D.29 getAllL11RegisteredOutputIds matches');

// ── Capabilities ──
assert(ALL_L11_ALLOWED_CAPABILITIES.length >= 15,
  `D.30 ≥15 allowed capabilities (got ${ALL_L11_ALLOWED_CAPABILITIES.length})`);
assert(ALL_L11_CAPABILITY_GROUPS.length === 6, 'D.31 6 capability groups');
assert(ALL_L11_CAPABILITY_CONTEXTS.length === 15,
  `D.32 15 capability contexts (got ${ALL_L11_CAPABILITY_CONTEXTS.length})`);

for (const g of ALL_L11_CAPABILITY_GROUPS) {
  assert(getL11CapabilitiesForGroup(g).length >= 1, `D.cap_group.${g}`);
}

assert(L11_CAPABILITY_POLICY.length === ALL_L11_ALLOWED_CAPABILITIES.length,
  'D.33 policy covers every capability');
assert(getL11CapabilityPolicyCount() === ALL_L11_ALLOWED_CAPABILITIES.length,
  'D.34 capability policy count matches');
assert(getFullL11CapabilityMatrix().length ===
  ALL_L11_ALLOWED_CAPABILITIES.length * ALL_L11_CAPABILITY_CONTEXTS.length,
  'D.35 full matrix size');

// Specific capability decisions
assert(getL11CapabilityDecision(
  L11AllowedCapability.COMPUTE_DETERMINISTIC_SCORE, 'COMPUTATION_CTX') === 'ALLOWED',
  'D.36 COMPUTE_DETERMINISTIC_SCORE allowed in COMPUTATION_CTX');
assert(getL11CapabilityDecision(
  L11AllowedCapability.DECLARE_SCORE_MEANING, 'MEANING_DECLARATION_CTX') === 'ALLOWED',
  'D.37 DECLARE_SCORE_MEANING allowed in MEANING_DECLARATION_CTX');
assert(getL11CapabilityDecision(
  L11AllowedCapability.DECLARE_SCORE_DIRECTION, 'DIRECTION_DECLARATION_CTX') === 'ALLOWED',
  'D.38 DECLARE_SCORE_DIRECTION allowed in DIRECTION_DECLARATION_CTX');
assert(getL11CapabilityDecision(
  L11AllowedCapability.ATTACH_CALIBRATION_HOOK, 'CALIBRATION_CTX') === 'ALLOWED',
  'D.39 ATTACH_CALIBRATION_HOOK allowed in CALIBRATION_CTX');
assert(getL11CapabilityDecision(
  L11AllowedCapability.ATTACH_DRIFT_HOOK, 'DRIFT_CTX') === 'ALLOWED',
  'D.40 ATTACH_DRIFT_HOOK allowed in DRIFT_CTX');
assert(getL11CapabilityDecision(
  L11AllowedCapability.MATERIALIZE_SCORE_OUTPUT, 'REPLAY_PATH') === 'DENIED',
  'D.41 MATERIALIZE_SCORE_OUTPUT denied in REPLAY_PATH');
assert(getL11CapabilityDecision(
  L11AllowedCapability.READ_SCORE_SURFACE, 'REPAIR_PATH') === 'DENIED',
  'D.42 READ_SCORE_SURFACE denied in REPAIR_PATH');
assert(getL11CapabilityDecision(
  L11AllowedCapability.REPLAY_SCORE, 'REPLAY_PATH') === 'ALLOWED',
  'D.43 REPLAY_SCORE allowed in REPLAY_PATH');
assert(getL11CapabilityDecision(
  L11AllowedCapability.REPAIR_SCORE, 'REPAIR_PATH') === 'ALLOWED',
  'D.44 REPAIR_SCORE allowed in REPAIR_PATH');

// Capability claim evaluator
const okClaim = evaluateL11CapabilityClaim({
  capability: L11AllowedCapability.COMPUTE_DETERMINISTIC_SCORE,
  context: 'COMPUTATION_CTX',
  claimant: 'test',
});
assert(okClaim.allowed, 'D.45 ok claim allowed');

const badClaim = evaluateL11CapabilityClaim({
  capability: L11AllowedCapability.MATERIALIZE_SCORE_OUTPUT,
  context: 'REPLAY_PATH',
  claimant: 'test',
});
assert(!badClaim.allowed, 'D.46 bad claim denied');

let capThrew = false;
try {
  assertL11CapabilityClaim({
    capability: L11AllowedCapability.MATERIALIZE_SCORE_OUTPUT,
    context: 'REPLAY_PATH',
    claimant: 'test',
  });
} catch (e) { capThrew = e instanceof L11ConstitutionalError; }
assert(capThrew, 'D.47 assertL11CapabilityClaim throws');

// Forbidden actions
assert(ALL_L11_FORBIDDEN_ACTIONS.length >= 25,
  `D.48 ≥25 forbidden actions (got ${ALL_L11_FORBIDDEN_ACTIONS.length})`);
assert(L11_FORBIDDEN_ACTION_DEFINITIONS.length === ALL_L11_FORBIDDEN_ACTIONS.length,
  'D.49 every forbidden action has a definition');
for (const action of ALL_L11_FORBIDDEN_ACTIONS) {
  const def = getL11ForbiddenActionDefinition(action);
  assert(def !== undefined && def.description.length > 0,
    `D.forbidden_def.${action}`);
}
assert(getAllL11CriticalForbiddenActions().length >= 25,
  `D.50 ≥25 critical forbidden actions (got ${getAllL11CriticalForbiddenActions().length})`);
assert(getL11RegisteredForbiddenActionCount() === L11_FORBIDDEN_ACTION_DEFINITIONS.length,
  'D.51 registered count matches');
assert(getL11CriticalForbiddenActionCount() ===
  getAllL11CriticalForbiddenActions().length,
  'D.52 critical count matches');

// Forbidden action registry classifier
const chkRec = checkForL11ForbiddenActions({
  proposedName: 'buy_signal_score',
  context: 'component',
});
assert(!chkRec.clean, 'D.53 buy_signal_score flagged');
assert(chkRec.violations.some(v =>
  v.action === L11ForbiddenAction.RECOMMENDATION_EMISSION),
  'D.54 recommendation emission flagged');

const chkScen = checkForL11ForbiddenActions({
  proposedName: 'scenario_winner_score',
  context: 'component',
});
assert(!chkScen.clean, 'D.55 scenario_winner flagged');
assert(chkScen.violations.some(v =>
  v.action === L11ForbiddenAction.SCENARIO_WINNER_EMISSION),
  'D.56 scenario emission flagged');

const chkJudge = checkForL11ForbiddenActions({
  proposedName: 'best_trade_score',
  context: 'component',
});
assert(!chkJudge.clean, 'D.57 best_trade_score flagged');
assert(chkJudge.violations.some(v =>
  v.action === L11ForbiddenAction.FINAL_JUDGMENT_EMISSION),
  'D.58 judgment emission flagged');

const chkVibe = checkForL11ForbiddenActions({
  proposedName: 'vibe_score',
  context: 'component',
});
assert(!chkVibe.clean, 'D.59 vibe_score flagged');
assert(chkVibe.violations.some(v =>
  v.action === L11ForbiddenAction.VIBE_SCORE_CREATION),
  'D.60 vibe creation flagged');

const chkUnattr = checkForL11ForbiddenActions({
  proposedName: 'unattributed_score',
  context: 'component',
});
assert(!chkUnattr.clean, 'D.61 unattributed_score flagged');
assert(chkUnattr.violations.some(v =>
  v.action === L11ForbiddenAction.UNATTRIBUTED_SCORE_EMISSION),
  'D.62 unattributed emission flagged');

const chkUnver = checkForL11ForbiddenActions({
  proposedName: 'unversioned_score',
  context: 'component',
});
assert(!chkUnver.clean, 'D.63 unversioned_score flagged');
assert(chkUnver.violations.some(v =>
  v.action === L11ForbiddenAction.UNVERSIONED_SCORE_EMISSION),
  'D.64 unversioned emission flagged');

const chkScoreAct = checkForL11ForbiddenActions({
  proposedName: 'score_as_action',
  context: 'component',
});
assert(!chkScoreAct.clean, 'D.65 score_as_action flagged');
assert(chkScoreAct.violations.some(v =>
  v.action === L11ForbiddenAction.SCORE_AS_ACTION),
  'D.66 score-as-action flagged');

const chkTrade = checkForL11ForbiddenActions({
  proposedName: 'trade_ready_score',
  context: 'component',
});
assert(!chkTrade.clean, 'D.67 trade_ready_score flagged');
assert(chkTrade.violations.some(v =>
  v.action === L11ForbiddenAction.TRADE_ACTION_EMISSION),
  'D.68 trade action flagged');

const chkClean = checkForL11ForbiddenActions({
  proposedName: 'opportunity_score_v1',
  proposedDescription: 'computes deterministic opportunity score with explicit meaning claim and direction',
  context: 'component',
});
assert(chkClean.clean, 'D.69 clean component passes forbidden-action check');

let fabThrew = false;
try {
  assertNoL11ForbiddenActions({
    proposedName: 'buy_signal',
    context: 'comp',
  });
} catch (e) { fabThrew = e instanceof L11ConstitutionalError; }
assert(fabThrew, 'D.70 assertNoL11ForbiddenActions throws on violation');

// Name-legality helper
assert(checkL11ComponentNameLegality('opportunity_score_v1').legal,
  'D.71 legal name');
assert(!checkL11ComponentNameLegality('Best_Trade_Score').legal,
  'D.72 bad casing rejected');
assert(!checkL11ComponentNameLegality('buy_signal').legal,
  'D.73 forbidden semantics rejected');

// Full component validator — clean
const compOk = validateL11Component({
  name: 'opportunity_score_v1',
  subjectClass: L11SubjectClass.SCORE_SUBJECT,
  outputSurfaceId: 'l11:score_output',
  outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
  dependencySurfaceIds: ['l6:current_feature_state', 'l7:validation_assessment'],
  dependencyUsage: 'SUPPORT_INPUT',
  description:
    'computes deterministic opportunity score with explicit meaning claim, direction, attribution, and missing-data posture',
});
assert(compOk.valid, 'D.74 clean L11 component passes validator');

// Full component validator — bad name
const compBadName = validateL11Component({
  name: 'buy_signal_score',
  subjectClass: L11SubjectClass.SCORE_SUBJECT,
  outputSurfaceId: 'l11:score_output',
  outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
  dependencySurfaceIds: ['l6:current_feature_state'],
  dependencyUsage: 'SUPPORT_INPUT',
  description:
    'computes deterministic opportunity score with explicit meaning claim and direction',
});
assert(!compBadName.valid, 'D.75 forbidden name blocked');

// Full component validator — unregistered dep
const compBadDep = validateL11Component({
  name: 'risk_score_v1',
  subjectClass: L11SubjectClass.SCORE_SUBJECT,
  outputSurfaceId: 'l11:score_output',
  outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
  dependencySurfaceIds: ['fake:unregistered'],
  dependencyUsage: 'SUPPORT_INPUT',
  description:
    'computes deterministic risk score with explicit meaning claim, direction, attribution, and missing-data posture',
});
assert(!compBadDep.valid, 'D.76 unregistered dep blocked');
assert(compBadDep.violations.some(v =>
  v.code === L11ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY),
  'D.77 UNREGISTERED_DEPENDENCY reported');

// Full component validator — bad description
const compBadDesc = validateL11Component({
  name: 'opportunity_score_v2',
  subjectClass: L11SubjectClass.SCORE_SUBJECT,
  outputSurfaceId: 'l11:score_output',
  outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
  dependencySurfaceIds: ['l6:current_feature_state'],
  dependencyUsage: 'SUPPORT_INPUT',
  description: 'emits a buy signal when the score crosses a threshold',
});
assert(!compBadDesc.valid, 'D.78 forbidden description blocked');

// Full component validator — non-mission description
const compNonMission = validateL11Component({
  name: 'arbitrary_engine_x',
  subjectClass: L11SubjectClass.SCORE_SUBJECT,
  outputSurfaceId: 'l11:score_output',
  outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
  dependencySurfaceIds: ['l6:current_feature_state'],
  dependencyUsage: 'SUPPORT_INPUT',
  description: 'does something vaguely related to the data layer',
});
assert(!compNonMission.valid, 'D.79 non-scoring description blocked');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants (§11.1.18.5)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

// All audit emitters
emitL11DependencyViolation('fake:x', 'src', 'reason');
emitL11OutputViolation('fake:y', 'src', 'reason');
emitL11NamingViolation('buy_signal', 'src');
emitL11MeaningClaimAbsentViolation('c1', 'src');
emitL11DirectionUndeclaredViolation('c2', 'src');
emitL11DirectionMixedViolation('c3', 'src');
emitL11AttributionAbsentViolation('c4', 'src');
emitL11VersionAbsentViolation('c5', 'src');
emitL11VibeScoreViolation('c6', 'src');
emitL11MissingDataLaunderingViolation('c7', 'src', 'launder');
emitL11ContradictionLaunderingViolation('c8', 'src', 'launder');
emitL11LowerLayerRebuildViolation('src', 'rebuild');
emitL11L10HypothesisRebuildViolation('src', 'rebuild');
emitL11RegimeOverrideViolation('c9', 'src');
emitL11SequenceOverrideViolation('c10', 'src');
emitL11L7LiveRevalidationViolation('c11', 'src');
emitL11RestrictionPostureIgnoredViolation('c12', 'src');
emitL11RestrictionBypassViolation('c13', 'src', 'widened');
emitL11RegimePostureIgnoredViolation('c14', 'src');
emitL11SequencePostureIgnoredViolation('c15', 'src');
emitL11HypothesisPostureIgnoredViolation('c16', 'src');
emitL11HypothesisSpreadIgnoredViolation('c17', 'src');
emitL11HypothesisRelianceIgnoredViolation('c18', 'src');
emitL11StorageBypassViolation('src', 'direct postgres');
emitL11MissingLineageViolation('l11:score_output', 'src', ['trace_id']);
emitL11LateLayerConsumptionViolation('c19', 'src', 'consumed L13');
emitL11CalibrationHookAbsentViolation('c20', 'src');
emitL11DriftHookAbsentViolation('c21', 'src');
emitL11ScoreAsActionViolation('c22', 'src', 'high score = buy');
emitL11IdentityRedefinitionViolation('src', 'identity');
emitL11MetricRedefinitionViolation('src', 'metric');
emitL11GraphRedefinitionViolation('src', 'graph');
emitL11PrimitiveRedefinitionViolation('src', 'primitive');

const all = getL11ConstitutionalAuditLog();
assert(all.length === 33, `E.01 33 audit records (got ${all.length})`);
assert(getL11ViolationCount() === 33, 'E.02 getL11ViolationCount matches');
assert(hasAnyL11Violations(), 'E.03 hasAnyL11Violations true');

const crits = getL11CriticalViolations();
assert(crits.length >= 30, `E.04 ≥30 critical violations (got ${crits.length})`);

// Code lookups
for (const code of [
  L11ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
  L11ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
  L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
  L11ConstitutionalViolationCode.DIRECTION_UNDECLARED,
  L11ConstitutionalViolationCode.DIRECTION_MIXED,
  L11ConstitutionalViolationCode.ATTRIBUTION_ABSENT,
  L11ConstitutionalViolationCode.VERSION_ABSENT,
  L11ConstitutionalViolationCode.MISSING_DATA_LAUNDERING,
  L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING,
  L11ConstitutionalViolationCode.LOWER_LAYER_REBUILD,
  L11ConstitutionalViolationCode.L10_HYPOTHESIS_REBUILD,
  L11ConstitutionalViolationCode.REGIME_RECLASSIFICATION,
  L11ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION,
  L11ConstitutionalViolationCode.L7_LIVE_REVALIDATION,
  L11ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
  L11ConstitutionalViolationCode.RESTRICTION_BYPASS,
  L11ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
  L11ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED,
  L11ConstitutionalViolationCode.HYPOTHESIS_POSTURE_IGNORED,
  L11ConstitutionalViolationCode.HYPOTHESIS_SPREAD_IGNORED,
  L11ConstitutionalViolationCode.HYPOTHESIS_RELIANCE_IGNORED,
  L11ConstitutionalViolationCode.STORAGE_BYPASS,
  L11ConstitutionalViolationCode.MISSING_LINEAGE,
  L11ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION,
  L11ConstitutionalViolationCode.CALIBRATION_HOOK_ABSENT,
  L11ConstitutionalViolationCode.DRIFT_HOOK_ABSENT,
  L11ConstitutionalViolationCode.SCORE_AS_ACTION,
  L11ConstitutionalViolationCode.IDENTITY_REDEFINITION,
  L11ConstitutionalViolationCode.METRIC_REDEFINITION,
  L11ConstitutionalViolationCode.GRAPH_REDEFINITION,
  L11ConstitutionalViolationCode.PRIMITIVE_REDEFINITION,
]) {
  assert(getL11ViolationsByCode(code).length === 1, `E.code.${code}`);
}

// Custom record
const custom = emitL11AuditRecord({
  violationCode: L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
  source: 'custom',
  detail: 'fabricated meaning gap',
  context: { componentId: 'x' },
  severity: 'CRITICAL',
});
assert(custom.timestamp.length > 0, 'E.05 audit record has timestamp');
assert(custom.violationCode === L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
  'E.06 audit code preserved');
assert(getL11ConstitutionalAuditLog().length === 34, 'E.07 custom record appended');

// Reset
resetAll();
assert(getL11ConstitutionalAuditLog().length === 0, 'E.08 audit log cleared');
assert(!hasAnyL11Violations(), 'E.09 hasAnyL11Violations false after reset');

// Invariants
const inv = checkAllL111Invariants();
assert(inv.length === 8, 'E.10 8 L11.1 invariants');
assert(inv.every(r => r.holds), `E.11 all invariants hold: ${
  inv.filter(r => !r.holds).map(r => `${r.id}=${r.evidence}`).join('; ')}`);

const invA = checkINV_111_A(); assert(invA.holds, `E.A ${invA.evidence}`);
const invB = checkINV_111_B(); assert(invB.holds, `E.B ${invB.evidence}`);
const invC = checkINV_111_C(); assert(invC.holds, `E.C ${invC.evidence}`);
const invD = checkINV_111_D(); assert(invD.holds, `E.D ${invD.evidence}`);
const invE = checkINV_111_E(); assert(invE.holds, `E.E ${invE.evidence}`);
const invF = checkINV_111_F(); assert(invF.holds, `E.F ${invF.evidence}`);
const invG = checkINV_111_G(); assert(invG.holds, `E.G ${invG.evidence}`);
const invH = checkINV_111_H(); assert(invH.holds, `E.H ${invH.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L11.1 CONSTITUTION — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 11 constitutional boundary green.');
  process.exit(0);
}
