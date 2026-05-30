/**
 * L13.8 — Style Control Plan Contract
 *
 * §13.8.6 — The pre-generation style policy that L13.6 prompt
 * assembly consumes through its `style_policy_ref` slot. Bundles
 * the resolved language, verbosity, persona, raw-metric policy,
 * required style traits, forbidden style classes, and the set of
 * semantic anchors that must survive the response shaper's pass.
 */

import type { L13UserIntentClass } from './user-intent-binding';
import type { L13ProductAnswerMode, L13RawMetricDisclosurePolicy } from './product-answer-mode';
import type {
  L13ForbiddenStyleClass,
  L13RequiredSemanticAnchorClass,
  L13StyleTrait,
} from './style-policy';
import type { L13VerbosityResolutionProfile } from './verbosity-profile';
import type {
  L13LanguageResolutionStatus,
  L13ResolvedOutputLanguage,
} from './language-profile';

export interface L13StyleControlPlan {
  readonly style_control_plan_id: string;

  readonly request_id: string;
  readonly input_package_id?: string;

  readonly intent_class: L13UserIntentClass;
  readonly product_answer_mode: L13ProductAnswerMode;

  readonly resolved_language: L13ResolvedOutputLanguage;
  readonly language_resolution_status: L13LanguageResolutionStatus;

  readonly verbosity_profile: L13VerbosityResolutionProfile;
  readonly persona_profile_ref: string;
  readonly rendering_profile_ref: string;

  readonly raw_metric_policy: L13RawMetricDisclosurePolicy;
  readonly required_style_traits: readonly L13StyleTrait[];
  readonly forbidden_style_classes:
    readonly L13ForbiddenStyleClass[];
  readonly required_semantic_anchor_classes:
    readonly L13RequiredSemanticAnchorClass[];

  readonly may_use_colloquial_language: boolean;
  readonly may_use_compact_bullets: boolean;
  readonly may_use_headings: boolean;
  readonly may_use_dense_report_sections: boolean;

  readonly must_preserve_uncertainty: boolean;
  readonly must_preserve_contradiction: boolean;
  readonly must_preserve_trigger_invalidation: boolean;
  readonly must_preserve_restriction_disclosure: boolean;

  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
