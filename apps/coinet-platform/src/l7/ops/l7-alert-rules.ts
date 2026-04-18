/**
 * L7.8 — Alert Rules
 *
 * §7.8.6.4 — Mandatory alerts. Every zero-tolerance SLO backs at least
 * one PAGE-severity alert with a dedicated runbook.
 */

import { L7MetricId } from './l7-operational-metrics';

export enum L7OperationalSeverity {
  PAGE = 'PAGE',
  TICKET = 'TICKET',
  NOTIFY = 'NOTIFY',
}

export interface L7AlertRule {
  readonly rule_id: string;
  readonly metric_id: L7MetricId;
  readonly condition: string;
  readonly severity: L7OperationalSeverity;
  readonly runbook_ref: string;
}

export const L7_ALERT_RULES: readonly L7AlertRule[] = Object.freeze([
  {
    rule_id: 'alert.l7.replay_mismatch',
    metric_id: L7MetricId.REPLAY_HASH_MISMATCH_COUNT,
    condition: 'count > 0 over 15m',
    severity: L7OperationalSeverity.PAGE,
    runbook_ref: 'RB-L7-REPLAY-MISMATCH',
  },
  {
    rule_id: 'alert.l7.contradiction_lineage_mismatch',
    metric_id: L7MetricId.CONTRADICTION_BUNDLE_MISSING_WHEN_REQUIRED,
    condition: 'count > 0 over 15m',
    severity: L7OperationalSeverity.PAGE,
    runbook_ref: 'RB-L7-CONTRADICTION-LINEAGE',
  },
  {
    rule_id: 'alert.l7.current_historical_divergence',
    metric_id: L7MetricId.CURRENT_HISTORICAL_DIVERGENCE_COUNT,
    condition: 'count > 0 over 15m',
    severity: L7OperationalSeverity.PAGE,
    runbook_ref: 'RB-L7-CURRENT-HISTORICAL-DIVERGE',
  },
  {
    rule_id: 'alert.l7.shadow_authority_attempt',
    metric_id: L7MetricId.SHADOW_AUTHORITY_ATTEMPT_COUNT,
    condition: 'count > 0 over 15m',
    severity: L7OperationalSeverity.PAGE,
    runbook_ref: 'RB-L7-SHADOW-AUTHORITY',
  },
  {
    rule_id: 'alert.l7.downstream_raw_rebuild',
    metric_id: L7MetricId.DOWNSTREAM_RAW_REBUILD_ATTEMPT_COUNT,
    condition: 'count > 0 over 15m',
    severity: L7OperationalSeverity.PAGE,
    runbook_ref: 'RB-L7-DOWNSTREAM-RAW-REBUILD',
  },
  {
    rule_id: 'alert.l7.evidence_missing',
    metric_id: L7MetricId.MISSING_EVIDENCE_POINTER_RATE,
    condition: 'rate > 0 where policy requires evidence',
    severity: L7OperationalSeverity.PAGE,
    runbook_ref: 'RB-L7-EVIDENCE-MISSING',
  },
  {
    rule_id: 'alert.l7.rollout_gate_failure',
    metric_id: L7MetricId.FAMILY_ROLLOUT_ILLEGALITY_COUNT,
    condition: 'count > 0 under enable request',
    severity: L7OperationalSeverity.TICKET,
    runbook_ref: 'RB-L7-ROLLOUT-GATE',
  },
  {
    rule_id: 'alert.l7.clean_confidence_blocked',
    metric_id: L7MetricId.CLEAN_CONFIDENCE_BLOCKED_COUNT,
    condition: 'count > 0 over 15m',
    severity: L7OperationalSeverity.TICKET,
    runbook_ref: 'RB-L7-CLEAN-CONFIDENCE',
  },
  {
    rule_id: 'alert.l7.persistence_failure_spike',
    metric_id: L7MetricId.PERSISTENCE_FAILURE_RATE,
    condition: 'rate > 0.005 over 15m',
    severity: L7OperationalSeverity.TICKET,
    runbook_ref: 'RB-L7-PERSISTENCE-FAILURE',
  },
  {
    rule_id: 'alert.l7.validation_success_drop',
    metric_id: L7MetricId.VALIDATION_RUN_SUCCESS_RATE,
    condition: 'rate < 0.995 over 1h',
    severity: L7OperationalSeverity.TICKET,
    runbook_ref: 'RB-L7-VALIDATION-FAILURE',
  },
]);

export const ALL_L7_OPERATIONAL_SEVERITIES: readonly L7OperationalSeverity[] =
  Object.values(L7OperationalSeverity);
