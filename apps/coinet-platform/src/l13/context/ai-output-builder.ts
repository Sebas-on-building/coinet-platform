/**
 * L13.3 — AI Output Builder & Replay Hash
 *
 * §13.3.18 — Canonical replay material. The builder accepts the raw
 * sections + disclosures + refs an emitter would produce and stamps
 * a deterministic replay hash + output id over the canonical
 * material. Identical material produces identical hashes; reorder of
 * unordered refs does not flip the hash; text/structural mutation
 * flips the hash.
 */

import type {
  L13AIExplanationOutput,
  L13AIOutputClass,
} from '../contracts/ai-output';
import type { L13AnswerMode } from '../contracts/explanation-restriction-profile';
import type { L13BlockedClaim } from '../contracts/blocked-claim';
import type { L13ConfidenceDisclosure } from '../contracts/confidence-disclosure';
import type { L13ModelMetadata } from '../contracts/model-metadata';
import { L13OutputReadinessClass } from '../contracts/output-readiness';
import type { L13OutputSection } from '../contracts/output-section';
import type { L13RestrictionDisclosure } from '../contracts/restriction-disclosure';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.output.v1';

export interface L13AIOutputBuildInput {
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
}

/**
 * §13.3.18 — Canonical replay-hash material.
 */
export function canonicalL13AIOutputReplayHash(
  output: L13AIExplanationOutput,
): string {
  return computeReplayHash({
    request_id: output.request_id,
    input_package_id: output.input_package_id,
    output_class: output.output_class,
    answer_mode: output.answer_mode,
    scope_type: output.scope_type,
    scope_id: output.scope_id,
    as_of: output.as_of,
    headline: output.headline,
    summary: output.summary,
    observation_section: output.observation_section,
    inference_section: output.inference_section,
    uncertainty_section: output.uncertainty_section,
    contradiction_section: output.contradiction_section,
    scenario_section: output.scenario_section,
    trigger_invalidation_section: output.trigger_invalidation_section,
    confidence_disclosure: output.confidence_disclosure,
    restriction_disclosure: output.restriction_disclosure,
    evidence_refs: output.evidence_refs,
    contradiction_refs: output.contradiction_refs,
    scenario_refs: output.scenario_refs,
    score_refs: output.score_refs,
    hypothesis_refs: output.hypothesis_refs,
    blocked_claims: output.blocked_claims,
    output_readiness: output.output_readiness,
    model_metadata: output.model_metadata,
    lineage_refs: output.lineage_refs,
  });
}

function sectionFingerprint(s: L13OutputSection): string {
  return [
    s.section_id,
    s.section_class,
    s.title,
    s.content,
    [...s.claim_refs].sort().join(','),
    [...s.evidence_refs].sort().join(','),
    [...s.contradiction_refs].sort().join(','),
    String(s.required),
    String(s.present),
    s.section_readiness,
    String(s.may_contain_inference),
    String(s.may_contain_observation),
    String(s.may_contain_uncertainty),
    String(s.may_contain_restriction),
    [...s.forbidden_semantic_hits].sort().join(','),
    [...s.lineage_refs].sort().join(','),
  ].join('::');
}

function confidenceFingerprint(c: L13ConfidenceDisclosure): string {
  return [
    c.confidence_disclosure_id,
    c.explanation_confidence_band,
    [...c.confidence_basis_refs].sort().join(','),
    [...c.confidence_cap_refs].sort().join(','),
    [...c.confidence_narrowing_reasons].sort().join(','),
    String(c.may_use_confident_language),
    String(c.must_use_uncertainty_language),
    c.confidence_statement,
  ].join('::');
}

function restrictionFingerprint(r: L13RestrictionDisclosure): string {
  return [
    r.restriction_disclosure_id,
    [...r.lower_layer_restriction_refs].sort().join(','),
    [...r.applied_restriction_codes].sort().join(','),
    [...r.blocked_answer_modes].sort().join(','),
    [...r.required_disclosures].sort().join(','),
    r.restriction_statement,
    String(r.may_include_directional_language),
    String(r.may_include_scenario_language),
    String(r.may_include_score_language),
  ].join('::');
}

function modelMetadataFingerprint(m: L13ModelMetadata): string {
  return fnv1a(
    [
      m.model_metadata_id,
      m.model_provider,
      m.model_name,
      m.model_version ?? '',
      m.prompt_template_id,
      m.prompt_template_version,
      m.input_package_hash,
      m.output_policy_version,
      String(m.temperature),
      String(m.max_output_tokens),
      m.generation_started_at,
      m.generation_completed_at,
      String(m.post_validation_passed),
      String(m.safety_gate_passed),
      String(m.grounding_gate_passed),
    ].join('|'),
  );
}

function blockedClaimsFingerprint(
  claims: readonly L13BlockedClaim[],
): string {
  return [...claims]
    .sort((a, b) =>
      a.blocked_claim_id.localeCompare(b.blocked_claim_id),
    )
    .map(c =>
      [
        c.blocked_claim_id,
        c.proposed_claim_text,
        c.blocked_claim_type,
        c.block_reason_code,
        c.source_validator,
        c.replacement_text ?? '',
      ].join('::'),
    )
    .join('||');
}

function computeReplayHash(
  i: Omit<L13AIOutputBuildInput, 'request_id'> & { request_id: string },
): string {
  return fnv1a(
    [
      'L13_AI_EXPLANATION_OUTPUT',
      POLICY_V,
      i.request_id,
      i.input_package_id,
      i.output_class,
      i.answer_mode,
      i.scope_type,
      i.scope_id,
      i.as_of,
      i.headline,
      i.summary,
      sectionFingerprint(i.observation_section),
      sectionFingerprint(i.inference_section),
      sectionFingerprint(i.uncertainty_section),
      sectionFingerprint(i.contradiction_section),
      sectionFingerprint(i.scenario_section),
      sectionFingerprint(i.trigger_invalidation_section),
      confidenceFingerprint(i.confidence_disclosure),
      restrictionFingerprint(i.restriction_disclosure),
      [...i.evidence_refs].sort().join(','),
      [...i.contradiction_refs].sort().join(','),
      [...i.scenario_refs].sort().join(','),
      [...i.score_refs].sort().join(','),
      [...i.hypothesis_refs].sort().join(','),
      blockedClaimsFingerprint(i.blocked_claims),
      i.output_readiness,
      modelMetadataFingerprint(i.model_metadata),
      [...i.lineage_refs].sort().join(','),
    ].join('|'),
  );
}

/**
 * §13.3 — Build a complete `L13AIExplanationOutput` from raw inputs.
 * The replay hash and output id are deterministic over the canonical
 * material.
 */
export function buildL13AIExplanationOutput(
  input: L13AIOutputBuildInput,
): L13AIExplanationOutput {
  const replayHash = computeReplayHash(input);
  return {
    output_id: `l13.output.${replayHash}`,
    request_id: input.request_id,
    input_package_id: input.input_package_id,
    output_class: input.output_class,
    answer_mode: input.answer_mode,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    as_of: input.as_of,
    headline: input.headline,
    summary: input.summary,
    observation_section: input.observation_section,
    inference_section: input.inference_section,
    uncertainty_section: input.uncertainty_section,
    contradiction_section: input.contradiction_section,
    scenario_section: input.scenario_section,
    trigger_invalidation_section: input.trigger_invalidation_section,
    confidence_disclosure: input.confidence_disclosure,
    restriction_disclosure: input.restriction_disclosure,
    evidence_refs: [...input.evidence_refs].sort(),
    contradiction_refs: [...input.contradiction_refs].sort(),
    scenario_refs: [...input.scenario_refs].sort(),
    score_refs: [...input.score_refs].sort(),
    hypothesis_refs: [...input.hypothesis_refs].sort(),
    blocked_claims: [...input.blocked_claims].sort((a, b) =>
      a.blocked_claim_id.localeCompare(b.blocked_claim_id),
    ),
    output_readiness: input.output_readiness,
    model_metadata: input.model_metadata,
    lineage_refs: [...input.lineage_refs].sort(),
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
