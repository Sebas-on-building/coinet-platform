/**
 * L7.1 — Constitutional Invariants
 *
 * §7.1.9.1 — INV-7.1-A through INV-7.1-G, all executable and test-covered.
 */

import {
  L7_DEPENDENCY_SURFACES,
  isRegisteredDependency,
} from '../contracts/l7-dependency-surfaces';
import {
  L7_OUTPUT_SURFACES,
  isRegisteredOutput,
  isRegisteredOutputClass,
} from '../contracts/l7-output-surfaces';
import {
  ALL_OUTPUT_SURFACE_CLASSES,
  L7DependencyLayer,
  L7OutputSurfaceClass,
} from '../contracts/l7-constitutional-types';
import {
  L7_MISSION_CONSTRAINT,
  isForbiddenOutputClass,
} from '../contracts/l7-mission';
import {
  containsForbiddenNaming,
  getForbiddenNamePatterns,
} from '../contracts/l7-boundary';
import { FORBIDDEN_ACTION_DEFINITIONS } from '../contracts/l7-forbidden-actions';
import {
  validateContradictionHandling,
  validateAmbiguityHandling,
  validateStalenessHandling,
  validateIncompletenessHandling,
  validateLowerLayerInteraction,
} from '../constitution/l7-boundary-validator';

export interface L7InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-7.1-A ──
// Layer 7 may consume only registered dependency surfaces from L3–L6.
export function checkINV_71_A(): L7InvariantResult {
  const all = L7_DEPENDENCY_SURFACES;
  const allRegistered = all.every(s => isRegisteredDependency(s.surfaceId));
  const unregisteredBlocked = !isRegisteredDependency('fake:unregistered_surface');
  const layersOk = all.every(s =>
    [L7DependencyLayer.L3, L7DependencyLayer.L4, L7DependencyLayer.L5, L7DependencyLayer.L6]
      .includes(s.layer),
  );
  return {
    id: 'INV-7.1-A',
    name: 'Only registered dependency surfaces are consumable',
    holds: allRegistered && unregisteredBlocked && layersOk,
    evidence:
      `registered=${all.length}, unregistered_blocked=${unregisteredBlocked}, layers_ok=${layersOk}`,
  };
}

// ── INV-7.1-B ──
// Layer 7 may emit only registered validation-domain output classes.
export function checkINV_71_B(): L7InvariantResult {
  const outs = L7_OUTPUT_SURFACES;
  const allRegistered = outs.every(s => isRegisteredOutput(s.surfaceId));
  const allClassesRegistered = ALL_OUTPUT_SURFACE_CLASSES.every(c => isRegisteredOutputClass(c));
  const unregisteredBlocked = !isRegisteredOutput('fake:unregistered_output');
  const missionConsistent = outs.every(s =>
    (L7_MISSION_CONSTRAINT.allowedOutputClasses as readonly L7OutputSurfaceClass[])
      .includes(s.outputClass),
  );
  return {
    id: 'INV-7.1-B',
    name: 'Only registered validation-domain output classes may be emitted',
    holds: allRegistered && allClassesRegistered && unregisteredBlocked && missionConsistent,
    evidence:
      `outputs=${outs.length}, classes=${ALL_OUTPUT_SURFACE_CLASSES.length}, ` +
      `mission_consistent=${missionConsistent}`,
  };
}

// ── INV-7.1-C ──
// Layer 7 may not redefine lower-layer primitive meaning or confidence law.
export function checkINV_71_C(): L7InvariantResult {
  const redefineCheck = validateLowerLayerInteraction({
    componentId: 'test:bad',
    claimedBehaviors: [
      're-resolve identity for asset',
      'override confidence scores locally',
      'redefine feature semantics',
      'reinterpret event meaning',
    ],
  });
  const redefineBlocked = !redefineCheck.valid && redefineCheck.violations.length >= 4;

  const cleanCheck = validateLowerLayerInteraction({
    componentId: 'test:good',
    claimedBehaviors: [
      'consume l6 current feature state',
      'consume l3 confidence scores',
      'persist validation state via l5 write coordination',
    ],
  });
  const cleanPasses = cleanCheck.valid;

  const hasPrimitiveProhibition = FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'ILLEGAL_PRIMITIVE_REINTERPRETATION',
  );
  const hasConfidenceProhibition = FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'LOWER_LAYER_CONFIDENCE_OVERRIDE',
  );

  return {
    id: 'INV-7.1-C',
    name: 'Lower-layer primitive meaning and confidence law may not be redefined',
    holds: redefineBlocked && cleanPasses && hasPrimitiveProhibition && hasConfidenceProhibition,
    evidence:
      `redefine_blocked=${redefineBlocked}, clean_passes=${cleanPasses}, ` +
      `primitive_prohibition=${hasPrimitiveProhibition}, confidence_prohibition=${hasConfidenceProhibition}`,
  };
}

// ── INV-7.1-D ──
// Layer 7 may not emit scenario, recommendation, scoring-finality, or
// judgment-finality semantics.
export function checkINV_71_D(): L7InvariantResult {
  const forbiddenNames = [
    'buy_ready_validation',
    'final_bullish_truth',
    'best_trade_confirmed',
    'highest_conviction_opportunity',
    'scenario_winner',
    'judgment_override',
    'trade_signal',
    'final_score',
  ];
  const allBlocked = forbiddenNames.every(n => containsForbiddenNaming(n));
  const validNames = [
    'story_support_assessment',
    'contradiction_bundle_funding_divergence',
    'confidence_assessment_structural',
  ];
  const allAllowed = validNames.every(n => !containsForbiddenNaming(n));
  const patternsExist = getForbiddenNamePatterns().length >= 15;

  const forbiddenClasses = [
    'FINAL_SCENARIO_WINNER',
    'FINAL_SCORE',
    'FINAL_OPPORTUNITY_RANKING',
    'FINAL_ACTION_RECOMMENDATION',
    'TRADE_RECOMMENDATION',
    'BUY_SIGNAL',
  ];
  const classesBlocked = forbiddenClasses.every(c => isForbiddenOutputClass(c));

  return {
    id: 'INV-7.1-D',
    name: 'No scenario, recommendation, or judgment-finality semantics',
    holds: allBlocked && allAllowed && patternsExist && classesBlocked,
    evidence:
      `forbidden_blocked=${allBlocked}, valid_allowed=${allAllowed}, ` +
      `patterns=${getForbiddenNamePatterns().length}, classes_blocked=${classesBlocked}`,
  };
}

// ── INV-7.1-E ──
// Contradiction may not be flattened or silently hidden.
export function checkINV_71_E(): L7InvariantResult {
  const launderingBlocked = (
    ['AVERAGE_AWAY', 'SILENT_DROP', 'SILENT_REWEIGHT_TO_SUPPORT', 'DOWNGRADE_WITHOUT_LAW'] as const
  ).every(
    strat => !validateContradictionHandling({ componentId: 'c', strategy: strat }).valid,
  );
  const preservationAllowed = (
    ['PRESERVE_ALL', 'PRESERVE_WITH_LINEAGE'] as const
  ).every(
    strat => validateContradictionHandling({ componentId: 'c', strategy: strat }).valid,
  );
  const hasProhibition = FORBIDDEN_ACTION_DEFINITIONS.some(
    d => d.action === 'CONTRADICTION_LAUNDERING',
  );
  return {
    id: 'INV-7.1-E',
    name: 'Contradiction cannot be flattened or silently hidden',
    holds: launderingBlocked && preservationAllowed && hasProhibition,
    evidence:
      `laundering_blocked=${launderingBlocked}, preservation_allowed=${preservationAllowed}, ` +
      `prohibition_declared=${hasProhibition}`,
  };
}

// ── INV-7.1-F ──
// Staleness, incompleteness, and ambiguity may not be silently ignored
// when materially relevant.
export function checkINV_71_F(): L7InvariantResult {
  const ambBlocked = (
    [
      'RESOLVE_BY_RECENT_PRICE',
      'RESOLVE_BY_PREFERRED_NARRATIVE',
      'RESOLVE_BY_SELECTIVE_WEIGHTING',
      'IGNORE_MISSING_CONFIRMATION',
    ] as const
  ).every(s => !validateAmbiguityHandling({ componentId: 'x', strategy: s }).valid);
  const ambAllowed = (['PRESERVE_AMBIGUITY', 'EXPLICIT_LEGAL_RESOLUTION'] as const).every(
    s => validateAmbiguityHandling({ componentId: 'x', strategy: s }).valid,
  );

  const staleMasquerade = validateStalenessHandling({
    componentId: 'x',
    propagatesToValidationClass: false,
    propagatesToConfidence: false,
    propagatesToRestriction: false,
    explicitStalenessModifier: false,
  });
  const staleBlocked = !staleMasquerade.valid;

  const staleVisible = validateStalenessHandling({
    componentId: 'x',
    propagatesToValidationClass: true,
    propagatesToConfidence: true,
    propagatesToRestriction: false,
    explicitStalenessModifier: true,
  });
  const staleAllowed = staleVisible.valid;

  const incBlocked = (['SILENT_FILL_AS_CONFIRMED', 'SILENT_IGNORE'] as const).every(
    a => !validateIncompletenessHandling({ componentId: 'x', missingSurfaceAction: a }).valid,
  );
  const incAllowed = (['PROPAGATE_INCOMPLETE_CLASS', 'EXPLICIT_MISSING_EVIDENCE_REASON'] as const)
    .every(a => validateIncompletenessHandling({ componentId: 'x', missingSurfaceAction: a }).valid);

  return {
    id: 'INV-7.1-F',
    name: 'Staleness, incompleteness, ambiguity cannot be silently ignored',
    holds:
      ambBlocked && ambAllowed && staleBlocked && staleAllowed && incBlocked && incAllowed,
    evidence:
      `amb_blocked=${ambBlocked}, amb_allowed=${ambAllowed}, ` +
      `stale_blocked=${staleBlocked}, stale_allowed=${staleAllowed}, ` +
      `inc_blocked=${incBlocked}, inc_allowed=${incAllowed}`,
  };
}

// ── INV-7.1-G ──
// All Layer 7 persistence and read behavior must remain routed through
// governed L5 paths only.
export function checkINV_71_G(): L7InvariantResult {
  const allOutputsHaveRoute = L7_OUTPUT_SURFACES.every(s => s.l5StorageRoute.length > 0);
  const allOutputsReplayable = L7_OUTPUT_SURFACES.every(s => s.replayRequired === true);
  const allOutputsLineage = L7_OUTPUT_SURFACES.every(s => s.requiredLineageFields.length > 0);
  const hasL5Surfaces = L7_DEPENDENCY_SURFACES.some(s => s.layer === L7DependencyLayer.L5);
  const bypassProhibited = FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === 'ILLEGAL_L5_BYPASS');
  const bypassCheck = validateLowerLayerInteraction({
    componentId: 'x',
    claimedBehaviors: ['direct postgres insert for validation state'],
  });
  const bypassBlocked = !bypassCheck.valid;
  return {
    id: 'INV-7.1-G',
    name: 'Persistence and reads must remain routed through L5',
    holds:
      allOutputsHaveRoute &&
      allOutputsReplayable &&
      allOutputsLineage &&
      hasL5Surfaces &&
      bypassProhibited &&
      bypassBlocked,
    evidence:
      `routes=${allOutputsHaveRoute}, replay=${allOutputsReplayable}, ` +
      `lineage=${allOutputsLineage}, l5_surfaces=${hasL5Surfaces}, ` +
      `bypass_prohibited=${bypassProhibited}, bypass_blocked=${bypassBlocked}`,
  };
}

export function checkAllL71Invariants(): readonly L7InvariantResult[] {
  return [
    checkINV_71_A(),
    checkINV_71_B(),
    checkINV_71_C(),
    checkINV_71_D(),
    checkINV_71_E(),
    checkINV_71_F(),
    checkINV_71_G(),
  ];
}
