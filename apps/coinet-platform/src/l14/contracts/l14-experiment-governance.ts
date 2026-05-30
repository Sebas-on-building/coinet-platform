/**
 * L14.9 — Experiment Governance Contracts
 *
 * §14.9.27 / §14.9.28 / §14.9.29 / §14.9.30 / §14.9.31 / §14.9.32 / §14.9.33 / §14.9.34
 */

import { L14DeliveryChannel } from './delivery-channel';
import { L14AudienceClass } from './audience-class';

export enum L14ExperimentClass {
  CHANNEL_TIMING = 'CHANNEL_TIMING',
  ALERT_COPY_FORMAT = 'ALERT_COPY_FORMAT',
  ALERT_GROUPING = 'ALERT_GROUPING',
  DASHBOARD_COMPONENT_PLACEMENT = 'DASHBOARD_COMPONENT_PLACEMENT',
  DIGEST_CADENCE = 'DIGEST_CADENCE',
}

export enum L14AllowedExperimentSurface {
  DELIVERY_TIMING_OFFSET = 'DELIVERY_TIMING_OFFSET',
  COPY_CONCISION_PROFILE = 'COPY_CONCISION_PROFILE',
  ALERT_GROUPING_LAYOUT = 'ALERT_GROUPING_LAYOUT',
  DASHBOARD_COMPONENT_POSITION = 'DASHBOARD_COMPONENT_POSITION',
  DIGEST_WINDOW_SCHEDULE = 'DIGEST_WINDOW_SCHEDULE',
}

// Canonical class → allowed surface mapping.
export const L14_EXPERIMENT_CLASS_ALLOWED_SURFACES: Readonly<Record<L14ExperimentClass, readonly L14AllowedExperimentSurface[]>> = {
  [L14ExperimentClass.CHANNEL_TIMING]: [L14AllowedExperimentSurface.DELIVERY_TIMING_OFFSET],
  [L14ExperimentClass.ALERT_COPY_FORMAT]: [L14AllowedExperimentSurface.COPY_CONCISION_PROFILE],
  [L14ExperimentClass.ALERT_GROUPING]: [L14AllowedExperimentSurface.ALERT_GROUPING_LAYOUT],
  [L14ExperimentClass.DASHBOARD_COMPONENT_PLACEMENT]: [L14AllowedExperimentSurface.DASHBOARD_COMPONENT_POSITION],
  [L14ExperimentClass.DIGEST_CADENCE]: [L14AllowedExperimentSurface.DIGEST_WINDOW_SCHEDULE],
};

export enum L14ExperimentRolloutStatus {
  DRAFT = 'DRAFT',
  APPROVED_NOT_LIVE = 'APPROVED_NOT_LIVE',
  INTERNAL_CANARY = 'INTERNAL_CANARY',
  LIMITED_LIVE = 'LIMITED_LIVE',
  PRODUCTION_EXPERIMENT = 'PRODUCTION_EXPERIMENT',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export interface L14DeliveryExperiment {
  readonly experiment_id: string;
  readonly experiment_class: L14ExperimentClass;
  readonly allowed_variation_surface: L14AllowedExperimentSurface;
  readonly prohibited_truth_mutation: true;
  readonly prohibited_safety_mutation: true;
  readonly prohibited_grounding_mutation: true;
  readonly prohibited_contradiction_disclosure_mutation: true;
  readonly prohibited_restriction_mutation: true;
  readonly sample_policy_ref: string;
  readonly evaluation_metric_refs: readonly string[];
  readonly rollout_status: L14ExperimentRolloutStatus;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14ExperimentSamplePolicy {
  readonly sample_policy_id: string;
  readonly deterministic_bucket_salt_ref: string;
  readonly eligible_audience_classes: readonly L14AudienceClass[];
  readonly eligible_channels: readonly L14DeliveryChannel[];
  readonly max_exposure_percentage: number;
  readonly holdout_percentage: number;
  readonly require_user_opt_in_for_experiment: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14ExperimentAssignment {
  readonly experiment_assignment_id: string;
  readonly experiment_ref: string;
  readonly user_id_hash: string;
  readonly assigned_variant_ref: string;
  readonly assignment_basis: 'DETERMINISTIC_HASH_BUCKET';
  readonly holdout_assigned: boolean;
  readonly assigned_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14ExperimentExposureRecord {
  readonly experiment_exposure_id: string;
  readonly experiment_ref: string;
  readonly assignment_ref: string;
  readonly exposure_surface: L14AllowedExperimentSurface;
  readonly variant_ref: string;
  readonly source_delivery_payload_ref?: string;
  readonly source_dashboard_component_ref?: string;
  readonly source_digest_ref?: string;
  readonly occurred_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// Allowed experiment metrics (§14.9.34).
export enum L14ExperimentMetricClass {
  DELIVERY_LATENCY = 'DELIVERY_LATENCY',
  OPEN_RATE = 'OPEN_RATE',
  CLICKTHROUGH_RATE = 'CLICKTHROUGH_RATE',
  DISMISSAL_RATE = 'DISMISSAL_RATE',
  MUTE_RATE = 'MUTE_RATE',
  DEEPER_INVESTIGATION_RATE = 'DEEPER_INVESTIGATION_RATE',
  DIGEST_COMPLETION_RATE = 'DIGEST_COMPLETION_RATE',
  EXPERIMENT_VARIANT_OPT_OUT_RATE = 'EXPERIMENT_VARIANT_OPT_OUT_RATE',
}

// Metric classes forbidden as "correctness" proxies for experiments.
// Correctness questions must go through L14.5 outcome evaluation, not engagement.
export enum L14ExperimentForbiddenMetricClass {
  OUTCOME_ACCURACY_FROM_OPEN_RATE = 'OUTCOME_ACCURACY_FROM_OPEN_RATE',
  TRUTH_CONFIDENCE_FROM_DISMISSAL_RATE = 'TRUTH_CONFIDENCE_FROM_DISMISSAL_RATE',
  CALIBRATION_CORRECTNESS_FROM_CLICKTHROUGH = 'CALIBRATION_CORRECTNESS_FROM_CLICKTHROUGH',
}
