/**
 * L9.8 — Current Authority Validator
 *
 * §9.8.5 / INV-9.8-B — Checks that every write targeting a
 * current-authority surface satisfies:
 *   • authority store is Postgres
 *   • materialization mode is legal for current authority
 *   • supersession linkage rules (prior link + reason when replacing)
 *   • replay mode never pretends to be live current
 *   • Redis-acceleration bindings never assert authority
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';
import {
  L9CurrentAuthorityAspect,
  L9CurrentAuthoritySupersession,
  L9RedisAccelerationBinding,
  L9_CURRENT_AUTHORITY_LEGAL_MODES,
  L9_CURRENT_AUTHORITY_REQUIRED_STORE,
  L9_CURRENT_AUTHORITY_SURFACE_BY_ASPECT,
} from '../contracts/l9-current-authority';
import {
  L9MaterializationMode,
  L9PersistenceClass,
  L9PersistenceEnvelope,
} from '../contracts/l9-persistence-surface';
import { L9DurableSurfaceRegistry } from '../registry/l9-durable-surface.registry';
import {
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from './l9-persistence-violation-codes';

export interface L9CurrentAuthorityValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
}

/**
 * §9.8.5.2 — Validate a current-authority write.
 * `supersession` is null for the very first row on a (subject, scope).
 */
export function validateL9CurrentAuthorityWrite(input: {
  readonly aspect: L9CurrentAuthorityAspect;
  readonly envelope: L9PersistenceEnvelope;
  readonly supersession: L9CurrentAuthoritySupersession | null;
  readonly registry?: L9DurableSurfaceRegistry;
}): L9CurrentAuthorityValidationResult {
  const registry = input.registry ?? L9DurableSurfaceRegistry.default();
  const violations: L9PersistenceViolation[] = [];

  const expectedSurfaceId =
    L9_CURRENT_AUTHORITY_SURFACE_BY_ASPECT[input.aspect];
  if (expectedSurfaceId === undefined) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_ASPECT_UNREGISTERED,
      `Unknown current-authority aspect ${input.aspect}.`,
    ));
    return { ok: false, violations };
  }

  if (input.envelope.durable_surface_id !== expectedSurfaceId) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_ASPECT_UNREGISTERED,
      `Aspect ${input.aspect} requires surface ${expectedSurfaceId} ` +
        `but envelope targeted ${input.envelope.durable_surface_id}.`,
    ));
  }

  const surface = registry.get(expectedSurfaceId);
  if (!surface) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Expected surface ${expectedSurfaceId} is not registered.`,
    ));
    return { ok: false, violations };
  }

  if (surface.persistence_class !== L9PersistenceClass.CURRENT_AUTHORITY_SURFACE) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_WRONG_STORE,
      `Surface ${surface.durable_surface_id} is not a ` +
        `CURRENT_AUTHORITY_SURFACE.`,
    ));
  }

  if (surface.authority_store !== L9_CURRENT_AUTHORITY_REQUIRED_STORE) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_WRONG_STORE,
      `Current-authority surface ${surface.durable_surface_id} must be ` +
        `Postgres (INV-9.8-B); got ${surface.authority_store}.`,
    ));
  }

  // §9.8.5.6 — mode must be legal for current authority.
  if (!L9_CURRENT_AUTHORITY_LEGAL_MODES.includes(input.envelope.materialization_mode)) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_ILLEGAL_MODE,
      `Mode ${input.envelope.materialization_mode} is illegal for ` +
        `current-authority surface ${surface.durable_surface_id}.`,
    ));
  }

  // §9.8.5.4 — supersession linkage: any mode other than the first
  // row must carry prior linkage + reason; repair mode must declare
  // repair marking, not masquerade as live.
  if (input.supersession !== null) {
    const s = input.supersession;
    if (!s.prior_envelope_id) {
      violations.push(v(
        L9PersistenceViolationCode.CURRENT_AUTHORITY_PRIOR_LINK_MISSING,
        `Supersession for ${surface.durable_surface_id} missing ` +
          `prior_envelope_id.`,
      ));
    }
    if (!s.supersession_reason) {
      violations.push(v(
        L9PersistenceViolationCode.CURRENT_AUTHORITY_REASON_MISSING,
        `Supersession for ${surface.durable_surface_id} missing ` +
          `supersession_reason.`,
      ));
    }
    if (s.next_envelope_id === s.prior_envelope_id) {
      violations.push(v(
        L9PersistenceViolationCode.CURRENT_AUTHORITY_SUPERSEDE_SELF_LINK,
        `Supersession next_envelope_id equals prior_envelope_id on ` +
          `${surface.durable_surface_id}.`,
      ));
    }
  } else if (
    input.envelope.supersedes_envelope_id !== null &&
    input.envelope.supersedes_envelope_id !== undefined
  ) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_SILENT_OVERWRITE,
      `Envelope ${input.envelope.envelope_id} declares supersession ` +
        `link but no supersession record was recorded.`,
    ));
  }

  // §9.8.5.6 — replay writes must never carry LIVE_CURRENT mode.
  if (input.envelope.materialization_mode === L9MaterializationMode.LIVE_CURRENT &&
      input.envelope.replay_hash === null) {
    violations.push(v(
      L9PersistenceViolationCode.REPLAY_HASH_MISSING,
      `Current-authority LIVE_CURRENT write to ` +
        `${surface.durable_surface_id} must carry replay_hash.`,
    ));
  }

  // §9.8.5.6 — repair mode must be marked (not masquerading as live).
  if (input.envelope.materialization_mode === L9MaterializationMode.REPAIR_REBUILD) {
    if (!input.supersession || !input.supersession.supersession_reason) {
      violations.push(v(
        L9PersistenceViolationCode.CURRENT_AUTHORITY_REPAIR_NOT_MARKED,
        `REPAIR_REBUILD write to ${surface.durable_surface_id} must ` +
          `carry supersession_reason describing the repair.`,
      ));
    }
  }

  // §9.8.5.6 — replay-historical target current authority is illegal.
  if (
    input.envelope.materialization_mode === L9MaterializationMode.REPLAY_HISTORICAL
  ) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE,
      `REPLAY_HISTORICAL write to current-authority surface ` +
        `${surface.durable_surface_id} is illegal.`,
    ));
  }

  return { ok: violations.length === 0, violations };
}

/**
 * §9.8.5.5 — Validate Redis-acceleration bindings so Redis cannot
 * quietly assert authority.
 */
export function validateL9RedisAccelerationBinding(
  binding: L9RedisAccelerationBinding,
  registry: L9DurableSurfaceRegistry = L9DurableSurfaceRegistry.default(),
): L9CurrentAuthorityValidationResult {
  const violations: L9PersistenceViolation[] = [];
  const surface = registry.get(binding.durable_surface_id);
  if (!surface) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Redis binding targets unknown surface ` +
        `${binding.durable_surface_id}.`,
    ));
    return { ok: false, violations };
  }
  if (!surface.redis_cache_permitted) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
      `Surface ${surface.durable_surface_id} does not permit Redis ` +
        `acceleration.`,
    ));
  }
  if ((binding.authoritative as boolean) !== false) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
      `Redis binding for ${surface.durable_surface_id} declared ` +
        `authoritative=true (INV-9.8-B).`,
    ));
  }
  if (surface.authority_store === L5AuthorityStore.REDIS) {
    violations.push(v(
      L9PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
      `Surface ${surface.durable_surface_id} is backed by REDIS as ` +
        `authority store (INV-9.8-B).`,
    ));
  }
  return { ok: violations.length === 0, violations };
}

function v(
  code: L9PersistenceViolationCode,
  detail: string,
  offending_refs?: readonly string[],
): L9PersistenceViolation {
  return {
    code,
    tier: l9PersistenceViolationTier(code) as L9PersistenceViolationTier,
    detail,
    offending_refs,
  };
}
