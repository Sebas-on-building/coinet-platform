/**
 * L14.1 — Output Surface Contracts
 *
 * §14.1.12 / §14.1.13 — Closed set of legal output surfaces and
 * the descriptor every registered surface must populate.
 */

export enum L14OutputSurfaceClass {
  DELIVERY_POLICY_SURFACE = 'DELIVERY_POLICY_SURFACE',
  DELIVERY_ELIGIBILITY_SURFACE = 'DELIVERY_ELIGIBILITY_SURFACE',
  DELIVERY_ROUTING_SURFACE = 'DELIVERY_ROUTING_SURFACE',
  DELIVERY_SUPPRESSION_SURFACE = 'DELIVERY_SUPPRESSION_SURFACE',
  USER_INTERACTION_EVENT_SURFACE = 'USER_INTERACTION_EVENT_SURFACE',
  FEEDBACK_INTERPRETATION_SURFACE = 'FEEDBACK_INTERPRETATION_SURFACE',
  OUTCOME_EVALUATION_SURFACE = 'OUTCOME_EVALUATION_SURFACE',
  ALERT_EFFECTIVENESS_SURFACE = 'ALERT_EFFECTIVENESS_SURFACE',
  CALIBRATION_EVIDENCE_SURFACE = 'CALIBRATION_EVIDENCE_SURFACE',
  CALIBRATION_PROPOSAL_SURFACE = 'CALIBRATION_PROPOSAL_SURFACE',
  ANALYST_REVIEW_SURFACE = 'ANALYST_REVIEW_SURFACE',
  OPERATIONAL_HEALTH_SURFACE = 'OPERATIONAL_HEALTH_SURFACE',
}

export const ALL_L14_OUTPUT_SURFACE_CLASSES:
  readonly L14OutputSurfaceClass[] =
  Object.values(L14OutputSurfaceClass);

export interface L14OutputSurfaceDefinition {
  readonly output_surface_id: L14OutputSurfaceClass;
  readonly may_mutate_lower_layers: false;
  readonly may_claim_truth: false;
  readonly may_claim_evaluation: boolean;
  readonly may_claim_calibration_evidence: boolean;
  readonly may_generate_review_proposal: boolean;
  readonly lower_layer_rebuild_forbidden: true;
  readonly engagement_as_truth_forbidden: true;
  readonly lineage_required: true;
  readonly replay_hash_required: true;
  readonly l5_route_required: true;
  readonly policy_version: string;
}
