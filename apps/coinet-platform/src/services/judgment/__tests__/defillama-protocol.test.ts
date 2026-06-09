/**
 * defillama-protocol — proves real DeFiLlama TVL/fees/revenue threaded into the
 * snapshot's protocol family produce genuine protocol fundamentals for DeFi
 * assets, stay honestly absent for assets with no protocol, and (critically)
 * normalize NON-SATURATINGLY so two DeFi protocols of very different size still
 * differ instead of both pinning to 1.0 (the absolute-clamp bug, same class as
 * the turnover-ratio lesson).
 *
 * Pure logic, zero I/O — the DeFiLlama fetch happens in service.ts; here we feed
 * its shape directly into buildSignalSnapshot + the applicability map.
 */

import { describe, it, expect } from 'vitest';

import { buildSignalSnapshot } from '../signal-snapshot';
import { familyApplicability, deriveFamilyDataPresence } from '../asset-applicability';

// UNI-like: DeFi protocol with real TVL/fees/revenue (DeFiLlama shape).
function uniLikeSnapshot() {
  return buildSignalSnapshot({
    dexscreener: {
      price_change_24h: -3,
      volume_24h_usd: 200_000_000,
      market_cap_usd: 1_500_000_000, // ~$1.5B mcap
      liquidity_usd: 50_000_000,
      txns_buys_24h: 0,
      txns_sells_24h: 0,
    },
    // Real DeFiLlama protocol fundamentals.
    protocol: {
      tvl_usd: 2_750_000_000, // $2.75B TVL → TVL/mcap ~1.8 → strong, NOT pinned
      fees_usd: 2_390_000,    // $2.39M/24h → ~32% annualized fee yield
      revenue_usd: 800_000,
    },
    security: { risk_score: 10 },
    omniscore: { quality_score: 80, circulating_supply_ratio: 0.75 },
    asset_sector: 'DeFi',
    coverage: { available_count: 6, total_count: 10, stale_count: 0 },
  });
}

// Memecoin: no protocol data at all (DeFiLlama returned hasAdoptionData:false →
// service.ts passes protocol: undefined).
function memeLikeSnapshot() {
  return buildSignalSnapshot({
    dexscreener: {
      price_change_24h: 25,
      volume_24h_usd: 3_000_000_000,
      market_cap_usd: 6_000_000_000,
      liquidity_usd: 200_000,
      txns_buys_24h: 0,
      txns_sells_24h: 0,
    },
    // protocol intentionally omitted → undefined
    security: { risk_score: 45 },
    omniscore: { quality_score: 22, circulating_supply_ratio: 1.0 },
    asset_sector: 'Memecoin',
    coverage: { available_count: 5, total_count: 10, stale_count: 0 },
  });
}

describe('DeFiLlama protocol fundamentals → snapshot', () => {
  it('UNI-like real TVL/fees yield live protocol fundamentals in the snapshot', () => {
    const uni = uniLikeSnapshot();
    expect(uni.tvl_trend).toBeGreaterThan(0);        // real TVL/mcap signal
    expect(uni.revenue_quality).toBeGreaterThan(0);  // real fee/revenue yield
    expect(uni.fundamentals_strength).toBeGreaterThan(0);
  });

  it('memecoin with no protocol data has zero protocol fundamentals', () => {
    const meme = memeLikeSnapshot();
    expect(meme.tvl_trend).toBe(0);
    expect(meme.revenue_quality).toBe(0);
    // _missing carries 'protocol' so downstream marks it absent.
    expect(meme._missing.has('protocol')).toBe(true);
  });

  it('applicability: DeFi token → fundamentals_protocol SCORED; memecoin → NOT_APPLICABLE', () => {
    const uni = uniLikeSnapshot();
    const meme = memeLikeSnapshot();
    const uniApp = familyApplicability('DeFi', null, deriveFamilyDataPresence(uni));
    const memeApp = familyApplicability('Memecoin', null, deriveFamilyDataPresence(meme));
    expect(uniApp.fundamentals_protocol).toBe('SCORED');
    expect(memeApp.fundamentals_protocol).toBe('NOT_APPLICABLE');
  });

  it('TVL normalization is NON-SATURATING: two very different protocols differ', () => {
    // Big protocol at ~2x TVL/mcap vs a modest one at ~0.2x. The old absolute
    // /100M clamp pinned BOTH to 1.0; the TVL/mcap ratio keeps them apart.
    const big = buildSignalSnapshot({
      dexscreener: { market_cap_usd: 5_000_000_000, volume_24h_usd: 1, liquidity_usd: 1 },
      protocol: { tvl_usd: 10_000_000_000 }, // 2.0x → ~1.0
      asset_sector: 'DeFi',
    });
    const modest = buildSignalSnapshot({
      dexscreener: { market_cap_usd: 1_000_000_000, volume_24h_usd: 1, liquidity_usd: 1 },
      protocol: { tvl_usd: 200_000_000 }, // 0.2x → ~0.1
      asset_sector: 'DeFi',
    });
    expect(big.tvl_trend).toBeGreaterThan(modest.tvl_trend + 0.5);
    expect(modest.tvl_trend).toBeLessThan(0.3);
  });
});
