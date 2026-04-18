/**
 * L8.4 — L8ReplayAdapter
 *
 * §8.4.7.4 — Runs in replay mode explicitly. Compares replay hash to
 * the original parent run, rejects replay outputs that invent evidence
 * or hide ambiguity, and preserves parent-run lineage.
 */

import {
  L8RegimeRun,
  L8RegimeRunMode,
} from '../runtime/regime-compute-run';
import type { L8RegimeOutputContract } from '../contracts/regime-output.contract';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from '../engine/engine-types';

export interface L8ReplayVerificationInput {
  readonly replay_run: L8RegimeRun;
  readonly original_output: L8RegimeOutputContract;
  readonly replayed_output: L8RegimeOutputContract;
  readonly original_evidence_pack_ref: string;
  readonly replayed_evidence_pack_ref: string;
}

export interface L8ReplayVerificationResult {
  readonly hashes_match: boolean;
  readonly preserves_ambiguity: boolean;
  readonly preserves_lineage: boolean;
}

export function verifyRegimeReplay(
  input: L8ReplayVerificationInput,
): L8EngineResult<L8ReplayVerificationResult> {
  const violations: L8RuntimeViolation[] = [];
  const run = input.replay_run;

  if (run.mode !== L8RegimeRunMode.REPLAY) {
    violations.push(v(
      L8RuntimeViolationCode.REPLAY_PRETENDS_LIVE, run,
      `replay adapter invoked with mode=${run.mode}`, { mode: run.mode },
    ));
    return fail(violations);
  }

  if (!run.parent_run_id) {
    violations.push(v(
      L8RuntimeViolationCode.REPAIR_LINEAGE_BROKEN, run,
      'replay run requires parent_run_id', {},
    ));
    return fail(violations);
  }

  const hashesMatch =
    input.original_output.replay_hash === input.replayed_output.replay_hash;
  if (!hashesMatch) {
    violations.push(v(
      L8RuntimeViolationCode.REPLAY_HASH_DIVERGED, run,
      `replay hash diverged: ${input.original_output.replay_hash} != ${input.replayed_output.replay_hash}`,
      {
        original: input.original_output.replay_hash,
        replayed: input.replayed_output.replay_hash,
      },
    ));
  }

  // §8.4.7.4 — hidden ambiguity: replayed output claims CLEAN_SINGLE
  // when the original was AMBIGUOUS_MULTI_CANDIDATE / TRANSITIONAL_OVERLAP
  const originalCoex = input.original_output.coexistence_class;
  const replayedCoex = input.replayed_output.coexistence_class;
  const preservesAmbiguity =
    originalCoex === replayedCoex ||
    !(replayedCoex === 'CLEAN_SINGLE' &&
      (originalCoex === 'AMBIGUOUS_MULTI_CANDIDATE' ||
       originalCoex === 'TRANSITIONAL_OVERLAP'));
  if (!preservesAmbiguity) {
    violations.push(v(
      L8RuntimeViolationCode.REPLAY_ERASED_AMBIGUITY, run,
      `replay erased coexistence from ${originalCoex} to ${replayedCoex}`,
      { originalCoex, replayedCoex },
    ));
  }

  // §8.4.7.4 — invented evidence: replay pack ref differs structurally
  const inventedEvidence =
    input.original_evidence_pack_ref !== input.replayed_evidence_pack_ref &&
    input.replayed_evidence_pack_ref.length > 0 &&
    !input.replayed_evidence_pack_ref.startsWith(
      input.original_evidence_pack_ref.split(':').slice(0, 2).join(':'),
    );
  if (inventedEvidence) {
    violations.push(v(
      L8RuntimeViolationCode.REPLAY_INVENTED_EVIDENCE, run,
      'replay evidence pack ref structurally diverged from original',
      {
        original: input.original_evidence_pack_ref,
        replayed: input.replayed_evidence_pack_ref,
      },
    ));
  }

  const preservesLineage =
    input.replayed_output.lineage_refs.trace_id ===
      input.original_output.lineage_refs.trace_id ||
    run.parent_run_id === input.original_output.compute_run_id;
  if (!preservesLineage) {
    violations.push(v(
      L8RuntimeViolationCode.REPAIR_LINEAGE_BROKEN, run,
      'replay lineage broken: trace_id and parent_run_id both missing link',
      {},
    ));
  }

  if (violations.length > 0) return fail(violations);

  return ok({
    hashes_match: hashesMatch,
    preserves_ambiguity: preservesAmbiguity,
    preserves_lineage: preservesLineage,
  });
}

function v(
  code: L8RuntimeViolationCode,
  run: L8RegimeRun,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'l8-replay-adapter',
    nodeId: null,
    regime_run_id: run.regime_run_id,
    regime_subject_id: null,
    detail,
    context,
  };
}
