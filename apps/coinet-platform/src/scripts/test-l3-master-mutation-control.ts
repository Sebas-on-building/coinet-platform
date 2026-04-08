/**
 * Layer 3 Master Certification — Mutation Control Band
 *
 * L3.6 lifecycle, diff accuracy, rollback safety, historical
 * reconstruction, supersession chains, replay compatibility.
 */

import { resetMutationLedger, getMutationById, getMutationsForObject, getMutationsAtReplayTime, isMutationTransitionLegal, getAllMutationRecords } from '../services/canonicalization/mutation-ledger';
import { resetVersionStore, getCanonicalVersionChain, getCurrentCanonicalVersion, reconstructCanonicalStateAtVersion, createCanonicalVersion, getCanonicalVersionById } from '../services/canonicalization/canonical-versioning';
import { resetDiffStore, getDiffByMutationId, getDiffById, diffCanonicalObject, diffConfidenceState, diffMetricContract, classifyMutationSeverity } from '../services/canonicalization/entity-diff-engine';
import { proposeMutation, validateMutation, stageMutation, commitMutation, applyCanonicalMutation, supersedeMutation, getMutationAuditEvents, getMutationAuditEventsForMutation, resetAuditEvents, type MutationProposalInput } from '../services/canonicalization/mutation-control';
import { isRollbackAllowed, applyRollback, getRollbackChain, buildRollbackPlan, resetRollbackState } from '../services/canonicalization/rollback-engine';

let passed = 0; let failed = 0;
function assert(c: boolean, l: string) { if (c) passed++; else { failed++; console.error(`  FAIL: ${l}`); } }
function resetAll() { resetMutationLedger(); resetVersionStore(); resetDiffStore(); resetAuditEvents(); resetRollbackState(); }
function makeProposal(ov: Partial<MutationProposalInput> = {}): MutationProposalInput {
  return { mutationType: 'ENTITY_CREATED', targetObjectIds: ['ast_mc'], beforeState: {}, afterState: { id: 'ast_mc' }, reasonCodes: ['TEST'], triggerType: 'SYSTEM', evidenceRefs: ['ev1'], initiatedBy: 'SYSTEM', semanticClass: 'IDENTITY', ...ov };
}

function lifecycleTests() {
  console.log('\n=== Lifecycle Integrity ===');
  resetAll();

  const r = applyCanonicalMutation(makeProposal(), 'snap1');
  assert(r.success, 'LC1: create succeeds');
  const rec = getMutationById(r.mutationId)!;
  assert(rec.lifecycleState === 'REVERSIBLE', 'LC2: ends in REVERSIBLE');

  const r2 = applyCanonicalMutation(makeProposal({ mutationType: 'ALIAS_ADDED', beforeState: { a: 1 }, afterState: { a: 1, b: 2 }, semanticClass: 'ALIAS' }), 'snap2');
  assert(r2.success, 'LC3: alias add succeeds');

  supersedeMutation(r.mutationId, r2.mutationId);
  assert(getMutationById(r.mutationId)!.lifecycleState === 'SUPERSEDED', 'LC4: superseded');

  const p = proposeMutation(makeProposal());
  assert(getMutationById(p.mutationId)!.lifecycleState === 'PROPOSED', 'LC5: starts PROPOSED');
  const v = validateMutation(p.mutationId);
  assert(v.outcome === 'VALID', 'LC6: validates');
  assert(getMutationById(p.mutationId)!.lifecycleState === 'VALIDATED', 'LC7: now VALIDATED');
  stageMutation(p.mutationId);
  assert(getMutationById(p.mutationId)!.lifecycleState === 'STAGED', 'LC8: now STAGED');
  commitMutation(p.mutationId, 'SYS', 'snap');
  assert(getMutationById(p.mutationId)!.lifecycleState === 'REVERSIBLE' || getMutationById(p.mutationId)!.lifecycleState === 'COMMITTED', 'LC9: now COMMITTED/REVERSIBLE');

  assert(!isMutationTransitionLegal('PROPOSED', 'COMMITTED'), 'LC10: skip to COMMITTED illegal');
  assert(!isMutationTransitionLegal('SUPERSEDED', 'COMMITTED'), 'LC11: SUPERSEDED->COMMITTED illegal');
  assert(!isMutationTransitionLegal('COMMITTED', 'PROPOSED'), 'LC12: backward illegal');
  assert(!isMutationTransitionLegal('REVERSIBLE', 'VALIDATED'), 'LC13: backward illegal');
  assert(isMutationTransitionLegal('PROPOSED', 'SUPERSEDED'), 'LC14: early supersession legal');
}

function diffAccuracyTests() {
  console.log('\n=== Diff Accuracy ===');
  resetAll();

  const d1 = diffCanonicalObject('m1', 'obj1', { name: 'A', aliases: ['x'] }, { name: 'B', aliases: ['x', 'y'] });
  assert(d1.changedFields.some(f => f.field === 'name'), 'DA1: name change detected');
  assert(d1.addedElements.some(e => e.includes('y')), 'DA2: alias addition detected');

  const d2 = diffCanonicalObject('m2', 'obj2', { lifecycleState: 'ACTIVE' }, { lifecycleState: 'SPLIT' });
  assert(d2.semanticClass === 'STRUCTURAL', 'DA3: split is STRUCTURAL');
  assert(d2.severity === 'CRITICAL', 'DA4: split is CRITICAL');

  const d3 = diffCanonicalObject('m3', 'obj3', { lifecycleState: 'ACTIVE' }, { lifecycleState: 'DEPRECATED' });
  assert(d3.semanticClass === 'DEPRECATION', 'DA5: deprecation class correct');

  const d4 = diffConfidenceState('m4', 'obj4', { band: 'HIGH', score: 92 }, { band: 'MEDIUM', score: 75 });
  assert(d4.semanticClass === 'CONFIDENCE', 'DA6: confidence class correct');
  assert(d4.severity === 'HIGH', 'DA7: band change is HIGH severity');

  const d5 = diffMetricContract('m5', 'mc1', { unit: 'USD' }, { unit: 'USD', blockedUses: ['SCORING'] });
  assert(d5.semanticClass === 'METRIC_CONTRACT', 'DA8: contract class correct');
  assert(d5.replayBreaking === true, 'DA9: contract change is replay-breaking');

  const d6 = diffCanonicalObject('m6', 'obj5', { a: 1 }, { a: 1 });
  assert(d6.changedFields.length === 0, 'DA10: no-op has no changes');

  const d7 = diffCanonicalObject('m7', 'obj6', { a: 1, b: 2 }, { a: 1 });
  assert(d7.removedFields.includes('b'), 'DA11: removed field detected');

  assert(classifyMutationSeverity('STRUCTURAL', [], [], []) === 'CRITICAL', 'DA12: structural always critical');
  assert(classifyMutationSeverity('NO_OP', [], [], []) === 'LOW', 'DA13: no-op always low');
}

function rollbackSafetyTests() {
  console.log('\n=== Rollback Safety ===');
  resetAll();

  const r1 = applyCanonicalMutation(makeProposal(), 'snap1');
  const r2 = applyCanonicalMutation(makeProposal({ mutationType: 'ALIAS_ADDED', beforeState: {}, afterState: { alias: 'X' }, semanticClass: 'ALIAS' }), 'snap2');

  const rb = applyRollback(r2.mutationId, 'SYS');
  assert(rb.success, 'RB1: rollback succeeds');
  assert(getMutationById(r2.mutationId)!.lifecycleState === 'SUPERSEDED', 'RB2: original superseded');
  assert(getMutationById(rb.rollbackMutationId!)!.mutationType === 'ROLLBACK_APPLIED', 'RB3: rollback type correct');
  assert(getMutationById(r2.mutationId)!.rolledBackByMutationId === rb.rollbackMutationId, 'RB4: forward link');
  assert(getMutationById(rb.rollbackMutationId!)!.rollbackOfMutationId === r2.mutationId, 'RB5: reverse link');

  const chain = getRollbackChain(r2.mutationId);
  assert(chain.length === 1, 'RB6: chain length');

  const doubleRb = isRollbackAllowed(r2.mutationId);
  assert(!doubleRb.allowed, 'RB7: no double rollback');

  const notCommitted = proposeMutation(makeProposal());
  assert(!isRollbackAllowed(notCommitted.mutationId).allowed, 'RB8: proposed not rollback-eligible');

  const terminal = applyCanonicalMutation(makeProposal({
    mutationType: 'METRIC_CONTRACT_DEPRECATED', targetObjectIds: [], targetContractIds: ['x'],
    reasonCodes: ['DEP'], evidenceRefs: [],
  }), 'snap_dep');
  assert(!isRollbackAllowed(terminal.mutationId).allowed, 'RB9: terminal not rollback-eligible');

  const plan = buildRollbackPlan('nonexistent');
  assert(!plan.rollbackSafe, 'RB10: nonexistent plan not safe');
}

function historicalReconstructionTests() {
  console.log('\n=== Historical Reconstruction ===');
  resetAll();

  const r1 = applyCanonicalMutation(makeProposal({ targetObjectIds: ['ast_hist'] }), 'snap_h1');
  const r2 = applyCanonicalMutation(makeProposal({ mutationType: 'ALIAS_ADDED', targetObjectIds: ['ast_hist'], beforeState: {}, afterState: { alias: 'X' }, semanticClass: 'ALIAS' }), 'snap_h2');
  const r3 = applyCanonicalMutation(makeProposal({ mutationType: 'ENTITY_SPLIT', targetObjectIds: ['ast_hist'], beforeState: { state: 'ACTIVE' }, afterState: { state: 'SPLIT' }, semanticClass: 'STRUCTURAL' }), 'snap_h3');

  const chain = getCanonicalVersionChain('ast_hist');
  assert(chain.length === 3, 'HR1: 3 versions');

  const v1 = chain[0]; const v2 = chain[1]; const v3 = chain[2];
  assert(reconstructCanonicalStateAtVersion('ast_hist', v1.versionId)?.stateSnapshotRef === 'snap_h1', 'HR2: v1 reconstructable');
  assert(reconstructCanonicalStateAtVersion('ast_hist', v2.versionId)?.stateSnapshotRef === 'snap_h2', 'HR3: v2 reconstructable');
  assert(reconstructCanonicalStateAtVersion('ast_hist', v3.versionId)?.stateSnapshotRef === 'snap_h3', 'HR4: v3 reconstructable');

  assert(v2.parentVersionIds.includes(v1.versionId), 'HR5: v2 parent is v1');
  assert(v3.parentVersionIds.includes(v2.versionId), 'HR6: v3 parent is v2');
  assert(v1.childVersionIds.includes(v2.versionId), 'HR7: v1 child is v2');

  const rollback = applyRollback(r3.mutationId, 'SYS');
  assert(rollback.success, 'HR8: rollback split');
  const postChain = getCanonicalVersionChain('ast_hist');
  assert(postChain.length >= 4, 'HR9: rollback adds version');

  const allMuts = getMutationsForObject('ast_hist');
  assert(allMuts.length >= 4, 'HR10: all mutations preserved');
  assert(allMuts.some(m => m.mutationType === 'ROLLBACK_APPLIED'), 'HR11: rollback mutation in history');
  assert(allMuts.some(m => m.lifecycleState === 'SUPERSEDED'), 'HR12: superseded in history');

  const replayMuts = getMutationsAtReplayTime('ast_hist', new Date().toISOString());
  assert(replayMuts.length >= 3, 'HR13: replay retrieves committed history');

  const auditEvents = getMutationAuditEvents();
  assert(auditEvents.length > 10, 'HR14: rich audit trail');
}

function supersessionChainTests() {
  console.log('\n=== Supersession Chains ===');
  resetAll();

  const r1 = applyCanonicalMutation(makeProposal({ targetObjectIds: ['ast_sc'] }), 's1');
  const r2 = applyCanonicalMutation(makeProposal({ targetObjectIds: ['ast_sc'], mutationType: 'ALIAS_ADDED', semanticClass: 'ALIAS', beforeState: {}, afterState: { a: 1 } }), 's2');
  const r3 = applyCanonicalMutation(makeProposal({ targetObjectIds: ['ast_sc'], mutationType: 'CONFIDENCE_CHANGED', semanticClass: 'CONFIDENCE', beforeState: { band: 'MEDIUM' }, afterState: { band: 'HIGH' } }), 's3');

  supersedeMutation(r1.mutationId, r2.mutationId);
  supersedeMutation(r2.mutationId, r3.mutationId);

  assert(getMutationById(r1.mutationId)!.lifecycleState === 'SUPERSEDED', 'SC1: r1 superseded');
  assert(getMutationById(r2.mutationId)!.lifecycleState === 'SUPERSEDED', 'SC2: r2 superseded');
  assert(getMutationById(r1.mutationId)!.supersededByMutationIds.includes(r2.mutationId), 'SC3: r1->r2 link');
  assert(getMutationById(r2.mutationId)!.supersededByMutationIds.includes(r3.mutationId), 'SC4: r2->r3 link');

  const all = getAllMutationRecords();
  assert(all.length >= 3, 'SC5: all records preserved');

  const chain = getCanonicalVersionChain('ast_sc');
  assert(chain.length >= 3, 'SC6: version chain preserved across supersessions');
}

function auditTrailTests() {
  console.log('\n=== Audit Trail Integrity ===');
  resetAll();

  const r1 = applyCanonicalMutation(makeProposal({ targetObjectIds: ['ast_audit'] }), 'snap_a');
  const r2 = applyCanonicalMutation(makeProposal({ mutationType: 'ALIAS_ADDED', targetObjectIds: ['ast_audit'], beforeState: {}, afterState: { a: 1 }, semanticClass: 'ALIAS' }), 'snap_b');
  const rb = applyRollback(r2.mutationId, 'SYS');

  const events = getMutationAuditEvents();
  assert(events.length >= 6, 'AT1: rich audit trail (propose+validate+stage+commit per mutation + rollback)');

  const forMut = getMutationAuditEventsForMutation(r1.mutationId);
  assert(forMut.length >= 2, 'AT2: per-mutation audit events');

  const forRb = getMutationAuditEventsForMutation(rb.rollbackMutationId!);
  assert(forRb.length >= 2, 'AT3: rollback has audit events');

  const allMuts = getMutationsForObject('ast_audit');
  assert(allMuts.every(m => m.structuredDiffRef !== ''), 'AT4: all mutations have diff refs');
  assert(allMuts.every(m => m.reasonCodes.length > 0), 'AT5: all mutations have reasons');
  assert(allMuts.every(m => m.evaluatorVersion !== ''), 'AT6: all mutations have evaluator version');
  assert(allMuts.every(m => m.policyVersion !== ''), 'AT7: all mutations have policy version');
  assert(allMuts.every(m => m.schemaVersion !== ''), 'AT8: all mutations have schema version');

  const versions = getCanonicalVersionChain('ast_audit');
  assert(versions.every(v => v.createdByMutationId !== ''), 'AT9: all versions linked to mutation');
  assert(versions.every(v => v.stateSnapshotRef !== ''), 'AT10: all versions have snapshot ref');
}

function metricMutationTests() {
  console.log('\n=== Metric Mutation Integrity ===');
  resetAll();

  const add = applyCanonicalMutation(makeProposal({
    mutationType: 'METRIC_CONTRACT_ADDED', targetObjectIds: [], targetContractIds: ['test.metric'],
    reasonCodes: ['NEW_CONTRACT'], evidenceRefs: [],
  }), 'snap_mc_add');
  assert(add.success, 'MM1: contract add succeeds');
  assert(getMutationById(add.mutationId)!.mutationType === 'METRIC_CONTRACT_ADDED', 'MM2: type preserved');

  const revise = applyCanonicalMutation(makeProposal({
    mutationType: 'METRIC_CONTRACT_REVISED', targetObjectIds: [], targetContractIds: ['test.metric'],
    beforeState: { unit: 'USD' }, afterState: { unit: 'USD', blockedUses: ['SCORING'] },
    reasonCodes: ['POLICY_UPDATE'], evidenceRefs: [], semanticClass: 'METRIC_CONTRACT',
  }), 'snap_mc_rev');
  assert(revise.success, 'MM3: contract revision succeeds');

  const diff = getDiffByMutationId(revise.mutationId);
  assert(diff !== undefined, 'MM4: revision has diff');
  assert(diff!.replayBreaking === true, 'MM5: contract revision is replay-breaking');

  const deprecate = applyCanonicalMutation(makeProposal({
    mutationType: 'METRIC_CONTRACT_DEPRECATED', targetObjectIds: [], targetContractIds: ['test.metric'],
    reasonCodes: ['DEPRECATED'], evidenceRefs: [],
  }), 'snap_mc_dep');
  assert(deprecate.success, 'MM6: contract deprecation succeeds');
  assert(!isRollbackAllowed(deprecate.mutationId).allowed, 'MM7: deprecation not rollback-eligible');
}

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  L3 Master: Mutation Control Band                 ║');
console.log('╚═══════════════════════════════════════════════════╝');
lifecycleTests(); diffAccuracyTests(); rollbackSafetyTests(); historicalReconstructionTests(); supersessionChainTests(); auditTrailTests(); metricMutationTests();
console.log(`\n═══════════════════════════════════════`);
console.log(`TOTAL: ${passed + failed} — ${passed} passed, ${failed} failed`);
if (failed > 0) { console.log(`${failed} FAILURES`); process.exit(1); }
else console.log('ALL MUTATION CONTROL TESTS PASSED');
