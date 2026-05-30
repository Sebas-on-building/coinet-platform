/**
 * L14.1 — Boundary Validators
 *
 * §14.1.16 / §14.1.21 — Semantic scanners + the 12 boundary
 * validator functions enforcing the L14 constitutional laws.
 *
 * Every validator is a pure function returning a typed result
 * containing the violation codes that fired. No I/O. No mutation.
 */

import {
  L14ConstitutionalAuditSeverity,
  L14ConstitutionalAuditSubjectClass,
} from '../contracts/l14-constitutional-types';
import { L14ConstitutionalViolationCode as C } from '../contracts/l14-violation-codes';
import { L14ForbiddenAction } from '../contracts/l14-forbidden-actions';
import {
  L14AllowedCapability,
} from '../contracts/l14-capability-policy';
import {
  L14DependencySurfaceClass,
  type L14DependencySurfaceDefinition,
} from '../contracts/l14-dependency-surfaces';
import {
  L14OutputSurfaceClass,
  type L14OutputSurfaceDefinition,
} from '../contracts/l14-output-surfaces';
import {
  L14_CANONICAL_MISSION,
  L14_FIRST_PRINCIPLE,
} from '../contracts/l14-mission';
import { l14CapabilityAllowed } from './l14-capability-policy-map';
import {
  l14DependencySurfaceRegistered,
} from './l14-dependency-surface.registry';
import {
  l14OutputSurfaceRegistered,
} from './l14-output-surface.registry';
import {
  codeForL14ForbiddenAction,
  l14ActionIsForbidden,
} from './l14-forbidden-action.registry';

const SEV = L14ConstitutionalAuditSeverity;

export interface L14BoundaryIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
  readonly subject_class: L14ConstitutionalAuditSubjectClass;
}

export interface L14BoundaryValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14BoundaryIssue[];
}

function result(issues: readonly L14BoundaryIssue[]): L14BoundaryValidationResult {
  return { clean: issues.length === 0, issues };
}

function issue(
  code: C,
  severity: L14ConstitutionalAuditSeverity,
  message: string,
  subject_class: L14ConstitutionalAuditSubjectClass,
): L14BoundaryIssue {
  return { code, severity, message, subject_class };
}

// ── Semantic scanner patterns (§14.1.16) ────────────────────────────

const ENGAGEMENT_AS_TRUTH_PATTERNS: readonly RegExp[] = [
  /\bclick\s+rate\s+proves\s+correctness\b/i,
  /\bopen\s+rate\s+validates\s+hypothesis\b/i,
  /\bopen\s+rate\s+proves?\s+(correctness|correct|truth)\b/i,
  /\bhigh\s+(open|click|save)\s+rate\s+(so|therefore)\s+(scenario|hypothesis|score)\s+(was\s+)?(correct|true|right)\b/i,
  /\bengagement[\s-]optimized\s+truth\b/i,
  /\bdelivery\s+rewrites\s+confidence\b/i,
];

const FEEDBACK_AS_TRUTH_PATTERNS: readonly RegExp[] = [
  /\bfeedback\s+overwrites?\s+truth\b/i,
  /\buser\s+saved\s+it\s+so\s+(scenario|hypothesis)\s+(was|is)\s+(right|correct|true)\b/i,
  /\busers?\s+disliked\s+(the|this)\s+(alert|output)\s+so\s+(the\s+)?hypothesis\s+(was|is)\s+wrong\b/i,
];

const SELF_MODIFICATION_PATTERNS: readonly RegExp[] = [
  /\bauto[\s-]adjust\s+threshold\s+immediately\b/i,
  /\bautomatically\s+(lower|raise|change|adjust)\s+(unlock\s+risk|threshold|score|formula)\b/i,
  /\brecompute\s+(scenario|score|hypothesis)\s+locally\b/i,
  /\bsilently\s+mutate\b/i,
];

const TRUTH_REBUILD_PATTERNS: readonly RegExp[] = [
  /\brecompute\s+the\s+opportunity\s+score\s+in\s+l14\b/i,
  /\binfer\s+a\s+new\s+bullish\s+scenario\s+from\s+(delivery\s+)?engagement\b/i,
  /\bcreate\s+a\s+replacement\s+explanation\s+because\b/i,
  /\brebuild\s+(l10|l11|l12|l13)\b/i,
];

function scanFor(corpus: string, patterns: readonly RegExp[]): boolean {
  if (!corpus) return false;
  return patterns.some(p => p.test(corpus));
}

// ── 1. Mission alignment ──────────────────────────────────────────

export function validateL14MissionAlignment(
  mission_text: string,
  first_principle_text: string,
): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (!mission_text || mission_text.trim().length === 0) {
    issues.push(issue(C.L14C_MISSION_MISSING, SEV.CRITICAL, 'canonical mission missing', L14ConstitutionalAuditSubjectClass.MISSION));
  } else if (mission_text !== L14_CANONICAL_MISSION) {
    issues.push(issue(C.L14C_MISSION_MUTATED, SEV.CRITICAL, 'canonical mission has been mutated', L14ConstitutionalAuditSubjectClass.MISSION));
  }
  if (!first_principle_text || first_principle_text.trim().length === 0) {
    issues.push(issue(C.L14C_FIRST_PRINCIPLE_MISSING, SEV.CRITICAL, 'first principle missing', L14ConstitutionalAuditSubjectClass.MISSION));
  } else if (first_principle_text !== L14_FIRST_PRINCIPLE) {
    issues.push(issue(C.L14C_FIRST_PRINCIPLE_MISSING, SEV.CRITICAL, 'first principle has been mutated', L14ConstitutionalAuditSubjectClass.MISSION));
  }
  return result(issues);
}

// ── 2. Boundary semantics scan ────────────────────────────────────

export function validateL14BoundarySemantics(
  corpus: string,
): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (scanFor(corpus, TRUTH_REBUILD_PATTERNS)) {
    issues.push(issue(C.L14C_RAW_LOWER_LAYER_REBUILD_ATTEMPT, SEV.CRITICAL, 'lower-layer truth rebuild language detected', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  if (scanFor(corpus, ENGAGEMENT_AS_TRUTH_PATTERNS)) {
    issues.push(issue(C.L14C_ENGAGEMENT_AS_TRUTH, SEV.CRITICAL, 'engagement-as-truth language detected', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  if (scanFor(corpus, FEEDBACK_AS_TRUTH_PATTERNS)) {
    issues.push(issue(C.L14C_FEEDBACK_AS_AUTOMATIC_TRUTH, SEV.CRITICAL, 'feedback-as-truth language detected', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  if (scanFor(corpus, SELF_MODIFICATION_PATTERNS)) {
    issues.push(issue(C.L14C_SILENT_LOWER_LAYER_MUTATION, SEV.CRITICAL, 'silent self-modification language detected', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  return result(issues);
}

// ── 3. Dependency access ──────────────────────────────────────────

export function validateL14DependencyAccess(
  requested: L14DependencySurfaceClass,
  raw_lower_layer_bypass_attempt: boolean,
  has_lineage: boolean,
  has_replay_hash: boolean,
): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (!l14DependencySurfaceRegistered(requested)) {
    issues.push(issue(C.L14C_UNREGISTERED_DEPENDENCY_SURFACE, SEV.CRITICAL, `dependency surface ${requested} not registered`, L14ConstitutionalAuditSubjectClass.DEPENDENCY_SURFACE));
  }
  if (raw_lower_layer_bypass_attempt) {
    issues.push(issue(C.L14C_RAW_LOWER_LAYER_REBUILD_ATTEMPT, SEV.CRITICAL, 'raw lower-layer bypass attempted', L14ConstitutionalAuditSubjectClass.DEPENDENCY_SURFACE));
  }
  if (!has_lineage) {
    issues.push(issue(C.L14C_OUTPUT_SURFACE_LINEAGE_MISSING, SEV.ERROR, 'dependency read missing lineage', L14ConstitutionalAuditSubjectClass.DEPENDENCY_SURFACE));
  }
  if (!has_replay_hash) {
    issues.push(issue(C.L14C_OUTPUT_SURFACE_REPLAY_HASH_MISSING, SEV.ERROR, 'dependency read missing replay hash', L14ConstitutionalAuditSubjectClass.DEPENDENCY_SURFACE));
  }
  return result(issues);
}

// ── 4. No truth reconstruction ────────────────────────────────────

export function validateL14NoTruthReconstruction(input: {
  readonly attempts_l10_rebuild: boolean;
  readonly attempts_l11_rebuild: boolean;
  readonly attempts_l12_rebuild: boolean;
  readonly attempts_l13_rebuild: boolean;
}): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (input.attempts_l10_rebuild) issues.push(issue(C.L14C_L10_HYPOTHESIS_REBUILD_ATTEMPT, SEV.CRITICAL, 'attempted L10 hypothesis rebuild', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.attempts_l11_rebuild) issues.push(issue(C.L14C_L11_SCORE_REBUILD_ATTEMPT, SEV.CRITICAL, 'attempted L11 score rebuild', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.attempts_l12_rebuild) issues.push(issue(C.L14C_L12_SCENARIO_REBUILD_ATTEMPT, SEV.CRITICAL, 'attempted L12 scenario rebuild', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.attempts_l13_rebuild) issues.push(issue(C.L14C_L13_EXPLANATION_REBUILD_ATTEMPT, SEV.CRITICAL, 'attempted L13 explanation rebuild', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  return result(issues);
}

// ── 5. No engagement-as-truth ─────────────────────────────────────

export function validateL14NoEngagementAsTruth(input: {
  readonly treats_open_rate_as_correctness?: boolean;
  readonly treats_click_rate_as_correctness?: boolean;
  readonly treats_save_rate_as_correctness?: boolean;
  readonly corpus?: string;
}): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (input.treats_open_rate_as_correctness) issues.push(issue(C.L14C_OPEN_RATE_AS_CORRECTNESS, SEV.CRITICAL, 'open rate treated as correctness', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.treats_click_rate_as_correctness) issues.push(issue(C.L14C_CLICK_RATE_AS_CORRECTNESS, SEV.CRITICAL, 'click rate treated as correctness', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.treats_save_rate_as_correctness) issues.push(issue(C.L14C_ENGAGEMENT_AS_TRUTH, SEV.CRITICAL, 'save rate treated as correctness', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.corpus && scanFor(input.corpus, ENGAGEMENT_AS_TRUTH_PATTERNS)) {
    issues.push(issue(C.L14C_ENGAGEMENT_AS_TRUTH, SEV.CRITICAL, 'engagement-as-truth language detected in corpus', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  return result(issues);
}

// ── 6. No silent self-modification ────────────────────────────────

export function validateL14NoSilentSelfModification(input: {
  readonly mutates_l11_formula?: boolean;
  readonly mutates_l11_threshold?: boolean;
  readonly mutates_l12_scenario_template?: boolean;
  readonly mutates_l13_grounding_policy?: boolean;
  readonly mutates_l13_safety_policy?: boolean;
  readonly auto_applies_calibration_proposal?: boolean;
  readonly corpus?: string;
}): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (input.mutates_l11_formula) issues.push(issue(C.L14C_SILENT_LOWER_LAYER_MUTATION, SEV.CRITICAL, 'attempted silent L11 formula mutation', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.mutates_l11_threshold) issues.push(issue(C.L14C_AUTO_THRESHOLD_MUTATION, SEV.CRITICAL, 'attempted automatic L11 threshold mutation', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.mutates_l12_scenario_template) issues.push(issue(C.L14C_AUTO_SCENARIO_TEMPLATE_MUTATION, SEV.CRITICAL, 'attempted automatic L12 scenario template mutation', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.mutates_l13_grounding_policy || input.mutates_l13_safety_policy) {
    issues.push(issue(C.L14C_AUTO_L13_POLICY_MUTATION, SEV.CRITICAL, 'attempted automatic L13 policy mutation', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  if (input.auto_applies_calibration_proposal) {
    issues.push(issue(C.L14C_CALIBRATION_PROPOSAL_AUTO_APPLY, SEV.CRITICAL, 'calibration proposal auto-applied', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  if (input.corpus && scanFor(input.corpus, SELF_MODIFICATION_PATTERNS)) {
    issues.push(issue(C.L14C_SILENT_LOWER_LAYER_MUTATION, SEV.CRITICAL, 'self-modification language detected in corpus', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  return result(issues);
}

// ── 7. Outcome honesty ───────────────────────────────────────────

export function validateL14OutcomeHonesty(input: {
  readonly hides_misalignment?: boolean;
  readonly hides_false_positive?: boolean;
  readonly hides_false_negative?: boolean;
  readonly hides_confidence_overstatement?: boolean;
}): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (input.hides_misalignment) issues.push(issue(C.L14C_OUTCOME_MISALIGNMENT_HIDDEN, SEV.CRITICAL, 'outcome misalignment hidden', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.hides_false_positive) issues.push(issue(C.L14C_FALSE_POSITIVE_HIDDEN, SEV.CRITICAL, 'false-positive pattern hidden', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.hides_false_negative) issues.push(issue(C.L14C_FALSE_POSITIVE_HIDDEN, SEV.CRITICAL, 'false-negative pattern hidden', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  if (input.hides_confidence_overstatement) issues.push(issue(C.L14C_CONFIDENCE_OVERSTATEMENT_HIDDEN, SEV.CRITICAL, 'confidence overstatement hidden', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  return result(issues);
}

// ── 8. Feedback separation ────────────────────────────────────────

export function validateL14FeedbackSeparation(input: {
  readonly treats_feedback_as_truth?: boolean;
  readonly corpus?: string;
}): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (input.treats_feedback_as_truth) {
    issues.push(issue(C.L14C_FEEDBACK_AS_AUTOMATIC_TRUTH, SEV.CRITICAL, 'feedback treated as automatic truth', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  if (input.corpus && scanFor(input.corpus, FEEDBACK_AS_TRUTH_PATTERNS)) {
    issues.push(issue(C.L14C_FEEDBACK_AS_AUTOMATIC_TRUTH, SEV.CRITICAL, 'feedback-as-truth language detected in corpus', L14ConstitutionalAuditSubjectClass.BOUNDARY));
  }
  return result(issues);
}

// ── 9. Capability claim ──────────────────────────────────────────

export function validateL14CapabilityClaim(
  claimed: L14AllowedCapability,
): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (!l14CapabilityAllowed(claimed)) {
    issues.push(issue(C.L14C_UNREGISTERED_DEPENDENCY_SURFACE, SEV.CRITICAL, `capability ${claimed} not in allowed set`, L14ConstitutionalAuditSubjectClass.CAPABILITY_POLICY));
  }
  return result(issues);
}

// ── 10. Forbidden action ─────────────────────────────────────────

export function validateL14ForbiddenAction(
  attempted: L14ForbiddenAction,
): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (l14ActionIsForbidden(attempted)) {
    issues.push(issue(
      codeForL14ForbiddenAction(attempted),
      SEV.CRITICAL,
      `forbidden action ${attempted} attempted`,
      L14ConstitutionalAuditSubjectClass.FORBIDDEN_ACTION,
    ));
  }
  return result(issues);
}

// ── 11. Output surface ───────────────────────────────────────────

export interface L14OutputSurfaceUsage {
  readonly surface_class: L14OutputSurfaceClass;
  readonly definition?: L14OutputSurfaceDefinition;
  readonly has_lineage: boolean;
  readonly has_replay_hash: boolean;
  readonly has_l5_route: boolean;
  readonly claims_truth?: boolean;
  readonly attempts_lower_layer_mutation?: boolean;
  readonly carries_horizon_when_evaluating?: boolean;
  readonly is_evaluation_surface?: boolean;
  readonly is_calibration_evidence?: boolean;
  readonly is_calibration_proposal?: boolean;
  readonly auto_applies_proposal?: boolean;
  readonly delivery_rewrites_source_meaning?: boolean;
  readonly delivery_bypasses_restriction?: boolean;
}

export function validateL14OutputSurface(
  usage: L14OutputSurfaceUsage,
): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  if (!l14OutputSurfaceRegistered(usage.surface_class)) {
    issues.push(issue(C.L14C_OUTPUT_SURFACE_UNREGISTERED, SEV.CRITICAL, `output surface ${usage.surface_class} not registered`, L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (!usage.has_lineage) {
    issues.push(issue(C.L14C_OUTPUT_SURFACE_LINEAGE_MISSING, SEV.ERROR, 'output surface missing lineage', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (!usage.has_replay_hash) {
    issues.push(issue(C.L14C_OUTPUT_SURFACE_REPLAY_HASH_MISSING, SEV.ERROR, 'output surface missing replay hash', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (!usage.has_l5_route) {
    issues.push(issue(C.L14C_OUTPUT_SURFACE_L5_ROUTE_MISSING, SEV.CRITICAL, 'output surface missing L5 route', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (usage.claims_truth) {
    issues.push(issue(C.L14C_ENGAGEMENT_AS_TRUTH, SEV.CRITICAL, 'output surface claims truth (forbidden)', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (usage.attempts_lower_layer_mutation) {
    issues.push(issue(C.L14C_SILENT_LOWER_LAYER_MUTATION, SEV.CRITICAL, 'output surface attempts lower-layer mutation', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (usage.is_evaluation_surface && usage.carries_horizon_when_evaluating === false) {
    issues.push(issue(C.L14C_EVALUATION_WITHOUT_HORIZON, SEV.CRITICAL, 'evaluation surface without declared horizon', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (usage.is_calibration_evidence && !usage.has_lineage) {
    issues.push(issue(C.L14C_CALIBRATION_EVIDENCE_WITHOUT_LINEAGE, SEV.CRITICAL, 'calibration evidence missing lineage', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (usage.is_calibration_proposal && usage.auto_applies_proposal) {
    issues.push(issue(C.L14C_CALIBRATION_PROPOSAL_AUTO_APPLY, SEV.CRITICAL, 'calibration proposal auto-applied', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (usage.delivery_rewrites_source_meaning) {
    issues.push(issue(C.L14C_DELIVERY_REWRITES_SOURCE_MEANING, SEV.CRITICAL, 'delivery rewrites source meaning', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  if (usage.delivery_bypasses_restriction) {
    issues.push(issue(C.L14C_DELIVERY_BYPASSES_RESTRICTION, SEV.CRITICAL, 'delivery bypasses restriction posture', L14ConstitutionalAuditSubjectClass.OUTPUT_SURFACE));
  }
  return result(issues);
}

// ── 12. Component boundary ────────────────────────────────────────

export interface L14ComponentBoundaryInput {
  readonly component_id: string;
  readonly description: string;
  readonly capabilities: readonly L14AllowedCapability[];
  readonly dependency_surfaces: readonly L14DependencySurfaceClass[];
  readonly output_surfaces: readonly L14OutputSurfaceClass[];
  readonly attempts_forbidden_actions?: readonly L14ForbiddenAction[];
}

export function validateL14ComponentBoundary(
  input: L14ComponentBoundaryInput,
): L14BoundaryValidationResult {
  const issues: L14BoundaryIssue[] = [];
  // Description-corpus scan for engagement-as-truth, feedback-as-truth, self-mod, truth-rebuild.
  const sem = validateL14BoundarySemantics(input.description);
  issues.push(...sem.issues);
  // Capabilities must all be allowed.
  for (const cap of input.capabilities) {
    const v = validateL14CapabilityClaim(cap);
    if (!v.clean) issues.push(...v.issues);
  }
  // Dependencies must all be registered.
  for (const dep of input.dependency_surfaces) {
    if (!l14DependencySurfaceRegistered(dep)) {
      issues.push(issue(C.L14C_UNREGISTERED_DEPENDENCY_SURFACE, SEV.CRITICAL, `component ${input.component_id} requires unregistered dependency ${dep}`, L14ConstitutionalAuditSubjectClass.COMPONENT_BOUNDARY));
    }
  }
  // Output surfaces must all be registered.
  for (const surf of input.output_surfaces) {
    if (!l14OutputSurfaceRegistered(surf)) {
      issues.push(issue(C.L14C_OUTPUT_SURFACE_UNREGISTERED, SEV.CRITICAL, `component ${input.component_id} emits unregistered surface ${surf}`, L14ConstitutionalAuditSubjectClass.COMPONENT_BOUNDARY));
    }
  }
  // Forbidden-action attempts.
  for (const a of input.attempts_forbidden_actions ?? []) {
    const v = validateL14ForbiddenAction(a);
    issues.push(...v.issues);
  }
  return result(issues);
}
