/**
 * L7.1 — Dependency Surface Registry (Runtime)
 *
 * §7.1.4.6 — Runtime registry that validates every dependency access.
 * §7.1.4.7 — Any code path using an unregistered surface is illegal.
 */

import {
  L7_DEPENDENCY_SURFACES,
  isRegisteredDependency,
  isUsableFor,
  type DependencySurfaceDescriptor,
} from '../contracts/l7-dependency-surfaces';
import type { L7DependencyUsability } from '../contracts/l7-constitutional-types';
import { L7BoundaryViolationCode, L7ConstitutionalError } from '../contracts/l7-violation-codes';

export interface DependencyAccessRequest {
  readonly surfaceId: string;
  readonly requestedUsage: L7DependencyUsability;
  readonly requestor: string;
  readonly timestamp: string;
}

export interface DependencyAccessResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly surface: DependencySurfaceDescriptor | null;
}

export function requestDependencyAccess(req: DependencyAccessRequest): DependencyAccessResult {
  if (!isRegisteredDependency(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Surface "${req.surfaceId}" is not registered in L7DependencySurfaceRegistry`,
      surface: null,
    };
  }

  if (!isUsableFor(req.surfaceId, req.requestedUsage)) {
    const surface = L7_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason:
        `Surface "${req.surfaceId}" is not usable for ${req.requestedUsage}. ` +
        `Allowed: ${surface.usableFor.join(', ')}`,
      surface,
    };
  }

  const surface = L7_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
  return { surfaceId: req.surfaceId, allowed: true, reason: 'Access granted', surface };
}

export function assertDependencyAccess(req: DependencyAccessRequest): DependencySurfaceDescriptor {
  const result = requestDependencyAccess(req);
  if (!result.allowed) {
    const code = !isRegisteredDependency(req.surfaceId)
      ? L7BoundaryViolationCode.UNREGISTERED_DEPENDENCY
      : L7BoundaryViolationCode.ILLEGAL_DEPENDENCY_USAGE;
    throw new L7ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      requestedUsage: req.requestedUsage,
      requestor: req.requestor,
    });
  }
  return result.surface!;
}

export function getAllRegisteredSurfaceIds(): readonly string[] {
  return L7_DEPENDENCY_SURFACES.map(s => s.surfaceId);
}
