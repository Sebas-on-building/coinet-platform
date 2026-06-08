/**
 * applicability-engine-behavior — proves the three engines judge by the right lens.
 *
 * Verifies the actual behavioral change (not just the helper):
 *   - contradiction-engine no longer invents "weak fundamentals" for an asset
 *     whose fundamentals are NOT_APPLICABLE / APPLICABLE_NO_DATA (BTC-like L1),
 *     while STILL firing for an asset that genuinely has weak fundamentals data.
 *   - confidence-engine renormalizes away a wholly-NOT_APPLICABLE axis (stablecoin
 *     fundamentals) instead of dragging the score down with a depressed 0.3.
 *
 * Pure logic; zero I/O.
 */

import { describe, it, expect } from 'vitest';

import { detectContradictions } from '../contradiction-engine';
import { computeConfidence } from '../confidence-engine';
import { produceJudgment } from '../index';
import { familyApplicability, deriveFamilyDataPresence } from '../asset-applicability';
import type { SignalSnapshot } from '../types';
import type { JudgmentState, JudgmentContradictions } from '../types';

// A snapshot with strong price+narrative but ZERO fundamentals data — the exact
// shape that used to trip false "weak/narrative-before fundamentals" contradictions.
function strongPriceNoFundamentals(): SignalSnapshot {
  return {
    price_momentum_24h: 0.25,
    price_momentum_1h: 0.05,
    volume_24h: 0.6,
    buy_sell_ratio: 0.55,
    liquidity: 0.5,
    pair_age_hours: null,
    leverage_pressure: 0.6,
    funding_rate: 0.55,
    liquidation_density: 0.2,
    fundamentals_strength: 0, // no fundamentals data
    tvl_trend: 0,
    revenue_quality: 0,
    whale_activity: 0.6,
    exchange_inflow: 0,
    exchange_outflow: 0,
    security_risk: 0.3,
    holder_concentration: 0.4,
    narrative_intensity: 0.7, // hot narrative
    sentiment: 0.5,
    unlock_pressure: 0,
    data_completeness: 0.7,
    data_freshness: 0.8,
  };
}

describe('contradiction-engine — fundamentals applicability gate', () => {
  it('LEGACY (no _applicability): fires fundamentals contradictions on absent data', () => {
    const s = strongPriceNoFundamentals();
    const out = detectContradictions(s);
    const classes = out.items.map((i: any) => i.class);
    // The historical (unfair) behavior: weak/lagging fundamentals flagged.
    expect(classes.some((c: string) => /fundamental/i.test(c))).toBe(true);
  });

  it('L1 (BTC-like): does NOT invent fundamentals contradictions (protocol N/A, network no-data)', () => {
    const s = strongPriceNoFundamentals();
    s._applicability = familyApplicability('L1', 'mega', deriveFamilyDataPresence(s));
    const out = detectContradictions(s);
    const classes = out.items.map((i: any) => i.class);
    expect(classes.some((c: string) => /fundamental/i.test(c))).toBe(false);
  });

  it('Memecoin: fundamentals contradictions excluded (wrong lens)', () => {
    const s = strongPriceNoFundamentals();
    s._applicability = familyApplicability('Memecoin', 'small', deriveFamilyDataPresence(s));
    const out = detectContradictions(s);
    const classes = out.items.map((i: any) => i.class);
    expect(classes.some((c: string) => /fundamental/i.test(c))).toBe(false);
  });

  it('DeFi WITH real fundamentals data that is weak: STILL fires (honest weakness kept)', () => {
    const s = strongPriceNoFundamentals();
    s.fundamentals_strength = 0.05; // real, and genuinely weak → SCORED
    s._applicability = familyApplicability('DeFi', 'large', deriveFamilyDataPresence(s));
    const out = detectContradictions(s);
    const classes = out.items.map((i: any) => i.class);
    expect(classes.some((c: string) => /fundamental/i.test(c))).toBe(true);
  });
});

describe('confidence-engine — axis renormalization', () => {
  const state: JudgmentState = { primary: 'neutral_consolidation', confidence: 0.7 } as any;
  const noContradictions: JudgmentContradictions = {
    items: [],
    load: 0,
    structural_warning: false,
  } as any;

  it('stablecoin: fundamentals axis (all N/A) is excluded, not dragged down', () => {
    const s = strongPriceNoFundamentals();
    const dp = deriveFamilyDataPresence(s);

    const stableApplic = familyApplicability('Stablecoin', 'mega', dp);
    const unknownApplic = familyApplicability('Unknown', 'mega', dp);

    const stable = { ...s, _applicability: stableApplic };
    const unknown = { ...s, _applicability: unknownApplic };

    const stableConf = computeConfidence({ signals: stable, contradictions: noContradictions, state });
    const unknownConf = computeConfidence({ signals: unknown, contradictions: noContradictions, state });

    // The stablecoin excludes the depressed fundamentals axis and renormalizes the
    // remaining axes — so its score is NOT dragged below the all-axes baseline.
    expect(stableConf.score).toBeGreaterThanOrEqual(unknownConf.score);
  });

  it('all-applicable (Unknown) is behavior-preserving vs legacy weighted sum', () => {
    const s = strongPriceNoFundamentals();
    s._applicability = familyApplicability('Unknown', 'mega', deriveFamilyDataPresence(s));
    const withApplic = computeConfidence({ signals: s, contradictions: noContradictions, state });

    const legacy = { ...s };
    delete legacy._applicability;
    const withoutApplic = computeConfidence({ signals: legacy, contradictions: noContradictions, state });

    // Unknown keeps every axis → renormalization divisor is 1.0 → identical score.
    expect(withApplic.score).toBeCloseTo(withoutApplic.score, 10);
  });
});

describe('hypothesis scorer — missing-fundamentals notes (Phase 4b)', () => {
  function inputFor(assetSector: 'L1' | 'DeFi') {
    return {
      entity_id: 'test:asset',
      symbol: 'TEST',
      chain: null,
      signals: strongPriceNoFundamentals(),
      assetSector,
    } as any;
  }

  it('L1: thesis missing-evidence does NOT surface false "fundamental backing" notes', () => {
    const out = produceJudgment(inputFor('L1'));
    const notes = [
      ...(out.thesis?.primary?.missing_evidence ?? []),
      ...(out.thesis?.secondary?.missing_evidence ?? []),
    ];
    expect(notes.some((n: string) => /fundamental/i.test(n))).toBe(false);
  });
});
