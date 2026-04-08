/**
 * L3.2 — Canonical Identity Resolution: Contract Resolution
 *
 * Chain+contract tuple resolution, pool address resolution,
 * derivative contract resolution, controlled contract bundle resolution,
 * address identity anchors, root asset relation handling.
 */

import type { CanonicalObjectType } from './canonical-entity-types';
import type { ContractTuple, DeterministicAnchorResult, AnchorStrength } from './identity-resolution-types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT INDEX ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

export type ContractIndexEntry = {
  chainId: string;
  address: string;
  normalizedAddress: string;
  objectType: CanonicalObjectType;
  canonicalId: string;
  role: 'PRIMARY_CONTRACT' | 'WRAPPED_CONTRACT' | 'BRIDGED_CONTRACT' |
        'POOL_CONTRACT' | 'DERIVATIVE_CONTRACT' | 'CONTROLLED_CONTRACT' |
        'WALLET_ADDRESS' | 'TREASURY_ADDRESS';
  rootCanonicalId?: string;
  sourceRefs: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT INDEX (in-memory; production backs to persistent store)
// ═══════════════════════════════════════════════════════════════════════════════

let _contractIndex: ContractIndexEntry[] = [];

export function normalizeAddress(address: string): string {
  if (address.startsWith('0x') || address.startsWith('0X')) {
    return address.toLowerCase();
  }
  return address;
}

export function registerContract(entry: ContractIndexEntry): void {
  const existing = _contractIndex.find(
    e => e.normalizedAddress === entry.normalizedAddress
      && e.chainId === entry.chainId
      && e.objectType === entry.objectType
  );
  if (existing) {
    existing.sourceRefs.push(...entry.sourceRefs.filter(r => !existing.sourceRefs.includes(r)));
    return;
  }
  _contractIndex.push({ ...entry });
}

export function lookupByContract(
  chainId: string,
  address: string,
  objectType?: CanonicalObjectType,
): ContractIndexEntry[] {
  const norm = normalizeAddress(address);
  return _contractIndex.filter(e => {
    if (e.chainId !== chainId) return false;
    if (e.normalizedAddress !== norm) return false;
    if (objectType && e.objectType !== objectType) return false;
    return true;
  });
}

export function lookupByCanonicalId(canonicalId: string): ContractIndexEntry[] {
  return _contractIndex.filter(e => e.canonicalId === canonicalId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC CONTRACT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveByContractTuples(
  tuples: ContractTuple[],
  objectType: CanonicalObjectType,
): DeterministicAnchorResult {
  const candidateIds = new Set<string>();
  const matchedAnchors: string[] = [];
  const blockedCandidates: string[] = [];
  let bestStrength: AnchorStrength = 'NONE';

  const strengthRank: Record<AnchorStrength, number> = { NONE: 0, WEAK: 1, STRONG: 2, EXACT: 3 };

  for (const tuple of tuples) {
    const norm = normalizeAddress(tuple.address);
    const entries = lookupByContract(tuple.chainId, norm, objectType);

    for (const entry of entries) {
      const key = `${entry.chainId}:${entry.normalizedAddress}:${entry.role}`;
      candidateIds.add(entry.canonicalId);
      matchedAnchors.push(key);

      if (entry.role === 'WRAPPED_CONTRACT' || entry.role === 'BRIDGED_CONTRACT') {
        if (entry.rootCanonicalId) {
          matchedAnchors.push(`${key}→root:${entry.rootCanonicalId}`);
        }
        if (strengthRank[bestStrength] < strengthRank['STRONG']) bestStrength = 'STRONG';
      } else if (entry.role === 'PRIMARY_CONTRACT' || entry.role === 'CONTROLLED_CONTRACT') {
        bestStrength = 'EXACT';
      } else {
        if (strengthRank[bestStrength] < strengthRank['STRONG']) bestStrength = 'STRONG';
      }
    }

    if (entries.length === 0 && tuples.length > 0) {
      blockedCandidates.push(`NO_MATCH:${tuple.chainId}:${norm}`);
    }
  }

  return {
    candidateIds: [...candidateIds],
    anchorStrength: bestStrength,
    matchedAnchors,
    blockedCandidates,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POOL ADDRESS RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export function resolvePoolAddress(
  chainId: string,
  poolAddress: string,
): DeterministicAnchorResult {
  const entries = lookupByContract(chainId, poolAddress, 'PAIR');
  const poolEntries = entries.filter(e => e.role === 'POOL_CONTRACT');

  return {
    candidateIds: poolEntries.map(e => e.canonicalId),
    anchorStrength: poolEntries.length > 0 ? 'EXACT' : 'NONE',
    matchedAnchors: poolEntries.map(e => `${e.chainId}:${e.normalizedAddress}:POOL`),
    blockedCandidates: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVATIVE CONTRACT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveDerivativeContract(
  chainId: string,
  contractId: string,
): DeterministicAnchorResult {
  const entries = lookupByContract(chainId, contractId, 'PAIR');
  const derivEntries = entries.filter(e => e.role === 'DERIVATIVE_CONTRACT');

  return {
    candidateIds: derivEntries.map(e => e.canonicalId),
    anchorStrength: derivEntries.length > 0 ? 'EXACT' : 'NONE',
    matchedAnchors: derivEntries.map(e => `${e.chainId}:${e.normalizedAddress}:DERIVATIVE`),
    blockedCandidates: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS IDENTITY RESOLUTION (for entities/wallets)
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveAddressIdentity(
  chainId: string,
  address: string,
): DeterministicAnchorResult {
  const entries = lookupByContract(chainId, address, 'ENTITY');
  return {
    candidateIds: entries.map(e => e.canonicalId),
    anchorStrength: entries.length > 0 ? 'EXACT' : 'NONE',
    matchedAnchors: entries.map(e => `${e.chainId}:${e.normalizedAddress}:${e.role}`),
    blockedCandidates: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRAPPED / BRIDGED RELATION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type WrappedRelationResult = {
  hasRelation: boolean;
  rootCanonicalId?: string;
  relationType?: 'WRAPPED' | 'BRIDGED' | 'DERIVATIVE';
  contractEntries: ContractIndexEntry[];
};

export function detectWrappedRelation(
  chainId: string,
  address: string,
): WrappedRelationResult {
  const entries = lookupByContract(chainId, address);
  const wrappedOrBridged = entries.filter(
    e => e.role === 'WRAPPED_CONTRACT' || e.role === 'BRIDGED_CONTRACT'
  );

  if (wrappedOrBridged.length === 0) {
    return { hasRelation: false, contractEntries: entries };
  }

  const entry = wrappedOrBridged[0];
  return {
    hasRelation: true,
    rootCanonicalId: entry.rootCanonicalId,
    relationType: entry.role === 'WRAPPED_CONTRACT' ? 'WRAPPED' : 'BRIDGED',
    contractEntries: wrappedOrBridged,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

export function resetContractIndex(): void {
  _contractIndex = [];
}

export function getContractIndex(): readonly ContractIndexEntry[] {
  return _contractIndex;
}
