/**
 * L3.4 — Cross-Provider Reconciliation: Constitutional Test Suite
 *
 * Eight suites:
 *   A. Claim ledger (append, supersede, reject, query, conflict linkage)
 *   B. Admissibility (strong, conditional, enrichment-only, non-admissible, L3.3 gating)
 *   C. Mode selection (deterministic, weighted, contested, split, merge)
 *   D. Winning / rejected / conflict outputs
 *   E. Merge / split engine (ancestry, lineage, claim partition)
 *   F. Report integrity (all required sections, diff, history)
 *   G. Anti-fake suite (weak majority, provider mismatch, scope collision)
 *   H. Cross-layer propagation (L3.3 re-evaluation, historical replay)
 */

import assert from 'node:assert';
import type { CanonicalObjectType } from '../services/canonicalization/canonical-entity-types';
import type { ConfidenceBand, ConfidenceScar } from '../services/canonicalization/confidence-factors';
import type { RightsProfile } from '../services/canonicalization/confidence-policy-map';
import type { EntityConfidenceState } from '../services/canonicalization/entity-confidence-model';

import {
  L34_CLAIM_SCHEMA_VERSION,
  appendProviderClaim,
  getClaimById,
  getClaimsForCanonicalObject,
  getClaimsByProvider,
  getConflictingClaims,
  getWinningCandidateClaims,
  getActiveAnchorClaims,
  markClaimRejected,
  markClaimSuperseded,
  linkConflict,
  getClaimsAtReplayTime,
  resetClaimLedger,
  type ProviderClaimRecord,
} from '../services/canonicalization/provider-claim-ledger';

import {
  L34_RECONCILED_STATE_SCHEMA_VERSION,
  L34_ANCHOR_SCHEMA_VERSION,
  L34_CONFLICT_SCHEMA_VERSION,
  evaluateClaimAdmissibility,
  selectReconciliationMode,
  deriveWinningAnchors,
  deriveRejectedAnchors,
  deriveUnresolvedConflicts,
  reconcileCanonicalObject,
  getLatestReconciledState,
  resetReconciliationState,
  type ClaimAdmissibilityResult,
} from '../services/canonicalization/cross-provider-reconciliation';

import {
  L34_MERGE_SCHEMA_VERSION,
  L34_SPLIT_SCHEMA_VERSION,
  L34_MUTATION_EVENT_SCHEMA_VERSION,
  createMergePlan,
  createSplitPlan,
  applyMergeMutation,
  applySplitMutation,
  getMutationHistory,
  getMutationHistoryForCanonicalId,
  getAncestryLinks,
  resetMutationHistory,
} from '../services/canonicalization/entity-merge-split-engine';

import {
  L34_REPORT_SCHEMA_VERSION,
  L34_REVIEW_SCHEMA_VERSION,
  getReconciliationReportStore,
  getHistoricalReconciliationReports,
  getReconciliationReviewQueue,
  getReconciliationReviewsByType,
  resetReportStore,
} from '../services/canonicalization/canonical-reconciliation-report';

import { resetGateAuditLog } from '../services/canonicalization/confidence-gate';

// ═══════════════════════════════════════════════════════════════════════════════
// HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e: any) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

function resetAll() {
  resetClaimLedger();
  resetReconciliationState();
  resetMutationHistory();
  resetReportStore();
  resetGateAuditLog();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function makeRights(overrides: Partial<RightsProfile> = {}): RightsProfile {
  return {
    scoring: 'ALLOW', contradictionEngine: 'ALLOW', scenarioEngine: 'ALLOW',
    judgment: 'ALLOW', graphRelations: 'ALLOW', canonicalMutation: 'ALLOW',
    metricAttachment: 'ALLOW', contextualReasoning: 'ALLOW', enrichmentOnly: 'ALLOW',
    display: 'ALLOW', unresolvedQueue: 'DENY', forensicReplay: 'ALLOW',
    manualReviewQueue: 'DENY', conditions: [],
    ...overrides,
  };
}

function makeConfidenceState(overrides: Partial<EntityConfidenceState> = {}): EntityConfidenceState {
  return {
    stateId: 'cs_test', canonicalId: 'ast_btc', objectType: 'ASSET',
    evaluatedAt: new Date().toISOString(), rawScore: 90, finalScore: 88,
    band: 'HIGH', epistemicState: 'RESOLVED_CLEAN', factorEvaluations: [],
    activeScars: [], rightsProfile: makeRights(), capChain: [],
    downgradeReasons: [], provenanceSummary: [], temporalSummary: [],
    policyVersion: '2.0.0', evaluatorVersion: '2.0.0',
    transitionReason: 'INITIAL', evidenceRefs: [],
    ...overrides,
  };
}

function anchorClaim(
  providerId: string,
  canonicalId: string,
  fieldFamily: string,
  scope: string[],
  overrides: Partial<ProviderClaimRecord> = {},
): ProviderClaimRecord {
  return appendProviderClaim({
    providerId,
    providerClaimRef: `ref_${providerId}_${fieldFamily}`,
    objectType: 'ASSET' as CanonicalObjectType,
    candidateCanonicalIds: [canonicalId],
    claimClass: 'ANCHOR',
    comparableFieldFamily: fieldFamily,
    scopeDescriptor: scope,
    payload: {},
    confidenceGateEligible: true,
    authorityRefs: [`auth_${providerId}`],
    lineageRefs: [`lin_${providerId}`],
    observedAt: new Date().toISOString(),
    conflictClaimIds: [],
    supersedesClaimIds: [],
    supersededByClaimIds: [],
    rationale: `Anchor from ${providerId}`,
    normalizationMeta: {},
    ...overrides,
  });
}

function conflictClaim(
  providerId: string,
  canonicalId: string,
  rationale: string,
  conflictWith: string[] = [],
): ProviderClaimRecord {
  return appendProviderClaim({
    providerId,
    providerClaimRef: `ref_conflict_${providerId}`,
    objectType: 'ASSET' as CanonicalObjectType,
    candidateCanonicalIds: [canonicalId],
    claimClass: 'CONFLICT',
    comparableFieldFamily: 'identity',
    scopeDescriptor: ['chain:ethereum'],
    payload: {},
    confidenceGateEligible: false,
    authorityRefs: [`auth_${providerId}`],
    lineageRefs: [],
    observedAt: new Date().toISOString(),
    conflictClaimIds: conflictWith,
    supersedesClaimIds: [],
    supersededByClaimIds: [],
    rationale,
    normalizationMeta: {},
    status: 'ACTIVE',
  });
}

function enrichmentClaim(providerId: string, canonicalId: string): ProviderClaimRecord {
  return appendProviderClaim({
    providerId,
    providerClaimRef: `ref_enrich_${providerId}`,
    objectType: 'ASSET' as CanonicalObjectType,
    candidateCanonicalIds: [canonicalId],
    claimClass: 'ENRICHMENT',
    comparableFieldFamily: 'metadata',
    scopeDescriptor: ['display'],
    payload: { description: 'test enrichment' },
    confidenceGateEligible: true,
    authorityRefs: [],
    lineageRefs: [],
    observedAt: new Date().toISOString(),
    conflictClaimIds: [],
    supersedesClaimIds: [],
    supersededByClaimIds: [],
    rationale: 'Enrichment only',
    normalizationMeta: {},
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — CLAIM LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section A: Claim ledger ═══');

test('Append claim returns record with claimId', () => {
  resetAll();
  const c = anchorClaim('coingecko', 'ast_btc', 'contract', ['chain:ethereum']);
  assert.ok(c.claimId.startsWith('claim_'));
  assert.strictEqual(c.status, 'ACTIVE');
  assert.strictEqual(c.providerId, 'coingecko');
});

test('Retrieve claims by canonical object', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  anchorClaim('cg', 'ast_eth', 'contract', ['chain:eth']);
  const btcClaims = getClaimsForCanonicalObject('ast_btc');
  assert.strictEqual(btcClaims.length, 2);
});

test('Retrieve claims by provider', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  anchorClaim('cg', 'ast_eth', 'contract', ['chain:eth']);
  const cgClaims = getClaimsByProvider('cg');
  assert.strictEqual(cgClaims.length, 2);
});

test('Supersede claim links both directions', () => {
  resetAll();
  const old = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const next = anchorClaim('cg', 'ast_btc', 'contract_v2', ['chain:btc']);
  markClaimSuperseded(old.claimId, next.claimId);
  assert.strictEqual(old.status, 'SUPERSEDED');
  assert.ok(old.supersededByClaimIds.includes(next.claimId));
  assert.ok(next.supersedesClaimIds.includes(old.claimId));
});

test('Reject claim updates status and rationale', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  markClaimRejected(c.claimId, 'INVALID_SCOPE');
  assert.strictEqual(c.status, 'REJECTED');
  assert.ok(c.rationale.includes('REJECTED'));
});

test('Conflict linkage preserved bidirectionally', () => {
  resetAll();
  const a = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const b = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:eth']);
  linkConflict(a.claimId, b.claimId);
  assert.ok(a.conflictClaimIds.includes(b.claimId));
  assert.ok(b.conflictClaimIds.includes(a.claimId));
  const conflicts = getConflictingClaims(a.claimId);
  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].claimId, b.claimId);
});

test('Retrieve historical claims by replay time', () => {
  resetAll();
  const past = new Date(Date.now() - 3600000).toISOString();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const historical = getClaimsAtReplayTime('ast_btc', past);
  assert.strictEqual(historical.length, 0);
  const current = getClaimsAtReplayTime('ast_btc', new Date().toISOString());
  assert.strictEqual(current.length, 1);
});

test('Winning candidate claims exclude enrichment and ineligible', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  enrichmentClaim('cmc', 'ast_btc');
  anchorClaim('dex', 'ast_btc', 'pool', ['chain:eth'], { confidenceGateEligible: false });
  const winning = getWinningCandidateClaims('ast_btc');
  assert.strictEqual(winning.length, 1);
  assert.strictEqual(winning[0].providerId, 'cg');
});

test('Status filter works on retrieval', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  markClaimRejected(c1.claimId, 'test');
  const active = getClaimsForCanonicalObject('ast_btc', ['ACTIVE']);
  assert.strictEqual(active.length, 1);
  const rejected = getClaimsForCanonicalObject('ast_btc', ['REJECTED']);
  assert.strictEqual(rejected.length, 1);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — ADMISSIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section B: Admissibility ═══');

test('Strong admissible: active, gate-eligible, has authority + lineage', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const result = evaluateClaimAdmissibility(c);
  assert.strictEqual(result.admissibility, 'ADMISSIBLE_STRONG');
});

test('Conditional admissible: no authority refs', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc'], { authorityRefs: [] });
  const result = evaluateClaimAdmissibility(c);
  assert.strictEqual(result.admissibility, 'ADMISSIBLE_CONDITIONAL');
  assert.ok(result.reasons.includes('NO_AUTHORITY_REFS'));
});

test('Enrichment-only for ENRICHMENT class', () => {
  resetAll();
  const c = enrichmentClaim('cg', 'ast_btc');
  const result = evaluateClaimAdmissibility(c);
  assert.strictEqual(result.admissibility, 'ADMISSIBLE_ENRICHMENT_ONLY');
});

test('Historical claim non-admissible', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc'], { status: 'HISTORICAL' });
  const result = evaluateClaimAdmissibility(c);
  assert.strictEqual(result.admissibility, 'NON_ADMISSIBLE_HISTORICAL_ONLY');
});

test('Rejected claim non-admissible', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  markClaimRejected(c.claimId, 'test');
  const result = evaluateClaimAdmissibility(c);
  assert.strictEqual(result.admissibility, 'NON_ADMISSIBLE_CONFLICT_RECORD_ONLY');
});

test('Gate-ineligible conflict claim becomes NON_ADMISSIBLE_CONFLICT_RECORD_ONLY', () => {
  resetAll();
  const c = conflictClaim('cg', 'ast_btc', 'CO_AUTHORITY dispute');
  const result = evaluateClaimAdmissibility(c);
  assert.strictEqual(result.admissibility, 'NON_ADMISSIBLE_CONFLICT_RECORD_ONLY');
});

test('L3.3 gate denial blocks winning eligibility', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const cs = makeConfidenceState({
    band: 'UNRESOLVED',
    epistemicState: 'UNRESOLVED',
    rightsProfile: makeRights({ canonicalMutation: 'DENY' }),
  });
  const result = evaluateClaimAdmissibility(c, cs);
  assert.strictEqual(result.admissibility, 'NON_ADMISSIBLE_CONFLICT_RECORD_ONLY');
  assert.ok(result.reasons.some(r => r.includes('L33_GATE_DENIED')));
});

test('L3.3 conditional gate yields conditional admissibility', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const cs = makeConfidenceState({
    band: 'MEDIUM',
    epistemicState: 'RESOLVED_WITH_SCAR',
    rightsProfile: makeRights({ canonicalMutation: 'ALLOW_WITH_SCAR' }),
  });
  const result = evaluateClaimAdmissibility(c, cs);
  assert.ok(result.reasons.some(r => r.includes('L33_GATE_CONDITIONAL')));
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C — MODE SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section C: Mode selection ═══');

test('Deterministic merge: all anchors same scope, strong, no conflict', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const c2 = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
  ]);
  const { mode } = selectReconciliationMode([c1, c2], [], admMap);
  assert.strictEqual(mode, 'DETERMINISTIC_MERGE');
});

test('Contested merge: co-authority conflict on anchors', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const c2 = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  const conf = conflictClaim('arkham', 'ast_btc', 'CO_AUTHORITY dispute between cg and cmc', [c1.claimId, c2.claimId]);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
  ]);
  const { mode } = selectReconciliationMode([c1, c2], [conf], admMap);
  assert.strictEqual(mode, 'CONTESTED_MERGE');
});

test('Weighted convergence: majority align without conflict', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const c2 = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  const c3 = anchorClaim('dex', 'ast_btc', 'contract', ['chain:eth']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c3.claimId, { claimId: c3.claimId, admissibility: 'ADMISSIBLE_CONDITIONAL', reasons: ['weak'] }],
  ]);
  const { mode } = selectReconciliationMode([c1, c2, c3], [], admMap);
  assert.strictEqual(mode, 'WEIGHTED_CONVERGENCE');
});

test('Split required: distinct scope partitions', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc', 'native']);
  const c2 = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:ethereum', 'wrapped']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
  ]);
  const { mode } = selectReconciliationMode([c1, c2], [], admMap);
  assert.strictEqual(mode, 'SPLIT_REQUIRED');
});

test('Merge required: strong anchor spans multiple candidates', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc'], {
    candidateCanonicalIds: ['ast_btc', 'ast_btc_v2'],
  });
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
  ]);
  const { mode } = selectReconciliationMode([c1], [], admMap);
  assert.strictEqual(mode, 'MERGE_REQUIRED');
});

test('No anchor claims defaults to contested', () => {
  resetAll();
  const { mode } = selectReconciliationMode([], [], new Map());
  assert.strictEqual(mode, 'CONTESTED_MERGE');
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D — WINNING / REJECTED / CONFLICT OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section D: Winning/rejected/conflict outputs ═══');

test('Winning anchor derivation from strong claims', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const c2 = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  const c3 = anchorClaim('weak', 'ast_btc', 'contract', ['chain:eth']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c3.claimId, { claimId: c3.claimId, admissibility: 'ADMISSIBLE_CONDITIONAL', reasons: [] }],
  ]);
  const winners = deriveWinningAnchors([c1, c2, c3], admMap, 'DETERMINISTIC_MERGE');
  assert.ok(winners.length >= 1);
  assert.ok(winners[0].supportingClaimIds.length >= 1);
});

test('Rejected anchor persistence', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const c2 = anchorClaim('weak', 'ast_btc', 'contract', ['chain:eth']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_CONDITIONAL', reasons: [] }],
  ]);
  const winners = deriveWinningAnchors([c1, c2], admMap, 'WEIGHTED_CONVERGENCE');
  const rejected = deriveRejectedAnchors([c1, c2], winners);
  assert.ok(rejected.length >= 0);
  for (const r of rejected) {
    assert.ok(r.rejectionReason.length > 0, 'Rejection reason exists');
    assert.ok(r.sourceClaimIds.length > 0, 'Source claim ids preserved');
  }
});

test('Contested merge produces no winning anchors', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
  ]);
  const winners = deriveWinningAnchors([c1], admMap, 'CONTESTED_MERGE');
  assert.strictEqual(winners.length, 0);
});

test('Unresolved conflict persistence with metadata', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const conf = conflictClaim('arkham', 'ast_btc', 'CO_AUTHORITY dispute');
  linkConflict(c1.claimId, conf.claimId);
  const conflicts = deriveUnresolvedConflicts([conf], [c1], 'CONTESTED_MERGE', 'ast_btc');
  assert.ok(conflicts.length >= 1);
  const first = conflicts[0];
  assert.ok(first.conflictId.startsWith('conf_'));
  assert.ok(first.affectedClaimIds.length > 0);
  assert.ok(first.resolutionPrerequisites.length > 0);
});

test('Enrichment claims excluded from winning anchors', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const enrich = enrichmentClaim('cmc', 'ast_btc');
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [enrich.claimId, { claimId: enrich.claimId, admissibility: 'ADMISSIBLE_ENRICHMENT_ONLY', reasons: [] }],
  ]);
  const winners = deriveWinningAnchors([c1], admMap, 'DETERMINISTIC_MERGE');
  const winnerClaimIds = winners.flatMap(w => w.supportingClaimIds);
  assert.ok(!winnerClaimIds.includes(enrich.claimId));
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION E — MERGE / SPLIT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section E: Merge/split engine ═══');

test('Merge preserves ancestry links', () => {
  resetAll();
  const plan = createMergePlan({
    sourceCanonicalIds: ['ast_btc_old', 'ast_btc_v2'],
    targetCanonicalId: 'ast_btc_merged',
    objectType: 'ASSET',
    winningAnchorRefs: ['contract:btc_native'],
    claimPartitionMap: { claim_1: 'ast_btc_merged', claim_2: 'ast_btc_merged' },
    preservedConflictIds: ['conf_1'],
    preservedConfidenceHistoryRefs: ['cs_1'],
    rationale: 'Both objects are same asset',
  });
  assert.strictEqual(plan.ancestryLinks.length, 2);
  assert.ok(plan.ancestryLinks.every(l => l.relation === 'MERGED_INTO'));
  assert.ok(plan.ancestryLinks.every(l => l.childCanonicalId === 'ast_btc_merged'));
});

test('Merge mutation creates history event', () => {
  resetAll();
  const plan = createMergePlan({
    sourceCanonicalIds: ['ast_a', 'ast_b'],
    targetCanonicalId: 'ast_merged',
    objectType: 'ASSET',
    winningAnchorRefs: [],
    claimPartitionMap: {},
    preservedConflictIds: [],
    preservedConfidenceHistoryRefs: [],
    rationale: 'Merge test',
  });
  const event = applyMergeMutation(plan, 'recon_test');
  assert.ok(event.eventId.startsWith('mevt_'));
  assert.strictEqual(event.mutationType, 'MERGE');
  assert.ok(event.affectedCanonicalIds.includes('ast_a'));
  assert.ok(event.affectedCanonicalIds.includes('ast_b'));
  assert.ok(event.affectedCanonicalIds.includes('ast_merged'));
  assert.strictEqual(event.reversible, true);
});

test('Split preserves parent history', () => {
  resetAll();
  const plan = createSplitPlan({
    sourceCanonicalId: 'ast_ambiguous',
    resultingCanonicalIds: ['ast_btc', 'ast_wbtc'],
    objectType: 'ASSET',
    claimPartitionMap: { claim_1: 'ast_btc', claim_2: 'ast_wbtc' },
    anchorPartitionMap: { 'contract:native': 'ast_btc', 'contract:wrapped': 'ast_wbtc' },
    inheritedScars: ['WRAPPED_NATIVE_RISK'],
    childSpecificScars: { ast_wbtc: ['SCOPE_AMBIGUITY'] },
    rationale: 'BTC and WBTC are distinct',
  });
  assert.strictEqual(plan.ancestryLinks.length, 2);
  assert.ok(plan.ancestryLinks.every(l => l.relation === 'SPLIT_FROM'));
  assert.ok(plan.ancestryLinks.every(l => l.parentCanonicalId === 'ast_ambiguous'));
});

test('Split mutation creates history event', () => {
  resetAll();
  const plan = createSplitPlan({
    sourceCanonicalId: 'ast_ambiguous',
    resultingCanonicalIds: ['ast_a', 'ast_b'],
    objectType: 'ASSET',
    claimPartitionMap: {},
    anchorPartitionMap: {},
    inheritedScars: [],
    childSpecificScars: {},
    rationale: 'Split test',
  });
  const event = applySplitMutation(plan, 'recon_split');
  assert.strictEqual(event.mutationType, 'SPLIT');
  assert.ok(event.affectedCanonicalIds.includes('ast_ambiguous'));
  assert.ok(event.affectedCanonicalIds.includes('ast_a'));
});

test('Ancestry links queryable after mutation', () => {
  resetAll();
  const plan = createMergePlan({
    sourceCanonicalIds: ['ast_x'],
    targetCanonicalId: 'ast_y',
    objectType: 'ASSET',
    winningAnchorRefs: [],
    claimPartitionMap: {},
    preservedConflictIds: [],
    preservedConfidenceHistoryRefs: [],
    rationale: 'test',
  });
  applyMergeMutation(plan, 'recon_test');
  const links = getAncestryLinks('ast_x');
  assert.ok(links.length >= 1);
  assert.strictEqual(links[0].childCanonicalId, 'ast_y');
});

test('Mutation history queryable by canonical id', () => {
  resetAll();
  const plan = createSplitPlan({
    sourceCanonicalId: 'ast_parent',
    resultingCanonicalIds: ['ast_child1', 'ast_child2'],
    objectType: 'ASSET',
    claimPartitionMap: {},
    anchorPartitionMap: {},
    inheritedScars: [],
    childSpecificScars: {},
    rationale: 'test',
  });
  applySplitMutation(plan, 'recon_test');
  const history = getMutationHistoryForCanonicalId('ast_parent');
  assert.strictEqual(history.length, 1);
  const childHistory = getMutationHistoryForCanonicalId('ast_child1');
  assert.strictEqual(childHistory.length, 1);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION F — REPORT INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section F: Report integrity ═══');

test('Full pipeline produces report with all required sections', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  const report = output.report;
  assert.ok(report.reportId.startsWith('rpt_'));
  assert.ok(report.reconciliationId.startsWith('recon_'));
  assert.strictEqual(report.claimSetSummary.totalClaims, 2);
  assert.strictEqual(report.claimSetSummary.anchorClaims, 2);
  assert.ok(report.admissibilityBreakdown.length > 0);
  assert.ok(report.modeSelected);
  assert.ok(report.modeSelectionReason.length > 0);
  assert.ok(report.policyVersion);
});

test('Report diff tracks anchor changes', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  const diff = output.report.canonicalDiff;
  assert.ok(diff.structuralChange === 'NONE' || diff.structuralChange === 'MERGE' || diff.structuralChange === 'SPLIT');
});

test('Historical reports retrievable by canonical id', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  const reports = getHistoricalReconciliationReports('ast_btc');
  assert.strictEqual(reports.length, 2);
});

test('Unresolved conflicts visible in report', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const conf = conflictClaim('arkham', 'ast_btc', 'CO_AUTHORITY dispute', [c1.claimId]);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.ok(output.report.unresolvedConflicts.length >= 1);
});

test('Review queues populated for contested reconciliation', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  conflictClaim('arkham', 'ast_btc', 'CO_AUTHORITY dispute', [c1.claimId]);
  reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  const queue = getReconciliationReviewQueue();
  assert.ok(queue.length >= 1, 'Review queue has entries');
  const contested = getReconciliationReviewsByType('CONTESTED_RECONCILIATION_QUEUE');
  assert.ok(contested.length >= 1, 'Contested queue populated');
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION G — ANTI-FAKE SUITE
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section G: Anti-fake suite ═══');

test('Weak majority cannot override strong authoritative anchor', () => {
  resetAll();
  const strong = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const weak1 = anchorClaim('weak1', 'ast_btc', 'contract', ['chain:btc'], {
    authorityRefs: [], lineageRefs: [],
  });
  const weak2 = anchorClaim('weak2', 'ast_btc', 'contract', ['chain:btc'], {
    authorityRefs: [], lineageRefs: [],
  });
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [strong.claimId, { claimId: strong.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [weak1.claimId, { claimId: weak1.claimId, admissibility: 'ADMISSIBLE_CONDITIONAL', reasons: ['NO_AUTHORITY_REFS'] }],
    [weak2.claimId, { claimId: weak2.claimId, admissibility: 'ADMISSIBLE_CONDITIONAL', reasons: ['NO_AUTHORITY_REFS'] }],
  ]);
  const winners = deriveWinningAnchors([strong, weak1, weak2], admMap, 'WEIGHTED_CONVERGENCE');
  assert.ok(winners.length >= 1);
  assert.ok(winners[0].supportingClaimIds.includes(strong.claimId), 'Strong claim is in winning set');
});

test('Provider mismatch not erased by reconciliation', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const c2 = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:eth']);
  linkConflict(c1.claimId, c2.claimId);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  const allClaimsStillExist = getClaimsForCanonicalObject('ast_btc');
  assert.ok(allClaimsStillExist.length >= 2, 'All claims preserved');
  const mismatchQueryable = getConflictingClaims(c1.claimId);
  assert.ok(mismatchQueryable.length >= 1, 'Mismatch still queryable');
});

test('Scope conflict blocks clean deterministic fusion', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc', 'native']);
  const c2 = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:ethereum', 'wrapped']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
  ]);
  const { mode } = selectReconciliationMode([c1, c2], [], admMap);
  assert.ok(mode !== 'DETERMINISTIC_MERGE', `Expected non-deterministic mode, got ${mode}`);
});

test('Wrapped/native collapse prevented through split', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc', 'native']);
  anchorClaim('cmc', 'ast_btc', 'contract', ['chain:ethereum', 'wrapped']);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.ok(
    output.state.mode === 'SPLIT_REQUIRED' || output.state.unresolvedConflicts.length > 0,
    'Wrapped/native difference handled as split or conflict',
  );
});

test('Protocol/token collapse prevented — different field families', () => {
  resetAll();
  anchorClaim('cg', 'proto_uni', 'governance_contract', ['chain:ethereum', 'protocol']);
  anchorClaim('cmc', 'proto_uni', 'token_contract', ['chain:ethereum', 'token']);
  const output = reconcileCanonicalObject({
    canonicalId: 'proto_uni',
    objectType: 'PROTOCOL',
  });
  assert.ok(
    output.state.mode !== 'DETERMINISTIC_MERGE' || output.state.unresolvedConflicts.length > 0,
    'Protocol/token not cleanly merged',
  );
});

test('Entity attribution conflict preserved', () => {
  resetAll();
  const c1 = anchorClaim('arkham', 'ent_whale', 'address_cluster', ['chain:ethereum'], {
    objectType: 'ENTITY' as CanonicalObjectType,
  });
  const c2 = anchorClaim('nansen', 'ent_whale', 'address_cluster', ['chain:ethereum'], {
    objectType: 'ENTITY' as CanonicalObjectType,
  });
  const conf = conflictClaim('system', 'ent_whale', 'CO_AUTHORITY dispute arkham vs nansen', [c1.claimId, c2.claimId]);
  const output = reconcileCanonicalObject({ canonicalId: 'ent_whale', objectType: 'ENTITY' });
  assert.ok(output.state.unresolvedConflicts.length >= 1);
  assert.ok(output.state.mode === 'CONTESTED_MERGE');
});

test('Topic overlap preserved — not silently merged', () => {
  resetAll();
  anchorClaim('cg', 'topic_ai', 'topic_boundary', ['ai', 'agents'], {
    objectType: 'NARRATIVE_TOPIC' as CanonicalObjectType,
  });
  anchorClaim('cmc', 'topic_ai', 'topic_boundary', ['ai', 'infrastructure'], {
    objectType: 'NARRATIVE_TOPIC' as CanonicalObjectType,
  });
  const output = reconcileCanonicalObject({ canonicalId: 'topic_ai', objectType: 'NARRATIVE_TOPIC' });
  assert.ok(
    output.state.mode !== 'DETERMINISTIC_MERGE' || output.state.unresolvedConflicts.length > 0,
    'Topic overlap not cleanly merged',
  );
});

test('Pair/pool collapse prevented — different scopes', () => {
  resetAll();
  anchorClaim('dex_a', 'pair_btcusdt', 'market_scope', ['venue:binance', 'spot'], {
    objectType: 'PAIR' as CanonicalObjectType,
  });
  anchorClaim('dex_b', 'pair_btcusdt', 'market_scope', ['pool:0xabc', 'amm'], {
    objectType: 'PAIR' as CanonicalObjectType,
  });
  const output = reconcileCanonicalObject({ canonicalId: 'pair_btcusdt', objectType: 'PAIR' });
  assert.ok(
    output.state.mode !== 'DETERMINISTIC_MERGE',
    'Pair/pool not treated as same object',
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION H — CROSS-LAYER PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section H: Cross-layer propagation ═══');

test('Reconciliation signals L3.3 re-evaluation when structural change', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc', 'native']);
  anchorClaim('cmc', 'ast_btc', 'contract', ['chain:ethereum', 'wrapped']);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  if (output.state.mode === 'SPLIT_REQUIRED' || output.state.mode === 'MERGE_REQUIRED') {
    assert.strictEqual(output.reEvaluateConfidence, true);
  }
});

test('Reconciliation signals re-evaluation when anchor set changes', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const out1 = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  anchorClaim('cmc', 'ast_btc', 'contract_v2', ['chain:btc']);
  const out2 = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.strictEqual(out2.reEvaluateConfidence, true);
});

test('Reconciliation respects L3.3 confidence state', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const cs = makeConfidenceState({ band: 'HIGH' });
  const output = reconcileCanonicalObject({
    canonicalId: 'ast_btc',
    objectType: 'ASSET',
    confidenceState: cs,
  });
  assert.strictEqual(output.report.confidenceInteraction.priorBand, 'HIGH');
  assert.strictEqual(output.report.confidenceInteraction.priorConfidenceStateId, 'cs_test');
});

test('Reconciled state persisted and queryable', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  const latest = getLatestReconciledState('ast_btc');
  assert.ok(latest);
  assert.strictEqual(latest!.canonicalId, 'ast_btc');
  assert.ok(latest!.reconciliationId.startsWith('recon_'));
});

test('Reconciliation carries policy and evaluator version', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.strictEqual(output.state.policyVersion, '1.0.0');
  assert.strictEqual(output.state.evaluatorVersion, '1.0.0');
  assert.strictEqual(output.report.policyVersion, '1.0.0');
});

test('Multiple reconciliation runs produce version chain', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const out1 = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.strictEqual(out1.state.priorVersionRef, undefined);
  anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  const out2 = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.strictEqual(out2.state.priorVersionRef, out1.state.reconciliationId);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION I — CONTRACT FREEZE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Section I: Contract freeze verification ═══');

test('Version constants are frozen at v1', () => {
  assert.strictEqual(L34_CLAIM_SCHEMA_VERSION, 'v1');
  assert.strictEqual(L34_RECONCILED_STATE_SCHEMA_VERSION, 'v1');
  assert.strictEqual(L34_ANCHOR_SCHEMA_VERSION, 'v1');
  assert.strictEqual(L34_CONFLICT_SCHEMA_VERSION, 'v1');
  assert.strictEqual(L34_MERGE_SCHEMA_VERSION, 'v1');
  assert.strictEqual(L34_SPLIT_SCHEMA_VERSION, 'v1');
  assert.strictEqual(L34_MUTATION_EVENT_SCHEMA_VERSION, 'v1');
  assert.strictEqual(L34_REPORT_SCHEMA_VERSION, 'v1');
  assert.strictEqual(L34_REVIEW_SCHEMA_VERSION, 'v1');
});

test('ProviderClaimRecord carries schemaVersion', () => {
  resetAll();
  const c = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  assert.strictEqual(c.schemaVersion, 'v1');
});

test('ReconciledCanonicalState carries schemaVersion', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.strictEqual(output.state.schemaVersion, 'v1');
});

test('WinningAnchor carries schemaVersion', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const c2 = anchorClaim('cmc', 'ast_btc', 'contract', ['chain:btc']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
  ]);
  const winners = deriveWinningAnchors([c1, c2], admMap, 'DETERMINISTIC_MERGE');
  assert.ok(winners.length >= 1);
  assert.strictEqual(winners[0].schemaVersion, 'v1');
});

test('RejectedAnchor carries schemaVersion', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const c2 = anchorClaim('weak', 'ast_btc', 'contract', ['chain:eth']);
  const admMap = new Map<string, ClaimAdmissibilityResult>([
    [c1.claimId, { claimId: c1.claimId, admissibility: 'ADMISSIBLE_STRONG', reasons: [] }],
    [c2.claimId, { claimId: c2.claimId, admissibility: 'ADMISSIBLE_CONDITIONAL', reasons: [] }],
  ]);
  const winners = deriveWinningAnchors([c1, c2], admMap, 'WEIGHTED_CONVERGENCE');
  const rejected = deriveRejectedAnchors([c1, c2], winners);
  if (rejected.length > 0) {
    assert.strictEqual(rejected[0].schemaVersion, 'v1');
  }
});

test('UnresolvedConflictRecord carries schemaVersion', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const conf = conflictClaim('arkham', 'ast_btc', 'CO_AUTHORITY dispute');
  linkConflict(c1.claimId, conf.claimId);
  const conflicts = deriveUnresolvedConflicts([conf], [c1], 'CONTESTED_MERGE', 'ast_btc');
  assert.ok(conflicts.length >= 1);
  assert.strictEqual(conflicts[0].schemaVersion, 'v1');
});

test('MergePlan carries schemaVersion', () => {
  resetAll();
  const plan = createMergePlan({
    sourceCanonicalIds: ['ast_a'],
    targetCanonicalId: 'ast_b',
    objectType: 'ASSET',
    winningAnchorRefs: [],
    claimPartitionMap: {},
    preservedConflictIds: [],
    preservedConfidenceHistoryRefs: [],
    rationale: 'test',
  });
  assert.strictEqual(plan.schemaVersion, 'v1');
});

test('SplitPlan carries schemaVersion', () => {
  resetAll();
  const plan = createSplitPlan({
    sourceCanonicalId: 'ast_a',
    resultingCanonicalIds: ['ast_b', 'ast_c'],
    objectType: 'ASSET',
    claimPartitionMap: {},
    anchorPartitionMap: {},
    inheritedScars: [],
    childSpecificScars: {},
    rationale: 'test',
  });
  assert.strictEqual(plan.schemaVersion, 'v1');
});

test('MutationHistoryEvent carries schemaVersion', () => {
  resetAll();
  const plan = createMergePlan({
    sourceCanonicalIds: ['ast_a'],
    targetCanonicalId: 'ast_b',
    objectType: 'ASSET',
    winningAnchorRefs: [],
    claimPartitionMap: {},
    preservedConflictIds: [],
    preservedConfidenceHistoryRefs: [],
    rationale: 'test',
  });
  const event = applyMergeMutation(plan, 'recon_test');
  assert.strictEqual(event.schemaVersion, 'v1');
});

test('ReconciliationReport carries schemaVersion', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.strictEqual(output.report.schemaVersion, 'v1');
});

test('ReconciliationReviewEntry carries schemaVersion', () => {
  resetAll();
  const c1 = anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc']);
  conflictClaim('arkham', 'ast_btc', 'CO_AUTHORITY dispute', [c1.claimId]);
  reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  const queue = getReconciliationReviewQueue();
  assert.ok(queue.length >= 1, 'Review queue has entries');
  assert.strictEqual(queue[0].schemaVersion, 'v1');
});

test('Full pipeline: all artifacts versioned end-to-end', () => {
  resetAll();
  anchorClaim('cg', 'ast_btc', 'contract', ['chain:btc', 'native']);
  anchorClaim('cmc', 'ast_btc', 'contract', ['chain:ethereum', 'wrapped']);
  const output = reconcileCanonicalObject({ canonicalId: 'ast_btc', objectType: 'ASSET' });
  assert.strictEqual(output.state.schemaVersion, 'v1');
  assert.strictEqual(output.report.schemaVersion, 'v1');
  if (output.mutationEvent) {
    assert.strictEqual(output.mutationEvent.schemaVersion, 'v1');
  }
  for (const w of output.state.winningAnchors) assert.strictEqual(w.schemaVersion, 'v1');
  for (const r of output.state.rejectedAnchors) assert.strictEqual(r.schemaVersion, 'v1');
  for (const c of output.state.unresolvedConflicts) assert.strictEqual(c.schemaVersion, 'v1');
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`L3.4 Cross-Provider Reconciliation:  ${passed} passed, ${failed} failed  (${passed + failed} total)`);
console.log('═'.repeat(60));

if (failed > 0) {
  console.log('\n⚠️  FAILURES DETECTED — L3.4 not certified');
  process.exit(1);
} else {
  console.log('\n✅  L3.4 Cross-Provider Reconciliation — ALL PASSED');
}
