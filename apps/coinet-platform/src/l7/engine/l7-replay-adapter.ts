/**
 * L7.4 — L7ReplayAdapter
 *
 * §7.4.8.5 — Replay adapters re-drive the runtime DAG against a persisted
 * input snapshot. The adapter guarantees that hash identity is the sole
 * legality criterion for replay success: if the recomputed output's
 * `replay_hash` does not match the persisted one, replay has diverged and
 * the new output must be rejected.
 */

import type { L7ValidationOutputContract } from '../contracts/validation-output.contract';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface ReplayCompareInput {
  readonly persisted: L7ValidationOutputContract;
  readonly recomputed: L7ValidationOutputContract;
  readonly persisted_bundle: L7ContradictionBundleContract | null;
  readonly recomputed_bundle: L7ContradictionBundleContract | null;
}

export interface ReplayCompareResult {
  readonly hash_matches: boolean;
  readonly bundle_hash_matches: boolean;
  readonly validation_class_matches: boolean;
}

export function compareReplay(input: ReplayCompareInput): L7EngineResult<ReplayCompareResult> {
  const violations: L7RuntimeViolation[] = [];
  const hash_matches = input.persisted.replay_hash === input.recomputed.replay_hash;
  const validation_class_matches =
    input.persisted.validation_class === input.recomputed.validation_class;
  const bundle_hash_matches =
    input.persisted_bundle && input.recomputed_bundle
      ? input.persisted_bundle.replay_hash === input.recomputed_bundle.replay_hash
      : (input.persisted_bundle === null && input.recomputed_bundle === null);

  if (!hash_matches) {
    violations.push({
      code: L7RuntimeViolationCode.REPLAY_HASH_DIVERGED,
      source: 'l7-replay-adapter',
      nodeId: null,
      validation_run_id: input.recomputed.compute_run_id,
      validation_subject_id: input.recomputed.validation_subject_id,
      detail: `replay_hash mismatch: persisted=${input.persisted.replay_hash} recomputed=${input.recomputed.replay_hash}`,
      context: {
        persisted: input.persisted.replay_hash,
        recomputed: input.recomputed.replay_hash,
      },
    });
  }
  if (input.recomputed.replay_mode_flag === 'LIVE') {
    violations.push({
      code: L7RuntimeViolationCode.REPLAY_PRETENDS_LIVE,
      source: 'l7-replay-adapter',
      nodeId: null,
      validation_run_id: input.recomputed.compute_run_id,
      validation_subject_id: input.recomputed.validation_subject_id,
      detail: 'replay recomputation must not carry LIVE identity mode',
      context: {},
    });
  }
  // §7.4.8.5 — replay cannot invent new support refs or erase contradiction.
  const persistedSupport = new Set(input.persisted.support_refs);
  for (const ref of input.recomputed.support_refs) {
    if (!persistedSupport.has(ref)) {
      violations.push({
        code: L7RuntimeViolationCode.REPLAY_INVENTED_SUPPORT,
        source: 'l7-replay-adapter',
        nodeId: null,
        validation_run_id: input.recomputed.compute_run_id,
        validation_subject_id: input.recomputed.validation_subject_id,
        detail: `replay invented support ref ${ref}`,
        context: { ref },
      });
    }
  }
  if (
    input.persisted.contradiction_bundle_ref !== null &&
    input.recomputed.contradiction_bundle_ref === null
  ) {
    violations.push({
      code: L7RuntimeViolationCode.REPLAY_ERASED_CONTRADICTION,
      source: 'l7-replay-adapter',
      nodeId: null,
      validation_run_id: input.recomputed.compute_run_id,
      validation_subject_id: input.recomputed.validation_subject_id,
      detail: 'replay erased a persisted contradiction bundle',
      context: {},
    });
  }

  if (violations.length > 0) return fail(violations);
  return ok({ hash_matches, bundle_hash_matches, validation_class_matches });
}
