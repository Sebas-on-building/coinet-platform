/**
 * L7.7 — Evidence Storage Contracts
 *
 * §7.7.5 — Evidence packs (validation, contradiction, confidence,
 * restriction, forensic) live in object storage under deterministic
 * paths. Layer 7 only persists POINTERS through Postgres; the payload
 * is addressed by archive URI + checksum.
 *
 * Later layers never read raw archive objects — they go through
 * `L7EvidenceReadService` (§7.7.6.4 / §7.7.6.7).
 */

// ── Evidence classes ────────────────────────────────────────────────────

/**
 * §7.7.5.2 — The frozen set of evidence classes Layer 7 may emit.
 * Keeping this small and explicit prevents evidence-class sprawl.
 */
export enum L7EvidenceClass {
  VALIDATION_EVIDENCE_PACK = 'VALIDATION_EVIDENCE_PACK',
  CONTRADICTION_EVIDENCE_BUNDLE = 'CONTRADICTION_EVIDENCE_BUNDLE',
  CONFIDENCE_RATIONALE_BUNDLE = 'CONFIDENCE_RATIONALE_BUNDLE',
  RESTRICTION_REASON_BUNDLE = 'RESTRICTION_REASON_BUNDLE',
  VALIDATION_FORENSIC_EXPORT = 'VALIDATION_FORENSIC_EXPORT',
}

export const ALL_L7_EVIDENCE_CLASSES: readonly L7EvidenceClass[] =
  Object.values(L7EvidenceClass);

export function isL7EvidenceClass(x: unknown): x is L7EvidenceClass {
  return typeof x === 'string' && ALL_L7_EVIDENCE_CLASSES.includes(x as L7EvidenceClass);
}

// ── Evidence payload class → subject kind mapping ──────────────────────

/**
 * §7.7.5.6 — Evidence class must match the payload class. Reads and
 * writes cross-check this to block misrouted bundles.
 */
export enum L7EvidenceSubjectKind {
  VALIDATION_SUBJECT = 'VALIDATION_SUBJECT',
  CONTRADICTION_BUNDLE = 'CONTRADICTION_BUNDLE',
  CONFIDENCE_ASSESSMENT = 'CONFIDENCE_ASSESSMENT',
  RESTRICTION_PROFILE = 'RESTRICTION_PROFILE',
  VALIDATION_RUN = 'VALIDATION_RUN',
}

export const L7_EVIDENCE_CLASS_SUBJECT_KIND: Record<
  L7EvidenceClass,
  L7EvidenceSubjectKind
> = {
  [L7EvidenceClass.VALIDATION_EVIDENCE_PACK]: L7EvidenceSubjectKind.VALIDATION_SUBJECT,
  [L7EvidenceClass.CONTRADICTION_EVIDENCE_BUNDLE]: L7EvidenceSubjectKind.CONTRADICTION_BUNDLE,
  [L7EvidenceClass.CONFIDENCE_RATIONALE_BUNDLE]: L7EvidenceSubjectKind.CONFIDENCE_ASSESSMENT,
  [L7EvidenceClass.RESTRICTION_REASON_BUNDLE]: L7EvidenceSubjectKind.RESTRICTION_PROFILE,
  [L7EvidenceClass.VALIDATION_FORENSIC_EXPORT]: L7EvidenceSubjectKind.VALIDATION_RUN,
};

// ── Archive path builders ──────────────────────────────────────────────

/**
 * §7.7.5.3 — Deterministic archive paths. Changing these breaks replay
 * identity for already-emitted pointers, so keep them stable.
 */

const ARCHIVE_ROOT = 'l7/evidence';

function sanitize(seg: string): string {
  // Keep deterministic: only [A-Za-z0-9_-] stays, everything else → '_'.
  // `.` is intentionally excluded so `..` path-traversal sequences are
  // neutralized at segment level (the `.json` suffix is appended by the
  // path builders themselves, outside of any user-controlled segment).
  return seg.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function validationEvidencePath(
  subjectId: string,
  computeRunId: string,
  hash: string,
): string {
  return `${ARCHIVE_ROOT}/validation/${sanitize(subjectId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function contradictionEvidencePath(
  bundleId: string,
  computeRunId: string,
  hash: string,
): string {
  return `${ARCHIVE_ROOT}/contradiction/${sanitize(bundleId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function confidenceRationalePath(
  assessmentId: string,
  computeRunId: string,
  hash: string,
): string {
  return `${ARCHIVE_ROOT}/confidence/${sanitize(assessmentId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function restrictionRationalePath(
  profileId: string,
  computeRunId: string,
  hash: string,
): string {
  return `${ARCHIVE_ROOT}/restriction/${sanitize(profileId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function validationForensicPath(
  runId: string,
  hash: string,
): string {
  return `${ARCHIVE_ROOT}/forensic/${sanitize(runId)}/${sanitize(hash)}.json`;
}

export function evidencePathFor(
  cls: L7EvidenceClass,
  subjectRef: string,
  computeRunId: string,
  hash: string,
): string {
  switch (cls) {
    case L7EvidenceClass.VALIDATION_EVIDENCE_PACK:
      return validationEvidencePath(subjectRef, computeRunId, hash);
    case L7EvidenceClass.CONTRADICTION_EVIDENCE_BUNDLE:
      return contradictionEvidencePath(subjectRef, computeRunId, hash);
    case L7EvidenceClass.CONFIDENCE_RATIONALE_BUNDLE:
      return confidenceRationalePath(subjectRef, computeRunId, hash);
    case L7EvidenceClass.RESTRICTION_REASON_BUNDLE:
      return restrictionRationalePath(subjectRef, computeRunId, hash);
    case L7EvidenceClass.VALIDATION_FORENSIC_EXPORT:
      return validationForensicPath(subjectRef, hash);
  }
}

// ── Evidence pointer row ───────────────────────────────────────────────

/**
 * §7.7.5.4 — Every archive write emits an `evidence_pointer` row in
 * Postgres. No evidence may be considered governed without a pointer.
 */
export interface L7EvidencePointer {
  readonly evidence_id: string;
  readonly evidence_class: L7EvidenceClass;
  readonly subject_kind: L7EvidenceSubjectKind;
  readonly subject_ref: string;
  readonly archive_uri: string;
  readonly checksum: string;
  readonly manifest_id: string;
  readonly content_type: string;
  readonly schema_version: string;
  readonly compute_run_id: string;
  readonly replay_generation_ref: string | null;
  readonly created_at: string;
  readonly payload_byte_length: number;
  readonly lineage_refs: {
    readonly trace_id: string;
  };
}

/**
 * §7.7.5.5 — An evidence bundle is *illegal* unless all required anchors
 * are present. This type is the strict, audit-visible form used by the
 * evidence-storage validator.
 */
export interface L7EvidencePointerCheckContext {
  readonly expected_subject_ref: string;
  readonly expected_subject_kind: L7EvidenceSubjectKind;
  readonly expected_compute_run_id: string;
  readonly replay_required: boolean;
}

// ── Lineage pointer row ────────────────────────────────────────────────

/**
 * §7.7.2.1 — `l7.lineage_pointers`. Binds a materialized state to its
 * compute-run identity, manifest, trace, and replay generation.
 */
export interface L7LineagePointer {
  readonly lineage_id: string;
  readonly subject_id: string;
  readonly state_ref: string;
  readonly compute_run_id: string;
  readonly replay_generation_ref: string | null;
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly created_at: string;
}
