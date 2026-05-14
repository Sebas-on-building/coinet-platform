/**
 * L12.1 — Boundary Validator
 *
 * §12.1.12 / §12.1.18 — Validates whether a proposed L12 component
 * belongs in Layer 12: dependency legality, capability legality, output
 * surface legality, prediction-theater detection, recommendation/
 * judgment/trade-action leakage, conditionality structure, lower-layer
 * rebuild detection, L11 score-context bundle completeness, regime/
 * sequence/hypothesis posture handling, restriction handling, evidence
 * grounding, and invalidation/trigger requirements.
 */

import {
  isL12ForbiddenOutputClass,
  isL12LegalOutputClass,
  matchesL12Mission,
  detectL12ConditionalLanguage,
  detectL12JudgmentLanguage,
  detectL12PredictionTheater,
  detectL12RecommendationLanguage,
} from '../contracts/l12-mission';
import {
  containsL12ForbiddenNaming,
  isValidL12ComponentName,
} from '../contracts/l12-boundary';
import {
  isL12RegisteredDependency,
  isL12UsableFor,
  L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
} from '../contracts/l12-dependency-surfaces';
import { isL12RegisteredOutput } from '../contracts/l12-output-surfaces';
import {
  L12ConstitutionalViolationCode,
} from '../contracts/l12-violation-codes';
import type {
  L12DependencyUsability,
  L12OutputSurfaceClass,
  L12SubjectClass,
} from '../contracts/l12-constitutional-types';

export interface L12BoundaryViolation {
  readonly code: L12ConstitutionalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L12BoundaryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L12BoundaryViolation[];
}

export interface L12ComponentDefinition {
  readonly name: string;
  readonly subjectClass: L12SubjectClass;
  readonly outputSurfaceId: string;
  readonly outputClass: L12OutputSurfaceClass;
  readonly dependencySurfaceIds: readonly string[];
  readonly dependencyUsage: L12DependencyUsability;
  readonly description: string;
}

/* ── 12.1.12.1 — validateL12Component ── */
export function validateL12Component(
  def: L12ComponentDefinition,
): L12BoundaryValidationResult {
  const violations: L12BoundaryViolation[] = [];

  if (!isValidL12ComponentName(def.name)) {
    violations.push({
      code: containsL12ForbiddenNaming(def.name)
        ? L12ConstitutionalViolationCode.L12C_FORBIDDEN_NAMING
        : L12ConstitutionalViolationCode.L12C_ILLEGAL_OUTPUT_CLASS,
      field: 'name',
      detail: containsL12ForbiddenNaming(def.name)
        ? `Name "${def.name}" contains forbidden prediction/recommendation/judgment/trade-action/rebuild semantics`
        : `Name "${def.name}" is not valid snake_case`,
    });
  }

  if (!isL12RegisteredOutput(def.outputSurfaceId)) {
    violations.push({
      code: L12ConstitutionalViolationCode.L12C_OUTPUT_SURFACE_UNREGISTERED,
      field: 'outputSurfaceId',
      detail: `Output surface "${def.outputSurfaceId}" not registered`,
    });
  }
  if (!isL12LegalOutputClass(def.outputClass)) {
    violations.push({
      code: L12ConstitutionalViolationCode.L12C_ILLEGAL_OUTPUT_CLASS,
      field: 'outputClass',
      detail: `Output class "${def.outputClass}" not legal at L12`,
    });
  }

  for (const depId of def.dependencySurfaceIds) {
    if (!isL12RegisteredDependency(depId)) {
      violations.push({
        code: L12ConstitutionalViolationCode.L12C_DEPENDENCY_SURFACE_UNREGISTERED,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" not registered`,
      });
    } else if (!isL12UsableFor(depId, def.dependencyUsage)) {
      violations.push({
        code: L12ConstitutionalViolationCode.L12C_ILLEGAL_DEPENDENCY_USAGE,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" not usable for ${def.dependencyUsage}`,
      });
    }
  }

  if (containsL12ForbiddenNaming(def.description)) {
    violations.push({
      code: L12ConstitutionalViolationCode.L12C_FORBIDDEN_NAMING,
      field: 'description',
      detail: 'Description contains forbidden semantics',
    });
  }
  if (!matchesL12Mission(def.description)) {
    violations.push({
      code: L12ConstitutionalViolationCode.L12C_MISSION_MISMATCH,
      field: 'description',
      detail: 'Description does not match Layer 12 conditional-scenario mission',
    });
  }

  return { valid: violations.length === 0, violations };
}

/* ── 12.1.12.2 — validateL12MissionAlignment ── */
export function validateL12MissionAlignment(
  description: string,
  componentId: string,
): L12BoundaryValidationResult {
  const violations: L12BoundaryViolation[] = [];
  if (!matchesL12Mission(description)) {
    violations.push({
      code: L12ConstitutionalViolationCode.L12C_MISSION_MISMATCH,
      field: 'description',
      detail: `Component "${componentId}" does not match L12 mission`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/* ── 12.1.12.3 — validateL12OutputSemantics ── */
export function validateL12OutputSemantics(
  outputClassName: string,
): L12BoundaryValidationResult {
  const violations: L12BoundaryViolation[] = [];
  if (isL12ForbiddenOutputClass(outputClassName)) {
    const upper = outputClassName.toUpperCase();
    let code = L12ConstitutionalViolationCode.L12C_ILLEGAL_OUTPUT_CLASS;
    if (upper.includes('PREDICTION') || upper.includes('GUARANTEED') || upper.includes('CERTAIN') || upper.includes('INEVITABLE') || upper.includes('CANNOT_FAIL')) {
      code = L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER;
    } else if (upper.includes('SCENARIO_WINNER') || upper.includes('FINAL_SCENARIO') || upper.includes('WINNING') || upper.includes('FINAL_JUDGMENT')) {
      code = L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK;
    } else if (upper.includes('TRADE') || upper.includes('PORTFOLIO') || upper.includes('ENTRY_READY')) {
      code = L12ConstitutionalViolationCode.L12C_TRADE_ACTION_LEAK;
    } else if (upper.includes('BUY') || upper.includes('SELL') || upper.includes('AVOID') || upper.includes('RECOMMENDATION') || upper.includes('CONVICTION') || upper.includes('ACTIONABLE')) {
      code = L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK;
    }
    violations.push({
      code,
      field: 'outputClassName',
      detail: `Output class "${outputClassName}" forbidden at L12`,
    });
  }
  return { valid: violations.length === 0, violations };
}

/* ── 12.1.12.4 — validateL12Conditionality ── */
export interface L12ConditionalitySpec {
  readonly componentId: string;
  readonly hasConditions: boolean;
  readonly hasTriggers: boolean;
  readonly hasInvalidations: boolean;
  readonly hasPathConfidence: boolean;
}

export function validateL12Conditionality(
  spec: L12ConditionalitySpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.hasConditions) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_CONDITION_OMITTED,
      field: 'hasConditions',
      detail: `Component "${spec.componentId}" has no conditions`,
    });
  }
  if (!spec.hasTriggers) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_TRIGGER_OMITTED,
      field: 'hasTriggers',
      detail: `Component "${spec.componentId}" has no triggers`,
    });
  }
  if (!spec.hasInvalidations) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_INVALIDATION_OMITTED,
      field: 'hasInvalidations',
      detail: `Component "${spec.componentId}" has no invalidations`,
    });
  }
  if (!spec.hasPathConfidence) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_PATH_CONFIDENCE_LAUNDERING,
      field: 'hasPathConfidence',
      detail: `Component "${spec.componentId}" emits without path confidence`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 12.1.12.5 — validateL12PredictionTheater / RecommendationLeakage / JudgmentLeakage ── */
export interface L12LeakageSpec {
  readonly componentId: string;
  readonly text: string;
}

export function validateL12PredictionTheater(
  spec: L12LeakageSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (detectL12PredictionTheater(spec.text)) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER,
      field: 'text',
      detail: `Component "${spec.componentId}" speaks like a prediction`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

export function validateL12RecommendationLeakage(
  spec: L12LeakageSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (detectL12RecommendationLanguage(spec.text)) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK,
      field: 'text',
      detail: `Component "${spec.componentId}" leaks recommendation`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

export function validateL12JudgmentLeakage(
  spec: L12LeakageSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (detectL12JudgmentLanguage(spec.text)) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK,
      field: 'text',
      detail: `Component "${spec.componentId}" leaks final judgment`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 12.1.12.6 — validateL12LowerLayerInteraction ── */
export interface L12LowerLayerInteractionSpec {
  readonly componentId: string;
  readonly claimedBehaviors: readonly string[];
}

export function validateL12LowerLayerInteraction(
  spec: L12LowerLayerInteractionSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  const patterns: ReadonlyArray<[RegExp, L12ConstitutionalViolationCode, string]> = [
    [/redefine[_\s]?identity/i, L12ConstitutionalViolationCode.L12C_LOWER_LAYER_REDEFINITION, 'identity redefinition'],
    [/redefine[_\s]?metric/i, L12ConstitutionalViolationCode.L12C_LOWER_LAYER_REDEFINITION, 'metric redefinition'],
    [/redefine[_\s]?scope/i, L12ConstitutionalViolationCode.L12C_LOWER_LAYER_REDEFINITION, 'scope redefinition'],
    [/rebuild[_\s]?validation/i, L12ConstitutionalViolationCode.L12C_VALIDATION_REBUILD, 'validation rebuild'],
    [/recompute[_\s]?validation/i, L12ConstitutionalViolationCode.L12C_VALIDATION_REBUILD, 'validation recomputation'],
    [/re[_-]?validate/i, L12ConstitutionalViolationCode.L12C_VALIDATION_REBUILD, 'live revalidation'],
    [/override[_\s]?validation/i, L12ConstitutionalViolationCode.L12C_VALIDATION_REBUILD, 'validation override'],
    [/rebuild[_\s]?regime/i, L12ConstitutionalViolationCode.L12C_REGIME_REBUILD, 'regime rebuild'],
    [/reclassify[_\s]?regime/i, L12ConstitutionalViolationCode.L12C_REGIME_REBUILD, 'regime reclassification'],
    [/override[_\s]?regime/i, L12ConstitutionalViolationCode.L12C_REGIME_REBUILD, 'regime override'],
    [/reinterpret[_\s]?regime/i, L12ConstitutionalViolationCode.L12C_REGIME_REBUILD, 'regime reinterpretation'],
    [/ignore[_\s]?regime/i, L12ConstitutionalViolationCode.L12C_REGIME_POSTURE_IGNORED, 'regime ignored'],
    [/rebuild[_\s]?sequence/i, L12ConstitutionalViolationCode.L12C_SEQUENCE_REBUILD, 'sequence rebuild'],
    [/reorder[_\s]?events/i, L12ConstitutionalViolationCode.L12C_SEQUENCE_REBUILD, 'event reorder'],
    [/override[_\s]?sequence/i, L12ConstitutionalViolationCode.L12C_SEQUENCE_REBUILD, 'sequence override'],
    [/reinterpret[_\s]?sequence/i, L12ConstitutionalViolationCode.L12C_SEQUENCE_REBUILD, 'sequence reinterpretation'],
    [/ignore[_\s]?sequence/i, L12ConstitutionalViolationCode.L12C_SEQUENCE_POSTURE_IGNORED, 'sequence ignored'],
    [/rebuild[_\s]?hypothesis/i, L12ConstitutionalViolationCode.L12C_HYPOTHESIS_REBUILD, 'hypothesis rebuild'],
    [/rebuild[_\s]?hypotheses/i, L12ConstitutionalViolationCode.L12C_HYPOTHESIS_REBUILD, 'hypothesis rebuild'],
    [/rerank[_\s]?hypothes/i, L12ConstitutionalViolationCode.L12C_HYPOTHESIS_REBUILD, 'hypothesis rerank'],
    [/override[_\s]?hypothesis/i, L12ConstitutionalViolationCode.L12C_HYPOTHESIS_REBUILD, 'hypothesis override'],
    [/ignore[_\s]?hypothesis/i, L12ConstitutionalViolationCode.L12C_HYPOTHESIS_POSTURE_IGNORED, 'hypothesis ignored'],
    [/rebuild[_\s]?score/i, L12ConstitutionalViolationCode.L12C_SCORE_REBUILD, 'score rebuild'],
    [/recompute[_\s]?score/i, L12ConstitutionalViolationCode.L12C_SCORE_REBUILD, 'score recomputation'],
    [/derive[_\s]?new[_\s]?score/i, L12ConstitutionalViolationCode.L12C_SCORE_REBUILD, 'score re-derivation'],
    [/score[_\s]?value[_\s]?only/i, L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY, 'naked score consumption'],
    [/naked[_\s]?score/i, L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY, 'naked score consumption'],
    [/downgrade[_\s]?contradiction/i, L12ConstitutionalViolationCode.L12C_CONTRADICTION_DOWNGRADED, 'contradiction downgrade'],
    [/hide[_\s]?contradiction/i, L12ConstitutionalViolationCode.L12C_CONTRADICTION_DOWNGRADED, 'contradiction hide'],
    [/hide[_\s]?invalidation/i, L12ConstitutionalViolationCode.L12C_ACTIVE_INVALIDATION_HIDDEN, 'invalidation hide'],
    [/mask[_\s]?invalidation/i, L12ConstitutionalViolationCode.L12C_ACTIVE_INVALIDATION_HIDDEN, 'invalidation masked'],
    [/hide[_\s]?missing[_\s]?(visibility|data)/i, L12ConstitutionalViolationCode.L12C_MISSING_VISIBILITY_HIDDEN, 'missing visibility hidden'],
    [/hide[_\s]?drift/i, L12ConstitutionalViolationCode.L12C_DRIFT_STATUS_HIDDEN, 'drift hidden'],
    [/launder[_\s]?(path|confidence)/i, L12ConstitutionalViolationCode.L12C_PATH_CONFIDENCE_LAUNDERING, 'confidence laundering'],
    [/inflate[_\s]?confidence/i, L12ConstitutionalViolationCode.L12C_PATH_CONFIDENCE_LAUNDERING, 'confidence inflation'],
    [/hide[_\s]?spread/i, L12ConstitutionalViolationCode.L12C_SCENARIO_SPREAD_HIDDEN, 'scenario spread hidden'],
    [/widen[_\s]?l7/i, L12ConstitutionalViolationCode.L12C_RESTRICTION_BYPASS, 'L7 restriction widened'],
    [/bypass[_\s]?l7/i, L12ConstitutionalViolationCode.L12C_RESTRICTION_BYPASS, 'L7 bypass'],
    [/bypass[_\s]?l5/i, L12ConstitutionalViolationCode.L12C_L5_BYPASS, 'L5 bypass'],
    [/direct[_\s]?postgres/i, L12ConstitutionalViolationCode.L12C_RAW_STORAGE_BYPASS, 'raw postgres write'],
    [/direct[_\s]?clickhouse/i, L12ConstitutionalViolationCode.L12C_RAW_STORAGE_BYPASS, 'raw clickhouse write'],
    [/shadow[_\s]?(redis|store)/i, L12ConstitutionalViolationCode.L12C_RAW_STORAGE_BYPASS, 'shadow store'],
    [/consume[_\s]?l1[3-9]/i, L12ConstitutionalViolationCode.L12C_LATE_LAYER_CONSUMPTION, 'late-layer consumption'],
    [/consume[_\s]?l2[0-9]/i, L12ConstitutionalViolationCode.L12C_LATE_LAYER_CONSUMPTION, 'late-layer consumption'],
    [/consume[_\s]?judgment[_\s]?from/i, L12ConstitutionalViolationCode.L12C_LATE_LAYER_CONSUMPTION, 'judgment consumption'],
    [/consume[_\s]?recommendation[_\s]?from/i, L12ConstitutionalViolationCode.L12C_LATE_LAYER_CONSUMPTION, 'recommendation consumption'],
    [/will[_\s]?definitely/i, L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER, 'prediction theater'],
    [/guaranteed/i, L12ConstitutionalViolationCode.L12C_CERTAINTY_CLAIM, 'certainty claim'],
    [/cannot[_\s]?fail/i, L12ConstitutionalViolationCode.L12C_CERTAINTY_CLAIM, 'certainty claim'],
    [/inevitable/i, L12ConstitutionalViolationCode.L12C_CERTAINTY_CLAIM, 'certainty claim'],
  ];

  for (const behavior of spec.claimedBehaviors) {
    for (const [pattern, code, label] of patterns) {
      if (pattern.test(behavior)) {
        v.push({
          code,
          field: 'claimedBehaviors',
          detail: `Behavior "${behavior}" triggers ${label}`,
        });
      }
    }
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 12.1.12.7 — validateL12L11ScoreContextConsumption ── */
export interface L12L11ScoreContextSpec {
  readonly componentId: string;
  readonly consumesL11: boolean;
  readonly consumedSurfaceIds: readonly string[];
  readonly honoursScoreRestriction: boolean;
}

export function validateL12L11ScoreContextConsumption(
  spec: L12L11ScoreContextSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.consumesL11) {
    return { valid: true, violations: v };
  }

  // Detect score-value-only: only consumes the snapshot surface.
  const consumesSnapshot = spec.consumedSurfaceIds.includes('l11:current_score_snapshot');
  const consumesAny = spec.consumedSurfaceIds.some(s => s.startsWith('l11:'));
  if (!consumesAny) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY,
      field: 'consumedSurfaceIds',
      detail: `Component "${spec.componentId}" claims L11 consumption but consumes no L11 surfaces`,
    });
    return { valid: false, violations: v };
  }

  const missing = L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.filter(
    id => !spec.consumedSurfaceIds.includes(id),
  );
  if (consumesSnapshot && missing.length > 0 && missing.length < L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.length) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_SCORE_CONTEXT_INCOMPLETE,
      field: 'consumedSurfaceIds',
      detail: `Component "${spec.componentId}" score-context bundle missing: ${missing.join(', ')}`,
    });
  } else if (consumesSnapshot && missing.length === L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.length - 1) {
    // Only snapshot consumed → naked score
    v.push({
      code: L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY,
      field: 'consumedSurfaceIds',
      detail: `Component "${spec.componentId}" consumes L11 score value only`,
    });
  }
  if (!spec.honoursScoreRestriction) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_RESTRICTION_BYPASS,
      field: 'honoursScoreRestriction',
      detail: `Component "${spec.componentId}" does not honour L11 score restriction profile`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 12.1.12.8 — restriction / regime / sequence / hypothesis handling ── */
export interface L12PostureSpec {
  readonly componentId: string;
  readonly honoursL7Restriction: boolean;
  readonly honoursRegimePosture: boolean;
  readonly honoursSequencePosture: boolean;
  readonly honoursHypothesisPosture: boolean;
}

export function validateL12RestrictionHandling(spec: L12PostureSpec): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.honoursL7Restriction) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_RESTRICTION_BYPASS,
      field: 'honoursL7Restriction',
      detail: `Component "${spec.componentId}" bypasses L7 restriction`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

export function validateL12RegimeHandling(spec: L12PostureSpec): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.honoursRegimePosture) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_REGIME_POSTURE_IGNORED,
      field: 'honoursRegimePosture',
      detail: `Component "${spec.componentId}" ignores L8 regime posture`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

export function validateL12SequenceHandling(spec: L12PostureSpec): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.honoursSequencePosture) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_SEQUENCE_POSTURE_IGNORED,
      field: 'honoursSequencePosture',
      detail: `Component "${spec.componentId}" ignores L9 sequence posture`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

export function validateL12HypothesisHandling(spec: L12PostureSpec): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.honoursHypothesisPosture) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_HYPOTHESIS_POSTURE_IGNORED,
      field: 'honoursHypothesisPosture',
      detail: `Component "${spec.componentId}" ignores L10 hypothesis posture`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 12.1.12.9 — Confidence / invalidation / trigger / evidence handling ── */
export interface L12ConfidenceSpec {
  readonly componentId: string;
  readonly honoursContradiction: boolean;
  readonly honoursMissingVisibility: boolean;
  readonly honoursDrift: boolean;
}

export function validateL12ConfidenceHandling(
  spec: L12ConfidenceSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.honoursContradiction) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_CONTRADICTION_DOWNGRADED,
      field: 'honoursContradiction',
      detail: `Component "${spec.componentId}" downgrades contradiction in path confidence`,
    });
  }
  if (!spec.honoursMissingVisibility) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_MISSING_VISIBILITY_HIDDEN,
      field: 'honoursMissingVisibility',
      detail: `Component "${spec.componentId}" hides missing visibility in path confidence`,
    });
  }
  if (!spec.honoursDrift) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_DRIFT_STATUS_HIDDEN,
      field: 'honoursDrift',
      detail: `Component "${spec.componentId}" hides drift status in path confidence`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

export interface L12InvalidationSpec {
  readonly componentId: string;
  readonly hasInvalidation: boolean;
  readonly hidesActiveInvalidation: boolean;
}

export function validateL12InvalidationHandling(
  spec: L12InvalidationSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.hasInvalidation) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_INVALIDATION_OMITTED,
      field: 'hasInvalidation',
      detail: `Component "${spec.componentId}" omits invalidation`,
    });
  }
  if (spec.hidesActiveInvalidation) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_ACTIVE_INVALIDATION_HIDDEN,
      field: 'hidesActiveInvalidation',
      detail: `Component "${spec.componentId}" hides active invalidation`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

export interface L12TriggerSpec {
  readonly componentId: string;
  readonly hasTrigger: boolean;
}

export function validateL12TriggerHandling(spec: L12TriggerSpec): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.hasTrigger) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_TRIGGER_OMITTED,
      field: 'hasTrigger',
      detail: `Component "${spec.componentId}" omits trigger`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

export interface L12EvidenceSpec {
  readonly componentId: string;
  readonly hasEvidenceRefs: boolean;
  readonly hasLineageRefs: boolean;
  readonly hasReplayHash: boolean;
}

export function validateL12EvidenceGrounding(
  spec: L12EvidenceSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!spec.hasEvidenceRefs || !spec.hasLineageRefs) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_LINEAGE_MISSING,
      field: 'hasEvidenceRefs',
      detail: `Component "${spec.componentId}" lacks evidence/lineage refs`,
    });
  }
  if (!spec.hasReplayHash) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_REPLAY_HASH_MISSING,
      field: 'hasReplayHash',
      detail: `Component "${spec.componentId}" lacks replay hash`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* Helper: confirm conditional language is present. */
export function validateL12ConditionalLanguage(
  spec: L12LeakageSpec,
): L12BoundaryValidationResult {
  const v: L12BoundaryViolation[] = [];
  if (!detectL12ConditionalLanguage(spec.text)) {
    v.push({
      code: L12ConstitutionalViolationCode.L12C_CONDITION_OMITTED,
      field: 'text',
      detail: `Component "${spec.componentId}" lacks conditional language ("if", "unless", "would", "remains narrowed", etc.)`,
    });
  }
  return { valid: v.length === 0, violations: v };
}
