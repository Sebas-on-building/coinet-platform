/**
 * L13.6 — Rewrite Request Contract
 *
 * §13.6.18 — Governed rewrite request emitted by the post-
 * processor when grounding/expression governance/structure
 * verification fails on a draft and the failure is repairable
 * within attempt budget (§13.6.19).
 */

/**
 * §13.6.18.1 — Rewrite reason codes.
 */
export enum L13RewriteReasonCode {
  UNSUPPORTED_CLAIM = 'UNSUPPORTED_CLAIM',
  CONTRADICTED_CLAIM = 'CONTRADICTED_CLAIM',
  DISCLOSURE_MISSING = 'DISCLOSURE_MISSING',
  CONFIDENCE_OUTRUN = 'CONFIDENCE_OUTRUN',
  RESTRICTION_BYPASS = 'RESTRICTION_BYPASS',
  SCENARIO_AS_CERTAINTY = 'SCENARIO_AS_CERTAINTY',
  SCORE_AS_ADVICE = 'SCORE_AS_ADVICE',
  STRUCTURE_INCOMPLETE = 'STRUCTURE_INCOMPLETE',
}

export const ALL_L13_REWRITE_REASON_CODES:
  readonly L13RewriteReasonCode[] =
  Object.values(L13RewriteReasonCode);

/**
 * §13.6.17.2 — Rewrite scope class. Tells the rewrite prompt
 * builder how aggressively the model may rewrite.
 */
export enum L13RewriteScopeClass {
  /** Single-claim rewrite — minimal change. */
  CLAIM_ONLY = 'CLAIM_ONLY',
  /** Section rewrite — affected section only. */
  SECTION_ONLY = 'SECTION_ONLY',
  /** Output-wide rewrite — all sections eligible. */
  FULL_OUTPUT = 'FULL_OUTPUT',
}

export const ALL_L13_REWRITE_SCOPE_CLASSES:
  readonly L13RewriteScopeClass[] =
  Object.values(L13RewriteScopeClass);

export interface L13RewriteRequest {
  readonly rewrite_request_id: string;

  readonly parent_generation_attempt_id: string;
  readonly original_output_ref: string;

  readonly rewrite_reason_codes: readonly L13RewriteReasonCode[];
  readonly blocked_claim_refs: readonly string[];
  readonly missing_disclosure_refs: readonly string[];
  readonly confidence_outrun_refs: readonly string[];
  readonly restriction_violation_refs: readonly string[];

  readonly permitted_rewrite_scope: L13RewriteScopeClass;
  readonly rewrite_prompt_template_ref: string;

  readonly maximum_additional_attempts: number;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.6.19 — Maximum total generation attempts (initial + rewrite
 * retries). Enforced by the runtime orchestrator.
 */
export const L13_MAX_GENERATION_ATTEMPTS: number = 3;
export const L13_MAX_REWRITE_ATTEMPTS: number = 2;
