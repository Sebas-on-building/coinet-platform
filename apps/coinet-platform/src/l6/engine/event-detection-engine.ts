/**
 * L6.4 — EventDetectionEngine
 *
 * §6.4.7.3 — Converts change signals into event CANDIDATES. The engine
 * never finalizes lifecycle state; that is reserved for EventStateResolver.
 */

import { EventDefinitionContract } from '../contracts/event-definition.contract';
import { EventOutput, EventTriggerSnapshot, EventOutputLineage } from '../contracts/event-output.contract';
import { L6EventLifecycleState } from '../contracts/event-lifecycle-state';
import { L6EventSeverityLevel } from '../contracts/event-contract';
import { L6ConfidenceBand } from '../contracts/feature-validity-state';
import { L6ScopeRef } from '../runtime/dag-node';
import { L6ChangeSignal, L6ChangeSignalKind } from './change-detection-engine';
import { computeReplayHash } from '../validation/replay-hash';
import { createHash } from 'crypto';

export interface L6EventCandidateRequest {
  readonly definition: EventDefinitionContract;
  readonly scope: L6ScopeRef;
  readonly signal: L6ChangeSignal;
  readonly trigger_values: Record<string, number | string | boolean | null>;
  readonly confidence_band: L6ConfidenceBand;
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly envelope_id: string;
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly late_arrival_flag: boolean;
  readonly suppression_group: string | null;
}

export class EventDetectionEngine {
  /**
   * Returns a candidate EventOutput when the signal is a non-NO_CHANGE
   * signal. Otherwise returns null; there is no such thing as an empty event.
   */
  toCandidate(req: L6EventCandidateRequest): EventOutput | null {
    if (req.signal.kind === L6ChangeSignalKind.NO_CHANGE) return null;

    const candidate_at = req.signal.observed_at;

    const dedupeMaterial = [
      req.definition.primitive_id,
      req.definition.version,
      req.scope.scope_type,
      req.scope.scope_id,
      req.signal.kind,
      req.signal.direction,
    ].join('|');
    const dedupe_key = 'dk_' + createHash('sha256').update(dedupeMaterial).digest('hex').slice(0, 24);

    const trigger: EventTriggerSnapshot = {
      trigger_id: req.signal.signal_id,
      values: req.trigger_values,
      observed_at: candidate_at,
    };

    const replay_hash = computeReplayHash({
      primitive_id: req.definition.primitive_id,
      primitive_version: req.definition.version,
      scope_type: req.scope.scope_type,
      scope_id: req.scope.scope_id,
      temporal_anchor: candidate_at,
      material_inputs: {
        signal: req.signal,
        trigger_values: req.trigger_values,
        dedupe_key,
      },
    });

    const lineage: EventOutputLineage = {
      manifest_id: req.manifest_id,
      trace_id: req.trace_id,
      envelope_id: req.envelope_id,
      evidence_pack_ref: req.evidence_pack_ref,
      input_snapshot_ref: req.input_snapshot_ref,
      replay_hash,
    };

    const instance_id = 'evi_' + createHash('sha256')
      .update(`${dedupe_key}|${candidate_at}|${req.signal.signal_id}`)
      .digest('hex').slice(0, 24);

    const candidate: EventOutput = {
      event_instance_id: instance_id,
      event_id: req.definition.primitive_id,
      event_version: req.definition.version,
      scope_type: req.scope.scope_type,
      scope_id: req.scope.scope_id,
      state: L6EventLifecycleState.CANDIDATE,
      candidate_at,
      confirmed_at: null,
      active_at: null,
      peak_at: null,
      resolved_at: null,
      expired_at: null,
      severity_band: deriveSeverity(req.signal),
      confidence_band: req.confidence_band,
      dedupe_key,
      suppression_group: req.suppression_group,
      late_arrival_flag: req.late_arrival_flag,
      trigger_values: trigger,
      resolution_values: null,
      lineage,
    };
    return candidate;
  }
}

function deriveSeverity(signal: L6ChangeSignal): L6EventSeverityLevel {
  const m = signal.magnitude;
  if (m >= 5) return L6EventSeverityLevel.CRITICAL;
  if (m >= 3) return L6EventSeverityLevel.HIGH;
  if (m >= 1.5) return L6EventSeverityLevel.MEDIUM;
  if (m > 0) return L6EventSeverityLevel.LOW;
  return L6EventSeverityLevel.INFO;
}
