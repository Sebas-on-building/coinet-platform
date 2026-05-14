/**
 * L11.1 — Output Surface Registry (Runtime)
 *
 * §11.1.9 / §11.1.13 — Runtime registry that validates output legality,
 * enforces required lineage fields, and restricts downstream consumer
 * classes.
 */

import {
  L11_OUTPUT_SURFACES,
  isL11RegisteredOutput,
  isL11RegisteredOutputClass,
  type L11OutputSurfaceDescriptor,
} from '../contracts/l11-output-surfaces';
import type { L11OutputSurfaceClass } from '../contracts/l11-constitutional-types';
import { isL11ForbiddenOutputClass } from '../contracts/l11-mission';
import {
  L11ConstitutionalError,
  L11ConstitutionalViolationCode,
} from '../contracts/l11-violation-codes';

export interface L11OutputEmissionRequest {
  readonly surfaceId: string;
  readonly outputClass: L11OutputSurfaceClass;
  readonly lineageFields: Record<string, string>;
  readonly emitter: string;
  readonly timestamp: string;
}

export interface L11OutputValidationResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly missingLineage: readonly string[];
  readonly violationCode: L11ConstitutionalViolationCode | null;
}

export function validateL11OutputEmission(
  req: L11OutputEmissionRequest,
): L11OutputValidationResult {
  if (!isL11RegisteredOutput(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output surface "${req.surfaceId}" not registered`,
      missingLineage: [],
      violationCode: L11ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    };
  }

  if (!isL11RegisteredOutputClass(req.outputClass)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" not registered`,
      missingLineage: [],
      violationCode: L11ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    };
  }

  const surface = L11_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
  const missing = surface.requiredLineageFields.filter(f => !req.lineageFields[f]);

  if (missing.length > 0) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Missing required lineage fields: ${missing.join(', ')}`,
      missingLineage: missing,
      violationCode: L11ConstitutionalViolationCode.MISSING_LINEAGE,
    };
  }

  return {
    surfaceId: req.surfaceId,
    allowed: true,
    reason: 'Output emission legal',
    missingLineage: [],
    violationCode: null,
  };
}

export function assertL11OutputEmission(
  req: L11OutputEmissionRequest,
): L11OutputSurfaceDescriptor {
  const result = validateL11OutputEmission(req);
  if (!result.allowed) {
    const code = result.violationCode ?? L11ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS;
    throw new L11ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      outputClass: req.outputClass,
      emitter: req.emitter,
    });
  }
  return L11_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
}

export function validateL11OutputClassName(name: string): {
  valid: boolean;
  reason: string;
} {
  if (isL11ForbiddenOutputClass(name)) {
    return { valid: false, reason: `"${name}" is a forbidden L11 output class` };
  }
  return { valid: true, reason: 'Output class name is legal' };
}

export function validateL11DownstreamConsumer(
  surfaceId: string,
  consumer: string,
): { valid: boolean; reason: string } {
  const surface = L11_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
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

export function getAllL11RegisteredOutputIds(): readonly string[] {
  return L11_OUTPUT_SURFACES.map(s => s.surfaceId);
}
