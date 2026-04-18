/**
 * L6.2 — Event Contract Validator
 *
 * §6.2.6.3 / §6.2.6.4 — Enforces the event contract surface, including:
 *  - universal primitive contract legality
 *  - kind legality via EventKindRegistry
 *  - change-vs-state separation
 *  - judgment-leakage absence
 *  - lifecycle/shape legality, evidence completeness, dedupe integrity
 */

import {
  L6PrimitiveValidationResult,
  L6PrimitiveViolation,
  L6PrimitiveViolationCode,
  fail,
  mergeResults,
  ok,
  violation,
} from './validation-result';
import {
  EventContract,
  L6EventLifecycleState,
  L6EventSeverityLevel,
} from '../contracts/event-contract';
import { L6PrimitiveClass } from '../contracts/primitive-class';
import { validateCommonPrimitiveContract } from './primitive-contract.validator';
import { validatePrimitiveSeparation } from './primitive-separation.validator';
import { validateEventKind } from './primitive-kind.validator';
import { validateJudgmentLeakage } from './primitive-judgment-leakage.validator';
import { eventKindAllowsLifecycleShape } from '../registry/event-kind.registry';

export function validateEventContract(ec: EventContract): L6PrimitiveValidationResult {
  const v: L6PrimitiveViolation[] = [];

  if (ec.primitive_class !== L6PrimitiveClass.EVENT) {
    v.push(violation(
      L6PrimitiveViolationCode.ILLEGAL_PRIMITIVE_CLASS,
      'primitive_class',
      `EventContract.primitive_class must be EVENT.`,
      { got: ec.primitive_class },
    ));
  }

  if (!ec.lifecycle_policy) {
    v.push(violation(
      L6PrimitiveViolationCode.EVENT_LACKS_LIFECYCLE,
      'lifecycle_policy',
      `Event contract must declare lifecycle_policy.`,
      {},
    ));
  } else {
    const shape = ec.lifecycle_policy.shape;
    if (ec.event_kind && !eventKindAllowsLifecycleShape(ec.event_kind, shape)) {
      v.push(violation(
        L6PrimitiveViolationCode.EVENT_LIFECYCLE_SHAPE_ILLEGAL,
        'lifecycle_policy.shape',
        `Event kind "${ec.event_kind}" does not allow lifecycle shape "${shape}".`,
        { event_kind: ec.event_kind, shape },
      ));
    }
    const allowed = ec.lifecycle_policy.allowedStates || [];
    const unknownStates = allowed.filter(s => !Object.values(L6EventLifecycleState).includes(s));
    if (unknownStates.length > 0) {
      v.push(violation(
        L6PrimitiveViolationCode.EVENT_LIFECYCLE_SHAPE_ILLEGAL,
        'lifecycle_policy.allowedStates',
        `lifecycle_policy.allowedStates contains unknown states.`,
        { unknownStates },
      ));
    }
  }

  if (!ec.severity_spec) {
    v.push(violation(
      L6PrimitiveViolationCode.INVALID_EVIDENCE_REQUIREMENTS,
      'severity_spec',
      `Event contract must declare severity_spec.`,
      {},
    ));
  } else {
    const bad = ec.severity_spec.allowedLevels.filter(l => !Object.values(L6EventSeverityLevel).includes(l));
    if (bad.length > 0) {
      v.push(violation(
        L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_SEVERITY,
        'severity_spec.allowedLevels',
        `severity_spec.allowedLevels contains unknown severity levels.`,
        { bad },
      ));
    }
  }

  if (!ec.evidence_requirements ||
      typeof ec.evidence_requirements.minEvidenceSources !== 'number' ||
      ec.evidence_requirements.minEvidenceSources < 1) {
    v.push(violation(
      L6PrimitiveViolationCode.INVALID_EVIDENCE_REQUIREMENTS,
      'evidence_requirements',
      `Event contract must declare at least one evidence source.`,
      {},
    ));
  }

  if (!ec.dedupe_spec ||
      !Array.isArray(ec.dedupe_spec.dedupeKeyFields) ||
      ec.dedupe_spec.dedupeKeyFields.length === 0) {
    v.push(violation(
      L6PrimitiveViolationCode.INVALID_DEDUPE_SPEC,
      'dedupe_spec',
      `Event contract must declare dedupe_spec with at least one dedupe key field.`,
      {},
    ));
  }

  const common = validateCommonPrimitiveContract(ec);

  const kindFields: Record<string, unknown> = { ...(ec as unknown as Record<string, unknown>) };
  const kind = validateEventKind(ec.event_kind as unknown as string, kindFields);

  const sep = validatePrimitiveSeparation({
    primitive_class: L6PrimitiveClass.EVENT,
    name: ec.name,
    fields: kindFields,
  });

  const severityLabels = ec.severity_spec?.allowedLevels as unknown as string[] | undefined;

  const judgment = validateJudgmentLeakage({
    name: ec.name,
    description: ec.description,
    transformationToken: ec.transformation_class as unknown as string,
    severityLabels,
  });

  const local = v.length === 0 ? ok() : fail(v);
  return mergeResults(local, common, kind, sep, judgment);
}
