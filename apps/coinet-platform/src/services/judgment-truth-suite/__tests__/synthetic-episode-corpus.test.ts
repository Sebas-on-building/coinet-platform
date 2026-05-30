/**
 * P3-BTAR-003 — Synthetic Episode Corpus Tests
 *
 * This is a Phase 3 synthetic-corpus test suite covering:
 *   Class A — Corpus shape
 *   Class B — Family coverage
 *   Class C — Oracle quality
 *   Class D — Confidence and timing calibration
 *   Class E — No-provider proof
 *   Class F — Runner compatibility (P3-BTAR-002 runner with in-test executor)
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
  SYNTHETIC_EPISODE_CORPUS,
  SYNTHETIC_EPISODE_CORPUS_BY_ID,
  getSyntheticEpisodeById,
  getSyntheticEpisodesByRegime,
  getSyntheticEpisodesByTag,
} from '../synthetic-episode-corpus';
import {
  REQUIRED_SYNTHETIC_EPISODE_FAMILIES,
  SYNTHETIC_EPISODE_CORPUS_TARGET_SIZE,
  type SyntheticEpisodeFamilyCoverage,
} from '../synthetic-episode-corpus.metadata';
import {
  FORBIDDEN_PROVIDER_PAYLOAD_KEYS,
  validateSyntheticEpisode,
} from '../synthetic-episode-validation';
import type {
  ExpectedConfidenceBand,
  ExpectedTimingPhase,
  SyntheticEpisodeInput,
} from '../synthetic-episode.types';
import {
  runJudgmentTruthCorpus,
  runJudgmentTruthEpisode,
} from '../judgment-truth-runner';
import type {
  SyntheticActualJudgment,
  SyntheticJudgmentExecutor,
  SyntheticJudgmentExecutorMetadata,
} from '../judgment-truth-runner.types';

// -----------------------------------------------------------------------------
// Deterministic in-test executor (oracle echo). Local to this test file.
// -----------------------------------------------------------------------------

const ORACLE_ECHO_METADATA: SyntheticJudgmentExecutorMetadata = {
  executor_id: 'test-corpus-oracle-echo-executor',
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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function tagFamily(ep: SyntheticEpisodeInput): string | undefined {
  return ep.tags.find((t) => t.startsWith('family:'));
}

function familyIdOf(ep: SyntheticEpisodeInput): string | undefined {
  const t = tagFamily(ep);
  return t ? t.slice('family:'.length) : undefined;
}

function deepIterableKeys(value: unknown): string[] {
  const keys: string[] = [];
  const seen = new WeakSet<object>();
  function walk(v: unknown): void {
    if (v === null || v === undefined) return;
    if (typeof v !== 'object') return;
    if (seen.has(v as object)) return;
    seen.add(v as object);
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    for (const [k, sub] of Object.entries(v as Record<string, unknown>)) {
      keys.push(k);
      walk(sub);
    }
  }
  walk(value);
  return keys;
}

// -----------------------------------------------------------------------------
// Class A — Corpus shape
// -----------------------------------------------------------------------------

describe('P3-BTAR-003 — Class A — Corpus shape', () => {
  it('A1: corpus contains 15–25 episodes', () => {
    expect(SYNTHETIC_EPISODE_CORPUS.length).toBeGreaterThanOrEqual(
      SYNTHETIC_EPISODE_CORPUS_TARGET_SIZE.minimum,
    );
    expect(SYNTHETIC_EPISODE_CORPUS.length).toBeLessThanOrEqual(
      SYNTHETIC_EPISODE_CORPUS_TARGET_SIZE.maximum,
    );
  });

  it('A2: corpus meets the recommended size (18)', () => {
    expect(SYNTHETIC_EPISODE_CORPUS.length).toBe(
      SYNTHETIC_EPISODE_CORPUS_TARGET_SIZE.recommended,
    );
  });

  it('A3: all episode IDs are unique', () => {
    const ids = SYNTHETIC_EPISODE_CORPUS.map((ep) => ep.episode_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('A4: every episode validates with no errors', () => {
    const failures: Array<{ id: string; errors: string[] }> = [];
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const result = validateSyntheticEpisode(ep);
      if (!result.valid) failures.push({ id: ep.episode_id, errors: result.errors });
    }
    expect(failures).toEqual([]);
  });

  it('A5: SYNTHETIC_EPISODE_CORPUS_BY_ID matches the corpus entries', () => {
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      expect(SYNTHETIC_EPISODE_CORPUS_BY_ID[ep.episode_id]).toBe(ep);
      expect(getSyntheticEpisodeById(ep.episode_id)).toBe(ep);
    }
    expect(Object.keys(SYNTHETIC_EPISODE_CORPUS_BY_ID).length).toBe(
      SYNTHETIC_EPISODE_CORPUS.length,
    );
  });
});

// -----------------------------------------------------------------------------
// Class B — Family coverage
// -----------------------------------------------------------------------------

describe('P3-BTAR-003 — Class B — Family coverage', () => {
  function buildCoverage(): SyntheticEpisodeFamilyCoverage[] {
    return REQUIRED_SYNTHETIC_EPISODE_FAMILIES.map((fam) => {
      const covering = SYNTHETIC_EPISODE_CORPUS.filter(
        (ep) => familyIdOf(ep) === fam.family_id,
      ).map((ep) => ep.episode_id);
      return {
        family_id: fam.family_id,
        name: fam.name,
        required: fam.required,
        covered_by_episode_ids: covering,
      };
    });
  }

  it('B1: every required family is covered by at least one episode', () => {
    const coverage = buildCoverage();
    const uncovered = coverage.filter(
      (c) => c.required && c.covered_by_episode_ids.length === 0,
    );
    expect(uncovered.map((c) => c.family_id)).toEqual([]);
  });

  it('B2: every episode carries a family:FAM-NNN tag', () => {
    const noFamily = SYNTHETIC_EPISODE_CORPUS.filter((ep) => !tagFamily(ep));
    expect(noFamily.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('B3: no required family has zero coverage', () => {
    const coverage = buildCoverage();
    const zero = coverage.filter((c) => c.covered_by_episode_ids.length === 0);
    expect(zero.map((c) => c.family_id)).toEqual([]);
  });

  it('B4: getSyntheticEpisodesByTag returns the same episodes as direct filter', () => {
    const direct = SYNTHETIC_EPISODE_CORPUS.filter((ep) => ep.tags.includes('family:FAM-003'));
    const viaHelper = getSyntheticEpisodesByTag('family:FAM-003');
    expect(viaHelper).toEqual(direct);
  });

  it('B5: getSyntheticEpisodesByRegime filters correctly', () => {
    const all = getSyntheticEpisodesByRegime('LATE_DISTRIBUTION');
    expect(all.length).toBeGreaterThan(0);
    for (const ep of all) {
      expect(ep.market_regime).toBe('LATE_DISTRIBUTION');
    }
  });
});

// -----------------------------------------------------------------------------
// Class C — Oracle quality
// -----------------------------------------------------------------------------

describe('P3-BTAR-003 — Class C — Oracle quality', () => {
  it('C1: every oracle exposes the full 7-field judgment expectation surface', () => {
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const o = ep.expected_oracle;
      expect(o.expected_state).toBeTruthy();
      expect(o.expected_cause_family).toBeTruthy();
      expect(o.expected_thesis_direction).toBeTruthy();
      expect(o.expected_timing_phase).toBeTruthy();
      expect(o.expected_scenario_type).toBeTruthy();
      expect(o.expected_confidence_band).toBeTruthy();
      expect(Array.isArray(o.required_contradictions)).toBe(true);
      expect(Array.isArray(o.forbidden_claims)).toBe(true);
      expect(Array.isArray(o.required_reasoning_notes)).toBe(true);
    }
  });

  it('C2: every oracle has at least 2 required_contradictions', () => {
    const failures = SYNTHETIC_EPISODE_CORPUS.filter(
      (ep) => ep.expected_oracle.required_contradictions.length < 2,
    );
    expect(failures.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('C3: every oracle has at least 2 forbidden_claims', () => {
    const failures = SYNTHETIC_EPISODE_CORPUS.filter(
      (ep) => ep.expected_oracle.forbidden_claims.length < 2,
    );
    expect(failures.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('C4: every oracle has at least 2 required_reasoning_notes', () => {
    const failures = SYNTHETIC_EPISODE_CORPUS.filter(
      (ep) => ep.expected_oracle.required_reasoning_notes.length < 2,
    );
    expect(failures.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('C5: no oracle field is an empty string', () => {
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const o = ep.expected_oracle;
      const strings: Array<[string, string]> = [
        ['expected_state', o.expected_state],
        ['expected_cause_family', o.expected_cause_family],
        ['expected_thesis_direction', o.expected_thesis_direction],
        ['expected_scenario_type', o.expected_scenario_type],
      ];
      for (const [name, value] of strings) {
        expect(value, `${ep.episode_id}: ${name}`).not.toBe('');
        expect(value.trim().length, `${ep.episode_id}: ${name}`).toBeGreaterThan(0);
      }
      for (const arrName of ['required_contradictions', 'forbidden_claims', 'required_reasoning_notes'] as const) {
        for (const entry of o[arrName]) {
          expect(entry, `${ep.episode_id}: ${arrName} entry`).not.toBe('');
          expect(entry.trim().length, `${ep.episode_id}: ${arrName} entry`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('C6: every oracle includes at least one explicit anti-overconfidence forbidden_claim', () => {
    const antiOverconfidence = [
      'guaranteed',
      'risk-free',
      'must buy now',
      'must sell now',
      'certain',
      'safe to chase',
      'safe entry',
      'safe to buy',
      'safe to hold',
      'guaranteed continuation',
      'guaranteed direction',
      'guaranteed breakout',
      'guaranteed outperformance',
      'guaranteed squeeze',
    ];
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const claims = ep.expected_oracle.forbidden_claims.map((c) => c.toLowerCase());
      const hit = claims.some((c) => antiOverconfidence.some((needle) => c.includes(needle)));
      expect(hit, `${ep.episode_id} forbidden_claims must include an anti-overconfidence clause`).toBe(true);
    }
  });
});

// -----------------------------------------------------------------------------
// Class D — Confidence and timing calibration
// -----------------------------------------------------------------------------

describe('P3-BTAR-003 — Class D — Confidence and timing calibration', () => {
  const HIGH_OR_ABOVE: ReadonlyArray<ExpectedConfidenceBand> = ['HIGH', 'VERY_HIGH'];

  it('D1: no episode uses VERY_HIGH confidence', () => {
    const offenders = SYNTHETIC_EPISODE_CORPUS.filter(
      (ep) => ep.expected_oracle.expected_confidence_band === 'VERY_HIGH',
    );
    expect(offenders.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('D2: degraded episodes (FAM-015 or non-empty degraded_components) do not use HIGH or VERY_HIGH', () => {
    const offenders = SYNTHETIC_EPISODE_CORPUS.filter((ep) => {
      const isDegraded =
        familyIdOf(ep) === 'FAM-015' || (ep.degraded_components?.length ?? 0) > 0;
      return (
        isDegraded &&
        HIGH_OR_ABOVE.includes(ep.expected_oracle.expected_confidence_band)
      );
    });
    expect(offenders.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('D3: leverage-driven fake-strength (FAM-003) does not use HIGH or VERY_HIGH', () => {
    const offenders = SYNTHETIC_EPISODE_CORPUS.filter(
      (ep) =>
        familyIdOf(ep) === 'FAM-003' &&
        HIGH_OR_ABOVE.includes(ep.expected_oracle.expected_confidence_band),
    );
    expect(offenders.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('D4: security-risk override (FAM-016) does not use HIGH or VERY_HIGH', () => {
    const offenders = SYNTHETIC_EPISODE_CORPUS.filter(
      (ep) =>
        familyIdOf(ep) === 'FAM-016' &&
        HIGH_OR_ABOVE.includes(ep.expected_oracle.expected_confidence_band),
    );
    expect(offenders.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('D5: late euphoric momentum (FAM-005) timing is LATE or EXHAUSTED', () => {
    const allowed: ReadonlyArray<ExpectedTimingPhase> = ['LATE', 'EXHAUSTED'];
    const offenders = SYNTHETIC_EPISODE_CORPUS.filter(
      (ep) =>
        familyIdOf(ep) === 'FAM-005' &&
        !allowed.includes(ep.expected_oracle.expected_timing_phase),
    );
    expect(offenders.map((ep) => ep.episode_id)).toEqual([]);
  });

  it('D6: degraded partial blindness (FAM-015) timing is UNCLEAR', () => {
    const offenders = SYNTHETIC_EPISODE_CORPUS.filter(
      (ep) =>
        familyIdOf(ep) === 'FAM-015' &&
        ep.expected_oracle.expected_timing_phase !== 'UNCLEAR',
    );
    expect(offenders.map((ep) => ep.episode_id)).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// Class E — No-provider proof
// -----------------------------------------------------------------------------

describe('P3-BTAR-003 — Class E — No-provider proof', () => {
  it('E1: corpus contains no forbidden provider payload keys at any depth', () => {
    const hits: string[] = [];
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const keys = deepIterableKeys(ep);
      for (const k of keys) {
        if (FORBIDDEN_PROVIDER_PAYLOAD_KEYS.includes(k)) {
          hits.push(`${ep.episode_id}:${k}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('E2: this test file uses 0 vi.mock() invocations (real-invocation regex)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'synthetic-episode-corpus.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    // Match a real call site at line-start (allowing leading whitespace), not
    // text appearing inside a comment or string anywhere on a line.
    const realInvocation = /^[ \t]*vi\.mock\s*\(/m;
    expect(realInvocation.test(source)).toBe(false);
  });

  it('E3: this test file does not import any forbidden provider or surface module', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'synthetic-episode-corpus.test.ts');
    const source = readFileSync(selfPath, 'utf8');

    // Extract every `import ... from '<spec>'` and `import '<spec>'` form.
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

    const forbiddenHits = seenSpecs.filter((spec) =>
      forbiddenSubstrings.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(forbiddenHits).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// Class F — Runner compatibility
// -----------------------------------------------------------------------------

describe('P3-BTAR-003 — Class F — Runner compatibility', () => {
  it('F1: runJudgmentTruthCorpus returns one result per episode', async () => {
    const results = await runJudgmentTruthCorpus(
      [...SYNTHETIC_EPISODE_CORPUS],
      oracleEchoExecutor,
    );
    expect(results.length).toBe(SYNTHETIC_EPISODE_CORPUS.length);
  });

  it('F2: result order matches corpus order', async () => {
    const results = await runJudgmentTruthCorpus(
      [...SYNTHETIC_EPISODE_CORPUS],
      oracleEchoExecutor,
    );
    const inputIds = SYNTHETIC_EPISODE_CORPUS.map((ep) => ep.episode_id);
    const outputIds = results.map((r) => r.episode_id);
    expect(outputIds).toEqual(inputIds);
  });

  it('F3: every result has runner_status = RUNNER_COMPLETED', async () => {
    const results = await runJudgmentTruthCorpus(
      [...SYNTHETIC_EPISODE_CORPUS],
      oracleEchoExecutor,
    );
    const nonCompleted = results.filter((r) => r.runner_status !== 'RUNNER_COMPLETED');
    expect(nonCompleted.map((r) => r.episode_id)).toEqual([]);
  });

  it('F4: every result has comparison_ready = true', async () => {
    const results = await runJudgmentTruthCorpus(
      [...SYNTHETIC_EPISODE_CORPUS],
      oracleEchoExecutor,
    );
    const offenders = results.filter((r) => r.comparison_ready !== true);
    expect(offenders.map((r) => r.episode_id)).toEqual([]);
  });

  it('F5: every result has semantic_assertions_run = false (type-pinned literal)', async () => {
    const results = await runJudgmentTruthCorpus(
      [...SYNTHETIC_EPISODE_CORPUS],
      oracleEchoExecutor,
    );
    for (const r of results) {
      expect(r.semantic_assertions_run).toBe(false);
    }
  });

  it('F6: every result has no_real_provider_calls = true (type-pinned literal)', async () => {
    const results = await runJudgmentTruthCorpus(
      [...SYNTHETIC_EPISODE_CORPUS],
      oracleEchoExecutor,
    );
    for (const r of results) {
      expect(r.no_real_provider_calls).toBe(true);
    }
  });

  it('F7: single-episode run on SYN-001 returns RUNNER_COMPLETED with actual_judgment populated', async () => {
    const syn1 = SYNTHETIC_EPISODE_CORPUS[0];
    const result = await runJudgmentTruthEpisode(syn1, oracleEchoExecutor);
    expect(result.runner_status).toBe('RUNNER_COMPLETED');
    expect(result.actual_judgment).toBeDefined();
    expect(result.expected_oracle).toBeDefined();
    expect(result.no_real_provider_calls).toBe(true);
    expect(result.semantic_assertions_run).toBe(false);
  });
});
