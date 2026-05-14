/**
 * L13.2 — AI Input Package Builder
 *
 * §13.2.16 — Orchestrator that takes the governed L3–L12 inputs and
 * produces a deterministic, bounded, evidence-linked,
 * contradiction-aware, restriction-aware, replay-safe AI input
 * package. The builder calls every other Phase B/C/D engine and
 * computes the package replay hash from the canonical material.
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
} from '../contracts/ai-context-summary';
import {
  L13InputPackageCompletenessClass,
  L13InputPackageReadinessClass,
  type L13AIInputPackage,
} from '../contracts/ai-input-package';
import type { L13ConfidenceBreakdown } from '../contracts/confidence-breakdown';
import type { L13EvidenceDigest } from '../contracts/evidence-digest';
import {
  L13AnswerMode,
  L13BlockedAnswerMode,
  type L13DriftDisclosure,
  type L13ExplanationRestrictionProfile,
  type L13MissingDataDisclosure,
} from '../contracts/explanation-restriction-profile';
import type { L13PromptBudget } from '../contracts/prompt-budget';
import type { L13UncertaintyProfile } from '../contracts/uncertainty-profile';
import {
  L13UserIntentClass,
  getL13IntentRequirements,
  isL13AdversarialIntent,
  type L13UserIntentBinding,
} from '../contracts/user-intent-binding';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.input-package.v1';

/**
 * §13.2.16 — Builder input. Every governed lower-layer surface that
 * already passed the L13.1 dependency registry must be supplied
 * pre-summarized. The builder does not consume raw L7/L8/L9/L10/L11/
 * L12 state.
 */
export interface L13AIInputPackageBuildInput {
  readonly request_id: string;
  readonly user_intent_ref: string;
  readonly user_intent_class: L13UserIntentClass;
  readonly requested_answer_mode: L13AnswerMode;

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

  readonly prompt_budget: L13PromptBudget;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
}

function deriveAnswerModes(
  input: L13AIInputPackageBuildInput,
): {
  allowed: readonly L13AnswerMode[];
  blocked: readonly L13BlockedAnswerMode[];
} {
  return {
    allowed: input.restriction_profile.allowed_answer_modes,
    blocked: input.restriction_profile.blocked_answer_modes,
  };
}

function deriveCompleteness(
  input: L13AIInputPackageBuildInput,
): L13InputPackageCompletenessClass {
  if (input.uncertainty_profile.material_missing_data_present) {
    return L13InputPackageCompletenessClass.NARROWED_BY_MISSING_DATA;
  }
  if (input.uncertainty_profile.material_drift_present) {
    return L13InputPackageCompletenessClass.NARROWED_BY_DRIFT;
  }
  if (input.uncertainty_profile.must_disclose_uncertainty) {
    return L13InputPackageCompletenessClass.COMPLETE_WITH_DISCLOSURE;
  }
  return L13InputPackageCompletenessClass.COMPLETE;
}

function deriveReadiness(
  input: L13AIInputPackageBuildInput,
): L13InputPackageReadinessClass {
  const reqs = getL13IntentRequirements(input.user_intent_class);

  if (
    reqs.requires_scenario_context &&
    !input.scenario_summary.base_case_ref
  ) {
    return L13InputPackageReadinessClass.BLOCKED_INSUFFICIENT_CONTEXT;
  }
  if (
    reqs.requires_score_context &&
    input.score_summary.production_score_families.length === 0
  ) {
    return L13InputPackageReadinessClass.BLOCKED_INSUFFICIENT_CONTEXT;
  }
  if (
    isL13AdversarialIntent(input.user_intent_class) &&
    !input.restriction_profile.allowed_answer_modes.includes(
      L13AnswerMode.EXPLAIN_SCENARIO,
    )
  ) {
    return L13InputPackageReadinessClass.BLOCKED_RESTRICTION;
  }

  if (input.uncertainty_profile.active_contradiction_present) {
    return L13InputPackageReadinessClass.NARROWED_BY_CONTRADICTION;
  }
  if (input.uncertainty_profile.material_missing_data_present) {
    return L13InputPackageReadinessClass.NARROWED_BY_MISSING_DATA;
  }
  if (input.uncertainty_profile.material_drift_present) {
    return L13InputPackageReadinessClass.NARROWED_BY_DRIFT;
  }
  if (input.uncertainty_profile.must_disclose_uncertainty) {
    return L13InputPackageReadinessClass.READY_WITH_DISCLOSURE;
  }
  return L13InputPackageReadinessClass.READY_FULL_CONTEXT;
}

function buildIntentBinding(
  input: L13AIInputPackageBuildInput,
): L13UserIntentBinding {
  const reqs = getL13IntentRequirements(input.user_intent_class);
  return {
    user_intent_ref: input.user_intent_ref,
    intent_class: input.user_intent_class,
    requested_answer_mode: input.requested_answer_mode,
    requires_scenario_context: reqs.requires_scenario_context,
    requires_score_context: reqs.requires_score_context,
    requires_hypothesis_context: reqs.requires_hypothesis_context,
    requires_contradiction_context: reqs.requires_contradiction_context,
    requires_comparison_context: reqs.requires_comparison_context,
    allowed_answer_modes: input.restriction_profile.allowed_answer_modes,
    blocked_answer_modes: input.restriction_profile.blocked_answer_modes,
    policy_version: POLICY_V,
  };
}

function computeReplayHash(input: L13AIInputPackageBuildInput): string {
  const evidenceSorted = [...input.evidence_refs].sort();
  const lineageSorted = [...input.lineage_refs].sort();
  return fnv1a(
    [
      'L13_AI_INPUT_PACKAGE',
      POLICY_V,
      input.request_id,
      input.user_intent_ref,
      input.user_intent_class,
      input.scope_type,
      input.scope_id,
      input.as_of,
      input.canonical_entity_summary.entity_summary_id,
      input.validation_summary.validation_summary_id,
      input.contradiction_summary.contradiction_summary_id,
      input.regime_summary.regime_summary_id,
      input.sequence_summary.sequence_summary_id,
      input.hypothesis_summary.hypothesis_summary_id,
      input.score_summary.score_summary_id,
      input.scenario_summary.scenario_summary_id,
      input.confidence_breakdown.confidence_breakdown_id,
      input.uncertainty_profile.uncertainty_profile_id,
      input.restriction_profile.restriction_profile_id,
      input.prompt_budget.prompt_budget_id,
      evidenceSorted.join(','),
      lineageSorted.join(','),
      input.strongest_positive_evidence
        .map(d => d.evidence_digest_id)
        .sort()
        .join(','),
      input.strongest_contradictions
        .map(d => d.evidence_digest_id)
        .sort()
        .join(','),
      input.missing_data_disclosures
        .map(d => d.disclosure_id)
        .sort()
        .join(','),
      input.drift_disclosures
        .map(d => d.disclosure_id)
        .sort()
        .join(','),
    ].join('|'),
  );
}

/**
 * §13.2.16 — Orchestrate every Phase B/C/D engine and return the
 * fully-assembled package.
 */
export function buildL13AIInputPackage(
  input: L13AIInputPackageBuildInput,
): L13AIInputPackage {
  const replayHash = computeReplayHash(input);
  const completeness = deriveCompleteness(input);
  const readiness = deriveReadiness(input);
  const { allowed, blocked } = deriveAnswerModes(input);
  const intentBinding = buildIntentBinding(input);

  return {
    input_package_id: `l13.input_package.${replayHash}`,
    request_id: input.request_id,
    user_intent_ref: input.user_intent_ref,
    user_intent_binding: intentBinding,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    as_of: input.as_of,
    canonical_entity_summary: input.canonical_entity_summary,
    validation_summary: input.validation_summary,
    contradiction_summary: input.contradiction_summary,
    regime_summary: input.regime_summary,
    sequence_summary: input.sequence_summary,
    hypothesis_summary: input.hypothesis_summary,
    score_summary: input.score_summary,
    scenario_summary: input.scenario_summary,
    strongest_positive_evidence: input.strongest_positive_evidence,
    strongest_contradictions: input.strongest_contradictions,
    confidence_breakdown: input.confidence_breakdown,
    uncertainty_profile: input.uncertainty_profile,
    restriction_profile: input.restriction_profile,
    missing_data_disclosures: input.missing_data_disclosures,
    drift_disclosures: input.drift_disclosures,
    allowed_answer_modes: allowed,
    blocked_answer_modes: blocked,
    prompt_budget: input.prompt_budget,
    evidence_refs: [...input.evidence_refs].sort(),
    lineage_refs: [...input.lineage_refs].sort(),
    package_completeness_class: completeness,
    package_readiness_class: readiness,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
