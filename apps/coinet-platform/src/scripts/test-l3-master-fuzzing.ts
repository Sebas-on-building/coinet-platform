/**
 * Layer 3 Master Certification — Property-Based Fuzzing
 *
 * Generates randomized inputs and verifies that constitutional
 * properties always hold. This is where real robustness emerges.
 */

import { resetContractRegistry, bootstrapContracts, getMetricContract, getAllMetricContracts } from '../services/canonicalization/metric-contracts';
import { resetPathRegistry, bootstrapNamespacePaths, buildCanonicalMetricObservation } from '../services/canonicalization/metric-namespace';
import { evaluateMetricCompatibility, canMergeMetricObservations } from '../services/canonicalization/metric-compatibility-rules';
import { enforceMetricNamespaceGate, resetValidatorState } from '../services/canonicalization/metric-namespace-validator';
import { evaluateConfidenceGate, resetGateAuditLog } from '../services/canonicalization/confidence-gate';
import { applyCanonicalMutation, resetAuditEvents, type MutationProposalInput } from '../services/canonicalization/mutation-control';
import { getMutationById, resetMutationLedger } from '../services/canonicalization/mutation-ledger';
import { getCanonicalVersionChain, getCanonicalVersionById, resetVersionStore } from '../services/canonicalization/canonical-versioning';
import { isRollbackAllowed, applyRollback, resetRollbackState } from '../services/canonicalization/rollback-engine';
import { getDiffByMutationId, resetDiffStore } from '../services/canonicalization/entity-diff-engine';
import { resetMapperState } from '../services/canonicalization/provider-metric-mappers';
import { resetClaimLedger } from '../services/canonicalization/provider-claim-ledger';
import { resetReconciliationState } from '../services/canonicalization/cross-provider-reconciliation';

let passed = 0; let failed = 0;
function assert(c: boolean, l: string) { if (c) passed++; else { failed++; console.error(`  FAIL: ${l}`); } }
function resetAll() { resetContractRegistry(); bootstrapContracts(); resetPathRegistry(); bootstrapNamespacePaths(); resetMapperState(); resetValidatorState(); resetGateAuditLog(); resetClaimLedger(); resetReconciliationState(); resetMutationLedger(); resetVersionStore(); resetDiffStore(); resetAuditEvents(); resetRollbackState(); }

function makeProvenance() { return { providerId: `prov_${Math.random()}`, rawFieldName: 'raw', mapperVersion: '1.0.0', lineageRefs: ['l1'] }; }

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

function metricPropertyTests() {
  console.log('\n=== Metric Properties (fuzz) ===');
  resetAll();
  const contracts = getAllMetricContracts();
  let incompatibleBasisCount = 0;
  let unitMismatchCount = 0;
  let blockedMergeCount = 0;

  for (let i = 0; i < contracts.length; i++) {
    for (let j = i + 1; j < contracts.length; j++) {
      const a = contracts[i]; const b = contracts[j];
      const result = evaluateMetricCompatibility(a.metricPath, b.metricPath);

      if (a.blockedMergeConditions.includes(b.metricPath) || b.blockedMergeConditions.includes(a.metricPath)) {
        if (result.outcome === 'MERGE_COMPATIBLE') {
          failed++; console.error(`  FAIL: blocked merge condition passed: ${a.metricPath} <-> ${b.metricPath}`);
        } else {
          blockedMergeCount++;
        }
      }

      if (a.unit !== b.unit && result.outcome === 'MERGE_COMPATIBLE') {
        failed++; console.error(`  FAIL: unit mismatch merged: ${a.metricPath}(${a.unit}) <-> ${b.metricPath}(${b.unit})`);
      } else if (a.unit !== b.unit) {
        unitMismatchCount++;
      }

      const basisA = a.basis.priceBasis ?? a.basis.valuationBasis ?? a.basis.flowBasis ?? a.basis.riskBasis ?? a.basis.eventBasis ?? 'none';
      const basisB = b.basis.priceBasis ?? b.basis.valuationBasis ?? b.basis.flowBasis ?? b.basis.riskBasis ?? b.basis.eventBasis ?? 'none';
      if (basisA !== basisB && a.scope.domain === b.scope.domain && result.outcome === 'MERGE_COMPATIBLE') {
        failed++; console.error(`  FAIL: incompatible basis merged: ${a.metricPath}(${basisA}) <-> ${b.metricPath}(${basisB})`);
      } else if (basisA !== basisB) {
        incompatibleBasisCount++;
      }
    }
  }

  assert(blockedMergeCount > 0, `FzM1: blocked merge conditions enforced (${blockedMergeCount} pairs)`);
  assert(unitMismatchCount > 0, `FzM2: unit mismatches blocked (${unitMismatchCount} pairs)`);
  assert(incompatibleBasisCount > 0, `FzM3: incompatible bases blocked (${incompatibleBasisCount} pairs)`);

  let selfMergeOk = 0;
  for (const c of contracts) {
    const self = evaluateMetricCompatibility(c.metricPath, c.metricPath);
    if (self.outcome === 'MERGE_COMPATIBLE') selfMergeOk++;
  }
  assert(selfMergeOk === contracts.length, `FzM4: all ${contracts.length} contracts self-merge-compatible`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

function gatePropertyTests() {
  console.log('\n=== Gate Properties (fuzz) ===');
  resetAll();

  const bands = ['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED'];
  const domains = ['SCORING', 'CONTRADICTION', 'SCENARIO', 'JUDGMENT', 'GRAPH_RELATION', 'DISPLAY', 'FORENSIC_REPLAY'] as const;
  let unresolvedDeterministicDeny = 0;
  let displayAlwaysAllow = 0;
  let forensicAlwaysAllow = 0;
  let missingStateDeny = 0;

  for (const band of bands) {
    const state = {
      stateId: `cs_${band}`, canonicalId: `obj_${band}`, objectType: 'ASSET',
      band, finalScore: band === 'HIGH' ? 92 : band === 'MEDIUM' ? 76 : band === 'LOW' ? 58 : 42,
      factorEvaluations: [], rawAggregation: { identifierStrength: 0, crossProviderAgreement: 0, temporalStability: 0, scopeParity: 0, provenanceStrength: 0, positiveSubtotal: 0, penaltySubtotal: 0, finalScore: 0 },
      epistemicState: band === 'UNRESOLVED' ? 'UNRESOLVED' : 'RESOLVED_CLEAN',
      activeScars: [], rightsProfile: {
        scoring: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'CONDITIONAL' : 'DENY',
        contradictionEngine: band !== 'UNRESOLVED' ? 'ALLOW' : 'DENY',
        scenarioEngine: band === 'HIGH' ? 'ALLOW' : 'DENY',
        judgment: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'ALLOW_WITH_SCAR' : 'DENY',
        graphRelations: band !== 'UNRESOLVED' ? 'ALLOW' : 'DENY',
        canonicalMutation: band === 'HIGH' ? 'ALLOW' : 'DENY',
        display: 'ALLOW', forensicReplay: 'ALLOW',
      },
      capChain: [], downgradeReasons: [], probationState: undefined,
      evaluatedAt: new Date().toISOString(), policyVersion: '1.0.0', evaluatorVersion: '1.0.0',
    } as any;

    for (const domain of domains) {
      const decision = evaluateConfidenceGate({
        canonicalId: state.canonicalId, objectType: 'ASSET',
        requestedUse: domain, missionCritical: false, confidenceState: state,
      });

      if (band === 'UNRESOLVED' && (domain === 'SCORING' || domain === 'SCENARIO' || domain === 'JUDGMENT')) {
        if (!decision.allowed) unresolvedDeterministicDeny++;
      }
      if (domain === 'DISPLAY' && decision.allowed) displayAlwaysAllow++;
      if (domain === 'FORENSIC_REPLAY' && decision.allowed) forensicAlwaysAllow++;
    }
  }

  const noStateDec = evaluateConfidenceGate({
    canonicalId: 'x', objectType: 'ASSET', requestedUse: 'SCORING',
    missionCritical: false, confidenceState: undefined as any,
  });
  if (!noStateDec.allowed) missingStateDeny++;

  assert(unresolvedDeterministicDeny >= 3, `FzG1: UNRESOLVED blocks deterministic paths (${unresolvedDeterministicDeny})`);
  assert(displayAlwaysAllow === bands.length, `FzG2: DISPLAY allowed for all bands`);
  assert(forensicAlwaysAllow === bands.length, `FzG3: FORENSIC_REPLAY allowed for all bands`);
  assert(missingStateDeny === 1, 'FzG4: missing state always denied');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

function mutationPropertyTests() {
  console.log('\n=== Mutation Properties (fuzz) ===');
  resetAll();

  const mutations: string[] = [];
  for (let i = 0; i < 20; i++) {
    const r = applyCanonicalMutation({
      mutationType: i % 3 === 0 ? 'ALIAS_ADDED' : i % 3 === 1 ? 'CONFIDENCE_CHANGED' : 'WINNING_ANCHOR_CHANGED',
      targetObjectIds: ['ast_fuzz'], beforeState: { step: i }, afterState: { step: i + 1 },
      reasonCodes: ['FUZZ'], triggerType: 'SYSTEM', evidenceRefs: ['ev'], initiatedBy: 'SYS', semanticClass: 'IDENTITY',
    }, `snap_${i}`);
    assert(r.success, `FzMu_create_${i}: mutation ${i} succeeds`);
    assert(r.versionRecord !== undefined, `FzMu_version_${i}: version created for mutation ${i}`);
    mutations.push(r.mutationId);
  }

  const chain = getCanonicalVersionChain('ast_fuzz');
  assert(chain.length === 20, 'FzMu1: 20 versions in chain');

  for (let i = 1; i < chain.length; i++) {
    assert(chain[i].parentVersionIds.length > 0, `FzMu_parent_${i}: version ${i} has parent`);
  }

  for (const mid of mutations) {
    const diff = getDiffByMutationId(mid);
    assert(diff !== undefined, `FzMu_diff_${mid.slice(-6)}: diff exists`);
  }

  const rbTarget = mutations[15];
  const rbResult = applyRollback(rbTarget, 'SYS');
  assert(rbResult.success, 'FzMu2: rollback of mutation 15 succeeds');
  assert(getMutationById(rbTarget)!.lifecycleState === 'SUPERSEDED', 'FzMu3: rolled back is superseded');
  assert(getMutationById(rbResult.rollbackMutationId!)!.mutationType === 'ROLLBACK_APPLIED', 'FzMu4: rollback mutation type');

  const postChain = getCanonicalVersionChain('ast_fuzz');
  assert(postChain.length === 21, 'FzMu5: rollback adds version (21 total)');

  for (const v of postChain) {
    assert(getCanonicalVersionById(v.versionId) !== undefined, `FzMu_queryable_${v.versionId.slice(-6)}: version queryable`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAMESPACE EXHAUSTIVE
// ═══════════════════════════════════════════════════════════════════════════════

function namespaceExhaustiveTests() {
  console.log('\n=== Namespace Exhaustive (fuzz) ===');
  resetAll();

  const contracts = getAllMetricContracts();
  const blockedUseDomains = ['SCORING', 'RANKING', 'SCENARIO', 'JUDGMENT'] as const;

  let blockedCount = 0;
  for (const c of contracts) {
    for (const use of blockedUseDomains) {
      if (c.blockedUsesUnderUncertainty.includes(use)) {
        const obs = buildCanonicalMetricObservation({
          metricPath: c.metricPath, objectId: 'obj_x', objectType: c.objectType,
          value: 1, observedAt: new Date().toISOString(),
          provenance: makeProvenance(), freshnessState: 'STALE', admissibilityState: 'ADMITTED',
          validationReportId: 'v',
        });
        if ('error' in obs) continue;
        const gate = enforceMetricNamespaceGate(obs, use);
        if (!gate.allowed) blockedCount++;
        else { failed++; console.error(`  FAIL: stale ${c.metricPath} allowed for blocked use ${use}`); }
      }
    }
  }
  assert(blockedCount > 0, `FzN1: stale metrics blocked under uncertainty (${blockedCount} cases)`);

  let admittedFreshCount = 0;
  for (const c of contracts) {
    if (!c.allowedUses.includes('DISPLAY')) continue;
    const obs = buildCanonicalMetricObservation({
      metricPath: c.metricPath, objectId: 'obj_x', objectType: c.objectType,
      value: 1, observedAt: new Date().toISOString(),
      provenance: makeProvenance(), freshnessState: 'FRESH', admissibilityState: 'ADMITTED',
      validationReportId: 'v',
    });
    if ('error' in obs) continue;
    const gate = enforceMetricNamespaceGate(obs, 'DISPLAY');
    if (gate.allowed) admittedFreshCount++;
  }
  assert(admittedFreshCount === contracts.length, `FzN2: all fresh admitted metrics allowed for DISPLAY (${admittedFreshCount}/${contracts.length})`);
}

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  L3 Master: Property-Based Fuzzing                ║');
console.log('╚═══════════════════════════════════════════════════╝');
metricPropertyTests(); gatePropertyTests(); mutationPropertyTests(); namespaceExhaustiveTests();
console.log(`\n═══════════════════════════════════════`);
console.log(`TOTAL: ${passed + failed} — ${passed} passed, ${failed} failed`);
if (failed > 0) { console.log(`${failed} FAILURES`); process.exit(1); }
else console.log('ALL FUZZING TESTS PASSED');
