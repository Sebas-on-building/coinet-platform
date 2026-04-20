/**
 * L9.1 — Boundary Validator
 *
 * §9.1.2.5 / §9.1.6 — Validates whether a proposed L9 component belongs
 * in Layer 9: whether its dependency surfaces are legal, whether its
 * capability claim is legal, whether its output class is legal, whether
 * recommendation/scenario/judgment/score/hypothesis leakage exists,
 * whether action-biased sequence labels are being used, whether
 * ordering ambiguity is being laundered, whether temporal adjacency is
 * being promoted into causal certainty, and whether L7/L8 posture is
 * being honoured.
 */

import type {
  L9OutputSurfaceClass,
  L9DependencyUsability,
  L9SubjectClass,
} from '../contracts/l9-constitutional-types';
import {
  isL9RegisteredDependency,
  isL9UsableFor,
} from '../contracts/l9-dependency-surfaces';
import { isL9RegisteredOutput } from '../contracts/l9-output-surfaces';
import {
  isL9LegalOutputClass,
  isL9ForbiddenOutputClass,
  matchesL9Mission,
} from '../contracts/l9-mission';
import {
  containsL9ForbiddenNaming,
  isValidL9ComponentName,
} from '../contracts/l9-boundary';
import { L9ConstitutionalViolationCode } from '../contracts/l9-violation-codes';

export interface L9ComponentDefinition {
  readonly name: string;
  readonly subjectClass: L9SubjectClass;
  readonly outputSurfaceId: string;
  readonly outputClass: L9OutputSurfaceClass;
  readonly dependencySurfaceIds: readonly string[];
  readonly dependencyUsage: L9DependencyUsability;
  readonly description: string;
}

export interface L9BoundaryViolation {
  readonly code: L9ConstitutionalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L9BoundaryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L9BoundaryViolation[];
}

export function validateL9Component(
  def: L9ComponentDefinition,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];

  if (!isValidL9ComponentName(def.name)) {
    violations.push({
      code: containsL9ForbiddenNaming(def.name)
        ? L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS
        : L9ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'name',
      detail: containsL9ForbiddenNaming(def.name)
        ? `Name "${def.name}" contains forbidden judgment/scenario/recommendation/action-bias semantics`
        : `Name "${def.name}" is not valid snake_case`,
    });
  }

  if (!isL9RegisteredOutput(def.outputSurfaceId)) {
    violations.push({
      code: L9ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
      field: 'outputSurfaceId',
      detail: `Output surface "${def.outputSurfaceId}" is not registered`,
    });
  }

  if (!isL9LegalOutputClass(def.outputClass)) {
    violations.push({
      code: L9ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'outputClass',
      detail: `Output class "${def.outputClass}" is not legal for Layer 9`,
    });
  }

  for (const depId of def.dependencySurfaceIds) {
    if (!isL9RegisteredDependency(depId)) {
      violations.push({
        code: L9ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not registered`,
      });
    } else if (!isL9UsableFor(depId, def.dependencyUsage)) {
      violations.push({
        code: L9ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not usable for ${def.dependencyUsage}`,
      });
    }
  }

  if (containsL9ForbiddenNaming(def.description)) {
    violations.push({
      code: L9ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      field: 'description',
      detail: 'Description contains forbidden judgment/scenario/recommendation/action-bias language',
    });
  }

  if (!matchesL9Mission(def.description)) {
    violations.push({
      code: L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
      field: 'description',
      detail: 'Description does not match Layer 9 sequence & temporal-meaning mission',
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §9.1.3.4 / §9.1.6.4 — Check whether a proposed output class leaks
 * scenario, judgment, score, recommendation, hypothesis, or
 * action-biased sequence semantics.
 */
export function validateL9OutputSemantics(
  outputClassName: string,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];

  if (isL9ForbiddenOutputClass(outputClassName)) {
    const upper = outputClassName.toUpperCase();
    let code: L9ConstitutionalViolationCode =
      L9ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS;
    if (upper.includes('SCENARIO')) {
      code = L9ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS;
    } else if (upper.includes('HYPOTHESIS')) {
      code = L9ConstitutionalViolationCode.FORBIDDEN_HYPOTHESIS_SEMANTICS;
    } else if (upper.includes('CAUSAL_CERTAINTY')) {
      code = L9ConstitutionalViolationCode.CAUSAL_LAUNDERING;
    } else if (
      upper.includes('RECOMMENDATION') ||
      upper.includes('TRADE') ||
      upper.includes('BUY') ||
      upper.includes('SELL') ||
      upper.includes('AVOID') ||
      upper.includes('ENTRY_READY') ||
      upper.includes('TRADE_READY')
    ) {
      code = L9ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS;
    } else if (upper.includes('SCORE')) {
      code = L9ConstitutionalViolationCode.FORBIDDEN_SCORE_SEMANTICS;
    } else if (
      upper.includes('JUDGMENT') ||
      upper.includes('THESIS') ||
      upper.includes('CONVICTION') ||
      upper.includes('WINNING') ||
      upper.includes('BEST') ||
      upper.includes('IDEAL') ||
      upper.includes('ALPHA') ||
      upper.includes('ACTIONABLE')
    ) {
      code = L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    } else {
      code = L9ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    }
    violations.push({
      code,
      field: 'outputClassName',
      detail: `Output class "${outputClassName}" is forbidden at Layer 9`,
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §9.1.6.1 / §9.1.3.5 — Ambiguity and causal-laundering detection. L9
 * must preserve ordering ambiguity explicitly and must never promote
 * temporal adjacency into causal certainty.
 */
export interface L9AmbiguityHandlingSpec {
  readonly componentId: string;
  readonly strategy:
    | 'PRESERVE_AMBIGUITY_POSTURE'
    | 'EXPLICIT_AMBIGUOUS_FLAG'
    | 'EXPLICIT_LOW_CONFIDENCE'
    | 'TIE_BREAK_BY_RECENT_PRICE'
    | 'TIE_BREAK_BY_PREFERRED_NARRATIVE'
    | 'FLATTEN_TO_CLEAN_CHAIN'
    | 'DROP_AMBIGUITY_FLAG';
}

export function validateL9AmbiguityHandling(
  spec: L9AmbiguityHandlingSpec,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];
  const illegal: ReadonlyArray<L9AmbiguityHandlingSpec['strategy']> = [
    'TIE_BREAK_BY_RECENT_PRICE',
    'TIE_BREAK_BY_PREFERRED_NARRATIVE',
    'FLATTEN_TO_CLEAN_CHAIN',
    'DROP_AMBIGUITY_FLAG',
  ];
  if (illegal.includes(spec.strategy)) {
    violations.push({
      code: L9ConstitutionalViolationCode.AMBIGUITY_LAUNDERING,
      field: 'strategy',
      detail: `Ambiguity strategy "${spec.strategy}" flattens ordering ambiguity`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §9.1.6.1 / §9.1.3.5 — Causal-restraint enforcement. L9 must tag
 * lead-lag and chain outputs with causal-restraint posture. No output
 * may promote temporal adjacency into causal certainty.
 */
export interface L9CausalRestraintSpec {
  readonly componentId: string;
  readonly declaresCausalRestraint: boolean;
  readonly claimsCausalCertainty: boolean;
}

export function validateL9CausalRestraint(
  spec: L9CausalRestraintSpec,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];
  if (spec.claimsCausalCertainty) {
    violations.push({
      code: L9ConstitutionalViolationCode.CAUSAL_LAUNDERING,
      field: 'claimsCausalCertainty',
      detail: 'Component promotes temporal adjacency into causal certainty',
    });
  }
  if (!spec.declaresCausalRestraint) {
    violations.push({
      code: L9ConstitutionalViolationCode.CAUSAL_LAUNDERING,
      field: 'declaresCausalRestraint',
      detail: 'Sequence/lead-lag component emitted without causal-restraint tagging',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §9.1.4.6 / §9.1.6.1 — L7 restriction/contradiction posture handling
 * for L9 components.
 */
export interface L9RestrictionHandlingSpec {
  readonly componentId: string;
  readonly consumesL7Output: boolean;
  readonly declaresRestrictionPosture: boolean;
  readonly widensDownstreamRights: boolean;
  readonly honoursContradictionPosture: boolean;
}

export function validateL9RestrictionHandling(
  spec: L9RestrictionHandlingSpec,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];
  if (spec.consumesL7Output && !spec.declaresRestrictionPosture) {
    violations.push({
      code: L9ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
      field: 'declaresRestrictionPosture',
      detail: 'Component consumes L7 output without declaring restriction posture',
    });
  }
  if (spec.widensDownstreamRights) {
    violations.push({
      code: L9ConstitutionalViolationCode.RESTRICTION_BYPASS,
      field: 'widensDownstreamRights',
      detail: 'Component widens downstream rights beyond L7 restriction profile',
    });
  }
  if (spec.consumesL7Output && !spec.honoursContradictionPosture) {
    violations.push({
      code: L9ConstitutionalViolationCode.CONTRADICTION_POSTURE_IGNORED,
      field: 'honoursContradictionPosture',
      detail: 'Component ignores contradiction posture from L7',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §9.1.4.7 / §9.1.6.1 — L8 regime posture handling. Sequence meaning
 * depends on environment; regime posture must be honoured.
 */
export interface L9RegimeHandlingSpec {
  readonly componentId: string;
  readonly consumesL8Output: boolean;
  readonly honoursRegimePosture: boolean;
  readonly reinterpretsRegime: boolean;
}

export function validateL9RegimeHandling(
  spec: L9RegimeHandlingSpec,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];
  if (spec.consumesL8Output && !spec.honoursRegimePosture) {
    violations.push({
      code: L9ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
      field: 'honoursRegimePosture',
      detail: 'Component consumes L8 regime output without honouring regime posture',
    });
  }
  if (spec.reinterpretsRegime) {
    violations.push({
      code: L9ConstitutionalViolationCode.REGIME_REINTERPRETATION,
      field: 'reinterpretsRegime',
      detail: 'Component locally reinterprets L8 regime truth',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §9.1.6.2 — Staleness handling. L9 must explicitly classify stale
 * sequence or invalidate on stale inputs; silent fallback to last-known
 * sequence is forbidden.
 */
export interface L9StalenessHandlingSpec {
  readonly componentId: string;
  readonly explicitStalenessClassification: boolean;
  readonly invalidatesOnInputStaleness: boolean;
  readonly silentFallbackToLastKnown: boolean;
}

export function validateL9StalenessHandling(
  spec: L9StalenessHandlingSpec,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];
  if (spec.silentFallbackToLastKnown) {
    violations.push({
      code: L9ConstitutionalViolationCode.STALE_SEQUENCE_MASQUERADE,
      field: 'silentFallbackToLastKnown',
      detail: 'Silent fallback to last-known sequence without staleness classification',
    });
  }
  if (!spec.explicitStalenessClassification && !spec.invalidatesOnInputStaleness) {
    violations.push({
      code: L9ConstitutionalViolationCode.STALE_SEQUENCE_MASQUERADE,
      field: 'stalenessHandling',
      detail: 'Component does not propagate staleness nor invalidate on stale inputs',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §9.1.3 / §9.1.4 / §9.1.6 — Lower-layer redefinition detection.
 * Catches identity re-resolution (L3), graph/propagation invention (L4),
 * primitive reinterpretation (L6), validation override (L7), regime
 * reinterpretation (L8), L5 bypass, and late-layer consumption.
 */
export interface L9LowerLayerInteractionSpec {
  readonly componentId: string;
  readonly claimedBehaviors: readonly string[];
}

export function validateL9LowerLayerInteraction(
  spec: L9LowerLayerInteractionSpec,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];
  const forbiddenPatterns: ReadonlyArray<[RegExp, L9ConstitutionalViolationCode, string]> = [
    [/re[_-]?resolve[_ ]identity/i, L9ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'identity re-resolution'],
    [/shadow[_ ]identity[_ ]map/i, L9ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'shadow identity map'],
    [/remap[_ ]metric/i, L9ConstitutionalViolationCode.PRIMITIVE_REINTERPRETATION, 'metric remap'],
    [/override[_ ]confidence/i, L9ConstitutionalViolationCode.CONFIDENCE_LAW_OVERRIDE, 'confidence override'],
    [/invent[_ ](graph|propagation|edge)/i, L9ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'graph invention'],
    [/direct[_ ]?(postgres|redis|clickhouse)/i, L9ConstitutionalViolationCode.STORAGE_BYPASS, 'direct store write'],
    [/redefine[_ ](feature|event|primitive)/i, L9ConstitutionalViolationCode.PRIMITIVE_REINTERPRETATION, 'primitive redefinition'],
    [/reinterpret[_ ](event|feature|primitive)/i, L9ConstitutionalViolationCode.PRIMITIVE_REINTERPRETATION, 'primitive reinterpretation'],
    [/re[_-]?validate[_ ]?(claim|story|signal)/i, L9ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION, 'validation truth redefinition'],
    [/override[_ ]validation/i, L9ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION, 'validation override'],
    [/bypass[_ ]l7/i, L9ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION, 'L7 bypass'],
    [/ignore[_ ]contradiction/i, L9ConstitutionalViolationCode.CONTRADICTION_POSTURE_IGNORED, 'contradiction ignored'],
    [/widen[_ ]restriction/i, L9ConstitutionalViolationCode.RESTRICTION_BYPASS, 'restriction widened'],
    [/reinterpret[_ ]regime/i, L9ConstitutionalViolationCode.REGIME_REINTERPRETATION, 'regime reinterpretation'],
    [/override[_ ]regime/i, L9ConstitutionalViolationCode.REGIME_REINTERPRETATION, 'regime override'],
    [/ignore[_ ]regime/i, L9ConstitutionalViolationCode.REGIME_POSTURE_IGNORED, 'regime posture ignored'],
    [/from[_ ]raw[_ ](feed|websocket|provider)/i, L9ConstitutionalViolationCode.RAW_DATA_SEQUENCE_INVENTION, 'raw ungated ingestion'],
    [/live[_ ]from[_ ]l6/i, L9ConstitutionalViolationCode.RAW_L6_REVALIDATION_BYPASS, 'live L6 revalidation'],
    [/bypass[_ ]l5/i, L9ConstitutionalViolationCode.STORAGE_BYPASS, 'L5 bypass'],
    [/consume[_ ]l1[0-9]/i, L9ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'later-layer consumption'],
    [/consume[_ ]scenario/i, L9ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'scenario consumption'],
    [/consume[_ ]judgment/i, L9ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'judgment consumption'],
    [/consume[_ ]recommendation/i, L9ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'recommendation consumption'],
    [/causal[_ ]certainty/i, L9ConstitutionalViolationCode.CAUSAL_LAUNDERING, 'causal certainty claim'],
    [/proven[_ ]causality/i, L9ConstitutionalViolationCode.CAUSAL_LAUNDERING, 'proven causality claim'],
    [/flatten[_ ]ambiguity/i, L9ConstitutionalViolationCode.AMBIGUITY_LAUNDERING, 'ambiguity flattening'],
    [/drop[_ ]ambiguity/i, L9ConstitutionalViolationCode.AMBIGUITY_LAUNDERING, 'ambiguity dropped'],
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
 * §9.1.6.2 — Evidence-only-as-decisive detection. Evidence-only read
 * surfaces may not be treated as decisive chain support.
 */
export interface L9EvidenceGroundingSpec {
  readonly componentId: string;
  readonly usesEvidenceOnlySurface: boolean;
  readonly treatsEvidenceAsDecisive: boolean;
  readonly hasNonEvidencePrimarySupport: boolean;
}

export function validateL9EvidenceGrounding(
  spec: L9EvidenceGroundingSpec,
): L9BoundaryValidationResult {
  const violations: L9BoundaryViolation[] = [];
  if (spec.usesEvidenceOnlySurface && spec.treatsEvidenceAsDecisive) {
    violations.push({
      code: L9ConstitutionalViolationCode.EVIDENCE_ONLY_AS_DECISIVE,
      field: 'treatsEvidenceAsDecisive',
      detail: 'Component treats an evidence-only surface as decisive chain support',
    });
  }
  if (spec.usesEvidenceOnlySurface && !spec.hasNonEvidencePrimarySupport) {
    violations.push({
      code: L9ConstitutionalViolationCode.EVIDENCE_ONLY_AS_DECISIVE,
      field: 'hasNonEvidencePrimarySupport',
      detail: 'Component has no non-evidence primary support alongside evidence-only surface',
    });
  }
  return { valid: violations.length === 0, violations };
}
