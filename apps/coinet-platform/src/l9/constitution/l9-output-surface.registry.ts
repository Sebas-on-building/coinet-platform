/**
 * L9.1 — Output Surface Registry (Runtime)
 *
 * §9.1.5.4 — Runtime registry that validates output legality, enforces
 * required lineage fields, and restricts downstream consumer classes.
 */

import {
  L9_OUTPUT_SURFACES,
  isL9RegisteredOutput,
  isL9RegisteredOutputClass,
  type L9OutputSurfaceDescriptor,
} from '../contracts/l9-output-surfaces';
import type { L9OutputSurfaceClass } from '../contracts/l9-constitutional-types';
import { isL9ForbiddenOutputClass } from '../contracts/l9-mission';
import {
  L9ConstitutionalError,
  L9ConstitutionalViolationCode,
} from '../contracts/l9-violation-codes';

export interface L9OutputEmissionRequest {
  readonly surfaceId: string;
  readonly outputClass: L9OutputSurfaceClass;
  readonly lineageFields: Record<string, string>;
  readonly emitter: string;
  readonly timestamp: string;
}

export interface L9OutputValidationResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly missingLineage: readonly string[];
  readonly violationCode: L9ConstitutionalViolationCode | null;
}

export function validateL9OutputEmission(
  req: L9OutputEmissionRequest,
): L9OutputValidationResult {
  if (!isL9RegisteredOutput(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output surface "${req.surfaceId}" not registered`,
      missingLineage: [],
      violationCode: L9ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    };
  }

  if (!isL9RegisteredOutputClass(req.outputClass)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" not registered`,
      missingLineage: [],
      violationCode: L9ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    };
  }

  const surface = L9_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
  const missing = surface.requiredLineageFields.filter(f => !req.lineageFields[f]);

  if (missing.length > 0) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Missing required lineage fields: ${missing.join(', ')}`,
      missingLineage: missing,
      violationCode: L9ConstitutionalViolationCode.MISSING_LINEAGE,
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

export function assertL9OutputEmission(
  req: L9OutputEmissionRequest,
): L9OutputSurfaceDescriptor {
  const result = validateL9OutputEmission(req);
  if (!result.allowed) {
    const code = result.violationCode ?? L9ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS;
    throw new L9ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      outputClass: req.outputClass,
      emitter: req.emitter,
    });
  }
  return L9_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
}

export function validateL9OutputClassName(
  name: string,
): { valid: boolean; reason: string } {
  if (isL9ForbiddenOutputClass(name)) {
    return { valid: false, reason: `"${name}" is a forbidden L9 output class` };
  }
  return { valid: true, reason: 'Output class name is legal' };
}

export function validateL9DownstreamConsumer(
  surfaceId: string,
  consumer: string,
): { valid: boolean; reason: string } {
  const surface = L9_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
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

export function getAllL9RegisteredOutputIds(): readonly string[] {
  return L9_OUTPUT_SURFACES.map(s => s.surfaceId);
}
