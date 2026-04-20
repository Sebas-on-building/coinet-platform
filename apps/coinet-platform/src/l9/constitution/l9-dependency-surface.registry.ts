/**
 * L9.1 — Dependency Surface Registry (Runtime)
 *
 * §9.1.4.9 — Runtime registry that validates every dependency access.
 * Any code path using an unregistered surface, misusing a surface, or
 * consuming a restriction-aware L7/L8 surface outside its declared
 * rights is blocked at validator time.
 *
 * §9.1.4.7 — For regime-posture-aware surfaces (L8 stable handoffs) the
 * caller must declare how they intend to honour regime posture when
 * sequence meaning depends on environment.
 */

import {
  L9_DEPENDENCY_SURFACES,
  isL9RegisteredDependency,
  isL9UsableFor,
  type L9DependencySurfaceDescriptor,
} from '../contracts/l9-dependency-surfaces';
import type { L9DependencyUsability } from '../contracts/l9-constitutional-types';
import {
  L9ConstitutionalError,
  L9ConstitutionalViolationCode,
} from '../contracts/l9-violation-codes';

export interface L9DependencyAccessRequest {
  readonly surfaceId: string;
  readonly requestedUsage: L9DependencyUsability;
  readonly requestor: string;
  readonly timestamp: string;
  /**
   * §9.1.4.6 — For restriction-aware surfaces (L7/L8 stable handoffs)
   * the caller must declare the restriction posture attached to the
   * object being consumed. The registry then enforces
   * restriction-bypass law.
   */
  readonly restrictionPosture?: {
    readonly allowsSequenceConditioning: boolean;
    readonly allowsConfidenceInput: boolean;
    readonly allowsRegimeConditioning: boolean;
  };
  /**
   * §9.1.4.7 — For regime-posture-aware surfaces (L8), the caller must
   * declare that regime posture will be honoured when sequence meaning
   * depends on environment.
   */
  readonly honoursRegimePosture?: boolean;
}

export interface L9DependencyAccessResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly surface: L9DependencySurfaceDescriptor | null;
  readonly violationCode: L9ConstitutionalViolationCode | null;
}

export function requestL9DependencyAccess(
  req: L9DependencyAccessRequest,
): L9DependencyAccessResult {
  if (!isL9RegisteredDependency(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Surface "${req.surfaceId}" is not registered in L9DependencySurfaceRegistry`,
      surface: null,
      violationCode: L9ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
    };
  }

  if (!isL9UsableFor(req.surfaceId, req.requestedUsage)) {
    const surface = L9_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason:
        `Surface "${req.surfaceId}" is not usable for ${req.requestedUsage}. ` +
        `Allowed: ${surface.usableFor.join(', ')}`,
      surface,
      violationCode: L9ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
    };
  }

  const surface = L9_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;

  // §9.1.4.6 / §9.1.6.1 — Restriction-aware L7/L8 surfaces. If the
  // consumer doesn't declare posture, deny; we never default-allow
  // against restriction law.
  if (surface.restrictionAware) {
    const p = req.restrictionPosture;
    if (!p) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Surface "${req.surfaceId}" is restriction-aware; request must declare a restriction posture.`,
        surface,
        violationCode: L9ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
      };
    }
    const needs = req.requestedUsage;
    const coveredByPosture =
      (needs === 'SEQUENCE_SIGNAL' && p.allowsSequenceConditioning) ||
      (needs === 'ORDERING_SIGNAL' && p.allowsSequenceConditioning) ||
      (needs === 'CHANGE_POINT_SIGNAL' && p.allowsSequenceConditioning) ||
      (needs === 'PHASE_SIGNAL' && p.allowsSequenceConditioning) ||
      (needs === 'DECAY_SIGNAL' && p.allowsSequenceConditioning) ||
      (needs === 'REGIME_CONDITIONING' && p.allowsRegimeConditioning) ||
      (needs === 'CONFIDENCE_INPUT' && p.allowsConfidenceInput) ||
      needs === 'EVIDENCE_ONLY' ||
      needs === 'CONTEXT_ONLY' ||
      needs === 'REPLAY_REFERENCE' ||
      needs === 'REPAIR_REFERENCE';
    if (!coveredByPosture) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason: `Usage ${needs} of "${req.surfaceId}" exceeds declared restriction posture`,
        surface,
        violationCode: L9ConstitutionalViolationCode.RESTRICTION_BYPASS,
      };
    }
  }

  // §9.1.4.7 / §9.1.6.1 — Regime-posture-aware surfaces (L8). When
  // sequence meaning depends on environment, L9 must honour posture.
  // Usages that materially depend on regime must declare it.
  if (surface.regimePostureAware) {
    const regimeSensitive: ReadonlyArray<L9DependencyUsability> = [
      'SEQUENCE_SIGNAL',
      'ORDERING_SIGNAL',
      'CHANGE_POINT_SIGNAL',
      'PHASE_SIGNAL',
      'DECAY_SIGNAL',
      'REGIME_CONDITIONING',
      'CONFIDENCE_INPUT',
    ];
    if (regimeSensitive.includes(req.requestedUsage) && req.honoursRegimePosture !== true) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Surface "${req.surfaceId}" is regime-posture-aware and usage ${req.requestedUsage} ` +
          `requires honoursRegimePosture=true`,
        surface,
        violationCode: L9ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
      };
    }
  }

  return {
    surfaceId: req.surfaceId,
    allowed: true,
    reason: 'Access granted',
    surface,
    violationCode: null,
  };
}

export function assertL9DependencyAccess(
  req: L9DependencyAccessRequest,
): L9DependencySurfaceDescriptor {
  const result = requestL9DependencyAccess(req);
  if (!result.allowed) {
    const code = result.violationCode ?? L9ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE;
    throw new L9ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      requestedUsage: req.requestedUsage,
      requestor: req.requestor,
    });
  }
  return result.surface!;
}

export function getAllL9RegisteredSurfaceIds(): readonly string[] {
  return L9_DEPENDENCY_SURFACES.map(s => s.surfaceId);
}
