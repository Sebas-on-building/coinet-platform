/**
 * 🧵 Token carry-over tests — both sides, no silently-passing cases.
 *
 * These cover the SECURITY-CRITICAL decision logic: WHETHER a token-less
 * follow-up inherits a token from the thread. The hard gate is size-1
 * uniqueness across the user's own turns. The actual LLM prose ("must refer to
 * BTC") is end-to-end behavior that requires the live backend + Clerk JWT and
 * is NOT asserted here — these tests pin the gate that makes hallucination
 * impossible on the ambiguous / no-context paths.
 *
 * Uses the REAL symbolDetector (its COMMON_COINS map is loaded synchronously in
 * the constructor, so BTC/ETH resolve offline). axios is mocked only to keep
 * the singleton's background coin-list refresh off the network.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

import { inferCarriedToken } from '../token-carry-over';

describe('inferCarriedToken — THREAD HOLDS (single unambiguous token)', () => {
  it('carries BTC when MSG1 asked about BTC and MSG2 is a token-less follow-up', async () => {
    const history = [
      { role: 'user', content: 'Was hältst du von BTC?' },
      { role: 'assistant', content: 'BTC sieht strukturell schwach aus...' },
      { role: 'user', content: 'wie sicher bist du?' },
    ];
    const res = await inferCarriedToken(history);
    expect(res.reason).toBe('carried');
    expect(res.carried?.symbol).toBe('BTC');
    expect(res.carried?.coinGeckoId).toBe('bitcoin');
    expect(res.distinctSymbols).toEqual(['BTC']);
  });

  it('treats the same token across multiple user turns as still size-1 (BTC + "bitcoin" alias)', async () => {
    const history = [
      { role: 'user', content: 'Was hältst du von BTC?' },
      { role: 'user', content: 'und langfristig bitcoin?' },
      { role: 'user', content: 'wie sicher bist du?' },
    ];
    const res = await inferCarriedToken(history);
    expect(res.reason).toBe('carried');
    expect(res.carried?.coinGeckoId).toBe('bitcoin');
    expect(res.distinctSymbols).toEqual(['BTC']);
  });
});

describe('inferCarriedToken — HARDNESS: ambiguity carries NOTHING', () => {
  it('does NOT hallucinate BTC or ETH when the thread mentions both', async () => {
    const history = [
      { role: 'user', content: 'Was hältst du von BTC?' },
      { role: 'assistant', content: 'BTC ...' },
      { role: 'user', content: 'und was ist mit ETH?' },
      { role: 'assistant', content: 'ETH ...' },
      { role: 'user', content: 'wie sicher bist du?' },
    ];
    const res = await inferCarriedToken(history);
    expect(res.reason).toBe('ambiguous');
    expect(res.carried).toBeNull(); // <-- no guessed token
    expect(res.distinctSymbols).toEqual(expect.arrayContaining(['BTC', 'ETH']));
    expect(res.distinctSymbols.length).toBeGreaterThanOrEqual(2);
  });
});

describe('inferCarriedToken — HARDNESS: no context carries NOTHING', () => {
  it('returns no carry for a fresh first message with no token ever mentioned', async () => {
    const history = [{ role: 'user', content: 'wie sicher bist du?' }];
    const res = await inferCarriedToken(history);
    expect(res.reason).toBe('no_token_in_history');
    expect(res.carried).toBeNull();
  });

  it('returns no carry for empty history', async () => {
    expect((await inferCarriedToken([])).reason).toBe('no_history');
    expect((await inferCarriedToken(undefined)).carried).toBeNull();
    expect((await inferCarriedToken(null)).carried).toBeNull();
  });
});

describe('inferCarriedToken — only USER turns count (assistant mentions ignored)', () => {
  it('does not carry a token the user never named, even if the assistant mentioned it', async () => {
    const history = [
      { role: 'user', content: 'wie ist die lage am markt?' },
      { role: 'assistant', content: 'BTC und ETH wirken schwach.' },
      { role: 'user', content: 'wie sicher bist du?' },
    ];
    const res = await inferCarriedToken(history);
    expect(res.carried).toBeNull();
    expect(res.reason).toBe('no_token_in_history');
  });
});
