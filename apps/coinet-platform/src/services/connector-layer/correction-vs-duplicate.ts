/**
 * L2.4 — Correction vs Duplicate Engine
 *
 * Elite ingress does not just dedup. It understands supersession.
 * A correction must never be silently absorbed as duplicate.
 * Each correction type has different downstream implications.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTION DECISION
// ═══════════════════════════════════════════════════════════════════════════════

export type CorrectionDecision =
  | 'IS_DUPLICATE'
  | 'IS_CORRECTION'
  | 'IS_NEW_VERSION'
  | 'IS_REPLAY_ARTIFACT'
  | 'UNRESOLVED_REQUIRES_MANUAL_POLICY';

// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CorrectionType =
  | 'VALUE_CORRECTION'
  | 'SCOPE_CORRECTION'
  | 'TIMING_CORRECTION'
  | 'IDENTITY_CORRECTION'
  | 'METHODOLOGY_CORRECTION';

// ═══════════════════════════════════════════════════════════════════════════════
// ADJUDICATION INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CorrectionAdjudicationInput {
  envelopeId: string;

  hasExplicitCorrectionLink: boolean;
  correctionOfEnvelopeId?: string;
  declaredCorrectionType?: CorrectionType;
  revisionNumber?: number;

  isBackfill: boolean;
  replayGeneration: number;
  priorReplayGeneration?: number;

  semanticPayloadChanged: boolean;
  timingChanged: boolean;
  scopeChanged: boolean;
  identityChanged: boolean;
  methodologyChanged: boolean;

  priorEnvelopeId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADJUDICATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CorrectionAdjudicationResult {
  decision: CorrectionDecision;
  correctionType?: CorrectionType;
  priorEnvelopeId?: string;
  reasonCodes: string[];
  downstreamInvalidation: DownstreamInvalidation;
}

export interface DownstreamInvalidation {
  invalidatePriorScoring: boolean;
  invalidatePriorCanonical: boolean;
  invalidatePriorSequence: boolean;
  invalidatePriorComparability: boolean;
  requiresManualReview: boolean;
}

const NO_INVALIDATION: DownstreamInvalidation = {
  invalidatePriorScoring: false,
  invalidatePriorCanonical: false,
  invalidatePriorSequence: false,
  invalidatePriorComparability: false,
  requiresManualReview: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ADJUDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function adjudicateCorrectionVsDuplicate(input: CorrectionAdjudicationInput): CorrectionAdjudicationResult {
  const reasons: string[] = [];

  // Gate 1 — explicit correction link
  if (input.hasExplicitCorrectionLink && input.correctionOfEnvelopeId) {
    const corrType = inferCorrectionType(input);
    reasons.push('EXPLICIT_CORRECTION_LINK');
    reasons.push(`CORRECTION_TYPE_${corrType}`);
    return {
      decision: 'IS_CORRECTION',
      correctionType: corrType,
      priorEnvelopeId: input.correctionOfEnvelopeId,
      reasonCodes: reasons,
      downstreamInvalidation: computeInvalidation(corrType),
    };
  }

  // Gate 2 — replay artifact
  if (input.isBackfill && input.priorReplayGeneration != null &&
      input.replayGeneration !== input.priorReplayGeneration) {
    reasons.push('DIFFERENT_REPLAY_GENERATION');
    return {
      decision: 'IS_REPLAY_ARTIFACT',
      priorEnvelopeId: input.priorEnvelopeId,
      reasonCodes: reasons,
      downstreamInvalidation: NO_INVALIDATION,
    };
  }

  // Gate 3 — no semantic change at all
  if (!input.semanticPayloadChanged && !input.timingChanged &&
      !input.scopeChanged && !input.identityChanged &&
      !input.methodologyChanged) {
    reasons.push('NO_SEMANTIC_CHANGE');
    return {
      decision: 'IS_DUPLICATE',
      priorEnvelopeId: input.priorEnvelopeId,
      reasonCodes: reasons,
      downstreamInvalidation: NO_INVALIDATION,
    };
  }

  // Gate 4 — revision number implies new version
  if (input.revisionNumber != null && input.revisionNumber > 1) {
    const corrType = inferCorrectionType(input);
    reasons.push('REVISION_NUMBER_ADVANCED');
    reasons.push(`INFERRED_CORRECTION_TYPE_${corrType}`);
    return {
      decision: 'IS_NEW_VERSION',
      correctionType: corrType,
      priorEnvelopeId: input.priorEnvelopeId,
      reasonCodes: reasons,
      downstreamInvalidation: computeInvalidation(corrType),
    };
  }

  // Gate 5 — semantic change without explicit correction link
  if (input.identityChanged) {
    reasons.push('IDENTITY_CHANGED_NO_EXPLICIT_LINK');
    return {
      decision: 'UNRESOLVED_REQUIRES_MANUAL_POLICY',
      priorEnvelopeId: input.priorEnvelopeId,
      reasonCodes: reasons,
      downstreamInvalidation: {
        ...NO_INVALIDATION,
        requiresManualReview: true,
        invalidatePriorCanonical: true,
      },
    };
  }

  if (input.methodologyChanged) {
    reasons.push('METHODOLOGY_CHANGED_NO_EXPLICIT_LINK');
    return {
      decision: 'UNRESOLVED_REQUIRES_MANUAL_POLICY',
      priorEnvelopeId: input.priorEnvelopeId,
      reasonCodes: reasons,
      downstreamInvalidation: {
        ...NO_INVALIDATION,
        requiresManualReview: true,
        invalidatePriorComparability: true,
      },
    };
  }

  // Semantic payload changed but no explicit correction → implicit new version
  if (input.semanticPayloadChanged) {
    const corrType = input.timingChanged ? 'TIMING_CORRECTION'
      : input.scopeChanged ? 'SCOPE_CORRECTION'
      : 'VALUE_CORRECTION';
    reasons.push('IMPLICIT_VALUE_CHANGE');
    return {
      decision: 'IS_NEW_VERSION',
      correctionType: corrType,
      priorEnvelopeId: input.priorEnvelopeId,
      reasonCodes: reasons,
      downstreamInvalidation: computeInvalidation(corrType),
    };
  }

  // Only timing or scope changed
  if (input.timingChanged) {
    reasons.push('TIMING_ONLY_CHANGE');
    return {
      decision: 'IS_NEW_VERSION',
      correctionType: 'TIMING_CORRECTION',
      priorEnvelopeId: input.priorEnvelopeId,
      reasonCodes: reasons,
      downstreamInvalidation: computeInvalidation('TIMING_CORRECTION'),
    };
  }

  reasons.push('SCOPE_ONLY_CHANGE');
  return {
    decision: 'IS_NEW_VERSION',
    correctionType: 'SCOPE_CORRECTION',
    priorEnvelopeId: input.priorEnvelopeId,
    reasonCodes: reasons,
    downstreamInvalidation: computeInvalidation('SCOPE_CORRECTION'),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTION TYPE INFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

function inferCorrectionType(input: CorrectionAdjudicationInput): CorrectionType {
  if (input.declaredCorrectionType) return input.declaredCorrectionType;
  if (input.identityChanged) return 'IDENTITY_CORRECTION';
  if (input.methodologyChanged) return 'METHODOLOGY_CORRECTION';
  if (input.scopeChanged) return 'SCOPE_CORRECTION';
  if (input.timingChanged) return 'TIMING_CORRECTION';
  return 'VALUE_CORRECTION';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNSTREAM INVALIDATION BY CORRECTION TYPE
// ═══════════════════════════════════════════════════════════════════════════════

function computeInvalidation(corrType: CorrectionType): DownstreamInvalidation {
  switch (corrType) {
    case 'VALUE_CORRECTION':
      return {
        invalidatePriorScoring: true,
        invalidatePriorCanonical: false,
        invalidatePriorSequence: false,
        invalidatePriorComparability: false,
        requiresManualReview: false,
      };
    case 'SCOPE_CORRECTION':
      return {
        invalidatePriorScoring: true,
        invalidatePriorCanonical: true,
        invalidatePriorSequence: false,
        invalidatePriorComparability: false,
        requiresManualReview: false,
      };
    case 'TIMING_CORRECTION':
      return {
        invalidatePriorScoring: false,
        invalidatePriorCanonical: false,
        invalidatePriorSequence: true,
        invalidatePriorComparability: false,
        requiresManualReview: false,
      };
    case 'IDENTITY_CORRECTION':
      return {
        invalidatePriorScoring: true,
        invalidatePriorCanonical: true,
        invalidatePriorSequence: true,
        invalidatePriorComparability: false,
        requiresManualReview: true,
      };
    case 'METHODOLOGY_CORRECTION':
      return {
        invalidatePriorScoring: true,
        invalidatePriorCanonical: false,
        invalidatePriorSequence: false,
        invalidatePriorComparability: true,
        requiresManualReview: true,
      };
  }
}
