/**
 * L13.6 — Model Gateway Response Contract
 *
 * §13.6.15 — Captured provider response. The runtime treats this
 * artifact as the source of truth for replay; fresh provider calls
 * are not assumed bitwise-deterministic (§13.6.2.2).
 */

/**
 * §13.6.15 — Provider response status taxonomy.
 */
export enum L13ProviderResponseStatus {
  PROVIDER_OK = 'PROVIDER_OK',
  PROVIDER_PARTIAL = 'PROVIDER_PARTIAL',
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',
  PROVIDER_REFUSED = 'PROVIDER_REFUSED',
}

export const ALL_L13_PROVIDER_RESPONSE_STATUSES:
  readonly L13ProviderResponseStatus[] =
  Object.values(L13ProviderResponseStatus);

/**
 * §13.6.15 — Draft parse status taxonomy.
 */
export enum L13DraftParseStatus {
  PARSED_OK = 'PARSED_OK',
  PARSED_WITH_REPAIRS = 'PARSED_WITH_REPAIRS',
  PARSE_FAILED = 'PARSE_FAILED',
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
  EMPTY_RESPONSE = 'EMPTY_RESPONSE',
}

export const ALL_L13_DRAFT_PARSE_STATUSES:
  readonly L13DraftParseStatus[] =
  Object.values(L13DraftParseStatus);

export interface L13ModelGatewayResponse {
  readonly model_gateway_response_id: string;
  readonly model_gateway_request_id: string;

  readonly provider_response_id: string;
  readonly provider_status: L13ProviderResponseStatus;
  readonly raw_provider_response_ref: string;

  readonly parsed_draft_output_ref?: string;
  readonly parse_status: L13DraftParseStatus;

  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly total_tokens?: number;
  readonly latency_ms?: number;
  readonly finish_reason?: string;

  readonly captured_at: string;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

export function isL13ProviderFailure(
  status: L13ProviderResponseStatus,
): boolean {
  return (
    status === L13ProviderResponseStatus.PROVIDER_ERROR ||
    status === L13ProviderResponseStatus.PROVIDER_TIMEOUT ||
    status === L13ProviderResponseStatus.PROVIDER_REFUSED
  );
}
