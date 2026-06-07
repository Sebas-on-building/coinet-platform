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
  it('maps the documented CMC global-metrics shape (data.quote.USD.*)', () => {
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
    const out = mapCmcGlobalPayload(payload);
    expect(out).toEqual({
      btcDominance: 52.4,
      totalMarketCap: 2_300_000_000_000,
      totalMarketCapChange24h: 1.5,
    });
  });

  it('maps a flat alternative shape (no data wrapper)', () => {
    const out = mapCmcGlobalPayload({
      btc_dominance: 48,
      total_market_cap_change_24h: -2.2,
      fear_greed_index: 30,
    });
    expect(out).toMatchObject({
      btcDominance: 48,
      totalMarketCapChange24h: -2.2,
      fearGreed: 30,
    });
  });

  it('coerces numeric strings', () => {
    const out = mapCmcGlobalPayload({ data: { btc_dominance: '51.2' } });
    expect(out?.btcDominance).toBe(51.2);
  });

  it('returns null when nothing maps (never invents)', () => {
    expect(mapCmcGlobalPayload({ unrelated: { nested: 'x' } })).toBeNull();
    expect(mapCmcGlobalPayload(null)).toBeNull();
    expect(mapCmcGlobalPayload(undefined)).toBeNull();
  });

  it('omits unmatched fields rather than defaulting them', () => {
    const out = mapCmcGlobalPayload({ data: { btc_dominance: 50 } });
    expect(out).toEqual({ btcDominance: 50 });
    expect(out).not.toHaveProperty('totalMarketCap');
    expect(out).not.toHaveProperty('fearGreed');
  });

  it('ignores non-finite values', () => {
    expect(mapCmcGlobalPayload({ data: { btc_dominance: NaN } })).toBeNull();
    expect(mapCmcGlobalPayload({ data: { btc_dominance: 'not-a-number' } })).toBeNull();
  });
});

describe('mapCmcDerivativesPayload', () => {
  it('maps the documented derivatives shape', () => {
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
    const out = mapCmcDerivativesPayload({ funding_rate: 0.005 });
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
