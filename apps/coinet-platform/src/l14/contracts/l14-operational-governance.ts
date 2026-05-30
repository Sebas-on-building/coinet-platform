/**
 * L14.9 — Operational Governance Contracts
 *
 * §14.9.36–§14.9.49
 */

import { L14DeliveryChannel } from './delivery-channel';

export enum L14OperationalSignalClass {
  CHANNEL_HEALTH_DEGRADED = 'CHANNEL_HEALTH_DEGRADED',
  TELEGRAM_FAILURE_SPIKE = 'TELEGRAM_FAILURE_SPIKE',
  DELIVERY_QUEUE_BACKLOG = 'DELIVERY_QUEUE_BACKLOG',
  ALERT_SPIKE_DETECTED = 'ALERT_SPIKE_DETECTED',
  MUTED_ALERT_RATIO_ELEVATED = 'MUTED_ALERT_RATIO_ELEVATED',
  FALSE_POSITIVE_WATCHLIST_TRIGGERED = 'FALSE_POSITIVE_WATCHLIST_TRIGGERED',
  CALIBRATION_REVIEW_BACKLOG_ELEVATED = 'CALIBRATION_REVIEW_BACKLOG_ELEVATED',
  HIGH_RISK_REGIME_ALERT_OVERLOAD = 'HIGH_RISK_REGIME_ALERT_OVERLOAD',
}

export enum L14OperationalSignalSeverityClass {
  INFO = 'INFO',
  WATCH = 'WATCH',
  MATERIAL = 'MATERIAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface L14OperationalSignalRecord {
  readonly operational_signal_id: string;
  readonly signal_class: L14OperationalSignalClass;
  readonly observed_window_start: string;
  readonly observed_window_end: string;
  readonly source_read_surface_refs: readonly string[];
  readonly source_metric_refs: readonly string[];
  readonly severity_class: L14OperationalSignalSeverityClass;
  readonly recommended_playbook_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14OperationalIncidentClass {
  TELEGRAM_OUTAGE = 'TELEGRAM_OUTAGE',
  DELIVERY_BACKLOG_RISK = 'DELIVERY_BACKLOG_RISK',
  ALERT_SPAM_RISK = 'ALERT_SPAM_RISK',
  MUTED_ALERT_RATE_RISK = 'MUTED_ALERT_RATE_RISK',
  FALSE_POSITIVE_REVIEW_RISK = 'FALSE_POSITIVE_REVIEW_RISK',
  CALIBRATION_QUEUE_STALL = 'CALIBRATION_QUEUE_STALL',
  HIGH_RISK_REGIME_ALERT_OVERLOAD_RISK = 'HIGH_RISK_REGIME_ALERT_OVERLOAD_RISK',
}

export enum L14OperationalIncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  MITIGATION_APPLIED = 'MITIGATION_APPLIED',
  MONITORING = 'MONITORING',
  RESOLVED = 'RESOLVED',
  CLOSED_NO_ACTION = 'CLOSED_NO_ACTION',
}

export interface L14OperationalIncidentRecord {
  readonly operational_incident_id: string;
  readonly incident_class: L14OperationalIncidentClass;
  readonly trigger_signal_ref: string;
  readonly opened_at: string;
  readonly current_status: L14OperationalIncidentStatus;
  readonly affected_channel_refs: readonly L14DeliveryChannel[];
  readonly affected_alert_class_refs: readonly string[];
  readonly recommended_playbook_ref: string;
  readonly analyst_owner_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14OperationalDashboardClass {
  CHANNEL_HEALTH = 'CHANNEL_HEALTH',
  TELEGRAM_FAILURES = 'TELEGRAM_FAILURES',
  DELIVERY_QUEUE_BACKLOG = 'DELIVERY_QUEUE_BACKLOG',
  ALERT_SPIKE = 'ALERT_SPIKE',
  MUTED_ALERT_RATIO = 'MUTED_ALERT_RATIO',
  FALSE_POSITIVE_WATCHLIST = 'FALSE_POSITIVE_WATCHLIST',
  CALIBRATION_REVIEW_BACKLOG = 'CALIBRATION_REVIEW_BACKLOG',
  HIGH_RISK_REGIME_ALERT_OVERLOAD = 'HIGH_RISK_REGIME_ALERT_OVERLOAD',
}

export enum L14OperationalDashboardStatus {
  HEALTHY = 'HEALTHY',
  WATCH = 'WATCH',
  DEGRADED = 'DEGRADED',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
  CRITICAL = 'CRITICAL',
}

export interface L14OperationalDashboardSnapshot {
  readonly operational_dashboard_snapshot_id: string;
  readonly dashboard_class: L14OperationalDashboardClass;
  readonly observed_window_start: string;
  readonly observed_window_end: string;
  readonly source_read_surface_refs: readonly string[];
  readonly current_status: L14OperationalDashboardStatus;
  readonly threshold_breach_refs: readonly string[];
  readonly recommended_playbook_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14OperationalPlaybookClass {
  TELEGRAM_FAILURE_PLAYBOOK = 'TELEGRAM_FAILURE_PLAYBOOK',
  DELIVERY_BACKLOG_PLAYBOOK = 'DELIVERY_BACKLOG_PLAYBOOK',
  ALERT_SPIKE_PLAYBOOK = 'ALERT_SPIKE_PLAYBOOK',
  MUTED_ALERT_RATIO_PLAYBOOK = 'MUTED_ALERT_RATIO_PLAYBOOK',
  FALSE_POSITIVE_WATCHLIST_PLAYBOOK = 'FALSE_POSITIVE_WATCHLIST_PLAYBOOK',
  CALIBRATION_REVIEW_BACKLOG_PLAYBOOK = 'CALIBRATION_REVIEW_BACKLOG_PLAYBOOK',
  HIGH_RISK_REGIME_ALERT_OVERLOAD_PLAYBOOK = 'HIGH_RISK_REGIME_ALERT_OVERLOAD_PLAYBOOK',
}

export enum L14OperationalMitigationActionClass {
  PAUSE_CHANNEL_ROLLOUT = 'PAUSE_CHANNEL_ROLLOUT',
  LIMIT_ALERT_CLASS_TO_DIGEST = 'LIMIT_ALERT_CLASS_TO_DIGEST',
  REDUCE_EXTERNAL_DELIVERY_RATE = 'REDUCE_EXTERNAL_DELIVERY_RATE',
  ENABLE_QUEUE_BACKPRESSURE = 'ENABLE_QUEUE_BACKPRESSURE',
  OPEN_ANALYST_REVIEW_CASE = 'OPEN_ANALYST_REVIEW_CASE',
  OPEN_CALIBRATION_REVIEW_CASE = 'OPEN_CALIBRATION_REVIEW_CASE',
  MONITOR_ONLY = 'MONITOR_ONLY',
}

export enum L14OperationalProhibitedActionClass {
  ALTER_LOWER_LAYER_TRUTH = 'ALTER_LOWER_LAYER_TRUTH',
  SUPPRESS_REQUIRED_DISCLOSURES = 'SUPPRESS_REQUIRED_DISCLOSURES',
  OVERRIDE_USER_MUTES = 'OVERRIDE_USER_MUTES',
  OVERRIDE_CHANNEL_RESERVED_STATUS = 'OVERRIDE_CHANNEL_RESERVED_STATUS',
  MUTATE_HISTORICAL_DELIVERY_FACTS = 'MUTATE_HISTORICAL_DELIVERY_FACTS',
  ALTER_EXPERIMENT_RESULTS = 'ALTER_EXPERIMENT_RESULTS',
}

export interface L14OperationalPlaybook {
  readonly operational_playbook_id: string;
  readonly playbook_class: L14OperationalPlaybookClass;
  readonly trigger_signal_classes: readonly L14OperationalSignalClass[];
  readonly allowed_mitigation_actions: readonly L14OperationalMitigationActionClass[];
  readonly may_pause_rollout: boolean;
  readonly may_downgrade_to_digest: boolean;
  readonly may_trigger_analyst_review: boolean;
  readonly may_open_calibration_review: boolean;
  readonly prohibited_actions: readonly L14OperationalProhibitedActionClass[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
