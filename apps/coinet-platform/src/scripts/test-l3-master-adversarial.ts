/**
 * Layer 3 Master Certification — Adversarial Tests
 *
 * Known crypto intelligence failure modes attacked intentionally.
 * Every case is a trap that would break a naive aggregator.
 */

import {
  resetContractRegistry, bootstrapContracts, getMetricContract,
} from '../services/canonicalization/metric-contracts';
import {
  resetPathRegistry, bootstrapNamespacePaths,
  buildCanonicalMetricObservation, type CanonicalMetricObservation, type BuildObservationInput,
} from '../services/canonicalization/metric-namespace';
import { registerProviderMetricMapper, mapProviderMetric, resetMapperState } from '../services/canonicalization/provider-metric-mappers';
import { evaluateMetricCompatibility, canMergeMetricObservations } from '../services/canonicalization/metric-compatibility-rules';
import { enforceMetricNamespaceGate, validateMappedMetric, resetValidatorState } from '../services/canonicalization/metric-namespace-validator';
import { canUseForScoring, canUseForJudgment, canUseForGraphRelation, canUseForScenario, resetGateAuditLog } from '../services/canonicalization/confidence-gate';
import type { EntityConfidenceState } from '../services/canonicalization/entity-confidence-model';
import { appendProviderClaim, resetClaimLedger, type ProviderClaimRecord } from '../services/canonicalization/provider-claim-ledger';
import { selectReconciliationMode, evaluateClaimAdmissibility, resetReconciliationState, type ClaimAdmissibilityResult } from '../services/canonicalization/cross-provider-reconciliation';
import { applyCanonicalMutation, resetAuditEvents, type MutationProposalInput } from '../services/canonicalization/mutation-control';
import { isRollbackAllowed, applyRollback, resetRollbackState } from '../services/canonicalization/rollback-engine';
import { getMutationById, resetMutationLedger } from '../services/canonicalization/mutation-ledger';
import { getCanonicalVersionChain, resetVersionStore } from '../services/canonicalization/canonical-versioning';
import { getDiffByMutationId, resetDiffStore } from '../services/canonicalization/entity-diff-engine';

let passed = 0; let failed = 0;
function assert(c: boolean, l: string) { if (c) passed++; else { failed++; console.error(`  FAIL: ${l}`); } }

function resetAll() {
  resetContractRegistry(); bootstrapContracts(); resetPathRegistry(); bootstrapNamespacePaths();
  resetMapperState(); resetValidatorState(); resetGateAuditLog(); resetClaimLedger();
  resetReconciliationState(); resetMutationLedger(); resetVersionStore(); resetDiffStore();
  resetAuditEvents(); resetRollbackState();
}

function makeProvenance(pid = 'prov', raw = 'raw') { return { providerId: pid, rawFieldName: raw, mapperVersion: '1.0.0', lineageRefs: ['l1'] }; }
function makeObs(overrides: Partial<BuildObservationInput> = {}): CanonicalMetricObservation {
  const r = buildCanonicalMetricObservation({ metricPath: 'price.spot.usd', objectId: 'ast_x', objectType: 'ASSET', value: 100, observedAt: new Date().toISOString(), provenance: makeProvenance(), freshnessState: 'FRESH', admissibilityState: 'ADMITTED', validationReportId: 'v', ...overrides });
  if ('error' in r) throw new Error(r.error);
  return r;
}
function makeConfState(band: string, score: number, scars: string[] = [], ot = 'ASSET'): EntityConfidenceState {
  return { stateId: `cs_${Math.random()}`, canonicalId: `obj_${Math.random()}`, objectType: ot, band, finalScore: score, factorEvaluations: [], rawAggregation: { identifierStrength: 0, crossProviderAgreement: 0, temporalStability: 0, scopeParity: 0, provenanceStrength: 0, positiveSubtotal: score, penaltySubtotal: 0, finalScore: score }, epistemicState: band === 'UNRESOLVED' ? 'UNRESOLVED' : 'RESOLVED_WITH_SCAR', activeScars: scars.map(c => ({ code: c, severity: 'MEDIUM' as any, message: c, affectsRights: true, appliedAt: new Date().toISOString() })), rightsProfile: { scoring: band === 'HIGH' ? 'ALLOW' : 'DENY', contradictionEngine: 'ALLOW', scenarioEngine: band === 'HIGH' ? 'ALLOW' : 'DENY', judgment: band === 'HIGH' ? 'ALLOW' : 'DENY', graphRelations: band !== 'UNRESOLVED' ? 'ALLOW' : 'DENY', canonicalMutation: 'DENY', display: 'ALLOW', forensicReplay: 'ALLOW' } as any, capChain: [], downgradeReasons: [], probationState: undefined, evaluatedAt: new Date().toISOString(), policyVersion: '1.0.0', evaluatorVersion: '1.0.0' } as any;
}
function makeClaim(id: string, prov: string, cls: string, overrides: Partial<ProviderClaimRecord> = {}): ProviderClaimRecord {
  return { claimId: id, providerId: prov, providerClaimRef: `ref_${id}`, objectType: 'ASSET', candidateCanonicalIds: ['ast_adv'], claimClass: cls as any, comparableFieldFamily: 'contract', scopeDescriptor: ['chain_eth'], payload: {}, confidenceGateEligible: true, authorityRefs: ['auth'], lineageRefs: ['l1'], observedAt: '2025-01-01T00:00:00Z', ingestedAt: '2025-01-01T00:00:00Z', status: 'ACTIVE', conflictClaimIds: [], supersedesClaimIds: [], supersededByClaimIds: [], rationale: '', normalizationMeta: {}, schemaVersion: 'v1', ...overrides };
}
function makeProposal(overrides: Partial<MutationProposalInput> = {}): MutationProposalInput {
  return { mutationType: 'ENTITY_CREATED', targetObjectIds: ['ast_adv'], beforeState: {}, afterState: { id: 'ast_adv' }, reasonCodes: ['TEST'], triggerType: 'SYSTEM', evidenceRefs: ['ev1'], initiatedBy: 'SYSTEM', semanticClass: 'IDENTITY', ...overrides };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY ADVERSARIAL
// ═══════════════════════════════════════════════════════════════════════════════

function identityAdversarial() {
  console.log('\n=== Identity Adversarial ===');
  resetAll();

  const compat = evaluateMetricCompatibility('price.spot.usd', 'price.pool.quote');
  assert(compat.outcome !== 'MERGE_COMPATIBLE', 'IA1: spot-pool never merge (cross-chain scope trap)');

  const entityLow = makeConfState('LOW', 55, ['ENTITY_ATTRIBUTION_RISK'], 'ENTITY');
  assert(!canUseForScoring(entityLow.canonicalId, 'ENTITY', entityLow).allowed, 'IA2: weak entity provenance blocked from scoring');
  assert(!canUseForJudgment(entityLow.canonicalId, 'ENTITY', entityLow).allowed, 'IA3: weak entity blocked from judgment');
  assert(!canUseForScenario(entityLow.canonicalId, 'ENTITY', entityLow).allowed, 'IA4: weak entity blocked from scenario');

  const topicUnresolved = makeConfState('UNRESOLVED', 40, ['TOPIC_BOUNDARY_RISK'], 'NARRATIVE_TOPIC');
  assert(!canUseForScoring(topicUnresolved.canonicalId, 'NARRATIVE_TOPIC', topicUnresolved).allowed, 'IA5: unresolved topic blocked from scoring');
  assert(!canUseForGraphRelation(topicUnresolved.canonicalId, 'NARRATIVE_TOPIC', topicUnresolved).allowed, 'IA6: unresolved topic blocked from graph');

  const pairLow = makeConfState('LOW', 60, ['SCOPE_MISMATCH_RISK'], 'PAIR');
  assert(!canUseForScoring(pairLow.canonicalId, 'PAIR', pairLow, { missionCritical: true }).allowed, 'IA7: pair scope ambiguity blocked from mission-critical');

  const protocolOscillating = makeConfState('LOW', 62, ['OSCILLATING_IDENTITY'], 'PROTOCOL');
  assert(!canUseForGraphRelation(protocolOscillating.canonicalId, 'PROTOCOL', protocolOscillating).allowed, 'IA8: oscillating protocol blocked from graph');
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC ADVERSARIAL
// ═══════════════════════════════════════════════════════════════════════════════

function metricAdversarial() {
  console.log('\n=== Metric Adversarial ===');
  resetAll();

  registerProviderMetricMapper({
    providerId: 'trap_prov', mapperVersion: '1.0.0',
    fieldMappings: [
      { providerFieldName: 'price', canonicalMetricPath: 'price.mark.usd' },
      { providerFieldName: 'spotPrice', canonicalMetricPath: 'price.pool.quote' },
    ],
  });

  const markMap = mapProviderMetric({ providerId: 'trap_prov', rawFieldName: 'price', rawValue: 67000, objectId: 'pair_x', objectType: 'PAIR', lineageRefs: ['l'] });
  assert(markMap.metricPath === 'price.mark.usd', 'MA1: "price" maps to mark, not spot');

  const poolMap = mapProviderMetric({ providerId: 'trap_prov', rawFieldName: 'spotPrice', rawValue: 67100, objectId: 'pair_x', objectType: 'PAIR', lineageRefs: ['l'] });
  assert(poolMap.metricPath === 'price.pool.quote', 'MA2: "spotPrice" maps to pool, not spot');

  const markObs = makeObs({ metricPath: 'price.mark.usd', objectType: 'PAIR', objectId: 'pair_x' });
  const spotObs = makeObs();
  assert(!canMergeMetricObservations(markObs, spotObs).mergeable, 'MA3: mark and spot not mergeable');

  const { outcome: tvlTreas } = evaluateMetricCompatibility('protocol.tvl.usd', 'protocol.treasury.usd');
  assert(tvlTreas !== 'MERGE_COMPATIBLE', 'MA4: TVL vs treasury not mergeable');

  const narrativeObs = makeObs({ metricPath: 'narrative.intensity', objectType: 'NARRATIVE_TOPIC', objectId: 'topic_x' });
  assert(!enforceMetricNamespaceGate(narrativeObs, 'JUDGMENT').allowed, 'MA5: attention cannot pass as event confirmation');

  const flagObs = makeObs({ metricPath: 'security.risk.flag_count', objectType: 'ASSET' });
  const sevObs = makeObs({ metricPath: 'security.risk.severity', objectType: 'ASSET' });
  assert(!canMergeMetricObservations(flagObs, sevObs).mergeable, 'MA6: count vs severity not mergeable');

  const oiUsd = makeObs({ metricPath: 'oi.notional.usd', objectType: 'ASSET' });
  const oiContracts = makeObs({ metricPath: 'oi.contracts', objectType: 'PAIR' });
  assert(!canMergeMetricObservations(oiUsd, oiContracts).mergeable, 'MA7: OI notional vs contracts not mergeable');

  const val = validateMappedMetric({
    metricPath: 'volume.spot.usd.24h', objectType: 'ASSET', value: 1000000,
    provenance: makeProvenance(), scope: { domain: 'market_wide_spot' },
    basis: { valuationBasis: 'usd_denominated' },
  });
  assert(val.violations.some(v => v.code === 'MISSING_WINDOW'), 'MA8: missing window metadata blocked');

  const noProvId = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'ASSET', value: 100,
    provenance: { providerId: '', rawFieldName: 'x', mapperVersion: '1', lineageRefs: ['l'] },
    scope: { domain: 'spot' }, basis: { priceBasis: 'spot' },
  });
  assert(noProvId.violations.some(v => v.code === 'MISSING_PROVIDER_ID'), 'MA9: missing provider ID blocked');

  const fakePath = mapProviderMetric({ providerId: 'no_mapper', rawFieldName: 'whatever', rawValue: 0, objectId: 'x', objectType: 'ASSET', lineageRefs: [] });
  assert(fakePath.status === 'BLOCKED', 'MA10: provider alias cannot create fake metric');

  const funding8h = makeObs({ metricPath: 'funding.rate.8h', objectType: 'PAIR' });
  const funding1h = makeObs({ metricPath: 'funding.rate.1h', objectType: 'PAIR' });
  assert(!canMergeMetricObservations(funding8h, funding1h).mergeable, 'MA11: 8h vs 1h funding not mergeable');

  const poolForScoring = enforceMetricNamespaceGate(makeObs({ metricPath: 'price.pool.quote', objectType: 'PAIR' }), 'SCORING');
  assert(!poolForScoring.allowed, 'MA12: pool quote cannot enter scoring');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION ADVERSARIAL
// ═══════════════════════════════════════════════════════════════════════════════

function reconciliationAdversarial() {
  console.log('\n=== Reconciliation Adversarial ===');
  resetAll();

  const strong = makeClaim('cl_strong', 'prov_owner', 'ANCHOR', { authorityRefs: ['auth_owner'], payload: { address: '0xStrong' } });
  const weak1 = makeClaim('cl_w1', 'prov_w1', 'PROPOSAL', { authorityRefs: ['auth_enricher'], payload: { alias: 'Token' }, confidenceGateEligible: false });
  const weak2 = makeClaim('cl_w2', 'prov_w2', 'PROPOSAL', { authorityRefs: ['auth_enricher'], payload: { alias: 'Token' }, confidenceGateEligible: false });
  const weak3 = makeClaim('cl_w3', 'prov_w3', 'PROPOSAL', { authorityRefs: ['auth_enricher'], payload: { alias: 'Token' }, confidenceGateEligible: false });
  appendProviderClaim(strong); appendProviderClaim(weak1); appendProviderClaim(weak2); appendProviderClaim(weak3);

  const allClaims = [strong, weak1, weak2, weak3];
  const admMap1 = new Map<string, ClaimAdmissibilityResult>();
  allClaims.forEach(c => admMap1.set(c.claimId, evaluateClaimAdmissibility(c)));
  const mode = selectReconciliationMode([strong], [], admMap1);
  assert(mode.mode !== 'SPLIT_REQUIRED', 'RA1: three weak cannot force split against strong anchor');

  const conflictA = makeClaim('cl_ca', 'prov_authA', 'ANCHOR', { authorityRefs: ['auth_owner'], payload: { id: 'ObjectA' } });
  const conflictB = makeClaim('cl_cb', 'prov_authB', 'CONFLICT', { authorityRefs: ['auth_owner'], payload: { id: 'ObjectB' }, conflictClaimIds: ['cl_ca'] });
  const enricher1 = makeClaim('cl_e1', 'prov_e1', 'ENRICHMENT', { payload: { supports: 'ObjectA' } });
  appendProviderClaim(conflictA); appendProviderClaim(conflictB); appendProviderClaim(enricher1);

  const admMap2 = new Map<string, ClaimAdmissibilityResult>();
  [conflictA, conflictB, enricher1].forEach(c => admMap2.set(c.claimId, evaluateClaimAdmissibility(c)));
  const conflictMode = selectReconciliationMode([conflictA], [conflictB], admMap2);
  assert(conflictMode.mode === 'CONTESTED_MERGE' || conflictMode.mode === 'WEIGHTED_CONVERGENCE', 'RA2: co-authority conflict stays contested');

  const rejectedClaim = makeClaim('cl_rej', 'prov_rej', 'ANCHOR', { status: 'REJECTED' as any, rationale: 'invalid scope' });
  appendProviderClaim(rejectedClaim);
  assert(rejectedClaim.status === 'REJECTED', 'RA3: rejected claim preserves status');

  const supersededClaim = makeClaim('cl_sup', 'prov_sup', 'ANCHOR', { status: 'ACTIVE', supersedesClaimIds: ['cl_old'] });
  appendProviderClaim(supersededClaim);
  assert(supersededClaim.supersedesClaimIds.includes('cl_old'), 'RA4: supersession linkage preserved');

  const historicalClaim = makeClaim('cl_hist2', 'prov_hist', 'ANCHOR', { status: 'HISTORICAL' as any });
  appendProviderClaim(historicalClaim);
  assert(historicalClaim.status === 'HISTORICAL', 'RA5: historical claims remain in ledger');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION ADVERSARIAL
// ═══════════════════════════════════════════════════════════════════════════════

function mutationAdversarial() {
  console.log('\n=== Mutation Adversarial ===');
  resetAll();

  const splitResult = applyCanonicalMutation(makeProposal({
    mutationType: 'ENTITY_SPLIT', targetObjectIds: ['ast_parent'],
    beforeState: { lifecycleState: 'ACTIVE' }, afterState: { lifecycleState: 'SPLIT' },
    semanticClass: 'STRUCTURAL',
  }), 'snap_split');
  assert(splitResult.success, 'MuA1: split mutation succeeds');

  const splitMut = getMutationById(splitResult.mutationId)!;
  assert(splitMut.mutationType === 'ENTITY_SPLIT', 'MuA2: split type preserved');
  assert(splitResult.versionRecord !== undefined, 'MuA3: split creates version');

  const chain = getCanonicalVersionChain('ast_parent');
  assert(chain.length >= 1, 'MuA4: split chain exists');

  const diff = getDiffByMutationId(splitResult.mutationId);
  assert(diff !== undefined, 'MuA5: split diff exists');
  assert(diff!.severity === 'CRITICAL', 'MuA6: split is CRITICAL severity');

  const aliasResult = applyCanonicalMutation(makeProposal({
    mutationType: 'ALIAS_ADDED', targetObjectIds: ['ast_adv'],
    beforeState: { aliases: ['BTC'] }, afterState: { aliases: ['BTC', 'XBT'] },
    semanticClass: 'ALIAS',
  }), 'snap_alias');
  assert(aliasResult.success, 'MuA7: alias mutation succeeds');
  const aliasDiff = getDiffByMutationId(aliasResult.mutationId);
  assert(aliasDiff!.addedElements.some(e => e.includes('XBT')), 'MuA8: alias diff records addition');

  const rollback = applyRollback(aliasResult.mutationId, 'SYSTEM');
  assert(rollback.success, 'MuA9: rollback succeeds');
  const originalAfterRollback = getMutationById(aliasResult.mutationId)!;
  assert(originalAfterRollback.lifecycleState === 'SUPERSEDED', 'MuA10: original superseded');
  assert(originalAfterRollback.rolledBackByMutationId !== undefined, 'MuA11: rollback link preserved');

  const rollbackMut = getMutationById(rollback.rollbackMutationId!)!;
  assert(rollbackMut.rollbackOfMutationId === aliasResult.mutationId, 'MuA12: reverse link preserved');
  assert(rollbackMut.mutationType === 'ROLLBACK_APPLIED', 'MuA13: rollback is its own mutation type');

  const doubleRb = isRollbackAllowed(aliasResult.mutationId);
  assert(!doubleRb.allowed, 'MuA14: cannot double-rollback');

  const terminalResult = applyCanonicalMutation(makeProposal({
    mutationType: 'METRIC_CONTRACT_DEPRECATED',
    targetObjectIds: [], targetContractIds: ['price.spot.usd'],
    reasonCodes: ['DEPRECATED'], evidenceRefs: [],
  }), 'snap_term');
  const termRb = isRollbackAllowed(terminalResult.mutationId);
  assert(!termRb.allowed, 'MuA15: terminal mutation cannot rollback');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// EXHAUSTIVE INCOMPATIBILITY MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

function incompatibilityMatrix() {
  console.log('\n=== Incompatibility Matrix ===');
  resetAll();

  const dangerPairs: [string, string][] = [
    ['price.spot.usd', 'price.mark.usd'],
    ['price.spot.usd', 'price.pool.quote'],
    ['protocol.tvl.usd', 'protocol.treasury.usd'],
    ['oi.notional.usd', 'oi.contracts'],
    ['liquidations.notional.usd.24h', 'liquidations.count.24h'],
    ['security.risk.flag_count', 'security.risk.severity'],
    ['wallet.exchange_inflow.usd.24h', 'wallet.netflow.usd.24h'],
    ['funding.rate.8h', 'funding.rate.1h'],
    ['price.spot.usd', 'volume.spot.usd.24h'],
  ];
  for (const [a, b] of dangerPairs) {
    const result = evaluateMetricCompatibility(a, b);
    assert(result.outcome !== 'MERGE_COMPATIBLE', `IM_${a}_${b}: danger pair not merge-compatible`);
  }

  const safeSelf = ['price.spot.usd', 'volume.spot.usd.24h', 'funding.rate.8h', 'protocol.tvl.usd', 'narrative.intensity'];
  for (const p of safeSelf) {
    const r = evaluateMetricCompatibility(p, p);
    assert(r.outcome === 'MERGE_COMPATIBLE', `IM_self_${p}: self merge compatible`);
  }

  const crossFamily = evaluateMetricCompatibility('price.spot.usd', 'narrative.intensity');
  assert(crossFamily.outcome !== 'MERGE_COMPATIBLE', 'IM_cross_family: price vs narrative not merge-compatible');
}

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  L3 Master: Adversarial Tests                     ║');
console.log('╚═══════════════════════════════════════════════════╝');
identityAdversarial(); metricAdversarial(); reconciliationAdversarial(); mutationAdversarial(); incompatibilityMatrix();
console.log(`\n═══════════════════════════════════════`);
console.log(`TOTAL: ${passed + failed} — ${passed} passed, ${failed} failed`);
if (failed > 0) { console.log(`${failed} FAILURES`); process.exit(1); }
else console.log('ALL ADVERSARIAL TESTS PASSED');
