/**
 * L13.12 — Layer 13 Ratification Artifact Contract
 *
 * §13.12.11 — The single artifact that proves Layer 13 is
 * complete, certified, rollout-approved, frozen, and handed off
 * to Layer 14.
 */

import type {
  L13CertificationLevel,
  L13SublayerId,
} from './l13-final-definition';

export interface L13LayerRatificationArtifact {
  readonly ratification_artifact_id: string;
  readonly layer_id: 'L13';
  readonly layer_name: 'AI Judgment & Explanation Layer';
  readonly certification_report_ref: string;
  readonly certification_level: L13CertificationLevel;
  readonly all_sublayers_green: boolean;
  readonly all_bands_green: boolean;
  readonly all_final_invariants_green: boolean;
  readonly rollout_approved: boolean;
  readonly freeze_activated: boolean;
  readonly l14_handoff_approved: boolean;
  readonly canonical_sublayer_fingerprints: Readonly<
    Record<L13SublayerId, string>
  >;
  readonly combined_layer_fingerprint: string;
  readonly active_policy_versions: readonly string[];
  readonly ratified_at: string;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
