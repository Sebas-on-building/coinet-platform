/**
 * Claim Lockouts — Strategy 4: fallback should change what Coinet
 * is allowed to say, not just the source.
 *
 * When truth atoms are blind or degraded, specific claim families
 * become illegal at certain strength levels.
 */

import type { TruthClass } from '../registry';
import { TRUTH_CLASSES } from '../registry';
import type { ClaimLockout, SubstitutionStatus } from './types';

const TC = TRUTH_CLASSES;

export const CLAIM_LOCKOUT_RULES: ClaimLockout[] = [
  // ── Derivatives blind → leverage thesis locked ────────────────────────
  {
    claimFamily: 'leverage-dominance thesis',
    lockedStrengths: ['medium', 'strong', 'decisive'],
    reason: 'Cannot assert leverage-driven move without derivatives pressure visibility',
    triggerAtoms: ['oi.notional', 'oi.velocity', 'funding.rate', 'crowding.index'],
  },
  {
    claimFamily: 'liquidation cascade claim',
    lockedStrengths: ['medium', 'strong', 'decisive'],
    reason: 'Cannot assert live liquidation risk without derivatives data',
    triggerAtoms: ['liq.long.usd', 'liq.short.usd'],
  },
  {
    claimFamily: 'squeeze probability',
    lockedStrengths: ['strong', 'decisive'],
    reason: 'Squeeze thesis requires live crowding and funding data',
    triggerAtoms: ['crowding.index', 'funding.rate', 'oi.velocity'],
  },

  // ── Safety blind → legitimacy claims locked ───────────────────────────
  {
    claimFamily: 'token appears safe',
    lockedStrengths: ['medium', 'strong', 'decisive'],
    reason: 'Cannot confirm safety without structural safety visibility',
    triggerAtoms: ['security.risk_score', 'security.mint_authority'],
  },
  {
    claimFamily: 'no structural risk detected',
    lockedStrengths: ['medium', 'strong', 'decisive'],
    reason: 'Absence of risk data is not proof of safety',
    triggerAtoms: ['security.risk_score', 'security.ownership_conc'],
  },
  {
    claimFamily: 'safety-cleared opportunity',
    lockedStrengths: ['strong', 'decisive'],
    reason: 'Opportunity claims with safety component require safety authority',
    triggerAtoms: ['security.risk_score'],
  },

  // ── Entity blind → identity claims locked ─────────────────────────────
  {
    claimFamily: 'smart money is accumulating',
    lockedStrengths: ['medium', 'strong', 'decisive'],
    reason: 'Cannot label actors without entity authority',
    triggerAtoms: ['entity.label_confidence'],
  },
  {
    claimFamily: 'exchange wallets are distributing',
    lockedStrengths: ['medium', 'strong', 'decisive'],
    reason: 'Exchange identification requires entity labeling',
    triggerAtoms: ['entity.label_confidence', 'entity.institutional'],
  },
  {
    claimFamily: 'institutional involvement confirmed',
    lockedStrengths: ['medium', 'strong', 'decisive'],
    reason: 'Institutional claims require high-confidence entity context',
    triggerAtoms: ['entity.institutional'],
  },

  // ── On-chain blind → behavior claims locked ───────────────────────────
  {
    claimFamily: 'whale accumulation thesis',
    lockedStrengths: ['strong', 'decisive'],
    reason: 'Whale behavior requires on-chain flow visibility',
    triggerAtoms: ['wallet.whale_flow', 'wallet.exchange_outflow'],
  },
  {
    claimFamily: 'exchange-deposit-pressure claim',
    lockedStrengths: ['medium', 'strong', 'decisive'],
    reason: 'Exchange inflow pressure requires direct measurement',
    triggerAtoms: ['wallet.exchange_inflow'],
  },

  // ── Substance blind → fundamental claims locked ───────────────────────
  {
    claimFamily: 'TVL-backed substance thesis',
    lockedStrengths: ['strong', 'decisive'],
    reason: 'Cannot back substance claims without TVL visibility',
    triggerAtoms: ['protocol.tvl'],
  },
  {
    claimFamily: 'revenue-backed rerating',
    lockedStrengths: ['strong', 'decisive'],
    reason: 'Rerating thesis requires revenue authority',
    triggerAtoms: ['protocol.revenue.usd'],
  },

  // ── Narrative blind → attention claims locked ─────────────────────────
  {
    claimFamily: 'narrative-driven move thesis',
    lockedStrengths: ['strong', 'decisive'],
    reason: 'Cannot assert narrative-driven thesis without attention visibility',
    triggerAtoms: ['narrative.intensity', 'social.acceleration'],
  },
];

export function getActiveLockouts(blindAtomIds: string[]): ClaimLockout[] {
  const blind = new Set(blindAtomIds);
  return CLAIM_LOCKOUT_RULES.filter(rule =>
    rule.triggerAtoms.some(atom => blind.has(atom)),
  );
}

export function getLockedOutClaimFamilies(blindAtomIds: string[]): string[] {
  return getActiveLockouts(blindAtomIds).map(l => l.claimFamily);
}

export function isClaimLocked(
  claimFamily: string,
  strength: 'weak' | 'medium' | 'strong' | 'decisive',
  blindAtomIds: string[],
): boolean {
  const lockouts = getActiveLockouts(blindAtomIds);
  return lockouts.some(l =>
    l.claimFamily === claimFamily && l.lockedStrengths.includes(strength as any),
  );
}
