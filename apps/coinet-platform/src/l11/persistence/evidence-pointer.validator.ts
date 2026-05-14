/**
 * L11.8 — Evidence Pointer Validator (§11.8.9)
 */

import {
  L11EvidencePointer,
  L11_EVIDENCE_CLASS_TO_SUBJECT_KIND,
  isL11DeterministicPathValid,
} from '../contracts/l11-evidence-storage';
import {
  L11PersistenceViolationCode,
  L11PersistenceIssue,
  makeL11PersistenceIssue,
} from './l11-persistence-violation-codes';

export function validateL11EvidencePointer(
  p: L11EvidencePointer,
): L11PersistenceIssue[] {
  const issues: L11PersistenceIssue[] = [];
  const ctx = { evidence_pointer_id: p?.evidence_pointer_id };

  if (!p) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_POINTER_INCOMPLETE,
      'pointer is null/undefined'));
    return issues;
  }

  if (!p.evidence_pointer_id || !p.subject_id || !p.subject_kind ||
      !p.evidence_class || !p.policy_version || !p.created_at) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_POINTER_INCOMPLETE,
      'one or more required fields missing', ctx));
  }
  if (!p.archive_uri) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_ARCHIVE_URI_MISSING,
      'archive_uri missing', ctx));
  }
  if (!p.manifest_ref) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_MANIFEST_MISSING,
      'manifest_ref missing', ctx));
  }
  if (!p.checksum) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_CHECKSUM_MISSING,
      'checksum missing', ctx));
  }
  if (!p.replay_safe_ref) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_REPLAY_REF_MISSING,
      'replay_safe_ref missing', ctx));
  }
  // Subject kind ↔ evidence class (catch class mismatch first if both present)
  if (p.evidence_class && p.subject_kind) {
    const allowed = L11_EVIDENCE_CLASS_TO_SUBJECT_KIND[p.evidence_class];
    if (allowed && !allowed.includes(p.subject_kind)) {
      issues.push(makeL11PersistenceIssue(
        L11PersistenceViolationCode.L11P_EVIDENCE_SUBJECT_KIND_MISMATCH,
        `subject_kind ${p.subject_kind} not allowed for evidence_class ${p.evidence_class}`,
        ctx));
    }
  }
  if (p.deterministic_path) {
    const path = isL11DeterministicPathValid(p.deterministic_path);
    if (!path.ok) {
      const isTraversal = p.deterministic_path.includes('..') ||
                          path.reason.includes('traversal');
      issues.push(makeL11PersistenceIssue(
        isTraversal
          ? L11PersistenceViolationCode.L11P_EVIDENCE_PATH_TRAVERSAL
          : L11PersistenceViolationCode.L11P_EVIDENCE_PATH_INVALID,
        path.reason, { ...ctx, path: p.deterministic_path }));
    }
  } else {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_PATH_INVALID,
      'deterministic_path missing', ctx));
  }
  // Orphan check: must reference at least one of score_id / run_id
  if (!p.score_id && !p.run_id) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_EVIDENCE_POINTER_ORPHANED,
      'pointer references neither score_id nor run_id', ctx));
  }
  return issues;
}
