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
          // Real engine emits confidence.overall as a controlled band STRING
          // (toConfidenceBand). The numeric path was dead code and is removed.
          confidence: { overall: 'medium' },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.judgment?.state).toBe('Accumulation');
      expect(pkg.judgment?.thesis).toBe('Trend reversal in early stage');
      expect(pkg.judgment?.contradiction_summary).toContain('2 contradiction');
      expect(pkg.judgment?.confidence_band).toBe('medium');
    });

    it('does not set confidence_band from a numeric overall (dead path removed)', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: { state: { primary: 'Accumulation' }, confidence: { overall: 0.62 } },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.judgment?.confidence_band).toBeUndefined();
    });

    // Phase 2 — structured depth projection from the real JudgmentOutput shape.
    it('projects the full structured depth (Phase 2)', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: {
          state: { primary: 'thin_liquidity_risk', secondary: 'crowded_continuation', confidence: 0.41 },
          thesis: {
            primary: {
              hypothesis: 'leverage_driven_squeeze',
              support_score: 0.62,
              contradiction_score: 0.18,
              confidence: 0.44,
            },
            secondary: { hypothesis: 'narrative_only_pump' },
            clarity: 0.12,
            ambiguity_flag: true,
          },
          cause: {
            dominant_cluster: 'structural_fragility',
            secondary_cluster: 'leverage_expansion',
            positive_drivers: [{ family: 'leverage_expansion', strength: 0.4, summary: 'OI building' }],
            negative_drivers: [{ family: 'structural_fragility', strength: 0.8, summary: 'thin books' }],
          },
          contradictions: {
            items: [
              { class: 'volume_vs_liquidity', severity: 'high', summary: 'volume exceeds liquidity', resolvable: false },
              { class: 'leverage_vs_spot', severity: 'moderate', summary: 'leverage outpaces spot', resolvable: true },
            ],
            load: 0.36,
            structural_warning: true,
          },
          timing: {
            phase: 'crowded',
            score: 64,
            sequence_position: 6,
            sequence_total: 9,
            maturity_warning: true,
            maturity_note: 'late-cycle positioning',
          },
          scenario: {
            base_case: 'continuation risk if support breaks',
            bullish_confirmation: 'reclaim of range high',
            bearish_failure: 'support loss on rising liquidations',
            next_trigger: 'funding reset',
            scenario_confidence: 0.4,
            horizons: [
              { horizon: '24h', confirmation: 'spot follow-through confirms', failure: 'leveraged unwind on thin demand', trigger: 'watch funding', invalidation: 'range low breaks' },
              { horizon: '7d', confirmation: 'weekly strength', failure: '7d failure', trigger: '7d trigger', invalidation: '7d invalidation' },
            ],
          },
          confidence: {
            overall: 'very_low',
            score: 0.19,
            breakdown: { market: 0.3, fundamentals: 0.9, onchain: 0.2, narrative: 0.5 },
            primary_uncertainty: 'on-chain data',
          },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      const j = pkg.judgment!;
      // state / thesis detail
      expect(j.state_detail).toEqual({ secondary: 'crowded_continuation', confidence: 0.41 });
      expect(j.thesis_detail).toMatchObject({
        support_score: 0.62, contradiction_score: 0.18, confidence: 0.44,
        secondary: 'narrative_only_pump', clarity: 0.12, ambiguous: true,
      });
      // cause drivers flattened with direction
      expect(j.cause_detail?.dominant_cluster).toBe('structural_fragility');
      expect(j.cause_detail?.secondary_cluster).toBe('leverage_expansion');
      expect(j.cause_detail?.drivers).toEqual([
        { family: 'leverage_expansion', direction: 'positive', strength: 0.4, summary: 'OI building' },
        { family: 'structural_fragility', direction: 'negative', strength: 0.8, summary: 'thin books' },
      ]);
      // contradictions as items (not just count)
      expect(j.contradiction_summary).toContain('2 contradiction');
      expect(j.contradiction_items).toEqual([
        { class: 'volume_vs_liquidity', severity: 'high', summary: 'volume exceeds liquidity', resolvable: false },
        { class: 'leverage_vs_spot', severity: 'moderate', summary: 'leverage outpaces spot', resolvable: true },
      ]);
      expect(j.contradiction_load).toBe(0.36);
      expect(j.contradiction_structural_warning).toBe(true);
      // timing detail
      expect(j.timing_detail).toEqual({
        score: 64, position: 6, total: 9, maturity_warning: true, maturity_note: 'late-cycle positioning',
      });
      // scenario branches + horizons
      expect(j.scenario_detail?.bullish_confirmation).toBe('reclaim of range high');
      expect(j.scenario_detail?.bearish_failure).toBe('support loss on rising liquidations');
      expect(j.scenario_detail?.next_trigger).toBe('funding reset');
      expect(j.scenario_detail?.confidence).toBe(0.4);
      expect(j.scenario_detail?.horizons).toHaveLength(2);
      // confidence 4-axis breakdown
      expect(j.confidence_band).toBe('very_low');
      expect(j.confidence_detail?.score).toBe(0.19);
      expect(j.confidence_detail?.breakdown).toEqual({ market: 0.3, fundamentals: 0.9, onchain: 0.2, narrative: 0.5 });
      expect(j.confidence_detail?.primary_uncertainty).toBe('on-chain data');
      // derived whitepaper fields — prefer the 24h horizon
      expect(j.signal_24h).toBe('spot follow-through confirms watch funding');
      expect(j.failure_condition).toBe('leveraged unwind on thin demand');
    });

    it('derives signal_24h/failure_condition from scenario branches when horizons absent', () => {
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createAvailableJudgmentState(),
        judgment: {
          scenario: {
            base_case: 'base',
            bullish_confirmation: 'spot demand sustains',
            bearish_failure: 'breakdown on inflows',
            next_trigger: 'volume confirmation',
          },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(pkg.judgment?.signal_24h).toBe('spot demand sustains volume confirmation');
      expect(pkg.judgment?.failure_condition).toBe('breakdown on inflows');
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

    it('rejects UNAVAILABLE package carrying ONLY a Phase-2 structured field', () => {
      // hasAnyJudgmentField must cover the new fields, else a package with only
      // structured depth (e.g. contradiction_items) would bypass invariant 2.
      const pkg = buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_RESULT_EMPTY',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      const violated = {
        ...pkg,
        judgment: { contradiction_items: [{ class: 'leverage_vs_spot', severity: 'high' }] },
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
