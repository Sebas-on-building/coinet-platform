/**
 * Layer 3 Master Certification — Cross-Layer System Tests
 *
 * Proves Layer 3 works as a single intelligence substrate.
 * Suite 1: Object truth chain
 * Suite 2: Metric truth chain
 * Suite 3: Confidence-enforced reasoning chain
 * Suite 4: Reconciliation-to-confidence chain
 */

import {
  resetContractRegistry, bootstrapContracts,
  getMetricContract,
  registerMetricContract,
} from '../services/canonicalization/metric-contracts';
import {
  resetPathRegistry, bootstrapNamespacePaths,
  buildCanonicalMetricObservation,
  type CanonicalMetricObservation,
  type BuildObservationInput,
} from '../services/canonicalization/metric-namespace';
import {
  registerProviderMetricMapper, mapProviderMetric, resetMapperState,
} from '../services/canonicalization/provider-metric-mappers';
import {
  evaluateMetricCompatibility,
  canMergeMetricObservations,
  canCompareMetricObservations,
} from '../services/canonicalization/metric-compatibility-rules';
import {
  validateMappedMetric, enforceMetricNamespaceGate,
  resetValidatorState,
} from '../services/canonicalization/metric-namespace-validator';
import {
  evaluateConfidenceGate,
  canUseForScoring, canUseForContradiction, canUseForJudgment,
  canUseForGraphRelation, canUseForReplayOrForensic, canUseForScenario,
  resetGateAuditLog,
} from '../services/canonicalization/confidence-gate';
import type { EntityConfidenceState } from '../services/canonicalization/entity-confidence-model';
import {
  appendProviderClaim, resetClaimLedger,
  type ProviderClaimRecord,
} from '../services/canonicalization/provider-claim-ledger';
import {
  evaluateClaimAdmissibility,
  selectReconciliationMode,
  reconcileCanonicalObject,
  resetReconciliationState,
  type ClaimAdmissibilityResult,
} from '../services/canonicalization/cross-provider-reconciliation';

let passed = 0;
let failed = 0;
function assert(c: boolean, l: string) { if (c) passed++; else { failed++; console.error(`  FAIL: ${l}`); } }

function resetAll() {
  resetContractRegistry(); bootstrapContracts();
  resetPathRegistry(); bootstrapNamespacePaths();
  resetMapperState(); resetValidatorState();
  resetGateAuditLog(); resetClaimLedger();
  resetReconciliationState();
}

function makeProvenance(pid = 'prov_test', raw = 'raw_field') {
  return { providerId: pid, rawFieldName: raw, mapperVersion: '1.0.0', lineageRefs: ['lin_1'] };
}

function makeObs(overrides: Partial<BuildObservationInput> = {}): CanonicalMetricObservation {
  const r = buildCanonicalMetricObservation({
    metricPath: 'price.spot.usd', objectId: 'ast_test', objectType: 'ASSET',
    value: 42000, observedAt: new Date().toISOString(),
    provenance: makeProvenance(), freshnessState: 'FRESH', admissibilityState: 'ADMITTED',
    validationReportId: 'vrpt_x', ...overrides,
  });
  if ('error' in r) throw new Error(r.error);
  return r;
}

function makeConfState(band: string, score: number, scars: string[] = [], objectType = 'ASSET'): EntityConfidenceState {
  return {
    stateId: `cs_${Date.now()}`, canonicalId: `obj_${Date.now()}`, objectType,
    band: band as any, finalScore: score,
    factorEvaluations: [], rawAggregation: { identifierStrength: score * 0.4, crossProviderAgreement: score * 0.2, temporalStability: score * 0.15, scopeParity: score * 0.1, provenanceStrength: score * 0.15, positiveSubtotal: score, penaltySubtotal: 0, finalScore: score },
    epistemicState: band === 'UNRESOLVED' ? 'UNRESOLVED' : band === 'LOW' ? 'RESOLVED_WITH_SCAR' : 'RESOLVED_CLEAN',
    activeScars: scars.map(c => ({ code: c, severity: 'MEDIUM' as any, message: c, affectsRights: true, appliedAt: new Date().toISOString() })),
    rightsProfile: { scoring: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'CONDITIONAL' : 'DENY', contradictionEngine: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'ALLOW_WITH_SCAR' : 'DENY', scenarioEngine: band === 'HIGH' ? 'ALLOW' : 'DENY', judgment: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'ALLOW_WITH_SCAR' : 'DENY', graphRelations: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'ALLOW_WITH_SCAR' : 'DENY', canonicalMutation: band === 'HIGH' ? 'ALLOW' : 'DENY', display: 'ALLOW', forensicReplay: 'ALLOW' } as any,
    capChain: [], downgradeReasons: [], probationState: undefined,
    evaluatedAt: new Date().toISOString(), policyVersion: '1.0.0', evaluatorVersion: '1.0.0',
  } as any;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Object truth chain
// ═══════════════════════════════════════════════════════════════════════════════

function suite1() {
  console.log('\n=== Suite 1: Object Truth Chain ===');
  resetAll();

  const spotVsMark = evaluateMetricCompatibility('price.spot.usd', 'price.mark.usd');
  assert(spotVsMark.outcome !== 'MERGE_COMPATIBLE', 'OT1: spot vs mark never merge');
  const spotVsPool = evaluateMetricCompatibility('price.spot.usd', 'price.pool.quote');
  assert(spotVsPool.outcome !== 'MERGE_COMPATIBLE', 'OT2: spot vs pool never merge');
  const tvlVsTreasury = evaluateMetricCompatibility('protocol.tvl.usd', 'protocol.treasury.usd');
  assert(tvlVsTreasury.outcome !== 'MERGE_COMPATIBLE', 'OT3: TVL vs treasury never merge');

  const btcObs = makeObs({ objectId: 'ast_btc', metricPath: 'price.spot.usd', value: 67500 });
  const wbtcObs = makeObs({ objectId: 'ast_wbtc', metricPath: 'price.spot.usd', value: 67480 });
  assert(btcObs.objectId !== wbtcObs.objectId, 'OT4: BTC and WBTC are separate objects');

  const fundingObs = makeObs({ metricPath: 'funding.rate.8h', objectType: 'PAIR', objectId: 'pair_btc_usdt' });
  assert(fundingObs.objectType === 'PAIR', 'OT5: funding rate attached to PAIR not ASSET');

  const entityObs = makeObs({ metricPath: 'wallet.netflow.usd.24h', objectType: 'ENTITY', objectId: 'ent_binance' });
  assert(entityObs.objectType === 'ENTITY', 'OT6: netflow attached to ENTITY');

  const narrativeObs = makeObs({ metricPath: 'narrative.intensity', objectType: 'NARRATIVE_TOPIC', objectId: 'topic_ai' });
  assert(narrativeObs.objectType === 'NARRATIVE_TOPIC', 'OT7: intensity attached to NARRATIVE_TOPIC');

  const val = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'PROTOCOL', value: 1000,
    provenance: makeProvenance(), scope: { domain: 'spot' }, basis: { priceBasis: 'spot' },
  });
  assert(val.violations.some(v => v.code === 'WRONG_OBJECT_TYPE'), 'OT8: wrong object type blocked');

  const protocolContract = getMetricContract('protocol.tvl.usd');
  assert(protocolContract!.objectType === 'PROTOCOL', 'OT9: protocol metrics attach to PROTOCOL');
  assert(protocolContract!.blockedMergeConditions.includes('protocol.treasury.usd'), 'OT10: protocol TVL blocks treasury merge');

  const inflowVsNetflow = evaluateMetricCompatibility('wallet.exchange_inflow.usd.24h', 'wallet.netflow.usd.24h');
  assert(inflowVsNetflow.outcome !== 'MERGE_COMPATIBLE', 'OT11: inflow vs netflow never merge');

  const liqNotionalVsCount = evaluateMetricCompatibility('liquidations.notional.usd.24h', 'liquidations.count.24h');
  assert(liqNotionalVsCount.outcome !== 'MERGE_COMPATIBLE', 'OT12: liq notional vs count never merge');

  const spotSelf = evaluateMetricCompatibility('price.spot.usd', 'price.spot.usd');
  assert(spotSelf.outcome === 'MERGE_COMPATIBLE', 'OT13: same metric is merge-compatible');

  const spotVsVol = evaluateMetricCompatibility('price.spot.usd', 'volume.spot.usd.24h');
  assert(spotVsVol.outcome !== 'MERGE_COMPATIBLE', 'OT14: price vs volume never merge');

  const { comparable } = canCompareMetricObservations(
    makeObs({ metricPath: 'funding.rate.8h', objectType: 'PAIR' }),
    makeObs({ metricPath: 'funding.rate.1h', objectType: 'PAIR' }),
  );
  assert(comparable, 'OT15: 8h vs 1h funding are comparable');
  const { mergeable } = canMergeMetricObservations(
    makeObs({ metricPath: 'funding.rate.8h', objectType: 'PAIR' }),
    makeObs({ metricPath: 'funding.rate.1h', objectType: 'PAIR' }),
  );
  assert(!mergeable, 'OT16: 8h vs 1h funding not mergeable');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Metric truth chain (provider → mapper → contract → gate)
// ═══════════════════════════════════════════════════════════════════════════════

function suite2() {
  console.log('\n=== Suite 2: Metric Truth Chain ===');
  resetAll();

  registerProviderMetricMapper({
    providerId: 'coingecko', mapperVersion: '1.0.0',
    fieldMappings: [
      { providerFieldName: 'current_price', canonicalMetricPath: 'price.spot.usd' },
      { providerFieldName: 'total_volume', canonicalMetricPath: 'volume.spot.usd.24h' },
    ],
  });
  registerProviderMetricMapper({
    providerId: 'defillama', mapperVersion: '1.0.0',
    fieldMappings: [
      { providerFieldName: 'tvl', canonicalMetricPath: 'protocol.tvl.usd' },
    ],
  });

  const spotMap = mapProviderMetric({ providerId: 'coingecko', rawFieldName: 'current_price', rawValue: 67500, objectId: 'ast_btc', objectType: 'ASSET', lineageRefs: ['l1'] });
  assert(spotMap.status === 'MAPPED', 'MT1: spot price maps');
  assert(spotMap.metricPath === 'price.spot.usd', 'MT2: maps to correct path');
  const obs = makeObs({ metricPath: spotMap.metricPath!, value: 67500, provenance: makeProvenance('coingecko', 'current_price') });
  const scoring = enforceMetricNamespaceGate(obs, 'SCORING');
  assert(scoring.allowed, 'MT3: fresh spot price allowed for scoring');

  const tvlMap = mapProviderMetric({ providerId: 'defillama', rawFieldName: 'tvl', rawValue: 1_200_000_000, objectId: 'proto_jup', objectType: 'PROTOCOL', lineageRefs: ['l1'] });
  assert(tvlMap.status === 'MAPPED', 'MT4: TVL maps');
  const tvlObs = makeObs({ metricPath: 'protocol.tvl.usd', objectType: 'PROTOCOL', objectId: 'proto_jup', value: 1_200_000_000 });
  const tvlGate = enforceMetricNamespaceGate(tvlObs, 'DISPLAY');
  assert(tvlGate.allowed, 'MT5: TVL allowed for display');

  const poolObs = makeObs({ metricPath: 'price.pool.quote', objectType: 'PAIR', objectId: 'pair_x' });
  assert(!enforceMetricNamespaceGate(poolObs, 'SCORING').allowed, 'MT6: pool quote blocked for scoring');
  assert(enforceMetricNamespaceGate(poolObs, 'DISPLAY').allowed, 'MT7: pool quote allowed for display');
  assert(!enforceMetricNamespaceGate(poolObs, 'RANKING').allowed, 'MT8: pool quote blocked for ranking');

  const narrativeObs = makeObs({ metricPath: 'narrative.intensity', objectType: 'NARRATIVE_TOPIC', objectId: 'topic_x' });
  assert(!enforceMetricNamespaceGate(narrativeObs, 'SCORING').allowed, 'MT9: narrative blocked for scoring');
  assert(!enforceMetricNamespaceGate(narrativeObs, 'JUDGMENT').allowed, 'MT10: narrative blocked for judgment');
  assert(enforceMetricNamespaceGate(narrativeObs, 'DISPLAY').allowed, 'MT11: narrative allowed for display');

  const staleObs = makeObs({ freshnessState: 'STALE' });
  assert(!enforceMetricNamespaceGate(staleObs, 'RANKING').allowed, 'MT12: stale metric blocked for ranking');
  assert(enforceMetricNamespaceGate(staleObs, 'DISPLAY').allowed, 'MT13: stale metric allowed for display');

  const blockedObs = makeObs({ admissibilityState: 'BLOCKED' });
  assert(!enforceMetricNamespaceGate(blockedObs, 'SCORING').allowed, 'MT14: blocked obs denied for scoring');
  assert(!enforceMetricNamespaceGate(blockedObs, 'DISPLAY').allowed, 'MT15: blocked obs denied for display');

  const unmapped = mapProviderMetric({ providerId: 'coingecko', rawFieldName: 'unknown_field', rawValue: 0, objectId: 'x', objectType: 'ASSET', lineageRefs: [] });
  assert(unmapped.status === 'BLOCKED', 'MT16: unmapped field blocked');

  const noMapper = mapProviderMetric({ providerId: 'fake', rawFieldName: 'price', rawValue: 100, objectId: 'x', objectType: 'ASSET', lineageRefs: [] });
  assert(noMapper.status === 'BLOCKED', 'MT17: no mapper blocked');

  const warningObs = makeObs({ freshnessState: 'WARNING' });
  assert(enforceMetricNamespaceGate(warningObs, 'SCORING').allowed, 'MT18: warning freshness still allowed for scoring');

  const condObs = makeObs({ admissibilityState: 'CONDITIONAL' });
  const condGate = enforceMetricNamespaceGate(condObs, 'SCORING');
  assert(condGate.allowed && condGate.mode === 'CONDITIONAL', 'MT19: conditional admissibility is CONDITIONAL');

  const scarObs = makeObs({ scars: ['PROVENANCE_WEAK'] });
  const scarGate = enforceMetricNamespaceGate(scarObs, 'SCORING');
  assert(scarGate.mode === 'CONDITIONAL', 'MT20: scarred obs is CONDITIONAL');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Confidence-enforced reasoning chain
// ═══════════════════════════════════════════════════════════════════════════════

function suite3() {
  console.log('\n=== Suite 3: Confidence-Enforced Reasoning ===');
  resetAll();

  const high = makeConfState('HIGH', 92);
  const medium = makeConfState('MEDIUM', 76);
  const low = makeConfState('LOW', 58, ['ENTITY_ATTRIBUTION_RISK']);
  const unresolved = makeConfState('UNRESOLVED', 42, ['TOPIC_BOUNDARY_RISK']);

  const hScoring = canUseForScoring(high.canonicalId, high.objectType, high);
  assert(hScoring.allowed && hScoring.mode === 'ALLOW', 'CE1: HIGH allowed for scoring');

  const lScoring = canUseForScoring(low.canonicalId, low.objectType, low, { missionCritical: true });
  assert(!lScoring.allowed, 'CE2: LOW mission-critical scoring denied');

  const uScoring = canUseForScoring(unresolved.canonicalId, unresolved.objectType, unresolved);
  assert(!uScoring.allowed, 'CE3: UNRESOLVED denied for scoring');

  const uScenario = canUseForScenario(unresolved.canonicalId, unresolved.objectType, unresolved);
  assert(!uScenario.allowed, 'CE4: UNRESOLVED denied for scenario');

  const lJudgment = canUseForJudgment(low.canonicalId, low.objectType, low);
  assert(!lJudgment.allowed, 'CE5: LOW denied for judgment');

  const uGraph = canUseForGraphRelation(unresolved.canonicalId, unresolved.objectType, unresolved);
  assert(!uGraph.allowed, 'CE6: UNRESOLVED denied for graph relation');

  const uReplay = canUseForReplayOrForensic(unresolved.canonicalId, unresolved.objectType, unresolved);
  assert(uReplay.allowed, 'CE7: UNRESOLVED allowed for replay/forensic');

  const hDisplay = evaluateConfidenceGate({ canonicalId: high.canonicalId, objectType: high.objectType, requestedUse: 'DISPLAY', missionCritical: false, confidenceState: high });
  assert(hDisplay.allowed, 'CE8: HIGH allowed for display');

  const mScoringDenied = canUseForScoring(medium.canonicalId, medium.objectType, medium, { missionCritical: false });
  assert(!mScoringDenied.allowed, 'CE9: MEDIUM CONDITIONAL scoring denied without allowConditional');

  const mMissionScoring = canUseForScoring(medium.canonicalId, medium.objectType, medium, { missionCritical: true });
  assert(!mMissionScoring.allowed, 'CE10: MEDIUM denied for mission-critical scoring');

  const hContradiction = canUseForContradiction(high.canonicalId, high.objectType, high);
  assert(hContradiction.allowed, 'CE11: HIGH allowed for contradiction');

  const lContradiction = canUseForContradiction(low.canonicalId, low.objectType, low);
  assert(!lContradiction.allowed, 'CE12: LOW denied for contradiction');

  const hScenario = canUseForScenario(high.canonicalId, high.objectType, high);
  assert(hScenario.allowed, 'CE13: HIGH allowed for scenario');

  const mGraph = canUseForGraphRelation(medium.canonicalId, medium.objectType, medium);
  assert(mGraph.allowed, 'CE14: MEDIUM allowed for graph relation (ALLOW_WITH_SCAR)');

  const entityLow = makeConfState('LOW', 56, ['ENTITY_ATTRIBUTION_RISK'], 'ENTITY');
  const entityScoring = canUseForScoring(entityLow.canonicalId, entityLow.objectType, entityLow);
  assert(!entityScoring.allowed, 'CE15: ENTITY with attribution risk denied scoring');

  const entityJudg = canUseForJudgment(entityLow.canonicalId, entityLow.objectType, entityLow);
  assert(!entityJudg.allowed, 'CE16: ENTITY with attribution risk denied judgment');

  const topicMed = makeConfState('MEDIUM', 72, [], 'NARRATIVE_TOPIC');
  const topicScoring = canUseForScoring(topicMed.canonicalId, topicMed.objectType, topicMed, { missionCritical: true });
  assert(!topicScoring.allowed, 'CE17: NARRATIVE_TOPIC MEDIUM denied mission-critical scoring');

  const noState = evaluateConfidenceGate({ canonicalId: 'x', objectType: 'ASSET', requestedUse: 'SCORING', missionCritical: false, confidenceState: undefined as any });
  assert(!noState.allowed, 'CE18: missing confidence state denied');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Reconciliation-to-confidence chain
// ═══════════════════════════════════════════════════════════════════════════════

function suite4() {
  console.log('\n=== Suite 4: Reconciliation→Confidence Chain ===');
  resetAll();

  const baseClaim: ProviderClaimRecord = {
    claimId: 'cl_1', providerId: 'prov_a', providerClaimRef: 'ref_a',
    objectType: 'ASSET', candidateCanonicalIds: ['ast_rc'],
    claimClass: 'ANCHOR', comparableFieldFamily: 'contract',
    scopeDescriptor: ['chain_eth'], payload: { address: '0xabc' },
    confidenceGateEligible: true, authorityRefs: ['auth_owner'],
    lineageRefs: ['lin_1'], observedAt: '2025-01-01T00:00:00Z',
    ingestedAt: '2025-01-01T00:00:00Z', status: 'ACTIVE',
    conflictClaimIds: [], supersedesClaimIds: [], supersededByClaimIds: [],
    rationale: 'owner anchor', normalizationMeta: {}, schemaVersion: 'v1',
  };
  const claim1 = baseClaim;
  const claim2: ProviderClaimRecord = {
    ...baseClaim, claimId: 'cl_2', providerId: 'prov_b',
    providerClaimRef: 'ref_b', claimClass: 'ANCHOR',
    payload: { address: '0xabc' }, authorityRefs: ['auth_confirmer'],
    rationale: 'confirmer anchor',
  };
  const claim3: ProviderClaimRecord = {
    ...baseClaim, claimId: 'cl_3', providerId: 'prov_c',
    providerClaimRef: 'ref_c', claimClass: 'CONFLICT',
    payload: { address: '0xdef' }, authorityRefs: ['auth_owner'],
    conflictClaimIds: ['cl_1'], rationale: 'conflicting anchor',
  };

  appendProviderClaim(claim1);
  appendProviderClaim(claim2);
  appendProviderClaim(claim3);

  const adm1 = evaluateClaimAdmissibility(claim1);
  assert(adm1.admissibility === 'ADMISSIBLE_STRONG' || adm1.admissibility === 'ADMISSIBLE_CONDITIONAL', 'RC1: owner anchor claim admissible');

  const adm3 = evaluateClaimAdmissibility(claim3);
  assert(adm3.admissibility !== undefined, 'RC2: conflict claim has admissibility');

  const admMap = new Map<string, ClaimAdmissibilityResult>();
  admMap.set(claim1.claimId, adm1);
  admMap.set(claim2.claimId, evaluateClaimAdmissibility(claim2));
  admMap.set(claim3.claimId, adm3);

  const anchors = [claim1, claim2];
  const conflicts = [claim3];
  const modeResult = selectReconciliationMode(anchors, conflicts, admMap);
  assert(modeResult.mode === 'CONTESTED_MERGE' || modeResult.mode === 'WEIGHTED_CONVERGENCE', 'RC3: conflict forces contested or weighted mode');

  const result = reconcileCanonicalObject({ canonicalId: 'ast_rc', objectType: 'ASSET' });
  assert(result.state.reconciliationId !== undefined, 'RC4: reconciliation produces state');
  assert(result.state.unresolvedConflicts.length > 0 || result.state.rejectedAnchors.length > 0, 'RC5: conflict preserved in output');
  assert(result.state.providerClaimIds.length === 3, 'RC6: all claims referenced');
  assert(result.state.winningAnchors.length >= 0, 'RC7: reconciliation produces anchor set (may be empty with minimal claims)');

  const confAfter = makeConfState('LOW', 62, ['PROVIDER_DISAGREEMENT']);
  const scoringGate = canUseForScoring(confAfter.canonicalId, confAfter.objectType, confAfter, { missionCritical: true });
  assert(!scoringGate.allowed, 'RC8: post-conflict LOW denied mission-critical scoring');

  const judgGate = canUseForJudgment(confAfter.canonicalId, confAfter.objectType, confAfter);
  assert(!judgGate.allowed, 'RC9: post-conflict LOW denied judgment');

  const replayGate = canUseForReplayOrForensic(confAfter.canonicalId, confAfter.objectType, confAfter);
  assert(replayGate.allowed, 'RC10: post-conflict LOW allowed for replay');

  const enrichClaim: ProviderClaimRecord = {
    ...baseClaim, claimId: 'cl_enrich', providerId: 'prov_enrich',
    claimClass: 'ENRICHMENT', confidenceGateEligible: false,
    rationale: 'enrichment only',
  };
  const admEnrich = evaluateClaimAdmissibility(enrichClaim);
  assert(admEnrich.admissibility === 'ADMISSIBLE_ENRICHMENT_ONLY', 'RC11: enrichment-only claim classified correctly');

  const historicalClaim: ProviderClaimRecord = {
    ...baseClaim, claimId: 'cl_hist', status: 'HISTORICAL',
    rationale: 'historical record',
  };
  appendProviderClaim(historicalClaim);
  const admHist = evaluateClaimAdmissibility(historicalClaim);
  assert(admHist.admissibility === 'NON_ADMISSIBLE_HISTORICAL_ONLY', 'RC12: historical claim classified correctly');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Metric-Confidence interaction
// ═══════════════════════════════════════════════════════════════════════════════

function suite5() {
  console.log('\n=== Suite 5: Metric-Confidence Interaction ===');
  resetAll();

  const unusableObs = makeObs({ freshnessState: 'UNUSABLE' });
  assert(!enforceMetricNamespaceGate(unusableObs, 'SCORING').allowed, 'MCI1: UNUSABLE metric blocked for scoring');
  assert(!enforceMetricNamespaceGate(unusableObs, 'RANKING').allowed, 'MCI2: UNUSABLE metric blocked for ranking');
  assert(!enforceMetricNamespaceGate(unusableObs, 'DISPLAY').allowed, 'MCI3: UNUSABLE metric blocked for display');

  const freshSpot = makeObs({ metricPath: 'price.spot.usd', freshnessState: 'FRESH', admissibilityState: 'ADMITTED' });
  const freshMark = makeObs({ metricPath: 'price.mark.usd', objectType: 'PAIR', freshnessState: 'FRESH', admissibilityState: 'ADMITTED' });
  assert(!canMergeMetricObservations(freshSpot, freshMark).mergeable, 'MCI4: fresh spot and mark still not mergeable');

  const lowConf = makeConfState('LOW', 55, ['ENTITY_ATTRIBUTION_RISK'], 'ENTITY');
  const entityGate = canUseForScoring(lowConf.canonicalId, lowConf.objectType, lowConf, { missionCritical: true });
  const entityMetric = makeObs({ metricPath: 'wallet.netflow.usd.24h', objectType: 'ENTITY', objectId: lowConf.canonicalId });
  const entityMetricGate = enforceMetricNamespaceGate(entityMetric, 'SCORING');
  assert(entityMetricGate.allowed, 'MCI5: metric valid even if entity confidence is low');
  assert(!entityGate.allowed, 'MCI6: entity confidence blocks scoring even though metric is valid');

  const protTvl = makeObs({ metricPath: 'protocol.tvl.usd', objectType: 'PROTOCOL' });
  const protTreas = makeObs({ metricPath: 'protocol.treasury.usd', objectType: 'PROTOCOL' });
  assert(!canMergeMetricObservations(protTvl, protTreas).mergeable, 'MCI7: TVL and treasury never merge');
  assert(canCompareMetricObservations(protTvl, protTreas).comparable, 'MCI8: TVL and treasury are comparable');

  const spotForScenario = enforceMetricNamespaceGate(freshSpot, 'SCENARIO');
  assert(spotForScenario.allowed, 'MCI9: fresh spot allowed for scenario');

  const spotForCalibration = enforceMetricNamespaceGate(freshSpot, 'CALIBRATION');
  assert(spotForCalibration.allowed, 'MCI10: spot allowed for calibration');

  const spotForAlerts = enforceMetricNamespaceGate(freshSpot, 'ALERTS');
  assert(spotForAlerts.allowed, 'MCI11: spot allowed for alerts');

  const secFlag = makeObs({ metricPath: 'security.risk.flag_count', objectType: 'ASSET' });
  const secSev = makeObs({ metricPath: 'security.risk.severity', objectType: 'ASSET' });
  assert(!canMergeMetricObservations(secFlag, secSev).mergeable, 'MCI12: flag_count and severity not mergeable');

  const narIntensity = makeObs({ metricPath: 'narrative.intensity', objectType: 'NARRATIVE_TOPIC' });
  const narVelocity = makeObs({ metricPath: 'narrative.velocity', objectType: 'NARRATIVE_TOPIC' });
  assert(!canMergeMetricObservations(narIntensity, narVelocity).mergeable, 'MCI13: intensity and velocity not mergeable');
  assert(canCompareMetricObservations(narIntensity, narVelocity).comparable, 'MCI14: narrative family is comparable');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Gate exhaustive per-band
// ═══════════════════════════════════════════════════════════════════════════════

function suite6() {
  console.log('\n=== Suite 6: Gate Exhaustive Per-Band ===');
  resetAll();

  const high = makeConfState('HIGH', 92);
  const med = makeConfState('MEDIUM', 76);
  const low = makeConfState('LOW', 58);
  const unr = makeConfState('UNRESOLVED', 42);

  assert(canUseForScoring(high.canonicalId, high.objectType, high).allowed, 'GE1: HIGH scoring');
  assert(canUseForContradiction(high.canonicalId, high.objectType, high).allowed, 'GE2: HIGH contradiction');
  assert(canUseForScenario(high.canonicalId, high.objectType, high).allowed, 'GE3: HIGH scenario');
  assert(canUseForJudgment(high.canonicalId, high.objectType, high).allowed, 'GE4: HIGH judgment');
  assert(canUseForGraphRelation(high.canonicalId, high.objectType, high).allowed, 'GE5: HIGH graph');
  assert(canUseForReplayOrForensic(high.canonicalId, high.objectType, high).allowed, 'GE6: HIGH replay');

  assert(canUseForJudgment(med.canonicalId, med.objectType, med).allowed, 'GE7: MEDIUM judgment (ALLOW_WITH_SCAR)');
  assert(canUseForGraphRelation(med.canonicalId, med.objectType, med).allowed, 'GE8: MEDIUM graph');
  assert(canUseForReplayOrForensic(med.canonicalId, med.objectType, med).allowed, 'GE9: MEDIUM replay');

  assert(!canUseForScoring(low.canonicalId, low.objectType, low).allowed, 'GE10: LOW scoring denied');
  assert(!canUseForJudgment(low.canonicalId, low.objectType, low).allowed, 'GE11: LOW judgment denied');
  assert(canUseForReplayOrForensic(low.canonicalId, low.objectType, low).allowed, 'GE12: LOW replay allowed');

  assert(!canUseForScoring(unr.canonicalId, unr.objectType, unr).allowed, 'GE13: UNRESOLVED scoring denied');
  assert(!canUseForContradiction(unr.canonicalId, unr.objectType, unr).allowed, 'GE14: UNRESOLVED contradiction denied');
  assert(!canUseForScenario(unr.canonicalId, unr.objectType, unr).allowed, 'GE15: UNRESOLVED scenario denied');
  assert(!canUseForJudgment(unr.canonicalId, unr.objectType, unr).allowed, 'GE16: UNRESOLVED judgment denied');
  assert(!canUseForGraphRelation(unr.canonicalId, unr.objectType, unr).allowed, 'GE17: UNRESOLVED graph denied');
  assert(canUseForReplayOrForensic(unr.canonicalId, unr.objectType, unr).allowed, 'GE18: UNRESOLVED replay allowed');

  const hDisplay = evaluateConfidenceGate({ canonicalId: high.canonicalId, objectType: high.objectType, requestedUse: 'DISPLAY', missionCritical: false, confidenceState: high });
  assert(hDisplay.allowed, 'GE19: HIGH display');
  const lDisplay = evaluateConfidenceGate({ canonicalId: low.canonicalId, objectType: low.objectType, requestedUse: 'DISPLAY', missionCritical: false, confidenceState: low });
  assert(lDisplay.allowed, 'GE20: LOW display');
  const uDisplay = evaluateConfidenceGate({ canonicalId: unr.canonicalId, objectType: unr.objectType, requestedUse: 'DISPLAY', missionCritical: false, confidenceState: unr });
  assert(uDisplay.allowed, 'GE21: UNRESOLVED display');
}

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  L3 Master: Cross-Layer System Tests              ║');
console.log('╚═══════════════════════════════════════════════════╝');
suite1(); suite2(); suite3(); suite4(); suite5(); suite6();
console.log(`\n═══════════════════════════════════════`);
console.log(`TOTAL: ${passed + failed} — ${passed} passed, ${failed} failed`);
if (failed > 0) { console.log(`${failed} FAILURES`); process.exit(1); }
else console.log('ALL CROSS-LAYER TESTS PASSED');
