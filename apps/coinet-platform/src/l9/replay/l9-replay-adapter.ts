/**
 * L9.4 — L9ReplayAdapter
 *
 * §9.4.15.3 — Verifies replay identity. Given a prior emitted output
 * and a freshly recomputed output from the same snapshot, the adapter
 * must:
 *   • assert replay_hash equality
 *   • assert identical primary/secondary sequence state
 *   • assert identical family
 *   • assert ambiguity is not erased on replay
 *   • assert no silent LIVE masquerade under REPLAY
 */

import type { L9SequenceOutputContract } from '../contracts/sequence-output.contract';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';

export interface L9ReplayVerificationResult {
  readonly ok: boolean;
  readonly violations: readonly L9RuntimeViolation[];
}

export function verifyL9ReplayIdentity(
  prior: L9SequenceOutputContract,
  replay: L9SequenceOutputContract,
): L9ReplayVerificationResult {
  const violations: L9RuntimeViolation[] = [];
  const subjectId = prior.sequence_subject_id;

  if (prior.replay_hash !== replay.replay_hash) {
    violations.push(v(
      L9RuntimeViolationCode.REPLAY_HASH_DIVERGED,
      subjectId,
      `replay_hash diverged: prior=${prior.replay_hash} replay=${replay.replay_hash}`,
    ));
  }

  if (prior.sequence_family !== replay.sequence_family) {
    violations.push(v(
      L9RuntimeViolationCode.REPLAY_FAMILY_DRIFT,
      subjectId,
      `family drift: ${prior.sequence_family} → ${replay.sequence_family}`,
    ));
  }

  if (prior.primary_sequence_state !== replay.primary_sequence_state ||
      prior.secondary_sequence_state !== replay.secondary_sequence_state) {
    violations.push(v(
      L9RuntimeViolationCode.REPLAY_STATE_DRIFT,
      subjectId,
      'primary/secondary state drift on replay',
    ));
  }

  if (prior.coexistence_class !== 'CLEAN_SINGLE' &&
      replay.coexistence_class === 'CLEAN_SINGLE') {
    violations.push(v(
      L9RuntimeViolationCode.REPLAY_ERASED_AMBIGUITY,
      subjectId,
      `ambiguity erased on replay: ${prior.coexistence_class} → CLEAN_SINGLE`,
    ));
  }

  if (prior.replay_mode_flag === 'LIVE' && replay.replay_mode_flag === 'LIVE' &&
      replay.compute_run_id !== prior.compute_run_id) {
    violations.push(v(
      L9RuntimeViolationCode.REPLAY_PRETENDS_LIVE,
      subjectId,
      'replay emitted as LIVE with different compute_run_id',
    ));
  }

  if (prior.evidence_pack_ref !== replay.evidence_pack_ref &&
      prior.input_snapshot_ref === replay.input_snapshot_ref) {
    violations.push(v(
      L9RuntimeViolationCode.REPLAY_INVENTED_EVIDENCE,
      subjectId,
      'evidence pack changed under identical input snapshot',
    ));
  }

  return { ok: violations.length === 0, violations };
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'l9-replay-adapter',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
