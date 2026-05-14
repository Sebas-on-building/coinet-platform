/**
 * L12.1 — Output Surface Registry (Runtime)
 *
 * §12.1.10 — Runtime registry that validates output legality, enforces
 * required conditions/triggers/invalidations/path-confidence/lineage/
 * replay-hash/L5-route, and restricts downstream consumer classes.
 */

import {
  L12_OUTPUT_SURFACES,
  isL12RegisteredOutput,
  isL12RegisteredOutputClass,
  type L12OutputSurfaceDescriptor,
} from '../contracts/l12-output-surfaces';
import {
  L12DownstreamConsumer,
  type L12OutputSurfaceClass,
} from '../contracts/l12-constitutional-types';
import {
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
  isL12ForbiddenOutputClass,
} from '../contracts/l12-mission';
import {
  L12ConstitutionalError,
  L12ConstitutionalViolationCode,
} from '../contracts/l12-violation-codes';

export interface L12OutputEmissionRequest {
  readonly surfaceId: string;
  readonly outputClass: L12OutputSurfaceClass;
  readonly emitter: string;
  readonly timestamp: string;
  readonly lineageFields: Record<string, string>;
  readonly hasConditions: boolean;
  readonly hasTriggers: boolean;
  readonly hasInvalidations: boolean;
  readonly hasPathConfidence: boolean;
  readonly hasEvidenceRefs: boolean;
  readonly replayHash: string | null;
  readonly l5Route: string | null;
  readonly downstreamConsumer?: L12DownstreamConsumer;
  readonly emittedText?: string;
}

export interface L12OutputValidationResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly violationCode: L12ConstitutionalViolationCode | null;
  readonly missingLineage: readonly string[];
}

export function validateL12OutputEmission(
  req: L12OutputEmissionRequest,
): L12OutputValidationResult {
  if (!isL12RegisteredOutput(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output "${req.surfaceId}" is not registered`,
      violationCode: L12ConstitutionalViolationCode.L12C_OUTPUT_SURFACE_UNREGISTERED,
      missingLineage: [],
    };
  }
  if (!isL12RegisteredOutputClass(req.outputClass)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" is not registered`,
      violationCode: L12ConstitutionalViolationCode.L12C_ILLEGAL_OUTPUT_CLASS,
      missingLineage: [],
    };
  }
  if (isL12ForbiddenOutputClass(String(req.outputClass))) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" is forbidden at L12`,
      violationCode: L12ConstitutionalViolationCode.L12C_ILLEGAL_OUTPUT_CLASS,
      missingLineage: [],
    };
  }

  const surface = L12_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;

  if (surface.requiresConditions && !req.hasConditions) {
    return mk(req, L12ConstitutionalViolationCode.L12C_CONDITION_OMITTED, 'conditions required');
  }
  if (surface.requiresTriggers && !req.hasTriggers) {
    return mk(req, L12ConstitutionalViolationCode.L12C_TRIGGER_OMITTED, 'triggers required');
  }
  if (surface.requiresInvalidations && !req.hasInvalidations) {
    return mk(req, L12ConstitutionalViolationCode.L12C_INVALIDATION_OMITTED, 'invalidations required');
  }
  if (surface.requiresPathConfidence && !req.hasPathConfidence) {
    return mk(
      req,
      L12ConstitutionalViolationCode.L12C_PATH_CONFIDENCE_LAUNDERING,
      'path confidence required',
    );
  }
  if (surface.requiresEvidenceRefs && !req.hasEvidenceRefs) {
    return mk(req, L12ConstitutionalViolationCode.L12C_LINEAGE_MISSING, 'evidence refs required');
  }
  if (surface.requiresReplayHash && (!req.replayHash || req.replayHash.length === 0)) {
    return mk(
      req,
      L12ConstitutionalViolationCode.L12C_REPLAY_HASH_MISSING,
      'replay hash required',
    );
  }
  if (surface.requiresL5Route && (!req.l5Route || req.l5Route.length === 0)) {
    return mk(req, L12ConstitutionalViolationCode.L12C_L5_BYPASS, 'L5 route required');
  }

  const missing = surface.requiredLineageFields.filter(f => !req.lineageFields[f]);
  if (missing.length > 0) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Missing lineage fields: ${missing.join(', ')}`,
      violationCode: L12ConstitutionalViolationCode.L12C_LINEAGE_MISSING,
      missingLineage: missing,
    };
  }

  if (req.downstreamConsumer) {
    if (!surface.allowedDownstreamConsumers.includes(req.downstreamConsumer)) {
      return mk(
        req,
        L12ConstitutionalViolationCode.L12C_LATE_LAYER_CONSUMPTION,
        `consumer "${req.downstreamConsumer}" not allowed`,
      );
    }
  }

  if (req.emittedText) {
    if (detectL12PredictionTheater(req.emittedText)) {
      return mk(req, L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER, 'prediction theater');
    }
    if (detectL12RecommendationLanguage(req.emittedText)) {
      return mk(req, L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK, 'recommendation leak');
    }
    if (detectL12JudgmentLanguage(req.emittedText)) {
      return mk(req, L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK, 'judgment leak');
    }
  }

  return {
    surfaceId: req.surfaceId,
    allowed: true,
    reason: 'Emission legal',
    violationCode: null,
    missingLineage: [],
  };
}

function mk(
  req: L12OutputEmissionRequest,
  code: L12ConstitutionalViolationCode,
  detail: string,
): L12OutputValidationResult {
  return {
    surfaceId: req.surfaceId,
    allowed: false,
    reason: `Output "${req.surfaceId}" rejected: ${detail}`,
    violationCode: code,
    missingLineage: [],
  };
}

export function assertL12OutputEmission(req: L12OutputEmissionRequest): L12OutputSurfaceDescriptor {
  const r = validateL12OutputEmission(req);
  if (!r.allowed) {
    throw new L12ConstitutionalError(
      r.violationCode ?? L12ConstitutionalViolationCode.L12C_OUTPUT_SURFACE_UNREGISTERED,
      r.reason,
      { surfaceId: req.surfaceId, emitter: req.emitter },
    );
  }
  return L12_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
}
