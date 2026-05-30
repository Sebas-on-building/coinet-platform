/**
 * L13.6 — Runtime Refusal Envelope Contract
 *
 * §13.6.20 — Runtime refusal envelope. Carried into the final
 * output gate when the runtime cannot legally answer. The envelope
 * references a refusal output object that itself must satisfy the
 * L13.3 output contract.
 */

/**
 * §13.6.20.1 — Refusal reason codes. Disjoint from rewrite reason
 * codes; refusal is the terminal route when rewrite cannot
 * recover.
 */
export enum L13RuntimeRefusalReasonCode {
  OUT_OF_SCOPE_REQUEST = 'OUT_OF_SCOPE_REQUEST',
  PROHIBITED_TRADE_INSTRUCTION_REQUEST = 'PROHIBITED_TRADE_INSTRUCTION_REQUEST',
  UNSUPPORTED_CERTAINTY_REQUEST = 'UNSUPPORTED_CERTAINTY_REQUEST',
  BLOCKED_BY_RESTRICTION = 'BLOCKED_BY_RESTRICTION',
  GROUNDING_FAILED_AFTER_REWRITE = 'GROUNDING_FAILED_AFTER_REWRITE',
  EXPRESSION_GOVERNANCE_FAILED_AFTER_REWRITE = 'EXPRESSION_GOVERNANCE_FAILED_AFTER_REWRITE',
  INSUFFICIENT_CONTEXT = 'INSUFFICIENT_CONTEXT',
  UNRESOLVED_SCOPE = 'UNRESOLVED_SCOPE',
  REWRITE_ATTEMPTS_EXHAUSTED = 'REWRITE_ATTEMPTS_EXHAUSTED',
  PROVIDER_FAILURE_AFTER_RETRIES = 'PROVIDER_FAILURE_AFTER_RETRIES',
}

export const ALL_L13_RUNTIME_REFUSAL_REASON_CODES:
  readonly L13RuntimeRefusalReasonCode[] =
  Object.values(L13RuntimeRefusalReasonCode);

export interface L13RuntimeRefusalEnvelope {
  readonly refusal_envelope_id: string;
  readonly request_id: string;
  readonly input_package_id?: string;

  readonly refusal_reason_codes:
    readonly L13RuntimeRefusalReasonCode[];

  readonly refusal_output_ref: string;

  readonly lower_layer_restriction_refs: readonly string[];
  readonly runtime_violation_refs: readonly string[];

  readonly may_emit_refusal: boolean;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
