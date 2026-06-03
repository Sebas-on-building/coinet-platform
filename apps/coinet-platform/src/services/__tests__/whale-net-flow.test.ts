/**
 * Unit tests for deriveWhaleNetFlowUSD — the pure adapter that maps
 * alchemy-whales token activity into a signed 24h whale net-flow (USD) for
 * the judgment SignalSnapshot. No network, no mocks.
 *
 * Honesty boundary under test: only net-flow is derivable from alchemy-whales;
 * the helper never invents exchange flows. Accumulation is positive,
 * distribution is negative, neutral / missing / non-positive volume is 0.
 */

import { describe, it, expect } from 'vitest';
import { deriveWhaleNetFlowUSD } from '../whale-data';

describe('deriveWhaleNetFlowUSD', () => {
  it('returns positive volume for net accumulation', () => {
    expect(deriveWhaleNetFlowUSD({ netFlow: 'accumulating', volumeUSD24h: 5_000_000 })).toBe(5_000_000);
  });

  it('returns negative volume for net distribution', () => {
    expect(deriveWhaleNetFlowUSD({ netFlow: 'distributing', volumeUSD24h: 5_000_000 })).toBe(-5_000_000);
  });

  it('returns 0 for neutral net-flow regardless of volume', () => {
    expect(deriveWhaleNetFlowUSD({ netFlow: 'neutral', volumeUSD24h: 5_000_000 })).toBe(0);
  });

  it('returns 0 for null / undefined activity (no data, not fabricated)', () => {
    expect(deriveWhaleNetFlowUSD(null)).toBe(0);
    expect(deriveWhaleNetFlowUSD(undefined)).toBe(0);
  });

  it('returns 0 when volume is missing, zero, or negative', () => {
    expect(deriveWhaleNetFlowUSD({ netFlow: 'accumulating' })).toBe(0);
    expect(deriveWhaleNetFlowUSD({ netFlow: 'accumulating', volumeUSD24h: 0 })).toBe(0);
    expect(deriveWhaleNetFlowUSD({ netFlow: 'distributing', volumeUSD24h: -100 })).toBe(0);
  });

  it('returns 0 for an unknown / missing netFlow direction', () => {
    expect(deriveWhaleNetFlowUSD({ volumeUSD24h: 1_000_000 })).toBe(0);
  });
});
