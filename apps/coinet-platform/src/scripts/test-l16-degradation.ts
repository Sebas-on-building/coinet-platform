/**
 * L1.6 Integration Test Suite
 *
 * Tests:
 *   1.  Healthy pipeline — no degradation events
 *   2.  Missing scriptDistribution — critical, exposure truth lost
 *   3.  Missing dormantCohorts — critical, dormant supply truth lost
 *   4.  Missing pqEvidence — critical, migration truth lost
 *   5.  All missing — multiple critical, forceInsufficientData
 *   6.  Stale source — partial/degraded severity
 *   7.  Invalid payload — degraded/critical severity
 *   8.  Conflicted field — severity from conflict
 *   9.  Weak substitution — advisory/partial severity
 *  10.  Pipeline integration — L1.6 diagnostics in PipelineResult
 *  11.  Claim restrictions — correct restriction classes per severity
 *  12.  User/reasoning disclosure — non-empty for material degradation
 *  13.  Calibration handling — exclude/downweight at right severity
 */

import { evaluateFieldDegradation, evaluateAllDegradation, clearDegradationLedger } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/degradation-engine';
import type { DetectionInput } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/degradation-engine';
import { runQuantumRiskPipeline } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/pipeline';
import type { SourceHealthRecord } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/source-health-types';
import type { SourceResolutionRecord } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/redundancy-types';
import type { ConflictResolutionRecord } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/conflict-types';
import { clearReliabilityMemory } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/reliability-tracker';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

function heading(label: string) { console.log(`\n━━━ TEST: ${label} ━━━`); }

function makeHealthRecord(overrides: Partial<SourceHealthRecord>): SourceHealthRecord {
  return {
    sourceId: 'test', fieldName: 'test', truthDomain: 'cryptographic_integrity',
    trustClass: 'verified_chain_data', availabilityScore: 1, freshnessScore: 1,
    payloadValidityScore: 1, historicalReliabilityScore: 1, compositeHealthScore: 1,
    trustClassModifier: 1, sourceUsabilityScore: 1, healthBand: 'healthy',
    freshnessBand: 'optimal', freshnessPolicyVersion: '1.0.0', reasonSummary: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 1: Healthy pipeline — no degradation events
// ═══════════════════════════════════════════════════════════════════════════════
heading('1. Healthy — no degradation');
clearDegradationLedger();
clearReliabilityMemory();

const healthyInput: DetectionInput = {
  fieldName: 'scriptDistribution',
  dataPresent: true,
  healthRecord: makeHealthRecord({ fieldName: 'scriptDistribution' }),
};
const r1 = evaluateFieldDegradation(healthyInput);
assert(r1 === null, 'no degradation event for healthy field');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 2: Missing scriptDistribution — critical
// ═══════════════════════════════════════════════════════════════════════════════
heading('2. Missing scriptDistribution');
clearDegradationLedger();

const r2 = evaluateFieldDegradation({
  fieldName: 'scriptDistribution', dataPresent: false,
});
assert(r2 !== null, 'degradation event generated');
assert(r2!.degradationType === 'missing', `type = ${r2!.degradationType}`);
assert(r2!.severity === 'critical', `severity = ${r2!.severity}`);
assert(r2!.truthDomain === 'exposure_truth', `domain = ${r2!.truthDomain}`);
assert(r2!.fieldConfidencePenalty === 0.30, `penalty = ${r2!.fieldConfidencePenalty}`);
assert(r2!.featureImpacts.some(f => f.feature === 'key_exposure_rate'), 'impacts key_exposure_rate');
assert(r2!.claimRestrictions.includes('R1_exactness'), 'R1 restriction');
assert(r2!.claimRestrictions.includes('R3_directional'), 'R3 restriction');
assert(r2!.userDisclosure.length > 10, `user disclosure: "${r2!.userDisclosure.substring(0, 50)}..."`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 3: Missing dormantCohorts — critical
// ═══════════════════════════════════════════════════════════════════════════════
heading('3. Missing dormantCohorts');
clearDegradationLedger();

const r3 = evaluateFieldDegradation({
  fieldName: 'dormantCohorts', dataPresent: false,
});
assert(r3 !== null, 'event generated');
assert(r3!.severity === 'critical', `severity = ${r3!.severity}`);
assert(r3!.truthDomain === 'dormant_supply_truth', `domain = ${r3!.truthDomain}`);
assert(r3!.scenarioImpacts.some(s => s.scenario === 'slow_quantum'), 'impacts slow_quantum');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 4: Missing pqEvidence — critical
// ═══════════════════════════════════════════════════════════════════════════════
heading('4. Missing pqEvidence');
clearDegradationLedger();

const r4 = evaluateFieldDegradation({
  fieldName: 'pqEvidence', dataPresent: false,
});
assert(r4 !== null, 'event generated');
assert(r4!.severity === 'critical', `severity = ${r4!.severity}`);
assert(r4!.truthDomain === 'migration_truth', `domain = ${r4!.truthDomain}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 5: All missing — forceInsufficientData
// ═══════════════════════════════════════════════════════════════════════════════
heading('5. All core fields missing → forceInsufficientData');
clearDegradationLedger();

const { diagnostics: allMissingDiag } = evaluateAllDegradation({
  fields: {
    scriptDistribution: { fieldName: 'scriptDistribution', dataPresent: false },
    dormantCohorts: { fieldName: 'dormantCohorts', dataPresent: false },
    pqEvidence: { fieldName: 'pqEvidence', dataPresent: false },
    totalSupply: { fieldName: 'totalSupply', dataPresent: false },
  },
});

assert(allMissingDiag.forceInsufficientData, 'forceInsufficientData = true');
assert(allMissingDiag.critical >= 3, `critical count = ${allMissingDiag.critical}`);
assert(allMissingDiag.totalFieldPenalty > 0.80, `total penalty = ${allMissingDiag.totalFieldPenalty}`);
assert(allMissingDiag.userDisclosures.length >= 4, `user disclosures = ${allMissingDiag.userDisclosures.length}`);
assert(allMissingDiag.activeRestrictions.includes('R1_exactness'), 'R1 active');
assert(allMissingDiag.activeRestrictions.includes('R3_directional'), 'R3 active');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 6: Stale source — partial/degraded
// ═══════════════════════════════════════════════════════════════════════════════
heading('6. Stale source');
clearDegradationLedger();

const r6 = evaluateFieldDegradation({
  fieldName: 'scriptDistribution',
  dataPresent: true,
  healthRecord: makeHealthRecord({
    fieldName: 'scriptDistribution',
    healthBand: 'usable',
    freshnessBand: 'degraded',
    freshnessScore: 0.45,
    sourceUsabilityScore: 0.72,
  }),
});
assert(r6 !== null, 'event generated');
assert(r6!.degradationType === 'stale', `type = ${r6!.degradationType}`);
assert(r6!.severity === 'degraded', `severity = ${r6!.severity}`);
assert(r6!.fieldConfidencePenalty > 0.10, `penalty = ${r6!.fieldConfidencePenalty}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 7: Invalid payload
// ═══════════════════════════════════════════════════════════════════════════════
heading('7. Invalid payload');
clearDegradationLedger();

const r7 = evaluateFieldDegradation({
  fieldName: 'dormantCohorts',
  dataPresent: true,
  healthRecord: makeHealthRecord({
    fieldName: 'dormantCohorts',
    healthBand: 'weak',
    payloadValidityScore: 0.30,
    sourceUsabilityScore: 0.55,
  }),
});
assert(r7 !== null, 'event generated');
assert(r7!.degradationType === 'invalid', `type = ${r7!.degradationType}`);
assert(r7!.severity === 'degraded' || r7!.severity === 'critical', `severity = ${r7!.severity}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 8: Conflicted field
// ═══════════════════════════════════════════════════════════════════════════════
heading('8. Conflicted field');
clearDegradationLedger();

const r8 = evaluateFieldDegradation({
  fieldName: 'pqEvidence',
  dataPresent: true,
  healthRecord: makeHealthRecord({ fieldName: 'pqEvidence' }),
  conflictRecord: {
    fieldName: 'pqEvidence',
    conflictType: 'structural',
    sourceA: 'a', sourceB: 'b', valueA: {}, valueB: {},
    authorityComparison: 'equal',
    semanticComparability: 'aligned',
    freshnessComparison: 'equal',
    healthComparison: 'equal',
    severity: 'high',
    action: 'preserved_contradiction',
    resolvedValue: null,
    confidencePenalty: 0.25,
    contradictionPreserved: true,
    outputRestrictionFlags: [],
    reasonSummary: ['stage conflict'],
    policyVersion: '1.0.0',
  },
});
assert(r8 !== null, 'event generated');
assert(r8!.degradationType === 'conflicted', `type = ${r8!.degradationType}`);
assert(r8!.severity === 'degraded', `severity = ${r8!.severity}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 9: Weak substitution
// ═══════════════════════════════════════════════════════════════════════════════
heading('9. Weak substitution');
clearDegradationLedger();

const r9 = evaluateFieldDegradation({
  fieldName: 'scriptDistribution',
  dataPresent: true,
  healthRecord: makeHealthRecord({
    fieldName: 'scriptDistribution',
    healthBand: 'weak',
    sourceUsabilityScore: 0.60,
  }),
  redundancyRecord: {
    fieldName: 'scriptDistribution',
    meaningClaim: 'test',
    substitutionClass: 'C',
    fallbackStatus: 'cached_secondary',
    confidencePenalty: 0.35,
    degradationState: 'partial',
    reason: 'secondary cache used',
  },
});
assert(r9 !== null, 'event generated');
assert(r9!.degradationType === 'weak_substituted', `type = ${r9!.degradationType}`);
assert(r9!.severity === 'partial', `severity = ${r9!.severity}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 10: Pipeline integration
// ═══════════════════════════════════════════════════════════════════════════════
heading('10. Pipeline integration — L1.6 in PipelineResult');
clearDegradationLedger();
clearReliabilityMemory();

const pipeResult = runQuantumRiskPipeline({
  asset: 'BTC', totalSupply: 19_700_000,
  scriptDistribution: { p2pk: 1700000, p2pkh: 8500000, p2wpkh: 5200000, p2tr: 1500000, p2sh: 1800000, unknown: 1000000, total: 19700000 },
  dormantCohorts: { gt_5y: 3900000, gt_7y: 2800000, gt_10y: 1700000 },
  pqEvidence: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-15T00:00:00Z' },
});

assert(pipeResult.semanticDegradation !== undefined, 'semanticDegradation present');
assert(pipeResult.semanticDegradation!.version === '1.0.0', `version = ${pipeResult.semanticDegradation!.version}`);
assert(pipeResult.success, 'pipeline still succeeds');
assert(pipeResult.redundancy !== undefined, 'L1.3 still present');
assert(pipeResult.sourceHealth !== undefined, 'L1.4 still present');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 11: Missing input → pipeline with degradation
// ═══════════════════════════════════════════════════════════════════════════════
heading('11. Missing input → pipeline degradation propagation');
clearDegradationLedger();
clearReliabilityMemory();

const degradedPipe = runQuantumRiskPipeline({
  asset: 'BTC', totalSupply: 19_700_000,
  scriptDistribution: null,
  dormantCohorts: null,
  pqEvidence: null,
});

assert(degradedPipe.semanticDegradation !== undefined, 'degradation present');
assert(degradedPipe.semanticDegradation!.forceInsufficientData, 'forceInsufficientData = true');
assert(degradedPipe.semanticDegradation!.critical >= 2, `critical events = ${degradedPipe.semanticDegradation!.critical}`);
assert(degradedPipe.semanticDegradation!.userDisclosures.length >= 3, `disclosures = ${degradedPipe.semanticDegradation!.userDisclosures.length}`);
assert(degradedPipe.snapshot.judgment.state === 'insufficient_data', `judgment = ${degradedPipe.snapshot.judgment.state}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 12: Claim restrictions correctness
// ═══════════════════════════════════════════════════════════════════════════════
heading('12. Claim restrictions by severity');
clearDegradationLedger();

// Critical should have R1, R2, R3
const critEvent = evaluateFieldDegradation({
  fieldName: 'scriptDistribution', dataPresent: false,
});
assert(critEvent!.claimRestrictions.includes('R1_exactness'), 'critical → R1');
assert(critEvent!.claimRestrictions.includes('R2_currentness'), 'critical → R2');
assert(critEvent!.claimRestrictions.includes('R3_directional'), 'critical → R3');

// Advisory should have no restrictions
clearDegradationLedger();
const advEvent = evaluateFieldDegradation({
  fieldName: 'btcPriceContext',
  dataPresent: true,
  healthRecord: makeHealthRecord({
    fieldName: 'btcPriceContext',
    healthBand: 'weak',
    sourceUsabilityScore: 0.60,
  }),
  redundancyRecord: {
    fieldName: 'btcPriceContext', meaningClaim: 'test',
    substitutionClass: 'B', fallbackStatus: 'cached_secondary',
    confidencePenalty: 0.10, degradationState: 'partial', reason: 'secondary',
  },
});
// btcPriceContext partial has no claim restrictions per rules
if (advEvent) {
  assert(advEvent.claimRestrictions.length === 0, `partial btcPrice restrictions = ${advEvent.claimRestrictions.length}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 13: Calibration handling
// ═══════════════════════════════════════════════════════════════════════════════
heading('13. Calibration handling');
clearDegradationLedger();

const calExclude = evaluateFieldDegradation({
  fieldName: 'outcomeMetrics',
  dataPresent: true,
  healthRecord: makeHealthRecord({
    fieldName: 'outcomeMetrics',
    healthBand: 'weak',
    payloadValidityScore: 0.40,
  }),
});
assert(calExclude !== null, 'event for outcome metrics');
assert(calExclude!.calibrationHandling === 'exclude' || calExclude!.calibrationHandling === 'downweight',
  `calibration = ${calExclude!.calibrationHandling}`);
assert(calExclude!.claimRestrictions.includes('R5_evaluation'), 'R5 evaluation restriction');

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n════════════════════════════════════════');
console.log(`  L1.6 RESULTS: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
