/**
 * L6.2 — Universal Primitive Contract Validator
 *
 * §6.2.6.1 / §6.2.6.4 / §6.2.6.5 — No hidden interpretation law. Every
 * primitive must declare identity, scope, inputs, transformation class,
 * quality/confidence contracts, null policy, freshness, lineage, and version.
 *
 * This validator is SHARED by feature- and event-contract validators. Kind-
 * specific rules and state/change separation live in their own validators.
 */

import {
  L6PrimitiveValidationResult,
  L6PrimitiveViolation,
  L6PrimitiveViolationCode,
  fail,
  ok,
  violation,
} from './validation-result';
import {
  isValidFamilyName,
  isValidPrimitiveId,
  isValidVersionTag,
} from '../contracts/primitive-class';
import {
  ALL_TRANSFORMATION_CLASSES,
  L6TransformationClass,
  isFeatureTransformation,
  isEventTransformation,
} from '../contracts/primitive-transformation-class';
import {
  ALL_NULL_POLICIES,
  FORBIDDEN_NULL_POLICY_TOKENS,
} from '../contracts/primitive-null-policy';
import { isCompleteLineagePolicy } from '../contracts/primitive-lineage-policy';
import {
  describesContradictionLegally,
  FORBIDDEN_COLLAPSE_TOKENS,
  L6ContradictionArtifactType,
} from '../contracts/primitive-contradiction';
import {
  CommonPrimitiveContract,
  ALL_SCOPE_TYPES,
  ALL_SCOPE_GRANULARITIES,
} from '../contracts/primitive-contract';
import { L6PrimitiveClass } from '../contracts/primitive-class';
import { isValidPrimitiveName } from '../contracts/l6-boundary';

export function validateCommonPrimitiveContract(
  c: CommonPrimitiveContract,
): L6PrimitiveValidationResult {
  const v: L6PrimitiveViolation[] = [];

  if (!c.primitive_class || !Object.values(L6PrimitiveClass).includes(c.primitive_class)) {
    v.push(violation(L6PrimitiveViolationCode.ILLEGAL_PRIMITIVE_CLASS, 'primitive_class',
      `primitive_class must be one of ${Object.values(L6PrimitiveClass).join(', ')}.`, {}));
  }

  if (!c.primitive_id || !isValidPrimitiveId(c.primitive_id)) {
    v.push(violation(L6PrimitiveViolationCode.INVALID_PRIMITIVE_ID, 'primitive_id',
      `primitive_id must match "<family>.<name>.v<version>".`, { got: c.primitive_id }));
  }

  if (!c.family || !isValidFamilyName(c.family)) {
    v.push(violation(L6PrimitiveViolationCode.INCOMPLETE_IDENTITY, 'family',
      `family must be a lowercase snake_case identifier.`, { got: c.family }));
  }

  if (!c.name || !isValidPrimitiveName(c.name)) {
    v.push(violation(L6PrimitiveViolationCode.INCOMPLETE_IDENTITY, 'name',
      `name must be a valid L6 primitive name (lowercase snake_case, no forbidden semantics).`,
      { got: c.name }));
  }

  if (!c.version || !isValidVersionTag(c.version)) {
    v.push(violation(L6PrimitiveViolationCode.INVALID_VERSION_TAG, 'version',
      `version must match "v<N>(.N)(.N)" pattern.`, { got: c.version }));
  }

  if (!c.scope) {
    v.push(violation(L6PrimitiveViolationCode.MISSING_SCOPE, 'scope',
      `scope contract is required.`, {}));
  } else {
    if (!ALL_SCOPE_TYPES.includes(c.scope.scope_type)) {
      v.push(violation(L6PrimitiveViolationCode.MISSING_SCOPE, 'scope.scope_type',
        `scope_type must be one of ${ALL_SCOPE_TYPES.join(', ')}.`, { got: c.scope.scope_type }));
    }
    if (!ALL_SCOPE_GRANULARITIES.includes(c.scope.scope_granularity)) {
      v.push(violation(L6PrimitiveViolationCode.MISSING_SCOPE, 'scope.scope_granularity',
        `scope_granularity must be one of ${ALL_SCOPE_GRANULARITIES.join(', ')}.`,
        { got: c.scope.scope_granularity }));
    }
  }

  if (!Array.isArray(c.required_inputs) || c.required_inputs.length === 0) {
    v.push(violation(L6PrimitiveViolationCode.MISSING_INPUTS, 'required_inputs',
      `At least one required input surface must be declared.`, {}));
  } else {
    c.required_inputs.forEach((r, i) => {
      if (!r || !r.surfaceId || !r.fromLayer) {
        v.push(violation(L6PrimitiveViolationCode.EMPTY_INPUT_SURFACE_REF,
          `required_inputs[${i}]`,
          `Input surface reference is incomplete.`, { ref: r }));
      }
    });
  }

  if (!c.transformation_class || !ALL_TRANSFORMATION_CLASSES.includes(c.transformation_class)) {
    v.push(violation(L6PrimitiveViolationCode.MISSING_TRANSFORMATION_CLASS, 'transformation_class',
      `transformation_class must be a registered L6TransformationClass.`,
      { got: c.transformation_class }));
  } else {
    if (c.primitive_class === L6PrimitiveClass.FEATURE && !isFeatureTransformation(c.transformation_class)) {
      v.push(violation(L6PrimitiveViolationCode.INCOMPATIBLE_TRANSFORMATION_CLASS, 'transformation_class',
        `transformation_class "${c.transformation_class}" is not compatible with a FEATURE primitive.`,
        { transformation_class: c.transformation_class }));
    }
    if (c.primitive_class === L6PrimitiveClass.EVENT && !isEventTransformation(c.transformation_class)) {
      v.push(violation(L6PrimitiveViolationCode.INCOMPATIBLE_TRANSFORMATION_CLASS, 'transformation_class',
        `transformation_class "${c.transformation_class}" is not compatible with an EVENT primitive.`,
        { transformation_class: c.transformation_class }));
    }
  }

  if (!c.quality_gate_spec) {
    v.push(violation(L6PrimitiveViolationCode.MISSING_QUALITY_GATE, 'quality_gate_spec',
      `quality_gate_spec is required.`, {}));
  } else {
    const q = c.quality_gate_spec;
    if (typeof q.minInputQuality !== 'number' || typeof q.minConfidence !== 'number') {
      v.push(violation(L6PrimitiveViolationCode.MISSING_QUALITY_GATE, 'quality_gate_spec',
        `quality_gate_spec must declare numeric thresholds.`, {}));
    }
  }

  if (!c.confidence_derivation_spec) {
    v.push(violation(L6PrimitiveViolationCode.MISSING_CONFIDENCE_DERIVATION, 'confidence_derivation_spec',
      `confidence_derivation_spec is required.`, {}));
  }

  if (!c.null_policy) {
    v.push(violation(L6PrimitiveViolationCode.MISSING_NULL_POLICY, 'null_policy',
      `null_policy is required.`, {}));
  } else {
    if (!ALL_NULL_POLICIES.includes(c.null_policy.policy)) {
      v.push(violation(L6PrimitiveViolationCode.MISSING_NULL_POLICY, 'null_policy.policy',
        `null_policy.policy must be a registered L6NullPolicy.`, { got: c.null_policy.policy }));
    }
    const upperRationale = (c.null_policy.rationale || '').toUpperCase();
    for (const tok of FORBIDDEN_NULL_POLICY_TOKENS) {
      if (upperRationale.includes(tok)) {
        v.push(violation(L6PrimitiveViolationCode.FORBIDDEN_NEUTRAL_FILL, 'null_policy.rationale',
          `null_policy rationale references forbidden neutral-fill behavior.`,
          { matched: tok }));
        break;
      }
    }
  }

  if (!c.freshness_budget) {
    v.push(violation(L6PrimitiveViolationCode.MISSING_FRESHNESS_BUDGET, 'freshness_budget',
      `freshness_budget is required.`, {}));
  }

  if (!c.lineage_policy) {
    v.push(violation(L6PrimitiveViolationCode.MISSING_LINEAGE_POLICY, 'lineage_policy',
      `lineage_policy is required.`, {}));
  } else if (!isCompleteLineagePolicy(c.lineage_policy)) {
    v.push(violation(L6PrimitiveViolationCode.INCOMPLETE_LINEAGE_POLICY, 'lineage_policy',
      `lineage_policy must declare scope, source/schema version carry, and replay compatibility.`,
      {}));
  }

  if (!c.contradiction_support) {
    v.push(violation(L6PrimitiveViolationCode.CONTRADICTION_SUPPORT_MISSING, 'contradiction_support',
      `contradiction_support is required (even if unsupported, must be declared).`, {}));
  } else if (!describesContradictionLegally(c.contradiction_support)) {
    v.push(violation(L6PrimitiveViolationCode.CONTRADICTION_SUPPORT_MISSING, 'contradiction_support',
      `contradiction_support claims support without proper artifact type or source separation.`, {}));
  } else if (c.contradiction_support.supports) {
    const upperRationale = (c.contradiction_support.rationale || '').toUpperCase();
    for (const tok of FORBIDDEN_COLLAPSE_TOKENS) {
      if (upperRationale.includes(tok)) {
        v.push(violation(L6PrimitiveViolationCode.CONTRADICTION_COLLAPSE_ATTEMPT, 'contradiction_support.rationale',
          `contradiction_support rationale describes a forbidden collapse behavior.`,
          { matched: tok }));
        break;
      }
    }
    if (c.contradiction_support.artifactType &&
      !Object.values(L6ContradictionArtifactType).includes(c.contradiction_support.artifactType)) {
      v.push(violation(L6PrimitiveViolationCode.CONTRADICTION_SUPPORT_MISSING, 'contradiction_support.artifactType',
        `Unknown contradiction artifact type.`, { got: c.contradiction_support.artifactType }));
    }
  }

  return v.length === 0 ? ok() : fail(v);
}

export function transformationClassMatchesPrimitiveClass(
  cls: L6TransformationClass,
  primitive: L6PrimitiveClass,
): boolean {
  if (primitive === L6PrimitiveClass.FEATURE) return isFeatureTransformation(cls);
  if (primitive === L6PrimitiveClass.EVENT) return isEventTransformation(cls);
  return false;
}
