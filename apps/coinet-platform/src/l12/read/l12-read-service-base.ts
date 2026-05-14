/**
 * L12.6 — Shared read-service primitives.
 *
 * Each read service validates its request, optionally invokes a provider
 * function (which is expected to talk to L5 / Postgres / ClickHouse / object
 * storage), and wraps the result in a governed read result.
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import {
  L12ConsumerClass,
  L12GovernedReadResult,
  L12ReadFreshnessClass,
  L12ReadMode,
  L12ReadRequest,
  L12ReadSurfaceId,
} from '../contracts/l12-read-surface';
import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import { getL12ReadSurfaceDescriptor } from '../registry/l12-read-surface.registry';
import {
  L12PersistenceValidationResult,
  L12PersistenceViolationIssue,
  L12PersistenceViolationCode,
  l12PersistenceIssueOf,
} from '../persistence/l12-persistence-violation-codes';
import {
  l12FreshnessForMode,
  validateL12ReadRequest,
} from './l12-read-surface.validator';

export interface L12ReadProviderResult<T> {
  readonly payload: T;
  readonly source_durable_surface_refs: readonly L12DurableSurfaceId[];
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash_refs: readonly string[];
  readonly restriction_profile_ref?: string;
  readonly served_from_cache?: boolean;
}

export interface L12ReadServiceOutcome<T> {
  readonly ok: boolean;
  readonly issues: readonly L12PersistenceViolationIssue[];
  readonly result?: L12GovernedReadResult<T>;
}

/** Run a read service: validate the request, call provider, wrap result. */
export function runL12ReadService<T>(
  request: L12ReadRequest,
  expectedSurface: L12ReadSurfaceId,
  provider: (req: L12ReadRequest) => L12ReadProviderResult<T> | undefined,
): L12ReadServiceOutcome<T> {
  if (request.read_surface_id !== expectedSurface) {
    return {
      ok: false,
      issues: [
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_READ_SURFACE_UNREGISTERED,
          `service expects surface ${expectedSurface}, got ${request.read_surface_id}`,
          request.read_request_id,
        ),
      ],
    };
  }

  const reqValidation: L12PersistenceValidationResult = validateL12ReadRequest(request);
  if (!reqValidation.ok) {
    return { ok: false, issues: reqValidation.issues };
  }

  const desc = getL12ReadSurfaceDescriptor(expectedSurface);
  if (!desc) {
    return {
      ok: false,
      issues: [
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_READ_SURFACE_UNREGISTERED,
          `read surface descriptor missing for ${expectedSurface}`,
          request.read_request_id,
        ),
      ],
    };
  }

  const provided = provider(request);
  if (!provided) {
    return {
      ok: false,
      issues: [
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_READ_RESULT_PAYLOAD_MISSING,
          `provider for ${expectedSurface} returned no payload`,
          request.read_request_id,
        ),
      ],
    };
  }

  const issues: L12PersistenceViolationIssue[] = [];

  if (
    desc.requires_evidence &&
    provided.evidence_refs.length === 0
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_EVIDENCE_REQUIRED_BUT_MISSING,
        `read surface ${expectedSurface} requires evidence`,
        request.read_request_id,
      ),
    );
  }
  if (
    desc.requires_lineage &&
    provided.lineage_refs.length === 0
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_LINEAGE_REQUIRED_BUT_MISSING,
        `read surface ${expectedSurface} requires lineage`,
        request.read_request_id,
      ),
    );
  }
  if (
    desc.requires_replay_hash &&
    provided.replay_hash_refs.length === 0
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_REPLAY_HASH_REQUIRED_BUT_MISSING,
        `read surface ${expectedSurface} requires replay hash`,
        request.read_request_id,
      ),
    );
  }
  if (
    desc.requires_restriction_profile &&
    !provided.restriction_profile_ref
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_READ_RESTRICTION_PROFILE_REQUIRED_BUT_MISSING,
        `read surface ${expectedSurface} requires restriction profile`,
        request.read_request_id,
      ),
    );
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.read.result',
    policy_version: request.policy_version,
    material: {
      read_surface_id: expectedSurface,
      read_mode: request.read_mode,
      consumer_class: request.consumer_class,
      payload_replay_hashes: [...provided.replay_hash_refs].sort(),
    },
  });

  const result: L12GovernedReadResult<T> = {
    read_result_id: `l12.read.result.${replay_hash}`,
    read_request_id: request.read_request_id,
    read_surface_id: expectedSurface,
    read_mode: request.read_mode,
    payload: provided.payload,
    source_durable_surface_refs: [...provided.source_durable_surface_refs].sort(),
    evidence_refs: [...provided.evidence_refs].sort(),
    lineage_refs: [...provided.lineage_refs].sort(),
    replay_hash_refs: [...provided.replay_hash_refs].sort(),
    restriction_profile_ref: provided.restriction_profile_ref,
    freshness_class: l12FreshnessForMode(request.read_mode),
    served_from_cache: provided.served_from_cache === true,
    cache_authoritative: false,
    policy_version: request.policy_version,
  };

  return { ok: true, issues, result };
}

/** Convenience shortcut that ignores the provider's freshness preference. */
export function l12LiveCurrentFreshness(): L12ReadFreshnessClass {
  return L12ReadFreshnessClass.LIVE;
}

/** Type alias for a service factory bound to a single surface. */
export type L12ReadServiceFn<T> = (
  request: L12ReadRequest,
) => L12ReadServiceOutcome<T>;

/** Bind a provider to its expected surface. */
export function makeL12ReadService<T>(
  expectedSurface: L12ReadSurfaceId,
  provider: (req: L12ReadRequest) => L12ReadProviderResult<T> | undefined,
): L12ReadServiceFn<T> {
  return req => runL12ReadService(req, expectedSurface, provider);
}

/** No-op consumer (re-export to avoid widening service imports). */
export type L12AnyConsumer = L12ConsumerClass;
/** No-op mode (re-export to avoid widening service imports). */
export type L12AnyReadMode = L12ReadMode;
