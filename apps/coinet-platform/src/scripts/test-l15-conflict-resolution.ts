/**
 * L1.5 Integration Test Suite
 *
 * Tests all conflict resolution paths:
 *   1.  No conflict — single source, no secondary
 *   2.  Numeric agreement — low spread, reconciled
 *   3.  Numeric winner — moderate spread, authority-based winner
 *   4.  Numeric contradiction — large spread, preserved
 *   5.  Numeric critical — extreme spread, unresolved
 *   6.  Stage agreement — PQ evidence matches
 *   7.  Stage conflict — PQ evidence disagrees, contradiction preserved
 *   8.  Semantic mismatch — misaligned definitions, unresolved
 *   9.  Temporal winner — one source fresher, fresher wins
 *  10.  Health-driven winner — equal authority, healthier wins
 *  11.  Pipeline integration — dual sources feed through L1.4→L1.5→L1.3
 *  12.  Averaging forbidden on stage fields — never average PQ evidence
 */

import { resolveConflict, resolveAllConflicts, clearConflictState, getConflictLog, getContradictions } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/conflict-resolver';
import { runQuantumRiskPipeline } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/pipeline';
import type { ConflictCandidate } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/conflict-types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

function heading(label: string) { console.log(`\n━━━ TEST: ${label} ━━━`); }

// ═══════════════════════════════════════════════════════════════════════════════
// Test 1: No conflict — single source pipeline
// ═══════════════════════════════════════════════════════════════════════════════
heading('1. No conflict — no secondary sources');
clearConflictState();

const noConflictResult = runQuantumRiskPipeline({
  asset: 'BTC', totalSupply: 19_700_000,
  scriptDistribution: { p2pk: 1_700_000, p2pkh: 8_500_000, p2wpkh: 5_200_000, p2tr: 1_500_000, p2sh: 1_800_000, unknown: 1_000_000, total: 19_700_000 },
  dormantCohorts: { gt_5y: 3_900_000, gt_7y: 2_800_000, gt_10y: 1_700_000 },
  pqEvidence: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-15T00:00:00Z' },
});
assert(noConflictResult.conflicts === undefined, 'no conflict diagnostics when no secondary');
assert(noConflictResult.success, 'pipeline succeeds without conflict');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 2: Numeric agreement — low spread, reconciled
// ═══════════════════════════════════════════════════════════════════════════════
heading('2. Numeric agreement — low spread, reconciled');
clearConflictState();

const now = new Date().toISOString();
const r2 = resolveConflict('scriptDistribution', {
  sourceId: 'chain_index', data: { p2pk: 1700000, p2pkh: 8500000, p2wpkh: 5200000, p2tr: 1500000, p2sh: 1800000, unknown: 1000000, total: 19700000 },
  observedAt: now, authorityLevel: 0.95, healthScore: 0.90, trustClass: 'verified_chain_data',
}, {
  sourceId: 'analytics_provider', data: { p2pk: 1695000, p2pkh: 8510000, p2wpkh: 5195000, p2tr: 1505000, p2sh: 1795000, unknown: 1000000, total: 19700000 },
  observedAt: now, authorityLevel: 0.80, healthScore: 0.85, trustClass: 'trusted_external_analytics',
});

assert(r2.action === 'reconciled', `action = ${r2.action}`);
assert(r2.severity === 'low', `severity = ${r2.severity}`);
assert(r2.confidencePenalty <= 0.05, `penalty = ${r2.confidencePenalty}`);
assert(!r2.contradictionPreserved, 'no contradiction preserved');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 3: Numeric winner — moderate spread, authority-based
// ═══════════════════════════════════════════════════════════════════════════════
heading('3. Numeric winner — moderate spread exceeds tolerance');
clearConflictState();

const r3 = resolveConflict('dormantCohorts', {
  sourceId: 'chain_index', data: { gt_5y: 3_900_000, gt_7y: 2_800_000, gt_10y: 1_700_000 },
  observedAt: now, authorityLevel: 0.95, healthScore: 0.90, trustClass: 'verified_chain_data',
}, {
  sourceId: 'secondary_provider', data: { gt_5y: 3_400_000, gt_7y: 2_400_000, gt_10y: 1_450_000 },
  observedAt: now, authorityLevel: 0.75, healthScore: 0.85, trustClass: 'trusted_external_analytics',
});

assert(r3.action === 'degraded_resolution' || r3.action === 'preserved_contradiction',
  `action = ${r3.action}`);
assert(r3.confidencePenalty > 0.05, `penalty = ${r3.confidencePenalty}`);
assert(r3.reasonSummary.length > 0, 'has reasons');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 4: Numeric contradiction — large spread preserved
// ═══════════════════════════════════════════════════════════════════════════════
heading('4. Numeric contradiction — large spread');
clearConflictState();

const r4 = resolveConflict('dormantCohorts', {
  sourceId: 'chain_index', data: { gt_5y: 3_900_000, gt_7y: 2_800_000, gt_10y: 1_700_000 },
  observedAt: now, authorityLevel: 0.95, healthScore: 0.90, trustClass: 'verified_chain_data',
}, {
  sourceId: 'alternative', data: { gt_5y: 2_500_000, gt_7y: 1_800_000, gt_10y: 1_100_000 },
  observedAt: now, authorityLevel: 0.80, healthScore: 0.85, trustClass: 'trusted_external_analytics',
});

assert(r4.action === 'preserved_contradiction' || r4.action === 'unresolved',
  `action = ${r4.action}`);
assert(r4.confidencePenalty >= 0.15, `penalty = ${r4.confidencePenalty}`);

if (r4.contradictionPreserved) {
  const contras = getContradictions();
  assert(contras.length > 0, `contradictions stored: ${contras.length}`);
  assert(contras[0].fieldName === 'dormantCohorts', 'contradiction is for dormantCohorts');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 5: Numeric critical — extreme spread, unresolved
// ═══════════════════════════════════════════════════════════════════════════════
heading('5. Numeric critical — extreme spread');
clearConflictState();

const r5 = resolveConflict('totalSupply', {
  sourceId: 'chain_index', data: 19_700_000,
  observedAt: now, authorityLevel: 0.95, healthScore: 0.90, trustClass: 'verified_chain_data',
  semanticDefinition: 'emitted_supply',
}, {
  sourceId: 'alternative', data: 15_000_000,
  observedAt: now, authorityLevel: 0.80, healthScore: 0.85, trustClass: 'trusted_external_analytics',
  semanticDefinition: 'emitted_supply',
});

assert(r5.severity === 'critical' || r5.severity === 'high', `severity = ${r5.severity}`);
assert(r5.confidencePenalty >= 0.20, `penalty = ${r5.confidencePenalty}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 6: Stage agreement — PQ evidence matches
// ═══════════════════════════════════════════════════════════════════════════════
heading('6. Stage agreement — PQ evidence matches');
clearConflictState();

const r6 = resolveConflict('pqEvidence', {
  sourceId: 'protocol_docs', data: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-15' },
  observedAt: now, authorityLevel: 0.95, healthScore: 0.90, trustClass: 'official_protocol_evidence',
}, {
  sourceId: 'research_report', data: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-10' },
  observedAt: now, authorityLevel: 0.80, healthScore: 0.85, trustClass: 'trusted_external_analytics',
});

assert(r6.action === 'winner_a' || r6.action === 'winner_b', `action = ${r6.action}`);
assert(r6.confidencePenalty === 0, `penalty = ${r6.confidencePenalty}`);
assert(!r6.contradictionPreserved, 'no contradiction when stages agree');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 7: Stage conflict — PQ evidence disagrees
// ═══════════════════════════════════════════════════════════════════════════════
heading('7. Stage conflict — PQ evidence disagrees');
clearConflictState();

const r7 = resolveConflict('pqEvidence', {
  sourceId: 'protocol_docs', data: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-15' },
  observedAt: now, authorityLevel: 0.95, healthScore: 0.90, trustClass: 'official_protocol_evidence',
}, {
  sourceId: 'research_report', data: { hasProposal: true, hasImplementation: true, hasDeployment: false, lastUpdate: '2024-06-10' },
  observedAt: now, authorityLevel: 0.80, healthScore: 0.85, trustClass: 'trusted_external_analytics',
});

assert(r7.action === 'preserved_contradiction' || r7.action === 'degraded_resolution',
  `action = ${r7.action}`);
assert(r7.confidencePenalty >= 0.10, `penalty = ${r7.confidencePenalty}`);
assert(r7.conflictType === 'structural', `conflict type = ${r7.conflictType}`);

// Verify contradiction is preserved for material PQ disagreement
if (r7.contradictionPreserved) {
  const contras = getContradictions();
  assert(contras.some(c => c.fieldName === 'pqEvidence'), 'PQ contradiction stored');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 8: Semantic mismatch — misaligned definitions → unresolved
// ═══════════════════════════════════════════════════════════════════════════════
heading('8. Semantic mismatch → unresolved');
clearConflictState();

const r8 = resolveConflict('totalSupply', {
  sourceId: 'chain_index', data: 19_700_000,
  observedAt: now, authorityLevel: 0.95, healthScore: 0.90, trustClass: 'verified_chain_data',
  semanticDefinition: 'emitted_supply',
}, {
  sourceId: 'market_api', data: 19_500_000,
  observedAt: now, authorityLevel: 0.80, healthScore: 0.85, trustClass: 'trusted_external_analytics',
  semanticDefinition: 'circulating_supply',
});

assert(r8.action === 'unresolved', `action = ${r8.action}`);
assert(r8.semanticComparability === 'misaligned', `semantics = ${r8.semanticComparability}`);
assert(r8.severity === 'critical', `severity = ${r8.severity}`);
assert(r8.confidencePenalty >= 0.25, `penalty = ${r8.confidencePenalty}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 9: Temporal winner — fresher source wins
// ═══════════════════════════════════════════════════════════════════════════════
heading('9. Temporal winner — fresher source wins');
clearConflictState();

const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const r9 = resolveConflict('scriptDistribution', {
  sourceId: 'chain_index_old', data: { p2pk: 1700000, p2pkh: 8500000, p2wpkh: 5200000, p2tr: 1500000, p2sh: 1800000, unknown: 1000000, total: 19700000 },
  observedAt: twoHoursAgo, authorityLevel: 0.90, healthScore: 0.85, trustClass: 'verified_chain_data',
}, {
  sourceId: 'chain_index_new', data: { p2pk: 1690000, p2pkh: 8520000, p2wpkh: 5190000, p2tr: 1510000, p2sh: 1790000, unknown: 1000000, total: 19700000 },
  observedAt: now, authorityLevel: 0.90, healthScore: 0.90, trustClass: 'verified_chain_data',
});

assert(r9.freshnessComparison === 'b_fresher', `freshness = ${r9.freshnessComparison}`);
assert(r9.action === 'reconciled' || r9.action === 'winner_b',
  `action favors fresher: ${r9.action}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 10: Health-driven winner — equal authority, healthier wins
// ═══════════════════════════════════════════════════════════════════════════════
heading('10. Health-driven winner — healthier wins');
clearConflictState();

const r10 = resolveConflict('dormantCohorts', {
  sourceId: 'source_weak', data: { gt_5y: 3_900_000, gt_7y: 2_800_000, gt_10y: 1_700_000 },
  observedAt: now, authorityLevel: 0.85, healthScore: 0.55, trustClass: 'verified_chain_data',
}, {
  sourceId: 'source_strong', data: { gt_5y: 3_700_000, gt_7y: 2_700_000, gt_10y: 1_650_000 },
  observedAt: now, authorityLevel: 0.85, healthScore: 0.92, trustClass: 'verified_chain_data',
});

assert(r10.healthComparison === 'b_healthier', `health = ${r10.healthComparison}`);
// With ~5% spread on dormantCohorts (tolerance 8%), should reconcile or pick winner
assert(r10.action !== 'unresolved', `resolved (not unresolved): ${r10.action}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Test 11: Pipeline integration — dual sources flow through L1.4→L1.5→L1.3
// ═══════════════════════════════════════════════════════════════════════════════
heading('11. Pipeline integration — full dual-source run');
clearConflictState();

const pipeResult = runQuantumRiskPipeline({
  asset: 'BTC', totalSupply: 19_700_000,
  scriptDistribution: { p2pk: 1_700_000, p2pkh: 8_500_000, p2wpkh: 5_200_000, p2tr: 1_500_000, p2sh: 1_800_000, unknown: 1_000_000, total: 19_700_000 },
  dormantCohorts: { gt_5y: 3_900_000, gt_7y: 2_800_000, gt_10y: 1_700_000 },
  pqEvidence: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-15T00:00:00Z' },
  secondary: {
    scriptDistribution: {
      sourceId: 'ext_analytics',
      data: { p2pk: 1_680_000, p2pkh: 8_550_000, p2wpkh: 5_180_000, p2tr: 1_520_000, p2sh: 1_790_000, unknown: 980_000, total: 19_700_000 },
      observedAt: now,
    },
    dormantCohorts: {
      sourceId: 'ext_dormancy',
      data: { gt_5y: 3_850_000, gt_7y: 2_780_000, gt_10y: 1_690_000 },
      observedAt: now,
    },
  },
});

assert(pipeResult.success, 'pipeline succeeds with dual sources');
assert(pipeResult.conflicts !== undefined, 'conflict diagnostics present');
assert(pipeResult.conflicts!.totalConflicts >= 2, `conflicts detected: ${pipeResult.conflicts!.totalConflicts}`);
assert(pipeResult.conflicts!.reconciled >= 1, `reconciled: ${pipeResult.conflicts!.reconciled}`);
assert(pipeResult.sourceHealth !== undefined, 'L1.4 health still present');
assert(pipeResult.redundancy !== undefined, 'L1.3 redundancy still present');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 12: Averaging forbidden on stage fields
// ═══════════════════════════════════════════════════════════════════════════════
heading('12. Averaging forbidden on stage fields');
clearConflictState();

const r12 = resolveConflict('pqEvidence', {
  sourceId: 'source_a', data: { hasProposal: true, hasImplementation: true, hasDeployment: false, lastUpdate: '2024-06-15' },
  observedAt: now, authorityLevel: 0.80, healthScore: 0.85, trustClass: 'official_protocol_evidence',
}, {
  sourceId: 'source_b', data: { hasProposal: true, hasImplementation: false, hasDeployment: false, lastUpdate: '2024-06-10' },
  observedAt: now, authorityLevel: 0.80, healthScore: 0.85, trustClass: 'official_protocol_evidence',
});

assert(r12.action !== 'reconciled', `stage fields never reconciled: ${r12.action}`);
assert(r12.conflictType === 'structural', `conflict type = ${r12.conflictType}`);

// The source claiming implementation (higher stage) should have relevance but
// since equal authority, stricter defensible (lower stage) consideration applies
assert(r12.confidencePenalty > 0, `penalty present: ${r12.confidencePenalty}`);

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n════════════════════════════════════════');
console.log(`  L1.5 RESULTS: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
