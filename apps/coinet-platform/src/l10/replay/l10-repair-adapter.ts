/**
 * L10.4 — L10RepairAdapter
 *
 * §10.4.15.4 — Governs `REPAIR`-mode semantics. Repair runs may differ
 * from the LIVE/REPLAY lineage but only under an explicit, auditable
 * reason. The adapter refuses:
 *   - unmarked repair outputs (repair_mode_flag=false under REPAIR mode)
 *   - LIVE masquerade from repair outputs
 *   - broken lineage (missing parent compute_run_id)
 *   - missing repair_reason
 *   - semantic drift (family/primary changes) that is not justified by
 *     the provided reason set
 */

import type {
  L10HypothesisOutputContract,
} from '../contracts/hypothesis-output.contract';
import type { L10HypothesisRun } from '../runtime/hypothesis-compute-run';
import { L10HypothesisRunMode } from '../runtime/hypothesis-compute-run';
import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';

export interface L10RepairVerificationResult {
  readonly ok: boolean;
  readonly violations: readonly L10RuntimeViolation[];
}

export function verifyL10Repair(
  priorRun: L10HypothesisRun,
  repairRun: L10HypothesisRun,
  prior: readonly L10HypothesisOutputContract[],
  repaired: readonly L10HypothesisOutputContract[],
  justifiedSemanticDrift: ReadonlySet<string> = new Set(),
): L10RepairVerificationResult {
  const violations: L10RuntimeViolation[] = [];
  const subjectId =
    prior[0]?.hypothesis_subject_id ?? repaired[0]?.hypothesis_subject_id ??
    null;
  const v = (
    code: L10RuntimeViolationCode,
    detail: string,
    candidateId: string | null = null,
  ): L10RuntimeViolation => ({
    code,
    source: 'l10-repair-adapter',
    nodeId: null,
    hypothesis_run_id: repairRun.hypothesis_run_id ?? null,
    hypothesis_subject_id: subjectId,
    hypothesis_candidate_id: candidateId,
    detail,
    context: { repair_reason: repairRun.repair_reason ?? null },
  });

  if (repairRun.mode !== L10HypothesisRunMode.REPAIR) {
    violations.push(v(
      L10RuntimeViolationCode.REPAIR_UNMARKED,
      `expected REPAIR mode, got ${repairRun.mode}`,
    ));
  }
  if (!repairRun.parent_run_id ||
      repairRun.parent_run_id !== priorRun.hypothesis_run_id) {
    violations.push(v(
      L10RuntimeViolationCode.REPAIR_LINEAGE_BROKEN,
      'repair parent_run_id missing or does not match prior run',
    ));
  }
  if (!repairRun.repair_reason) {
    violations.push(v(
      L10RuntimeViolationCode.REPAIR_REASON_MISSING,
      'repair_reason missing',
    ));
  }

  for (const o of repaired) {
    if (o.replay_mode_flag === 'LIVE') {
      violations.push(v(
        L10RuntimeViolationCode.REPAIR_LIVE_MASQUERADE,
        `repair output emitted as LIVE for ${o.hypothesis_candidate_id}`,
        o.hypothesis_candidate_id,
      ));
    }
    if (!o.repair_mode_flag) {
      violations.push(v(
        L10RuntimeViolationCode.REPAIR_UNMARKED,
        `repair_mode_flag=false on repair output for ${o.hypothesis_candidate_id}`,
        o.hypothesis_candidate_id,
      ));
    }
  }

  const priorByCid = new Map(
    prior.map(o => [o.hypothesis_candidate_id, o]),
  );
  const repairedByCid = new Map(
    repaired.map(o => [o.hypothesis_candidate_id, o]),
  );
  const priorPrimary = prior.find(o => o.rank_position === 1);
  const repairPrimary = repaired.find(o => o.rank_position === 1);
  if (priorPrimary && repairPrimary &&
      priorPrimary.hypothesis_candidate_id !==
        repairPrimary.hypothesis_candidate_id &&
      !justifiedSemanticDrift.has('PRIMARY_SWAP')) {
    violations.push(v(
      L10RuntimeViolationCode.REPAIR_SEMANTIC_DRIFT_UNJUSTIFIED,
      'primary swap not justified by repair reason',
    ));
  }
  for (const [cid, p] of priorByCid) {
    const r = repairedByCid.get(cid);
    if (!r) continue;
    if (p.hypothesis_family !== r.hypothesis_family &&
        !justifiedSemanticDrift.has(`FAMILY_CHANGE:${cid}`)) {
      violations.push(v(
        L10RuntimeViolationCode.REPAIR_SEMANTIC_DRIFT_UNJUSTIFIED,
        `family change for ${cid} not justified`,
        cid,
      ));
    }
  }

  return { ok: violations.length === 0, violations };
}
