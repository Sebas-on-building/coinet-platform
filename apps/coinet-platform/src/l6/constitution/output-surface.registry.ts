/**
 * L6.1 — Output Surface Registry (Runtime)
 *
 * §6.1.7.6 — Runtime registry that validates output legality.
 */

import {
  L6_OUTPUT_SURFACES, isRegisteredOutput, isRegisteredOutputClass,
  type OutputSurfaceDescriptor, getAllRequiredLineageFields,
} from '../contracts/l6-output-surfaces';
import type { L6OutputSurfaceClass } from '../contracts/l6-constitutional-types';
import { L6BoundaryViolationCode, L6ConstitutionalError } from '../contracts/l6-violation-codes';
import { isForbiddenOutputClass } from '../contracts/l6-mission';

export interface OutputEmissionRequest {
  readonly surfaceId: string;
  readonly outputClass: L6OutputSurfaceClass;
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
      surfaceId: req.surfaceId, allowed: false,
      reason: `Output surface "${req.surfaceId}" not registered`,
      missingLineage: [],
    };
  }

  if (!isRegisteredOutputClass(req.outputClass)) {
    return {
      surfaceId: req.surfaceId, allowed: false,
      reason: `Output class "${req.outputClass}" not registered`,
      missingLineage: [],
    };
  }

  const surface = L6_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
  const missing = surface.requiredLineageFields.filter(f => !req.lineageFields[f]);

  if (missing.length > 0) {
    return {
      surfaceId: req.surfaceId, allowed: false,
      reason: `Missing required lineage fields: ${missing.join(', ')}`,
      missingLineage: missing,
    };
  }

  return { surfaceId: req.surfaceId, allowed: true, reason: 'Output emission legal', missingLineage: [] };
}

export function assertOutputEmission(req: OutputEmissionRequest): OutputSurfaceDescriptor {
  const result = validateOutputEmission(req);
  if (!result.allowed) {
    const code = result.missingLineage.length > 0
      ? L6BoundaryViolationCode.MISSING_LINEAGE
      : L6BoundaryViolationCode.UNREGISTERED_OUTPUT;
    throw new L6ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId, outputClass: req.outputClass, emitter: req.emitter,
    });
  }
  return L6_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
}

export function validateOutputClassName(name: string): { valid: boolean; reason: string } {
  if (isForbiddenOutputClass(name)) {
    return { valid: false, reason: `"${name}" is a forbidden output class` };
  }
  return { valid: true, reason: 'Output class name is legal' };
}

export function getAllRegisteredOutputIds(): readonly string[] {
  return L6_OUTPUT_SURFACES.map(s => s.surfaceId);
}
