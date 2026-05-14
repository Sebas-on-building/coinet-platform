/**
 * L10.9 — Ratification Builder
 *
 * §10.9.8 / §10.9.13 INV-10.9-A,B,G — Builds the durable
 * `L10LayerRatificationArtifact` and blocks emission if any required
 * precondition fails (missing sublayer, failed sub-certification,
 * non-production-ready completion, missing handoff surfaces).
 *
 * Fingerprint and canonicalization follow the same FNV-1a 32-bit
 * scheme used by L6/L7/L8/L9 so audit tooling can diff artifacts
 * uniformly.
 */

import {
  L10CompletionState,
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';
import { L10FreezeStatus } from '../contracts/l10-freeze-policy';
import {
  L10LayerRatificationArtifact,
  L10RatificationBuildInputs,
} from '../contracts/l10-ratification-artifact';
import {
  L10_REQUIRED_SUBLAYERS,
} from '../contracts/l10-final-definition';
import {
  L10_STABLE_HANDOFF_SURFACES,
} from '../contracts/l10-downstream-dependency';

/**
 * Canonical deterministic serialization used for hashing.
 */
export function canonicalizeL10Ratification(
  a: L10LayerRatificationArtifact,
): string {
  const ordered = {
    layer_id: a.layer_id,
    layer_name: a.layer_name,
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
    rollout_recommended: a.rollout_recommended,
    ratified_at: a.ratified_at,
    ratified_by_rule_set: a.ratified_by_rule_set,
    blocking_violations: [...a.blocking_violations].sort(),
    final_definition_surface_hash: a.final_definition_surface_hash,
    execution_sequence_hash: a.execution_sequence_hash,
    stable_handoff_surface_hash: a.stable_handoff_surface_hash,
  };
  return JSON.stringify(ordered);
}

/** FNV-1a 32-bit, identical to L6/L7/L8/L9 fingerprint shape. */
export function l10RatificationFingerprint(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

export class Layer10RatificationBuilder {
  build(inputs: L10RatificationBuildInputs): {
    artifact: L10LayerRatificationArtifact;
    allowed: boolean;
    blocking_violations: readonly L10RatificationViolationCode[];
  } {
    const blocking: L10RatificationViolationCode[] = [];

    // §10.9.8 / INV-10.9-A — every required sublayer must be
    // present, certification-green and carry no blocking
    // violations.
    for (const sl of L10_REQUIRED_SUBLAYERS) {
      const present = inputs.certification_artifact_refs.find(
        r => r.sublayer === sl,
      );
      if (!present) {
        blocking.push(L10RatificationViolationCode.MISSING_SUBLAYER);
        continue;
      }
      if (present.blocking_violations.length > 0) {
        blocking.push(L10RatificationViolationCode.SUBLAYER_CERT_FAILED);
      }
      if (present.level !== 'PRODUCTION_GREEN') {
        blocking.push(
          L10RatificationViolationCode.CERTIFICATION_NOT_GREEN);
      }
    }

    // §10.9.13 INV-10.9-A — completion must be L10_PRODUCTION_READY.
    if (inputs.completion.overall_state !==
        L10CompletionState.L10_PRODUCTION_READY) {
      blocking.push(...inputs.completion.violations);
    }

    // §10.9.13 INV-10.9-C — handoff surface completeness is required
    // before any downstream dependency can be allowed.
    if (inputs.stable_handoff_surfaces.length === 0) {
      blocking.push(
        L10RatificationViolationCode.MISSING_HANDOFF_SURFACE);
    } else {
      for (const required of L10_STABLE_HANDOFF_SURFACES) {
        if (!inputs.stable_handoff_surfaces.includes(required)) {
          blocking.push(
            L10RatificationViolationCode.MISSING_HANDOFF_SURFACE);
        }
      }
    }

    const ratified_at = new Date().toISOString();

    const fdHash = l10RatificationFingerprint(
      inputs.final_definition_surface.join('\n'),
    );
    const esHash = l10RatificationFingerprint(
      inputs.execution_sequence.join('|'),
    );
    const shHash = l10RatificationFingerprint(
      [...inputs.stable_handoff_surfaces].sort().join('|'),
    );

    const downstreamAllowed =
      blocking.length === 0 && inputs.downstream_dependency_allowed;
    const rolloutRecommended = blocking.length === 0;

    const artifactWithoutHash:
      Omit<L10LayerRatificationArtifact, 'artifact_hash'> = {
      layer_id: 'L10',
      layer_name: 'Hypothesis Engine',
      layer_version: inputs.layer_version,
      ratification_run_id: inputs.ratification_run_id,
      sub_layer_versions: inputs.sub_layer_versions,
      certification_artifact_refs: inputs.certification_artifact_refs,
      completion_dimensions: inputs.completion,
      completion_result: inputs.completion.overall_state,
      freeze_status:
        blocking.length === 0
          ? inputs.freeze_status
          : L10FreezeStatus.OPEN,
      extension_policy_version: inputs.extension_policy_version,
      stable_handoff_surfaces: inputs.stable_handoff_surfaces,
      downstream_dependency_allowed: downstreamAllowed,
      rollout_recommended: rolloutRecommended,
      ratified_at,
      ratified_by_rule_set: inputs.ratified_by_rule_set,
      blocking_violations: blocking,
      final_definition_surface_hash: fdHash,
      execution_sequence_hash: esHash,
      stable_handoff_surface_hash: shHash,
    };

    const hashInput = canonicalizeL10Ratification({
      ...artifactWithoutHash,
      artifact_hash: '',
    } as L10LayerRatificationArtifact);
    const artifact_hash = l10RatificationFingerprint(hashInput);

    const artifact: L10LayerRatificationArtifact = {
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

const ratificationLog: L10LayerRatificationArtifact[] = [];

export function registerL10RatificationArtifact(
  a: L10LayerRatificationArtifact,
): void {
  ratificationLog.push(a);
}

export function getLatestL10RatificationArtifact():
  L10LayerRatificationArtifact | null {
  return ratificationLog.length === 0
    ? null
    : ratificationLog[ratificationLog.length - 1];
}

export function listL10RatificationArtifacts():
  readonly L10LayerRatificationArtifact[] {
  return [...ratificationLog];
}

export function clearL10RatificationArtifacts(): void {
  ratificationLog.length = 0;
}
