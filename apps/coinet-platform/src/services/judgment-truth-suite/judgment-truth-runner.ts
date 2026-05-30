/**
 * P3-BTAR-002 — Judgment Truth Runner
 *
 * This is a Phase 3 judgment-truth-runner harness.
 * It does NOT perform semantic scoring (that is P3-BTAR-004).
 * It does NOT call any real provider, AI model, or active product pipeline.
 * The executor is injected so the harness is provably provider-free.
 *
 * Authority:
 *   - Plan 3.0 §1, §6, §9, §12
 *   - P3-BTAR-002 §7 (core design decision: executor-based runner)
 *   - P3-BTAR-002 §8 (core runner flow)
 *   - P3-BTAR-002 §10 (runner implementation)
 *
 * Owner: Phase 3 (P3-BTAR-002).
 */

import type { SyntheticEpisodeInput } from './synthetic-episode.types';
import { validateSyntheticEpisode } from './synthetic-episode-validation';
import type {
  JudgmentTruthRunnerPolicyVersion,
  JudgmentTruthRunnerResult,
  SyntheticActualJudgment,
  SyntheticJudgmentExecutor,
} from './judgment-truth-runner.types';

const POLICY_VERSION: JudgmentTruthRunnerPolicyVersion = 'judgment-truth-runner.v1';

// -----------------------------------------------------------------------------
// assertNoRealProviderExecutor — runtime defensive guard.
//
// The type-level pin (`uses_real_providers: false`, `uses_ai_model: false`)
// already prevents most violations at compile time. This guard catches
// runtime tampering / cast-through-any / dynamically loaded executors.
// -----------------------------------------------------------------------------

export function assertNoRealProviderExecutor(
  executor: SyntheticJudgmentExecutor,
): void {
  if (!executor || typeof executor !== 'object') {
    throw new Error('assertNoRealProviderExecutor: executor is missing or not an object');
  }
  if (!executor.metadata || typeof executor.metadata !== 'object') {
    throw new Error('assertNoRealProviderExecutor: executor.metadata is missing');
  }
  // Read through `unknown` so a runtime tamper (e.g. `as any`) does not bypass
  // the literal-`false` type pin.
  const meta = executor.metadata as unknown as Record<string, unknown>;
  if (meta.uses_real_providers !== false) {
    throw new Error(
      `assertNoRealProviderExecutor: executor "${executor.metadata.executor_id ?? '<unknown>'}" declares uses_real_providers=${String(
        meta.uses_real_providers,
      )}; Phase 3 requires uses_real_providers=false`,
    );
  }
  if (meta.uses_ai_model !== false) {
    throw new Error(
      `assertNoRealProviderExecutor: executor "${executor.metadata.executor_id ?? '<unknown>'}" declares uses_ai_model=${String(
        meta.uses_ai_model,
      )}; Phase 3 requires uses_ai_model=false`,
    );
  }
}

// -----------------------------------------------------------------------------
// runJudgmentTruthEpisode — single-episode entry point.
//
// Flow:
//   1. validate episode
//   2. if invalid -> VALIDATION_FAILED, executor NOT called
//   3. if valid   -> assertNoRealProviderExecutor + invoke executor
//   4. executor success -> RUNNER_COMPLETED
//   5. executor failure -> EXECUTOR_FAILED
//   6. always attach expected_oracle
//   7. always pin semantic_assertions_run=false and no_real_provider_calls=true
// -----------------------------------------------------------------------------

export async function runJudgmentTruthEpisode(
  episode: SyntheticEpisodeInput,
  executor: SyntheticJudgmentExecutor,
): Promise<JudgmentTruthRunnerResult> {
  const validation = validateSyntheticEpisode(episode);

  const base = (
    extras: {
      runner_status: JudgmentTruthRunnerResult['runner_status'];
      comparison_ready: boolean;
      actual_judgment?: SyntheticActualJudgment;
      executor_metadata?: SyntheticJudgmentExecutor['metadata'];
      errors: string[];
      warnings: string[];
    },
  ): JudgmentTruthRunnerResult => ({
    policy_version: POLICY_VERSION,
    episode_id: episode?.episode_id ?? '',
    title: episode?.title ?? '',
    runner_status: extras.runner_status,
    comparison_ready: extras.comparison_ready,
    semantic_assertions_run: false,
    validation,
    expected_oracle: episode?.expected_oracle,
    actual_judgment: extras.actual_judgment,
    executor_metadata: extras.executor_metadata,
    errors: extras.errors,
    warnings: extras.warnings,
    no_real_provider_calls: true,
  });

  if (!validation.valid) {
    return base({
      runner_status: 'VALIDATION_FAILED',
      comparison_ready: false,
      errors: [...validation.errors],
      warnings: [...validation.warnings],
    });
  }

  // Provider-guard runs AFTER validation passes; if validation fails the
  // executor is never inspected, satisfying spec §11 (executor not called
  // for invalid episodes).
  try {
    assertNoRealProviderExecutor(executor);
  } catch (guardErr) {
    const message = guardErr instanceof Error ? guardErr.message : String(guardErr);
    return base({
      runner_status: 'EXECUTOR_FAILED',
      comparison_ready: false,
      executor_metadata: executor?.metadata,
      errors: [message],
      warnings: [...validation.warnings],
    });
  }

  try {
    const actual = await executor.execute(episode);
    return base({
      runner_status: 'RUNNER_COMPLETED',
      comparison_ready: true,
      actual_judgment: actual,
      executor_metadata: executor.metadata,
      errors: [],
      warnings: [...validation.warnings],
    });
  } catch (execErr) {
    const message = execErr instanceof Error ? execErr.message : String(execErr);
    return base({
      runner_status: 'EXECUTOR_FAILED',
      comparison_ready: false,
      executor_metadata: executor.metadata,
      errors: [`executor.execute threw: ${message}`],
      warnings: [...validation.warnings],
    });
  }
}

// -----------------------------------------------------------------------------
// runJudgmentTruthCorpus — corpus entry point.
//
// Preserves input order. Does NOT mutate input. Does NOT short-circuit on
// per-episode failure (per spec §10 corpus behavior).
// -----------------------------------------------------------------------------

export async function runJudgmentTruthCorpus(
  episodes: SyntheticEpisodeInput[],
  executor: SyntheticJudgmentExecutor,
): Promise<JudgmentTruthRunnerResult[]> {
  const results: JudgmentTruthRunnerResult[] = [];
  for (const ep of episodes) {
    // Sequential, deterministic order. Each call is independent.
    // eslint-disable-next-line no-await-in-loop
    const r = await runJudgmentTruthEpisode(ep, executor);
    results.push(r);
  }
  return results;
}
