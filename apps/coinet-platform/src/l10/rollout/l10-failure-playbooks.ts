/**
 * L10.9 — Failure Playbooks
 *
 * §10.9.11.5 / §10.9.13 INV-10.9-F — A registered failure playbook
 * is required for every recognized L10 failure class. Absence of a
 * playbook for a recognized failure class raises
 * `FAILURE_PLAYBOOK_MISSING` during ratification.
 *
 * A playbook names the failure class, a short remediation path, the
 * rollback class(es) it authorizes, and the downstream posture
 * during remediation. Playbooks are declarative metadata, not
 * executable code; they exist so that governance reviews never
 * approve a ratified Layer 10 without documented remediation.
 */

import {
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';
import {
  L10RollbackClass,
  L10_LEGAL_ROLLBACK_CLASSES,
} from './l10-rollback-policy';

export enum L10FailureClass {
  HYPOTHESIS_RANKING_DRIFT = 'HYPOTHESIS_RANKING_DRIFT',
  SPREAD_RELIANCE_MISMATCH = 'SPREAD_RELIANCE_MISMATCH',
  SHIFT_CONDITION_OMISSION = 'SHIFT_CONDITION_OMISSION',
  PERSISTENCE_DIVERGENCE = 'PERSISTENCE_DIVERGENCE',
  REPLAY_MISMATCH = 'REPLAY_MISMATCH',
  REPAIR_INSTABILITY = 'REPAIR_INSTABILITY',
  EVIDENCE_LOSS = 'EVIDENCE_LOSS',
  DOWNSTREAM_NO_REBUILD_VIOLATION = 'DOWNSTREAM_NO_REBUILD_VIOLATION',
  FINAL_JUDGMENT_LEAKAGE = 'FINAL_JUDGMENT_LEAKAGE',
  SINGLE_STORY_COLLAPSE_REGRESSION =
    'SINGLE_STORY_COLLAPSE_REGRESSION',
  TEMPLATE_SEMANTIC_REGRESSION = 'TEMPLATE_SEMANTIC_REGRESSION',
  READ_SURFACE_OUTAGE = 'READ_SURFACE_OUTAGE',
  FORBIDDEN_DEPENDENCY_ATTEMPT = 'FORBIDDEN_DEPENDENCY_ATTEMPT',
  RATIFICATION_CORRUPTION = 'RATIFICATION_CORRUPTION',
}

export const ALL_L10_FAILURE_CLASSES: readonly L10FailureClass[] =
  Object.values(L10FailureClass);

export interface L10FailurePlaybook {
  readonly failure_class: L10FailureClass;
  readonly remediation_summary: string;
  readonly authorized_rollback_classes: readonly L10RollbackClass[];
  readonly downstream_posture: 'MAINTAIN' | 'FENCE' | 'HARD_ROLLBACK';
  readonly requires_rerun_master_certification: boolean;
}

export const L10_FAILURE_PLAYBOOKS: readonly L10FailurePlaybook[] =
  Object.freeze([
    {
      failure_class: L10FailureClass.HYPOTHESIS_RANKING_DRIFT,
      remediation_summary:
        'Audit ranking inputs (support/contradiction/confirmation/' +
        'invalidation/regime/sequence posture) for drift; recompute ' +
        'ranking against historical baseline; if drift persists, ' +
        'fence downstream and reclassify under template review.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.SPREAD_RELIANCE_MISMATCH,
      remediation_summary:
        'Cross-check reliance profile against spread profile; if ' +
        'narrow spread is exposed without spread restriction, fence ' +
        'reliance reads and recompute cap chain under contradiction ' +
        '+ regime + sequence posture.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.SHIFT_CONDITION_OMISSION,
      remediation_summary:
        'Block reliance + ranking reads; recompute shift-condition ' +
        'set per template law; if omission persists, downgrade ' +
        'affected templates to SHADOW until regenerated.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM,
        L10RollbackClass.DISABLE_TEMPLATE],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.PERSISTENCE_DIVERGENCE,
      remediation_summary:
        'Reconcile Postgres current authority against replay ' +
        'manifest; rebuild from evidence archive; block downstream ' +
        'reads until reconciliation hash matches ratified state.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.REPLAY_MISMATCH,
      remediation_summary:
        'Quarantine mismatched replay run; regenerate deterministic ' +
        'outputs; compare replay hashes; if drift persists, ' +
        'downgrade to SHADOW phase pending reclassification.',
      authorized_rollback_classes: [
        L10RollbackClass.ROLL_BACK_PHASE,
        L10RollbackClass.FENCE_DOWNSTREAM,
      ],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.REPAIR_INSTABILITY,
      remediation_summary:
        'Block repair-mode reads; snapshot current repair state; ' +
        're-run repair under isolation; reconcile with historical ' +
        'fact surface; only re-expose once repair stabilizes.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.EVIDENCE_LOSS,
      remediation_summary:
        'Restore object-store evidence pack from archive; verify ' +
        'deterministic path + checksum; re-link manifest; if not ' +
        'recoverable, mark affected hypotheses UNRESOLVED and ' +
        'repair.',
      authorized_rollback_classes: [
        L10RollbackClass.FENCE_DOWNSTREAM,
        L10RollbackClass.DISABLE_TEMPLATE,
      ],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.DOWNSTREAM_NO_REBUILD_VIOLATION,
      remediation_summary:
        'Revoke breaching consumer credentials; re-run handoff ' +
        'validator with offending request; deny live raw rebuild ' +
        'attempts explicitly; notify governance.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: false,
    },
    {
      failure_class: L10FailureClass.FINAL_JUDGMENT_LEAKAGE,
      remediation_summary:
        'Treat leakage as critical breach; block emission of ' +
        'affected outputs; revoke consumer access; classify any ' +
        'proposed change introducing such semantics as PROHIBITED ' +
        'via the extension policy.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'HARD_ROLLBACK',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.SINGLE_STORY_COLLAPSE_REGRESSION,
      remediation_summary:
        'Restore alternative-preservation guarantees; recompute ' +
        'spread + shift conditions; downgrade affected templates to ' +
        'SHADOW until single-story behaviour is eliminated.',
      authorized_rollback_classes: [
        L10RollbackClass.FENCE_DOWNSTREAM,
        L10RollbackClass.DISABLE_TEMPLATE,
      ],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L10FailureClass.TEMPLATE_SEMANTIC_REGRESSION,
      remediation_summary:
        'Disable affected template; re-examine rollout priority + ' +
        'family coexistence rules; escalate extension proposal if ' +
        'law change is required.',
      authorized_rollback_classes: [L10RollbackClass.DISABLE_TEMPLATE],
      downstream_posture: 'MAINTAIN',
      requires_rerun_master_certification: false,
    },
    {
      failure_class: L10FailureClass.READ_SURFACE_OUTAGE,
      remediation_summary:
        'Fence downstream consumers; restore read surface from ' +
        'governed cache or rebuild via Postgres current authority; ' +
        'verify read-mode matrix intact.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: false,
    },
    {
      failure_class: L10FailureClass.FORBIDDEN_DEPENDENCY_ATTEMPT,
      remediation_summary:
        'Record the attempted access kind, surface the violation ' +
        'in the L10 final audit, and block the consumer until ' +
        'extension policy classifies any proposed change.',
      authorized_rollback_classes: [L10RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'MAINTAIN',
      requires_rerun_master_certification: false,
    },
    {
      failure_class: L10FailureClass.RATIFICATION_CORRUPTION,
      remediation_summary:
        'Treat active ratification as invalid; roll back to last ' +
        'known-good artifact; fence downstream; rerun full master ' +
        'certification before re-ratification.',
      authorized_rollback_classes: [
        L10RollbackClass.ROLL_BACK_PHASE,
        L10RollbackClass.FENCE_DOWNSTREAM,
      ],
      downstream_posture: 'HARD_ROLLBACK',
      requires_rerun_master_certification: true,
    },
  ]);

const playbookByClass: ReadonlyMap<L10FailureClass, L10FailurePlaybook> =
  new Map(L10_FAILURE_PLAYBOOKS.map(p => [p.failure_class, p]));

export function getL10FailurePlaybook(
  fc: L10FailureClass,
): L10FailurePlaybook | null {
  return playbookByClass.get(fc) ?? null;
}

export interface L10FailurePlaybookCoverage {
  readonly all_covered: boolean;
  readonly missing: readonly L10FailureClass[];
  readonly violations: readonly L10RatificationViolationCode[];
}

/**
 * §10.9.13 INV-10.9-F — Every recognized failure class must have a
 * registered playbook whose authorized rollback classes are a
 * subset of the legal rollback set, and whose remediation summary
 * is non-empty.
 */
export function verifyL10FailurePlaybookCoverage():
  L10FailurePlaybookCoverage {
  const missing: L10FailureClass[] = [];
  const violations: L10RatificationViolationCode[] = [];

  for (const fc of ALL_L10_FAILURE_CLASSES) {
    const pb = playbookByClass.get(fc);
    if (!pb) {
      missing.push(fc);
      violations.push(
        L10RatificationViolationCode.FAILURE_PLAYBOOK_MISSING);
      continue;
    }
    if (pb.remediation_summary.trim().length === 0) {
      violations.push(
        L10RatificationViolationCode.FAILURE_PLAYBOOK_MISSING);
      continue;
    }
    for (const rc of pb.authorized_rollback_classes) {
      if (!L10_LEGAL_ROLLBACK_CLASSES.includes(rc)) {
        violations.push(
          L10RatificationViolationCode.FAILURE_PLAYBOOK_MISSING);
      }
    }
  }

  return {
    all_covered: missing.length === 0 && violations.length === 0,
    missing,
    violations,
  };
}
