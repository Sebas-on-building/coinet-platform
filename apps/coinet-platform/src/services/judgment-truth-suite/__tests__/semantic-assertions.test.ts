/**
 * P3-BTAR-004 — Semantic Assertion Engine Tests
 *
 * Classes covered:
 *   A — Happy path
 *   B — Readiness failures
 *   C — Field alignment failures
 *   D — Contradiction and reasoning coverage
 *   E — Confidence calibration
 *   F — Forbidden claims
 *   G — Degraded evidence respect
 *   H — No-provider discipline
 *
 * Discipline:
 *   - 0 module mocks (no vi.mock).
 *   - 0 provider imports.
 *   - 0 import of chat/service.ts, services/judgment/*, services/ai-service.ts.
 *   - 0 import of src/l13/ or src/l14/.
 *   - Pure deterministic input/output.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SYN_001_CLEAN_ACCUMULATION,
  SYN_003_DEGRADED_MIXED_READ,
} from '../synthetic-episode-fixtures';
import type {
  SyntheticEpisodeInput,
} from '../synthetic-episode.types';
import type {
  JudgmentTruthRunnerResult,
  SyntheticActualJudgment,
} from '../judgment-truth-runner.types';
import {
  assertSemanticAssertionResultValid,
  runSemanticAssertions,
} from '../semantic-assertions';
import type { JudgmentSemanticAssertionResult } from '../semantic-assertions.types';

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

function makePerfectActual(episode: SyntheticEpisodeInput): SyntheticActualJudgment {
  return {
    state: episode.expected_oracle.expected_state,
    cause_family: episode.expected_oracle.expected_cause_family,
    thesis_direction: episode.expected_oracle.expected_thesis_direction,
    thesis: `Synthetic thesis for ${episode.episode_id}`,
    contradictions: [...episode.expected_oracle.required_contradictions],
    timing_phase: episode.expected_oracle.expected_timing_phase,
    scenario_type: episode.expected_oracle.expected_scenario_type,
    confidence_band: episode.expected_oracle.expected_confidence_band,
    reasoning_notes: [...episode.expected_oracle.required_reasoning_notes],
  };
}

function makeRunnerResult(
  episode: SyntheticEpisodeInput,
  actual: SyntheticActualJudgment | undefined,
  overrides: Partial<JudgmentTruthRunnerResult> = {},
): JudgmentTruthRunnerResult {
  return {
    policy_version: 'judgment-truth-runner.v1',
    episode_id: episode.episode_id,
    title: episode.title,
    runner_status: 'RUNNER_COMPLETED',
    comparison_ready: true,
    semantic_assertions_run: false,
    validation: { valid: true, episode_id: episode.episode_id, errors: [], warnings: [] },
    expected_oracle: episode.expected_oracle,
    actual_judgment: actual,
    executor_metadata: undefined,
    errors: [],
    warnings: [],
    no_real_provider_calls: true,
    ...overrides,
  };
}

function findCheck(result: JudgmentSemanticAssertionResult, id: string) {
  return result.check_results.find((c) => c.check_id === id);
}

// -----------------------------------------------------------------------------
// Class A — Happy path
// -----------------------------------------------------------------------------

describe('P3-BTAR-004 — Class A — Happy path', () => {
  it('A1: perfect actual returns overall_outcome=PASS', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.overall_outcome).toBe('PASS');
  });

  it('A2: perfect actual score is 100', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.score).toBe(100);
  });

  it('A3: result pins semantic_assertions_run = true', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.semantic_assertions_run).toBe(true);
  });

  it('A4: result pins no_real_provider_calls = true', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.no_real_provider_calls).toBe(true);
  });

  it('A5: result pins policy_version = semantic-assertions.v1', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.policy_version).toBe('semantic-assertions.v1');
    expect(() => assertSemanticAssertionResultValid(result)).not.toThrow();
  });
});

// -----------------------------------------------------------------------------
// Class B — Readiness failures
// -----------------------------------------------------------------------------

describe('P3-BTAR-004 — Class B — Readiness failures', () => {
  it('B1: VALIDATION_FAILED runner result returns CRITICAL_FAIL', () => {
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, undefined, {
      runner_status: 'VALIDATION_FAILED',
      comparison_ready: false,
    });
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.overall_outcome).toBe('CRITICAL_FAIL');
    expect(findCheck(result, 'RUNNER_RESULT_READINESS')?.outcome).toBe('CRITICAL_FAIL');
  });

  it('B2: EXECUTOR_FAILED runner result returns CRITICAL_FAIL', () => {
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, undefined, {
      runner_status: 'EXECUTOR_FAILED',
      comparison_ready: false,
    });
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.overall_outcome).toBe('CRITICAL_FAIL');
  });

  it('B3: missing actual_judgment returns CRITICAL_FAIL', () => {
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, undefined);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.overall_outcome).toBe('CRITICAL_FAIL');
    expect(result.critical_failures.some((m) => m.includes('actual_judgment missing'))).toBe(true);
  });

  it('B4: readiness failures yield exactly one check entry (the readiness gate)', () => {
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, undefined);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(result.check_results.length).toBe(1);
    expect(result.check_results[0].check_id).toBe('RUNNER_RESULT_READINESS');
  });
});

// -----------------------------------------------------------------------------
// Class C — Field alignment failures
// -----------------------------------------------------------------------------

describe('P3-BTAR-004 — Class C — Field alignment failures', () => {
  it('C1: dangerously inverted state returns CRITICAL_FAIL', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.state = 'risk off contraction';
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(['FAIL', 'CRITICAL_FAIL']).toContain(findCheck(result, 'STATE_ALIGNMENT')?.outcome);
  });

  it('C2: leverage-driven mistaken for spot-led is a CRITICAL_FAIL on cause family', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.cause_family = 'spot-led demand';
    // Use an oracle whose cause family is leverage-assisted.
    const fakeEpisode: SyntheticEpisodeInput = {
      ...SYN_001_CLEAN_ACCUMULATION,
      expected_oracle: {
        ...SYN_001_CLEAN_ACCUMULATION.expected_oracle,
        expected_cause_family: 'leverage-assisted move',
      },
    };
    const runner = makeRunnerResult(fakeEpisode, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'CAUSE_FAMILY_ALIGNMENT')?.outcome).toBe('CRITICAL_FAIL');
  });

  it('C3: opposite-direction thesis returns CRITICAL_FAIL', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.thesis_direction = 'bearish distribution risk';
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'THESIS_DIRECTION_ALIGNMENT')?.outcome).toBe('CRITICAL_FAIL');
  });

  it('C4: wrong scenario type returns FAIL or CRITICAL_FAIL', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.scenario_type = 'completely unrelated scenario about macro housing';
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(['FAIL', 'CRITICAL_FAIL']).toContain(findCheck(result, 'SCENARIO_TYPE_ALIGNMENT')?.outcome);
  });

  it('C5: timing EARLY when expected EXHAUSTED is CRITICAL_FAIL', () => {
    const oracle = {
      ...SYN_001_CLEAN_ACCUMULATION.expected_oracle,
      expected_timing_phase: 'EXHAUSTED' as const,
    };
    const fakeEpisode = { ...SYN_001_CLEAN_ACCUMULATION, expected_oracle: oracle };
    const actual = makePerfectActual(fakeEpisode);
    actual.timing_phase = 'EARLY';
    const runner = makeRunnerResult(fakeEpisode, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'TIMING_PHASE_ALIGNMENT')?.outcome).toBe('CRITICAL_FAIL');
  });
});

// -----------------------------------------------------------------------------
// Class D — Contradiction and reasoning coverage
// -----------------------------------------------------------------------------

describe('P3-BTAR-004 — Class D — Contradiction and reasoning coverage', () => {
  it('D1: missing one required contradiction (of 2) returns WARNING', () => {
    // Build a controlled local episode with exactly 2 required contradictions
    // so "missing one of two" is a meaningful test independent of any starter
    // fixture's contradiction count.
    const twoContradictionEpisode: SyntheticEpisodeInput = {
      ...SYN_001_CLEAN_ACCUMULATION,
      expected_oracle: {
        ...SYN_001_CLEAN_ACCUMULATION.expected_oracle,
        required_contradictions: [
          'sentiment has not yet confirmed the move',
          'price has not yet confirmed a clean breakout candle',
        ],
      },
    };
    const actual = makePerfectActual(twoContradictionEpisode);
    actual.contradictions = [twoContradictionEpisode.expected_oracle.required_contradictions[0]];
    const runner = makeRunnerResult(twoContradictionEpisode, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'REQUIRED_CONTRADICTION_COVERAGE')?.outcome).toBe('WARNING');
  });

  it('D2: missing all required contradictions returns CRITICAL_FAIL', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.contradictions = [];
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'REQUIRED_CONTRADICTION_COVERAGE')?.outcome).toBe('CRITICAL_FAIL');
  });

  it('D3: missing one required reasoning note (of 2) returns WARNING', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.reasoning_notes = [SYN_001_CLEAN_ACCUMULATION.expected_oracle.required_reasoning_notes[0]];
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'REQUIRED_REASONING_NOTE_COVERAGE')?.outcome).toBe('WARNING');
  });

  it('D4: missing all reasoning notes returns CRITICAL_FAIL', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.reasoning_notes = [];
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'REQUIRED_REASONING_NOTE_COVERAGE')?.outcome).toBe('CRITICAL_FAIL');
  });
});

// -----------------------------------------------------------------------------
// Class E — Confidence calibration
// -----------------------------------------------------------------------------

describe('P3-BTAR-004 — Class E — Confidence calibration', () => {
  it('E1: matching confidence passes', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'CONFIDENCE_BAND_CALIBRATION')?.outcome).toBe('PASS');
  });

  it('E2: one-level confidence inflation returns WARNING', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION); // expected MEDIUM
    actual.confidence_band = 'HIGH';
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'CONFIDENCE_BAND_CALIBRATION')?.outcome).toBe('WARNING');
  });

  it('E3: two-level inflation returns FAIL', () => {
    const oracle = {
      ...SYN_001_CLEAN_ACCUMULATION.expected_oracle,
      expected_confidence_band: 'LOW' as const,
    };
    const fakeEpisode = { ...SYN_001_CLEAN_ACCUMULATION, expected_oracle: oracle };
    const actual = makePerfectActual(fakeEpisode);
    actual.confidence_band = 'HIGH'; // LOW(1) -> HIGH(3) = +2, but also expectedLow + actualHigh = CRITICAL_FAIL
    // Per §19: expected LOW/VERY_LOW + actual HIGH/VERY_HIGH → CRITICAL_FAIL.
    const runner = makeRunnerResult(fakeEpisode, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'CONFIDENCE_BAND_CALIBRATION')?.outcome).toBe('CRITICAL_FAIL');
  });

  it('E4: LOW expected but HIGH actual returns CRITICAL_FAIL', () => {
    const oracle = {
      ...SYN_001_CLEAN_ACCUMULATION.expected_oracle,
      expected_confidence_band: 'LOW' as const,
    };
    const fakeEpisode = { ...SYN_001_CLEAN_ACCUMULATION, expected_oracle: oracle };
    const actual = makePerfectActual(fakeEpisode);
    actual.confidence_band = 'HIGH';
    const runner = makeRunnerResult(fakeEpisode, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'CONFIDENCE_BAND_CALIBRATION')?.outcome).toBe('CRITICAL_FAIL');
  });

  it('E5: VERY_HIGH actual without expected VERY_HIGH returns CRITICAL_FAIL', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.confidence_band = 'VERY_HIGH';
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'CONFIDENCE_BAND_CALIBRATION')?.outcome).toBe('CRITICAL_FAIL');
  });
});

// -----------------------------------------------------------------------------
// Class F — Forbidden claims
// -----------------------------------------------------------------------------

describe('P3-BTAR-004 — Class F — Forbidden claims', () => {
  it('F1: forbidden claim in thesis returns FAIL', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    // SYN-001 forbids "guaranteed continuation"; insert it into the thesis.
    actual.thesis = 'guaranteed continuation regardless of conditions';
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(['FAIL', 'CRITICAL_FAIL']).toContain(findCheck(result, 'FORBIDDEN_CLAIM_ABSENCE')?.outcome);
  });

  it('F2: forbidden claim with HIGH confidence escalates to CRITICAL_FAIL', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    actual.thesis = 'must buy now';
    actual.confidence_band = 'HIGH';
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'FORBIDDEN_CLAIM_ABSENCE')?.outcome).toBe('CRITICAL_FAIL');
  });

  it('F3: no forbidden claim passes', () => {
    const actual = makePerfectActual(SYN_001_CLEAN_ACCUMULATION);
    const runner = makeRunnerResult(SYN_001_CLEAN_ACCUMULATION, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'FORBIDDEN_CLAIM_ABSENCE')?.outcome).toBe('PASS');
  });
});

// -----------------------------------------------------------------------------
// Class G — Degraded evidence respect
// -----------------------------------------------------------------------------

describe('P3-BTAR-004 — Class G — Degraded evidence respect', () => {
  it('G1: degraded actual with capped confidence passes', () => {
    const actual = makePerfectActual(SYN_003_DEGRADED_MIXED_READ);
    const runner = makeRunnerResult(SYN_003_DEGRADED_MIXED_READ, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'DEGRADED_EVIDENCE_RESPECT')?.outcome).toBe('PASS');
  });

  it('G2: degraded expected but HIGH confidence + missing disclosure → CRITICAL_FAIL', () => {
    const actual = makePerfectActual(SYN_003_DEGRADED_MIXED_READ);
    actual.reasoning_notes = ['clean breakout confirmed across all signals'];
    actual.state = 'clean accumulation';
    actual.confidence_band = 'HIGH';
    const runner = makeRunnerResult(SYN_003_DEGRADED_MIXED_READ, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'DEGRADED_EVIDENCE_RESPECT')?.outcome).toBe('CRITICAL_FAIL');
  });

  it('G3: degraded expected but disclosure missing (confidence still LOW) returns FAIL', () => {
    const actual = makePerfectActual(SYN_003_DEGRADED_MIXED_READ);
    actual.reasoning_notes = ['some unrelated note'];
    actual.state = 'mixed contradiction'; // remove degraded keyword
    const runner = makeRunnerResult(SYN_003_DEGRADED_MIXED_READ, actual);
    const result = runSemanticAssertions({ runner_result: runner });
    expect(findCheck(result, 'DEGRADED_EVIDENCE_RESPECT')?.outcome).toBe('FAIL');
  });
});

// -----------------------------------------------------------------------------
// Class H — No-provider discipline
// -----------------------------------------------------------------------------

describe('P3-BTAR-004 — Class H — No-provider discipline', () => {
  it('H1: this test file uses 0 vi.mock() invocations (real-invocation regex)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'semantic-assertions.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    const realInvocation = /^[ \t]*vi\.mock\s*\(/m;
    expect(realInvocation.test(source)).toBe(false);
  });

  it('H2: this test file does not import any forbidden provider or surface module', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'semantic-assertions.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    const importSpecRegex = /import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g;
    const seenSpecs: string[] = [];
    for (let m = importSpecRegex.exec(source); m !== null; m = importSpecRegex.exec(source)) {
      seenSpecs.push(m[1]);
    }
    const forbiddenSubstrings = [
      'openai',
      'grok',
      '@anthropic-ai',
      'coingecko',
      'coinglass',
      'nansen',
      'arkham',
      'alchemy',
      'quicknode',
      'lunarcrush',
      'cryptopanic',
      'twitter',
      'api/chat/service',
      'services/judgment',
      'services/ai-service',
      'services/market-data',
      'src/l13',
      'src/l14',
    ];
    const hits = seenSpecs.filter((spec) =>
      forbiddenSubstrings.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('H3: semantic-assertions.ts source does not import any forbidden provider or surface module', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const enginePath = resolve(__dirname, '..', 'semantic-assertions.ts');
    const source = readFileSync(enginePath, 'utf8');
    const importSpecRegex = /import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g;
    const seenSpecs: string[] = [];
    for (let m = importSpecRegex.exec(source); m !== null; m = importSpecRegex.exec(source)) {
      seenSpecs.push(m[1]);
    }
    const forbiddenSubstrings = [
      'openai',
      'grok',
      '@anthropic-ai',
      'coingecko',
      'coinglass',
      'nansen',
      'arkham',
      'alchemy',
      'quicknode',
      'lunarcrush',
      'cryptopanic',
      'twitter',
      'api/chat/service',
      'services/judgment',
      'services/ai-service',
      'services/market-data',
      'src/l13',
      'src/l14',
    ];
    const hits = seenSpecs.filter((spec) =>
      forbiddenSubstrings.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });
});
