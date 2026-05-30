/**
 * L13.12 — Completion Standard Contract
 *
 * §13.12.4 — Authoritative definition of "Layer 13 is complete".
 */

import type {
  L13CertificationBand,
  L13FinalInvariantId,
  L13SublayerId,
} from './l13-final-definition';

export interface L13CompletionStandard {
  readonly completion_standard_id: string;
  readonly required_sublayers_green: readonly L13SublayerId[];
  readonly required_bands_green: readonly L13CertificationBand[];
  readonly required_final_invariants_green:
    readonly L13FinalInvariantId[];
  readonly zero_critical_violation_tolerance: true;
  readonly zero_rollout_blocking_regression_tolerance: true;
  readonly l14_handoff_required: true;
  readonly ratification_artifact_required: true;
  readonly freeze_activation_required: true;
  readonly policy_version: string;
  readonly replay_hash: string;
}
