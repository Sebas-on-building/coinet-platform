/**
 * L9.3 — PhaseState Contract
 *
 * §9.3.6.1 — Phase posture must be first-class in emission, not an
 * accessory. A phase is illegal if its class, progression score,
 * support/challenge refs, or lineage are missing.
 */

import type {
  L9PhaseClass,
  L9PhaseProgressionClass,
} from './phase-state';

export interface L9PhaseStateContract {
  // Identity
  readonly phase_state_id: string;
  readonly sequence_subject_id: string;

  // Contract versioning
  readonly phase_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Phase shape (§9.3.6.1)
  readonly phase_class: L9PhaseClass;
  readonly phase_progression_score: number; // 0..1
  readonly phase_progression_class: L9PhaseProgressionClass;

  // Evidence (§9.3.6.1)
  readonly phase_support_refs: readonly string[];
  readonly phase_challenge_refs: readonly string[];

  // Temporal bounds
  readonly phase_started_at: string;
  readonly phase_last_confirmed_at: string;

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L9_PHASE_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'phase_state_id', 'sequence_subject_id',
  'phase_contract_version', 'schema_version', 'policy_version',
  'phase_class', 'phase_progression_score', 'phase_progression_class',
  'phase_support_refs',
  'phase_started_at',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];
