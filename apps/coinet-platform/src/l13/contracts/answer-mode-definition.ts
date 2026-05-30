/**
 * L13.7 — Answer Mode Definition Contract
 *
 * §13.7.5 / §13.7.6 — Mode registry contract. Each registered
 * product answer mode declares: supported intents, supported
 * L13.3 output classes, required context classes, required output
 * sections, required disclosures, forbidden omissions, raw-metric
 * policy, verbosity, and rendering policy. Status (§13.7.4)
 * controls user-emittability.
 */

import type { L13UserIntentClass } from './user-intent-binding';
import type { L13AIOutputClass } from './ai-output';
import type { L13OutputSectionClass } from './output-section';
import {
  L13AnswerModeStatus,
  L13ModeDisclosureRequirement,
  L13ModeForbiddenOmission,
  L13ModeRenderingPolicy,
  L13ModeVerbosityPolicy,
  L13ProductAnswerMode,
  L13RawMetricDisclosurePolicy,
  L13RequiredModeContextClass,
} from './product-answer-mode';

export interface L13AnswerModeDefinition {
  readonly answer_mode: L13ProductAnswerMode;
  readonly answer_mode_status: L13AnswerModeStatus;

  readonly supported_intents: readonly L13UserIntentClass[];
  readonly supported_output_classes: readonly L13AIOutputClass[];

  readonly required_input_package_sections:
    readonly L13RequiredModeContextClass[];
  readonly optional_input_package_sections:
    readonly L13RequiredModeContextClass[];

  readonly required_l13_output_sections:
    readonly L13OutputSectionClass[];

  readonly required_disclosure_classes:
    readonly L13ModeDisclosureRequirement[];
  readonly forbidden_omissions:
    readonly L13ModeForbiddenOmission[];

  readonly raw_metric_disclosure_policy:
    L13RawMetricDisclosurePolicy;
  readonly verbosity_policy: L13ModeVerbosityPolicy;
  readonly rendering_policy: L13ModeRenderingPolicy;

  readonly may_include_watchpoints: boolean;
  readonly may_include_forward_paths: boolean;
  readonly may_include_comparison_conclusion: boolean;
  readonly may_include_directional_language: boolean;

  readonly policy_version: string;
  readonly replay_hash: string;
}
