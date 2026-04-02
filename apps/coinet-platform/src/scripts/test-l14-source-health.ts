/**
 * L1.4 Integration Test Suite
 *
 * Tests all 5 health dimensions + composite scoring + downstream integration.
 *
 * Tests:
 *   1. Healthy source — full primary, all dimensions strong
 *   2. Stale source — fresh enough for some fields, expired for others
 *   3. Invalid payload — structurally broken data
 *   4. Historically weak source — repeated failures in rolling memory
 *   5. Weak trust class — correct data but low-trust source type
 *   6. Pipeline integration — L1.4 feeds L1.3 and affects judgment
 *   7. Null source — no data provided at all
 *   8. Mixed health — some fields healthy, some weak
 */

import { scoreSource, scoreAllQuantumSources, isSourceFitForPrimaryRole, computeConfidencePenaltyFromHealth, deriveHealthBand } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/source-health-scorer';
import { computeFreshnessScore } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/freshness-policies';
import { validatePayload } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/payload-validators';
import { recordReliabilityEvent, getReliabilitySnapshot, clearReliabilityMemory } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/reliability-tracker';
import { runQuantumRiskPipeline } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/pipeline';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function heading(label: string) {
  console.log(`\n━━━ TEST: ${label} ━━━`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 1: Healthy source
// ═══════════════════════════════════════════════════════════════════════════════
heading('1. Healthy source — all dimensions strong');
clearReliabilityMemory();

const healthyRecord = scoreSource({
  sourceId: 'btc_chain_index',
  fieldName: 'scriptDistribution',
  trustClass: 'verified_chain_data',
  data: { p2pk: 1700000, p2pkh: 8500000, p2wpkh: 5200000, p2tr: 1500000, p2sh: 1800000, unknown: 1000000, total: 19700000 },
  observedAt: new Date().toISOString(),
  availabilityScore: 1.0,
});

assert(healthyRecord.healthBand === 'healthy' || healthyRecord.healthBand === 'usable', `health band = ${healthyRecord.healthBand}`);
assert(healthyRecord.sourceUsabilityScore >= 0.70, `usability = ${healthyRecord.sourceUsabilityScore}`);
assert(healthyRecord.freshnessScore >= 0.95, `freshness = ${healthyRecord.freshnessScore}`);
assert(healthyRecord.payloadValidityScore >= 0.95, `payload validity = ${healthyRecord.payloadValidityScore}`);
assert(healthyRecord.trustClassModifier === 1.0, `trust modifier = ${healthyRecord.trustClassModifier}`);
assert(isSourceFitForPrimaryRole(healthyRecord), 'fit for primary role');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 2: Stale source
// ═══════════════════════════════════════════════════════════════════════════════
heading('2. Stale source — data aged beyond acceptable');
clearReliabilityMemory();

const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
const staleRecord = scoreSource({
  sourceId: 'btc_chain_index',
  fieldName: 'scriptDistribution',
  trustClass: 'verified_chain_data',
  data: { p2pk: 1700000, p2pkh: 8500000, p2wpkh: 5200000, p2tr: 1500000, p2sh: 1800000, unknown: 1000000, total: 19700000 },
  observedAt: fiveDaysAgo,
  availabilityScore: 1.0,
});

assert(staleRecord.freshnessScore < 0.85, `stale freshness = ${staleRecord.freshnessScore}`);
assert(staleRecord.freshnessBand === 'degraded' || staleRecord.freshnessBand === 'acceptable', `freshness band = ${staleRecord.freshnessBand}`);
assert(staleRecord.sourceUsabilityScore < healthyRecord.sourceUsabilityScore, `stale usability (${staleRecord.sourceUsabilityScore}) < healthy (${healthyRecord.sourceUsabilityScore})`);

// btcPriceContext is much more sensitive to staleness — 5 days is unresolved
const stalePriceRecord = scoreSource({
  sourceId: 'market_feed',
  fieldName: 'btcPriceContext',
  trustClass: 'trusted_external_analytics',
  data: { price: 68000 },
  observedAt: fiveDaysAgo,
  availabilityScore: 1.0,
});
assert(stalePriceRecord.freshnessScore < 0.10, `price stale freshness = ${stalePriceRecord.freshnessScore}`);
assert(stalePriceRecord.freshnessBand === 'unresolved', `price freshness band = ${stalePriceRecord.freshnessBand}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 3: Invalid payload
// ═══════════════════════════════════════════════════════════════════════════════
heading('3. Invalid payload — structurally broken data');
clearReliabilityMemory();

const invalidResult = validatePayload('scriptDistribution', { p2pk: -500, total: 0 });
assert(invalidResult.score < 0.50, `invalid payload score = ${invalidResult.score}`);
assert(invalidResult.severity === 'critical' || invalidResult.severity === 'major', `severity = ${invalidResult.severity}`);
assert(invalidResult.issues.length >= 2, `issues found: ${invalidResult.issues.length}`);

const invalidRecord = scoreSource({
  sourceId: 'btc_chain_index',
  fieldName: 'scriptDistribution',
  trustClass: 'verified_chain_data',
  data: { p2pk: -500, total: 0 },
  observedAt: new Date().toISOString(),
  availabilityScore: 1.0,
});
assert(!isSourceFitForPrimaryRole(invalidRecord) || invalidRecord.healthBand === 'weak' || invalidRecord.healthBand === 'degraded',
  `invalid payload → band = ${invalidRecord.healthBand}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 4: Historically weak source
// ═══════════════════════════════════════════════════════════════════════════════
heading('4. Historically weak source — repeated failures');
clearReliabilityMemory();

for (let i = 0; i < 30; i++) {
  recordReliabilityEvent('unreliable_source', {
    timestamp: Date.now() - (30 - i) * 60000,
    success: i % 3 === 0,
    schemaValid: i % 4 === 0,
    conflicted: i % 2 === 0,
    corrected: i % 5 === 0,
  });
}

const relSnap = getReliabilitySnapshot('unreliable_source');
assert(relSnap.compositeReliability <= 0.50, `reliability = ${relSnap.compositeReliability}`);
assert(relSnap.successRate < 0.40, `success rate = ${relSnap.successRate}`);

const weakRelRecord = scoreSource({
  sourceId: 'unreliable_source',
  fieldName: 'dormantCohorts',
  trustClass: 'verified_chain_data',
  data: { gt_5y: 3900000, gt_7y: 2800000, gt_10y: 1700000 },
  observedAt: new Date().toISOString(),
  availabilityScore: 0.8,
});
assert(weakRelRecord.sourceUsabilityScore < healthyRecord.sourceUsabilityScore, 
  `weak reliability usability (${weakRelRecord.sourceUsabilityScore}) < healthy (${healthyRecord.sourceUsabilityScore})`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 5: Weak trust class
// ═══════════════════════════════════════════════════════════════════════════════
heading('5. Weak trust class — correct data, low trust');
clearReliabilityMemory();

const heuristicRecord = scoreSource({
  sourceId: 'heuristic_model',
  fieldName: 'dormantCohorts',
  trustClass: 'heuristic_inference',
  data: { gt_5y: 3900000, gt_7y: 2800000, gt_10y: 1700000 },
  observedAt: new Date().toISOString(),
  availabilityScore: 1.0,
});
assert(heuristicRecord.trustClassModifier === 0.55, `heuristic modifier = ${heuristicRecord.trustClassModifier}`);
assert(heuristicRecord.sourceUsabilityScore < 0.80, `heuristic usability = ${heuristicRecord.sourceUsabilityScore}`);
assert(!isSourceFitForPrimaryRole(heuristicRecord), 'heuristic not fit for primary');

const narrativeRecord = scoreSource({
  sourceId: 'twitter_claim',
  fieldName: 'pqEvidence',
  trustClass: 'narrative_claim',
  data: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-15' },
  observedAt: new Date().toISOString(),
  availabilityScore: 1.0,
});
assert(narrativeRecord.trustClassModifier === 0.20, `narrative modifier = ${narrativeRecord.trustClassModifier}`);
assert(narrativeRecord.healthBand === 'unusable' || narrativeRecord.healthBand === 'degraded',
  `narrative band = ${narrativeRecord.healthBand}`);

const llmRecord = scoreSource({
  sourceId: 'chatgpt_output',
  fieldName: 'scriptDistribution',
  trustClass: 'llm_generated',
  data: { p2pk: 1700000, p2pkh: 8500000, p2wpkh: 5200000, p2tr: 1500000, p2sh: 1800000, unknown: 1000000, total: 19700000 },
  observedAt: new Date().toISOString(),
  availabilityScore: 1.0,
});
assert(llmRecord.trustClassModifier === 0.00, `llm modifier = ${llmRecord.trustClassModifier}`);
assert(llmRecord.sourceUsabilityScore === 0, `llm usability = ${llmRecord.sourceUsabilityScore}`);
assert(llmRecord.healthBand === 'unusable', `llm band = ${llmRecord.healthBand}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 6: Pipeline integration
// ═══════════════════════════════════════════════════════════════════════════════
heading('6. Pipeline integration — L1.4 feeds L1.3 and affects judgment');
clearReliabilityMemory();

const pipeResult = runQuantumRiskPipeline({
  asset: 'BTC',
  totalSupply: 19700000,
  scriptDistribution: { p2pk: 1700000, p2pkh: 8500000, p2wpkh: 5200000, p2tr: 1500000, p2sh: 1800000, unknown: 1000000, total: 19700000 },
  dormantCohorts: { gt_5y: 3900000, gt_7y: 2800000, gt_10y: 1700000 },
  pqEvidence: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-15T00:00:00Z' },
});

assert(pipeResult.sourceHealth !== undefined, 'sourceHealth diagnostics present');
assert(pipeResult.sourceHealth!.totalFields >= 4, `total fields scored = ${pipeResult.sourceHealth!.totalFields}`);
assert(pipeResult.sourceHealth!.version === '1.0.0', `version = ${pipeResult.sourceHealth!.version}`);
assert(pipeResult.redundancy !== undefined, 'L1.3 redundancy still present');
assert(pipeResult.success, 'pipeline succeeded');

const scriptHealth = pipeResult.sourceHealth!.records.find(r => r.fieldName === 'scriptDistribution');
assert(scriptHealth !== undefined, 'scriptDistribution health record exists');
assert(scriptHealth!.healthBand === 'healthy' || scriptHealth!.healthBand === 'usable', `scriptDistribution band = ${scriptHealth!.healthBand}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 7: Null source — no data
// ═══════════════════════════════════════════════════════════════════════════════
heading('7. Null source — no data provided');
clearReliabilityMemory();

const { records: nullRecords, diagnostics: nullDiag } = scoreAllQuantumSources({
  scriptDistribution: null,
  dormantCohorts: null,
  pqEvidence: null,
  totalSupply: null,
});

assert(nullRecords.scriptDistribution.healthBand === 'unusable', 'null script → unusable');
assert(nullRecords.dormantCohorts.healthBand === 'unusable', 'null dormant → unusable');
assert(nullDiag.unusable === 4, `all 4 unusable`);
assert(nullDiag.avgUsability === 0, `avg usability = ${nullDiag.avgUsability}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 8: Mixed health
// ═══════════════════════════════════════════════════════════════════════════════
heading('8. Mixed health — some healthy, some weak');
clearReliabilityMemory();

const { records: mixedRecords, diagnostics: mixedDiag } = scoreAllQuantumSources({
  scriptDistribution: {
    sourceId: 'btc_chain',
    trustClass: 'verified_chain_data',
    data: { p2pk: 1700000, p2pkh: 8500000, p2wpkh: 5200000, p2tr: 1500000, p2sh: 1800000, unknown: 1000000, total: 19700000 },
    observedAt: new Date().toISOString(),
    availabilityScore: 1.0,
  },
  dormantCohorts: {
    sourceId: 'stale_index',
    trustClass: 'verified_cached_snapshot',
    data: { gt_5y: 3900000, gt_7y: 2800000, gt_10y: 1700000 },
    observedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    availabilityScore: 0.6,
  },
  pqEvidence: null,
  totalSupply: {
    sourceId: 'market_api',
    trustClass: 'trusted_external_analytics',
    data: 19700000,
    observedAt: new Date().toISOString(),
    availabilityScore: 0.95,
  },
});

assert(mixedRecords.scriptDistribution.healthBand === 'healthy' || mixedRecords.scriptDistribution.healthBand === 'usable',
  `script band = ${mixedRecords.scriptDistribution.healthBand}`);
assert(mixedRecords.dormantCohorts.sourceUsabilityScore < mixedRecords.scriptDistribution.sourceUsabilityScore,
  `dormant weaker than script`);
assert(mixedRecords.pqEvidence.healthBand === 'unusable', 'pqEvidence null → unusable');
assert(mixedDiag.claimRestrictions.length > 0, `claim restrictions present: ${mixedDiag.claimRestrictions.length}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 9: Freshness boundaries
// ═══════════════════════════════════════════════════════════════════════════════
heading('9. Freshness boundaries — field-specific thresholds');

const cases: Array<{ field: string; ageH: number; expectedBand: string }> = [
  { field: 'scriptDistribution', ageH: 0.5, expectedBand: 'optimal' },
  { field: 'scriptDistribution', ageH: 48, expectedBand: 'acceptable' },
  { field: 'scriptDistribution', ageH: 120, expectedBand: 'degraded' },
  { field: 'btcPriceContext', ageH: 0.01, expectedBand: 'optimal' },
  { field: 'btcPriceContext', ageH: 0.5, expectedBand: 'acceptable' },
  { field: 'btcPriceContext', ageH: 48, expectedBand: 'degraded' },
  { field: 'pqEvidence', ageH: 24, expectedBand: 'optimal' },
  { field: 'pqEvidence', ageH: 24 * 20, expectedBand: 'acceptable' },
];

for (const c of cases) {
  const ageMs = c.ageH * 60 * 60 * 1000;
  const { band } = computeFreshnessScore(c.field, ageMs);
  assert(band === c.expectedBand, `${c.field} @ ${c.ageH}h → ${band} (expected ${c.expectedBand})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 10: Health band derivation
// ═══════════════════════════════════════════════════════════════════════════════
heading('10. Health band derivation');
assert(deriveHealthBand(0.90) === 'healthy', '0.90 → healthy');
assert(deriveHealthBand(0.85) === 'healthy', '0.85 → healthy');
assert(deriveHealthBand(0.75) === 'usable', '0.75 → usable');
assert(deriveHealthBand(0.55) === 'weak', '0.55 → weak');
assert(deriveHealthBand(0.30) === 'degraded', '0.30 → degraded');
assert(deriveHealthBand(0.10) === 'unusable', '0.10 → unusable');

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n════════════════════════════════════════');
console.log(`  L1.4 RESULTS: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
