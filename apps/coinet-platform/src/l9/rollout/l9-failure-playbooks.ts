/**
 * L9.9 — Failure Playbooks
 *
 * §9.9.7.3 / §9.9.4.1 INV-9.9-F — A registered failure playbook is
 * required for every recognized L9 failure class. Absence of a playbook
 * for a recognized failure class raises `FAILURE_PLAYBOOK_MISSING`
 * during ratification.
 *
 * A playbook names the failure class, a short remediation path, the
 * rollback class(es) it authorizes, and the downstream posture during
 * remediation. Playbooks are declarative metadata, not executable
 * code; they exist so that governance reviews never approve a ratified
 * Layer 9 without documented remediation.
 */

import {
  L9RatificationViolationCode,
} from '../contracts/l9-completion-standard';
import {
  L9RollbackClass,
  L9_LEGAL_ROLLBACK_CLASSES,
} from './l9-rollback-policy';

export enum L9FailureClass {
  PERSISTENCE_DRIFT = 'PERSISTENCE_DRIFT',
  EVIDENCE_LOSS = 'EVIDENCE_LOSS',
  REPLAY_MISMATCH = 'REPLAY_MISMATCH',
  REPAIR_INSTABILITY = 'REPAIR_INSTABILITY',
  CONFIDENCE_DRIFT = 'CONFIDENCE_DRIFT',
  TEMPLATE_MISCLASSIFICATION = 'TEMPLATE_MISCLASSIFICATION',
  READ_SURFACE_OUTAGE = 'READ_SURFACE_OUTAGE',
  DOWNSTREAM_BREACH = 'DOWNSTREAM_BREACH',
  FORBIDDEN_DEPENDENCY_ATTEMPT = 'FORBIDDEN_DEPENDENCY_ATTEMPT',
  RATIFICATION_CORRUPTION = 'RATIFICATION_CORRUPTION',
}

export const ALL_L9_FAILURE_CLASSES: readonly L9FailureClass[] =
  Object.values(L9FailureClass);

export interface L9FailurePlaybook {
  readonly failure_class: L9FailureClass;
  readonly remediation_summary: string;
  readonly authorized_rollback_classes: readonly L9RollbackClass[];
  readonly downstream_posture: 'MAINTAIN' | 'FENCE' | 'HARD_ROLLBACK';
  readonly requires_rerun_master_certification: boolean;
}

export const L9_FAILURE_PLAYBOOKS: readonly L9FailurePlaybook[] =
  Object.freeze([
    {
      failure_class: L9FailureClass.PERSISTENCE_DRIFT,
      remediation_summary:
        'Reconcile Postgres current authority against replay manifest; ' +
        'rebuild from evidence archive; block downstream reads until ' +
        'reconciliation hash matches ratified state.',
      authorized_rollback_classes: [L9RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L9FailureClass.EVIDENCE_LOSS,
      remediation_summary:
        'Restore object-store evidence pack from archive; verify ' +
        'deterministic path + checksum; re-link manifest; if not ' +
        'recoverable, mark affected sequences UNRESOLVED and repair.',
      authorized_rollback_classes: [
        L9RollbackClass.FENCE_DOWNSTREAM,
        L9RollbackClass.DISABLE_TEMPLATE,
      ],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L9FailureClass.REPLAY_MISMATCH,
      remediation_summary:
        'Quarantine mismatched replay run; regenerate deterministic ' +
        'outputs; compare replay hashes; if drift persists, downgrade ' +
        'to SHADOW phase pending reclassification.',
      authorized_rollback_classes: [
        L9RollbackClass.ROLL_BACK_PHASE,
        L9RollbackClass.FENCE_DOWNSTREAM,
      ],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L9FailureClass.REPAIR_INSTABILITY,
      remediation_summary:
        'Block repair-mode reads; snapshot current repair state; ' +
        're-run repair under isolation; reconcile with historical fact ' +
        'surface; only re-expose once repair stabilizes.',
      authorized_rollback_classes: [L9RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L9FailureClass.CONFIDENCE_DRIFT,
      remediation_summary:
        'Audit cap-chain inputs for unseen contradiction/restriction ' +
        'posture leakage; recalibrate confidence weights within ' +
        'ratified bounds; rerun INV-9.7 suite.',
      authorized_rollback_classes: [L9RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: true,
    },
    {
      failure_class: L9FailureClass.TEMPLATE_MISCLASSIFICATION,
      remediation_summary:
        'Disable affected template; re-examine rollout priority + ' +
        'family coexistence rules; escalate extension proposal if law ' +
        'change is required.',
      authorized_rollback_classes: [L9RollbackClass.DISABLE_TEMPLATE],
      downstream_posture: 'MAINTAIN',
      requires_rerun_master_certification: false,
    },
    {
      failure_class: L9FailureClass.READ_SURFACE_OUTAGE,
      remediation_summary:
        'Fence downstream consumers; restore read surface from governed ' +
        'cache or rebuild via Postgres current authority; verify ' +
        'read-mode matrix intact.',
      authorized_rollback_classes: [L9RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: false,
    },
    {
      failure_class: L9FailureClass.DOWNSTREAM_BREACH,
      remediation_summary:
        'Revoke breaching consumer credentials; re-run handoff ' +
        'validator with offending request; deny forbidden access kinds ' +
        'explicitly; notify governance.',
      authorized_rollback_classes: [L9RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'FENCE',
      requires_rerun_master_certification: false,
    },
    {
      failure_class: L9FailureClass.FORBIDDEN_DEPENDENCY_ATTEMPT,
      remediation_summary:
        'Record the attempted access kind, surface the violation ' +
        'in the L9 final audit, and block the consumer until extension ' +
        'policy classifies any proposed change.',
      authorized_rollback_classes: [L9RollbackClass.FENCE_DOWNSTREAM],
      downstream_posture: 'MAINTAIN',
      requires_rerun_master_certification: false,
    },
    {
      failure_class: L9FailureClass.RATIFICATION_CORRUPTION,
      remediation_summary:
        'Treat active ratification as invalid; roll back to last ' +
        'known-good artifact; fence downstream; rerun full master ' +
        'certification before re-ratification.',
      authorized_rollback_classes: [
        L9RollbackClass.ROLL_BACK_PHASE,
        L9RollbackClass.FENCE_DOWNSTREAM,
      ],
      downstream_posture: 'HARD_ROLLBACK',
      requires_rerun_master_certification: true,
    },
  ]);

const playbookByClass: ReadonlyMap<L9FailureClass, L9FailurePlaybook> =
  new Map(L9_FAILURE_PLAYBOOKS.map(p => [p.failure_class, p]));

export function getL9FailurePlaybook(
  fc: L9FailureClass,
): L9FailurePlaybook | null {
  return playbookByClass.get(fc) ?? null;
}

export interface L9FailurePlaybookCoverage {
  readonly all_covered: boolean;
  readonly missing: readonly L9FailureClass[];
  readonly violations: readonly L9RatificationViolationCode[];
}

/**
 * §9.9.4.1 INV-9.9-F — Every recognized failure class must have a
 * registered playbook whose authorized rollback classes are a subset
 * of the legal rollback set, and whose remediation summary is
 * non-empty.
 */
export function verifyL9FailurePlaybookCoverage():
  L9FailurePlaybookCoverage {
  const missing: L9FailureClass[] = [];
  const violations: L9RatificationViolationCode[] = [];

  for (const fc of ALL_L9_FAILURE_CLASSES) {
    const pb = playbookByClass.get(fc);
    if (!pb) {
      missing.push(fc);
      violations.push(
        L9RatificationViolationCode.FAILURE_PLAYBOOK_MISSING);
      continue;
    }
    if (pb.remediation_summary.trim().length === 0) {
      violations.push(
        L9RatificationViolationCode.FAILURE_PLAYBOOK_MISSING);
      continue;
    }
    for (const rc of pb.authorized_rollback_classes) {
      if (!L9_LEGAL_ROLLBACK_CLASSES.includes(rc)) {
        violations.push(
          L9RatificationViolationCode.FAILURE_PLAYBOOK_MISSING);
      }
    }
  }

  return {
    all_covered: missing.length === 0 && violations.length === 0,
    missing,
    violations,
  };
}
