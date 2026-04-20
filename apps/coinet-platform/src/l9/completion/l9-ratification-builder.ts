/**
 * L9.9 — Ratification Builder
 *
 * §9.9.4 / §9.9.4.1 INV-9.9-A,B,G — Builds the durable
 * `L9LayerRatificationArtifact` and blocks emission if any required
 * precondition fails (missing sublayer, failed sub-certification,
 * non-production-ready completion, missing handoff surfaces).
 *
 * Fingerprint and canonicalization follow the same FNV-1a 32-bit
 * scheme used by L6/L7/L8 so audit tooling can diff artifacts
 * uniformly.
 */

import {
  L9CompletionState,
  L9RatificationViolationCode,
} from '../contracts/l9-completion-standard';
import { L9FreezeStatus } from '../contracts/l9-freeze-policy';
import {
  L9LayerRatificationArtifact,
  L9RatificationBuildInputs,
} from '../contracts/l9-ratification-artifact';
import {
  L9_REQUIRED_SUBLAYERS,
} from '../contracts/l9-final-definition';
import {
  L9_STABLE_HANDOFF_SURFACES,
} from '../contracts/l9-downstream-dependency';

/**
 * Canonical deterministic serialization used for hashing.
 */
export function canonicalizeL9Ratification(
  a: L9LayerRatificationArtifact,
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

/** FNV-1a 32-bit, identical to L6/L7/L8 fingerprint shape. */
export function l9RatificationFingerprint(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

export class Layer9RatificationBuilder {
  build(inputs: L9RatificationBuildInputs): {
    artifact: L9LayerRatificationArtifact;
    allowed: boolean;
    blocking_violations: readonly L9RatificationViolationCode[];
  } {
    const blocking: L9RatificationViolationCode[] = [];

    // §9.9.4 / INV-9.9-A — every required sublayer must be present,
    // certification-green and carry no blocking violations.
    for (const sl of L9_REQUIRED_SUBLAYERS) {
      const present = inputs.certification_artifact_refs.find(
        r => r.sublayer === sl,
      );
      if (!present) {
        blocking.push(L9RatificationViolationCode.MISSING_SUBLAYER);
        continue;
      }
      if (present.blocking_violations.length > 0) {
        blocking.push(L9RatificationViolationCode.SUBLAYER_CERT_FAILED);
      }
      if (present.level !== 'PRODUCTION_GREEN') {
        blocking.push(L9RatificationViolationCode.CERTIFICATION_NOT_GREEN);
      }
    }

    // §9.9.4.1 INV-9.9-A — completion must be L9_PRODUCTION_READY.
    if (inputs.completion.overall_state !==
        L9CompletionState.L9_PRODUCTION_READY) {
      blocking.push(...inputs.completion.violations);
    }

    // §9.9.4.1 INV-9.9-C — handoff surface completeness is required
    // before any downstream dependency can be allowed.
    if (inputs.stable_handoff_surfaces.length === 0) {
      blocking.push(L9RatificationViolationCode.MISSING_HANDOFF_SURFACE);
    } else {
      for (const required of L9_STABLE_HANDOFF_SURFACES) {
        if (!inputs.stable_handoff_surfaces.includes(required)) {
          blocking.push(L9RatificationViolationCode.MISSING_HANDOFF_SURFACE);
        }
      }
    }

    const ratified_at = new Date().toISOString();

    const fdHash = l9RatificationFingerprint(
      inputs.final_definition_surface.join('\n'),
    );
    const esHash = l9RatificationFingerprint(
      inputs.execution_sequence.join('|'),
    );
    const shHash = l9RatificationFingerprint(
      [...inputs.stable_handoff_surfaces].sort().join('|'),
    );

    const downstreamAllowed =
      blocking.length === 0 && inputs.downstream_dependency_allowed;

    const artifactWithoutHash:
      Omit<L9LayerRatificationArtifact, 'artifact_hash'> = {
      layer_id: 'L9',
      layer_version: inputs.layer_version,
      ratification_run_id: inputs.ratification_run_id,
      sub_layer_versions: inputs.sub_layer_versions,
      certification_artifact_refs: inputs.certification_artifact_refs,
      completion_dimensions: inputs.completion,
      completion_result: inputs.completion.overall_state,
      freeze_status:
        blocking.length === 0 ? inputs.freeze_status : L9FreezeStatus.OPEN,
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

    const hashInput = canonicalizeL9Ratification({
      ...artifactWithoutHash,
      artifact_hash: '',
    } as L9LayerRatificationArtifact);
    const artifact_hash = l9RatificationFingerprint(hashInput);

    const artifact: L9LayerRatificationArtifact = {
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

const ratificationLog: L9LayerRatificationArtifact[] = [];

export function registerL9RatificationArtifact(
  a: L9LayerRatificationArtifact,
): void {
  ratificationLog.push(a);
}

export function getLatestL9RatificationArtifact():
  L9LayerRatificationArtifact | null {
  return ratificationLog.length === 0
    ? null
    : ratificationLog[ratificationLog.length - 1];
}

export function listL9RatificationArtifacts():
  readonly L9LayerRatificationArtifact[] {
  return [...ratificationLog];
}

export function clearL9RatificationArtifacts(): void {
  ratificationLog.length = 0;
}
