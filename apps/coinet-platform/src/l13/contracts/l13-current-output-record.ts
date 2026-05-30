/**
 * L13.10 — Current AI Output Authority Record
 *
 * §13.10.8 / §13.10.9 — Authoritative current state of an emitted
 * output. Supersession may replace this record, but historical
 * facts remain immutable (§13.10.9.1).
 */

export enum L13CurrentOutputAuthorityStatus {
  AUTHORITATIVE_CURRENT = 'AUTHORITATIVE_CURRENT',
  SUPERSEDED = 'SUPERSEDED',
  REVOKED = 'REVOKED',
  PENDING_MATERIALIZATION = 'PENDING_MATERIALIZATION',
}

export const ALL_L13_CURRENT_OUTPUT_AUTHORITY_STATUSES:
  readonly L13CurrentOutputAuthorityStatus[] =
  Object.values(L13CurrentOutputAuthorityStatus);

export enum L13AIOutputSupersessionReason {
  NEW_RUNTIME_RUN = 'NEW_RUNTIME_RUN',
  REPLAY_CONFIRMED_SUPERSESSION = 'REPLAY_CONFIRMED_SUPERSESSION',
  REPAIR_REEMISSION = 'REPAIR_REEMISSION',
  USER_REQUEST_REASKED = 'USER_REQUEST_REASKED',
  POLICY_VERSION_REEMISSION = 'POLICY_VERSION_REEMISSION',
  OUTPUT_REVOKED_FOR_SAFETY = 'OUTPUT_REVOKED_FOR_SAFETY',
}

export const ALL_L13_AI_OUTPUT_SUPERSESSION_REASONS:
  readonly L13AIOutputSupersessionReason[] =
  Object.values(L13AIOutputSupersessionReason);

export interface L13CurrentAIOutputRecord {
  readonly current_output_record_id: string;
  readonly output_id: string;
  readonly request_id: string;
  readonly runtime_run_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly product_answer_mode: string;
  readonly output_class: string;
  readonly final_emission_decision: string;
  readonly safety_decision: string;
  readonly style_readiness: string;
  readonly mode_readiness: string;
  readonly expression_readiness: string;
  readonly grounding_readiness: string;
  readonly user_emittable_payload_ref?: string;
  readonly final_gate_result_ref: string;
  readonly safety_gate_result_ref: string;
  readonly styled_response_ref: string;
  readonly output_mode_envelope_ref: string;
  readonly supersedes_output_ref?: string;
  readonly supersession_reason?: L13AIOutputSupersessionReason;
  readonly current_authority_status: L13CurrentOutputAuthorityStatus;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
