/**
 * P3-BTAR-006A — Active Synthetic Judgment Adapter Tests
 *
 * Six test classes (A–F) mirroring the P3-BTAR-006A §13 spec. 0 module
 * mocks. The "no-provider" Class F intentionally ALLOWS the adapter to
 * import `services/judgment/` (that is the entire point of the bridge);
 * it forbids only real-provider / AI / market-data / chat / ai-service
 * imports.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createActiveSyntheticJudgmentExecutor,
  inspectActiveSyntheticJudgmentAdapterReadiness,
  mapActiveJudgmentToSyntheticActualJudgment,
  mapSyntheticEpisodeToActiveJudgmentInput,
} from '../active-synthetic-judgment-adapter';
import { SYNTHETIC_EPISODE_CORPUS } from '../synthetic-episode-corpus';
import type { SyntheticEpisodeInput } from '../synthetic-episode.types';
import { runJudgmentTruthSuite } from '../judgment-truth-suite-execution';
import { produceJudgment } from '../../judgment';

// =============================================================================
// Class A — Inspection
// =============================================================================

describe('P3-BTAR-006A — Class A — Readiness inspection', () => {
  it('A1: returns a structured ADAPTER_READY result', () => {
    const r = inspectActiveSyntheticJudgmentAdapterReadiness();
    expect(r.policy_version).toBe('active-synthetic-judgment-adapter.v1');
    expect(r.status).toBe('ADAPTER_READY');
    expect(r.accepts_synthetic_input).toBe(true);
  });

  it('A2: declares requires_real_providers/uses_ai_model/requires_database_state as literal false', () => {
    const r = inspectActiveSyntheticJudgmentAdapterReadiness();
    expect(r.requires_real_providers).toBe(false);
    expect(r.requires_ai_model).toBe(false);
    expect(r.requires_database_state).toBe(false);
  });

  it('A3: reports active entrypoint name and path', () => {
    const r = inspectActiveSyntheticJudgmentAdapterReadiness();
    expect(r.active_entrypoint_name).toBe('produceJudgment');
    expect(r.active_entrypoint_path).toBe('src/services/judgment/index.ts');
  });

  it('A4: blockers array is empty under ADAPTER_READY status', () => {
    const r = inspectActiveSyntheticJudgmentAdapterReadiness();
    expect(r.blockers).toEqual([]);
  });

  it('A5: risks array is non-empty (honest mapping risks disclosed)', () => {
    const r = inspectActiveSyntheticJudgmentAdapterReadiness();
    expect(r.risks.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Class B — Synthetic episode -> active input mapping
// =============================================================================

describe('P3-BTAR-006A — Class B — Synthetic episode -> active input mapping', () => {
  it('B1: maps SYN-001 clean accumulation into a valid SignalSnapshot', () => {
    const ep = SYNTHETIC_EPISODE_CORPUS.find((e) =>
      e.episode_id.startsWith('SYN-001'),
    ) as SyntheticEpisodeInput;
    const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
    expect(input.entity_id).toBe(`synthetic:${ep.episode_id}`);
    expect(input.signals.data_completeness).toBeGreaterThan(0.7);
    expect(input.signals.unlock_pressure).toBeLessThan(0.5);
    expect(input.signals.security_risk).toBeLessThan(0.5);
  });

  it('B2: leverage fragility (SYN-003) preserves leverage_pressure + funding_rate as elevated', () => {
    const ep = SYNTHETIC_EPISODE_CORPUS.find((e) =>
      e.episode_id.startsWith('SYN-003'),
    ) as SyntheticEpisodeInput;
    const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
    expect(input.signals.leverage_pressure).toBeGreaterThanOrEqual(0.55);
    expect(input.signals.funding_rate).toBeGreaterThanOrEqual(0.5);
  });

  it('B3: degraded episode (SYN-015) reduces data_completeness + data_freshness', () => {
    const ep = SYNTHETIC_EPISODE_CORPUS.find((e) =>
      e.episode_id.startsWith('SYN-015'),
    ) as SyntheticEpisodeInput;
    const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
    expect(input.signals.data_completeness).toBeLessThanOrEqual(0.85);
    expect(input.signals.data_freshness).toBeLessThanOrEqual(0.85);
  });

  it('B4: security-risk episode (SYN-016) lifts security_risk', () => {
    const ep = SYNTHETIC_EPISODE_CORPUS.find((e) =>
      e.episode_id.startsWith('SYN-016'),
    ) as SyntheticEpisodeInput;
    const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
    expect(input.signals.security_risk).toBeGreaterThanOrEqual(0.5);
  });

  it('B5: mapping does not mutate the original episode (deep equality preserved)', () => {
    const ep = SYNTHETIC_EPISODE_CORPUS[0];
    const before = JSON.stringify(ep);
    mapSyntheticEpisodeToActiveJudgmentInput(ep);
    const after = JSON.stringify(ep);
    expect(after).toBe(before);
  });

  it('B6: every SignalSnapshot field is finite in [0,1] (no NaN / out-of-range leakage)', () => {
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const { signals } = mapSyntheticEpisodeToActiveJudgmentInput(ep);
      const numericKeys = Object.keys(signals).filter(
        (k) => k !== 'pair_age_hours' && k !== '_missing',
      );
      for (const k of numericKeys) {
        const v = (signals as Record<string, unknown>)[k] as number;
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

// =============================================================================
// Class C — Active output -> SyntheticActualJudgment mapping
// =============================================================================

describe('P3-BTAR-006A — Class C — Active output -> SyntheticActualJudgment mapping', () => {
  it('C1: produces a non-empty state phrase for every corpus episode', () => {
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
      const out = produceJudgment(input);
      const actual = mapActiveJudgmentToSyntheticActualJudgment(out, ep);
      expect(typeof actual.state).toBe('string');
      expect(actual.state.length).toBeGreaterThan(0);
    }
  });

  it('C2: confidence_band falls in the ExpectedConfidenceBand range', () => {
    const allowed = new Set(['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']);
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
      const out = produceJudgment(input);
      const actual = mapActiveJudgmentToSyntheticActualJudgment(out, ep);
      expect(allowed.has(String(actual.confidence_band))).toBe(true);
    }
  });

  it('C3: timing_phase falls in the ExpectedTimingPhase range', () => {
    const allowed = new Set(['EARLY', 'MID', 'LATE', 'EXHAUSTED', 'INVALIDATING', 'UNCLEAR']);
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
      const out = produceJudgment(input);
      const actual = mapActiveJudgmentToSyntheticActualJudgment(out, ep);
      expect(allowed.has(String(actual.timing_phase))).toBe(true);
    }
  });

  it('C4: degraded episodes preserve the "degraded data caps confidence" reasoning note', () => {
    const degraded = SYNTHETIC_EPISODE_CORPUS.filter(
      (e) => (e.degraded_components || []).length > 0,
    );
    expect(degraded.length).toBeGreaterThan(0);
    for (const ep of degraded) {
      const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
      const out = produceJudgment(input);
      const actual = mapActiveJudgmentToSyntheticActualJudgment(out, ep);
      const joined = actual.reasoning_notes.join(' | ').toLowerCase();
      expect(joined).toContain('degraded');
    }
  });

  it('C5: contradictions array is preserved from active engine output', () => {
    let foundAny = false;
    for (const ep of SYNTHETIC_EPISODE_CORPUS) {
      const input = mapSyntheticEpisodeToActiveJudgmentInput(ep);
      const out = produceJudgment(input);
      const actual = mapActiveJudgmentToSyntheticActualJudgment(out, ep);
      expect(Array.isArray(actual.contradictions)).toBe(true);
      if (actual.contradictions.length > 0) foundAny = true;
    }
    // The corpus is contradiction-rich; at least one episode should surface a contradiction.
    expect(foundAny).toBe(true);
  });
});

// =============================================================================
// Class D — Executor behavior
// =============================================================================

describe('P3-BTAR-006A — Class D — Executor behavior', () => {
  it('D1: createActiveSyntheticJudgmentExecutor returns a valid SyntheticJudgmentExecutor', () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    expect(typeof exec.execute).toBe('function');
    expect(exec.metadata.executor_id).toBe('active-synthetic-judgment-adapter');
    expect(exec.metadata.executor_version).toBe('v1');
  });

  it('D2: executor metadata pins uses_real_providers = false', () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    expect(exec.metadata.uses_real_providers).toBe(false);
  });

  it('D3: executor metadata pins uses_ai_model = false', () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    expect(exec.metadata.uses_ai_model).toBe(false);
  });

  it('D4: executor metadata pins deterministic = true', () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    expect(exec.metadata.deterministic).toBe(true);
  });

  it('D5: executor runs one episode and returns SyntheticActualJudgment shape', async () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    const ep = SYNTHETIC_EPISODE_CORPUS[0];
    const out = await Promise.resolve(exec.execute(ep));
    expect(typeof out.state).toBe('string');
    expect(typeof out.cause_family).toBe('string');
    expect(typeof out.thesis_direction).toBe('string');
    expect(typeof out.thesis).toBe('string');
    expect(Array.isArray(out.contradictions)).toBe(true);
    expect(typeof out.timing_phase).toBe('string');
    expect(typeof out.scenario_type).toBe('string');
    expect(typeof out.confidence_band).toBe('string');
    expect(Array.isArray(out.reasoning_notes)).toBe(true);
  });
});

// =============================================================================
// Class E — Full corpus through truth-suite execution (ACTIVE_SYNTHETIC_ADAPTER)
// =============================================================================

describe('P3-BTAR-006A — Class E — Full corpus through truth-suite execution', () => {
  it('E1: full 18-episode corpus runs through ACTIVE_SYNTHETIC_ADAPTER mode', async () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    const result = await runJudgmentTruthSuite({
      episodes: SYNTHETIC_EPISODE_CORPUS,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: exec,
    });
    expect(result.corpus_size).toBe(SYNTHETIC_EPISODE_CORPUS.length);
    expect(result.episode_results).toHaveLength(SYNTHETIC_EPISODE_CORPUS.length);
  });

  it('E2: ACTIVE_SYNTHETIC_ADAPTER reports active_judgment_engine_connected = true', async () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    const result = await runJudgmentTruthSuite({
      episodes: SYNTHETIC_EPISODE_CORPUS,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: exec,
    });
    expect(result.active_judgment_engine_connected).toBe(true);
    expect(result.report_claim_level).toBe('ACTIVE_SYNTHETIC_JUDGMENT_EVALUATED');
  });

  it('E3: aggregate envelope still pins semantic_assertions_run = true and no_real_provider_calls = true', async () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    const result = await runJudgmentTruthSuite({
      episodes: SYNTHETIC_EPISODE_CORPUS,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: exec,
    });
    expect(result.semantic_assertions_run).toBe(true);
    expect(result.no_real_provider_calls).toBe(true);
  });

  it('E4: outcome counts sum to corpus_size (no episode lost)', async () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    const result = await runJudgmentTruthSuite({
      episodes: SYNTHETIC_EPISODE_CORPUS,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: exec,
    });
    const sum =
      result.outcome_counts.PASS +
      result.outcome_counts.WARNING +
      result.outcome_counts.FAIL +
      result.outcome_counts.CRITICAL_FAIL;
    expect(sum).toBe(result.corpus_size);
  });

  it('E5: every per-episode semantic result is run (semantic_assertions_run = true on each)', async () => {
    const exec = createActiveSyntheticJudgmentExecutor();
    const result = await runJudgmentTruthSuite({
      episodes: SYNTHETIC_EPISODE_CORPUS,
      execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER',
      active_executor: exec,
    });
    for (const ep of result.episode_results) {
      expect(ep.semantic_result.semantic_assertions_run).toBe(true);
      expect(ep.semantic_result.no_real_provider_calls).toBe(true);
    }
  });
});

// =============================================================================
// Class F — No-provider discipline
//
// IMPORTANT: This BTAR LEGITIMATELY imports `../judgment` (services/judgment).
// The whole point of the bridge is to call the active engine. So the
// forbidden-substring list here EXCLUDES `services/judgment/` and `judgment`,
// but still rejects real-provider / AI / market-data / chat / ai-service /
// L13 / L14 imports.
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

describe('P3-BTAR-006A — Class F — No-provider discipline', () => {
  it('F1: this test file uses 0 vi.mock() invocations (real-invocation regex)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'active-synthetic-judgment-adapter.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    const realInvocation = /^[ \t]*vi\.mock\s*\(/m;
    expect(realInvocation.test(source)).toBe(false);
  });

  it('F2: this test file does not import any provider / AI / chat / ai-service / market-data / L13 / L14', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const selfPath = resolve(__dirname, 'active-synthetic-judgment-adapter.test.ts');
    const source = readFileSync(selfPath, 'utf8');
    const specs = extractImportSpecifiers(source);
    const hits = specs.filter((spec) =>
      FORBIDDEN_IMPORT_SUBSTRINGS.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('F3: adapter module source does not import any provider / AI / chat / ai-service / market-data / L13 / L14', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const adapterPath = resolve(__dirname, '..', 'active-synthetic-judgment-adapter.ts');
    const source = readFileSync(adapterPath, 'utf8');
    const specs = extractImportSpecifiers(source);
    const hits = specs.filter((spec) =>
      FORBIDDEN_IMPORT_SUBSTRINGS.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('F4: adapter types module source does not import any provider / AI / chat / ai-service / market-data / L13 / L14', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const typesPath = resolve(__dirname, '..', 'active-synthetic-judgment-adapter.types.ts');
    const source = readFileSync(typesPath, 'utf8');
    const specs = extractImportSpecifiers(source);
    const hits = specs.filter((spec) =>
      FORBIDDEN_IMPORT_SUBSTRINGS.some((needle) => spec.toLowerCase().includes(needle)),
    );
    expect(hits).toEqual([]);
  });

  it('F5: adapter module source contains no real process.env reads (excluding plain-text comment mentions)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const adapterPath = resolve(__dirname, '..', 'active-synthetic-judgment-adapter.ts');
    const source = readFileSync(adapterPath, 'utf8');
    // Strip line comments and block comments so the disclosure prose in the
    // adapter ("0 process.env reads") does not trigger this guard. The check
    // remains strict against any actual `process.env.` expression in code.
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/process\.env\b/);
  });

  it('F6: adapter module source contains no real fetch() / axios. / http.request() invocations', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const adapterPath = resolve(__dirname, '..', 'active-synthetic-judgment-adapter.ts');
    const source = readFileSync(adapterPath, 'utf8');
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/\bfetch\s*\(/);
    expect(stripped).not.toMatch(/\baxios\s*\./);
    expect(stripped).not.toMatch(/\bhttp\.request\s*\(/);
    expect(stripped).not.toMatch(/\bhttps\.request\s*\(/);
  });
});
