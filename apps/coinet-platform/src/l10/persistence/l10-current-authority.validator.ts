/**
 * L10.8 — Current Authority Validator
 *
 * §10.8.5 / INV-10.8-B — Checks that every write targeting a
 * current-authority surface satisfies:
 *   • authority store is Postgres
 *   • materialization mode is legal for current authority
 *   • supersession linkage rules (prior link + reason when replacing)
 *   • replay mode never pretends to be live current
 *   • Redis-acceleration bindings never assert authority
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';
import {
  L10CurrentAuthorityAspect,
  L10CurrentAuthoritySupersession,
  L10RedisAccelerationBinding,
  L10_CURRENT_AUTHORITY_LEGAL_MODES,
  L10_CURRENT_AUTHORITY_REQUIRED_STORE,
  L10_CURRENT_AUTHORITY_SURFACE_BY_ASPECT,
} from '../contracts/l10-current-authority';
import {
  L10MaterializationMode,
  L10PersistenceClass,
  L10PersistenceEnvelope,
} from '../contracts/l10-persistence-surface';
import { L10DurableSurfaceRegistry } from '../registry/l10-durable-surface.registry';
import {
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  L10PersistenceViolationTier,
  l10PersistenceViolationTier,
} from './l10-persistence-violation-codes';

export interface L10CurrentAuthorityValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
}

/**
 * §10.8.5.2 — Validate a current-authority write. `supersession` is
 * null for the first row on a (subject, scope).
 */
export function validateL10CurrentAuthorityWrite(input: {
  readonly aspect: L10CurrentAuthorityAspect;
  readonly envelope: L10PersistenceEnvelope;
  readonly supersession: L10CurrentAuthoritySupersession | null;
  readonly registry?: L10DurableSurfaceRegistry;
}): L10CurrentAuthorityValidationResult {
  const registry = input.registry ?? L10DurableSurfaceRegistry.default();
  const violations: L10PersistenceViolation[] = [];

  const expectedSurfaceId =
    L10_CURRENT_AUTHORITY_SURFACE_BY_ASPECT[input.aspect];
  if (expectedSurfaceId === undefined) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_ASPECT_UNREGISTERED,
      `Unknown current-authority aspect ${input.aspect}.`,
    ));
    return { ok: false, violations };
  }

  if (input.envelope.durable_surface_id !== expectedSurfaceId) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_ASPECT_UNREGISTERED,
      `Aspect ${input.aspect} requires surface ${expectedSurfaceId} ` +
        `but envelope targeted ${input.envelope.durable_surface_id}.`,
    ));
  }

  const surface = registry.get(expectedSurfaceId);
  if (!surface) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Expected surface ${expectedSurfaceId} is not registered.`,
    ));
    return { ok: false, violations };
  }

  if (
    surface.persistence_class !==
    L10PersistenceClass.CURRENT_AUTHORITY_SURFACE
  ) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_WRONG_STORE,
      `Surface ${surface.durable_surface_id} is not a ` +
        `CURRENT_AUTHORITY_SURFACE.`,
    ));
  }

  if (surface.authority_store !== L10_CURRENT_AUTHORITY_REQUIRED_STORE) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_WRONG_STORE,
      `Current-authority surface ${surface.durable_surface_id} must be ` +
        `Postgres (INV-10.8-B); got ${surface.authority_store}.`,
    ));
  }

  // §10.8.5.6 — mode must be legal for current authority.
  if (
    !L10_CURRENT_AUTHORITY_LEGAL_MODES.includes(
      input.envelope.materialization_mode,
    )
  ) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_ILLEGAL_MODE,
      `Mode ${input.envelope.materialization_mode} is illegal for ` +
        `current-authority surface ${surface.durable_surface_id}.`,
    ));
  }

  // §10.8.5.4 — supersession linkage.
  if (input.supersession !== null) {
    const s = input.supersession;
    if (!s.prior_envelope_id) {
      violations.push(v(
        L10PersistenceViolationCode.CURRENT_AUTHORITY_PRIOR_LINK_MISSING,
        `Supersession for ${surface.durable_surface_id} missing ` +
          `prior_envelope_id.`,
      ));
    }
    if (!s.supersession_reason) {
      violations.push(v(
        L10PersistenceViolationCode.CURRENT_AUTHORITY_REASON_MISSING,
        `Supersession for ${surface.durable_surface_id} missing ` +
          `supersession_reason.`,
      ));
    }
    if (s.next_envelope_id === s.prior_envelope_id) {
      violations.push(v(
        L10PersistenceViolationCode.CURRENT_AUTHORITY_SUPERSEDE_SELF_LINK,
        `Supersession next_envelope_id equals prior_envelope_id on ` +
          `${surface.durable_surface_id}.`,
      ));
    }
  } else if (
    input.envelope.supersedes_envelope_id !== null &&
    input.envelope.supersedes_envelope_id !== undefined
  ) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_SILENT_OVERWRITE,
      `Envelope ${input.envelope.envelope_id} declares supersession ` +
        `link but no supersession record was recorded.`,
    ));
  }

  // §10.8.5.6 — live-current writes must carry replay_hash.
  if (
    input.envelope.materialization_mode === L10MaterializationMode.LIVE_CURRENT &&
    input.envelope.replay_hash === null
  ) {
    violations.push(v(
      L10PersistenceViolationCode.REPLAY_HASH_MISSING,
      `Current-authority LIVE_CURRENT write to ` +
        `${surface.durable_surface_id} must carry replay_hash.`,
    ));
  }

  // §10.8.5.6 — repair mode must be marked.
  if (
    input.envelope.materialization_mode ===
    L10MaterializationMode.REPAIR_REBUILD
  ) {
    if (!input.supersession || !input.supersession.supersession_reason) {
      violations.push(v(
        L10PersistenceViolationCode.CURRENT_AUTHORITY_REPAIR_NOT_MARKED,
        `REPAIR_REBUILD write to ${surface.durable_surface_id} must ` +
          `carry supersession_reason describing the repair.`,
      ));
    }
  }

  // §10.8.5.6 — replay-historical target current authority is illegal.
  if (
    input.envelope.materialization_mode ===
    L10MaterializationMode.REPLAY_HISTORICAL
  ) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_REPLAY_AS_LIVE,
      `REPLAY_HISTORICAL write to current-authority surface ` +
        `${surface.durable_surface_id} is illegal.`,
    ));
  }

  return { ok: violations.length === 0, violations };
}

/**
 * §10.8.5.5 — Validate Redis-acceleration bindings so Redis cannot
 * quietly assert authority.
 */
export function validateL10RedisAccelerationBinding(
  binding: L10RedisAccelerationBinding,
  registry: L10DurableSurfaceRegistry = L10DurableSurfaceRegistry.default(),
): L10CurrentAuthorityValidationResult {
  const violations: L10PersistenceViolation[] = [];
  const surface = registry.get(binding.durable_surface_id);
  if (!surface) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Redis binding targets unknown surface ` +
        `${binding.durable_surface_id}.`,
    ));
    return { ok: false, violations };
  }
  if (!surface.redis_cache_permitted) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
      `Surface ${surface.durable_surface_id} does not permit Redis ` +
        `acceleration.`,
    ));
  }
  if ((binding.authoritative as boolean) !== false) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
      `Redis binding for ${surface.durable_surface_id} declared ` +
        `authoritative=true (INV-10.8-B).`,
    ));
  }
  if (surface.authority_store === L5AuthorityStore.REDIS) {
    violations.push(v(
      L10PersistenceViolationCode.CURRENT_AUTHORITY_REDIS_SHADOW,
      `Surface ${surface.durable_surface_id} is backed by REDIS as ` +
        `authority store (INV-10.8-B).`,
    ));
  }
  return { ok: violations.length === 0, violations };
}

function v(
  code: L10PersistenceViolationCode,
  detail: string,
  offending_refs?: readonly string[],
): L10PersistenceViolation {
  return {
    code,
    tier: l10PersistenceViolationTier(code) as L10PersistenceViolationTier,
    detail,
    offending_refs,
  };
}
