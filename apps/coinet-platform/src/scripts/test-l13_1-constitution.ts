/**
 * L13.1 — Constitutional Position, Mission, and Boundary
 * Certification Test Suite (§13.1.16)
 *
 * 6 Bands:
 *   A — Mission and boundary                                 (§13.1.16.A)
 *   B — Dependency law                                       (§13.1.16.B)
 *   C — Capability and forbidden-action law                  (§13.1.16.C)
 *   D — Output surface law                                   (§13.1.16.D)
 *   E — Contradiction, uncertainty, confidence, restrictions (§13.1.16.E)
 *   F — Audit and invariants INV-13.1-A..J                   (§13.1.16.F)
 */

import {
  ALL_L13_ALLOWED_CAPABILITIES,
  ALL_L13_CAPABILITY_CONTEXTS,
  ALL_L13_CAPABILITY_GROUPS,
  ALL_L13_DEPENDENCY_LAYERS,
  ALL_L13_DEPENDENCY_SURFACE_CLASSES,
  ALL_L13_FORBIDDEN_ACTIONS,
  ALL_L13_OUTPUT_SURFACE_CLASSES,
  ALL_L13_SUBJECT_CLASSES,
  ALL_L13_SUBLAYER_IDS,
  ALL_L13_VIOLATION_CODES,
  L13_CAPABILITY_POLICY,
  L13_DEPENDENCY_SURFACES,
  L13_DOES_NOT_ANSWER,
  L13_FORBIDDEN_ACTION_DEFINITIONS,
  L13_IS_NOT,
  L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
  L13_L12_SCENARIO_BUNDLE_SURFACE_IDS,
  L13_MAY_ANSWER_INSTEAD,
  L13_MISSION,
  L13_MISSION_CONSTRAINT,
  L13_OUTPUT_SURFACES,
  L13AllowedCapability,
  L13CapabilityContext,
  L13CapabilityDecision,
  L13CapabilityGroup,
  L13ConstitutionalError,
  L13ConstitutionalViolationCode,
  L13DependencyLayer,
  L13DependencySurfaceClass,
  L13DownstreamConsumer,
  L13ForbiddenAction,
  L13OutputSurfaceClass,
  L13SubjectClass,
  L13SublayerId,
  L13ViolationSeverity,
  containsL13ForbiddenNaming,
  detectL13FinalJudgmentLeak,
  detectL13LowerLayerRebuildLanguage,
  detectL13MissingDataLaunderLanguage,
  detectL13PredictionTheater,
  detectL13RecommendationLeak,
  getAllL13CapabilityGroups,
  getAllL13CriticalForbiddenActions,
  getL13CapabilitiesForGroup,
  getL13CapabilityDecision,
  getL13DeniedCapabilities,
  getL13DependencySurface,
  getL13ForbiddenActionDefinition,
  getL13ForbiddenNamePatterns,
  getL13OutputSurface,
  getL13OutputsRequiringEvidence,
  getL13OutputsRequiringLineage,
  getL13OutputsRequiringConfidenceDisclosure,
  getL13OutputsRequiringRestrictionDisclosure,
  getL13OutputsRequiringL5Persistence,
  getL13RequiredDependencySurfaces,
  getL13RestrictionAwareSurfaces,
  getL13ScenarioSurfaces,
  getL13ScoreContextSurfaces,
  getL13SurfacesForLayer,
  getL13ValidNameExamples,
  isL13AllowedDownstreamConsumer,
  isL13CapabilityAllowed,
  isL13ForbiddenOutputClass,
  isL13LegalOutputClass,
  isL13RegisteredDependency,
  isL13RegisteredOutput,
  isL13RegisteredOutputClass,
  isValidL13ComponentName,
  matchesL13Mission,
} from '../l13/contracts';

import {
  L13ConstitutionalAuditSubjectClass,
  ALL_L13_AUDIT_SUBJECT_CLASSES,
  assertL13CapabilityClaim,
  assertL13DependencyAccess,
  assertL13NoForbiddenAction,
  assertL13OutputEmission,
  checkL13ForbiddenAction,
  emitL13AuditRecord,
  evaluateL13CapabilityClaim,
  getFullL13CapabilityMatrix,
  getL13ConstitutionalAuditLog,
  getL13CriticalViolations,
  getL13ViolationCount,
  getL13ViolationsByCode,
  getL13ViolationsBySubjectClass,
  hasAnyL13Violations,
  isL13BlockingViolationCode,
  requestL13DependencyAccess,
  resetL13ConstitutionalAuditLog,
  severityForL13ViolationCode,
  validateL13ComponentBoundary,
  validateL13ConfidenceHandling,
  validateL13ContradictionHandling,
  validateL13DependencyAccess,
  validateL13EvidenceGrounding,
  validateL13FinalJudgmentBoundary,
  validateL13HypothesisHandling,
  validateL13MissionAlignment,
  validateL13NoInventionLaw,
  validateL13NoRebuildLaw,
  validateL13OutputSemantics,
  validateL13PredictionBoundary,
  validateL13RecommendationBoundary,
  validateL13RestrictionHandling,
  validateL13ScenarioHandling,
  validateL13ScoreHandling,
  validateL13OutputEmission,
} from '../l13/constitution';

import {
  runAllL13_1Invariants,
  checkINV_131_A,
  checkINV_131_B,
  checkINV_131_C,
  checkINV_131_D,
  checkINV_131_E,
  checkINV_131_F,
  checkINV_131_G,
  checkINV_131_H,
  checkINV_131_I,
  checkINV_131_J,
} from '../l13/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function resetAll(): void {
  resetL13ConstitutionalAuditLog();
}

const FULL_L11_BUNDLE = [...L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS];
const FULL_L12_BUNDLE = [...L13_L12_SCENARIO_BUNDLE_SURFACE_IDS];

const POSTURE_OK = {
  contradictionPostureProvided: true,
  restrictionsHonoured: true,
  regimePostureProvided: true,
  sequencePostureProvided: true,
  hypothesisPostureProvided: true,
};

// ═══════════════════════════════════════════════════════════════
// BAND A — Mission and Boundary  (§13.1.16.A)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Mission and Boundary ═══');
resetAll();

assert(L13_MISSION.name === 'Layer 13 — AI Judgment & Explanation Layer', 'A.01 mission name');
assert(L13_MISSION.canonical.includes('AI Judgment & Explanation Layer'), 'A.02 mission canonical names layer');
assert(L13_MISSION.canonical.includes('L3–L12'), 'A.03 mission references L3–L12');
assert(L13_MISSION.canonical.includes('grounded AI explanations'), 'A.04 mission requires grounded explanations');
assert(L13_MISSION.canonical.includes('without'), 'A.05 mission has explicit prohibitions');
assert(L13_MISSION.canonical.includes('inventing support'), 'A.06 mission rejects inventing support');
assert(L13_MISSION.canonical.includes('hiding contradiction'), 'A.07 mission rejects hiding contradiction');
assert(L13_MISSION.canonical.includes('recommendations'), 'A.08 mission rejects recommendations');
assert(L13_MISSION.canonical.includes('predictions'), 'A.09 mission rejects predictions');
assert(L13_MISSION.canonical.includes('manufacturing judgment'), 'A.10 mission rejects manufacturing judgment');
assert(
  L13_MISSION.firstPrinciple ===
    'The AI may explain judgment, but it may not manufacture judgment.',
  'A.11 first principle frozen verbatim',
);
assert(L13_MISSION.compression.includes('voice of the engine'), 'A.12 compression names voice of the engine');
assert(L13_MISSION.compression.includes('not the engine itself'), 'A.13 compression rejects engine identity');
assert(L13_MISSION.firstPrincipleExpanded.includes('readable intelligence'), 'A.14 expanded principle mentions readable intelligence');
assert(L13_MISSION.firstPrincipleExpanded.includes('not decide'), 'A.15 expanded principle includes "not decide"');

assert(L13_MISSION_CONSTRAINT.noTradeInstruction, 'A.16 constraint forbids trade instructions');
assert(L13_MISSION_CONSTRAINT.noPrediction, 'A.17 constraint forbids prediction');
assert(L13_MISSION_CONSTRAINT.noRecommendation, 'A.18 constraint forbids recommendation');
assert(L13_MISSION_CONSTRAINT.noFinalJudgment, 'A.19 constraint forbids final judgment');
assert(L13_MISSION_CONSTRAINT.noLowerLayerRebuild, 'A.20 constraint forbids lower-layer rebuild');
assert(L13_MISSION_CONSTRAINT.noInvention, 'A.21 constraint forbids invention');
assert(L13_MISSION_CONSTRAINT.noHidingContradiction, 'A.22 constraint forbids hiding contradiction');
assert(L13_MISSION_CONSTRAINT.noConfidenceOverride, 'A.23 constraint forbids confidence override');
assert(L13_MISSION_CONSTRAINT.noScenarioCreation, 'A.24 constraint forbids scenario creation');
assert(L13_MISSION_CONSTRAINT.noLocalScoreCompute, 'A.25 constraint forbids local score compute');
assert(L13_MISSION_CONSTRAINT.evidenceRequired, 'A.26 constraint requires evidence');
assert(L13_MISSION_CONSTRAINT.lineageRequired, 'A.27 constraint requires lineage');
assert(L13_MISSION_CONSTRAINT.confidenceDisclosureRequired, 'A.28 constraint requires confidence disclosure');
assert(L13_MISSION_CONSTRAINT.restrictionDisclosureRequired, 'A.29 constraint requires restriction disclosure');
assert(L13_MISSION_CONSTRAINT.contradictionDisclosureRequired, 'A.30 constraint requires contradiction disclosure');
assert(L13_MISSION_CONSTRAINT.uncertaintyDisclosureRequired, 'A.31 constraint requires uncertainty disclosure');

// L13_IS_NOT must reject every engine identity
assert((L13_IS_NOT as readonly string[]).includes('the data layer'), 'A.32 L13_IS_NOT data layer');
assert((L13_IS_NOT as readonly string[]).includes('the validation layer'), 'A.33 L13_IS_NOT validation layer');
assert((L13_IS_NOT as readonly string[]).includes('the regime engine'), 'A.34 L13_IS_NOT regime engine');
assert((L13_IS_NOT as readonly string[]).includes('the sequence engine'), 'A.35 L13_IS_NOT sequence engine');
assert((L13_IS_NOT as readonly string[]).includes('the hypothesis engine'), 'A.36 L13_IS_NOT hypothesis engine');
assert((L13_IS_NOT as readonly string[]).includes('the scoring engine'), 'A.37 L13_IS_NOT scoring engine');
assert((L13_IS_NOT as readonly string[]).includes('the scenario engine'), 'A.38 L13_IS_NOT scenario engine');
assert((L13_IS_NOT as readonly string[]).includes('the recommendation layer'), 'A.39 L13_IS_NOT recommendation layer');
assert((L13_IS_NOT as readonly string[]).includes('the prediction layer'), 'A.40 L13_IS_NOT prediction layer');

// L13_DOES_NOT_ANSWER must reject buy/sell/hold/avoid and prediction questions
const doesNotAnswerStr = (L13_DOES_NOT_ANSWER as readonly string[]).join(' | ').toLowerCase();
assert(doesNotAnswerStr.includes('buy'), 'A.41 does not answer buy');
assert(doesNotAnswerStr.includes('sell'), 'A.42 does not answer sell');
assert(doesNotAnswerStr.includes('hold'), 'A.43 does not answer hold');
assert(doesNotAnswerStr.includes('avoid'), 'A.44 does not answer avoid');
assert(doesNotAnswerStr.includes('leverage'), 'A.45 does not answer leverage');
assert(doesNotAnswerStr.includes('entry') || doesNotAnswerStr.includes('exit'), 'A.46 does not answer entry/exit');
assert(doesNotAnswerStr.includes('pump') || doesNotAnswerStr.includes('dump') || doesNotAnswerStr.includes('guarantee'), 'A.47 does not answer prediction');
assert((L13_MAY_ANSWER_INSTEAD as readonly string[]).length > 0, 'A.48 may-answer alternatives exist');

// Forbidden naming patterns reject every engine/recommendation/prediction-style name.
const forbiddenNames = [
  'scenario_generator',
  'score_calculator',
  'regime_classifier',
  'hypothesis_ranker',
  'trade_advisor',
  'buy_signal_writer',
  'sell_signal_writer',
  'hold_advisor',
  'avoid_advisor',
  'leverage_advisor',
  'entry_advisor',
  'exit_advisor',
  'prediction_engine',
  'forecast_writer',
  'will_go_up_predictor',
  'guaranteed_path_caller',
  'scenario_winner_caller',
  'final_judgment_writer',
  'rebuild_scenario',
  'rebuild_score',
  'rebuild_hypothesis',
  'rebuild_sequence',
  'rebuild_regime',
  'override_contradiction',
  'override_restriction',
  'override_confidence',
  'create_new_scenario',
  'create_new_hypothesis',
  'compute_score_locally',
  'invent_support',
  'naked_score_user',
  'raw_lower_layer_consumer',
];
let blockedAll = true;
for (const n of forbiddenNames) {
  if (!containsL13ForbiddenNaming(n)) {
    blockedAll = false;
    failures.push(`forbidden name not blocked: ${n}`);
  }
}
assert(blockedAll, 'A.49 all forbidden names rejected');

const validNames = getL13ValidNameExamples();
assert(validNames.length >= 5, 'A.50 valid name examples present');
assert(validNames.every(n => isValidL13ComponentName(n)), 'A.51 all valid name examples accepted');

// matchesL13Mission accepts good descriptions, rejects bad ones.
assert(
  matchesL13Mission(
    'this component explains the engine state with evidence and discloses uncertainty when scenario spread is narrow',
  ),
  'A.52 explanation description matches mission',
);
assert(
  matchesL13Mission(
    'summarize the base case scenario with triggers, invalidations, and contradiction disclosure',
  ),
  'A.53 summarization description matches mission',
);
assert(
  !matchesL13Mission('this component generates new scenarios for the user'),
  'A.54 scenario-generation description rejected',
);
assert(
  !matchesL13Mission('this component computes the score locally and emits a buy signal'),
  'A.55 buy-signal description rejected',
);
assert(
  !matchesL13Mission('btc will definitely continue higher, no doubt'),
  'A.56 prediction theater description rejected',
);
assert(
  !matchesL13Mission('classify regime locally and override contradiction posture'),
  'A.57 lower-layer rebuild description rejected',
);

// ALL_L13_SUBLAYER_IDS must be present and frozen.
assert((ALL_L13_SUBLAYER_IDS as readonly L13SublayerId[]).includes(L13SublayerId.L13_1_CONSTITUTION), 'A.58 L13.1 sublayer id frozen');

// Component boundary validator rejects engine-like components.
const engineLikeComponent = validateL13ComponentBoundary({
  name: 'scenario_generator',
  subjectClass: L13SubjectClass.SCENARIO_EXPLANATION_SUBJECT,
  outputSurfaceId: 'l13:ai_explanation_output',
  outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
  dependencySurfaceIds: ['l12:scenario_set'],
  capability: L13AllowedCapability.EXPLAIN_SCENARIOS,
  description: 'this component generates new scenarios and emits buy signals',
});
assert(!engineLikeComponent.valid, 'A.59 engine-like component rejected by validator');
assert(engineLikeComponent.violations.length >= 2, 'A.60 multiple boundary violations on engine-like component');

// Mission alignment helper passes legal, fails illegal descriptions.
assert(
  validateL13MissionAlignment(
    'explain the engine state with evidence, lineage, and contradiction disclosure',
    'good_component',
  ).valid,
  'A.61 mission alignment passes legal description',
);
assert(
  !validateL13MissionAlignment(
    'go long now, this trade is guaranteed',
    'bad_component',
  ).valid,
  'A.62 mission alignment rejects bad description',
);

// ═══════════════════════════════════════════════════════════════
// BAND B — Dependency Law  (§13.1.16.B)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Law ═══');
resetAll();

// All L3–L12 layers covered.
assert(ALL_L13_DEPENDENCY_LAYERS.length === 10, 'B.01 ten dependency layers (L3-L12)');
for (const layer of ALL_L13_DEPENDENCY_LAYERS) {
  assert(getL13SurfacesForLayer(layer).length > 0, `B.02 surfaces registered for ${layer}`);
}
assert(L13_DEPENDENCY_SURFACES.length >= 25, 'B.03 dependency registry is comprehensive');
assert(
  L13_DEPENDENCY_SURFACES.every(s => isL13RegisteredDependency(s.surfaceId)),
  'B.04 every surface is registered',
);
assert(
  L13_DEPENDENCY_SURFACES.every(s => s.rawRebuildProhibited === true),
  'B.05 raw rebuild prohibited on every surface',
);

// Required dependency surface classes covered.
const surfaceClassesPresent = new Set(L13_DEPENDENCY_SURFACES.map(s => s.surfaceClass));
for (const cls of ALL_L13_DEPENDENCY_SURFACE_CLASSES) {
  assert(surfaceClassesPresent.has(cls), `B.06 surface class registered: ${cls}`);
}

// Late-layer (L14+) and raw bypass rejected at runtime.
const lateRequest = requestL13DependencyAccess({
  surfaceId: 'l14:future_layer',
  capability: L13AllowedCapability.EXPLAIN_ENGINE_STATE,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
});
assert(!lateRequest.allowed, 'B.07 late-layer dependency rejected');
assert(
  lateRequest.violationCode === L13ConstitutionalViolationCode.L13C_LATE_LAYER_DEPENDENCY,
  'B.08 late-layer violation code',
);

const rawRequest = requestL13DependencyAccess({
  surfaceId: 'raw_lower_layer:rebuild_scenario',
  capability: L13AllowedCapability.EXPLAIN_SCENARIOS,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
});
assert(!rawRequest.allowed, 'B.09 raw lower-layer bypass rejected');
assert(
  rawRequest.violationCode === L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS,
  'B.10 raw bypass violation code',
);

const unregisteredRequest = requestL13DependencyAccess({
  surfaceId: 'l11:hand_rolled_score',
  capability: L13AllowedCapability.EXPLAIN_SCORES,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
});
assert(!unregisteredRequest.allowed, 'B.11 unregistered dependency rejected');

// L11 score requires full attribution/missing-data/drift bundle.
const scoreNakedRequest = requestL13DependencyAccess({
  surfaceId: 'l11:score_output',
  capability: L13AllowedCapability.EXPLAIN_SCORES,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  ...POSTURE_OK,
  consumesFullScoreContextBundle: false,
});
assert(!scoreNakedRequest.allowed, 'B.12 naked L11 score rejected');

const scorePartialRequest = requestL13DependencyAccess({
  surfaceId: 'l11:score_output',
  capability: L13AllowedCapability.EXPLAIN_SCORES,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  ...POSTURE_OK,
  consumesFullScoreContextBundle: true,
  l11ConsumedBundle: FULL_L11_BUNDLE.slice(0, 1),
});
assert(!scorePartialRequest.allowed, 'B.13 partial L11 bundle rejected');

const scoreFullRequest = requestL13DependencyAccess({
  surfaceId: 'l11:score_output',
  capability: L13AllowedCapability.EXPLAIN_SCORES,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  ...POSTURE_OK,
  consumesFullScoreContextBundle: true,
  l11ConsumedBundle: FULL_L11_BUNDLE,
});
assert(scoreFullRequest.allowed, 'B.14 complete L11 score bundle accepted');

// L12 scenario requires full triggers/invalidations/path-confidence bundle.
const scenarioNakedRequest = requestL13DependencyAccess({
  surfaceId: 'l12:scenario_set',
  capability: L13AllowedCapability.EXPLAIN_SCENARIOS,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  ...POSTURE_OK,
  consumesFullScenarioBundle: false,
});
assert(!scenarioNakedRequest.allowed, 'B.15 naked L12 scenario rejected');

const scenarioFullRequest = requestL13DependencyAccess({
  surfaceId: 'l12:scenario_set',
  capability: L13AllowedCapability.EXPLAIN_SCENARIOS,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  ...POSTURE_OK,
  consumesFullScenarioBundle: true,
  l12ConsumedBundle: FULL_L12_BUNDLE,
});
assert(scenarioFullRequest.allowed, 'B.16 complete L12 scenario bundle accepted');

// L7 contradiction-aware surface cannot be consumed without contradiction posture.
const l7NoPostureRequest = requestL13DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  capability: L13AllowedCapability.DISCLOSE_CONTRADICTION,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  contradictionPostureProvided: false,
  restrictionsHonoured: true,
  regimePostureProvided: true,
  sequencePostureProvided: true,
  hypothesisPostureProvided: true,
});
assert(!l7NoPostureRequest.allowed, 'B.17 L7 surface rejected without contradiction posture');

// Restriction-required surfaces reject when restrictions not honoured.
const restrictionAware = getL13RestrictionAwareSurfaces();
assert(restrictionAware.length > 0, 'B.18 restriction-aware surfaces present');
const restrictionBypass = requestL13DependencyAccess({
  surfaceId: restrictionAware[0]!.surfaceId,
  capability: restrictionAware[0]!.allowedL13Uses[0]!,
  requestor: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  ...POSTURE_OK,
  restrictionsHonoured: false,
});
assert(!restrictionBypass.allowed, 'B.19 restriction bypass rejected');

// Required dependency surfaces include canonical identity, scenario set, score output.
const required = getL13RequiredDependencySurfaces();
assert(
  required.some(s => s.surfaceClass === L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY),
  'B.20 canonical entity summary required',
);
assert(
  required.some(s => s.surfaceClass === L13DependencySurfaceClass.SCENARIO_SET),
  'B.21 scenario set required',
);
assert(
  required.some(s => s.surfaceClass === L13DependencySurfaceClass.SCORE_OUTPUT),
  'B.22 score output required',
);

// Score-context bundle and scenario bundle are explicitly defined.
assert(L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.length >= 5, 'B.23 L11 score-context bundle complete');
assert(L13_L12_SCENARIO_BUNDLE_SURFACE_IDS.length >= 4, 'B.24 L12 scenario bundle complete');

// Score-context and scenario surfaces are non-empty.
assert(getL13ScoreContextSurfaces().length >= 5, 'B.25 score-context surfaces registered');
assert(getL13ScenarioSurfaces().length >= 5, 'B.26 scenario surfaces registered');

// validateL13DependencyAccess wrapper agrees with runtime registry.
const wrapperLate = validateL13DependencyAccess({
  componentId: 'late',
  surfaceId: 'l15:future',
  capability: L13AllowedCapability.EXPLAIN_ENGINE_STATE,
  ...POSTURE_OK,
});
assert(!wrapperLate.valid, 'B.27 wrapper rejects late-layer surface');

assert(
  ALL_L13_DEPENDENCY_LAYERS.every(l => l !== ('L13_AI' as never) && l !== ('L14_FUTURE' as never)),
  'B.28 dependency layer enum contains no L13+/L14+ entry',
);

// ═══════════════════════════════════════════════════════════════
// BAND C — Capability and Forbidden-Action Law  (§13.1.16.C)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Capability and Forbidden-Action Law ═══');
resetAll();

assert(ALL_L13_ALLOWED_CAPABILITIES.length >= 18, 'C.01 capabilities enumerated');
assert(ALL_L13_CAPABILITY_GROUPS.length >= 8, 'C.02 capability groups enumerated');
assert(ALL_L13_CAPABILITY_CONTEXTS.length >= 12, 'C.03 capability contexts enumerated');
assert(L13_CAPABILITY_POLICY.length >= 10, 'C.04 capability policy populated');

// Allowed capabilities decision in legal context.
assert(
  getL13CapabilityDecision(L13AllowedCapability.EXPLAIN_SCENARIOS, L13CapabilityContext.SCENARIO_EXPLANATION) ===
    L13CapabilityDecision.ALLOWED,
  'C.05 EXPLAIN_SCENARIOS allowed in SCENARIO_EXPLANATION',
);
assert(
  getL13CapabilityDecision(L13AllowedCapability.EXPLAIN_SCORES, L13CapabilityContext.SCORE_EXPLANATION) ===
    L13CapabilityDecision.ALLOWED,
  'C.06 EXPLAIN_SCORES allowed in SCORE_EXPLANATION',
);
assert(
  getL13CapabilityDecision(L13AllowedCapability.WRITE_ALERT_TEXT, L13CapabilityContext.ALERT_GENERATION) ===
    L13CapabilityDecision.ALLOWED,
  'C.07 WRITE_ALERT_TEXT allowed in ALERT_GENERATION',
);
assert(
  getL13CapabilityDecision(L13AllowedCapability.COMPARE_ASSETS, L13CapabilityContext.ASSET_COMPARISON) ===
    L13CapabilityDecision.ALLOWED,
  'C.08 COMPARE_ASSETS allowed in ASSET_COMPARISON',
);
assert(
  getL13CapabilityDecision(L13AllowedCapability.DISCLOSE_CONTRADICTION, L13CapabilityContext.CONTRADICTION_EXPLANATION) ===
    L13CapabilityDecision.ALLOWED,
  'C.09 DISCLOSE_CONTRADICTION allowed in CONTRADICTION_EXPLANATION',
);

// User asks for advice / certainty → answer must be denied or rewritten.
assert(
  getL13CapabilityDecision(L13AllowedCapability.ANSWER_USER_QUESTION, L13CapabilityContext.USER_REQUESTS_ADVICE) ===
    L13CapabilityDecision.DENIED,
  'C.10 ANSWER_USER_QUESTION denied for USER_REQUESTS_ADVICE',
);
assert(
  getL13CapabilityDecision(L13AllowedCapability.ANSWER_USER_QUESTION, L13CapabilityContext.USER_REQUESTS_CERTAINTY) ===
    L13CapabilityDecision.DENIED,
  'C.11 ANSWER_USER_QUESTION denied for USER_REQUESTS_CERTAINTY',
);

// User asks for bullish/bearish only → conditional explanation required.
assert(
  getL13CapabilityDecision(L13AllowedCapability.EXPLAIN_SCENARIOS, L13CapabilityContext.USER_REQUESTS_BULLISH_BEARISH_ONLY) ===
    L13CapabilityDecision.CONDITIONALLY_ALLOWED,
  'C.12 bullish/bearish-only forces conditional explanation',
);

// REFUSE_UNSUPPORTED_CONCLUSION must be allowed in adversarial contexts.
assert(
  getL13CapabilityDecision(L13AllowedCapability.REFUSE_UNSUPPORTED_CONCLUSION, L13CapabilityContext.USER_REQUESTS_ADVICE) !==
    L13CapabilityDecision.DENIED,
  'C.13 REFUSE_UNSUPPORTED_CONCLUSION not denied in advice context',
);

// Capability claim helper agrees with policy.
const advisoryClaim = evaluateL13CapabilityClaim({
  claimant: 'advisor',
  capability: L13AllowedCapability.ANSWER_USER_QUESTION,
  context: L13CapabilityContext.USER_REQUESTS_ADVICE,
});
assert(!advisoryClaim.allowed, 'C.14 advisory claim rejected via runtime helper');

const explainClaim = evaluateL13CapabilityClaim({
  claimant: 'explainer',
  capability: L13AllowedCapability.EXPLAIN_ENGINE_STATE,
  context: L13CapabilityContext.CHAT_ANSWER,
});
assert(explainClaim.allowed, 'C.15 explanation claim accepted');

// assertL13CapabilityClaim throws on denied.
let advisoryThrew = false;
try {
  assertL13CapabilityClaim({
    claimant: 'advisor',
    capability: L13AllowedCapability.ANSWER_USER_QUESTION,
    context: L13CapabilityContext.USER_REQUESTS_ADVICE,
  });
} catch (e) {
  advisoryThrew = e instanceof L13ConstitutionalError;
}
assert(advisoryThrew, 'C.16 advisor capability claim throws constitutional error');

// Forbidden actions registry covers all required actions.
assert(ALL_L13_FORBIDDEN_ACTIONS.length >= 25, 'C.17 forbidden action enum complete');
assert(L13_FORBIDDEN_ACTION_DEFINITIONS.length === ALL_L13_FORBIDDEN_ACTIONS.length, 'C.18 every forbidden action defined');

// Recommendation/prediction/rebuild forbidden actions are CRITICAL and blocking.
const criticalActions = getAllL13CriticalForbiddenActions();
assert(criticalActions.includes(L13ForbiddenAction.EMIT_BUY_INSTRUCTION), 'C.19 EMIT_BUY_INSTRUCTION critical');
assert(criticalActions.includes(L13ForbiddenAction.REBUILD_SCENARIO), 'C.20 REBUILD_SCENARIO critical');
assert(criticalActions.includes(L13ForbiddenAction.CLAIM_GUARANTEE), 'C.21 CLAIM_GUARANTEE critical');
assert(criticalActions.includes(L13ForbiddenAction.OUTPUT_UNGROUNDED_CLAIM), 'C.22 OUTPUT_UNGROUNDED_CLAIM critical');
const criticalDefs = criticalActions.map(a => getL13ForbiddenActionDefinition(a));
assert(
  criticalDefs.every(d => d.severity === L13ViolationSeverity.CRITICAL && d.blocking),
  'C.23 all critical actions are blocking',
);

// Forbidden semantic scanners catch leakage.
assert(detectL13RecommendationLeak('you should buy now'), 'C.24 buy-now leak detected');
assert(detectL13RecommendationLeak('go long here'), 'C.25 go-long leak detected');
assert(detectL13PredictionTheater('this is guaranteed'), 'C.26 guaranteed leak detected');
assert(detectL13PredictionTheater('will go up no doubt'), 'C.27 prediction theater detected');
assert(detectL13FinalJudgmentLeak('the winning scenario is base case'), 'C.28 final judgment leak detected');
assert(detectL13LowerLayerRebuildLanguage('classify regime locally'), 'C.29 regime classification leak detected');
assert(detectL13LowerLayerRebuildLanguage('compute score locally'), 'C.30 local score compute detected');
assert(detectL13MissingDataLaunderLanguage('full confidence, nothing is missing'), 'C.31 missing-data launder detected');

// Severity helper deterministic.
assert(
  severityForL13ViolationCode(L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK) === L13ViolationSeverity.CRITICAL,
  'C.32 buy/sell leak severity CRITICAL',
);
assert(
  severityForL13ViolationCode(L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER) === L13ViolationSeverity.CRITICAL,
  'C.33 prediction theater severity CRITICAL',
);
assert(
  severityForL13ViolationCode(L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO) === L13ViolationSeverity.CRITICAL,
  'C.34 rebuild scenario severity CRITICAL',
);
assert(
  severityForL13ViolationCode(L13ConstitutionalViolationCode.L13C_EVIDENCE_REFS_MISSING) === L13ViolationSeverity.ERROR,
  'C.35 missing evidence severity ERROR',
);
assert(
  isL13BlockingViolationCode(L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER),
  'C.36 prediction theater is blocking',
);
assert(
  isL13BlockingViolationCode(L13ConstitutionalViolationCode.L13C_EVIDENCE_REFS_MISSING),
  'C.37 missing evidence is blocking',
);
assert(
  !isL13BlockingViolationCode(L13ConstitutionalViolationCode.L13C_FORBIDDEN_NAMING),
  'C.38 naming-only violations not blocking',
);

// checkL13ForbiddenAction emits proper violation codes.
const buyCheck = checkL13ForbiddenAction({
  context: 'buy_writer',
  proposedDescription: 'this component emits a buy instruction when score is high',
  emittedText: 'you should buy now',
});
assert(!buyCheck.clean, 'C.39 buy-instruction component rejected');
assert(
  buyCheck.violations.some(v => v.violationCode === L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK),
  'C.40 buy-instruction emits L13C_BUY_SELL_HOLD_AVOID_LEAK',
);

const predictionCheck = checkL13ForbiddenAction({
  context: 'pred_writer',
  proposedDescription: 'this component predicts continuation',
  emittedText: 'btc will definitely go up, no doubt',
});
assert(
  predictionCheck.violations.some(v => v.violationCode === L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER),
  'C.41 prediction-theater emits L13C_PREDICTION_THEATER',
);

let assertNoForbiddenThrew = false;
try {
  assertL13NoForbiddenAction({
    context: 'buy_writer',
    emittedText: 'buy now',
  });
} catch (e) {
  assertNoForbiddenThrew = e instanceof L13ConstitutionalError;
}
assert(assertNoForbiddenThrew, 'C.42 assertL13NoForbiddenAction throws on critical leak');

// ═══════════════════════════════════════════════════════════════
// BAND D — Output Surface Law  (§13.1.16.D)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Output Surface Law ═══');
resetAll();

assert(ALL_L13_OUTPUT_SURFACE_CLASSES.length === 9, 'D.01 nine legal output classes');
assert(L13_OUTPUT_SURFACES.length === ALL_L13_OUTPUT_SURFACE_CLASSES.length, 'D.02 every class has registered surface');
for (const cls of ALL_L13_OUTPUT_SURFACE_CLASSES) {
  assert(
    L13_OUTPUT_SURFACES.some(s => s.outputClass === cls),
    `D.03 surface registered for ${cls}`,
  );
}

// Every output surface forbids trade/prediction/recommendation/final-judgment.
for (const s of L13_OUTPUT_SURFACES) {
  assert(s.mayContainTradeInstruction === false, `D.04 ${s.surfaceId} forbids trade instruction`);
  assert(s.mayContainPrediction === false, `D.05 ${s.surfaceId} forbids prediction`);
  assert(s.mayContainRecommendation === false, `D.06 ${s.surfaceId} forbids recommendation`);
  assert(s.mayContainFinalJudgment === false, `D.07 ${s.surfaceId} forbids final judgment`);
  assert(s.lineageRequired, `D.08 ${s.surfaceId} requires lineage`);
  assert(s.replaySafeRequired, `D.09 ${s.surfaceId} requires replay safety`);
  assert(s.l5PersistenceRequired, `D.10 ${s.surfaceId} requires L5 persistence`);
}

assert(getL13OutputsRequiringEvidence().length >= 6, 'D.11 evidence required for most outputs');
assert(getL13OutputsRequiringLineage().length === L13_OUTPUT_SURFACES.length, 'D.12 lineage required for every output');
assert(getL13OutputsRequiringConfidenceDisclosure().length >= 5, 'D.13 confidence disclosure required for explanation outputs');
assert(getL13OutputsRequiringRestrictionDisclosure().length >= 5, 'D.14 restriction disclosure required for explanation outputs');
assert(getL13OutputsRequiringL5Persistence().length === L13_OUTPUT_SURFACES.length, 'D.15 L5 persistence required for every output');

// validateL13OutputSemantics rejects every forbidden output class.
const forbiddenOutputClasses = [
  'TRADE_INSTRUCTION',
  'BUY_INSTRUCTION',
  'SELL_INSTRUCTION',
  'HOLD_INSTRUCTION',
  'AVOID_INSTRUCTION',
  'LEVERAGE_INSTRUCTION',
  'POSITION_SIZE_INSTRUCTION',
  'ENTRY_INSTRUCTION',
  'EXIT_INSTRUCTION',
  'PREDICTION',
  'GUARANTEED_OUTCOME',
  'CERTAIN_PATH',
  'INEVITABLE_PATH',
  'FINAL_JUDGMENT',
  'FINAL_VERDICT',
  'SCENARIO_WINNER',
  'WINNING_SCENARIO',
  'NEW_SCENARIO',
  'NEW_HYPOTHESIS',
  'LOCAL_SCORE',
  'SCORE_AS_RECOMMENDATION',
];
let allForbiddenRejected = true;
for (const cls of forbiddenOutputClasses) {
  const r = validateL13OutputSemantics(cls);
  if (r.valid) {
    allForbiddenRejected = false;
    failures.push(`forbidden class accepted: ${cls}`);
  }
}
assert(allForbiddenRejected, 'D.16 every forbidden output class rejected');
assert(isL13ForbiddenOutputClass('BUY_INSTRUCTION'), 'D.17 isL13ForbiddenOutputClass identifies BUY');
assert(!isL13LegalOutputClass('PREDICTION'), 'D.18 PREDICTION not legal');
assert(isL13LegalOutputClass(L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT), 'D.19 AI_EXPLANATION_OUTPUT legal');
assert(isL13RegisteredOutput('l13:ai_explanation_output'), 'D.20 ai_explanation_output registered');
assert(isL13RegisteredOutputClass(L13OutputSurfaceClass.AI_BLOCKED_OUTPUT), 'D.21 AI_BLOCKED_OUTPUT class registered');
assert(getL13OutputSurface('l13:ai_explanation_output')?.outputClass === L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT, 'D.22 lookup by surface id');

// Output emission rejects missing evidence/lineage/confidence/restrictions.
const noEvidence = validateL13OutputEmission({
  surfaceId: 'l13:ai_explanation_output',
  outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
  emitter: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  lineageFields: { run_id: 'run_1', component_ref: 'explainer', input_packs: 'pack_1' },
  hasEvidenceRefs: false,
  hasConfidenceDisclosure: true,
  hasRestrictionDisclosure: true,
  contradictionPresent: false,
  contradictionDisclosed: false,
  uncertaintyPresent: false,
  uncertaintyDisclosed: false,
  scenarioBeingExplained: false,
  triggerDisclosed: false,
  invalidationDisclosed: false,
  missingDataPresent: false,
  missingDataAcknowledged: false,
  replayHash: 'abc123',
  l5Route: 'l5:write/ai_explanation',
});
assert(!noEvidence.allowed, 'D.23 missing evidence rejected');

const noLineage = validateL13OutputEmission({
  surfaceId: 'l13:ai_explanation_output',
  outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
  emitter: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  lineageFields: {},
  hasEvidenceRefs: true,
  hasConfidenceDisclosure: true,
  hasRestrictionDisclosure: true,
  contradictionPresent: false,
  contradictionDisclosed: false,
  uncertaintyPresent: false,
  uncertaintyDisclosed: false,
  scenarioBeingExplained: false,
  triggerDisclosed: false,
  invalidationDisclosed: false,
  missingDataPresent: false,
  missingDataAcknowledged: false,
  replayHash: 'abc123',
  l5Route: 'l5:write/ai_explanation',
});
assert(!noLineage.allowed, 'D.24 missing lineage rejected');

const recOutput = validateL13OutputEmission({
  surfaceId: 'l13:ai_explanation_output',
  outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
  emitter: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  lineageFields: { run_id: 'r', component_ref: 'c', input_packs: 'p' },
  hasEvidenceRefs: true,
  hasConfidenceDisclosure: true,
  hasRestrictionDisclosure: true,
  contradictionPresent: false,
  contradictionDisclosed: false,
  uncertaintyPresent: false,
  uncertaintyDisclosed: false,
  scenarioBeingExplained: false,
  triggerDisclosed: false,
  invalidationDisclosed: false,
  missingDataPresent: false,
  missingDataAcknowledged: false,
  replayHash: 'h',
  l5Route: 'l5:write/x',
  emittedText: 'you should buy now',
});
assert(!recOutput.allowed, 'D.25 recommendation in emitted text rejected');

const predOutput = validateL13OutputEmission({
  surfaceId: 'l13:ai_explanation_output',
  outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
  emitter: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  lineageFields: { run_id: 'r', component_ref: 'c', input_packs: 'p' },
  hasEvidenceRefs: true,
  hasConfidenceDisclosure: true,
  hasRestrictionDisclosure: true,
  contradictionPresent: false,
  contradictionDisclosed: false,
  uncertaintyPresent: false,
  uncertaintyDisclosed: false,
  scenarioBeingExplained: false,
  triggerDisclosed: false,
  invalidationDisclosed: false,
  missingDataPresent: false,
  missingDataAcknowledged: false,
  replayHash: 'h',
  l5Route: 'l5:write/x',
  emittedText: 'this is guaranteed to go up',
});
assert(!predOutput.allowed, 'D.26 prediction theater in emitted text rejected');

const finalJudgmentOutput = validateL13OutputEmission({
  surfaceId: 'l13:ai_explanation_output',
  outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
  emitter: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  lineageFields: { run_id: 'r', component_ref: 'c', input_packs: 'p' },
  hasEvidenceRefs: true,
  hasConfidenceDisclosure: true,
  hasRestrictionDisclosure: true,
  contradictionPresent: false,
  contradictionDisclosed: false,
  uncertaintyPresent: false,
  uncertaintyDisclosed: false,
  scenarioBeingExplained: false,
  triggerDisclosed: false,
  invalidationDisclosed: false,
  missingDataPresent: false,
  missingDataAcknowledged: false,
  replayHash: 'h',
  l5Route: 'l5:write/x',
  emittedText: 'this is the answer, the winning scenario',
});
assert(!finalJudgmentOutput.allowed, 'D.27 final-judgment leak in emitted text rejected');

// Scenario without trigger/invalidation disclosure is rejected.
const scenarioMissing = validateL13OutputEmission({
  surfaceId: 'l13:ai_explanation_output',
  outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
  emitter: 'test',
  timestamp: '2026-05-09T00:00:00Z',
  lineageFields: { run_id: 'r', component_ref: 'c', input_packs: 'p' },
  hasEvidenceRefs: true,
  hasConfidenceDisclosure: true,
  hasRestrictionDisclosure: true,
  contradictionPresent: false,
  contradictionDisclosed: false,
  uncertaintyPresent: false,
  uncertaintyDisclosed: false,
  scenarioBeingExplained: true,
  triggerDisclosed: false,
  invalidationDisclosed: false,
  missingDataPresent: false,
  missingDataAcknowledged: false,
  replayHash: 'h',
  l5Route: 'l5:write/x',
});
assert(!scenarioMissing.allowed, 'D.28 scenario missing trigger/invalidation rejected');

// Allowed downstream consumers.
assert(
  isL13AllowedDownstreamConsumer('l13:ai_explanation_output', L13DownstreamConsumer.USER_FACING_DELIVERY),
  'D.29 user-facing delivery allowed',
);

// ═══════════════════════════════════════════════════════════════
// BAND E — Contradiction, Uncertainty, Confidence, Restrictions  (§13.1.16.E)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Contradiction, Uncertainty, Confidence, Restrictions ═══');
resetAll();

// Contradiction omission rejected.
assert(
  !validateL13ContradictionHandling({
    componentId: 'hider',
    contradictionPresent: true,
    contradictionDisclosed: false,
  }).valid,
  'E.01 contradiction omission rejected',
);
assert(
  validateL13ContradictionHandling({
    componentId: 'discloser',
    contradictionPresent: true,
    contradictionDisclosed: true,
  }).valid,
  'E.02 contradiction disclosure passes',
);
assert(
  validateL13ContradictionHandling({
    componentId: 'no_contra',
    contradictionPresent: false,
    contradictionDisclosed: false,
  }).valid,
  'E.03 no contradiction → no disclosure required',
);

// Active invalidation omission via scenario validator.
assert(
  !validateL13ScenarioHandling({
    componentId: 'no_inval',
    explainsScenario: true,
    triggerDisclosed: true,
    invalidationDisclosed: false,
    preservesAlternatives: true,
    callsWinner: false,
    treatsConfidenceAsProbability: false,
  }).valid,
  'E.04 invalidation omission rejected',
);

// Trigger omission rejected.
assert(
  !validateL13ScenarioHandling({
    componentId: 'no_trigger',
    explainsScenario: true,
    triggerDisclosed: false,
    invalidationDisclosed: true,
    preservesAlternatives: true,
    callsWinner: false,
    treatsConfidenceAsProbability: false,
  }).valid,
  'E.05 trigger omission rejected',
);

// Calling winner / treating confidence as probability rejected.
assert(
  !validateL13ScenarioHandling({
    componentId: 'winner_caller',
    explainsScenario: true,
    triggerDisclosed: true,
    invalidationDisclosed: true,
    preservesAlternatives: true,
    callsWinner: true,
    treatsConfidenceAsProbability: false,
  }).valid,
  'E.06 winner-call rejected',
);
assert(
  !validateL13ScenarioHandling({
    componentId: 'prob',
    explainsScenario: true,
    triggerDisclosed: true,
    invalidationDisclosed: true,
    preservesAlternatives: true,
    callsWinner: false,
    treatsConfidenceAsProbability: true,
  }).valid,
  'E.07 confidence-as-probability rejected',
);

// Missing-data laundering rejected via final-judgment validator.
assert(
  !validateL13FinalJudgmentBoundary({
    componentId: 'launder',
    text: 'data is complete and full confidence applies',
  }).valid,
  'E.08 missing-data laundering rejected',
);

// Drift omission via score validator.
assert(
  !validateL13ScoreHandling({
    componentId: 'no_drift',
    explainsScore: true,
    hasAttribution: true,
    hasMissingDataProfile: true,
    hasDriftStatus: false,
    scoreUsedAsRecommendation: false,
    scoreComputedLocally: false,
  }).valid,
  'E.09 drift omission rejected',
);
// Missing-data profile omission rejected.
assert(
  !validateL13ScoreHandling({
    componentId: 'no_missing',
    explainsScore: true,
    hasAttribution: true,
    hasMissingDataProfile: false,
    hasDriftStatus: true,
    scoreUsedAsRecommendation: false,
    scoreComputedLocally: false,
  }).valid,
  'E.10 missing-data profile omission rejected',
);
// Score used as recommendation rejected.
assert(
  !validateL13ScoreHandling({
    componentId: 'rec',
    explainsScore: true,
    hasAttribution: true,
    hasMissingDataProfile: true,
    hasDriftStatus: true,
    scoreUsedAsRecommendation: true,
    scoreComputedLocally: false,
  }).valid,
  'E.11 score-as-recommendation rejected',
);

// Confidence cap override rejected.
assert(
  !validateL13ConfidenceHandling({
    componentId: 'override',
    engineConfidenceCapped: true,
    aiOutputClaimsHigherConfidence: true,
    treatsConfidenceAsProbability: false,
  }).valid,
  'E.12 confidence cap override rejected',
);

// Restriction handling: every flag must be honoured.
assert(
  validateL13RestrictionHandling({
    componentId: 'ok',
    l7RestrictionHonoured: true,
    sequenceRestrictionHonoured: true,
    hypothesisRestrictionHonoured: true,
    scoreRestrictionHonoured: true,
    scenarioRestrictionHonoured: true,
  }).valid,
  'E.13 honoured restrictions pass',
);
assert(
  !validateL13RestrictionHandling({
    componentId: 'l7_bypass',
    l7RestrictionHonoured: false,
    sequenceRestrictionHonoured: true,
    hypothesisRestrictionHonoured: true,
    scoreRestrictionHonoured: true,
    scenarioRestrictionHonoured: true,
  }).valid,
  'E.14 L7 restriction bypass rejected',
);
assert(
  !validateL13RestrictionHandling({
    componentId: 'scenario_bypass',
    l7RestrictionHonoured: true,
    sequenceRestrictionHonoured: true,
    hypothesisRestrictionHonoured: true,
    scoreRestrictionHonoured: true,
    scenarioRestrictionHonoured: false,
  }).valid,
  'E.15 scenario restriction bypass rejected',
);

// No-rebuild validator catches all rebuild semantics.
const rebuildResult = validateL13NoRebuildLaw({
  componentId: 'rebuild',
  claimedBehaviors: [
    'rebuild scenario',
    'rebuild score',
    'rebuild hypothesis',
    'rebuild sequence',
    'rebuild regime',
    'create new scenario',
    'create new hypothesis',
    'compute score locally',
  ],
});
assert(!rebuildResult.valid, 'E.16 rebuild semantics rejected');
assert(rebuildResult.violations.length >= 8, 'E.17 every rebuild semantic flagged');

// No-invention validator catches ungrounded claims.
const inventionResult = validateL13NoInventionLaw({
  componentId: 'inventor',
  emittedClaims: ['whales accumulating heavily'],
  evidenceRefIndex: ['evidence:fund_flows'],
});
assert(!inventionResult.valid, 'E.18 ungrounded claim rejected');

const groundedResult = validateL13NoInventionLaw({
  componentId: 'grounded',
  emittedClaims: ['evidence:fund_flows shows partial coverage'],
  evidenceRefIndex: ['evidence:fund_flows'],
});
assert(groundedResult.valid, 'E.19 grounded claim accepted');

// Recommendation/prediction text validators catch every leak.
assert(!validateL13RecommendationBoundary({ componentId: 'r', text: 'go long' }).valid, 'E.20 go long rejected');
assert(!validateL13PredictionBoundary({ componentId: 'p', text: 'will dump' }).valid, 'E.21 will-dump rejected');

// Hypothesis collapse and final-truth call rejected.
assert(
  !validateL13HypothesisHandling({
    componentId: 'h',
    explainsHypothesis: true,
    preservesSpread: false,
    callsHypothesisFinalTruth: false,
    creatNewHypothesis: false,
  }).valid,
  'E.22 hypothesis spread collapse rejected',
);
assert(
  !validateL13HypothesisHandling({
    componentId: 'h2',
    explainsHypothesis: true,
    preservesSpread: true,
    callsHypothesisFinalTruth: true,
    creatNewHypothesis: false,
  }).valid,
  'E.23 hypothesis-as-final-truth rejected',
);

// Evidence grounding validator catches missing fields.
assert(
  !validateL13EvidenceGrounding({
    componentId: 'eg',
    hasEvidenceRefs: false,
    hasLineageRefs: true,
    hasReplayHash: true,
    hasConfidenceDisclosure: true,
    hasRestrictionDisclosure: true,
  }).valid,
  'E.24 missing evidence rejected by grounding validator',
);
assert(
  !validateL13EvidenceGrounding({
    componentId: 'eg2',
    hasEvidenceRefs: true,
    hasLineageRefs: false,
    hasReplayHash: true,
    hasConfidenceDisclosure: true,
    hasRestrictionDisclosure: true,
  }).valid,
  'E.25 missing lineage rejected by grounding validator',
);

// ═══════════════════════════════════════════════════════════════
// BAND F — Audit and Invariants  (§13.1.16.F)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Audit and Invariants ═══');
resetAll();

// Audit subject classes covered.
assert(ALL_L13_AUDIT_SUBJECT_CLASSES.length === 13, 'F.01 thirteen audit subject classes');

// Deterministic audit replay hash.
const a1 = emitL13AuditRecord({
  subjectClass: L13ConstitutionalAuditSubjectClass.OUTPUT_SEMANTICS,
  subjectRef: 'l13:ai_explanation_output',
  violationCode: L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
  message: 'detected buy-now leak',
  evidenceRefs: ['evidence:fund_flows'],
  lineageRefs: ['lineage:run_xyz'],
  createdAt: '2026-05-09T00:00:00Z',
});
const a2 = emitL13AuditRecord({
  subjectClass: L13ConstitutionalAuditSubjectClass.OUTPUT_SEMANTICS,
  subjectRef: 'l13:ai_explanation_output',
  violationCode: L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
  message: 'detected buy-now leak',
  evidenceRefs: ['evidence:fund_flows'],
  lineageRefs: ['lineage:run_xyz'],
  createdAt: '2026-05-09T00:00:00Z',
});
assert(a1.replay_hash === a2.replay_hash, 'F.02 deterministic replay hash');
assert(a1.audit_id === a2.audit_id, 'F.03 deterministic audit id');
assert(a1.severity === L13ViolationSeverity.CRITICAL, 'F.04 buy-now severity CRITICAL');
assert(a1.blocking, 'F.05 buy-now blocking');
assert(/^l13r\.audit\.[0-9a-f]{8}$/.test(a1.audit_id), 'F.06 audit id has correct shape');

// Different inputs → different hashes.
const a3 = emitL13AuditRecord({
  subjectClass: L13ConstitutionalAuditSubjectClass.OUTPUT_SEMANTICS,
  subjectRef: 'l13:ai_explanation_output',
  violationCode: L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER,
  message: 'detected guaranteed claim',
  createdAt: '2026-05-09T00:00:00Z',
});
assert(a3.replay_hash !== a1.replay_hash, 'F.07 different code → different hash');

// Audit log queries.
assert(hasAnyL13Violations(), 'F.08 audit log has violations');
assert(getL13ViolationCount() === 3, 'F.09 audit count exact');
assert(getL13CriticalViolations().length === 3, 'F.10 critical violations match');
assert(getL13ViolationsByCode(L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK).length === 2, 'F.11 query by code');
assert(
  getL13ViolationsBySubjectClass(L13ConstitutionalAuditSubjectClass.OUTPUT_SEMANTICS).length === 3,
  'F.12 query by subject class',
);
assert(getL13ConstitutionalAuditLog().length === 3, 'F.13 read full audit log');

resetL13ConstitutionalAuditLog();
assert(!hasAnyL13Violations(), 'F.14 audit log resettable');

// Run all invariants — every one must hold.
const invariantResults = runAllL13_1Invariants();
assert(invariantResults.length === 10, 'F.15 ten invariants present');
for (const r of invariantResults) {
  assert(r.holds, `F.16 ${r.id} holds — ${r.name}`);
  if (!r.holds) {
    failures.push(`${r.id} evidence: ${r.evidence}`);
  }
}

// Spot-check individual invariants — each runner is deterministic and matches.
assert(checkINV_131_A().holds === invariantResults[0]!.holds, 'F.17 INV-13.1-A deterministic');
assert(checkINV_131_B().holds === invariantResults[1]!.holds, 'F.18 INV-13.1-B deterministic');
assert(checkINV_131_C().holds === invariantResults[2]!.holds, 'F.19 INV-13.1-C deterministic');
assert(checkINV_131_D().holds === invariantResults[3]!.holds, 'F.20 INV-13.1-D deterministic');
assert(checkINV_131_E().holds === invariantResults[4]!.holds, 'F.21 INV-13.1-E deterministic');
assert(checkINV_131_F().holds === invariantResults[5]!.holds, 'F.22 INV-13.1-F deterministic');
assert(checkINV_131_G().holds === invariantResults[6]!.holds, 'F.23 INV-13.1-G deterministic');
assert(checkINV_131_H().holds === invariantResults[7]!.holds, 'F.24 INV-13.1-H deterministic');
assert(checkINV_131_I().holds === invariantResults[8]!.holds, 'F.25 INV-13.1-I deterministic');
assert(checkINV_131_J().holds === invariantResults[9]!.holds, 'F.26 INV-13.1-J deterministic');

// Sanity: violation code enum is comprehensive and disjoint.
assert(ALL_L13_VIOLATION_CODES.every(c => c.startsWith('L13C_')), 'F.27 all codes share L13C_ namespace');
assert(ALL_L13_VIOLATION_CODES.length >= 35, 'F.28 violation code namespace is rich');

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('L13.1 — Constitutional Position, Mission, and Boundary');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  passed: ${passed}`);
console.log(`  failed: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('  status: GREEN');

// reference unused exports to keep them part of the public surface
void ALL_L13_SUBJECT_CLASSES;
void ALL_L13_DEPENDENCY_LAYERS;
void L13DependencyLayer;
void L13DependencySurfaceClass;
void L13CapabilityGroup;
void getAllL13CapabilityGroups;
void getL13CapabilitiesForGroup;
void getL13DeniedCapabilities;
void getL13DependencySurface;
void getL13ForbiddenActionDefinition;
void getL13ForbiddenNamePatterns;
void getFullL13CapabilityMatrix;
void isL13CapabilityAllowed;
void assertL13DependencyAccess;
void assertL13OutputEmission;
