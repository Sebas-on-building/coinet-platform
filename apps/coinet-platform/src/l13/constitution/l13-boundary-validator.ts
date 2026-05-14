/**
 * L13.1 — Boundary Validator
 *
 * §13.1.10 — Validates whether a proposed L13 component or output
 * belongs in Layer 13. Each validator returns structured issues; none
 * mutate inputs. Names map to §13.1.10 directly.
 *
 *   validateL13ComponentBoundary
 *   validateL13DependencyAccess
 *   validateL13OutputSemantics
 *   validateL13NoRebuildLaw
 *   validateL13NoInventionLaw
 *   validateL13ContradictionHandling
 *   validateL13ConfidenceHandling
 *   validateL13RestrictionHandling
 *   validateL13ScenarioHandling
 *   validateL13ScoreHandling
 *   validateL13HypothesisHandling
 *   validateL13RecommendationBoundary
 *   validateL13PredictionBoundary
 *   validateL13FinalJudgmentBoundary
 *   validateL13EvidenceGrounding
 */

import {
  detectL13FinalJudgmentLeak,
  detectL13LowerLayerRebuildLanguage,
  detectL13MissingDataLaunderLanguage,
  detectL13PredictionTheater,
  detectL13RecommendationLeak,
  isL13ForbiddenOutputClass,
  isL13LegalOutputClass,
  matchesL13Mission,
} from '../contracts/l13-mission';
import {
  containsL13ForbiddenNaming,
  isValidL13ComponentName,
} from '../contracts/l13-boundary';
import {
  L13_DEPENDENCY_SURFACES,
  L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS,
  L13_L12_SCENARIO_BUNDLE_SURFACE_IDS,
  isL13RegisteredDependency,
} from '../contracts/l13-dependency-surfaces';
import { isL13RegisteredOutput } from '../contracts/l13-output-surfaces';
import {
  L13ConstitutionalViolationCode,
} from '../contracts/l13-violation-codes';
import type {
  L13AllowedCapability,
  L13DependencyLayer,
  L13OutputSurfaceClass,
  L13SubjectClass,
} from '../contracts/l13-constitutional-types';

export interface L13BoundaryViolation {
  readonly code: L13ConstitutionalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L13BoundaryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L13BoundaryViolation[];
}

/* ── 13.1.10.1 — validateL13ComponentBoundary ── */
export interface L13ComponentDefinition {
  readonly name: string;
  readonly subjectClass: L13SubjectClass;
  readonly outputSurfaceId: string;
  readonly outputClass: L13OutputSurfaceClass;
  readonly dependencySurfaceIds: readonly string[];
  readonly capability: L13AllowedCapability;
  readonly description: string;
}

export function validateL13ComponentBoundary(
  def: L13ComponentDefinition,
): L13BoundaryValidationResult {
  const violations: L13BoundaryViolation[] = [];

  if (!isValidL13ComponentName(def.name)) {
    violations.push({
      code: containsL13ForbiddenNaming(def.name)
        ? L13ConstitutionalViolationCode.L13C_FORBIDDEN_NAMING
        : L13ConstitutionalViolationCode.L13C_LAYER_ROLE_CONFUSED,
      field: 'name',
      detail: containsL13ForbiddenNaming(def.name)
        ? `Name "${def.name}" contains forbidden recommendation/prediction/final-judgment/rebuild/engine semantics`
        : `Name "${def.name}" is not valid snake_case`,
    });
  }

  if (!isL13RegisteredOutput(def.outputSurfaceId)) {
    violations.push({
      code: L13ConstitutionalViolationCode.L13C_OUTPUT_SURFACE_UNREGISTERED,
      field: 'outputSurfaceId',
      detail: `Output surface "${def.outputSurfaceId}" not registered`,
    });
  }
  if (!isL13LegalOutputClass(def.outputClass)) {
    violations.push({
      code: L13ConstitutionalViolationCode.L13C_ILLEGAL_OUTPUT_CLASS,
      field: 'outputClass',
      detail: `Output class "${def.outputClass}" not legal at L13`,
    });
  }
  for (const depId of def.dependencySurfaceIds) {
    if (!isL13RegisteredDependency(depId)) {
      violations.push({
        code: L13ConstitutionalViolationCode.L13C_DEPENDENCY_SURFACE_UNREGISTERED,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" not registered`,
      });
    } else {
      const surface = L13_DEPENDENCY_SURFACES.find(
        s => s.surfaceId === depId,
      )!;
      if (!surface.allowedL13Uses.includes(def.capability)) {
        violations.push({
          code: L13ConstitutionalViolationCode.L13C_ILLEGAL_DEPENDENCY_USAGE,
          field: 'dependencySurfaceIds',
          detail: `Dependency "${depId}" does not allow capability ${def.capability}`,
        });
      }
    }
  }
  if (containsL13ForbiddenNaming(def.description)) {
    violations.push({
      code: L13ConstitutionalViolationCode.L13C_FORBIDDEN_NAMING,
      field: 'description',
      detail: 'Description contains forbidden semantics',
    });
  }
  if (!matchesL13Mission(def.description)) {
    violations.push({
      code: L13ConstitutionalViolationCode.L13C_MISSION_MISMATCH,
      field: 'description',
      detail: 'Description does not match Layer 13 explanation mission',
    });
  }
  return { valid: violations.length === 0, violations };
}

/* ── 13.1.10.2 — validateL13DependencyAccess ── */
export interface L13DependencyAccessSpec {
  readonly componentId: string;
  readonly surfaceId: string;
  readonly capability: L13AllowedCapability;
  readonly contradictionPostureProvided: boolean;
  readonly restrictionsHonoured: boolean;
  readonly regimePostureProvided: boolean;
  readonly sequencePostureProvided: boolean;
  readonly hypothesisPostureProvided: boolean;
  readonly consumesFullScoreContextBundle?: boolean;
  readonly l11ConsumedBundle?: readonly string[];
  readonly consumesFullScenarioBundle?: boolean;
  readonly l12ConsumedBundle?: readonly string[];
}

export function validateL13DependencyAccess(
  spec: L13DependencyAccessSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  const lower = spec.surfaceId.toLowerCase();

  if (!isL13RegisteredDependency(spec.surfaceId)) {
    if (/^l1[3-9]:/.test(lower) || /^l[2-9][0-9]:/.test(lower)) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_LATE_LAYER_DEPENDENCY,
        field: 'surfaceId',
        detail: `Component "${spec.componentId}" attempts late-layer dependency on "${spec.surfaceId}"`,
      });
    } else if (
      lower.startsWith('raw_') ||
      lower.startsWith('raw:') ||
      lower.includes('rebuild_')
    ) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS,
        field: 'surfaceId',
        detail: `Component "${spec.componentId}" attempts raw lower-layer bypass via "${spec.surfaceId}"`,
      });
    } else {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_DEPENDENCY_SURFACE_UNREGISTERED,
        field: 'surfaceId',
        detail: `Surface "${spec.surfaceId}" not registered`,
      });
    }
    return { valid: false, violations: v };
  }

  const surface = L13_DEPENDENCY_SURFACES.find(
    s => s.surfaceId === spec.surfaceId,
  )!;

  if (!surface.allowedL13Uses.includes(spec.capability)) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_ILLEGAL_DEPENDENCY_USAGE,
      field: 'capability',
      detail: `Capability ${spec.capability} not allowed on "${spec.surfaceId}"`,
    });
  }

  if (
    surface.contradictionAware &&
    !spec.contradictionPostureProvided
  ) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_HIDES_CONTRADICTION,
      field: 'contradictionPostureProvided',
      detail: `Surface "${spec.surfaceId}" requires contradiction posture`,
    });
  }
  if (surface.restrictionRequired && !spec.restrictionsHonoured) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_IGNORES_RESTRICTION,
      field: 'restrictionsHonoured',
      detail: `Surface "${spec.surfaceId}" requires restriction honour`,
    });
  }
  if (surface.regimeAware && !spec.regimePostureProvided) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME,
      field: 'regimePostureProvided',
      detail: `Surface "${spec.surfaceId}" requires regime posture`,
    });
  }
  if (surface.sequenceAware && !spec.sequencePostureProvided) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_REBUILDS_SEQUENCE,
      field: 'sequencePostureProvided',
      detail: `Surface "${spec.surfaceId}" requires sequence posture`,
    });
  }
  if (surface.hypothesisAware && !spec.hypothesisPostureProvided) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS,
      field: 'hypothesisPostureProvided',
      detail: `Surface "${spec.surfaceId}" requires hypothesis posture`,
    });
  }

  if (surface.scoreContextAware) {
    if (spec.consumesFullScoreContextBundle !== true) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION,
        field: 'consumesFullScoreContextBundle',
        detail: 'L11 score consumed without full score-context bundle',
      });
    } else {
      const bundle = spec.l11ConsumedBundle ?? [];
      const missing = L13_L11_SCORE_CONTEXT_BUNDLE_SURFACE_IDS.filter(
        id => !bundle.includes(id),
      );
      if (missing.length > 0) {
        v.push({
          code: L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION,
          field: 'l11ConsumedBundle',
          detail: `L11 score-context bundle missing: ${missing.join(', ')}`,
        });
      }
    }
  }

  if (surface.scenarioAware) {
    if (spec.consumesFullScenarioBundle !== true) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE,
        field: 'consumesFullScenarioBundle',
        detail: 'L12 scenario consumed without full scenario bundle',
      });
    } else {
      const bundle = spec.l12ConsumedBundle ?? [];
      const missing = L13_L12_SCENARIO_BUNDLE_SURFACE_IDS.filter(
        id => !bundle.includes(id),
      );
      if (missing.length > 0) {
        const missesInvalidations = missing.includes(
          'l12:scenario_invalidations',
        );
        const missesTriggers = missing.includes('l12:scenario_triggers');
        const code = missesInvalidations
          ? L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE
          : missesTriggers
            ? L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_TRIGGER_DISCLOSURE
            : L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO;
        v.push({
          code,
          field: 'l12ConsumedBundle',
          detail: `L12 scenario bundle missing: ${missing.join(', ')}`,
        });
      }
    }
  }

  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.3 — validateL13OutputSemantics ── */
export function validateL13OutputSemantics(
  outputClassName: string,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (isL13ForbiddenOutputClass(outputClassName)) {
    const upper = outputClassName.toUpperCase();
    let code = L13ConstitutionalViolationCode.L13C_ILLEGAL_OUTPUT_CLASS;
    if (
      upper.includes('BUY') ||
      upper.includes('SELL') ||
      upper.includes('HOLD') ||
      upper.includes('AVOID')
    ) {
      code = L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK;
    } else if (upper.includes('LEVERAGE')) {
      code = L13ConstitutionalViolationCode.L13C_LEVERAGE_ADVICE_LEAK;
    } else if (upper.includes('POSITION_SIZE')) {
      code = L13ConstitutionalViolationCode.L13C_POSITION_SIZE_LEAK;
    } else if (upper.includes('ENTRY') || upper.includes('EXIT')) {
      code = L13ConstitutionalViolationCode.L13C_ENTRY_EXIT_LEAK;
    } else if (upper.includes('PREDICTION')) {
      code = L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER;
    } else if (
      upper.includes('GUARANTEED') ||
      upper.includes('CERTAIN') ||
      upper.includes('INEVITABLE')
    ) {
      code = L13ConstitutionalViolationCode.L13C_UNSUPPORTED_CERTAINTY;
    } else if (
      upper.includes('FINAL_JUDGMENT') ||
      upper.includes('FINAL_VERDICT') ||
      upper.includes('SCENARIO_WINNER') ||
      upper.includes('WINNING_SCENARIO')
    ) {
      code = L13ConstitutionalViolationCode.L13C_FINAL_JUDGMENT_LEAK;
    } else if (upper.includes('NEW_SCENARIO')) {
      code = L13ConstitutionalViolationCode.L13C_CREATES_NEW_SCENARIO;
    } else if (upper.includes('NEW_HYPOTHESIS')) {
      code = L13ConstitutionalViolationCode.L13C_CREATES_NEW_HYPOTHESIS;
    } else if (upper.includes('LOCAL_SCORE')) {
      code = L13ConstitutionalViolationCode.L13C_COMPUTES_SCORE_LOCALLY;
    } else if (upper.includes('SCORE_AS_RECOMMENDATION')) {
      code = L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION;
    }
    v.push({
      code,
      field: 'outputClassName',
      detail: `Output class "${outputClassName}" forbidden at L13`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.4 — validateL13NoRebuildLaw ── */
export interface L13RebuildSpec {
  readonly componentId: string;
  readonly claimedBehaviors: readonly string[];
}

export function validateL13NoRebuildLaw(
  spec: L13RebuildSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  const patterns: ReadonlyArray<
    [RegExp, L13ConstitutionalViolationCode, string]
  > = [
    [/rebuild[_\s]?scenario/i, L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO, 'scenario rebuild'],
    [/recompute[_\s]?scenario/i, L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO, 'scenario recompute'],
    [/calculate[_\s]?scenario/i, L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO, 'scenario calculate'],
    [/rebuild[_\s]?score/i, L13ConstitutionalViolationCode.L13C_REBUILDS_SCORE, 'score rebuild'],
    [/recompute[_\s]?score/i, L13ConstitutionalViolationCode.L13C_REBUILDS_SCORE, 'score recompute'],
    [/compute[_\s]?score[_\s]?locally/i, L13ConstitutionalViolationCode.L13C_COMPUTES_SCORE_LOCALLY, 'local score compute'],
    [/local[_\s]?score/i, L13ConstitutionalViolationCode.L13C_COMPUTES_SCORE_LOCALLY, 'local score'],
    [/rebuild[_\s]?hypothesis/i, L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS, 'hypothesis rebuild'],
    [/rebuild[_\s]?hypotheses/i, L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS, 'hypothesis rebuild'],
    [/rerank[_\s]?hypothes/i, L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS, 'hypothesis rerank'],
    [/rebuild[_\s]?sequence/i, L13ConstitutionalViolationCode.L13C_REBUILDS_SEQUENCE, 'sequence rebuild'],
    [/infer[_\s]?sequence/i, L13ConstitutionalViolationCode.L13C_REBUILDS_SEQUENCE, 'sequence infer'],
    [/reorder[_\s]?sequence/i, L13ConstitutionalViolationCode.L13C_REBUILDS_SEQUENCE, 'sequence reorder'],
    [/rebuild[_\s]?regime/i, L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME, 'regime rebuild'],
    [/classify[_\s]?regime/i, L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME, 'regime classify'],
    [/reclassify[_\s]?regime/i, L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME, 'regime reclassify'],
    [/override[_\s]?regime/i, L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME, 'regime override'],
    [/create[_\s]?new[_\s]?scenario/i, L13ConstitutionalViolationCode.L13C_CREATES_NEW_SCENARIO, 'new scenario'],
    [/create[_\s]?new[_\s]?hypothes/i, L13ConstitutionalViolationCode.L13C_CREATES_NEW_HYPOTHESIS, 'new hypothesis'],
    [/raw[_\s]?lower[_\s]?layer/i, L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS, 'raw lower layer'],
    [/bypass[_\s]?l5/i, L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS, 'L5 bypass'],
    [/bypass[_\s]?l7/i, L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS, 'L7 bypass'],
    [/bypass[_\s]?l1[01]/i, L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS, 'L10/L11 bypass'],
    [/bypass[_\s]?l12/i, L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS, 'L12 bypass'],
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

/* ── 13.1.10.5 — validateL13NoInventionLaw ── */
export interface L13InventionSpec {
  readonly componentId: string;
  readonly emittedClaims: readonly string[];
  readonly evidenceRefIndex: ReadonlyArray<string>;
}

export function validateL13NoInventionLaw(
  spec: L13InventionSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  for (const claim of spec.emittedClaims) {
    if (claim.length === 0) continue;
    const grounded = spec.evidenceRefIndex.some(ref =>
      claim.toLowerCase().includes(ref.toLowerCase()),
    );
    if (!grounded) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_INVENTS_SUPPORT,
        field: 'emittedClaims',
        detail: `Claim "${claim}" has no matching evidence ref`,
      });
    }
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.6 — validateL13ContradictionHandling ── */
export interface L13ContradictionSpec {
  readonly componentId: string;
  readonly contradictionPresent: boolean;
  readonly contradictionDisclosed: boolean;
}

export function validateL13ContradictionHandling(
  spec: L13ContradictionSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (spec.contradictionPresent && !spec.contradictionDisclosed) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_HIDES_CONTRADICTION,
      field: 'contradictionDisclosed',
      detail: `Component "${spec.componentId}" hides active contradiction`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.7 — validateL13ConfidenceHandling ── */
export interface L13ConfidenceSpec {
  readonly componentId: string;
  readonly engineConfidenceCapped: boolean;
  readonly aiOutputClaimsHigherConfidence: boolean;
  readonly treatsConfidenceAsProbability: boolean;
}

export function validateL13ConfidenceHandling(
  spec: L13ConfidenceSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (
    spec.engineConfidenceCapped &&
    spec.aiOutputClaimsHigherConfidence
  ) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_OVERRIDES_CONFIDENCE,
      field: 'aiOutputClaimsHigherConfidence',
      detail: `Component "${spec.componentId}" overrides engine confidence cap`,
    });
  }
  if (spec.treatsConfidenceAsProbability) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_SCENARIO_AS_PROBABILITY,
      field: 'treatsConfidenceAsProbability',
      detail: `Component "${spec.componentId}" treats path confidence as probability`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.8 — validateL13RestrictionHandling ── */
export interface L13RestrictionSpec {
  readonly componentId: string;
  readonly l7RestrictionHonoured: boolean;
  readonly sequenceRestrictionHonoured: boolean;
  readonly hypothesisRestrictionHonoured: boolean;
  readonly scoreRestrictionHonoured: boolean;
  readonly scenarioRestrictionHonoured: boolean;
}

export function validateL13RestrictionHandling(
  spec: L13RestrictionSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  for (const [field, ok] of [
    ['l7RestrictionHonoured', spec.l7RestrictionHonoured],
    ['sequenceRestrictionHonoured', spec.sequenceRestrictionHonoured],
    [
      'hypothesisRestrictionHonoured',
      spec.hypothesisRestrictionHonoured,
    ],
    ['scoreRestrictionHonoured', spec.scoreRestrictionHonoured],
    ['scenarioRestrictionHonoured', spec.scenarioRestrictionHonoured],
  ] as const) {
    if (!ok) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_IGNORES_RESTRICTION,
        field,
        detail: `Component "${spec.componentId}" bypasses ${field}`,
      });
    }
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.9 — validateL13ScenarioHandling ── */
export interface L13ScenarioSpec {
  readonly componentId: string;
  readonly explainsScenario: boolean;
  readonly triggerDisclosed: boolean;
  readonly invalidationDisclosed: boolean;
  readonly preservesAlternatives: boolean;
  readonly callsWinner: boolean;
  readonly treatsConfidenceAsProbability: boolean;
}

export function validateL13ScenarioHandling(
  spec: L13ScenarioSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (spec.explainsScenario) {
    if (!spec.triggerDisclosed) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_TRIGGER_DISCLOSURE,
        field: 'triggerDisclosed',
        detail: `Component "${spec.componentId}" omits trigger`,
      });
    }
    if (!spec.invalidationDisclosed) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE,
        field: 'invalidationDisclosed',
        detail: `Component "${spec.componentId}" omits invalidation`,
      });
    }
    if (!spec.preservesAlternatives) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO,
        field: 'preservesAlternatives',
        detail: `Component "${spec.componentId}" collapses alternatives`,
      });
    }
  }
  if (spec.callsWinner) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_SCENARIO_AS_WINNER,
      field: 'callsWinner',
      detail: `Component "${spec.componentId}" declares scenario winner`,
    });
  }
  if (spec.treatsConfidenceAsProbability) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_SCENARIO_AS_PROBABILITY,
      field: 'treatsConfidenceAsProbability',
      detail: `Component "${spec.componentId}" treats path confidence as probability`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.10 — validateL13ScoreHandling ── */
export interface L13ScoreSpec {
  readonly componentId: string;
  readonly explainsScore: boolean;
  readonly hasAttribution: boolean;
  readonly hasMissingDataProfile: boolean;
  readonly hasDriftStatus: boolean;
  readonly scoreUsedAsRecommendation: boolean;
  readonly scoreComputedLocally: boolean;
}

export function validateL13ScoreHandling(
  spec: L13ScoreSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (spec.explainsScore) {
    if (!spec.hasAttribution) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION,
        field: 'hasAttribution',
        detail: `Component "${spec.componentId}" lacks score attribution`,
      });
    }
    if (!spec.hasMissingDataProfile) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_PRETENDS_MISSING_DATA_COMPLETE,
        field: 'hasMissingDataProfile',
        detail: `Component "${spec.componentId}" lacks missing-data profile`,
      });
    }
    if (!spec.hasDriftStatus) {
      v.push({
        code: L13ConstitutionalViolationCode.L13C_OVERRIDES_CONFIDENCE,
        field: 'hasDriftStatus',
        detail: `Component "${spec.componentId}" lacks drift status`,
      });
    }
  }
  if (spec.scoreUsedAsRecommendation) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION,
      field: 'scoreUsedAsRecommendation',
      detail: `Component "${spec.componentId}" uses score as recommendation`,
    });
  }
  if (spec.scoreComputedLocally) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_COMPUTES_SCORE_LOCALLY,
      field: 'scoreComputedLocally',
      detail: `Component "${spec.componentId}" computes score locally`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.11 — validateL13HypothesisHandling ── */
export interface L13HypothesisSpec {
  readonly componentId: string;
  readonly explainsHypothesis: boolean;
  readonly preservesSpread: boolean;
  readonly callsHypothesisFinalTruth: boolean;
  readonly creatNewHypothesis: boolean;
}

export function validateL13HypothesisHandling(
  spec: L13HypothesisSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (spec.explainsHypothesis && !spec.preservesSpread) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS,
      field: 'preservesSpread',
      detail: `Component "${spec.componentId}" collapses hypothesis spread`,
    });
  }
  if (spec.callsHypothesisFinalTruth) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_HYPOTHESIS_AS_FINAL_TRUTH,
      field: 'callsHypothesisFinalTruth',
      detail: `Component "${spec.componentId}" declares hypothesis as final truth`,
    });
  }
  if (spec.creatNewHypothesis) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_CREATES_NEW_HYPOTHESIS,
      field: 'creatNewHypothesis',
      detail: `Component "${spec.componentId}" creates a new hypothesis`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.12 — validateL13RecommendationBoundary ── */
export interface L13TextSpec {
  readonly componentId: string;
  readonly text: string;
}

export function validateL13RecommendationBoundary(
  spec: L13TextSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (detectL13RecommendationLeak(spec.text)) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
      field: 'text',
      detail: `Component "${spec.componentId}" leaks recommendation`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.13 — validateL13PredictionBoundary ── */
export function validateL13PredictionBoundary(
  spec: L13TextSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (detectL13PredictionTheater(spec.text)) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER,
      field: 'text',
      detail: `Component "${spec.componentId}" speaks like a prediction`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.14 — validateL13FinalJudgmentBoundary ── */
export function validateL13FinalJudgmentBoundary(
  spec: L13TextSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (detectL13FinalJudgmentLeak(spec.text)) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_FINAL_JUDGMENT_LEAK,
      field: 'text',
      detail: `Component "${spec.componentId}" leaks final judgment`,
    });
  }
  if (detectL13MissingDataLaunderLanguage(spec.text)) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_PRETENDS_MISSING_DATA_COMPLETE,
      field: 'text',
      detail: `Component "${spec.componentId}" launders missing-data status`,
    });
  }
  if (detectL13LowerLayerRebuildLanguage(spec.text)) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS,
      field: 'text',
      detail: `Component "${spec.componentId}" speaks like a lower-layer rebuild`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.15 — validateL13EvidenceGrounding ── */
export interface L13EvidenceSpec {
  readonly componentId: string;
  readonly hasEvidenceRefs: boolean;
  readonly hasLineageRefs: boolean;
  readonly hasReplayHash: boolean;
  readonly hasConfidenceDisclosure: boolean;
  readonly hasRestrictionDisclosure: boolean;
}

export function validateL13EvidenceGrounding(
  spec: L13EvidenceSpec,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (!spec.hasEvidenceRefs) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_EVIDENCE_REFS_MISSING,
      field: 'hasEvidenceRefs',
      detail: `Component "${spec.componentId}" lacks evidence refs`,
    });
  }
  if (!spec.hasLineageRefs) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_LINEAGE_REFS_MISSING,
      field: 'hasLineageRefs',
      detail: `Component "${spec.componentId}" lacks lineage refs`,
    });
  }
  if (!spec.hasReplayHash) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_REPLAY_HASH_MISSING,
      field: 'hasReplayHash',
      detail: `Component "${spec.componentId}" lacks replay hash`,
    });
  }
  if (!spec.hasConfidenceDisclosure) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_CONFIDENCE_DISCLOSURE_MISSING,
      field: 'hasConfidenceDisclosure',
      detail: `Component "${spec.componentId}" lacks confidence disclosure`,
    });
  }
  if (!spec.hasRestrictionDisclosure) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_RESTRICTION_DISCLOSURE_MISSING,
      field: 'hasRestrictionDisclosure',
      detail: `Component "${spec.componentId}" lacks restriction disclosure`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

/* ── 13.1.10.X — validateL13MissionAlignment helper ── */
export function validateL13MissionAlignment(
  description: string,
  componentId: string,
): L13BoundaryValidationResult {
  const v: L13BoundaryViolation[] = [];
  if (!matchesL13Mission(description)) {
    v.push({
      code: L13ConstitutionalViolationCode.L13C_MISSION_MISMATCH,
      field: 'description',
      detail: `Component "${componentId}" does not match L13 mission`,
    });
  }
  return { valid: v.length === 0, violations: v };
}

void ({} as L13DependencyLayer);
