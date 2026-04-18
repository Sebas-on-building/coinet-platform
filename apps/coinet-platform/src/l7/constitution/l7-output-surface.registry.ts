/**
 * L7.1 — Output Surface Registry (Runtime)
 *
 * §7.1.7.4 — Runtime registry that validates output legality, enforces
 * required lineage fields, and restricts downstream consumer classes.
 */

import {
  L7_OUTPUT_SURFACES,
  isRegisteredOutput,
  isRegisteredOutputClass,
  type OutputSurfaceDescriptor,
} from '../contracts/l7-output-surfaces';
import type { L7OutputSurfaceClass } from '../contracts/l7-constitutional-types';
import { isForbiddenOutputClass } from '../contracts/l7-mission';
import { L7BoundaryViolationCode, L7ConstitutionalError } from '../contracts/l7-violation-codes';

export interface OutputEmissionRequest {
  readonly surfaceId: string;
  readonly outputClass: L7OutputSurfaceClass;
  readonly lineageFields: Record<string, string>;
  readonly emitter: string;
  readonly timestamp: string;
}

export interface OutputValidationResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly missingLineage: readonly string[];
}

export function validateOutputEmission(req: OutputEmissionRequest): OutputValidationResult {
  if (!isRegisteredOutput(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output surface "${req.surfaceId}" not registered`,
      missingLineage: [],
    };
  }

  if (!isRegisteredOutputClass(req.outputClass)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" not registered`,
      missingLineage: [],
    };
  }

  const surface = L7_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
  const missing = surface.requiredLineageFields.filter(f => !req.lineageFields[f]);

  if (missing.length > 0) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Missing required lineage fields: ${missing.join(', ')}`,
      missingLineage: missing,
    };
  }

  return {
    surfaceId: req.surfaceId,
    allowed: true,
    reason: 'Output emission legal',
    missingLineage: [],
  };
}

export function assertOutputEmission(req: OutputEmissionRequest): OutputSurfaceDescriptor {
  const result = validateOutputEmission(req);
  if (!result.allowed) {
    const code = result.missingLineage.length > 0
      ? L7BoundaryViolationCode.MISSING_LINEAGE
      : L7BoundaryViolationCode.UNREGISTERED_OUTPUT;
    throw new L7ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      outputClass: req.outputClass,
      emitter: req.emitter,
    });
  }
  return L7_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
}

export function validateOutputClassName(name: string): { valid: boolean; reason: string } {
  if (isForbiddenOutputClass(name)) {
    return { valid: false, reason: `"${name}" is a forbidden L7 output class` };
  }
  return { valid: true, reason: 'Output class name is legal' };
}

export function validateDownstreamConsumer(
  surfaceId: string,
  consumer: string,
): { valid: boolean; reason: string } {
  const surface = L7_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
  if (!surface) {
    return { valid: false, reason: `Output surface "${surfaceId}" is not registered` };
  }
  if (!surface.allowedDownstreamConsumers.includes(consumer)) {
    return {
      valid: false,
      reason:
        `Consumer "${consumer}" is not authorised for "${surfaceId}". ` +
        `Allowed: ${surface.allowedDownstreamConsumers.join(', ')}`,
    };
  }
  return { valid: true, reason: 'Downstream consumer allowed' };
}

export function getAllRegisteredOutputIds(): readonly string[] {
  return L7_OUTPUT_SURFACES.map(s => s.surfaceId);
}
