/**
 * cmc-agent-hub — Unit tests for the defensive CMC Agent Hub payload mappers.
 *
 * These tests exercise the read-by-path / neutral-on-missing projection with
 * ZERO network: no MCP connection, no real provider call. They lock the
 * documented field-path mapping AND the governance invariant that nothing is
 * ever invented — an absent field stays undefined so it defaults downstream.
 *
 * Exact CMC response paths are pinned against the first real deploy response;
 * until then these candidate paths are what the mapper reads. When the live
 * shape is confirmed, update both the mapper paths and these fixtures together.
 */

import { describe, it, expect } from 'vitest';

import {
  mapCmcGlobalPayload,
  mapCmcDerivativesPayload,
  getCmcGlobalMetrics,
  getCmcDerivatives,
} from '../cmc-agent-hub';

describe('mapCmcGlobalPayload', () => {
  it('maps the LIVE Agent Hub section shape (get_global_metrics_latest)', () => {
    // Section-based composite confirmed from the real deploy response.
    const payload = {
      market_size: {
        total_crypto_market_cap_usd: {
          current: 2_300_000_000_000,
          percent_change: { '24h': 1.36, '7d': -12.54 },
        },
      },
      sentiment: { fear_greed: { current: { index: 15 } } },
      dominance: { btc: { current: 58.35, history: { last_week: 59.23 } } },
      // Present in the live payload but deliberately NOT mapped (engine can't
      // consume them yet): rotation.altcoin_season, trad_fi_flows.etf_aum.
      rotation: { altcoin_season: { current: { index: 47 } } },
      trad_fi_flows: { etf_aum: { btc: { current: 102_050_000_000 } } },
    };
    const out = mapCmcGlobalPayload(payload);
    expect(out?.totalMarketCap).toBe(2_300_000_000_000);
    expect(out?.totalMarketCapChange24h).toBe(1.36);
    expect(out?.fearGreed).toBe(15);
    expect(out?.btcDominance).toBe(58.35);
    // Derived 7d delta: 58.35 − 59.23 = −0.88 (percentage points).
    expect(out?.btcDominanceChange7d).toBeCloseTo(-0.88, 5);
    // Not-consumable signals stay unmapped.
    expect(out).not.toHaveProperty('stablecoinMcapChange7d');
    expect(out).not.toHaveProperty('btcPriceChange7d');
  });

  it('only sets btcDominanceChange7d when both current and last_week exist', () => {
    const out = mapCmcGlobalPayload({ dominance: { btc: { current: 58.35 } } });
    expect(out).toEqual({ btcDominance: 58.35 });
    expect(out).not.toHaveProperty('btcDominanceChange7d');
  });

  it('still maps the CMC REST fallback shape (data.quote.USD.*)', () => {
    const payload = {
      data: {
        btc_dominance: 52.4,
        quote: {
          USD: {
            total_market_cap: 2_300_000_000_000,
            total_market_cap_yesterday_percentage_change: 1.5,
          },
        },
      },
    };
    expect(mapCmcGlobalPayload(payload)).toEqual({
      btcDominance: 52.4,
      totalMarketCap: 2_300_000_000_000,
      totalMarketCapChange24h: 1.5,
    });
  });

  it('coerces numeric strings', () => {
    const out = mapCmcGlobalPayload({
      market_size: { total_crypto_market_cap_usd: { current: '2300000000000' } },
    });
    expect(out?.totalMarketCap).toBe(2_300_000_000_000);
  });

  it('returns null when nothing maps (never invents)', () => {
    expect(mapCmcGlobalPayload({ unrelated: { nested: 'x' } })).toBeNull();
    expect(mapCmcGlobalPayload(null)).toBeNull();
    expect(mapCmcGlobalPayload(undefined)).toBeNull();
  });

  it('omits unmatched fields rather than defaulting them', () => {
    const out = mapCmcGlobalPayload({ sentiment: { fear_greed: { current: { index: 20 } } } });
    expect(out).toEqual({ fearGreed: 20 });
    expect(out).not.toHaveProperty('totalMarketCap');
    expect(out).not.toHaveProperty('btcDominance');
  });

  it('ignores non-finite values', () => {
    expect(
      mapCmcGlobalPayload({ market_size: { total_crypto_market_cap_usd: { current: NaN } } }),
    ).toBeNull();
    expect(
      mapCmcGlobalPayload({ market_size: { total_crypto_market_cap_usd: { current: 'n/a' } } }),
    ).toBeNull();
  });
});

describe('mapCmcDerivativesPayload', () => {
  it('maps the LIVE Agent Hub shape (get_global_crypto_derivatives_metrics)', () => {
    // Confirmed from the real deploy response. long_short_ratio fell beyond the
    // raw-log truncation, so it is legitimately absent here and stays unmapped.
    const out = mapCmcDerivativesPayload({
      fundingRate: { current: -0.0021619 },
      totalOpenInterest: { percentage_change_24h: 2.62 },
      btc_liquidations: { total_usd_24h: { total: 75_000_000, long: 50_000_000, short: 25_000_000 } },
    });
    expect(out).toEqual({
      aggFunding: -0.0021619,
      oiChange24h: 2.62,
      liquidations24h: 75_000_000,
    });
  });

  it('still maps the CMC REST fallback shape (data.*)', () => {
    const out = mapCmcDerivativesPayload({
      data: {
        funding_rate: 0.012,
        open_interest_change_24h: 4.5,
        long_short_ratio: 1.3,
        liquidations_24h: 75_000_000,
      },
    });
    expect(out).toEqual({
      aggFunding: 0.012,
      oiChange24h: 4.5,
      longShortRatio: 1.3,
      liquidations24h: 75_000_000,
    });
  });

  it('returns null when nothing maps', () => {
    expect(mapCmcDerivativesPayload({ data: {} })).toBeNull();
    expect(mapCmcDerivativesPayload(null)).toBeNull();
  });

  it('maps a partial payload, omitting the rest', () => {
    const out = mapCmcDerivativesPayload({ fundingRate: { current: 0.005 } });
    expect(out).toEqual({ aggFunding: 0.005 });
  });
});

describe('public fetchers without a CMC key', () => {
  // No CMC_MCP_API_KEY / CMC_API_KEY is set in the unit-test env, so the client
  // short-circuits before any transport is created — proving the no-key path is
  // null-safe and makes zero network calls.
  it('getCmcGlobalMetrics returns null with no key', async () => {
    await expect(getCmcGlobalMetrics()).resolves.toBeNull();
  });

  it('getCmcDerivatives returns null with no key', async () => {
    await expect(getCmcDerivatives('BTC')).resolves.toBeNull();
  });

  it('getCmcDerivatives returns null for an empty symbol', async () => {
    await expect(getCmcDerivatives('')).resolves.toBeNull();
  });
});
