/**
 * P3-BTAR-001 — Synthetic Episode Fixture + Validation Tests
 *
 * This is a Phase 3 synthetic episode contract + starter fixtures + validation suite.
 * It does NOT run any judgment engine. It does NOT compare judgment output.
 * No real APIs, no provider keys, no fan-out behavior change.
 *
 * Authority:
 *   - Plan 3.0 §6–§8 (contract + episode + oracle concepts)
 *   - Plan 3.0 §12 (no-API rule)
 *   - P3-BTAR-001 §10 (test plan)
 *
 * Discipline:
 *   - 0 module mocks (no vi.mock).
 *   - 0 provider imports.
 *   - 0 import of chat/service.ts, services/judgment/*, services/ai-service.ts.
 *   - 0 import of src/l13/ or src/l14/.
 */

import { describe, expect, it } from 'vitest';

import {
  FORBIDDEN_PROVIDER_PAYLOAD_KEYS,
  assertSyntheticEpisodeCorpusValid,
  validateSyntheticEpisode,
  validateSyntheticEpisodeCorpus,
} from '../synthetic-episode-validation';
import {
  STARTER_SYNTHETIC_EPISODE_CORPUS,
  SYN_001_CLEAN_ACCUMULATION,
  SYN_002_LEVERAGE_FRAGILITY,
  SYN_003_DEGRADED_MIXED_READ,
  SYN_004_UNLOCK_RISK_DISTRIBUTION,
  SYN_005_SENTIMENT_ONLY_PUMP,
} from '../synthetic-episode-fixtures';
import type { SyntheticEpisodeInput } from '../synthetic-episode.types';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function cloneEpisode(ep: SyntheticEpisodeInput): SyntheticEpisodeInput {
  // deterministic deep clone, no JSON tricks that drop undefined optional fields oddly
  return JSON.parse(JSON.stringify(ep)) as SyntheticEpisodeInput;
}

function findKeyDeep(value: unknown, target: string, seen = new WeakSet()): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;
  if (seen.has(value as object)) return false;
  seen.add(value as object);
  if (Array.isArray(value)) {
    return value.some((item) => findKeyDeep(item, target, seen));
  }
  const obj = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(obj, target)) return true;
  return Object.values(obj).some((v) => findKeyDeep(v, target, seen));
}

// -----------------------------------------------------------------------------
// Class A — starter corpus shape
// -----------------------------------------------------------------------------

describe('synthetic episode starter corpus — shape', () => {
  it('A1: starter corpus exists', () => {
    expect(STARTER_SYNTHETIC_EPISODE_CORPUS).toBeDefined();
    expect(Array.isArray(STARTER_SYNTHETIC_EPISODE_CORPUS)).toBe(true);
  });

  it('A2: starter corpus has 3–5 episodes', () => {
    expect(STARTER_SYNTHETIC_EPISODE_CORPUS.length).toBeGreaterThanOrEqual(3);
    expect(STARTER_SYNTHETIC_EPISODE_CORPUS.length).toBeLessThanOrEqual(5);
  });

  it('A3: every fixture has a unique episode_id', () => {
    const ids = STARTER_SYNTHETIC_EPISODE_CORPUS.map((e) => e.episode_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('A4: every fixture passes validation', () => {
    for (const ep of STARTER_SYNTHETIC_EPISODE_CORPUS) {
      const result = validateSyntheticEpisode(ep);
      expect(result.valid, `episode ${ep.episode_id} should be valid; errors=${result.errors.join(' | ')}`).toBe(true);
    }
  });

  it('A5: assertSyntheticEpisodeCorpusValid does NOT throw on starter corpus', () => {
    expect(() => assertSyntheticEpisodeCorpusValid([...STARTER_SYNTHETIC_EPISODE_CORPUS])).not.toThrow();
  });
});

// -----------------------------------------------------------------------------
// Class B — per-episode oracle properties (semantic shape, not engine output)
// -----------------------------------------------------------------------------

describe('synthetic episode oracle properties', () => {
  it('B1: SYN-001 clean accumulation oracle is constructive but capped (not VERY_HIGH)', () => {
    const oracle = SYN_001_CLEAN_ACCUMULATION.expected_oracle;
    expect(oracle.expected_state.toLowerCase()).toContain('accumulation');
    expect(oracle.expected_timing_phase).toBe('EARLY');
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(oracle.expected_confidence_band);
    expect(oracle.expected_confidence_band).not.toBe('VERY_HIGH');
    // forbidden claims block overclaim
    const forbidden = oracle.forbidden_claims.join(' ').toLowerCase();
    expect(forbidden).toMatch(/confirmed|guaranteed|must buy/);
  });

  it('B2: SYN-002 leverage fragility oracle has derivatives-vs-spot contradiction + capped confidence', () => {
    const oracle = SYN_002_LEVERAGE_FRAGILITY.expected_oracle;
    expect(oracle.expected_state.toLowerCase()).toContain('fragile');
    expect(oracle.expected_cause_family.toLowerCase()).toContain('leverage');
    const contradictionsBlob = oracle.required_contradictions.join(' ').toLowerCase();
    expect(contradictionsBlob).toMatch(/derivatives.*spot|spot.*derivatives/);
    expect(['VERY_LOW', 'LOW', 'MEDIUM']).toContain(oracle.expected_confidence_band);
    expect(oracle.forbidden_claims.map((c) => c.toLowerCase())).toContain('clean accumulation');
  });

  it('B3: SYN-003 degraded mixed read declares degraded components + confidence-cap note', () => {
    const ep = SYN_003_DEGRADED_MIXED_READ;
    expect(ep.degraded_components.length).toBeGreaterThan(0);
    const notes = ep.expected_oracle.required_reasoning_notes.join(' ').toLowerCase();
    expect(notes).toMatch(/degraded.*confidence|confidence.*degraded|caps confidence/);
    expect(['VERY_LOW', 'LOW', 'MEDIUM']).toContain(ep.expected_oracle.expected_confidence_band);
  });

  it('B4: SYN-004 unlock-risk distribution oracle emphasizes the unlock event', () => {
    const ep = SYN_004_UNLOCK_RISK_DISTRIBUTION;
    expect(ep.signals.event_context?.event_type).toBe('UNLOCK');
    const scenarioBlob = ep.expected_oracle.expected_scenario_type.toLowerCase();
    expect(scenarioBlob).toContain('unlock');
    expect(ep.expected_oracle.expected_timing_phase).toBe('LATE');
  });
});

// -----------------------------------------------------------------------------
// Class C — validation error paths
// -----------------------------------------------------------------------------

describe('validateSyntheticEpisode — error paths', () => {
  it('C1: missing episode_id fails', () => {
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    (broken as { episode_id: string }).episode_id = '';
    const result = validateSyntheticEpisode(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/episode_id/);
  });

  it('C2: missing required signal group fails', () => {
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    // Remove a required signal group
    delete (broken.signals as Partial<typeof broken.signals>).derivatives;
    const result = validateSyntheticEpisode(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/signals\.derivatives/);
  });

  it('C3: missing expected_oracle fails', () => {
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    delete (broken as Partial<SyntheticEpisodeInput>).expected_oracle;
    const result = validateSyntheticEpisode(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/expected_oracle/);
  });

  it('C4: empty required_contradictions fails', () => {
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    broken.expected_oracle.required_contradictions = [];
    const result = validateSyntheticEpisode(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/required_contradictions/);
  });

  it('C5: missing tags fails', () => {
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    broken.tags = [];
    const result = validateSyntheticEpisode(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/tags/);
  });
});

// -----------------------------------------------------------------------------
// Class D — corpus-level validation
// -----------------------------------------------------------------------------

describe('validateSyntheticEpisodeCorpus + assertSyntheticEpisodeCorpusValid', () => {
  it('D1: corpus validation detects duplicate episode_ids', () => {
    const dupe = cloneEpisode(SYN_002_LEVERAGE_FRAGILITY);
    dupe.episode_id = SYN_001_CLEAN_ACCUMULATION.episode_id; // force collision
    const results = validateSyntheticEpisodeCorpus([SYN_001_CLEAN_ACCUMULATION, dupe]);
    const dupErrors = results.flatMap((r) => r.errors).filter((e) => /duplicate episode_id/.test(e));
    expect(dupErrors.length).toBeGreaterThan(0);
    expect(results.every((r) => r.valid)).toBe(false);
  });

  it('D2: assertSyntheticEpisodeCorpusValid throws on invalid corpus', () => {
    const broken = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    (broken as { episode_id: string }).episode_id = '';
    expect(() => assertSyntheticEpisodeCorpusValid([broken])).toThrow(/assertSyntheticEpisodeCorpusValid/);
  });
});

// -----------------------------------------------------------------------------
// Class E — no-real-provider proofs
// -----------------------------------------------------------------------------

describe('no real provider payload / no real API keys', () => {
  it('E1: no starter fixture contains any forbidden real-provider payload key', () => {
    for (const ep of [
      ...STARTER_SYNTHETIC_EPISODE_CORPUS,
      SYN_005_SENTIMENT_ONLY_PUMP, // also covers the optional, unused-by-corpus fixture
    ]) {
      for (const forbidden of FORBIDDEN_PROVIDER_PAYLOAD_KEYS) {
        expect(
          findKeyDeep(ep, forbidden),
          `fixture ${ep.episode_id} contains forbidden key "${forbidden}"`,
        ).toBe(false);
      }
    }
  });

  it('E2: no starter fixture requires a real provider API key (no env reads in fixtures)', () => {
    // Fixtures are pure data; we simply confirm they remain valid even when
    // every common provider env var is removed from process.env for this scope.
    const PROVIDER_ENV_VARS = [
      'OPENAI_API_KEY',
      'GROK_API_KEY',
      'XAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'COINGECKO_API_KEY',
      'COINGLASS_API_KEY',
      'NANSEN_API_KEY',
      'ARKHAM_API_KEY',
      'ALCHEMY_API_KEY',
      'QUICKNODE_API_KEY',
      'TWITTER_BEARER_TOKEN',
      'LUNARCRUSH_API_KEY',
      'CRYPTOPANIC_API_KEY',
    ];
    const saved: Record<string, string | undefined> = {};
    for (const key of PROVIDER_ENV_VARS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    try {
      for (const ep of STARTER_SYNTHETIC_EPISODE_CORPUS) {
        const result = validateSyntheticEpisode(ep);
        expect(result.valid, `episode ${ep.episode_id} must validate without any provider env`).toBe(true);
      }
    } finally {
      for (const key of PROVIDER_ENV_VARS) {
        if (saved[key] !== undefined) process.env[key] = saved[key];
      }
    }
  });
});

// -----------------------------------------------------------------------------
// Class F — warning surface (non-blocking)
// -----------------------------------------------------------------------------

describe('validateSyntheticEpisode — warnings (non-blocking)', () => {
  it('F1: missing event_context emits a warning but does not invalidate', () => {
    const ep = cloneEpisode(SYN_003_DEGRADED_MIXED_READ); // SYN-003 has no event_context
    const result = validateSyntheticEpisode(ep);
    expect(result.valid).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/event_context/);
  });

  it('F2: VERY_HIGH confidence emits a warning', () => {
    const ep = cloneEpisode(SYN_001_CLEAN_ACCUMULATION);
    ep.expected_oracle.expected_confidence_band = 'VERY_HIGH';
    const result = validateSyntheticEpisode(ep);
    expect(result.valid).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/VERY_HIGH/);
  });
});
