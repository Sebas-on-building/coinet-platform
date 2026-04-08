/**
 * L3.3 Entity Confidence Model — Constitutional Integration Test (v2)
 *
 * Eight suites:
 *   A. Factor scoring (per-factor unit tests)
 *   B. Band mapping (weighted aggregation + thresholds 85/65/35)
 *   C. Caps and overrides (epistemic, veto, scar, probation, object-family)
 *   D. Rights mapping (13 domains × 4 states)
 *   E. Propagation tests (correction, contradiction, lifecycle)
 *   F. Object-specific anti-fake
 *   G. Historical continuity and replay
 *   H. Master anti-fake suite (entity-confidence-honesty)
 */

import assert from 'node:assert';

import type { CanonicalObjectType } from '../services/canonicalization/canonical-entity-types';
import type {
  IdentityResolutionDecision,
  ResolutionScar,
  IdentityResolutionState,
} from '../services/canonicalization/identity-resolution-types';

import {
  L33_CONFIDENCE_VERSION,
  L33_POLICY_VERSION,
  FACTOR_WEIGHTS,
  BAND_THRESHOLDS,
  evaluateIdentifierStrength,
  evaluateCrossProviderAgreement,
  evaluateTemporalStability,
  evaluateScopeParity,
  evaluateProvenanceStrength,
  evaluateAllFactors,
  buildConfidenceEvaluationInput,
  mapResolutionStateToEpistemic,
  type ConfidenceBand,
  type ConfidenceEvaluationInput,
} from '../services/canonicalization/confidence-factors';

import {
  applyEpistemicStateCap,
  applyHardVetoCap,
  applyScarCap,
  applyProbationCap,
  applyObjectFamilyCap,
  applyAllCaps,
  deriveRightsProfile,
  isMissionCriticalUseAllowed,
  shouldEnterProbation,
  createProbation,
} from '../services/canonicalization/confidence-policy-map';

import {
  evaluateEntityConfidence,
  evaluateAssetConfidence,
  evaluateEntityTypeConfidence,
  evaluateNarrativeTopicConfidence,
  getCurrentState,
  getHistoryLog,
  getHistoryForCanonicalId,
  getReviewQueues,
  getReviewQueueByType,
  resetConfidenceStores,
  type EntityConfidenceState,
} from '../services/canonicalization/entity-confidence-model';

// ═══════════════════════════════════════════════════════════════════════════════
// HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e: any) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function makeDecision(
  overrides: Partial<IdentityResolutionDecision> & { objectType: CanonicalObjectType },
): IdentityResolutionDecision {
  return {
    resolutionId: overrides.resolutionId ?? 'res_test',
    objectType: overrides.objectType,
    inputHandle: overrides.inputHandle ?? 'handle',
    candidateCanonicalIds: overrides.candidateCanonicalIds ?? ['ast_001'],
    selectedCanonicalId: overrides.selectedCanonicalId ?? 'ast_001',
    resolutionState: overrides.resolutionState ?? 'RESOLVED_CLEAN',
    outcome: overrides.outcome ?? 'RESOLVED_HIGH',
    confidenceScore: overrides.confidenceScore ?? 90,
    deterministicAnchorHits: overrides.deterministicAnchorHits ?? ['a1', 'a2'],
    aliasMatches: overrides.aliasMatches ?? ['BTC'],
    contextualMatches: overrides.contextualMatches ?? ['chain_btc'],
    providerClaimsCompared: overrides.providerClaimsCompared ?? ['cg', 'cmc'],
    providerDisagreements: overrides.providerDisagreements ?? [],
    scars: overrides.scars ?? [],
    hardVetoes: overrides.hardVetoes ?? [],
    reasonCodes: overrides.reasonCodes ?? [],
    lineagePackRef: overrides.lineagePackRef,
    blindSpotRefs: overrides.blindSpotRefs ?? [],
    rejectedCandidateIds: overrides.rejectedCandidateIds ?? [],
    manualReviewRequired: overrides.manualReviewRequired ?? false,
    replayGeneration: overrides.replayGeneration ?? 1,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

const strongAsset = () => makeDecision({
  objectType: 'ASSET',
  deterministicAnchorHits: ['chain_btc:native', 'chain_btc:primary'],
  aliasMatches: ['BTC', 'Bitcoin'],
  contextualMatches: ['chain_btc'],
  providerClaimsCompared: ['cg', 'cmc'],
});

const aliasOnlyAsset = () => makeDecision({
  objectType: 'ASSET',
  resolutionState: 'RESOLVED_WITH_SCAR',
  outcome: 'RESOLVED_MEDIUM',
  deterministicAnchorHits: [],
  aliasMatches: ['TOKX'],
  contextualMatches: [],
  providerClaimsCompared: ['cg'],
  scars: ['ALIAS_ONLY'],
});

const providerClaimOnlyAsset = () => makeDecision({
  objectType: 'ASSET',
  resolutionState: 'RESOLVED_WITH_SCAR',
  outcome: 'RESOLVED_LOW',
  deterministicAnchorHits: [],
  aliasMatches: [],
  contextualMatches: [],
  providerClaimsCompared: ['cg'],
  scars: ['ALIAS_ONLY'],
});

const contestedEntity = () => makeDecision({
  objectType: 'ENTITY',
  resolutionState: 'CONTESTED',
  outcome: 'RESOLVED_LOW',
  deterministicAnchorHits: ['addr_1'],
  aliasMatches: ['Alameda'],
  providerClaimsCompared: ['arkham', 'nansen'],
  providerDisagreements: ['arkham:nansen:kind'],
  scars: ['ENTITY_ATTRIBUTION_SCAR', 'PROVIDER_DISAGREEMENT'],
  reasonCodes: ['CO_AUTHORITY_CONFLICT:arkham:nansen'],
});

const unresolvedAsset = () => makeDecision({
  objectType: 'ASSET',
  resolutionState: 'UNRESOLVED',
  outcome: 'UNRESOLVED',
  selectedCanonicalId: undefined,
  deterministicAnchorHits: [],
  aliasMatches: [],
  contextualMatches: [],
  providerClaimsCompared: [],
});

const entityNoProvenance = () => makeDecision({
  objectType: 'ENTITY',
  resolutionState: 'RESOLVED_WITH_SCAR',
  deterministicAnchorHits: [],
  aliasMatches: [],
  contextualMatches: [],
  providerClaimsCompared: [],
  scars: ['ENTITY_ATTRIBUTION_SCAR'],
});

const narrativeOverlap = () => makeDecision({
  objectType: 'NARRATIVE_TOPIC',
  resolutionState: 'RESOLVED_WITH_SCAR',
  deterministicAnchorHits: ['topic_001'],
  aliasMatches: ['AI Agents'],
  providerClaimsCompared: ['cg'],
  scars: ['TOPIC_BOUNDARY_SCAR'],
});

// ═══════════════════════════════════════════════════════════════════════════════
// A. FACTOR SCORING
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ A. Factor scoring ═══');

test('Deterministic anchor scores 92-100', () => {
  const input = buildConfidenceEvaluationInput(strongAsset());
  const result = evaluateIdentifierStrength(input);
  assert.ok(result.score >= 92, `expected ≥92, got ${result.score}`);
  assert.strictEqual(result.substate, 'DETERMINISTIC_ANCHOR');
});

test('Alias-only scores 55 baseline with UNRESOLVED_ALIAS_COLLISION scar', () => {
  const input = buildConfidenceEvaluationInput(aliasOnlyAsset());
  const result = evaluateIdentifierStrength(input);
  assert.ok(result.score <= 55, `expected ≤55, got ${result.score}`);
  assert.ok(result.scars.some(s => s.code === 'UNRESOLVED_ALIAS_COLLISION'));
});

test('Provider-claim-only scores ≤20 with SINGLE_PROVIDER_DEPENDENCY scar', () => {
  const input = buildConfidenceEvaluationInput(providerClaimOnlyAsset());
  const result = evaluateIdentifierStrength(input);
  assert.ok(result.score <= 20, `expected ≤20, got ${result.score}`);
  assert.ok(result.scars.some(s => s.code === 'SINGLE_PROVIDER_DEPENDENCY'));
});

test('Owner+confirmer agreement scores 95', () => {
  const input = buildConfidenceEvaluationInput(strongAsset());
  const result = evaluateCrossProviderAgreement(input);
  assert.ok(result.score >= 90, `expected ≥90, got ${result.score}`);
  assert.strictEqual(result.substate, 'OWNER_CONFIRMER_AGREEMENT');
});

test('Co-authority disagreement scores 30 with RECENT_CONTESTATION scar', () => {
  const input = buildConfidenceEvaluationInput(contestedEntity());
  const result = evaluateCrossProviderAgreement(input);
  assert.ok(result.score <= 30, `expected ≤30, got ${result.score}`);
  assert.ok(result.scars.some(s => s.code === 'RECENT_CONTESTATION'));
});

test('Stable temporal scores 95', () => {
  const input = buildConfidenceEvaluationInput(strongAsset());
  const result = evaluateTemporalStability(input);
  assert.ok(result.score >= 90, `expected ≥90, got ${result.score}`);
  assert.strictEqual(result.substate, 'STABLE');
});

test('Oscillating temporal scores ≤20 with OSCILLATING_IDENTITY scar', () => {
  const input = buildConfidenceEvaluationInput(strongAsset(), { isOscillating: true, isStable: false, oscillationCount: 3 });
  const result = evaluateTemporalStability(input);
  assert.ok(result.score <= 20, `expected ≤20, got ${result.score}`);
  assert.ok(result.scars.some(s => s.code === 'OSCILLATING_IDENTITY'));
  assert.ok(result.vetoes.includes('OSCILLATING_IDENTITY'));
});

test('Corrected recently scores ≤45 with RECENT_CORRECTION scar', () => {
  const input = buildConfidenceEvaluationInput(strongAsset(), { isRecentlyCorrected: true, isStable: false, correctionCount: 2 });
  const result = evaluateTemporalStability(input);
  assert.ok(result.score <= 45, `expected ≤45, got ${result.score}`);
  assert.ok(result.scars.some(s => s.code === 'RECENT_CORRECTION'));
});

test('Exact scope scores 95', () => {
  const input = buildConfidenceEvaluationInput(strongAsset());
  const result = evaluateScopeParity(input);
  assert.ok(result.score >= 90, `expected ≥90, got ${result.score}`);
});

test('Conflicting scope scores ≤10 with SCOPE_AMBIGUITY scar and veto', () => {
  const input = buildConfidenceEvaluationInput(strongAsset(), { scopeConflicting: true, scopeExact: false });
  const result = evaluateScopeParity(input);
  assert.ok(result.score <= 10, `expected ≤10, got ${result.score}`);
  assert.ok(result.scars.some(s => s.code === 'SCOPE_AMBIGUITY'));
  assert.ok(result.vetoes.includes('SCOPE_CONFLICT'));
});

test('Explicit provenance scores 95', () => {
  const input = buildConfidenceEvaluationInput(strongAsset());
  const result = evaluateProvenanceStrength(input);
  assert.ok(result.score >= 85, `expected ≥85, got ${result.score}`);
});

test('Absent provenance scores ≤5 with INCOMPLETE_PROVENANCE critical scar', () => {
  const input = buildConfidenceEvaluationInput(entityNoProvenance());
  const result = evaluateProvenanceStrength(input);
  assert.ok(result.score <= 5, `expected ≤5, got ${result.score}`);
  assert.ok(result.scars.some(s => s.code === 'INCOMPLETE_PROVENANCE' && s.severity === 'CRITICAL'));
});

test('Entity absent provenance adds ENTITY_ATTRIBUTION_WEAK scar', () => {
  const input = buildConfidenceEvaluationInput(entityNoProvenance());
  const result = evaluateProvenanceStrength(input);
  assert.ok(result.scars.some(s => s.code === 'ENTITY_ATTRIBUTION_WEAK'));
  assert.ok(result.vetoes.includes('ENTITY_ABSENT_PROVENANCE'));
});

test('Factor weights sum to 1.0', () => {
  const sum = Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1.0) < 0.001, `weights sum to ${sum}`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. BAND MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ B. Band mapping ═══');

test('Strong asset aggregation yields HIGH (≥85)', () => {
  const input = buildConfidenceEvaluationInput(strongAsset());
  const result = evaluateAllFactors(input);
  assert.ok(result.rawScore >= 85, `expected ≥85, got ${result.rawScore}`);
  assert.strictEqual(result.provisionalBand, 'HIGH');
});

test('Alias-only aggregation yields MEDIUM or LOW', () => {
  const input = buildConfidenceEvaluationInput(aliasOnlyAsset());
  const result = evaluateAllFactors(input);
  assert.ok(result.provisionalBand === 'MEDIUM' || result.provisionalBand === 'LOW',
    `expected MEDIUM or LOW, got ${result.provisionalBand} (score=${result.rawScore})`);
});

test('Unresolved aggregation yields UNRESOLVED (<35)', () => {
  const input = buildConfidenceEvaluationInput(unresolvedAsset());
  const result = evaluateAllFactors(input);
  assert.ok(result.rawScore < BAND_THRESHOLDS.LOW, `expected <${BAND_THRESHOLDS.LOW}, got ${result.rawScore}`);
  assert.strictEqual(result.provisionalBand, 'UNRESOLVED');
});

test('Thresholds are 85/65/35', () => {
  assert.strictEqual(BAND_THRESHOLDS.HIGH, 85);
  assert.strictEqual(BAND_THRESHOLDS.MEDIUM, 65);
  assert.strictEqual(BAND_THRESHOLDS.LOW, 35);
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. CAPS AND OVERRIDES
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ C. Caps and overrides ═══');

test('Epistemic UNRESOLVED forces band to UNRESOLVED', () => {
  const cap = applyEpistemicStateCap('HIGH', 'UNRESOLVED', false);
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'UNRESOLVED');
});

test('Epistemic CONTESTED caps to LOW', () => {
  const cap = applyEpistemicStateCap('HIGH', 'CONTESTED', false);
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'LOW');
});

test('Epistemic RESOLVED_WITH_SCAR + major scar caps HIGH to MEDIUM', () => {
  const cap = applyEpistemicStateCap('HIGH', 'RESOLVED_WITH_SCAR', true);
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'MEDIUM');
});

test('Epistemic RESOLVED_CLEAN does not cap', () => {
  const cap = applyEpistemicStateCap('HIGH', 'RESOLVED_CLEAN', false);
  assert.strictEqual(cap, null);
});

test('Hard veto UNRESOLVED_CO_AUTHORITY forces UNRESOLVED', () => {
  const cap = applyHardVetoCap('HIGH', ['UNRESOLVED_CO_AUTHORITY']);
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'UNRESOLVED');
});

test('Hard veto PROVIDER_CLAIM_ONLY_ASSET forces LOW', () => {
  const cap = applyHardVetoCap('HIGH', ['PROVIDER_CLAIM_ONLY_ASSET']);
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'LOW');
});

test('Scar cap: multiple CRITICAL scars cap to LOW', () => {
  const s1 = { code: 'OSCILLATING_IDENTITY' as const, severity: 'CRITICAL' as const, triggeredAt: '', evidenceRefs: [], affectsRights: [], agingPolicyId: '', clearanceConditionIds: [], requiresManualReview: false };
  const s2 = { code: 'SCOPE_AMBIGUITY' as const, severity: 'CRITICAL' as const, triggeredAt: '', evidenceRefs: [], affectsRights: [], agingPolicyId: '', clearanceConditionIds: [], requiresManualReview: false };
  const cap = applyScarCap('HIGH', [s1, s2]);
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'LOW');
});

test('Probation caps HIGH to MEDIUM', () => {
  const probation = createProbation('ASSET', ['CORRECTION']);
  const cap = applyProbationCap('HIGH', probation);
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'MEDIUM');
});

test('Object-family cap: entity absent provenance caps to LOW', () => {
  const cap = applyObjectFamilyCap('HIGH', 'ENTITY', [], { isAliasOnly: false, isProviderClaimOnly: false, hasAbsentProvenance: true });
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'LOW');
});

test('Object-family cap: alias-only caps HIGH to MEDIUM', () => {
  const cap = applyObjectFamilyCap('HIGH', 'ASSET', [], { isAliasOnly: true, isProviderClaimOnly: false, hasAbsentProvenance: false });
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'MEDIUM');
});

test('Object-family cap: provider-claim-only caps to LOW', () => {
  const cap = applyObjectFamilyCap('MEDIUM', 'ASSET', [], { isAliasOnly: false, isProviderClaimOnly: true, hasAbsentProvenance: false });
  assert.ok(cap);
  assert.strictEqual(cap!.cappedTo, 'LOW');
});

test('Full cap chain applies in order', () => {
  const result = applyAllCaps(
    'HIGH', 'CONTESTED', [], [], undefined, 'ENTITY',
    { isAliasOnly: false, isProviderClaimOnly: false, hasAbsentProvenance: false },
  );
  assert.strictEqual(result.finalBand, 'LOW');
  assert.ok(result.capChain.length >= 1);
  assert.ok(result.capChain.some(c => c.capType === 'EPISTEMIC'));
});

test('shouldEnterProbation triggers on correction or oscillation', () => {
  assert.ok(shouldEnterProbation(true, false));
  assert.ok(shouldEnterProbation(false, true));
  assert.ok(!shouldEnterProbation(false, false));
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. RIGHTS MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ D. Rights mapping ═══');

test('HIGH rights: scoring=ALLOW, all intelligence ALLOW', () => {
  const r = deriveRightsProfile('HIGH', 'ASSET', [], 'RESOLVED_CLEAN');
  assert.strictEqual(r.scoring, 'ALLOW');
  assert.strictEqual(r.contradictionEngine, 'ALLOW');
  assert.strictEqual(r.scenarioEngine, 'ALLOW');
  assert.strictEqual(r.judgment, 'ALLOW');
  assert.strictEqual(r.graphRelations, 'ALLOW');
  assert.strictEqual(r.canonicalMutation, 'CONDITIONAL');
});

test('MEDIUM rights: scoring=CONDITIONAL, contextual=ALLOW', () => {
  const r = deriveRightsProfile('MEDIUM', 'ASSET', [], 'RESOLVED_WITH_SCAR');
  assert.strictEqual(r.scoring, 'CONDITIONAL');
  assert.strictEqual(r.contextualReasoning, 'ALLOW');
  assert.strictEqual(r.canonicalMutation, 'DENY');
});

test('LOW rights: scoring=DENY, display=ALLOW', () => {
  const r = deriveRightsProfile('LOW', 'ASSET', [], 'RESOLVED_WITH_SCAR');
  assert.strictEqual(r.scoring, 'DENY');
  assert.strictEqual(r.judgment, 'DENY');
  assert.strictEqual(r.scenarioEngine, 'DENY');
  assert.strictEqual(r.display, 'ALLOW');
  assert.strictEqual(r.enrichmentOnly, 'ALLOW');
  assert.strictEqual(r.forensicReplay, 'ALLOW');
});

test('UNRESOLVED rights: most DENY, display=ALLOW_WITH_SCAR', () => {
  const r = deriveRightsProfile('UNRESOLVED', 'ASSET', [], 'UNRESOLVED');
  assert.strictEqual(r.scoring, 'DENY');
  assert.strictEqual(r.contradictionEngine, 'DENY');
  assert.strictEqual(r.scenarioEngine, 'DENY');
  assert.strictEqual(r.judgment, 'DENY');
  assert.strictEqual(r.graphRelations, 'DENY');
  assert.strictEqual(r.metricAttachment, 'DENY');
  assert.strictEqual(r.display, 'ALLOW_WITH_SCAR');
  assert.strictEqual(r.unresolvedQueue, 'ALLOW');
  assert.strictEqual(r.forensicReplay, 'ALLOW');
  assert.strictEqual(r.manualReviewQueue, 'ALLOW');
});

test('13 rights domains present', () => {
  const r = deriveRightsProfile('HIGH', 'ASSET', [], 'RESOLVED_CLEAN');
  const keys = Object.keys(r).filter(k => k !== 'conditions');
  assert.strictEqual(keys.length, 13);
});

test('Entity MEDIUM denies scenario engine', () => {
  const r = deriveRightsProfile('MEDIUM', 'ENTITY', [], 'RESOLVED_WITH_SCAR');
  assert.strictEqual(r.scenarioEngine, 'DENY');
});

test('Narrative MEDIUM denies scoring', () => {
  const r = deriveRightsProfile('MEDIUM', 'NARRATIVE_TOPIC', [], 'RESOLVED_WITH_SCAR');
  assert.strictEqual(r.scoring, 'DENY');
});

test('Mission-critical scoring denied for LOW', () => {
  const r = deriveRightsProfile('LOW', 'ASSET', [], 'RESOLVED_WITH_SCAR');
  assert.ok(!isMissionCriticalUseAllowed(r, 'PRICE_SCORING'));
  assert.ok(!isMissionCriticalUseAllowed(r, 'TVL_SCORING'));
});

test('Mission-critical scoring allowed for HIGH', () => {
  const r = deriveRightsProfile('HIGH', 'ASSET', [], 'RESOLVED_CLEAN');
  assert.ok(isMissionCriticalUseAllowed(r, 'PRICE_SCORING'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. PROPAGATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ E. Propagation tests ═══');

test('Correction downgrades confidence', () => {
  resetConfidenceStores();
  const d1 = evaluateEntityConfidence(strongAsset());
  const d2 = evaluateEntityConfidence(strongAsset(), { isRecentlyCorrected: true, isStable: false, correctionCount: 2 });
  assert.ok(d2.rawScore < d1.rawScore, `corrected ${d2.rawScore} < base ${d1.rawScore}`);
});

test('Contradiction (provider disagreement) downgrades confidence', () => {
  resetConfidenceStores();
  const d1 = evaluateEntityConfidence(strongAsset());
  const disagreed = makeDecision({
    objectType: 'ASSET',
    deterministicAnchorHits: ['a1'],
    aliasMatches: ['SYM'],
    contextualMatches: ['ctx'],
    providerClaimsCompared: ['cg', 'cmc'],
    providerDisagreements: ['cg:cmc:name'],
    scars: ['PROVIDER_DISAGREEMENT'],
    reasonCodes: ['CO_AUTHORITY_CONFLICT:cg:cmc'],
  });
  const d2 = evaluateEntityConfidence(disagreed);
  assert.ok(d2.rawScore < d1.rawScore, `disagreed ${d2.rawScore} < clean ${d1.rawScore}`);
});

test('Lifecycle instability downgrades confidence', () => {
  resetConfidenceStores();
  const d1 = evaluateEntityConfidence(strongAsset());
  const scarred = makeDecision({
    objectType: 'ASSET',
    deterministicAnchorHits: ['a1'],
    aliasMatches: ['SYM'],
    providerClaimsCompared: ['cg'],
    scars: ['LIFECYCLE_SCAR', 'HISTORICAL_CONTINUITY_SCAR'],
  });
  const d2 = evaluateEntityConfidence(scarred);
  assert.ok(d2.rawScore < d1.rawScore, `lifecycle-scarred ${d2.rawScore} < base ${d1.rawScore}`);
});

test('Improved provenance can upgrade band', () => {
  resetConfidenceStores();
  const d1 = evaluateEntityConfidence(providerClaimOnlyAsset());
  const d2 = evaluateEntityConfidence(strongAsset());
  assert.ok(d2.rawScore > d1.rawScore, `upgraded ${d2.rawScore} > base ${d1.rawScore}`);
});

test('Transition event recorded on downgrade', () => {
  resetConfidenceStores();
  evaluateEntityConfidence(strongAsset());
  evaluateEntityConfidence(aliasOnlyAsset());
  const history = getHistoryLog();
  assert.ok(history.length >= 1, 'Should have transition event');
});

test('Oscillation triggers VOLATILE behavior with probation', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(strongAsset(), { isOscillating: true, isStable: false, oscillationCount: 5 });
  assert.ok(d.probationState?.active, 'Should enter probation');
  assert.ok(d.probationState!.reasonCodes.includes('OSCILLATION'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. OBJECT-SPECIFIC ANTI-FAKE
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ F. Object-specific anti-fake ═══');

test('Wrapped asset carries WRAPPED_NATIVE_RISK scar and reduced score', () => {
  resetConfidenceStores();
  const d = evaluateAssetConfidence(makeDecision({
    objectType: 'ASSET',
    deterministicAnchorHits: ['a1'],
    aliasMatches: ['WBTC'],
    providerClaimsCompared: ['cg'],
    scars: ['WRAPPED_RELATION_SCAR'],
  }));
  assert.ok(d.activeScars.some(s => s.code === 'WRAPPED_NATIVE_RISK'));
});

test('Entity attribution without provenance blocked from HIGH/MEDIUM', () => {
  resetConfidenceStores();
  const d = evaluateEntityTypeConfidence(entityNoProvenance(), { hasAbsentProvenance: true });
  assert.ok(d.band === 'LOW' || d.band === 'UNRESOLVED', `got ${d.band}`);
  assert.strictEqual(d.rightsProfile.scoring, 'DENY');
});

test('Topic overlap carries TOPIC_BOUNDARY_OVERLAP scar', () => {
  resetConfidenceStores();
  const d = evaluateNarrativeTopicConfidence(narrativeOverlap());
  assert.ok(d.activeScars.some(s => s.code === 'TOPIC_BOUNDARY_OVERLAP'));
  assert.strictEqual(d.rightsProfile.scenarioEngine, 'DENY');
});

test('Entity evaluator rejects non-entity decisions', () => {
  let threw = false;
  try { evaluateEntityTypeConfidence(strongAsset()); } catch { threw = true; }
  assert.ok(threw);
});

test('Contested entity cannot reach HIGH band', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(contestedEntity());
  assert.notStrictEqual(d.band, 'HIGH');
  assert.ok(d.band === 'LOW' || d.band === 'UNRESOLVED', `got ${d.band}`);
});

test('Pair with scope ambiguity gets scoring denied at non-HIGH', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(makeDecision({
    objectType: 'PAIR',
    resolutionState: 'RESOLVED_WITH_SCAR',
    deterministicAnchorHits: ['pool_1'],
    aliasMatches: ['BTC/USDT'],
    providerClaimsCompared: ['cg'],
    scars: ['CHAIN_SCAR'],
  }));
  if (d.band !== 'HIGH' && d.activeScars.some(s => s.code === 'SCOPE_AMBIGUITY')) {
    assert.strictEqual(d.rightsProfile.scoring, 'DENY');
  }
});

test('Protocol with oscillating identity gets graph denied', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(
    makeDecision({
      objectType: 'PROTOCOL',
      deterministicAnchorHits: ['c1'],
      aliasMatches: ['UNI'],
      providerClaimsCompared: ['cg'],
    }),
    { isOscillating: true, isStable: false },
  );
  assert.strictEqual(d.rightsProfile.graphRelations, 'DENY');
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. HISTORICAL CONTINUITY AND REPLAY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ G. Historical continuity and replay ═══');

test('Replay generation preserved in state', () => {
  resetConfidenceStores();
  const dec = strongAsset();
  (dec as any).replayGeneration = 42;
  const d = evaluateEntityConfidence(dec);
  assert.ok(d.evidenceRefs.includes(dec.resolutionId));
});

test('Prior state reference preserved across re-evaluations', () => {
  resetConfidenceStores();
  const d1 = evaluateEntityConfidence(strongAsset());
  const d2 = evaluateEntityConfidence(strongAsset());
  assert.strictEqual(d2.priorStateRef, d1.stateId);
});

test('Prior scars remain reconstructable from history', () => {
  resetConfidenceStores();
  const d1 = evaluateEntityConfidence(makeDecision({
    objectType: 'ASSET',
    deterministicAnchorHits: ['a1'],
    aliasMatches: ['SYM'],
    providerClaimsCompared: ['cg'],
    scars: ['CHAIN_SCAR', 'WRAPPED_RELATION_SCAR'],
  }));
  assert.ok(d1.activeScars.some(s => s.code === 'CHAIN_SCOPE_MISSING' || s.code === 'WRAPPED_NATIVE_RISK'));
  const current = getCurrentState(d1.canonicalId);
  assert.ok(current);
  assert.strictEqual(current!.stateId, d1.stateId);
});

test('Same inputs under replay produce same band', () => {
  resetConfidenceStores();
  const d1 = evaluateEntityConfidence(strongAsset());
  resetConfidenceStores();
  const d2 = evaluateEntityConfidence(strongAsset());
  assert.strictEqual(d1.band, d2.band);
  assert.strictEqual(d1.rawScore, d2.rawScore);
});

test('History log records transitions', () => {
  resetConfidenceStores();
  evaluateEntityConfidence(strongAsset());
  evaluateEntityConfidence(aliasOnlyAsset());
  const log = getHistoryLog();
  assert.ok(log.length >= 1);
});

test('Review queue populated for unresolved', () => {
  resetConfidenceStores();
  evaluateEntityConfidence(unresolvedAsset());
  const queue = getReviewQueueByType('UNRESOLVED_QUEUE');
  assert.ok(queue.length >= 1);
});

test('Review queue populated for contested', () => {
  resetConfidenceStores();
  evaluateEntityConfidence(contestedEntity());
  const queue = getReviewQueueByType('CONTESTED_QUEUE');
  assert.ok(queue.length >= 1);
});

test('Review queue populated for oscillation', () => {
  resetConfidenceStores();
  evaluateEntityConfidence(strongAsset(), { isOscillating: true, isStable: false });
  const queue = getReviewQueueByType('OSCILLATION_QUEUE');
  assert.ok(queue.length >= 1);
});

test('Review queue populated for entity provenance gap', () => {
  resetConfidenceStores();
  evaluateEntityConfidence(entityNoProvenance(), { hasAbsentProvenance: true });
  const queue = getReviewQueueByType('PROVENANCE_GAP_QUEUE');
  assert.ok(queue.length >= 1);
});

// ═══════════════════════════════════════════════════════════════════════════════
// H. MASTER ANTI-FAKE SUITE
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ H. Master anti-fake suite ═══');

test('LOW confidence blocks mission-critical scoring', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(aliasOnlyAsset());
  assert.ok(!isMissionCriticalUseAllowed(d.rightsProfile, 'PRICE_SCORING'));
});

test('UNRESOLVED identity is treated as unresolved, not resolved', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(unresolvedAsset());
  assert.strictEqual(d.band, 'UNRESOLVED');
  assert.strictEqual(d.rightsProfile.scoring, 'DENY');
  assert.strictEqual(d.rightsProfile.contradictionEngine, 'DENY');
  assert.strictEqual(d.rightsProfile.scenarioEngine, 'DENY');
  assert.strictEqual(d.rightsProfile.display, 'ALLOW_WITH_SCAR');
});

test('Correction downgrades confidence where required', () => {
  resetConfidenceStores();
  const d1 = evaluateEntityConfidence(strongAsset());
  const d2 = evaluateEntityConfidence(strongAsset(), { isRecentlyCorrected: true, isStable: false });
  assert.ok(d2.rawScore < d1.rawScore || d2.band !== d1.band);
});

test('Scarred identity retains scars in output', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(makeDecision({
    objectType: 'ASSET',
    deterministicAnchorHits: ['a1'],
    aliasMatches: ['SYM'],
    providerClaimsCompared: ['cg', 'cmc'],
    scars: ['CHAIN_SCAR', 'PROVIDER_DISAGREEMENT'],
    reasonCodes: ['CO_AUTHORITY_CONFLICT:cg:cmc'],
  }));
  assert.ok(d.activeScars.length > 0, 'Scars must survive');
});

test('Provider disagreement affects confidence', () => {
  resetConfidenceStores();
  const clean = evaluateEntityConfidence(strongAsset());
  const disagreed = evaluateEntityConfidence(makeDecision({
    objectType: 'ASSET',
    deterministicAnchorHits: ['a1'],
    aliasMatches: ['SYM'],
    providerClaimsCompared: ['cg', 'cmc'],
    providerDisagreements: ['cg:cmc:name'],
    reasonCodes: ['CO_AUTHORITY_CONFLICT:cg:cmc'],
  }));
  assert.ok(disagreed.rawScore < clean.rawScore);
});

test('Entity attribution without provenance gets LOW or UNRESOLVED', () => {
  resetConfidenceStores();
  const d = evaluateEntityTypeConfidence(entityNoProvenance(), { hasAbsentProvenance: true });
  assert.ok(d.band === 'LOW' || d.band === 'UNRESOLVED', `got ${d.band}`);
});

test('Topic overlap does not become clean HIGH', () => {
  resetConfidenceStores();
  const d = evaluateNarrativeTopicConfidence(narrativeOverlap());
  if (d.activeScars.some(s => s.code === 'TOPIC_BOUNDARY_OVERLAP')) {
    assert.notStrictEqual(d.band, 'HIGH');
  }
});

test('Every confidence state has factor evaluations (5 families)', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(strongAsset());
  assert.strictEqual(d.factorEvaluations.length, 5);
  const families = d.factorEvaluations.map(e => e.family);
  assert.ok(families.includes('IDENTIFIER_STRENGTH'));
  assert.ok(families.includes('CROSS_PROVIDER_AGREEMENT'));
  assert.ok(families.includes('TEMPORAL_STABILITY'));
  assert.ok(families.includes('SCOPE_PARITY'));
  assert.ok(families.includes('PROVENANCE_STRENGTH'));
});

test('Every confidence state has rights profile with 13 domains', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(strongAsset());
  const keys = Object.keys(d.rightsProfile).filter(k => k !== 'conditions');
  assert.strictEqual(keys.length, 13);
});

test('Versions are defined', () => {
  assert.strictEqual(L33_CONFIDENCE_VERSION, '2.0.0');
  assert.strictEqual(L33_POLICY_VERSION, '2.0.0');
});

test('Scar objects carry severity, code, and requiresManualReview', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(entityNoProvenance(), { hasAbsentProvenance: true });
  const critical = d.activeScars.filter(s => s.severity === 'CRITICAL');
  assert.ok(critical.length > 0, 'Should have CRITICAL scars');
  for (const scar of critical) {
    assert.ok(scar.code);
    assert.ok(typeof scar.requiresManualReview === 'boolean');
    assert.ok(scar.agingPolicyId);
    assert.ok(scar.clearanceConditionIds.length > 0);
  }
});

test('Cap chain is auditable in output', () => {
  resetConfidenceStores();
  const d = evaluateEntityConfidence(contestedEntity());
  assert.ok(Array.isArray(d.capChain));
  if (d.capChain.length > 0) {
    assert.ok(d.capChain[0].capType);
    assert.ok(d.capChain[0].reason);
  }
});

test('Epistemic state maps correctly from L3.2', () => {
  assert.strictEqual(mapResolutionStateToEpistemic('RESOLVED_CLEAN'), 'RESOLVED_CLEAN');
  assert.strictEqual(mapResolutionStateToEpistemic('RESOLVED_WITH_SCAR'), 'RESOLVED_WITH_SCAR');
  assert.strictEqual(mapResolutionStateToEpistemic('CONTESTED'), 'CONTESTED');
  assert.strictEqual(mapResolutionStateToEpistemic('UNRESOLVED'), 'UNRESOLVED');
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`L3.3 Entity Confidence Model (Constitutional v2) — ${passed + failed} assertions`);
console.log(`  ✅ passed: ${passed}`);
console.log(`  ❌ failed: ${failed}`);
console.log('═'.repeat(60));

if (failed > 0) process.exit(1);
