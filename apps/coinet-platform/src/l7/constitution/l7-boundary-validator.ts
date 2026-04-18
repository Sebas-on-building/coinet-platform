/**
 * L7.1 — Boundary Validator
 *
 * §7.1.8.3 — Validates whether a proposed L7 component belongs in Layer 7,
 * whether a dependency surface is legal, whether a capability claim is
 * legal, whether an output class is legal, whether recommendation/
 * scenario/judgment leakage exists, and whether contradiction or
 * ambiguity is being laundered.
 */

import type {
  L7OutputSurfaceClass,
  L7DependencyUsability,
  L7SubjectClass,
} from '../contracts/l7-constitutional-types';
import {
  isRegisteredDependency,
  isUsableFor,
} from '../contracts/l7-dependency-surfaces';
import { isRegisteredOutput } from '../contracts/l7-output-surfaces';
import {
  isLegalOutputClass,
  isForbiddenOutputClass,
  matchesMission,
} from '../contracts/l7-mission';
import {
  containsForbiddenNaming,
  isValidValidationName,
} from '../contracts/l7-boundary';
import { L7BoundaryViolationCode } from '../contracts/l7-violation-codes';

export interface ValidationComponentDefinition {
  readonly name: string;
  readonly subjectClass: L7SubjectClass;
  readonly outputSurfaceId: string;
  readonly outputClass: L7OutputSurfaceClass;
  readonly dependencySurfaceIds: readonly string[];
  readonly dependencyUsage: L7DependencyUsability;
  readonly description: string;
}

export interface BoundaryViolation {
  readonly code: L7BoundaryViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface BoundaryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly BoundaryViolation[];
}

export function validateValidationComponent(
  def: ValidationComponentDefinition,
): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];

  if (!isValidValidationName(def.name)) {
    violations.push({
      code: containsForbiddenNaming(def.name)
        ? L7BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS
        : L7BoundaryViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'name',
      detail: containsForbiddenNaming(def.name)
        ? `Name "${def.name}" contains forbidden judgment/recommendation semantics`
        : `Name "${def.name}" is not valid snake_case`,
    });
  }

  if (!isRegisteredOutput(def.outputSurfaceId)) {
    violations.push({
      code: L7BoundaryViolationCode.UNREGISTERED_OUTPUT,
      field: 'outputSurfaceId',
      detail: `Output surface "${def.outputSurfaceId}" is not registered`,
    });
  }

  if (!isLegalOutputClass(def.outputClass)) {
    violations.push({
      code: L7BoundaryViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'outputClass',
      detail: `Output class "${def.outputClass}" is not legal for Layer 7`,
    });
  }

  for (const depId of def.dependencySurfaceIds) {
    if (!isRegisteredDependency(depId)) {
      violations.push({
        code: L7BoundaryViolationCode.UNREGISTERED_DEPENDENCY,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not registered`,
      });
    } else if (!isUsableFor(depId, def.dependencyUsage)) {
      violations.push({
        code: L7BoundaryViolationCode.ILLEGAL_DEPENDENCY_USAGE,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not usable for ${def.dependencyUsage}`,
      });
    }
  }

  if (containsForbiddenNaming(def.description)) {
    violations.push({
      code: L7BoundaryViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      field: 'description',
      detail: 'Description contains forbidden judgment/recommendation language',
    });
  }

  if (!matchesMission(def.description)) {
    violations.push({
      code: L7BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
      field: 'description',
      detail: 'Description does not match Layer 7 truth-testing mission',
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §7.1.3.4 — Check whether a proposed output class leaks scenario,
 * judgment, or recommendation semantics.
 */
export function validateOutputSemantics(outputClassName: string): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];

  if (isForbiddenOutputClass(outputClassName)) {
    const upper = outputClassName.toUpperCase();
    let code = L7BoundaryViolationCode.ILLEGAL_OUTPUT_CLASS;
    if (upper.includes('SCENARIO') || upper.includes('REGIME')) {
      code = L7BoundaryViolationCode.FORBIDDEN_SCENARIO_SEMANTICS;
    } else if (upper.includes('RECOMMENDATION') || upper.includes('TRADE')) {
      code = L7BoundaryViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS;
    } else {
      code = L7BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    }
    violations.push({
      code,
      field: 'outputClassName',
      detail: `Output class "${outputClassName}" is forbidden at Layer 7`,
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §7.1.6.3 — Contradiction laundering detection. A validation component
 * must preserve contradictions, not collapse them.
 */
export interface ContradictionHandlingSpec {
  readonly componentId: string;
  readonly strategy:
    | 'PRESERVE_ALL'
    | 'PRESERVE_WITH_LINEAGE'
    | 'AVERAGE_AWAY'
    | 'SILENT_DROP'
    | 'SILENT_REWEIGHT_TO_SUPPORT'
    | 'DOWNGRADE_WITHOUT_LAW';
}

export function validateContradictionHandling(
  spec: ContradictionHandlingSpec,
): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];
  const illegal: ReadonlyArray<ContradictionHandlingSpec['strategy']> = [
    'AVERAGE_AWAY',
    'SILENT_DROP',
    'SILENT_REWEIGHT_TO_SUPPORT',
    'DOWNGRADE_WITHOUT_LAW',
  ];
  if (illegal.includes(spec.strategy)) {
    violations.push({
      code: L7BoundaryViolationCode.CONTRADICTION_LAUNDERING,
      field: 'strategy',
      detail: `Contradiction handling strategy "${spec.strategy}" laundering contradictions`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §7.1.6.4 — Ambiguity silent resolution detection.
 */
export interface AmbiguityHandlingSpec {
  readonly componentId: string;
  readonly strategy:
    | 'PRESERVE_AMBIGUITY'
    | 'EXPLICIT_LEGAL_RESOLUTION'
    | 'RESOLVE_BY_RECENT_PRICE'
    | 'RESOLVE_BY_PREFERRED_NARRATIVE'
    | 'RESOLVE_BY_SELECTIVE_WEIGHTING'
    | 'IGNORE_MISSING_CONFIRMATION';
}

export function validateAmbiguityHandling(
  spec: AmbiguityHandlingSpec,
): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];
  const illegal: ReadonlyArray<AmbiguityHandlingSpec['strategy']> = [
    'RESOLVE_BY_RECENT_PRICE',
    'RESOLVE_BY_PREFERRED_NARRATIVE',
    'RESOLVE_BY_SELECTIVE_WEIGHTING',
    'IGNORE_MISSING_CONFIRMATION',
  ];
  if (illegal.includes(spec.strategy)) {
    violations.push({
      code: L7BoundaryViolationCode.AMBIGUITY_SILENT_RESOLUTION,
      field: 'strategy',
      detail: `Ambiguity strategy "${spec.strategy}" silently resolves ambiguity`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §7.1.6.5 — Staleness neglect detection. If staleness materially affects
 * validation, it must remain visible in validation class, modifiers,
 * confidence, or restriction profile.
 */
export interface StalenessHandlingSpec {
  readonly componentId: string;
  readonly propagatesToValidationClass: boolean;
  readonly propagatesToConfidence: boolean;
  readonly propagatesToRestriction: boolean;
  readonly explicitStalenessModifier: boolean;
}

export function validateStalenessHandling(
  spec: StalenessHandlingSpec,
): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];
  const anyPropagation =
    spec.propagatesToValidationClass ||
    spec.propagatesToConfidence ||
    spec.propagatesToRestriction ||
    spec.explicitStalenessModifier;
  if (!anyPropagation) {
    violations.push({
      code: L7BoundaryViolationCode.STALE_SUPPORT_MASQUERADE,
      field: 'stalenessHandling',
      detail: 'Staleness does not propagate to any visible surface',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §7.1.6 — Incompleteness neglect detection.
 */
export interface IncompletenessHandlingSpec {
  readonly componentId: string;
  readonly missingSurfaceAction:
    | 'PROPAGATE_INCOMPLETE_CLASS'
    | 'EXPLICIT_MISSING_EVIDENCE_REASON'
    | 'SILENT_FILL_AS_CONFIRMED'
    | 'SILENT_IGNORE';
}

export function validateIncompletenessHandling(
  spec: IncompletenessHandlingSpec,
): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];
  const illegal: ReadonlyArray<IncompletenessHandlingSpec['missingSurfaceAction']> = [
    'SILENT_FILL_AS_CONFIRMED',
    'SILENT_IGNORE',
  ];
  if (illegal.includes(spec.missingSurfaceAction)) {
    violations.push({
      code: L7BoundaryViolationCode.INCOMPLETENESS_NEGLECT,
      field: 'missingSurfaceAction',
      detail: `Incompleteness action "${spec.missingSurfaceAction}" hides missing support`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §7.1.4 — Lower-layer redefinition detection. L7 may not re-resolve
 * identity, remap metrics, override confidence law, invent graph
 * semantics, or write outside L5.
 */
export interface LowerLayerInteractionSpec {
  readonly componentId: string;
  readonly claimedBehaviors: readonly string[];
}

export function validateLowerLayerInteraction(
  spec: LowerLayerInteractionSpec,
): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];
  const forbiddenPatterns: ReadonlyArray<[RegExp, L7BoundaryViolationCode, string]> = [
    [/re[_-]?resolve[_ ]identity/i, L7BoundaryViolationCode.LOWER_LAYER_REDEFINITION, 'identity re-resolution'],
    [/remap[_ ]metric/i, L7BoundaryViolationCode.PRIMITIVE_REINTERPRETATION, 'metric remap'],
    [/override[_ ]confidence/i, L7BoundaryViolationCode.CONFIDENCE_LAW_OVERRIDE, 'confidence override'],
    [/invent[_ ](graph|propagation)/i, L7BoundaryViolationCode.LOWER_LAYER_REDEFINITION, 'graph invention'],
    [/direct[_ ]?(postgres|redis|clickhouse)/i, L7BoundaryViolationCode.STORAGE_BYPASS, 'direct store write'],
    [/redefine[_ ]feature/i, L7BoundaryViolationCode.PRIMITIVE_REINTERPRETATION, 'feature redefinition'],
    [/reinterpret[_ ](event|feature|primitive)/i, L7BoundaryViolationCode.PRIMITIVE_REINTERPRETATION, 'primitive reinterpretation'],
  ];

  for (const behavior of spec.claimedBehaviors) {
    for (const [pattern, code, label] of forbiddenPatterns) {
      if (pattern.test(behavior)) {
        violations.push({
          code,
          field: 'claimedBehaviors',
          detail: `Behavior "${behavior}" triggers ${label}`,
        });
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
