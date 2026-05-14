/**
 * L12.1 — Constitutional Invariants
 *
 * §12.1.16 — INV-12.1-A through INV-12.1-H, all executable and
 * test-covered.
 *
 *   INV-12.1-A : Mission law — L12 must remain conditional scenario
 *                logic and may not become prediction, judgment,
 *                recommendation, or trade-action layer.
 *   INV-12.1-B : Dependency law — L12 may consume only registered
 *                frozen L3–L11 handoff/read surfaces.
 *   INV-12.1-C : No lower-layer rebuild law — L12 may not rebuild
 *                validation, contradiction, regime, sequence,
 *                hypothesis, or scores.
 *   INV-12.1-D : Conditionality law — every legal L12 output must
 *                preserve conditional language, trigger/invalidation
 *                structure, and uncertainty posture.
 *   INV-12.1-E : L11 score-context law — L12 may not consume naked
 *                score values; the full score-context bundle is
 *                required.
 *   INV-12.1-F : No prediction theater law — L12 outputs may not
 *                claim certainty, inevitability, guaranteed
 *                continuation, or guaranteed failure.
 *   INV-12.1-G : No recommendation/judgment law — L12 may not output
 *                buy/sell/hold/avoid, trade actions, final judgment,
 *                scenario winner, or user instruction.
 *   INV-12.1-H : Output surface law — every L12 output surface must
 *                be registered, evidence-bound, lineage-bound,
 *                replay-safe, L5-routed, and restriction-aware.
 */

import {
  ALL_L12_DEPENDENCY_LAYERS,
  ALL_L12_FORBIDDEN_ACTIONS,
  ALL_L12_OUTPUT_SURFACE_CLASSES,
  L12CapabilityContext,
  L12CapabilityDecision,
  L12DependencyLayer,
  L12DownstreamConsumer,
  L12ForbiddenAction,
  L12OutputSurfaceClass,
  L12SubjectClass,
} from '../contracts/l12-constitutional-types';
import {
  L12_DEPENDENCY_SURFACES,
  L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
  isL12RegisteredDependency,
} from '../contracts/l12-dependency-surfaces';
import {
  L12_OUTPUT_SURFACES,
  isL12RegisteredOutput,
  isL12RegisteredOutputClass,
  getL12OutputsRequiringInvalidations,
  getL12OutputsRequiringTriggers,
  getL12OutputsRequiringPathConfidence,
  getL12OutputsRequiringReplayHash,
  getL12OutputsRequiringL5Route,
} from '../contracts/l12-output-surfaces';
import {
  L12_MISSION,
  L12_MISSION_CONSTRAINT,
  detectL12ConditionalLanguage,
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
  isL12ForbiddenOutputClass,
  isL12LegalOutputClass,
  matchesL12Mission,
} from '../contracts/l12-mission';
import {
  containsL12ForbiddenNaming,
  getL12ForbiddenNamePatterns,
  isValidL12ComponentName,
} from '../contracts/l12-boundary';
import {
  L12_FORBIDDEN_ACTION_DEFINITIONS,
} from '../contracts/l12-forbidden-actions';
import { getL12CapabilityDecision } from '../contracts/l12-capability-policy';
import {
  validateL12Component,
  validateL12Conditionality,
  validateL12ConfidenceHandling,
  validateL12EvidenceGrounding,
  validateL12HypothesisHandling,
  validateL12InvalidationHandling,
  validateL12JudgmentLeakage,
  validateL12L11ScoreContextConsumption,
  validateL12LowerLayerInteraction,
  validateL12MissionAlignment,
  validateL12PredictionTheater,
  validateL12RecommendationLeakage,
  validateL12RegimeHandling,
  validateL12RestrictionHandling,
  validateL12SequenceHandling,
  validateL12TriggerHandling,
} from '../constitution/l12-boundary-validator';
import { requestL12DependencyAccess } from '../constitution/l12-dependency-surface.registry';
import { validateL12OutputEmission } from '../constitution/l12-output-surface.registry';

export interface L12_1InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-12.1-A : mission law ──
export function checkINV_121_A(): L12_1InvariantResult {
  const missionFrozen =
    L12_MISSION.firstPrinciple ===
    'A scenario is not a prediction. A scenario is a governed conditional path.';
  const compressionFrozen = L12_MISSION.compression.includes('conditional future-path');
  const noJudgment = L12_MISSION_CONSTRAINT.noJudgmentEmission;
  const noRec = L12_MISSION_CONSTRAINT.noRecommendationEmission;
  const noTrade = L12_MISSION_CONSTRAINT.noTradeActionEmission;
  const noPredict = L12_MISSION_CONSTRAINT.noPredictionTheater;
  const noCertainty = L12_MISSION_CONSTRAINT.noCertaintyClaim;
  const noGuarantee = L12_MISSION_CONSTRAINT.noScenarioAsGuarantee;
  const noSinglePath = L12_MISSION_CONSTRAINT.noSinglePathFakeCertainty;

  const goodDescription =
    'this component constructs a conditional scenario with explicit triggers, invalidations, path confidence, and shift conditions';
  const badDescription = 'this component emits buy signal recommendations and final scenario winners';
  const goodPasses = matchesL12Mission(goodDescription);
  const badRejects = !matchesL12Mission(badDescription);

  const goodAlignment = validateL12MissionAlignment(goodDescription, 'good').valid;
  const badAlignment = !validateL12MissionAlignment(badDescription, 'bad').valid;

  return {
    id: 'INV-12.1-A',
    name: 'Mission law: L12 is conditional scenario logic, not prediction/judgment/recommendation/trade-action',
    holds:
      missionFrozen &&
      compressionFrozen &&
      noJudgment &&
      noRec &&
      noTrade &&
      noPredict &&
      noCertainty &&
      noGuarantee &&
      noSinglePath &&
      goodPasses &&
      badRejects &&
      goodAlignment &&
      badAlignment,
    evidence:
      `frozen=${missionFrozen}, compression=${compressionFrozen}, no_judgment=${noJudgment}, ` +
      `no_rec=${noRec}, no_trade=${noTrade}, no_predict=${noPredict}, no_certainty=${noCertainty}, ` +
      `no_guarantee=${noGuarantee}, no_single_path=${noSinglePath}, ` +
      `good=${goodPasses}, bad_rejected=${badRejects}, ` +
      `align_good=${goodAlignment}, align_bad=${badAlignment}`,
  };
}

// ── INV-12.1-B : dependency law ──
export function checkINV_121_B(): L12_1InvariantResult {
  const all = L12_DEPENDENCY_SURFACES;
  const allRegistered = all.every(s => isL12RegisteredDependency(s.surfaceId));
  const unregisteredBlocked = !isL12RegisteredDependency('fake:unregistered_surface');

  const layers = [
    L12DependencyLayer.L3,
    L12DependencyLayer.L4,
    L12DependencyLayer.L5,
    L12DependencyLayer.L6,
    L12DependencyLayer.L7,
    L12DependencyLayer.L8,
    L12DependencyLayer.L9,
    L12DependencyLayer.L10,
    L12DependencyLayer.L11,
  ];
  const layersOk = all.every(s => layers.includes(s.layer));
  const allCovered = layers.every(l => all.some(s => s.layer === l));

  const l7Stable = all.filter(s => s.layer === L12DependencyLayer.L7).every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l8Stable = all.filter(s => s.layer === L12DependencyLayer.L8).every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l9Stable = all.filter(s => s.layer === L12DependencyLayer.L9).every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l10Stable = all.filter(s => s.layer === L12DependencyLayer.L10).every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l11Stable = all.filter(s => s.layer === L12DependencyLayer.L11).every(s => s.authorityClass === 'STABLE_HANDOFF');

  // Unregistered surface request must reject.
  const unregReq = requestL12DependencyAccess({
    surfaceId: 'fake:unregistered_surface',
    requestedUsage: 'CONTEXT_ONLY',
    context: L12CapabilityContext.INPUT_RESOLUTION,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
  });
  const unregReqBlocked = !unregReq.allowed;

  // Restriction-aware L7 surface request without honouring restriction must reject.
  const l7Req = requestL12DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'VALIDATION_INPUT',
    context: L12CapabilityContext.INPUT_RESOLUTION,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
    honoursL7Restriction: false,
  });
  const l7Blocked = !l7Req.allowed;

  // Properly declared restriction posture must pass.
  const l7Ok = requestL12DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'VALIDATION_INPUT',
    context: L12CapabilityContext.INPUT_RESOLUTION,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
    honoursL7Restriction: true,
  });
  const l7OkPasses = l7Ok.allowed;

  // L11 score-context bundle requirement must reject naked snapshot consumption.
  const l11Naked = requestL12DependencyAccess({
    surfaceId: 'l11:current_score_snapshot',
    requestedUsage: 'SCORE_CONTEXT_BUNDLE',
    context: L12CapabilityContext.INPUT_RESOLUTION,
    requestor: 'inv-B',
    timestamp: new Date().toISOString(),
    consumesFullScoreContextBundle: false,
    honoursL7Restriction: true,
    honoursRegimePosture: true,
    honoursSequencePosture: true,
    honoursHypothesisPosture: true,
    honoursScoreRestriction: true,
    l11ConsumedBundle: ['l11:current_score_snapshot'],
  });
  const l11NakedBlocked = !l11Naked.allowed;

  return {
    id: 'INV-12.1-B',
    name: 'Dependency law: only registered frozen L3–L11 handoff/read surfaces',
    holds:
      allRegistered &&
      unregisteredBlocked &&
      layersOk &&
      allCovered &&
      l7Stable &&
      l8Stable &&
      l9Stable &&
      l10Stable &&
      l11Stable &&
      unregReqBlocked &&
      l7Blocked &&
      l7OkPasses &&
      l11NakedBlocked,
    evidence:
      `surfaces=${all.length}, layers_ok=${layersOk}, all_covered=${allCovered}, ` +
      `l7_stable=${l7Stable}, l8_stable=${l8Stable}, l9_stable=${l9Stable}, ` +
      `l10_stable=${l10Stable}, l11_stable=${l11Stable}, ` +
      `unreg_blocked=${unregReqBlocked}, l7_blocked=${l7Blocked}, l7_ok=${l7OkPasses}, ` +
      `l11_naked_blocked=${l11NakedBlocked}`,
  };
}

// ── INV-12.1-C : no lower-layer rebuild ──
export function checkINV_121_C(): L12_1InvariantResult {
  const rebuildCheck = validateL12LowerLayerInteraction({
    componentId: 'rebuild',
    claimedBehaviors: [
      'rebuild validation in scenario',
      'rebuild regime in scenario',
      'rebuild sequence in scenario',
      'rebuild hypotheses in scenario',
      'rebuild score in scenario',
      'recompute score in scenario',
      'override regime in scenario',
      'override sequence in scenario',
      'override hypothesis in scenario',
      'override validation in scenario',
      'redefine identity in scenario',
      'redefine metric in scenario',
      'reorder events in scenario',
      'rerank hypotheses in scenario',
    ],
  });
  const rebuildBlocked = !rebuildCheck.valid && rebuildCheck.violations.length >= 12;

  const cleanCheck = validateL12LowerLayerInteraction({
    componentId: 'clean',
    claimedBehaviors: [
      'consume l7 validation assessment via stable handoff',
      'consume l8 regime state via stable handoff',
      'consume l9 sequence assessment via stable handoff',
      'consume l10 hypothesis ranking via stable handoff',
      'consume l11 full score context bundle',
      'persist scenario via l5 materialization route',
    ],
  });
  const cleanPasses = cleanCheck.valid;

  const allActions = [
    L12ForbiddenAction.LOWER_LAYER_TRUTH_REDEFINITION,
    L12ForbiddenAction.VALIDATION_REBUILD,
    L12ForbiddenAction.REGIME_REBUILD,
    L12ForbiddenAction.SEQUENCE_REBUILD,
    L12ForbiddenAction.HYPOTHESIS_REBUILD,
    L12ForbiddenAction.SCORE_REBUILD,
  ];
  const prohibitions = allActions.every(a =>
    L12_FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === a),
  );

  return {
    id: 'INV-12.1-C',
    name: 'No lower-layer rebuild: validation/contradiction/regime/sequence/hypothesis/score',
    holds: rebuildBlocked && cleanPasses && prohibitions,
    evidence:
      `rebuild_blocked=${rebuildBlocked}(v=${rebuildCheck.violations.length}), ` +
      `clean=${cleanPasses}, prohibitions=${prohibitions}`,
  };
}

// ── INV-12.1-D : conditionality law ──
export function checkINV_121_D(): L12_1InvariantResult {
  const noConds = validateL12Conditionality({
    componentId: 'no-conds',
    hasConditions: false,
    hasTriggers: true,
    hasInvalidations: true,
    hasPathConfidence: true,
  });
  const noTrigs = validateL12Conditionality({
    componentId: 'no-trigs',
    hasConditions: true,
    hasTriggers: false,
    hasInvalidations: true,
    hasPathConfidence: true,
  });
  const noInvals = validateL12Conditionality({
    componentId: 'no-invals',
    hasConditions: true,
    hasTriggers: true,
    hasInvalidations: false,
    hasPathConfidence: true,
  });
  const noConf = validateL12Conditionality({
    componentId: 'no-conf',
    hasConditions: true,
    hasTriggers: true,
    hasInvalidations: true,
    hasPathConfidence: false,
  });
  const ok = validateL12Conditionality({
    componentId: 'ok',
    hasConditions: true,
    hasTriggers: true,
    hasInvalidations: true,
    hasPathConfidence: true,
  });

  const conditionalDetected = detectL12ConditionalLanguage(
    'base case: leverage-driven continuation if spot improves; failure risk rises if OI expands while liquidity weakens.',
  );
  const flatRejected = !detectL12ConditionalLanguage(
    'btc rises and continues higher.',
  );

  const triggerOmittedProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.TRIGGER_OMISSION,
  );
  const invalidationOmittedProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.INVALIDATION_OMISSION,
  );
  const conditionOmittedProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.CONDITION_OMISSION,
  );

  const invalidationOk = validateL12InvalidationHandling({
    componentId: 'inv-ok',
    hasInvalidation: true,
    hidesActiveInvalidation: false,
  }).valid;
  const invalidationMissingBlocked = !validateL12InvalidationHandling({
    componentId: 'inv-no',
    hasInvalidation: false,
    hidesActiveInvalidation: false,
  }).valid;
  const invalidationHiddenBlocked = !validateL12InvalidationHandling({
    componentId: 'inv-hide',
    hasInvalidation: true,
    hidesActiveInvalidation: true,
  }).valid;

  const triggerOk = validateL12TriggerHandling({ componentId: 't-ok', hasTrigger: true }).valid;
  const triggerMissingBlocked = !validateL12TriggerHandling({ componentId: 't-no', hasTrigger: false }).valid;

  return {
    id: 'INV-12.1-D',
    name: 'Conditionality: every legal L12 output preserves conditions/triggers/invalidations/confidence',
    holds:
      !noConds.valid &&
      !noTrigs.valid &&
      !noInvals.valid &&
      !noConf.valid &&
      ok.valid &&
      conditionalDetected &&
      flatRejected &&
      triggerOmittedProhibited &&
      invalidationOmittedProhibited &&
      conditionOmittedProhibited &&
      invalidationOk &&
      invalidationMissingBlocked &&
      invalidationHiddenBlocked &&
      triggerOk &&
      triggerMissingBlocked,
    evidence:
      `no_conds=${!noConds.valid}, no_trigs=${!noTrigs.valid}, no_invals=${!noInvals.valid}, ` +
      `no_conf=${!noConf.valid}, ok=${ok.valid}, cond_detected=${conditionalDetected}, ` +
      `flat_rejected=${flatRejected}, prohibitions=[t=${triggerOmittedProhibited},i=${invalidationOmittedProhibited},c=${conditionOmittedProhibited}], ` +
      `inv_ok=${invalidationOk}, inv_missing_blocked=${invalidationMissingBlocked}, ` +
      `inv_hidden_blocked=${invalidationHiddenBlocked}, t_ok=${triggerOk}, t_missing_blocked=${triggerMissingBlocked}`,
  };
}

// ── INV-12.1-E : L11 score-context law ──
export function checkINV_121_E(): L12_1InvariantResult {
  const naked = validateL12L11ScoreContextConsumption({
    componentId: 'naked',
    consumesL11: true,
    consumedSurfaceIds: ['l11:current_score_snapshot'],
    honoursScoreRestriction: true,
  });
  const nakedBlocked = !naked.valid;

  const incomplete = validateL12L11ScoreContextConsumption({
    componentId: 'incomp',
    consumesL11: true,
    consumedSurfaceIds: [
      'l11:current_score_snapshot',
      'l11:score_attribution',
      'l11:score_drift_report',
    ],
    honoursScoreRestriction: true,
  });
  const incompleteBlocked = !incomplete.valid;

  const full = validateL12L11ScoreContextConsumption({
    componentId: 'full',
    consumesL11: true,
    consumedSurfaceIds: [...L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS],
    honoursScoreRestriction: true,
  });
  const fullPasses = full.valid;

  const ignoresRestriction = validateL12L11ScoreContextConsumption({
    componentId: 'ignores',
    consumesL11: true,
    consumedSurfaceIds: [...L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS],
    honoursScoreRestriction: false,
  });
  const ignoresBlocked = !ignoresRestriction.valid;

  const bundleSize = L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.length === 10;

  // Registry-level enforcement: full bundle properly declared must pass.
  const regOk = requestL12DependencyAccess({
    surfaceId: 'l11:current_score_snapshot',
    requestedUsage: 'SCORE_CONTEXT_BUNDLE',
    context: L12CapabilityContext.INPUT_RESOLUTION,
    requestor: 'inv-E',
    timestamp: new Date().toISOString(),
    consumesFullScoreContextBundle: true,
    honoursL7Restriction: true,
    honoursRegimePosture: true,
    honoursSequencePosture: true,
    honoursHypothesisPosture: true,
    honoursScoreRestriction: true,
    l11ConsumedBundle: [...L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS],
  });
  const regPasses = regOk.allowed;

  const valueOnlyProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.L11_SCORE_VALUE_ONLY_CONSUMPTION,
  );
  const restrictionIgnoreProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.L11_SCORE_RESTRICTION_IGNORE,
  );

  return {
    id: 'INV-12.1-E',
    name: 'L11 score-context law: full bundle required, naked score consumption forbidden',
    holds:
      nakedBlocked &&
      incompleteBlocked &&
      fullPasses &&
      ignoresBlocked &&
      bundleSize &&
      regPasses &&
      valueOnlyProhibited &&
      restrictionIgnoreProhibited,
    evidence:
      `naked_blocked=${nakedBlocked}, incomplete_blocked=${incompleteBlocked}, full=${fullPasses}, ` +
      `ignores_blocked=${ignoresBlocked}, bundle_size=${bundleSize}, reg_passes=${regPasses}, ` +
      `value_only_prohibition=${valueOnlyProhibited}, restriction_ignore_prohibition=${restrictionIgnoreProhibited}`,
  };
}

// ── INV-12.1-F : no prediction theater ──
export function checkINV_121_F(): L12_1InvariantResult {
  const phrases = [
    'btc will definitely continue higher',
    'guaranteed continuation',
    'this path is inevitable',
    'this path cannot fail',
    'must happen now',
    'safe continuation confirmed',
    'forecast signal: continuation',
    'definitely going lower',
  ];
  const allDetected = phrases.every(p => detectL12PredictionTheater(p));

  const safe = [
    'base case: leverage-driven continuation if spot participation improves',
    'continuation strengthens if funding cools while spot improves',
    'failure risk rises if OI expands and liquidity weakens',
  ];
  const safePass = safe.every(p => !detectL12PredictionTheater(p));

  const namesBlocked = [
    'guaranteed_path',
    'certain_continuation',
    'inevitable_path',
    'cannot_fail_scenario',
    'prediction_score',
    'forecast_signal',
    'will_definitely_path',
    'safe_continuation',
    'confirmed_breakout',
  ].every(n => containsL12ForbiddenNaming(n));

  const validNames = [
    'base_case_scenario_v1',
    'bullish_continuation_scenario_v1',
    'bearish_failure_scenario_v1',
    'trigger_profile_v1',
    'invalidation_profile_v1',
    'path_confidence_profile_v1',
  ];
  const validNamesPass = validNames.every(n => isValidL12ComponentName(n));

  const predict = validateL12PredictionTheater({
    componentId: 'p',
    text: 'this path is guaranteed and cannot fail',
  });
  const predictBlocked = !predict.valid;

  const predictionTheaterProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.PREDICTION_THEATER,
  );
  const certaintyProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.CERTAINTY_CLAIM,
  );
  const guaranteeProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.SCENARIO_AS_GUARANTEE,
  );
  const singlePathProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L12ForbiddenAction.SINGLE_PATH_FAKE_CERTAINTY,
  );

  const patternsExist = getL12ForbiddenNamePatterns().length >= 50;

  return {
    id: 'INV-12.1-F',
    name: 'No prediction theater: certainty/inevitability/guaranteed/cannot-fail rejected',
    holds:
      allDetected &&
      safePass &&
      namesBlocked &&
      validNamesPass &&
      predictBlocked &&
      predictionTheaterProhibited &&
      certaintyProhibited &&
      guaranteeProhibited &&
      singlePathProhibited &&
      patternsExist,
    evidence:
      `theater_detected=${allDetected}, safe_pass=${safePass}, ` +
      `names_blocked=${namesBlocked}, valid_pass=${validNamesPass}, ` +
      `predict_blocked=${predictBlocked}, prohibitions=[t=${predictionTheaterProhibited},c=${certaintyProhibited},g=${guaranteeProhibited},s=${singlePathProhibited}], ` +
      `patterns=${getL12ForbiddenNamePatterns().length}`,
  };
}

// ── INV-12.1-G : no recommendation / judgment ──
export function checkINV_121_G(): L12_1InvariantResult {
  const recPhrases = [
    'buy signal active',
    'sell signal triggered',
    'avoid signal at this level',
    'should buy at this level',
    'recommended buy',
    'enter now and exit later',
  ];
  const recDetected = recPhrases.every(p => detectL12RecommendationLanguage(p));

  const judgePhrases = [
    'final scenario chosen',
    'scenario winner is bullish',
    'final judgment: continuation',
    'winning scenario is bearish',
  ];
  const judgeDetected = judgePhrases.every(p => detectL12JudgmentLanguage(p));

  const recBlocked = !validateL12RecommendationLeakage({
    componentId: 'r',
    text: 'buy signal triggered for this asset',
  }).valid;
  const judgeBlocked = !validateL12JudgmentLeakage({
    componentId: 'j',
    text: 'scenario winner is bullish continuation',
  }).valid;

  const namesBlocked = [
    'buy_signal',
    'sell_signal',
    'avoid_signal',
    'trade_signal',
    'final_scenario',
    'scenario_winner',
    'winning_scenario',
    'final_judgment',
    'best_trade',
    'best_opportunity',
    'trade_ready_scenario',
    'entry_ready_scenario',
    'portfolio_allocation',
    'recommendation',
    'highest_conviction',
  ].every(n => containsL12ForbiddenNaming(n));

  const classesBlocked = [
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'AVOID_SIGNAL',
    'TRADE_SIGNAL',
    'FINAL_RECOMMENDATION',
    'TRADE_RECOMMENDATION',
    'PORTFOLIO_ALLOCATION',
    'SCENARIO_WINNER',
    'FINAL_SCENARIO',
    'FINAL_JUDGMENT',
    'WINNING_SCENARIO',
    'BEST_TRADE',
    'GUARANTEED_SETUP',
    'TRADE_READY_SCENARIO',
    'ENTRY_READY_SCENARIO',
    'CONVICTION_SIGNAL',
  ].every(c => isL12ForbiddenOutputClass(c));

  const recProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === L12ForbiddenAction.RECOMMENDATION_EMISSION);
  const judgmentProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === L12ForbiddenAction.FINAL_JUDGMENT_EMISSION);
  const tradeProhibited = L12_FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === L12ForbiddenAction.TRADE_ACTION_EMISSION);

  const missionNoRec = L12_MISSION_CONSTRAINT.noRecommendationEmission;
  const missionNoJudgment = L12_MISSION_CONSTRAINT.noJudgmentEmission;
  const missionNoTrade = L12_MISSION_CONSTRAINT.noTradeActionEmission;

  return {
    id: 'INV-12.1-G',
    name: 'No recommendation/judgment/trade-action emission',
    holds:
      recDetected &&
      judgeDetected &&
      recBlocked &&
      judgeBlocked &&
      namesBlocked &&
      classesBlocked &&
      recProhibited &&
      judgmentProhibited &&
      tradeProhibited &&
      missionNoRec &&
      missionNoJudgment &&
      missionNoTrade,
    evidence:
      `rec_detected=${recDetected}, judge_detected=${judgeDetected}, rec_blocked=${recBlocked}, ` +
      `judge_blocked=${judgeBlocked}, names_blocked=${namesBlocked}, classes_blocked=${classesBlocked}, ` +
      `prohibitions=[r=${recProhibited},j=${judgmentProhibited},t=${tradeProhibited}], ` +
      `mission=[r=${missionNoRec},j=${missionNoJudgment},t=${missionNoTrade}]`,
  };
}

// ── INV-12.1-H : output surface law ──
export function checkINV_121_H(): L12_1InvariantResult {
  const allRegistered = L12_OUTPUT_SURFACES.every(s => isL12RegisteredOutput(s.surfaceId));
  const allClassesRegistered = ALL_L12_OUTPUT_SURFACE_CLASSES.every(c =>
    isL12RegisteredOutputClass(c),
  );
  const exactlyEleven =
    ALL_L12_OUTPUT_SURFACE_CLASSES.length === 11 && L12_OUTPUT_SURFACES.length === 11;

  const allReplay = L12_OUTPUT_SURFACES.every(s => s.requiresReplayHash);
  const allLineage = L12_OUTPUT_SURFACES.every(s => s.requiresLineageRefs);
  const allL5 = L12_OUTPUT_SURFACES.every(s => s.requiresL5Route);
  const allRestrictionAware = L12_OUTPUT_SURFACES.every(s => s.restrictionAware);
  const allNonJudgment = L12_OUTPUT_SURFACES.every(s => s.nonFinalJudgment);
  const allNonRec = L12_OUTPUT_SURFACES.every(s => s.nonRecommendation);
  const allNonTrade = L12_OUTPUT_SURFACES.every(s => s.nonTradeAction);

  // Scenarios must require conditions/triggers/invalidations/path confidence.
  const scenarioClasses: readonly L12OutputSurfaceClass[] = [
    L12OutputSurfaceClass.SCENARIO_SET,
    L12OutputSurfaceClass.BASE_CASE_SCENARIO,
    L12OutputSurfaceClass.BULLISH_CONTINUATION_SCENARIO,
    L12OutputSurfaceClass.BEARISH_FAILURE_SCENARIO,
  ];
  const scenarioStrict = L12_OUTPUT_SURFACES
    .filter(s => scenarioClasses.includes(s.outputClass))
    .every(
      s =>
        s.requiresConditions &&
        s.requiresTriggers &&
        s.requiresInvalidations &&
        s.requiresPathConfidence,
    );

  const reqInvCount = getL12OutputsRequiringInvalidations().length;
  const reqTrigCount = getL12OutputsRequiringTriggers().length;
  const reqConfCount = getL12OutputsRequiringPathConfidence().length;
  const reqReplayCount = getL12OutputsRequiringReplayHash().length;
  const reqL5Count = getL12OutputsRequiringL5Route().length;

  // Bad emission tests:
  const badEmission = validateL12OutputEmission({
    surfaceId: 'l12:base_case_scenario',
    outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
    emitter: 'inv-H',
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
  const badBlocked = !badEmission.allowed;

  const goodEmission = validateL12OutputEmission({
    surfaceId: 'l12:base_case_scenario',
    outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
    emitter: 'inv-H',
    timestamp: new Date().toISOString(),
    lineageFields: {
      scenario_subject_id: 'sub_1',
      scenario_set_id: 'set_1',
      scenario_id: 'sc_1',
      scenario_version: 'v1',
      computed_at: new Date().toISOString(),
      trace_id: 'trace_1',
      manifest_id: 'manifest_1',
      replay_hash: 'rh_1',
    },
    hasConditions: true,
    hasTriggers: true,
    hasInvalidations: true,
    hasPathConfidence: true,
    hasEvidenceRefs: true,
    replayHash: 'rh_1',
    l5Route: 'l5:materialization_route -> l12.base_case_scenario',
    downstreamConsumer: L12DownstreamConsumer.L13_JUDGMENT_LAYER,
    emittedText: 'base case: leverage-driven continuation if spot improves; failure risk rises if OI expands.',
  });
  const goodPasses = goodEmission.allowed;

  const unregEmission = validateL12OutputEmission({
    surfaceId: 'l12:fake_unreg',
    outputClass: L12OutputSurfaceClass.SCENARIO_SET,
    emitter: 'inv-H',
    timestamp: new Date().toISOString(),
    lineageFields: {},
    hasConditions: true,
    hasTriggers: true,
    hasInvalidations: true,
    hasPathConfidence: true,
    hasEvidenceRefs: true,
    replayHash: 'rh_1',
    l5Route: 'l5:materialization_route -> l12.scenario_set',
  });
  const unregBlocked = !unregEmission.allowed;

  return {
    id: 'INV-12.1-H',
    name: 'Output surface law: registered, evidence-bound, lineage-bound, replay-safe, L5-routed, restriction-aware',
    holds:
      allRegistered &&
      allClassesRegistered &&
      exactlyEleven &&
      allReplay &&
      allLineage &&
      allL5 &&
      allRestrictionAware &&
      allNonJudgment &&
      allNonRec &&
      allNonTrade &&
      scenarioStrict &&
      reqInvCount >= 4 &&
      reqTrigCount >= 4 &&
      reqConfCount >= 4 &&
      reqReplayCount === 11 &&
      reqL5Count === 11 &&
      badBlocked &&
      goodPasses &&
      unregBlocked,
    evidence:
      `outputs=${L12_OUTPUT_SURFACES.length}, eleven=${exactlyEleven}, replay=${allReplay}, ` +
      `lineage=${allLineage}, l5=${allL5}, restriction=${allRestrictionAware}, ` +
      `non_judgment=${allNonJudgment}, non_rec=${allNonRec}, non_trade=${allNonTrade}, ` +
      `scenario_strict=${scenarioStrict}, inv=${reqInvCount}, trig=${reqTrigCount}, ` +
      `conf=${reqConfCount}, replay_count=${reqReplayCount}, l5_count=${reqL5Count}, ` +
      `bad_blocked=${badBlocked}, good_passes=${goodPasses}, unreg_blocked=${unregBlocked}`,
  };
}

export function checkAllL12_1Invariants(): readonly L12_1InvariantResult[] {
  return [
    checkINV_121_A(),
    checkINV_121_B(),
    checkINV_121_C(),
    checkINV_121_D(),
    checkINV_121_E(),
    checkINV_121_F(),
    checkINV_121_G(),
    checkINV_121_H(),
  ];
}

// Suppress unused-import warnings for re-exported helpers used by the test suite.
void ALL_L12_DEPENDENCY_LAYERS;
void ALL_L12_FORBIDDEN_ACTIONS;
void getL12CapabilityDecision;
void L12CapabilityDecision;
void L12SubjectClass;
void validateL12Component;
void validateL12ConfidenceHandling;
void validateL12EvidenceGrounding;
void validateL12HypothesisHandling;
void validateL12RegimeHandling;
void validateL12RestrictionHandling;
void validateL12SequenceHandling;
void isL12LegalOutputClass;
