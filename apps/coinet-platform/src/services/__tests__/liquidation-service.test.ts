/**
 * liquidation-service v4 — verifies the Coinglass v4 migration parsers against
 * the confirmed snapshot shapes, the honesty guard (failure / symbol-not-found →
 * null/[], never zero-defaults), and the cooldown now engaging on a 401 (the bug
 * where a string `"401" "Upgrade plan"` fell through and the disable never fired).
 *
 * axios is mocked; fake timers expire the 60s cache + 1h cooldown + 3s rate
 * window between tests so each test starts clean with no real waiting.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import axios from 'axios';

// CONFIG.COINGLASS_API_KEY is captured at module-import time, so the key MUST be
// in env before liquidation-service is imported — vi.hoisted runs before imports.
vi.hoisted(() => {
  process.env.COINGLASS_API_KEY = 'test-key';
});

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

const mockedGet = axios.get as unknown as ReturnType<typeof vi.fn>;

import {
  getLiquidationData,
  getFundingRates,
  getOpenInterest,
  getLongShortAccountRatio,
} from '../liquidation-service';

function ok(data: any) {
  return { status: 200, data: { code: '0', msg: 'success', data } };
}

beforeAll(() => {
  vi.useFakeTimers();
  process.env.COINGLASS_API_KEY = 'test-key';
});
afterAll(() => vi.useRealTimers());

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.COINGLASS_API_KEY = 'test-key';
  // Expire the 60s cache, the 1h cooldown, and the 3s rate window so each test
  // is isolated and the next call incurs no rate-limit wait.
  await vi.advanceTimersByTimeAsync(3_700_000);
});

describe('liquidation-service v4 migration', () => {
  it('getLiquidationData parses the coin-list row (total + long/short + risk)', async () => {
    mockedGet.mockResolvedValueOnce(
      ok([
        {
          symbol: 'BTC',
          liquidation_usd_24h: 150_000_000,
          long_liquidation_usd_24h: 100_000_000,
          short_liquidation_usd_24h: 50_000_000,
        },
      ]),
    );
    const r = await getLiquidationData('BTC');
    expect(r).not.toBeNull();
    expect(r!.totalLiquidations24h).toBe(150_000_000);
    expect(r!.longLiquidations24h).toBe(100_000_000);
    expect(r!.shortLiquidations24h).toBe(50_000_000);
    expect(r!.dominantSide).toBe('longs');
    expect(r!.riskLevel).toBe('high');
    // confirms it hit the v4 coin-list endpoint
    expect(mockedGet.mock.calls[0][0]).toContain('/api/futures/liquidation/coin-list');
  });

  it('getLiquidationData returns null when the symbol is not in the coin-list (honesty)', async () => {
    mockedGet.mockResolvedValueOnce(ok([{ symbol: 'ETH', liquidation_usd_24h: 1_000_000 }]));
    const r = await getLiquidationData('BTC');
    expect(r).toBeNull(); // absent → APPLICABLE_NO_DATA, not a zero default
  });

  it('getFundingRates parses stablecoin_margin_list and prefers major venues', async () => {
    mockedGet.mockResolvedValueOnce(
      ok({
        stablecoin_margin_list: [
          { exchange: 'Binance', funding_rate: 0.0001 },
          { exchange: 'OKX', funding_rate: 0.0002 },
          { exchange: 'SomeDex', funding_rate: 0.05 },
        ],
      }),
    );
    const rates = await getFundingRates('BTC');
    const venues = rates.map((r) => r.exchange.toLowerCase());
    expect(venues).toContain('binance');
    expect(venues).toContain('okx');
    expect(venues).not.toContain('somedex'); // non-major filtered out
    expect(mockedGet.mock.calls[0][0]).toContain('/api/futures/funding-rate/exchange-list');
  });

  it('getFundingRates returns [] on empty payload (honesty)', async () => {
    mockedGet.mockResolvedValueOnce(ok({ stablecoin_margin_list: [] }));
    expect(await getFundingRates('BTC')).toEqual([]);
  });

  it('getOpenInterest uses the "All" row for OI + 24h change', async () => {
    mockedGet.mockResolvedValueOnce(
      ok([
        { exchange: 'Binance', open_interest_usd: 1_000_000_000 },
        { exchange: 'All', open_interest_usd: 5_000_000_000, open_interest_change_percent_24h: 3.2 },
      ]),
    );
    const oi = await getOpenInterest('BTC');
    expect(oi).not.toBeNull();
    expect(oi!.openInterest).toBe(5_000_000_000);
    expect(oi!.change24h).toBe(3.2);
    expect(oi!.trend).toBe('increasing');
    expect(mockedGet.mock.calls[0][0]).toContain('/api/futures/open-interest/exchange-list');
  });

  it('getOpenInterest returns null when OI is zero/absent (honesty)', async () => {
    mockedGet.mockResolvedValueOnce(ok([{ exchange: 'All', open_interest_usd: 0 }]));
    expect(await getOpenInterest('BTC')).toBeNull();
  });

  it('getLongShortAccountRatio takes the latest record by time', async () => {
    mockedGet.mockResolvedValueOnce(
      ok([
        { time: 1, global_account_long_short_ratio: 1.2 },
        { time: 2, global_account_long_short_ratio: 1.8 },
      ]),
    );
    const ls = await getLongShortAccountRatio('BTC');
    expect(ls).toBe(1.8);
    expect(mockedGet.mock.calls[0][0]).toContain('/api/futures/global-long-short-account-ratio/history');
  });

  it('getLongShortAccountRatio falls back to the 1000x pair (PEPE → 1000PEPEUSDT)', async () => {
    // The base pair does not exist on Binance for low-priced tokens; the
    // 1000-prefixed variant does. First candidate returns empty, second carries.
    mockedGet.mockResolvedValueOnce(ok([])); // PEPEUSDT — no such pair
    mockedGet.mockResolvedValueOnce(ok([{ time: 1, global_account_long_short_ratio: 2.1 }])); // 1000PEPEUSDT
    const p = getLongShortAccountRatio('PEPE');
    await vi.advanceTimersByTimeAsync(10_000); // flush the 3s spacing between candidates
    const ls = await p;
    expect(ls).toBe(2.1);
    expect(mockedGet.mock.calls[0][0]).toContain('PEPEUSDT');
    expect(mockedGet.mock.calls[0][0]).not.toContain('1000PEPEUSDT');
    expect(mockedGet.mock.calls[1][0]).toContain('1000PEPEUSDT');
  });

  it('a 401 "Upgrade plan" engages the 1h cooldown (no more hammering)', async () => {
    mockedGet.mockResolvedValueOnce({ status: 401, data: { code: '401', msg: 'Upgrade plan' } });
    // First call hits the API and trips the cooldown.
    expect(await getOpenInterest('BTC')).toBeNull();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    // A subsequent call is short-circuited BEFORE axios while disabled.
    expect(await getFundingRates('ETH')).toEqual([]);
    expect(mockedGet).toHaveBeenCalledTimes(1); // not called again
  });
});
