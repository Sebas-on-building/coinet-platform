/**
 * L6.2 — Primitive Separation Validator
 *
 * §6.2.4 — Feature = state. Event = change. The distinction is absolute.
 * This validator rejects:
 *  - features that carry lifecycle / trigger / resolution fields
 *  - events that lack trigger / confirmation / lifecycle contracts
 *  - events defined as pure steady-state descriptors
 *  - composites that illegally mix state and change semantics
 *  - naming that implies onset/resolution on a feature or steady-state on an event
 */

import {
  L6PrimitiveValidationResult,
  L6PrimitiveViolation,
  L6PrimitiveViolationCode,
  fail,
  ok,
  violation,
} from './validation-result';
import { L6PrimitiveClass } from '../contracts/primitive-class';

const FEATURE_FORBIDDEN_LIFECYCLE_FIELDS: readonly string[] = [
  'trigger_spec',
  'confirmation_spec',
  'resolution_spec',
  'expiry_spec',
  'lifecycle_policy',
  'severity_spec',
  'dedupe_spec',
  'suppression_spec',
  'cooldown_policy',
];

const EVENT_REQUIRED_CHANGE_FIELDS: readonly string[] = [
  'trigger_spec',
  'confirmation_spec',
  'resolution_spec',
  'lifecycle_policy',
];

const FEATURE_ONSET_RESOLUTION_NAME_PATTERNS: readonly RegExp[] = [
  /_onset$/i,
  /_resolution$/i,
  /_resolved$/i,
  /_cooling$/i,
  /_expired$/i,
  /_confirmed$/i,
  /_burst$/i,
  /_breakout$/i,
  /_spike$/i,
];

const EVENT_STEADY_STATE_NAME_PATTERNS: readonly RegExp[] = [
  /_score$/i,
  /_index$/i,
  /_ratio$/i,
  /_z_score$/i,
  /_percentile$/i,
  /_level$/i,
];

export interface SeparationInspectable {
  readonly primitive_class: L6PrimitiveClass;
  readonly name: string;
  readonly fields: Record<string, unknown>;
}

export function validatePrimitiveSeparation(
  input: SeparationInspectable,
): L6PrimitiveValidationResult {
  const v: L6PrimitiveViolation[] = [];

  if (input.primitive_class === L6PrimitiveClass.FEATURE) {
    for (const field of FEATURE_FORBIDDEN_LIFECYCLE_FIELDS) {
      if (hasMeaningfulValue(input.fields, field)) {
        v.push(violation(
          L6PrimitiveViolationCode.FEATURE_HAS_EVENT_LIFECYCLE,
          `feature_contract.${field}`,
          `Feature primitive "${input.name}" carries event-lifecycle field "${field}".`,
          { field },
        ));
      }
    }
    for (const p of FEATURE_ONSET_RESOLUTION_NAME_PATTERNS) {
      if (p.test(input.name)) {
        v.push(violation(
          L6PrimitiveViolationCode.MIXED_STATE_AND_CHANGE,
          'name',
          `Feature name "${input.name}" implies event onset/resolution semantics.`,
          { matched: p.source },
        ));
        break;
      }
    }
  } else if (input.primitive_class === L6PrimitiveClass.EVENT) {
    for (const field of EVENT_REQUIRED_CHANGE_FIELDS) {
      if (!hasMeaningfulValue(input.fields, field)) {
        const code = field === 'trigger_spec'
          ? L6PrimitiveViolationCode.EVENT_LACKS_TRIGGER
          : field === 'lifecycle_policy'
            ? L6PrimitiveViolationCode.EVENT_LACKS_LIFECYCLE
            : L6PrimitiveViolationCode.EVENT_IS_STEADY_STATE;
        v.push(violation(
          code,
          `event_contract.${field}`,
          `Event primitive "${input.name}" is missing required change field "${field}".`,
          { field },
        ));
      }
    }
    for (const p of EVENT_STEADY_STATE_NAME_PATTERNS) {
      if (p.test(input.name)) {
        v.push(violation(
          L6PrimitiveViolationCode.EVENT_IS_STEADY_STATE,
          'name',
          `Event name "${input.name}" implies steady-state descriptor semantics.`,
          { matched: p.source },
        ));
        break;
      }
    }
  } else {
    v.push(violation(
      L6PrimitiveViolationCode.ILLEGAL_PRIMITIVE_CLASS,
      'primitive_class',
      `Unknown primitive class "${String(input.primitive_class)}".`,
      {},
    ));
  }

  return v.length === 0 ? ok() : fail(v);
}

function hasMeaningfulValue(obj: Record<string, unknown>, field: string): boolean {
  if (!(field in obj)) return false;
  const v = obj[field];
  if (v === null || v === undefined) return false;
  if (typeof v === 'string' && v.length === 0) return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

export function featureForbiddenLifecycleFields(): readonly string[] {
  return FEATURE_FORBIDDEN_LIFECYCLE_FIELDS;
}

export function eventRequiredChangeFields(): readonly string[] {
  return EVENT_REQUIRED_CHANGE_FIELDS;
}
