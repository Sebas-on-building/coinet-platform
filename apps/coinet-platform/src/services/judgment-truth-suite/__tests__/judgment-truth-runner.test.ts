/**
 * P3-BTAR-002 — Judgment Truth Runner Tests
 *
 * This is a Phase 3 judgment-truth-runner harness test suite.
 * It does NOT perform semantic scoring (that is P3-BTAR-004).
 * It does NOT call any real provider, AI model, or active product pipeline.
 *
 * Discipline:
 *   - 0 module mocks (no vi.mock).
 *   - 0 provider imports.
 *   - 0 import of chat/service.ts, services/judgment/*, services/ai-service.ts.
 *   - 0 import of src/l13/ or src/l14/.
 *   - Deterministic in-test executor only.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  STARTER_SYNTHETIC_EPISODE_CORPUS,
  SYN_001_CLEAN_ACCUMULATION,
} from '../synthetic-episode-fixtures';
import type { SyntheticEpisodeInput } from '../synthetic-episode.types';
import {
  assertNoRealProviderExecutor,
  runJudgmentTruthCorpus,
  runJudgmentTruthEpisode,
} from '../judgment-truth-runner';
import type {
  SyntheticActualJudgment,
  SyntheticJudgmentExecutor,
  SyntheticJudgmentExecutorMetadata,
} from '../judgment-truth-runner.types';

// -----------------------------------------------------------------------------
// Deterministic in-test executors
// -----------------------------------------------------------------------------

const ORACLE_ECHO_METADATA: SyntheticJudgmentExecutorMetadata = {
  executor_id: 'test-oracle-echo-executor',
  executor_version: 'v1',
  uses_real_providers: false,
  uses_ai_model: false,
  deterministic: true,
};

const oracleEchoExecutor: SyntheticJudgmentExecutor = {
  metadata: ORACLE_ECHO_METADATA,
  execute: (episode): SyntheticActualJudgment => ({
    state: episode.expected_oracle.expected_state,
    cause_family: episode.expected_oracle.expected_cause_family,
    thesis_direction: episode.expected_oracle.expected_thesis_direction,
    thesis: `Synthetic thesis for ${episode.episode_id}`,
    contradictions: [...episode.expected_oracle.required_contradictions],
    timing_phase: episode.expected_oracle.expected_timing_phase,
    scenario_type: episode.expected_oracle.expected_scenario_type,
    confidence_band: episode.expected_oracle.expected_confidence_band,
    reasoning_notes: [...episode.expected_oracle.required_reasoning_notes],
  }),
};

const throwingExecutor: SyntheticJudgmentExecutor = {
  metadata: {
    ...ORACLE_ECHO_METADATA,
    executor_id: 'test-throwing-executor',
  },
  execute: (_episode) => {
    throw new Error('intentional executor failure for D-class test');
  },
};

function cloneEpisode(ep: SyntheticEpisodeInput): SyntheticEpisodeInput {
  return JSON.parse(JSON.stringify(ep)) as SyntheticEpisodeInput;
}

// -----------------------------------------------------------------------------
// Class A — Single episode execution
// -----------------------------------------------------------------------------

describe('runJudgmentTruthEpisode — single episode execution', () => {
  it('A1: runs a valid starter episode and returns RUNNER_COMPLETED', async () => {
    const result = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, oracleEchoExecutor);
    expect(result.runner_status).toBe('RUNNER_COMPLETED');
  });

  it('A2: result includes episode_id and title', async () => {
    const result = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, oracleEchoExecutor);
    expect(result.episode_id).toBe(SYN_001_CLEAN_ACCUMULATION.episode_id);
    expect(result.title).toBe(SYN_001_CLEAN_ACCUMULATION.title);
  });

  it('A3: result includes expected_oracle', async () => {
    const result = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, oracleEchoExecutor);
    expect(result.expected_oracle).toEqual(SYN_001_CLEAN_ACCUMULATION.expected_oracle);
  });

  it('A4: result includes actual_judgment', async () => {
    const result = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, oracleEchoExecutor);
    expect(result.actual_judgment).toBeDefined();
    expect(result.actual_judgment?.state).toBe(SYN_001_CLEAN_ACCUMULATION.expected_oracle.expected_state);
  });

  it('A5: result sets comparison_ready = true on success', async () => {
    const result = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, oracleEchoExecutor);
    expect(result.comparison_ready).toBe(true);
  });

  it('A6: result pins semantic_assertions_run = false', async () => {
    const result = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, oracleEchoExecutor);
    expect(result.semantic_assertions_run).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Class B — Corpus execution
// -----------------------------------------------------------------------------

describe('runJudgmentTruthCorpus — corpus execution', () => {
  it('B1: runs STARTER_SYNTHETIC_EPISODE_CORPUS in stable input order', async () => {
    const results = await runJudgmentTruthCorpus(
      [...STARTER_SYNTHETIC_EPISODE_CORPUS],
      oracleEchoExecutor,
    );
    const ids = results.map((r) => r.episode_id);
    const expectedIds = STARTER_SYNTHETIC_EPISODE_CORPUS.map((e) => e.episode_id);
    expect(ids).toEqual(expectedIds);
  });

  it('B2: returns exactly one result per input episode', async () => {
    const results = await runJudgmentTruthCorpus(
      [...STARTER_SYNTHETIC_EPISODE_CORPUS],
      oracleEchoExecutor,
    );
    expect(results.length).toBe(STARTER_SYNTHETIC_EPISODE_CORPUS.length);
  });

  it('B3: does not mutate original input episodes', async () => {
    const original = STARTER_SYNTHETIC_EPISODE_CORPUS.map((e) => JSON.stringify(e));
    await runJudgmentTruthCorpus([...STARTER_SYNTHETIC_EPISODE_CORPUS], oracleEchoExecutor);
    const after = STARTER_SYNTHETIC_EPISODE_CORPUS.map((e) => JSON.stringify(e));
    expect(after).toEqual(original);
  });
});

// -----------------------------------------------------------------------------
// Class C — Validation failure
// -----------------------------------------------------------------------------

describe('runJudgmentTruthEpisode — validation failure path', () => {
  it('C1: invalid episode returns VALIDATION_FAILED', async () => {
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    (broken as { episode_id: string }).episode_id = '';
    const result = await runJudgmentTruthEpisode(broken, oracleEchoExecutor);
    expect(result.runner_status).toBe('VALIDATION_FAILED');
    expect(result.comparison_ready).toBe(false);
  });

  it('C2: invalid episode does NOT call the executor', async () => {
    let executorCalled = 0;
    const trackingExecutor: SyntheticJudgmentExecutor = {
      metadata: { ...ORACLE_ECHO_METADATA, executor_id: 'test-tracking-executor' },
      execute: (episode) => {
        executorCalled += 1;
        return oracleEchoExecutor.execute(episode);
      },
    };
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    (broken as { episode_id: string }).episode_id = '';
    const result = await runJudgmentTruthEpisode(broken, trackingExecutor);
    expect(result.runner_status).toBe('VALIDATION_FAILED');
    expect(executorCalled).toBe(0);
  });

  it('C3: validation errors are preserved in the result', async () => {
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    (broken as { episode_id: string }).episode_id = '';
    const result = await runJudgmentTruthEpisode(broken, oracleEchoExecutor);
    expect(result.validation.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/episode_id/);
  });
});

// -----------------------------------------------------------------------------
// Class D — Executor failure
// -----------------------------------------------------------------------------

describe('runJudgmentTruthEpisode — executor failure path', () => {
  it('D1: executor throw returns EXECUTOR_FAILED', async () => {
    const result = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, throwingExecutor);
    expect(result.runner_status).toBe('EXECUTOR_FAILED');
    expect(result.errors.join(' ')).toMatch(/intentional executor failure/);
  });

  it('D2: executor failure preserves expected_oracle', async () => {
    const result = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, throwingExecutor);
    expect(result.expected_oracle).toEqual(SYN_001_CLEAN_ACCUMULATION.expected_oracle);
  });

  it('D3: corpus run continues after one executor failure', async () => {
    let calls = 0;
    const failOnceExecutor: SyntheticJudgmentExecutor = {
      metadata: { ...ORACLE_ECHO_METADATA, executor_id: 'test-fail-once-executor' },
      execute: (episode) => {
        calls += 1;
        if (calls === 2) {
          throw new Error('fail-once intentional');
        }
        return oracleEchoExecutor.execute(episode);
      },
    };
    const results = await runJudgmentTruthCorpus(
      [...STARTER_SYNTHETIC_EPISODE_CORPUS],
      failOnceExecutor,
    );
    expect(results.length).toBe(STARTER_SYNTHETIC_EPISODE_CORPUS.length);
    const statuses = results.map((r) => r.runner_status);
    expect(statuses).toContain('EXECUTOR_FAILED');
    expect(statuses).toContain('RUNNER_COMPLETED');
    expect(statuses.filter((s) => s === 'RUNNER_COMPLETED').length).toBeGreaterThanOrEqual(
      STARTER_SYNTHETIC_EPISODE_CORPUS.length - 1,
    );
  });
});

// -----------------------------------------------------------------------------
// Class E — No-real-provider guard
// -----------------------------------------------------------------------------

describe('assertNoRealProviderExecutor + no-provider guarantees', () => {
  it('E1: executor with uses_real_providers=true is rejected', () => {
    const taintedMeta = {
      ...ORACLE_ECHO_METADATA,
      uses_real_providers: true,
    } as unknown as SyntheticJudgmentExecutorMetadata;
    const bad: SyntheticJudgmentExecutor = {
      metadata: taintedMeta,
      execute: () => {
        throw new Error('should not be called');
      },
    };
    expect(() => assertNoRealProviderExecutor(bad)).toThrow(/uses_real_providers/);
  });

  it('E2: executor with uses_ai_model=true is rejected', () => {
    const taintedMeta = {
      ...ORACLE_ECHO_METADATA,
      uses_ai_model: true,
    } as unknown as SyntheticJudgmentExecutorMetadata;
    const bad: SyntheticJudgmentExecutor = {
      metadata: taintedMeta,
      execute: () => {
        throw new Error('should not be called');
      },
    };
    expect(() => assertNoRealProviderExecutor(bad)).toThrow(/uses_ai_model/);
  });

  it('E3: every runner result pins no_real_provider_calls = true (success, validation-fail, executor-fail)', async () => {
    const ok = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, oracleEchoExecutor);
    expect(ok.no_real_provider_calls).toBe(true);

    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    (broken as { episode_id: string }).episode_id = '';
    const valFail = await runJudgmentTruthEpisode(broken, oracleEchoExecutor);
    expect(valFail.no_real_provider_calls).toBe(true);

    const execFail = await runJudgmentTruthEpisode(SYN_001_CLEAN_ACCUMULATION, throwingExecutor);
    expect(execFail.no_real_provider_calls).toBe(true);
  });

  it('E4: test file uses 0 module mocks (no actual vi.mock() invocation lines)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const self = readFileSync(resolve(here, 'judgment-truth-runner.test.ts'), 'utf8');
    // Match only an actual `vi.mock(` invocation at the start of a statement,
    // not the string literal we use here to describe it. Lines starting with
    // optional whitespace then `vi.mock(` are the real-call form.
    const realCallRegex = /^[ \t]*vi\.mock\s*\(/m;
    expect(realCallRegex.test(self)).toBe(false);
  });

  it('E5: test file declares no import statements for provider/AI/chat-service modules', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const self = readFileSync(resolve(here, 'judgment-truth-runner.test.ts'), 'utf8');
    // Extract only real `import` statements (multi-line aware). String mentions
    // inside arrays or comments are ignored by design — only `import ... from 'X'`
    // forms count.
    const importLineRegex = /^[ \t]*import[\s\S]+?from\s+['"]([^'"]+)['"]/gm;
    const importedSpecifiers: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = importLineRegex.exec(self)) !== null) {
      importedSpecifiers.push(m[1]);
    }
    const forbiddenSpecifierSubstrings = [
      'openai',
      'anthropic',
      'grok',
      'xai',
      '@anthropic-ai/sdk',
      'ai-service',
      'services/judgment',
      'api/chat/service',
      'market-data',
      'project-investigation-service',
      'src/l13',
      'src/l14',
    ];
    for (const spec of importedSpecifiers) {
      for (const forbidden of forbiddenSpecifierSubstrings) {
        expect(
          spec.toLowerCase().includes(forbidden.toLowerCase()),
          `forbidden import specifier "${spec}" matches "${forbidden}"`,
        ).toBe(false);
      }
    }
  });
});
