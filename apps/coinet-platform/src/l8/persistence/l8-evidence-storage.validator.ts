/**
 * L8.8 — Evidence Storage Validator
 *
 * §8.8.6 — Enforces evidence storage law:
 *   - required anchors: archive_uri, checksum, manifest, subject
 *   - class / subject-kind compatibility
 *   - deterministic archive path matching expected builder
 *   - replay-generation-ref presence when required
 *   - orphan-evidence ban
 */

import {
  L8EvidenceClass,
  L8EvidencePointer,
  L8EvidencePointerCheckContext,
  L8EvidenceSubjectKind,
  L8_EVIDENCE_CLASS_SUBJECT_KIND,
  evidencePathFor,
} from '../contracts/l8-evidence-storage';
import {
  L8PersistenceViolation,
  L8PersistenceViolationCode,
  buildL8PersistenceViolation,
} from './l8-persistence-violation-codes';

export interface L8EvidenceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L8PersistenceViolation[];
}

export class L8EvidenceStorageValidator {
  validate(
    pointer: L8EvidencePointer,
    ctx: L8EvidencePointerCheckContext,
  ): L8EvidenceValidationResult {
    const violations: L8PersistenceViolation[] = [];

    // §8.8.6.2 — known class
    if (!L8_EVIDENCE_CLASS_SUBJECT_KIND[pointer.evidence_class]) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_CLASS_UNKNOWN,
        `unknown evidence class ${pointer.evidence_class}`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
      return { ok: false, violations };
    }

    // §8.8.6.5 — class ↔ subject kind alignment
    const expectedKind =
      L8_EVIDENCE_CLASS_SUBJECT_KIND[pointer.evidence_class];
    if (pointer.subject_kind !== expectedKind) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_SUBJECT_KIND_MISMATCH,
        `evidence class ${pointer.evidence_class} expects subject kind ${expectedKind}, got ${pointer.subject_kind}`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }
    if (ctx.expected_subject_kind !== pointer.subject_kind) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_SUBJECT_KIND_MISMATCH,
        `caller expected subject kind ${ctx.expected_subject_kind}, pointer claims ${pointer.subject_kind}`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }

    // §8.8.6.3 — required anchors
    if (!pointer.archive_uri) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING,
        `evidence pointer missing archive_uri`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }
    if (!pointer.checksum) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_CHECKSUM_MISSING,
        `evidence pointer missing checksum`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }
    if (!pointer.manifest_id) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_MANIFEST_LINKAGE_MISSING,
        `evidence pointer missing manifest_id`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }
    if (!pointer.subject_ref) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_SUBJECT_LINK_MISSING,
        `evidence pointer missing subject_ref`,
        { context: { evidence_id: pointer.evidence_id } },
      ));
    }
    if (pointer.subject_ref !== ctx.expected_subject_ref) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_SUBJECT_LINK_MISSING,
        `evidence pointer subject_ref=${pointer.subject_ref} does not match expected ${ctx.expected_subject_ref}`,
        { regime_subject_id: ctx.expected_subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }

    // §8.8.6.6 — compute-run linkage (lineage)
    if (pointer.compute_run_id !== ctx.expected_compute_run_id) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.ORPHAN_EVIDENCE,
        `evidence pointer compute_run=${pointer.compute_run_id} mismatches expected ${ctx.expected_compute_run_id}`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }
    if (!pointer.lineage_refs?.trace_id) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.ORPHAN_EVIDENCE,
        `evidence pointer missing lineage_refs.trace_id`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }

    // §8.8.6.4 — deterministic archive path
    const expectedPath = evidencePathFor(
      pointer.evidence_class, pointer.subject_ref,
      pointer.compute_run_id, pointer.checksum,
    );
    if (pointer.archive_uri && !pointer.archive_uri.endsWith(expectedPath)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_PATH_NON_DETERMINISTIC,
        `archive_uri=${pointer.archive_uri} does not end with expected deterministic path ${expectedPath}`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id,
            expected: expectedPath } },
      ));
    }

    // §8.8.6.3 — replay-generation-ref when required
    if (ctx.replay_required && !pointer.replay_generation_ref) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.EVIDENCE_REPLAY_REF_MISSING,
        `evidence pointer requires replay_generation_ref in replay mode`,
        { regime_subject_id: pointer.subject_ref,
          context: { evidence_id: pointer.evidence_id } },
      ));
    }

    return { ok: violations.length === 0, violations };
  }
}

/**
 * Convenience: build a default pointer for the specified class +
 * subject + run + checksum. Callers rarely build these by hand — they
 * go through `prepareL8Materialization` — but tests and repair tools
 * construct pointers directly.
 */
export function buildL8EvidencePointer(p: {
  readonly evidence_id: string;
  readonly evidence_class: L8EvidenceClass;
  readonly subject_ref: string;
  readonly compute_run_id: string;
  readonly checksum: string;
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly schema_version: string;
  readonly payload_byte_length: number;
  readonly replay_generation_ref?: string | null;
}): L8EvidencePointer {
  const subject_kind: L8EvidenceSubjectKind =
    L8_EVIDENCE_CLASS_SUBJECT_KIND[p.evidence_class];
  return {
    evidence_id: p.evidence_id,
    evidence_class: p.evidence_class,
    subject_kind,
    subject_ref: p.subject_ref,
    archive_uri: `s3://coinet-archive/${evidencePathFor(
      p.evidence_class, p.subject_ref, p.compute_run_id, p.checksum)}`,
    checksum: p.checksum,
    manifest_id: p.manifest_id,
    content_type: 'application/json',
    schema_version: p.schema_version,
    compute_run_id: p.compute_run_id,
    replay_generation_ref: p.replay_generation_ref ?? null,
    created_at: new Date(0).toISOString(),
    payload_byte_length: p.payload_byte_length,
    lineage_refs: { trace_id: p.trace_id },
  };
}
