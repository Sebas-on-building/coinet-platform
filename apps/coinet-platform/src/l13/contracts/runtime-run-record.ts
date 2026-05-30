/**
 * L13.6 — Runtime Run Record Contract
 *
 * §13.6.22 — Top-level record produced by the orchestrator. Carries
 * refs to every stage's output and the final emission decision.
 * The run record is the durable lineage anchor for replay
 * (§13.6.2.3).
 */

/**
 * §13.6.22.1 — Runtime modes.
 */
export enum L13RuntimeRunMode {
  LIVE_GENERATION = 'LIVE_GENERATION',
  SHADOW_EVALUATION = 'SHADOW_EVALUATION',
  REPLAY_FROM_CAPTURED_RESPONSE = 'REPLAY_FROM_CAPTURED_RESPONSE',
  REWRITE_RETRY = 'REWRITE_RETRY',
  REFUSAL_ROUTE = 'REFUSAL_ROUTE',
  TEST_FIXTURE = 'TEST_FIXTURE',
}

export const ALL_L13_RUNTIME_RUN_MODES:
  readonly L13RuntimeRunMode[] =
  Object.values(L13RuntimeRunMode);

/**
 * §13.6.22.2 — Runtime statuses.
 */
export enum L13RuntimeRunStatus {
  COMPLETED_EMITTED = 'COMPLETED_EMITTED',
  COMPLETED_EMITTED_WITH_DISCLOSURE = 'COMPLETED_EMITTED_WITH_DISCLOSURE',
  COMPLETED_REFUSAL = 'COMPLETED_REFUSAL',
  BLOCKED_PRE_MODEL = 'BLOCKED_PRE_MODEL',
  BLOCKED_POST_MODEL = 'BLOCKED_POST_MODEL',
  BLOCKED_AFTER_REWRITE_EXHAUSTION = 'BLOCKED_AFTER_REWRITE_EXHAUSTION',
  FAILED_PROVIDER_CALL = 'FAILED_PROVIDER_CALL',
  FAILED_DRAFT_PARSE = 'FAILED_DRAFT_PARSE',
}

export const ALL_L13_RUNTIME_RUN_STATUSES:
  readonly L13RuntimeRunStatus[] =
  Object.values(L13RuntimeRunStatus);

export function isL13TerminalRunStatus(
  status: L13RuntimeRunStatus,
): boolean {
  return true; // every status above is terminal in the run state machine
}

export function isL13EmissionRunStatus(
  status: L13RuntimeRunStatus,
): boolean {
  return (
    status === L13RuntimeRunStatus.COMPLETED_EMITTED ||
    status === L13RuntimeRunStatus.COMPLETED_EMITTED_WITH_DISCLOSURE ||
    status === L13RuntimeRunStatus.COMPLETED_REFUSAL
  );
}

export interface L13RuntimeRunRecord {
  readonly runtime_run_id: string;
  readonly request_id: string;

  readonly run_mode: L13RuntimeRunMode;
  readonly run_status: L13RuntimeRunStatus;

  readonly intent_classification_ref?: string;
  readonly scope_resolution_ref?: string;
  readonly read_plan_ref?: string;
  readonly input_package_ref?: string;
  readonly prompt_template_ref?: string;
  readonly prompt_assembly_ref?: string;
  readonly model_gateway_request_ref?: string;
  readonly model_gateway_response_ref?: string;
  readonly model_draft_output_ref?: string;
  readonly ai_output_ref?: string;
  readonly grounding_result_ref?: string;
  readonly grounded_output_envelope_ref?: string;
  readonly expression_governance_envelope_ref?: string;
  readonly rewrite_request_refs: readonly string[];
  readonly refusal_envelope_ref?: string;
  readonly final_gate_result_ref?: string;

  readonly generation_attempt_count: number;
  readonly rewrite_attempt_count: number;
  readonly critical_violation_refs: readonly string[];

  readonly started_at: string;
  readonly completed_at?: string;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
