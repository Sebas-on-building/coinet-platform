/**
 * L6.2 — Feature Contract Validator
 *
 * §6.2.6.2 / §6.2.6.4 — Enforces the feature contract surface, including:
 *  - universal primitive contract legality
 *  - kind legality via FeatureKindRegistry
 *  - state-vs-change separation
 *  - judgment-leakage absence
 *  - warmup / vector / composite completeness
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
import { FeatureContract, L6FeatureValueKind, FEATURE_VALUE_SHAPE_BY_KIND } from '../contracts/feature-contract';
import { L6PrimitiveClass } from '../contracts/primitive-class';
import { validateCommonPrimitiveContract } from './primitive-contract.validator';
import { validatePrimitiveSeparation } from './primitive-separation.validator';
import { validateFeatureKind } from './primitive-kind.validator';
import { validateJudgmentLeakage } from './primitive-judgment-leakage.validator';
import { featureKindAllowsValueShape } from '../registry/feature-kind.registry';

export function validateFeatureContract(fc: FeatureContract): L6PrimitiveValidationResult {
  const v: L6PrimitiveViolation[] = [];

  if (fc.primitive_class !== L6PrimitiveClass.FEATURE) {
    v.push(violation(
      L6PrimitiveViolationCode.ILLEGAL_PRIMITIVE_CLASS,
      'primitive_class',
      `FeatureContract.primitive_class must be FEATURE.`,
      { got: fc.primitive_class },
    ));
  }

  if (!Object.values(L6FeatureValueKind).includes(fc.value_kind)) {
    v.push(violation(
      L6PrimitiveViolationCode.MISSING_REQUIRED_KIND_FIELD,
      'value_kind',
      `value_kind must be a registered L6FeatureValueKind.`,
      { got: fc.value_kind },
    ));
  } else {
    const expectedShape = FEATURE_VALUE_SHAPE_BY_KIND[fc.value_kind];
    if (fc.feature_kind && !featureKindAllowsValueShape(fc.feature_kind, expectedShape)) {
      v.push(violation(
        L6PrimitiveViolationCode.MISSING_REQUIRED_KIND_FIELD,
        'feature_kind',
        `Feature kind "${fc.feature_kind}" does not allow value shape "${expectedShape}".`,
        { feature_kind: fc.feature_kind, expectedShape },
      ));
    }
  }

  if (!fc.warmup_requirement) {
    v.push(violation(
      L6PrimitiveViolationCode.MISSING_REQUIRED_KIND_FIELD,
      'warmup_requirement',
      `Feature contract must declare warmup_requirement.`,
      {},
    ));
  }

  if (!fc.event_link_policy || fc.event_link_policy.emitsStateOnly !== true ||
      fc.event_link_policy.forbidsLifecycleFields !== true) {
    v.push(violation(
      L6PrimitiveViolationCode.FEATURE_HAS_EVENT_LIFECYCLE,
      'event_link_policy',
      `event_link_policy must assert emitsStateOnly and forbidsLifecycleFields.`,
      {},
    ));
  }

  if (fc.value_kind === L6FeatureValueKind.NUMBER_VECTOR) {
    if (!fc.vector_aggregation ||
        !Array.isArray(fc.vector_aggregation.horizons) ||
        fc.vector_aggregation.horizons.length === 0) {
      v.push(violation(
        L6PrimitiveViolationCode.VECTOR_AGGREGATION_INCOMPLETE,
        'vector_aggregation',
        `NUMBER_VECTOR feature requires non-empty vector_aggregation.horizons.`,
        {},
      ));
    }
  }

  if (fc.value_kind === L6FeatureValueKind.COMPOSITE) {
    if (!fc.composite_spec ||
        !Array.isArray(fc.composite_spec.constituents) ||
        fc.composite_spec.constituents.length === 0) {
      v.push(violation(
        L6PrimitiveViolationCode.COMPOSITE_SPEC_INCOMPLETE,
        'composite_spec',
        `COMPOSITE feature requires non-empty composite_spec.constituents.`,
        {},
      ));
    }
  }

  const common = validateCommonPrimitiveContract(fc);

  const kindFields: Record<string, unknown> = { ...(fc as unknown as Record<string, unknown>) };
  const kind = validateFeatureKind(fc.feature_kind as unknown as string, kindFields);

  const sep = validatePrimitiveSeparation({
    primitive_class: L6PrimitiveClass.FEATURE,
    name: fc.name,
    fields: kindFields,
  });

  const judgment = validateJudgmentLeakage({
    name: fc.name,
    description: fc.description,
    transformationToken: fc.transformation_class as unknown as string,
  });

  const local = v.length === 0 ? ok() : fail(v);
  return mergeResults(local, common, kind, sep, judgment);
}
