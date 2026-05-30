/**
 * L14.8 — Historical Fact Families and Records
 *
 * §14.8.8 / §14.8.9 / §14.8.10
 */

import { L14DeliveryChannel } from './delivery-channel';
import type { L14DurableSurfaceId } from './l14-persistence-surfaces';

export enum L14HistoricalFactFamily {
  TS_DELIVERY_EVENT_V1 = 'ts_delivery_event_v1',
  TS_USER_INTERACTION_V1 = 'ts_user_interaction_v1',
  TS_ALERT_PERFORMANCE_V1 = 'ts_alert_performance_v1',
  TS_OUTCOME_EVALUATION_V1 = 'ts_outcome_evaluation_v1',
  TS_CALIBRATION_EVIDENCE_V1 = 'ts_calibration_evidence_v1',
  TS_CALIBRATION_PROPOSAL_V1 = 'ts_calibration_proposal_v1',
  TS_CHANNEL_HEALTH_V1 = 'ts_channel_health_v1',
  TS_DELIVERY_FAILURE_V1 = 'ts_delivery_failure_v1',
}
export const ALL_L14_HISTORICAL_FAMILIES: readonly L14HistoricalFactFamily[] =
  Object.values(L14HistoricalFactFamily);

// Family → source surface(s) mapping.
export const L14_FAMILY_SOURCE_SURFACES: Readonly<Record<L14HistoricalFactFamily, readonly L14DurableSurfaceId[]>> = {
  [L14HistoricalFactFamily.TS_DELIVERY_EVENT_V1]: [
    'l14.delivery_payloads' as L14DurableSurfaceId,
    'l14.delivery_execution_records' as L14DurableSurfaceId,
    'l14.delivery_suppressions' as L14DurableSurfaceId,
  ],
  [L14HistoricalFactFamily.TS_USER_INTERACTION_V1]: ['l14.user_interaction_events' as L14DurableSurfaceId],
  [L14HistoricalFactFamily.TS_ALERT_PERFORMANCE_V1]: ['l14.alert_performance_facts' as L14DurableSurfaceId],
  [L14HistoricalFactFamily.TS_OUTCOME_EVALUATION_V1]: ['l14.outcome_evaluations' as L14DurableSurfaceId],
  [L14HistoricalFactFamily.TS_CALIBRATION_EVIDENCE_V1]: ['l14.calibration_evidence' as L14DurableSurfaceId],
  [L14HistoricalFactFamily.TS_CALIBRATION_PROPOSAL_V1]: ['l14.calibration_proposals' as L14DurableSurfaceId],
  [L14HistoricalFactFamily.TS_CHANNEL_HEALTH_V1]: ['l14.channel_health_facts' as L14DurableSurfaceId],
  [L14HistoricalFactFamily.TS_DELIVERY_FAILURE_V1]: ['l14.delivery_failures' as L14DurableSurfaceId],
};

export interface L14HistoricalFactRecord {
  readonly historical_fact_id: string;
  readonly fact_family: L14HistoricalFactFamily;
  readonly source_surface_id: L14DurableSurfaceId;
  readonly source_record_ref: string;
  readonly occurred_at: string;
  readonly observed_window_start?: string;
  readonly observed_window_end?: string;
  readonly normalized_subject_ref?: string;
  readonly normalized_channel_ref?: L14DeliveryChannel;
  readonly normalized_alert_class_ref?: string;
  readonly normalized_regime_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
