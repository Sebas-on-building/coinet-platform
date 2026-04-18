/**
 * L8.1 — Output Surface Registry (Runtime)
 *
 * §8.1.6.4 — Runtime registry that validates output legality, enforces
 * required lineage fields, and restricts downstream consumer classes.
 */

import {
  L8_OUTPUT_SURFACES,
  isL8RegisteredOutput,
  isL8RegisteredOutputClass,
  type L8OutputSurfaceDescriptor,
} from '../contracts/l8-output-surfaces';
import type { L8OutputSurfaceClass } from '../contracts/l8-constitutional-types';
import { isL8ForbiddenOutputClass } from '../contracts/l8-mission';
import {
  L8ConstitutionalError,
  L8ConstitutionalViolationCode,
} from '../contracts/l8-violation-codes';

export interface L8OutputEmissionRequest {
  readonly surfaceId: string;
  readonly outputClass: L8OutputSurfaceClass;
  readonly lineageFields: Record<string, string>;
  readonly emitter: string;
  readonly timestamp: string;
}

export interface L8OutputValidationResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly missingLineage: readonly string[];
  readonly violationCode: L8ConstitutionalViolationCode | null;
}

export function validateL8OutputEmission(
  req: L8OutputEmissionRequest,
): L8OutputValidationResult {
  if (!isL8RegisteredOutput(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output surface "${req.surfaceId}" not registered`,
      missingLineage: [],
      violationCode: L8ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    };
  }

  if (!isL8RegisteredOutputClass(req.outputClass)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" not registered`,
      missingLineage: [],
      violationCode: L8ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    };
  }

  const surface = L8_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
  const missing = surface.requiredLineageFields.filter(f => !req.lineageFields[f]);

  if (missing.length > 0) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Missing required lineage fields: ${missing.join(', ')}`,
      missingLineage: missing,
      violationCode: L8ConstitutionalViolationCode.MISSING_LINEAGE,
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

export function assertL8OutputEmission(
  req: L8OutputEmissionRequest,
): L8OutputSurfaceDescriptor {
  const result = validateL8OutputEmission(req);
  if (!result.allowed) {
    const code = result.violationCode ?? L8ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS;
    throw new L8ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      outputClass: req.outputClass,
      emitter: req.emitter,
    });
  }
  return L8_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
}

export function validateL8OutputClassName(
  name: string,
): { valid: boolean; reason: string } {
  if (isL8ForbiddenOutputClass(name)) {
    return { valid: false, reason: `"${name}" is a forbidden L8 output class` };
  }
  return { valid: true, reason: 'Output class name is legal' };
}

export function validateL8DownstreamConsumer(
  surfaceId: string,
  consumer: string,
): { valid: boolean; reason: string } {
  const surface = L8_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
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

export function getAllL8RegisteredOutputIds(): readonly string[] {
  return L8_OUTPUT_SURFACES.map(s => s.surfaceId);
}
