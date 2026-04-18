/**
 * L6.1 — Dependency Surface Registry (Runtime)
 *
 * §6.1.4.5 — Runtime registry that validates dependency access.
 * §6.1.4.6 — Any code path using an unregistered surface is illegal.
 */

import {
  L6_DEPENDENCY_SURFACES, isRegisteredDependency, isUsableFor,
  type DependencySurfaceDescriptor,
} from '../contracts/l6-dependency-surfaces';
import type { L6DependencyUsability } from '../contracts/l6-constitutional-types';
import { L6BoundaryViolationCode, L6ConstitutionalError } from '../contracts/l6-violation-codes';

export interface DependencyAccessRequest {
  readonly surfaceId: string;
  readonly requestedUsage: L6DependencyUsability;
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
      surfaceId: req.surfaceId, allowed: false,
      reason: `Surface "${req.surfaceId}" is not registered in DependencySurfaceRegistry`,
      surface: null,
    };
  }

  if (!isUsableFor(req.surfaceId, req.requestedUsage)) {
    const surface = L6_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
    return {
      surfaceId: req.surfaceId, allowed: false,
      reason: `Surface "${req.surfaceId}" is not usable for ${req.requestedUsage}. Allowed: ${surface.usableFor.join(', ')}`,
      surface,
    };
  }

  const surface = L6_DEPENDENCY_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
  return { surfaceId: req.surfaceId, allowed: true, reason: 'Access granted', surface };
}

export function assertDependencyAccess(req: DependencyAccessRequest): DependencySurfaceDescriptor {
  const result = requestDependencyAccess(req);
  if (!result.allowed) {
    const code = !isRegisteredDependency(req.surfaceId)
      ? L6BoundaryViolationCode.UNREGISTERED_DEPENDENCY
      : L6BoundaryViolationCode.ILLEGAL_DEPENDENCY_USAGE;
    throw new L6ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId, requestedUsage: req.requestedUsage, requestor: req.requestor,
    });
  }
  return result.surface!;
}

export function getAllRegisteredSurfaceIds(): readonly string[] {
  return L6_DEPENDENCY_SURFACES.map(s => s.surfaceId);
}
