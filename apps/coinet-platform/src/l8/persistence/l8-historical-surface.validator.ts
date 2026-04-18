/**
 * L8.8 — Historical Surface Validator
 *
 * §8.8.4 — Enforces the append-safe, replay-safe, correction-aware
 * discipline for every historical regime/transition/confidence/
 * multiplier fact write.
 *
 * A historical row is ILLEGAL if:
 *   - it lacks replay identity (replay_hash)
 *   - it lacks lineage (manifest + trace + policy_version + mode)
 *   - it is a destructive overwrite against an existing fact id
 *   - it claims LIVE_CURRENT mode (current writes never land here)
 *   - it silently mutates current state (no-current-from-historical)
 *   - it asserts correction semantics without parent + reason
 */

import {
  L8MaterializationMode,
  L8PersistenceEnvelope,
  L8DurableSurfaceId,
} from '../contracts/l8-persistence-surface';
import { L8HistoricalFactBase } from '../contracts/l8-current-authority';
import {
  L8_HISTORICAL_PERSISTENCE_CLASSES,
} from './l8-materialization-policy';
import {
  L8PersistenceViolation,
  L8PersistenceViolationCode,
  buildL8PersistenceViolation,
} from './l8-persistence-violation-codes';

export interface L8HistoricalWriteContext {
  readonly source: string;
  /** Whether a row with this fact_id already exists at the same surface. */
  readonly prior_fact_with_same_id: boolean;
  /** Caller asserts it is mutating current-state inline (forbidden). */
  readonly mutates_current: boolean;
  /** Caller asserts destructive-in-place overwrite. */
  readonly destructive_overwrite: boolean;
}

export interface L8HistoricalValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8PersistenceViolation[];
}

export class L8HistoricalSurfaceValidator {
  validate(
    env: L8PersistenceEnvelope,
    fact: L8HistoricalFactBase,
    ctx: L8HistoricalWriteContext,
  ): L8HistoricalValidationResult {
    const violations: L8PersistenceViolation[] = [];

    // §8.8.4 — only historical classes land here
    if (!L8_HISTORICAL_PERSISTENCE_CLASSES.includes(env.persistence_class)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_MODE_MISSING,
        `historical validator invoked on non-historical class ${env.persistence_class}`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id },
      ));
      return { ok: false, violations };
    }

    // §8.8.4.6 — cannot claim LIVE_CURRENT
    if (env.materialization_mode === L8MaterializationMode.LIVE_CURRENT) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.LIVE_WRITTEN_AS_HISTORICAL,
        `historical class ${env.persistence_class} cannot be written as LIVE_CURRENT`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id },
      ));
    }

    // §8.8.4.4 — replay identity
    if (!fact.replay_hash) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY,
        `historical fact missing replay_hash`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id, context: { fact_id: fact.fact_id } },
      ));
    }

    // §8.8.4.4 — lineage
    if (!fact.lineage_refs?.trace_id || !fact.lineage_refs?.manifest_id) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE,
        `historical fact missing lineage_refs.{trace_id,manifest_id}`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id, context: { fact_id: fact.fact_id } },
      ));
    }

    // §8.8.4.4 — materialization mode
    if (!fact.materialization_mode) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_MODE_MISSING,
        `historical fact missing materialization_mode`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id, context: { fact_id: fact.fact_id } },
      ));
    } else if (fact.materialization_mode !== env.materialization_mode) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_MODE_MISSING,
        `fact.materialization_mode=${fact.materialization_mode} !== env.materialization_mode=${env.materialization_mode}`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id, context: { fact_id: fact.fact_id } },
      ));
    }

    // §8.8.4.4 — policy version
    if (!fact.policy_version) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_POLICY_VERSION_MISSING,
        `historical fact missing policy_version`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id, context: { fact_id: fact.fact_id } },
      ));
    }

    // §8.8.4.3 — destructive-in-place overwrite is illegal
    if (ctx.destructive_overwrite || ctx.prior_fact_with_same_id) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE,
        `destructive overwrite attempted on append-safe surface ${env.surface_id}`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id, context: { fact_id: fact.fact_id } },
      ));
    }

    // §8.8.4.5 — correction linkage
    if (fact.correction_parent_ref && !fact.correction_reason) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON,
        `correction row references parent but carries no correction_reason`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id },
      ));
    }
    if (!fact.correction_parent_ref && fact.correction_reason) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT,
        `correction row carries reason without correction_parent_ref`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id },
      ));
    }

    // §8.8.4.6 — silent-current-mutation ban
    if (ctx.mutates_current) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY,
        `historical write silently mutates current state for ${fact.regime_subject_id}`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id },
      ));
    }

    // §8.8.6.3 — evidence ref requirement for evidence-bearing surfaces
    const requiresEvidence =
      env.surface_id === L8DurableSurfaceId.HISTORICAL_REGIME_FACTS ||
      env.surface_id === L8DurableSurfaceId.HISTORICAL_TRANSITION_FACTS ||
      env.surface_id === L8DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS;
    if (requiresEvidence && !fact.evidence_pack_ref) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_EVIDENCE_REF_MISSING,
        `historical fact on ${env.surface_id} requires evidence_pack_ref`,
        { regime_subject_id: fact.regime_subject_id,
          surface: env.surface_id, context: { fact_id: fact.fact_id } },
      ));
    }

    return { ok: violations.length === 0, violations };
  }
}
