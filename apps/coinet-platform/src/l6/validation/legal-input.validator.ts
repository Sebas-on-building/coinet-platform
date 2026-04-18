/**
 * L6.6 §6.6.2.11 — IllegalInputBypassValidator
 *
 * Blocks raw payload, cache-only truth, non-canonical id, UI aggregate,
 * unregistered surface, and ungated reference data usage.
 */

import {
  L6IllegalInputReason,
} from '../contracts/legal-input-surface';
import { LegalInputSurfaceRegistry } from '../registry/legal-input-surface.registry';

export enum L6FamilyViolationCode {
  ILLEGAL_INPUT_SURFACE = 'ILLEGAL_INPUT_SURFACE',
  UNREGISTERED_INPUT_SURFACE = 'UNREGISTERED_INPUT_SURFACE',
  DEPENDENCY_NOT_CLASSED = 'DEPENDENCY_NOT_CLASSED',
  DEPENDENCY_MISUSE = 'DEPENDENCY_MISUSE',
  SCOPE_NOT_ALLOWED = 'SCOPE_NOT_ALLOWED',
  FAMILY_FIELD_MISSING = 'FAMILY_FIELD_MISSING',
  EVENT_TRIGGER_MISSING = 'EVENT_TRIGGER_MISSING',
  EVENT_CONFIRMATION_MISSING = 'EVENT_CONFIRMATION_MISSING',
  EVENT_EVIDENCE_MISSING = 'EVENT_EVIDENCE_MISSING',
  EVENT_RESOLUTION_MISSING = 'EVENT_RESOLUTION_MISSING',
  EVENT_SUPPRESSION_MISSING = 'EVENT_SUPPRESSION_MISSING',
  DEDUPE_SPEC_INCOMPLETE = 'DEDUPE_SPEC_INCOMPLETE',
  SUPPRESSION_SPEC_INCOMPLETE = 'SUPPRESSION_SPEC_INCOMPLETE',
  SUPPRESSION_CONFLICT = 'SUPPRESSION_CONFLICT',
  FAMILY_BYPASSES_LOWER_LAW = 'FAMILY_BYPASSES_LOWER_LAW',
}

export const ALL_FAMILY_VIOLATION_CODES: readonly L6FamilyViolationCode[] =
  Object.values(L6FamilyViolationCode);

export interface L6InputValidationViolation {
  readonly code: L6FamilyViolationCode;
  readonly surface_id: string;
  readonly illegal_reason: L6IllegalInputReason | null;
  readonly detail: string;
}

export interface L6InputValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6InputValidationViolation[];
}

const KNOWN_ILLEGAL_PATTERNS: readonly { pattern: RegExp; reason: L6IllegalInputReason }[] = [
  { pattern: /^raw\./i, reason: L6IllegalInputReason.RAW_PROVIDER_PAYLOAD },
  { pattern: /^cache\./i, reason: L6IllegalInputReason.STALE_CACHE_AS_TRUTH },
  { pattern: /^ui\./i, reason: L6IllegalInputReason.UI_ONLY_AGGREGATE },
  { pattern: /unscoped/i, reason: L6IllegalInputReason.UNSCOPED_JSON_BLOB },
  { pattern: /provider_native/i, reason: L6IllegalInputReason.RAW_PROVIDER_PAYLOAD },
  { pattern: /ungated_ref/i, reason: L6IllegalInputReason.UNGATED_REFERENCE_DATA },
];

export class IllegalInputBypassValidator {
  constructor(private readonly registry: LegalInputSurfaceRegistry) {}

  validate(surface_ids: readonly string[]): L6InputValidationResult {
    const v: L6InputValidationViolation[] = [];
    for (const sid of surface_ids) {
      // Pattern-based illegal detection
      for (const p of KNOWN_ILLEGAL_PATTERNS) {
        if (p.pattern.test(sid)) {
          v.push({
            code: L6FamilyViolationCode.ILLEGAL_INPUT_SURFACE,
            surface_id: sid,
            illegal_reason: p.reason,
            detail: `surface_id matches illegal pattern: ${p.reason}`,
          });
        }
      }
      // Must be registered
      if (!this.registry.isRegistered(sid)) {
        v.push({
          code: L6FamilyViolationCode.UNREGISTERED_INPUT_SURFACE,
          surface_id: sid,
          illegal_reason: L6IllegalInputReason.UNREGISTERED_SURFACE,
          detail: `surface_id ${sid} not in LegalInputSurfaceRegistry`,
        });
      }
    }
    return { ok: v.length === 0, violations: v };
  }
}
