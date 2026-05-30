/**
 * L14.9 — Analyst Operations Contracts
 *
 * §14.9.51 / §14.9.52
 */

export enum L14AnalystOperationalActionClass {
  ACKNOWLEDGE_INCIDENT = 'ACKNOWLEDGE_INCIDENT',
  START_INVESTIGATION = 'START_INVESTIGATION',
  APPLY_GOVERNED_ROLLOUT_PAUSE = 'APPLY_GOVERNED_ROLLOUT_PAUSE',
  APPLY_GOVERNED_ROLLBACK = 'APPLY_GOVERNED_ROLLBACK',
  OPEN_CALIBRATION_REVIEW = 'OPEN_CALIBRATION_REVIEW',
  ESCALATE_TO_LAYER_OWNER = 'ESCALATE_TO_LAYER_OWNER',
  ADD_OPERATIONAL_NOTE = 'ADD_OPERATIONAL_NOTE',
  CLOSE_INCIDENT = 'CLOSE_INCIDENT',
}

export interface L14AnalystOperationalActionRecord {
  readonly analyst_operational_action_id: string;
  readonly action_class: L14AnalystOperationalActionClass;
  readonly analyst_ref: string;
  readonly subject_incident_ref?: string;
  readonly subject_rollout_policy_ref?: string;
  readonly subject_proposal_ref?: string;
  readonly action_summary: string;
  readonly governed_result_ref?: string;
  readonly lower_layer_mutation_attempted: false;
  readonly historical_truth_mutation_attempted: false;
  readonly user_preference_bypass_attempted: false;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
