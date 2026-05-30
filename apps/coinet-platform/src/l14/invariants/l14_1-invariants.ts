/**
 * L14.1 — Constitutional Invariants
 *
 * §14.1.22 — INV-14.1-A through INV-14.1-H.
 */

import {
  L14_CANONICAL_MISSION,
  L14_FIRST_PRINCIPLE,
} from '../contracts/l14-mission';
import {
  ALL_L14_ALLOWED_CAPABILITIES,
  L14AllowedCapability,
} from '../contracts/l14-capability-policy';
import {
  L14ForbiddenAction,
} from '../contracts/l14-forbidden-actions';
import {
  ALL_L14_DEPENDENCY_SURFACE_CLASSES,
  L14DependencySurfaceClass,
} from '../contracts/l14-dependency-surfaces';
import {
  ALL_L14_OUTPUT_SURFACE_CLASSES,
  L14OutputSurfaceClass,
} from '../contracts/l14-output-surfaces';
import {
  getL14DependencySurfaceDefinitions,
  l14DependencySurfaceRegistered,
} from '../constitution/l14-dependency-surface.registry';
import {
  getL14OutputSurfaceDefinitions,
  l14OutputSurfaceRegistered,
} from '../constitution/l14-output-surface.registry';
import {
  validateL14BoundarySemantics,
  validateL14CapabilityClaim,
  validateL14ComponentBoundary,
  validateL14DependencyAccess,
  validateL14FeedbackSeparation,
  validateL14ForbiddenAction,
  validateL14MissionAlignment,
  validateL14NoEngagementAsTruth,
  validateL14NoSilentSelfModification,
  validateL14NoTruthReconstruction,
  validateL14OutcomeHonesty,
  validateL14OutputSurface,
} from '../constitution/l14-boundary-validator';

export interface L14_1InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): L14_1InvariantResult {
  return { id, name, holds, evidence };
}

// INV-14.1-A : mission law.
export function checkINV_141_A(): L14_1InvariantResult {
  const green = validateL14MissionAlignment(L14_CANONICAL_MISSION, L14_FIRST_PRINCIPLE);
  const mutated = validateL14MissionAlignment('different mission', L14_FIRST_PRINCIPLE);
  const missingPrinciple = validateL14MissionAlignment(L14_CANONICAL_MISSION, '');
  return inv(
    'INV-14.1-A',
    'mission law',
    green.clean && !mutated.clean && !missingPrinciple.clean,
    `green=${green.clean} mutatedRejected=${!mutated.clean} missingPrincipleRejected=${!missingPrinciple.clean}`,
  );
}

// INV-14.1-B : no truth reconstruction law.
export function checkINV_141_B(): L14_1InvariantResult {
  const cleanV = validateL14NoTruthReconstruction({
    attempts_l10_rebuild: false,
    attempts_l11_rebuild: false,
    attempts_l12_rebuild: false,
    attempts_l13_rebuild: false,
  });
  const allRebuilds = validateL14NoTruthReconstruction({
    attempts_l10_rebuild: true,
    attempts_l11_rebuild: true,
    attempts_l12_rebuild: true,
    attempts_l13_rebuild: true,
  });
  const semantic = validateL14BoundarySemantics('Recompute the Opportunity Score in L14 from underlying features.');
  return inv(
    'INV-14.1-B',
    'no truth reconstruction law',
    cleanV.clean && !allRebuilds.clean && allRebuilds.issues.length === 4 && !semantic.clean,
    `green=${cleanV.clean} rebuildsRejected=${!allRebuilds.clean} semanticRejected=${!semantic.clean}`,
  );
}

// INV-14.1-C : no engagement-as-truth law.
export function checkINV_141_C(): L14_1InvariantResult {
  const cleanV = validateL14NoEngagementAsTruth({});
  const opens = validateL14NoEngagementAsTruth({ treats_open_rate_as_correctness: true });
  const clicks = validateL14NoEngagementAsTruth({ treats_click_rate_as_correctness: true });
  const saves = validateL14NoEngagementAsTruth({ treats_save_rate_as_correctness: true });
  const corpus = validateL14NoEngagementAsTruth({ corpus: 'open rate validates hypothesis.' });
  return inv(
    'INV-14.1-C',
    'no engagement-as-truth law',
    cleanV.clean && !opens.clean && !clicks.clean && !saves.clean && !corpus.clean,
    `cleanGreen=${cleanV.clean} opens=${!opens.clean} clicks=${!clicks.clean} saves=${!saves.clean} corpus=${!corpus.clean}`,
  );
}

// INV-14.1-D : no silent self-modification law.
export function checkINV_141_D(): L14_1InvariantResult {
  const cleanV = validateL14NoSilentSelfModification({});
  const formula = validateL14NoSilentSelfModification({ mutates_l11_formula: true });
  const threshold = validateL14NoSilentSelfModification({ mutates_l11_threshold: true });
  const template = validateL14NoSilentSelfModification({ mutates_l12_scenario_template: true });
  const policy = validateL14NoSilentSelfModification({ mutates_l13_safety_policy: true });
  const autoApply = validateL14NoSilentSelfModification({ auto_applies_calibration_proposal: true });
  const corpus = validateL14NoSilentSelfModification({ corpus: 'Auto-adjust threshold immediately.' });
  return inv(
    'INV-14.1-D',
    'no silent self-modification law',
    cleanV.clean && !formula.clean && !threshold.clean && !template.clean && !policy.clean && !autoApply.clean && !corpus.clean,
    `green=${cleanV.clean} mutations rejected=${[!formula.clean, !threshold.clean, !template.clean, !policy.clean, !autoApply.clean, !corpus.clean].every(Boolean)}`,
  );
}

// INV-14.1-E : outcome honesty law.
export function checkINV_141_E(): L14_1InvariantResult {
  const cleanV = validateL14OutcomeHonesty({});
  const hides = validateL14OutcomeHonesty({
    hides_misalignment: true,
    hides_false_positive: true,
    hides_false_negative: true,
    hides_confidence_overstatement: true,
  });
  return inv(
    'INV-14.1-E',
    'outcome honesty law',
    cleanV.clean && !hides.clean && hides.issues.length >= 4,
    `green=${cleanV.clean} hiddenRejected=${!hides.clean} count=${hides.issues.length}`,
  );
}

// INV-14.1-F : feedback separation law.
export function checkINV_141_F(): L14_1InvariantResult {
  const cleanV = validateL14FeedbackSeparation({});
  const flagged = validateL14FeedbackSeparation({ treats_feedback_as_truth: true });
  const corpus = validateL14FeedbackSeparation({ corpus: 'Feedback overwrites truth.' });
  return inv(
    'INV-14.1-F',
    'feedback separation law',
    cleanV.clean && !flagged.clean && !corpus.clean,
    `green=${cleanV.clean} flaggedRejected=${!flagged.clean} corpusRejected=${!corpus.clean}`,
  );
}

// INV-14.1-G : governed dependency law.
export function checkINV_141_G(): L14_1InvariantResult {
  // Every registered dependency surface is reachable and validates.
  const defs = getL14DependencySurfaceDefinitions();
  const allRegistered = ALL_L14_DEPENDENCY_SURFACE_CLASSES.every(c => l14DependencySurfaceRegistered(c));
  // Green read.
  const green = validateL14DependencyAccess(
    L14DependencySurfaceClass.L13_FINAL_OUTPUT_ARTIFACT,
    false,
    true,
    true,
  );
  // Bypass attempt rejected.
  const bypass = validateL14DependencyAccess(
    L14DependencySurfaceClass.L13_FINAL_OUTPUT_ARTIFACT,
    true,
    true,
    true,
  );
  // Missing lineage flagged.
  const noLineage = validateL14DependencyAccess(
    L14DependencySurfaceClass.L13_FINAL_OUTPUT_ARTIFACT,
    false,
    false,
    true,
  );
  return inv(
    'INV-14.1-G',
    'governed dependency law',
    allRegistered && defs.length >= 24 && green.clean && !bypass.clean && !noLineage.clean,
    `registered=${allRegistered} count=${defs.length} green=${green.clean} bypassRejected=${!bypass.clean} noLineage=${!noLineage.clean}`,
  );
}

// INV-14.1-H : legal output surface law.
export function checkINV_141_H(): L14_1InvariantResult {
  const defs = getL14OutputSurfaceDefinitions();
  const allRegistered = ALL_L14_OUTPUT_SURFACE_CLASSES.every(c => l14OutputSurfaceRegistered(c));
  // Green output usage.
  const greenUse = validateL14OutputSurface({
    surface_class: L14OutputSurfaceClass.OUTCOME_EVALUATION_SURFACE,
    has_lineage: true,
    has_replay_hash: true,
    has_l5_route: true,
    is_evaluation_surface: true,
    carries_horizon_when_evaluating: true,
  });
  // Missing L5 route rejected.
  const noRoute = validateL14OutputSurface({
    surface_class: L14OutputSurfaceClass.OUTCOME_EVALUATION_SURFACE,
    has_lineage: true,
    has_replay_hash: true,
    has_l5_route: false,
    is_evaluation_surface: true,
    carries_horizon_when_evaluating: true,
  });
  // Evaluation surface without horizon rejected.
  const noHorizon = validateL14OutputSurface({
    surface_class: L14OutputSurfaceClass.OUTCOME_EVALUATION_SURFACE,
    has_lineage: true,
    has_replay_hash: true,
    has_l5_route: true,
    is_evaluation_surface: true,
    carries_horizon_when_evaluating: false,
  });
  // Auto-apply proposal rejected.
  const autoApply = validateL14OutputSurface({
    surface_class: L14OutputSurfaceClass.CALIBRATION_PROPOSAL_SURFACE,
    has_lineage: true,
    has_replay_hash: true,
    has_l5_route: true,
    is_calibration_proposal: true,
    auto_applies_proposal: true,
  });
  return inv(
    'INV-14.1-H',
    'legal output surface law',
    allRegistered && defs.length === 12 && greenUse.clean && !noRoute.clean && !noHorizon.clean && !autoApply.clean,
    `registered=${allRegistered} count=${defs.length} green=${greenUse.clean} noRouteRejected=${!noRoute.clean} noHorizonRejected=${!noHorizon.clean} autoApplyRejected=${!autoApply.clean}`,
  );
}

export function runAllL14_1Invariants(): readonly L14_1InvariantResult[] {
  return [
    checkINV_141_A(),
    checkINV_141_B(),
    checkINV_141_C(),
    checkINV_141_D(),
    checkINV_141_E(),
    checkINV_141_F(),
    checkINV_141_G(),
    checkINV_141_H(),
  ];
}

// Suppress unused-import warnings for helpers referenced in
// downstream cert paths.
void validateL14CapabilityClaim;
void validateL14ForbiddenAction;
void validateL14ComponentBoundary;
void ALL_L14_ALLOWED_CAPABILITIES;
void L14AllowedCapability.CONSUME_GOVERNED_L13_OUTPUTS;
void L14ForbiddenAction.DELIVERY_REWRITES_SOURCE_MEANING;
