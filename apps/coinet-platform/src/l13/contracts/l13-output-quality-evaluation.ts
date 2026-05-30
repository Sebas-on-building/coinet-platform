/**
 * L13.10 — Output Quality Evaluation Record
 *
 * §13.10.25 / §13.10.26 — Per-output quality evaluation gathering
 * pass/fail signals from L13.4 (grounding), L13.5 (expression),
 * L13.7 (mode), L13.8 (style), L13.9 (safety).
 */

export enum L13OutputQualityStatus {
  QUALITY_CLEAN = 'QUALITY_CLEAN',
  QUALITY_CLEAN_WITH_DISCLOSURE = 'QUALITY_CLEAN_WITH_DISCLOSURE',
  QUALITY_REWRITE_OCCURRED = 'QUALITY_REWRITE_OCCURRED',
  QUALITY_REFUSAL_OCCURRED = 'QUALITY_REFUSAL_OCCURRED',
  QUALITY_BLOCKED_PRE_EMISSION = 'QUALITY_BLOCKED_PRE_EMISSION',
  QUALITY_REVIEW_FLAGGED = 'QUALITY_REVIEW_FLAGGED',
}

export const ALL_L13_OUTPUT_QUALITY_STATUSES:
  readonly L13OutputQualityStatus[] =
  Object.values(L13OutputQualityStatus);

export interface L13OutputQualityEvaluationRecord {
  readonly output_quality_evaluation_id: string;
  readonly output_id: string;
  readonly runtime_run_id: string;
  readonly groundedness_passed: boolean;
  readonly contradiction_disclosure_passed: boolean;
  readonly safety_gate_passed: boolean;
  readonly style_integrity_passed: boolean;
  readonly mode_completeness_passed: boolean;
  readonly unsupported_claim_attempt_count: number;
  readonly blocked_claim_count: number;
  readonly emitted_claim_count: number;
  readonly safety_rewrite_count: number;
  readonly refusal_emitted: boolean;
  readonly output_quality_status: L13OutputQualityStatus;
  readonly metric_seed_refs: readonly string[];
  readonly created_at: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
