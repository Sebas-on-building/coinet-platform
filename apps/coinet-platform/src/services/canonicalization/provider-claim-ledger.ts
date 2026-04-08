/**
 * L3.4 — Provider Claim Ledger
 *
 * Immutable, queryable store of all provider-side identity claims
 * relevant to reconciliation. Foundation of L3.4.
 *
 * Constitutional rule: no reconciliation may run from provider
 * summaries alone. It must run from ledger records.
 *
 * Every claim carries class, status, scope, authority, lineage,
 * conflict links, and supersession chain. Claims are never silently
 * discarded — they transition status (ACTIVE → REJECTED, SUPERSEDED, etc.)
 */

import { v4 as uuidv4 } from 'uuid';
import type { CanonicalObjectType } from './canonical-entity-types';
import type { ConfidenceBand } from './confidence-factors';

export const L34_LEDGER_VERSION = '1.0.0' as const;
export const L34_CLAIM_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════════

export type ProviderClaimClass =
  | 'PROPOSAL'
  | 'EVIDENCE'
  | 'ANCHOR'
  | 'CONFLICT'
  | 'ENRICHMENT';

export type ProviderClaimStatus =
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'UNRESOLVED'
  | 'HISTORICAL';

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProviderClaimRecord {
  claimId: string;
  providerId: string;
  providerClaimRef: string;
  objectType: CanonicalObjectType;
  candidateCanonicalIds: string[];
  claimClass: ProviderClaimClass;
  comparableFieldFamily: string;
  scopeDescriptor: string[];
  payload: Record<string, unknown>;

  confidenceStateId?: string;
  confidenceBand?: ConfidenceBand;
  confidenceGateEligible: boolean;

  authorityRefs: string[];
  lineageRefs: string[];
  replayGenerationRef?: string;
  routeRef?: string;
  freshnessState?: string;

  observedAt: string;
  ingestedAt: string;

  status: ProviderClaimStatus;
  conflictClaimIds: string[];
  supersedesClaimIds: string[];
  supersededByClaimIds: string[];

  rationale: string;
  normalizationMeta: Record<string, unknown>;
  schemaVersion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE
// ═══════════════════════════════════════════════════════════════════════════════

const _claims: ProviderClaimRecord[] = [];
const _byCanonicalId = new Map<string, ProviderClaimRecord[]>();
const _byProvider = new Map<string, ProviderClaimRecord[]>();
const _byClaimId = new Map<string, ProviderClaimRecord>();

function indexClaim(claim: ProviderClaimRecord): void {
  _byClaimId.set(claim.claimId, claim);

  for (const cid of claim.candidateCanonicalIds) {
    const existing = _byCanonicalId.get(cid) ?? [];
    existing.push(claim);
    _byCanonicalId.set(cid, existing);
  }

  const provList = _byProvider.get(claim.providerId) ?? [];
  provList.push(claim);
  _byProvider.set(claim.providerId, provList);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function appendProviderClaim(
  input: Omit<ProviderClaimRecord, 'claimId' | 'ingestedAt' | 'status' | 'schemaVersion'> & {
    claimId?: string;
    status?: ProviderClaimStatus;
  },
): ProviderClaimRecord {
  const claim: ProviderClaimRecord = {
    ...input,
    claimId: input.claimId ?? `claim_${uuidv4()}`,
    ingestedAt: new Date().toISOString(),
    status: input.status ?? 'ACTIVE',
    schemaVersion: L34_CLAIM_SCHEMA_VERSION,
  };
  _claims.push(claim);
  indexClaim(claim);
  return claim;
}

export function getClaimById(claimId: string): ProviderClaimRecord | undefined {
  return _byClaimId.get(claimId);
}

export function getClaimsForCanonicalObject(
  canonicalId: string,
  statusFilter?: ProviderClaimStatus[],
): ProviderClaimRecord[] {
  const all = _byCanonicalId.get(canonicalId) ?? [];
  if (!statusFilter) return [...all];
  return all.filter(c => statusFilter.includes(c.status));
}

export function getClaimsByProvider(
  providerId: string,
  statusFilter?: ProviderClaimStatus[],
): ProviderClaimRecord[] {
  const all = _byProvider.get(providerId) ?? [];
  if (!statusFilter) return [...all];
  return all.filter(c => statusFilter.includes(c.status));
}

export function getConflictingClaims(claimId: string): ProviderClaimRecord[] {
  const claim = _byClaimId.get(claimId);
  if (!claim) return [];
  return claim.conflictClaimIds
    .map(id => _byClaimId.get(id))
    .filter((c): c is ProviderClaimRecord => !!c);
}

export function getWinningCandidateClaims(
  canonicalId: string,
): ProviderClaimRecord[] {
  return getClaimsForCanonicalObject(canonicalId, ['ACTIVE'])
    .filter(c => c.confidenceGateEligible && c.claimClass !== 'ENRICHMENT');
}

export function getActiveAnchorClaims(
  canonicalId: string,
): ProviderClaimRecord[] {
  return getClaimsForCanonicalObject(canonicalId, ['ACTIVE'])
    .filter(c => c.claimClass === 'ANCHOR');
}

export function getActiveConflictClaims(
  canonicalId: string,
): ProviderClaimRecord[] {
  return getClaimsForCanonicalObject(canonicalId, ['ACTIVE', 'UNRESOLVED'])
    .filter(c => c.claimClass === 'CONFLICT' || c.conflictClaimIds.length > 0);
}

export function markClaimRejected(
  claimId: string,
  reason: string,
): boolean {
  const claim = _byClaimId.get(claimId);
  if (!claim) return false;
  claim.status = 'REJECTED';
  claim.rationale = `${claim.rationale}; REJECTED: ${reason}`;
  return true;
}

export function markClaimSuperseded(
  claimId: string,
  supersedingClaimId: string,
): boolean {
  const claim = _byClaimId.get(claimId);
  if (!claim) return false;
  claim.status = 'SUPERSEDED';
  claim.supersededByClaimIds.push(supersedingClaimId);

  const superseding = _byClaimId.get(supersedingClaimId);
  if (superseding) {
    superseding.supersedesClaimIds.push(claimId);
  }
  return true;
}

export function markClaimHistorical(claimId: string): boolean {
  const claim = _byClaimId.get(claimId);
  if (!claim) return false;
  claim.status = 'HISTORICAL';
  return true;
}

export function linkConflict(claimIdA: string, claimIdB: string): boolean {
  const a = _byClaimId.get(claimIdA);
  const b = _byClaimId.get(claimIdB);
  if (!a || !b) return false;
  if (!a.conflictClaimIds.includes(claimIdB)) a.conflictClaimIds.push(claimIdB);
  if (!b.conflictClaimIds.includes(claimIdA)) b.conflictClaimIds.push(claimIdA);
  return true;
}

export function getClaimsAtReplayTime(
  canonicalId: string,
  replayTimestamp: string,
): ProviderClaimRecord[] {
  const all = _byCanonicalId.get(canonicalId) ?? [];
  return all.filter(c => c.ingestedAt <= replayTimestamp);
}

export function getAllClaims(): readonly ProviderClaimRecord[] {
  return _claims;
}

export function resetClaimLedger(): void {
  _claims.length = 0;
  _byCanonicalId.clear();
  _byProvider.clear();
  _byClaimId.clear();
}
