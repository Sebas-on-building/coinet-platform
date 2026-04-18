/**
 * L8.1 — Dependency Surface Registry (Runtime)
 *
 * §8.1.3.8 — Runtime registry that validates every dependency access.
 * §8.1.3.9 — Any code path using an unregistered surface, misusing a
 * surface, or consuming a restriction-aware L7 surface outside its
 * declared rights is blocked at validator time.
 */

import {
  L8_DEPENDENCY_SURFACES,
  isL8RegisteredDependency,
  isL8UsableFor,
  type L8DependencySurfaceDescriptor,
} from '../contracts/l8-dependency-surfaces';
import type { L8DependencyUsability } from '../contracts/l8-constitutional-types';
import {
  L8ConstitutionalError,
  L8ConstitutionalViolationCode,
} from '../contracts/l8-violation-codes';

export interface L8DependencyAccessRequest {
  readonly surfaceId: string;
  readonly requestedUsage: L8DependencyUsability;
  readonly requestor: string;
  readonly timestamp: string;
  /**
   * §8.1.3.6 — For restriction-aware surfaces (L7 stable handoffs), the
   * caller must declare the restriction posture attached to the L7 object
   * being consumed. The registry then enforces restriction-bypass law.
   */
  readonly l7RestrictionPosture?: {
    readonly allowsRegimeConditioning: boolean;
    readonly allowsMultiplierInput: boolean;
    readonly allowsConfidenceInput: boolean;
  };
}

export interface L8DependencyAccessResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly surface: L8DependencySurfaceDescriptor | null;
  readonly violationCode: L8ConstitutionalViolationCode | null;
}

export function requestL8DependencyAccess(
  req: L8DependencyAccessRequest,
): L8DependencyAccessResult {
  if (!isL8RegisteredDependency(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Surface "${req.surfaceId}" is not registered in L8DependencySurfaceRegistry`,
      surface: null,
      violationCode: L8ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
    };
  }

  if (!isL8UsableFor(req.surfaceId, req.requestedUsage)) {
    const surface = L8_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason:
        `Surface "${req.surfaceId}" is not usable for ${req.requestedUsage}. ` +
        `Allowed: ${surface.usableFor.join(', ')}`,
      surface,
      violationCode: L8ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
    };
  }

  const surface = L8_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;

  // §8.1.3.6 / §8.1.5.4 — Restriction-aware L7 surfaces. If the consumer
  // doesn't declare a posture, we deny; we never default-allow against
  // restriction law. If they declare a posture but it doesn't cover the
  // requested usage, we deny with RESTRICTION_BYPASS.
  if (surface.restrictionAware) {
    const p = req.l7RestrictionPosture;
    if (!p) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Surface "${req.surfaceId}" is restriction-aware; request must ` +
          'declare an L7 restriction posture.',
        surface,
        violationCode: L8ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
      };
    }
    const needs = req.requestedUsage;
    const coveredByPosture =
      (needs === 'REGIME_SIGNAL' && p.allowsRegimeConditioning) ||
      (needs === 'TRANSITION_SIGNAL' && p.allowsRegimeConditioning) ||
      (needs === 'MULTIPLIER_INPUT' && p.allowsMultiplierInput) ||
      (needs === 'CONFIDENCE_INPUT' && p.allowsConfidenceInput) ||
      needs === 'EVIDENCE_ONLY' ||
      needs === 'CONTEXT_ONLY' ||
      needs === 'REPLAY_REFERENCE' ||
      needs === 'REPAIR_REFERENCE';
    if (!coveredByPosture) {
      return {
        surfaceId: req.surfaceId,
        allowed: false,
        reason:
          `Usage ${needs} of "${req.surfaceId}" exceeds declared L7 restriction posture`,
        surface,
        violationCode: L8ConstitutionalViolationCode.RESTRICTION_BYPASS,
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

export function assertL8DependencyAccess(
  req: L8DependencyAccessRequest,
): L8DependencySurfaceDescriptor {
  const result = requestL8DependencyAccess(req);
  if (!result.allowed) {
    const code = result.violationCode ?? L8ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE;
    throw new L8ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      requestedUsage: req.requestedUsage,
      requestor: req.requestor,
    });
  }
  return result.surface!;
}

export function getAllL8RegisteredSurfaceIds(): readonly string[] {
  return L8_DEPENDENCY_SURFACES.map(s => s.surfaceId);
}
