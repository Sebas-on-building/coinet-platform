/**
 * L13.8 — Style Control Plan Builder
 *
 * §13.8.6 / §13.8.1.1 — Bundles the language profile + verbosity
 * profile + persona policy + raw-metric policy + required style
 * traits + forbidden style classes + required semantic anchors
 * into a single `L13StyleControlPlan` that L13.6 prompt assembly
 * consumes through `style_policy_ref`.
 */

import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import {
  L13RawMetricDisclosurePolicy,
} from '../contracts/product-answer-mode';
import {
  L13ForbiddenStyleClass,
  L13RequiredSemanticAnchorClass,
  L13StyleTrait,
} from '../contracts/style-policy';
import type { L13StyleControlPlan } from '../contracts/style-control-plan';
import type { L13PersonaPolicy } from '../contracts/persona-policy';
import { L13PersonaClass } from '../contracts/persona-policy';
import type { L13VerbosityResolutionProfile } from '../contracts/verbosity-profile';
import type { L13LanguageResolutionProfile } from '../contracts/language-profile';
import { getL13AnswerModeDefinition } from '../outputs/answer-mode.registry';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

const DEFAULT_TRAITS: readonly L13StyleTrait[] = [
  L13StyleTrait.CLEAR,
  L13StyleTrait.CONCISE_DEFAULT,
  L13StyleTrait.DIRECT,
  L13StyleTrait.TRADER_USEFUL,
  L13StyleTrait.NON_HYPE,
  L13StyleTrait.UNCERTAINTY_AWARE,
  L13StyleTrait.HUMAN_READABLE,
  L13StyleTrait.MULTILINGUAL_CAPABLE,
  L13StyleTrait.EMOTIONALLY_CONTROLLED,
  L13StyleTrait.NON_DASHBOARDY,
  L13StyleTrait.NON_OVEREXPLANATORY,
];

const DEFAULT_FORBIDDEN_STYLES: readonly L13ForbiddenStyleClass[] = [
  L13ForbiddenStyleClass.HYPE_INFLUENCER,
  L13ForbiddenStyleClass.FINANCIAL_ADVISOR,
  L13ForbiddenStyleClass.PROPHECY_ENGINE,
  L13ForbiddenStyleClass.SALES_COPY,
  L13ForbiddenStyleClass.OVERCONFIDENT_ANALYST,
  L13ForbiddenStyleClass.LEGAL_DISCLAIMER_MACHINE,
  L13ForbiddenStyleClass.ROBOTIC_DASHBOARD,
  L13ForbiddenStyleClass.PANIC_BROADCASTER,
  L13ForbiddenStyleClass.EMPTY_GENERIC_ASSISTANT,
];

export interface L13StyleControlPlanInput {
  readonly request_id: string;
  readonly input_package_id?: string;
  readonly intent_class: L13UserIntentClass;
  readonly product_answer_mode: L13ProductAnswerMode;
  readonly language_profile: L13LanguageResolutionProfile;
  readonly verbosity_profile: L13VerbosityResolutionProfile;
  readonly persona_policy: L13PersonaPolicy;
  /**
   * Active disclosure obligations from L13.5 / L13.7 used to
   * compute required semantic anchor classes.
   */
  readonly must_preserve_uncertainty: boolean;
  readonly must_preserve_contradiction: boolean;
  readonly must_preserve_trigger_invalidation: boolean;
  readonly must_preserve_restriction_disclosure: boolean;
  readonly must_preserve_missing_data?: boolean;
  readonly must_preserve_drift?: boolean;
  readonly must_preserve_confidence_cap?: boolean;
  readonly lineage_refs?: readonly string[];
  readonly rendering_profile_ref?: string;
}

function deriveAnchorClasses(
  input: L13StyleControlPlanInput,
): readonly L13RequiredSemanticAnchorClass[] {
  const out: L13RequiredSemanticAnchorClass[] = [];
  if (input.must_preserve_uncertainty) {
    out.push(L13RequiredSemanticAnchorClass.UNCERTAINTY_DISCLOSURE);
  }
  if (input.must_preserve_contradiction) {
    out.push(L13RequiredSemanticAnchorClass.CONTRADICTION_DISCLOSURE);
  }
  if (input.must_preserve_trigger_invalidation) {
    out.push(L13RequiredSemanticAnchorClass.TRIGGER_DISCLOSURE);
    out.push(L13RequiredSemanticAnchorClass.INVALIDATION_DISCLOSURE);
  }
  if (input.must_preserve_restriction_disclosure) {
    out.push(L13RequiredSemanticAnchorClass.RESTRICTION_DISCLOSURE);
  }
  if (input.must_preserve_missing_data) {
    out.push(L13RequiredSemanticAnchorClass.MISSING_DATA_DISCLOSURE);
  }
  if (input.must_preserve_drift) {
    out.push(L13RequiredSemanticAnchorClass.DRIFT_DISCLOSURE);
  }
  if (input.must_preserve_confidence_cap) {
    out.push(L13RequiredSemanticAnchorClass.CONFIDENCE_CAP_DISCLOSURE);
  }
  return out;
}

/**
 * §13.8.6 — Build the style control plan. Pure function.
 */
export function buildL13StyleControlPlan(
  input: L13StyleControlPlanInput,
): L13StyleControlPlan {
  const modeDef = getL13AnswerModeDefinition(input.product_answer_mode);
  const rawMetricPolicy =
    modeDef?.raw_metric_disclosure_policy ??
    L13RawMetricDisclosurePolicy.FORBIDDEN_BY_DEFAULT;
  const required_semantic_anchor_classes = deriveAnchorClasses(input);
  const lineage = input.lineage_refs ?? ['l13.style.lineage'];

  const mayHeadings =
    input.product_answer_mode ===
      L13ProductAnswerMode.STRUCTURED_REPORT ||
    input.product_answer_mode ===
      L13ProductAnswerMode.ASSET_COMPARISON ||
    input.product_answer_mode ===
      L13ProductAnswerMode.THESIS_COMPARISON;
  const mayDenseReport =
    input.product_answer_mode ===
    L13ProductAnswerMode.STRUCTURED_REPORT;
  const mayBullets =
    input.product_answer_mode !== L13ProductAnswerMode.SHORT_CHAT &&
    input.product_answer_mode !== L13ProductAnswerMode.ALERT;
  const mayColloquial =
    input.persona_policy.persona_class ===
    L13PersonaClass.SMART_TRADER_FRIEND_GROUNDED;

  const replayHash = fnv1a(
    [
      input.request_id,
      input.input_package_id ?? '',
      input.intent_class,
      input.product_answer_mode,
      input.language_profile.resolved_output_language,
      input.language_profile.language_resolution_status,
      input.verbosity_profile.resolved_verbosity,
      input.verbosity_profile.disclosure_floor_verbosity,
      input.persona_policy.persona_policy_id,
      input.persona_policy.persona_class,
      rawMetricPolicy,
      DEFAULT_TRAITS.slice().sort().join(','),
      DEFAULT_FORBIDDEN_STYLES.slice().sort().join(','),
      required_semantic_anchor_classes.slice().sort().join(','),
      String(input.must_preserve_uncertainty),
      String(input.must_preserve_contradiction),
      String(input.must_preserve_trigger_invalidation),
      String(input.must_preserve_restriction_disclosure),
      input.rendering_profile_ref ?? '',
      POLICY_V,
    ].join('|'),
  );

  return {
    style_control_plan_id: `l13.style.plan.${replayHash}`,
    request_id: input.request_id,
    input_package_id: input.input_package_id,
    intent_class: input.intent_class,
    product_answer_mode: input.product_answer_mode,
    resolved_language:
      input.language_profile.resolved_output_language,
    language_resolution_status:
      input.language_profile.language_resolution_status,
    verbosity_profile: input.verbosity_profile,
    persona_profile_ref: input.persona_policy.persona_policy_id,
    rendering_profile_ref:
      input.rendering_profile_ref ?? 'l13.render.default',
    raw_metric_policy: rawMetricPolicy,
    required_style_traits: DEFAULT_TRAITS,
    forbidden_style_classes: DEFAULT_FORBIDDEN_STYLES,
    required_semantic_anchor_classes,
    may_use_colloquial_language: mayColloquial,
    may_use_compact_bullets: mayBullets,
    may_use_headings: mayHeadings,
    may_use_dense_report_sections: mayDenseReport,
    must_preserve_uncertainty: input.must_preserve_uncertainty,
    must_preserve_contradiction: input.must_preserve_contradiction,
    must_preserve_trigger_invalidation:
      input.must_preserve_trigger_invalidation,
    must_preserve_restriction_disclosure:
      input.must_preserve_restriction_disclosure,
    policy_version: POLICY_V,
    lineage_refs: lineage,
    replay_hash: replayHash,
  };
}
