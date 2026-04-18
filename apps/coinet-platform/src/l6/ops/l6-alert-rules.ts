/**
 * L6.8 — Alert Rules
 *
 * §6.8.5.4 — At minimum the following operational alerts must exist.
 */

import { L6MetricId } from './l6-metrics';

export enum L6OperationalSeverity {
  PAGE = 'PAGE',
  TICKET = 'TICKET',
  NOTIFY = 'NOTIFY',
}

export interface L6AlertRule {
  readonly rule_id: string;
  readonly metric_id: L6MetricId;
  readonly condition: string;
  readonly severity: L6OperationalSeverity;
  readonly runbook_ref: string;
}

export const L6_ALERT_RULES: readonly L6AlertRule[] = Object.freeze([
  {
    rule_id: 'alert.replay_mismatch',
    metric_id: L6MetricId.REPLAY_MISMATCH_COUNT,
    condition: 'count > 0 over 15m',
    severity: L6OperationalSeverity.PAGE,
    runbook_ref: 'RB-L6-REPLAY-MISMATCH',
  },
  {
    rule_id: 'alert.evidence_missing',
    metric_id: L6MetricId.EVIDENCE_PACK_GEN_FAILURES,
    condition: 'count > 0 where policy requires evidence',
    severity: L6OperationalSeverity.PAGE,
    runbook_ref: 'RB-L6-EVIDENCE-MISSING',
  },
  {
    rule_id: 'alert.illegal_current_overwrite',
    metric_id: L6MetricId.MATERIALIZATION_FAILURES,
    condition: 'failure_code == SILENT_OVERWRITE',
    severity: L6OperationalSeverity.PAGE,
    runbook_ref: 'RB-L6-ILLEGAL-CURRENT-OVERWRITE',
  },
  {
    rule_id: 'alert.event_storm',
    metric_id: L6MetricId.EVENT_STORM_RATE,
    condition: 'rate > 0.001 over 15m',
    severity: L6OperationalSeverity.TICKET,
    runbook_ref: 'RB-L6-EVENT-STORM',
  },
  {
    rule_id: 'alert.backlog_threshold',
    metric_id: L6MetricId.RECOMPUTE_BACKLOG_DEPTH,
    condition: 'depth > threshold over 30m',
    severity: L6OperationalSeverity.TICKET,
    runbook_ref: 'RB-L6-BACKLOG',
  },
  {
    rule_id: 'alert.shadow_authority',
    metric_id: L6MetricId.MATERIALIZATION_FAILURES,
    condition: 'failure_code == SHADOW_AUTHORITY_WRITE',
    severity: L6OperationalSeverity.PAGE,
    runbook_ref: 'RB-L6-SHADOW-AUTHORITY',
  },
  {
    rule_id: 'alert.degraded_spike',
    metric_id: L6MetricId.DEGRADED_FEATURE_RATE,
    condition: 'rate > 2x 7d baseline for any family',
    severity: L6OperationalSeverity.TICKET,
    runbook_ref: 'RB-L6-DEGRADED-SPIKE',
  },
  {
    rule_id: 'alert.contract_migration_mismatch',
    metric_id: L6MetricId.MATERIALIZATION_FAILURES,
    condition: 'failure_code == CONTRACT_MIGRATION_MISMATCH',
    severity: L6OperationalSeverity.PAGE,
    runbook_ref: 'RB-L6-MIGRATION-MISMATCH',
  },
]);
