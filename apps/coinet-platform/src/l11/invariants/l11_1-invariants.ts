/**
 * L11.1 — Constitutional Invariants
 *
 * §11.1.17 — INV-11.1-A through INV-11.1-H, all executable and
 * test-covered.
 *
 *   INV-11.1-A : Meaning-claim law — every score output must carry a
 *                declared meaning claim.
 *   INV-11.1-B : Direction law — every score output must declare
 *                direction; direction-mixing forbidden.
 *   INV-11.1-C : No judgment / recommendation / scenario / trade-action
 *                emission.
 *   INV-11.1-D : Lower-layer dependency law — only registered L3–L10
 *                surfaces; no rebuild of lower-layer truth or L10
 *                hypotheses; no late-layer (L12+) consumption.
 *   INV-11.1-E : Attribution requirement — every score must carry
 *                attribution and a declared formula version.
 *   INV-11.1-F : Missing-data and contradiction disclosure law —
 *                missing data and contradiction may not be silently
 *                treated as neutral score truth.
 *   INV-11.1-G : Persistence route law — all score outputs must be
 *                L5-routed and replay-safe with required lineage.
 *   INV-11.1-H : Calibration requirement law — every production score
 *                must be capable of carrying a calibration hook.
 */

import {
  L11_DEPENDENCY_SURFACES,
  isL11RegisteredDependency,
} from '../contracts/l11-dependency-surfaces';
import {
  L11_OUTPUT_SURFACES,
  isL11RegisteredOutput,
  isL11RegisteredOutputClass,
  getL11OutputsRequiringMeaningClaim,
  getL11OutputsRequiringDirection,
  getL11OutputsRequiringAttribution,
} from '../contracts/l11-output-surfaces';
import {
  ALL_L11_OUTPUT_SURFACE_CLASSES,
  L11DependencyLayer,
  L11ForbiddenAction,
  L11OutputSurfaceClass,
  L11ScoreMeaningClaimClass,
} from '../contracts/l11-constitutional-types';
import {
  L11_MISSION_CONSTRAINT,
  isL11ForbiddenOutputClass,
} from '../contracts/l11-mission';
import {
  containsL11ForbiddenNaming,
  getL11ForbiddenNamePatterns,
} from '../contracts/l11-boundary';
import {
  L11_FORBIDDEN_ACTION_DEFINITIONS,
} from '../contracts/l11-forbidden-actions';
import {
  detectL11DirectionMixing,
  getL11DefaultDirectionForClass,
  getL11DefaultMeaningClaimForClass,
  getL11DefaultRestrictionProfile,
  isValidL11DirectionDeclaration,
  isValidL11MeaningClaim,
  isValidL11RestrictionProfile,
} from '../contracts/l11-score-meaning-law';
import {
  validateL11AttributionRequirement,
  validateL11CalibrationRequirement,
  validateL11ContradictionHandling,
  validateL11JudgmentLeakage,
  validateL11LowerLayerInteraction,
  validateL11MissingDataHandling,
  validateL11RecommendationLeakage,
  validateL11ScenarioLeakage,
  validateL11ScoreDirection,
  validateL11ScoreMeaning,
  validateL11ScoreRestrictionProfile,
} from '../constitution/l11-boundary-validator';
import { requestL11DependencyAccess } from '../constitution/l11-dependency-surface.registry';

export interface L11_1InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-11.1-A : meaning-claim law ──
export function checkINV_111_A(): L11_1InvariantResult {
  const meaningRequiredOutputs = getL11OutputsRequiringMeaningClaim();
  const meaningOutputCount = meaningRequiredOutputs.length;
  const meaningEnforced = meaningOutputCount >= 7; // 7 of 8 outputs require meaning

  const absent = validateL11ScoreMeaning(undefined, 'absent');
  const absentBlocked = !absent.valid && absent.violations.length === 1;

  const incomplete = validateL11ScoreMeaning(
    {
      meaning_class: L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY,
      measures: '',
      does_not_measure: 'a buy signal',
      intended_consumers: ['L12_SCENARIO_WEIGHTING'],
      calibration_target_category: 'governed_empirical',
      required_attribution_surfaces: ['l11:score_attribution'],
      legal_interpretation: 'gov',
      illegal_interpretation: 'rec',
    },
    'incomplete',
  );
  const incompleteBlocked = !incomplete.valid;

  const ok = validateL11ScoreMeaning(
    getL11DefaultMeaningClaimForClass(L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY),
    'ok',
  );
  const okPasses = ok.valid;

  const meaningRequiredByMission = L11_MISSION_CONSTRAINT.meaningClaimRequired;

  const allDefaultsValid = Object.values(L11ScoreMeaningClaimClass).every(c =>
    isValidL11MeaningClaim(getL11DefaultMeaningClaimForClass(c)),
  );

  const hasVibeProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.VIBE_SCORE_CREATION,
  );
  const hasMeaningAbsentProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.MEANING_CLAIM_ABSENT,
  );

  return {
    id: 'INV-11.1-A',
    name: 'Every score output must carry a declared meaning claim',
    holds:
      meaningEnforced &&
      absentBlocked &&
      incompleteBlocked &&
      okPasses &&
      meaningRequiredByMission &&
      allDefaultsValid &&
      hasVibeProhibition &&
      hasMeaningAbsentProhibition,
    evidence:
      `meaning_outputs=${meaningOutputCount}, absent_blocked=${absentBlocked}, ` +
      `incomplete_blocked=${incompleteBlocked}, ok=${okPasses}, ` +
      `mission=${meaningRequiredByMission}, defaults_valid=${allDefaultsValid}, ` +
      `vibe_prohibition=${hasVibeProhibition}, meaning_prohibition=${hasMeaningAbsentProhibition}`,
  };
}

// ── INV-11.1-B : direction law ──
export function checkINV_111_B(): L11_1InvariantResult {
  const directionRequiredOutputs = getL11OutputsRequiringDirection();
  const directionEnforced = directionRequiredOutputs.length >= 2; // SCORE_OUTPUT + SCORE_COMPONENT_BREAKDOWN

  const undeclared = validateL11ScoreDirection(
    undefined,
    'opportunity score: higher means better quality',
    'undeclared',
  );
  const undeclaredBlocked = !undeclared.valid;

  const ok = validateL11ScoreDirection(
    getL11DefaultDirectionForClass(L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY),
    'opportunity score: higher means better quality',
    'ok',
  );
  const okPasses = ok.valid;

  const mixed = validateL11ScoreDirection(
    getL11DefaultDirectionForClass(L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY),
    'this score is half higher is better and half higher is worse',
    'mixed',
  );
  const mixedBlocked = !mixed.valid;

  const detection = detectL11DirectionMixing(
    'this score is higher is better and also higher is worse',
  );
  const cleanDescription = !detectL11DirectionMixing(
    'this score is higher is better with stable direction',
  );

  const allDefaultDirectionsValid = Object.values(L11ScoreMeaningClaimClass).every(c =>
    isValidL11DirectionDeclaration(getL11DefaultDirectionForClass(c)),
  );

  const missionRequired = L11_MISSION_CONSTRAINT.directionDeclarationRequired;
  const hasDirectionUndeclaredProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.DIRECTION_UNDECLARED,
  );
  const hasDirectionMixingProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.DIRECTION_MIXING,
  );

  return {
    id: 'INV-11.1-B',
    name: 'Every score output must declare direction; direction-mixing forbidden',
    holds:
      directionEnforced &&
      undeclaredBlocked &&
      okPasses &&
      mixedBlocked &&
      detection &&
      cleanDescription &&
      allDefaultDirectionsValid &&
      missionRequired &&
      hasDirectionUndeclaredProhibition &&
      hasDirectionMixingProhibition,
    evidence:
      `dir_outputs=${directionRequiredOutputs.length}, undecl=${undeclaredBlocked}, ` +
      `ok=${okPasses}, mixed=${mixedBlocked}, detect=${detection}, clean=${cleanDescription}, ` +
      `defaults_valid=${allDefaultDirectionsValid}, mission=${missionRequired}, ` +
      `undecl_prohibition=${hasDirectionUndeclaredProhibition}, mix_prohibition=${hasDirectionMixingProhibition}`,
  };
}

// ── INV-11.1-C : no judgment / recommendation / scenario / trade-action ──
export function checkINV_111_C(): L11_1InvariantResult {
  const forbiddenNames = [
    'buy_signal',
    'sell_signal',
    'avoid_signal',
    'trade_signal',
    'final_judgment_score',
    'final_recommendation',
    'trade_recommendation',
    'scenario_winner',
    'final_scenario',
    'winning_scenario',
    'winning_score',
    'winning_thesis',
    'best_trade',
    'best_opportunity',
    'clear_buy_score',
    'clear_sell_score',
    'trade_ready_score',
    'entry_ready_score',
    'guaranteed_setup',
    'safest_trade',
    'highest_conviction_score',
    'conviction_signal',
    'conviction_score',
    'actionable_score',
    'actionable_setup',
    'alpha_signal',
    'alpha_score',
    'ideal_score',
    'ideal_setup',
    'vibe_score',
    'unattributed_score',
    'unversioned_score',
    'score_as_action',
    'score_says_buy',
    'score_says_sell',
    'score_override',
    'portfolio_allocation_score',
    'portfolio_priority_score',
  ];
  const allBlocked = forbiddenNames.every(n => containsL11ForbiddenNaming(n));

  const validNames = [
    'opportunity_score_v1',
    'risk_score_v1',
    'timing_score_v1',
    'thesis_coherence_score_v1',
    'signal_confidence_score_v1',
    'market_structure_score_v1',
    'whale_behavior_score_v1',
    'unlock_supply_overhang_score_v1',
    'score_component_breakdown_opportunity',
    'score_attribution_opportunity_v1',
    'score_modifier_profile_regime_aware',
    'score_calibration_hook_opportunity_v1',
  ];
  const allAllowed = validNames.every(n => !containsL11ForbiddenNaming(n));
  const patternsExist = getL11ForbiddenNamePatterns().length >= 40;

  const forbiddenClasses = [
    'FINAL_JUDGMENT',
    'FINAL_RECOMMENDATION',
    'TRADE_RECOMMENDATION',
    'SCENARIO_WINNER',
    'FINAL_SCENARIO',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'AVOID_SIGNAL',
    'TRADE_SIGNAL',
    'PORTFOLIO_ALLOCATION',
    'BEST_TRADE',
    'BEST_OPPORTUNITY',
    'WINNING_SCORE',
    'WINNING_SCENARIO',
    'CAUSAL_PROOF',
    'UNVERSIONED_SCORE',
    'UNATTRIBUTED_SCORE',
    'VIBE_SCORE',
    'CONVICTION_SIGNAL',
    'ACTIONABLE_SCORE',
    'TRADE_READY_SCORE',
    'ENTRY_READY_SCORE',
    'GUARANTEED_SETUP',
    'SAFEST_TRADE',
    'CLEAR_BUY_SCORE',
    'CLEAR_SELL_SCORE',
  ];
  const classesBlocked = forbiddenClasses.every(c => isL11ForbiddenOutputClass(c));

  const recCheck = validateL11RecommendationLeakage({
    componentId: 'r',
    emitsRecommendation: true,
    emitsJudgment: false,
    emitsScenarioWinner: false,
    emitsTradeAction: false,
    treatsScoreAsAction: false,
  });
  const recBlocked = !recCheck.valid;

  const scoreActionCheck = validateL11RecommendationLeakage({
    componentId: 'r',
    emitsRecommendation: false,
    emitsJudgment: false,
    emitsScenarioWinner: false,
    emitsTradeAction: false,
    treatsScoreAsAction: true,
  });
  const scoreActionBlocked = !scoreActionCheck.valid;

  const judgmentCheck = validateL11JudgmentLeakage({
    componentId: 'j',
    emitsRecommendation: false,
    emitsJudgment: true,
    emitsScenarioWinner: false,
    emitsTradeAction: false,
    treatsScoreAsAction: false,
  });
  const judgmentBlocked = !judgmentCheck.valid;

  const scenarioCheck = validateL11ScenarioLeakage({
    componentId: 's',
    emitsRecommendation: false,
    emitsJudgment: false,
    emitsScenarioWinner: true,
    emitsTradeAction: false,
    treatsScoreAsAction: false,
  });
  const scenarioBlocked = !scenarioCheck.valid;

  const tradeActionCheck = validateL11ScenarioLeakage({
    componentId: 't',
    emitsRecommendation: false,
    emitsJudgment: false,
    emitsScenarioWinner: false,
    emitsTradeAction: true,
    treatsScoreAsAction: false,
  });
  const tradeActionBlocked = !tradeActionCheck.valid;

  const cleanCheck = validateL11RecommendationLeakage({
    componentId: 'c',
    emitsRecommendation: false,
    emitsJudgment: false,
    emitsScenarioWinner: false,
    emitsTradeAction: false,
    treatsScoreAsAction: false,
  });
  const cleanPasses = cleanCheck.valid;

  const hasJudgmentProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.FINAL_JUDGMENT_EMISSION,
  );
  const hasRecProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.RECOMMENDATION_EMISSION,
  );
  const hasScenarioProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.SCENARIO_WINNER_EMISSION,
  );
  const hasTradeActionProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.TRADE_ACTION_EMISSION,
  );
  const hasScoreAsActionProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.SCORE_AS_ACTION,
  );

  const missionNoJudgment = L11_MISSION_CONSTRAINT.noJudgmentEmission;
  const missionNoRec = L11_MISSION_CONSTRAINT.noRecommendationEmission;
  const missionNoScenario = L11_MISSION_CONSTRAINT.noScenarioWinnerEmission;
  const missionNoTrade = L11_MISSION_CONSTRAINT.noTradeActionEmission;

  return {
    id: 'INV-11.1-C',
    name: 'No judgment / recommendation / scenario / trade-action / score-as-action emission',
    holds:
      allBlocked &&
      allAllowed &&
      patternsExist &&
      classesBlocked &&
      recBlocked &&
      scoreActionBlocked &&
      judgmentBlocked &&
      scenarioBlocked &&
      tradeActionBlocked &&
      cleanPasses &&
      hasJudgmentProhibition &&
      hasRecProhibition &&
      hasScenarioProhibition &&
      hasTradeActionProhibition &&
      hasScoreAsActionProhibition &&
      missionNoJudgment &&
      missionNoRec &&
      missionNoScenario &&
      missionNoTrade,
    evidence:
      `forbidden=${allBlocked}, allowed=${allAllowed}, patterns=${getL11ForbiddenNamePatterns().length}, ` +
      `classes=${classesBlocked}, rec=${recBlocked}, score_action=${scoreActionBlocked}, ` +
      `judgment=${judgmentBlocked}, scenario=${scenarioBlocked}, trade=${tradeActionBlocked}, ` +
      `clean=${cleanPasses}, prohibitions=[j=${hasJudgmentProhibition},r=${hasRecProhibition},` +
      `s=${hasScenarioProhibition},t=${hasTradeActionProhibition},sa=${hasScoreAsActionProhibition}], ` +
      `mission=[j=${missionNoJudgment},r=${missionNoRec},s=${missionNoScenario},t=${missionNoTrade}]`,
  };
}

// ── INV-11.1-D : lower-layer dependency law ──
export function checkINV_111_D(): L11_1InvariantResult {
  const all = L11_DEPENDENCY_SURFACES;
  const allRegistered = all.every(s => isL11RegisteredDependency(s.surfaceId));
  const unregisteredBlocked = !isL11RegisteredDependency('fake:unregistered_surface');
  const layersOk = all.every(s =>
    [
      L11DependencyLayer.L3,
      L11DependencyLayer.L4,
      L11DependencyLayer.L5,
      L11DependencyLayer.L6,
      L11DependencyLayer.L7,
      L11DependencyLayer.L8,
      L11DependencyLayer.L9,
      L11DependencyLayer.L10,
    ].includes(s.layer),
  );
  const hasL3 = all.some(s => s.layer === L11DependencyLayer.L3);
  const hasL4 = all.some(s => s.layer === L11DependencyLayer.L4);
  const hasL5 = all.some(s => s.layer === L11DependencyLayer.L5);
  const hasL6 = all.some(s => s.layer === L11DependencyLayer.L6);
  const hasL7 = all.some(s => s.layer === L11DependencyLayer.L7);
  const hasL8 = all.some(s => s.layer === L11DependencyLayer.L8);
  const hasL9 = all.some(s => s.layer === L11DependencyLayer.L9);
  const hasL10 = all.some(s => s.layer === L11DependencyLayer.L10);
  const l7AllStableHandoff = all
    .filter(s => s.layer === L11DependencyLayer.L7)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l8AllStableHandoff = all
    .filter(s => s.layer === L11DependencyLayer.L8)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l9AllStableHandoff = all
    .filter(s => s.layer === L11DependencyLayer.L9)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l10AllStableHandoff = all
    .filter(s => s.layer === L11DependencyLayer.L10)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');

  const rebuildCheck = validateL11LowerLayerInteraction({
    componentId: 'r',
    claimedBehaviors: [
      'rebuild hypothesis from l6',
      'rebuild hypotheses from l7',
      'rebuild l6 primitives in score',
      'rebuild l7 validation in score',
      'recompute validation in score',
      'reinterpret regime in score',
      'override regime in score',
      'reinterpret sequence in score',
      'override sequence in score',
      're-validate claim live from l6',
      'bypass l7 inside score',
      'bypass l5 in score',
      'consume l12 surface',
      'consume scenario from l13',
      'consume judgment from l14',
      'derive hypothesis from raw feed',
    ],
  });
  const rebuildBlocked = !rebuildCheck.valid && rebuildCheck.violations.length >= 12;

  const cleanCheck = validateL11LowerLayerInteraction({
    componentId: 'c',
    claimedBehaviors: [
      'consume l6 feature history for score evidence',
      'consume l7 validation assessment via stable handoff',
      'consume l8 regime state via stable handoff',
      'consume l9 sequence assessment via stable handoff',
      'consume l10 hypothesis ranking surface via stable handoff',
      'persist score via l5 write coordination',
    ],
  });
  const cleanPasses = cleanCheck.valid;

  const hasLowerLayerProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.LOWER_LAYER_REBUILD,
  );
  const hasL10HypothesisProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.L10_HYPOTHESIS_REBUILD,
  );
  const hasRegimeProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.REGIME_OVERRIDE,
  );
  const hasSequenceProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.SEQUENCE_OVERRIDE,
  );
  const hasL7LiveProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.L7_LIVE_REVALIDATION,
  );
  const hasLateLayerProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.LATE_LAYER_CONSUMPTION,
  );

  return {
    id: 'INV-11.1-D',
    name: 'Lower-layer dependency law — only registered L3–L10 surfaces; no rebuild; no late-layer consumption',
    holds:
      allRegistered &&
      unregisteredBlocked &&
      layersOk &&
      hasL3 && hasL4 && hasL5 && hasL6 && hasL7 && hasL8 && hasL9 && hasL10 &&
      l7AllStableHandoff &&
      l8AllStableHandoff &&
      l9AllStableHandoff &&
      l10AllStableHandoff &&
      rebuildBlocked &&
      cleanPasses &&
      hasLowerLayerProhibition &&
      hasL10HypothesisProhibition &&
      hasRegimeProhibition &&
      hasSequenceProhibition &&
      hasL7LiveProhibition &&
      hasLateLayerProhibition,
    evidence:
      `registered=${all.length}, unreg_blocked=${unregisteredBlocked}, layers_ok=${layersOk}, ` +
      `l3=${hasL3}, l4=${hasL4}, l5=${hasL5}, l6=${hasL6}, l7=${hasL7}, l8=${hasL8}, l9=${hasL9}, l10=${hasL10}, ` +
      `l7_stable=${l7AllStableHandoff}, l8_stable=${l8AllStableHandoff}, ` +
      `l9_stable=${l9AllStableHandoff}, l10_stable=${l10AllStableHandoff}, ` +
      `rebuild_blocked=${rebuildBlocked}(v=${rebuildCheck.violations.length}), ` +
      `clean_passes=${cleanPasses}, ` +
      `prohibitions=[ll=${hasLowerLayerProhibition},l10h=${hasL10HypothesisProhibition},` +
      `regime=${hasRegimeProhibition},sequence=${hasSequenceProhibition},l7=${hasL7LiveProhibition},late=${hasLateLayerProhibition}]`,
  };
}

// ── INV-11.1-E : attribution requirement law ──
export function checkINV_111_E(): L11_1InvariantResult {
  const attributionRequiredOutputs = getL11OutputsRequiringAttribution();
  const attributionEnforced = attributionRequiredOutputs.length >= 6;

  const noAttribution = validateL11AttributionRequirement({
    componentId: 'noattr',
    hasAttribution: false,
    hasFormulaVersion: true,
  });
  const noAttributionBlocked = !noAttribution.valid;

  const noVersion = validateL11AttributionRequirement({
    componentId: 'nover',
    hasAttribution: true,
    hasFormulaVersion: false,
  });
  const noVersionBlocked = !noVersion.valid;

  const both = validateL11AttributionRequirement({
    componentId: 'both',
    hasAttribution: false,
    hasFormulaVersion: false,
  });
  const bothBlocked = !both.valid && both.violations.length === 2;

  const ok = validateL11AttributionRequirement({
    componentId: 'ok',
    hasAttribution: true,
    hasFormulaVersion: true,
  });
  const okPasses = ok.valid;

  const hasAttrProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.UNATTRIBUTED_SCORE_EMISSION,
  );
  const hasVersionProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.UNVERSIONED_SCORE_EMISSION,
  );
  const missionAttribution = L11_MISSION_CONSTRAINT.attributionRequired;
  const missionVersion = L11_MISSION_CONSTRAINT.versionDeclarationRequired;

  const allOutputsHaveVersion = L11_OUTPUT_SURFACES.every(s => s.versionRequired);

  return {
    id: 'INV-11.1-E',
    name: 'Every score must require attribution and a declared formula version',
    holds:
      attributionEnforced &&
      noAttributionBlocked &&
      noVersionBlocked &&
      bothBlocked &&
      okPasses &&
      hasAttrProhibition &&
      hasVersionProhibition &&
      missionAttribution &&
      missionVersion &&
      allOutputsHaveVersion,
    evidence:
      `attr_outputs=${attributionRequiredOutputs.length}, no_attr=${noAttributionBlocked}, ` +
      `no_ver=${noVersionBlocked}, both=${bothBlocked}, ok=${okPasses}, ` +
      `attr_prohibition=${hasAttrProhibition}, ver_prohibition=${hasVersionProhibition}, ` +
      `mission_attr=${missionAttribution}, mission_ver=${missionVersion}, ` +
      `outputs_versioned=${allOutputsHaveVersion}`,
  };
}

// ── INV-11.1-F : missing-data and contradiction disclosure law ──
export function checkINV_111_F(): L11_1InvariantResult {
  const noMissing = validateL11MissingDataHandling({
    componentId: 'm',
    disclosesMissingData: false,
    laundersMissingData: false,
  });
  const noMissingBlocked = !noMissing.valid;

  const launderMissing = validateL11MissingDataHandling({
    componentId: 'l',
    disclosesMissingData: true,
    laundersMissingData: true,
  });
  const launderMissingBlocked = !launderMissing.valid;

  const cleanMissing = validateL11MissingDataHandling({
    componentId: 'c',
    disclosesMissingData: true,
    laundersMissingData: false,
  });
  const cleanMissingPasses = cleanMissing.valid;

  const noContra = validateL11ContradictionHandling({
    componentId: 'm',
    disclosesContradiction: false,
    laundersContradiction: false,
  });
  const noContraBlocked = !noContra.valid;

  const launderContra = validateL11ContradictionHandling({
    componentId: 'l',
    disclosesContradiction: true,
    laundersContradiction: true,
  });
  const launderContraBlocked = !launderContra.valid;

  const cleanContra = validateL11ContradictionHandling({
    componentId: 'c',
    disclosesContradiction: true,
    laundersContradiction: false,
  });
  const cleanContraPasses = cleanContra.valid;

  const lowerLayerLaundering = validateL11LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: [
      'launder missing data in score',
      'hide missing data in score',
      'launder contradiction in score',
      'hide contradiction in score',
    ],
  });
  const lowerLayerLaunderingBlocked = !lowerLayerLaundering.valid && lowerLayerLaundering.violations.length >= 4;

  const hasMissingProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.MISSING_DATA_LAUNDERING,
  );
  const hasContradictionProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.CONTRADICTION_LAUNDERING,
  );
  const missionMissing = L11_MISSION_CONSTRAINT.missingDataDisclosureRequired;
  const missionContra = L11_MISSION_CONSTRAINT.contradictionDisclosureRequired;

  return {
    id: 'INV-11.1-F',
    name: 'Missing data and contradiction must be disclosed and may not be laundered',
    holds:
      noMissingBlocked &&
      launderMissingBlocked &&
      cleanMissingPasses &&
      noContraBlocked &&
      launderContraBlocked &&
      cleanContraPasses &&
      lowerLayerLaunderingBlocked &&
      hasMissingProhibition &&
      hasContradictionProhibition &&
      missionMissing &&
      missionContra,
    evidence:
      `no_miss=${noMissingBlocked}, launder_miss=${launderMissingBlocked}, clean_miss=${cleanMissingPasses}, ` +
      `no_contra=${noContraBlocked}, launder_contra=${launderContraBlocked}, clean_contra=${cleanContraPasses}, ` +
      `lower_layer=${lowerLayerLaunderingBlocked}(v=${lowerLayerLaundering.violations.length}), ` +
      `miss_prohibition=${hasMissingProhibition}, contra_prohibition=${hasContradictionProhibition}, ` +
      `mission_miss=${missionMissing}, mission_contra=${missionContra}`,
  };
}

// ── INV-11.1-G : persistence route law ──
export function checkINV_111_G(): L11_1InvariantResult {
  const allOutputsHaveRoute = L11_OUTPUT_SURFACES.every(s => s.l5StorageRoute.length > 0);
  const allOutputsReplayable = L11_OUTPUT_SURFACES.every(s => s.replayRequired === true);
  const allOutputsLineage = L11_OUTPUT_SURFACES.every(
    s => s.requiredLineageFields.length > 0,
  );
  const hasL5Surfaces = L11_DEPENDENCY_SURFACES.some(s => s.layer === L11DependencyLayer.L5);
  const bypassProhibited = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.PERSISTENCE_BYPASS,
  );

  const bypassCheck = validateL11LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: ['direct postgres insert for score', 'bypass l5 in score'],
  });
  const bypassBlocked = !bypassCheck.valid;

  const restrictionRequest = requestL11DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'SUPPORT_INPUT',
    requestor: 'inv-G',
    timestamp: new Date().toISOString(),
  });
  const restrictionAwareEnforced = !restrictionRequest.allowed;

  const restrictionProfile = validateL11ScoreRestrictionProfile(
    getL11DefaultRestrictionProfile(),
    'r',
  );
  const restrictionPasses = restrictionProfile.valid;

  const restrictionMissing = validateL11ScoreRestrictionProfile(undefined, 'r');
  const restrictionMissingBlocked = !restrictionMissing.valid;

  const missionRequiresStorageRouting = L11_MISSION_CONSTRAINT.storageRoutingRequired;
  const missionRequiresRestriction =
    L11_MISSION_CONSTRAINT.restrictionPosturePreservationRequired;
  const profileValid = isValidL11RestrictionProfile(getL11DefaultRestrictionProfile());

  return {
    id: 'INV-11.1-G',
    name: 'All score outputs must be L5-routed and replay-safe with required lineage',
    holds:
      allOutputsHaveRoute &&
      allOutputsReplayable &&
      allOutputsLineage &&
      hasL5Surfaces &&
      bypassProhibited &&
      bypassBlocked &&
      restrictionAwareEnforced &&
      restrictionPasses &&
      restrictionMissingBlocked &&
      missionRequiresStorageRouting &&
      missionRequiresRestriction &&
      profileValid,
    evidence:
      `routes=${allOutputsHaveRoute}, replay=${allOutputsReplayable}, lineage=${allOutputsLineage}, ` +
      `l5=${hasL5Surfaces}, bypass_prohibited=${bypassProhibited}, bypass_blocked=${bypassBlocked}, ` +
      `restriction_aware=${restrictionAwareEnforced}, restriction_ok=${restrictionPasses}, ` +
      `restriction_missing=${restrictionMissingBlocked}, ` +
      `mission_storage=${missionRequiresStorageRouting}, mission_restriction=${missionRequiresRestriction}, ` +
      `profile_valid=${profileValid}`,
  };
}

// ── INV-11.1-H : calibration requirement law ──
export function checkINV_111_H(): L11_1InvariantResult {
  const productionMissing = validateL11CalibrationRequirement({
    componentId: 'p',
    hasCalibrationHook: false,
    productionGrade: true,
  });
  const productionMissingBlocked = !productionMissing.valid;

  const productionWith = validateL11CalibrationRequirement({
    componentId: 'p',
    hasCalibrationHook: true,
    productionGrade: true,
  });
  const productionWithPasses = productionWith.valid;

  const nonProdMissing = validateL11CalibrationRequirement({
    componentId: 'n',
    hasCalibrationHook: false,
    productionGrade: false,
  });
  const nonProdMissingPasses = nonProdMissing.valid;

  const calibrationHookOutput = L11_OUTPUT_SURFACES.find(
    s => s.outputClass === L11OutputSurfaceClass.SCORE_CALIBRATION_HOOK,
  );
  const calibrationHookRegistered =
    calibrationHookOutput !== undefined &&
    isL11RegisteredOutput('l11:score_calibration_hook') &&
    isL11RegisteredOutputClass(L11OutputSurfaceClass.SCORE_CALIBRATION_HOOK);

  const driftHookOutput = L11_OUTPUT_SURFACES.find(
    s => s.outputClass === L11OutputSurfaceClass.SCORE_DRIFT_HOOK,
  );
  const driftHookRegistered =
    driftHookOutput !== undefined &&
    isL11RegisteredOutput('l11:score_drift_hook') &&
    isL11RegisteredOutputClass(L11OutputSurfaceClass.SCORE_DRIFT_HOOK);

  const exactlyEightOutputClasses =
    ALL_L11_OUTPUT_SURFACE_CLASSES.length === 8 && L11_OUTPUT_SURFACES.length === 8;

  const hasCalibrationProhibition = L11_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === L11ForbiddenAction.CALIBRATION_HOOK_ABSENT,
  );
  const missionCalibration = L11_MISSION_CONSTRAINT.calibrationHookCapabilityRequired;

  // Score outputs must be calibration-hook-capable.
  const scoreOutputsCapable = L11_OUTPUT_SURFACES.filter(
    s =>
      s.outputClass === L11OutputSurfaceClass.SCORE_OUTPUT ||
      s.outputClass === L11OutputSurfaceClass.SCORE_COMPONENT_BREAKDOWN ||
      s.outputClass === L11OutputSurfaceClass.SCORE_CALIBRATION_HOOK,
  ).every(s => s.calibrationHookCapable);

  return {
    id: 'INV-11.1-H',
    name: 'Every production score must be capable of carrying a calibration hook',
    holds:
      productionMissingBlocked &&
      productionWithPasses &&
      nonProdMissingPasses &&
      calibrationHookRegistered &&
      driftHookRegistered &&
      exactlyEightOutputClasses &&
      hasCalibrationProhibition &&
      missionCalibration &&
      scoreOutputsCapable,
    evidence:
      `prod_missing=${productionMissingBlocked}, prod_with=${productionWithPasses}, ` +
      `non_prod=${nonProdMissingPasses}, calib_registered=${calibrationHookRegistered}, ` +
      `drift_registered=${driftHookRegistered}, eight=${exactlyEightOutputClasses}, ` +
      `prohibition=${hasCalibrationProhibition}, mission=${missionCalibration}, ` +
      `score_capable=${scoreOutputsCapable}`,
  };
}

export function checkAllL111Invariants(): readonly L11_1InvariantResult[] {
  return [
    checkINV_111_A(),
    checkINV_111_B(),
    checkINV_111_C(),
    checkINV_111_D(),
    checkINV_111_E(),
    checkINV_111_F(),
    checkINV_111_G(),
    checkINV_111_H(),
  ];
}
