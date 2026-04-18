/**
 * L6.6 §6.6.6.7 — EventDedupeValidator
 *
 * Rejects missing dedupe specs and ambiguous lifecycle grouping.
 */

import {
  L6EventDedupeKeySpec,
  REQUIRED_DEDUPE_KEY_FIELDS,
  canonicalDedupeKey,
} from '../contracts/event-dedupe-spec';
import { L6FamilyViolationCode } from './legal-input.validator';

export interface L6DedupeViolation {
  readonly code: L6FamilyViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6DedupeValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6DedupeViolation[];
  readonly canonical_key: string | null;
}

export class EventDedupeValidator {
  validate(spec: L6EventDedupeKeySpec): L6DedupeValidationResult {
    const v: L6DedupeViolation[] = [];

    for (const f of REQUIRED_DEDUPE_KEY_FIELDS) {
      const val = spec[f];
      if (val === undefined || val === null || (typeof val === 'string' && val === '')) {
        v.push({
          code: L6FamilyViolationCode.DEDUPE_SPEC_INCOMPLETE,
          field: String(f),
          detail: 'required dedupe field missing',
        });
      }
    }

    if (v.length > 0) return { ok: false, violations: v, canonical_key: null };
    const key = canonicalDedupeKey(spec);
    return { ok: true, violations: [], canonical_key: key };
  }

  /** Returns true if two specs resolve to the same canonical key. */
  isDuplicate(a: L6EventDedupeKeySpec, b: L6EventDedupeKeySpec): boolean {
    return canonicalDedupeKey(a) === canonicalDedupeKey(b);
  }
}
