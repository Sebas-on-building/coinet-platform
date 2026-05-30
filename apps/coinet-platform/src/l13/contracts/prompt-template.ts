/**
 * L13.6 — Prompt Template Contract
 *
 * §13.6.9 — Prompt templates are versioned, status-gated, and
 * carry the mandatory policy blocks every L13 model call must
 * include (no-invention, observation/inference separation,
 * contradiction disclosure, confidence phrasing, scenario
 * conditionality, non-recommendation, blocked-claim instruction,
 * structured-output schema reference).
 */

import type { L13AnswerMode } from './explanation-restriction-profile';
import type { L13UserIntentClass } from './user-intent-binding';
import type { L13AIOutputClass } from './ai-output';

/**
 * §13.6.9.2 — Template status.
 */
export enum L13PromptTemplateStatus {
  PRODUCTION_ENABLED = 'PRODUCTION_ENABLED',
  SHADOW_ONLY = 'SHADOW_ONLY',
  EXPERIMENTAL_BLOCKED = 'EXPERIMENTAL_BLOCKED',
  DEPRECATED = 'DEPRECATED',
  FROZEN = 'FROZEN',
}

export const ALL_L13_PROMPT_TEMPLATE_STATUSES:
  readonly L13PromptTemplateStatus[] =
  Object.values(L13PromptTemplateStatus);

export function isL13PromptTemplateUsable(
  status: L13PromptTemplateStatus,
): boolean {
  return (
    status === L13PromptTemplateStatus.PRODUCTION_ENABLED ||
    status === L13PromptTemplateStatus.SHADOW_ONLY ||
    status === L13PromptTemplateStatus.FROZEN
  );
}

/**
 * §13.6.9.1 — Required input-package section identifiers a
 * template demands. The prompt assembler refuses to build if a
 * required section is absent.
 */
export enum L13PromptRequiredPackageSection {
  CANONICAL_ENTITY_SUMMARY = 'CANONICAL_ENTITY_SUMMARY',
  VALIDATION_SUMMARY = 'VALIDATION_SUMMARY',
  CONTRADICTION_SUMMARY = 'CONTRADICTION_SUMMARY',
  REGIME_SUMMARY = 'REGIME_SUMMARY',
  SEQUENCE_SUMMARY = 'SEQUENCE_SUMMARY',
  HYPOTHESIS_SUMMARY = 'HYPOTHESIS_SUMMARY',
  SCORE_SUMMARY = 'SCORE_SUMMARY',
  SCENARIO_SUMMARY = 'SCENARIO_SUMMARY',
  CONFIDENCE_BREAKDOWN = 'CONFIDENCE_BREAKDOWN',
  UNCERTAINTY_PROFILE = 'UNCERTAINTY_PROFILE',
  RESTRICTION_PROFILE = 'RESTRICTION_PROFILE',
  EVIDENCE_DIGEST = 'EVIDENCE_DIGEST',
}

export const ALL_L13_PROMPT_REQUIRED_PACKAGE_SECTIONS:
  readonly L13PromptRequiredPackageSection[] =
  Object.values(L13PromptRequiredPackageSection);

/**
 * §13.6.9.1 — Allowed style classes a template may emit.
 */
export enum L13PromptStyleClass {
  CONCISE = 'CONCISE',
  NORMAL = 'NORMAL',
  DETAILED = 'DETAILED',
  STRUCTURED_REPORT = 'STRUCTURED_REPORT',
  ALERT_TEXT = 'ALERT_TEXT',
  REFUSAL_ONLY = 'REFUSAL_ONLY',
}

export const ALL_L13_PROMPT_STYLE_CLASSES:
  readonly L13PromptStyleClass[] =
  Object.values(L13PromptStyleClass);

/**
 * §13.6.9.1 — Prompt Template object.
 */
export interface L13PromptTemplate {
  readonly prompt_template_id: string;
  readonly prompt_template_version: string;

  readonly supported_intents: readonly L13UserIntentClass[];
  readonly supported_output_classes: readonly L13AIOutputClass[];
  readonly supported_answer_modes: readonly L13AnswerMode[];

  readonly system_role_block: string;
  readonly engine_hierarchy_block: string;
  readonly no_invention_block: string;
  readonly observation_inference_block: string;
  readonly contradiction_disclosure_block: string;
  readonly confidence_phrasing_block: string;
  readonly scenario_conditionality_block: string;
  readonly non_recommendation_block: string;
  readonly blocked_claim_block: string;

  readonly output_schema_instruction: string;
  readonly response_length_policy_ref: string;
  readonly language_tone_policy_ref: string;

  readonly required_input_package_sections:
    readonly L13PromptRequiredPackageSection[];
  readonly allowed_style_classes:
    readonly L13PromptStyleClass[];

  readonly template_status: L13PromptTemplateStatus;

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.6.10 — Mandatory policy block field names. The validator
 * checks each named field is non-empty on every registered
 * template.
 */
export const L13_MANDATORY_PROMPT_POLICY_BLOCKS: readonly (
  keyof L13PromptTemplate
)[] = [
  'system_role_block',
  'engine_hierarchy_block',
  'no_invention_block',
  'observation_inference_block',
  'contradiction_disclosure_block',
  'confidence_phrasing_block',
  'scenario_conditionality_block',
  'non_recommendation_block',
  'blocked_claim_block',
  'output_schema_instruction',
  'response_length_policy_ref',
  'language_tone_policy_ref',
];
