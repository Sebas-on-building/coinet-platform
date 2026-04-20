/**
 * L10.1 — Constitutional Invariants
 *
 * §10.1.10 — INV-10.1-A through INV-10.1-H, all executable and test-covered.
 *
 *   INV-10.1-A : Only registered dependency surfaces from L3–L9 are
 *                consumable; L7/L8/L9 dependencies are stable-handoff only.
 *   INV-10.1-B : Only registered hypothesis-domain output classes may be
 *                emitted (exactly five).
 *   INV-10.1-C : Layer 10 may not redefine lower-layer truth,
 *                validation, contradiction, confidence, restriction,
 *                regime, sequence, or primitive law.
 *   INV-10.1-D : Layer 10 may not emit scenario, score, judgment,
 *                recommendation, conviction, final-explanation,
 *                causal-certainty, or single-story semantics.
 *   INV-10.1-E : Competition preservation — plausible alternatives,
 *                spread, evidence asymmetry, confirmation gaps,
 *                invalidation posture, and shift conditions must
 *                remain visible; single-story collapse is forbidden.
 *   INV-10.1-F : Persistence and reads must remain routed through
 *                governed L5 paths; outputs must carry required lineage
 *                and be replay-safe.
 *   INV-10.1-G : L7 outputs may not be consumed beyond their restriction
 *                rights; contradiction posture must be honoured; live
 *                L7 revalidation from L6 is forbidden.
 *   INV-10.1-H : L8 regime posture and L9 sequence posture must be
 *                honoured and may not be locally reclassified; temporal
 *                adjacency may not become causal certainty; late-layer
 *                (L11+) surfaces may not be consumed.
 */

import {
  L10_DEPENDENCY_SURFACES,
  isL10RegisteredDependency,
} from '../contracts/l10-dependency-surfaces';
import {
  L10_OUTPUT_SURFACES,
  isL10RegisteredOutput,
  isL10RegisteredOutputClass,
} from '../contracts/l10-output-surfaces';
import {
  ALL_L10_OUTPUT_SURFACE_CLASSES,
  L10DependencyLayer,
  L10OutputSurfaceClass,
} from '../contracts/l10-constitutional-types';
import {
  L10_MISSION_CONSTRAINT,
  isL10ForbiddenOutputClass,
} from '../contracts/l10-mission';
import {
  containsL10ForbiddenNaming,
  getL10ForbiddenNamePatterns,
} from '../contracts/l10-boundary';
import { L10_FORBIDDEN_ACTION_DEFINITIONS } from '../contracts/l10-forbidden-actions';
import {
  validateL10CompetitionHandling,
  validateL10PrimaryPosture,
  validateL10CausalRestraint,
  validateL10RestrictionHandling,
  validateL10RegimeHandling,
  validateL10SequenceHandling,
  validateL10LowerLayerInteraction,
  validateL10EvidenceGrounding,
} from '../constitution/l10-boundary-validator';
import { requestL10DependencyAccess } from '../constitution/l10-dependency-surface.registry';

export interface L10_1InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-10.1-A ──
export function checkINV_101_A(): L10_1InvariantResult {
  const all = L10_DEPENDENCY_SURFACES;
  const allRegistered = all.every(s => isL10RegisteredDependency(s.surfaceId));
  const unregisteredBlocked = !isL10RegisteredDependency('fake:unregistered_surface');
  const layersOk = all.every(s =>
    [
      L10DependencyLayer.L3,
      L10DependencyLayer.L4,
      L10DependencyLayer.L5,
      L10DependencyLayer.L6,
      L10DependencyLayer.L7,
      L10DependencyLayer.L8,
      L10DependencyLayer.L9,
    ].includes(s.layer),
  );
  const hasL3 = all.some(s => s.layer === L10DependencyLayer.L3);
  const hasL4 = all.some(s => s.layer === L10DependencyLayer.L4);
  const hasL5 = all.some(s => s.layer === L10DependencyLayer.L5);
  const hasL6 = all.some(s => s.layer === L10DependencyLayer.L6);
  const hasL7 = all.some(s => s.layer === L10DependencyLayer.L7);
  const hasL8 = all.some(s => s.layer === L10DependencyLayer.L8);
  const hasL9 = all.some(s => s.layer === L10DependencyLayer.L9);
  const l7AllStableHandoff = all
    .filter(s => s.layer === L10DependencyLayer.L7)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l8AllStableHandoff = all
    .filter(s => s.layer === L10DependencyLayer.L8)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l9AllStableHandoff = all
    .filter(s => s.layer === L10DependencyLayer.L9)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');
  return {
    id: 'INV-10.1-A',
    name: 'Only registered dependency surfaces from L3–L9 are consumable; L7/L8/L9 are stable-handoff only',
    holds:
      allRegistered &&
      unregisteredBlocked &&
      layersOk &&
      hasL3 &&
      hasL4 &&
      hasL5 &&
      hasL6 &&
      hasL7 &&
      hasL8 &&
      hasL9 &&
      l7AllStableHandoff &&
      l8AllStableHandoff &&
      l9AllStableHandoff,
    evidence:
      `registered=${all.length}, unregistered_blocked=${unregisteredBlocked}, ` +
      `layers_ok=${layersOk}, l3=${hasL3}, l4=${hasL4}, l5=${hasL5}, ` +
      `l6=${hasL6}, l7=${hasL7}, l8=${hasL8}, l9=${hasL9}, ` +
      `l7_stable=${l7AllStableHandoff}, l8_stable=${l8AllStableHandoff}, l9_stable=${l9AllStableHandoff}`,
  };
}

// ── INV-10.1-B ──
export function checkINV_101_B(): L10_1InvariantResult {
  const outs = L10_OUTPUT_SURFACES;
  const allRegistered = outs.every(s => isL10RegisteredOutput(s.surfaceId));
  const allClassesRegistered = ALL_L10_OUTPUT_SURFACE_CLASSES.every(c =>
    isL10RegisteredOutputClass(c),
  );
  const unregisteredBlocked = !isL10RegisteredOutput('fake:unregistered_output');
  const missionConsistent = outs.every(s =>
    (L10_MISSION_CONSTRAINT.allowedOutputClasses as readonly L10OutputSurfaceClass[]).includes(
      s.outputClass,
    ),
  );
  const exactlyFive = outs.length === 5 && ALL_L10_OUTPUT_SURFACE_CLASSES.length === 5;
  return {
    id: 'INV-10.1-B',
    name: 'Only registered hypothesis-domain output classes may be emitted (exactly five)',
    holds:
      allRegistered &&
      allClassesRegistered &&
      unregisteredBlocked &&
      missionConsistent &&
      exactlyFive,
    evidence:
      `outputs=${outs.length}, classes=${ALL_L10_OUTPUT_SURFACE_CLASSES.length}, ` +
      `mission_consistent=${missionConsistent}, exactly_five=${exactlyFive}`,
  };
}

// ── INV-10.1-C ──
export function checkINV_101_C(): L10_1InvariantResult {
  const redefineCheck = validateL10LowerLayerInteraction({
    componentId: 'test:bad',
    claimedBehaviors: [
      're-resolve identity for asset',
      'redefine feature semantics',
      'reinterpret event meaning',
      're-validate claim inside hypothesis',
      'override validation from L7',
      'bypass l7 restrictions',
      'ignore contradiction bundle',
      'widen restriction rights for downstream',
      'reinterpret regime locally',
      'override regime from L8',
      'ignore regime posture',
      'reinterpret sequence locally',
      'override sequence from L9',
      'ignore sequence posture',
      'drop ambiguity flag',
      'invent graph edges inside hypothesis',
      'bypass l5 for cache',
      'derive hypothesis from raw websocket feed',
    ],
  });
  const redefineBlocked = !redefineCheck.valid && redefineCheck.violations.length >= 12;

  const cleanCheck = validateL10LowerLayerInteraction({
    componentId: 'test:good',
    claimedBehaviors: [
      'consume l6 feature history for hypothesis evidence',
      'consume l7 validation assessment via stable handoff',
      'consume l8 regime state via stable handoff',
      'consume l9 sequence assessment via stable handoff',
      'persist hypothesis state via l5 write coordination',
    ],
  });
  const cleanPasses = cleanCheck.valid;

  const hasValidationProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_TRUTH_REDEFINITION',
  );
  const hasContradictionProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CONTRADICTION_POSTURE_OVERWRITE',
  );
  const hasRestrictionProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RESTRICTION_POSTURE_IGNORED',
  );
  const hasRegimeReclassifyProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'REGIME_RECLASSIFICATION',
  );
  const hasSequenceReinterpretProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'SEQUENCE_REINTERPRETATION',
  );
  const hasPrimitiveProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_PRIMITIVE_REDEFINITION',
  );
  const hasIdentityProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_IDENTITY_REDEFINITION',
  );
  const hasGraphProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_GRAPH_REDEFINITION',
  );

  return {
    id: 'INV-10.1-C',
    name:
      'Lower-layer truth/validation/contradiction/confidence/restriction/regime/sequence/primitive ' +
      'law may not be redefined',
    holds:
      redefineBlocked &&
      cleanPasses &&
      hasValidationProhibition &&
      hasContradictionProhibition &&
      hasRestrictionProhibition &&
      hasRegimeReclassifyProhibition &&
      hasSequenceReinterpretProhibition &&
      hasPrimitiveProhibition &&
      hasIdentityProhibition &&
      hasGraphProhibition,
    evidence:
      `redefine_blocked=${redefineBlocked}(v=${redefineCheck.violations.length}), ` +
      `clean_passes=${cleanPasses}, validation=${hasValidationProhibition}, ` +
      `contradiction=${hasContradictionProhibition}, restriction=${hasRestrictionProhibition}, ` +
      `regime=${hasRegimeReclassifyProhibition}, sequence=${hasSequenceReinterpretProhibition}, ` +
      `primitive=${hasPrimitiveProhibition}, identity=${hasIdentityProhibition}, graph=${hasGraphProhibition}`,
  };
}

// ── INV-10.1-D ──
export function checkINV_101_D(): L10_1InvariantResult {
  const forbiddenNames = [
    'buy_signal',
    'sell_signal',
    'avoid_signal',
    'trade_signal',
    'scenario_winner',
    'final_scenario',
    'final_judgment',
    'final_score',
    'final_explanation',
    'final_narrative',
    'winning_explanation',
    'winning_thesis',
    'best_explanation',
    'best_hypothesis',
    'best_opportunity',
    'highest_conviction',
    'conviction_ranking',
    'conviction_explanation',
    'ideal_explanation',
    'ideal_hypothesis',
    'alpha_explanation',
    'actionable_explanation',
    'actionable_hypothesis',
    'clear_buy_explanation',
    'clear_sell_explanation',
    'trade_ready',
    'entry_ready',
    'recommendation',
    'single_story',
    'the_explanation',
    'proven_cause',
    'causal_certainty',
    'causal_proof',
    'validation_override',
    'regime_override',
    'sequence_override',
  ];
  const allBlocked = forbiddenNames.every(n => containsL10ForbiddenNaming(n));

  const validNames = [
    'hypothesis_candidate_narrative_driven',
    'hypothesis_candidate_liquidity_driven',
    'hypothesis_competition_primary_vs_alternative',
    'hypothesis_ranking_with_spread',
    'hypothesis_spread_profile',
    'support_domain_binding_primary',
    'contradiction_domain_binding_primary',
    'confirmation_gap_unresolved_funding',
    'invalidation_risk_regime_transition',
    'shift_condition_set_spread_narrowing',
    'hypothesis_restriction_profile_evidence_only',
    'hypothesis_evidence_pack',
  ];
  const allAllowed = validNames.every(n => !containsL10ForbiddenNaming(n));
  const patternsExist = getL10ForbiddenNamePatterns().length >= 40;

  const forbiddenClasses = [
    'FINAL_SCENARIO_WINNER',
    'FINAL_EXPLANATION_WINNER',
    'FINAL_EXPLANATION_NARRATIVE',
    'FINAL_SCORE',
    'FINAL_JUDGMENT',
    'TRADE_RECOMMENDATION',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'AVOID_SIGNAL',
    'CONVICTION_RANKING',
    'HIGHEST_CONVICTION_EXPLANATION',
    'BEST_OPPORTUNITY',
    'BEST_EXPLANATION',
    'WINNING_EXPLANATION',
    'WINNING_THESIS',
    'PROVEN_CAUSE',
    'CAUSAL_CERTAINTY',
    'ALPHA_EXPLANATION',
    'ACTIONABLE_EXPLANATION',
    'CLEAR_BUY_EXPLANATION',
    'IDEAL_EXPLANATION',
  ];
  const classesBlocked = forbiddenClasses.every(c => isL10ForbiddenOutputClass(c));

  const hasScenarioProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'FINAL_SCENARIO_LEAK',
  );
  const hasJudgmentProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'FINAL_JUDGMENT_LEAK',
  );
  const hasScoreProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'FINAL_SCORE_LEAK',
  );
  const hasRecProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RECOMMENDATION_LANGUAGE_LEAK',
  );
  const hasConvictionProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CONVICTION_LANGUAGE_LEAK',
  );
  const hasSingleStoryProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'SINGLE_STORY_COLLAPSE',
  );
  const hasPrimaryAsFinalProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'PRIMARY_AS_FINAL_TRUTH',
  );
  const hasCausalProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CAUSAL_LAUNDERING',
  );

  return {
    id: 'INV-10.1-D',
    name:
      'No scenario/score/judgment/recommendation/conviction/final-explanation/causal-certainty/single-story semantics',
    holds:
      allBlocked &&
      allAllowed &&
      patternsExist &&
      classesBlocked &&
      hasScenarioProhibition &&
      hasJudgmentProhibition &&
      hasScoreProhibition &&
      hasRecProhibition &&
      hasConvictionProhibition &&
      hasSingleStoryProhibition &&
      hasPrimaryAsFinalProhibition &&
      hasCausalProhibition,
    evidence:
      `forbidden_blocked=${allBlocked}, valid_allowed=${allAllowed}, ` +
      `patterns=${getL10ForbiddenNamePatterns().length}, classes_blocked=${classesBlocked}, ` +
      `scenario=${hasScenarioProhibition}, judgment=${hasJudgmentProhibition}, ` +
      `score=${hasScoreProhibition}, rec=${hasRecProhibition}, ` +
      `conviction=${hasConvictionProhibition}, single_story=${hasSingleStoryProhibition}, ` +
      `primary_as_final=${hasPrimaryAsFinalProhibition}, causal=${hasCausalProhibition}`,
  };
}

// ── INV-10.1-E ──
export function checkINV_101_E(): L10_1InvariantResult {
  const collapsed = validateL10CompetitionHandling({
    componentId: 'c',
    preservesAlternatives: false,
    emitsSpread: false,
    hidesCloseSpread: true,
    preservesEvidenceAsymmetry: false,
    emitsShiftConditions: false,
    collapsesToSingleStory: true,
    dropsPlausibleCompetitor: true,
  });
  const collapseBlocked = !collapsed.valid && collapsed.violations.length >= 5;

  const healthy = validateL10CompetitionHandling({
    componentId: 'c',
    preservesAlternatives: true,
    emitsSpread: true,
    hidesCloseSpread: false,
    preservesEvidenceAsymmetry: true,
    emitsShiftConditions: true,
    collapsesToSingleStory: false,
    dropsPlausibleCompetitor: false,
  });
  const healthyPasses = healthy.valid;

  const primaryFinal = validateL10PrimaryPosture({
    componentId: 'p',
    primaryLabelledAsFinal: true,
    stripsSpreadFields: true,
    stripsAlternativeFields: true,
  });
  const primaryFinalBlocked = !primaryFinal.valid && primaryFinal.violations.length >= 3;

  const primaryClean = validateL10PrimaryPosture({
    componentId: 'p',
    primaryLabelledAsFinal: false,
    stripsSpreadFields: false,
    stripsAlternativeFields: false,
  });
  const primaryCleanPasses = primaryClean.valid;

  const hasAlternativeProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'ALTERNATIVE_SUPPRESSION',
  );
  const hasCloseSpreadProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CLOSE_SPREAD_CONCEALMENT',
  );
  const hasConfirmationGapProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CONFIRMATION_GAP_CONCEALMENT',
  );
  const hasInvalidationProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'INVALIDATION_POSTURE_CONCEALMENT',
  );
  const hasExplanationLaunderingProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'EXPLANATION_LAUNDERING',
  );
  const missionCompetition = L10_MISSION_CONSTRAINT.competitionPreservationRequired;
  const missionSpread = L10_MISSION_CONSTRAINT.spreadPreservationRequired;
  const missionAlternative = L10_MISSION_CONSTRAINT.alternativePreservationRequired;
  const missionShift = L10_MISSION_CONSTRAINT.shiftConditionPreservationRequired;

  return {
    id: 'INV-10.1-E',
    name:
      'Competition preservation — alternatives, spread, evidence asymmetry, confirmation gaps, ' +
      'invalidation posture, and shift conditions must remain visible',
    holds:
      collapseBlocked &&
      healthyPasses &&
      primaryFinalBlocked &&
      primaryCleanPasses &&
      hasAlternativeProhibition &&
      hasCloseSpreadProhibition &&
      hasConfirmationGapProhibition &&
      hasInvalidationProhibition &&
      hasExplanationLaunderingProhibition &&
      missionCompetition &&
      missionSpread &&
      missionAlternative &&
      missionShift,
    evidence:
      `collapse_blocked=${collapseBlocked}(v=${collapsed.violations.length}), ` +
      `healthy=${healthyPasses}, primary_final_blocked=${primaryFinalBlocked}(v=${primaryFinal.violations.length}), ` +
      `primary_clean=${primaryCleanPasses}, alt=${hasAlternativeProhibition}, ` +
      `spread=${hasCloseSpreadProhibition}, confirmation=${hasConfirmationGapProhibition}, ` +
      `invalidation=${hasInvalidationProhibition}, laundering=${hasExplanationLaunderingProhibition}, ` +
      `mission_competition=${missionCompetition}, mission_spread=${missionSpread}, ` +
      `mission_alternative=${missionAlternative}, mission_shift=${missionShift}`,
  };
}

// ── INV-10.1-F ──
export function checkINV_101_F(): L10_1InvariantResult {
  const allOutputsHaveRoute = L10_OUTPUT_SURFACES.every(s => s.l5StorageRoute.length > 0);
  const allOutputsReplayable = L10_OUTPUT_SURFACES.every(s => s.replayRequired === true);
  const allOutputsLineage = L10_OUTPUT_SURFACES.every(s => s.requiredLineageFields.length > 0);
  const hasL5Surfaces = L10_DEPENDENCY_SURFACES.some(s => s.layer === L10DependencyLayer.L5);
  const bypassProhibited = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'ILLEGAL_L5_BYPASS',
  );
  const rawProhibited = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RAW_DATA_HYPOTHESIS_INVENTION',
  );
  const bypassCheck = validateL10LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: ['direct postgres insert for hypothesis state', 'bypass l5 for cache'],
  });
  const bypassBlocked = !bypassCheck.valid;

  const rawCheck = validateL10LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: ['derive hypothesis from raw websocket feed'],
  });
  const rawBlocked = !rawCheck.valid;

  const missionRequiresStorageRouting = L10_MISSION_CONSTRAINT.storageRoutingRequired;

  return {
    id: 'INV-10.1-F',
    name: 'Persistence and reads must remain routed through L5; outputs must carry lineage and be replay-safe',
    holds:
      allOutputsHaveRoute &&
      allOutputsReplayable &&
      allOutputsLineage &&
      hasL5Surfaces &&
      bypassProhibited &&
      rawProhibited &&
      bypassBlocked &&
      rawBlocked &&
      missionRequiresStorageRouting,
    evidence:
      `routes=${allOutputsHaveRoute}, replay=${allOutputsReplayable}, lineage=${allOutputsLineage}, ` +
      `l5_surfaces=${hasL5Surfaces}, bypass_prohibited=${bypassProhibited}, ` +
      `raw_prohibited=${rawProhibited}, bypass_blocked=${bypassBlocked}, ` +
      `raw_blocked=${rawBlocked}, mission_storage=${missionRequiresStorageRouting}`,
  };
}

// ── INV-10.1-G ──
export function checkINV_101_G(): L10_1InvariantResult {
  const widened = validateL10RestrictionHandling({
    componentId: 'w',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: true,
    honoursContradictionPosture: true,
    overwritesContradictionPosture: false,
  });
  const widenedBlocked = !widened.valid;

  const noPosture = validateL10RestrictionHandling({
    componentId: 'n',
    consumesL7Output: true,
    declaresRestrictionPosture: false,
    widensDownstreamRights: false,
    honoursContradictionPosture: true,
    overwritesContradictionPosture: false,
  });
  const noPostureBlocked = !noPosture.valid;

  const noContra = validateL10RestrictionHandling({
    componentId: 'c',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: false,
    honoursContradictionPosture: false,
    overwritesContradictionPosture: false,
  });
  const contraBlocked = !noContra.valid;

  const contraOverwrite = validateL10RestrictionHandling({
    componentId: 'o',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: false,
    honoursContradictionPosture: true,
    overwritesContradictionPosture: true,
  });
  const contraOverwriteBlocked = !contraOverwrite.valid;

  const clean = validateL10RestrictionHandling({
    componentId: 'g',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: false,
    honoursContradictionPosture: true,
    overwritesContradictionPosture: false,
  });
  const cleanPasses = clean.valid;

  const restrictionRequest = requestL10DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'SUPPORT_EVIDENCE',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
  const registryBlocksMissingPosture = !restrictionRequest.allowed;

  const insufficient = requestL10DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'SUPPORT_EVIDENCE',
    requestor: 'test',
    timestamp: new Date().toISOString(),
    restrictionPosture: {
      allowsSupportEvidence: false,
      allowsContradictionEvidence: true,
      allowsRankingInput: false,
      allowsConfidenceInput: true,
      allowsRegimeConditioning: false,
      allowsSequenceConditioning: false,
    },
  });
  const registryBlocksInsufficient = !insufficient.allowed;

  const full = requestL10DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'SUPPORT_EVIDENCE',
    requestor: 'test',
    timestamp: new Date().toISOString(),
    restrictionPosture: {
      allowsSupportEvidence: true,
      allowsContradictionEvidence: true,
      allowsRankingInput: true,
      allowsConfidenceInput: true,
      allowsRegimeConditioning: false,
      allowsSequenceConditioning: false,
    },
  });
  const registryAllowsFull = full.allowed;

  const rawRevalidation = validateL10LowerLayerInteraction({
    componentId: 'r',
    claimedBehaviors: ['re-validate claim live from l6'],
  });
  const rawRevalidationBlocked = !rawRevalidation.valid;

  const evidenceOnlyDecisive = validateL10EvidenceGrounding({
    componentId: 'e',
    usesEvidenceOnlySurface: true,
    treatsEvidenceAsDecisive: true,
    hasNonEvidencePrimarySupport: false,
    invventsFromRawData: false,
  });
  const evidenceOnlyBlocked = !evidenceOnlyDecisive.valid;

  const hasRestrictionBypassProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RESTRICTION_BYPASS',
  );
  const hasL7LiveProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'L7_LIVE_REVALIDATION',
  );
  const hasExplanationLaunderingProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'EXPLANATION_LAUNDERING',
  );

  return {
    id: 'INV-10.1-G',
    name: 'L7 outputs may not be consumed beyond restriction rights; contradiction posture must be honoured; no live L7 revalidation',
    holds:
      widenedBlocked &&
      noPostureBlocked &&
      contraBlocked &&
      contraOverwriteBlocked &&
      cleanPasses &&
      registryBlocksMissingPosture &&
      registryBlocksInsufficient &&
      registryAllowsFull &&
      rawRevalidationBlocked &&
      evidenceOnlyBlocked &&
      hasRestrictionBypassProhibition &&
      hasL7LiveProhibition &&
      hasExplanationLaunderingProhibition,
    evidence:
      `widened=${widenedBlocked}, no_posture=${noPostureBlocked}, contra=${contraBlocked}, ` +
      `contra_overwrite=${contraOverwriteBlocked}, clean=${cleanPasses}, ` +
      `registry_missing=${registryBlocksMissingPosture}, registry_insufficient=${registryBlocksInsufficient}, ` +
      `registry_full=${registryAllowsFull}, raw=${rawRevalidationBlocked}, evidence_only=${evidenceOnlyBlocked}, ` +
      `restriction=${hasRestrictionBypassProhibition}, l7_live=${hasL7LiveProhibition}, ` +
      `laundering=${hasExplanationLaunderingProhibition}`,
  };
}

// ── INV-10.1-H ──
export function checkINV_101_H(): L10_1InvariantResult {
  const noRegimePosture = validateL10RegimeHandling({
    componentId: 'x',
    consumesL8Output: true,
    honoursRegimePosture: false,
    reinterpretsRegime: false,
  });
  const noRegimePostureBlocked = !noRegimePosture.valid;

  const regimeReinterpret = validateL10RegimeHandling({
    componentId: 'x',
    consumesL8Output: true,
    honoursRegimePosture: true,
    reinterpretsRegime: true,
  });
  const regimeReinterpretBlocked = !regimeReinterpret.valid;

  const regimeClean = validateL10RegimeHandling({
    componentId: 'x',
    consumesL8Output: true,
    honoursRegimePosture: true,
    reinterpretsRegime: false,
  });
  const regimeCleanPasses = regimeClean.valid;

  const noSequencePosture = validateL10SequenceHandling({
    componentId: 'x',
    consumesL9Output: true,
    honoursSequencePosture: false,
    reinterpretsSequence: false,
    dropsAmbiguityPosture: false,
    dropsCausalRestraintTag: false,
  });
  const noSequencePostureBlocked = !noSequencePosture.valid;

  const sequenceReinterpret = validateL10SequenceHandling({
    componentId: 'x',
    consumesL9Output: true,
    honoursSequencePosture: true,
    reinterpretsSequence: true,
    dropsAmbiguityPosture: false,
    dropsCausalRestraintTag: false,
  });
  const sequenceReinterpretBlocked = !sequenceReinterpret.valid;

  const dropCausalRestraint = validateL10SequenceHandling({
    componentId: 'x',
    consumesL9Output: true,
    honoursSequencePosture: true,
    reinterpretsSequence: false,
    dropsAmbiguityPosture: false,
    dropsCausalRestraintTag: true,
  });
  const dropCausalBlocked = !dropCausalRestraint.valid;

  const sequenceClean = validateL10SequenceHandling({
    componentId: 'x',
    consumesL9Output: true,
    honoursSequencePosture: true,
    reinterpretsSequence: false,
    dropsAmbiguityPosture: false,
    dropsCausalRestraintTag: false,
  });
  const sequenceCleanPasses = sequenceClean.valid;

  const regimeFullPosture = {
    allowsSupportEvidence: true,
    allowsContradictionEvidence: true,
    allowsRankingInput: true,
    allowsConfidenceInput: true,
    allowsRegimeConditioning: true,
    allowsSequenceConditioning: false,
  };
  const registryMissingRegime = requestL10DependencyAccess({
    surfaceId: 'l8:regime_state',
    requestedUsage: 'REGIME_CONDITIONING',
    requestor: 'test',
    timestamp: new Date().toISOString(),
    restrictionPosture: regimeFullPosture,
  });
  const registryBlocksMissingRegime = !registryMissingRegime.allowed;

  const registryWithRegime = requestL10DependencyAccess({
    surfaceId: 'l8:regime_state',
    requestedUsage: 'REGIME_CONDITIONING',
    requestor: 'test',
    timestamp: new Date().toISOString(),
    restrictionPosture: regimeFullPosture,
    honoursRegimePosture: true,
  });
  const registryAllowsRegime = registryWithRegime.allowed;

  const sequenceFullPosture = {
    allowsSupportEvidence: true,
    allowsContradictionEvidence: true,
    allowsRankingInput: true,
    allowsConfidenceInput: true,
    allowsRegimeConditioning: false,
    allowsSequenceConditioning: true,
  };
  const registryMissingSequence = requestL10DependencyAccess({
    surfaceId: 'l9:sequence_assessment',
    requestedUsage: 'SEQUENCE_CONDITIONING',
    requestor: 'test',
    timestamp: new Date().toISOString(),
    restrictionPosture: sequenceFullPosture,
  });
  const registryBlocksMissingSequence = !registryMissingSequence.allowed;

  const registryWithSequence = requestL10DependencyAccess({
    surfaceId: 'l9:sequence_assessment',
    requestedUsage: 'SEQUENCE_CONDITIONING',
    requestor: 'test',
    timestamp: new Date().toISOString(),
    restrictionPosture: sequenceFullPosture,
    honoursSequencePosture: true,
  });
  const registryAllowsSequence = registryWithSequence.allowed;

  const causalCertaintyBlocked = !validateL10CausalRestraint({
    componentId: 'x',
    declaresCausalRestraint: false,
    claimsCausalCertainty: true,
    usesAdjacencyAsCause: false,
    usesRegimeCompatibilityAsCause: false,
    usesLeadLagAsCause: false,
  }).valid;

  const adjacencyBlocked = !validateL10CausalRestraint({
    componentId: 'x',
    declaresCausalRestraint: true,
    claimsCausalCertainty: false,
    usesAdjacencyAsCause: true,
    usesRegimeCompatibilityAsCause: false,
    usesLeadLagAsCause: false,
  }).valid;

  const leadLagCauseBlocked = !validateL10CausalRestraint({
    componentId: 'x',
    declaresCausalRestraint: true,
    claimsCausalCertainty: false,
    usesAdjacencyAsCause: false,
    usesRegimeCompatibilityAsCause: false,
    usesLeadLagAsCause: true,
  }).valid;

  const restraintClean = validateL10CausalRestraint({
    componentId: 'x',
    declaresCausalRestraint: true,
    claimsCausalCertainty: false,
    usesAdjacencyAsCause: false,
    usesRegimeCompatibilityAsCause: false,
    usesLeadLagAsCause: false,
  }).valid;

  const lateLayerCheck = validateL10LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: [
      'consume scenario from l11',
      'consume judgment from l12',
      'consume recommendation from l13',
      'consume l15 surface',
    ],
  });
  const lateLayerBlocked = !lateLayerCheck.valid && lateLayerCheck.violations.length >= 3;

  const hasRegimeIgnoreProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'REGIME_POSTURE_OVERWRITE',
  );
  const hasRegimeReclassifyProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'REGIME_RECLASSIFICATION',
  );
  const hasSequenceOverwriteProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'SEQUENCE_POSTURE_OVERWRITE',
  );
  const hasSequenceReinterpretProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'SEQUENCE_REINTERPRETATION',
  );
  const hasCausalProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CAUSAL_LAUNDERING',
  );
  const hasLateLayerProhibition = L10_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LATE_LAYER_CONSUMPTION',
  );
  const missionRegimeRequired = L10_MISSION_CONSTRAINT.regimePosturePreservationRequired;
  const missionSequenceRequired = L10_MISSION_CONSTRAINT.sequencePosturePreservationRequired;
  const missionCausalRequired = L10_MISSION_CONSTRAINT.causalRestraintRequired;

  return {
    id: 'INV-10.1-H',
    name:
      'L8 regime and L9 sequence posture must be honoured; temporal adjacency cannot become causal ' +
      'certainty; late-layer surfaces may not be consumed',
    holds:
      noRegimePostureBlocked &&
      regimeReinterpretBlocked &&
      regimeCleanPasses &&
      noSequencePostureBlocked &&
      sequenceReinterpretBlocked &&
      dropCausalBlocked &&
      sequenceCleanPasses &&
      registryBlocksMissingRegime &&
      registryAllowsRegime &&
      registryBlocksMissingSequence &&
      registryAllowsSequence &&
      causalCertaintyBlocked &&
      adjacencyBlocked &&
      leadLagCauseBlocked &&
      restraintClean &&
      lateLayerBlocked &&
      hasRegimeIgnoreProhibition &&
      hasRegimeReclassifyProhibition &&
      hasSequenceOverwriteProhibition &&
      hasSequenceReinterpretProhibition &&
      hasCausalProhibition &&
      hasLateLayerProhibition &&
      missionRegimeRequired &&
      missionSequenceRequired &&
      missionCausalRequired,
    evidence:
      `regime_no_posture=${noRegimePostureBlocked}, regime_reinterpret=${regimeReinterpretBlocked}, ` +
      `regime_clean=${regimeCleanPasses}, sequence_no_posture=${noSequencePostureBlocked}, ` +
      `sequence_reinterpret=${sequenceReinterpretBlocked}, drop_causal=${dropCausalBlocked}, ` +
      `sequence_clean=${sequenceCleanPasses}, registry_missing_regime=${registryBlocksMissingRegime}, ` +
      `registry_regime=${registryAllowsRegime}, registry_missing_sequence=${registryBlocksMissingSequence}, ` +
      `registry_sequence=${registryAllowsSequence}, causal=${causalCertaintyBlocked}, ` +
      `adjacency=${adjacencyBlocked}, lead_lag=${leadLagCauseBlocked}, restraint_clean=${restraintClean}, ` +
      `late_layer=${lateLayerBlocked}(v=${lateLayerCheck.violations.length}), ` +
      `regime_overwrite_prohibition=${hasRegimeIgnoreProhibition}, regime_reclass_prohibition=${hasRegimeReclassifyProhibition}, ` +
      `sequence_overwrite_prohibition=${hasSequenceOverwriteProhibition}, sequence_reinterpret_prohibition=${hasSequenceReinterpretProhibition}, ` +
      `causal_prohibition=${hasCausalProhibition}, late_layer_prohibition=${hasLateLayerProhibition}, ` +
      `mission_regime=${missionRegimeRequired}, mission_sequence=${missionSequenceRequired}, mission_causal=${missionCausalRequired}`,
  };
}

export function checkAllL101Invariants(): readonly L10_1InvariantResult[] {
  return [
    checkINV_101_A(),
    checkINV_101_B(),
    checkINV_101_C(),
    checkINV_101_D(),
    checkINV_101_E(),
    checkINV_101_F(),
    checkINV_101_G(),
    checkINV_101_H(),
  ];
}
