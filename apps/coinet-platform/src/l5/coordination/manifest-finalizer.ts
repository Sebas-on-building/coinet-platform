/**
 * L5.5 Write Coordination — Manifest Finalizer
 *
 * §5.5.4.11 — Finalization
 * §5.5.7.3 — Finalization law
 */

import { L5ManifestState, L5ProjectionStatus, L5FailureClass } from './coordination-state';
import type { L5CoordinationManifest } from './consistency-model';
import { transitionManifest, getRequiredProjectionCompletion, getOptionalProjectionCompletion } from './write-manifest.service';

// ═══════════════════════════════════════════════════════════════════════════════
// FINALIZATION CHECK RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface FinalizationCheckResult {
  readonly canFinalize: boolean;
  readonly blockers: readonly string[];
  readonly requiredProjectionRatio: number;
  readonly optionalProjectionRatio: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINALIZATION ELIGIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

const FINALIZATION_ELIGIBLE_STATES: readonly L5ManifestState[] = [
  L5ManifestState.PRIMARY_AUTHORITY_COMMITTED,
  L5ManifestState.OUTBOX_EMITTED,
  L5ManifestState.REQUIRED_PROJECTIONS_COMPLETE,
  L5ManifestState.OPTIONAL_PROJECTIONS_PARTIAL,
];

export function checkFinalizationEligibility(manifest: L5CoordinationManifest): FinalizationCheckResult {
  const blockers: string[] = [];

  if (!manifest.primary_authority_committed) {
    blockers.push('Primary authority not committed');
  }

  if (manifest.archive_required && !manifest.archive_completed) {
    blockers.push('Required archive not completed');
  }

  const requiredRatio = getRequiredProjectionCompletion(manifest.manifest_id);
  if (requiredRatio < 1) {
    const failedRequired = manifest.projection_jobs.filter(
      j => j.required && (j.status === L5ProjectionStatus.FAILED_FATAL || j.status === L5ProjectionStatus.QUARANTINED),
    );
    if (failedRequired.length > 0) {
      blockers.push(`${failedRequired.length} required projection(s) failed fatally`);
    } else {
      blockers.push(`Required projection completion at ${(requiredRatio * 100).toFixed(0)}%`);
    }
  }

  if (!FINALIZATION_ELIGIBLE_STATES.includes(manifest.state)) {
    blockers.push(`Manifest state '${manifest.state}' not eligible for finalization`);
  }

  const optionalRatio = getOptionalProjectionCompletion(manifest.manifest_id);

  return {
    canFinalize: blockers.length === 0,
    blockers,
    requiredProjectionRatio: requiredRatio,
    optionalProjectionRatio: optionalRatio,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINALIZE
// ═══════════════════════════════════════════════════════════════════════════════

export function finalizeManifest(manifestId: string): FinalizationCheckResult & { finalized: boolean } {
  const manifest = require('./write-manifest.service').getManifest(manifestId) as L5CoordinationManifest | undefined;
  if (!manifest) {
    return { canFinalize: false, blockers: ['Manifest not found'], requiredProjectionRatio: 0, optionalProjectionRatio: 0, finalized: false };
  }

  const check = checkFinalizationEligibility(manifest);
  if (!check.canFinalize) {
    return { ...check, finalized: false };
  }

  transitionManifest(manifestId, L5ManifestState.FINALIZED);
  return { ...check, finalized: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLAIN FINALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export function explainFinalizationOutcome(manifest: L5CoordinationManifest): string {
  if (manifest.state === L5ManifestState.FINALIZED) {
    return `Manifest ${manifest.manifest_id} finalized: authority committed, archive ${manifest.archive_required ? 'completed' : 'not required'}, all required projections complete.`;
  }
  const check = checkFinalizationEligibility(manifest);
  return `Manifest ${manifest.manifest_id} not finalized. Blockers: ${check.blockers.join('; ')}`;
}
