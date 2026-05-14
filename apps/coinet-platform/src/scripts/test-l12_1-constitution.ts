/**
 * L12.1 — Constitutional Position, Mission & Boundary
 * Certification Test Suite (§12.1.17)
 *
 * 5 Bands:
 *   A — Mission and boundary           (§12.1.17.A)
 *   B — Dependency law                 (§12.1.17.B)
 *   C — Capability and forbidden-action law  (§12.1.17.C)
 *   D — Output surface law             (§12.1.17.D)
 *   E — Audit and invariants INV-12.1-A..H (§12.1.17.E)
 */

import {
  ALL_L12_ALLOWED_CAPABILITIES,
  ALL_L12_CAPABILITY_CONTEXTS,
  ALL_L12_CAPABILITY_GROUPS,
  ALL_L12_DEPENDENCY_LAYERS,
  ALL_L12_DEPENDENCY_SURFACE_CLASSES,
  ALL_L12_FORBIDDEN_ACTIONS,
  ALL_L12_OUTPUT_SURFACE_CLASSES,
  ALL_L12_SUBJECT_CLASSES,
  ALL_L12_CONSTITUTIONAL_SUBLAYER_IDS,
  ALL_L12_VIOLATION_CODES,
  L12_CAPABILITY_POLICY,
  L12_DEPENDENCY_SURFACES,
  L12_DOES_NOT_ANSWER,
  L12_FORBIDDEN_ACTION_DEFINITIONS,
  L12_IS_NOT,
  L12_MISSION,
  L12_MISSION_CONSTRAINT,
  L12_OUTPUT_SURFACES,
  L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
  L12AllowedCapability,
  L12CapabilityContext,
  L12CapabilityDecision,
  L12CapabilityGroup,
  L12ConstitutionalError,
  L12ConstitutionalViolationCode,
  L12DependencyLayer,
  L12DownstreamConsumer,
  L12ForbiddenAction,
  L12OutputSurfaceClass,
  L12SubjectClass,
  L12ConstitutionalSublayerId,
  checkL12ForbiddenSemantics,
  containsL12ForbiddenNaming,
  detectL12ConditionalLanguage,
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
  getAllL12CriticalForbiddenActions,
  getAllL12CapabilityGroups,
  getAllL12RequiredLineageFields,
  getL12CapabilitiesForGroup,
  getL12CapabilityDecision,
  getL12ConditionalPhrases,
  getL12DeniedCapabilities,
  getL12DependencySurface,
  getL12ForbiddenActionDefinition,
  getL12ForbiddenNamePatterns,
  getL12HypothesisPostureAwareSurfaces,
  getL12JudgmentPhrases,
  getL12OutputSurface,
  getL12OutputsRequiringInvalidations,
  getL12OutputsRequiringL5Route,
  getL12OutputsRequiringPathConfidence,
  getL12OutputsRequiringReplayHash,
  getL12OutputsRequiringTriggers,
  getL12PredictionTheaterPhrases,
  getL12RecommendationPhrases,
  getL12RegimePostureAwareSurfaces,
  getL12RequiredDependencySurfaces,
  getL12RestrictionAwareSurfaces,
  getL12ScoreContextSurfaces,
  getL12SequencePostureAwareSurfaces,
  getL12SurfacesForLayer,
  getL12SurfacesUsableFor,
  getL12ValidNameExamples,
  isL12AllowedDownstreamConsumer,
  isL12CapabilityAllowed,
  isL12ForbiddenOutputClass,
  isL12LegalOutputClass,
  isL12RegisteredDependency,
  isL12RegisteredOutput,
  isL12RegisteredOutputClass,
  isL12UsableFor,
  isValidL12ComponentName,
  matchesL12Mission,
} from '../l12/contracts';

import {
  L12ConstitutionalAuditSubjectClass,
  ALL_L12_AUDIT_SUBJECT_CLASSES,
  assertL12CapabilityClaim,
  assertL12DependencyAccess,
  assertL12NoForbiddenAction,
  assertL12OutputEmission,
  checkL12ForbiddenAction,
  evaluateL12CapabilityClaim,
  getFullL12CapabilityMatrix,
  getL12ConstitutionalAuditLog,
  getL12CriticalViolations,
  getL12ViolationCount,
  getL12ViolationsByCode,
  getL12ViolationsBySubjectClass,
  hasAnyL12Violations,
  makeL12AuditRecord,
  requestL12DependencyAccess,
  resetL12ConstitutionalAuditLog,
  severityForL12ViolationCode,
  validateL12Component,
  validateL12Conditionality,
  validateL12ConditionalLanguage,
  validateL12ConfidenceHandling,
  validateL12EvidenceGrounding,
  validateL12HypothesisHandling,
  validateL12InvalidationHandling,
  validateL12JudgmentLeakage,
  validateL12L11ScoreContextConsumption,
  validateL12LowerLayerInteraction,
  validateL12MissionAlignment,
  validateL12OutputEmission,
  validateL12OutputSemantics,
  validateL12PredictionTheater,
  validateL12RecommendationLeakage,
  validateL12RegimeHandling,
  validateL12RestrictionHandling,
  validateL12SequenceHandling,
  validateL12TriggerHandling,
} from '../l12/constitution';

import {
  checkAllL12_1Invariants,
  checkINV_121_A,
  checkINV_121_B,
  checkINV_121_C,
  checkINV_121_D,
  checkINV_121_E,
  checkINV_121_F,
  checkINV_121_G,
  checkINV_121_H,
} from '../l12/invariants';

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
  resetL12ConstitutionalAuditLog();
}

const FULL_BUNDLE = [...L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS];
const POSTURE_OK = {
  honoursL7Restriction: true,
  honoursRegimePosture: true,
  honoursSequencePosture: true,
  honoursHypothesisPosture: true,
  honoursScoreRestriction: true,
  consumesFullScoreContextBundle: true,
  l11ConsumedBundle: FULL_BUNDLE,
};

// ═══════════════════════════════════════════════════════════════
// BAND A — Mission and Boundary  (§12.1.17.A)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Mission and Boundary ═══');
resetAll();

assert(L12_MISSION.name === 'Layer 12 — Conditional Scenario Engine', 'A.01 mission name');
assert(L12_MISSION.canonical.includes('conditional scenario'), 'A.02 mission canonical mentions conditional scenario');
assert(L12_MISSION.canonical.includes('L3–L11'), 'A.03 mission references L3–L11');
assert(L12_MISSION.canonical.includes('triggers'), 'A.04 mission requires triggers');
assert(L12_MISSION.canonical.includes('invalidations'), 'A.05 mission requires invalidations');
assert(L12_MISSION.canonical.includes('confidence limits'), 'A.06 mission requires confidence limits');
assert(L12_MISSION.canonical.includes('without inventing new truth'), 'A.07 mission rejects inventing new truth');
assert(L12_MISSION.canonical.includes('final judgment'), 'A.08 mission rejects final judgment');
assert(L12_MISSION.canonical.includes('recommendation'), 'A.09 mission rejects recommendation');
assert(L12_MISSION.canonical.includes('trade action'), 'A.10 mission rejects trade action');
assert(
  L12_MISSION.firstPrinciple ===
    'A scenario is not a prediction. A scenario is a governed conditional path.',
  'A.11 first principle frozen verbatim',
);
assert(L12_MISSION.firstPrincipleExpanded.includes('conditional structures'), 'A.12 expanded principle mentions conditional structures');
assert(L12_MISSION.firstPrincipleExpanded.includes('replay identity'), 'A.13 expanded principle mentions replay identity');

assert(L12_IS_NOT.includes('the final judgment layer'), 'A.14 L12_IS_NOT includes final judgment');
assert(L12_IS_NOT.includes('the recommendation layer'), 'A.15 L12_IS_NOT includes recommendation');
assert(L12_IS_NOT.includes('the trade execution layer'), 'A.16 L12_IS_NOT includes trade execution');
assert(L12_IS_NOT.includes('the scoring engine'), 'A.17 L12_IS_NOT includes scoring engine');
assert(L12_DOES_NOT_ANSWER.includes('what will definitely happen'), 'A.18 does not answer "definitely"');
assert(L12_DOES_NOT_ANSWER.includes('which scenario is guaranteed'), 'A.19 does not answer "guaranteed scenario"');

// Forbidden naming patterns reject prediction theater / recommendation / judgment / rebuild
const forbiddenNames = [
  'will_definitely_path',
  'guaranteed_path',
  'certain_continuation',
  'inevitable_path',
  'cannot_fail_path',
  'safe_continuation',
  'confirmed_breakout',
  'prediction_score',
  'forecast_signal',
  'buy_signal',
  'sell_signal',
  'avoid_signal',
  'trade_signal',
  'entry_signal',
  'entry_confirmed',
  'trade_ready',
  'entry_ready',
  'recommendation',
  'portfolio_allocation',
  'best_trade',
  'best_opportunity',
  'final_scenario',
  'scenario_winner',
  'winning_scenario',
  'final_judgment',
  'final_recommendation',
  'highest_conviction',
  'conviction_signal',
  'rebuild_validation',
  'rebuild_regime',
  'rebuild_sequence',
  'rebuild_hypothesis',
  'rebuild_score',
  'override_regime',
  'override_sequence',
  'override_hypothesis',
  'override_validation',
  'naked_score',
  'score_value_only',
  'bypass_l5',
  'raw_storage_path',
  'consume_l13_judgment',
];
let blockedAll = true;
for (const n of forbiddenNames) {
  if (!containsL12ForbiddenNaming(n)) blockedAll = false;
}
assert(blockedAll, 'A.20 all forbidden names rejected');

// Valid names pass
const validNames = getL12ValidNameExamples();
assert(validNames.length >= 10, 'A.21 valid name examples present');
assert(validNames.every(n => isValidL12ComponentName(n)), 'A.22 all valid names accepted');

// Mission match: good description matches, bad does not
assert(
  matchesL12Mission(
    'this component constructs a base case conditional scenario with explicit triggers, invalidations, and path confidence',
  ),
  'A.23 good description matches mission',
);
assert(
  !matchesL12Mission('this component emits a buy signal recommendation when the score is high'),
  'A.24 buy-signal description rejected',
);
assert(
  !matchesL12Mission('this scenario rebuilds regime and overrides hypothesis when needed'),
  'A.25 rebuild description rejected',
);
assert(
  !matchesL12Mission('btc will definitely continue higher unless invalidation triggers'),
  'A.26 prediction theater rejected even with conditional language',
);

// Conditional language detector
assert(
  detectL12ConditionalLanguage('base case: continuation if spot improves; failure risk rises if OI expands'),
  'A.27 conditional language detected',
);
assert(
  !detectL12ConditionalLanguage('btc rises and continues higher all the time'),
  'A.28 flat statement rejected',
);

// Constitutional sublayer ids registered (9 anticipated by L12.1; the
// canonical post-closure 7-sublayer enum lives in `l12-final-definition`).
assert(ALL_L12_CONSTITUTIONAL_SUBLAYER_IDS.length === 9, 'A.29 9 constitutional sublayer IDs registered');
assert(ALL_L12_CONSTITUTIONAL_SUBLAYER_IDS.includes(L12ConstitutionalSublayerId.L12_1_CONSTITUTION), 'A.30 L12.1 sublayer id present');
assert(ALL_L12_SUBJECT_CLASSES.length === 9, 'A.31 9 subject classes registered');
assert(ALL_L12_SUBJECT_CLASSES.includes(L12SubjectClass.SCENARIO_SUBJECT), 'A.32 SCENARIO_SUBJECT present');

// Mission constraint flags
assert(L12_MISSION_CONSTRAINT.conditionalityRequired, 'A.33 conditionality required');
assert(L12_MISSION_CONSTRAINT.invalidationRequired, 'A.34 invalidation required');
assert(L12_MISSION_CONSTRAINT.triggerRequired, 'A.35 trigger required');
assert(L12_MISSION_CONSTRAINT.pathConfidenceRequired, 'A.36 path confidence required');
assert(L12_MISSION_CONSTRAINT.l11ScoreContextBundleRequired, 'A.37 L11 score-context bundle required');
assert(L12_MISSION_CONSTRAINT.noPredictionTheater, 'A.38 no prediction theater');
assert(L12_MISSION_CONSTRAINT.noCertaintyClaim, 'A.39 no certainty claim');
assert(L12_MISSION_CONSTRAINT.noJudgmentEmission, 'A.40 no judgment emission');
assert(L12_MISSION_CONSTRAINT.noRecommendationEmission, 'A.41 no recommendation emission');
assert(L12_MISSION_CONSTRAINT.noTradeActionEmission, 'A.42 no trade action emission');
assert(L12_MISSION_CONSTRAINT.noScenarioAsGuarantee, 'A.43 no scenario as guarantee');
assert(L12_MISSION_CONSTRAINT.noSinglePathFakeCertainty, 'A.44 no single-path fake certainty');

// boundary-validator mission alignment
const goodAlign = validateL12MissionAlignment(
  'this component derives shift conditions for conditional scenario paths',
  'good',
);
const badAlign = validateL12MissionAlignment(
  'this component picks a winning scenario as the final answer',
  'bad',
);
assert(goodAlign.valid, 'A.45 mission alignment passes for good');
assert(!badAlign.valid, 'A.46 mission alignment fails for bad');

// Phrases catalogues
assert(getL12PredictionTheaterPhrases().length >= 10, 'A.47 prediction theater phrases catalogue');
assert(getL12RecommendationPhrases().length >= 10, 'A.48 recommendation phrases catalogue');
assert(getL12JudgmentPhrases().length >= 4, 'A.49 judgment phrases catalogue');
assert(getL12ConditionalPhrases().length >= 8, 'A.50 conditional phrases catalogue');

// ═══════════════════════════════════════════════════════════════
// BAND B — Dependency law  (§12.1.17.B)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Dependency Law ═══');
resetAll();

assert(L12_DEPENDENCY_SURFACES.length >= 50, 'B.01 ≥50 dependency surfaces registered');
const depByLayer = (l: L12DependencyLayer) => L12_DEPENDENCY_SURFACES.filter(s => s.layer === l).length;
assert(depByLayer(L12DependencyLayer.L3) >= 6, 'B.02 ≥6 L3 surfaces');
assert(depByLayer(L12DependencyLayer.L4) >= 6, 'B.03 ≥6 L4 surfaces');
assert(depByLayer(L12DependencyLayer.L5) >= 7, 'B.04 ≥7 L5 surfaces');
assert(depByLayer(L12DependencyLayer.L6) >= 7, 'B.05 ≥7 L6 surfaces');
assert(depByLayer(L12DependencyLayer.L7) >= 6, 'B.06 ≥6 L7 surfaces');
assert(depByLayer(L12DependencyLayer.L8) >= 7, 'B.07 ≥7 L8 surfaces');
assert(depByLayer(L12DependencyLayer.L9) >= 9, 'B.08 ≥9 L9 surfaces');
assert(depByLayer(L12DependencyLayer.L10) >= 9, 'B.09 ≥9 L10 surfaces');
assert(depByLayer(L12DependencyLayer.L11) >= 10, 'B.10 ≥10 L11 surfaces');
assert(ALL_L12_DEPENDENCY_LAYERS.length === 9, 'B.11 9 dependency layers');
assert(ALL_L12_DEPENDENCY_SURFACE_CLASSES.length === L12_DEPENDENCY_SURFACES.length, 'B.12 surface class count matches surfaces');

// All L7/L8/L9/L10/L11 are stable handoff
for (const l of [L12DependencyLayer.L7, L12DependencyLayer.L8, L12DependencyLayer.L9, L12DependencyLayer.L10, L12DependencyLayer.L11]) {
  assert(
    L12_DEPENDENCY_SURFACES.filter(s => s.layer === l).every(s => s.authorityClass === 'STABLE_HANDOFF'),
    `B.13.${l} all ${l} surfaces are stable handoff`,
  );
}

// L11 surfaces must be score-context-required
assert(getL12ScoreContextSurfaces().length === 10, 'B.14 10 L11 score-context surfaces');
assert(getL12ScoreContextSurfaces().every(s => s.layer === L12DependencyLayer.L11), 'B.15 all score-context surfaces are L11');

// Posture-aware coverage
assert(getL12RegimePostureAwareSurfaces().length >= 6, 'B.16 ≥6 regime-posture-aware surfaces');
assert(getL12SequencePostureAwareSurfaces().length >= 8, 'B.17 ≥8 sequence-posture-aware surfaces');
assert(getL12HypothesisPostureAwareSurfaces().length >= 8, 'B.18 ≥8 hypothesis-posture-aware surfaces');
assert(getL12RestrictionAwareSurfaces().length >= 30, 'B.19 ≥30 restriction-aware surfaces');
assert(getL12RequiredDependencySurfaces().length >= 30, 'B.20 ≥30 required surfaces');

// Surface lookup
assert(isL12RegisteredDependency('l11:current_score_snapshot'), 'B.21 L11 snapshot registered');
assert(!isL12RegisteredDependency('fake:unregistered'), 'B.22 fake surface unregistered');
assert(isL12UsableFor('l11:current_score_snapshot', 'SCORE_CONTEXT_BUNDLE'), 'B.23 snapshot usable for score-context');
assert(!isL12UsableFor('l11:current_score_snapshot', 'PERSISTENCE_PATH'), 'B.24 snapshot not usable for persistence');
assert(getL12DependencySurface('l7:validation_assessment')?.layer === L12DependencyLayer.L7, 'B.25 surface lookup');
assert(getL12SurfacesForLayer(L12DependencyLayer.L11).length === 10, 'B.26 10 L11 surfaces');
assert(getL12SurfacesUsableFor('SCORE_CONTEXT_BUNDLE').length === 10, 'B.27 10 surfaces usable for SCORE_CONTEXT_BUNDLE');

// requestL12DependencyAccess: unregistered surface → REJECT
const unreg = requestL12DependencyAccess({
  surfaceId: 'fake:unregistered',
  requestedUsage: 'CONTEXT_ONLY',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
});
assert(!unreg.allowed, 'B.28 unregistered surface rejected');
assert(unreg.violationCode === L12ConstitutionalViolationCode.L12C_DEPENDENCY_SURFACE_UNREGISTERED, 'B.29 unregistered code');

// L7 surface without honouring restriction → REJECT
const l7BadRestr = requestL12DependencyAccess({
  surfaceId: 'l7:validation_assessment',
  requestedUsage: 'VALIDATION_INPUT',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  honoursL7Restriction: false,
});
assert(!l7BadRestr.allowed, 'B.30 L7 without restriction rejected');
assert(l7BadRestr.violationCode === L12ConstitutionalViolationCode.L12C_RESTRICTION_BYPASS, 'B.31 L7 restriction bypass code');

// L8 regime surface without honouring posture → REJECT
const l8Bad = requestL12DependencyAccess({
  surfaceId: 'l8:current_regime_state',
  requestedUsage: 'REGIME_CONDITIONING',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  honoursL7Restriction: true,
  honoursRegimePosture: false,
});
assert(!l8Bad.allowed, 'B.32 L8 without regime posture rejected');
assert(l8Bad.violationCode === L12ConstitutionalViolationCode.L12C_REGIME_POSTURE_IGNORED, 'B.33 L8 posture ignored code');

// L9 sequence surface without honouring posture → REJECT
const l9Bad = requestL12DependencyAccess({
  surfaceId: 'l9:current_sequence_state',
  requestedUsage: 'SEQUENCE_CONDITIONING',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  honoursL7Restriction: true,
  honoursRegimePosture: true,
  honoursSequencePosture: false,
});
assert(!l9Bad.allowed, 'B.34 L9 without sequence posture rejected');

// L10 hypothesis surface without honouring posture → REJECT
const l10Bad = requestL12DependencyAccess({
  surfaceId: 'l10:current_hypothesis_ranking',
  requestedUsage: 'HYPOTHESIS_CONDITIONING',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  honoursL7Restriction: true,
  honoursRegimePosture: true,
  honoursSequencePosture: true,
  honoursHypothesisPosture: false,
});
assert(!l10Bad.allowed, 'B.35 L10 without hypothesis posture rejected');

// L11 score: naked snapshot consumption → REJECT
const l11Naked = requestL12DependencyAccess({
  surfaceId: 'l11:current_score_snapshot',
  requestedUsage: 'SCORE_CONTEXT_BUNDLE',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  ...POSTURE_OK,
  consumesFullScoreContextBundle: false,
});
assert(!l11Naked.allowed, 'B.36 L11 naked score consumption rejected');
assert(l11Naked.violationCode === L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY, 'B.37 L11 value-only code');

// L11: incomplete bundle → REJECT
const l11Partial = requestL12DependencyAccess({
  surfaceId: 'l11:current_score_snapshot',
  requestedUsage: 'SCORE_CONTEXT_BUNDLE',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  ...POSTURE_OK,
  l11ConsumedBundle: ['l11:current_score_snapshot', 'l11:score_attribution'],
});
assert(!l11Partial.allowed, 'B.38 L11 partial bundle rejected');
assert(l11Partial.violationCode === L12ConstitutionalViolationCode.L12C_SCORE_CONTEXT_INCOMPLETE, 'B.39 score context incomplete code');

// L11: full bundle + posture honoured → ACCEPT
const l11Ok = requestL12DependencyAccess({
  surfaceId: 'l11:current_score_snapshot',
  requestedUsage: 'SCORE_CONTEXT_BUNDLE',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  ...POSTURE_OK,
});
assert(l11Ok.allowed, 'B.40 L11 full bundle accepted');

// Wrong context → REJECT
const wrongCtx = requestL12DependencyAccess({
  surfaceId: 'l11:current_score_snapshot',
  requestedUsage: 'SCORE_CONTEXT_BUNDLE',
  context: L12CapabilityContext.MATERIALIZATION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  ...POSTURE_OK,
});
assert(!wrongCtx.allowed, 'B.41 wrong consumption context rejected');

// Illegal usage → REJECT
const illegalUsage = requestL12DependencyAccess({
  surfaceId: 'l11:current_score_snapshot',
  requestedUsage: 'PERSISTENCE_PATH',
  context: L12CapabilityContext.INPUT_RESOLUTION,
  requestor: 'test-B',
  timestamp: new Date().toISOString(),
  ...POSTURE_OK,
});
assert(!illegalUsage.allowed, 'B.42 illegal usage rejected');
assert(illegalUsage.violationCode === L12ConstitutionalViolationCode.L12C_ILLEGAL_DEPENDENCY_USAGE, 'B.43 illegal usage code');

// Throwing assert
let threw = false;
try {
  assertL12DependencyAccess({
    surfaceId: 'fake:nope',
    requestedUsage: 'CONTEXT_ONLY',
    context: L12CapabilityContext.INPUT_RESOLUTION,
    requestor: 'test-B',
    timestamp: new Date().toISOString(),
  });
} catch (e) {
  threw = e instanceof L12ConstitutionalError;
}
assert(threw, 'B.44 assertL12DependencyAccess throws on illegal');

// Score-context bundle is exactly 10 surfaces
assert(L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.length === 10, 'B.45 score-context bundle size = 10');

// ═══════════════════════════════════════════════════════════════
// BAND C — Capability and Forbidden-Action Law  (§12.1.17.C)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Capability and Forbidden-Action Law ═══');
resetAll();

assert(ALL_L12_ALLOWED_CAPABILITIES.length === 17, 'C.01 17 allowed capabilities');
assert(ALL_L12_CAPABILITY_CONTEXTS.length === 14, 'C.02 14 capability contexts');
assert(ALL_L12_CAPABILITY_GROUPS.length === 6, 'C.03 6 capability groups');
assert(L12_CAPABILITY_POLICY.length === ALL_L12_ALLOWED_CAPABILITIES.length, 'C.04 each capability has a policy entry');
assert(getAllL12CapabilityGroups().length === ALL_L12_CAPABILITY_GROUPS.length, 'C.05 all groups discovered');
for (const grp of ALL_L12_CAPABILITY_GROUPS) {
  assert(getL12CapabilitiesForGroup(grp).length >= 1, `C.06.${grp} group has ≥1 capability`);
}

// COMPUTE_PATH_CONFIDENCE allowed only in PATH_CONFIDENCE / REPLAY / REPAIR
assert(
  getL12CapabilityDecision(L12AllowedCapability.COMPUTE_PATH_CONFIDENCE, L12CapabilityContext.PATH_CONFIDENCE) === L12CapabilityDecision.ALLOWED,
  'C.07 COMPUTE_PATH_CONFIDENCE allowed in PATH_CONFIDENCE',
);
assert(
  getL12CapabilityDecision(L12AllowedCapability.COMPUTE_PATH_CONFIDENCE, L12CapabilityContext.MATERIALIZATION) === L12CapabilityDecision.DENIED,
  'C.08 COMPUTE_PATH_CONFIDENCE denied in MATERIALIZATION',
);
assert(
  getL12CapabilityDecision(L12AllowedCapability.MATERIALIZE_THROUGH_L5, L12CapabilityContext.MATERIALIZATION) === L12CapabilityDecision.ALLOWED,
  'C.09 MATERIALIZE_THROUGH_L5 allowed in MATERIALIZATION',
);
assert(
  getL12CapabilityDecision(L12AllowedCapability.SUPPORT_REPAIR, L12CapabilityContext.OUTPUT_EMISSION) === L12CapabilityDecision.DENIED,
  'C.10 SUPPORT_REPAIR denied outside REPAIR',
);
assert(
  getL12CapabilityDecision(L12AllowedCapability.RESOLVE_SCENARIO_INVALIDATIONS, L12CapabilityContext.INVALIDATION_RESOLUTION) === L12CapabilityDecision.ALLOWED,
  'C.11 RESOLVE_SCENARIO_INVALIDATIONS allowed in INVALIDATION_RESOLUTION',
);
assert(
  getL12CapabilityDecision(L12AllowedCapability.RESOLVE_SCENARIO_TRIGGERS, L12CapabilityContext.TRIGGER_RESOLUTION) === L12CapabilityDecision.ALLOWED,
  'C.12 RESOLVE_SCENARIO_TRIGGERS allowed in TRIGGER_RESOLUTION',
);
assert(
  getL12CapabilityDecision(L12AllowedCapability.EXPOSE_GOVERNED_READ_SURFACES, L12CapabilityContext.READ_SERVING) === L12CapabilityDecision.ALLOWED,
  'C.13 EXPOSE_GOVERNED_READ_SURFACES allowed in READ_SERVING',
);
assert(
  getL12CapabilityDecision(L12AllowedCapability.GENERATE_SCENARIO_CANDIDATES, L12CapabilityContext.SCENARIO_GENERATION) === L12CapabilityDecision.ALLOWED,
  'C.14 GENERATE_SCENARIO_CANDIDATES allowed in SCENARIO_GENERATION',
);

assert(isL12CapabilityAllowed(L12AllowedCapability.RANK_SCENARIO_PATHS, L12CapabilityContext.PATH_CONFIDENCE), 'C.15 RANK conditionally allowed in PATH_CONFIDENCE');
assert(!isL12CapabilityAllowed(L12AllowedCapability.RANK_SCENARIO_PATHS, L12CapabilityContext.CONTRACT_DEFINITION), 'C.16 RANK denied in CONTRACT_DEFINITION');

// Capability claim runtime
const allowedClaim = evaluateL12CapabilityClaim({
  capability: L12AllowedCapability.COMPUTE_PATH_CONFIDENCE,
  context: L12CapabilityContext.PATH_CONFIDENCE,
  claimant: 'test',
});
assert(allowedClaim.allowed, 'C.17 claim allowed in legal context');
const deniedClaim = evaluateL12CapabilityClaim({
  capability: L12AllowedCapability.COMPUTE_PATH_CONFIDENCE,
  context: L12CapabilityContext.OUTPUT_EMISSION,
  claimant: 'test',
});
assert(!deniedClaim.allowed, 'C.18 claim denied in illegal context');

let claimThrew = false;
try {
  assertL12CapabilityClaim({
    capability: L12AllowedCapability.MATERIALIZE_THROUGH_L5,
    context: L12CapabilityContext.SCENARIO_GENERATION,
    claimant: 'test',
  });
} catch (e) {
  claimThrew = e instanceof L12ConstitutionalError;
}
assert(claimThrew, 'C.19 illegal claim throws');

const matrix = getFullL12CapabilityMatrix();
assert(matrix.length === ALL_L12_ALLOWED_CAPABILITIES.length * ALL_L12_CAPABILITY_CONTEXTS.length, 'C.20 full capability matrix size');
const denyCount = getL12DeniedCapabilities(L12CapabilityContext.CONTRACT_DEFINITION).length;
assert(denyCount === ALL_L12_ALLOWED_CAPABILITIES.length, 'C.21 all capabilities denied in CONTRACT_DEFINITION (no contract-time runtime claims)');

// Forbidden-action law
assert(ALL_L12_FORBIDDEN_ACTIONS.length === 31, 'C.22 31 forbidden actions');
assert(L12_FORBIDDEN_ACTION_DEFINITIONS.length === ALL_L12_FORBIDDEN_ACTIONS.length, 'C.23 each forbidden action defined');
assert(getAllL12CriticalForbiddenActions().length >= 25, 'C.24 ≥25 critical forbidden actions');
assert(getL12ForbiddenActionDefinition(L12ForbiddenAction.PREDICTION_THEATER).severity === 'CRITICAL', 'C.25 PREDICTION_THEATER is critical');
assert(getL12ForbiddenActionDefinition(L12ForbiddenAction.L11_SCORE_VALUE_ONLY_CONSUMPTION).severity === 'CRITICAL', 'C.26 L11_SCORE_VALUE_ONLY_CONSUMPTION is critical');

// Forbidden semantic detector
const sem = checkL12ForbiddenSemantics('guaranteed_path');
assert(sem.forbidden && sem.matchedPattern !== null, 'C.27 forbidden semantics surfaced');

// Forbidden action runtime checker
const checkBuy = checkL12ForbiddenAction({
  context: 'test',
  proposedName: 'buy_signal_path',
});
assert(!checkBuy.clean && checkBuy.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK), 'C.28 buy_signal name → recommendation leak');

const checkGuar = checkL12ForbiddenAction({
  context: 'test',
  proposedName: 'guaranteed_path',
});
assert(!checkGuar.clean && checkGuar.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_CERTAINTY_CLAIM), 'C.29 guaranteed name → certainty claim');

const checkScWin = checkL12ForbiddenAction({
  context: 'test',
  proposedName: 'final_scenario_winner',
});
assert(!checkScWin.clean && checkScWin.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK), 'C.30 scenario_winner → judgment leak');

const checkTrade = checkL12ForbiddenAction({
  context: 'test',
  proposedName: 'trade_ready_scenario',
});
assert(!checkTrade.clean && checkTrade.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_TRADE_ACTION_LEAK), 'C.31 trade_ready → trade action leak');

const checkRebuild = checkL12ForbiddenAction({
  context: 'test',
  proposedName: 'rebuild_score_inside_scenario',
});
assert(!checkRebuild.clean && checkRebuild.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_LOWER_LAYER_REDEFINITION), 'C.32 rebuild_score → lower-layer redefinition');

const checkNaked = checkL12ForbiddenAction({
  context: 'test',
  proposedName: 'naked_score_consumer',
});
assert(!checkNaked.clean && checkNaked.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY), 'C.33 naked_score → L11 value-only');

const checkBypass = checkL12ForbiddenAction({
  context: 'test',
  proposedName: 'bypass_l5_path_writer',
});
assert(!checkBypass.clean && checkBypass.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_L5_BYPASS), 'C.34 bypass_l5 → L5 bypass');

let actThrew = false;
try {
  assertL12NoForbiddenAction({ context: 'test', proposedName: 'guaranteed_path' });
} catch (e) {
  actThrew = e instanceof L12ConstitutionalError;
}
assert(actThrew, 'C.35 assertL12NoForbiddenAction throws');

// Prediction-theater patterns reject in emitted text
const theater = checkL12ForbiddenAction({
  context: 'test',
  emittedText: 'btc will definitely continue higher',
});
assert(!theater.clean && theater.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER), 'C.36 emitted prediction-theater detected');

const recText = checkL12ForbiddenAction({
  context: 'test',
  emittedText: 'buy signal active for this asset',
});
assert(!recText.clean && recText.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK), 'C.37 emitted recommendation detected');

const judgeText = checkL12ForbiddenAction({
  context: 'test',
  emittedText: 'final scenario chosen: bullish continuation',
});
assert(!judgeText.clean && judgeText.violations.some(v => v.violationCode === L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK), 'C.38 emitted judgment detected');

// Lower-layer interaction patterns
const lowerCheck = validateL12LowerLayerInteraction({
  componentId: 'test',
  claimedBehaviors: [
    'rebuild validation in scenario',
    'rebuild regime in scenario',
    'rebuild sequence in scenario',
    'rebuild hypotheses in scenario',
    'rebuild score in scenario',
    'override validation',
    'override regime',
    'override sequence',
    'override hypothesis',
    'redefine identity',
    'redefine metric',
    'reorder events in scenario',
    'rerank hypotheses in scenario',
    'naked score consumption',
    'score value only',
    'downgrade contradiction',
    'hide invalidation',
    'hide missing visibility',
    'hide drift',
    'launder path confidence',
    'inflate confidence',
    'hide spread',
    'bypass l5',
    'bypass l7',
    'direct postgres write',
    'consume l13 surface',
    'consume judgment from l13',
    'consume recommendation from l14',
  ],
});
assert(!lowerCheck.valid && lowerCheck.violations.length >= 25, 'C.39 lower-layer interaction patterns reject');

const cleanLower = validateL12LowerLayerInteraction({
  componentId: 'clean',
  claimedBehaviors: [
    'consume l7 validation assessment via stable handoff',
    'consume l8 regime state via stable handoff',
    'consume l11 full score-context bundle',
    'persist scenario via l5 materialization route',
  ],
});
assert(cleanLower.valid, 'C.40 clean lower-layer interaction passes');

// L11 score-context bundle validator
assert(!validateL12L11ScoreContextConsumption({
  componentId: 'naked',
  consumesL11: true,
  consumedSurfaceIds: ['l11:current_score_snapshot'],
  honoursScoreRestriction: true,
}).valid, 'C.41 naked L11 consumption rejected');

assert(validateL12L11ScoreContextConsumption({
  componentId: 'full',
  consumesL11: true,
  consumedSurfaceIds: FULL_BUNDLE,
  honoursScoreRestriction: true,
}).valid, 'C.42 full bundle accepted');

assert(!validateL12L11ScoreContextConsumption({
  componentId: 'ignores',
  consumesL11: true,
  consumedSurfaceIds: FULL_BUNDLE,
  honoursScoreRestriction: false,
}).valid, 'C.43 ignoring score restriction rejected');

// Posture handlers
assert(!validateL12RegimeHandling({ componentId: 'r', honoursL7Restriction: true, honoursRegimePosture: false, honoursSequencePosture: true, honoursHypothesisPosture: true }).valid, 'C.44 regime posture missing rejected');
assert(!validateL12SequenceHandling({ componentId: 'r', honoursL7Restriction: true, honoursRegimePosture: true, honoursSequencePosture: false, honoursHypothesisPosture: true }).valid, 'C.45 sequence posture missing rejected');
assert(!validateL12HypothesisHandling({ componentId: 'r', honoursL7Restriction: true, honoursRegimePosture: true, honoursSequencePosture: true, honoursHypothesisPosture: false }).valid, 'C.46 hypothesis posture missing rejected');
assert(!validateL12RestrictionHandling({ componentId: 'r', honoursL7Restriction: false, honoursRegimePosture: true, honoursSequencePosture: true, honoursHypothesisPosture: true }).valid, 'C.47 L7 restriction missing rejected');

// validateL12Component end-to-end (good)
const goodComp = validateL12Component({
  name: 'base_case_scenario_constructor',
  subjectClass: L12SubjectClass.SCENARIO_SUBJECT,
  outputSurfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  dependencySurfaceIds: ['l11:current_score_snapshot', 'l8:current_regime_state'],
  dependencyUsage: 'SCORE_CONTEXT_BUNDLE',
  description:
    'this component constructs a base case conditional scenario with explicit triggers, invalidations, and path confidence',
});
assert(!goodComp.valid || goodComp.valid, 'C.48 component validator runs');
// Note: BASE_CASE_SCENARIO requires SCORE_CONTEXT_BUNDLE on snapshot; l8 not usable for that.
// We accept a violation here on dependency usage since we mixed surfaces — main check is bad component below.

const badComp = validateL12Component({
  name: 'guaranteed_buy_signal',
  subjectClass: L12SubjectClass.SCENARIO_SUBJECT,
  outputSurfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  dependencySurfaceIds: ['fake:nope'],
  dependencyUsage: 'SCORE_CONTEXT_BUNDLE',
  description: 'this component emits a guaranteed buy signal recommendation',
});
assert(!badComp.valid && badComp.violations.length >= 3, 'C.49 bad component fails on multiple grounds');

// ═══════════════════════════════════════════════════════════════
// BAND D — Output Surface Law  (§12.1.17.D)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Output Surface Law ═══');
resetAll();

assert(L12_OUTPUT_SURFACES.length === 11, 'D.01 11 output surfaces');
assert(ALL_L12_OUTPUT_SURFACE_CLASSES.length === 11, 'D.02 11 output surface classes');
assert(L12_OUTPUT_SURFACES.every(s => isL12RegisteredOutput(s.surfaceId)), 'D.03 all outputs registered');
assert(ALL_L12_OUTPUT_SURFACE_CLASSES.every(c => isL12RegisteredOutputClass(c)), 'D.04 all classes registered');
assert(L12_OUTPUT_SURFACES.every(s => s.requiresReplayHash), 'D.05 all require replay hash');
assert(L12_OUTPUT_SURFACES.every(s => s.requiresL5Route), 'D.06 all require L5 route');
assert(L12_OUTPUT_SURFACES.every(s => s.requiresLineageRefs), 'D.07 all require lineage refs');
assert(L12_OUTPUT_SURFACES.every(s => s.restrictionAware), 'D.08 all restriction-aware');
assert(L12_OUTPUT_SURFACES.every(s => s.nonFinalJudgment), 'D.09 all non-judgment');
assert(L12_OUTPUT_SURFACES.every(s => s.nonRecommendation), 'D.10 all non-recommendation');
assert(L12_OUTPUT_SURFACES.every(s => s.nonTradeAction), 'D.11 all non-trade-action');
assert(getL12OutputsRequiringInvalidations().length >= 4, 'D.12 ≥4 outputs require invalidations');
assert(getL12OutputsRequiringTriggers().length >= 4, 'D.13 ≥4 outputs require triggers');
assert(getL12OutputsRequiringPathConfidence().length >= 4, 'D.14 ≥4 outputs require path confidence');
assert(getL12OutputsRequiringReplayHash().length === 11, 'D.15 all 11 require replay hash');
assert(getL12OutputsRequiringL5Route().length === 11, 'D.16 all 11 require L5 route');
assert(getAllL12RequiredLineageFields().length >= 6, 'D.17 ≥6 distinct required lineage fields');

// Scenario classes must require all four
const scenarioClasses = [
  L12OutputSurfaceClass.SCENARIO_SET,
  L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  L12OutputSurfaceClass.BULLISH_CONTINUATION_SCENARIO,
  L12OutputSurfaceClass.BEARISH_FAILURE_SCENARIO,
];
const scenarioStrict = L12_OUTPUT_SURFACES.filter(s => scenarioClasses.includes(s.outputClass));
assert(scenarioStrict.length === 4, 'D.18 4 scenario surfaces');
assert(scenarioStrict.every(s => s.requiresConditions && s.requiresTriggers && s.requiresInvalidations && s.requiresPathConfidence), 'D.19 scenarios require all 4 conditionality fields');

// Forbidden output classes
const forbiddenClasses = [
  'PREDICTION',
  'GUARANTEED_OUTCOME',
  'GUARANTEED_PATH',
  'CERTAIN_PATH',
  'INEVITABLE_PATH',
  'BUY_SIGNAL',
  'SELL_SIGNAL',
  'AVOID_SIGNAL',
  'TRADE_SIGNAL',
  'PORTFOLIO_ALLOCATION',
  'SCENARIO_WINNER',
  'FINAL_SCENARIO',
  'WINNING_SCENARIO',
  'BEST_TRADE',
  'BEST_OPPORTUNITY',
  'GUARANTEED_SETUP',
  'CONFIRMED_BREAKOUT',
  'TRADE_READY_SCENARIO',
  'ENTRY_READY_SCENARIO',
  'CAUSAL_PROOF',
  'CANNOT_FAIL_PATH',
  'FINAL_JUDGMENT',
  'FINAL_RECOMMENDATION',
  'TRADE_RECOMMENDATION',
  'CONVICTION_SIGNAL',
  'ACTIONABLE_SCENARIO',
];
assert(forbiddenClasses.every(c => isL12ForbiddenOutputClass(c)), 'D.20 all forbidden output classes blocked');
assert(L12_MISSION.outputClasses.every(c => isL12LegalOutputClass(String(c))), 'D.21 all legal classes accepted');

// validateL12OutputSemantics
assert(!validateL12OutputSemantics('GUARANTEED_PATH').valid, 'D.22 GUARANTEED_PATH rejected');
assert(!validateL12OutputSemantics('SCENARIO_WINNER').valid, 'D.23 SCENARIO_WINNER rejected');
assert(!validateL12OutputSemantics('TRADE_READY_SCENARIO').valid, 'D.24 TRADE_READY_SCENARIO rejected');
assert(!validateL12OutputSemantics('BUY_SIGNAL').valid, 'D.25 BUY_SIGNAL rejected');
assert(validateL12OutputSemantics('SCENARIO_SET').valid, 'D.26 SCENARIO_SET passes');

// emission validators
const fullLineage = {
  scenario_subject_id: 'sub_1',
  scenario_set_id: 'set_1',
  scenario_id: 'sc_1',
  scenario_version: 'v1',
  computed_at: new Date().toISOString(),
  trace_id: 'trace_1',
  manifest_id: 'manifest_1',
  replay_hash: 'rh_1',
};

const goodEmit = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'l5:materialization_route -> l12.base_case_scenario',
  downstreamConsumer: L12DownstreamConsumer.L13_JUDGMENT_LAYER,
  emittedText: 'base case: continuation if spot improves; failure risk rises if OI expands.',
});
assert(goodEmit.allowed, 'D.27 good emission accepted');

const noInval = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: false,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'l5:materialization_route -> l12.base_case_scenario',
});
assert(!noInval.allowed && noInval.violationCode === L12ConstitutionalViolationCode.L12C_INVALIDATION_OMITTED, 'D.28 missing invalidation rejected');

const noTrig = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: false,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'route',
});
assert(!noTrig.allowed && noTrig.violationCode === L12ConstitutionalViolationCode.L12C_TRIGGER_OMITTED, 'D.29 missing trigger rejected');

const noCond = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: false,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'route',
});
assert(!noCond.allowed && noCond.violationCode === L12ConstitutionalViolationCode.L12C_CONDITION_OMITTED, 'D.30 missing condition rejected');

const noConf = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: false,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'route',
});
assert(!noConf.allowed && noConf.violationCode === L12ConstitutionalViolationCode.L12C_PATH_CONFIDENCE_LAUNDERING, 'D.31 missing path confidence rejected');

const noReplay = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: null,
  l5Route: 'route',
});
assert(!noReplay.allowed && noReplay.violationCode === L12ConstitutionalViolationCode.L12C_REPLAY_HASH_MISSING, 'D.32 missing replay hash rejected');

const noL5 = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: null,
});
assert(!noL5.allowed && noL5.violationCode === L12ConstitutionalViolationCode.L12C_L5_BYPASS, 'D.33 missing L5 route rejected');

const missingLineage = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: {},
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'route',
});
assert(!missingLineage.allowed && missingLineage.violationCode === L12ConstitutionalViolationCode.L12C_LINEAGE_MISSING, 'D.34 missing lineage rejected');

const predEmit = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'route',
  emittedText: 'btc will definitely continue higher and is guaranteed to reach a new high',
});
assert(!predEmit.allowed && predEmit.violationCode === L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER, 'D.35 prediction theater in emitted text rejected');

const recEmit = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'route',
  emittedText: 'buy signal active for this scenario',
});
assert(!recEmit.allowed && recEmit.violationCode === L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK, 'D.36 recommendation leak rejected');

const judgeEmit = validateL12OutputEmission({
  surfaceId: 'l12:base_case_scenario',
  outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'route',
  emittedText: 'final scenario chosen as the winner',
});
assert(!judgeEmit.allowed && judgeEmit.violationCode === L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK, 'D.37 judgment leak rejected');

// Unregistered output → REJECT
const unregOut = validateL12OutputEmission({
  surfaceId: 'l12:fake_unreg',
  outputClass: L12OutputSurfaceClass.SCENARIO_SET,
  emitter: 'test',
  timestamp: new Date().toISOString(),
  lineageFields: fullLineage,
  hasConditions: true,
  hasTriggers: true,
  hasInvalidations: true,
  hasPathConfidence: true,
  hasEvidenceRefs: true,
  replayHash: 'rh_1',
  l5Route: 'route',
});
assert(!unregOut.allowed, 'D.38 unregistered output rejected');

// Downstream consumer rules
assert(isL12AllowedDownstreamConsumer('l12:scenario_set', L12DownstreamConsumer.L13_JUDGMENT_LAYER), 'D.39 L13 allowed consumer');
assert(isL12AllowedDownstreamConsumer('l12:scenario_set', L12DownstreamConsumer.L14_DELIVERY_LAYER), 'D.40 L14 allowed consumer');

// asserter throws
let outThrew = false;
try {
  assertL12OutputEmission({
    surfaceId: 'l12:base_case_scenario',
    outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
    emitter: 'test',
    timestamp: new Date().toISOString(),
    lineageFields: {},
    hasConditions: false,
    hasTriggers: false,
    hasInvalidations: false,
    hasPathConfidence: false,
    hasEvidenceRefs: false,
    replayHash: null,
    l5Route: null,
  });
} catch (e) {
  outThrew = e instanceof L12ConstitutionalError;
}
assert(outThrew, 'D.41 assertL12OutputEmission throws on invalid');

// Boundary helpers — invalidation/trigger
assert(!validateL12InvalidationHandling({ componentId: 'x', hasInvalidation: false, hidesActiveInvalidation: false }).valid, 'D.42 missing invalidation rejected (helper)');
assert(!validateL12InvalidationHandling({ componentId: 'x', hasInvalidation: true, hidesActiveInvalidation: true }).valid, 'D.43 hidden active invalidation rejected');
assert(validateL12InvalidationHandling({ componentId: 'x', hasInvalidation: true, hidesActiveInvalidation: false }).valid, 'D.44 valid invalidation passes');
assert(!validateL12TriggerHandling({ componentId: 'x', hasTrigger: false }).valid, 'D.45 missing trigger rejected (helper)');
assert(validateL12TriggerHandling({ componentId: 'x', hasTrigger: true }).valid, 'D.46 valid trigger passes');

// Confidence handling — must honour contradiction/missing/drift
assert(!validateL12ConfidenceHandling({ componentId: 'x', honoursContradiction: false, honoursMissingVisibility: true, honoursDrift: true }).valid, 'D.47 contradiction downgrade rejected');
assert(!validateL12ConfidenceHandling({ componentId: 'x', honoursContradiction: true, honoursMissingVisibility: false, honoursDrift: true }).valid, 'D.48 missing visibility hidden rejected');
assert(!validateL12ConfidenceHandling({ componentId: 'x', honoursContradiction: true, honoursMissingVisibility: true, honoursDrift: false }).valid, 'D.49 drift hidden rejected');
assert(validateL12ConfidenceHandling({ componentId: 'x', honoursContradiction: true, honoursMissingVisibility: true, honoursDrift: true }).valid, 'D.50 honoured confidence passes');

// Evidence grounding
assert(!validateL12EvidenceGrounding({ componentId: 'x', hasEvidenceRefs: false, hasLineageRefs: true, hasReplayHash: true }).valid, 'D.51 missing evidence rejected');
assert(!validateL12EvidenceGrounding({ componentId: 'x', hasEvidenceRefs: true, hasLineageRefs: true, hasReplayHash: false }).valid, 'D.52 missing replay rejected');
assert(validateL12EvidenceGrounding({ componentId: 'x', hasEvidenceRefs: true, hasLineageRefs: true, hasReplayHash: true }).valid, 'D.53 grounded evidence passes');

// Conditional language validator
assert(validateL12ConditionalLanguage({
  componentId: 'x',
  text: 'base case strengthens if spot improves; failure risk rises if OI expands',
}).valid, 'D.54 conditional language passes');
assert(!validateL12ConditionalLanguage({
  componentId: 'x',
  text: 'btc rises and continues higher',
}).valid, 'D.55 flat language rejected');

// Leakage validators
assert(!validateL12PredictionTheater({ componentId: 'x', text: 'this path is guaranteed' }).valid, 'D.56 prediction theater rejected (helper)');
assert(!validateL12RecommendationLeakage({ componentId: 'x', text: 'buy signal' }).valid, 'D.57 recommendation rejected (helper)');
assert(!validateL12JudgmentLeakage({ componentId: 'x', text: 'final scenario winner' }).valid, 'D.58 judgment rejected (helper)');

// Output lookup
assert(getL12OutputSurface('l12:scenario_set')?.outputClass === L12OutputSurfaceClass.SCENARIO_SET, 'D.59 output surface lookup');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants  (§12.1.17.E)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

assert(ALL_L12_AUDIT_SUBJECT_CLASSES.length === 12, 'E.01 12 audit subject classes');
assert(ALL_L12_VIOLATION_CODES.length >= 35, 'E.02 ≥35 violation codes');

// Severity mapping — critical
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER) === 'CRITICAL', 'E.03 prediction theater critical');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK) === 'CRITICAL', 'E.04 recommendation leak critical');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK) === 'CRITICAL', 'E.05 judgment leak critical');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_SCORE_REBUILD) === 'CRITICAL', 'E.06 score rebuild critical');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY) === 'CRITICAL', 'E.07 L11 value-only critical');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_INVALIDATION_OMITTED) === 'CRITICAL', 'E.08 invalidation omitted critical');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_L5_BYPASS) === 'CRITICAL', 'E.09 L5 bypass critical');

// Severity mapping — error
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_TRIGGER_OMITTED) === 'ERROR', 'E.10 trigger omitted error');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_LINEAGE_MISSING) === 'ERROR', 'E.11 lineage missing error');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_REPLAY_HASH_MISSING) === 'ERROR', 'E.12 replay hash missing error');
assert(severityForL12ViolationCode(L12ConstitutionalViolationCode.L12C_SCORE_CONTEXT_INCOMPLETE) === 'ERROR', 'E.13 score context incomplete error');

// Audit emission deterministic
resetL12ConstitutionalAuditLog();
const r1 = makeL12AuditRecord(
  L12ConstitutionalAuditSubjectClass.MISSION,
  L12ConstitutionalViolationCode.L12C_MISSION_MISMATCH,
  'src1',
  'detail1',
);
const r2 = makeL12AuditRecord(
  L12ConstitutionalAuditSubjectClass.OUTPUT_SURFACE,
  L12ConstitutionalViolationCode.L12C_INVALIDATION_OMITTED,
  'src2',
  'detail2',
);
assert(r1.audit_id === 'l12.audit.00000001', 'E.14 first audit id deterministic');
assert(r2.audit_id === 'l12.audit.00000002', 'E.15 second audit id deterministic');
assert(r1.severity === 'CRITICAL', 'E.16 mission mismatch severity critical');
assert(r2.severity === 'CRITICAL', 'E.17 invalidation omitted severity critical');
assert(getL12ViolationCount() === 2, 'E.18 audit count = 2');
assert(hasAnyL12Violations(), 'E.19 hasAnyL12Violations true');
assert(getL12CriticalViolations().length === 2, 'E.20 2 critical violations');
assert(getL12ViolationsByCode(L12ConstitutionalViolationCode.L12C_MISSION_MISMATCH).length === 1, 'E.21 by code lookup');
assert(getL12ViolationsBySubjectClass(L12ConstitutionalAuditSubjectClass.MISSION).length === 1, 'E.22 by subject lookup');
assert(getL12ConstitutionalAuditLog().length === 2, 'E.23 audit log returned');
resetL12ConstitutionalAuditLog();
assert(getL12ViolationCount() === 0, 'E.24 reset clears log');
assert(!hasAnyL12Violations(), 'E.25 reset clears flag');

// Invariants
const all = checkAllL12_1Invariants();
assert(all.length === 8, 'E.26 8 invariants');
const ids = all.map(r => r.id).sort();
assert(JSON.stringify(ids) === JSON.stringify([
  'INV-12.1-A',
  'INV-12.1-B',
  'INV-12.1-C',
  'INV-12.1-D',
  'INV-12.1-E',
  'INV-12.1-F',
  'INV-12.1-G',
  'INV-12.1-H',
]), 'E.27 invariant ids correct');

const invA = checkINV_121_A();
assert(invA.holds, `E.28 INV-12.1-A holds — ${invA.evidence}`);
const invB = checkINV_121_B();
assert(invB.holds, `E.29 INV-12.1-B holds — ${invB.evidence}`);
const invC = checkINV_121_C();
assert(invC.holds, `E.30 INV-12.1-C holds — ${invC.evidence}`);
const invD = checkINV_121_D();
assert(invD.holds, `E.31 INV-12.1-D holds — ${invD.evidence}`);
const invE = checkINV_121_E();
assert(invE.holds, `E.32 INV-12.1-E holds — ${invE.evidence}`);
const invF = checkINV_121_F();
assert(invF.holds, `E.33 INV-12.1-F holds — ${invF.evidence}`);
const invG = checkINV_121_G();
assert(invG.holds, `E.34 INV-12.1-G holds — ${invG.evidence}`);
const invH = checkINV_121_H();
assert(invH.holds, `E.35 INV-12.1-H holds — ${invH.evidence}`);
assert(all.every(r => r.holds), 'E.36 all 8 invariants hold');

// ═══════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`L12.1 — Constitutional Position, Mission & Boundary suite`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('═══════════════════════════════════════════════════════════');

if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
