/**
 * P3-BTAR-004 — Semantic Assertion Engine Types
 *
 * Deterministic judge contract: compares a `SyntheticActualJudgment` to an
 * `ExpectedJudgmentOracle` and returns a PASS / WARNING / FAIL / CRITICAL_FAIL
 * verdict across 10 semantic checks + 1 readiness check.
 *
 * This is a Phase 3 semantic-assertion contract.
 * It does NOT use AI, real APIs, provider calls, or live data.
 * It does NOT score active engine output — the runner result envelope is the
 * input boundary.
 *
 * Authority:
 *   - Plan 3.0 §1, §3, §6, §9, §11, §12
 *   - P3-BTAR-004 §5 (required checks), §6 (outcome + score discipline)
 *
 * Owner: Phase 3 (P3-BTAR-004).
 */

import type { ExpectedJudgmentOracle } from './synthetic-episode.types';
import type {
  JudgmentTruthRunnerResult,
  SyntheticActualJudgment,
} from './judgment-truth-runner.types';

// -----------------------------------------------------------------------------
// 1. Policy version
// -----------------------------------------------------------------------------

export type SemanticAssertionsPolicyVersion = 'semantic-assertions.v1';

// -----------------------------------------------------------------------------
// 2. Outcome enum
// -----------------------------------------------------------------------------

export type SemanticAssertionOutcome =
  | 'PASS'
  | 'WARNING'
  | 'FAIL'
  | 'CRITICAL_FAIL';

// -----------------------------------------------------------------------------
// 3. Check IDs (10 semantic + 1 readiness)
// -----------------------------------------------------------------------------

export type SemanticAssertionCheckId =
  | 'STATE_ALIGNMENT'
  | 'CAUSE_FAMILY_ALIGNMENT'
  | 'THESIS_DIRECTION_ALIGNMENT'
  | 'REQUIRED_CONTRADICTION_COVERAGE'
  | 'TIMING_PHASE_ALIGNMENT'
  | 'SCENARIO_TYPE_ALIGNMENT'
  | 'CONFIDENCE_BAND_CALIBRATION'
  | 'FORBIDDEN_CLAIM_ABSENCE'
  | 'REQUIRED_REASONING_NOTE_COVERAGE'
  | 'DEGRADED_EVIDENCE_RESPECT'
  | 'RUNNER_RESULT_READINESS';

// -----------------------------------------------------------------------------
// 4. Per-check result
// -----------------------------------------------------------------------------

export interface SemanticAssertionCheckResult {
  check_id: SemanticAssertionCheckId;
  outcome: SemanticAssertionOutcome;
  score_delta: number;
  expected: string | string[];
  actual: string | string[];
  message: string;
}

// -----------------------------------------------------------------------------
// 5. Aggregate result
//
// Pinned literals:
//   - semantic_assertions_run: true   (this engine IS the semantic scoring step)
//   - no_real_provider_calls: true    (Plan-3.0-LAW-03)
// -----------------------------------------------------------------------------

export interface JudgmentSemanticAssertionResult {
  policy_version: SemanticAssertionsPolicyVersion;

  episode_id: string;
  title: string;

  overall_outcome: SemanticAssertionOutcome;
  score: number;

  semantic_assertions_run: true;

  check_results: SemanticAssertionCheckResult[];

  failures: string[];
  warnings: string[];
  critical_failures: string[];

  expected_oracle: ExpectedJudgmentOracle;
  actual_judgment?: SyntheticActualJudgment;

  no_real_provider_calls: true;
}

// -----------------------------------------------------------------------------
// 6. Engine input
// -----------------------------------------------------------------------------

export interface RunSemanticAssertionsInput {
  runner_result: JudgmentTruthRunnerResult;
}
