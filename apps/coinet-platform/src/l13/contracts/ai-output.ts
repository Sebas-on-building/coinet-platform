/**
 * L13.3 — AI Explanation Output Contract
 *
 * §13.3.2 / §13.3.3 — Top-level AI output object that Layer 13 may
 * emit. Every output is typed, sectioned, evidence-linked,
 * confidence-aware, restriction-aware, and replay-safe.
 */

import type { L13AnswerMode } from './explanation-restriction-profile';
import type { L13BlockedClaim } from './blocked-claim';
import type { L13ConfidenceDisclosure } from './confidence-disclosure';
import type { L13ModelMetadata } from './model-metadata';
import type { L13OutputReadinessClass } from './output-readiness';
import type { L13OutputSection } from './output-section';
import type { L13RestrictionDisclosure } from './restriction-disclosure';

/**
 * §13.3.2 — Legal AI output classes.
 */
export enum L13AIOutputClass {
  MARKET_EXPLANATION = 'MARKET_EXPLANATION',
  USER_QUESTION_ANSWER = 'USER_QUESTION_ANSWER',
  ALERT_TEXT = 'ALERT_TEXT',
  ASSET_COMPARISON = 'ASSET_COMPARISON',
  THESIS_COMPARISON = 'THESIS_COMPARISON',
  STRUCTURED_REPORT = 'STRUCTURED_REPORT',
  SCENARIO_EXPLANATION = 'SCENARIO_EXPLANATION',
  SCORE_EXPLANATION = 'SCORE_EXPLANATION',
  CONTRADICTION_EXPLANATION = 'CONTRADICTION_EXPLANATION',
  UNCERTAINTY_DISCLOSURE = 'UNCERTAINTY_DISCLOSURE',
}

export const ALL_L13_AI_OUTPUT_CLASSES: readonly L13AIOutputClass[] =
  Object.values(L13AIOutputClass);

/**
 * §13.3.3 — Output object.
 */
export interface L13AIExplanationOutput {
  readonly output_id: string;

  readonly request_id: string;
  readonly input_package_id: string;

  readonly output_class: L13AIOutputClass;
  readonly answer_mode: L13AnswerMode;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly headline: string;
  readonly summary: string;

  readonly observation_section: L13OutputSection;
  readonly inference_section: L13OutputSection;
  readonly uncertainty_section: L13OutputSection;
  readonly contradiction_section: L13OutputSection;
  readonly scenario_section: L13OutputSection;
  readonly trigger_invalidation_section: L13OutputSection;

  readonly confidence_disclosure: L13ConfidenceDisclosure;
  readonly restriction_disclosure: L13RestrictionDisclosure;

  readonly evidence_refs: readonly string[];
  readonly contradiction_refs: readonly string[];
  readonly scenario_refs: readonly string[];
  readonly score_refs: readonly string[];
  readonly hypothesis_refs: readonly string[];

  readonly blocked_claims: readonly L13BlockedClaim[];

  readonly output_readiness: L13OutputReadinessClass;

  readonly model_metadata: L13ModelMetadata;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

/**
 * §13.3.3.1 — Identity fields whose absence is illegal.
 */
export const L13_REQUIRED_OUTPUT_IDENTITY_FIELDS: readonly (
  keyof L13AIExplanationOutput
)[] = [
  'output_id',
  'request_id',
  'input_package_id',
  'output_class',
  'answer_mode',
  'scope_type',
  'scope_id',
  'as_of',
  'policy_version',
  'replay_hash',
];

/**
 * §13.3.3.2 — Required content fields whose absence is illegal.
 */
export const L13_REQUIRED_OUTPUT_CONTENT_FIELDS: readonly (
  keyof L13AIExplanationOutput
)[] = [
  'headline',
  'summary',
  'observation_section',
  'inference_section',
  'uncertainty_section',
  'confidence_disclosure',
  'restriction_disclosure',
  'output_readiness',
  'model_metadata',
];

/**
 * §13.3.3.3 — Required trace fields.
 */
export const L13_REQUIRED_OUTPUT_TRACE_FIELDS: readonly (
  keyof L13AIExplanationOutput
)[] = ['evidence_refs', 'lineage_refs', 'input_package_id', 'replay_hash'];

/**
 * §13.3.2.1 — Output classes that explain scenarios. These trigger
 * the conditional scenario-section + trigger/invalidation-section
 * requirements.
 */
export const L13_SCENARIO_OUTPUT_CLASSES: readonly L13AIOutputClass[] = [
  L13AIOutputClass.SCENARIO_EXPLANATION,
  L13AIOutputClass.MARKET_EXPLANATION,
  L13AIOutputClass.ALERT_TEXT,
  L13AIOutputClass.STRUCTURED_REPORT,
];

export function isL13ScenarioOutputClass(
  cls: L13AIOutputClass,
): boolean {
  return L13_SCENARIO_OUTPUT_CLASSES.includes(cls);
}

/**
 * §13.3.2.1 — Output classes that explain scores. These trigger the
 * conditional `score_refs` + confidence/restriction disclosure
 * requirements.
 */
export const L13_SCORE_OUTPUT_CLASSES: readonly L13AIOutputClass[] = [
  L13AIOutputClass.SCORE_EXPLANATION,
  L13AIOutputClass.STRUCTURED_REPORT,
];

export function isL13ScoreOutputClass(cls: L13AIOutputClass): boolean {
  return L13_SCORE_OUTPUT_CLASSES.includes(cls);
}

/**
 * §13.3.2.1 — Output classes that explain hypotheses.
 */
export const L13_HYPOTHESIS_OUTPUT_CLASSES: readonly L13AIOutputClass[] = [
  L13AIOutputClass.THESIS_COMPARISON,
  L13AIOutputClass.STRUCTURED_REPORT,
];

export function isL13HypothesisOutputClass(
  cls: L13AIOutputClass,
): boolean {
  return L13_HYPOTHESIS_OUTPUT_CLASSES.includes(cls);
}
