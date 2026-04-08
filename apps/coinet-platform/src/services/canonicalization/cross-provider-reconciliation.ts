/**
 * L3.4 — Cross-Provider Reconciliation Engine
 *
 * Main orchestration layer. Gathers claims from the ledger, groups
 * them by comparable reconciliation surface, runs admissibility
 * checks, selects reconciliation mode, and emits a reconciled
 * canonical state.
 *
 * Constitutional 10-stage pipeline:
 *   1. Load canonical context
 *   2. Load provider claim set
 *   3. Admissibility gating
 *   4. Claim normalization and grouping
 *   5. Reconciliation mode selection
 *   6. Winning / losing / conflict derivation
 *   7. Structural mutation planning
 *   8. Canonical update application
 *   9. Report generation
 *  10. Persistence and downstream signaling
 *
 * Provider claims are inputs to reconciliation, not ontology truth.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CanonicalObjectType } from './canonical-entity-types';
import type { EntityConfidenceState } from './entity-confidence-model';
import {
  getClaimsForCanonicalObject,
  getActiveAnchorClaims,
  getActiveConflictClaims,
  type ProviderClaimRecord,
} from './provider-claim-ledger';
import {
  createMergePlan,
  createSplitPlan,
  applyMergeMutation,
  applySplitMutation,
  type MutationPlan,
  type MutationHistoryEvent,
} from './entity-merge-split-engine';
import {
  buildReconciliationReport,
  type ReconciliationReport,
  type ReconciliationDiff,
} from './canonical-reconciliation-report';

export const L34_RECONCILIATION_VERSION = '1.0.0' as const;
export const L34_POLICY_VERSION = '1.0.0' as const;
export const L34_RECONCILED_STATE_SCHEMA_VERSION = 'v1' as const;
export const L34_ANCHOR_SCHEMA_VERSION = 'v1' as const;
export const L34_CONFLICT_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ReconciliationMode =
  | 'DETERMINISTIC_MERGE'
  | 'WEIGHTED_CONVERGENCE'
  | 'CONTESTED_MERGE'
  | 'SPLIT_REQUIRED'
  | 'MERGE_REQUIRED';

export type ClaimAdmissibility =
  | 'ADMISSIBLE_STRONG'
  | 'ADMISSIBLE_CONDITIONAL'
  | 'ADMISSIBLE_ENRICHMENT_ONLY'
  | 'NON_ADMISSIBLE_CONFLICT_RECORD_ONLY'
  | 'NON_ADMISSIBLE_HISTORICAL_ONLY';

export interface ClaimAdmissibilityResult {
  claimId: string;
  admissibility: ClaimAdmissibility;
  reasons: string[];
}

export interface WinningAnchor {
  schemaVersion: string;
  anchorType: string;
  anchorValue: string;
  supportingClaimIds: string[];
  rejectedCompetingClaimIds: string[];
  authoritySummary: string[];
  confidenceSummary: string[];
  chosenAt: string;
  versionIntroduced: string;
  provisional: boolean;
}

export interface RejectedAnchor {
  schemaVersion: string;
  anchorType: string;
  anchorValue: string;
  sourceClaimIds: string[];
  rejectionReason: string;
  rejectedAt: string;
  rejectionClass: 'TEMPORARY_NON_WINNER' | 'PERMANENT_INVALID' | 'UNSAFE_SCOPE';
  relatedWinningAnchor?: string;
}

export interface UnresolvedConflictRecord {
  schemaVersion: string;
  conflictId: string;
  conflictClass: string;
  affectedCanonicalIds: string[];
  affectedClaimIds: string[];
  scopeTouched: string[];
  anchorDefining: boolean;
  confidenceAffecting: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  lastRevisitedAt?: string;
  resolutionPrerequisites: string[];
}

export interface ReconciledCanonicalState {
  schemaVersion: string;
  reconciliationId: string;
  canonicalId: string;
  objectType: CanonicalObjectType;
  mode: ReconciliationMode;
  providerClaimIds: string[];
  winningAnchors: WinningAnchor[];
  rejectedAnchors: RejectedAnchor[];
  unresolvedConflicts: UnresolvedConflictRecord[];
  nonComparableClaimIds: string[];
  enrichmentOnlyClaimIds: string[];
  confidenceStateId?: string;
  mutationPlanId?: string;
  priorVersionRef?: string;
  createdAt: string;
  policyVersion: string;
  evaluatorVersion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE
// ═══════════════════════════════════════════════════════════════════════════════

const _reconciledStates: ReconciledCanonicalState[] = [];
const _byCanonicalId = new Map<string, ReconciledCanonicalState[]>();

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3 — ADMISSIBILITY GATING
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateClaimAdmissibility(
  claim: ProviderClaimRecord,
  confidenceState?: EntityConfidenceState,
): ClaimAdmissibilityResult {
  const reasons: string[] = [];

  if (claim.status === 'HISTORICAL') {
    return { claimId: claim.claimId, admissibility: 'NON_ADMISSIBLE_HISTORICAL_ONLY', reasons: ['CLAIM_IS_HISTORICAL'] };
  }

  if (claim.status === 'REJECTED') {
    return { claimId: claim.claimId, admissibility: 'NON_ADMISSIBLE_CONFLICT_RECORD_ONLY', reasons: ['CLAIM_ALREADY_REJECTED'] };
  }

  if (claim.status === 'SUPERSEDED') {
    return { claimId: claim.claimId, admissibility: 'NON_ADMISSIBLE_HISTORICAL_ONLY', reasons: ['CLAIM_SUPERSEDED'] };
  }

  if (claim.claimClass === 'ENRICHMENT') {
    return { claimId: claim.claimId, admissibility: 'ADMISSIBLE_ENRICHMENT_ONLY', reasons: ['ENRICHMENT_CLASS'] };
  }

  if (!claim.confidenceGateEligible) {
    reasons.push('CONFIDENCE_GATE_INELIGIBLE');
    if (claim.claimClass === 'CONFLICT') {
      return { claimId: claim.claimId, admissibility: 'NON_ADMISSIBLE_CONFLICT_RECORD_ONLY', reasons };
    }
    return { claimId: claim.claimId, admissibility: 'ADMISSIBLE_CONDITIONAL', reasons };
  }

  if (confidenceState) {
    try {
      const { evaluateConfidenceGate } =
        require('./confidence-gate') as typeof import('./confidence-gate');
      const gate = evaluateConfidenceGate({
        canonicalId: claim.candidateCanonicalIds[0] ?? '',
        objectType: confidenceState.objectType,
        requestedUse: 'CANONICAL_MUTATION',
        missionCritical: claim.claimClass === 'ANCHOR',
        confidenceState,
      });
      if (!gate.allowed) {
        reasons.push(`L33_GATE_DENIED:${gate.reasons.join(',')}`);
        return { claimId: claim.claimId, admissibility: 'NON_ADMISSIBLE_CONFLICT_RECORD_ONLY', reasons };
      }
      if (gate.mode === 'CONDITIONAL' || gate.mode === 'ALLOW_WITH_SCAR') {
        reasons.push(`L33_GATE_CONDITIONAL:${gate.mode}`);
      }
    } catch { /* L3.3-B gate integration is resilient */ }
  }

  if (claim.authorityRefs.length === 0) {
    reasons.push('NO_AUTHORITY_REFS');
  }

  if (claim.lineageRefs.length === 0) {
    reasons.push('NO_LINEAGE_REFS');
  }

  const hasWeakness = reasons.length > 0;
  if (hasWeakness && claim.claimClass === 'ANCHOR') {
    return { claimId: claim.claimId, admissibility: 'ADMISSIBLE_CONDITIONAL', reasons };
  }

  return {
    claimId: claim.claimId,
    admissibility: hasWeakness ? 'ADMISSIBLE_CONDITIONAL' : 'ADMISSIBLE_STRONG',
    reasons,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 4 — CLAIM GROUPING
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClaimGroup {
  groupKey: string;
  fieldFamily: string;
  scopeSurface: string;
  claims: ProviderClaimRecord[];
  admissibility: ClaimAdmissibilityResult[];
}

export function groupClaimsByReconciliationSurface(
  claims: ProviderClaimRecord[],
  admissibilityMap: Map<string, ClaimAdmissibilityResult>,
): ClaimGroup[] {
  const groups = new Map<string, ClaimGroup>();

  for (const claim of claims) {
    const sortedScope = [...claim.scopeDescriptor].sort();
    const key = `${claim.comparableFieldFamily}::${sortedScope.join('|')}`;
    const existing = groups.get(key) ?? {
      groupKey: key,
      fieldFamily: claim.comparableFieldFamily,
      scopeSurface: sortedScope.join('|'),
      claims: [],
      admissibility: [],
    };
    existing.claims.push(claim);
    const adm = admissibilityMap.get(claim.claimId);
    if (adm) existing.admissibility.push(adm);
    groups.set(key, existing);
  }

  return [...groups.values()];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 5 — MODE SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function selectReconciliationMode(
  anchorClaims: ProviderClaimRecord[],
  conflictClaims: ProviderClaimRecord[],
  admissibilityMap: Map<string, ClaimAdmissibilityResult>,
  confidenceState?: EntityConfidenceState,
): { mode: ReconciliationMode; reason: string } {
  const strongAdmissible = anchorClaims.filter(c => {
    const adm = admissibilityMap.get(c.claimId);
    return adm?.admissibility === 'ADMISSIBLE_STRONG';
  });

  const hasHardConflict = conflictClaims.some(c =>
    c.status === 'ACTIVE' || c.status === 'UNRESOLVED');

  const hasScopeCollision = anchorClaims.some((a, i) =>
    anchorClaims.some((b, j) =>
      i !== j
      && a.providerId !== b.providerId
      && a.comparableFieldFamily === b.comparableFieldFamily
      && JSON.stringify([...a.scopeDescriptor].sort()) !== JSON.stringify([...b.scopeDescriptor].sort())
      && a.claimClass === 'ANCHOR'
      && b.claimClass === 'ANCHOR'
    ));

  const strongScopeSet = new Set(strongAdmissible.map(c =>
    JSON.stringify({ type: c.comparableFieldFamily, scope: [...c.scopeDescriptor].sort() })));
  const hasDistinctScopePartition = hasScopeCollision
    && strongScopeSet.size >= 2
    && strongAdmissible.length >= 2;

  if (hasDistinctScopePartition && !hasHardConflict) {
    return { mode: 'SPLIT_REQUIRED', reason: 'Distinct scope partitions detected across strong anchor claims' };
  }

  const hasTwoDistinctObjectsMerging = anchorClaims.some(c =>
    c.candidateCanonicalIds.length > 1
    && c.claimClass === 'ANCHOR'
    && admissibilityMap.get(c.claimId)?.admissibility === 'ADMISSIBLE_STRONG');

  if (hasTwoDistinctObjectsMerging) {
    return { mode: 'MERGE_REQUIRED', reason: 'Strong anchor claim spans multiple canonical candidates' };
  }

  if (anchorClaims.length === 0) {
    return { mode: 'CONTESTED_MERGE', reason: 'No anchor claims available for reconciliation' };
  }

  const allAnchorsSameScope = anchorClaims.every((c, _, arr) =>
    JSON.stringify([...c.scopeDescriptor].sort()) === JSON.stringify([...arr[0].scopeDescriptor].sort()));

  const allAnchorsStronglyAdmissible = anchorClaims.every(c =>
    admissibilityMap.get(c.claimId)?.admissibility === 'ADMISSIBLE_STRONG');

  if (allAnchorsSameScope && allAnchorsStronglyAdmissible && !hasHardConflict) {
    return { mode: 'DETERMINISTIC_MERGE', reason: 'All anchors align on scope with strong admissibility and no conflict' };
  }

  if (hasHardConflict) {
    const isCoAuthority = conflictClaims.some(c =>
      c.rationale.includes('CO_AUTHORITY') || c.rationale.includes('co-authority'));
    if (isCoAuthority) {
      return { mode: 'CONTESTED_MERGE', reason: 'Co-authority conflict on anchor-defining claims' };
    }
  }

  const majorityThreshold = anchorClaims.length * 0.6;
  const majorityScope = findMajorityScopeGroup(anchorClaims);
  if (majorityScope && majorityScope.count >= majorityThreshold && !hasHardConflict) {
    return { mode: 'WEIGHTED_CONVERGENCE', reason: `Majority convergence (${majorityScope.count}/${anchorClaims.length}) on primary scope` };
  }

  return { mode: 'CONTESTED_MERGE', reason: 'No safe deterministic or majority mode — reconciliation remains contested' };
}

function findMajorityScopeGroup(
  claims: ProviderClaimRecord[],
): { scope: string; count: number } | null {
  const scopeCounts = new Map<string, number>();
  for (const c of claims) {
    const key = [...c.scopeDescriptor].sort().join('|');
    scopeCounts.set(key, (scopeCounts.get(key) ?? 0) + 1);
  }
  let best: { scope: string; count: number } | null = null;
  for (const [scope, count] of scopeCounts) {
    if (!best || count > best.count) best = { scope, count };
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 6 — WINNING / REJECTED / CONFLICT DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

export function deriveWinningAnchors(
  anchorClaims: ProviderClaimRecord[],
  admissibilityMap: Map<string, ClaimAdmissibilityResult>,
  mode: ReconciliationMode,
): WinningAnchor[] {
  if (mode === 'CONTESTED_MERGE') return [];

  const now = new Date().toISOString();
  const grouped = new Map<string, ProviderClaimRecord[]>();
  for (const c of anchorClaims) {
    const key = `${c.comparableFieldFamily}`;
    const list = grouped.get(key) ?? [];
    list.push(c);
    grouped.set(key, list);
  }

  const winners: WinningAnchor[] = [];
  for (const [anchorType, claims] of grouped) {
    const strong = claims.filter(c =>
      admissibilityMap.get(c.claimId)?.admissibility === 'ADMISSIBLE_STRONG');
    const winning = strong.length > 0 ? strong : claims.filter(c =>
      admissibilityMap.get(c.claimId)?.admissibility === 'ADMISSIBLE_CONDITIONAL');

    if (winning.length === 0) continue;

    const primary = winning[0];
    const anchorValue = primary.scopeDescriptor.join(':');
    const rejected = claims
      .filter(c => !winning.includes(c))
      .map(c => c.claimId);

    winners.push({
      schemaVersion: L34_ANCHOR_SCHEMA_VERSION,
      anchorType,
      anchorValue,
      supportingClaimIds: winning.map(c => c.claimId),
      rejectedCompetingClaimIds: rejected,
      authoritySummary: winning.map(c => `${c.providerId}:${c.authorityRefs.join(',')}`),
      confidenceSummary: winning.map(c => `${c.providerId}:band=${c.confidenceBand ?? 'unknown'}`),
      chosenAt: now,
      versionIntroduced: L34_RECONCILIATION_VERSION,
      provisional: mode === 'WEIGHTED_CONVERGENCE',
    });
  }

  return winners;
}

export function deriveRejectedAnchors(
  anchorClaims: ProviderClaimRecord[],
  winningAnchors: WinningAnchor[],
): RejectedAnchor[] {
  const now = new Date().toISOString();
  const winningClaimIds = new Set(winningAnchors.flatMap(w => w.supportingClaimIds));
  const rejected: RejectedAnchor[] = [];

  for (const claim of anchorClaims) {
    if (winningClaimIds.has(claim.claimId)) continue;

    const relatedWinner = winningAnchors.find(w =>
      w.rejectedCompetingClaimIds.includes(claim.claimId));

    rejected.push({
      schemaVersion: L34_ANCHOR_SCHEMA_VERSION,
      anchorType: claim.comparableFieldFamily,
      anchorValue: claim.scopeDescriptor.join(':'),
      sourceClaimIds: [claim.claimId],
      rejectionReason: relatedWinner
        ? `Outcompeted by winning anchor ${relatedWinner.anchorType}:${relatedWinner.anchorValue}`
        : 'No winning group included this claim',
      rejectedAt: now,
      rejectionClass: 'TEMPORARY_NON_WINNER',
      relatedWinningAnchor: relatedWinner ? `${relatedWinner.anchorType}:${relatedWinner.anchorValue}` : undefined,
    });
  }

  return rejected;
}

export function deriveUnresolvedConflicts(
  conflictClaims: ProviderClaimRecord[],
  anchorClaims: ProviderClaimRecord[],
  mode: ReconciliationMode,
  canonicalId: string,
): UnresolvedConflictRecord[] {
  const now = new Date().toISOString();
  const conflicts: UnresolvedConflictRecord[] = [];

  for (const claim of conflictClaims) {
    if (claim.status !== 'ACTIVE' && claim.status !== 'UNRESOLVED') continue;

    const touchesAnchor = anchorClaims.some(a =>
      claim.conflictClaimIds.includes(a.claimId) || a.conflictClaimIds.includes(claim.claimId));

    const conflictClass = inferConflictClass(claim);

    conflicts.push({
      schemaVersion: L34_CONFLICT_SCHEMA_VERSION,
      conflictId: `conf_${uuidv4()}`,
      conflictClass,
      affectedCanonicalIds: [canonicalId, ...claim.candidateCanonicalIds.filter(id => id !== canonicalId)],
      affectedClaimIds: [claim.claimId, ...claim.conflictClaimIds],
      scopeTouched: claim.scopeDescriptor,
      anchorDefining: touchesAnchor,
      confidenceAffecting: touchesAnchor || conflictClass === 'CO_AUTHORITY_DISPUTE',
      severity: touchesAnchor ? 'HIGH' : 'MEDIUM',
      createdAt: now,
      resolutionPrerequisites: touchesAnchor
        ? ['ADDITIONAL_PROVIDER_EVIDENCE', 'ANCHOR_CLARIFICATION']
        : ['EVIDENCE_REVIEW'],
    });
  }

  if (mode === 'CONTESTED_MERGE') {
    const existingClasses = new Set(conflicts.map(c => c.conflictClass));
    if (!existingClasses.has('RECONCILIATION_STALEMATE')) {
      conflicts.push({
        schemaVersion: L34_CONFLICT_SCHEMA_VERSION,
        conflictId: `conf_${uuidv4()}`,
        conflictClass: 'RECONCILIATION_STALEMATE',
        affectedCanonicalIds: [canonicalId],
        affectedClaimIds: anchorClaims.map(c => c.claimId),
        scopeTouched: [...new Set(anchorClaims.flatMap(c => c.scopeDescriptor))],
        anchorDefining: true,
        confidenceAffecting: true,
        severity: 'HIGH',
        createdAt: now,
        resolutionPrerequisites: ['ADDITIONAL_PROVIDER_EVIDENCE', 'MANUAL_REVIEW'],
      });
    }
  }

  return conflicts;
}

function inferConflictClass(claim: ProviderClaimRecord): string {
  if (claim.rationale.includes('CO_AUTHORITY') || claim.rationale.includes('co-authority')) {
    return 'CO_AUTHORITY_DISPUTE';
  }
  if (claim.rationale.includes('SCOPE') || claim.rationale.includes('scope')) {
    return 'SCOPE_COLLISION';
  }
  if (claim.rationale.includes('CHAIN') || claim.rationale.includes('chain')) {
    return 'CHAIN_DISAGREEMENT';
  }
  if (claim.rationale.includes('WRAPPED') || claim.rationale.includes('wrapped')) {
    return 'WRAPPED_NATIVE_AMBIGUITY';
  }
  return 'PROVIDER_MISMATCH';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE — reconcileCanonicalObject
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReconciliationInput {
  canonicalId: string;
  objectType: CanonicalObjectType;
  confidenceState?: EntityConfidenceState;
  isReplay?: boolean;
  replayGeneration?: number;
  priorReconciliationRef?: string;
}

export interface ReconciliationOutput {
  state: ReconciledCanonicalState;
  report: ReconciliationReport;
  mutationEvent?: MutationHistoryEvent;
  reEvaluateConfidence: boolean;
}

export function reconcileCanonicalObject(input: ReconciliationInput): ReconciliationOutput {
  const { canonicalId, objectType, confidenceState, isReplay, replayGeneration } = input;
  const reconciliationId = `recon_${uuidv4()}`;
  const now = new Date().toISOString();

  // Stage 1 — Load canonical context (prior reconciliation if any)
  const priorStates = _byCanonicalId.get(canonicalId) ?? [];
  const priorVersionRef = priorStates.length > 0
    ? priorStates[priorStates.length - 1].reconciliationId
    : undefined;

  // Stage 2 — Load provider claim set
  const allClaims = getClaimsForCanonicalObject(canonicalId);
  const activeClaims = allClaims.filter(c => c.status === 'ACTIVE' || c.status === 'UNRESOLVED');
  const anchorClaims = getActiveAnchorClaims(canonicalId);
  const conflictClaims = getActiveConflictClaims(canonicalId);

  // Stage 3 — Admissibility gating
  const admissibilityResults: ClaimAdmissibilityResult[] = [];
  const admissibilityMap = new Map<string, ClaimAdmissibilityResult>();

  for (const claim of activeClaims) {
    const result = evaluateClaimAdmissibility(claim, confidenceState);
    admissibilityResults.push(result);
    admissibilityMap.set(claim.claimId, result);
  }

  // Stage 4 — Claim grouping
  const groups = groupClaimsByReconciliationSurface(activeClaims, admissibilityMap);

  // Stage 5 — Mode selection
  const { mode, reason: modeReason } = selectReconciliationMode(
    anchorClaims, conflictClaims, admissibilityMap, confidenceState);

  // Stage 6 — Winning / rejected / conflict derivation
  const winningAnchors = deriveWinningAnchors(anchorClaims, admissibilityMap, mode);
  const rejectedAnchors = deriveRejectedAnchors(anchorClaims, winningAnchors);
  const unresolvedConflicts = deriveUnresolvedConflicts(conflictClaims, anchorClaims, mode, canonicalId);

  const enrichmentOnlyClaims = activeClaims.filter(c => c.claimClass === 'ENRICHMENT');
  const nonComparableClaims = activeClaims.filter(c => {
    const adm = admissibilityMap.get(c.claimId);
    return adm?.admissibility === 'NON_ADMISSIBLE_CONFLICT_RECORD_ONLY'
      || adm?.admissibility === 'NON_ADMISSIBLE_HISTORICAL_ONLY';
  });

  // Stage 7 — Structural mutation planning
  let mutationPlan: MutationPlan | undefined;
  let mutationEvent: MutationHistoryEvent | undefined;

  if (mode === 'MERGE_REQUIRED') {
    const allCandidateIds = [...new Set(anchorClaims.flatMap(c => c.candidateCanonicalIds))];
    if (allCandidateIds.length >= 2) {
      mutationPlan = createMergePlan({
        sourceCanonicalIds: allCandidateIds.filter(id => id !== canonicalId),
        targetCanonicalId: canonicalId,
        objectType,
        winningAnchorRefs: winningAnchors.map(w => `${w.anchorType}:${w.anchorValue}`),
        claimPartitionMap: Object.fromEntries(
          allClaims.map(c => [c.claimId, canonicalId])),
        preservedConflictIds: unresolvedConflicts.map(c => c.conflictId),
        preservedConfidenceHistoryRefs: confidenceState ? [confidenceState.stateId] : [],
        rationale: modeReason,
      });
      mutationEvent = applyMergeMutation(mutationPlan, reconciliationId);
    }
  }

  if (mode === 'SPLIT_REQUIRED') {
    const splitId1 = `${canonicalId}_split_a`;
    const splitId2 = `${canonicalId}_split_b`;
    const partition: Record<string, string> = {};
    const anchorPartition: Record<string, string> = {};

    for (const claim of anchorClaims) {
      const scopeKey = [...claim.scopeDescriptor].sort().join('|');
      const target = groups.findIndex(g => g.scopeSurface === scopeKey) === 0 ? splitId1 : splitId2;
      partition[claim.claimId] = target;
      anchorPartition[`${claim.comparableFieldFamily}:${scopeKey}`] = target;
    }

    mutationPlan = createSplitPlan({
      sourceCanonicalId: canonicalId,
      resultingCanonicalIds: [splitId1, splitId2],
      objectType,
      claimPartitionMap: partition,
      anchorPartitionMap: anchorPartition,
      inheritedScars: confidenceState?.activeScars.map(s => s.code) ?? [],
      childSpecificScars: {},
      rationale: modeReason,
    });
    mutationEvent = applySplitMutation(mutationPlan, reconciliationId);
  }

  // Stage 8 — Canonical update (state production)
  const state: ReconciledCanonicalState = {
    schemaVersion: L34_RECONCILED_STATE_SCHEMA_VERSION,
    reconciliationId,
    canonicalId,
    objectType,
    mode,
    providerClaimIds: activeClaims.map(c => c.claimId),
    winningAnchors,
    rejectedAnchors,
    unresolvedConflicts,
    nonComparableClaimIds: nonComparableClaims.map(c => c.claimId),
    enrichmentOnlyClaimIds: enrichmentOnlyClaims.map(c => c.claimId),
    confidenceStateId: confidenceState?.stateId,
    mutationPlanId: mutationPlan?.planId,
    priorVersionRef,
    createdAt: now,
    policyVersion: L34_POLICY_VERSION,
    evaluatorVersion: L34_RECONCILIATION_VERSION,
  };

  // Stage 9 — Report generation
  const reEvaluateConfidence =
    mode === 'MERGE_REQUIRED'
    || mode === 'SPLIT_REQUIRED'
    || unresolvedConflicts.some(c => c.confidenceAffecting)
    || winningAnchors.length !== (priorStates.length > 0
      ? priorStates[priorStates.length - 1].winningAnchors.length : 0);

  const diff: ReconciliationDiff = {
    anchorsAdded: winningAnchors
      .filter(w => !priorStates.length || !priorStates[priorStates.length - 1].winningAnchors
        .some(pw => pw.anchorType === w.anchorType && pw.anchorValue === w.anchorValue))
      .map(w => `${w.anchorType}:${w.anchorValue}`),
    anchorsRemoved: (priorStates.length > 0
      ? priorStates[priorStates.length - 1].winningAnchors
        .filter(pw => !winningAnchors.some(w => w.anchorType === pw.anchorType && w.anchorValue === pw.anchorValue))
        .map(pw => `${pw.anchorType}:${pw.anchorValue}`)
      : []),
    anchorsModified: [],
    conflictsResolved: [],
    conflictsCreated: unresolvedConflicts.map(c => c.conflictId),
    fieldChanges: [],
    structuralChange: mode === 'MERGE_REQUIRED' ? 'MERGE' : mode === 'SPLIT_REQUIRED' ? 'SPLIT' : 'NONE',
  };

  const report = buildReconciliationReport({
    reconciliationId,
    canonicalId,
    objectType,
    isReplay: isReplay ?? false,
    replayGeneration,
    claimSetSummary: {
      totalClaims: allClaims.length,
      activeClaims: activeClaims.length,
      anchorClaims: anchorClaims.length,
      conflictClaims: conflictClaims.length,
      enrichmentClaims: enrichmentOnlyClaims.length,
      providerIds: [...new Set(activeClaims.map(c => c.providerId))],
    },
    admissibilityBreakdown: admissibilityResults,
    modeSelected: mode,
    modeSelectionReason: modeReason,
    winningAnchors,
    rejectedAnchors,
    unresolvedConflicts,
    mutationPlanId: mutationPlan?.planId,
    mutationSummary: mutationEvent?.claimMigrationSummary,
    confidenceInteraction: {
      priorConfidenceStateId: confidenceState?.stateId,
      priorBand: confidenceState?.band,
      reEvaluationTriggered: reEvaluateConfidence,
      reEvaluationReason: reEvaluateConfidence
        ? `Reconciliation mode ${mode} changed canonical state`
        : undefined,
    },
    canonicalDiff: diff,
    auditRefs: [`recon:${reconciliationId}`, `policy:${L34_POLICY_VERSION}`],
  });

  // Stage 10 — Persistence
  _reconciledStates.push(state);
  const existing = _byCanonicalId.get(canonicalId) ?? [];
  existing.push(state);
  _byCanonicalId.set(canonicalId, existing);

  return { state, report, mutationEvent, reEvaluateConfidence };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getReconciledStatesForCanonicalId(
  canonicalId: string,
): ReconciledCanonicalState[] {
  return _byCanonicalId.get(canonicalId) ?? [];
}

export function getLatestReconciledState(
  canonicalId: string,
): ReconciledCanonicalState | undefined {
  const states = _byCanonicalId.get(canonicalId);
  return states ? states[states.length - 1] : undefined;
}

export function getAllReconciledStates(): readonly ReconciledCanonicalState[] {
  return _reconciledStates;
}

export function resetReconciliationState(): void {
  _reconciledStates.length = 0;
  _byCanonicalId.clear();
}
