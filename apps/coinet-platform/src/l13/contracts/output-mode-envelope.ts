/**
 * L13.7 — Output Mode Envelope Contract
 *
 * §13.7.7 — Canonical wrapper around every mode-specific payload.
 * The runtime hands the envelope to the final output gate; the
 * gate verifies envelope readiness alongside the L13.4 grounding
 * envelope and the L13.5 expression-governance envelope.
 *
 * §13.7.8 — `mode_readiness` is derived from the L13.3 / L13.4 /
 * L13.5 readiness chain plus mode-specific completeness checks.
 */

import type { L13AIOutputClass } from './ai-output';
import type { L13UserIntentClass } from './user-intent-binding';
import { L13ProductAnswerMode } from './product-answer-mode';

/**
 * §13.7.7 — Mode payload class taxonomy. Disjoint from the L13.3
 * AI output class taxonomy; this is the L13.7 product payload
 * shape.
 */
export enum L13ModePayloadClass {
  CHAT_ANSWER = 'CHAT_ANSWER',
  ALERT_OUTPUT = 'ALERT_OUTPUT',
  STRUCTURED_REPORT = 'STRUCTURED_REPORT',
  ASSET_COMPARISON = 'ASSET_COMPARISON',
  THESIS_COMPARISON = 'THESIS_COMPARISON',
  SCENARIO_EXPLANATION = 'SCENARIO_EXPLANATION',
  SCORE_EXPLANATION = 'SCORE_EXPLANATION',
  CONTRADICTION_EXPLANATION = 'CONTRADICTION_EXPLANATION',
  DEBUG_EXPLANATION = 'DEBUG_EXPLANATION',
}

export const ALL_L13_MODE_PAYLOAD_CLASSES:
  readonly L13ModePayloadClass[] =
  Object.values(L13ModePayloadClass);

/**
 * §13.7.8 — Mode readiness class taxonomy.
 */
export enum L13ModeReadinessClass {
  MODE_READY = 'MODE_READY',
  MODE_READY_WITH_DISCLOSURE = 'MODE_READY_WITH_DISCLOSURE',
  MODE_NARROWED_BY_UNCERTAINTY = 'MODE_NARROWED_BY_UNCERTAINTY',
  MODE_NARROWED_BY_RESTRICTION = 'MODE_NARROWED_BY_RESTRICTION',
  MODE_PARTIAL_ALLOWED = 'MODE_PARTIAL_ALLOWED',
  MODE_REFUSAL_REQUIRED = 'MODE_REFUSAL_REQUIRED',
  MODE_BLOCKED = 'MODE_BLOCKED',
}

export const ALL_L13_MODE_READINESS_CLASSES:
  readonly L13ModeReadinessClass[] =
  Object.values(L13ModeReadinessClass);

/**
 * Readiness classes that prevent user emission of the mode
 * payload. (The final output gate also checks the L13.4 +
 * L13.5 envelopes; this is the mode-level slice.)
 */
export const L13_BLOCKING_MODE_READINESS_CLASSES:
  readonly L13ModeReadinessClass[] = [
  L13ModeReadinessClass.MODE_REFUSAL_REQUIRED,
  L13ModeReadinessClass.MODE_BLOCKED,
];

export function isL13BlockingModeReadiness(
  cls: L13ModeReadinessClass,
): boolean {
  return L13_BLOCKING_MODE_READINESS_CLASSES.includes(cls);
}

export interface L13OutputModeEnvelope {
  readonly mode_envelope_id: string;

  readonly output_id: string;
  readonly input_package_id: string;
  readonly runtime_run_id: string;

  readonly answer_mode: L13ProductAnswerMode;
  readonly intent_class: L13UserIntentClass;
  readonly output_class: L13AIOutputClass;

  readonly mode_payload_class: L13ModePayloadClass;
  readonly mode_payload_ref: string;

  readonly mode_readiness: L13ModeReadinessClass;
  readonly required_disclosures_satisfied: boolean;
  readonly forbidden_omissions_detected: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
