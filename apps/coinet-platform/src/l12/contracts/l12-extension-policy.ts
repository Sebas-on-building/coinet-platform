/**
 * L12.7 — Extension Policy (§12.7.10)
 *
 * Classifies any future change to a Layer 12 surface. Extensions must
 * declare their classification, the surface they touch, and any
 * required recertification / migration / replay backfill.
 */

import { L12SublayerId } from './l12-final-definition';

export const L12_EXTENSION_POLICY_VERSION = 'l12.7.extension.v1';

/** §12.7.10 — extension classifications. */
export enum L12ExtensionClassification {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  RECERTIFICATION_REQUIRED = 'RECERTIFICATION_REQUIRED',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L12_EXTENSION_CLASSIFICATIONS:
  readonly L12ExtensionClassification[] =
  Object.values(L12ExtensionClassification);

export enum L12ExtensionSurface {
  SCENARIO_DOCTRINE = 'SCENARIO_DOCTRINE',
  SCENARIO_OBJECT_MODEL = 'SCENARIO_OBJECT_MODEL',
  SCENARIO_CONTRACTS = 'SCENARIO_CONTRACTS',
  SCENARIO_OUTPUT_SURFACES = 'SCENARIO_OUTPUT_SURFACES',
  RUNTIME_DAG = 'RUNTIME_DAG',
  SCENARIO_TEMPLATE_REGISTRY = 'SCENARIO_TEMPLATE_REGISTRY',
  TRIGGER_STRENGTH_PROFILE = 'TRIGGER_STRENGTH_PROFILE',
  INVALIDATION_STRENGTH_PROFILE = 'INVALIDATION_STRENGTH_PROFILE',
  PATH_CONFIDENCE_POLICY = 'PATH_CONFIDENCE_POLICY',
  PATH_CONFIDENCE_CAP_REASON = 'PATH_CONFIDENCE_CAP_REASON',
  SCENARIO_SPREAD_POLICY = 'SCENARIO_SPREAD_POLICY',
  SCENARIO_READINESS_POLICY = 'SCENARIO_READINESS_POLICY',
  L11_SCORE_CONTEXT_REQUIREMENT = 'L11_SCORE_CONTEXT_REQUIREMENT',
  PERSISTENCE_SURFACE = 'PERSISTENCE_SURFACE',
  READ_SURFACE = 'READ_SURFACE',
  REPLAY_LAW = 'REPLAY_LAW',
  REPAIR_LAW = 'REPAIR_LAW',
  DOWNSTREAM_DEPENDENCY = 'DOWNSTREAM_DEPENDENCY',
  AUDIT_REASON_CODE = 'AUDIT_REASON_CODE',
  DIAGNOSTIC_CODE = 'DIAGNOSTIC_CODE',
}

export const ALL_L12_EXTENSION_SURFACES:
  readonly L12ExtensionSurface[] = Object.values(L12ExtensionSurface);

/**
 * §12.7.10 — surfaces whose modification is mapped to a canonical
 * classification. Surfaces NOT listed here must be classified
 * explicitly by the requester (the classifier defaults to
 * `RECERTIFICATION_REQUIRED` to be safe).
 */
export const L12_DEFAULT_SURFACE_CLASSIFICATION:
  Readonly<Record<L12ExtensionSurface, L12ExtensionClassification>> = {
  [L12ExtensionSurface.SCENARIO_DOCTRINE]:
    L12ExtensionClassification.PROHIBITED,
  [L12ExtensionSurface.SCENARIO_OBJECT_MODEL]:
    L12ExtensionClassification.BREAKING_SEMANTIC,
  [L12ExtensionSurface.SCENARIO_CONTRACTS]:
    L12ExtensionClassification.MIGRATION_REQUIRED,
  [L12ExtensionSurface.SCENARIO_OUTPUT_SURFACES]:
    L12ExtensionClassification.MIGRATION_REQUIRED,
  [L12ExtensionSurface.RUNTIME_DAG]:
    L12ExtensionClassification.MIGRATION_REQUIRED,
  [L12ExtensionSurface.SCENARIO_TEMPLATE_REGISTRY]:
    L12ExtensionClassification.RECERTIFICATION_REQUIRED,
  [L12ExtensionSurface.TRIGGER_STRENGTH_PROFILE]:
    L12ExtensionClassification.RECERTIFICATION_REQUIRED,
  [L12ExtensionSurface.INVALIDATION_STRENGTH_PROFILE]:
    L12ExtensionClassification.RECERTIFICATION_REQUIRED,
  [L12ExtensionSurface.PATH_CONFIDENCE_POLICY]:
    L12ExtensionClassification.BREAKING_SEMANTIC,
  [L12ExtensionSurface.PATH_CONFIDENCE_CAP_REASON]:
    L12ExtensionClassification.RECERTIFICATION_REQUIRED,
  [L12ExtensionSurface.SCENARIO_SPREAD_POLICY]:
    L12ExtensionClassification.BREAKING_SEMANTIC,
  [L12ExtensionSurface.SCENARIO_READINESS_POLICY]:
    L12ExtensionClassification.BREAKING_SEMANTIC,
  [L12ExtensionSurface.L11_SCORE_CONTEXT_REQUIREMENT]:
    L12ExtensionClassification.PROHIBITED,
  [L12ExtensionSurface.PERSISTENCE_SURFACE]:
    L12ExtensionClassification.MIGRATION_REQUIRED,
  [L12ExtensionSurface.READ_SURFACE]:
    L12ExtensionClassification.BACKWARD_COMPATIBLE,
  [L12ExtensionSurface.REPLAY_LAW]:
    L12ExtensionClassification.PROHIBITED,
  [L12ExtensionSurface.REPAIR_LAW]:
    L12ExtensionClassification.PROHIBITED,
  [L12ExtensionSurface.DOWNSTREAM_DEPENDENCY]:
    L12ExtensionClassification.MIGRATION_REQUIRED,
  [L12ExtensionSurface.AUDIT_REASON_CODE]:
    L12ExtensionClassification.ADDITIVE_SAFE,
  [L12ExtensionSurface.DIAGNOSTIC_CODE]:
    L12ExtensionClassification.ADDITIVE_SAFE,
};

/** Classifications that require migration (§12.7.10 Migration). */
export const L12_CLASSIFICATIONS_REQUIRING_MIGRATION:
  ReadonlySet<L12ExtensionClassification> = new Set([
  L12ExtensionClassification.MIGRATION_REQUIRED,
  L12ExtensionClassification.BREAKING_SEMANTIC,
]);

/** Classifications that require recertification. */
export const L12_CLASSIFICATIONS_REQUIRING_RECERTIFICATION:
  ReadonlySet<L12ExtensionClassification> = new Set([
  L12ExtensionClassification.RECERTIFICATION_REQUIRED,
  L12ExtensionClassification.MIGRATION_REQUIRED,
  L12ExtensionClassification.BREAKING_SEMANTIC,
]);

/** Classifications that require replay backfill. */
export const L12_CLASSIFICATIONS_REQUIRING_REPLAY_BACKFILL:
  ReadonlySet<L12ExtensionClassification> = new Set([
  L12ExtensionClassification.MIGRATION_REQUIRED,
  L12ExtensionClassification.BREAKING_SEMANTIC,
]);

/**
 * Concrete extension request put forward by an engineer / pipeline.
 * The extension classifier validates each `L12ExtensionRequest` and
 * either admits or rejects it.
 */
export interface L12ExtensionRequest {
  readonly extension_request_id: string;
  readonly extension_surface: L12ExtensionSurface;
  readonly requested_change_ref: string;

  readonly proposed_classification: L12ExtensionClassification;

  readonly migration_declared: boolean;
  readonly recertification_declared: boolean;
  readonly replay_backfill_declared: boolean;

  readonly affected_sublayers: readonly L12SublayerId[];

  readonly weakens_trigger_law: boolean;
  readonly weakens_invalidation_law: boolean;
  readonly weakens_no_rebuild_law: boolean;
  readonly enables_prediction_output: boolean;
  readonly enables_recommendation_output: boolean;
  readonly enables_final_judgment_output: boolean;
  readonly bypasses_l5_persistence: boolean;
  readonly removes_l11_score_context_requirement: boolean;

  readonly reason_codes: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * Decision returned by the extension classifier for a single request.
 */
export interface L12ExtensionAssessment {
  readonly extension_request_id: string;
  readonly extension_surface: L12ExtensionSurface;
  readonly final_classification: L12ExtensionClassification;
  readonly admitted: boolean;
  readonly migration_required: boolean;
  readonly recertification_required: boolean;
  readonly replay_backfill_required: boolean;
  readonly violation_codes: readonly string[];
  readonly reason: string;
  readonly policy_version: string;
}
