/**
 * asset-applicability — unit tests for the purpose→lens, three-state helper.
 *
 * Pure logic, zero I/O. Verifies that each asset type is judged by the right
 * lens, and that the three states (SCORED / APPLICABLE_NO_DATA / NOT_APPLICABLE)
 * encode the honesty distinction: absent-but-applicable ≠ wrong-lens.
 */

import { describe, it, expect } from 'vitest';

import {
  familyApplicability,
  ALL_JUDGMENT_FAMILIES,
  isApplicable,
  isApplicableButMissing,
  isScored,
  type FamilyDataPresence,
} from '../asset-applicability';

// Full data presence (everything available) — isolates the purpose→lens mapping.
const ALL_PRESENT: FamilyDataPresence = Object.fromEntries(
  ALL_JUDGMENT_FAMILIES.map((f) => [f, true]),
);

describe('familyApplicability — purpose → lens', () => {
  it('L1 (BTC): network fundamentals apply, protocol fundamentals do NOT', () => {
    const a = familyApplicability('L1', 'mega', ALL_PRESENT);
    expect(a.fundamentals_network).toBe('SCORED');
    expect(a.fundamentals_protocol).toBe('NOT_APPLICABLE');
    expect(a.peg).toBe('NOT_APPLICABLE');
    expect(a.valuation).toBe('SCORED');
    expect(a.tokenomics).toBe('SCORED');
    expect(a.market).toBe('SCORED');
  });

  it('L1 with NO network-fundamentals source → APPLICABLE_NO_DATA, not penalized as weak', () => {
    // The real BTC situation: network fundamentals are the right lens, but we
    // lack a chain-fees/active-address source. Must be APPLICABLE_NO_DATA — a
    // disclosable coverage gap — NOT scored-as-weak and NOT hidden.
    const a = familyApplicability('L1', 'mega', { ...ALL_PRESENT, fundamentals_network: false });
    expect(a.fundamentals_network).toBe('APPLICABLE_NO_DATA');
    expect(isApplicable(a.fundamentals_network)).toBe(true);
    expect(isApplicableButMissing(a.fundamentals_network)).toBe(true);
    // protocol fundamentals remain the wrong lens regardless of data.
    expect(a.fundamentals_protocol).toBe('NOT_APPLICABLE');
  });

  it('DeFi: protocol fundamentals apply (SCORED when data present); network does NOT', () => {
    const a = familyApplicability('DeFi', 'large', ALL_PRESENT);
    expect(a.fundamentals_protocol).toBe('SCORED');
    expect(a.fundamentals_network).toBe('NOT_APPLICABLE');
    expect(a.peg).toBe('NOT_APPLICABLE');
  });

  it('Memecoin: BOTH fundamentals families are NOT_APPLICABLE; narrative/market apply', () => {
    const a = familyApplicability('Memecoin', 'small', ALL_PRESENT);
    expect(a.fundamentals_protocol).toBe('NOT_APPLICABLE');
    expect(a.fundamentals_network).toBe('NOT_APPLICABLE');
    expect(a.peg).toBe('NOT_APPLICABLE');
    expect(a.narrative).toBe('SCORED');
    expect(a.market).toBe('SCORED');
    // Supply dynamics DO matter for memes — tokenomics stays applicable.
    expect(a.tokenomics).toBe('SCORED');
  });

  it('Stablecoin: peg applies; valuation + tokenomics + fundamentals are NOT_APPLICABLE', () => {
    const a = familyApplicability('Stablecoin', 'mega', ALL_PRESENT);
    expect(a.peg).toBe('SCORED');
    expect(a.valuation).toBe('NOT_APPLICABLE');
    expect(a.tokenomics).toBe('NOT_APPLICABLE');
    expect(a.fundamentals_protocol).toBe('NOT_APPLICABLE');
    expect(a.fundamentals_network).toBe('NOT_APPLICABLE');
    expect(a.market).toBe('SCORED');
    expect(a.narrative).toBe('SCORED');
  });

  it('L2: both protocol and network fundamentals apply', () => {
    const a = familyApplicability('L2', 'large', ALL_PRESENT);
    expect(a.fundamentals_protocol).toBe('SCORED');
    expect(a.fundamentals_network).toBe('SCORED');
  });

  it('Unknown: ALL families applicable (conservative — never hide weakness)', () => {
    const a = familyApplicability('Unknown', 'mid', ALL_PRESENT);
    for (const family of ALL_JUDGMENT_FAMILIES) {
      expect(a[family]).toBe('SCORED');
      expect(isApplicable(a[family])).toBe(true);
    }
  });

  it('Unknown with no data → APPLICABLE_NO_DATA everywhere (gap disclosed, not hidden)', () => {
    const a = familyApplicability('Unknown', 'mid', {});
    for (const family of ALL_JUDGMENT_FAMILIES) {
      expect(a[family]).toBe('APPLICABLE_NO_DATA');
    }
  });

  it('peg is exclusive to stablecoins (and Unknown)', () => {
    expect(familyApplicability('L1', 'mega', ALL_PRESENT).peg).toBe('NOT_APPLICABLE');
    expect(familyApplicability('DeFi', 'mid', ALL_PRESENT).peg).toBe('NOT_APPLICABLE');
    expect(familyApplicability('Memecoin', 'small', ALL_PRESENT).peg).toBe('NOT_APPLICABLE');
    expect(familyApplicability('Stablecoin', 'mega', ALL_PRESENT).peg).toBe('SCORED');
    expect(familyApplicability('Unknown', 'mid', ALL_PRESENT).peg).toBe('SCORED');
  });

  it('every family resolves to exactly one of the three states', () => {
    const a = familyApplicability('L1', 'mega', { market: true });
    const states = new Set(['SCORED', 'APPLICABLE_NO_DATA', 'NOT_APPLICABLE']);
    for (const family of ALL_JUDGMENT_FAMILIES) {
      expect(states.has(a[family])).toBe(true);
    }
    expect(isScored(a.market)).toBe(true);
  });

  it('capBucket does not change WHICH lens applies (purpose-driven)', () => {
    const mega = familyApplicability('L1', 'mega', ALL_PRESENT);
    const micro = familyApplicability('L1', 'micro', ALL_PRESENT);
    expect(micro).toEqual(mega);
  });
});
