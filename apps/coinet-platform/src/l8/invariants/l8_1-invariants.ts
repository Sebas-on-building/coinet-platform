/**
 * L8.1 — Constitutional Invariants
 *
 * §8.1.8.1 — INV-8.1-A through INV-8.1-G, all executable and test-covered.
 *
 *   INV-8.1-A : Only registered dependency surfaces from L3–L7 are
 *               consumable.
 *   INV-8.1-B : Only registered regime-domain output classes may be
 *               emitted.
 *   INV-8.1-C : Layer 8 may not redefine lower-layer truth, contradiction,
 *               confidence, or restriction law.
 *   INV-8.1-D : Layer 8 may not emit scenario-finality, score-finality,
 *               judgment-finality, or recommendation semantics.
 *   INV-8.1-E : Layer 8 may not silently flatten multi-regime ambiguity
 *               into fake certainty.
 *   INV-8.1-F : Layer 8 persists and serves only through L5-governed paths.
 *   INV-8.1-G : Layer 8 may not consume L7 outputs beyond their declared
 *               restriction rights.
 */

import {
  L8_DEPENDENCY_SURFACES,
  isL8RegisteredDependency,
} from '../contracts/l8-dependency-surfaces';
import {
  L8_OUTPUT_SURFACES,
  isL8RegisteredOutput,
  isL8RegisteredOutputClass,
} from '../contracts/l8-output-surfaces';
import {
  ALL_L8_OUTPUT_SURFACE_CLASSES,
  L8DependencyLayer,
  L8OutputSurfaceClass,
} from '../contracts/l8-constitutional-types';
import {
  L8_MISSION_CONSTRAINT,
  isL8ForbiddenOutputClass,
} from '../contracts/l8-mission';
import {
  containsL8ForbiddenNaming,
  getL8ForbiddenNamePatterns,
} from '../contracts/l8-boundary';
import { L8_FORBIDDEN_ACTION_DEFINITIONS } from '../contracts/l8-forbidden-actions';
import {
  validateL8AmbiguityHandling,
  validateL8RestrictionHandling,
  validateL8StalenessHandling,
  validateL8LowerLayerInteraction,
  validateL8MultiplierGrounding,
} from '../constitution/l8-boundary-validator';
import { requestL8DependencyAccess } from '../constitution/l8-dependency-surface.registry';

export interface L8_1InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-8.1-A ──
// Layer 8 may consume only registered dependency surfaces from L3–L7.
export function checkINV_81_A(): L8_1InvariantResult {
  const all = L8_DEPENDENCY_SURFACES;
  const allRegistered = all.every(s => isL8RegisteredDependency(s.surfaceId));
  const unregisteredBlocked = !isL8RegisteredDependency('fake:unregistered_surface');
  const layersOk = all.every(s =>
    [
      L8DependencyLayer.L3,
      L8DependencyLayer.L4,
      L8DependencyLayer.L5,
      L8DependencyLayer.L6,
      L8DependencyLayer.L7,
    ].includes(s.layer),
  );
  const hasL7 = all.some(s => s.layer === L8DependencyLayer.L7);
  const hasL6 = all.some(s => s.layer === L8DependencyLayer.L6);
  const hasL5 = all.some(s => s.layer === L8DependencyLayer.L5);
  return {
    id: 'INV-8.1-A',
    name: 'Only registered dependency surfaces from L3–L7 are consumable',
    holds: allRegistered && unregisteredBlocked && layersOk && hasL7 && hasL6 && hasL5,
    evidence:
      `registered=${all.length}, unregistered_blocked=${unregisteredBlocked}, ` +
      `layers_ok=${layersOk}, l7=${hasL7}, l6=${hasL6}, l5=${hasL5}`,
  };
}

// ── INV-8.1-B ──
// Layer 8 may emit only registered regime-domain output classes.
export function checkINV_81_B(): L8_1InvariantResult {
  const outs = L8_OUTPUT_SURFACES;
  const allRegistered = outs.every(s => isL8RegisteredOutput(s.surfaceId));
  const allClassesRegistered = ALL_L8_OUTPUT_SURFACE_CLASSES.every(c =>
    isL8RegisteredOutputClass(c),
  );
  const unregisteredBlocked = !isL8RegisteredOutput('fake:unregistered_output');
  const missionConsistent = outs.every(s =>
    (L8_MISSION_CONSTRAINT.allowedOutputClasses as readonly L8OutputSurfaceClass[])
      .includes(s.outputClass),
  );
  return {
    id: 'INV-8.1-B',
    name: 'Only registered regime-domain output classes may be emitted',
    holds: allRegistered && allClassesRegistered && unregisteredBlocked && missionConsistent,
    evidence:
      `outputs=${outs.length}, classes=${ALL_L8_OUTPUT_SURFACE_CLASSES.length}, ` +
      `mission_consistent=${missionConsistent}`,
  };
}

// ── INV-8.1-C ──
// Layer 8 may not redefine lower-layer truth, contradiction, confidence,
// or restriction law.
export function checkINV_81_C(): L8_1InvariantResult {
  const redefineCheck = validateL8LowerLayerInteraction({
    componentId: 'test:bad',
    claimedBehaviors: [
      're-resolve identity for asset',
      'override confidence scores locally',
      'redefine feature semantics',
      'reinterpret event meaning',
      're-validate claim inside regime',
      'override validation from L7',
      'bypass l7 restrictions',
      'ignore contradiction bundle',
      'widen restriction rights for downstream',
    ],
  });
  const redefineBlocked = !redefineCheck.valid && redefineCheck.violations.length >= 5;

  const cleanCheck = validateL8LowerLayerInteraction({
    componentId: 'test:good',
    claimedBehaviors: [
      'consume l6 current feature state',
      'consume l7 validation assessment via stable handoff',
      'persist regime state via l5 write coordination',
    ],
  });
  const cleanPasses = cleanCheck.valid;

  const hasValidationProhibition = L8_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'VALIDATION_TRUTH_REDEFINITION',
  );
  const hasContradictionProhibition = L8_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CONTRADICTION_POSTURE_IGNORE',
  );
  const hasRestrictionProhibition = L8_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RESTRICTION_POSTURE_IGNORE',
  );
  const hasPrimitiveProhibition = L8_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_PRIMITIVE_REDEFINITION',
  );

  return {
    id: 'INV-8.1-C',
    name: 'Lower-layer truth/contradiction/confidence/restriction law may not be redefined',
    holds:
      redefineBlocked &&
      cleanPasses &&
      hasValidationProhibition &&
      hasContradictionProhibition &&
      hasRestrictionProhibition &&
      hasPrimitiveProhibition,
    evidence:
      `redefine_blocked=${redefineBlocked}, clean_passes=${cleanPasses}, ` +
      `validation=${hasValidationProhibition}, contradiction=${hasContradictionProhibition}, ` +
      `restriction=${hasRestrictionProhibition}, primitive=${hasPrimitiveProhibition}`,
  };
}

// ── INV-8.1-D ──
// Layer 8 may not emit scenario-finality, score-finality, judgment-
// finality, or recommendation semantics.
export function checkINV_81_D(): L8_1InvariantResult {
  const forbiddenNames = [
    'buy_signal',
    'sell_signal',
    'avoid_signal',
    'trade_signal',
    'scenario_winner',
    'final_scenario',
    'final_judgment',
    'final_score',
    'best_regime',
    'winning_thesis',
    'recommendation',
    'conviction_trade',
    'buy_ready_regime',
    'risk_on_buy',
    'attractive_regime',
  ];
  const allBlocked = forbiddenNames.every(n => containsL8ForbiddenNaming(n));
  const validNames = [
    'market_regime_macro_risk_on',
    'sector_regime_ecosystem_expansion',
    'asset_regime_post_unlock_digestion',
    'leverage_regime_deleveraging',
    'regime_multiplier_momentum_damped',
  ];
  const allAllowed = validNames.every(n => !containsL8ForbiddenNaming(n));
  const patternsExist = getL8ForbiddenNamePatterns().length >= 20;

  const forbiddenClasses = [
    'FINAL_SCENARIO_WINNER',
    'FINAL_SCORE',
    'FINAL_JUDGMENT',
    'TRADE_RECOMMENDATION',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'WINNING_THESIS',
  ];
  const classesBlocked = forbiddenClasses.every(c => isL8ForbiddenOutputClass(c));

  return {
    id: 'INV-8.1-D',
    name: 'No scenario, score, judgment-finality, or recommendation semantics',
    holds: allBlocked && allAllowed && patternsExist && classesBlocked,
    evidence:
      `forbidden_blocked=${allBlocked}, valid_allowed=${allAllowed}, ` +
      `patterns=${getL8ForbiddenNamePatterns().length}, classes_blocked=${classesBlocked}`,
  };
}

// ── INV-8.1-E ──
// Layer 8 may not silently flatten multi-regime ambiguity into fake
// certainty.
export function checkINV_81_E(): L8_1InvariantResult {
  const launderingBlocked = (
    [
      'TIE_BREAK_BY_RECENT_PRICE',
      'TIE_BREAK_BY_PREFERRED_NARRATIVE',
      'FLATTEN_TO_SINGLE_REGIME',
      'DROP_TRANSITION_DURING_TRANSITION',
    ] as const
  ).every(
    strat => !validateL8AmbiguityHandling({ componentId: 'c', strategy: strat }).valid,
  );
  const preservationAllowed = (
    ['PRESERVE_COEXISTENCE', 'EXPLICIT_TRANSITION_FLAG', 'EXPLICIT_LOW_CONFIDENCE'] as const
  ).every(
    strat => validateL8AmbiguityHandling({ componentId: 'c', strategy: strat }).valid,
  );
  const hasProhibition = L8_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'AMBIGUITY_LAUNDERING',
  );
  const multiplierUngrounded = validateL8MultiplierGrounding({
    componentId: 'm',
    multiplierBoundToRegime: false,
    honoursRestrictionPosture: true,
    isFinalScoreShape: false,
  });
  const ungroundedBlocked = !multiplierUngrounded.valid;
  return {
    id: 'INV-8.1-E',
    name: 'Multi-regime ambiguity cannot be flattened into fake certainty',
    holds: launderingBlocked && preservationAllowed && hasProhibition && ungroundedBlocked,
    evidence:
      `laundering_blocked=${launderingBlocked}, preservation_allowed=${preservationAllowed}, ` +
      `prohibition_declared=${hasProhibition}, ungrounded_blocked=${ungroundedBlocked}`,
  };
}

// ── INV-8.1-F ──
// All Layer 8 persistence and read behavior must remain routed through
// governed L5 paths only.
export function checkINV_81_F(): L8_1InvariantResult {
  const allOutputsHaveRoute = L8_OUTPUT_SURFACES.every(s => s.l5StorageRoute.length > 0);
  const allOutputsReplayable = L8_OUTPUT_SURFACES.every(s => s.replayRequired === true);
  const allOutputsLineage = L8_OUTPUT_SURFACES.every(s => s.requiredLineageFields.length > 0);
  const hasL5Surfaces = L8_DEPENDENCY_SURFACES.some(s => s.layer === L8DependencyLayer.L5);
  const bypassProhibited = L8_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'ILLEGAL_L5_BYPASS',
  );
  const bypassCheck = validateL8LowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: ['direct postgres insert for regime state'],
  });
  const bypassBlocked = !bypassCheck.valid;

  const staleMasquerade = validateL8StalenessHandling({
    componentId: 'x',
    explicitStalenessClassification: false,
    invalidatesOnInputStaleness: false,
    silentFallbackToLastKnown: true,
  });
  const staleBlocked = !staleMasquerade.valid;

  return {
    id: 'INV-8.1-F',
    name: 'Persistence and reads must remain routed through L5',
    holds:
      allOutputsHaveRoute &&
      allOutputsReplayable &&
      allOutputsLineage &&
      hasL5Surfaces &&
      bypassProhibited &&
      bypassBlocked &&
      staleBlocked,
    evidence:
      `routes=${allOutputsHaveRoute}, replay=${allOutputsReplayable}, ` +
      `lineage=${allOutputsLineage}, l5_surfaces=${hasL5Surfaces}, ` +
      `bypass_prohibited=${bypassProhibited}, bypass_blocked=${bypassBlocked}, ` +
      `stale_blocked=${staleBlocked}`,
  };
}

// ── INV-8.1-G ──
// Layer 8 may not consume L7 outputs beyond their declared restriction
// rights — no restriction bypass, no contradiction posture ignored, no
// live raw-L6 revalidation.
export function checkINV_81_G(): L8_1InvariantResult {
  // Widened rights → blocked
  const widened = validateL8RestrictionHandling({
    componentId: 'w',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: true,
    honoursContradictionPosture: true,
  });
  const widenedBlocked = !widened.valid;

  // No posture declared → blocked
  const noPosture = validateL8RestrictionHandling({
    componentId: 'n',
    consumesL7Output: true,
    declaresRestrictionPosture: false,
    widensDownstreamRights: false,
    honoursContradictionPosture: true,
  });
  const noPostureBlocked = !noPosture.valid;

  // Contradiction ignored → blocked
  const noContra = validateL8RestrictionHandling({
    componentId: 'c',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: false,
    honoursContradictionPosture: false,
  });
  const contraBlocked = !noContra.valid;

  // Clean → passes
  const clean = validateL8RestrictionHandling({
    componentId: 'g',
    consumesL7Output: true,
    declaresRestrictionPosture: true,
    widensDownstreamRights: false,
    honoursContradictionPosture: true,
  });
  const cleanPasses = clean.valid;

  // Restriction-aware dependency registry enforces posture at access time.
  const restrictionRequest = requestL8DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'MULTIPLIER_INPUT',
    requestor: 'test',
    timestamp: new Date().toISOString(),
  });
  const registryBlocksMissingPosture = !restrictionRequest.allowed;

  const insufficientPosture = requestL8DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'MULTIPLIER_INPUT',
    requestor: 'test',
    timestamp: new Date().toISOString(),
    l7RestrictionPosture: {
      allowsRegimeConditioning: true,
      allowsMultiplierInput: false,
      allowsConfidenceInput: true,
    },
  });
  const registryBlocksInsufficientPosture = !insufficientPosture.allowed;

  const fullPosture = requestL8DependencyAccess({
    surfaceId: 'l7:validation_assessment',
    requestedUsage: 'MULTIPLIER_INPUT',
    requestor: 'test',
    timestamp: new Date().toISOString(),
    l7RestrictionPosture: {
      allowsRegimeConditioning: true,
      allowsMultiplierInput: true,
      allowsConfidenceInput: true,
    },
  });
  const registryAllowsFullPosture = fullPosture.allowed;

  // Raw-L6 revalidation bypass blocked
  const rawRevalidation = validateL8LowerLayerInteraction({
    componentId: 'r',
    claimedBehaviors: ['re-validate claim live from l6'],
  });
  const rawBlocked = !rawRevalidation.valid;

  const hasRestrictionProhibition = L8_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RESTRICTION_BYPASS',
  );
  const hasRawL6Prohibition = L8_FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'RAW_L6_REVALIDATION_BYPASS',
  );

  return {
    id: 'INV-8.1-G',
    name: 'L7 outputs may not be consumed beyond their restriction rights',
    holds:
      widenedBlocked &&
      noPostureBlocked &&
      contraBlocked &&
      cleanPasses &&
      registryBlocksMissingPosture &&
      registryBlocksInsufficientPosture &&
      registryAllowsFullPosture &&
      rawBlocked &&
      hasRestrictionProhibition &&
      hasRawL6Prohibition,
    evidence:
      `widened=${widenedBlocked}, no_posture=${noPostureBlocked}, contra=${contraBlocked}, ` +
      `clean=${cleanPasses}, registry_missing=${registryBlocksMissingPosture}, ` +
      `registry_insufficient=${registryBlocksInsufficientPosture}, ` +
      `registry_full=${registryAllowsFullPosture}, raw=${rawBlocked}, ` +
      `restriction_prohibition=${hasRestrictionProhibition}, raw_l6_prohibition=${hasRawL6Prohibition}`,
  };
}

export function checkAllL81Invariants(): readonly L8_1InvariantResult[] {
  return [
    checkINV_81_A(),
    checkINV_81_B(),
    checkINV_81_C(),
    checkINV_81_D(),
    checkINV_81_E(),
    checkINV_81_F(),
    checkINV_81_G(),
  ];
}
