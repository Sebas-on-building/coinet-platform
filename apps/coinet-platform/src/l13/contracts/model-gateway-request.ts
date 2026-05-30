/**
 * L13.6 — Model Gateway Request Contract
 *
 * §13.6.13 / §13.6.14 — Provider-agnostic gateway request. The
 * gateway requires an L13.2 input package id, a registered prompt
 * template, a prompt assembly ref, and the four policy refs
 * (system / grounding / restriction / style). Temperature must be
 * within the per-answer-mode bounds enforced by the validator
 * (§13.6.16.1).
 */

/**
 * §13.6.14 — Provider taxonomy. INTERNAL_MOCK is reserved for
 * cert/test deterministic replay; production defaults to XAI.
 */
export enum L13ModelProvider {
  XAI = 'XAI',
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
  INTERNAL_MOCK = 'INTERNAL_MOCK',
}

export const ALL_L13_MODEL_PROVIDERS: readonly L13ModelProvider[] =
  Object.values(L13ModelProvider);

export interface L13ModelGatewayRequest {
  readonly model_gateway_request_id: string;

  readonly model_provider: L13ModelProvider;
  readonly model_name: string;
  readonly model_version?: string;

  readonly input_package_id: string;
  readonly prompt_template_id: string;
  readonly prompt_assembly_ref: string;

  readonly system_policy_ref: string;
  readonly grounding_policy_ref: string;
  readonly restriction_policy_ref: string;
  readonly style_policy_ref: string;

  readonly max_output_tokens: number;
  readonly temperature: number;
  readonly deterministic_mode: boolean;
  readonly provider_seed?: string;

  readonly expected_output_schema_ref: string;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

/**
 * §13.6.16.1 — Maximum permitted temperature per coarse output
 * purpose. The validator references this map.
 */
export const L13_MAX_TEMPERATURE_BY_PURPOSE: Readonly<
  Record<string, number>
> = {
  market_explanation: 0.2,
  score_explanation: 0.15,
  scenario_explanation: 0.15,
  alert_text: 0.15,
  structured_report: 0.25,
  refusal: 0.0,
};

/**
 * §13.6.16.1 — Default temperature ceiling when no purpose is
 * supplied.
 */
export const L13_DEFAULT_MAX_TEMPERATURE: number = 0.25;
