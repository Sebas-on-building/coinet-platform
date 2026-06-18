/**
 * /api/market-regime — composition contract unit tests.
 *
 * Tests the pure composer (no network): grounding (null when a source is absent,
 * never fabricated), the CoinGecko-preferred / CMC-fallback chain, the Fear &
 * Greed source preference, honest per-field provenance, and the F&G banding.
 */

import { describe, it, expect } from 'vitest';
import { composeMarketRegime, classifyFearGreed } from '../routes';
import type { GlobalMarketData } from '../../../services/market-data';
import type { CmcGlobalMetrics } from '../../../services/cmc-agent-hub';
import type { MarketSentiment } from '../../../services/sentiment-service';

const global = (o: Partial<GlobalMarketData>): GlobalMarketData =>
  ({ btcDominance: 0, ethDominance: 0, totalMarketCapUsd: 0, totalVolume24hUsd: 0, totalMarketCapChange24h: 0, ...o } as GlobalMarketData);
const cmc = (o: Partial<CmcGlobalMetrics>): CmcGlobalMetrics => ({ ...o } as CmcGlobalMetrics);
const sentiment = (fg: Partial<MarketSentiment['fearGreed']>): MarketSentiment =>
  ({ fearGreed: { value: 0, classification: 'Neutral', trend: 'stable', ...fg } } as MarketSentiment);

describe('composeMarketRegime', () => {
  it('all sources live → fields populated, provenance live, sentiment preferred for F&G', () => {
    const out = composeMarketRegime(
      global({ btcDominance: 58.2, ethDominance: 9.3, totalMarketCapUsd: 2.13e12, totalMarketCapChange24h: -2.7 }),
      cmc({ btcDominanceChange7d: -0.6, fearGreed: 20 }),
      sentiment({ value: 14, classification: 'Extreme Fear', trend: 'worsening', previousValue: 18 }),
    );
    expect(out.btcDominance).toBe(58.2);
    expect(out.ethDominance).toBe(9.3);
    expect(out.totalMarketCapUsd).toBe(2.13e12);
    expect(out.totalMarketCapChange24h).toBe(-2.7);
    expect(out.btcDominanceChange7d).toBe(-0.6);
    // sentiment wins over CMC's numeric index
    expect(out.fearGreed).toEqual({ value: 14, classification: 'Extreme Fear', trend: 'worsening', previousValue: 18 });
    expect(out.sources).toEqual({ dominance: 'live', marketCap: 'live', fearGreed: 'live' });
  });

  it('all sources null → every field null, provenance unavailable, never fabricated', () => {
    const out = composeMarketRegime(null, null, null);
    expect(out.btcDominance).toBeNull();
    expect(out.ethDominance).toBeNull();
    expect(out.totalMarketCapUsd).toBeNull();
    expect(out.totalMarketCapChange24h).toBeNull();
    expect(out.btcDominanceChange7d).toBeNull();
    expect(out.fearGreed).toBeNull();
    expect(out.sources).toEqual({ dominance: 'unavailable', marketCap: 'unavailable', fearGreed: 'unavailable' });
  });

  it('falls back to CMC for dominance/mcap when CoinGecko /global is absent', () => {
    const out = composeMarketRegime(null, cmc({ btcDominance: 57.0, totalMarketCap: 2.0e12 }), null);
    expect(out.btcDominance).toBe(57.0);
    expect(out.totalMarketCapUsd).toBe(2.0e12);
    expect(out.ethDominance).toBeNull(); // CMC has no eth dominance → honest null
    expect(out.sources.dominance).toBe('live');
    expect(out.sources.marketCap).toBe('live');
  });

  it('builds F&G from CMC when sentiment is unavailable (classified, trend stable)', () => {
    const out = composeMarketRegime(null, cmc({ fearGreed: 14 }), null);
    expect(out.fearGreed).toEqual({ value: 14, classification: 'Extreme Fear', trend: 'stable', previousValue: null });
    expect(out.sources.fearGreed).toBe('live');
  });

  it('partial CoinGecko (dominance only) → mcap stays null and is reported unavailable', () => {
    const out = composeMarketRegime(global({ btcDominance: 58, totalMarketCapUsd: NaN }), null, null);
    expect(out.btcDominance).toBe(58);
    expect(out.totalMarketCapUsd).toBeNull(); // NaN is not finite → null, not fabricated
    expect(out.sources).toMatchObject({ dominance: 'live', marketCap: 'unavailable' });
  });
});

describe('classifyFearGreed bands', () => {
  it('maps values to Alternative.me bands incl. boundaries', () => {
    expect(classifyFearGreed(10)).toBe('Extreme Fear');
    expect(classifyFearGreed(24)).toBe('Extreme Fear');
    expect(classifyFearGreed(25)).toBe('Fear');
    expect(classifyFearGreed(44)).toBe('Fear');
    expect(classifyFearGreed(45)).toBe('Neutral');
    expect(classifyFearGreed(54)).toBe('Neutral');
    expect(classifyFearGreed(55)).toBe('Greed');
    expect(classifyFearGreed(74)).toBe('Greed');
    expect(classifyFearGreed(75)).toBe('Extreme Greed');
  });
});
