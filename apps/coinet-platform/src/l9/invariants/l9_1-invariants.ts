/**
 * L9.1 — Constitutional Invariants
 *
 * §9.1.8.1 — INV-9.1-A through INV-9.1-H, all executable and test-covered.
 *
 *   INV-9.1-A : Only registered dependency surfaces from L3–L8 are
 *               consumable.
 *   INV-9.1-B : Only registered sequence-domain output classes may be
 *               emitted.
 *   INV-9.1-C : Layer 9 may not redefine lower-layer truth, validation,
 *               contradiction, confidence, restriction, regime, or
 *               primitive law.
 *   INV-9.1-D : Layer 9 may not emit scenario, score, judgment,
 *               recommendation, hypothesis, action-biased, or
 *               causal-certainty semantics.
 *   INV-9.1-E : Layer 9 may not silently flatten ordering ambiguity and
 *               may not launder temporal adjacency into causal certainty.
 *   INV-9.1-F : Layer 9 persists and serves only through L5-governed
 *               paths; stale sequence may not masquerade as fresh.
 *   INV-9.1-G : Layer 9 may not consume L7 outputs beyond their declared
 *               restriction rights; contradiction posture must be honoured.
 *   INV-9.1-H : Layer 9 may not consume L8 outputs without honouring
 *               regime posture, may not locally reinterpret regime, and
 *               may not consume late-layer (L10+) scenario/judgment/
 *               recommendation/score surfaces.
 */

import {
  L9_DEPENDENCY_SURFACES,
  isL9RegisteredDependency,
} from '../contracts/l9-dependency-surfaces';
import {
  L9_OUTPUT_SURFACES,
  isL9RegisteredOutput,
  isL9RegisteredOutputClass,
} from '../contracts/l9-output-surfaces';
import {
  ALL_L9_OUTPUT_SURFACE_CLASSES,
  L9DependencyLayer,
  L9OutputSurfaceClass,
} from '../contracts/l9-constitutional-types';
import {
  L9_MISSION_CONSTRAINT,
  isL9ForbiddenOutputClass,
} from '../contracts/l9-mission';
import {
  containsL9ForbiddenNaming,
  getL9ForbiddenNamePatterns,
} from '../contracts/l9-boundary';
import { L9_FORBIDDEN_ACTION_DEFINITIONS } from '../contracts/l9-forbidden-actions';
import {
  validateL9AmbiguityHandling,
  validateL9CausalRestraint,
  validateL9RestrictionHandling,
  validateL9RegimeHandling,
  validateL9StalenessHandling,
  validateL9LowerLayerInteraction,
  validateL9EvidenceGrounding,
} from '../constitution/l9-boundary-validator';
import { requestL9DependencyAccess } from '../constitution/l9-dependency-surface.registry';

export interface L9_1InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-9.1-A ──
// Layer 9 may consume only registered dependency surfaces from L3–L8.
export function checkINV_91_A(): L9_1InvariantResult {
  const all = L9_DEPENDENCY_SURFACES;
  const allRegistered = all.every(s => isL9RegisteredDependency(s.surfaceId));
  const unregisteredBlocked = !isL9RegisteredDependency('fake:unregistered_surface');
  const layersOk = all.every(s =>
    [
      L9DependencyLayer.L3,
      L9DependencyLayer.L4,
      L9DependencyLayer.L5,
      L9DependencyLayer.L6,
      L9DependencyLayer.L7,
      L9DependencyLayer.L8,
    ].includes(s.layer),
  );
  const hasL3 = all.some(s => s.layer === L9DependencyLayer.L3);
  const hasL4 = all.some(s => s.layer === L9DependencyLayer.L4);
  const hasL5 = all.some(s => s.layer === L9DependencyLayer.L5);
  const hasL6 = all.some(s => s.layer === L9DependencyLayer.L6);
  const hasL7 = all.some(s => s.layer === L9DependencyLayer.L7);
  const hasL8 = all.some(s => s.layer === L9DependencyLayer.L8);
  const l7AllStableHandoff = all
    .filter(s => s.layer === L9DependencyLayer.L7)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');
  const l8AllStableHandoff = all
    .filter(s => s.layer === L9DependencyLayer.L8)
    .every(s => s.authorityClass === 'STABLE_HANDOFF');
  return {
    id: 'INV-9.1-A',
    name: 'Only registered dependency surfaces from L3–L8 are consumable',
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
      l7AllStableHandoff &&
      l8AllStableHandoff,
    evidence:
      `registered=${all.length}, unregistered_blocked=${unregisteredBlocked}, ` +
      `layers_ok=${layersOk}, l3=${hasL3}, l4=${hasL4}, l5=${hasL5}, ` +
      `l6=${hasL6}, l7=${hasL7}, l8=${hasL8}, ` +
      `l7_stable=${l7AllStableHandoff}, l8_stable=${l8AllStableHandoff}`,
  };
}

// ── INV-9.1-B ──
// Layer 9 may emit only registered sequence-domain output classes.
export function checkINV_91_B(): L9_1InvariantResult {
  const outs = L9_OUTPUT_SURFACES;
  const allRegistered = outs.every(s => isL9RegisteredOutput(s.surfaceId));
  const allClassesRegistered = ALL_L9_OUTPUT_SURFACE_CLASSES.every(c =>
    isL9RegisteredOutputClass(c),
  );
  const unregisteredBlocked = !isL9RegisteredOutput('fake:unregistered_output');
  const missionConsistent = outs.every(s =>
    (L9_MISSION_CONSTRAINT.allowedOutputClasses as readonly L9OutputSurfaceClass[]).includes(
      s.outputClass,
    ),
  );
  const exactlySeven = outs.length === 7 && ALL_L9_OUTPUT_SURFACE_CLASSES.length === 7;
  return {
    id: 'INV-9.1-B',
    name: 'Only registered sequence-domain output classes may be emitted',
    holds:
      allRegistered &&
      allClassesRegistered &&
      unregisteredBlocked &&
      missionConsistent &&
      exactlySeven,
    evidence:
      `outputs=${outs.length}, classes=${ALL_L9_OUTPUT_SURFACE_CLASSES.length}, ` +
      `mission_consistent=${missionConsistent}, exactly_seven=${exactlySeven}`,
  };
}

// ── INV-9.1-C ──
// Layer 9 may not redefine lower-layer truth, validation, contradiction,
// confidence, restriction, regime, or primitive law.
export function checkINV_91_C(): L9_1InvariantResult {
  const redefineCheck = validateL9LowerLayerInteraction({
    componentId: 'test:bad',
    claimedBehaviors: [
      're-resolve identity for asset',
      'override confidence scores locally',
      'redefine feature semantics',
      'reinterpret event meaning',
      're-validate claim inside sequence',
      'override validation from L7',
      'bypass l7 restrictions',
      'ignore contradiction bundle',
      'widen restriction rights for downstream',
      'reinterpret regime locally',
      'override regime from L8',
      'ignore regime posture',
      'invent graph edges inside sequence',
    ],
  });
  const redefineBlocked = !redefineCheck.valid && redefineCheck.violations.length >= 8;

  const cleanCheck = validateL9LowerLayerInteraction({
    componentId: 'test:good',
    claimedBehaviors: [
      'consume l6 feature history for sequence construction',
      'consume l7 validation assessment via stable handoff',
      'consume l8 regime state via stable handoff',
      'persist sequence state via l5 write coordination',
    ],
  });
  const cleanPasses = cleanCheck.valid;

  const hasValidationProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'VALIDATION_TRUTH_REDEFINITION',
  );
  const hasContradictionProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CONTRADICTION_POSTURE_IGNORE',
  );
  const hasRestrictionProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RESTRICTION_POSTURE_IGNORE',
  );
  const hasRegimeReinterpretationProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'REGIME_REINTERPRETATION',
  );
  const hasPrimitiveProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_PRIMITIVE_REDEFINITION',
  );
  const hasIdentityProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_IDENTITY_REDEFINITION',
  );
  const hasGraphProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_GRAPH_REDEFINITION',
  );

  return {
    id: 'INV-9.1-C',
    name:
      'Lower-layer truth/validation/contradiction/confidence/restriction/regime/primitive ' +
      'law may not be redefined',
    holds:
      redefineBlocked &&
      cleanPasses &&
      hasValidationProhibition &&
      hasContradictionProhibition &&
      hasRestrictionProhibition &&
      hasRegimeReinterpretationProhibition &&
      hasPrimitiveProhibition &&
      hasIdentityProhibition &&
      hasGraphProhibition,
    evidence:
      `redefine_blocked=${redefineBlocked}(v=${redefineCheck.violations.length}), ` +
      `clean_passes=${cleanPasses}, validation=${hasValidationProhibition}, ` +
      `contradiction=${hasContradictionProhibition}, restriction=${hasRestrictionProhibition}, ` +
      `regime=${hasRegimeReinterpretationProhibition}, primitive=${hasPrimitiveProhibition}, ` +
      `identity=${hasIdentityProhibition}, graph=${hasGraphProhibition}`,
  };
}

// ── INV-9.1-D ──
// Layer 9 may not emit scenario, score, judgment, recommendation,
// hypothesis, action-biased, or causal-certainty semantics.
export function checkINV_91_D(): L9_1InvariantResult {
  const forbiddenNames = [
    'buy_signal',
    'sell_signal',
    'avoid_signal',
    'trade_signal',
    'scenario_winner',
    'final_scenario',
    'final_judgment',
    'final_score',
    'best_sequence',
    'winning_sequence',
    'winning_thesis',
    'recommendation',
    'conviction_sequence',
    'hypothesis_sequence',
    'scenario_chain',
    'ideal_timing',
    'alpha_phase',
    'actionable_setup',
    'trade_ready_sequence',
    'entry_ready_timing',
    'causal_certainty',
    'proven_causality',
    'bullish_confirmed_chain',
    'risk_on_buy_sequence',
  ];
  const allBlocked = forbiddenNames.every(n => containsL9ForbiddenNaming(n));

  const validNames = [
    'ordered_signal_chain_macro',
    'lead_lag_structure_spot_vs_funding',
    'phase_progression_post_accumulation',
    'change_point_evidence_liquidity_shift',
    'decay_state_post_narrative_digestion',
    'post_event_window_post_unlock',
    'sequence_confidence_structural',
    'sequence_restriction_profile_evidence_only',
    'sequence_ambiguity_unresolved_ordering',
  ];
  const allAllowed = validNames.every(n => !containsL9ForbiddenNaming(n));
  const patternsExist = getL9ForbiddenNamePatterns().length >= 30;

  const forbiddenClasses = [
    'FINAL_SCENARIO_WINNER',
    'FINAL_SCORE',
    'FINAL_JUDGMENT',
    'TRADE_RECOMMENDATION',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'AVOID_SIGNAL',
    'BEST_SEQUENCE',
    'WINNING_SEQUENCE',
    'IDEAL_TIMING',
    'ALPHA_PHASE',
    'ACTIONABLE_SETUP',
    'TRADE_READY_SEQUENCE',
    'CONVICTION_SEQUENCE',
    'HYPOTHESIS_SEQUENCE',
    'SCENARIO_CHAIN',
    'CAUSAL_CERTAINTY',
  ];
  const classesBlocked = forbiddenClasses.every(c => isL9ForbiddenOutputClass(c));

  const hasScenarioProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'FINAL_SCENARIO_LEAK',
  );
  const hasJudgmentProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'FINAL_JUDGMENT_LEAK',
  );
  const hasScoreProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'FINAL_SCORE_LEAK',
  );
  const hasRecProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RECOMMENDATION_LANGUAGE_LEAK',
  );
  const hasHypothesisProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'HYPOTHESIS_LEAK',
  );
  const hasActionBiasProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'ACTION_BIAS_IN_SEQUENCE_NAME',
  );

  return {
    id: 'INV-9.1-D',
    name: 'No scenario/score/judgment/recommendation/hypothesis/action-bias/causal-certainty semantics',
    holds:
      allBlocked &&
      allAllowed &&
      patternsExist &&
      classesBlocked &&
      hasScenarioProhibition &&
      hasJudgmentProhibition &&
      hasScoreProhibition &&
      hasRecProhibition &&
      hasHypothesisProhibition &&
      hasActionBiasProhibition,
    evidence:
      `forbidden_blocked=${allBlocked}, valid_allowed=${allAllowed}, ` +
      `patterns=${getL9ForbiddenNamePatterns().length}, classes_blocked=${classesBlocked}, ` +
      `scenario=${hasScenarioProhibition}, judgment=${hasJudgmentProhibition}, ` +
      `score=${hasScoreProhibition}, rec=${hasRecProhibition}, ` +
      `hypothesis=${hasHypothesisProhibition}, action_bias=${hasActionBiasProhibition}`,
  };
}

// ── INV-9.1-E ──
// Ordering ambiguity cannot be silently flattened, and temporal
// adjacency may not be promoted into causal certainty.
export function checkINV_91_E(): L9_1InvariantResult {
  const launderingBlocked = (
    [
      'TIE_BREAK_BY_RECENT_PRICE',
      'TIE_BREAK_BY_PREFERRED_NARRATIVE',
      'FLATTEN_TO_CLEAN_CHAIN',
      'DROP_AMBIGUITY_FLAG',
    ] as const
  ).every(
    strat => !validateL9AmbiguityHandling({ componentId: 'c', strategy: strat }).valid,
  );
  const preservationAllowed = (
    [
      'PRESERVE_AMBIGUITY_POSTURE',
      'EXPLICIT_AMBIGUOUS_FLAG',
      'EXPLICIT_LOW_CONFIDENCE',
    ] as const
  ).every(
    strat => validateL9AmbiguityHandling({ componentId: 'c', strategy: strat }).valid,
  );

  const causalCertaintyBlocked = !validateL9CausalRestraint({
    componentId: 'x',
    declaresCausalRestraint: false,
    claimsCausalCertainty: true,
  }).valid;
  const missingRestraintBlocked = !validateL9CausalRestraint({
    componentId: 'x',
    declaresCausalRestraint: false,
    claimsCausalCertainty: false,
  }).valid;
  const cleanRestraintAllowed = validateL9CausalRestraint({
    componentId: 'x',
    declaresCausalRestraint: true,
    claimsCausalCertainty: false,
  }).valid;

  const hasAmbiguityProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'AMBIGUITY_LAUNDERING',
  );
  const hasCausalProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CAUSAL_LAUNDERING',
  );
  const hasTheatricsProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'TEMPORAL_THEATRICS',
  );
  const missionRequiresCausalRestraint = L9_MISSION_CONSTRAINT.causalRestraintRequired;
  const missionRequiresAmbiguity = L9_MISSION_CONSTRAINT.ambiguityPreservationRequired;

  return {
    id: 'INV-9.1-E',
    name: 'Ordering ambiguity cannot be flattened; temporal adjacency cannot become causal certainty',
    holds:
      launderingBlocked &&
      preservationAllowed &&
      causalCertaintyBlocked &&
      missingRestraintBlocked &&
      cleanRestraintAllowed &&
      hasAmbiguityProhibition &&
      hasCausalProhibition &&
      hasTheatricsProhibition &&
      missionRequiresCausalRestraint &&
      missionRequiresAmbiguity,
    evidence:
      `laundering_blocked=${launderingBlocked}, preservation_allowed=${preservationAllowed}, ` +
      `causal_certainty_blocked=${causalCertaintyBlocked}, missing_restraint_blocked=${missingRestraintBlocked}, ` +
      `clean_restraint_allowed=${cleanRestraintAllowed}, ambiguity_prohibition=${hasAmbiguityProhibition}, ` +
      `causal_prohibition=${hasCausalProhibition}, theatrics_prohibition=${hasTheatricsProhibition}, ` +
      `mission_causal=${missionRequiresCausalRestraint}, mission_ambiguity=${missionRequiresAmbiguity}`,
  };
}

// ── INV-9.1-F ──
// All Layer 9 persistence and read behaviour must remain routed through
// governed L5 paths only; stale sequence cannot masquerade as fresh.
export function checkINV_91_F(): L9_1InvariantResult {
  const allOutputsHaveRoute = L9_OUTPUT_SURFACES.every(s => s.l5StorageRoute.length > 0);
  const allOutputsReplayable = L9_OUTPUT_SURFACES.every(s => s.replayRequired === true);
  const allOutputsLineage = L9_OUTPUT_SURFACES.every(s => s.requiredLineageFields.length > 0);
  const hasL5Surfaces = L9_DEPENDENCY_SURFACES.some(s => s.layer === L9DependencyLayer.L5);
  const bypassProhibited = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'ILLEGAL_L5_BYPASS',
  );
  const staleProhibited = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'STALE_SEQUENCE_MASQUERADE',
  );
  const rawProhibited = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RAW_DATA_SEQUENCE_INVENTION',
  );
  const bypassCheck = validateL9LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: ['direct postgres insert for sequence state', 'bypass l5 for cache'],
  });
  const bypassBlocked = !bypassCheck.valid;

  const staleMasquerade = validateL9StalenessHandling({
    componentId: 'x',
    explicitStalenessClassification: false,
    invalidatesOnInputStaleness: false,
    silentFallbackToLastKnown: true,
  });
  const staleBlocked = !staleMasquerade.valid;
  const staleOkWithClassification = validateL9StalenessHandling({
    componentId: 'x',
    explicitStalenessClassification: true,
    invalidatesOnInputStaleness: false,
    silentFallbackToLastKnown: false,
  }).valid;

  const rawCheck = validateL9LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: ['derive sequence from raw websocket feed'],
  });
  const rawBlocked = !rawCheck.valid;

  const missionRequiresStorageRouting = L9_MISSION_CONSTRAINT.storageRoutingRequired;

  return {
    id: 'INV-9.1-F',
    name: 'Persistence and reads must remain routed through L5; stale sequence cannot masquerade',
    holds:
      allOutputsHaveRoute &&
      allOutputsReplayable &&
      allOutputsLineage &&
      hasL5Surfaces &&
      bypassProhibited &&
      staleProhibited &&
      rawProhibited &&
      bypassBlocked &&
      staleBlocked &&
      staleOkWithClassification &&
      rawBlocked &&
      missionRequiresStorageRouting,
    evidence:
      `routes=${allOutputsHaveRoute}, replay=${allOutputsReplayable}, lineage=${allOutputsLineage}, ` +
      `l5_surfaces=${hasL5Surfaces}, bypass_prohibited=${bypassProhibited}, ` +
      `stale_prohibited=${staleProhibited}, raw_prohibited=${rawProhibited}, ` +
      `bypass_blocked=${bypassBlocked}, stale_blocked=${staleBlocked}, ` +
      `stale_ok_classified=${staleOkWithClassification}, raw_blocked=${rawBlocked}, ` +
      `mission_storage=${missionRequiresStorageRouting}`,
  };
}

// ── INV-9.1-G ──
// L7 outputs may not be consumed beyond their restriction rights;
// contradiction posture must be honoured.
export function checkINV_91_G(): L9_1InvariantResult {
  const widened = validateL9RestrictionHandling({
    componentId: 'w',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: true,
    honoursContradictionPosture: true,
  });
  const widenedBlocked = !widened.valid;

  const noPosture = validateL9RestrictionHandling({
    componentId: 'n',
    consumesL7Output: true,
    declaresRestrictionPosture: false,
    widensDownstreamRights: false,
    honoursContradictionPosture: true,
  });
  const noPostureBlocked = !noPosture.valid;

  const noContra = validateL9RestrictionHandling({
    componentId: 'c',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: false,
    honoursContradictionPosture: false,
  });
  const contraBlocked = !noContra.valid;

  const clean = validateL9RestrictionHandling({
    componentId: 'g',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: false,
    honoursContradictionPosture: true,
  });
  const cleanPasses = clean.valid;

  const restrictionRequest = requestL9DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'SEQUENCE_SIGNAL',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
  const registryBlocksMissingPosture = !restrictionRequest.allowed;

  const insufficient = requestL9DependencyAccess({
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
  const registryBlocksInsufficient = !insufficient.allowed;

  const full = requestL9DependencyAccess({
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
  const registryAllowsFull = full.allowed;

  const rawRevalidation = validateL9LowerLayerInteraction({
    componentId: 'r',
    claimedBehaviors: ['re-validate claim live from l6'],
  });
  const rawBlocked = !rawRevalidation.valid;

  const evidenceOnlyDecisive = validateL9EvidenceGrounding({
    componentId: 'e',
    usesEvidenceOnlySurface: true,
    treatsEvidenceAsDecisive: true,
    hasNonEvidencePrimarySupport: false,
  });
  const evidenceOnlyBlocked = !evidenceOnlyDecisive.valid;

  const hasRestrictionProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RESTRICTION_BYPASS',
  );
  const hasRawL6Prohibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RAW_L6_REVALIDATION_BYPASS',
  );
  const hasEvidenceOnlyProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'EVIDENCE_ONLY_AS_DECISIVE',
  );

  return {
    id: 'INV-9.1-G',
    name: 'L7 outputs may not be consumed beyond restriction rights; contradiction must be honoured',
    holds:
      widenedBlocked &&
      noPostureBlocked &&
      contraBlocked &&
      cleanPasses &&
      registryBlocksMissingPosture &&
      registryBlocksInsufficient &&
      registryAllowsFull &&
      rawBlocked &&
      evidenceOnlyBlocked &&
      hasRestrictionProhibition &&
      hasRawL6Prohibition &&
      hasEvidenceOnlyProhibition,
    evidence:
      `widened=${widenedBlocked}, no_posture=${noPostureBlocked}, contra=${contraBlocked}, ` +
      `clean=${cleanPasses}, registry_missing=${registryBlocksMissingPosture}, ` +
      `registry_insufficient=${registryBlocksInsufficient}, registry_full=${registryAllowsFull}, ` +
      `raw=${rawBlocked}, evidence_only=${evidenceOnlyBlocked}, ` +
      `restriction_prohibition=${hasRestrictionProhibition}, raw_l6_prohibition=${hasRawL6Prohibition}, ` +
      `evidence_only_prohibition=${hasEvidenceOnlyProhibition}`,
  };
}

// ── INV-9.1-H ──
// L8 regime posture must be honoured and regime may not be locally
// reinterpreted. L9 may not consume late-layer (L10+) surfaces.
export function checkINV_91_H(): L9_1InvariantResult {
  const noRegimePosture = validateL9RegimeHandling({
    componentId: 'x',
    consumesL8Output: true,
    honoursRegimePosture: false,
    reinterpretsRegime: false,
  });
  const noRegimePostureBlocked = !noRegimePosture.valid;

  const reinterpret = validateL9RegimeHandling({
    componentId: 'x',
    consumesL8Output: true,
    honoursRegimePosture: true,
    reinterpretsRegime: true,
  });
  const reinterpretBlocked = !reinterpret.valid;

  const clean = validateL9RegimeHandling({
    componentId: 'x',
    consumesL8Output: true,
    honoursRegimePosture: true,
    reinterpretsRegime: false,
  });
  const cleanPasses = clean.valid;

  const registryMissingRegime = requestL9DependencyAccess({
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
  const registryBlocksMissingRegime = !registryMissingRegime.allowed;

  const registryWithRegime = requestL9DependencyAccess({
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
  const registryAllowsRegime = registryWithRegime.allowed;

  const lateLayerCheck = validateL9LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: [
      'consume scenario from l10',
      'consume judgment from l12',
      'consume recommendation from l13',
      'consume l15 surface',
    ],
  });
  const lateLayerBlocked = !lateLayerCheck.valid && lateLayerCheck.violations.length >= 3;

  const hasRegimeIgnoreProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'REGIME_POSTURE_IGNORE',
  );
  const hasRegimeReinterpretProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'REGIME_REINTERPRETATION',
  );
  const hasLateLayerProhibition = L9_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LATE_LAYER_CONSUMPTION',
  );
  const missionRegimeRequired = L9_MISSION_CONSTRAINT.regimePosturePreservationRequired;

  return {
    id: 'INV-9.1-H',
    name:
      'L8 regime posture must be honoured, regime may not be locally reinterpreted, ' +
      'and late-layer surfaces may not be consumed',
    holds:
      noRegimePostureBlocked &&
      reinterpretBlocked &&
      cleanPasses &&
      registryBlocksMissingRegime &&
      registryAllowsRegime &&
      lateLayerBlocked &&
      hasRegimeIgnoreProhibition &&
      hasRegimeReinterpretProhibition &&
      hasLateLayerProhibition &&
      missionRegimeRequired,
    evidence:
      `no_regime_posture=${noRegimePostureBlocked}, reinterpret=${reinterpretBlocked}, ` +
      `clean=${cleanPasses}, registry_missing_regime=${registryBlocksMissingRegime}, ` +
      `registry_allows=${registryAllowsRegime}, late_layer=${lateLayerBlocked}(v=${lateLayerCheck.violations.length}), ` +
      `regime_ignore_prohibition=${hasRegimeIgnoreProhibition}, ` +
      `regime_reinterpret_prohibition=${hasRegimeReinterpretProhibition}, ` +
      `late_layer_prohibition=${hasLateLayerProhibition}, mission_regime=${missionRegimeRequired}`,
  };
}

export function checkAllL91Invariants(): readonly L9_1InvariantResult[] {
  return [
    checkINV_91_A(),
    checkINV_91_B(),
    checkINV_91_C(),
    checkINV_91_D(),
    checkINV_91_E(),
    checkINV_91_F(),
    checkINV_91_G(),
    checkINV_91_H(),
  ];
}
