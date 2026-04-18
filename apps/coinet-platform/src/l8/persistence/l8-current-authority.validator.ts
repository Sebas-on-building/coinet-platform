/**
 * L8.8 — Current Authority Validator
 *
 * §8.8.5 — Validates current-state write envelopes against authority
 * class mapping, supersession law, destructive-overwrite ban, and
 * shadow-authority guards.
 *
 * This is the strongest guard against drift: once a current-state row
 * lands, the rest of Coinet treats it as truth. A single bad write
 * here pollutes everything downstream until the next supersession.
 */

import {
  L8AuthorityStore,
  L8DurableSurfaceId,
  L8MaterializationMode,
  L8PersistenceClass,
  L8PersistenceEnvelope,
} from '../contracts/l8-persistence-surface';
import {
  L8CurrentAuthorityClass,
} from '../contracts/l8-current-authority';
import {
  L8DurableSurfaceRegistry,
  getDefaultL8DurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import {
  L8PersistenceViolation,
  L8PersistenceViolationCode,
  buildL8PersistenceViolation,
} from './l8-persistence-violation-codes';
import {
  L8_CURRENT_PERSISTENCE_CLASSES,
} from './l8-materialization-policy';

export const L8_CURRENT_AUTHORITY_CLASS_TO_SURFACE: Record<
  L8CurrentAuthorityClass, L8DurableSurfaceId
> = {
  [L8CurrentAuthorityClass.REGIME]:
    L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
  [L8CurrentAuthorityClass.TRANSITION]:
    L8DurableSurfaceId.CURRENT_TRANSITION_REGISTRY,
  [L8CurrentAuthorityClass.CONFIDENCE]:
    L8DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY,
  [L8CurrentAuthorityClass.MULTIPLIER]:
    L8DurableSurfaceId.CURRENT_MULTIPLIER_REGISTRY,
};

export const L8_CURRENT_AUTHORITY_CLASS_TO_PERSISTENCE: Record<
  L8CurrentAuthorityClass, L8PersistenceClass
> = {
  [L8CurrentAuthorityClass.REGIME]: L8PersistenceClass.CURRENT_REGIME,
  [L8CurrentAuthorityClass.TRANSITION]: L8PersistenceClass.CURRENT_TRANSITION,
  [L8CurrentAuthorityClass.CONFIDENCE]: L8PersistenceClass.CURRENT_CONFIDENCE,
  [L8CurrentAuthorityClass.MULTIPLIER]: L8PersistenceClass.CURRENT_MULTIPLIER,
};

export interface L8CurrentAuthorityValidationContext {
  readonly authority_class: L8CurrentAuthorityClass;
  readonly source: string;
  /**
   * §8.8.5.4 — whether a prior state exists for this (subject, scope,
   * family, authority-class) triple. When true, supersession linkage
   * is mandatory. When false, the row is the first authoritative write.
   */
  readonly prior_state_exists: boolean;
  readonly redis_as_authority?: boolean;
  readonly destructive_overwrite?: boolean;
}

export interface L8CurrentAuthorityValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8PersistenceViolation[];
}

export class L8CurrentStateAuthorityValidator {
  constructor(
    private readonly registry: L8DurableSurfaceRegistry =
      getDefaultL8DurableSurfaceRegistry(),
  ) {}

  validate(
    env: L8PersistenceEnvelope,
    ctx: L8CurrentAuthorityValidationContext,
  ): L8CurrentAuthorityValidationResult {
    const violations: L8PersistenceViolation[] = [];

    // Only current classes are in scope.
    if (!L8_CURRENT_PERSISTENCE_CLASSES.includes(env.persistence_class)) {
      // Still validate the negative: authority_class claims a current
      // surface but the envelope is not a current class.
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.AUTHORITY_CLASS_SURFACE_MISMATCH,
        `authority class ${ctx.authority_class} validated against non-current class ${env.persistence_class}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
      return { ok: false, violations };
    }

    // §8.8.5.5 — authority class ↔ surface alignment
    const expectedSurface = L8_CURRENT_AUTHORITY_CLASS_TO_SURFACE[ctx.authority_class];
    const expectedClass = L8_CURRENT_AUTHORITY_CLASS_TO_PERSISTENCE[ctx.authority_class];
    if (env.surface_id !== expectedSurface) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.AUTHORITY_CLASS_SURFACE_MISMATCH,
        `authority ${ctx.authority_class} must target ${expectedSurface}, got ${env.surface_id}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }
    if (env.persistence_class !== expectedClass) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.AUTHORITY_CLASS_SURFACE_MISMATCH,
        `authority ${ctx.authority_class} expects class ${expectedClass}, got ${env.persistence_class}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.5.2 — Postgres-only authority store
    if (env.authority_store !== L8AuthorityStore.POSTGRES) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.SHADOW_AUTHORITY_DETECTED,
        `current ${ctx.authority_class} authority must be POSTGRES, got ${env.authority_store}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }
    if (ctx.redis_as_authority) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT,
        `Redis-as-authority attempt against current ${ctx.authority_class}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.5.4 — current-state mode must be LIVE_CURRENT
    if (env.materialization_mode !== L8MaterializationMode.LIVE_CURRENT) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID,
        `current ${ctx.authority_class} must be written as LIVE_CURRENT, got ${env.materialization_mode}`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    // §8.8.5.4 — supersession law: if prior exists, new row MUST carry
    // superseded_prior_ref. If no prior exists, superseded_prior_ref
    // MUST be null.
    if (ctx.prior_state_exists && !env.superseded_prior_ref) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.SUPERSEDED_PRIOR_REF_MISSING,
        `current ${ctx.authority_class} supersedes prior state but superseded_prior_ref is null`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }
    if (!ctx.prior_state_exists && env.superseded_prior_ref) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION,
        `current ${ctx.authority_class} claims supersession but ctx has no prior state (overwrite without superseding anything)`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id,
          context: { prior: env.superseded_prior_ref } },
      ));
    }

    // §8.8.5.4 — destructive overwrite ban
    if (ctx.destructive_overwrite) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION,
        `destructive overwrite attempted on current ${ctx.authority_class} (${env.surface_id})`,
        { regime_subject_id: env.regime_subject_id, surface: env.surface_id },
      ));
    }

    return { ok: violations.length === 0, violations };
  }
}

/**
 * §8.8.5.4 — Supersession link validator. Checks that the linkage
 * record (prior → new) is well-formed and mode-safe.
 */
export function validateL8SupersessionLink(link: {
  readonly prior_state_id: string;
  readonly new_state_id: string;
  readonly supersession_reason: string;
  readonly materialization_mode: L8MaterializationMode;
}): L8CurrentAuthorityValidationResult {
  const violations: L8PersistenceViolation[] = [];
  if (!link.prior_state_id || !link.new_state_id) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.SUPERSEDED_PRIOR_REF_MISSING,
      `supersession link missing prior/new state ids`,
    ));
  }
  if (link.prior_state_id === link.new_state_id) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION,
      `supersession link has identical prior and new state ids`,
    ));
  }
  if (!link.supersession_reason || link.supersession_reason.length < 3) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON,
      `supersession link missing reason`,
    ));
  }
  if (link.materialization_mode !== L8MaterializationMode.LIVE_CURRENT) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID,
      `supersession must happen in LIVE_CURRENT mode, got ${link.materialization_mode}`,
    ));
  }
  return { ok: violations.length === 0, violations };
}
