/**
 * L3.5 — Canonical Metric Namespace — Test Suite
 *
 * 8 suites, 100+ assertions covering:
 *   A. Contract registry
 *   B. Namespace mapping
 *   C. Semantic validation
 *   D. Compatibility rules
 *   E. Gate enforcement
 *   F. Anti-fake suite
 *   G. Replay and versioning
 *   H. Cross-layer safety
 */

import {
  getMetricContract,
  registerMetricContract,
  getMetricContractVersion,
  getAllMetricContracts,
  listMetricContractPaths,
  getContractsByFamily,
  resetContractRegistry,
  bootstrapContracts,
  deriveComparabilitySignature,
  type MetricContract,
  type MetricUseDomain,
} from '../services/canonicalization/metric-contracts';

import {
  registerMetricPath,
  getMetricPathDefinition,
  listMetricPathsByFamily,
  listAllMetricPaths,
  resetPathRegistry,
  bootstrapNamespacePaths,
  buildCanonicalMetricObservation,
  persistObservation,
  getObservationsForObject,
  getLatestObservation,
  resetObservationStore,
  type CanonicalMetricObservation,
  type BuildObservationInput,
} from '../services/canonicalization/metric-namespace';

import {
  registerProviderMetricMapper,
  mapProviderMetric,
  getProviderMetricMapper,
  listMappableProviderFields,
  getAllMappingArtifacts,
  resetMapperState,
  type ProviderMetricMapperConfig,
} from '../services/canonicalization/provider-metric-mappers';

import {
  evaluateMetricCompatibility,
  canMergeMetricObservations,
  canCompareMetricObservations,
  getMetricMergeBlockReasons,
} from '../services/canonicalization/metric-compatibility-rules';

import {
  validateMappedMetric,
  validateCanonicalMetricObservation,
  enforceMetricNamespaceGate,
  isMetricAllowedForUse,
  getValidationReports,
  getGateDecisions,
  resetValidatorState,
} from '../services/canonicalization/metric-namespace-validator';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function makeProvenance(providerId = 'prov_test', rawField = 'raw_price') {
  return { providerId, rawFieldName: rawField, mapperVersion: '1.0.0', lineageRefs: ['lin_1'] };
}

function makeObservation(
  overrides: Partial<BuildObservationInput> = {},
): CanonicalMetricObservation {
  const input: BuildObservationInput = {
    metricPath: 'price.spot.usd',
    objectId: 'ast_test',
    objectType: 'ASSET',
    value: 42000,
    observedAt: new Date().toISOString(),
    provenance: makeProvenance(),
    freshnessState: 'FRESH',
    admissibilityState: 'ADMITTED',
    validationReportId: 'vrpt_placeholder',
    ...overrides,
  };
  const result = buildCanonicalMetricObservation(input);
  if ('error' in result) throw new Error(result.error);
  return result;
}

function resetAll(): void {
  resetContractRegistry();
  resetPathRegistry();
  resetMapperState();
  resetObservationStore();
  resetValidatorState();
  bootstrapContracts();
  bootstrapNamespacePaths();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — Contract registry
// ═══════════════════════════════════════════════════════════════════════════════

function suiteA(): void {
  console.log('\n=== SUITE A: Contract Registry ===');
  resetAll();

  const allContracts = getAllMetricContracts();
  assert(allContracts.length >= 22, 'A1: at least 22 contracts bootstrapped');

  const spot = getMetricContract('price.spot.usd');
  assert(spot !== undefined, 'A2: price.spot.usd contract exists');
  assert(spot!.unit === 'USD', 'A3: price.spot.usd unit is USD');
  assert(spot!.objectType === 'ASSET', 'A4: price.spot.usd object type is ASSET');
  assert(spot!.aggregationRule === 'POINT_IN_TIME', 'A5: price.spot.usd is POINT_IN_TIME');
  assert(spot!.window.kind === 'INSTANT', 'A6: price.spot.usd window is INSTANT');

  assert(getMetricContractVersion('price.spot.usd') === '1.0.0', 'A7: version is 1.0.0');

  try {
    registerMetricContract({ ...spot!, metricPath: 'price.spot.usd' });
    assert(false, 'A8: duplicate path should throw');
  } catch {
    assert(true, 'A8: duplicate path rejected');
  }

  const paths = listMetricContractPaths();
  assert(paths.includes('price.spot.usd'), 'A9: path listed');
  assert(paths.includes('funding.rate.8h'), 'A10: funding path listed');

  const priceFamily = getContractsByFamily('price');
  assert(priceFamily.length === 4, 'A11: 4 price family contracts');

  const protocolFamily = getContractsByFamily('protocol');
  assert(protocolFamily.length === 4, 'A12: 4 protocol family contracts');

  const tvl = getMetricContract('protocol.tvl.usd');
  assert(tvl !== undefined, 'A13: tvl contract exists');
  assert(tvl!.blockedMergeConditions.includes('protocol.treasury.usd'), 'A14: tvl blocks treasury merge');
  assert(tvl!.blockedUsesUnderUncertainty.includes('RANKING'), 'A15: tvl blocks ranking under uncertainty');
  assert(tvl!.blockedUsesUnderUncertainty.includes('SCORING'), 'A16: tvl blocks scoring under uncertainty');

  const narrative = getMetricContract('narrative.intensity');
  assert(narrative !== undefined, 'A17: narrative.intensity contract exists');
  assert(narrative!.blockedUsesUnderUncertainty.includes('SCORING'), 'A18: narrative blocks scoring under uncertainty');
  assert(narrative!.blockedUsesUnderUncertainty.includes('JUDGMENT'), 'A19: narrative blocks judgment under uncertainty');

  const poolQuote = getMetricContract('price.pool.quote');
  assert(poolQuote !== undefined, 'A20: pool quote contract exists');
  assert(poolQuote!.unit === 'QUOTE', 'A21: pool quote unit is QUOTE not USD');
  assert(poolQuote!.blockedMergeConditions.includes('price.spot.usd'), 'A22: pool quote blocks spot merge');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — Namespace mapping
// ═══════════════════════════════════════════════════════════════════════════════

function suiteB(): void {
  console.log('\n=== SUITE B: Namespace Mapping ===');
  resetAll();

  const config: ProviderMetricMapperConfig = {
    providerId: 'coingecko',
    mapperVersion: '1.0.0',
    fieldMappings: [
      { providerFieldName: 'current_price', canonicalMetricPath: 'price.spot.usd', unitNormalization: 'USD' },
      { providerFieldName: 'total_volume', canonicalMetricPath: 'volume.spot.usd.24h' },
    ],
  };
  registerProviderMetricMapper(config);

  assert(getProviderMetricMapper('coingecko') !== undefined, 'B1: mapper registered');
  assert(listMappableProviderFields('coingecko').length === 2, 'B2: 2 mappable fields');

  const mapped = mapProviderMetric({
    providerId: 'coingecko', rawFieldName: 'current_price', rawValue: 42000,
    objectId: 'ast_btc', objectType: 'ASSET', lineageRefs: ['lin_1'],
  });
  assert(mapped.status === 'MAPPED', 'B3: mapping succeeds');
  assert(mapped.metricPath === 'price.spot.usd', 'B4: maps to price.spot.usd');
  assert(mapped.contract !== null, 'B5: contract attached');
  assert(mapped.artifact.status === 'MAPPED', 'B6: artifact status MAPPED');
  assert(mapped.artifact.mapperVersion === '1.0.0', 'B7: mapper version in artifact');

  const unmapped = mapProviderMetric({
    providerId: 'coingecko', rawFieldName: 'unknown_field', rawValue: 0,
    objectId: 'ast_btc', objectType: 'ASSET', lineageRefs: [],
  });
  assert(unmapped.status === 'BLOCKED', 'B8: unmapped field blocked');
  assert(unmapped.artifact.blockReason === 'FIELD_NOT_IN_MAPPER', 'B9: block reason correct');

  const noMapper = mapProviderMetric({
    providerId: 'unknown_provider', rawFieldName: 'price', rawValue: 100,
    objectId: 'ast_x', objectType: 'ASSET', lineageRefs: [],
  });
  assert(noMapper.status === 'BLOCKED', 'B10: no mapper config blocked');
  assert(noMapper.artifact.blockReason === 'NO_MAPPER_CONFIG', 'B11: block reason NO_MAPPER_CONFIG');

  assert(getAllMappingArtifacts().length === 3, 'B12: 3 artifacts emitted');

  const rawProviderName = mapProviderMetric({
    providerId: 'coingecko', rawFieldName: 'current_price', rawValue: '42000',
    objectId: 'ast_btc', objectType: 'ASSET', lineageRefs: ['lin_1'],
  });
  assert(rawProviderName.status === 'MAPPED', 'B13: string value mapped');
  assert(typeof rawProviderName.normalizedValue === 'number', 'B14: value normalized to number');

  const badContractMapper: ProviderMetricMapperConfig = {
    providerId: 'badprov',
    mapperVersion: '1.0.0',
    fieldMappings: [
      { providerFieldName: 'xyz', canonicalMetricPath: 'nonexistent.metric.path' },
    ],
  };
  registerProviderMetricMapper(badContractMapper);
  const noContract = mapProviderMetric({
    providerId: 'badprov', rawFieldName: 'xyz', rawValue: 1,
    objectId: 'ast_x', objectType: 'ASSET', lineageRefs: [],
  });
  assert(noContract.status === 'BLOCKED', 'B15: no contract blocks mapping');
  assert(noContract.artifact.blockReason === 'NO_METRIC_CONTRACT', 'B16: block reason NO_METRIC_CONTRACT');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — Semantic validation
// ═══════════════════════════════════════════════════════════════════════════════

function suiteC(): void {
  console.log('\n=== SUITE C: Semantic Validation ===');
  resetAll();

  const validReport = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'ASSET', value: 42000, unit: 'USD',
    provenance: makeProvenance(), scope: { domain: 'market_wide_spot' },
    basis: { priceBasis: 'spot' }, window: { kind: 'INSTANT' },
  });
  assert(validReport.status === 'PASS', 'C1: valid metric passes');
  assert(validReport.violations.length === 0, 'C2: no violations');

  const missingBasis = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'ASSET', value: 42000,
    provenance: makeProvenance(), scope: { domain: 'market_wide_spot' },
    basis: {},
  });
  assert(missingBasis.status === 'FAIL', 'C3: missing basis fails');
  assert(missingBasis.violations.some(v => v.code === 'MISSING_BASIS'), 'C4: MISSING_BASIS violation');

  const missingScope = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'ASSET', value: 42000,
    provenance: makeProvenance(), basis: { priceBasis: 'spot' },
  });
  assert(missingScope.status === 'FAIL', 'C5: missing scope fails');
  assert(missingScope.violations.some(v => v.code === 'MISSING_SCOPE'), 'C6: MISSING_SCOPE violation');

  const wrongObjectType = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'PROTOCOL', value: 42000,
    provenance: makeProvenance(), scope: { domain: 'spot' }, basis: { priceBasis: 'spot' },
  });
  assert(wrongObjectType.violations.some(v => v.code === 'WRONG_OBJECT_TYPE'), 'C7: wrong object type detected');

  const wrongUnit = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'ASSET', value: 42000, unit: 'QUOTE',
    provenance: makeProvenance(), scope: { domain: 'spot' }, basis: { priceBasis: 'spot' },
  });
  assert(wrongUnit.violations.some(v => v.code === 'UNIT_MISMATCH'), 'C8: unit mismatch detected');

  const wrongValueType = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'ASSET', value: true,
    provenance: makeProvenance(), scope: { domain: 'spot' }, basis: { priceBasis: 'spot' },
  });
  assert(wrongValueType.violations.some(v => v.code === 'WRONG_VALUE_TYPE'), 'C9: wrong value type detected');

  const missingWindow = validateMappedMetric({
    metricPath: 'volume.spot.usd.24h', objectType: 'ASSET', value: 1000000,
    provenance: makeProvenance(), scope: { domain: 'market_wide_spot' },
    basis: { valuationBasis: 'usd_denominated' },
  });
  assert(missingWindow.violations.some(v => v.code === 'MISSING_WINDOW'), 'C10: missing window for rolling metric');

  const noContract = validateMappedMetric({
    metricPath: 'fake.nonexistent', objectType: 'ASSET', value: 0,
    provenance: makeProvenance(),
  });
  assert(noContract.status === 'FAIL', 'C11: no contract fails');
  assert(noContract.violations.some(v => v.code === 'NO_CONTRACT'), 'C12: NO_CONTRACT violation');

  const missingProvenance = validateMappedMetric({
    metricPath: 'price.spot.usd', objectType: 'ASSET', value: 42000,
    provenance: { providerId: '', rawFieldName: '', mapperVersion: '', lineageRefs: [] },
    scope: { domain: 'spot' }, basis: { priceBasis: 'spot' },
  });
  assert(missingProvenance.violations.some(v => v.code === 'MISSING_PROVIDER_ID'), 'C13: missing provider ID');
  assert(missingProvenance.violations.some(v => v.code === 'MISSING_RAW_FIELD_REF'), 'C14: missing raw field ref');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — Compatibility rules
// ═══════════════════════════════════════════════════════════════════════════════

function suiteD(): void {
  console.log('\n=== SUITE D: Compatibility Rules ===');
  resetAll();

  const spotVsMark = evaluateMetricCompatibility('price.spot.usd', 'price.mark.usd');
  assert(spotVsMark.outcome !== 'MERGE_COMPATIBLE', 'D1: spot vs mark not merge-compatible');
  assert(spotVsMark.outcome === 'COMPARE_ONLY', 'D2: spot vs mark compare-only (same family)');

  const spotVsPool = evaluateMetricCompatibility('price.spot.usd', 'price.pool.quote');
  assert(spotVsPool.outcome !== 'MERGE_COMPATIBLE', 'D3: spot vs pool not merge-compatible');

  const tvlVsTreasury = evaluateMetricCompatibility('protocol.tvl.usd', 'protocol.treasury.usd');
  assert(tvlVsTreasury.outcome !== 'MERGE_COMPATIBLE', 'D4: tvl vs treasury not merge-compatible');

  const flagVsSeverity = evaluateMetricCompatibility('security.risk.flag_count', 'security.risk.severity');
  assert(flagVsSeverity.outcome !== 'MERGE_COMPATIBLE', 'D5: flag_count vs severity not merge-compatible');

  const self = evaluateMetricCompatibility('price.spot.usd', 'price.spot.usd');
  assert(self.outcome === 'MERGE_COMPATIBLE', 'D6: same path is merge-compatible');

  const oiNotionalVsContracts = evaluateMetricCompatibility('oi.notional.usd', 'oi.contracts');
  assert(oiNotionalVsContracts.outcome !== 'MERGE_COMPATIBLE', 'D7: oi.notional vs oi.contracts not merge-compatible');

  const funding8hVs1h = evaluateMetricCompatibility('funding.rate.8h', 'funding.rate.1h');
  assert(funding8hVs1h.outcome !== 'MERGE_COMPATIBLE', 'D8: 8h vs 1h funding not merge-compatible');

  const inflowVsOutflow = evaluateMetricCompatibility('wallet.exchange_inflow.usd.24h', 'wallet.exchange_outflow.usd.24h');
  assert(inflowVsOutflow.outcome !== 'MERGE_COMPATIBLE', 'D9: inflow vs outflow not merge-compatible');

  const narrativeIvsV = evaluateMetricCompatibility('narrative.intensity', 'narrative.velocity');
  assert(narrativeIvsV.outcome !== 'MERGE_COMPATIBLE', 'D10: intensity vs velocity not merge-compatible');

  const feesVsRevenue = evaluateMetricCompatibility('protocol.fees.usd.24h', 'protocol.revenue.usd.24h');
  assert(feesVsRevenue.outcome !== 'MERGE_COMPATIBLE', 'D11: fees vs revenue not merge-compatible');

  const obsA = makeObservation();
  const obsB = makeObservation();
  const { mergeable } = canMergeMetricObservations(obsA, obsB);
  assert(mergeable === true, 'D12: same-contract observations merge-compatible');

  const obsBlocked = makeObservation({ admissibilityState: 'BLOCKED' });
  const { mergeable: m2 } = canMergeMetricObservations(obsA, obsBlocked);
  assert(m2 === false, 'D13: blocked observation cannot merge');

  const { comparable } = canCompareMetricObservations(obsA, obsB);
  assert(comparable === true, 'D14: same-contract observations comparable');

  const spotBlockReasons = getMetricMergeBlockReasons('price.spot.usd', 'price.mark.usd');
  assert(spotBlockReasons.length > 0, 'D15: spot-mark has block reasons');

  const selfReasons = getMetricMergeBlockReasons('price.spot.usd', 'price.spot.usd');
  assert(selfReasons.length === 0, 'D16: no block reasons for self');

  const spotVsVol = evaluateMetricCompatibility('price.spot.usd', 'volume.spot.usd.24h');
  assert(spotVsVol.outcome === 'INCOMPATIBLE' || spotVsVol.outcome.startsWith('BLOCKED'), 'D17: price vs volume incompatible');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — Gate enforcement
// ═══════════════════════════════════════════════════════════════════════════════

function suiteE(): void {
  console.log('\n=== SUITE E: Gate Enforcement ===');
  resetAll();

  const freshObs = makeObservation();
  const scoring = enforceMetricNamespaceGate(freshObs, 'SCORING');
  assert(scoring.allowed === true, 'E1: fresh admitted obs allowed for scoring');
  assert(scoring.mode === 'ALLOW', 'E2: mode is ALLOW');

  const staleObs = makeObservation({ freshnessState: 'STALE' });
  const staleScoring = enforceMetricNamespaceGate(staleObs, 'RANKING');
  assert(staleScoring.allowed === false, 'E3: stale obs denied for ranking');
  assert(staleScoring.mode === 'DENY', 'E4: mode is DENY');
  assert(staleScoring.blockReasons.length > 0, 'E5: block reasons present');

  const blockedObs = makeObservation({ admissibilityState: 'BLOCKED' });
  const blockedGate = enforceMetricNamespaceGate(blockedObs, 'DISPLAY');
  assert(blockedGate.allowed === false, 'E6: blocked admissibility denied');

  const conditionalObs = makeObservation({ admissibilityState: 'CONDITIONAL' });
  const conditionalGate = enforceMetricNamespaceGate(conditionalObs, 'SCORING');
  assert(conditionalGate.allowed === true, 'E7: conditional allowed');
  assert(conditionalGate.mode === 'CONDITIONAL', 'E8: mode is CONDITIONAL');

  const scarredObs = makeObservation({ scars: ['STALE_PROVENANCE'] });
  const scarGate = enforceMetricNamespaceGate(scarredObs, 'DISPLAY');
  assert(scarGate.mode === 'CONDITIONAL', 'E9: scarred obs is CONDITIONAL');

  const poolObs = makeObservation({ metricPath: 'price.pool.quote', objectType: 'PAIR' });
  const poolScoring = enforceMetricNamespaceGate(poolObs, 'SCORING');
  assert(poolScoring.allowed === false, 'E10: pool quote denied for scoring');

  const poolDisplay = enforceMetricNamespaceGate(poolObs, 'DISPLAY');
  assert(poolDisplay.allowed === true, 'E11: pool quote allowed for display');

  const narrativeObs = makeObservation({ metricPath: 'narrative.intensity', objectType: 'NARRATIVE_TOPIC' });
  const narrativeScoring = enforceMetricNamespaceGate(narrativeObs, 'SCORING');
  assert(narrativeScoring.allowed === false, 'E12: narrative intensity denied for scoring');

  assert(isMetricAllowedForUse(freshObs, 'SCORING'), 'E13: isMetricAllowedForUse returns true for allowed');
  assert(!isMetricAllowedForUse(poolObs, 'SCORING'), 'E14: isMetricAllowedForUse returns false for blocked');

  assert(getGateDecisions().length > 0, 'E15: gate decisions persisted');
  assert(getValidationReports().length > 0, 'E16: validation reports persisted');

  const unusableObs = makeObservation({ freshnessState: 'UNUSABLE' });
  const unusableGate = enforceMetricNamespaceGate(unusableObs, 'DISPLAY');
  assert(unusableGate.allowed === false, 'E17: unusable freshness denied');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — Anti-fake suite
// ═══════════════════════════════════════════════════════════════════════════════

function suiteF(): void {
  console.log('\n=== SUITE F: Anti-Fake Suite ===');
  resetAll();

  const noMapperResult = mapProviderMetric({
    providerId: 'phantom_provider', rawFieldName: 'mystery_metric', rawValue: 999,
    objectId: 'ast_x', objectType: 'ASSET', lineageRefs: [],
  });
  assert(noMapperResult.status === 'BLOCKED', 'F1: provider alias name cannot create fake metric');

  const narrativeObs = makeObservation({ metricPath: 'narrative.intensity', objectType: 'NARRATIVE_TOPIC' });
  const eventConfirmation = enforceMetricNamespaceGate(narrativeObs, 'JUDGMENT');
  assert(eventConfirmation.allowed === false, 'F2: social attention cannot pass as event confirmation');

  const flagObs = makeObservation({ metricPath: 'security.risk.flag_count', objectType: 'ASSET', value: 3 });
  const severityObs = makeObservation({ metricPath: 'security.risk.severity', objectType: 'ASSET', value: 7.5 });
  const { mergeable: flagSevMerge } = canMergeMetricObservations(flagObs, severityObs);
  assert(!flagSevMerge, 'F3: raw count cannot merge with normalized severity');

  const spotObs = makeObservation();
  const vol24h = makeObservation({ metricPath: 'volume.spot.usd.24h' });
  const { mergeable: wrongWindow } = canMergeMetricObservations(spotObs, vol24h);
  assert(!wrongWindow, 'F4: wrong window cannot merge with different metric');

  const inflowObs = makeObservation({ metricPath: 'wallet.exchange_inflow.usd.24h', objectType: 'ENTITY' });
  const netflowObs = makeObservation({ metricPath: 'wallet.netflow.usd.24h', objectType: 'ENTITY' });
  const { mergeable: flowMerge } = canMergeMetricObservations(inflowObs, netflowObs);
  assert(!flowMerge, 'F5: inflow cannot merge with netflow');

  const poolObs = makeObservation({ metricPath: 'price.pool.quote', objectType: 'PAIR' });
  const spotScoring = enforceMetricNamespaceGate(poolObs, 'SCORING');
  assert(!spotScoring.allowed, 'F6: pool quote cannot enter scoring');

  const tvlObs = makeObservation({ metricPath: 'protocol.tvl.usd', objectType: 'PROTOCOL' });
  const treasuryObs = makeObservation({ metricPath: 'protocol.treasury.usd', objectType: 'PROTOCOL' });
  const { mergeable: tvlTrMerge } = canMergeMetricObservations(tvlObs, treasuryObs);
  assert(!tvlTrMerge, 'F7: tvl cannot merge with treasury');

  const markObs = makeObservation({ metricPath: 'price.mark.usd', objectType: 'PAIR' });
  const { mergeable: spotMarkMerge } = canMergeMetricObservations(spotObs, markObs);
  assert(!spotMarkMerge, 'F8: spot cannot merge with mark');

  const funding8h = makeObservation({ metricPath: 'funding.rate.8h', objectType: 'PAIR' });
  const funding1h = makeObservation({ metricPath: 'funding.rate.1h', objectType: 'PAIR' });
  const { mergeable: fundingMerge } = canMergeMetricObservations(funding8h, funding1h);
  assert(!fundingMerge, 'F9: 8h funding cannot merge with 1h funding');

  const narrativeVelocity = makeObservation({ metricPath: 'narrative.velocity', objectType: 'NARRATIVE_TOPIC' });
  const { mergeable: narMerge } = canMergeMetricObservations(narrativeObs, narrativeVelocity);
  assert(!narMerge, 'F10: intensity cannot merge with velocity');

  const oiUsd = makeObservation({ metricPath: 'oi.notional.usd', objectType: 'ASSET' });
  const oiContracts = makeObservation({ metricPath: 'oi.contracts', objectType: 'PAIR' });
  const { mergeable: oiMerge } = canMergeMetricObservations(oiUsd, oiContracts);
  assert(!oiMerge, 'F11: oi.notional cannot merge with oi.contracts');

  const liqNotional = makeObservation({ metricPath: 'liquidations.notional.usd.24h', objectType: 'ASSET' });
  const liqCount = makeObservation({ metricPath: 'liquidations.count.24h', objectType: 'ASSET' });
  const { mergeable: liqMerge } = canMergeMetricObservations(liqNotional, liqCount);
  assert(!liqMerge, 'F12: liquidation notional cannot merge with count');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE G — Replay and versioning
// ═══════════════════════════════════════════════════════════════════════════════

function suiteG(): void {
  console.log('\n=== SUITE G: Replay and Versioning ===');
  resetAll();

  const obs = makeObservation();
  assert(obs.metricContractVersion === '1.0.0', 'G1: observation carries contract version');

  persistObservation(obs);
  const retrieved = getObservationsForObject('ast_test', 'price.spot.usd');
  assert(retrieved.length === 1, 'G2: observation persisted and retrieved');
  assert(retrieved[0].metricContractVersion === '1.0.0', 'G3: persisted version preserved');

  const obs2 = makeObservation({ value: 43000 });
  persistObservation(obs2);
  const latest = getLatestObservation('ast_test', 'price.spot.usd');
  assert(latest !== undefined, 'G4: latest observation found');
  assert(latest!.value === 43000, 'G5: latest is most recent');

  assert(obs.observationId !== obs2.observationId, 'G6: unique observation IDs');

  const allObs = getObservationsForObject('ast_test');
  assert(allObs.length === 2, 'G7: all observations for object');

  assert(obs.compatibilitySignature.includes('price.spot.usd'), 'G8: compatibility signature includes path');
  assert(obs.provenance.providerId === 'prov_test', 'G9: provenance preserved');
  assert(obs.provenance.rawFieldName === 'raw_price', 'G10: raw field name preserved');
  assert(obs.provenance.mapperVersion === '1.0.0', 'G11: mapper version preserved');
  assert(obs.provenance.lineageRefs.length > 0, 'G12: lineage refs preserved');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE H — Cross-layer safety
// ═══════════════════════════════════════════════════════════════════════════════

function suiteH(): void {
  console.log('\n=== SUITE H: Cross-Layer Safety ===');
  resetAll();

  const freshObs = makeObservation();
  const scoringGate = enforceMetricNamespaceGate(freshObs, 'SCORING');
  assert(scoringGate.auditStamp.validatorVersion === '1.0.0', 'H1: audit stamp present');
  assert(scoringGate.validationReportId.startsWith('vrpt_'), 'H2: validation report ref present');
  assert(scoringGate.contractVersion === '1.0.0', 'H3: contract version in gate decision');

  const blockedObs = makeObservation({ admissibilityState: 'BLOCKED' });
  const blockedScoring = enforceMetricNamespaceGate(blockedObs, 'SCORING');
  assert(!blockedScoring.allowed, 'H4: blocked metric cannot enter scoring');

  const blockedScenario = enforceMetricNamespaceGate(blockedObs, 'SCENARIO');
  assert(!blockedScenario.allowed, 'H5: blocked metric cannot enter scenario');

  const poolObs = makeObservation({ metricPath: 'price.pool.quote', objectType: 'PAIR' });
  const poolDisplay = enforceMetricNamespaceGate(poolObs, 'DISPLAY');
  assert(poolDisplay.allowed, 'H6: display-only metric stays display-only (allowed)');
  const poolRanking = enforceMetricNamespaceGate(poolObs, 'RANKING');
  assert(!poolRanking.allowed, 'H7: display-only metric denied for ranking');

  const compat = evaluateMetricCompatibility('protocol.tvl.usd', 'protocol.treasury.usd');
  assert(compat.outcome !== 'MERGE_COMPATIBLE', 'H8: incompatible metrics visible downstream');

  const freshAllowedScoring = freshObs.allowedUses.includes('SCORING');
  assert(freshAllowedScoring, 'H9: allowed uses propagated');

  const pathDef = getMetricPathDefinition('price.spot.usd');
  assert(pathDef !== undefined, 'H10: metric path definition accessible');
  assert(pathDef!.semanticFamily === 'price', 'H11: family info accessible');

  const allPaths = listAllMetricPaths();
  assert(allPaths.length >= 22, 'H12: all metric paths registered');

  const pricePaths = listMetricPathsByFamily('price');
  assert(pricePaths.length === 4, 'H13: price family paths grouped');

  try {
    registerMetricPath('price.spot.usd', 'price', 'dup');
    assert(false, 'H14: duplicate path should throw');
  } catch {
    assert(true, 'H14: duplicate path rejected');
  }

  const result = buildCanonicalMetricObservation({
    metricPath: 'nonexistent.path',
    objectId: 'x', objectType: 'ASSET', value: 0,
    observedAt: new Date().toISOString(),
    provenance: makeProvenance(),
    freshnessState: 'FRESH', admissibilityState: 'ADMITTED',
    validationReportId: 'vrpt_x',
  });
  assert('error' in result, 'H15: building obs for non-existent contract returns error');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔══════════════════════════════════════════╗');
console.log('║  L3.5 Canonical Metric Namespace Tests   ║');
console.log('╚══════════════════════════════════════════╝');

suiteA();
suiteB();
suiteC();
suiteD();
suiteE();
suiteF();
suiteG();
suiteH();

console.log(`\n════════════════════════════════════════`);
console.log(`TOTAL: ${passed + failed} assertions — ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('ALL L3.5 TESTS PASSED');
} else {
  console.log(`${failed} FAILURES`);
  process.exit(1);
}
