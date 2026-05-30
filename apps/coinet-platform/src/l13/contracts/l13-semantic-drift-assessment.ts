/**
 * L13.11 — Semantic Drift Assessment Contract
 *
 * §13.11.10 / §13.11.11 — Closed set of drift classes plus the
 * durable drift-assessment shape.
 */

export enum L13SemanticDriftClass {
  NO_MEANINGFUL_DRIFT = 'NO_MEANINGFUL_DRIFT',
  WORDING_ONLY_DRIFT = 'WORDING_ONLY_DRIFT',
  MATERIAL_EXPLANATION_DRIFT = 'MATERIAL_EXPLANATION_DRIFT',
  CLAIM_SUPPORT_DRIFT = 'CLAIM_SUPPORT_DRIFT',
  DISCLOSURE_DRIFT = 'DISCLOSURE_DRIFT',
  SAFETY_DRIFT = 'SAFETY_DRIFT',
  RESTRICTION_DRIFT = 'RESTRICTION_DRIFT',
  CONDITIONALITY_DRIFT = 'CONDITIONALITY_DRIFT',
  PRODUCT_MODE_SHAPE_DRIFT = 'PRODUCT_MODE_SHAPE_DRIFT',
}

export const ALL_L13_SEMANTIC_DRIFT_CLASSES:
  readonly L13SemanticDriftClass[] =
  Object.values(L13SemanticDriftClass);

export enum L13SemanticDriftSeverity {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const ALL_L13_SEMANTIC_DRIFT_SEVERITIES:
  readonly L13SemanticDriftSeverity[] =
  Object.values(L13SemanticDriftSeverity);

export interface L13SemanticDriftAssessment {
  readonly semantic_drift_assessment_id: string;
  readonly source_output_id: string;
  readonly replay_output_id: string;
  readonly drift_detected: boolean;
  readonly drift_severity: L13SemanticDriftSeverity;
  readonly drift_classes: readonly L13SemanticDriftClass[];
  readonly source_summary_fingerprint: string;
  readonly replay_summary_fingerprint: string;
  readonly lost_claim_refs: readonly string[];
  readonly added_claim_refs: readonly string[];
  readonly shifted_claim_refs: readonly string[];
  readonly lost_disclosure_refs: readonly string[];
  readonly altered_safety_refs: readonly string[];
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
