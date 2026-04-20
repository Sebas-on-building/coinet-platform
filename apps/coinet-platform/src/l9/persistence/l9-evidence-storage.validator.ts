/**
 * L9.8 — Evidence Storage Validator
 *
 * §9.8.6 / INV-9.8-D — Checks that every evidence pointer is
 * archive-linked, manifest-linked, subject-kind-consistent,
 * checksum-bearing, replay-safe, and written at a deterministic path.
 */

import {
  L9EvidencePointer,
  L9_EVIDENCE_PATH_PREFIX_BY_CLASS,
  L9_EVIDENCE_SUBJECT_KIND_BY_CLASS,
  buildL9DeterministicEvidencePath,
  l9EvidencePointerHasRequiredLinkage,
} from '../contracts/l9-evidence-storage';
import {
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from './l9-persistence-violation-codes';

export interface L9EvidenceStorageValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
}

export function validateL9EvidencePointer(
  pointer: L9EvidencePointer,
): L9EvidenceStorageValidationResult {
  const violations: L9PersistenceViolation[] = [];

  const expectedPrefix = L9_EVIDENCE_PATH_PREFIX_BY_CLASS[pointer.evidence_class];
  const expectedKind = L9_EVIDENCE_SUBJECT_KIND_BY_CLASS[pointer.evidence_class];
  if (expectedPrefix === undefined || expectedKind === undefined) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_CLASS_UNREGISTERED,
      `Evidence class ${pointer.evidence_class} is not registered.`,
    ));
    return { ok: false, violations };
  }

  if (pointer.subject_kind !== expectedKind) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_SUBJECT_KIND_MISMATCH,
      `Evidence ${pointer.evidence_id} subject_kind=${pointer.subject_kind} ` +
        `but class ${pointer.evidence_class} requires ${expectedKind}.`,
    ));
  }

  if (!pointer.sequence_subject_id) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_SUBJECT_LINKAGE_MISSING,
      `Evidence ${pointer.evidence_id} missing sequence_subject_id.`,
    ));
  }
  if (!pointer.manifest_id) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_MANIFEST_LINK_MISSING,
      `Evidence ${pointer.evidence_id} missing manifest_id.`,
    ));
  }
  if (!pointer.archive_uri) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_ARCHIVE_URI_MISSING,
      `Evidence ${pointer.evidence_id} missing archive_uri.`,
    ));
  }
  if (!pointer.checksum_sha256) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_CHECKSUM_MISSING,
      `Evidence ${pointer.evidence_id} missing checksum_sha256.`,
    ));
  }
  if (!pointer.replay_ref) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_REPLAY_REF_MISSING,
      `Evidence ${pointer.evidence_id} missing replay_ref.`,
    ));
  }

  // §9.8.6.3 — deterministic path must be reconstructible.
  const reconstructed = buildL9DeterministicEvidencePath({
    evidence_class: pointer.evidence_class,
    scope_type: pointer.scope_type,
    scope_id: pointer.scope_id,
    as_of: pointer.as_of,
    evidence_id: pointer.evidence_id,
  });
  if (pointer.deterministic_path !== reconstructed) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC,
      `Evidence ${pointer.evidence_id} deterministic_path=` +
        `${pointer.deterministic_path} does not match ` +
        `reconstructed=${reconstructed}.`,
    ));
  }
  if (!pointer.deterministic_path.startsWith(expectedPrefix + '/')) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_PATH_NOT_DETERMINISTIC,
      `Evidence ${pointer.evidence_id} path prefix mismatch: ` +
        `expected ${expectedPrefix}/… got ${pointer.deterministic_path}.`,
    ));
  }

  if (!l9EvidencePointerHasRequiredLinkage(pointer)) {
    violations.push(v(
      L9PersistenceViolationCode.EVID_ORPHAN_BUNDLE,
      `Evidence ${pointer.evidence_id} is orphan-like: one or more ` +
        `required linkage fields empty.`,
    ));
  }

  return { ok: violations.length === 0, violations };
}

function v(
  code: L9PersistenceViolationCode,
  detail: string,
  offending_refs?: readonly string[],
): L9PersistenceViolation {
  return {
    code,
    tier: l9PersistenceViolationTier(code) as L9PersistenceViolationTier,
    detail,
    offending_refs,
  };
}
