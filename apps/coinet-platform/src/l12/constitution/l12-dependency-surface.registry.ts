/**
 * L12.1 — Dependency Surface Registry (Runtime)
 *
 * §12.1.9 — Runtime registry that validates every dependency access.
 * Any code path using an unregistered surface, misusing a surface,
 * consuming a restriction-aware surface outside its rights, ignoring
 * regime/sequence/hypothesis posture, or consuming a score surface
 * without the full L11 score-context bundle is blocked at validator
 * time.
 */

import {
  L12_DEPENDENCY_SURFACES,
  L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
  isL12RegisteredDependency,
  isL12UsableFor,
  type L12DependencySurfaceDescriptor,
} from '../contracts/l12-dependency-surfaces';
import {
  L12CapabilityContext,
  L12DependencyLayer,
  type L12DependencyUsability,
} from '../contracts/l12-constitutional-types';
import {
  L12ConstitutionalError,
  L12ConstitutionalViolationCode,
} from '../contracts/l12-violation-codes';

export interface L12DependencyAccessRequest {
  readonly surfaceId: string;
  readonly requestedUsage: L12DependencyUsability;
  readonly context: L12CapabilityContext;
  readonly requestor: string;
  readonly timestamp: string;

  /** §12.1.5.5–§12.1.5.9 — Posture declarations for restriction-aware
   * lower-layer surfaces. */
  readonly honoursL7Restriction?: boolean;
  readonly honoursRegimePosture?: boolean;
  readonly honoursSequencePosture?: boolean;
  readonly honoursHypothesisPosture?: boolean;
  readonly honoursScoreRestriction?: boolean;

  /** §12.1.5.9 — For L11 surfaces marked scoreContextRequired, the
   * caller must declare it is consuming the full score-context bundle
   * (all 10 L11 surfaces) rather than a naked score value. */
  readonly consumesFullScoreContextBundle?: boolean;

  /** §12.1.5.9 — Set of L11 surface ids the caller is consuming for
   * this scenario assembly. Used to validate completeness of the
   * score-context bundle when any L11 surface is requested. */
  readonly l11ConsumedBundle?: readonly string[];
}

export interface L12DependencyAccessResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly surface: L12DependencySurfaceDescriptor | null;
  readonly violationCode: L12ConstitutionalViolationCode | null;
}

export function requestL12DependencyAccess(
  req: L12DependencyAccessRequest,
): L12DependencyAccessResult {
  if (!isL12RegisteredDependency(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Surface "${req.surfaceId}" is not registered in L12 dependency registry`,
      surface: null,
      violationCode: L12ConstitutionalViolationCode.L12C_DEPENDENCY_SURFACE_UNREGISTERED,
    };
  }

  if (!isL12UsableFor(req.surfaceId, req.requestedUsage)) {
    const surface = L12_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason:
        `Surface "${req.surfaceId}" is not usable for ${req.requestedUsage}. ` +
        `Allowed: ${surface.usableFor.join(', ')}`,
      surface,
      violationCode: L12ConstitutionalViolationCode.L12C_ILLEGAL_DEPENDENCY_USAGE,
    };
  }

  const surface = L12_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;

  if (!surface.legalConsumptionContexts.includes(req.context)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason:
        `Surface "${req.surfaceId}" not legal in context ${req.context}. ` +
        `Allowed: ${surface.legalConsumptionContexts.join(', ')}`,
      surface,
      violationCode: L12ConstitutionalViolationCode.L12C_ILLEGAL_DEPENDENCY_USAGE,
    };
  }

  if (surface.layer === L12DependencyLayer.L7 && surface.restrictionAware) {
    if (req.honoursL7Restriction !== true) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: 'L7 restriction posture not declared',
        surface,
        violationCode: L12ConstitutionalViolationCode.L12C_RESTRICTION_BYPASS,
      };
    }
  }

  if (surface.regimePostureAware && req.honoursRegimePosture !== true) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: 'L8 regime posture not honoured',
      surface,
      violationCode: L12ConstitutionalViolationCode.L12C_REGIME_POSTURE_IGNORED,
    };
  }

  if (surface.sequencePostureAware && req.honoursSequencePosture !== true) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: 'L9 sequence posture not honoured',
      surface,
      violationCode: L12ConstitutionalViolationCode.L12C_SEQUENCE_POSTURE_IGNORED,
    };
  }

  if (surface.hypothesisPostureAware && req.honoursHypothesisPosture !== true) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: 'L10 hypothesis posture not honoured',
      surface,
      violationCode: L12ConstitutionalViolationCode.L12C_HYPOTHESIS_POSTURE_IGNORED,
    };
  }

  if (surface.scoreContextRequired) {
    if (req.consumesFullScoreContextBundle !== true) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          'L11 surface requires full score-context bundle declaration; naked score consumption is illegal',
        surface,
        violationCode: L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY,
      };
    }
    if (req.honoursScoreRestriction !== true) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: 'L11 score restriction profile not honoured',
        surface,
        violationCode: L12ConstitutionalViolationCode.L12C_RESTRICTION_BYPASS,
      };
    }
    const bundle = req.l11ConsumedBundle ?? [];
    const missing = L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.filter(
      id => !bundle.includes(id),
    );
    if (missing.length > 0) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: `Score-context bundle incomplete; missing: ${missing.join(', ')}`,
        surface,
        violationCode: L12ConstitutionalViolationCode.L12C_SCORE_CONTEXT_INCOMPLETE,
      };
    }
  }

  return {
    surfaceId: req.surfaceId,
    allowed: true,
    reason: 'Access legal',
    surface,
    violationCode: null,
  };
}

export function assertL12DependencyAccess(req: L12DependencyAccessRequest): void {
  const r = requestL12DependencyAccess(req);
  if (!r.allowed) {
    throw new L12ConstitutionalError(
      r.violationCode ?? L12ConstitutionalViolationCode.L12C_ILLEGAL_DEPENDENCY_USAGE,
      r.reason,
      { surfaceId: req.surfaceId, requestor: req.requestor },
    );
  }
}
