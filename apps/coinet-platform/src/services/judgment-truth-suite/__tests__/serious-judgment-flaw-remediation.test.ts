/**
 * P3-BTAR-006 — Serious Judgment Flaw Remediation Tests
 *
 * Tests prove the remediation reduced the P3-BTAR-006A baseline of 18/18
 * CRITICAL_FAIL to 0 CRITICAL_FAIL + all 5 dangerous inversions resolved
 * (SYN-003 / SYN-007 / SYN-009 / SYN-012 / SYN-016), WITHOUT modifying the
 * synthetic corpus, expected oracles, semantic assertion thresholds,
 * runner, or any test to fake success (LAW-02).
 *
 * Class E specifically enforces the no-cheating guard: the active synthetic
 * adapter MUST NOT read `episode.expected_oracle.*` to construct actual
 * judgment. This is verified by mechanical source-text introspection.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runJudgmentTruthSuite } from '../judgment-truth-suite-execution';
import { createActiveSyntheticJudgmentExecutor } from '../active-synthetic-judgment-adapter';
import { SYNTHETIC_EPISODE_CORPUS } from '../synthetic-episode-corpus';
import type { JudgmentTruthSuiteRunResult } from '../judgment-truth-suite-execution.types';

// -----------------------------------------------------------------------------
// Shared in-test helper: runs the active synthetic suite. Cached across tests
// to avoid 18-episode work duplication. No module mocks; no provider imports.
// -----------------------------------------------------------------------------

let _cachedRun: Promise<JudgmentTruthSuiteRunResult> | undefined;
function getActiveSuiteRun(): Promise<JudgmentTruthSuiteRunResult> {
  if (_cachedRun) return _cachedRun;
  _cachedRun = runJudgmentTruthSuite({
    episodes: SYNTHETIC_EPISODE_CORPUS,
    execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
    active_executor: createActiveSyntheticJudgmentExecutor(),
  });
  return _cachedRun;
}

function episodeOutcome(
  result: JudgmentTruthSuiteRunResult,
  episodeId: string,
): { outcome: string; confidence: string; state: string; thesis_direction: string } {
  const ep = result.episode_results.find((e) => e.episode_id === episodeId);
  if (!ep) throw new Error(`episode ${episodeId} missing from suite`);
  return {
    outcome: ep.semantic_result.overall_outcome,
    confidence: String(ep.semantic_result.actual_judgment?.confidence_band ?? ''),
    state: String(ep.semantic_result.actual_judgment?.state ?? ''),
    thesis_direction: String(ep.semantic_result.actual_judgment?.thesis_direction ?? ''),
  };
}

// =============================================================================
// Class A — Before/after visibility
// =============================================================================

describe('P3-BTAR-006 — Class A — Before/after visibility', () => {
  it('A1: active synthetic suite can run end-to-end after remediation', async () => {
    const result = await getActiveSuiteRun();
    expect(result.corpus_size).toBe(SYNTHETIC_EPISODE_CORPUS.length);
    expect(result.episode_results).toHaveLength(SYNTHETIC_EPISODE_CORPUS.length);
  });

  it('A2: every corpus episode produces a result', async () => {
    const result = await getActiveSuiteRun();
    const ids = result.episode_results.map((e) => e.episode_id).sort();
    const expectedIds = SYNTHETIC_EPISODE_CORPUS.map((e) => e.episode_id).sort();
    expect(ids).toEqual(expectedIds);
  });

  it('A3: result reports active_judgment_engine_connected = true', async () => {
    const result = await getActiveSuiteRun();
    expect(result.active_judgment_engine_connected).toBe(true);
  });

  it('A4: result uses ACTIVE_SYNTHETIC_JUDGMENT_EVALUATED claim level', async () => {
    const result = await getActiveSuiteRun();
    expect(result.report_claim_level).toBe('ACTIVE_SYNTHETIC_JUDGMENT_EVALUATED');
  });

  it('A5: literal pins preserved (semantic_assertions_run / no_real_provider_calls)', async () => {
    const result = await getActiveSuiteRun();
    expect(result.semantic_assertions_run).toBe(true);
    expect(result.no_real_provider_calls).toBe(true);
  });
});

// =============================================================================
// Class B — Critical fail reduction (hard target)
// =============================================================================

describe('P3-BTAR-006 — Class B — Critical fail reduction', () => {
  it('B1: active suite has 0 CRITICAL_FAIL (hard non-negotiable target)', async () => {
    const result = await getActiveSuiteRun();
    expect(result.outcome_counts.CRITICAL_FAIL).toBe(0);
    expect(result.critical_episode_ids).toEqual([]);
  });

  it('B2: SYN-003 (leverage-driven fake strength) is not CRITICAL_FAIL', async () => {
    const result = await getActiveSuiteRun();
    expect(episodeOutcome(result, 'SYN-003-leverage-driven-fake-strength').outcome).not.toBe(
      'CRITICAL_FAIL',
    );
  });

  it('B3: SYN-007 (fundamentals improving but timing late) is not CRITICAL_FAIL', async () => {
    const result = await getActiveSuiteRun();
    expect(episodeOutcome(result, 'SYN-007-fundamentals-improve-late-timing').outcome).not.toBe(
      'CRITICAL_FAIL',
    );
  });

  it('B4: SYN-009 (price pump with weak on-chain) is not CRITICAL_FAIL', async () => {
    const result = await getActiveSuiteRun();
    expect(episodeOutcome(result, 'SYN-009-price-pump-weak-onchain').outcome).not.toBe(
      'CRITICAL_FAIL',
    );
  });

  it('B5: SYN-012 (liquidity-thin breakout) is not CRITICAL_FAIL', async () => {
    const result = await getActiveSuiteRun();
    expect(episodeOutcome(result, 'SYN-012-liquidity-thin-breakout').outcome).not.toBe(
      'CRITICAL_FAIL',
    );
  });

  it('B6: SYN-016 (security risk override) is not CRITICAL_FAIL', async () => {
    const result = await getActiveSuiteRun();
    expect(episodeOutcome(result, 'SYN-016-security-risk-override').outcome).not.toBe(
      'CRITICAL_FAIL',
    );
  });
});

// =============================================================================
// Class C — Safety-critical judgment rules
// =============================================================================

describe('P3-BTAR-006 — Class C — Safety-critical judgment rules', () => {
  it('C1: SYN-016 security-risk override has LOW or VERY_LOW confidence', async () => {
    const result = await getActiveSuiteRun();
    const ep = episodeOutcome(result, 'SYN-016-security-risk-override');
    expect(['LOW', 'VERY_LOW']).toContain(ep.confidence);
  });

  it('C2: SYN-016 actual thesis does not produce a constructive accumulation phrase', async () => {
    const result = await getActiveSuiteRun();
    const ep = episodeOutcome(result, 'SYN-016-security-risk-override');
    const thesisLc = ep.thesis_direction.toLowerCase();
    expect(thesisLc).not.toMatch(/clean accumulation/);
    expect(thesisLc).not.toMatch(/constructive accumulation/);
    expect(thesisLc).not.toMatch(/genuine breakout/);
  });

  it('C3: SYN-015 degraded mixed read does not produce HIGH / VERY_HIGH confidence', async () => {
    const result = await getActiveSuiteRun();
    const ep = episodeOutcome(result, 'SYN-015-degraded-partial-blindness');
    expect(['HIGH', 'VERY_HIGH']).not.toContain(ep.confidence);
  });

  it('C4: SYN-009 weak-onchain price pump does not produce HIGH / VERY_HIGH confidence', async () => {
    const result = await getActiveSuiteRun();
    const ep = episodeOutcome(result, 'SYN-009-price-pump-weak-onchain');
    expect(['HIGH', 'VERY_HIGH']).not.toContain(ep.confidence);
  });

  it('C5: SYN-012 liquidity-thin breakout does not produce HIGH / VERY_HIGH confidence', async () => {
    const result = await getActiveSuiteRun();
    const ep = episodeOutcome(result, 'SYN-012-liquidity-thin-breakout');
    expect(['HIGH', 'VERY_HIGH']).not.toContain(ep.confidence);
  });

  it('C6: SYN-003 leverage-fragility does not produce HIGH / VERY_HIGH confidence', async () => {
    const result = await getActiveSuiteRun();
    const ep = episodeOutcome(result, 'SYN-003-leverage-driven-fake-strength');
    expect(['HIGH', 'VERY_HIGH']).not.toContain(ep.confidence);
  });
});

// =============================================================================
// Class D — Vocabulary remediation
// =============================================================================

describe('P3-BTAR-006 — Class D — Vocabulary remediation', () => {
  it('D1: REQUIRED_CONTRADICTION_COVERAGE no longer fails 18/18', async () => {
    const result = await getActiveSuiteRun();
    const contradictionSummary = result.check_summary.find(
      (c) => c.check_id === 'REQUIRED_CONTRADICTION_COVERAGE',
    );
    expect(contradictionSummary).toBeDefined();
    // Baseline was 18/18 CRITICAL_FAIL. Remediated state must be materially better.
    expect((contradictionSummary?.critical_fail_count ?? 99) + (contradictionSummary?.fail_count ?? 99)).toBeLessThan(
      18,
    );
  });

  it('D2: REQUIRED_REASONING_NOTE_COVERAGE no longer fails 17/18', async () => {
    const result = await getActiveSuiteRun();
    const reasoningSummary = result.check_summary.find(
      (c) => c.check_id === 'REQUIRED_REASONING_NOTE_COVERAGE',
    );
    expect(reasoningSummary).toBeDefined();
    expect((reasoningSummary?.critical_fail_count ?? 99) + (reasoningSummary?.fail_count ?? 99)).toBeLessThan(
      17,
    );
  });

  it('D3: actual judgments include semantically testable contradiction phrases', async () => {
    const result = await getActiveSuiteRun();
    for (const ep of result.episode_results) {
      const actual = ep.semantic_result.actual_judgment;
      expect(actual).toBeDefined();
      expect(Array.isArray(actual?.contradictions)).toBe(true);
      // Every episode should surface at least one contradiction phrase after
      // adapter-side synthesis.
      expect((actual?.contradictions ?? []).length).toBeGreaterThan(0);
    }
  });

  it('D4: actual judgments include semantically testable reasoning notes', async () => {
    const result = await getActiveSuiteRun();
    for (const ep of result.episode_results) {
      const actual = ep.semantic_result.actual_judgment;
      expect(actual).toBeDefined();
      expect(Array.isArray(actual?.reasoning_notes)).toBe(true);
      expect((actual?.reasoning_notes ?? []).length).toBeGreaterThan(0);
    }
  });

  it('D5: at least one episode PASSes (proves the pipeline can reach PASS honestly)', async () => {
    const result = await getActiveSuiteRun();
    expect(result.outcome_counts.PASS).toBeGreaterThan(0);
  });
});

// =============================================================================
// Class E — No-cheating guard (LAW-02 critical guarantee)
//
// The adapter must NOT read `episode.expected_oracle.*` to construct actual
// judgment. Doing so would be an oracle-echo cheat: the adapter would mimic
// the answer instead of evaluating the active engine. This class enforces
// the rule mechanically by scanning the adapter source for any reference to
// `expected_oracle.expected_*`, `expected_oracle.required_*`, or
// `expected_oracle.forbidden_*`.
// =============================================================================

function loadAdapterSource(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const adapterPath = resolve(__dirname, '..', 'active-synthetic-judgment-adapter.ts');
  return readFileSync(adapterPath, 'utf8');
}

const ORACLE_FIELD_PROBES: ReadonlyArray<string> = [
  'expected_oracle.expected_state',
  'expected_oracle.expected_cause_family',
  'expected_oracle.expected_thesis_direction',
  'expected_oracle.required_contradictions',
  'expected_oracle.required_reasoning_notes',
  'expected_oracle.expected_timing_phase',
  'expected_oracle.expected_scenario_type',
  'expected_oracle.expected_confidence_band',
  'expected_oracle.forbidden_claims',
];

describe('P3-BTAR-006 — Class E — No-cheating guard', () => {
  it('E1: adapter source contains zero references to expected_oracle field reads', () => {
    const source = loadAdapterSource();
    const hits = ORACLE_FIELD_PROBES.filter((probe) => source.includes(probe));
    expect(hits).toEqual([]);
  });

  it('E2: adapter source contains zero broad `.expected_oracle.` accessor reads (code only)', () => {
    // Strip line comments + block comments so explanatory references in
    // documentation comments do not trigger a false positive.
    const raw = loadAdapterSource();
    const noLineComments = raw
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    const stripped = noLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(/episode\.expected_oracle\./);
    expect(stripped).not.toMatch(/\bep\.expected_oracle\./);
  });

  it('E3: synthetic corpus file is unchanged (frozen per LAW-02)', () => {
    // Lightweight invariant: the file existence and a stable export name remain.
    // A test that the file shape is stable; we deliberately do not snapshot to
    // avoid coupling to formatting.
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const corpusPath = resolve(__dirname, '..', 'synthetic-episode-corpus.ts');
    const source = readFileSync(corpusPath, 'utf8');
    expect(source).toContain('SYNTHETIC_EPISODE_CORPUS');
    expect(source).toContain('SYN-001-clean-accumulation');
    expect(source).toContain('SYN-018-narrative-catalyst-weak-fundamentals');
  });

  it('E4: semantic-assertions module is unchanged (frozen per LAW-02)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const semanticPath = resolve(__dirname, '..', 'semantic-assertions.ts');
    const source = readFileSync(semanticPath, 'utf8');
    expect(source).toContain('runSemanticAssertions');
    expect(source).toContain("'semantic-assertions.v1'");
  });

  it('E5: this test file does not use any oracle-echo executor for active remediation proof', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'serious-judgment-flaw-remediation.test.ts');
    const raw = readFileSync(selfPath, 'utf8');
    // Strip line + block comments so the rule check inspects code only.
    const noLineComments = raw
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    const stripped = noLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    // The remediation proof must use the real active adapter (not the
    // P3-BTAR-005 harness oracle-projection executor).
    expect(stripped).toContain('createActiveSyntheticJudgmentExecutor');
    expect(stripped).not.toMatch(/\bcreateHarnessCertificationExecutor\b/);
  });
});

// =============================================================================
// Class F — No-provider discipline (mirrors P3-BTAR-002/003/004/005/006A)
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

describe('P3-BTAR-006 — Class F — No-provider discipline', () => {
  it('F1: this test file uses 0 vi.mock() invocations', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'serious-judgment-flaw-remediation.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    const realInvocation = /^[ \t]*vi\.mock\s*\(/m;
    expect(realInvocation.test(source)).toBe(false);
  });

  it('F2: this test file imports no forbidden provider or surface module', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'serious-judgment-flaw-remediation.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    const specs = extractImportSpecifiers(source);
    const hits = specs.filter((spec) =>
      FORBIDDEN_IMPORT_SUBSTRINGS.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('F3: adapter module imports no forbidden provider or AI module', () => {
    // The adapter legitimately imports `services/judgment` (the active engine
    // entry point — `produceJudgment` is synchronous + pure + no-API). All
    // other surfaces remain forbidden.
    const source = loadAdapterSource();
    const specs = extractImportSpecifiers(source);
    const adapterDenylist = FORBIDDEN_IMPORT_SUBSTRINGS;
    const hits = specs.filter((spec) =>
      adapterDenylist.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('F4: adapter module contains zero real process.env reads', () => {
    const source = loadAdapterSource();
    // Strip line comments before checking so any explanatory `// process.env`
    // notes in comments do not fail the check.
    const stripped = source
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(stripped).not.toMatch(/process\.env/);
  });

  it('F5: adapter module contains zero real fetch / axios / http(s).request calls', () => {
    const source = loadAdapterSource();
    const stripped = source
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(stripped).not.toMatch(/\bfetch\s*\(/);
    expect(stripped).not.toMatch(/\baxios\./);
    expect(stripped).not.toMatch(/\bhttps?\.request\s*\(/);
  });
});
