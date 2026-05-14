/**
 * L13.1 — Constitutional Invariants
 *
 * §13.1.13 — INV-13.1-A through INV-13.1-J, all executable and
 * test-covered.
 *
 *   INV-13.1-A : Mission and boundary law — L13 mission must define
 *                L13 as explanation/voice layer, not engine layer.
 *   INV-13.1-B : Hard dependency law — L13 may consume only
 *                registered L3–L12 governed surfaces; no L14+ and no
 *                raw lower-layer bypass.
 *   INV-13.1-C : No-rebuild law — L13 may not rebuild regime,
 *                sequence, hypothesis, score, or scenario outputs.
 *   INV-13.1-D : No-invention law — L13 may not invent missing
 *                support, evidence, triggers, invalidations, score
 *                drivers, hypotheses, scenarios, or confidence.
 *   INV-13.1-E : Contradiction and uncertainty law — L13 may not
 *                hide contradiction, active invalidation, missing
 *                data, drift, confidence caps, unresolved triggers,
 *                or narrow spread.
 *   INV-13.1-F : Non-recommendation law — L13 may not emit
 *                buy/sell/hold/avoid/leverage/position-size/entry/
 *                exit instructions.
 *   INV-13.1-G : Non-prediction law — L13 may not treat scenario
 *                confidence as probability, claim certainty, or
 *                emit prediction-theater language.
 *   INV-13.1-H : Output surface law — every L13 output must use a
 *                registered output surface and carry evidence,
 *                lineage, confidence, restriction, and replay
 *                identity.
 *   INV-13.1-I : Restriction respect law — L13 may not use any
 *                lower-layer output for a purpose blocked by its
 *                restriction profile.
 *   INV-13.1-J : Auditability law — every constitutional violation
 *                must be auditable with deterministic severity and
 *                replay hash.
 */

import {
  ALL_L13_DEPENDENCY_LAYERS,
  ALL_L13_FORBIDDEN_ACTIONS,
  ALL_L13_OUTPUT_SURFACE_CLASSES,
  L13AllowedCapability,
  L13CapabilityContext,
  L13CapabilityDecision,
  L13DependencyLayer,
  L13ForbiddenAction,
  L13OutputSurfaceClass,
  L13ViolationSeverity,
} from '../contracts/l13-constitutional-types';
import { ALL_L13_VIOLATION_CODES } from '../contracts/l13-violation-codes';
import {
  L13_DEPENDENCY_SURFACES,
  L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
  L13_L12_SCENARIO_BUNDLE_SURFACE_IDS,
  isL13RegisteredDependency,
} from '../contracts/l13-dependency-surfaces';
import {
  L13_OUTPUT_SURFACES,
  isL13RegisteredOutput,
} from '../contracts/l13-output-surfaces';
import {
  L13_MISSION,
  L13_MISSION_CONSTRAINT,
  detectL13FinalJudgmentLeak,
  detectL13LowerLayerRebuildLanguage,
  detectL13MissingDataLaunderLanguage,
  detectL13PredictionTheater,
  detectL13RecommendationLeak,
  matchesL13Mission,
} from '../contracts/l13-mission';
import {
  containsL13ForbiddenNaming,
  isValidL13ComponentName,
} from '../contracts/l13-boundary';
import {
  L13_FORBIDDEN_ACTION_DEFINITIONS,
  getAllL13CriticalForbiddenActions,
} from '../contracts/l13-forbidden-actions';
import {
  getL13CapabilityDecision,
} from '../contracts/l13-capability-policy';
import {
  validateL13ComponentBoundary,
  validateL13DependencyAccess,
  validateL13OutputSemantics,
  validateL13NoRebuildLaw,
  validateL13NoInventionLaw,
  validateL13ContradictionHandling,
  validateL13ConfidenceHandling,
  validateL13RestrictionHandling,
  validateL13ScenarioHandling,
  validateL13ScoreHandling,
  validateL13HypothesisHandling,
  validateL13RecommendationBoundary,
  validateL13PredictionBoundary,
  validateL13FinalJudgmentBoundary,
  validateL13EvidenceGrounding,
  validateL13MissionAlignment,
} from '../constitution/l13-boundary-validator';
import {
  L13ConstitutionalViolationCode,
} from '../contracts/l13-violation-codes';
import {
  emitL13AuditRecord,
  L13ConstitutionalAuditSubjectClass,
  resetL13ConstitutionalAuditLog,
  severityForL13ViolationCode,
  isL13BlockingViolationCode,
} from '../constitution/l13-constitutional-audit';
import { requestL13DependencyAccess } from '../constitution/l13-dependency-surface.registry';

export interface L13_1InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-13.1-A : mission and boundary law ──
export function checkINV_131_A(): L13_1InvariantResult {
  const missionFrozen =
    L13_MISSION.firstPrinciple ===
    'The AI may explain judgment, but it may not manufacture judgment.';
  const compressionFrozen = L13_MISSION.compression.includes(
    'voice of the engine',
  );
  const noTrade = L13_MISSION_CONSTRAINT.noTradeInstruction;
  const noPredict = L13_MISSION_CONSTRAINT.noPrediction;
  const noRec = L13_MISSION_CONSTRAINT.noRecommendation;
  const noFinal = L13_MISSION_CONSTRAINT.noFinalJudgment;
  const noRebuild = L13_MISSION_CONSTRAINT.noLowerLayerRebuild;
  const noInvent = L13_MISSION_CONSTRAINT.noInvention;

  const goodDescription =
    'this component explains the engine state with evidence and discloses uncertainty when scenario spread is narrow';
  const badDescription =
    'this component generates new scenarios and emits buy signals to the user';

  const goodPasses = matchesL13Mission(goodDescription);
  const badRejects = !matchesL13Mission(badDescription);
  const goodAlignment = validateL13MissionAlignment(
    goodDescription,
    'good',
  ).valid;
  const badAlignment = !validateL13MissionAlignment(
    badDescription,
    'bad',
  ).valid;

  const componentRejected = !validateL13ComponentBoundary({
    name: 'scenario_generator',
    subjectClass: 'SCENARIO_EXPLANATION_SUBJECT' as never,
    outputSurfaceId: 'l13:ai_explanation_output',
    outputClass: L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
    dependencySurfaceIds: ['l12:scenario_set'],
    capability: L13AllowedCapability.EXPLAIN_SCENARIOS,
    description: 'this component generates new scenarios for the user',
  }).valid;

  const validNameOk = isValidL13ComponentName('scenario_explanation_writer');
  const invalidNameRejected = !isValidL13ComponentName('scenario_generator');

  return {
    id: 'INV-13.1-A',
    name: 'Mission and boundary law: L13 is explanation/voice, not engine',
    holds:
      missionFrozen &&
      compressionFrozen &&
      noTrade &&
      noPredict &&
      noRec &&
      noFinal &&
      noRebuild &&
      noInvent &&
      goodPasses &&
      badRejects &&
      goodAlignment &&
      badAlignment &&
      componentRejected &&
      validNameOk &&
      invalidNameRejected,
    evidence:
      `mission_frozen=${missionFrozen}, compression=${compressionFrozen}, ` +
      `no_trade=${noTrade}, no_predict=${noPredict}, no_rec=${noRec}, ` +
      `no_final=${noFinal}, no_rebuild=${noRebuild}, no_invent=${noInvent}, ` +
      `good=${goodPasses}, bad_rejected=${badRejects}, ` +
      `align_good=${goodAlignment}, align_bad=${badAlignment}, ` +
      `engine_component_rejected=${componentRejected}, ` +
      `valid_name=${validNameOk}, invalid_name_rejected=${invalidNameRejected}`,
  };
}

// ── INV-13.1-B : hard dependency law ──
export function checkINV_131_B(): L13_1InvariantResult {
  const all = L13_DEPENDENCY_SURFACES;
  const allRegistered = all.every(s =>
    isL13RegisteredDependency(s.surfaceId),
  );
  const unregisteredBlocked = !isL13RegisteredDependency(
    'fake:unregistered_surface',
  );

  const layers = [...ALL_L13_DEPENDENCY_LAYERS];
  const allCovered = layers.every(l =>
    all.some(s => s.sourceLayer === l),
  );
  const layersOk = all.every(s => layers.includes(s.sourceLayer));

  const lateRequest = requestL13DependencyAccess({
    surfaceId: 'l14:future_layer',
    capability: L13AllowedCapability.EXPLAIN_ENGINE_STATE,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
  });
  const lateBlocked =
    !lateRequest.allowed &&
    lateRequest.violationCode ===
      L13ConstitutionalViolationCode.L13C_LATE_LAYER_DEPENDENCY;

  const rawRequest = requestL13DependencyAccess({
    surfaceId: 'raw_lower_layer:rebuild_scenario',
    capability: L13AllowedCapability.EXPLAIN_SCENARIOS,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
  });
  const rawBlocked =
    !rawRequest.allowed &&
    rawRequest.violationCode ===
      L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS;

  // Score consumed without bundle declaration → blocked.
  const scoreNakedRequest = requestL13DependencyAccess({
    surfaceId: 'l11:score_output',
    capability: L13AllowedCapability.EXPLAIN_SCORES,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
    contradictionPostureProvided: true,
    restrictionsHonoured: true,
    regimePostureProvided: true,
    sequencePostureProvided: true,
    hypothesisPostureProvided: true,
    consumesFullScoreContextBundle: false,
  });
  const scoreNakedBlocked = !scoreNakedRequest.allowed;

  // Scenario consumed without bundle declaration → blocked.
  const scenarioNakedRequest = requestL13DependencyAccess({
    surfaceId: 'l12:scenario_set',
    capability: L13AllowedCapability.EXPLAIN_SCENARIOS,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
    contradictionPostureProvided: true,
    restrictionsHonoured: true,
    regimePostureProvided: true,
    sequencePostureProvided: true,
    hypothesisPostureProvided: true,
    consumesFullScenarioBundle: false,
  });
  const scenarioNakedBlocked = !scenarioNakedRequest.allowed;

  // L7 contradiction-aware surface without contradiction posture → blocked.
  const l7Blocked = !requestL13DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    capability: L13AllowedCapability.DISCLOSE_CONTRADICTION,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
    contradictionPostureProvided: false,
    restrictionsHonoured: true,
    regimePostureProvided: true,
    sequencePostureProvided: true,
    hypothesisPostureProvided: true,
  }).allowed;

  // Properly bundled L11 score consumption → allowed.
  const l11Ok = requestL13DependencyAccess({
    surfaceId: 'l11:score_output',
    capability: L13AllowedCapability.EXPLAIN_SCORES,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
    contradictionPostureProvided: true,
    restrictionsHonoured: true,
    regimePostureProvided: true,
    sequencePostureProvided: true,
    hypothesisPostureProvided: true,
    consumesFullScoreContextBundle: true,
    l11ConsumedBundle: L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
  }).allowed;

  return {
    id: 'INV-13.1-B',
    name: 'Hard dependency law: only registered L3–L12 surfaces',
    holds:
      allRegistered &&
      unregisteredBlocked &&
      allCovered &&
      layersOk &&
      lateBlocked &&
      rawBlocked &&
      scoreNakedBlocked &&
      scenarioNakedBlocked &&
      l7Blocked &&
      l11Ok,
    evidence:
      `surfaces=${all.length}, all_registered=${allRegistered}, ` +
      `unreg_blocked=${unregisteredBlocked}, all_covered=${allCovered}, ` +
      `layers_ok=${layersOk}, late_blocked=${lateBlocked}, raw_blocked=${rawBlocked}, ` +
      `score_naked_blocked=${scoreNakedBlocked}, scenario_naked_blocked=${scenarioNakedBlocked}, ` +
      `l7_blocked=${l7Blocked}, l11_ok=${l11Ok}`,
  };
}

// ── INV-13.1-C : no-rebuild law ──
export function checkINV_131_C(): L13_1InvariantResult {
  const rebuildCheck = validateL13NoRebuildLaw({
    componentId: 'rebuilder',
    claimedBehaviors: [
      'rebuild scenario locally',
      'recompute score locally',
      'rebuild hypotheses',
      'rerank hypotheses',
      'rebuild sequence',
      'reorder sequence',
      'classify regime',
      'reclassify regime',
      'create new scenario',
      'create new hypothesis',
      'raw lower layer access',
      'bypass l5',
      'bypass l7',
      'bypass l11',
      'bypass l12',
    ],
  });
  const rebuildBlocked =
    !rebuildCheck.valid && rebuildCheck.violations.length >= 14;

  const cleanCheck = validateL13NoRebuildLaw({
    componentId: 'clean',
    claimedBehaviors: [
      'consume governed l12 scenario set',
      'consume governed l11 score with attribution',
      'disclose contradiction from l7',
      'disclose missing data',
      'cite evidence refs',
    ],
  });
  const cleanPasses = cleanCheck.valid;

  const allRebuildActions = [
    L13ForbiddenAction.REBUILD_SCENARIO,
    L13ForbiddenAction.REBUILD_SCORE,
    L13ForbiddenAction.REBUILD_HYPOTHESIS,
    L13ForbiddenAction.REBUILD_SEQUENCE,
    L13ForbiddenAction.REBUILD_REGIME,
    L13ForbiddenAction.CREATE_NEW_SCENARIO,
    L13ForbiddenAction.CREATE_NEW_HYPOTHESIS,
    L13ForbiddenAction.COMPUTE_SCORE_LOCALLY,
  ];
  const allCovered = allRebuildActions.every(a =>
    L13_FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === a),
  );

  return {
    id: 'INV-13.1-C',
    name: 'No-rebuild law: L13 may not rebuild engine outputs',
    holds: rebuildBlocked && cleanPasses && allCovered,
    evidence:
      `rebuild_violations=${rebuildCheck.violations.length}, ` +
      `clean=${cleanPasses}, actions_covered=${allCovered}`,
  };
}

// ── INV-13.1-D : no-invention law ──
export function checkINV_131_D(): L13_1InvariantResult {
  const inventCheck = validateL13NoInventionLaw({
    componentId: 'inventor',
    emittedClaims: [
      'whales accumulating heavily',
      'institutions buying in size',
      'aliens arriving to pump',
    ],
    evidenceRefIndex: ['evidence:fund_flows', 'evidence:liquidity_pool'],
  });
  const inventBlocked =
    !inventCheck.valid && inventCheck.violations.length === 3;

  const groundedCheck = validateL13NoInventionLaw({
    componentId: 'grounded',
    emittedClaims: [
      'evidence:fund_flows shows partial coverage',
      'evidence:liquidity_pool indicates rising fragility',
    ],
    evidenceRefIndex: ['evidence:fund_flows', 'evidence:liquidity_pool'],
  });
  const groundedPasses = groundedCheck.valid;

  const inventDef = L13_FORBIDDEN_ACTION_DEFINITIONS.find(
    d => d.action === L13ForbiddenAction.INVENT_MISSING_SUPPORT,
  );
  const ungroundedDef = L13_FORBIDDEN_ACTION_DEFINITIONS.find(
    d => d.action === L13ForbiddenAction.OUTPUT_UNGROUNDED_CLAIM,
  );

  return {
    id: 'INV-13.1-D',
    name: 'No-invention law: every claim must be grounded',
    holds:
      inventBlocked &&
      groundedPasses &&
      !!inventDef &&
      inventDef.severity === L13ViolationSeverity.CRITICAL &&
      !!ungroundedDef &&
      ungroundedDef.severity === L13ViolationSeverity.CRITICAL,
    evidence:
      `invent_violations=${inventCheck.violations.length}, ` +
      `grounded_passes=${groundedPasses}, ` +
      `invent_def_critical=${inventDef?.severity === L13ViolationSeverity.CRITICAL}, ` +
      `ungrounded_def_critical=${ungroundedDef?.severity === L13ViolationSeverity.CRITICAL}`,
  };
}

// ── INV-13.1-E : contradiction & uncertainty law ──
export function checkINV_131_E(): L13_1InvariantResult {
  const hideCheck = validateL13ContradictionHandling({
    componentId: 'hider',
    contradictionPresent: true,
    contradictionDisclosed: false,
  });
  const hideBlocked = !hideCheck.valid;

  const okCheck = validateL13ContradictionHandling({
    componentId: 'ok',
    contradictionPresent: true,
    contradictionDisclosed: true,
  });
  const okPasses = okCheck.valid;

  const launderText =
    'data is complete, full confidence, nothing is missing';
  const launderDetected = detectL13MissingDataLaunderLanguage(launderText);

  const finalJudgmentText = 'this is the answer, the winning scenario';
  const finalJudgmentDetected = detectL13FinalJudgmentLeak(finalJudgmentText);

  const overrideCheck = validateL13ConfidenceHandling({
    componentId: 'override',
    engineConfidenceCapped: true,
    aiOutputClaimsHigherConfidence: true,
    treatsConfidenceAsProbability: false,
  });
  const overrideBlocked = !overrideCheck.valid;

  return {
    id: 'INV-13.1-E',
    name: 'Contradiction and uncertainty law',
    holds:
      hideBlocked &&
      okPasses &&
      launderDetected &&
      finalJudgmentDetected &&
      overrideBlocked,
    evidence:
      `hide_blocked=${hideBlocked}, ok=${okPasses}, ` +
      `launder_detected=${launderDetected}, final_judgment_detected=${finalJudgmentDetected}, ` +
      `override_blocked=${overrideBlocked}`,
  };
}

// ── INV-13.1-F : non-recommendation law ──
export function checkINV_131_F(): L13_1InvariantResult {
  const recBlocks: boolean[] = [];
  const recExamples = [
    'buy now',
    'sell now',
    'should hold',
    'should avoid',
    'go long',
    'go short',
    'enter now',
    'exit now',
    'use leverage',
    'best trade',
  ];
  for (const t of recExamples) {
    const r = validateL13RecommendationBoundary({
      componentId: 'rec',
      text: t,
    });
    recBlocks.push(!r.valid);
  }
  const allBlocked = recBlocks.every(b => b);

  const cleanText =
    'the engine sees a continuation path with rising fragility; the bearish failure path is preserved';
  const cleanPasses = validateL13RecommendationBoundary({
    componentId: 'clean',
    text: cleanText,
  }).valid;

  const userAdviceDenied =
    getL13CapabilityDecision(
      L13AllowedCapability.ANSWER_USER_QUESTION,
      L13CapabilityContext.USER_REQUESTS_ADVICE,
    ) === L13CapabilityDecision.DENIED;

  const tradeDef = L13_FORBIDDEN_ACTION_DEFINITIONS.find(
    d => d.action === L13ForbiddenAction.EMIT_BUY_INSTRUCTION,
  );

  return {
    id: 'INV-13.1-F',
    name: 'Non-recommendation law: no buy/sell/hold/avoid/leverage/sizing/entry/exit',
    holds:
      allBlocked &&
      cleanPasses &&
      userAdviceDenied &&
      !!tradeDef &&
      tradeDef.severity === L13ViolationSeverity.CRITICAL,
    evidence:
      `rec_examples_blocked=${allBlocked}, clean_passes=${cleanPasses}, ` +
      `user_advice_denied=${userAdviceDenied}, ` +
      `buy_def_critical=${tradeDef?.severity === L13ViolationSeverity.CRITICAL}`,
  };
}

// ── INV-13.1-G : non-prediction law ──
export function checkINV_131_G(): L13_1InvariantResult {
  const predBlocked = !validateL13PredictionBoundary({
    componentId: 'pred',
    text: 'will go up, guaranteed, inevitably, no doubt',
  }).valid;

  const probabilityBlocked = !validateL13ConfidenceHandling({
    componentId: 'prob',
    engineConfidenceCapped: false,
    aiOutputClaimsHigherConfidence: false,
    treatsConfidenceAsProbability: true,
  }).valid;

  const certaintyBlocked = !validateL13ScenarioHandling({
    componentId: 'winner',
    explainsScenario: false,
    triggerDisclosed: false,
    invalidationDisclosed: false,
    preservesAlternatives: true,
    callsWinner: true,
    treatsConfidenceAsProbability: false,
  }).valid;

  const cleanPasses = validateL13PredictionBoundary({
    componentId: 'clean',
    text: 'continuation path remains plausible if the trigger fires',
  }).valid;

  return {
    id: 'INV-13.1-G',
    name: 'Non-prediction law: no probability/certainty/winner language',
    holds:
      predBlocked && probabilityBlocked && certaintyBlocked && cleanPasses,
    evidence:
      `pred_blocked=${predBlocked}, prob_blocked=${probabilityBlocked}, ` +
      `winner_blocked=${certaintyBlocked}, clean=${cleanPasses}`,
  };
}

// ── INV-13.1-H : output surface law ──
export function checkINV_131_H(): L13_1InvariantResult {
  const all = L13_OUTPUT_SURFACES;
  const allRegistered = all.every(s => isL13RegisteredOutput(s.surfaceId));
  const allCovered = ALL_L13_OUTPUT_SURFACE_CLASSES.every(c =>
    all.some(s => s.outputClass === c),
  );

  const noTrade = all.every(s => s.mayContainTradeInstruction === false);
  const noPred = all.every(s => s.mayContainPrediction === false);
  const noRec = all.every(s => s.mayContainRecommendation === false);
  const noFinal = all.every(s => s.mayContainFinalJudgment === false);
  const evidenceRequired = all
    .filter(s => s.outputClass !== L13OutputSurfaceClass.AI_BLOCKED_OUTPUT &&
                  s.outputClass !== L13OutputSurfaceClass.AI_UNCERTAINTY_DISCLOSURE_OUTPUT)
    .every(s => s.evidenceRequired);
  const lineageRequired = all.every(s => s.lineageRequired);
  const replayRequired = all.every(s => s.replaySafeRequired);
  const l5Required = all.every(s => s.l5PersistenceRequired);

  const forbidEvidenceMissing = !validateL13EvidenceGrounding({
    componentId: 'no_grounding',
    hasEvidenceRefs: false,
    hasLineageRefs: true,
    hasReplayHash: true,
    hasConfidenceDisclosure: true,
    hasRestrictionDisclosure: true,
  }).valid;

  const forbidLineageMissing = !validateL13EvidenceGrounding({
    componentId: 'no_lineage',
    hasEvidenceRefs: true,
    hasLineageRefs: false,
    hasReplayHash: true,
    hasConfidenceDisclosure: true,
    hasRestrictionDisclosure: true,
  }).valid;

  const forbidConfidenceMissing = !validateL13EvidenceGrounding({
    componentId: 'no_confidence',
    hasEvidenceRefs: true,
    hasLineageRefs: true,
    hasReplayHash: true,
    hasConfidenceDisclosure: false,
    hasRestrictionDisclosure: true,
  }).valid;

  const forbidRestrictionMissing = !validateL13EvidenceGrounding({
    componentId: 'no_restriction',
    hasEvidenceRefs: true,
    hasLineageRefs: true,
    hasReplayHash: true,
    hasConfidenceDisclosure: true,
    hasRestrictionDisclosure: false,
  }).valid;

  // Forbidden output classes are rejected.
  const forbidTrade = !validateL13OutputSemantics('TRADE_INSTRUCTION').valid;
  const forbidPrediction = !validateL13OutputSemantics('PREDICTION').valid;
  const forbidWinner = !validateL13OutputSemantics('SCENARIO_WINNER').valid;

  return {
    id: 'INV-13.1-H',
    name: 'Output surface law: registered, evidence-bound, lineage-bound, replay-safe',
    holds:
      allRegistered &&
      allCovered &&
      noTrade &&
      noPred &&
      noRec &&
      noFinal &&
      evidenceRequired &&
      lineageRequired &&
      replayRequired &&
      l5Required &&
      forbidEvidenceMissing &&
      forbidLineageMissing &&
      forbidConfidenceMissing &&
      forbidRestrictionMissing &&
      forbidTrade &&
      forbidPrediction &&
      forbidWinner,
    evidence:
      `registered=${allRegistered}, classes_covered=${allCovered}, ` +
      `no_trade=${noTrade}, no_pred=${noPred}, no_rec=${noRec}, no_final=${noFinal}, ` +
      `evidence=${evidenceRequired}, lineage=${lineageRequired}, replay=${replayRequired}, l5=${l5Required}, ` +
      `evidence_missing_blocked=${forbidEvidenceMissing}, lineage_missing_blocked=${forbidLineageMissing}, ` +
      `confidence_missing_blocked=${forbidConfidenceMissing}, restriction_missing_blocked=${forbidRestrictionMissing}, ` +
      `trade_class_rejected=${forbidTrade}, prediction_class_rejected=${forbidPrediction}, ` +
      `winner_class_rejected=${forbidWinner}`,
  };
}

// ── INV-13.1-I : restriction respect law ──
export function checkINV_131_I(): L13_1InvariantResult {
  const allHonoured = validateL13RestrictionHandling({
    componentId: 'ok',
    l7RestrictionHonoured: true,
    sequenceRestrictionHonoured: true,
    hypothesisRestrictionHonoured: true,
    scoreRestrictionHonoured: true,
    scenarioRestrictionHonoured: true,
  }).valid;

  const checks = [
    {
      l7RestrictionHonoured: false,
      sequenceRestrictionHonoured: true,
      hypothesisRestrictionHonoured: true,
      scoreRestrictionHonoured: true,
      scenarioRestrictionHonoured: true,
    },
    {
      l7RestrictionHonoured: true,
      sequenceRestrictionHonoured: false,
      hypothesisRestrictionHonoured: true,
      scoreRestrictionHonoured: true,
      scenarioRestrictionHonoured: true,
    },
    {
      l7RestrictionHonoured: true,
      sequenceRestrictionHonoured: true,
      hypothesisRestrictionHonoured: false,
      scoreRestrictionHonoured: true,
      scenarioRestrictionHonoured: true,
    },
    {
      l7RestrictionHonoured: true,
      sequenceRestrictionHonoured: true,
      hypothesisRestrictionHonoured: true,
      scoreRestrictionHonoured: false,
      scenarioRestrictionHonoured: true,
    },
    {
      l7RestrictionHonoured: true,
      sequenceRestrictionHonoured: true,
      hypothesisRestrictionHonoured: true,
      scoreRestrictionHonoured: true,
      scenarioRestrictionHonoured: false,
    },
  ];
  const allBlocked = checks.every(
    c =>
      !validateL13RestrictionHandling({
        componentId: 'bypass',
        ...c,
      }).valid,
  );

  // Score-as-recommendation is also a restriction violation in spirit.
  const scoreAsRec = !validateL13ScoreHandling({
    componentId: 'score_rec',
    explainsScore: true,
    hasAttribution: true,
    hasMissingDataProfile: true,
    hasDriftStatus: true,
    scoreUsedAsRecommendation: true,
    scoreComputedLocally: false,
  }).valid;

  return {
    id: 'INV-13.1-I',
    name: 'Restriction respect law: every lower-layer restriction must be honoured',
    holds: allHonoured && allBlocked && scoreAsRec,
    evidence:
      `all_honoured=${allHonoured}, all_bypass_blocked=${allBlocked}, score_as_rec_blocked=${scoreAsRec}`,
  };
}

// ── INV-13.1-J : auditability law ──
export function checkINV_131_J(): L13_1InvariantResult {
  resetL13ConstitutionalAuditLog();
  const r1 = emitL13AuditRecord({
    subjectClass:
      L13ConstitutionalAuditSubjectClass.OUTPUT_SEMANTICS,
    subjectRef: 'l13:ai_explanation_output',
    violationCode:
      L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
    message: 'detected buy-now leak',
    evidenceRefs: ['evidence:fund_flows'],
    lineageRefs: ['lineage:run_xyz'],
    createdAt: '2026-05-09T00:00:00Z',
  });
  const r2 = emitL13AuditRecord({
    subjectClass:
      L13ConstitutionalAuditSubjectClass.OUTPUT_SEMANTICS,
    subjectRef: 'l13:ai_explanation_output',
    violationCode:
      L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
    message: 'detected buy-now leak',
    evidenceRefs: ['evidence:fund_flows'],
    lineageRefs: ['lineage:run_xyz'],
    createdAt: '2026-05-09T00:00:00Z',
  });
  const deterministic =
    r1.replay_hash === r2.replay_hash && r1.audit_id === r2.audit_id;
  const isCritical = r1.severity === L13ViolationSeverity.CRITICAL;
  const isBlocking = r1.blocking;
  const idShape = /^l13r\.audit\.[0-9a-f]{8}$/.test(r1.audit_id);

  const r3 = emitL13AuditRecord({
    subjectClass: L13ConstitutionalAuditSubjectClass.OUTPUT_SURFACE,
    subjectRef: 'l13:ai_explanation_output',
    violationCode:
      L13ConstitutionalViolationCode.L13C_EVIDENCE_REFS_MISSING,
    message: 'missing evidence',
  });
  const errorSeverity = r3.severity === L13ViolationSeverity.ERROR;
  const errorBlocking = r3.blocking;

  // Severity helper deterministic.
  const helperDeterministic =
    severityForL13ViolationCode(
      L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER,
    ) === L13ViolationSeverity.CRITICAL &&
    severityForL13ViolationCode(
      L13ConstitutionalViolationCode.L13C_EVIDENCE_REFS_MISSING,
    ) === L13ViolationSeverity.ERROR;

  const blockingHelper =
    isL13BlockingViolationCode(
      L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER,
    ) === true &&
    isL13BlockingViolationCode(
      L13ConstitutionalViolationCode.L13C_FORBIDDEN_NAMING,
    ) === false;

  resetL13ConstitutionalAuditLog();

  return {
    id: 'INV-13.1-J',
    name: 'Auditability law: deterministic severity and replay hash',
    holds:
      deterministic &&
      isCritical &&
      isBlocking &&
      idShape &&
      errorSeverity &&
      errorBlocking &&
      helperDeterministic &&
      blockingHelper,
    evidence:
      `deterministic=${deterministic}, critical=${isCritical}, blocking=${isBlocking}, ` +
      `id_shape=${idShape}, error_severity=${errorSeverity}, error_blocking=${errorBlocking}, ` +
      `helper_deterministic=${helperDeterministic}, blocking_helper=${blockingHelper}`,
  };
}

/**
 * §13.1.13 — Run all L13.1 invariants in deterministic order.
 */
export function runAllL13_1Invariants(): readonly L13_1InvariantResult[] {
  return [
    checkINV_131_A(),
    checkINV_131_B(),
    checkINV_131_C(),
    checkINV_131_D(),
    checkINV_131_E(),
    checkINV_131_F(),
    checkINV_131_G(),
    checkINV_131_H(),
    checkINV_131_I(),
    checkINV_131_J(),
  ];
}

void ALL_L13_FORBIDDEN_ACTIONS;
void ALL_L13_VIOLATION_CODES;
void getAllL13CriticalForbiddenActions;
void containsL13ForbiddenNaming;
void detectL13RecommendationLeak;
void validateL13FinalJudgmentBoundary;
void validateL13HypothesisHandling;
void validateL13DependencyAccess;
void L13_L12_SCENARIO_BUNDLE_SURFACE_IDS;
void L13DependencyLayer;
