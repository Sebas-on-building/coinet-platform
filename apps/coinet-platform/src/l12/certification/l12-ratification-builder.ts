/**
 * L12.7 — Ratification Artifact Builder (§12.7.8)
 *
 * Pure builder: given fingerprints + frozen surface refs + flags,
 * deterministically produces the canonical
 * `L12LayerRatificationArtifact`.
 *
 * §12.7.0 Closure law: the builder does NOT re-run any suite or
 * recompute any sublayer-owned content. It only seals the certified
 * state into a fingerprinted artifact.
 */

import {
  L12LayerRatificationArtifact,
  L12RatificationArtifactMaterial,
  L12_RATIFICATION_ARTIFACT_POLICY_VERSION,
  computeL12CombinedLayerFingerprint,
  computeL12RatificationReplayHash,
  fingerprintL12String,
} from '../contracts/l12-ratification-artifact';
import {
  L12FrozenSurfaceRef,
  partitionL12FrozenSurfacesByKind,
} from '../contracts/l12-freeze-policy';
import { L12SublayerId } from '../contracts/l12-final-definition';
import { L12CertificationLevel } from './l12-certification-level';

export interface L12RatificationBuilderInput {
  readonly ratification_artifact_id: string;
  readonly layer_version: string;
  readonly certification_level: L12CertificationLevel;

  readonly frozen_sublayers: readonly L12SublayerId[];
  readonly frozen_surfaces: readonly L12FrozenSurfaceRef[];

  /** Per-domain content fingerprints. */
  readonly scenario_family_material: string;
  readonly scenario_template_material: string;
  readonly scenario_contract_material: string;
  readonly runtime_dag_material: string;
  readonly persistence_surface_material: string;
  readonly read_surface_material: string;
  readonly invariant_material: string;

  readonly critical_breach_count: number;
  readonly rollout_recommended: boolean;
  readonly l13_dependency_approved: boolean;

  readonly created_at: string;
}

/** Build the canonical L12 ratification artifact. */
export function buildL12RatificationArtifact(
  input: L12RatificationBuilderInput,
): L12LayerRatificationArtifact {
  const surfaces = partitionL12FrozenSurfacesByKind(input.frozen_surfaces);

  const scenario_family_fingerprint =
    fingerprintL12String(input.scenario_family_material);
  const scenario_template_fingerprint =
    fingerprintL12String(input.scenario_template_material);
  const scenario_contract_fingerprint =
    fingerprintL12String(input.scenario_contract_material);
  const runtime_dag_fingerprint =
    fingerprintL12String(input.runtime_dag_material);
  const persistence_surface_fingerprint =
    fingerprintL12String(input.persistence_surface_material);
  const read_surface_fingerprint =
    fingerprintL12String(input.read_surface_material);
  const invariant_fingerprint =
    fingerprintL12String(input.invariant_material);

  const material: L12RatificationArtifactMaterial = {
    layer_id: 'L12_SCENARIO_ENGINE',
    layer_version: input.layer_version,
    certification_level: input.certification_level,

    frozen_sublayers: input.frozen_sublayers,

    frozen_contract_surfaces: surfaces.contract_surfaces,
    frozen_runtime_surfaces: surfaces.runtime_surfaces,
    frozen_persistence_surfaces: surfaces.persistence_surfaces,
    frozen_read_surfaces: surfaces.read_surfaces,

    scenario_family_fingerprint,
    scenario_template_fingerprint,
    scenario_contract_fingerprint,
    runtime_dag_fingerprint,
    persistence_surface_fingerprint,
    read_surface_fingerprint,
    invariant_fingerprint,

    critical_breach_count: input.critical_breach_count,
    rollout_recommended: input.rollout_recommended,
    l13_dependency_approved: input.l13_dependency_approved,

    policy_version: L12_RATIFICATION_ARTIFACT_POLICY_VERSION,
  };

  const combined_layer_fingerprint =
    computeL12CombinedLayerFingerprint(material);
  const replay_hash = computeL12RatificationReplayHash(
    material, input.created_at, input.ratification_artifact_id);

  return {
    ratification_artifact_id: input.ratification_artifact_id,

    layer_id: 'L12_SCENARIO_ENGINE',
    layer_version: input.layer_version,

    certification_level: input.certification_level,

    frozen_sublayers: input.frozen_sublayers,

    frozen_contract_surfaces: surfaces.contract_surfaces,
    frozen_runtime_surfaces: surfaces.runtime_surfaces,
    frozen_persistence_surfaces: surfaces.persistence_surfaces,
    frozen_read_surfaces: surfaces.read_surfaces,

    scenario_family_fingerprint,
    scenario_template_fingerprint,
    scenario_contract_fingerprint,
    runtime_dag_fingerprint,
    persistence_surface_fingerprint,
    read_surface_fingerprint,
    invariant_fingerprint,

    combined_layer_fingerprint,

    critical_breach_count: input.critical_breach_count,

    rollout_recommended: input.rollout_recommended,
    l13_dependency_approved: input.l13_dependency_approved,

    created_at: input.created_at,
    policy_version: L12_RATIFICATION_ARTIFACT_POLICY_VERSION,
    replay_hash,
  };
}

export function l12ArtifactIsProductionGreen(
  art: L12LayerRatificationArtifact,
): boolean {
  return (
    art.certification_level === L12CertificationLevel.PRODUCTION_GREEN ||
    art.certification_level === L12CertificationLevel.FROZEN_LIVE
  ) && art.critical_breach_count === 0;
}
