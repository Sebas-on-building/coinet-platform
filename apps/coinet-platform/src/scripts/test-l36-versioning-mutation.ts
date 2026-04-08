/**
 * L3.6 — Canonical Versioning and Mutation Control — Test Suite
 *
 * 8 suites, 100+ assertions covering:
 *   A. Mutation ledger
 *   B. Version chain
 *   C. Diff engine
 *   D. Mutation control
 *   E. Rollback engine
 *   F. Anti-fake suite
 *   G. Cross-layer propagation
 *   H. Forensic reconstruction
 */

import {
  appendMutationRecord,
  generateMutationId,
  getMutationById,
  getMutationsForObject,
  getMutationsForMetricContract,
  getMutationsAtReplayTime,
  getMutationsByType,
  markMutationValidated,
  markMutationStaged,
  markMutationCommitted,
  markMutationReversible,
  markMutationSuperseded,
  isMutationTransitionLegal,
  linkRollbackMutation,
  resetMutationLedger,
  LEGAL_MUTATION_TRANSITIONS,
  type CanonicalMutationRecord,
  type MutationLifecycleState,
} from '../services/canonicalization/mutation-ledger';

import {
  createCanonicalVersion,
  getCanonicalVersionById,
  getCurrentCanonicalVersion,
  getCanonicalVersionChain,
  reconstructCanonicalStateAtVersion,
  reconstructCanonicalStateAtTime,
  getCurrentMetricContractVersion,
  getMetricContractVersionChain,
  resetVersionStore,
  type CanonicalVersionRecord,
} from '../services/canonicalization/canonical-versioning';

import {
  buildStructuredDiff,
  diffCanonicalObject,
  diffMetricContract,
  diffReconciliationState,
  diffConfidenceState,
  classifyMutationSeverity,
  getDiffById,
  getDiffByMutationId,
  resetDiffStore,
} from '../services/canonicalization/entity-diff-engine';

import {
  proposeMutation,
  validateMutation,
  stageMutation,
  commitMutation,
  applyCanonicalMutation,
  supersedeMutation,
  emitMutationAuditEvent,
  getMutationAuditEvents,
  getMutationAuditEventsForMutation,
  resetAuditEvents,
  type MutationProposalInput,
} from '../services/canonicalization/mutation-control';

import {
  isRollbackAllowed,
  buildRollbackPlan,
  applyRollback,
  getRollbackChain,
  getRollbackTargetVersion,
  resetRollbackState,
} from '../services/canonicalization/rollback-engine';

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

function resetAll(): void {
  resetMutationLedger();
  resetVersionStore();
  resetDiffStore();
  resetAuditEvents();
  resetRollbackState();
}

function makeBaseRecord(overrides: Partial<CanonicalMutationRecord> = {}): CanonicalMutationRecord {
  return {
    mutationId: generateMutationId(),
    mutationType: 'ENTITY_CREATED',
    lifecycleState: 'PROPOSED',
    targetObjectIds: ['ast_btc'],
    beforeVersionRefs: [],
    afterVersionRefs: [],
    structuredDiffRef: 'diff_placeholder',
    reasonCodes: ['INITIAL_CREATION'],
    triggerType: 'SYSTEM',
    evidenceRefs: ['ev_1'],
    validationRefs: [],
    approvalRefs: [],
    lineageRefs: ['lin_1'],
    replayCompatibility: { schemaVersion: 'v1' },
    initiatedAt: new Date().toISOString(),
    evaluatorVersion: '1.0.0',
    policyVersion: '1.0.0',
    schemaVersion: 'v1',
    rollbackEligibility: { reversible: true },
    supersedesMutationIds: [],
    supersededByMutationIds: [],
    reviewQueueRefs: [],
    ...overrides,
  };
}

function makeProposalInput(overrides: Partial<MutationProposalInput> = {}): MutationProposalInput {
  return {
    mutationType: 'ENTITY_CREATED',
    targetObjectIds: ['ast_btc'],
    beforeState: {},
    afterState: { canonicalId: 'ast_btc', objectType: 'ASSET' },
    reasonCodes: ['INITIAL_CREATION'],
    triggerType: 'SYSTEM',
    evidenceRefs: ['ev_1'],
    initiatedBy: 'SYSTEM',
    semanticClass: 'IDENTITY',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — Mutation Ledger
// ═══════════════════════════════════════════════════════════════════════════════

function suiteA(): void {
  console.log('\n=== SUITE A: Mutation Ledger ===');
  resetAll();

  const rec = makeBaseRecord();
  appendMutationRecord(rec);
  assert(getMutationById(rec.mutationId) !== undefined, 'A1: mutation appended and queryable');

  const byObj = getMutationsForObject('ast_btc');
  assert(byObj.length === 1, 'A2: queryable by object id');

  try { appendMutationRecord(rec); assert(false, 'A3: duplicate id rejected'); }
  catch { assert(true, 'A3: duplicate id rejected'); }

  assert(isMutationTransitionLegal('PROPOSED', 'VALIDATED'), 'A4: PROPOSED->VALIDATED legal');
  assert(isMutationTransitionLegal('VALIDATED', 'STAGED'), 'A5: VALIDATED->STAGED legal');
  assert(isMutationTransitionLegal('STAGED', 'COMMITTED'), 'A6: STAGED->COMMITTED legal');
  assert(isMutationTransitionLegal('COMMITTED', 'REVERSIBLE'), 'A7: COMMITTED->REVERSIBLE legal');
  assert(isMutationTransitionLegal('REVERSIBLE', 'SUPERSEDED'), 'A8: REVERSIBLE->SUPERSEDED legal');
  assert(!isMutationTransitionLegal('PROPOSED', 'COMMITTED'), 'A9: PROPOSED->COMMITTED illegal');
  assert(!isMutationTransitionLegal('SUPERSEDED', 'COMMITTED'), 'A10: SUPERSEDED->COMMITTED illegal');
  assert(!isMutationTransitionLegal('COMMITTED', 'VALIDATED'), 'A11: COMMITTED->VALIDATED illegal');

  markMutationValidated(rec.mutationId);
  assert(getMutationById(rec.mutationId)!.lifecycleState === 'VALIDATED', 'A12: transitioned to VALIDATED');

  try { markMutationValidated(rec.mutationId); assert(false, 'A13: double VALIDATED blocked'); }
  catch { assert(true, 'A13: double VALIDATED blocked'); }

  markMutationStaged(rec.mutationId);
  markMutationCommitted(rec.mutationId, 'SYSTEM');
  assert(getMutationById(rec.mutationId)!.committedAt !== undefined, 'A14: committedAt set');

  const rec2 = makeBaseRecord({ mutationType: 'ALIAS_ADDED' });
  appendMutationRecord(rec2);
  markMutationValidated(rec2.mutationId);
  markMutationStaged(rec2.mutationId);
  markMutationCommitted(rec2.mutationId);
  markMutationReversible(rec2.mutationId);
  markMutationSuperseded(rec2.mutationId, 'mut_newer');
  assert(getMutationById(rec2.mutationId)!.lifecycleState === 'SUPERSEDED', 'A15: superseded');
  assert(getMutationById(rec2.mutationId)!.supersededByMutationIds.includes('mut_newer'), 'A16: supersession link');

  const contractRec = makeBaseRecord({
    mutationType: 'METRIC_CONTRACT_ADDED',
    targetObjectIds: [],
    targetContractIds: ['price.spot.usd'],
  });
  appendMutationRecord(contractRec);
  assert(getMutationsForMetricContract('price.spot.usd').length === 1, 'A17: queryable by contract');

  const replayRecs = getMutationsAtReplayTime('ast_btc', new Date().toISOString());
  assert(replayRecs.length >= 1, 'A18: replay-time retrieval works');

  const byType = getMutationsByType('ENTITY_CREATED');
  assert(byType.length >= 1, 'A19: queryable by type');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — Version Chain
// ═══════════════════════════════════════════════════════════════════════════════

function suiteB(): void {
  console.log('\n=== SUITE B: Version Chain ===');
  resetAll();

  const t0 = '2025-01-01T00:00:00.000Z';
  const t1 = '2025-01-01T00:01:00.000Z';
  const t2 = '2025-01-01T00:02:00.000Z';

  const v1 = createCanonicalVersion({
    canonicalObjectId: 'ast_btc', versionType: 'OBJECT',
    parentVersionIds: [], createdByMutationId: 'mut_1',
    stateSnapshotRef: 'snap_1', effectiveFrom: t0,
  });
  assert(v1.versionId.startsWith('ver_'), 'B1: version id format');
  assert(getCanonicalVersionById(v1.versionId) !== undefined, 'B2: queryable by id');
  assert(getCurrentCanonicalVersion('ast_btc')?.versionId === v1.versionId, 'B3: current version set');

  const v2 = createCanonicalVersion({
    canonicalObjectId: 'ast_btc', versionType: 'OBJECT',
    parentVersionIds: [v1.versionId], createdByMutationId: 'mut_2',
    stateSnapshotRef: 'snap_2', diffFromParentRef: 'diff_1', effectiveFrom: t1,
  });
  assert(getCurrentCanonicalVersion('ast_btc')?.versionId === v2.versionId, 'B4: current updated to v2');
  assert(v1.childVersionIds.includes(v2.versionId), 'B5: parent->child linkage');
  assert(v2.parentVersionIds.includes(v1.versionId), 'B6: child->parent linkage');
  assert(v1.supersededAt !== undefined, 'B7: parent supersededAt set');

  const chain = getCanonicalVersionChain('ast_btc');
  assert(chain.length === 2, 'B8: version chain length');

  const atV1 = reconstructCanonicalStateAtVersion('ast_btc', v1.versionId);
  assert(atV1?.stateSnapshotRef === 'snap_1', 'B9: reconstruct at version 1');

  const beforeV2 = reconstructCanonicalStateAtTime('ast_btc', t0);
  assert(beforeV2?.stateSnapshotRef === 'snap_1', 'B10: reconstruct at time returns v1');

  const atLatest = reconstructCanonicalStateAtTime('ast_btc', t2);
  assert(atLatest?.stateSnapshotRef === 'snap_2', 'B11: reconstruct at current time returns v2');

  const mc1 = createCanonicalVersion({
    metricContractId: 'price.spot.usd', versionType: 'METRIC_CONTRACT',
    parentVersionIds: [], createdByMutationId: 'mut_mc1',
    stateSnapshotRef: 'mc_snap_1',
  });
  assert(getCurrentMetricContractVersion('price.spot.usd')?.versionId === mc1.versionId, 'B12: metric contract version');

  const mc2 = createCanonicalVersion({
    metricContractId: 'price.spot.usd', versionType: 'METRIC_CONTRACT',
    parentVersionIds: [mc1.versionId], createdByMutationId: 'mut_mc2',
    stateSnapshotRef: 'mc_snap_2',
  });
  assert(getCurrentMetricContractVersion('price.spot.usd')?.versionId === mc2.versionId, 'B13: metric contract updated');
  assert(getMetricContractVersionChain('price.spot.usd').length === 2, 'B14: metric contract chain length');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — Diff Engine
// ═══════════════════════════════════════════════════════════════════════════════

function suiteC(): void {
  console.log('\n=== SUITE C: Diff Engine ===');
  resetAll();

  const aliasDiff = buildStructuredDiff(
    'mut_alias', ['ast_btc'],
    { allowedAliases: ['BTC'] },
    { allowedAliases: ['BTC', 'Bitcoin'] },
    'ALIAS',
  );
  assert(aliasDiff.diffId.startsWith('diff_'), 'C1: diff id format');
  assert(aliasDiff.addedElements.includes('allowedAliases:Bitcoin'), 'C2: added element detected');
  assert(aliasDiff.semanticClass === 'ALIAS', 'C3: semantic class preserved');
  assert(getDiffById(aliasDiff.diffId) !== undefined, 'C4: diff stored');
  assert(getDiffByMutationId('mut_alias') !== undefined, 'C5: diff queryable by mutation');

  const anchorDiff = buildStructuredDiff(
    'mut_anchor', ['ast_btc'],
    { winningAnchors: ['anchor_1'] },
    { winningAnchors: ['anchor_1', 'anchor_2'] },
    'RECONCILIATION',
  );
  assert(anchorDiff.changedFields.length > 0 || anchorDiff.addedElements.length > 0, 'C6: anchor change detected');

  const confidenceDiff = diffConfidenceState('mut_conf', 'ast_btc',
    { band: 'MEDIUM', rightsProfile: 'CONDITIONAL_INTELLIGENCE' },
    { band: 'HIGH', rightsProfile: 'FULL_INTELLIGENCE' },
  );
  assert(confidenceDiff.semanticClass === 'CONFIDENCE', 'C7: confidence diff class');
  assert(confidenceDiff.changedFields.some(f => f.field === 'band'), 'C8: band change detected');
  assert(confidenceDiff.severity === 'HIGH', 'C9: confidence band change is HIGH severity');

  const reconDiff = diffReconciliationState('mut_recon', 'ast_btc',
    { mode: 'DETERMINISTIC_MERGE' },
    { mode: 'CONTESTED_MERGE', winningAnchors: ['a1'] },
  );
  assert(reconDiff.semanticClass === 'RECONCILIATION', 'C10: reconciliation diff class');
  assert(reconDiff.changedFields.some(f => f.field === 'mode'), 'C11: mode change detected');

  const contractDiff = diffMetricContract('mut_mc', 'price.spot.usd',
    { unit: 'USD', blockedUsesUnderUncertainty: ['RANKING'] },
    { unit: 'USD', blockedUsesUnderUncertainty: ['RANKING', 'SCORING'] },
  );
  assert(contractDiff.semanticClass === 'METRIC_CONTRACT', 'C12: metric contract diff class');
  assert(contractDiff.replayBreaking === true, 'C13: metric contract diff is replay-breaking');

  const objDiff = diffCanonicalObject('mut_obj', 'ast_btc',
    { lifecycleState: 'ACTIVE', confidenceState: 'HIGH' },
    { lifecycleState: 'DEPRECATED', confidenceState: 'HIGH' },
  );
  assert(objDiff.semanticClass === 'DEPRECATION', 'C14: lifecycle->DEPRECATED is DEPRECATION class');

  const splitDiff = diffCanonicalObject('mut_split', 'ast_btc',
    { lifecycleState: 'ACTIVE' },
    { lifecycleState: 'SPLIT' },
  );
  assert(splitDiff.semanticClass === 'STRUCTURAL', 'C15: lifecycle->SPLIT is STRUCTURAL class');
  assert(splitDiff.severity === 'CRITICAL', 'C16: structural mutation is CRITICAL');

  const noOpDiff = buildStructuredDiff('mut_noop', ['ast_btc'], { a: 1 }, { a: 1 }, 'NO_OP');
  assert(noOpDiff.severity === 'LOW', 'C17: NO_OP is LOW severity');
  assert(noOpDiff.changedFields.length === 0, 'C18: no changes in NO_OP');

  const removedDiff = buildStructuredDiff('mut_rm', ['ast_btc'],
    { aliases: ['BTC', 'Bitcoin'], score: 80 },
    { aliases: ['BTC'] },
    'IDENTITY',
  );
  assert(removedDiff.removedFields.includes('score'), 'C19: removed field detected');
  assert(removedDiff.removedElements.some(e => e.includes('Bitcoin')), 'C20: removed element detected');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — Mutation Control
// ═══════════════════════════════════════════════════════════════════════════════

function suiteD(): void {
  console.log('\n=== SUITE D: Mutation Control ===');
  resetAll();

  const proposal = proposeMutation(makeProposalInput());
  assert(proposal.mutationId.startsWith('mut_'), 'D1: mutation id format');
  assert(proposal.diff.diffId.startsWith('diff_'), 'D2: diff created with proposal');
  assert(getMutationById(proposal.mutationId)!.lifecycleState === 'PROPOSED', 'D3: starts as PROPOSED');

  const validation = validateMutation(proposal.mutationId);
  assert(validation.outcome === 'VALID', 'D4: valid mutation validates');
  assert(getMutationById(proposal.mutationId)!.lifecycleState === 'VALIDATED', 'D5: now VALIDATED');

  const stageResult = stageMutation(proposal.mutationId);
  assert(stageResult.staged === true, 'D6: staging succeeds');

  const commitResult = commitMutation(proposal.mutationId, 'SYSTEM', 'snap_ast_btc');
  assert(commitResult.committed === true, 'D7: commit succeeds');
  assert(commitResult.versionRecord !== undefined, 'D8: version record created');
  assert(commitResult.versionRecord!.versionId.startsWith('ver_'), 'D9: version id format');

  const audits = getMutationAuditEventsForMutation(proposal.mutationId);
  assert(audits.length >= 3, 'D10: audit events emitted (proposed + validated + staged + committed)');

  const badValidation = validateMutation('nonexistent');
  assert(badValidation.outcome === 'BLOCKED_SCHEMA', 'D11: nonexistent mutation blocked');

  const noEvidence = proposeMutation(makeProposalInput({ evidenceRefs: [], reasonCodes: [] }));
  const noEvVal = validateMutation(noEvidence.mutationId);
  assert(noEvVal.outcome === 'BLOCKED_EVIDENCE', 'D12: no evidence blocked');

  const noTarget = proposeMutation(makeProposalInput({ targetObjectIds: [], evidenceRefs: ['ev'], reasonCodes: ['r'] }));
  const noTargetVal = validateMutation(noTarget.mutationId);
  assert(noTargetVal.outcome === 'BLOCKED_EVIDENCE', 'D13: no target objects blocked');

  const metricProposal = proposeMutation(makeProposalInput({
    mutationType: 'METRIC_CONTRACT_ADDED',
    targetObjectIds: [],
    targetContractIds: ['price.spot.usd'],
    reasonCodes: ['NEW_CONTRACT'],
    evidenceRefs: [],
  }));
  const metricVal = validateMutation(metricProposal.mutationId);
  assert(metricVal.outcome === 'VALID', 'D14: metric-only mutation allows empty objects and evidence');

  const fullPipeline = applyCanonicalMutation(makeProposalInput({
    targetObjectIds: ['ast_eth'],
  }), 'snap_ast_eth');
  assert(fullPipeline.success === true, 'D15: full pipeline succeeds');
  assert(fullPipeline.versionRecord !== undefined, 'D16: version record from pipeline');

  const alreadyCommitted = stageMutation(proposal.mutationId);
  assert(!alreadyCommitted.staged, 'D17: staging committed mutation blocked');

  const supersede = supersedeMutation(proposal.mutationId, fullPipeline.mutationId);
  assert(supersede.superseded, 'D18: supersession works');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — Rollback Engine
// ═══════════════════════════════════════════════════════════════════════════════

function suiteE(): void {
  console.log('\n=== SUITE E: Rollback Engine ===');
  resetAll();

  const result = applyCanonicalMutation(makeProposalInput(), 'snap_v1');
  assert(result.success, 'E1: initial mutation committed');

  const eligibility = isRollbackAllowed(result.mutationId);
  assert(eligibility.allowed, 'E2: committed+reversible is rollback-eligible');

  const plan = buildRollbackPlan(result.mutationId);
  assert(plan.rollbackSafe, 'E3: rollback plan is safe');
  assert(plan.originalMutationId === result.mutationId, 'E4: plan references original');

  const rollbackResult = applyRollback(result.mutationId, 'SYSTEM');
  assert(rollbackResult.success, 'E5: rollback succeeds');
  assert(rollbackResult.rollbackMutationId !== undefined, 'E6: rollback mutation created');
  assert(rollbackResult.restoredVersionRecord !== undefined, 'E7: restored version created');

  const original = getMutationById(result.mutationId)!;
  assert(original.rolledBackByMutationId === rollbackResult.rollbackMutationId, 'E8: rollback linkage on original');
  assert(original.lifecycleState === 'SUPERSEDED', 'E9: original superseded');

  const rollbackMut = getMutationById(rollbackResult.rollbackMutationId!)!;
  assert(rollbackMut.rollbackOfMutationId === result.mutationId, 'E10: reverse linkage');
  assert(rollbackMut.mutationType === 'ROLLBACK_APPLIED', 'E11: rollback type');

  const doubleRollback = isRollbackAllowed(result.mutationId);
  assert(!doubleRollback.allowed, 'E12: already-rolled-back not eligible');

  const chain = getRollbackChain(result.mutationId);
  assert(chain.length === 1, 'E13: rollback chain length');
  assert(chain[0] === rollbackResult.rollbackMutationId, 'E14: chain contains rollback');

  const terminalResult = applyCanonicalMutation(makeProposalInput({
    mutationType: 'METRIC_CONTRACT_DEPRECATED',
    targetObjectIds: [],
    targetContractIds: ['price.spot.usd'],
    reasonCodes: ['DEPRECATED'],
    evidenceRefs: [],
  }), 'snap_deprecated');
  const terminalEligibility = isRollbackAllowed(terminalResult.mutationId);
  assert(!terminalEligibility.allowed, 'E15: terminal mutation not rollback-eligible');

  const notFound = isRollbackAllowed('nonexistent');
  assert(!notFound.allowed, 'E16: nonexistent mutation not eligible');

  const proposedOnly = proposeMutation(makeProposalInput());
  const proposedEligibility = isRollbackAllowed(proposedOnly.mutationId);
  assert(!proposedEligibility.allowed, 'E17: proposed-only not eligible');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — Anti-Fake Suite
// ═══════════════════════════════════════════════════════════════════════════════

function suiteF(): void {
  console.log('\n=== SUITE F: Anti-Fake Suite ===');
  resetAll();

  assert(!isMutationTransitionLegal('PROPOSED', 'COMMITTED'), 'F1: no direct PROPOSED->COMMITTED');
  assert(!isMutationTransitionLegal('STAGED', 'PROPOSED'), 'F2: no STAGED->PROPOSED reversal');
  assert(!isMutationTransitionLegal('SUPERSEDED', 'COMMITTED'), 'F3: superseded cannot become committed');
  assert(!isMutationTransitionLegal('COMMITTED', 'VALIDATED'), 'F4: committed cannot go back to validated');
  assert(!isMutationTransitionLegal('REVERSIBLE', 'PROPOSED'), 'F5: reversible cannot go back to proposed');

  const splitResult = applyCanonicalMutation(makeProposalInput({
    mutationType: 'ENTITY_SPLIT',
    targetObjectIds: ['ast_parent'],
    semanticClass: 'STRUCTURAL',
  }), 'snap_split');
  assert(splitResult.success, 'F6: split creates mutation');
  const splitMut = getMutationById(splitResult.mutationId)!;
  assert(splitMut.mutationType === 'ENTITY_SPLIT', 'F7: split type preserved');
  assert(splitResult.versionRecord !== undefined, 'F8: split version record preserved');

  const mergeResult = applyCanonicalMutation(makeProposalInput({
    mutationType: 'ENTITY_MERGED',
    targetObjectIds: ['ast_a', 'ast_b'],
    semanticClass: 'STRUCTURAL',
  }), 'snap_merge');
  assert(mergeResult.success, 'F9: merge creates mutation');
  const mergeVer = mergeResult.versionRecord!;
  assert(getCanonicalVersionById(mergeVer.versionId) !== undefined, 'F10: merge version queryable');

  const superResult = applyCanonicalMutation(makeProposalInput({ targetObjectIds: ['ast_x'] }), 'snap_x1');
  const super2 = applyCanonicalMutation(makeProposalInput({ targetObjectIds: ['ast_x'] }), 'snap_x2');
  supersedeMutation(superResult.mutationId, super2.mutationId);
  const superseded = getMutationById(superResult.mutationId)!;
  assert(superseded.lifecycleState === 'SUPERSEDED', 'F11: superseded state remains queryable');
  assert(getMutationsForObject('ast_x').length >= 2, 'F12: both mutations remain in ledger');

  const replayMuts = getMutationsAtReplayTime('ast_x', new Date().toISOString());
  assert(replayMuts.length >= 2, 'F13: replay retrieves historical mutations including superseded');

  const mcResult = applyCanonicalMutation(makeProposalInput({
    mutationType: 'METRIC_CONTRACT_REVISED',
    targetObjectIds: [],
    targetContractIds: ['funding.rate.8h'],
    reasonCodes: ['REVISION'],
    evidenceRefs: [],
  }), 'mc_snap_rev');
  const mcDiff = getDiffByMutationId(mcResult.mutationId);
  assert(mcDiff !== undefined, 'F14: metric contract revision creates diff');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE G — Cross-Layer Propagation
// ═══════════════════════════════════════════════════════════════════════════════

function suiteG(): void {
  console.log('\n=== SUITE G: Cross-Layer Propagation ===');
  resetAll();

  const mergeResult = applyCanonicalMutation(makeProposalInput({
    mutationType: 'ENTITY_MERGED',
    targetObjectIds: ['ast_a', 'ast_b'],
    semanticClass: 'STRUCTURAL',
  }), 'snap_merge');
  assert(mergeResult.success, 'G1: L3.4 merge triggers L3.6 mutation');
  const mergeDiff = getDiffByMutationId(mergeResult.mutationId);
  assert(mergeDiff !== undefined, 'G2: merge diff created');
  assert(mergeDiff!.severity === 'CRITICAL', 'G3: structural mutation is CRITICAL');

  const splitResult = applyCanonicalMutation(makeProposalInput({
    mutationType: 'ENTITY_SPLIT',
    targetObjectIds: ['ast_parent'],
    semanticClass: 'STRUCTURAL',
  }), 'snap_split');
  assert(splitResult.success, 'G4: L3.4 split triggers L3.6 mutation');

  const mcAdd = applyCanonicalMutation(makeProposalInput({
    mutationType: 'METRIC_CONTRACT_ADDED',
    targetObjectIds: [],
    targetContractIds: ['new.metric.path'],
    reasonCodes: ['NEW_CONTRACT'],
    evidenceRefs: [],
  }), 'mc_snap_add');
  assert(mcAdd.success, 'G5: L3.5 contract add triggers L3.6 mutation');

  const mcRevise = applyCanonicalMutation(makeProposalInput({
    mutationType: 'METRIC_CONTRACT_REVISED',
    targetObjectIds: [],
    targetContractIds: ['price.spot.usd'],
    reasonCodes: ['REVISION'],
    evidenceRefs: [],
    beforeState: { unit: 'USD' },
    afterState: { unit: 'USD', blockedUsesUnderUncertainty: ['SCORING'] },
    semanticClass: 'METRIC_CONTRACT',
  }), 'mc_snap_rev');
  assert(mcRevise.success, 'G6: L3.5 contract revision triggers L3.6 mutation');
  const mcDiff = getDiffByMutationId(mcRevise.mutationId);
  assert(mcDiff!.replayBreaking === true, 'G7: metric contract revision is replay-breaking');

  const confChange = applyCanonicalMutation(makeProposalInput({
    mutationType: 'CONFIDENCE_CHANGED',
    targetObjectIds: ['ast_btc'],
    beforeState: { band: 'MEDIUM' },
    afterState: { band: 'HIGH', rightsProfile: 'FULL_INTELLIGENCE' },
    semanticClass: 'CONFIDENCE',
  }), 'snap_conf');
  assert(confChange.success, 'G8: L3.3 confidence change triggers L3.6 mutation');
  const confDiff = getDiffByMutationId(confChange.mutationId);
  assert(confDiff!.semanticClass === 'CONFIDENCE', 'G9: confidence diff class correct');

  const reconChange = applyCanonicalMutation(makeProposalInput({
    mutationType: 'RECONCILIATION_MODE_CHANGED',
    targetObjectIds: ['ast_btc'],
    beforeState: { mode: 'DETERMINISTIC_MERGE' },
    afterState: { mode: 'CONTESTED_MERGE' },
    semanticClass: 'RECONCILIATION',
  }), 'snap_recon');
  assert(reconChange.success, 'G10: reconciliation change triggers L3.6 mutation');

  const allAudit = getMutationAuditEvents();
  assert(allAudit.length > 10, 'G11: audit events accumulated across all mutations');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE H — Forensic Reconstruction
// ═══════════════════════════════════════════════════════════════════════════════

function suiteH(): void {
  console.log('\n=== SUITE H: Forensic Reconstruction ===');
  resetAll();

  const r1 = applyCanonicalMutation(makeProposalInput({
    targetObjectIds: ['ast_forensic'],
    beforeState: { name: 'Bitcoin', aliases: ['BTC'] },
    afterState: { name: 'Bitcoin', aliases: ['BTC'], lifecycleState: 'ACTIVE' },
  }), 'snap_f1');

  const r2 = applyCanonicalMutation(makeProposalInput({
    mutationType: 'ALIAS_ADDED',
    targetObjectIds: ['ast_forensic'],
    beforeState: { aliases: ['BTC'] },
    afterState: { aliases: ['BTC', 'XBT'] },
    semanticClass: 'ALIAS',
  }), 'snap_f2');

  const r3 = applyCanonicalMutation(makeProposalInput({
    mutationType: 'ENTITY_SPLIT',
    targetObjectIds: ['ast_forensic'],
    beforeState: { lifecycleState: 'ACTIVE' },
    afterState: { lifecycleState: 'SPLIT' },
    semanticClass: 'STRUCTURAL',
  }), 'snap_f3');

  const chain = getCanonicalVersionChain('ast_forensic');
  assert(chain.length === 3, 'H1: 3 versions in chain');

  const v1 = chain[0];
  const v2 = chain[1];
  const v3 = chain[2];

  const stateAtV1 = reconstructCanonicalStateAtVersion('ast_forensic', v1.versionId);
  assert(stateAtV1?.stateSnapshotRef === 'snap_f1', 'H2: reconstruct state at v1');

  const stateAtV2 = reconstructCanonicalStateAtVersion('ast_forensic', v2.versionId);
  assert(stateAtV2?.stateSnapshotRef === 'snap_f2', 'H3: reconstruct state at v2');

  assert(v3.parentVersionIds.length > 0, 'H4: split version has parent');
  assert(v2.childVersionIds.includes(v3.versionId), 'H5: parent->child link survives split');

  const rollbackResult = applyRollback(r3.mutationId, 'SYSTEM', ['SPLIT_REVERSAL']);
  assert(rollbackResult.success, 'H6: split rollback succeeds');

  const rollbackChain = getRollbackChain(r3.mutationId);
  assert(rollbackChain.length === 1, 'H7: rollback chain survives');

  const splitMut = getMutationById(r3.mutationId)!;
  assert(splitMut.lifecycleState === 'SUPERSEDED', 'H8: split now superseded');
  assert(splitMut.rolledBackByMutationId === rollbackResult.rollbackMutationId, 'H9: rollback linkage on split');

  const allMuts = getMutationsForObject('ast_forensic');
  assert(allMuts.length >= 4, 'H10: all mutations remain (including rollback)');

  const supersededMuts = allMuts.filter(m => m.lifecycleState === 'SUPERSEDED');
  assert(supersededMuts.length >= 1, 'H11: superseded mutations queryable');

  const allVersions = getCanonicalVersionChain('ast_forensic');
  assert(allVersions.length >= 4, 'H12: rollback creates new version (4+ total)');

  const mutReport = getMutationById(r2.mutationId)!;
  assert(mutReport.mutationType === 'ALIAS_ADDED', 'H13: mutation type preserved in history');
  assert(mutReport.evidenceRefs.length > 0, 'H14: evidence refs preserved');

  const diff2 = getDiffByMutationId(r2.mutationId);
  assert(diff2 !== undefined, 'H15: diff survives supersession of later mutations');
  assert(diff2!.addedElements.some(e => e.includes('XBT')), 'H16: diff content explains change');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  L3.6 Canonical Versioning & Mutation Control     ║');
console.log('╚═══════════════════════════════════════════════════╝');

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
  console.log('ALL L3.6 TESTS PASSED');
} else {
  console.log(`${failed} FAILURES`);
  process.exit(1);
}
