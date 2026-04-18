/**
 * L6.3 — Event Runtime Output Contract
 *
 * §6.3.6 — An event runtime output is the actual emitted change instance at
 * a scope and time. It must carry identity, scope, lifecycle state, state
 * timestamps, severity, confidence, dedupe identity, evidence linkage, and
 * replay identity.
 */

import { L6EventLifecycleState } from './event-lifecycle-state';
import { L6EventSeverityLevel } from './event-contract';
import { L6ConfidenceBand } from './feature-validity-state';
import { L6ScopeType } from './primitive-contract';

export interface EventOutputLineage {
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly envelope_id: string;
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly replay_hash: string;
}

export interface EventTriggerSnapshot {
  readonly trigger_id: string;
  readonly values: Record<string, number | string | boolean | null>;
  readonly observed_at: string;
}

export interface EventResolutionSnapshot {
  readonly method: string;
  readonly values: Record<string, number | string | boolean | null>;
  readonly observed_at: string;
}

export interface EventOutput {
  readonly event_instance_id: string;
  readonly event_id: string;
  readonly event_version: string;

  readonly scope_type: L6ScopeType;
  readonly scope_id: string;

  readonly state: L6EventLifecycleState;

  readonly candidate_at: string;
  readonly confirmed_at: string | null;
  readonly active_at: string | null;
  readonly peak_at: string | null;
  readonly resolved_at: string | null;
  readonly expired_at: string | null;

  readonly severity_band: L6EventSeverityLevel;
  readonly confidence_band: L6ConfidenceBand;

  readonly dedupe_key: string;
  readonly suppression_group: string | null;
  readonly late_arrival_flag: boolean;

  readonly trigger_values: EventTriggerSnapshot;
  readonly resolution_values: EventResolutionSnapshot | null;

  readonly lineage: EventOutputLineage;
}

export const REQUIRED_EVENT_OUTPUT_TOP_FIELDS: readonly (keyof EventOutput)[] = [
  'event_instance_id', 'event_id', 'event_version',
  'scope_type', 'scope_id', 'state', 'candidate_at',
  'severity_band', 'confidence_band', 'dedupe_key',
  'trigger_values', 'lineage',
];

export const REQUIRED_EVENT_OUTPUT_LINEAGE_FIELDS: readonly (keyof EventOutputLineage)[] = [
  'manifest_id', 'trace_id', 'envelope_id', 'evidence_pack_ref', 'input_snapshot_ref', 'replay_hash',
];
