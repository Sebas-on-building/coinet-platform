/**
 * P3-BTAR-005 — Full Truth Suite Execution and Report Types
 *
 * Type contract for the Phase 3 truth-suite execution layer. Binds
 * P3-BTAR-001 (synthetic episode contract) + P3-BTAR-002 (judgment truth
 * runner) + P3-BTAR-003 (18-episode corpus) + P3-BTAR-004 (semantic
 * assertion engine) into a single end-to-end result envelope.
 *
 * This module is pure types. It does NOT call any real provider, AI
 * model, or active product pipeline. The aggregate envelope pins:
 *   - semantic_assertions_run: true   (the engine IS the scoring step)
 *   - no_real_provider_calls: true    (Plan-3.0-LAW-03)
 *
 * Authority:
 *   - Plan 3.0 §1, §3, §6, §9 (BTAR sequence — fifth entry), §11, §12,
 *     §14 (done definition: "truth-suite report exists")
 *   - P3-BTAR-005 §8 (type contract), §10 (execution flow)
 *
 * Owner: Phase 3 (P3-BTAR-005).
 */

import type { SyntheticEpisodeInput } from './synthetic-episode.types';
import type { JudgmentTruthRunnerResult } from './judgment-truth-runner.types';
import type {
  JudgmentSemanticAssertionResult,
  SemanticAssertionCheckId,
  SemanticAssertionOutcome,
} from './semantic-assertions.types';

// -----------------------------------------------------------------------------
// 1. Policy version
// -----------------------------------------------------------------------------

export type JudgmentTruthSuiteExecutionPolicyVersion =
  | 'judgment-truth-suite-execution.v1';

// -----------------------------------------------------------------------------
// 2. Execution mode + report claim level
//
// HARNESS_CERTIFICATION is the default and proves the truth-suite machinery
// runs end-to-end against the 18-episode corpus. It does NOT prove that
// Coinet's active production judgment engine has been semantically scored.
// ACTIVE_SYNTHETIC_ADAPTER is reserved for a future BTAR that safely
// connects the active judgment logic under controlled no-provider
// conditions; it MUST NOT be claimed in P3-BTAR-005 unless an actively
// safe adapter is present.
// -----------------------------------------------------------------------------

export type JudgmentTruthSuiteExecutionMode =
  | 'HARNESS_CERTIFICATION'
  | 'ACTIVE_SYNTHETIC_ADAPTER';

export type JudgmentTruthSuiteReportClaimLevel =
  | 'HARNESS_ONLY'
  | 'ACTIVE_SYNTHETIC_JUDGMENT_EVALUATED';

// -----------------------------------------------------------------------------
// 3. Outcome counts
// -----------------------------------------------------------------------------

export interface JudgmentTruthSuiteOutcomeCounts {
  PASS: number;
  WARNING: number;
  FAIL: number;
  CRITICAL_FAIL: number;
}

// -----------------------------------------------------------------------------
// 4. Per-check summary (counts grouped by semantic check_id)
// -----------------------------------------------------------------------------

export interface JudgmentTruthSuiteCheckSummary {
  check_id: SemanticAssertionCheckId;
  pass_count: number;
  warning_count: number;
  fail_count: number;
  critical_fail_count: number;
}

// -----------------------------------------------------------------------------
// 5. Per-episode result envelope
//
// Per Plan 3.0 §11 / P3-BTAR-005 §15 Class A — every corpus episode is
// retained in the suite result so individual failures cannot be hidden by
// aggregation alone.
// -----------------------------------------------------------------------------

export interface JudgmentTruthSuiteEpisodeResult {
  episode_id: string;
  title: string;
  family_tags: string[];
  runner_result: JudgmentTruthRunnerResult;
  semantic_result: JudgmentSemanticAssertionResult;
}

// -----------------------------------------------------------------------------
// 6. Aggregate suite result
//
// Pinned literals:
//   - semantic_assertions_run: true   (Plan-3.0-INV-01 — the engine IS the
//     scoring step; this envelope cannot pretend the suite skipped scoring)
//   - no_real_provider_calls: true    (Plan-3.0-LAW-03)
//
// `active_judgment_engine_connected` is the honesty flag the report renders
// directly into its claim section. It is `false` whenever `execution_mode`
// is `HARNESS_CERTIFICATION`; only an actively-proven synthetic adapter can
// set it to `true`.
// -----------------------------------------------------------------------------

export interface JudgmentTruthSuiteRunResult {
  policy_version: JudgmentTruthSuiteExecutionPolicyVersion;

  execution_mode: JudgmentTruthSuiteExecutionMode;
  report_claim_level: JudgmentTruthSuiteReportClaimLevel;
  active_judgment_engine_connected: boolean;

  corpus_size: number;
  episode_results: JudgmentTruthSuiteEpisodeResult[];

  outcome_counts: JudgmentTruthSuiteOutcomeCounts;
  average_score: number;
  minimum_score: number;
  maximum_score: number;

  check_summary: JudgmentTruthSuiteCheckSummary[];

  passed_episode_ids: string[];
  warning_episode_ids: string[];
  failed_episode_ids: string[];
  critical_episode_ids: string[];

  semantic_assertions_run: true;
  no_real_provider_calls: true;

  warnings: string[];
  findings_recommended: string[];
}

// -----------------------------------------------------------------------------
// 7. Execution input
//
// The execution module receives the corpus and an execution mode. It
// internally constructs the deterministic harness executor when
// `execution_mode === 'HARNESS_CERTIFICATION'`. For
// `ACTIVE_SYNTHETIC_ADAPTER` mode the caller MUST supply an active
// synthetic executor; this BTAR does NOT ship one.
// -----------------------------------------------------------------------------

import type { SyntheticJudgmentExecutor } from './judgment-truth-runner.types';

export interface RunJudgmentTruthSuiteInput {
  episodes: ReadonlyArray<SyntheticEpisodeInput>;
  execution_mode: JudgmentTruthSuiteExecutionMode;
  // Required only when execution_mode === 'ACTIVE_SYNTHETIC_ADAPTER'.
  // Ignored (and a warning is recorded) when execution_mode ===
  // 'HARNESS_CERTIFICATION' to keep the harness path provably independent.
  active_executor?: SyntheticJudgmentExecutor;
}

// -----------------------------------------------------------------------------
// 8. Re-exports for renderer consumers (no value imports here)
// -----------------------------------------------------------------------------

export type {
  SemanticAssertionCheckId,
  SemanticAssertionOutcome,
};
