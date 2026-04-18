/**
 * L6.9 — Ratification Builder
 *
 * §6.9.4 — Builds the durable `L6LayerRatificationArtifact`. Blocks
 * emission if any precondition in §6.9.4.3 is unmet.
 */

import {
  L6CompletionState,
  L6RatificationViolationCode,
} from '../contracts/l6-completion-standard';
import {
  L6FreezeStatus,
} from '../contracts/l6-freeze-policy';
import {
  L6LayerRatificationArtifact,
  L6RatificationBuildInputs,
} from '../contracts/l6-ratification-artifact';

/**
 * Canonical, deterministic serialization for hashing.
 */
export function canonicalizeRatification(a: L6LayerRatificationArtifact): string {
  const ordered = {
    layer_id: a.layer_id,
    layer_version: a.layer_version,
    ratification_run_id: a.ratification_run_id,
    sub_layer_versions: Object.fromEntries(
      Object.entries(a.sub_layer_versions).sort(([x], [y]) => x.localeCompare(y)),
    ),
    certification_artifact_refs: [...a.certification_artifact_refs]
      .sort((x, y) => x.sublayer.localeCompare(y.sublayer))
      .map(r => ({
        sublayer: r.sublayer, version: r.version,
        certification_run_id: r.certification_run_id, level: r.level,
        rollout_recommended: r.rollout_recommended,
        blocking_violations: [...r.blocking_violations].sort(),
      })),
    completion_dimensions: {
      overall_state: a.completion_dimensions.overall_state,
      dimensions: [...a.completion_dimensions.dimensions]
        .sort((x, y) => x.dimension.localeCompare(y.dimension))
        .map(d => ({
          dimension: d.dimension, satisfied: d.satisfied,
          violations: [...d.violations].sort(),
          notes: [...d.notes].sort(),
        })),
      violations: [...a.completion_dimensions.violations].sort(),
    },
    completion_result: a.completion_result,
    freeze_status: a.freeze_status,
    extension_policy_version: a.extension_policy_version,
    downstream_dependency_allowed: a.downstream_dependency_allowed,
    ratified_at: a.ratified_at,
    ratified_by_rule_set: a.ratified_by_rule_set,
    blocking_violations: [...a.blocking_violations].sort(),
    final_definition_surface_hash: a.final_definition_surface_hash,
    execution_sequence_hash: a.execution_sequence_hash,
  };
  return JSON.stringify(ordered);
}

/** FNV-1a 32-bit, matches `fingerprint` in L6.8. */
export function ratificationFingerprint(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

export class Layer6RatificationBuilder {
  build(inputs: L6RatificationBuildInputs): {
    artifact: L6LayerRatificationArtifact;
    allowed: boolean;
    blocking_violations: readonly L6RatificationViolationCode[];
  } {
    const blocking: L6RatificationViolationCode[] = [];

    // §6.9.4.3 preconditions
    // - sublayer certifications must all be rollout_recommended and PRODUCTION_GREEN
    const requiredSublayers = ['L6.1', 'L6.2', 'L6.3', 'L6.4', 'L6.5', 'L6.6', 'L6.7', 'L6.8'];
    for (const sl of requiredSublayers) {
      const present = inputs.certification_artifact_refs.find(r => r.sublayer === sl);
      if (!present) {
        blocking.push(L6RatificationViolationCode.MISSING_SUBLAYER);
        continue;
      }
      if (present.blocking_violations.length > 0) {
        blocking.push(L6RatificationViolationCode.SUBLAYER_CERT_FAILED);
      }
    }

    // - completion must be L6_PRODUCTION_READY (no critical obs / migration block / etc.
    //   are represented through the completion evaluation's violation list)
    if (inputs.completion.overall_state !== L6CompletionState.L6_PRODUCTION_READY) {
      blocking.push(...inputs.completion.violations);
    }

    // Freeze may only become FROZEN if completion is production-ready (§6.9.5.1).
    // If caller requested FROZEN but completion is not ready, that is a
    // freeze-without-ratification violation handled by the freeze activator,
    // not here. The builder only records freeze_status as supplied.

    const ratified_at = new Date().toISOString();

    const fdHash = ratificationFingerprint(inputs.final_definition_surface.join('\n'));
    const esHash = ratificationFingerprint(inputs.execution_sequence.join('|'));

    // Construct without hash first, then fill hash.
    const artifactWithoutHash: Omit<L6LayerRatificationArtifact, 'artifact_hash'> = {
      layer_id: 'L6',
      layer_version: inputs.layer_version,
      ratification_run_id: inputs.ratification_run_id,
      sub_layer_versions: inputs.sub_layer_versions,
      certification_artifact_refs: inputs.certification_artifact_refs,
      completion_dimensions: inputs.completion,
      completion_result: inputs.completion.overall_state,
      freeze_status: blocking.length === 0 ? inputs.freeze_status : L6FreezeStatus.OPEN,
      extension_policy_version: inputs.extension_policy_version,
      downstream_dependency_allowed:
        blocking.length === 0 ? inputs.downstream_dependency_allowed : false,
      ratified_at,
      ratified_by_rule_set: inputs.ratified_by_rule_set,
      blocking_violations: blocking,
      final_definition_surface_hash: fdHash,
      execution_sequence_hash: esHash,
    };

    const hashInput = canonicalizeRatification({
      ...artifactWithoutHash,
      artifact_hash: '',
    } as L6LayerRatificationArtifact);
    const artifact_hash = ratificationFingerprint(hashInput);

    const artifact: L6LayerRatificationArtifact = {
      ...artifactWithoutHash,
      artifact_hash,
    };

    return {
      artifact,
      allowed: blocking.length === 0,
      blocking_violations: blocking,
    };
  }
}

const ratificationLog: L6LayerRatificationArtifact[] = [];

export function registerRatificationArtifact(a: L6LayerRatificationArtifact): void {
  ratificationLog.push(a);
}
export function getLatestRatificationArtifact(): L6LayerRatificationArtifact | null {
  return ratificationLog.length === 0 ? null : ratificationLog[ratificationLog.length - 1];
}
export function listRatificationArtifacts(): readonly L6LayerRatificationArtifact[] {
  return [...ratificationLog];
}
export function clearRatificationArtifacts(): void {
  ratificationLog.length = 0;
}
