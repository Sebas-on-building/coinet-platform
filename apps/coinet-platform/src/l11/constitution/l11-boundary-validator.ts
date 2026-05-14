/**
 * L11.1 — Boundary Validator
 *
 * §11.1.5 / §11.1.8 / §11.1.10 / §11.1.15 — Validates whether a
 * proposed L11 component belongs in Layer 11: dependency legality,
 * capability legality, output-class legality, judgment/recommendation/
 * scenario/trade-action leakage, score meaning-claim presence,
 * direction declaration, attribution requirement, missing-data and
 * contradiction disclosure, lower-layer dependency adherence, and
 * calibration capability.
 */

import type {
  L11OutputSurfaceClass,
  L11DependencyUsability,
  L11SubjectClass,
} from '../contracts/l11-constitutional-types';
import {
  isL11RegisteredDependency,
  isL11UsableFor,
} from '../contracts/l11-dependency-surfaces';
import { isL11RegisteredOutput } from '../contracts/l11-output-surfaces';
import {
  isL11LegalOutputClass,
  isL11ForbiddenOutputClass,
  matchesL11Mission,
} from '../contracts/l11-mission';
import {
  containsL11ForbiddenNaming,
  isValidL11ComponentName,
} from '../contracts/l11-boundary';
import {
  detectL11DirectionMixing,
  isValidL11DirectionDeclaration,
  isValidL11MeaningClaim,
  isValidL11RestrictionProfile,
  type L11ScoreDirectionDeclaration,
  type L11ScoreMeaningClaim,
  type L11ScoreRestrictionProfile,
} from '../contracts/l11-score-meaning-law';
import { L11ConstitutionalViolationCode } from '../contracts/l11-violation-codes';

export interface L11ComponentDefinition {
  readonly name: string;
  readonly subjectClass: L11SubjectClass;
  readonly outputSurfaceId: string;
  readonly outputClass: L11OutputSurfaceClass;
  readonly dependencySurfaceIds: readonly string[];
  readonly dependencyUsage: L11DependencyUsability;
  readonly description: string;
}

export interface L11BoundaryViolation {
  readonly code: L11ConstitutionalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L11BoundaryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L11BoundaryViolation[];
}

export function validateL11Component(
  def: L11ComponentDefinition,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];

  if (!isValidL11ComponentName(def.name)) {
    violations.push({
      code: containsL11ForbiddenNaming(def.name)
        ? L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS
        : L11ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'name',
      detail: containsL11ForbiddenNaming(def.name)
        ? `Name "${def.name}" contains forbidden judgment/recommendation/scenario/trade-action/vibe-score semantics`
        : `Name "${def.name}" is not valid snake_case`,
    });
  }

  if (!isL11RegisteredOutput(def.outputSurfaceId)) {
    violations.push({
      code: L11ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
      field: 'outputSurfaceId',
      detail: `Output surface "${def.outputSurfaceId}" is not registered`,
    });
  }

  if (!isL11LegalOutputClass(def.outputClass)) {
    violations.push({
      code: L11ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'outputClass',
      detail: `Output class "${def.outputClass}" is not legal for Layer 11`,
    });
  }

  for (const depId of def.dependencySurfaceIds) {
    if (!isL11RegisteredDependency(depId)) {
      violations.push({
        code: L11ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not registered`,
      });
    } else if (!isL11UsableFor(depId, def.dependencyUsage)) {
      violations.push({
        code: L11ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not usable for ${def.dependencyUsage}`,
      });
    }
  }

  if (containsL11ForbiddenNaming(def.description)) {
    violations.push({
      code: L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      field: 'description',
      detail: 'Description contains forbidden judgment/recommendation/trade-action/vibe-score language',
    });
  }

  if (!matchesL11Mission(def.description)) {
    violations.push({
      code: L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
      field: 'description',
      detail: 'Description does not match Layer 11 deterministic-scoring mission',
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.5.4 / §11.1.9 — Output-class semantic leakage detection.
 */
export function validateL11OutputSemantics(
  outputClassName: string,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];

  if (isL11ForbiddenOutputClass(outputClassName)) {
    const upper = outputClassName.toUpperCase();
    let code: L11ConstitutionalViolationCode =
      L11ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS;
    if (upper.includes('SCENARIO')) {
      code = L11ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS;
    } else if (
      upper.includes('TRADE') ||
      upper.includes('PORTFOLIO') ||
      upper.includes('GUARANTEED') ||
      upper.includes('SAFEST')
    ) {
      code = L11ConstitutionalViolationCode.FORBIDDEN_TRADE_ACTION_SEMANTICS;
    } else if (
      upper.includes('RECOMMENDATION') ||
      upper.includes('BUY') ||
      upper.includes('SELL') ||
      upper.includes('AVOID') ||
      upper.includes('CONVICTION') ||
      upper.includes('ACTIONABLE')
    ) {
      code = L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS;
    } else if (upper.includes('JUDGMENT') || upper.includes('WINNING') || upper.includes('BEST')) {
      code = L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    } else if (upper.includes('VIBE')) {
      code = L11ConstitutionalViolationCode.FORBIDDEN_VIBE_SCORE;
    } else if (upper.includes('UNATTRIBUTED')) {
      code = L11ConstitutionalViolationCode.ATTRIBUTION_ABSENT;
    } else if (upper.includes('UNVERSIONED')) {
      code = L11ConstitutionalViolationCode.VERSION_ABSENT;
    } else {
      code = L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    }
    violations.push({
      code,
      field: 'outputClassName',
      detail: `Output class "${outputClassName}" is forbidden at Layer 11`,
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.10 / §11.1.15 — Score meaning-claim validity.
 */
export function validateL11ScoreMeaning(
  claim: L11ScoreMeaningClaim | null | undefined,
  componentId: string,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (!claim) {
    violations.push({
      code: L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
      field: 'meaningClaim',
      detail: `Component "${componentId}" has no meaning claim — illegal at Layer 11`,
    });
    return { valid: false, violations };
  }
  if (!isValidL11MeaningClaim(claim)) {
    violations.push({
      code: L11ConstitutionalViolationCode.MEANING_CLAIM_ABSENT,
      field: 'meaningClaim',
      detail: `Component "${componentId}" has an incomplete meaning claim`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.10.2 / §11.1.10.3 — Direction declaration validity.
 */
export function validateL11ScoreDirection(
  decl: L11ScoreDirectionDeclaration | null | undefined,
  description: string,
  componentId: string,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (!decl) {
    violations.push({
      code: L11ConstitutionalViolationCode.DIRECTION_UNDECLARED,
      field: 'directionDeclaration',
      detail: `Component "${componentId}" has no direction declaration`,
    });
    return { valid: false, violations };
  }
  if (!isValidL11DirectionDeclaration(decl)) {
    violations.push({
      code: L11ConstitutionalViolationCode.DIRECTION_UNDECLARED,
      field: 'directionDeclaration',
      detail: `Component "${componentId}" has an invalid direction declaration`,
    });
  }
  if (detectL11DirectionMixing(description)) {
    violations.push({
      code: L11ConstitutionalViolationCode.DIRECTION_MIXED,
      field: 'description',
      detail: `Component "${componentId}" mixes higher=better and higher=worse semantics in one score`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.4.2 / §11.1.10 — Attribution requirement validity.
 */
export interface L11AttributionRequirementSpec {
  readonly componentId: string;
  readonly hasAttribution: boolean;
  readonly hasFormulaVersion: boolean;
}

export function validateL11AttributionRequirement(
  spec: L11AttributionRequirementSpec,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (!spec.hasAttribution) {
    violations.push({
      code: L11ConstitutionalViolationCode.ATTRIBUTION_ABSENT,
      field: 'hasAttribution',
      detail: `Component "${spec.componentId}" emits a score without attribution`,
    });
  }
  if (!spec.hasFormulaVersion) {
    violations.push({
      code: L11ConstitutionalViolationCode.VERSION_ABSENT,
      field: 'hasFormulaVersion',
      detail: `Component "${spec.componentId}" emits a score without formula version`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.10 / §11.1.16 — Missing-data and contradiction disclosure.
 */
export interface L11MissingDataHandlingSpec {
  readonly componentId: string;
  readonly disclosesMissingData: boolean;
  readonly laundersMissingData: boolean;
}

export function validateL11MissingDataHandling(
  spec: L11MissingDataHandlingSpec,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (!spec.disclosesMissingData) {
    violations.push({
      code: L11ConstitutionalViolationCode.MISSING_DATA_LAUNDERING,
      field: 'disclosesMissingData',
      detail: `Component "${spec.componentId}" emits a score without missing-data disclosure`,
    });
  }
  if (spec.laundersMissingData) {
    violations.push({
      code: L11ConstitutionalViolationCode.MISSING_DATA_LAUNDERING,
      field: 'laundersMissingData',
      detail: `Component "${spec.componentId}" launders missing data as neutral score truth`,
    });
  }
  return { valid: violations.length === 0, violations };
}

export interface L11ContradictionHandlingSpec {
  readonly componentId: string;
  readonly disclosesContradiction: boolean;
  readonly laundersContradiction: boolean;
}

export function validateL11ContradictionHandling(
  spec: L11ContradictionHandlingSpec,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (!spec.disclosesContradiction) {
    violations.push({
      code: L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING,
      field: 'disclosesContradiction',
      detail: `Component "${spec.componentId}" emits a score without contradiction disclosure`,
    });
  }
  if (spec.laundersContradiction) {
    violations.push({
      code: L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING,
      field: 'laundersContradiction',
      detail: `Component "${spec.componentId}" hides L7 contradiction inside a clean score`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.5.1 / §11.1.5.4 — Recommendation, judgment, scenario, and
 * trade-action leakage detection.
 */
export interface L11LeakageSpec {
  readonly componentId: string;
  readonly emitsRecommendation: boolean;
  readonly emitsJudgment: boolean;
  readonly emitsScenarioWinner: boolean;
  readonly emitsTradeAction: boolean;
  readonly treatsScoreAsAction: boolean;
}

export function validateL11RecommendationLeakage(
  spec: L11LeakageSpec,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (spec.emitsRecommendation) {
    violations.push({
      code: L11ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      field: 'emitsRecommendation',
      detail: `Component "${spec.componentId}" emits recommendation semantics`,
    });
  }
  if (spec.treatsScoreAsAction) {
    violations.push({
      code: L11ConstitutionalViolationCode.SCORE_AS_ACTION,
      field: 'treatsScoreAsAction',
      detail: `Component "${spec.componentId}" treats a score as a trade action`,
    });
  }
  return { valid: violations.length === 0, violations };
}

export function validateL11JudgmentLeakage(
  spec: L11LeakageSpec,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (spec.emitsJudgment) {
    violations.push({
      code: L11ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
      field: 'emitsJudgment',
      detail: `Component "${spec.componentId}" emits final judgment semantics`,
    });
  }
  return { valid: violations.length === 0, violations };
}

export function validateL11ScenarioLeakage(
  spec: L11LeakageSpec,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (spec.emitsScenarioWinner) {
    violations.push({
      code: L11ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS,
      field: 'emitsScenarioWinner',
      detail: `Component "${spec.componentId}" emits scenario winner semantics`,
    });
  }
  if (spec.emitsTradeAction) {
    violations.push({
      code: L11ConstitutionalViolationCode.FORBIDDEN_TRADE_ACTION_SEMANTICS,
      field: 'emitsTradeAction',
      detail: `Component "${spec.componentId}" emits trade action semantics`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.10 / §11.1.17 — Calibration requirement validity.
 */
export interface L11CalibrationRequirementSpec {
  readonly componentId: string;
  readonly hasCalibrationHook: boolean;
  readonly productionGrade: boolean;
}

export function validateL11CalibrationRequirement(
  spec: L11CalibrationRequirementSpec,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (spec.productionGrade && !spec.hasCalibrationHook) {
    violations.push({
      code: L11ConstitutionalViolationCode.CALIBRATION_HOOK_ABSENT,
      field: 'hasCalibrationHook',
      detail: `Production-grade component "${spec.componentId}" lacks a calibration hook`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.11 — Restriction-profile validity for a score's downstream
 * usage rights.
 */
export function validateL11ScoreRestrictionProfile(
  profile: L11ScoreRestrictionProfile | null | undefined,
  componentId: string,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  if (!profile) {
    violations.push({
      code: L11ConstitutionalViolationCode.RESTRICTION_BYPASS,
      field: 'restrictionProfile',
      detail: `Component "${componentId}" emits a score without a restriction profile`,
    });
    return { valid: false, violations };
  }
  if (!isValidL11RestrictionProfile(profile)) {
    violations.push({
      code: L11ConstitutionalViolationCode.RESTRICTION_BYPASS,
      field: 'restrictionProfile',
      detail: `Component "${componentId}" emits a score with an invalid restriction profile`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §11.1.6 — L11 lower-layer interaction detection. Catches forbidden
 * rebuild/override/bypass/laundering language across L3–L10 and
 * late-layer (L12+) consumption.
 */
export interface L11LowerLayerInteractionSpec {
  readonly componentId: string;
  readonly claimedBehaviors: readonly string[];
}

export function validateL11LowerLayerInteraction(
  spec: L11LowerLayerInteractionSpec,
): L11BoundaryValidationResult {
  const violations: L11BoundaryViolation[] = [];
  const forbiddenPatterns: ReadonlyArray<
    [RegExp, L11ConstitutionalViolationCode, string]
  > = [
    [/re[_-]?resolve[_ ]identity/i, L11ConstitutionalViolationCode.IDENTITY_REDEFINITION, 'identity re-resolution'],
    [/shadow[_ ]identity[_ ]map/i, L11ConstitutionalViolationCode.IDENTITY_REDEFINITION, 'shadow identity map'],
    [/redefine[_ ]metric/i, L11ConstitutionalViolationCode.METRIC_REDEFINITION, 'metric redefinition'],
    [/invent[_ ](graph|propagation|edge)/i, L11ConstitutionalViolationCode.GRAPH_REDEFINITION, 'graph invention'],
    [/redefine[_ ](feature|event|primitive)/i, L11ConstitutionalViolationCode.PRIMITIVE_REDEFINITION, 'primitive redefinition'],
    [/reinterpret[_ ](event|feature|primitive)/i, L11ConstitutionalViolationCode.PRIMITIVE_REDEFINITION, 'primitive reinterpretation'],
    [/re[_-]?validate[_ ]?(claim|story|signal)/i, L11ConstitutionalViolationCode.L7_LIVE_REVALIDATION, 'L7 live revalidation'],
    [/override[_ ]validation/i, L11ConstitutionalViolationCode.L7_LIVE_REVALIDATION, 'validation override'],
    [/live[_ ]from[_ ]l6/i, L11ConstitutionalViolationCode.L7_LIVE_REVALIDATION, 'live L6 revalidation'],
    [/bypass[_ ]l7/i, L11ConstitutionalViolationCode.L7_LIVE_REVALIDATION, 'L7 bypass'],
    [/ignore[_ ]contradiction/i, L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING, 'contradiction ignored'],
    [/launder[_ ]contradiction/i, L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING, 'contradiction laundering'],
    [/hide[_ ]contradiction/i, L11ConstitutionalViolationCode.CONTRADICTION_LAUNDERING, 'contradiction hidden'],
    [/launder[_ ]missing[_ ]data/i, L11ConstitutionalViolationCode.MISSING_DATA_LAUNDERING, 'missing-data laundering'],
    [/hide[_ ]missing[_ ]data/i, L11ConstitutionalViolationCode.MISSING_DATA_LAUNDERING, 'missing-data hidden'],
    [/widen[_ ]restriction/i, L11ConstitutionalViolationCode.RESTRICTION_BYPASS, 'restriction widened'],
    [/ignore[_ ]restriction/i, L11ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED, 'restriction ignored'],
    [/reinterpret[_ ]regime/i, L11ConstitutionalViolationCode.REGIME_RECLASSIFICATION, 'regime reinterpretation'],
    [/override[_ ]regime/i, L11ConstitutionalViolationCode.REGIME_RECLASSIFICATION, 'regime override'],
    [/ignore[_ ]regime/i, L11ConstitutionalViolationCode.REGIME_POSTURE_IGNORED, 'regime posture ignored'],
    [/reinterpret[_ ]sequence/i, L11ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION, 'sequence reinterpretation'],
    [/override[_ ]sequence/i, L11ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION, 'sequence override'],
    [/ignore[_ ]sequence/i, L11ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED, 'sequence posture ignored'],
    [/rebuild[_ ]hypothesis/i, L11ConstitutionalViolationCode.L10_HYPOTHESIS_REBUILD, 'hypothesis rebuild'],
    [/rebuild[_ ]hypotheses/i, L11ConstitutionalViolationCode.L10_HYPOTHESIS_REBUILD, 'hypothesis rebuild'],
    [/derive[_ ]hypothesis[_ ]from[_ ](l[3-9]|raw)/i, L11ConstitutionalViolationCode.L10_HYPOTHESIS_REBUILD, 'hypothesis re-derivation'],
    [/ignore[_ ]hypothesis[_ ]spread/i, L11ConstitutionalViolationCode.HYPOTHESIS_SPREAD_IGNORED, 'hypothesis spread ignored'],
    [/hide[_ ]hypothesis[_ ]spread/i, L11ConstitutionalViolationCode.HYPOTHESIS_SPREAD_IGNORED, 'hypothesis spread hidden'],
    [/ignore[_ ]hypothesis[_ ]reliance/i, L11ConstitutionalViolationCode.HYPOTHESIS_RELIANCE_IGNORED, 'hypothesis reliance ignored'],
    [/ignore[_ ]hypothesis[_ ]posture/i, L11ConstitutionalViolationCode.HYPOTHESIS_POSTURE_IGNORED, 'hypothesis posture ignored'],
    [/ignore[_ ]invalidation/i, L11ConstitutionalViolationCode.HYPOTHESIS_POSTURE_IGNORED, 'invalidation posture ignored'],
    [/from[_ ]raw[_ ](feed|websocket|provider)/i, L11ConstitutionalViolationCode.LOWER_LAYER_REBUILD, 'raw ungated ingestion'],
    [/bypass[_ ]l5/i, L11ConstitutionalViolationCode.STORAGE_BYPASS, 'L5 bypass'],
    [/direct[_ ]?(postgres|redis|clickhouse)/i, L11ConstitutionalViolationCode.STORAGE_BYPASS, 'direct store write'],
    [/consume[_ ]l1[2-9]/i, L11ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'later-layer consumption'],
    [/consume[_ ]l2[0-9]/i, L11ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'later-layer consumption'],
    [/consume[_ ]scenario[_ ]from[_ ]l/i, L11ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'scenario consumption'],
    [/consume[_ ]judgment[_ ]from[_ ]l/i, L11ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'judgment consumption'],
    [/consume[_ ]recommendation[_ ]from[_ ]l/i, L11ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'recommendation consumption'],
    [/score[_ ]as[_ ]action/i, L11ConstitutionalViolationCode.SCORE_AS_ACTION, 'score-as-action'],
    [/score[_ ]means[_ ]buy/i, L11ConstitutionalViolationCode.SCORE_AS_ACTION, 'score-means-buy'],
    [/score[_ ]means[_ ]sell/i, L11ConstitutionalViolationCode.SCORE_AS_ACTION, 'score-means-sell'],
    [/rebuild[_ ]l[3-9][_ ]?(primitive|validation|regime|sequence)/i, L11ConstitutionalViolationCode.LOWER_LAYER_REBUILD, 'lower-layer rebuild'],
    [/recompute[_ ](validation|regime|sequence|primitive)/i, L11ConstitutionalViolationCode.LOWER_LAYER_REBUILD, 'lower-layer recomputation'],
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
