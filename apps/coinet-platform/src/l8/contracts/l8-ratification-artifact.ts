/**
 * L8.9 — Ratification Artifact Contract
 *
 * §8.9.4 / §8.9.9.1 INV-8.9-G — Required shape of the durable
 * `L8LayerRatificationArtifact`. This is the single machine-readable
 * object that certifies Layer 8 is closed, frozen, and dependency-safe
 * for Layer 9+.
 */

import {
  L8CompletionEvaluation,
  L8CompletionState,
  L8RatificationViolationCode,
} from './l8-completion-standard';
import { L8FreezeStatus } from './l8-freeze-policy';
import { L8DownstreamAccessKind } from './l8-downstream-dependency';

/**
 * Reference to the certification level produced for one L8 sublayer.
 * Unlike L7.8 (which produces a single certification artifact per
 * L7 sublayer), L8 sublayers are certified by the L8.9 band runner
 * itself; these refs therefore capture the band-run outcome for each
 * sublayer.
 */
export interface L8SublayerCertRef {
  readonly sublayer: string;
  readonly version: string;
  readonly certification_run_id: string;
  readonly level: string;
  readonly rollout_recommended: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L8LayerRatificationArtifact {
  readonly layer_id: 'L8';
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L8SublayerCertRef[];
  readonly completion_dimensions: L8CompletionEvaluation;
  readonly completion_result: L8CompletionState;
  readonly freeze_status: L8FreezeStatus;
  readonly extension_policy_version: string;
  readonly stable_handoff_surfaces: readonly L8DownstreamAccessKind[];
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_at: string;
  readonly ratified_by_rule_set: string;
  readonly artifact_hash: string;
  readonly blocking_violations: readonly L8RatificationViolationCode[];
  readonly final_definition_surface_hash: string;
  readonly execution_sequence_hash: string;
  readonly stable_handoff_surface_hash: string;
}

/**
 * Inputs the builder uses to compute the artifact. All fields must be
 * populated; the builder does not invent evidence.
 */
export interface L8RatificationBuildInputs {
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L8SublayerCertRef[];
  readonly completion: L8CompletionEvaluation;
  readonly freeze_status: L8FreezeStatus;
  readonly extension_policy_version: string;
  readonly stable_handoff_surfaces: readonly L8DownstreamAccessKind[];
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_by_rule_set: string;
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}
