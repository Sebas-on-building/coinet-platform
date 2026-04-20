/**
 * L9.9 — Ratification Artifact Contract
 *
 * §9.9.1.4 / §9.9.4.1 INV-9.9-G — Required shape of the durable
 * `L9LayerRatificationArtifact`. This is the single machine-readable
 * object that certifies Layer 9 is closed, frozen, and
 * dependency-safe for Layer 10+.
 */

import {
  L9CompletionEvaluation,
  L9CompletionState,
  L9RatificationViolationCode,
} from './l9-completion-standard';
import { L9FreezeStatus } from './l9-freeze-policy';
import { L9DownstreamAccessKind } from './l9-downstream-dependency';

// Re-export so callers can type against this contract without a wider
// import. (Unused import otherwise triggers noUnusedParameters.)
export { L9CompletionState };

/**
 * Reference to the certification level produced for one L9 sublayer.
 * L9 sublayers are certified by the L9.9 band runner itself; these
 * refs therefore capture the band-run outcome for each sublayer.
 */
export interface L9SublayerCertRef {
  readonly sublayer: string;
  readonly version: string;
  readonly certification_run_id: string;
  readonly level: string;
  readonly rollout_recommended: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L9LayerRatificationArtifact {
  readonly layer_id: 'L9';
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L9SublayerCertRef[];
  readonly completion_dimensions: L9CompletionEvaluation;
  readonly completion_result: L9CompletionState;
  readonly freeze_status: L9FreezeStatus;
  readonly extension_policy_version: string;
  readonly stable_handoff_surfaces: readonly L9DownstreamAccessKind[];
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_at: string;
  readonly ratified_by_rule_set: string;
  readonly artifact_hash: string;
  readonly blocking_violations: readonly L9RatificationViolationCode[];
  readonly final_definition_surface_hash: string;
  readonly execution_sequence_hash: string;
  readonly stable_handoff_surface_hash: string;
}

/**
 * Inputs the builder uses to compute the artifact. All fields must be
 * populated; the builder does not invent evidence.
 */
export interface L9RatificationBuildInputs {
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L9SublayerCertRef[];
  readonly completion: L9CompletionEvaluation;
  readonly freeze_status: L9FreezeStatus;
  readonly extension_policy_version: string;
  readonly stable_handoff_surfaces: readonly L9DownstreamAccessKind[];
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_by_rule_set: string;
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}
