/**
 * L13.6 — Output Postprocessor
 *
 * §13.6.17 — Converts a `L13ModelDraftOutput` into an
 * `L13AIExplanationOutput` (L13.3 object), then runs the L13.4
 * grounding pipeline and the L13.5 expression-governance
 * pipeline. The result feeds the rewrite/refusal/block decision
 * (§13.6.27).
 *
 * §13.6.17.2 — Style/length pass is non-semantic; semantic rewrite
 * is handled separately by the runtime orchestrator.
 *
 * No provider text emits directly: this stage is the only legal
 * path from a draft to a structured L13.3 output.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import {
  L13AIOutputClass,
  type L13AIExplanationOutput,
} from '../contracts/ai-output';
import { L13AnswerMode } from '../contracts/explanation-restriction-profile';
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
import { L13_ALWAYS_BLOCKED_ANSWER_MODES } from '../contracts/explanation-restriction-profile';
import type { L13ModelMetadata } from '../contracts/model-metadata';
import { L13OutputReadinessClass } from '../contracts/output-readiness';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import type { L13ModelDraftOutput } from '../contracts/model-draft-output';
import type { L13ModelGatewayRequest } from '../contracts/model-gateway-request';
import type { L13ModelGatewayResponse } from '../contracts/model-gateway-response';
import {
  extractL13Claims,
  matchL13EvidenceForClaims,
  matchL13ContradictionForClaims,
  runL13NoInventionGate,
  runL13ClaimGroundingEngine,
  buildL13CitationPack,
} from '../grounding';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13CitationPack } from '../contracts/citation-pack';
import type { L13NoInventionGateResult } from '../contracts/no-invention';
import { runL13ExpressionGovernance } from '../restrictions/expression-governance-engine';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

interface PostprocessorPolicyArtifacts {
  readonly request_id: string;
  readonly draft: L13ModelDraftOutput;
  readonly input_package: L13AIInputPackage;
  readonly model_gateway_request: L13ModelGatewayRequest;
  readonly model_gateway_response: L13ModelGatewayResponse;
  readonly output_class: L13AIOutputClass;
  readonly answer_mode: L13AnswerMode;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export interface L13PostprocessorResult {
  readonly output: L13AIExplanationOutput;
  readonly grounding: L13ClaimGroundingResult;
  readonly no_invention_gate: L13NoInventionGateResult;
  readonly citation_pack: L13CitationPack;
  readonly expression: L13ExpressionGovernanceResult;
}

function mkSection(
  id: string,
  cls: L13OutputSectionClass,
  content: string,
  refs: {
    claim?: readonly string[];
    evidence?: readonly string[];
    contradiction?: readonly string[];
  } = {},
): L13OutputSection {
  const present = content.trim().length > 0;
  return {
    section_id: id,
    section_class: cls,
    title: cls,
    content,
    claim_refs: refs.claim ?? [],
    evidence_refs: refs.evidence ?? [],
    contradiction_refs: refs.contradiction ?? [],
    required: cls !== L13OutputSectionClass.REFUSAL,
    present,
    section_readiness: present
      ? L13OutputSectionReadinessClass.SECTION_COMPLETE
      : L13OutputSectionReadinessClass.SECTION_OPTIONAL_ABSENT,
    may_contain_inference: cls === L13OutputSectionClass.INFERENCE,
    may_contain_observation: cls === L13OutputSectionClass.OBSERVATION,
    may_contain_uncertainty: cls === L13OutputSectionClass.UNCERTAINTY,
    may_contain_restriction: cls === L13OutputSectionClass.RESTRICTION,
    forbidden_semantic_hits: [],
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
  };
}

function buildConfidenceDisclosure(
  pkg: L13AIInputPackage,
  outputId: string,
): L13ConfidenceDisclosure {
  const band = pkg.confidence_breakdown.overall_explanation_confidence_band;
  const narrowingReasons = pkg.confidence_breakdown
    .confidence_narrowing_reasons as readonly string[];
  return {
    confidence_disclosure_id: `l13.conf.${outputId}`,
    explanation_confidence_band: band,
    confidence_basis_refs: pkg.confidence_breakdown.confidence_cap_refs,
    confidence_cap_refs: pkg.confidence_breakdown.confidence_cap_refs,
    confidence_narrowing_reasons: narrowingReasons,
    may_use_confident_language:
      band === L13ExplanationConfidenceBand.HIGH ||
      band === L13ExplanationConfidenceBand.VERY_HIGH,
    must_use_uncertainty_language:
      band !== L13ExplanationConfidenceBand.HIGH &&
      band !== L13ExplanationConfidenceBand.VERY_HIGH,
    forbidden_confidence_phrases: [...L13_FORBIDDEN_CONFIDENCE_PHRASES],
    confidence_statement: `Explanation confidence is ${band.toLowerCase()} based on governed lower-layer support.`,
    evidence_refs: pkg.confidence_breakdown.evidence_refs,
    lineage_refs: pkg.confidence_breakdown.lineage_refs,
    policy_version: POLICY_V,
  };
}

function buildRestrictionDisclosure(
  pkg: L13AIInputPackage,
  outputId: string,
): L13RestrictionDisclosure {
  const profile = pkg.restriction_profile;
  return {
    restriction_disclosure_id: `l13.restr.${outputId}`,
    lower_layer_restriction_refs:
      profile.lower_layer_restriction_refs,
    applied_restriction_codes: profile.required_disclosures,
    blocked_answer_modes: [...L13_ALWAYS_BLOCKED_ANSWER_MODES],
    required_disclosures: profile.required_disclosures,
    restriction_statement:
      'This output reflects governed lower-layer restrictions and is not a trade recommendation.',
    may_include_directional_language:
      profile.may_use_directional_language,
    may_include_scenario_language: profile.may_explain_scenario,
    may_include_score_language: profile.may_explain_score,
    must_avoid_recommendation_language: true,
    must_avoid_prediction_language: true,
    must_avoid_final_judgment_language: true,
    evidence_refs: profile.evidence_refs,
    lineage_refs: profile.lineage_refs,
    policy_version: POLICY_V,
  };
}

function buildModelMetadata(
  request: L13ModelGatewayRequest,
  response: L13ModelGatewayResponse,
  pkg: L13AIInputPackage,
  outputId: string,
): L13ModelMetadata {
  return {
    model_metadata_id: `l13.meta.${outputId}`,
    model_provider: request.model_provider,
    model_name: request.model_name,
    model_version: request.model_version,
    prompt_template_id: request.prompt_template_id,
    prompt_template_version: 'runtime',
    input_package_hash: pkg.replay_hash,
    output_policy_version: POLICY_V,
    temperature: request.temperature,
    max_output_tokens: request.max_output_tokens,
    generation_started_at: response.captured_at,
    generation_completed_at: response.captured_at,
    post_validation_passed: false, // set by downstream stages
    post_validation_issue_refs: [],
    safety_gate_passed: false,
    grounding_gate_passed: false,
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
  };
}

/**
 * §13.6.17.1 — Build the L13.3 output object from a draft.
 */
export function buildL13OutputFromDraft(
  draft: L13ModelDraftOutput,
  pkg: L13AIInputPackage,
  request: L13ModelGatewayRequest,
  response: L13ModelGatewayResponse,
  scope_type: string,
  scope_id: string,
  output_class: L13AIOutputClass,
  answer_mode: L13AnswerMode,
  request_id: string,
): L13AIExplanationOutput {
  const fp = fnv1a(
    [
      request_id,
      draft.model_draft_output_id,
      pkg.input_package_id,
      output_class,
      answer_mode,
      scope_type,
      scope_id,
      POLICY_V,
    ].join('|'),
  );
  const outputId = `l13.output.${fp}`;
  const confidenceDisclosure = buildConfidenceDisclosure(pkg, outputId);
  const restrictionDisclosure = buildRestrictionDisclosure(pkg, outputId);
  const modelMetadata = buildModelMetadata(request, response, pkg, outputId);

  const observationSection = mkSection(
    'sec.obs.1',
    L13OutputSectionClass.OBSERVATION,
    draft.observation_draft,
    { evidence: pkg.evidence_refs.slice(0, 3) },
  );
  const inferenceSection = mkSection(
    'sec.inf.1',
    L13OutputSectionClass.INFERENCE,
    draft.inference_draft,
    { evidence: pkg.evidence_refs.slice(0, 3) },
  );
  const uncertaintySection = mkSection(
    'sec.unc.1',
    L13OutputSectionClass.UNCERTAINTY,
    draft.uncertainty_draft,
  );
  const contradictionPresent =
    draft.contradiction_draft.trim().length > 0 &&
    pkg.uncertainty_profile.active_contradiction_present;
  const contradictionSection = mkSection(
    contradictionPresent ? 'sec.con.1' : 'sec.con.empty',
    L13OutputSectionClass.CONTRADICTION,
    contradictionPresent ? draft.contradiction_draft : '',
    {
      contradiction:
        pkg.contradiction_summary.active_contradiction_refs,
    },
  );
  const scenarioSection = mkSection(
    'sec.scn.1',
    L13OutputSectionClass.SCENARIO,
    draft.scenario_draft,
    {
      claim: ['l12.scenario.base.1'],
      evidence: pkg.evidence_refs.slice(0, 3),
    },
  );
  const triggerSection = mkSection(
    'sec.tri.1',
    L13OutputSectionClass.TRIGGER_INVALIDATION,
    draft.trigger_invalidation_draft,
    {
      claim: ['l12.trigger.1', 'l12.invalidation.1'],
      evidence: pkg.evidence_refs.slice(0, 3),
    },
  );

  // Replay hash captured AFTER all sections are formed.
  const replayHash = fnv1a(
    [
      outputId,
      draft.model_draft_output_id,
      draft.headline_draft,
      draft.summary_draft,
      observationSection.section_id,
      inferenceSection.section_id,
      uncertaintySection.section_id,
      contradictionSection.section_id,
      scenarioSection.section_id,
      triggerSection.section_id,
      confidenceDisclosure.confidence_disclosure_id,
      restrictionDisclosure.restriction_disclosure_id,
      modelMetadata.model_metadata_id,
      POLICY_V,
    ].join('|'),
  );

  return {
    output_id: outputId,
    request_id,
    input_package_id: pkg.input_package_id,
    output_class,
    answer_mode,
    scope_type,
    scope_id,
    as_of: response.captured_at,
    headline: draft.headline_draft,
    summary: draft.summary_draft,
    observation_section: observationSection,
    inference_section: inferenceSection,
    uncertainty_section: uncertaintySection,
    contradiction_section: contradictionSection,
    scenario_section: scenarioSection,
    trigger_invalidation_section: triggerSection,
    confidence_disclosure: confidenceDisclosure,
    restriction_disclosure: restrictionDisclosure,
    evidence_refs: pkg.evidence_refs,
    contradiction_refs:
      pkg.contradiction_summary.active_contradiction_refs,
    scenario_refs: ['l12.scenario.base.1'],
    score_refs: [],
    hypothesis_refs: [],
    blocked_claims: [],
    output_readiness: L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT,
    model_metadata: modelMetadata,
    lineage_refs: ['l13.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

/**
 * §13.6.17 — Run the full L13.4 + L13.5 enforcement pipeline on a
 * built L13.3 output.
 */
export function runL13PostprocessorPipeline(
  args: PostprocessorPolicyArtifacts,
): L13PostprocessorResult {
  const output = buildL13OutputFromDraft(
    args.draft,
    args.input_package,
    args.model_gateway_request,
    args.model_gateway_response,
    args.scope_type,
    args.scope_id,
    args.output_class,
    args.answer_mode,
    args.request_id,
  );

  // L13.4 grounding pipeline.
  const extraction = extractL13Claims(output);
  const evidenceMatches = matchL13EvidenceForClaims(
    extraction.extracted_claims,
    args.input_package,
  );
  const contradictionMatches = matchL13ContradictionForClaims(
    extraction.extracted_claims,
    args.input_package,
  );
  const noInventionGate = runL13NoInventionGate(
    output,
    args.input_package,
    extraction.extracted_claims,
  );
  const grounding = runL13ClaimGroundingEngine({
    output,
    input_package: args.input_package,
    extraction_result: extraction,
    evidence_matches: evidenceMatches,
    contradiction_matches: contradictionMatches,
    no_invention_gate: noInventionGate,
    policy_version: 'l13.grounding.v1',
  });
  const citationPack = buildL13CitationPack({
    output_id: output.output_id,
    input_package: args.input_package,
    emitted_claims: grounding.grounded_claims,
  });

  // L13.5 expression governance pipeline.
  const expression = runL13ExpressionGovernance({
    output,
    input_package: args.input_package,
    grounding_result: grounding,
    contradiction_matches: contradictionMatches,
    evidence_refs: args.evidence_refs,
    lineage_refs: args.lineage_refs,
  });

  return {
    output,
    grounding,
    no_invention_gate: noInventionGate,
    citation_pack: citationPack,
    expression,
  };
}

/**
 * §13.6.28 — Allowed style/length pass: non-semantic only.
 * Returns the same output object (no semantic mutation) plus a
 * boolean indicating whether style would have changed text. The
 * runtime treats `would_change_text=true` as a rewrite trigger.
 */
export function runL13StyleLengthPass(
  output: L13AIExplanationOutput,
  options: { readonly maxParagraphs?: number } = {},
): {
  readonly output: L13AIExplanationOutput;
  readonly would_change_text: boolean;
} {
  const maxParagraphs = options.maxParagraphs ?? 5;
  const paragraphs = output.summary.split(/\n\s*\n/);
  const wouldChange = paragraphs.length > maxParagraphs;
  return { output, would_change_text: wouldChange };
}
