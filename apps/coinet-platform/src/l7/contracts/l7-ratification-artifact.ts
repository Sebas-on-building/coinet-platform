/**
 * L7.9 — Ratification Artifact Contract
 *
 * §7.9.8.3 — Required shape of the durable `L7LayerRatificationArtifact`.
 * This is the single machine-readable object that certifies Layer 7 is
 * closed, frozen, and dependency-safe for Layer 8+.
 */

import {
  L7CompletionEvaluation,
  L7CompletionState,
  L7RatificationViolationCode,
} from './l7-completion-standard';
import { L7FreezeStatus } from './l7-freeze-policy';
import { L7DownstreamAccessKind } from './l7-downstream-dependency';

export interface L7SublayerCertRef {
  readonly sublayer: string;
  readonly version: string;
  readonly certification_run_id: string;
  readonly level: string;
  readonly rollout_recommended: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L7LayerRatificationArtifact {
  readonly layer_id: 'L7';
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L7SublayerCertRef[];
  readonly completion_dimensions: L7CompletionEvaluation;
  readonly completion_result: L7CompletionState;
  readonly freeze_status: L7FreezeStatus;
  readonly extension_policy_version: string;
  readonly stable_handoff_surfaces: readonly L7DownstreamAccessKind[];
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_at: string;
  readonly ratified_by_rule_set: string;
  readonly artifact_hash: string;
  readonly blocking_violations: readonly L7RatificationViolationCode[];
  readonly final_definition_surface_hash: string;
  readonly execution_sequence_hash: string;
  readonly stable_handoff_surface_hash: string;
}

/**
 * Inputs the builder uses to compute the artifact. All fields must be
 * populated; the builder does not invent evidence.
 */
export interface L7RatificationBuildInputs {
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L7SublayerCertRef[];
  readonly completion: L7CompletionEvaluation;
  readonly freeze_status: L7FreezeStatus;
  readonly extension_policy_version: string;
  readonly stable_handoff_surfaces: readonly L7DownstreamAccessKind[];
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_by_rule_set: string;
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}
