/**
 * L6.9 — Ratification Artifact Contract
 *
 * §6.9.4.2 — Required shape of the durable `L6LayerRatificationArtifact`.
 */

import { L6CompletionEvaluation, L6CompletionState, L6RatificationViolationCode } from './l6-completion-standard';
import { L6FreezeStatus } from './l6-freeze-policy';

export interface L6SublayerCertRef {
  readonly sublayer: string;
  readonly version: string;
  readonly certification_run_id: string;
  readonly level: string;
  readonly rollout_recommended: boolean;
  readonly blocking_violations: readonly string[];
}

export interface L6LayerRatificationArtifact {
  readonly layer_id: 'L6';
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L6SublayerCertRef[];
  readonly completion_dimensions: L6CompletionEvaluation;
  readonly completion_result: L6CompletionState;
  readonly freeze_status: L6FreezeStatus;
  readonly extension_policy_version: string;
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_at: string;
  readonly ratified_by_rule_set: string;
  readonly artifact_hash: string;
  readonly blocking_violations: readonly L6RatificationViolationCode[];
  readonly final_definition_surface_hash: string;
  readonly execution_sequence_hash: string;
}

/**
 * Inputs the builder uses to compute the artifact. All fields must be
 * populated; the builder does not invent evidence.
 */
export interface L6RatificationBuildInputs {
  readonly layer_version: string;
  readonly ratification_run_id: string;
  readonly sub_layer_versions: Readonly<Record<string, string>>;
  readonly certification_artifact_refs: readonly L6SublayerCertRef[];
  readonly completion: L6CompletionEvaluation;
  readonly freeze_status: L6FreezeStatus;
  readonly extension_policy_version: string;
  readonly downstream_dependency_allowed: boolean;
  readonly ratified_by_rule_set: string;
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}
