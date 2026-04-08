/**
 * L3.3 — Entity Confidence Model: Factor System (Constitutional v2)
 *
 * Five factor families evaluate identity reliability from structured evidence.
 * Each factor returns a FactorEvaluation with score 0–100, substates, typed
 * scars, vetoes, and evidence refs. Factors are weighted and aggregated.
 *
 * Weights: identifier 0.30, agreement 0.25, temporal 0.15, scope 0.15, provenance 0.15
 * Bands:  HIGH ≥ 85, MEDIUM ≥ 65, LOW ≥ 35, UNRESOLVED < 35
 *
 * Constitutional axiom: confidence is not presentation — it is permission.
 */

import type { CanonicalObjectType } from './canonical-entity-types';
import type {
  IdentityResolutionDecision,
  IdentityResolutionState,
  ResolutionScar,
} from './identity-resolution-types';

export const L33_CONFIDENCE_VERSION = '2.0.0' as const;
export const L33_POLICY_VERSION = '2.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

export type ConfidenceRightDecision = 'ALLOW' | 'ALLOW_WITH_SCAR' | 'CONDITIONAL' | 'DENY';

export type ConfidenceEpistemicState =
  | 'RESOLVED_CLEAN'
  | 'RESOLVED_WITH_SCAR'
  | 'CONTESTED'
  | 'UNRESOLVED';

export type ConfidenceFactorFamily =
  | 'IDENTIFIER_STRENGTH'
  | 'CROSS_PROVIDER_AGREEMENT'
  | 'TEMPORAL_STABILITY'
  | 'SCOPE_PARITY'
  | 'PROVENANCE_STRENGTH';

export type ConfidenceScarCode =
  | 'RECENT_CORRECTION'
  | 'PRIOR_FALSE_MERGE_RISK'
  | 'UNRESOLVED_ALIAS_COLLISION'
  | 'INCOMPLETE_PROVENANCE'
  | 'OWNER_CONFIRMER_GAP'
  | 'SCOPE_AMBIGUITY'
  | 'OSCILLATING_IDENTITY'
  | 'SINGLE_PROVIDER_DEPENDENCY'
  | 'TRACE_INCOMPLETE'
  | 'RECENT_CONTESTATION'
  | 'TOPIC_BOUNDARY_OVERLAP'
  | 'ENTITY_ATTRIBUTION_WEAK'
  | 'CHAIN_SCOPE_MISSING'
  | 'WRAPPED_NATIVE_RISK'
  | 'PROTOCOL_TOKEN_OVERLAP';

export type ScarSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ConfidenceScar {
  code: ConfidenceScarCode;
  severity: ScarSeverity;
  triggeredAt: string;
  evidenceRefs: string[];
  affectsRights: string[];
  agingPolicyId: string;
  clearanceConditionIds: string[];
  requiresManualReview: boolean;
}

export interface FactorEvaluation {
  family: ConfidenceFactorFamily;
  substate: string;
  score: number;
  flags: string[];
  scars: ConfidenceScar[];
  vetoes: string[];
  evidenceRefs: string[];
  rationale: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const FACTOR_WEIGHTS: Readonly<Record<ConfidenceFactorFamily, number>> = {
  IDENTIFIER_STRENGTH: 0.30,
  CROSS_PROVIDER_AGREEMENT: 0.25,
  TEMPORAL_STABILITY: 0.15,
  SCOPE_PARITY: 0.15,
  PROVENANCE_STRENGTH: 0.15,
};

export const BAND_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 65,
  LOW: 35,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceEvaluationInput = {
  canonicalId: string;
  objectType: CanonicalObjectType;
  resolutionDecision: IdentityResolutionDecision;

  hasDeterministicAnchor: boolean;
  anchorCount: number;
  hasMultipleAlignedAnchors: boolean;
  isAliasOnly: boolean;
  isContextualInferenceOnly: boolean;
  isProviderClaimOnly: boolean;
  symbolCollisionRisk: boolean;
  chainOmission: boolean;
  wrappedNativeAmbiguity: boolean;

  ownerAgreement: boolean;
  confirmerAgreement: boolean;
  ownerConfirmerAligned: boolean;
  singleProviderOnly: boolean;
  providerAgreementCount: number;
  providerDisagreementCount: number;
  hasCoAuthorityDisagreement: boolean;
  unresolvedDivergence: boolean;

  isStable: boolean;
  isRecentlyChanged: boolean;
  isRecentlyCorrected: boolean;
  isOscillating: boolean;
  correctionCount: number;
  oscillationCount: number;

  scopeExact: boolean;
  scopePartialMismatch: boolean;
  scopeAmbiguous: boolean;
  scopeConflicting: boolean;

  hasExplicitProvenance: boolean;
  hasPartialProvenance: boolean;
  hasInferredProvenance: boolean;
  hasAbsentProvenance: boolean;
  traceComplete: boolean;
  lineageComplete: boolean;
  blindSpotCount: number;

  priorConfidenceStateRef?: string;
  priorBand?: ConfidenceBand;

  evidenceRefs: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCAR CONSTRUCTION HELPER
// ═══════════════════════════════════════════════════════════════════════════════

export function makeScar(
  code: ConfidenceScarCode,
  severity: ScarSeverity,
  evidenceRefs: string[],
  affectsRights: string[] = [],
  requiresManualReview = false,
): ConfidenceScar {
  return {
    code,
    severity,
    triggeredAt: new Date().toISOString(),
    evidenceRefs,
    affectsRights,
    agingPolicyId: `aging_default_${severity.toLowerCase()}`,
    clearanceConditionIds: [`clear_${code.toLowerCase()}`],
    requiresManualReview,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT BUILDER — extract signals from L3.2 decision
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceInputOverrides = Partial<Omit<ConfidenceEvaluationInput, 'resolutionDecision' | 'canonicalId' | 'objectType'>>;

export function buildConfidenceEvaluationInput(
  decision: IdentityResolutionDecision,
  overrides?: ConfidenceInputOverrides,
): ConfidenceEvaluationInput {
  const scarSet = new Set(decision.scars);
  const hasAnchor = decision.deterministicAnchorHits.length > 0;
  const aliasCount = decision.aliasMatches.length;
  const contextCount = decision.contextualMatches.length;
  const provClaimCount = decision.providerClaimsCompared.length;

  const isAliasOnly = !hasAnchor && aliasCount > 0 && contextCount === 0 && provClaimCount <= 1;
  const isCtxOnly = !hasAnchor && aliasCount === 0 && contextCount > 0;
  const isProvOnly = !hasAnchor && aliasCount === 0 && contextCount === 0 && provClaimCount > 0;

  let provenanceLevel: 'EXPLICIT' | 'PARTIAL' | 'INFERRED' | 'ABSENT';
  if (hasAnchor && provClaimCount >= 2 && decision.blindSpotRefs.length === 0) {
    provenanceLevel = 'EXPLICIT';
  } else if ((hasAnchor || provClaimCount >= 1) && (aliasCount > 0 || contextCount > 0)) {
    provenanceLevel = 'PARTIAL';
  } else if (aliasCount > 0 || contextCount > 0 || provClaimCount > 0) {
    provenanceLevel = 'INFERRED';
  } else {
    provenanceLevel = 'ABSENT';
  }

  const base: ConfidenceEvaluationInput = {
    canonicalId: decision.selectedCanonicalId ?? decision.inputHandle,
    objectType: decision.objectType,
    resolutionDecision: decision,

    hasDeterministicAnchor: hasAnchor,
    anchorCount: decision.deterministicAnchorHits.length,
    hasMultipleAlignedAnchors: decision.deterministicAnchorHits.length >= 2,
    isAliasOnly,
    isContextualInferenceOnly: isCtxOnly,
    isProviderClaimOnly: isProvOnly,
    symbolCollisionRisk: scarSet.has('CHAIN_SCAR') || decision.reasonCodes.some(r => r.includes('COLLISION')),
    chainOmission: scarSet.has('CHAIN_SCAR'),
    wrappedNativeAmbiguity: scarSet.has('WRAPPED_RELATION_SCAR'),

    ownerAgreement: provClaimCount >= 1,
    confirmerAgreement: provClaimCount >= 2 && decision.providerDisagreements.length === 0,
    ownerConfirmerAligned: provClaimCount >= 2 && decision.providerDisagreements.length === 0,
    singleProviderOnly: provClaimCount <= 1,
    providerAgreementCount: Math.max(0, provClaimCount - decision.providerDisagreements.length),
    providerDisagreementCount: decision.providerDisagreements.length,
    hasCoAuthorityDisagreement: decision.reasonCodes.some(r => r.includes('CO_AUTHORITY')),
    unresolvedDivergence: decision.providerDisagreements.length > 1 && decision.resolutionState === 'CONTESTED',

    isStable: !scarSet.has('HISTORICAL_CONTINUITY_SCAR') && !scarSet.has('LIFECYCLE_SCAR'),
    isRecentlyChanged: scarSet.has('HISTORICAL_CONTINUITY_SCAR'),
    isRecentlyCorrected: false,
    isOscillating: false,
    correctionCount: 0,
    oscillationCount: 0,

    scopeExact: !scarSet.has('CHAIN_SCAR') && !scarSet.has('WRAPPED_RELATION_SCAR') && !scarSet.has('BRIDGED_RELATION_SCAR'),
    scopePartialMismatch: (scarSet.has('CHAIN_SCAR') || scarSet.has('WRAPPED_RELATION_SCAR')) && !scarSet.has('BRIDGED_RELATION_SCAR'),
    scopeAmbiguous: scarSet.has('CHAIN_SCAR') && scarSet.has('WRAPPED_RELATION_SCAR'),
    scopeConflicting: scarSet.has('CHAIN_SCAR') && scarSet.has('WRAPPED_RELATION_SCAR') && decision.providerDisagreements.length > 0,

    hasExplicitProvenance: provenanceLevel === 'EXPLICIT',
    hasPartialProvenance: provenanceLevel === 'PARTIAL',
    hasInferredProvenance: provenanceLevel === 'INFERRED',
    hasAbsentProvenance: provenanceLevel === 'ABSENT',
    traceComplete: decision.blindSpotRefs.length === 0,
    lineageComplete: !!decision.lineagePackRef,
    blindSpotCount: decision.blindSpotRefs.length,

    evidenceRefs: [decision.resolutionId],
  };

  if (overrides) return { ...base, ...overrides };
  return base;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR 1 — IDENTIFIER STRENGTH (weight 0.30)
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateIdentifierStrength(input: ConfidenceEvaluationInput): FactorEvaluation {
  const flags: string[] = [];
  const scars: ConfidenceScar[] = [];
  const vetoes: string[] = [];
  let score: number;
  let substate: string;

  const hasAnyEvidence = input.hasDeterministicAnchor || input.isAliasOnly || input.isContextualInferenceOnly || input.isProviderClaimOnly || input.anchorCount > 0;

  if (input.hasDeterministicAnchor) {
    substate = 'DETERMINISTIC_ANCHOR';
    score = input.hasMultipleAlignedAnchors ? 100 : 92;
  } else if (input.isAliasOnly) {
    substate = 'ALIAS_ONLY';
    score = 55;
    scars.push(makeScar('UNRESOLVED_ALIAS_COLLISION', 'MEDIUM', input.evidenceRefs, ['scoring', 'judgment']));
  } else if (input.isContextualInferenceOnly) {
    substate = 'CONTEXTUAL_INFERENCE';
    score = 35;
  } else if (input.isProviderClaimOnly) {
    substate = 'PROVIDER_CLAIM_ONLY';
    score = 20;
    scars.push(makeScar('SINGLE_PROVIDER_DEPENDENCY', 'HIGH', input.evidenceRefs, ['scoring', 'judgment', 'scenarioEngine']));
  } else if (!hasAnyEvidence) {
    substate = 'NO_EVIDENCE';
    score = 5;
  } else {
    substate = 'MIXED';
    score = 60;
  }

  if (input.symbolCollisionRisk) {
    score -= 15;
    flags.push('SYMBOL_COLLISION_RISK');
  }
  if (input.chainOmission) {
    score -= 20;
    flags.push('CHAIN_OMISSION');
    scars.push(makeScar('CHAIN_SCOPE_MISSING', 'HIGH', input.evidenceRefs, ['scoring']));
  }
  if (input.wrappedNativeAmbiguity) {
    score -= 15;
    flags.push('WRAPPED_NATIVE_AMBIGUITY');
    scars.push(makeScar('WRAPPED_NATIVE_RISK', 'HIGH', input.evidenceRefs, ['scoring', 'graphRelations']));
  }

  if (input.isProviderClaimOnly && input.objectType === 'ASSET') {
    vetoes.push('PROVIDER_CLAIM_ONLY_ASSET');
  }
  if (input.isAliasOnly && input.objectType === 'ENTITY') {
    vetoes.push('ALIAS_ONLY_ENTITY');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    family: 'IDENTIFIER_STRENGTH',
    substate, score, flags, scars, vetoes,
    evidenceRefs: input.evidenceRefs,
    rationale: `Identifier: ${substate}, anchors=${input.anchorCount}, score=${score}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR 2 — CROSS-PROVIDER AGREEMENT (weight 0.25)
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateCrossProviderAgreement(input: ConfidenceEvaluationInput): FactorEvaluation {
  const flags: string[] = [];
  const scars: ConfidenceScar[] = [];
  const vetoes: string[] = [];
  let score: number;
  let substate: string;

  if (input.hasCoAuthorityDisagreement) {
    substate = 'CO_AUTHORITY_DISAGREEMENT';
    score = 30;
    scars.push(makeScar('RECENT_CONTESTATION', 'HIGH', input.evidenceRefs, ['scoring', 'judgment', 'graphRelations'], true));
    if (input.unresolvedDivergence) {
      score = 10;
      substate = 'UNRESOLVED_DIVERGENCE';
      vetoes.push('UNRESOLVED_CO_AUTHORITY');
    }
  } else if (input.ownerConfirmerAligned) {
    substate = 'OWNER_CONFIRMER_AGREEMENT';
    score = 95;
    if (input.providerAgreementCount >= 3) score = Math.min(100, score + 5);
  } else if (input.ownerAgreement && !input.confirmerAgreement) {
    substate = 'OWNER_ONLY';
    score = 72;
    if (input.singleProviderOnly) {
      score = 60;
      substate = 'SINGLE_PROVIDER';
      scars.push(makeScar('OWNER_CONFIRMER_GAP', 'MEDIUM', input.evidenceRefs, ['judgment']));
    }
  } else if (input.singleProviderOnly && input.providerAgreementCount >= 1) {
    substate = 'SINGLE_PROVIDER';
    score = 60;
    scars.push(makeScar('SINGLE_PROVIDER_DEPENDENCY', 'MEDIUM', input.evidenceRefs, ['scoring']));
  } else if (input.providerAgreementCount === 0) {
    substate = 'NO_PROVIDER_EVIDENCE';
    score = 10;
  } else {
    substate = 'UNKNOWN_AGREEMENT';
    score = 40;
  }

  if (input.providerDisagreementCount > 0 && !input.hasCoAuthorityDisagreement) {
    score -= Math.min(20, input.providerDisagreementCount * 8);
    flags.push(`PROVIDER_DISAGREEMENT_COUNT:${input.providerDisagreementCount}`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    family: 'CROSS_PROVIDER_AGREEMENT',
    substate, score, flags, scars, vetoes,
    evidenceRefs: input.evidenceRefs,
    rationale: `Agreement: ${substate}, agree=${input.providerAgreementCount}, disagree=${input.providerDisagreementCount}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR 3 — TEMPORAL STABILITY (weight 0.15)
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateTemporalStability(input: ConfidenceEvaluationInput): FactorEvaluation {
  const flags: string[] = [];
  const scars: ConfidenceScar[] = [];
  const vetoes: string[] = [];
  let score: number;
  let substate: string;

  if (input.isOscillating) {
    substate = 'OSCILLATING';
    score = 20;
    score -= Math.min(15, input.oscillationCount * 3);
    scars.push(makeScar('OSCILLATING_IDENTITY', 'CRITICAL', input.evidenceRefs, ['scoring', 'judgment', 'scenarioEngine'], true));
    vetoes.push('OSCILLATING_IDENTITY');
  } else if (input.isRecentlyCorrected) {
    substate = 'CORRECTED_RECENTLY';
    score = 45;
    score -= Math.min(20, input.correctionCount * 5);
    scars.push(makeScar('RECENT_CORRECTION', 'HIGH', input.evidenceRefs, ['scoring']));
  } else if (input.isRecentlyChanged) {
    substate = 'RECENTLY_CHANGED';
    score = 65;
  } else if (input.isStable) {
    substate = 'STABLE';
    score = 95;
  } else {
    substate = 'UNKNOWN_TEMPORAL';
    score = 50;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    family: 'TEMPORAL_STABILITY',
    substate, score, flags, scars, vetoes,
    evidenceRefs: input.evidenceRefs,
    rationale: `Temporal: ${substate}, corrections=${input.correctionCount}, oscillations=${input.oscillationCount}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR 4 — SCOPE PARITY (weight 0.15)
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateScopeParity(input: ConfidenceEvaluationInput): FactorEvaluation {
  const flags: string[] = [];
  const scars: ConfidenceScar[] = [];
  const vetoes: string[] = [];
  let score: number;
  let substate: string;

  if (input.scopeConflicting) {
    substate = 'CONFLICTING';
    score = 10;
    scars.push(makeScar('SCOPE_AMBIGUITY', 'CRITICAL', input.evidenceRefs, ['scoring', 'graphRelations'], true));
    vetoes.push('SCOPE_CONFLICT');
  } else if (input.scopeAmbiguous) {
    substate = 'AMBIGUOUS';
    score = 40;
    scars.push(makeScar('SCOPE_AMBIGUITY', 'HIGH', input.evidenceRefs, ['scoring']));
  } else if (input.scopePartialMismatch) {
    substate = 'PARTIAL_MISMATCH';
    score = 70;
  } else if (input.scopeExact) {
    substate = 'EXACT';
    score = 95;
  } else {
    substate = 'UNKNOWN_SCOPE';
    score = 50;
  }

  if (input.wrappedNativeAmbiguity && substate !== 'CONFLICTING') {
    score -= 10;
    flags.push('WRAPPED_NATIVE_SCOPE_PENALTY');
  }

  if (input.objectType === 'NARRATIVE_TOPIC') {
    const resScarSet = new Set(input.resolutionDecision.scars);
    if (resScarSet.has('TOPIC_BOUNDARY_SCAR')) {
      score -= 15;
      scars.push(makeScar('TOPIC_BOUNDARY_OVERLAP', 'HIGH', input.evidenceRefs, ['scoring', 'scenarioEngine']));
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    family: 'SCOPE_PARITY',
    substate, score, flags, scars, vetoes,
    evidenceRefs: input.evidenceRefs,
    rationale: `Scope: ${substate}, score=${score}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR 5 — PROVENANCE STRENGTH (weight 0.15)
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateProvenanceStrength(input: ConfidenceEvaluationInput): FactorEvaluation {
  const flags: string[] = [];
  const scars: ConfidenceScar[] = [];
  const vetoes: string[] = [];
  let score: number;
  let substate: string;

  if (input.hasExplicitProvenance) {
    substate = 'EXPLICIT';
    score = 95;
    if (!input.traceComplete) { score -= 10; flags.push('TRACE_INCOMPLETE'); }
    if (!input.lineageComplete) { score -= 5; flags.push('LINEAGE_INCOMPLETE'); }
  } else if (input.hasPartialProvenance) {
    substate = 'PARTIAL';
    score = 65;
    scars.push(makeScar('INCOMPLETE_PROVENANCE', 'MEDIUM', input.evidenceRefs, ['judgment']));
  } else if (input.hasInferredProvenance) {
    substate = 'INFERRED';
    score = 35;
    scars.push(makeScar('INCOMPLETE_PROVENANCE', 'HIGH', input.evidenceRefs, ['scoring', 'judgment']));
  } else {
    substate = 'ABSENT';
    score = 5;
    scars.push(makeScar('INCOMPLETE_PROVENANCE', 'CRITICAL', input.evidenceRefs, ['scoring', 'judgment', 'graphRelations'], true));
    vetoes.push('ABSENT_PROVENANCE');
  }

  if (input.objectType === 'ENTITY' && input.hasAbsentProvenance) {
    scars.push(makeScar('ENTITY_ATTRIBUTION_WEAK', 'CRITICAL', input.evidenceRefs, ['scoring', 'judgment'], true));
    vetoes.push('ENTITY_ABSENT_PROVENANCE');
  }

  if (input.blindSpotCount > 0) {
    score -= Math.min(20, input.blindSpotCount * 5);
    scars.push(makeScar('TRACE_INCOMPLETE', 'MEDIUM', input.evidenceRefs, ['scoring']));
  }

  score = Math.max(0, Math.min(100, score));

  return {
    family: 'PROVENANCE_STRENGTH',
    substate, score, flags, scars, vetoes,
    evidenceRefs: input.evidenceRefs,
    rationale: `Provenance: ${substate}, trace=${input.traceComplete}, lineage=${input.lineageComplete}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface AggregationResult {
  rawScore: number;
  provisionalBand: ConfidenceBand;
  factorEvaluations: FactorEvaluation[];
  allScars: ConfidenceScar[];
  allVetoes: string[];
  allFlags: string[];
}

export function aggregateConfidenceFactors(evaluations: FactorEvaluation[]): AggregationResult {
  const byFamily = new Map<ConfidenceFactorFamily, FactorEvaluation>();
  for (const e of evaluations) byFamily.set(e.family, e);

  const id = byFamily.get('IDENTIFIER_STRENGTH')?.score ?? 0;
  const ag = byFamily.get('CROSS_PROVIDER_AGREEMENT')?.score ?? 0;
  const te = byFamily.get('TEMPORAL_STABILITY')?.score ?? 0;
  const sc = byFamily.get('SCOPE_PARITY')?.score ?? 0;
  const pr = byFamily.get('PROVENANCE_STRENGTH')?.score ?? 0;

  const rawScore = Math.round(
    id * FACTOR_WEIGHTS.IDENTIFIER_STRENGTH +
    ag * FACTOR_WEIGHTS.CROSS_PROVIDER_AGREEMENT +
    te * FACTOR_WEIGHTS.TEMPORAL_STABILITY +
    sc * FACTOR_WEIGHTS.SCOPE_PARITY +
    pr * FACTOR_WEIGHTS.PROVENANCE_STRENGTH,
  );

  let provisionalBand: ConfidenceBand;
  if (rawScore >= BAND_THRESHOLDS.HIGH) provisionalBand = 'HIGH';
  else if (rawScore >= BAND_THRESHOLDS.MEDIUM) provisionalBand = 'MEDIUM';
  else if (rawScore >= BAND_THRESHOLDS.LOW) provisionalBand = 'LOW';
  else provisionalBand = 'UNRESOLVED';

  const allScars = evaluations.flatMap(e => e.scars);
  const allVetoes = [...new Set(evaluations.flatMap(e => e.vetoes))];
  const allFlags = evaluations.flatMap(e => e.flags);

  return { rawScore, provisionalBand, factorEvaluations: evaluations, allScars, allVetoes, allFlags };
}

export function evaluateAllFactors(input: ConfidenceEvaluationInput): AggregationResult {
  return aggregateConfidenceFactors([
    evaluateIdentifierStrength(input),
    evaluateCrossProviderAgreement(input),
    evaluateTemporalStability(input),
    evaluateScopeParity(input),
    evaluateProvenanceStrength(input),
  ]);
}

export function mapResolutionStateToEpistemic(state: IdentityResolutionState): ConfidenceEpistemicState {
  return state as ConfidenceEpistemicState;
}
