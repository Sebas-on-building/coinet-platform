/**
 * L11.9 — Extension Policy (§11.9.8)
 *
 * Classification, governance, and assessment object for any future
 * change to a Layer 11 surface. Extensions must declare their
 * classification, affected sublayers, recalibration / migration /
 * ratification requirements.
 */

import { L11SublayerId } from './l11-layer-inventory';

export const L11_EXTENSION_POLICY_VERSION = 'l11.9.extension.v1';

export enum L11ExtensionClassification {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  RECALIBRATION_REQUIRED = 'RECALIBRATION_REQUIRED',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L11_EXTENSION_CLASSIFICATIONS:
  readonly L11ExtensionClassification[] =
  Object.values(L11ExtensionClassification);

export enum L11ExtensionSurface {
  SCORE_FAMILY = 'SCORE_FAMILY',
  SCORE_MEANING_CLAIM = 'SCORE_MEANING_CLAIM',
  SCORE_DIRECTION = 'SCORE_DIRECTION',
  SCORE_BAND_POLICY = 'SCORE_BAND_POLICY',
  FORMULA_DEFINITION = 'FORMULA_DEFINITION',
  FORMULA_WEIGHT_PROFILE = 'FORMULA_WEIGHT_PROFILE',
  FORMULA_MODIFIER_RULE = 'FORMULA_MODIFIER_RULE',
  FORMULA_PENALTY_RULE = 'FORMULA_PENALTY_RULE',
  FORMULA_CAP_RULE = 'FORMULA_CAP_RULE',
  ATTRIBUTION_OBJECT_MODEL = 'ATTRIBUTION_OBJECT_MODEL',
  MISSING_DATA_LAW = 'MISSING_DATA_LAW',
  REGIME_MODIFIER_MATRIX = 'REGIME_MODIFIER_MATRIX',
  CALIBRATION_TARGET = 'CALIBRATION_TARGET',
  CALIBRATION_COHORT = 'CALIBRATION_COHORT',
  DRIFT_TAXONOMY = 'DRIFT_TAXONOMY',
  THRESHOLD_POLICY = 'THRESHOLD_POLICY',
  PERSISTENCE_SURFACE = 'PERSISTENCE_SURFACE',
  READ_SURFACE = 'READ_SURFACE',
  DOWNSTREAM_DEPENDENCY = 'DOWNSTREAM_DEPENDENCY',
}

export const ALL_L11_EXTENSION_SURFACES:
  readonly L11ExtensionSurface[] = Object.values(L11ExtensionSurface);

/**
 * Classifications that, regardless of surface, require migration of
 * historical scores to the new semantic regime.
 */
export const L11_CLASSIFICATIONS_REQUIRING_MIGRATION:
  ReadonlySet<L11ExtensionClassification> = new Set([
  L11ExtensionClassification.MIGRATION_REQUIRED,
  L11ExtensionClassification.BREAKING_SEMANTIC,
]);

/**
 * Classifications that require a fresh recalibration pass before
 * entering live serving.
 */
export const L11_CLASSIFICATIONS_REQUIRING_RECALIBRATION:
  ReadonlySet<L11ExtensionClassification> = new Set([
  L11ExtensionClassification.RECALIBRATION_REQUIRED,
  L11ExtensionClassification.MIGRATION_REQUIRED,
  L11ExtensionClassification.BREAKING_SEMANTIC,
]);

/**
 * Classifications that require explicit L11.9 ratification (cannot
 * proceed under plain extension classification alone).
 */
export const L11_CLASSIFICATIONS_REQUIRING_RATIFICATION:
  ReadonlySet<L11ExtensionClassification> = new Set([
  L11ExtensionClassification.MIGRATION_REQUIRED,
  L11ExtensionClassification.BREAKING_SEMANTIC,
]);

export interface L11ExtensionAssessment {
  readonly extension_assessment_id: string;

  readonly extension_surface: L11ExtensionSurface;
  readonly requested_change_ref: string;

  readonly classification: L11ExtensionClassification;

  readonly migration_required: boolean;
  readonly recalibration_required: boolean;
  readonly replay_backfill_required: boolean;
  readonly ratification_required: boolean;

  readonly affected_sublayers: readonly L11SublayerId[];
  readonly affected_score_families: readonly string[];
  readonly affected_formula_versions: readonly string[];

  readonly reason_codes: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

export interface L11ExtensionAssessmentIssue {
  readonly code: L11ExtensionAssessmentViolationCode;
  readonly message: string;
  readonly extension_assessment_id?: string;
}

export enum L11ExtensionAssessmentViolationCode {
  L11E_CLASSIFICATION_MISSING = 'L11E_CLASSIFICATION_MISSING',
  L11E_SURFACE_MISSING = 'L11E_SURFACE_MISSING',
  L11E_AFFECTED_SUBLAYERS_MISSING = 'L11E_AFFECTED_SUBLAYERS_MISSING',
  L11E_MIGRATION_REQUIRED_BUT_NOT_DECLARED =
    'L11E_MIGRATION_REQUIRED_BUT_NOT_DECLARED',
  L11E_RECALIBRATION_REQUIRED_BUT_NOT_DECLARED =
    'L11E_RECALIBRATION_REQUIRED_BUT_NOT_DECLARED',
  L11E_RATIFICATION_REQUIRED_BUT_NOT_DECLARED =
    'L11E_RATIFICATION_REQUIRED_BUT_NOT_DECLARED',
  L11E_BREAKING_WITHOUT_BACKFILL = 'L11E_BREAKING_WITHOUT_BACKFILL',
  L11E_PROHIBITED_CLASSIFICATION = 'L11E_PROHIBITED_CLASSIFICATION',
  L11E_RESERVED_FAMILY_PROMOTION_WITHOUT_RATIFICATION =
    'L11E_RESERVED_FAMILY_PROMOTION_WITHOUT_RATIFICATION',
  L11E_HISTORICAL_REINTERPRETATION_DETECTED =
    'L11E_HISTORICAL_REINTERPRETATION_DETECTED',
  L11E_REPLAY_HASH_MISSING = 'L11E_REPLAY_HASH_MISSING',
  L11E_LINEAGE_REFS_MISSING = 'L11E_LINEAGE_REFS_MISSING',
  L11E_POLICY_VERSION_MISSING = 'L11E_POLICY_VERSION_MISSING',
}

export const ALL_L11_EXTENSION_ASSESSMENT_VIOLATION_CODES:
  readonly L11ExtensionAssessmentViolationCode[] =
  Object.values(L11ExtensionAssessmentViolationCode);

/**
 * Pure validator: returns issues for an extension assessment. No I/O.
 */
export function validateL11ExtensionAssessment(
  a: L11ExtensionAssessment,
): readonly L11ExtensionAssessmentIssue[] {
  const issues: L11ExtensionAssessmentIssue[] = [];
  const ref = a?.extension_assessment_id;

  if (!a) {
    issues.push({ code: L11ExtensionAssessmentViolationCode.L11E_CLASSIFICATION_MISSING,
      message: 'extension assessment is null/undefined' });
    return issues;
  }
  if (!a.classification) {
    issues.push({ code: L11ExtensionAssessmentViolationCode.L11E_CLASSIFICATION_MISSING,
      message: 'classification missing', extension_assessment_id: ref });
  }
  if (!a.extension_surface) {
    issues.push({ code: L11ExtensionAssessmentViolationCode.L11E_SURFACE_MISSING,
      message: 'extension_surface missing', extension_assessment_id: ref });
  }
  if (!Array.isArray(a.affected_sublayers) || a.affected_sublayers.length === 0) {
    issues.push({ code: L11ExtensionAssessmentViolationCode.L11E_AFFECTED_SUBLAYERS_MISSING,
      message: 'affected_sublayers must be non-empty',
      extension_assessment_id: ref });
  }
  if (!a.replay_hash) {
    issues.push({ code: L11ExtensionAssessmentViolationCode.L11E_REPLAY_HASH_MISSING,
      message: 'replay_hash missing', extension_assessment_id: ref });
  }
  if (!Array.isArray(a.lineage_refs) || a.lineage_refs.length === 0) {
    issues.push({ code: L11ExtensionAssessmentViolationCode.L11E_LINEAGE_REFS_MISSING,
      message: 'lineage_refs must be non-empty', extension_assessment_id: ref });
  }
  if (!a.policy_version) {
    issues.push({ code: L11ExtensionAssessmentViolationCode.L11E_POLICY_VERSION_MISSING,
      message: 'policy_version missing', extension_assessment_id: ref });
  }
  if (a.classification === L11ExtensionClassification.PROHIBITED) {
    issues.push({ code: L11ExtensionAssessmentViolationCode.L11E_PROHIBITED_CLASSIFICATION,
      message: 'prohibited extension classification cannot be admitted',
      extension_assessment_id: ref });
  }
  if (a.classification &&
      L11_CLASSIFICATIONS_REQUIRING_MIGRATION.has(a.classification) &&
      !a.migration_required) {
    issues.push({
      code: L11ExtensionAssessmentViolationCode.L11E_MIGRATION_REQUIRED_BUT_NOT_DECLARED,
      message: `${a.classification} requires migration_required=true`,
      extension_assessment_id: ref,
    });
  }
  if (a.classification &&
      L11_CLASSIFICATIONS_REQUIRING_RECALIBRATION.has(a.classification) &&
      !a.recalibration_required) {
    issues.push({
      code: L11ExtensionAssessmentViolationCode.L11E_RECALIBRATION_REQUIRED_BUT_NOT_DECLARED,
      message: `${a.classification} requires recalibration_required=true`,
      extension_assessment_id: ref,
    });
  }
  if (a.classification &&
      L11_CLASSIFICATIONS_REQUIRING_RATIFICATION.has(a.classification) &&
      !a.ratification_required) {
    issues.push({
      code: L11ExtensionAssessmentViolationCode.L11E_RATIFICATION_REQUIRED_BUT_NOT_DECLARED,
      message: `${a.classification} requires ratification_required=true`,
      extension_assessment_id: ref,
    });
  }
  if (a.classification === L11ExtensionClassification.BREAKING_SEMANTIC &&
      !a.replay_backfill_required) {
    issues.push({
      code: L11ExtensionAssessmentViolationCode.L11E_BREAKING_WITHOUT_BACKFILL,
      message: 'BREAKING_SEMANTIC must declare replay_backfill_required=true',
      extension_assessment_id: ref,
    });
  }
  return issues;
}
