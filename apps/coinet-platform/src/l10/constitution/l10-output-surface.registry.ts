/**
 * L10.1 — Output Surface Registry (Runtime)
 *
 * §10.1.6 / §10.1.10.2 — Runtime registry that validates output
 * legality, enforces required lineage fields, and restricts downstream
 * consumer classes.
 */

import {
  L10_OUTPUT_SURFACES,
  isL10RegisteredOutput,
  isL10RegisteredOutputClass,
  type L10OutputSurfaceDescriptor,
} from '../contracts/l10-output-surfaces';
import type { L10OutputSurfaceClass } from '../contracts/l10-constitutional-types';
import { isL10ForbiddenOutputClass } from '../contracts/l10-mission';
import {
  L10ConstitutionalError,
  L10ConstitutionalViolationCode,
} from '../contracts/l10-violation-codes';

export interface L10OutputEmissionRequest {
  readonly surfaceId: string;
  readonly outputClass: L10OutputSurfaceClass;
  readonly lineageFields: Record<string, string>;
  readonly emitter: string;
  readonly timestamp: string;
}

export interface L10OutputValidationResult {
  readonly surfaceId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly missingLineage: readonly string[];
  readonly violationCode: L10ConstitutionalViolationCode | null;
}

export function validateL10OutputEmission(
  req: L10OutputEmissionRequest,
): L10OutputValidationResult {
  if (!isL10RegisteredOutput(req.surfaceId)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output surface "${req.surfaceId}" not registered`,
      missingLineage: [],
      violationCode: L10ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    };
  }

  if (!isL10RegisteredOutputClass(req.outputClass)) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Output class "${req.outputClass}" not registered`,
      missingLineage: [],
      violationCode: L10ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    };
  }

  const surface = L10_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
  const missing = surface.requiredLineageFields.filter(f => !req.lineageFields[f]);

  if (missing.length > 0) {
    return {
      surfaceId: req.surfaceId,
      allowed: false,
      reason: `Missing required lineage fields: ${missing.join(', ')}`,
      missingLineage: missing,
      violationCode: L10ConstitutionalViolationCode.MISSING_LINEAGE,
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

export function assertL10OutputEmission(
  req: L10OutputEmissionRequest,
): L10OutputSurfaceDescriptor {
  const result = validateL10OutputEmission(req);
  if (!result.allowed) {
    const code = result.violationCode ?? L10ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS;
    throw new L10ConstitutionalError(code, result.reason, {
      surfaceId: req.surfaceId,
      outputClass: req.outputClass,
      emitter: req.emitter,
    });
  }
  return L10_OUTPUT_SURFACES.find(s => s.surfaceId === req.surfaceId)!;
}

export function validateL10OutputClassName(name: string): { valid: boolean; reason: string } {
  if (isL10ForbiddenOutputClass(name)) {
    return { valid: false, reason: `"${name}" is a forbidden L10 output class` };
  }
  return { valid: true, reason: 'Output class name is legal' };
}

export function validateL10DownstreamConsumer(
  surfaceId: string,
  consumer: string,
): { valid: boolean; reason: string } {
  const surface = L10_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
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

export function getAllL10RegisteredOutputIds(): readonly string[] {
  return L10_OUTPUT_SURFACES.map(s => s.surfaceId);
}
