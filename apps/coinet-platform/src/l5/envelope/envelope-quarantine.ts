/**
 * L5.4 Universal Write Contract — Reject vs Quarantine Law
 *
 * §5.4.13 — Reject vs Quarantine
 */

import type { EnvelopeValidationResult, ValidationViolation } from './envelope-validator';

export type EnvelopeDisposition = 'ACCEPTED' | 'REJECTED' | 'QUARANTINED';

export interface EnvelopeDispositionResult {
  readonly disposition: EnvelopeDisposition;
  readonly rejectReasons: readonly string[];
  readonly quarantineReasons: readonly string[];
}

export function determineDisposition(validation: EnvelopeValidationResult): EnvelopeDispositionResult {
  if (validation.shouldReject) {
    return {
      disposition: 'REJECTED',
      rejectReasons: validation.violations
        .filter(v => v.severity === 'REJECT')
        .map(v => v.message),
      quarantineReasons: [],
    };
  }

  if (validation.shouldQuarantine) {
    return {
      disposition: 'QUARANTINED',
      rejectReasons: [],
      quarantineReasons: validation.violations
        .filter(v => v.severity === 'QUARANTINE')
        .map(v => v.message),
    };
  }

  return { disposition: 'ACCEPTED', rejectReasons: [], quarantineReasons: [] };
}

export function isAccepted(disposition: EnvelopeDisposition): boolean {
  return disposition === 'ACCEPTED';
}
