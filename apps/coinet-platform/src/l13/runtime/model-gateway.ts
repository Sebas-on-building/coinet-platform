/**
 * L13.6 — Model Gateway
 *
 * §13.6.13 / §13.6.16 — Provider-agnostic gateway. Builds the
 * `L13ModelGatewayRequest`, calls the provider, captures the
 * provider response, and returns a parsed `L13ModelDraftOutput`.
 *
 * §13.6.2.2 — Fresh provider calls are not assumed bitwise
 * deterministic; replay relies on the captured response artifact
 * (§13.6.2.3). The INTERNAL_MOCK provider is deterministic by
 * construction so the cert script can replay end-to-end without
 * an external network call.
 */

import type { L13PromptAssembly } from '../contracts/prompt-assembly';
import {
  L13ModelProvider,
  L13_DEFAULT_MAX_TEMPERATURE,
  L13_MAX_TEMPERATURE_BY_PURPOSE,
  type L13ModelGatewayRequest,
} from '../contracts/model-gateway-request';
import {
  L13DraftParseStatus,
  L13ProviderResponseStatus,
  type L13ModelGatewayResponse,
} from '../contracts/model-gateway-response';
import type { L13ModelDraftOutput } from '../contracts/model-draft-output';
import { L13AnswerMode } from '../contracts/explanation-restriction-profile';
import { L13AIOutputClass } from '../contracts/ai-output';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

export interface L13ModelGatewayCallInput {
  readonly request_id: string;
  readonly assembly: L13PromptAssembly;
  readonly model_provider: L13ModelProvider;
  readonly model_name: string;
  readonly model_version?: string;
  readonly answer_mode: L13AnswerMode;
  readonly output_class_hint: L13AIOutputClass;
  readonly max_output_tokens?: number;
  readonly temperature?: number;
  readonly deterministic_mode?: boolean;
  readonly provider_seed?: string;
  readonly purpose?: keyof typeof L13_MAX_TEMPERATURE_BY_PURPOSE;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
  /**
   * Provider implementation. Defaults to the deterministic
   * INTERNAL_MOCK provider; production callers inject a real
   * provider adapter.
   */
  readonly provider_call?: L13ProviderCall;
}

export interface L13ProviderCallContext {
  readonly request: L13ModelGatewayRequest;
  readonly assembly: L13PromptAssembly;
  readonly answer_mode: L13AnswerMode;
  readonly output_class_hint: L13AIOutputClass;
}

export interface L13ProviderCallOutput {
  readonly provider_response_id: string;
  readonly provider_status: L13ProviderResponseStatus;
  readonly raw_provider_response: string;
  readonly draft_payload: L13DraftPayload;
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly latency_ms?: number;
  readonly finish_reason?: string;
  readonly captured_at: string;
}

export type L13ProviderCall = (
  ctx: L13ProviderCallContext,
) => Promise<L13ProviderCallOutput> | L13ProviderCallOutput;

export interface L13DraftPayload {
  readonly headline: string;
  readonly summary: string;
  readonly observation: string;
  readonly inference: string;
  readonly uncertainty: string;
  readonly contradiction: string;
  readonly scenario: string;
  readonly trigger_invalidation: string;
  readonly refusal?: string;
}

export interface L13ModelGatewayCallResult {
  readonly request: L13ModelGatewayRequest;
  readonly response: L13ModelGatewayResponse;
  readonly draft: L13ModelDraftOutput;
}

/**
 * §13.6.16.1 — Resolve max temperature for the requested purpose.
 * Returns the per-purpose ceiling, or the global default when no
 * purpose is supplied.
 */
function l13MaxTemperatureForPurpose(
  purpose?: keyof typeof L13_MAX_TEMPERATURE_BY_PURPOSE,
): number {
  if (!purpose) return L13_DEFAULT_MAX_TEMPERATURE;
  return (
    L13_MAX_TEMPERATURE_BY_PURPOSE[purpose] ??
    L13_DEFAULT_MAX_TEMPERATURE
  );
}

/**
 * Build the L13ModelGatewayRequest. Pure function.
 */
function buildModelGatewayRequest(
  input: L13ModelGatewayCallInput,
): L13ModelGatewayRequest {
  const purpose = input.purpose ?? 'market_explanation';
  const maxTemp = l13MaxTemperatureForPurpose(purpose);
  const temperature =
    input.temperature !== undefined && input.temperature <= maxTemp
      ? input.temperature
      : Math.min(0.1, maxTemp);
  const replayHash = fnv1a(
    [
      input.request_id,
      input.assembly.prompt_assembly_id,
      input.assembly.input_package_id,
      input.model_provider,
      input.model_name,
      input.model_version ?? '',
      String(input.max_output_tokens ?? 600),
      temperature.toFixed(4),
      String(input.deterministic_mode ?? true),
      input.provider_seed ?? '',
      input.answer_mode,
      input.output_class_hint,
      POLICY_V,
    ].join('|'),
  );
  return {
    model_gateway_request_id: `l13.gateway.req.${replayHash}`,
    model_provider: input.model_provider,
    model_name: input.model_name,
    model_version: input.model_version,
    input_package_id: input.assembly.input_package_id,
    prompt_template_id: input.assembly.prompt_template_id,
    prompt_assembly_ref: input.assembly.prompt_assembly_id,
    system_policy_ref: 'l13.system.policy.v1',
    grounding_policy_ref: input.assembly.grounding_policy_ref,
    restriction_policy_ref: input.assembly.restriction_policy_ref,
    style_policy_ref: input.assembly.style_policy_ref,
    max_output_tokens: input.max_output_tokens ?? 600,
    temperature,
    deterministic_mode: input.deterministic_mode ?? true,
    provider_seed: input.provider_seed,
    expected_output_schema_ref: input.assembly.output_schema_ref,
    lineage_refs: input.lineage_refs ?? ['l13.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

/**
 * §13.6.14 — Default INTERNAL_MOCK provider. Fully deterministic;
 * generates a draft anchored on the prompt assembly so the
 * downstream pipeline has stable text to validate. No external IO.
 */
export function l13InternalMockProvider(
  ctx: L13ProviderCallContext,
): L13ProviderCallOutput {
  const fp = ctx.request.replay_hash;
  const isRefusalMode =
    ctx.answer_mode === L13AnswerMode.REFUSE_UNSUPPORTED;
  const draft: L13DraftPayload = isRefusalMode
    ? {
        headline:
          'This question asks for guidance the engine cannot legally provide.',
        summary:
          'The engine explains state and conditions but does not recommend trades, predictions, or certainties. Insufficient context for a stronger claim.',
        observation:
          'Engine reports the request asks for trade instruction or certainty outside the L13 explanation surface.',
        inference:
          'No supported observation is available because the request is out of scope; the engine preserves alternatives.',
        uncertainty:
          'The setup is not clean; the base case is confidence-capped and remains conditional.',
        contradiction:
          'No contradiction analysis applies because no answerable claim was attempted.',
        scenario:
          'The current path remains conditional and is not predictive.',
        trigger_invalidation:
          'Triggers remain unresolved; the answer would depend on confirmation that the engine has not produced.',
        refusal:
          'This output is limited by an active lower-layer restriction. Insufficient context to support a stronger claim.',
      }
    : {
        headline:
          'Continuation setup remains active under governed fragility.',
        summary:
          'The engine surfaces a leverage-driven continuation base case with rising fragility; the path is conditional on funding cool-off and spot follow-through. The setup is not clean and remains conditional.',
        observation:
          'Engine reports the active scenario base case is leverage-driven continuation with rising fragility.',
        inference:
          'That suggests the setup can extend, but the continuation path is not clean because fragility and invalidation pressure are active.',
        uncertainty:
          'Uncertainty is driven by narrow scenario spread; the base case is confidence-capped and the engine preserves alternatives.',
        contradiction:
          'A funding-rate contradiction tempers continuation strength; contradiction remains active and narrows the interpretation.',
        scenario:
          'Base case is continuation; bearish alternative requires spot weakness. The current path remains conditional.',
        trigger_invalidation:
          'Trigger: funding cool-off below threshold. Invalidation: spot break with low volume. Triggers remain unresolved.',
      };
  const raw = JSON.stringify(draft);
  return {
    provider_response_id: `l13.mock.resp.${fp}`,
    provider_status: L13ProviderResponseStatus.PROVIDER_OK,
    raw_provider_response: raw,
    draft_payload: draft,
    prompt_tokens: ctx.assembly.estimated_input_tokens,
    completion_tokens: Math.ceil(raw.length / 4),
    latency_ms: 1,
    finish_reason: 'stop',
    captured_at: '2026-05-15T00:00:00Z',
  };
}

function buildDraftFromPayload(
  request: L13ModelGatewayRequest,
  assembly: L13PromptAssembly,
  provider: L13ProviderCallOutput,
  request_id: string,
  output_class_hint: L13AIOutputClass,
  answer_mode_hint: L13AnswerMode,
  raw_response_ref: string,
  lineage_refs: readonly string[],
): L13ModelDraftOutput {
  const replayHash = fnv1a(
    [
      request_id,
      assembly.prompt_assembly_id,
      provider.provider_response_id,
      provider.provider_status,
      output_class_hint,
      answer_mode_hint,
      provider.draft_payload.headline,
      provider.draft_payload.summary,
      provider.draft_payload.observation,
      provider.draft_payload.inference,
      provider.draft_payload.uncertainty,
      provider.draft_payload.contradiction,
      provider.draft_payload.scenario,
      provider.draft_payload.trigger_invalidation,
      provider.draft_payload.refusal ?? '',
      provider.finish_reason ?? '',
      raw_response_ref,
      POLICY_V,
    ].join('|'),
  );
  return {
    model_draft_output_id: `l13.draft.${replayHash}`,
    request_id,
    prompt_assembly_id: assembly.prompt_assembly_id,
    output_class_hint,
    answer_mode_hint,
    headline_draft: provider.draft_payload.headline,
    summary_draft: provider.draft_payload.summary,
    observation_draft: provider.draft_payload.observation,
    inference_draft: provider.draft_payload.inference,
    uncertainty_draft: provider.draft_payload.uncertainty,
    contradiction_draft: provider.draft_payload.contradiction,
    scenario_draft: provider.draft_payload.scenario,
    trigger_invalidation_draft:
      provider.draft_payload.trigger_invalidation,
    refusal_draft: provider.draft_payload.refusal,
    provider_finish_reason: provider.finish_reason ?? '',
    raw_provider_response_ref: raw_response_ref,
    lineage_refs,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

function buildGatewayResponse(
  request: L13ModelGatewayRequest,
  provider: L13ProviderCallOutput,
  draft: L13ModelDraftOutput,
  raw_response_ref: string,
  lineage_refs: readonly string[],
  parseStatus: L13DraftParseStatus,
): L13ModelGatewayResponse {
  const replayHash = fnv1a(
    [
      request.model_gateway_request_id,
      provider.provider_response_id,
      provider.provider_status,
      draft.model_draft_output_id,
      parseStatus,
      String(provider.prompt_tokens ?? 0),
      String(provider.completion_tokens ?? 0),
      String(provider.latency_ms ?? 0),
      provider.finish_reason ?? '',
      raw_response_ref,
      POLICY_V,
    ].join('|'),
  );
  return {
    model_gateway_response_id: `l13.gateway.resp.${replayHash}`,
    model_gateway_request_id: request.model_gateway_request_id,
    provider_response_id: provider.provider_response_id,
    provider_status: provider.provider_status,
    raw_provider_response_ref: raw_response_ref,
    parsed_draft_output_ref: draft.model_draft_output_id,
    parse_status: parseStatus,
    prompt_tokens: provider.prompt_tokens,
    completion_tokens: provider.completion_tokens,
    total_tokens:
      (provider.prompt_tokens ?? 0) + (provider.completion_tokens ?? 0),
    latency_ms: provider.latency_ms,
    finish_reason: provider.finish_reason,
    captured_at: provider.captured_at,
    lineage_refs,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

/**
 * §13.6.13 — Call the model gateway. Returns the request, the
 * captured response, and the parsed draft. Synchronous in the
 * INTERNAL_MOCK case; production providers may return a Promise.
 */
export async function callL13ModelGateway(
  input: L13ModelGatewayCallInput,
): Promise<L13ModelGatewayCallResult> {
  const request = buildModelGatewayRequest(input);
  const provider =
    input.provider_call ?? l13InternalMockProvider;
  const result = await provider({
    request,
    assembly: input.assembly,
    answer_mode: input.answer_mode,
    output_class_hint: input.output_class_hint,
  });
  const raw_response_ref = `l13.raw.${result.provider_response_id}`;
  const draft = buildDraftFromPayload(
    request,
    input.assembly,
    result,
    input.request_id,
    input.output_class_hint,
    input.answer_mode,
    raw_response_ref,
    input.lineage_refs ?? ['l13.runtime.lineage'],
  );
  const response = buildGatewayResponse(
    request,
    result,
    draft,
    raw_response_ref,
    input.lineage_refs ?? ['l13.runtime.lineage'],
    L13DraftParseStatus.PARSED_OK,
  );
  return { request, response, draft };
}
