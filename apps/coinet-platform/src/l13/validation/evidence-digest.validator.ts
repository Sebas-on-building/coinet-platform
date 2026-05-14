/**
 * L13.2 — Evidence Digest Validator
 *
 * §13.2.6 — Validates that every digest references governed
 * evidence, that protected roles are flagged
 * must_preserve_under_compression, and that scores fall in [0,1].
 */

import {
  L13EvidenceRole,
  isL13ProtectedEvidenceRole,
  type L13EvidenceDigest,
} from '../contracts/evidence-digest';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

export function validateL13EvidenceDigests(
  digests: readonly L13EvidenceDigest[],
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  for (const d of digests) {
    if (
      !d.evidence_digest_id ||
      !d.evidence_ref ||
      !d.summary_text
    ) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_EVIDENCE_DIGEST_INVALID,
        severity: L13ViolationSeverity.ERROR,
        subject_ref: d.evidence_digest_id,
        message: 'evidence digest missing id, ref, or summary',
      });
    }
    if (
      d.evidence_strength_score < 0 ||
      d.evidence_strength_score > 1
    ) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_EVIDENCE_DIGEST_INVALID,
        severity: L13ViolationSeverity.ERROR,
        subject_ref: d.evidence_digest_id,
        message: `evidence strength ${d.evidence_strength_score} outside [0,1]`,
      });
    }
    if (
      isL13ProtectedEvidenceRole(d.evidence_role) &&
      !d.must_preserve_under_compression
    ) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_EVIDENCE_DIGEST_INVALID,
        severity: L13ViolationSeverity.CRITICAL,
        subject_ref: d.evidence_digest_id,
        message: `protected role ${d.evidence_role} must flag must_preserve_under_compression`,
      });
    }
    if (
      d.evidence_role === L13EvidenceRole.PRIMARY_CONTRADICTION &&
      d.contradicts_refs.length === 0
    ) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_EVIDENCE_DIGEST_INVALID,
        severity: L13ViolationSeverity.ERROR,
        subject_ref: d.evidence_digest_id,
        message: 'primary contradiction must list contradicts_refs',
      });
    }
  }

  return l13PackageResult(issues);
}
