/**
 * L11.8 — Persistence Envelope Validator (§11.8.6)
 *
 * Verifies that a candidate `L11PersistenceEnvelope` satisfies the
 * L5-only write law, surface registry, persistence-class/surface
 * matching, materialization-mode policy, lineage, replay-hash,
 * and direct-store-write prohibition.
 */

import {
  L11PersistenceEnvelope,
  L11_PERSISTENCE_POLICY_VERSION,
} from '../contracts/l11-persistence-surface';
import {
  getL11DurableSurfaceDescriptor,
} from '../registry/l11-durable-surface.registry';
import {
  evaluateL11MaterializationPolicy,
  isL11FailureWrittenAsScoreState,
} from './l11-materialization-policy';
import {
  L11PersistenceViolationCode,
  L11PersistenceIssue,
  makeL11PersistenceIssue,
} from './l11-persistence-violation-codes';

export function validateL11PersistenceEnvelope(
  e: L11PersistenceEnvelope<unknown>,
): L11PersistenceIssue[] {
  const issues: L11PersistenceIssue[] = [];
  const ctxBase = { envelope_id: e?.envelope_id, surface_id: e?.surface_id };

  if (!e) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_ENVELOPE_INCOMPLETE,
      'envelope is null/undefined'));
    return issues;
  }

  if (!e.envelope_id) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_ENVELOPE_ID_MISSING,
      'envelope_id missing'));
  }
  if (!e.surface_id) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_SURFACE_ID_MISSING,
      'surface_id missing', ctxBase));
  }
  if (!e.persistence_class) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_PERSISTENCE_CLASS_MISSING,
      'persistence_class missing', ctxBase));
  }
  if (!e.materialization_mode) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_MATERIALIZATION_MODE_MISSING,
      'materialization_mode missing', ctxBase));
  }
  if (e.payload === undefined || e.payload === null) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_ENVELOPE_PAYLOAD_MISSING,
      'payload missing', ctxBase));
  }
  if (!e.replay_hash) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_HASH_MISSING,
      'replay_hash missing', ctxBase));
  }
  if (!Array.isArray(e.lineage_refs) || e.lineage_refs.length === 0) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_LINEAGE_REFS_MISSING,
      'lineage_refs missing or empty', ctxBase));
  }
  if (!e.policy_version) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_POLICY_VERSION_MISSING,
      'policy_version missing', ctxBase));
  }
  if (!e.as_of) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_ENVELOPE_AS_OF_MISSING,
      'as_of missing', ctxBase));
  }
  if (!e.l5_route_ref) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_L5_ROUTE_MISSING,
      'l5_route_ref missing', ctxBase));
  }
  if ((e as { direct_store_write_attempted: unknown })
        .direct_store_write_attempted !== false) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_DIRECT_STORE_WRITE_ATTEMPT,
      'direct_store_write_attempted must be exactly false', ctxBase));
  }

  // Surface-level checks
  if (e.surface_id) {
    const desc = getL11DurableSurfaceDescriptor(e.surface_id);
    if (!desc) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_SURFACE_UNREGISTERED,
        `surface ${e.surface_id} not in registry`, ctxBase));
    } else if (e.persistence_class && e.materialization_mode) {
      const decision = evaluateL11MaterializationPolicy({
        surface_id: e.surface_id,
        mode: e.materialization_mode,
        persistence_class: e.persistence_class,
      });
      if (!decision.admitted) {
        const cls = e.persistence_class;
        const allowed = desc.persistence_classes_allowed.includes(cls);
        if (!allowed) {
          issues.push(makeL11PersistenceIssue(
            L11PersistenceViolationCode.L11P_PERSISTENCE_CLASS_SURFACE_MISMATCH,
            decision.reason, ctxBase));
        } else {
          issues.push(makeL11PersistenceIssue(
            L11PersistenceViolationCode.L11P_MODE_NOT_ALLOWED_FOR_SURFACE,
            decision.reason, ctxBase));
        }
      }
      if (desc.requires_evidence_ref &&
          (!Array.isArray(e.evidence_refs) || e.evidence_refs.length === 0)) {
        issues.push(makeL11PersistenceIssue(
          L11PersistenceViolationCode.L11P_EVIDENCE_REF_MISSING,
          `surface ${e.surface_id} requires evidence_refs`, ctxBase));
      }
      if (isL11FailureWrittenAsScoreState({
        surface_id: e.surface_id,
        persistence_class: e.persistence_class,
      })) {
        issues.push(makeL11PersistenceIssue(
          L11PersistenceViolationCode.L11P_PERSISTENCE_CLASS_SURFACE_MISMATCH,
          'SCORE_FAILURE persistence class only allowed on l11.score_failures',
          ctxBase));
      }
    }
  }

  if (e.policy_version && e.policy_version !== L11_PERSISTENCE_POLICY_VERSION) {
    // Forward-compat: do not reject foreign policy versions; just note via
    // a missing-ish code is incorrect — we only enforce presence.
  }

  return issues;
}
