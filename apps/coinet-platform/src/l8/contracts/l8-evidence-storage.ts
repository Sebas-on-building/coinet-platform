/**
 * L8.8 — Evidence Storage Contracts
 *
 * §8.8.6 — Regime evidence packs, transition evidence bundles,
 * candidate snapshots, rationale bundles, and multiplier-derivation
 * bundles live in object storage under deterministic paths. Layer 8
 * persists only POINTERS through Postgres; the payload is addressed by
 * archive URI + checksum.
 *
 * Later layers never read raw archive objects — they go through
 * `L8EvidenceReadService` (§8.8.7.1 / §8.8.7.5).
 */

// ── Evidence classes ────────────────────────────────────────────────────

/**
 * §8.8.6.2 — The frozen set of evidence classes Layer 8 may emit.
 * Keeping this small and explicit prevents evidence-class sprawl.
 */
export enum L8EvidenceClass {
  REGIME_EVIDENCE_PACK = 'REGIME_EVIDENCE_PACK',
  TRANSITION_EVIDENCE_BUNDLE = 'TRANSITION_EVIDENCE_BUNDLE',
  INPUT_SNAPSHOT = 'INPUT_SNAPSHOT',
  CANDIDATE_SET_SNAPSHOT = 'CANDIDATE_SET_SNAPSHOT',
  CLASSIFICATION_RATIONALE_BUNDLE = 'CLASSIFICATION_RATIONALE_BUNDLE',
  CONFIDENCE_FACTOR_SNAPSHOT = 'CONFIDENCE_FACTOR_SNAPSHOT',
  MULTIPLIER_DERIVATION_BUNDLE = 'MULTIPLIER_DERIVATION_BUNDLE',
  REGIME_FORENSIC_EXPORT = 'REGIME_FORENSIC_EXPORT',
}

export const ALL_L8_EVIDENCE_CLASSES: readonly L8EvidenceClass[] =
  Object.values(L8EvidenceClass);

export function isL8EvidenceClass(x: unknown): x is L8EvidenceClass {
  return typeof x === 'string' &&
    ALL_L8_EVIDENCE_CLASSES.includes(x as L8EvidenceClass);
}

// ── Evidence payload class → subject kind mapping ───────────────────────

/**
 * §8.8.6.5 — Evidence class must match the payload class. Reads and
 * writes cross-check this to block misrouted bundles.
 */
export enum L8EvidenceSubjectKind {
  REGIME_SUBJECT = 'REGIME_SUBJECT',
  REGIME_RESULT = 'REGIME_RESULT',
  TRANSITION_PROFILE = 'TRANSITION_PROFILE',
  CONFIDENCE_ASSESSMENT = 'CONFIDENCE_ASSESSMENT',
  MULTIPLIER_PROFILE = 'MULTIPLIER_PROFILE',
  REGIME_RUN = 'REGIME_RUN',
}

export const L8_EVIDENCE_CLASS_SUBJECT_KIND: Record<
  L8EvidenceClass,
  L8EvidenceSubjectKind
> = {
  [L8EvidenceClass.REGIME_EVIDENCE_PACK]:
    L8EvidenceSubjectKind.REGIME_RESULT,
  [L8EvidenceClass.TRANSITION_EVIDENCE_BUNDLE]:
    L8EvidenceSubjectKind.TRANSITION_PROFILE,
  [L8EvidenceClass.INPUT_SNAPSHOT]:
    L8EvidenceSubjectKind.REGIME_SUBJECT,
  [L8EvidenceClass.CANDIDATE_SET_SNAPSHOT]:
    L8EvidenceSubjectKind.REGIME_RESULT,
  [L8EvidenceClass.CLASSIFICATION_RATIONALE_BUNDLE]:
    L8EvidenceSubjectKind.REGIME_RESULT,
  [L8EvidenceClass.CONFIDENCE_FACTOR_SNAPSHOT]:
    L8EvidenceSubjectKind.CONFIDENCE_ASSESSMENT,
  [L8EvidenceClass.MULTIPLIER_DERIVATION_BUNDLE]:
    L8EvidenceSubjectKind.MULTIPLIER_PROFILE,
  [L8EvidenceClass.REGIME_FORENSIC_EXPORT]:
    L8EvidenceSubjectKind.REGIME_RUN,
};

// ── Archive path builders ───────────────────────────────────────────────

/**
 * §8.8.6.4 — Deterministic archive paths. Changing these breaks
 * replay identity for already-emitted pointers, so keep them stable.
 */

const ARCHIVE_ROOT = 'l8/evidence';

function sanitize(seg: string): string {
  // Deterministic: only [A-Za-z0-9_-] stays; everything else → '_'. '.'
  // is intentionally excluded so `..` path-traversal sequences are
  // neutralized at segment level (the `.json` suffix is appended by
  // the path builders themselves, outside any user-controlled segment).
  return seg.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function regimeEvidencePackPath(
  regimeResultId: string, computeRunId: string, hash: string,
): string {
  return `${ARCHIVE_ROOT}/regime/${sanitize(regimeResultId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function transitionEvidenceBundlePath(
  transitionProfileId: string, computeRunId: string, hash: string,
): string {
  return `${ARCHIVE_ROOT}/transition/${sanitize(transitionProfileId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function inputSnapshotPath(
  regimeSubjectId: string, computeRunId: string, hash: string,
): string {
  return `${ARCHIVE_ROOT}/input/${sanitize(regimeSubjectId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function candidateSnapshotPath(
  regimeResultId: string, computeRunId: string, hash: string,
): string {
  return `${ARCHIVE_ROOT}/candidates/${sanitize(regimeResultId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function classificationRationalePath(
  regimeResultId: string, computeRunId: string, hash: string,
): string {
  return `${ARCHIVE_ROOT}/rationale/${sanitize(regimeResultId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function confidenceFactorSnapshotPath(
  confidenceAssessmentId: string, computeRunId: string, hash: string,
): string {
  return `${ARCHIVE_ROOT}/confidence/${sanitize(confidenceAssessmentId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function multiplierDerivationPath(
  multiplierProfileId: string, computeRunId: string, hash: string,
): string {
  return `${ARCHIVE_ROOT}/multiplier/${sanitize(multiplierProfileId)}/${sanitize(computeRunId)}/${sanitize(hash)}.json`;
}

export function regimeForensicPath(
  runId: string, hash: string,
): string {
  return `${ARCHIVE_ROOT}/forensic/${sanitize(runId)}/${sanitize(hash)}.json`;
}

export function evidencePathFor(
  cls: L8EvidenceClass, subjectRef: string,
  computeRunId: string, hash: string,
): string {
  switch (cls) {
    case L8EvidenceClass.REGIME_EVIDENCE_PACK:
      return regimeEvidencePackPath(subjectRef, computeRunId, hash);
    case L8EvidenceClass.TRANSITION_EVIDENCE_BUNDLE:
      return transitionEvidenceBundlePath(subjectRef, computeRunId, hash);
    case L8EvidenceClass.INPUT_SNAPSHOT:
      return inputSnapshotPath(subjectRef, computeRunId, hash);
    case L8EvidenceClass.CANDIDATE_SET_SNAPSHOT:
      return candidateSnapshotPath(subjectRef, computeRunId, hash);
    case L8EvidenceClass.CLASSIFICATION_RATIONALE_BUNDLE:
      return classificationRationalePath(subjectRef, computeRunId, hash);
    case L8EvidenceClass.CONFIDENCE_FACTOR_SNAPSHOT:
      return confidenceFactorSnapshotPath(subjectRef, computeRunId, hash);
    case L8EvidenceClass.MULTIPLIER_DERIVATION_BUNDLE:
      return multiplierDerivationPath(subjectRef, computeRunId, hash);
    case L8EvidenceClass.REGIME_FORENSIC_EXPORT:
      return regimeForensicPath(subjectRef, hash);
  }
}

// ── Evidence pointer row ────────────────────────────────────────────────

/**
 * §8.8.6.3 — Every archive write emits an `evidence_pointer` row in
 * Postgres. No evidence may be considered governed without a pointer.
 */
export interface L8EvidencePointer {
  readonly evidence_id: string;
  readonly evidence_class: L8EvidenceClass;
  readonly subject_kind: L8EvidenceSubjectKind;
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
 * §8.8.6.5 — Context for evidence-pointer validation. A bundle is
 * illegal if any required anchor does not match the expected payload.
 */
export interface L8EvidencePointerCheckContext {
  readonly expected_subject_ref: string;
  readonly expected_subject_kind: L8EvidenceSubjectKind;
  readonly expected_compute_run_id: string;
  readonly replay_required: boolean;
}

// ── Lineage pointer row ─────────────────────────────────────────────────

/**
 * §8.8.3.3 — `l8.regime_lineage_registry`. Binds a materialized state
 * to its compute-run identity, manifest, trace, and replay generation.
 */
export interface L8LineagePointer {
  readonly lineage_id: string;
  readonly regime_subject_id: string;
  readonly state_ref: string;
  readonly compute_run_id: string;
  readonly replay_generation_ref: string | null;
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly created_at: string;
}
