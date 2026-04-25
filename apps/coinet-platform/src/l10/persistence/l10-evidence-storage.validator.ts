/**
 * L10.8 — Evidence Storage Validator
 *
 * §10.8.6 / INV-10.8-D — Checks that every evidence pointer is
 * archive-linked, manifest-linked, subject-kind-consistent,
 * checksum-bearing, replay-safe, and written at a deterministic path.
 */

import {
  L10EvidencePointer,
  L10_EVIDENCE_CLASS_SUBJECT_KINDS,
  buildL10DeterministicEvidencePath,
  l10IsLegalEvidencePairing,
} from '../contracts/l10-evidence-storage';
import {
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  L10PersistenceViolationTier,
  l10PersistenceViolationTier,
} from './l10-persistence-violation-codes';

export interface L10EvidenceStorageValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
}

export function validateL10EvidencePointer(
  pointer: L10EvidencePointer,
): L10EvidenceStorageValidationResult {
  const violations: L10PersistenceViolation[] = [];

  if (L10_EVIDENCE_CLASS_SUBJECT_KINDS[pointer.evidence_class] === undefined) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_CLASS_UNREGISTERED,
      `Evidence class ${pointer.evidence_class} is not registered.`,
    ));
    return { ok: false, violations };
  }

  if (!l10IsLegalEvidencePairing(pointer.evidence_class, pointer.subject_kind)) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_SUBJECT_KIND_MISMATCH,
      `Evidence ${pointer.evidence_pointer_id} subject_kind=` +
        `${pointer.subject_kind} is illegal for class ` +
        `${pointer.evidence_class}.`,
    ));
  }

  if (!pointer.hypothesis_subject_id) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_SUBJECT_LINKAGE_MISSING,
      `Evidence ${pointer.evidence_pointer_id} missing ` +
        `hypothesis_subject_id.`,
    ));
  }
  if (!pointer.subject_id) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_SUBJECT_LINKAGE_MISSING,
      `Evidence ${pointer.evidence_pointer_id} missing subject_id.`,
    ));
  }
  if (!pointer.manifest_ref) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_MANIFEST_LINK_MISSING,
      `Evidence ${pointer.evidence_pointer_id} missing manifest_ref.`,
    ));
  }
  if (!pointer.archive_uri) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_ARCHIVE_URI_MISSING,
      `Evidence ${pointer.evidence_pointer_id} missing archive_uri.`,
    ));
  }
  if (!pointer.checksum) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_CHECKSUM_MISSING,
      `Evidence ${pointer.evidence_pointer_id} missing checksum.`,
    ));
  }
  if (!pointer.replay_ref) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_REPLAY_REF_MISSING,
      `Evidence ${pointer.evidence_pointer_id} missing replay_ref.`,
    ));
  }

  // §10.8.6.3 — deterministic path must be reconstructible.
  const reconstructed = buildL10DeterministicEvidencePath({
    evidence_class: pointer.evidence_class,
    subject_kind: pointer.subject_kind,
    subject_id: pointer.subject_id,
    hypothesis_subject_id: pointer.hypothesis_subject_id,
    scope_type: pointer.scope_type,
    scope_id: pointer.scope_id,
    compute_run_id: pointer.compute_run_id,
  });
  if (pointer.deterministic_path !== reconstructed) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC,
      `Evidence ${pointer.evidence_pointer_id} deterministic_path=` +
        `${pointer.deterministic_path} does not match ` +
        `reconstructed=${reconstructed}.`,
    ));
  }

  // §10.8.6.5 — orphan guard: all linkage fields must be non-empty.
  if (
    !pointer.hypothesis_subject_id ||
    !pointer.subject_id ||
    !pointer.manifest_ref ||
    !pointer.archive_uri ||
    !pointer.checksum ||
    !pointer.deterministic_path
  ) {
    violations.push(v(
      L10PersistenceViolationCode.EVID_ORPHAN_BUNDLE,
      `Evidence ${pointer.evidence_pointer_id} is orphan-like: one or ` +
        `more required linkage fields empty.`,
    ));
  }

  return { ok: violations.length === 0, violations };
}

function v(
  code: L10PersistenceViolationCode,
  detail: string,
  offending_refs?: readonly string[],
): L10PersistenceViolation {
  return {
    code,
    tier: l10PersistenceViolationTier(code) as L10PersistenceViolationTier,
    detail,
    offending_refs,
  };
}
