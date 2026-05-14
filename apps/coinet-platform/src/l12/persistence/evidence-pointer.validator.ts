/**
 * L12.6 — Evidence pointer validator (§12.6.10).
 */

import {
  L12_EVIDENCE_CLASS_SUBJECT_KIND,
  L12EvidencePointer,
  isL12EvidenceArchivePathLegal,
} from '../contracts/l12-evidence-storage';
import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from './l12-persistence-violation-codes';

export function validateL12EvidencePointer(
  pointer: L12EvidencePointer,
  ctx?: {
    /** When true, treat the pointer as having no scenario set anchor. */
    readonly is_orphaned?: boolean;
    /** When true, evidence archive was written outside the L5 route. */
    readonly archive_outside_l5?: boolean;
  },
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  const required: Array<[keyof L12EvidencePointer, string]> = [
    ['archive_uri', 'archive_uri'],
    ['manifest_ref', 'manifest_ref'],
    ['checksum', 'checksum'],
    ['replay_safe_ref', 'replay_safe_ref'],
    ['created_by_run_id', 'created_by_run_id'],
    ['scenario_subject_id', 'scenario_subject_id'],
    ['scope_type', 'scope_type'],
    ['scope_id', 'scope_id'],
    ['as_of', 'as_of'],
    ['subject_id', 'subject_id'],
    ['replay_hash', 'replay_hash'],
  ];
  for (const [key, label] of required) {
    const v = pointer[key] as unknown;
    if (typeof v !== 'string' || v.trim() === '') {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_EVIDENCE_POINTER_INCOMPLETE,
          `evidence pointer missing ${label}`,
          pointer.evidence_pointer_id,
        ),
      );
    }
  }

  if (!pointer.checksum || pointer.checksum.trim() === '') {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_EVIDENCE_CHECKSUM_MISSING,
        'evidence pointer missing checksum',
        pointer.evidence_pointer_id,
      ),
    );
  }
  if (!pointer.replay_safe_ref || pointer.replay_safe_ref.trim() === '') {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_EVIDENCE_REPLAY_REF_MISSING,
        'evidence pointer missing replay_safe_ref',
        pointer.evidence_pointer_id,
      ),
    );
  }

  if (!Array.isArray(pointer.lineage_refs) || pointer.lineage_refs.length === 0) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_EVIDENCE_LINEAGE_MISSING,
        'evidence pointer missing lineage_refs',
        pointer.evidence_pointer_id,
      ),
    );
  }

  // Subject-kind ↔ class match
  const allowedKinds = L12_EVIDENCE_CLASS_SUBJECT_KIND[pointer.evidence_class] ?? [];
  if (!allowedKinds.includes(pointer.subject_kind)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_EVIDENCE_SUBJECT_KIND_MISMATCH,
        `evidence_class ${pointer.evidence_class} does not allow subject_kind ${pointer.subject_kind}`,
        pointer.evidence_pointer_id,
      ),
    );
  }

  // Deterministic path
  if (!isL12EvidenceArchivePathLegal(pointer.archive_uri)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_EVIDENCE_PATH_NON_DETERMINISTIC,
        `evidence archive_uri ${pointer.archive_uri} does not match canonical pattern`,
        pointer.evidence_pointer_id,
      ),
    );
  }

  if (ctx?.is_orphaned === true) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_EVIDENCE_ORPHANED,
        'evidence pointer is orphaned from any scenario set',
        pointer.evidence_pointer_id,
      ),
    );
  }
  if (ctx?.archive_outside_l5 === true) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_EVIDENCE_ARCHIVE_OUTSIDE_L5,
        'evidence archive write happened outside L5 route',
        pointer.evidence_pointer_id,
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}
