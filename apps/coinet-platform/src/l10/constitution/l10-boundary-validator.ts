/**
 * L10.1 — Boundary Validator
 *
 * §10.1.2 / §10.1.5 / §10.1.6 / §10.1.7 — Validates whether a proposed
 * L10 component belongs in Layer 10: dependency legality, capability
 * legality, output-class legality, recommendation/scenario/judgment/
 * score/conviction leakage, competition preservation, causal-laundering
 * restraint, restriction/regime/sequence posture adherence, and
 * primary-as-final-truth masquerade.
 */

import type {
  L10OutputSurfaceClass,
  L10DependencyUsability,
  L10SubjectClass,
} from '../contracts/l10-constitutional-types';
import {
  isL10RegisteredDependency,
  isL10UsableFor,
} from '../contracts/l10-dependency-surfaces';
import { isL10RegisteredOutput } from '../contracts/l10-output-surfaces';
import {
  isL10LegalOutputClass,
  isL10ForbiddenOutputClass,
  matchesL10Mission,
} from '../contracts/l10-mission';
import {
  containsL10ForbiddenNaming,
  isValidL10ComponentName,
} from '../contracts/l10-boundary';
import { L10ConstitutionalViolationCode } from '../contracts/l10-violation-codes';

export interface L10ComponentDefinition {
  readonly name: string;
  readonly subjectClass: L10SubjectClass;
  readonly outputSurfaceId: string;
  readonly outputClass: L10OutputSurfaceClass;
  readonly dependencySurfaceIds: readonly string[];
  readonly dependencyUsage: L10DependencyUsability;
  readonly description: string;
}

export interface L10BoundaryViolation {
  readonly code: L10ConstitutionalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L10BoundaryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L10BoundaryViolation[];
}

export function validateL10Component(def: L10ComponentDefinition): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];

  if (!isValidL10ComponentName(def.name)) {
    violations.push({
      code: containsL10ForbiddenNaming(def.name)
        ? L10ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS
        : L10ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'name',
      detail: containsL10ForbiddenNaming(def.name)
        ? `Name "${def.name}" contains forbidden judgment/scenario/recommendation/conviction/causal-certainty/single-story semantics`
        : `Name "${def.name}" is not valid snake_case`,
    });
  }

  if (!isL10RegisteredOutput(def.outputSurfaceId)) {
    violations.push({
      code: L10ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
      field: 'outputSurfaceId',
      detail: `Output surface "${def.outputSurfaceId}" is not registered`,
    });
  }

  if (!isL10LegalOutputClass(def.outputClass)) {
    violations.push({
      code: L10ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'outputClass',
      detail: `Output class "${def.outputClass}" is not legal for Layer 10`,
    });
  }

  for (const depId of def.dependencySurfaceIds) {
    if (!isL10RegisteredDependency(depId)) {
      violations.push({
        code: L10ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not registered`,
      });
    } else if (!isL10UsableFor(depId, def.dependencyUsage)) {
      violations.push({
        code: L10ConstitutionalViolationCode.ILLEGAL_DEPENDENCY_USAGE,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not usable for ${def.dependencyUsage}`,
      });
    }
  }

  if (containsL10ForbiddenNaming(def.description)) {
    violations.push({
      code: L10ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS,
      field: 'description',
      detail: 'Description contains forbidden judgment/recommendation/conviction/causal-certainty language',
    });
  }

  if (!matchesL10Mission(def.description)) {
    violations.push({
      code: L10ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
      field: 'description',
      detail: 'Description does not match Layer 10 hypothesis/competition mission',
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §10.1.5.3 / §10.1.6.4 — Output-class semantic leakage.
 */
export function validateL10OutputSemantics(
  outputClassName: string,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];

  if (isL10ForbiddenOutputClass(outputClassName)) {
    const upper = outputClassName.toUpperCase();
    let code: L10ConstitutionalViolationCode =
      L10ConstitutionalViolationCode.ILLEGAL_OUTPUT_CLASS;
    if (upper.includes('SCENARIO')) {
      code = L10ConstitutionalViolationCode.FORBIDDEN_SCENARIO_SEMANTICS;
    } else if (upper.includes('CAUSAL_CERTAINTY') || upper.includes('PROVEN_CAUSE')) {
      code = L10ConstitutionalViolationCode.CAUSAL_LAUNDERING;
    } else if (upper.includes('SCORE')) {
      code = L10ConstitutionalViolationCode.FORBIDDEN_SCORE_SEMANTICS;
    } else if (
      upper.includes('RECOMMENDATION') ||
      upper.includes('TRADE') ||
      upper.includes('BUY') ||
      upper.includes('SELL') ||
      upper.includes('AVOID')
    ) {
      code = L10ConstitutionalViolationCode.FORBIDDEN_RECOMMENDATION_SEMANTICS;
    } else if (
      upper.includes('CONVICTION') ||
      upper.includes('HIGHEST_CONVICTION') ||
      upper.includes('BEST_OPPORTUNITY') ||
      upper.includes('IDEAL_EXPLANATION') ||
      upper.includes('ALPHA_EXPLANATION') ||
      upper.includes('ACTIONABLE_EXPLANATION')
    ) {
      code = L10ConstitutionalViolationCode.FORBIDDEN_CONVICTION_SEMANTICS;
    } else if (
      upper.includes('FINAL_EXPLANATION') ||
      upper.includes('FINAL_NARRATIVE') ||
      upper.includes('WINNING_EXPLANATION') ||
      upper.includes('WINNING_THESIS') ||
      upper.includes('BEST_EXPLANATION')
    ) {
      code = L10ConstitutionalViolationCode.FORBIDDEN_FINAL_EXPLANATION_SEMANTICS;
    } else if (
      upper.includes('JUDGMENT') ||
      upper.includes('FINAL_JUDGMENT') ||
      upper.includes('OPPORTUNITY_RANKING') ||
      upper.includes('PORTFOLIO_PRIORITY')
    ) {
      code = L10ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    } else {
      code = L10ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS;
    }
    violations.push({
      code,
      field: 'outputClassName',
      detail: `Output class "${outputClassName}" is forbidden at Layer 10`,
    });
  }

  return { valid: violations.length === 0, violations };
}

/**
 * §10.1.7 / §10.1.5.5 — Competition-preservation law. Plausible
 * alternatives must always remain visible; spread must be preserved;
 * close spreads may not be hidden; evidence asymmetry must be explicit.
 */
export interface L10CompetitionHandlingSpec {
  readonly componentId: string;
  readonly preservesAlternatives: boolean;
  readonly emitsSpread: boolean;
  readonly hidesCloseSpread: boolean;
  readonly preservesEvidenceAsymmetry: boolean;
  readonly emitsShiftConditions: boolean;
  readonly collapsesToSingleStory: boolean;
  readonly dropsPlausibleCompetitor: boolean;
}

export function validateL10CompetitionHandling(
  spec: L10CompetitionHandlingSpec,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];
  if (spec.collapsesToSingleStory) {
    violations.push({
      code: L10ConstitutionalViolationCode.SINGLE_STORY_COLLAPSE,
      field: 'collapsesToSingleStory',
      detail: 'Component collapses competing explanations into a single story',
    });
  }
  if (!spec.preservesAlternatives) {
    violations.push({
      code: L10ConstitutionalViolationCode.ALTERNATIVE_SUPPRESSION,
      field: 'preservesAlternatives',
      detail: 'Component emits a primary without preserving a plausible alternative',
    });
  }
  if (spec.dropsPlausibleCompetitor) {
    violations.push({
      code: L10ConstitutionalViolationCode.ALTERNATIVE_SUPPRESSION,
      field: 'dropsPlausibleCompetitor',
      detail: 'Component silently drops a plausible competitor candidate',
    });
  }
  if (!spec.emitsSpread) {
    violations.push({
      code: L10ConstitutionalViolationCode.CLOSE_SPREAD_CONCEALMENT,
      field: 'emitsSpread',
      detail: 'Component does not emit ranking spread between primary and alternatives',
    });
  }
  if (spec.hidesCloseSpread) {
    violations.push({
      code: L10ConstitutionalViolationCode.CLOSE_SPREAD_CONCEALMENT,
      field: 'hidesCloseSpread',
      detail: 'Component hides close primary/secondary spread',
    });
  }
  if (!spec.preservesEvidenceAsymmetry) {
    violations.push({
      code: L10ConstitutionalViolationCode.EVIDENCE_ASYMMETRY_CONCEALMENT,
      field: 'preservesEvidenceAsymmetry',
      detail: 'Component does not preserve support/contradiction evidence asymmetry',
    });
  }
  if (!spec.emitsShiftConditions) {
    violations.push({
      code: L10ConstitutionalViolationCode.ALTERNATIVE_SUPPRESSION,
      field: 'emitsShiftConditions',
      detail: 'Component does not emit shift conditions describing what would change the ranking',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §10.1.7.4 — Primary-as-final-truth masquerade detection.
 */
export interface L10PrimaryPostureSpec {
  readonly componentId: string;
  readonly primaryLabelledAsFinal: boolean;
  readonly stripsSpreadFields: boolean;
  readonly stripsAlternativeFields: boolean;
}

export function validateL10PrimaryPosture(
  spec: L10PrimaryPostureSpec,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];
  if (spec.primaryLabelledAsFinal) {
    violations.push({
      code: L10ConstitutionalViolationCode.PRIMARY_AS_FINAL_TRUTH,
      field: 'primaryLabelledAsFinal',
      detail: 'Primary hypothesis is labelled/encoded as final truth',
    });
  }
  if (spec.stripsSpreadFields) {
    violations.push({
      code: L10ConstitutionalViolationCode.PRIMARY_AS_FINAL_TRUTH,
      field: 'stripsSpreadFields',
      detail: 'Primary output strips spread fields so it appears singular',
    });
  }
  if (spec.stripsAlternativeFields) {
    violations.push({
      code: L10ConstitutionalViolationCode.PRIMARY_AS_FINAL_TRUTH,
      field: 'stripsAlternativeFields',
      detail: 'Primary output strips alternative fields so it appears singular',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §10.1.5.4 — Causal-laundering detection. L10 may not promote support,
 * adjacency, regime compatibility, contradiction absence, or lead-lag
 * into proven cause.
 */
export interface L10CausalRestraintSpec {
  readonly componentId: string;
  readonly declaresCausalRestraint: boolean;
  readonly claimsCausalCertainty: boolean;
  readonly usesAdjacencyAsCause: boolean;
  readonly usesRegimeCompatibilityAsCause: boolean;
  readonly usesLeadLagAsCause: boolean;
}

export function validateL10CausalRestraint(
  spec: L10CausalRestraintSpec,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];
  if (spec.claimsCausalCertainty) {
    violations.push({
      code: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
      field: 'claimsCausalCertainty',
      detail: 'Component promotes hypothesis support into causal certainty',
    });
  }
  if (spec.usesAdjacencyAsCause) {
    violations.push({
      code: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
      field: 'usesAdjacencyAsCause',
      detail: 'Component uses temporal adjacency as proven cause',
    });
  }
  if (spec.usesRegimeCompatibilityAsCause) {
    violations.push({
      code: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
      field: 'usesRegimeCompatibilityAsCause',
      detail: 'Component uses regime compatibility as proven cause',
    });
  }
  if (spec.usesLeadLagAsCause) {
    violations.push({
      code: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
      field: 'usesLeadLagAsCause',
      detail: 'Component converts lead-lag into proven cause',
    });
  }
  if (!spec.declaresCausalRestraint) {
    violations.push({
      code: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
      field: 'declaresCausalRestraint',
      detail: 'Hypothesis component emitted without causal-restraint declaration',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §10.1.3.6 / §10.1.8 — L7 restriction/contradiction posture handling.
 */
export interface L10RestrictionHandlingSpec {
  readonly componentId: string;
  readonly consumesL7Output: boolean;
  readonly declaresRestrictionPosture: boolean;
  readonly widensDownstreamRights: boolean;
  readonly honoursContradictionPosture: boolean;
  readonly overwritesContradictionPosture: boolean;
}

export function validateL10RestrictionHandling(
  spec: L10RestrictionHandlingSpec,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];
  if (spec.consumesL7Output && !spec.declaresRestrictionPosture) {
    violations.push({
      code: L10ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED,
      field: 'declaresRestrictionPosture',
      detail: 'Component consumes L7 output without declaring restriction posture',
    });
  }
  if (spec.widensDownstreamRights) {
    violations.push({
      code: L10ConstitutionalViolationCode.RESTRICTION_BYPASS,
      field: 'widensDownstreamRights',
      detail: 'Component widens downstream rights beyond L7/L8/L9 restriction profile',
    });
  }
  if (spec.consumesL7Output && !spec.honoursContradictionPosture) {
    violations.push({
      code: L10ConstitutionalViolationCode.CONTRADICTION_POSTURE_OVERWRITE,
      field: 'honoursContradictionPosture',
      detail: 'Component ignores contradiction posture from L7',
    });
  }
  if (spec.overwritesContradictionPosture) {
    violations.push({
      code: L10ConstitutionalViolationCode.CONTRADICTION_POSTURE_OVERWRITE,
      field: 'overwritesContradictionPosture',
      detail: 'Component overwrites contradiction posture from L7',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §10.1.3.7 — L8 regime posture handling.
 */
export interface L10RegimeHandlingSpec {
  readonly componentId: string;
  readonly consumesL8Output: boolean;
  readonly honoursRegimePosture: boolean;
  readonly reinterpretsRegime: boolean;
}

export function validateL10RegimeHandling(
  spec: L10RegimeHandlingSpec,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];
  if (spec.consumesL8Output && !spec.honoursRegimePosture) {
    violations.push({
      code: L10ConstitutionalViolationCode.REGIME_POSTURE_IGNORED,
      field: 'honoursRegimePosture',
      detail: 'Component consumes L8 regime output without honouring regime posture',
    });
  }
  if (spec.reinterpretsRegime) {
    violations.push({
      code: L10ConstitutionalViolationCode.REGIME_RECLASSIFICATION,
      field: 'reinterpretsRegime',
      detail: 'Component locally reclassifies L8 regime truth',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §10.1.3.8 — L9 sequence posture handling.
 */
export interface L10SequenceHandlingSpec {
  readonly componentId: string;
  readonly consumesL9Output: boolean;
  readonly honoursSequencePosture: boolean;
  readonly reinterpretsSequence: boolean;
  readonly dropsAmbiguityPosture: boolean;
  readonly dropsCausalRestraintTag: boolean;
}

export function validateL10SequenceHandling(
  spec: L10SequenceHandlingSpec,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];
  if (spec.consumesL9Output && !spec.honoursSequencePosture) {
    violations.push({
      code: L10ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED,
      field: 'honoursSequencePosture',
      detail: 'Component consumes L9 sequence output without honouring sequence posture',
    });
  }
  if (spec.reinterpretsSequence) {
    violations.push({
      code: L10ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION,
      field: 'reinterpretsSequence',
      detail: 'Component locally reinterprets L9 sequence truth',
    });
  }
  if (spec.dropsAmbiguityPosture) {
    violations.push({
      code: L10ConstitutionalViolationCode.SEQUENCE_POSTURE_OVERWRITE,
      field: 'dropsAmbiguityPosture',
      detail: 'Component drops L9 ambiguity posture when binding evidence',
    });
  }
  if (spec.dropsCausalRestraintTag) {
    violations.push({
      code: L10ConstitutionalViolationCode.CAUSAL_LAUNDERING,
      field: 'dropsCausalRestraintTag',
      detail: 'Component drops L9 causal-restraint tag to support a neater story',
    });
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §10.1.3 / §10.1.5 — Lower-layer redefinition detection.
 */
export interface L10LowerLayerInteractionSpec {
  readonly componentId: string;
  readonly claimedBehaviors: readonly string[];
}

export function validateL10LowerLayerInteraction(
  spec: L10LowerLayerInteractionSpec,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];
  const forbiddenPatterns: ReadonlyArray<[RegExp, L10ConstitutionalViolationCode, string]> = [
    [/re[_-]?resolve[_ ]identity/i, L10ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'identity re-resolution'],
    [/shadow[_ ]identity[_ ]map/i, L10ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'shadow identity map'],
    [/invent[_ ](graph|propagation|edge)/i, L10ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'graph invention'],
    [/redefine[_ ](feature|event|primitive)/i, L10ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'primitive redefinition'],
    [/reinterpret[_ ](event|feature|primitive)/i, L10ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION, 'primitive reinterpretation'],
    [/re[_-]?validate[_ ]?(claim|story|signal)/i, L10ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION, 'validation truth redefinition'],
    [/override[_ ]validation/i, L10ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION, 'validation override'],
    [/live[_ ]from[_ ]l6/i, L10ConstitutionalViolationCode.L7_LIVE_REVALIDATION, 'live L6 revalidation'],
    [/bypass[_ ]l7/i, L10ConstitutionalViolationCode.L7_LIVE_REVALIDATION, 'L7 bypass'],
    [/ignore[_ ]contradiction/i, L10ConstitutionalViolationCode.CONTRADICTION_POSTURE_OVERWRITE, 'contradiction ignored'],
    [/overwrite[_ ]contradiction/i, L10ConstitutionalViolationCode.CONTRADICTION_POSTURE_OVERWRITE, 'contradiction overwritten'],
    [/widen[_ ]restriction/i, L10ConstitutionalViolationCode.RESTRICTION_BYPASS, 'restriction widened'],
    [/ignore[_ ]restriction/i, L10ConstitutionalViolationCode.RESTRICTION_POSTURE_IGNORED, 'restriction ignored'],
    [/reinterpret[_ ]regime/i, L10ConstitutionalViolationCode.REGIME_RECLASSIFICATION, 'regime reinterpretation'],
    [/override[_ ]regime/i, L10ConstitutionalViolationCode.REGIME_RECLASSIFICATION, 'regime override'],
    [/ignore[_ ]regime/i, L10ConstitutionalViolationCode.REGIME_POSTURE_IGNORED, 'regime posture ignored'],
    [/reinterpret[_ ]sequence/i, L10ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION, 'sequence reinterpretation'],
    [/override[_ ]sequence/i, L10ConstitutionalViolationCode.SEQUENCE_REINTERPRETATION, 'sequence override'],
    [/ignore[_ ]sequence/i, L10ConstitutionalViolationCode.SEQUENCE_POSTURE_IGNORED, 'sequence posture ignored'],
    [/drop[_ ]ambiguity/i, L10ConstitutionalViolationCode.SEQUENCE_POSTURE_OVERWRITE, 'ambiguity dropped'],
    [/drop[_ ]causal[_ ]restraint/i, L10ConstitutionalViolationCode.CAUSAL_LAUNDERING, 'causal-restraint dropped'],
    [/from[_ ]raw[_ ](feed|websocket|provider)/i, L10ConstitutionalViolationCode.RAW_DATA_HYPOTHESIS_INVENTION, 'raw ungated ingestion'],
    [/bypass[_ ]l5/i, L10ConstitutionalViolationCode.STORAGE_BYPASS, 'L5 bypass'],
    [/direct[_ ]?(postgres|redis|clickhouse)/i, L10ConstitutionalViolationCode.STORAGE_BYPASS, 'direct store write'],
    [/consume[_ ]l1[1-9]/i, L10ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'later-layer consumption'],
    [/consume[_ ]l2[0-9]/i, L10ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'later-layer consumption'],
    [/consume[_ ]scenario/i, L10ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'scenario consumption'],
    [/consume[_ ]judgment/i, L10ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'judgment consumption'],
    [/consume[_ ]recommendation/i, L10ConstitutionalViolationCode.LATE_LAYER_CONSUMPTION, 'recommendation consumption'],
    [/causal[_ ]certainty/i, L10ConstitutionalViolationCode.CAUSAL_LAUNDERING, 'causal certainty claim'],
    [/proven[_ ]cause/i, L10ConstitutionalViolationCode.CAUSAL_LAUNDERING, 'proven cause claim'],
    [/proven[_ ]causality/i, L10ConstitutionalViolationCode.CAUSAL_LAUNDERING, 'proven causality claim'],
    [/collapse[_ ]alternatives/i, L10ConstitutionalViolationCode.SINGLE_STORY_COLLAPSE, 'alternatives collapsed'],
    [/silence[_ ]alternative/i, L10ConstitutionalViolationCode.ALTERNATIVE_SUPPRESSION, 'alternative silenced'],
    [/hide[_ ]close[_ ]spread/i, L10ConstitutionalViolationCode.CLOSE_SPREAD_CONCEALMENT, 'close spread hidden'],
    [/hide[_ ]confirmation[_ ]gap/i, L10ConstitutionalViolationCode.CONFIRMATION_GAP_CONCEALMENT, 'confirmation gap hidden'],
    [/hide[_ ]invalidation/i, L10ConstitutionalViolationCode.INVALIDATION_POSTURE_CONCEALMENT, 'invalidation posture hidden'],
    [/launder[_ ]explanation/i, L10ConstitutionalViolationCode.EXPLANATION_LAUNDERING, 'explanation laundering'],
    [/primary[_ ]as[_ ]final/i, L10ConstitutionalViolationCode.PRIMARY_AS_FINAL_TRUTH, 'primary as final truth'],
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
 * §10.1.7 — Evidence grounding: hypotheses must be evidence-bound and
 * cannot be built from raw ungated data or from evidence-only surfaces
 * without a governed primary support.
 */
export interface L10EvidenceGroundingSpec {
  readonly componentId: string;
  readonly usesEvidenceOnlySurface: boolean;
  readonly treatsEvidenceAsDecisive: boolean;
  readonly hasNonEvidencePrimarySupport: boolean;
  readonly invventsFromRawData: boolean;
}

export function validateL10EvidenceGrounding(
  spec: L10EvidenceGroundingSpec,
): L10BoundaryValidationResult {
  const violations: L10BoundaryViolation[] = [];
  if (spec.invventsFromRawData) {
    violations.push({
      code: L10ConstitutionalViolationCode.RAW_DATA_HYPOTHESIS_INVENTION,
      field: 'invventsFromRawData',
      detail: 'Component invents hypotheses from raw ungated data',
    });
  }
  if (spec.usesEvidenceOnlySurface && spec.treatsEvidenceAsDecisive) {
    violations.push({
      code: L10ConstitutionalViolationCode.EXPLANATION_LAUNDERING,
      field: 'treatsEvidenceAsDecisive',
      detail: 'Component treats an evidence-only surface as decisive hypothesis support',
    });
  }
  if (spec.usesEvidenceOnlySurface && !spec.hasNonEvidencePrimarySupport) {
    violations.push({
      code: L10ConstitutionalViolationCode.EXPLANATION_LAUNDERING,
      field: 'hasNonEvidencePrimarySupport',
      detail: 'Component has no non-evidence primary support alongside evidence-only surface',
    });
  }
  return { valid: violations.length === 0, violations };
}
