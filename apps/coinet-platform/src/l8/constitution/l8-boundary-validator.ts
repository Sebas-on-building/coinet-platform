/**
 * L8.1 — Boundary Validator
 *
 * §8.1.2.5 — Validates whether a proposed L8 component belongs in Layer 8,
 * whether a dependency surface is legal, whether a capability claim is
 * legal, whether an output class is legal, whether recommendation,
 * scenario, or judgment leakage exists, whether action-biased regime
 * labels are being used, and whether multi-regime ambiguity is being
 * laundered.
 *
 * Additional §8.1.5 responsibilities:
 *   - restriction bypass detection
 *   - raw-L6/raw-data regime invention detection
 *   - stale-regime masquerade detection
 *   - lower-layer redefinition detection (L3/L4/L6/L7)
 */

import type {
  L8OutputSurfaceClass,
  L8DependencyUsability,
  L8SubjectClass,
} from '../contracts/l8-constitutional-types';
import {
  isL8RegisteredDependency,
  isL8UsableFor,
} from '../contracts/l8-dependency-surfaces';
import { isL8RegisteredOutput } from '../contracts/l8-output-surfaces';
import {
  isL8LegalOutputClass,
  isL8ForbiddenOutputClass,
  matchesL8Mission,
} from '../contracts/l8-mission';
import {
  containsL8ForbiddenNaming,
  isValidL8ComponentName,
} from '../contracts/l8-boundary';
import { L8ConstitutionalViolationCode } from '../contracts/l8-violation-codes';

export interface L8ComponentDefinition {
  readonly name: string;
  readonly subjectClass: L8SubjectClass;
  readonly outputSurfaceId: string;
  readonly outputClass: L8OutputSurfaceClass;
  readonly dependencySurfaceIds: readonly string[];
  readonly dependencyUsage: L8DependencyUsability;
  readonly description: string;
}

export interface L8BoundaryViolation {
  readonly code: L8ConstitutionalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L8BoundaryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L8BoundaryViolation[];
}

export function validateL8Component(
  def: L8ComponentDefinition,
): L8BoundaryValidationResult {
  const violations: L8BoundaryViolation[] = [];

  if (!isValidL8ComponentName(def.name)) {
    violations.push({
      code: containsL8ForbiddenNaming(def.name)
        ? L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS
        : L8ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'name',
      detail: containsL8ForbiddenNaming(def.name)
        ? `Name "${def.name}" contains forbidden judgment/scenario/recommendation semantics`
        : `Name "${def.name}" is not valid snake_case`,
    });
  }

  if (!isL8RegisteredOutput(def.outputSurfaceId)) {
    violations.push({
      code: L8ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
      field: 'outputSurfaceId',
      detail: `Output surface "${def.outputSurfaceId}" is not registered`,
    });
  }

  if (!isL8LegalOutputClass(def.outputClass)) {
    violations.push({
      code: L8ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'outputClass',
      detail: `Output class "${def.outputClass}" is not legal for Layer 8`,
    });
  }

  for (const depId of def.dependencySurfaceIds) {
    if (!isL8RegisteredDependency(depId)) {
      violations.push({
        code: L8ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not registered`,
      });
    } else if (!isL8UsableFor(depId, def.dependencyUsage)) {
      violations.push({
        code: L8ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not usable for ${def.dependencyUsage}`,
      });
    }
  }

  if (containsL8ForbiddenNaming(def.description)) {
    violations.push({
      code: L8ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      field: 'description',
      detail: 'Description contains forbidden judgment/recommendation language',
    });
  }

  if (!matchesL8Mission(def.description)) {
    violations.push({
      code: L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
      field: 'description',
      detail: 'Description does not match Layer 8 environment-classification mission',
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §8.1.2.4 / §8.1.6.3 — Check whether a proposed output class leaks
 * scenario, judgment, or recommendation semantics.
 */
export function validateL8OutputSemantics(
  outputClassName: string,
): L8BoundaryValidationResult {
  const violations: L8BoundaryViolation[] = [];

  if (isL8ForbiddenOutputClass(outputClassName)) {
    const upper = outputClassName.toUpperCase();
    let code = L8ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS;
    if (upper.includes('SCENARIO')) {
      code = L8ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS;
    } else if (upper.includes('RECOMMENDATION') || upper.includes('TRADE') ||
               upper.includes('BUY') || upper.includes('SELL') ||
               upper.includes('AVOID')) {
      code = L8ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS;
    } else if (upper.includes('JUDGMENT') || upper.includes('THESIS') ||
               upper.includes('CONVICTION') || upper.includes('WINNER') ||
               upper.includes('SCORE')) {
      code = L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    } else {
      code = L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    }
    violations.push({
      code,
      field: 'outputClassName',
      detail: `Output class "${outputClassName}" is forbidden at Layer 8`,
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §8.1.5.3 — Ambiguity laundering detection. A regime component must
 * preserve multi-regime ambiguity and active transitions, not collapse
 * them into fake certainty.
 */
export interface L8AmbiguityHandlingSpec {
  readonly componentId: string;
  readonly strategy:
    | 'PRESERVE_COEXISTENCE'
    | 'EXPLICIT_TRANSITION_FLAG'
    | 'EXPLICIT_LOW_CONFIDENCE'
    | 'TIE_BREAK_BY_RECENT_PRICE'
    | 'TIE_BREAK_BY_PREFERRED_NARRATIVE'
    | 'FLATTEN_TO_SINGLE_REGIME'
    | 'DROP_TRANSITION_DURING_TRANSITION';
}

export function validateL8AmbiguityHandling(
  spec: L8AmbiguityHandlingSpec,
): L8BoundaryValidationResult {
  const violations: L8BoundaryViolation[] = [];
  const illegal: ReadonlyArray<L8AmbiguityHandlingSpec['strategy']> = [
    'TIE_BREAK_BY_RECENT_PRICE',
    'TIE_BREAK_BY_PREFERRED_NARRATIVE',
    'FLATTEN_TO_SINGLE_REGIME',
    'DROP_TRANSITION_DURING_TRANSITION',
  ];
  if (illegal.includes(spec.strategy)) {
    violations.push({
      code: L8ConstitutionalViolationCode.AMBIGUITY_LAUNDERING,
      field: 'strategy',
      detail: `Regime ambiguity strategy "${spec.strategy}" flattens multi-regime ambiguity`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §8.1.5.4 — Restriction bypass detection. Regime outputs must never use
 * a L7 validation result more strongly than its restriction profile
 * allows.
 */
export interface L8RestrictionHandlingSpec {
  readonly componentId: string;
  readonly consumesL7Output: boolean;
  readonly declaresRestrictionPosture: boolean;
  readonly widensDownstreamRights: boolean;
  readonly honoursContradictionPosture: boolean;
}

export function validateL8RestrictionHandling(
  spec: L8RestrictionHandlingSpec,
): L8BoundaryValidationResult {
  const violations: L8BoundaryViolation[] = [];
  if (spec.consumesL7Output && !spec.declaresRestrictionPosture) {
    violations.push({
      code: L8ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
      field: 'declaresRestrictionPosture',
      detail: 'Component consumes L7 output without declaring restriction posture',
    });
  }
  if (spec.widensDownstreamRights) {
    violations.push({
      code: L8ConstitutionalViolationCode.RESTRICTION_BYPASS,
      field: 'widensDownstreamRights',
      detail: 'Component widens downstream rights beyond L7 restriction profile',
    });
  }
  if (spec.consumesL7Output && !spec.honoursContradictionPosture) {
    violations.push({
      code: L8ConstitutionalViolationCode.CONTRADICTION_POSTURE_IGNORED,
      field: 'honoursContradictionPosture',
      detail: 'Component ignores contradiction posture from L7',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §8.1.5.1 — Stale regime masquerade detection. When the underlying
 * lower-layer inputs are stale, regime state must either be explicitly
 * staleness-classified or invalidated — never silently returned as
 * current.
 */
export interface L8StalenessHandlingSpec {
  readonly componentId: string;
  readonly explicitStalenessClassification: boolean;
  readonly invalidatesOnInputStaleness: boolean;
  readonly silentFallbackToLastKnown: boolean;
}

export function validateL8StalenessHandling(
  spec: L8StalenessHandlingSpec,
): L8BoundaryValidationResult {
  const violations: L8BoundaryViolation[] = [];
  if (spec.silentFallbackToLastKnown) {
    violations.push({
      code: L8ConstitutionalViolationCode.STALE_REGIME_MASQUERADE,
      field: 'silentFallbackToLastKnown',
      detail: 'Silent fallback to last-known regime without staleness classification',
    });
  }
  if (!spec.explicitStalenessClassification && !spec.invalidatesOnInputStaleness) {
    violations.push({
      code: L8ConstitutionalViolationCode.STALE_REGIME_MASQUERADE,
      field: 'stalenessHandling',
      detail: 'Component does not propagate staleness nor invalidate on stale inputs',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §8.1.3 / §8.1.5 — Lower-layer redefinition detection. L8 may not
 * re-resolve identity, remap metrics, override confidence law, invent
 * graph semantics, redefine L6 primitives, redefine L7 validation truth,
 * or write outside L5.
 */
export interface L8LowerLayerInteractionSpec {
  readonly componentId: string;
  readonly claimedBehaviors: readonly string[];
}

export function validateL8LowerLayerInteraction(
  spec: L8LowerLayerInteractionSpec,
): L8BoundaryValidationResult {
  const violations: L8BoundaryViolation[] = [];
  const forbiddenPatterns: ReadonlyArray<[RegExp, L8ConstitutionalViolationCode, string]> = [
    [/re[_-]?resolve[_ ]identity/i, L8ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'identity re-resolution'],
    [/remap[_ ]metric/i, L8ConstitutionalViolationCode.PRIMITIVE_REINTERPRETATION, 'metric remap'],
    [/override[_ ]confidence/i, L8ConstitutionalViolationCode.CONFIDENCE_LAW_OVERRIDE, 'confidence override'],
    [/invent[_ ](graph|propagation)/i, L8ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'graph invention'],
    [/direct[_ ]?(postgres|redis|clickhouse)/i, L8ConstitutionalViolationCode.STORAGE_BYPASS, 'direct store write'],
    [/redefine[_ ](feature|event|primitive)/i, L8ConstitutionalViolationCode.PRIMITIVE_REINTERPRETATION, 'primitive redefinition'],
    [/reinterpret[_ ](event|feature|primitive)/i, L8ConstitutionalViolationCode.PRIMITIVE_REINTERPRETATION, 'primitive reinterpretation'],
    [/re[_-]?validate[_ ]?(claim|story|signal)/i, L8ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION, 'validation truth redefinition'],
    [/override[_ ]validation/i, L8ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION, 'validation override'],
    [/bypass[_ ]l7/i, L8ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION, 'L7 bypass'],
    [/ignore[_ ]contradiction/i, L8ConstitutionalViolationCode.CONTRADICTION_POSTURE_IGNORED, 'contradiction ignored'],
    [/widen[_ ]restriction/i, L8ConstitutionalViolationCode.RESTRICTION_BYPASS, 'restriction widened'],
    [/from[_ ]raw[_ ](feed|websocket|provider)/i, L8ConstitutionalViolationCode.RAW_DATA_REGIME_INVENTION, 'raw ungated ingestion'],
    [/live[_ ]from[_ ]l6/i, L8ConstitutionalViolationCode.RAW_L6_REVALIDATION_BYPASS, 'live L6 revalidation'],
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

/**
 * §8.1.6.3 — Multiplier grounding law. A multiplier output must be
 * grounded in a declared regime and honour restriction posture.
 */
export interface L8MultiplierGroundingSpec {
  readonly componentId: string;
  readonly multiplierBoundToRegime: boolean;
  readonly honoursRestrictionPosture: boolean;
  readonly isFinalScoreShape: boolean;
}

export function validateL8MultiplierGrounding(
  spec: L8MultiplierGroundingSpec,
): L8BoundaryValidationResult {
  const violations: L8BoundaryViolation[] = [];
  if (!spec.multiplierBoundToRegime) {
    violations.push({
      code: L8ConstitutionalViolationCode.MULTIPLIER_WITHOUT_REGIME_GROUND,
      field: 'multiplierBoundToRegime',
      detail: 'Multiplier emitted without a grounded regime classification',
    });
  }
  if (!spec.honoursRestrictionPosture) {
    violations.push({
      code: L8ConstitutionalViolationCode.RESTRICTION_BYPASS,
      field: 'honoursRestrictionPosture',
      detail: 'Multiplier ignores L7 restriction posture',
    });
  }
  if (spec.isFinalScoreShape) {
    violations.push({
      code: L8ConstitutionalViolationCode.FORBIDDEN_SCORE_OVERRIDE,
      field: 'isFinalScoreShape',
      detail: 'Multiplier disguises a final score shape — forbidden at Layer 8',
    });
  }
  return { valid: violations.length === 0, violations };
}
