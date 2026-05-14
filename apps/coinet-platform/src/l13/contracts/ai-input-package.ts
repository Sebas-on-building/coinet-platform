/**
 * L13.2 — AI Input Package Contract
 *
 * §13.2.3 — Top-level package the AI Judgment & Explanation Layer
 * may receive. The model never receives raw lower-layer state; the
 * package is the only legal context surface. Identity, summary,
 * trace, and replay fields are constitutionally required.
 */

import type {
  L13CanonicalEntitySummary,
  L13ContradictionSummary,
  L13HypothesisSummary,
  L13RegimeSummary,
  L13ScenarioSummary,
  L13ScoreSummary,
  L13SequenceSummary,
  L13ValidationSummary,
} from './ai-context-summary';
import type { L13ConfidenceBreakdown } from './confidence-breakdown';
import type { L13EvidenceDigest } from './evidence-digest';
import type {
  L13AnswerMode,
  L13BlockedAnswerMode,
  L13DriftDisclosure,
  L13ExplanationRestrictionProfile,
  L13MissingDataDisclosure,
} from './explanation-restriction-profile';
import type { L13PromptBudget } from './prompt-budget';
import type { L13UncertaintyProfile } from './uncertainty-profile';
import type { L13UserIntentBinding } from './user-intent-binding';

/**
 * §13.2.3 — Package completeness classification.
 */
export enum L13InputPackageCompletenessClass {
  COMPLETE = 'COMPLETE',
  COMPLETE_WITH_DISCLOSURE = 'COMPLETE_WITH_DISCLOSURE',
  PARTIAL = 'PARTIAL',
  NARROWED_BY_MISSING_DATA = 'NARROWED_BY_MISSING_DATA',
  NARROWED_BY_DRIFT = 'NARROWED_BY_DRIFT',
  BLOCKED = 'BLOCKED',
}

export const ALL_L13_INPUT_PACKAGE_COMPLETENESS_CLASSES:
  readonly L13InputPackageCompletenessClass[] =
  Object.values(L13InputPackageCompletenessClass);

/**
 * §13.2.4 — Package readiness classes the builder/validator emit.
 */
export enum L13InputPackageReadinessClass {
  READY_FULL_CONTEXT = 'READY_FULL_CONTEXT',
  READY_WITH_DISCLOSURE = 'READY_WITH_DISCLOSURE',
  PARTIAL_CONTEXT_ALLOWED = 'PARTIAL_CONTEXT_ALLOWED',
  NARROWED_BY_MISSING_DATA = 'NARROWED_BY_MISSING_DATA',
  NARROWED_BY_DRIFT = 'NARROWED_BY_DRIFT',
  NARROWED_BY_CONTRADICTION = 'NARROWED_BY_CONTRADICTION',
  BLOCKED_INSUFFICIENT_CONTEXT = 'BLOCKED_INSUFFICIENT_CONTEXT',
  BLOCKED_RAW_CONTEXT = 'BLOCKED_RAW_CONTEXT',
  BLOCKED_RESTRICTION = 'BLOCKED_RESTRICTION',
}

export const ALL_L13_INPUT_PACKAGE_READINESS_CLASSES:
  readonly L13InputPackageReadinessClass[] =
  Object.values(L13InputPackageReadinessClass);

/**
 * §13.2.4 — Readiness classes that always block model invocation.
 */
export const L13_BLOCKED_PACKAGE_READINESS_CLASSES:
  readonly L13InputPackageReadinessClass[] = [
  L13InputPackageReadinessClass.BLOCKED_INSUFFICIENT_CONTEXT,
  L13InputPackageReadinessClass.BLOCKED_RAW_CONTEXT,
  L13InputPackageReadinessClass.BLOCKED_RESTRICTION,
];

export function isL13BlockedPackageReadiness(
  cls: L13InputPackageReadinessClass,
): boolean {
  return L13_BLOCKED_PACKAGE_READINESS_CLASSES.includes(cls);
}

export interface L13AIInputPackage {
  readonly input_package_id: string;

  readonly request_id: string;
  readonly user_intent_ref: string;
  readonly user_intent_binding: L13UserIntentBinding;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly canonical_entity_summary: L13CanonicalEntitySummary;

  readonly validation_summary: L13ValidationSummary;
  readonly contradiction_summary: L13ContradictionSummary;

  readonly regime_summary: L13RegimeSummary;
  readonly sequence_summary: L13SequenceSummary;
  readonly hypothesis_summary: L13HypothesisSummary;
  readonly score_summary: L13ScoreSummary;
  readonly scenario_summary: L13ScenarioSummary;

  readonly strongest_positive_evidence: readonly L13EvidenceDigest[];
  readonly strongest_contradictions: readonly L13EvidenceDigest[];

  readonly confidence_breakdown: L13ConfidenceBreakdown;
  readonly uncertainty_profile: L13UncertaintyProfile;

  readonly restriction_profile: L13ExplanationRestrictionProfile;

  readonly missing_data_disclosures:
    readonly L13MissingDataDisclosure[];
  readonly drift_disclosures: readonly L13DriftDisclosure[];

  readonly allowed_answer_modes: readonly L13AnswerMode[];
  readonly blocked_answer_modes: readonly L13BlockedAnswerMode[];

  readonly prompt_budget: L13PromptBudget;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly package_completeness_class:
    L13InputPackageCompletenessClass;
  readonly package_readiness_class: L13InputPackageReadinessClass;

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * Identity fields whose absence is illegal under §13.2.3.1.
 */
export const L13_REQUIRED_IDENTITY_FIELDS: readonly (
  keyof L13AIInputPackage
)[] = [
  'input_package_id',
  'request_id',
  'user_intent_ref',
  'scope_type',
  'scope_id',
  'as_of',
  'policy_version',
  'replay_hash',
];

/**
 * Engine-summary fields whose absence is illegal under §13.2.3.2.
 */
export const L13_REQUIRED_ENGINE_SUMMARY_FIELDS: readonly (
  keyof L13AIInputPackage
)[] = [
  'canonical_entity_summary',
  'validation_summary',
  'contradiction_summary',
  'regime_summary',
  'sequence_summary',
  'hypothesis_summary',
  'score_summary',
  'scenario_summary',
  'confidence_breakdown',
  'uncertainty_profile',
  'restriction_profile',
];

/**
 * Trace fields whose absence is illegal under §13.2.3.3.
 */
export const L13_REQUIRED_TRACE_FIELDS: readonly (
  keyof L13AIInputPackage
)[] = [
  'evidence_refs',
  'lineage_refs',
  'prompt_budget',
  'allowed_answer_modes',
  'blocked_answer_modes',
];
