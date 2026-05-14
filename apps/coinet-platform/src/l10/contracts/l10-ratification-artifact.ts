/**
 * L10.9 — Ratification Artifact Contract
 *
 * §10.9.8 / §10.9.13 INV-10.9-G — Required shape of the durable
 * `L10LayerRatificationArtifact`. This is the single machine-readable
 * object that certifies Layer 10 is closed, frozen, and
 * dependency-safe for Layer 11+.
 */

import {
  L10CompletionEvaluation,
  L10CompletionState,
  L10RatificationViolationCode,
} from './l10-completion-standard';
import { L10FreezeStatus } from './l10-freeze-policy';
import { L10DownstreamAccessKind } from './l10-downstream-dependency';

// Re-export so callers can type against this contract without a
// wider import. (Unused import otherwise triggers
// noUnusedParameters.)
export { L10CompletionState };

/**
 * Reference to the certification level produced for one L10
 * sublayer. L10 sublayers are certified by the L10.9 band runner
 * itself; these refs therefore capture the band-run outcome for each
 * sublayer.
 */
export interface L10SublayerCertRef {
  readonly sublayer: string;
  readonly version: string;
  readonly certification_run_id: string;
  readonly level: string;
  readonly rollout_recommended: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L10LayerRatificationArtifact {
  readonly layer_id: 'L10';
  readonly layer_name: 'Hypothesis Engine';
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L10SublayerCertRef[];
  readonly completion_dimensions: L10CompletionEvaluation;
  readonly completion_result: L10CompletionState;
  readonly freeze_status: L10FreezeStatus;
  readonly extension_policy_version: string;
  readonly stable_handoff_surfaces: readonly L10DownstreamAccessKind[];
  readonly downstream_dependency_allowed: boolean;
  readonly rollout_recommended: boolean;
  readonly ratified_at: string;
  readonly ratified_by_rule_set: string;
  readonly artifact_hash: string;
  readonly blocking_violations: readonly L10RatificationViolationCode[];
  readonly final_definition_surface_hash: string;
  readonly execution_sequence_hash: string;
  readonly stable_handoff_surface_hash: string;
}

/**
 * Inputs the builder uses to compute the artifact. All fields must
 * be populated; the builder does not invent evidence.
 */
export interface L10RatificationBuildInputs {
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L10SublayerCertRef[];
  readonly completion: L10CompletionEvaluation;
  readonly freeze_status: L10FreezeStatus;
  readonly extension_policy_version: string;
  readonly stable_handoff_surfaces: readonly L10DownstreamAccessKind[];
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_by_rule_set: string;
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}
