/**
 * L13.6 — Refusal Envelope Builder
 *
 * §13.6.20 — Builds a runtime refusal envelope plus the
 * L13.3 refusal output object that the final output gate may emit
 * in place of a substantive answer.
 *
 * Refusal output is itself L13.3-shaped: it has all required
 * fields, but every section is an explicit refusal/uncertainty
 * statement.
 */

import {
  L13AIOutputClass,
  type L13AIExplanationOutput,
} from '../contracts/ai-output';
import {
  L13AnswerMode,
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
} from '../contracts/explanation-restriction-profile';
import {
  L13OutputSectionClass,
  L13OutputSectionReadinessClass,
  type L13OutputSection,
} from '../contracts/output-section';
import {
  L13_FORBIDDEN_CONFIDENCE_PHRASES,
  type L13ConfidenceDisclosure,
} from '../contracts/confidence-disclosure';
import type { L13RestrictionDisclosure } from '../contracts/restriction-disclosure';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import type { L13ModelMetadata } from '../contracts/model-metadata';
import { L13OutputReadinessClass } from '../contracts/output-readiness';
import {
  L13RuntimeRefusalReasonCode,
  type L13RuntimeRefusalEnvelope,
} from '../contracts/runtime-refusal-envelope';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

export interface L13RefusalBuildInput {
  readonly request_id: string;
  readonly input_package_id?: string;
  readonly reason_codes:
    readonly L13RuntimeRefusalReasonCode[];
  readonly lower_layer_restriction_refs?: readonly string[];
  readonly runtime_violation_refs?: readonly string[];
  readonly user_message?: string;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export interface L13RefusalBuildResult {
  readonly refusal_envelope: L13RuntimeRefusalEnvelope;
  readonly refusal_output: L13AIExplanationOutput;
}

function refusalSection(
  id: string,
  cls: L13OutputSectionClass,
  content: string,
): L13OutputSection {
  return {
    section_id: id,
    section_class: cls,
    title: cls,
    content,
    claim_refs: [],
    evidence_refs: [],
    contradiction_refs: [],
    required: cls !== L13OutputSectionClass.SCENARIO,
    present: content.trim().length > 0,
    section_readiness:
      content.trim().length > 0
        ? L13OutputSectionReadinessClass.SECTION_COMPLETE
        : L13OutputSectionReadinessClass.SECTION_OPTIONAL_ABSENT,
    may_contain_inference: cls === L13OutputSectionClass.INFERENCE,
    may_contain_observation: cls === L13OutputSectionClass.OBSERVATION,
    may_contain_uncertainty: true,
    may_contain_restriction: cls === L13OutputSectionClass.RESTRICTION,
    forbidden_semantic_hits: [],
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
  };
}

function refusalConfidenceDisclosure(
  outputId: string,
): L13ConfidenceDisclosure {
  return {
    confidence_disclosure_id: `l13.conf.${outputId}`,
    explanation_confidence_band:
      L13ExplanationConfidenceBand.VERY_LOW,
    confidence_basis_refs: [],
    confidence_cap_refs: [],
    confidence_narrowing_reasons: ['REFUSAL'],
    may_use_confident_language: false,
    must_use_uncertainty_language: true,
    forbidden_confidence_phrases: [...L13_FORBIDDEN_CONFIDENCE_PHRASES],
    confidence_statement:
      'Confidence is very low because the engine cannot legally answer this request.',
    evidence_refs: [],
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
  };
}

function refusalRestrictionDisclosure(
  outputId: string,
): L13RestrictionDisclosure {
  return {
    restriction_disclosure_id: `l13.restr.${outputId}`,
    lower_layer_restriction_refs: [],
    applied_restriction_codes: ['REFUSAL'],
    blocked_answer_modes: [...L13_ALWAYS_BLOCKED_ANSWER_MODES],
    required_disclosures: ['REFUSAL_DISCLOSURE'],
    restriction_statement:
      'This output is limited by an active lower-layer restriction. Insufficient context to support a stronger claim.',
    may_include_directional_language: false,
    may_include_scenario_language: false,
    may_include_score_language: false,
    must_avoid_recommendation_language: true,
    must_avoid_prediction_language: true,
    must_avoid_final_judgment_language: true,
    evidence_refs: [],
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
  };
}

function refusalModelMetadata(outputId: string): L13ModelMetadata {
  return {
    model_metadata_id: `l13.meta.${outputId}`,
    model_provider: 'INTERNAL_MOCK',
    model_name: 'refusal-builder',
    prompt_template_id: 'l13.prompt.refusal.v1',
    prompt_template_version: '1.0.0',
    input_package_hash: 'refusal',
    output_policy_version: POLICY_V,
    temperature: 0,
    max_output_tokens: 0,
    generation_started_at: '2026-05-15T00:00:00Z',
    generation_completed_at: '2026-05-15T00:00:00Z',
    post_validation_passed: true,
    post_validation_issue_refs: [],
    safety_gate_passed: true,
    grounding_gate_passed: true,
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
  };
}

/**
 * §13.6.20 — Build a refusal envelope and the L13.3 output the
 * final gate may emit.
 */
export function buildL13RuntimeRefusal(
  input: L13RefusalBuildInput,
): L13RefusalBuildResult {
  const baseHash = fnv1a(
    [
      input.request_id,
      input.input_package_id ?? '',
      [...input.reason_codes].sort().join(','),
      input.user_message ?? '',
      POLICY_V,
    ].join('|'),
  );
  const outputId = `l13.refusal.output.${baseHash}`;
  const message =
    input.user_message ??
    'The engine cannot legally answer this request. The setup is not clean and the current path remains conditional. Insufficient context to support a stronger claim.';

  const observation = refusalSection(
    'sec.obs.refusal',
    L13OutputSectionClass.OBSERVATION,
    'Engine reports the request is outside the L13 explanation surface.',
  );
  const inference = refusalSection(
    'sec.inf.refusal',
    L13OutputSectionClass.INFERENCE,
    'No supported observation is available because the request is out of scope; the engine preserves alternatives.',
  );
  const uncertainty = refusalSection(
    'sec.unc.refusal',
    L13OutputSectionClass.UNCERTAINTY,
    'The setup is not clean; the base case is confidence-capped and remains conditional.',
  );
  const contradiction = refusalSection(
    'sec.con.empty',
    L13OutputSectionClass.CONTRADICTION,
    '',
  );
  const scenario = refusalSection(
    'sec.scn.refusal',
    L13OutputSectionClass.SCENARIO,
    'The current path remains conditional and is not predictive.',
  );
  const trigger = refusalSection(
    'sec.tri.refusal',
    L13OutputSectionClass.TRIGGER_INVALIDATION,
    'Triggers remain unresolved; the answer would depend on confirmation that the engine has not produced.',
  );

  const confidence = refusalConfidenceDisclosure(outputId);
  const restriction = refusalRestrictionDisclosure(outputId);
  const metadata = refusalModelMetadata(outputId);

  const replayHash = fnv1a(
    [
      outputId,
      message,
      observation.section_id,
      inference.section_id,
      uncertainty.section_id,
      contradiction.section_id,
      scenario.section_id,
      trigger.section_id,
      confidence.confidence_disclosure_id,
      restriction.restriction_disclosure_id,
      metadata.model_metadata_id,
      POLICY_V,
    ].join('|'),
  );

  const refusal_output: L13AIExplanationOutput = {
    output_id: outputId,
    request_id: input.request_id,
    input_package_id: input.input_package_id ?? 'l13.refusal.no-package',
    output_class: L13AIOutputClass.UNCERTAINTY_DISCLOSURE,
    answer_mode: L13AnswerMode.REFUSE_UNSUPPORTED,
    scope_type: 'refusal',
    scope_id: 'refusal',
    as_of: '2026-05-15T00:00:00Z',
    headline:
      'This question asks for guidance the engine cannot legally provide.',
    summary: message,
    observation_section: observation,
    inference_section: inference,
    uncertainty_section: uncertainty,
    contradiction_section: contradiction,
    scenario_section: scenario,
    trigger_invalidation_section: trigger,
    confidence_disclosure: confidence,
    restriction_disclosure: restriction,
    evidence_refs: [],
    contradiction_refs: [],
    scenario_refs: [],
    score_refs: [],
    hypothesis_refs: [],
    blocked_claims: [],
    output_readiness: L13OutputReadinessClass.REFUSAL_REQUIRED,
    model_metadata: metadata,
    lineage_refs: ['l13.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };

  const envelopeHash = fnv1a(
    [
      input.request_id,
      input.input_package_id ?? '',
      [...input.reason_codes].sort().join(','),
      refusal_output.output_id,
      [...(input.lower_layer_restriction_refs ?? [])].sort().join(','),
      [...(input.runtime_violation_refs ?? [])].sort().join(','),
      POLICY_V,
    ].join('|'),
  );

  const envelope: L13RuntimeRefusalEnvelope = {
    refusal_envelope_id: `l13.refusal.envelope.${envelopeHash}`,
    request_id: input.request_id,
    input_package_id: input.input_package_id,
    refusal_reason_codes: input.reason_codes,
    refusal_output_ref: refusal_output.output_id,
    lower_layer_restriction_refs:
      input.lower_layer_restriction_refs ?? [],
    runtime_violation_refs: input.runtime_violation_refs ?? [],
    may_emit_refusal: true,
    lineage_refs: input.lineage_refs ?? ['l13.runtime.lineage'],
    policy_version: POLICY_V,
    replay_hash: envelopeHash,
  };

  return { refusal_envelope: envelope, refusal_output };
}
