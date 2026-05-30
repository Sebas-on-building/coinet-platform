/**
 * L14.8 — Current Registry Contracts
 *
 * §14.8.11 / §14.8.12 / §14.8.13
 */

import { L14DeliveryChannel } from './delivery-channel';
import {
  L14CalibrationProposalClass,
  L14CalibrationProposalStatus,
  type L14ProposalAffectedLayer,
} from './calibration-proposal-core';
import { L14ProposalReviewQueueClass } from './calibration-proposal-handoff';
import {
  L14ChannelHealthClass,
  L14ChannelRetryPressureClass,
} from './l14-performance-health-facts';

export enum L14CurrentRegistryId {
  CURRENT_DELIVERY_POLICY_REGISTRY = 'l14.current_delivery_policy_registry',
  CURRENT_ALERT_PERFORMANCE_REGISTRY = 'l14.current_alert_performance_registry',
  CURRENT_CALIBRATION_REVIEW_REGISTRY = 'l14.current_calibration_review_registry',
  CURRENT_CHANNEL_HEALTH_REGISTRY = 'l14.current_channel_health_registry',
}
export const ALL_L14_CURRENT_REGISTRIES: readonly L14CurrentRegistryId[] =
  Object.values(L14CurrentRegistryId);

export type L14DeliveryPolicyScope =
  | 'GLOBAL'
  | 'CHANNEL'
  | 'ALERT_CLASS'
  | 'USER_COHORT'
  | 'SUBJECT_SCOPE';

export interface L14CurrentDeliveryPolicyRecord {
  readonly current_delivery_policy_record_id: string;
  readonly delivery_policy_ref: string;
  readonly policy_scope: L14DeliveryPolicyScope;
  readonly active_policy_version: string;
  readonly effective_from: string;
  readonly supersedes_policy_ref?: string;
  readonly ratification_or_governance_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export interface L14CurrentAlertPerformanceRecord {
  readonly current_alert_performance_record_id: string;
  readonly alert_class_ref: string;
  readonly regime_ref?: string;
  readonly horizon_ref?: string;
  readonly latest_performance_fact_ref: string;
  readonly aligned_rate?: number;
  readonly ignored_rate?: number;
  readonly false_positive_rate?: number;
  readonly deeper_investigation_rate?: number;
  readonly evidence_window_ref: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export interface L14CurrentCalibrationReviewRecord {
  readonly current_calibration_review_record_id: string;
  readonly calibration_proposal_ref: string;
  readonly proposal_class: L14CalibrationProposalClass;
  readonly affected_layer: L14ProposalAffectedLayer;
  readonly latest_review_status: L14CalibrationProposalStatus;
  readonly current_review_queue_ref: L14ProposalReviewQueueClass;
  readonly latest_handoff_ref?: string;
  readonly latest_review_note_ref?: string;
  readonly created_at: string;
  readonly last_status_change_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export interface L14CurrentChannelHealthRecord {
  readonly current_channel_health_record_id: string;
  readonly channel: L14DeliveryChannel;
  readonly latest_channel_health_fact_ref: string;
  readonly health_class: L14ChannelHealthClass;
  readonly retry_pressure_class: L14ChannelRetryPressureClass;
  readonly last_success_at?: string;
  readonly last_failure_at?: string;
  readonly observed_window_ref: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
