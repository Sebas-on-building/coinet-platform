/**
 * L2.7 — Fallback Semantics
 *
 * A fallback is not a transport event. It is a change in epistemic rights.
 * Fallback outcome must be classified by equivalence class, not by
 * operational success.
 */

export const L27_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BLIND-SPOT TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════════

export type BlindSpotScope =
  | 'FIELD'
  | 'FIELD_FAMILY'
  | 'SOURCE_CLASS'
  | 'REQUEST'
  | 'TRACE'
  | 'GLOBAL_REPLAY_CONTEXT';

export type BlindSpotCause =
  | 'OWNER_FAILURE'
  | 'CONFIRMER_FAILURE'
  | 'FALLBACK_ROUTE_CHANGE'
  | 'FRESHNESS_LOSS'
  | 'SEMANTIC_MISMATCH'
  | 'PARTIAL_NORMALIZATION'
  | 'REPLAY_ISOLATION'
  | 'TRACE_BREAK'
  | 'ROUTE_RESTORATION_PROBATION';

export type BlindSpotClaimConstraint =
  | 'DISPLAY_CONSTRAINED'
  | 'SCORING_CONSTRAINED'
  | 'SCENARIO_CONFIRMATION_BLOCKED'
  | 'CONTRADICTION_WEIGHT_REDUCED'
  | 'DIRECTIONAL_CLAIM_BLOCKED'
  | 'IDENTITY_ASSERTION_BLOCKED'
  | 'SAFETY_VERDICT_BLOCKED'
  | 'REPLAY_ONLY';

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK EQUIVALENCE CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export type FallbackEquivalence =
  | 'FULLY_EQUIVALENT'
  | 'NEAR_EQUIVALENT'
  | 'DEGRADED_EQUIVALENT'
  | 'PARTIAL_ONLY'
  | 'NON_EQUIVALENT'
  | 'PROHIBITED';

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK SEMANTICS RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export interface FallbackSemanticsRecord {
  requestId: string;
  traceId: string;
  originalRouteId: string;
  fallbackRouteId: string;
  fieldFamily: string;

  equivalence: FallbackEquivalence;

  whatWasLost: string[];
  whatRemained: string[];
  semanticLoss: string[];
  partialFields: string[];

  claimConstraints: BlindSpotClaimConstraint[];
  disclosureRequired: boolean;
  disclosureText: string;
  reasonCodes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FallbackEvalInput {
  requestId: string;
  traceId: string;
  originalRouteId: string;
  originalRouteMode: string;
  fallbackRouteId: string;
  fallbackRouteMode: string;
  fieldFamily: string;
  originalConnector: string;
  fallbackConnector: string;
  originalRouteState: string;
  fallbackRouteState: string;
  originalProvenanceScore: number;
  fallbackProvenanceScore: number;
  fallbackBlindSpots: string[];
}

export function evaluateFallbackSemantics(input: FallbackEvalInput): FallbackSemanticsRecord {
  const equivalence = classifyEquivalence(input);
  const whatWasLost = deriveWhatWasLost(input, equivalence);
  const whatRemained = deriveWhatRemained(input, equivalence);
  const semanticLoss = deriveSemanticLoss(input, equivalence);
  const partialFields = derivePartialFields(input, equivalence);
  const constraints = deriveConstraints(equivalence, input.fieldFamily);
  const disclosureRequired = equivalence !== 'FULLY_EQUIVALENT';
  const disclosureText = generateDisclosure(input, equivalence, semanticLoss);

  return {
    requestId: input.requestId,
    traceId: input.traceId,
    originalRouteId: input.originalRouteId,
    fallbackRouteId: input.fallbackRouteId,
    fieldFamily: input.fieldFamily,
    equivalence,
    whatWasLost,
    whatRemained,
    semanticLoss,
    partialFields,
    claimConstraints: constraints,
    disclosureRequired,
    disclosureText,
    reasonCodes: buildReasonCodes(input, equivalence),
  };
}

function classifyEquivalence(input: FallbackEvalInput): FallbackEquivalence {
  if (input.originalRouteMode === input.fallbackRouteMode &&
      input.originalConnector === input.fallbackConnector) {
    return 'FULLY_EQUIVALENT';
  }

  if (input.fallbackRouteState === 'R5_PROHIBITED') return 'PROHIBITED';

  const provDelta = input.originalProvenanceScore - input.fallbackProvenanceScore;

  if (input.originalRouteMode === input.fallbackRouteMode && provDelta < 0.1) {
    return 'NEAR_EQUIVALENT';
  }

  if (input.originalRouteMode === 'REALTIME' && input.fallbackRouteMode === 'SCHEDULED') {
    return provDelta > 0.4 ? 'PARTIAL_ONLY' : 'DEGRADED_EQUIVALENT';
  }

  if (input.originalRouteMode === 'REALTIME' && input.fallbackRouteMode === 'BACKFILL') {
    return 'NON_EQUIVALENT';
  }

  if (input.fallbackBlindSpots.length > 2) {
    return 'PARTIAL_ONLY';
  }

  if (provDelta > 0.3) return 'DEGRADED_EQUIVALENT';

  return 'NEAR_EQUIVALENT';
}

function deriveWhatWasLost(input: FallbackEvalInput, eq: FallbackEquivalence): string[] {
  const lost: string[] = [];
  if (eq === 'FULLY_EQUIVALENT') return lost;

  if (input.originalRouteMode !== input.fallbackRouteMode) {
    lost.push(`Route mode: ${input.originalRouteMode} → ${input.fallbackRouteMode}`);
  }
  if (input.originalRouteMode === 'REALTIME' && input.fallbackRouteMode !== 'REALTIME') {
    lost.push('Realtime visibility');
    lost.push('Sequence-sensitive ordering guarantees');
  }
  if (input.originalConnector !== input.fallbackConnector) {
    lost.push(`Primary connector: ${input.originalConnector}`);
  }
  for (const bs of input.fallbackBlindSpots) {
    lost.push(`Blind spot introduced: ${bs}`);
  }
  return lost;
}

function deriveWhatRemained(input: FallbackEvalInput, eq: FallbackEquivalence): string[] {
  const remained: string[] = [];
  remained.push(`Field family: ${input.fieldFamily}`);
  if (eq !== 'NON_EQUIVALENT' && eq !== 'PROHIBITED') {
    remained.push(`Fallback connector: ${input.fallbackConnector}`);
    remained.push(`Fallback route mode: ${input.fallbackRouteMode}`);
  }
  if (eq === 'FULLY_EQUIVALENT' || eq === 'NEAR_EQUIVALENT') {
    remained.push('Core field truth preserved');
  }
  return remained;
}

function deriveSemanticLoss(input: FallbackEvalInput, eq: FallbackEquivalence): string[] {
  if (eq === 'FULLY_EQUIVALENT') return [];
  const loss: string[] = [];
  if (input.originalRouteMode === 'REALTIME' && input.fallbackRouteMode !== 'REALTIME') {
    loss.push('Sequence integrity');
    loss.push('Event ordering confidence');
  }
  if (eq === 'PARTIAL_ONLY') loss.push('Partial field coverage only');
  if (eq === 'NON_EQUIVALENT') loss.push('Truth-kind changed — not legal replacement');
  if (eq === 'DEGRADED_EQUIVALENT') loss.push('Provenance quality reduced');
  return loss;
}

function derivePartialFields(input: FallbackEvalInput, eq: FallbackEquivalence): string[] {
  if (eq === 'PARTIAL_ONLY') return [input.fieldFamily];
  return [];
}

function deriveConstraints(eq: FallbackEquivalence, _fieldFamily: string): BlindSpotClaimConstraint[] {
  switch (eq) {
    case 'FULLY_EQUIVALENT': return [];
    case 'NEAR_EQUIVALENT': return ['DISPLAY_CONSTRAINED'];
    case 'DEGRADED_EQUIVALENT': return ['SCORING_CONSTRAINED', 'CONTRADICTION_WEIGHT_REDUCED'];
    case 'PARTIAL_ONLY': return ['SCORING_CONSTRAINED', 'SCENARIO_CONFIRMATION_BLOCKED', 'DIRECTIONAL_CLAIM_BLOCKED'];
    case 'NON_EQUIVALENT': return ['DIRECTIONAL_CLAIM_BLOCKED', 'IDENTITY_ASSERTION_BLOCKED', 'SAFETY_VERDICT_BLOCKED'];
    case 'PROHIBITED': return ['DIRECTIONAL_CLAIM_BLOCKED', 'IDENTITY_ASSERTION_BLOCKED', 'SAFETY_VERDICT_BLOCKED', 'REPLAY_ONLY'];
  }
}

function generateDisclosure(input: FallbackEvalInput, eq: FallbackEquivalence, semanticLoss: string[]): string {
  if (eq === 'FULLY_EQUIVALENT') return '';
  const lossStr = semanticLoss.length > 0 ? ` Lost: ${semanticLoss.join(', ')}.` : '';
  return `Fallback from ${input.originalRouteMode} to ${input.fallbackRouteMode} for ${input.fieldFamily}. Equivalence: ${eq}.${lossStr}`;
}

function buildReasonCodes(input: FallbackEvalInput, eq: FallbackEquivalence): string[] {
  const codes: string[] = [`FALLBACK_EQ_${eq}`];
  if (input.originalRouteMode !== input.fallbackRouteMode) codes.push('ROUTE_MODE_CHANGE');
  if (input.fallbackBlindSpots.length > 0) codes.push('FALLBACK_BLIND_SPOTS');
  return codes;
}
