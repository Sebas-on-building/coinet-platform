/**
 * L5.4 Universal Write Contract — Ready-for-Manifest Validation
 *
 * §5.4.14 — Archive Proof Law
 * §5.4.12.5 — Phase E Pre-Manifest Validation
 */

import type { ResolvedStorageEnvelope } from './storage-envelope.types';
import { L5EnvelopeLifecycleState } from './envelope-lifecycle';

export interface ManifestReadinessResult {
  readonly ready: boolean;
  readonly violations: readonly string[];
}

export function validateReadyForManifest(env: ResolvedStorageEnvelope): ManifestReadinessResult {
  const violations: string[] = [];

  if (env.lifecycle_state !== L5EnvelopeLifecycleState.READY_FOR_MANIFEST
      && env.lifecycle_state !== L5EnvelopeLifecycleState.ARCHIVE_PROOF_ATTACHED) {
    violations.push(`Lifecycle state '${env.lifecycle_state}' is not manifest-ready`);
  }

  if (!env.classification_resolved) violations.push('Classification not resolved');
  if (!env.authority_allocated) violations.push('Authority not allocated');
  if (!env.topology_validated) violations.push('Topology not validated');

  if (env.archive_required && !env.archive_uri) {
    violations.push('Archive required but archive_uri missing');
  }
  if (env.archive_required && !env.archive_checksum) {
    violations.push('Archive required but archive_checksum missing');
  }
  if (env.archive_required && !env.archive_proof_verified) {
    violations.push('Archive required but proof not verified');
  }

  if (env.quarantine_flag) {
    violations.push('Envelope is flagged for quarantine');
  }

  if (!env.routing) {
    violations.push('Routing block missing');
  }

  return { ready: violations.length === 0, violations };
}
