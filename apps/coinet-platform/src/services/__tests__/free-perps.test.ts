/**
 * free-perps — Path B per-token perps from Bybit + OKX public APIs.
 *
 * Proves the honesty contract: real fields surface; absent markets are OMITTED
 * (→ caller's APPLICABLE_NO_DATA), never zero-filled or market-wide. Covers the
 * Bybit 1000x memecoin ticker wrinkle and the geo-block fallthrough.
 *
 * Network is fully mocked — zero real HTTP.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

import axios from 'axios';
import { getFreePerps } from '../free-perps';

const mockGet = (axios as any).get as ReturnType<typeof vi.fn>;

const BYBIT = 'https://api.bybit.com/v5/market/tickers?category=linear';
const OKX_FUNDING = 'https://www.okx.com/api/v5/public/funding-rate';
const OKX_OI = 'https://www.okx.com/api/v5/public/open-interest';
const OKX_LS = 'https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio';

function bybitList(list: any[]) {
  return { data: { result: { list } } };
}

beforeEach(() => {
  mockGet.mockReset();
});

describe('getFreePerps — honest per-token perps', () => {
  it('BTC: Bybit supplies funding+OI, OKX supplies long/short ratio', async () => {
    mockGet.mockImplementation((url: string, opts?: any) => {
      if (url === BYBIT) {
        return Promise.resolve(
          bybitList([{ symbol: 'BTCUSDT', fundingRate: '0.0001', openInterestValue: '3000000000' }]),
        );
      }
      if (url === OKX_FUNDING) return Promise.resolve({ data: { data: [{ fundingRate: '0.00012' }] } });
      if (url === OKX_OI) return Promise.resolve({ data: { data: [{ oiUsd: '1800000000' }] } });
      if (url === OKX_LS) return Promise.resolve({ data: { data: [['1781024400000', '2.1'], ['x', '2.0']] } });
      return Promise.resolve(null);
    });

    const out = await getFreePerps(['BTC']);
    expect(out.BTC).toBeDefined();
    // Bybit wins funding + OI (it's first in the chain).
    expect(out.BTC.fundingRate).toBeCloseTo(0.0001, 8);
    expect(out.BTC.openInterestUsd).toBe(3_000_000_000);
    // OKX supplies the long/short ratio (latest entry).
    expect(out.BTC.longShortRatio).toBeCloseTo(2.1, 6);
    expect(out.BTC.sources).toContain('bybit');
    expect(out.BTC.sources).toContain('okx');
  });

  it('PEPE: resolves via the Bybit 1000x ticker (1000PEPEUSDT → base PEPE)', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === BYBIT) {
        return Promise.resolve(
          bybitList([
            { symbol: 'BTCUSDT', fundingRate: '0.0001', openInterestValue: '3000000000' },
            { symbol: '1000PEPEUSDT', fundingRate: '0.0003', openInterestValue: '50000000' },
          ]),
        );
      }
      // OKX has nothing for PEPE.
      return Promise.resolve({ data: { data: [] } });
    });

    const out = await getFreePerps(['PEPE']);
    expect(out.PEPE).toBeDefined();
    expect(out.PEPE.fundingRate).toBeCloseTo(0.0003, 8);
    expect(out.PEPE.openInterestUsd).toBe(50_000_000);
    expect(out.PEPE.longShortRatio).toBeUndefined(); // honest: OKX had none
    expect(out.PEPE.sources).toEqual(['bybit']);
  });

  it('does NOT let a multiplier ticker clobber a real base symbol', async () => {
    // Both BTCUSDT (real) and a hypothetical 1000BTCUSDT exist; the exact base
    // must win, not the multiplier alias.
    mockGet.mockImplementation((url: string) => {
      if (url === BYBIT) {
        return Promise.resolve(
          bybitList([
            { symbol: 'BTCUSDT', fundingRate: '0.0001', openInterestValue: '3000000000' },
            { symbol: '1000BTCUSDT', fundingRate: '0.9999', openInterestValue: '1' },
          ]),
        );
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const out = await getFreePerps(['BTC']);
    expect(out.BTC.fundingRate).toBeCloseTo(0.0001, 8); // the real BTCUSDT, not 1000BTCUSDT
  });

  it('token with no perp market anywhere → omitted (caller reads APPLICABLE_NO_DATA)', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === BYBIT) {
        return Promise.resolve(bybitList([{ symbol: 'BTCUSDT', fundingRate: '0.0001', openInterestValue: '3000000000' }]));
      }
      return Promise.resolve({ data: { data: [] } }); // OKX empty for the unknown token
    });

    const out = await getFreePerps(['ZZZNOTREAL']);
    expect(out.ZZZNOTREAL).toBeUndefined();
    expect(Object.keys(out)).toHaveLength(0);
  });

  it('OKX fills funding/OI when the token is absent on Bybit', async () => {
    mockGet.mockImplementation((url: string, opts?: any) => {
      if (url === BYBIT) return Promise.resolve(bybitList([])); // not on Bybit
      if (url === OKX_FUNDING) return Promise.resolve({ data: { data: [{ fundingRate: '0.00007' }] } });
      if (url === OKX_OI) return Promise.resolve({ data: { data: [{ oiUsd: '12345678' }] } });
      if (url === OKX_LS) return Promise.resolve({ data: { data: [['t', '1.4']] } });
      return Promise.resolve(null);
    });

    const out = await getFreePerps(['FOO']);
    expect(out.FOO).toBeDefined();
    expect(out.FOO.fundingRate).toBeCloseTo(0.00007, 8);
    expect(out.FOO.openInterestUsd).toBe(12_345_678);
    expect(out.FOO.longShortRatio).toBeCloseTo(1.4, 6);
    expect(out.FOO.sources).toEqual(['okx']);
  });

  // Geo-block LAST: it trips the 30-min per-venue circuit breaker (module state),
  // so it must not precede the happy-path tests.
  it('geo-block (403) on both venues → empty result, no throw', async () => {
    mockGet.mockImplementation(() => Promise.reject({ response: { status: 403 } }));
    const out = await getFreePerps(['GEOTEST']);
    expect(out).toEqual({});
  });
});
