/**
 * P3-BTAR-002 — Judgment Truth Runner Types
 *
 * This is a Phase 3 judgment-truth-runner harness contract.
 * It does NOT perform semantic scoring (that is P3-BTAR-004).
 * It does NOT call any real provider, AI model, or active product pipeline.
 * The executor is injected so the harness is provably provider-free.
 *
 * Authority:
 *   - Plan 3.0 §1, §6, §9, §12
 *   - P3-BTAR-002 §9 (type contract)
 *
 * Owner: Phase 3 (P3-BTAR-002).
 */

import type {
  ExpectedConfidenceBand,
  ExpectedJudgmentOracle,
  ExpectedTimingPhase,
  SyntheticEpisodeInput,
  SyntheticEpisodeValidationResult,
} from './synthetic-episode.types';

// -----------------------------------------------------------------------------
// 1. Policy version
// -----------------------------------------------------------------------------

export type JudgmentTruthRunnerPolicyVersion = 'judgment-truth-runner.v1';

// -----------------------------------------------------------------------------
// 2. Runner status
// -----------------------------------------------------------------------------

export type JudgmentTruthRunnerStatus =
  | 'RUNNER_COMPLETED'
  | 'VALIDATION_FAILED'
  | 'EXECUTOR_FAILED';

// -----------------------------------------------------------------------------
// 3. Synthetic actual judgment (what the executor produces)
//
// Mirrors the 7-field ExpectedJudgmentOracle so a later P3-BTAR-004 can compare
// actual vs. expected without an additional adapter layer. The `thesis` field is
// added because oracles encode `expected_thesis_direction` (the direction) while
// an actual judgment can also include the full thesis sentence.
// -----------------------------------------------------------------------------

export interface SyntheticActualJudgment {
  state: string;
  cause_family: string;
  thesis_direction: string;
  thesis: string;
  contradictions: string[];
  timing_phase: ExpectedTimingPhase | string;
  scenario_type: string;
  confidence_band: ExpectedConfidenceBand | string;
  reasoning_notes: string[];
}

// -----------------------------------------------------------------------------
// 4. Executor metadata (type-pinned to forbid provider/AI executors)
//
// `uses_real_providers` and `uses_ai_model` are pinned to the literal `false` so
// any executor with a real-provider or AI-model dependency cannot satisfy the
// interface. `assertNoRealProviderExecutor` enforces this at runtime as a
// defensive double-check.
// -----------------------------------------------------------------------------

export interface SyntheticJudgmentExecutorMetadata {
  executor_id: string;
  executor_version: string;
  uses_real_providers: false;
  uses_ai_model: false;
  deterministic: boolean;
}

export interface SyntheticJudgmentExecutor {
  metadata: SyntheticJudgmentExecutorMetadata;
  execute(
    episode: SyntheticEpisodeInput,
  ): Promise<SyntheticActualJudgment> | SyntheticActualJudgment;
}

// -----------------------------------------------------------------------------
// 5. Runner result envelope
//
// Pinned literals:
//   - semantic_assertions_run: false (Plan-3.0-INV-01 — runner cannot claim
//     correctness scoring; that is P3-BTAR-004's responsibility)
//   - no_real_provider_calls: true (Plan-3.0-LAW-03)
// -----------------------------------------------------------------------------

export interface JudgmentTruthRunnerResult {
  policy_version: JudgmentTruthRunnerPolicyVersion;

  episode_id: string;
  title: string;

  runner_status: JudgmentTruthRunnerStatus;
  comparison_ready: boolean;
  semantic_assertions_run: false;

  validation: SyntheticEpisodeValidationResult;

  expected_oracle: ExpectedJudgmentOracle;
  actual_judgment?: SyntheticActualJudgment;

  executor_metadata?: SyntheticJudgmentExecutorMetadata;

  errors: string[];
  warnings: string[];

  no_real_provider_calls: true;
}
