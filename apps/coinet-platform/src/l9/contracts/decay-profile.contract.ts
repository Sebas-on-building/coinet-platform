/**
 * L9.3 — DecayProfile Contract
 *
 * §9.3.6.2 — Decay must remain explicit: every emitted decay posture
 * must carry class, score, decaying/surviving refs, reason codes, and
 * lineage. It may not be hidden inside confidence alone (§9.2.4.8 law).
 */

import type {
  L9DecayClass,
  L9DecayReasonCode,
} from './decay-profile';

export interface L9DecayProfileContract {
  // Identity
  readonly decay_profile_id: string;
  readonly sequence_subject_id: string;

  // Contract versioning
  readonly decay_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Decay shape (§9.3.6.2)
  readonly decay_score: number; // 0..1 — higher = more decayed
  readonly decay_class: L9DecayClass;
  readonly decaying_signal_refs: readonly string[];
  readonly surviving_signal_refs: readonly string[];
  readonly decay_reason_codes: readonly L9DecayReasonCode[];
  readonly time_burden_ms: number;

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L9_DECAY_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'decay_profile_id', 'sequence_subject_id',
  'decay_contract_version', 'schema_version', 'policy_version',
  'decay_score', 'decay_class',
  'decaying_signal_refs', 'surviving_signal_refs',
  'decay_reason_codes', 'time_burden_ms',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];
