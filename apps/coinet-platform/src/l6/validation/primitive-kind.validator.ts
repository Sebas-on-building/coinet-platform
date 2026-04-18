/**
 * L6.2 — Primitive Kind Validator
 *
 * §6.2.5.5 — Kind legality law:
 *  - unregistered kinds are illegal
 *  - required kind fields must be present
 *  - forbidden kind fields must be absent
 *  - mixed kinds are illegal
 */

import {
  L6PrimitiveValidationResult,
  L6PrimitiveViolation,
  L6PrimitiveViolationCode,
  fail,
  ok,
  violation,
} from './validation-result';
import { L6FeatureKind } from '../contracts/feature-kind';
import { L6EventKind } from '../contracts/event-kind';
import {
  featureKindForbiddenFields,
  featureKindRequiredFields,
  isRegisteredFeatureKind,
} from '../registry/feature-kind.registry';
import {
  eventKindForbiddenFields,
  eventKindRequiredFields,
  isRegisteredEventKind,
} from '../registry/event-kind.registry';

export function validateFeatureKind(
  kind: string,
  contractFields: Record<string, unknown>,
): L6PrimitiveValidationResult {
  const v: L6PrimitiveViolation[] = [];

  if (!isRegisteredFeatureKind(kind)) {
    v.push(violation(
      L6PrimitiveViolationCode.UNREGISTERED_FEATURE_KIND,
      'feature_kind',
      `Feature kind "${kind}" is not registered.`,
      { kind },
    ));
    return fail(v);
  }

  const required = featureKindRequiredFields(kind as L6FeatureKind);
  const forbidden = featureKindForbiddenFields(kind as L6FeatureKind);

  for (const field of required) {
    if (!hasMeaningfulValue(contractFields, field)) {
      v.push(violation(
        L6PrimitiveViolationCode.MISSING_REQUIRED_KIND_FIELD,
        `feature_contract.${field}`,
        `Feature kind "${kind}" requires field "${field}".`,
        { kind, field },
      ));
    }
  }

  for (const field of forbidden) {
    if (hasMeaningfulValue(contractFields, field)) {
      v.push(violation(
        L6PrimitiveViolationCode.FORBIDDEN_KIND_FIELD_PRESENT,
        `feature_contract.${field}`,
        `Feature kind "${kind}" forbids field "${field}".`,
        { kind, field },
      ));
    }
  }

  return v.length === 0 ? ok() : fail(v);
}

export function validateEventKind(
  kind: string,
  contractFields: Record<string, unknown>,
): L6PrimitiveValidationResult {
  const v: L6PrimitiveViolation[] = [];

  if (!isRegisteredEventKind(kind)) {
    v.push(violation(
      L6PrimitiveViolationCode.UNREGISTERED_EVENT_KIND,
      'event_kind',
      `Event kind "${kind}" is not registered.`,
      { kind },
    ));
    return fail(v);
  }

  const required = eventKindRequiredFields(kind as L6EventKind);
  const forbidden = eventKindForbiddenFields(kind as L6EventKind);

  for (const field of required) {
    if (!hasMeaningfulValue(contractFields, field)) {
      v.push(violation(
        L6PrimitiveViolationCode.MISSING_REQUIRED_KIND_FIELD,
        `event_contract.${field}`,
        `Event kind "${kind}" requires field "${field}".`,
        { kind, field },
      ));
    }
  }

  for (const field of forbidden) {
    if (hasMeaningfulValue(contractFields, field)) {
      v.push(violation(
        L6PrimitiveViolationCode.FORBIDDEN_KIND_FIELD_PRESENT,
        `event_contract.${field}`,
        `Event kind "${kind}" forbids field "${field}".`,
        { kind, field },
      ));
    }
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
