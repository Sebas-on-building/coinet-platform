/**
 * L7.9 — Ratification Builder
 *
 * §7.9.8.3 / §7.9.9.1 INV-7.9-A,B,F — Builds the durable
 * `L7LayerRatificationArtifact` and blocks emission if any required
 * precondition fails (missing sublayer, failed sub-certification,
 * non-production-ready completion, missing handoff surfaces).
 */

import {
  L7CompletionState,
  L7RatificationViolationCode,
} from '../contracts/l7-completion-standard';
import {
  L7FreezeStatus,
} from '../contracts/l7-freeze-policy';
import {
  L7LayerRatificationArtifact,
  L7RatificationBuildInputs,
} from '../contracts/l7-ratification-artifact';
import {
  L7_REQUIRED_SUBLAYERS,
} from '../contracts/l7-final-definition';
import {
  L7_STABLE_HANDOFF_SURFACES,
} from '../contracts/l7-downstream-dependency';

/**
 * Canonical, deterministic serialization for hashing.
 */
export function canonicalizeL7Ratification(
  a: L7LayerRatificationArtifact,
): string {
  const ordered = {
    layer_id: a.layer_id,
    layer_version: a.layer_version,
    ratification_run_id: a.ratification_run_id,
    sub_layer_versions: Object.fromEntries(
      Object.entries(a.sub_layer_versions).sort(([x], [y]) =>
        x.localeCompare(y),
      ),
    ),
    certification_artifact_refs: [...a.certification_artifact_refs]
      .sort((x, y) => x.sublayer.localeCompare(y.sublayer))
      .map(r => ({
        sublayer: r.sublayer,
        version: r.version,
        certification_run_id: r.certification_run_id,
        level: r.level,
        rollout_recommended: r.rollout_recommended,
        blocking_violations: [...r.blocking_violations].sort(),
      })),
    completion_dimensions: {
      overall_state: a.completion_dimensions.overall_state,
      dimensions: [...a.completion_dimensions.dimensions]
        .sort((x, y) => x.dimension.localeCompare(y.dimension))
        .map(d => ({
          dimension: d.dimension,
          satisfied: d.satisfied,
          violations: [...d.violations].sort(),
          notes: [...d.notes].sort(),
        })),
      violations: [...a.completion_dimensions.violations].sort(),
    },
    completion_result: a.completion_result,
    freeze_status: a.freeze_status,
    extension_policy_version: a.extension_policy_version,
    stable_handoff_surfaces: [...a.stable_handoff_surfaces].sort(),
    downstream_dependency_allowed: a.downstream_dependency_allowed,
    ratified_at: a.ratified_at,
    ratified_by_rule_set: a.ratified_by_rule_set,
    blocking_violations: [...a.blocking_violations].sort(),
    final_definition_surface_hash: a.final_definition_surface_hash,
    execution_sequence_hash: a.execution_sequence_hash,
    stable_handoff_surface_hash: a.stable_handoff_surface_hash,
  };
  return JSON.stringify(ordered);
}

/** FNV-1a 32-bit. Matches the fingerprint scheme used in L7.8. */
export function l7RatificationFingerprint(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

export class Layer7RatificationBuilder {
  build(inputs: L7RatificationBuildInputs): {
    artifact: L7LayerRatificationArtifact;
    allowed: boolean;
    blocking_violations: readonly L7RatificationViolationCode[];
  } {
    const blocking: L7RatificationViolationCode[] = [];

    // §7.9.4.3 / INV-7.9-A — every required sublayer must be present and
    // certification-green.
    for (const sl of L7_REQUIRED_SUBLAYERS) {
      const present = inputs.certification_artifact_refs.find(
        r => r.sublayer === sl,
      );
      if (!present) {
        blocking.push(L7RatificationViolationCode.MISSING_SUBLAYER);
        continue;
      }
      if (present.blocking_violations.length > 0) {
        blocking.push(L7RatificationViolationCode.SUBLAYER_CERT_FAILED);
      }
      if (present.level !== 'PRODUCTION_GREEN') {
        blocking.push(L7RatificationViolationCode.CERTIFICATION_NOT_GREEN);
      }
    }

    // §7.9.9.1 INV-7.9-B — completion must be PRODUCTION_READY.
    if (inputs.completion.overall_state !== L7CompletionState.L7_PRODUCTION_READY) {
      blocking.push(...inputs.completion.violations);
    }

    // §7.9.9.1 INV-7.9-F — handoff surface completeness is required.
    if (inputs.stable_handoff_surfaces.length === 0) {
      blocking.push(L7RatificationViolationCode.MISSING_HANDOFF_SURFACE);
    } else {
      for (const required of L7_STABLE_HANDOFF_SURFACES) {
        if (!inputs.stable_handoff_surfaces.includes(required)) {
          blocking.push(L7RatificationViolationCode.MISSING_HANDOFF_SURFACE);
        }
      }
    }

    const ratified_at = new Date().toISOString();

    const fdHash = l7RatificationFingerprint(
      inputs.final_definition_surface.join('\n'),
    );
    const esHash = l7RatificationFingerprint(
      inputs.execution_sequence.join('|'),
    );
    const shHash = l7RatificationFingerprint(
      [...inputs.stable_handoff_surfaces].sort().join('|'),
    );

    const downstreamAllowed =
      blocking.length === 0 && inputs.downstream_dependency_allowed;

    const artifactWithoutHash:
      Omit<L7LayerRatificationArtifact, 'artifact_hash'> = {
      layer_id: 'L7',
      layer_version: inputs.layer_version,
      ratification_run_id: inputs.ratification_run_id,
      sub_layer_versions: inputs.sub_layer_versions,
      certification_artifact_refs: inputs.certification_artifact_refs,
      completion_dimensions: inputs.completion,
      completion_result: inputs.completion.overall_state,
      freeze_status:
        blocking.length === 0 ? inputs.freeze_status : L7FreezeStatus.OPEN,
      extension_policy_version: inputs.extension_policy_version,
      stable_handoff_surfaces: inputs.stable_handoff_surfaces,
      downstream_dependency_allowed: downstreamAllowed,
      ratified_at,
      ratified_by_rule_set: inputs.ratified_by_rule_set,
      blocking_violations: blocking,
      final_definition_surface_hash: fdHash,
      execution_sequence_hash: esHash,
      stable_handoff_surface_hash: shHash,
    };

    const hashInput = canonicalizeL7Ratification({
      ...artifactWithoutHash,
      artifact_hash: '',
    } as L7LayerRatificationArtifact);
    const artifact_hash = l7RatificationFingerprint(hashInput);

    const artifact: L7LayerRatificationArtifact = {
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

const ratificationLog: L7LayerRatificationArtifact[] = [];

export function registerL7RatificationArtifact(
  a: L7LayerRatificationArtifact,
): void {
  ratificationLog.push(a);
}

export function getLatestL7RatificationArtifact():
  L7LayerRatificationArtifact | null {
  return ratificationLog.length === 0
    ? null
    : ratificationLog[ratificationLog.length - 1];
}

export function listL7RatificationArtifacts():
  readonly L7LayerRatificationArtifact[] {
  return [...ratificationLog];
}

export function clearL7RatificationArtifacts(): void {
  ratificationLog.length = 0;
}
