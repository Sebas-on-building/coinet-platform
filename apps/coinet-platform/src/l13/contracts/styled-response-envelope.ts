/**
 * L13.8 — Styled Response Envelope Contract
 *
 * §13.8.27 / §13.8.28 / §13.8.29 — Final hand-off from L13.8 to
 * the L13.6 final output gate. Wraps the chosen display payload
 * (chat text, alert text, report tree, comparison tree, debug
 * tree) together with refs to the style control plan, verbosity
 * profile, persona profile, language profile, multilingual safety
 * scan, and style semantic integrity profile.
 */

import type { L13VerbosityLevel } from './verbosity-profile';
import type { L13ResolvedOutputLanguage } from './language-profile';

export enum L13StyledDisplayPayloadClass {
  CHAT_TEXT = 'CHAT_TEXT',
  ALERT_TEXT = 'ALERT_TEXT',
  REPORT_RENDER_TREE = 'REPORT_RENDER_TREE',
  COMPARISON_RENDER_TREE = 'COMPARISON_RENDER_TREE',
  DEBUG_RENDER_TREE = 'DEBUG_RENDER_TREE',
}

export const ALL_L13_STYLED_DISPLAY_PAYLOAD_CLASSES:
  readonly L13StyledDisplayPayloadClass[] =
  Object.values(L13StyledDisplayPayloadClass);

export enum L13StyleReadinessClass {
  STYLE_READY = 'STYLE_READY',
  STYLE_READY_WITH_DISCLOSURE_FLOOR = 'STYLE_READY_WITH_DISCLOSURE_FLOOR',
  STYLE_NARROWED_BY_VERBOSITY_CONSTRAINT = 'STYLE_NARROWED_BY_VERBOSITY_CONSTRAINT',
  STYLE_RESHAPE_REQUIRED = 'STYLE_RESHAPE_REQUIRED',
  STYLE_SEMANTIC_REWRITE_REQUIRED = 'STYLE_SEMANTIC_REWRITE_REQUIRED',
  STYLE_BLOCKED = 'STYLE_BLOCKED',
}

export const ALL_L13_STYLE_READINESS_CLASSES:
  readonly L13StyleReadinessClass[] =
  Object.values(L13StyleReadinessClass);

export const L13_BLOCKING_STYLE_READINESS_CLASSES:
  readonly L13StyleReadinessClass[] = [
  L13StyleReadinessClass.STYLE_RESHAPE_REQUIRED,
  L13StyleReadinessClass.STYLE_SEMANTIC_REWRITE_REQUIRED,
  L13StyleReadinessClass.STYLE_BLOCKED,
];

export function isL13BlockingStyleReadiness(
  cls: L13StyleReadinessClass,
): boolean {
  return L13_BLOCKING_STYLE_READINESS_CLASSES.includes(cls);
}

export interface L13StyledResponseEnvelope {
  readonly styled_response_id: string;

  readonly output_id: string;
  readonly mode_envelope_id: string;
  readonly runtime_run_id: string;

  readonly style_control_plan_ref: string;
  readonly verbosity_profile_ref: string;
  readonly persona_profile_ref: string;
  readonly language_profile_ref: string;
  readonly style_integrity_profile_ref: string;

  readonly resolved_language: L13ResolvedOutputLanguage;
  readonly resolved_verbosity: L13VerbosityLevel;

  readonly display_payload_class: L13StyledDisplayPayloadClass;
  readonly display_payload_ref: string;

  readonly multilingual_safety_scan_ref: string;

  readonly style_readiness: L13StyleReadinessClass;

  readonly may_emit_to_user: boolean;
  readonly rewrite_required: boolean;
  readonly block_required: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
