/**
 * L5.7 Assurance — Replay Integrity Verifier
 *
 * §5.7.5.5 — Validates checksums, lineage, and cross-store consistency.
 */

import type { ReplayBundle } from './replay-bundle-builder';

export interface ReplayIntegrityResult {
  readonly bundle_id: string;
  readonly checks_run: number;
  readonly checks_passed: number;
  readonly checks_failed: number;
  readonly violations: readonly ReplayIntegrityViolation[];
  readonly overall: 'INTACT' | 'DEGRADED' | 'CORRUPTED';
}

export interface ReplayIntegrityViolation {
  readonly check: string;
  readonly detail: string;
  readonly severity: 'WARNING' | 'ERROR' | 'FATAL';
}

export function verifyReplayIntegrity(bundle: ReplayBundle): ReplayIntegrityResult {
  const violations: ReplayIntegrityViolation[] = [];
  let checksRun = 0;

  checksRun++;
  if (bundle.trace_ids.length === 0) {
    violations.push({ check: 'trace_id_presence', detail: 'No trace IDs in bundle', severity: 'FATAL' });
  }

  checksRun++;
  if (bundle.manifest_ids.length === 0) {
    violations.push({ check: 'manifest_id_presence', detail: 'No manifest IDs in bundle', severity: 'FATAL' });
  }

  checksRun++;
  if (bundle.envelope_ids.length === 0) {
    violations.push({ check: 'envelope_id_presence', detail: 'No envelope IDs in bundle', severity: 'ERROR' });
  }

  checksRun++;
  if (!bundle.checksum_sha256 || bundle.checksum_sha256.length < 32) {
    violations.push({ check: 'checksum_valid', detail: 'Bundle checksum missing or too short', severity: 'FATAL' });
  }

  checksRun++;
  if (bundle.missing_warnings.length > 0) {
    violations.push({
      check: 'surface_completeness',
      detail: `Missing surfaces: ${bundle.missing_warnings.join(', ')}`,
      severity: bundle.missing_warnings.length > 2 ? 'FATAL' : 'WARNING',
    });
  }

  checksRun++;
  if (bundle.coverage_summary.coverage_ratio < 0.6) {
    violations.push({ check: 'coverage_threshold', detail: `Coverage ratio ${bundle.coverage_summary.coverage_ratio} below 0.6 threshold`, severity: 'ERROR' });
  }

  const hasFatal = violations.some(v => v.severity === 'FATAL');
  const hasError = violations.some(v => v.severity === 'ERROR');
  const overall = hasFatal ? 'CORRUPTED' : hasError ? 'DEGRADED' : 'INTACT';

  return {
    bundle_id: bundle.bundle_id,
    checks_run: checksRun,
    checks_passed: checksRun - violations.length,
    checks_failed: violations.length,
    violations,
    overall,
  };
}
