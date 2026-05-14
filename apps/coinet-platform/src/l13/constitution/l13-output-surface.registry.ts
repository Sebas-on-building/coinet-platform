/**
 * L13.1 — Output Surface Registry (Runtime)
 *
 * §13.1.8 / §13.1.10 — Runtime registry that validates output
 * legality, enforces evidence / lineage / confidence / restriction /
 * contradiction / uncertainty disclosure requirements, rejects
 * recommendation / prediction / final-judgment / lower-layer-rebuild
 * leakage, and restricts downstream consumer classes.
 */

import {
  L13_OUTPUT_SURFACES,
  isL13RegisteredOutput,
  isL13RegisteredOutputClass,
  type L13OutputSurfaceDescriptor,
} from '../contracts/l13-output-surfaces';
import {
  L13DownstreamConsumer,
  type L13OutputSurfaceClass,
} from '../contracts/l13-constitutional-types';
import {
  detectL13FinalJudgmentLeak,
  detectL13LowerLayerRebuildLanguage,
  detectL13MissingDataLaunderLanguage,
  detectL13PredictionTheater,
  detectL13RecommendationLeak,
  isL13ForbiddenOutputClass,
} from '../contracts/l13-mission';
import {
  L13ConstitutionalError,
  L13ConstitutionalViolationCode,
} from '../contracts/l13-violation-codes';

export interface L13OutputEmissionRequest {
  readonly surfaceId: string;
  readonly outputClass: L13OutputSurfaceClass;
  readonly emitter: string;
  readonly timestamp: string;
  readonly lineageFields: Record<string, string>;
  readonly hasEvidenceRefs: boolean;
  readonly hasConfidenceDisclosure: boolean;
  readonly hasRestrictionDisclosure: boolean;
  readonly contradictionPresent: boolean;
  readonly contradictionDisclosed: boolean;
  readonly uncertaintyPresent: boolean;
  readonly uncertaintyDisclosed: boolean;
  readonly scenarioBeingExplained: boolean;
  readonly triggerDisclosed: boolean;
  readonly invalidationDisclosed: boolean;
  readonly missingDataPresent: boolean;
  readonly missingDataAcknowledged: boolean;
  readonly replayHash: string | null;
  readonly l5Route: string | null;
  readonly downstreamConsumer?: L13DownstreamConsumer;
  readonly emittedText?: string;
}

export interface L13OutputValidationResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly violationCode: L13ConstitutionalViolationCode | null;
  readonly missingLineage: readonly string[];
}

function mk(
  req: L13OutputEmissionRequest,
  code: L13ConstitutionalViolationCode,
  detail: string,
): L13OutputValidationResult {
  return {
    surfaceId: req.surfaceId,
    allowed: false,
    reason: `Output "${req.surfaceId}" rejected: ${detail}`,
    violationCode: code,
    missingLineage: [],
  };
}

export function validateL13OutputEmission(
  req: L13OutputEmissionRequest,
): L13OutputValidationResult {
  if (!isL13RegisteredOutput(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output "${req.surfaceId}" is not registered`,
      violationCode:
        L13ConstitutionalViolationCode.L13C_OUTPUT_SURFACE_UNREGISTERED,
      missingLineage: [],
    };
  }
  if (!isL13RegisteredOutputClass(req.outputClass)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" is not registered`,
      violationCode:
        L13ConstitutionalViolationCode.L13C_ILLEGAL_OUTPUT_CLASS,
      missingLineage: [],
    };
  }
  if (isL13ForbiddenOutputClass(String(req.outputClass))) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" is forbidden at L13`,
      violationCode:
        L13ConstitutionalViolationCode.L13C_ILLEGAL_OUTPUT_CLASS,
      missingLineage: [],
    };
  }

  const surface = L13_OUTPUT_SURFACES.find(
    s => s.surfaceId === req.surfaceId,
  )!;

  if (surface.evidenceRequired && !req.hasEvidenceRefs) {
    return mk(
      req,
      L13ConstitutionalViolationCode.L13C_EVIDENCE_REFS_MISSING,
      'evidence refs required',
    );
  }
  if (surface.lineageRequired) {
    const missing = surface.requiredLineageFields.filter(
      f => !req.lineageFields[f],
    );
    if (missing.length > 0) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: `Missing lineage fields: ${missing.join(', ')}`,
        violationCode:
          L13ConstitutionalViolationCode.L13C_LINEAGE_REFS_MISSING,
        missingLineage: missing,
      };
    }
  }
  if (
    surface.confidenceDisclosureRequired &&
    !req.hasConfidenceDisclosure
  ) {
    return mk(
      req,
      L13ConstitutionalViolationCode.L13C_CONFIDENCE_DISCLOSURE_MISSING,
      'confidence disclosure required',
    );
  }
  if (
    surface.restrictionDisclosureRequired &&
    !req.hasRestrictionDisclosure
  ) {
    return mk(
      req,
      L13ConstitutionalViolationCode.L13C_RESTRICTION_DISCLOSURE_MISSING,
      'restriction disclosure required',
    );
  }
  if (
    surface.contradictionDisclosureRequiredWhenPresent &&
    req.contradictionPresent &&
    !req.contradictionDisclosed
  ) {
    return mk(
      req,
      L13ConstitutionalViolationCode.L13C_HIDES_CONTRADICTION,
      'contradiction is present but not disclosed',
    );
  }
  if (
    surface.uncertaintyDisclosureRequiredWhenPresent &&
    req.uncertaintyPresent &&
    !req.uncertaintyDisclosed
  ) {
    return mk(
      req,
      L13ConstitutionalViolationCode.L13C_OVERRIDES_CONFIDENCE,
      'uncertainty present but not disclosed',
    );
  }
  if (req.scenarioBeingExplained) {
    if (!req.triggerDisclosed) {
      return mk(
        req,
        L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_TRIGGER_DISCLOSURE,
        'scenario explained without trigger disclosure',
      );
    }
    if (!req.invalidationDisclosed) {
      return mk(
        req,
        L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE,
        'scenario explained without invalidation disclosure',
      );
    }
  }
  if (req.missingDataPresent && !req.missingDataAcknowledged) {
    return mk(
      req,
      L13ConstitutionalViolationCode.L13C_PRETENDS_MISSING_DATA_COMPLETE,
      'missing data present but not acknowledged',
    );
  }
  if (
    surface.replaySafeRequired &&
    (!req.replayHash || req.replayHash.length === 0)
  ) {
    return mk(
      req,
      L13ConstitutionalViolationCode.L13C_REPLAY_HASH_MISSING,
      'replay hash required',
    );
  }
  if (
    surface.l5PersistenceRequired &&
    (!req.l5Route || req.l5Route.length === 0)
  ) {
    return mk(
      req,
      L13ConstitutionalViolationCode.L13C_LINEAGE_REFS_MISSING,
      'L5 route required',
    );
  }
  if (req.downstreamConsumer) {
    if (!surface.allowedDownstreamConsumers.includes(req.downstreamConsumer)) {
      return mk(
        req,
        L13ConstitutionalViolationCode.L13C_AI_ACTS_AS_ENGINE,
        `consumer "${req.downstreamConsumer}" not allowed`,
      );
    }
  }

  if (req.emittedText) {
    if (detectL13RecommendationLeak(req.emittedText)) {
      return mk(
        req,
        L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
        'recommendation leak',
      );
    }
    if (detectL13PredictionTheater(req.emittedText)) {
      return mk(
        req,
        L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER,
        'prediction theater',
      );
    }
    if (detectL13FinalJudgmentLeak(req.emittedText)) {
      return mk(
        req,
        L13ConstitutionalViolationCode.L13C_FINAL_JUDGMENT_LEAK,
        'final judgment leak',
      );
    }
    if (detectL13LowerLayerRebuildLanguage(req.emittedText)) {
      return mk(
        req,
        L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS,
        'lower-layer rebuild language',
      );
    }
    if (detectL13MissingDataLaunderLanguage(req.emittedText)) {
      return mk(
        req,
        L13ConstitutionalViolationCode.L13C_PRETENDS_MISSING_DATA_COMPLETE,
        'missing-data laundering language',
      );
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

export function assertL13OutputEmission(
  req: L13OutputEmissionRequest,
): L13OutputSurfaceDescriptor {
  const r = validateL13OutputEmission(req);
  if (!r.allowed) {
    throw new L13ConstitutionalError(
      r.violationCode ??
        L13ConstitutionalViolationCode.L13C_OUTPUT_SURFACE_UNREGISTERED,
      r.reason,
      { surfaceId: req.surfaceId, emitter: req.emitter },
    );
  }
  return L13_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
}
