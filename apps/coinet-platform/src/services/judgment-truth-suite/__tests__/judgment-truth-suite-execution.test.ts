/**
 * P3-BTAR-005 — Judgment Truth Suite Execution Tests
 *
 * Six test classes (A–F) mirroring the P3-BTAR-005 §15 spec. 0 module
 * mocks. 0 provider imports. The bad-executor failure-visibility tests
 * (Class E) live IN-TEST and never touch the production harness
 * executor — they prove the suite surfaces CRITICAL_FAIL when an actual
 * judgment is dangerously wrong, which is INV-01 honesty.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  runJudgmentTruthSuite,
  renderJudgmentTruthSuiteReportMarkdown,
  assertJudgmentTruthSuiteRunResultValid,
  createHarnessCertificationExecutor,
  calculateOutcomeCounts,
  calculateCheckSummary,
  extractFamilyTags,
} from '../judgment-truth-suite-execution';
import type {
  JudgmentTruthSuiteRunResult,
} from '../judgment-truth-suite-execution.types';
import { SYNTHETIC_EPISODE_CORPUS } from '../synthetic-episode-corpus';
import type {
  SyntheticActualJudgment,
  SyntheticJudgmentExecutor,
} from '../judgment-truth-runner.types';
import type { SyntheticEpisodeInput } from '../synthetic-episode.types';

// =============================================================================
// Shared helpers (in-test only — never imported by production)
// =============================================================================

function buildSuiteUnderHarness(): Promise<JudgmentTruthSuiteRunResult> {
  return runJudgmentTruthSuite({
    episodes: SYNTHETIC_EPISODE_CORPUS,
    execution_mode: 'HARNESS_CERTIFICATION',
  });
}

// =============================================================================
// Class A — Full suite execution
// =============================================================================

describe('P3-BTAR-005 — Class A — Full suite execution', () => {
  it('A1: runs all 18 corpus episodes', async () => {
    const result = await buildSuiteUnderHarness();
    expect(result.corpus_size).toBe(SYNTHETIC_EPISODE_CORPUS.length);
    expect(result.episode_results).toHaveLength(SYNTHETIC_EPISODE_CORPUS.length);
  });

  it('A2: returns one episode result per corpus episode and preserves order', async () => {
    const result = await buildSuiteUnderHarness();
    const expectedIds = SYNTHETIC_EPISODE_CORPUS.map((e) => e.episode_id);
    const actualIds = result.episode_results.map((e) => e.episode_id);
    expect(actualIds).toEqual(expectedIds);
  });

  it('A3: sets semantic_assertions_run = true and no_real_provider_calls = true (literal pins)', async () => {
    const result = await buildSuiteUnderHarness();
    expect(result.semantic_assertions_run).toBe(true);
    expect(result.no_real_provider_calls).toBe(true);
  });

  it('A4: throws when corpus is empty', async () => {
    await expect(
      runJudgmentTruthSuite({
        episodes: [],
        execution_mode: 'HARNESS_CERTIFICATION',
      }),
    ).rejects.toThrow(/non-empty/i);
  });

  it('A5: aggregate result passes assertJudgmentTruthSuiteRunResultValid', async () => {
    const result = await buildSuiteUnderHarness();
    expect(() => assertJudgmentTruthSuiteRunResultValid(result)).not.toThrow();
  });

  it('A6: every per-episode semantic result was actually run (semantic_assertions_run=true)', async () => {
    const result = await buildSuiteUnderHarness();
    for (const ep of result.episode_results) {
      expect(ep.semantic_result.semantic_assertions_run).toBe(true);
      expect(ep.semantic_result.no_real_provider_calls).toBe(true);
    }
  });
});

// =============================================================================
// Class B — Aggregation
// =============================================================================

describe('P3-BTAR-005 — Class B — Aggregation', () => {
  it('B1: outcome counts sum to corpus_size', async () => {
    const result = await buildSuiteUnderHarness();
    const sum =
      result.outcome_counts.PASS +
      result.outcome_counts.WARNING +
      result.outcome_counts.FAIL +
      result.outcome_counts.CRITICAL_FAIL;
    expect(sum).toBe(result.corpus_size);
  });

  it('B2: score stats are bounded to [0, 100]', async () => {
    const result = await buildSuiteUnderHarness();
    expect(result.average_score).toBeGreaterThanOrEqual(0);
    expect(result.average_score).toBeLessThanOrEqual(100);
    expect(result.minimum_score).toBeGreaterThanOrEqual(0);
    expect(result.maximum_score).toBeLessThanOrEqual(100);
    expect(result.minimum_score).toBeLessThanOrEqual(result.average_score);
    expect(result.average_score).toBeLessThanOrEqual(result.maximum_score);
  });

  it('B3: groups passed/warning/failed/critical episode IDs and they partition corpus', async () => {
    const result = await buildSuiteUnderHarness();
    const all = [
      ...result.passed_episode_ids,
      ...result.warning_episode_ids,
      ...result.failed_episode_ids,
      ...result.critical_episode_ids,
    ];
    expect(all).toHaveLength(result.corpus_size);
    // No ID can appear in two groups.
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });

  it('B4: check_summary contains exactly 11 check_ids (10 semantic + 1 readiness)', async () => {
    const result = await buildSuiteUnderHarness();
    expect(result.check_summary).toHaveLength(11);
    const ids = result.check_summary.map((c) => c.check_id).sort();
    expect(ids).toEqual(
      [
        'CAUSE_FAMILY_ALIGNMENT',
        'CONFIDENCE_BAND_CALIBRATION',
        'DEGRADED_EVIDENCE_RESPECT',
        'FORBIDDEN_CLAIM_ABSENCE',
        'REQUIRED_CONTRADICTION_COVERAGE',
        'REQUIRED_REASONING_NOTE_COVERAGE',
        'RUNNER_RESULT_READINESS',
        'SCENARIO_TYPE_ALIGNMENT',
        'STATE_ALIGNMENT',
        'THESIS_DIRECTION_ALIGNMENT',
        'TIMING_PHASE_ALIGNMENT',
      ].sort(),
    );
  });

  it('B5: calculateOutcomeCounts + calculateCheckSummary are pure (no mutation of input)', async () => {
    const result = await buildSuiteUnderHarness();
    const semanticResults = result.episode_results.map((e) => e.semantic_result);
    const frozenLengthBefore = semanticResults.length;
    const counts1 = calculateOutcomeCounts(semanticResults);
    const counts2 = calculateOutcomeCounts(semanticResults);
    expect(counts1).toEqual(counts2);
    expect(semanticResults).toHaveLength(frozenLengthBefore);
    const summary1 = calculateCheckSummary(semanticResults);
    const summary2 = calculateCheckSummary(semanticResults);
    expect(summary1).toEqual(summary2);
  });

  it('B6: extractFamilyTags returns family:* tags from a corpus episode', () => {
    const episode = SYNTHETIC_EPISODE_CORPUS[0];
    const tags = extractFamilyTags(episode);
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) {
      expect(t.startsWith('family:')).toBe(true);
    }
  });
});

// =============================================================================
// Class C — Harness certification mode
// =============================================================================

describe('P3-BTAR-005 — Class C — Harness certification mode', () => {
  it('C1: default execution mode is reported back as HARNESS_CERTIFICATION', async () => {
    const result = await buildSuiteUnderHarness();
    expect(result.execution_mode).toBe('HARNESS_CERTIFICATION');
  });

  it('C2: HARNESS_CERTIFICATION sets active_judgment_engine_connected = false', async () => {
    const result = await buildSuiteUnderHarness();
    expect(result.active_judgment_engine_connected).toBe(false);
  });

  it('C3: HARNESS_CERTIFICATION sets report_claim_level = HARNESS_ONLY', async () => {
    const result = await buildSuiteUnderHarness();
    expect(result.report_claim_level).toBe('HARNESS_ONLY');
  });

  it('C4: warnings include explicit HARNESS_ONLY honesty disclosure', async () => {
    const result = await buildSuiteUnderHarness();
    const joined = result.warnings.join(' | ');
    expect(joined).toMatch(/HARNESS_ONLY/);
    expect(joined).toMatch(/active judgment engine/i);
  });

  it('C5: harness executor metadata pins uses_real_providers=false and uses_ai_model=false', () => {
    const executor = createHarnessCertificationExecutor();
    expect(executor.metadata.uses_real_providers).toBe(false);
    expect(executor.metadata.uses_ai_model).toBe(false);
    expect(executor.metadata.deterministic).toBe(true);
  });

  it('C6: HARNESS_CERTIFICATION mode does NOT throw when active_executor is omitted', async () => {
    await expect(
      runJudgmentTruthSuite({
        episodes: SYNTHETIC_EPISODE_CORPUS,
        execution_mode: 'HARNESS_CERTIFICATION',
      }),
    ).resolves.toBeDefined();
  });

  it('C7: ACTIVE_SYNTHETIC_ADAPTER mode throws when active_executor is omitted', async () => {
    await expect(
      runJudgmentTruthSuite({
        episodes: SYNTHETIC_EPISODE_CORPUS,
        execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      }),
    ).rejects.toThrow(/active_executor/i);
  });

  it('C8: under HARNESS_CERTIFICATION findings_recommended notes the harness-only residual', async () => {
    const result = await buildSuiteUnderHarness();
    const joined = result.findings_recommended.join(' | ');
    expect(joined).toMatch(/active product judgment adapter/i);
  });
});

// =============================================================================
// Class D — Report renderer
// =============================================================================

describe('P3-BTAR-005 — Class D — Report renderer', () => {
  it('D1: renders a non-empty markdown string', async () => {
    const result = await buildSuiteUnderHarness();
    const md = renderJudgmentTruthSuiteReportMarkdown(result);
    expect(typeof md).toBe('string');
    expect(md.length).toBeGreaterThan(0);
  });

  it('D2: report contains corpus size, execution mode, and claim level in identity section', async () => {
    const result = await buildSuiteUnderHarness();
    const md = renderJudgmentTruthSuiteReportMarkdown(result);
    expect(md).toContain('# Judgment Truth Suite Report');
    expect(md).toContain('`judgment-truth-suite-execution.v1`');
    expect(md).toContain('`HARNESS_CERTIFICATION`');
    expect(md).toContain('`HARNESS_ONLY`');
    expect(md).toContain(`Total episodes: **${result.corpus_size}**`);
  });

  it('D3: report enumerates every corpus episode by ID', async () => {
    const result = await buildSuiteUnderHarness();
    const md = renderJudgmentTruthSuiteReportMarkdown(result);
    for (const ep of result.episode_results) {
      expect(md).toContain(ep.episode_id);
    }
  });

  it('D4: report includes the no-real-API proof section', async () => {
    const result = await buildSuiteUnderHarness();
    const md = renderJudgmentTruthSuiteReportMarkdown(result);
    expect(md).toContain('## 13. No-Real-API Proof');
    expect(md).toContain('`no_real_provider_calls: true`');
    expect(md).toContain('assertNoRealProviderExecutor');
  });

  it('D5: report includes the honesty disclaimer', async () => {
    const result = await buildSuiteUnderHarness();
    const md = renderJudgmentTruthSuiteReportMarkdown(result);
    expect(md).toContain('## 14. Honesty Disclaimer');
    expect(md).toMatch(/does NOT claim/);
    expect(md).toMatch(/active production judgment engine/i);
  });

  it('D6: report includes check-level summary table', async () => {
    const result = await buildSuiteUnderHarness();
    const md = renderJudgmentTruthSuiteReportMarkdown(result);
    expect(md).toContain('## 6. Check-Level Summary');
    for (const c of result.check_summary) {
      expect(md).toContain(`\`${c.check_id}\``);
    }
  });
});

// =============================================================================
// Class E — Failure visibility (controlled bad executor)
//
// These tests use IN-TEST bad executors and the runner+semantic engine to
// prove that when an actual judgment is dangerously wrong, the suite
// surfaces CRITICAL_FAIL / FAIL through to the aggregate envelope AND
// the rendered report. This is the INV-01 honesty proof.
// =============================================================================

const SINGLE_EPISODE = SYNTHETIC_EPISODE_CORPUS.slice(0, 1);

function makeOverconfidentInverterExecutor(): SyntheticJudgmentExecutor {
  return {
    metadata: {
      executor_id: 'in-test-bad-executor-overconfident-inverter',
      executor_version: 'v1-test',
      uses_real_providers: false,
      uses_ai_model: false,
      deterministic: true,
    },
    execute: (episode: SyntheticEpisodeInput): SyntheticActualJudgment => ({
      // Dangerously wrong: claim fragile expansion is clean accumulation,
      // claim leverage is spot-led, drop every contradiction, and inflate
      // confidence to HIGH. Tests that the suite reports CRITICAL_FAIL.
      state: 'clean accumulation',
      cause_family: 'spot-led accumulation',
      thesis_direction: 'confirmed breakout with high confidence',
      thesis: `Overconfident inverter actual judgment for ${episode.episode_id}`,
      contradictions: [],
      timing_phase: 'EARLY',
      scenario_type: 'continuation if spot demand persists',
      confidence_band: 'HIGH',
      reasoning_notes: [],
    }),
  };
}

describe('P3-BTAR-005 — Class E — Failure visibility (controlled bad executor)', () => {
  it('E1: bad executor surfaces CRITICAL_FAIL on at least one episode', async () => {
    const result = await runJudgmentTruthSuite({
      episodes: SINGLE_EPISODE,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: makeOverconfidentInverterExecutor(),
    });
    expect(result.outcome_counts.CRITICAL_FAIL).toBeGreaterThanOrEqual(1);
  });

  it('E2: critical_episode_ids includes the badly-judged episode', async () => {
    const result = await runJudgmentTruthSuite({
      episodes: SINGLE_EPISODE,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: makeOverconfidentInverterExecutor(),
    });
    expect(result.critical_episode_ids).toContain(SINGLE_EPISODE[0].episode_id);
  });

  it('E3: rendered report does not hide the CRITICAL_FAIL — it appears in §10 Critical Failures', async () => {
    const result = await runJudgmentTruthSuite({
      episodes: SINGLE_EPISODE,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: makeOverconfidentInverterExecutor(),
    });
    const md = renderJudgmentTruthSuiteReportMarkdown(result);
    expect(md).toContain('## 10. Critical Failures');
    expect(md).toContain(SINGLE_EPISODE[0].episode_id);
    // Report should NOT degrade to "No CRITICAL_FAIL episodes." in this case.
    const section10Index = md.indexOf('## 10. Critical Failures');
    const section11Index = md.indexOf('## 11. Warnings');
    const section10 = md.slice(section10Index, section11Index);
    expect(section10).not.toContain('No CRITICAL_FAIL episodes.');
  });

  it('E4: ACTIVE_SYNTHETIC_ADAPTER + CRITICAL_FAIL adds P3-BTAR-006 finding recommendation', async () => {
    const result = await runJudgmentTruthSuite({
      episodes: SINGLE_EPISODE,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: makeOverconfidentInverterExecutor(),
    });
    const joined = result.findings_recommended.join(' | ');
    expect(joined).toMatch(/P3-BTAR-006/);
    expect(joined).toMatch(/Serious Judgment Flaw Remediation/i);
  });

  it('E5: ACTIVE_SYNTHETIC_ADAPTER mode reports active_judgment_engine_connected=true', async () => {
    const result = await runJudgmentTruthSuite({
      episodes: SINGLE_EPISODE,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: makeOverconfidentInverterExecutor(),
    });
    expect(result.active_judgment_engine_connected).toBe(true);
    expect(result.report_claim_level).toBe('ACTIVE_SYNTHETIC_JUDGMENT_EVALUATED');
  });
});

// =============================================================================
// Class F — No-provider discipline (mirrors P3-BTAR-002/003/004 pattern)
// =============================================================================

const FORBIDDEN_IMPORT_SUBSTRINGS: ReadonlyArray<string> = [
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
  'services/judgment/',
  'services/ai-service',
  'services/market-data',
  'src/l13',
  'src/l14',
];

function extractImportSpecifiers(source: string): string[] {
  const importSpecRegex = /import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g;
  const seen: string[] = [];
  for (let m = importSpecRegex.exec(source); m !== null; m = importSpecRegex.exec(source)) {
    seen.push(m[1]);
  }
  return seen;
}

describe('P3-BTAR-005 — Class F — No-provider discipline', () => {
  it('F1: this test file uses 0 vi.mock() invocations (real-invocation regex)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'judgment-truth-suite-execution.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    const realInvocation = /^[ \t]*vi\.mock\s*\(/m;
    expect(realInvocation.test(source)).toBe(false);
  });

  it('F2: this test file does not import any forbidden provider or surface module', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'judgment-truth-suite-execution.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    const specs = extractImportSpecifiers(source);
    const hits = specs.filter((spec) =>
      FORBIDDEN_IMPORT_SUBSTRINGS.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('F3: judgment-truth-suite-execution.ts source does not import any forbidden provider or surface module', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const enginePath = resolve(__dirname, '..', 'judgment-truth-suite-execution.ts');
    const source = readFileSync(enginePath, 'utf8');
    const specs = extractImportSpecifiers(source);
    const hits = specs.filter((spec) =>
      FORBIDDEN_IMPORT_SUBSTRINGS.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('F4: judgment-truth-suite-execution.types.ts source does not import any forbidden provider or surface module', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const typesPath = resolve(__dirname, '..', 'judgment-truth-suite-execution.types.ts');
    const source = readFileSync(typesPath, 'utf8');
    const specs = extractImportSpecifiers(source);
    const hits = specs.filter((spec) =>
      FORBIDDEN_IMPORT_SUBSTRINGS.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('F5: execution module source contains no process.env reads', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const enginePath = resolve(__dirname, '..', 'judgment-truth-suite-execution.ts');
    const source = readFileSync(enginePath, 'utf8');
    expect(source).not.toMatch(/process\.env/);
  });
});
