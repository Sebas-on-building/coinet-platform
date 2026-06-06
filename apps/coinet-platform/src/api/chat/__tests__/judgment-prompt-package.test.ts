/**
 * BTAR-004 — CoinetJudgmentPromptPackage Unit Tests
 *
 * Authority:
 *   Plan 2.1 §4 (availability law) / §7 (TF as test oracle)
 *   Plan 2.2 §14 (test boundary)
 *   BTAR-004 §14.1 (this test file)
 *
 * Test boundary discipline (Plan 2.2 §14.3):
 *   No real provider calls occurred. This file contains pure unit tests of
 *   the deterministic package builder, renderer, and invariant assertion. No
 *   chat-service import, no AI-service import, no external-API client.
 */

import { describe, it, expect } from 'vitest';

import {
  buildCoinetJudgmentPromptPackage,
  renderCoinetJudgmentPromptPackageForAI,
  assertCoinetJudgmentPromptPackageInvariants,
} from '../judgment-prompt-package';
import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
} from '../judgment-availability';
import type { CoinetJudgmentPromptPackage } from '../judgment-prompt-package.types';

describe('CoinetJudgmentPromptPackage (BTAR-004)', () => {
  // ── Builder: AVAILABLE ──────────────────────────────────────────────────
  describe('builder — AVAILABLE', () => {
    it('returns policy_version coinet-judgment-prompt-package.v1', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.policy_version).toBe('coinet-judgment-prompt-package.v1');
    });

    it('includes judgment fields when they exist on the input', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: {
          state: { primary: 'Accumulation' },
          thesis: { primary: { hypothesis: 'Trend reversal in early stage' } },
          contradictions: { items: [{}, {}] },
          confidence: { overall: 0.62 },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.judgment?.state).toBe('Accumulation');
      expect(pkg.judgment?.thesis).toBe('Trend reversal in early stage');
      expect(pkg.judgment?.contradiction_summary).toContain('2 contradiction');
      expect(pkg.judgment?.confidence_band).toContain('MODERATE');
    });

    // Phase 1 regression lock — cause/scenario must be projected from the REAL
    // JudgmentOutput shape (cause = drivers + dominant_cluster; scenario =
    // base_case + branches), not the legacy cause.primary.summary /
    // scenario.primary.summary paths that never existed on the engine output.
    it('projects cause from the dominant-cluster driver and scenario from base_case', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: {
          state: { primary: 'thin_liquidity_risk' },
          cause: {
            dominant_cluster: 'structural_fragility',
            secondary_cluster: 'leverage_expansion',
            positive_drivers: [
              { family: 'leverage_expansion', strength: 0.4, summary: 'open interest building' },
            ],
            negative_drivers: [
              { family: 'structural_fragility', strength: 0.8, summary: 'forced de-leveraging into thin books' },
            ],
          },
          scenario: {
            base_case: 'continuation risk if support breaks',
            bullish_confirmation: 'reclaim of range high',
            bearish_failure: 'support loss on rising liquidations',
            next_trigger: 'funding reset',
          },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      // dominant_cluster (structural_fragility) wins over the higher-listed driver
      expect(pkg.judgment?.cause).toBe('forced de-leveraging into thin books');
      expect(pkg.judgment?.scenario_summary).toBe('continuation risk if support breaks');
    });

    it('falls back to highest-strength driver, then dominant_cluster label, for cause', () => {
      // No driver matches dominant_cluster → highest-strength driver summary wins.
      const byStrength = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: {
          cause: {
            dominant_cluster: 'spot_demand',
            positive_drivers: [
              { family: 'narrative_acceleration', strength: 0.3, summary: 'social buzz rising' },
              { family: 'liquidity_emergence', strength: 0.9, summary: 'fresh liquidity forming' },
            ],
            negative_drivers: [],
          },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(byStrength.judgment?.cause).toBe('fresh liquidity forming');

      // No driver summaries at all → dominant_cluster value used as a label.
      const byLabel = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: {
          cause: { dominant_cluster: 'distribution_pressure', positive_drivers: [], negative_drivers: [] },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(byLabel.judgment?.cause).toBe('distribution_pressure');
    });

    it('falls back to next_trigger when scenario.base_case is absent', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: { scenario: { next_trigger: 'awaiting volume confirmation' } },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.judgment?.scenario_summary).toBe('awaiting volume confirmation');
    });

    it('does not project cause/scenario from the legacy primary.summary shape', () => {
      // The shape the buggy projector used to read must now yield nothing —
      // proving the fix reads the real engine paths, not the fabricated ones.
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: {
          cause: { primary: { summary: 'legacy cause' } },
          scenario: { primary: { summary: 'legacy scenario' } },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.judgment?.cause).toBeUndefined();
      expect(pkg.judgment?.scenario_summary).toBeUndefined();
    });

    it('forbidden_claims includes financial-advice restriction', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.expression_rules.forbidden_claims.join('\n')).toMatch(
        /financial advice/i,
      );
    });

    it('forbidden_claims includes invented-evidence restriction', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.expression_rules.forbidden_claims.join('\n')).toMatch(
        /invent evidence/i,
      );
    });

    it('judgment_status is AVAILABLE', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.judgment_status).toBe('AVAILABLE');
    });
  });

  // ── Builder: DEGRADED ───────────────────────────────────────────────────
  describe('builder — DEGRADED', () => {
    it('sets degradation.disclosure_required = true', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createDegradedJudgmentState({
          reason: 'PARTIAL_CONTEXT_FAILURE',
          component: 'sentiment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.degradation.disclosure_required).toBe(true);
    });

    it('required_disclosures is non-empty', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createDegradedJudgmentState({
          reason: 'STALE_CONTEXT',
          component: 'market-data',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.expression_rules.required_disclosures.length).toBeGreaterThan(0);
    });

    it('forbidden_claims includes overconfidence restriction', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createDegradedJudgmentState({
          reason: 'LOW_CONFIDENCE_INPUTS',
          component: 'sentiment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.expression_rules.forbidden_claims.join('\n')).toMatch(
        /overstate confidence/i,
      );
    });
  });

  // ── Builder: UNAVAILABLE ────────────────────────────────────────────────
  describe('builder — UNAVAILABLE', () => {
    it('omits judgment field even when judgment is provided', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_THROW',
          component: 'produceJudgment',
        }),
        judgment: {
          state: { primary: 'IGNORED' },
          thesis: { primary: { hypothesis: 'IGNORED' } },
          confidence: { overall: 0.99 },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.judgment).toBeUndefined();
    });

    it('forbids governed thesis / confidence / contradiction / scenario claims', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_RESULT_EMPTY',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      const forbidden = pkg.expression_rules.forbidden_claims.join('\n');
      expect(forbidden).toMatch(/structured thesis/i);
      expect(forbidden).toMatch(/structured confidence/i);
      expect(forbidden).toMatch(/structured contradiction or scenario/i);
    });

    it('required_disclosures includes the unavailable disclosure', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_TIMEOUT',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.expression_rules.required_disclosures.join('\n')).toMatch(
        /structured coinet judgment is unavailable/i,
      );
    });
  });

  // ── Renderer ────────────────────────────────────────────────────────────
  describe('renderer', () => {
    it('includes the canonical STRUCTURED COINET JUDGMENT PACKAGE marker', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(renderCoinetJudgmentPromptPackageForAI(pkg)).toContain(
        'STRUCTURED COINET JUDGMENT PACKAGE',
      );
    });

    it('includes the policy version line', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(renderCoinetJudgmentPromptPackageForAI(pkg)).toContain(
        'Policy Version: coinet-judgment-prompt-package.v1',
      );
    });

    it('includes the judgment status line', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_THROW',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(renderCoinetJudgmentPromptPackageForAI(pkg)).toContain(
        'Judgment Status: UNAVAILABLE',
      );
    });

    it('includes the Forbidden Claims section', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(renderCoinetJudgmentPromptPackageForAI(pkg)).toContain('Forbidden Claims:');
    });

    it('UNAVAILABLE renderer explicitly says structured judgment is unavailable', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_RESULT_EMPTY',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      const txt = renderCoinetJudgmentPromptPackageForAI(pkg);
      expect(txt).toMatch(/structured coinet judgment is unavailable/i);
    });
  });

  // ── Invariant assertion ─────────────────────────────────────────────────
  describe('assertCoinetJudgmentPromptPackageInvariants', () => {
    it('rejects UNAVAILABLE package with fake judgment fields', () => {
      const pkg: CoinetJudgmentPromptPackage = buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_THROW',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      // Mutate to violate invariant 2.
      const violated = {
        ...pkg,
        judgment: { thesis: 'FAKE THESIS' },
      } as CoinetJudgmentPromptPackage;
      expect(() => assertCoinetJudgmentPromptPackageInvariants(violated)).toThrow(
        /invariant 2/i,
      );
    });

    it('rejects DEGRADED package with disclosure_required=false', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createDegradedJudgmentState({
          reason: 'PARTIAL_CONTEXT_FAILURE',
          component: 'sentiment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      const violated: CoinetJudgmentPromptPackage = {
        ...pkg,
        degradation: { ...pkg.degradation, disclosure_required: false },
      };
      expect(() => assertCoinetJudgmentPromptPackageInvariants(violated)).toThrow(
        /invariant 3/i,
      );
    });

    it('rejects package with wrong policy_version', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      const violated = { ...pkg, policy_version: 'wrong.v0' } as unknown as CoinetJudgmentPromptPackage;
      expect(() => assertCoinetJudgmentPromptPackageInvariants(violated)).toThrow(
        /invariant 1/i,
      );
    });
  });

  // ── Determinism ─────────────────────────────────────────────────────────
  describe('determinism', () => {
    it('builder produces semantically identical packages for the same input', () => {
      const input = {
        availability: createAvailableJudgmentState(),
        judgment: {
          state: { primary: 'Accumulation' },
          thesis: { primary: { hypothesis: 'X' } },
          confidence: { overall: 0.5 },
        },
        scope: { kind: 'ASSET' as const, asset_symbol: 'BTC' },
        source_refs: ['produceJudgment'],
      };
      const a = buildCoinetJudgmentPromptPackage(input);
      const b = buildCoinetJudgmentPromptPackage(input);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('deterministic package_id uses status + scope kind + asset symbol', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_THROW',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'SOL' },
      });
      expect(pkg.package_id).toBe('pkg_chat_unavailable_asset_sol_v1');
    });
  });

  // ── Safety: missing fields ──────────────────────────────────────────────
  describe('judgment field projection safety', () => {
    it('does not throw when judgment is undefined on AVAILABLE', () => {
      expect(() =>
        buildCoinetJudgmentPromptPackage({
          availability: createAvailableJudgmentState(),
          judgment: undefined,
          scope: { kind: 'ASSET', asset_symbol: 'BTC' },
        }),
      ).not.toThrow();
    });

    it('does not throw when judgment is missing optional fields', () => {
      expect(() =>
        buildCoinetJudgmentPromptPackage({
          availability: createAvailableJudgmentState(),
          judgment: { state: { primary: 'Accumulation' } }, // only one field
          scope: { kind: 'ASSET', asset_symbol: 'BTC' },
        }),
      ).not.toThrow();
    });
  });
});
