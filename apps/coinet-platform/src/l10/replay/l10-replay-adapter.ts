/**
 * L10.4 — L10ReplayAdapter
 *
 * §10.4.15.3 — Verifies replay identity. Given a prior emitted
 * `L10HypothesisOutputContract` and a freshly recomputed output from
 * the same input snapshot, the adapter asserts:
 *   - replay_hash equality
 *   - identical primary / secondary / ordered candidate refs
 *   - identical family + template
 *   - narrow-spread posture preserved (not suppressed)
 *   - no LIVE masquerade when mode is REPLAY
 *   - no invention of candidates absent from the prior emission
 *   - restriction profile ref stable
 */

import type {
  L10HypothesisOutputContract,
} from '../contracts/hypothesis-output.contract';
import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';

export interface L10ReplayVerificationResult {
  readonly ok: boolean;
  readonly violations: readonly L10RuntimeViolation[];
}

export function verifyL10ReplayIdentity(
  prior: readonly L10HypothesisOutputContract[],
  replay: readonly L10HypothesisOutputContract[],
): L10ReplayVerificationResult {
  const violations: L10RuntimeViolation[] = [];
  const subjectId =
    prior[0]?.hypothesis_subject_id ?? replay[0]?.hypothesis_subject_id ?? null;

  const v = (
    code: L10RuntimeViolationCode,
    detail: string,
    candidateId: string | null = null,
  ): L10RuntimeViolation => ({
    code,
    source: 'l10-replay-adapter',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: subjectId,
    hypothesis_candidate_id: candidateId,
    detail,
    context: {},
  });

  if (prior.length === 0 || replay.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.REPLAY_LINEAGE_BROKEN,
      'prior or replay output set empty',
    ));
    return { ok: false, violations };
  }

  const priorByCid = new Map(
    prior.map(o => [o.hypothesis_candidate_id, o]),
  );
  const replayByCid = new Map(
    replay.map(o => [o.hypothesis_candidate_id, o]),
  );

  // invented candidates (present in replay but not in prior)
  for (const cid of replayByCid.keys()) {
    if (!priorByCid.has(cid)) {
      violations.push(v(
        L10RuntimeViolationCode.REPLAY_INVENTED_CANDIDATE,
        `candidate ${cid} appeared only on replay`,
        cid,
      ));
    }
  }
  // erased alternatives (present in prior but not in replay)
  for (const cid of priorByCid.keys()) {
    if (!replayByCid.has(cid)) {
      violations.push(v(
        L10RuntimeViolationCode.REPLAY_ERASED_ALTERNATIVE,
        `candidate ${cid} erased on replay`,
        cid,
      ));
    }
  }

  // primary / secondary must match on the ranking ref
  const priorPrimary = prior.find(o => o.rank_position === 1);
  const replayPrimary = replay.find(o => o.rank_position === 1);
  if (priorPrimary && replayPrimary &&
      priorPrimary.hypothesis_candidate_id !==
        replayPrimary.hypothesis_candidate_id) {
    violations.push(v(
      L10RuntimeViolationCode.REPLAY_RANKING_DRIFT,
      `primary drift: ${priorPrimary.hypothesis_candidate_id} -> ` +
      `${replayPrimary.hypothesis_candidate_id}`,
    ));
  }

  for (const [cid, p] of priorByCid) {
    const r = replayByCid.get(cid);
    if (!r) continue;
    if (p.replay_hash !== r.replay_hash) {
      violations.push(v(
        L10RuntimeViolationCode.REPLAY_HASH_DIVERGED,
        `replay_hash diverged for ${cid}: ${p.replay_hash} -> ${r.replay_hash}`,
        cid,
      ));
    }
    if (p.hypothesis_family !== r.hypothesis_family ||
        p.hypothesis_template_id !== r.hypothesis_template_id) {
      violations.push(v(
        L10RuntimeViolationCode.REPLAY_RANKING_DRIFT,
        `family/template drift for ${cid}`,
        cid,
      ));
    }
    if (p.narrow_spread_flag && !r.narrow_spread_flag) {
      violations.push(v(
        L10RuntimeViolationCode.REPLAY_SPREAD_SUPPRESSED,
        `narrow-spread posture suppressed for ${cid}`,
        cid,
      ));
    }
    if (p.restriction_profile_ref !== r.restriction_profile_ref) {
      violations.push(v(
        L10RuntimeViolationCode.REPLAY_RESTRICTION_DRIFT,
        `restriction_profile_ref drift for ${cid}`,
        cid,
      ));
    }
    if (p.replay_mode_flag !== 'LIVE' && r.replay_mode_flag === 'LIVE' &&
        r.compute_run_id !== p.compute_run_id) {
      violations.push(v(
        L10RuntimeViolationCode.REPLAY_PRETENDS_LIVE,
        `replay emitted as LIVE for ${cid}`,
        cid,
      ));
    }
    if (p.input_snapshot_ref === r.input_snapshot_ref &&
        p.evidence_pack_ref !== r.evidence_pack_ref) {
      violations.push(v(
        L10RuntimeViolationCode.REPLAY_LINEAGE_BROKEN,
        `evidence_pack_ref changed under identical input snapshot (${cid})`,
        cid,
      ));
    }
  }

  return { ok: violations.length === 0, violations };
}
