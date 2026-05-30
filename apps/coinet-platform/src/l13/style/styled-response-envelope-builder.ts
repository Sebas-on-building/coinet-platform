/**
 * L13.8 — Styled Response Envelope Builder
 *
 * §13.8.27 — Orchestrates the per-payload-type shaper, the
 * multilingual safety engine, and the semantic integrity engine,
 * and emits an `L13StyledResponseEnvelope` ready for the L13.6
 * final output gate (§13.8.1.2).
 */

import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import type { L13OutputModeEnvelope } from '../contracts/output-mode-envelope';
import { L13ModePayloadClass } from '../contracts/output-mode-envelope';
import type { L13StyleControlPlan } from '../contracts/style-control-plan';
import type { L13MultilingualSafetyScan } from '../contracts/multilingual-safety-scan';
import { L13MultilingualScanReadinessClass } from '../contracts/multilingual-safety-scan';
import type { L13StyleSemanticIntegrityProfile } from '../contracts/style-semantic-integrity-profile';
import {
  L13StyleIntegrityStatus,
  isL13BlockingStyleIntegrity,
} from '../contracts/style-semantic-integrity-profile';
import {
  L13StyleReadinessClass,
  type L13StyledResponseEnvelope,
} from '../contracts/styled-response-envelope';
import {
  shapeL13AlertResponse,
  shapeL13AssetComparisonResponse,
  shapeL13ChatResponse,
  shapeL13ContradictionResponse,
  shapeL13DebugResponse,
  shapeL13ReportResponse,
  shapeL13ScenarioResponse,
  shapeL13ScoreResponse,
  shapeL13ThesisComparisonResponse,
  type L13ShapedResponse,
} from './response-shaper';
import { runL13MultilingualSafetyScan } from './multilingual-safety-engine';
import { runL13StyleSemanticIntegrityEngine } from './style-semantic-integrity-engine';
import { fnv1a } from '../context/_fnv1a';

import type { L13ChatAnswerOutput } from '../contracts/chat-answer-output';
import type { L13AlertOutput } from '../contracts/alert-output';
import type { L13StructuredReportOutput } from '../contracts/structured-report-output';
import type { L13AssetComparisonOutput } from '../contracts/asset-comparison-output';
import type { L13ThesisComparisonOutput } from '../contracts/thesis-comparison-output';
import type { L13ScenarioExplanationOutput } from '../contracts/scenario-explanation-output';
import type { L13ScoreExplanationOutput } from '../contracts/score-explanation-output';
import type { L13ContradictionExplanationOutput } from '../contracts/contradiction-explanation-output';
import type { L13DebugExplanationOutput } from '../contracts/debug-explanation-output';

const POLICY_V = 'l13.style.v1';

/**
 * Discriminated source-payload union — caller passes exactly one.
 */
export type L13ModePayloadInput =
  | { readonly kind: L13ModePayloadClass.CHAT_ANSWER; readonly payload: L13ChatAnswerOutput }
  | { readonly kind: L13ModePayloadClass.ALERT_OUTPUT; readonly payload: L13AlertOutput }
  | { readonly kind: L13ModePayloadClass.STRUCTURED_REPORT; readonly payload: L13StructuredReportOutput }
  | { readonly kind: L13ModePayloadClass.ASSET_COMPARISON; readonly payload: L13AssetComparisonOutput }
  | { readonly kind: L13ModePayloadClass.THESIS_COMPARISON; readonly payload: L13ThesisComparisonOutput }
  | { readonly kind: L13ModePayloadClass.SCENARIO_EXPLANATION; readonly payload: L13ScenarioExplanationOutput }
  | { readonly kind: L13ModePayloadClass.SCORE_EXPLANATION; readonly payload: L13ScoreExplanationOutput }
  | { readonly kind: L13ModePayloadClass.CONTRADICTION_EXPLANATION; readonly payload: L13ContradictionExplanationOutput }
  | { readonly kind: L13ModePayloadClass.DEBUG_EXPLANATION; readonly payload: L13DebugExplanationOutput };

export interface L13StyledEnvelopeBuilderInput {
  readonly output_id: string;
  readonly runtime_run_id: string;
  readonly mode_envelope: L13OutputModeEnvelope;
  readonly style_plan: L13StyleControlPlan;
  readonly mode_payload: L13ModePayloadInput;
  readonly source_corpus: string;
  readonly refusal_or_blocked_corpus?: string;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export interface L13StyledEnvelopeResult {
  readonly envelope: L13StyledResponseEnvelope;
  readonly shaped: L13ShapedResponse;
  readonly safety_scan: L13MultilingualSafetyScan;
  readonly integrity: L13StyleSemanticIntegrityProfile;
}

function shape(
  payload: L13ModePayloadInput,
): L13ShapedResponse {
  switch (payload.kind) {
    case L13ModePayloadClass.CHAT_ANSWER:
      return shapeL13ChatResponse(payload.payload);
    case L13ModePayloadClass.ALERT_OUTPUT:
      return shapeL13AlertResponse(payload.payload);
    case L13ModePayloadClass.STRUCTURED_REPORT:
      return shapeL13ReportResponse(payload.payload);
    case L13ModePayloadClass.ASSET_COMPARISON:
      return shapeL13AssetComparisonResponse(payload.payload);
    case L13ModePayloadClass.THESIS_COMPARISON:
      return shapeL13ThesisComparisonResponse(payload.payload);
    case L13ModePayloadClass.SCENARIO_EXPLANATION:
      return shapeL13ScenarioResponse(payload.payload);
    case L13ModePayloadClass.SCORE_EXPLANATION:
      return shapeL13ScoreResponse(payload.payload);
    case L13ModePayloadClass.CONTRADICTION_EXPLANATION:
      return shapeL13ContradictionResponse(payload.payload);
    case L13ModePayloadClass.DEBUG_EXPLANATION:
      return shapeL13DebugResponse(payload.payload);
    default: {
      const _exhaustive: never = payload;
      void _exhaustive;
      throw new Error('Unsupported mode payload class');
    }
  }
}

function payloadId(payload: L13ModePayloadInput): string {
  switch (payload.kind) {
    case L13ModePayloadClass.CHAT_ANSWER:
      return payload.payload.chat_answer_id;
    case L13ModePayloadClass.ALERT_OUTPUT:
      return payload.payload.alert_output_id;
    case L13ModePayloadClass.STRUCTURED_REPORT:
      return payload.payload.report_output_id;
    case L13ModePayloadClass.ASSET_COMPARISON:
      return payload.payload.asset_comparison_id;
    case L13ModePayloadClass.THESIS_COMPARISON:
      return payload.payload.thesis_comparison_id;
    case L13ModePayloadClass.SCENARIO_EXPLANATION:
      return payload.payload.scenario_explanation_id;
    case L13ModePayloadClass.SCORE_EXPLANATION:
      return payload.payload.score_explanation_id;
    case L13ModePayloadClass.CONTRADICTION_EXPLANATION:
      return payload.payload.contradiction_explanation_id;
    case L13ModePayloadClass.DEBUG_EXPLANATION:
      return payload.payload.debug_explanation_id;
    default: {
      const _exhaustive: never = payload;
      void _exhaustive;
      return '';
    }
  }
}

function deriveReadiness(args: {
  readonly integrity: L13StyleIntegrityStatus;
  readonly safety: L13MultilingualScanReadinessClass;
  readonly disclosureFloorActive: boolean;
}): L13StyleReadinessClass {
  if (
    args.safety === L13MultilingualScanReadinessClass.SAFETY_BLOCKED
  ) {
    return L13StyleReadinessClass.STYLE_BLOCKED;
  }
  if (
    args.integrity ===
    L13StyleIntegrityStatus.STYLE_SEMANTIC_REWRITE_REQUIRED
  ) {
    return L13StyleReadinessClass.STYLE_SEMANTIC_REWRITE_REQUIRED;
  }
  if (
    args.integrity === L13StyleIntegrityStatus.STYLE_RESHAPE_REQUIRED
  ) {
    return L13StyleReadinessClass.STYLE_RESHAPE_REQUIRED;
  }
  if (
    args.integrity ===
      L13StyleIntegrityStatus.STYLE_INTEGRITY_CLEAN_WITH_DISCLOSURE_FLOOR ||
    args.disclosureFloorActive
  ) {
    return L13StyleReadinessClass.STYLE_READY_WITH_DISCLOSURE_FLOOR;
  }
  return L13StyleReadinessClass.STYLE_READY;
}

/**
 * §13.8.27 — Build the styled response envelope. Pure function
 * over the bound inputs.
 */
export function buildL13StyledResponseEnvelope(
  input: L13StyledEnvelopeBuilderInput,
): L13StyledEnvelopeResult {
  const shaped = shape(input.mode_payload);
  const source_payload_id = payloadId(input.mode_payload);

  const safety_scan = runL13MultilingualSafetyScan({
    output_id: input.output_id,
    resolved_language: input.style_plan.resolved_language,
    user_visible_corpus: shaped.display_payload_text,
    refusal_or_blocked_corpus: input.refusal_or_blocked_corpus,
    debug_corpus:
      input.mode_payload.kind ===
      L13ModePayloadClass.DEBUG_EXPLANATION
        ? shaped.display_payload_text
        : undefined,
  });

  const integrity = runL13StyleSemanticIntegrityEngine({
    source_mode_payload_ref: source_payload_id,
    shaped_response_ref: shaped.display_payload_ref,
    source_corpus: input.source_corpus,
    shaped_corpus: shaped.display_payload_text,
    required_anchor_classes:
      input.style_plan.required_semantic_anchor_classes,
  });

  const disclosureFloorActive =
    input.style_plan.verbosity_profile
      .hard_max_words_overridden_by_disclosure_floor;

  const readiness = deriveReadiness({
    integrity: integrity.integrity_status,
    safety: safety_scan.readiness,
    disclosureFloorActive,
  });

  const blocking =
    readiness === L13StyleReadinessClass.STYLE_BLOCKED ||
    readiness === L13StyleReadinessClass.STYLE_SEMANTIC_REWRITE_REQUIRED ||
    readiness === L13StyleReadinessClass.STYLE_RESHAPE_REQUIRED ||
    isL13BlockingStyleIntegrity(integrity.integrity_status);

  const rewriteRequired =
    readiness ===
      L13StyleReadinessClass.STYLE_SEMANTIC_REWRITE_REQUIRED ||
    readiness === L13StyleReadinessClass.STYLE_RESHAPE_REQUIRED;
  const blockRequired =
    readiness === L13StyleReadinessClass.STYLE_BLOCKED;

  const evidence_refs = input.evidence_refs ?? [];
  const lineage_refs = input.lineage_refs ?? ['l13.style.lineage'];

  const replayHash = fnv1a(
    [
      input.output_id,
      input.runtime_run_id,
      input.mode_envelope.mode_envelope_id,
      input.style_plan.style_control_plan_id,
      input.style_plan.verbosity_profile.verbosity_resolution_id,
      input.style_plan.persona_profile_ref,
      input.style_plan.resolved_language,
      input.style_plan.verbosity_profile.resolved_verbosity,
      shaped.display_payload_class,
      shaped.display_payload_ref,
      safety_scan.scan_id,
      integrity.style_integrity_id,
      readiness,
      String(blocking),
      String(rewriteRequired),
      String(blockRequired),
      POLICY_V,
    ].join('|'),
  );

  const envelope: L13StyledResponseEnvelope = {
    styled_response_id: `l13.style.env.${replayHash}`,
    output_id: input.output_id,
    mode_envelope_id: input.mode_envelope.mode_envelope_id,
    runtime_run_id: input.runtime_run_id,
    style_control_plan_ref: input.style_plan.style_control_plan_id,
    verbosity_profile_ref:
      input.style_plan.verbosity_profile.verbosity_resolution_id,
    persona_profile_ref: input.style_plan.persona_profile_ref,
    language_profile_ref: `l13.lang.${input.style_plan.resolved_language}`,
    style_integrity_profile_ref: integrity.style_integrity_id,
    resolved_language: input.style_plan.resolved_language,
    resolved_verbosity:
      input.style_plan.verbosity_profile.resolved_verbosity,
    display_payload_class: shaped.display_payload_class,
    display_payload_ref: shaped.display_payload_ref,
    multilingual_safety_scan_ref: safety_scan.scan_id,
    style_readiness: readiness,
    may_emit_to_user: !blocking,
    rewrite_required: rewriteRequired,
    block_required: blockRequired,
    evidence_refs,
    lineage_refs,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };

  return { envelope, shaped, safety_scan, integrity };
}

/**
 * Suppresses an unused-import warning when callers only need the
 * builder function (the product answer mode enum is referenced by
 * downstream callers).
 */
void L13ProductAnswerMode.SHORT_CHAT;
