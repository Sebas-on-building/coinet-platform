#!/usr/bin/env ts-node
/**
 * L3.3-B — Confidence Gate Test Suite
 *
 * Sections:
 *   A. Generic gate behavior (missing state, unresolved, low, conditional, scar)
 *   B. Domain wrapper mapping
 *   C. Object-family restrictions
 *   D. Probation behavior
 */

import {
  evaluateConfidenceGate,
  canUseForScoring,
  canUseForContradiction,
  canUseForScenario,
  canUseForJudgment,
  canUseForGraphRelation,
  canUseForReplayOrForensic,
  getGateAuditLog,
  resetGateAuditLog,
  type ConfidenceGateInput,
  type ConfidenceGateDecision,
} from '../services/canonicalization/confidence-gate';
import type { EntityConfidenceState } from '../services/canonicalization/entity-confidence-model';
import type { ConfidenceBand, ConfidenceEpistemicState, ConfidenceScar, FactorEvaluation } from '../services/canonicalization/confidence-factors';
import type { RightsProfile, ProbationState, CapResult } from '../services/canonicalization/confidence-policy-map';

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.error(`  ❌ FAIL: ${label}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function makeScar(code: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM', affectsRights: string[] = []): ConfidenceScar {
  return {
    code: code as any,
    severity,
    triggeredAt: new Date().toISOString(),
    evidenceRefs: ['test-ref'],
    affectsRights,
    agingPolicyId: `aging_${severity.toLowerCase()}`,
    clearanceConditionIds: [],
    requiresManualReview: false,
  };
}

function makeFactor(family: string, score: number, substate: string = 'TEST'): FactorEvaluation {
  return {
    family: family as any,
    substate,
    score,
    flags: [],
    scars: [],
    vetoes: [],
    evidenceRefs: [],
    rationale: 'test',
  };
}

function makeRights(overrides: Partial<RightsProfile> = {}): RightsProfile {
  return {
    scoring: 'ALLOW',
    contradictionEngine: 'ALLOW',
    scenarioEngine: 'ALLOW',
    judgment: 'ALLOW',
    graphRelations: 'ALLOW',
    canonicalMutation: 'CONDITIONAL',
    metricAttachment: 'ALLOW',
    contextualReasoning: 'ALLOW',
    enrichmentOnly: 'ALLOW',
    display: 'ALLOW',
    unresolvedQueue: 'DENY',
    forensicReplay: 'ALLOW',
    manualReviewQueue: 'CONDITIONAL',
    conditions: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<EntityConfidenceState> = {}): EntityConfidenceState {
  return {
    stateId: 'state-test-1',
    canonicalId: 'ast_test',
    objectType: 'ASSET',
    evaluatedAt: new Date().toISOString(),
    rawScore: 90,
    finalScore: 90,
    band: 'HIGH',
    epistemicState: 'RESOLVED_CLEAN',
    factorEvaluations: [
      makeFactor('IDENTIFIER_STRENGTH', 95, 'DETERMINISTIC'),
      makeFactor('CROSS_PROVIDER_AGREEMENT', 85, 'OWNER_CONFIRMER'),
      makeFactor('TEMPORAL_STABILITY', 90, 'STABLE'),
      makeFactor('SCOPE_PARITY', 88, 'EXACT_SCOPE'),
      makeFactor('PROVENANCE_STRENGTH', 85, 'EXPLICIT'),
    ],
    activeScars: [],
    rightsProfile: makeRights(),
    capChain: [],
    downgradeReasons: [],
    provenanceSummary: [],
    temporalSummary: [],
    policyVersion: '2.0.0',
    evaluatorVersion: '2.0.0',
    transitionReason: 'INITIAL',
    evidenceRefs: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — Generic gate behavior
// ═══════════════════════════════════════════════════════════════════════════════

function sectionA(): void {
  console.log('\n══ Section A: Generic gate behavior ══');

  resetGateAuditLog();

  // A1: missing state always denies
  const d1 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'SCORING',
    missionCritical: true, confidenceState: undefined,
  });
  assert(d1.allowed === false, 'A1: missing state denies');
  assert(d1.mode === 'DENY', 'A1: mode is DENY');
  assert(d1.auditStamp.stateId === 'MISSING', 'A1: audit stamp marks MISSING');

  // A2: unresolved allows DISPLAY
  const unresolvedState = makeState({
    band: 'UNRESOLVED', epistemicState: 'UNRESOLVED', finalScore: 20,
    rightsProfile: makeRights({ display: 'ALLOW', scoring: 'DENY', contradictionEngine: 'DENY', scenarioEngine: 'DENY', judgment: 'DENY', graphRelations: 'DENY' }),
  });
  const d2 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'DISPLAY',
    missionCritical: false, confidenceState: unresolvedState,
  });
  assert(d2.allowed === true, 'A2: unresolved display allowed');

  // A3: unresolved denies SCORING
  const d3 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'SCORING',
    missionCritical: true, confidenceState: unresolvedState,
  });
  assert(d3.allowed === false, 'A3: unresolved scoring denied');
  assert(d3.reasons.some(r => r.includes('UNRESOLVED')), 'A3: reason mentions UNRESOLVED');

  // A4: unresolved allows FORENSIC_REPLAY
  const d4 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'FORENSIC_REPLAY',
    missionCritical: false, confidenceState: unresolvedState,
  });
  assert(d4.allowed === true, 'A4: unresolved forensic allowed');

  // A5: low band mission-critical scoring denied
  const lowState = makeState({
    band: 'LOW', finalScore: 45,
    rightsProfile: makeRights({ scoring: 'CONDITIONAL' }),
  });
  const d5 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'SCORING',
    missionCritical: true, confidenceState: lowState,
  });
  assert(d5.allowed === false, 'A5: low mission-critical scoring denied');

  // A6: conditional rights pass when allowConditional is true
  const condState = makeState({
    band: 'MEDIUM', finalScore: 72,
    rightsProfile: makeRights({ scoring: 'CONDITIONAL' }),
  });
  const d6 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'SCORING',
    missionCritical: false, confidenceState: condState,
    evaluationContext: { allowConditional: true, requestedByModule: 'omniscore' },
  });
  assert(d6.allowed === true, 'A6: conditional allowed when explicitly opted in');
  assert(d6.mode === 'CONDITIONAL', 'A6: mode is CONDITIONAL');

  // A7: conditional denied when not explicitly allowed
  const d7 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'SCORING',
    missionCritical: false, confidenceState: condState,
  });
  assert(d7.allowed === false, 'A7: conditional denied when not opted in');

  // A8: ALLOW_WITH_SCAR propagates scars
  const scarState = makeState({
    band: 'HIGH', finalScore: 88,
    activeScars: [makeScar('SCOPE_AMBIGUITY')],
    rightsProfile: makeRights({ scoring: 'ALLOW_WITH_SCAR' }),
  });
  const d8 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'SCORING',
    missionCritical: false, confidenceState: scarState,
  });
  assert(d8.allowed === true, 'A8: allow_with_scar allows');
  assert(d8.mode === 'ALLOW_WITH_SCAR', 'A8: mode is ALLOW_WITH_SCAR');
  assert(d8.activeScars.length > 0, 'A8: scars propagated');

  // A9: audit log populated
  const auditLog = getGateAuditLog();
  assert(auditLog.length > 0, 'A9: audit log has entries');
  assert(auditLog[0].canonicalId !== '', 'A9: audit stamp has canonicalId');

  // A10: HIGH + ALLOW goes through cleanly
  const highState = makeState();
  const d10 = evaluateConfidenceGate({
    canonicalId: 'ast_clean', objectType: 'ASSET', requestedUse: 'SCORING',
    missionCritical: true, confidenceState: highState,
  });
  assert(d10.allowed === true, 'A10: high clean scoring allowed');
  assert(d10.mode === 'ALLOW', 'A10: mode is ALLOW');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — Domain wrapper mapping
// ═══════════════════════════════════════════════════════════════════════════════

function sectionB(): void {
  console.log('\n══ Section B: Domain wrapper mapping ══');

  resetGateAuditLog();

  const highState = makeState();
  const lowState = makeState({
    band: 'LOW', finalScore: 40,
    rightsProfile: makeRights({
      scoring: 'DENY', contradictionEngine: 'CONDITIONAL',
      scenarioEngine: 'DENY', judgment: 'DENY',
      graphRelations: 'DENY', display: 'ALLOW', forensicReplay: 'ALLOW',
      canonicalMutation: 'DENY',
    }),
  });

  // B1: scoring wrapper
  const s1 = canUseForScoring('ast_x', 'ASSET', highState);
  assert(s1.allowed === true, 'B1: scoring wrapper allows HIGH');
  assert(s1.auditStamp.requestedUse === 'SCORING', 'B1: audit stamp use is SCORING');

  // B2: contradiction wrapper
  const c1 = canUseForContradiction('ast_x', 'ASSET', highState);
  assert(c1.allowed === true, 'B2: contradiction wrapper allows HIGH');
  assert(c1.auditStamp.requestedUse === 'CONTRADICTION', 'B2: audit stamp use is CONTRADICTION');

  // B3: judgment wrapper
  const j1 = canUseForJudgment('ast_x', 'ASSET', highState);
  assert(j1.allowed === true, 'B3: judgment wrapper allows HIGH');

  // B4: graph wrapper
  const g1 = canUseForGraphRelation('ast_x', 'ASSET', highState);
  assert(g1.allowed === true, 'B4: graph wrapper allows HIGH');

  // B5: replay wrapper — even LOW is allowed for forensic
  const r1 = canUseForReplayOrForensic('ast_x', 'ASSET', lowState);
  assert(r1.allowed === true, 'B5: forensic replay allowed even for LOW');
  assert(r1.auditStamp.requestedUse === 'FORENSIC_REPLAY', 'B5: audit stamp use is FORENSIC_REPLAY');

  // B6: mutation wrapper denies contested
  const contestedState = makeState({
    band: 'LOW', epistemicState: 'CONTESTED', finalScore: 45,
    rightsProfile: makeRights({ canonicalMutation: 'DENY' }),
  });
  const m1 = evaluateConfidenceGate({
    canonicalId: 'ast_x', objectType: 'ASSET', requestedUse: 'CANONICAL_MUTATION',
    missionCritical: false, confidenceState: contestedState,
  });
  assert(m1.allowed === false, 'B6: mutation denied for contested');

  // B7: scoring wrapper denies LOW
  const s2 = canUseForScoring('ast_x', 'ASSET', lowState);
  assert(s2.allowed === false, 'B7: scoring denied for LOW');

  // B8: scenario wrapper
  const sc1 = canUseForScenario('ast_x', 'ASSET', highState);
  assert(sc1.allowed === true, 'B8: scenario wrapper allows HIGH');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C — Object-family restrictions
// ═══════════════════════════════════════════════════════════════════════════════

function sectionC(): void {
  console.log('\n══ Section C: Object-family restrictions ══');

  resetGateAuditLog();

  // C1: entity with attribution risk blocks scoring
  const entityState = makeState({
    objectType: 'ENTITY', canonicalId: 'ent_test',
    band: 'MEDIUM', finalScore: 70,
    activeScars: [makeScar('ENTITY_ATTRIBUTION_WEAK', 'HIGH')],
    rightsProfile: makeRights({ scoring: 'CONDITIONAL' }),
  });
  const d1 = canUseForScoring('ent_test', 'ENTITY', entityState);
  assert(d1.allowed === false, 'C1: entity attribution risk blocks scoring');
  assert(d1.reasons.some(r => r.includes('ENTITY_WEAK_ATTRIBUTION')), 'C1: reason mentions attribution');

  // C2: entity attribution risk blocks judgment
  const d2 = canUseForJudgment('ent_test', 'ENTITY', entityState);
  assert(d2.allowed === false, 'C2: entity attribution risk blocks judgment');

  // C3: narrative with topic boundary overlap blocks scenario
  const topicState = makeState({
    objectType: 'NARRATIVE_TOPIC', canonicalId: 'topic_test',
    band: 'MEDIUM', finalScore: 70,
    activeScars: [makeScar('TOPIC_BOUNDARY_OVERLAP', 'MEDIUM')],
    rightsProfile: makeRights({ scenarioEngine: 'CONDITIONAL', judgment: 'CONDITIONAL' }),
  });
  const d3 = canUseForScenario('topic_test', 'NARRATIVE_TOPIC', topicState);
  assert(d3.allowed === false, 'C3: topic boundary overlap blocks scenario');

  // C4: narrative boundary blocks judgment
  const d4 = canUseForJudgment('topic_test', 'NARRATIVE_TOPIC', topicState);
  assert(d4.allowed === false, 'C4: topic boundary overlap blocks judgment');

  // C5: pair scope ambiguity blocks scoring (non-HIGH)
  const pairState = makeState({
    objectType: 'PAIR', canonicalId: 'pair_test',
    band: 'MEDIUM', finalScore: 72,
    activeScars: [makeScar('SCOPE_AMBIGUITY', 'MEDIUM')],
    rightsProfile: makeRights({ scoring: 'CONDITIONAL' }),
  });
  const d5 = canUseForScoring('pair_test', 'PAIR', pairState);
  assert(d5.allowed === false, 'C5: pair scope ambiguity blocks scoring');

  // C6: protocol oscillation blocks graph relation
  const protoState = makeState({
    objectType: 'PROTOCOL', canonicalId: 'proto_test',
    band: 'MEDIUM', finalScore: 70,
    activeScars: [makeScar('OSCILLATING_IDENTITY', 'HIGH')],
    rightsProfile: makeRights({ graphRelations: 'CONDITIONAL' }),
  });
  const d6 = canUseForGraphRelation('proto_test', 'PROTOCOL', protoState);
  assert(d6.allowed === false, 'C6: protocol oscillation blocks graph');

  // C7: entity without explicit provenance blocked when required
  const noProvState = makeState({
    objectType: 'ENTITY', canonicalId: 'ent_noprov',
    band: 'LOW', finalScore: 50,
    factorEvaluations: [
      makeFactor('PROVENANCE_STRENGTH', 10, 'ABSENT'),
    ],
    rightsProfile: makeRights({ scoring: 'DENY' }),
  });
  const d7 = evaluateConfidenceGate({
    canonicalId: 'ent_noprov', objectType: 'ENTITY', requestedUse: 'SCORING',
    missionCritical: false, confidenceState: noProvState,
    evaluationContext: { requireExplicitProvenance: true },
  });
  assert(d7.allowed === false, 'C7: entity absent provenance denied when required');

  // C8: critical scar on scoring field triggers ALLOW_WITH_SCAR
  const critScarState = makeState({
    band: 'HIGH', finalScore: 88,
    activeScars: [makeScar('RECENT_CORRECTION', 'CRITICAL', ['scoring'])],
    rightsProfile: makeRights({ scoring: 'ALLOW' }),
  });
  const d8 = canUseForScoring('ast_test', 'ASSET', critScarState);
  assert(d8.mode === 'ALLOW_WITH_SCAR', 'C8: critical scar elevates to ALLOW_WITH_SCAR');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D — Probation behavior
// ═══════════════════════════════════════════════════════════════════════════════

function sectionD(): void {
  console.log('\n══ Section D: Probation behavior ══');

  resetGateAuditLog();

  const probation: ProbationState = {
    active: true,
    startedAt: new Date().toISOString(),
    reasonCodes: ['RECENT_CORRECTION'],
    minStableDurationMs: 86_400_000,
  };

  // D1: probation blocks canonical mutation
  const probState = makeState({
    band: 'MEDIUM', finalScore: 75,
    probationState: probation,
    rightsProfile: makeRights({ canonicalMutation: 'CONDITIONAL' }),
  });
  const d1 = evaluateConfidenceGate({
    canonicalId: 'ast_prob', objectType: 'ASSET', requestedUse: 'CANONICAL_MUTATION',
    missionCritical: false, confidenceState: probState,
  });
  assert(d1.allowed === false, 'D1: probation blocks mutation');
  assert(d1.reasons.some(r => r.includes('PROBATION')), 'D1: reason mentions probation');

  // D2: probation blocks graph when not ALLOW
  const d2 = canUseForGraphRelation('ast_prob', 'ASSET', probState);
  assert(d2.allowed === false, 'D2: probation blocks non-ALLOW graph');

  // D3: probation on HIGH allows scoring (since base right is ALLOW)
  const probHighState = makeState({
    band: 'HIGH', finalScore: 88,
    probationState: probation,
    rightsProfile: makeRights(),
  });
  const d3 = canUseForScoring('ast_prob', 'ASSET', probHighState);
  assert(d3.allowed === true, 'D3: probation HIGH still allows scoring');

  // D4: probation blocks stable identity requirement
  const d4 = evaluateConfidenceGate({
    canonicalId: 'ast_prob', objectType: 'ASSET', requestedUse: 'GRAPH_RELATION',
    missionCritical: false, confidenceState: probState,
    evaluationContext: { requireStableIdentity: true },
  });
  assert(d4.allowed === false, 'D4: probation blocks stable identity');

  // D5: probation affects graph even when ALLOW — requireStableIdentity via wrapper
  const probAllowGraph = makeState({
    band: 'HIGH', finalScore: 90,
    probationState: probation,
    rightsProfile: makeRights({ graphRelations: 'ALLOW' }),
  });
  const d5 = canUseForGraphRelation('ast_prob', 'ASSET', probAllowGraph, { requireStableIdentity: true });
  assert(d5.allowed === false, 'D5: requireStableIdentity + probation denies even ALLOW');

  // D6: no probation — graph ALLOW goes through
  const noProbState = makeState({
    band: 'HIGH', finalScore: 90,
    rightsProfile: makeRights({ graphRelations: 'ALLOW' }),
  });
  const d6 = canUseForGraphRelation('ast_ok', 'ASSET', noProbState, { requireStableIdentity: true });
  assert(d6.allowed === true, 'D6: no probation + ALLOW graph allowed');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║     L3.3-B — Confidence Gate Enforcement Suite                ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');

sectionA();
sectionB();
sectionC();
sectionD();

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  TOTAL: ${pass + fail}  |  ✅ ${pass}  |  ❌ ${fail}`);
if (fail > 0) {
  console.error(`\n  ⛔ ${fail} assertion(s) failed.`);
  process.exit(1);
} else {
  console.log('\n  ✅ All L3.3-B confidence gate tests passed.');
}
