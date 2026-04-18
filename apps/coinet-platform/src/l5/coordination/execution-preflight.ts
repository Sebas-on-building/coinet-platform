/**
 * L5.5 Write Coordination — Execution Preflight
 *
 * §5.5.4.3 — Step 3: Coordinator validates execution readiness
 * §5.5.5.1 — EnvelopeValidator (coordination-stage)
 */

import type { ResolvedStorageEnvelope } from '../envelope';
import { L5EnvelopeLifecycleState } from '../envelope';
import { L5CoordinationError, L5CoordinationErrorCode } from './coordination-errors';

export interface PreflightResult {
  readonly passed: boolean;
  readonly violations: readonly PreflightViolation[];
}

export interface PreflightViolation {
  readonly check: string;
  readonly reason: string;
  readonly severity: 'REJECT' | 'QUARANTINE' | 'RETRY_LATER';
}

const COORDINATION_ELIGIBLE_STATES: readonly L5EnvelopeLifecycleState[] = [
  L5EnvelopeLifecycleState.READY_FOR_MANIFEST,
];

export function runExecutionPreflight(env: ResolvedStorageEnvelope): PreflightResult {
  const violations: PreflightViolation[] = [];

  if (!COORDINATION_ELIGIBLE_STATES.includes(env.lifecycle_state)) {
    violations.push({
      check: 'lifecycle_state',
      reason: `Envelope lifecycle_state '${env.lifecycle_state}' is not eligible for coordination`,
      severity: 'REJECT',
    });
  }

  if (!env.classification_resolved) {
    violations.push({ check: 'classification_resolved', reason: 'L5.1 classification not resolved', severity: 'REJECT' });
  }
  if (!env.authority_allocated) {
    violations.push({ check: 'authority_allocated', reason: 'L5.2 authority not allocated', severity: 'REJECT' });
  }
  if (!env.topology_validated) {
    violations.push({ check: 'topology_validated', reason: 'L5.3 topology not validated', severity: 'REJECT' });
  }

  if (!env.routing || !env.routing.primary_authority_store) {
    violations.push({ check: 'routing.primary_authority_store', reason: 'No primary authority store in routing block', severity: 'REJECT' });
  }

  if (env.archive_required && !env.archive_proof_verified && env.write_class !== 'IMMUTABLE_ARCHIVE') {
    // archive-first will handle it; no violation unless it's not archive class and proof was supposed to be pre-attached
  }

  if (!env.dedupe_key) {
    violations.push({ check: 'dedupe_key', reason: 'Missing dedupe key', severity: 'REJECT' });
  }

  if (!env.payload_hash_sha256) {
    violations.push({ check: 'payload_hash_sha256', reason: 'Missing payload hash', severity: 'REJECT' });
  }

  if (!env.envelope_id || !env.trace_id) {
    violations.push({ check: 'identity', reason: 'Missing envelope_id or trace_id', severity: 'REJECT' });
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function assertPreflightPassed(env: ResolvedStorageEnvelope): void {
  const result = runExecutionPreflight(env);
  if (!result.passed) {
    throw new L5CoordinationError(
      L5CoordinationErrorCode.PREFLIGHT_REJECTED,
      `Execution preflight failed: ${result.violations.map(v => v.reason).join('; ')}`,
      { violations: result.violations },
    );
  }
}
