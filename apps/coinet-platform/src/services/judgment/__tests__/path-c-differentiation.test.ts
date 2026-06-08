/**
 * path-c-differentiation — proves Path C (lean on per-token OmniScore + turnover)
 * makes two very different assets produce genuinely DIFFERENT judgments, not just
 * different confidence, even when derivatives/social are absent.
 *
 * The bug this fixes: all tokens returned identical verdicts because (a) volume
 * normalization saturated (BTC 39B and a meme's 221M both → 1.0) and (b) the rich
 * per-token OmniScore signals (QS, circulating ratio) were computed and discarded.
 *
 * BTC-like  : L1, high QS (real fundamentals lens), low turnover, high circulating.
 * PEPE-like : Memecoin (fundamentals = wrong lens → QS gated OUT), hot turnover,
 *             thin liquidity, hot narrative.
 *
 * They must diverge on state.primary and/or thesis.primary — pure logic, zero I/O.
 */

import { describe, it, expect } from 'vitest';

import { buildSignalSnapshot } from '../signal-snapshot';
import { produceJudgment } from '../index';

function btcLikeSnapshot() {
  return buildSignalSnapshot({
    dexscreener: {
      price_change_24h: 2, // modest, mature move
      price_change_1h: 0.2,
      volume_24h_usd: 39_000_000_000, // huge raw volume…
      market_cap_usd: 1_300_000_000_000, // …but tiny turnover (~3%) → low volume signal
      liquidity_usd: 5_000_000_000,
      txns_buys_24h: 0,
      txns_sells_24h: 0,
    },
    security: { risk_score: 10 }, // low risk
    holders: { top_10_percentage: 12 },
    news: { item_count: 2 },
    omniscore: {
      quality_score: 85, // strong — and L1 fundamentals ARE the right lens → SCORED
      circulating_supply_ratio: 0.95, // mostly circulating → little overhang
    },
    asset_sector: 'L1',
    coverage: { available_count: 5, total_count: 10, stale_count: 0 },
  });
}

function pepeLikeSnapshot() {
  return buildSignalSnapshot({
    dexscreener: {
      price_change_24h: 28, // hot pump
      price_change_1h: 4,
      volume_24h_usd: 3_000_000_000, // smaller raw volume…
      market_cap_usd: 6_000_000_000, // …but ~50% turnover → maxed volume signal
      liquidity_usd: 200_000, // thin
      txns_buys_24h: 0,
      txns_sells_24h: 0,
    },
    security: { risk_score: 45 },
    holders: { top_10_percentage: 55 },
    news: { item_count: 9 },
    sentiment: { score: 0.7, volume_mentions_24h: 1200, social_dominance: 6 },
    omniscore: {
      quality_score: 22, // LOW — but Memecoin has no fundamentals thesis → GATED OUT
      circulating_supply_ratio: 1.0, // fully circulating
    },
    asset_sector: 'Memecoin',
    coverage: { available_count: 5, total_count: 10, stale_count: 0 },
  });
}

describe('Path C — per-token differentiation (BTC-like vs PEPE-like)', () => {
  it('turnover de-saturates: BTC-like volume signal is far below PEPE-like', () => {
    const btc = btcLikeSnapshot();
    const pepe = pepeLikeSnapshot();
    // BTC ~3% turnover → ~0.10; PEPE ~50% turnover → clamps to 1.0.
    expect(btc.volume_24h).toBeLessThan(0.25);
    expect(pepe.volume_24h).toBeGreaterThan(0.9);
    expect(pepe.volume_24h).toBeGreaterThan(btc.volume_24h + 0.5);
  });

  it('QS → fundamentals_strength is gated by purpose: L1 carries it, Memecoin does NOT', () => {
    const btc = btcLikeSnapshot();
    const pepe = pepeLikeSnapshot();
    // L1: fundamentals applicable → QS projected.
    expect(btc.fundamentals_strength).toBeGreaterThan(0.8);
    // Memecoin: fundamentals are the wrong lens → QS NOT projected (stays 0).
    expect(pepe.fundamentals_strength).toBe(0);
  });

  it('produces genuinely different state.primary (not just confidence)', () => {
    const btc = produceJudgment({
      entity_id: 'test:btc',
      symbol: 'BTC',
      chain: null,
      signals: btcLikeSnapshot(),
      assetSector: 'L1',
    });
    const pepe = produceJudgment({
      entity_id: 'test:pepe',
      symbol: 'PEPE',
      chain: null,
      signals: pepeLikeSnapshot(),
      assetSector: 'Memecoin',
    });

    expect(btc.state.primary).not.toBe(pepe.state.primary);
  });
});
