/**
 * L12.7 — Ratification Artifact (§12.7.8)
 *
 * Canonical, deterministic Layer 12 ratification artifact emitted by
 * the master certification orchestrator. The artifact carries:
 *
 *   - certification level (per §12.7.4)
 *   - sublayer / band / invariant fingerprints
 *   - frozen contract / runtime / persistence / read surfaces
 *   - rollout + L13 handoff approval flags
 *   - combined deterministic layer fingerprint
 *
 * This file does not run any certification — it only models the
 * artifact and the deterministic fingerprint over its material.
 */

import {
  L12CertificationLevel,
} from '../certification/l12-certification-level';
import { L12FrozenSurfaceRef } from './l12-freeze-policy';
import { L12SublayerId } from './l12-final-definition';

export const L12_RATIFICATION_ARTIFACT_POLICY_VERSION =
  'l12.7.ratification.v1';

/** §12.7.8 — frozen ratification artifact. */
export interface L12LayerRatificationArtifact {
  readonly ratification_artifact_id: string;

  readonly layer_id: 'L12_SCENARIO_ENGINE';
  readonly layer_version: string;

  readonly certification_level: L12CertificationLevel;

  readonly frozen_sublayers: readonly L12SublayerId[];

  readonly frozen_contract_surfaces: readonly L12FrozenSurfaceRef[];
  readonly frozen_runtime_surfaces: readonly L12FrozenSurfaceRef[];
  readonly frozen_persistence_surfaces: readonly L12FrozenSurfaceRef[];
  readonly frozen_read_surfaces: readonly L12FrozenSurfaceRef[];

  readonly scenario_family_fingerprint: string;
  readonly scenario_template_fingerprint: string;
  readonly scenario_contract_fingerprint: string;
  readonly runtime_dag_fingerprint: string;
  readonly persistence_surface_fingerprint: string;
  readonly read_surface_fingerprint: string;
  readonly invariant_fingerprint: string;

  readonly combined_layer_fingerprint: string;

  readonly critical_breach_count: number;

  readonly rollout_recommended: boolean;
  readonly l13_dependency_approved: boolean;

  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

/** §12.7.8 — material used to compute the combined layer fingerprint. */
export interface L12RatificationArtifactMaterial {
  readonly layer_id: 'L12_SCENARIO_ENGINE';
  readonly layer_version: string;
  readonly certification_level: L12CertificationLevel;

  readonly frozen_sublayers: readonly L12SublayerId[];

  readonly frozen_contract_surfaces: readonly L12FrozenSurfaceRef[];
  readonly frozen_runtime_surfaces: readonly L12FrozenSurfaceRef[];
  readonly frozen_persistence_surfaces: readonly L12FrozenSurfaceRef[];
  readonly frozen_read_surfaces: readonly L12FrozenSurfaceRef[];

  readonly scenario_family_fingerprint: string;
  readonly scenario_template_fingerprint: string;
  readonly scenario_contract_fingerprint: string;
  readonly runtime_dag_fingerprint: string;
  readonly persistence_surface_fingerprint: string;
  readonly read_surface_fingerprint: string;
  readonly invariant_fingerprint: string;

  readonly critical_breach_count: number;
  readonly rollout_recommended: boolean;
  readonly l13_dependency_approved: boolean;

  readonly policy_version: string;
}

function fnv1a32(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function fnv1a64(s: string): string {
  let h = 0xcbf29ce484222325n;
  const PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * PRIME) & MASK;
  }
  return h.toString(16).padStart(16, '0');
}

/** Deterministic FNV-1a 32+64 fingerprint over a string. */
export function fingerprintL12String(s: string): string {
  return `l12.fp.${fnv1a32(s)}.${fnv1a64(s)}`;
}

function sortedSurfaceList(
  surfaces: readonly L12FrozenSurfaceRef[],
): readonly { kind: string; ref: string }[] {
  return [...surfaces]
    .map(s => ({ kind: s.surface_kind, ref: s.ref }))
    .sort((a, b) =>
      (a.kind + a.ref).localeCompare(b.kind + b.ref));
}

/**
 * §12.7.8 — combined layer fingerprint over the ratification material.
 * Order of frozen surfaces is normalized so order-only changes do not
 * alter the fingerprint.
 */
export function computeL12CombinedLayerFingerprint(
  m: L12RatificationArtifactMaterial,
): string {
  const material = JSON.stringify({
    layer: m.layer_id,
    version: m.layer_version,
    cert: m.certification_level,
    sublayers: [...m.frozen_sublayers].sort(),
    contracts: sortedSurfaceList(m.frozen_contract_surfaces),
    runtime: sortedSurfaceList(m.frozen_runtime_surfaces),
    persistence: sortedSurfaceList(m.frozen_persistence_surfaces),
    read: sortedSurfaceList(m.frozen_read_surfaces),
    sf: m.scenario_family_fingerprint,
    st: m.scenario_template_fingerprint,
    sc: m.scenario_contract_fingerprint,
    rd: m.runtime_dag_fingerprint,
    ps: m.persistence_surface_fingerprint,
    rs: m.read_surface_fingerprint,
    inv: m.invariant_fingerprint,
    breaches: m.critical_breach_count,
    rollout: m.rollout_recommended,
    l13: m.l13_dependency_approved,
    pv: m.policy_version,
  });
  return fingerprintL12String(material);
}

/**
 * §12.7.8 — replay hash anchor for the artifact (separate from the
 * combined layer fingerprint, used by lineage / replay subsystems).
 */
export function computeL12RatificationReplayHash(
  m: L12RatificationArtifactMaterial,
  created_at: string,
  ratification_artifact_id: string,
): string {
  const seed = JSON.stringify({
    fingerprint: computeL12CombinedLayerFingerprint(m),
    created_at,
    ratification_artifact_id,
  });
  return `l12.replay.${fnv1a32(seed)}.${fnv1a64(seed)}`;
}

/** Quick structural completeness check for a ratification artifact. */
export function isL12RatificationArtifactStructurallyComplete(
  art: L12LayerRatificationArtifact,
): { ok: boolean; reason: string } {
  if (!art) return { ok: false, reason: 'artifact null' };
  if (art.layer_id !== 'L12_SCENARIO_ENGINE') {
    return { ok: false, reason: 'layer_id must be L12_SCENARIO_ENGINE' };
  }
  if (!art.ratification_artifact_id) {
    return { ok: false, reason: 'ratification_artifact_id missing' };
  }
  if (!art.layer_version) {
    return { ok: false, reason: 'layer_version missing' };
  }
  if (!art.certification_level) {
    return { ok: false, reason: 'certification_level missing' };
  }
  if (!Array.isArray(art.frozen_sublayers) ||
      art.frozen_sublayers.length === 0) {
    return { ok: false, reason: 'frozen_sublayers must be non-empty' };
  }
  for (const fp of [
    art.scenario_family_fingerprint,
    art.scenario_template_fingerprint,
    art.scenario_contract_fingerprint,
    art.runtime_dag_fingerprint,
    art.persistence_surface_fingerprint,
    art.read_surface_fingerprint,
    art.invariant_fingerprint,
    art.combined_layer_fingerprint,
  ]) {
    if (!fp) return { ok: false, reason: 'fingerprint missing' };
  }
  if (!art.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  if (!art.created_at) return { ok: false, reason: 'created_at missing' };
  if (!art.policy_version) return { ok: false, reason: 'policy_version missing' };
  return { ok: true, reason: 'ok' };
}
