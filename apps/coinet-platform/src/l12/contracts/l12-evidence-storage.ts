/**
 * L12.6 — Evidence storage law (§12.6.10).
 *
 * Scenario evidence packs, trigger/invalidation/confidence/shift bundles,
 * input snapshots, and replay bundles live in object storage with
 * deterministic paths, manifests, and checksums. Pointers are persisted via
 * Postgres indices but never as the evidence itself.
 */

export enum L12EvidenceClass {
  SCENARIO_SET_EVIDENCE = 'SCENARIO_SET_EVIDENCE',
  BASE_CASE_EVIDENCE = 'BASE_CASE_EVIDENCE',
  PATH_EVIDENCE = 'PATH_EVIDENCE',
  TRIGGER_EVIDENCE = 'TRIGGER_EVIDENCE',
  INVALIDATION_EVIDENCE = 'INVALIDATION_EVIDENCE',
  PATH_CONFIDENCE_EVIDENCE = 'PATH_CONFIDENCE_EVIDENCE',
  SHIFT_CONDITION_EVIDENCE = 'SHIFT_CONDITION_EVIDENCE',
  RESTRICTION_EVIDENCE = 'RESTRICTION_EVIDENCE',
  INPUT_SNAPSHOT = 'INPUT_SNAPSHOT',
  REPLAY_BUNDLE = 'REPLAY_BUNDLE',
}

export const ALL_L12_EVIDENCE_CLASSES: readonly L12EvidenceClass[] =
  Object.values(L12EvidenceClass);

/** Subject kinds an evidence pointer can name. */
export enum L12EvidenceSubjectKind {
  SCENARIO_SET = 'SCENARIO_SET',
  SCENARIO = 'SCENARIO',
  TRIGGER = 'TRIGGER',
  INVALIDATION = 'INVALIDATION',
  PATH_CONFIDENCE = 'PATH_CONFIDENCE',
  SHIFT_CONDITION_SET = 'SHIFT_CONDITION_SET',
  RESTRICTION_PROFILE = 'RESTRICTION_PROFILE',
  INPUT_SNAPSHOT = 'INPUT_SNAPSHOT',
  REPLAY_BUNDLE = 'REPLAY_BUNDLE',
}

export const ALL_L12_EVIDENCE_SUBJECT_KINDS: readonly L12EvidenceSubjectKind[] =
  Object.values(L12EvidenceSubjectKind);

/**
 * Evidence-class → permitted subject-kind mapping. The validator enforces
 * that an evidence pointer's `evidence_class` matches its `subject_kind`.
 */
export const L12_EVIDENCE_CLASS_SUBJECT_KIND: Readonly<
  Record<L12EvidenceClass, readonly L12EvidenceSubjectKind[]>
> = {
  [L12EvidenceClass.SCENARIO_SET_EVIDENCE]: [L12EvidenceSubjectKind.SCENARIO_SET],
  [L12EvidenceClass.BASE_CASE_EVIDENCE]: [L12EvidenceSubjectKind.SCENARIO],
  [L12EvidenceClass.PATH_EVIDENCE]: [L12EvidenceSubjectKind.SCENARIO],
  [L12EvidenceClass.TRIGGER_EVIDENCE]: [L12EvidenceSubjectKind.TRIGGER],
  [L12EvidenceClass.INVALIDATION_EVIDENCE]: [L12EvidenceSubjectKind.INVALIDATION],
  [L12EvidenceClass.PATH_CONFIDENCE_EVIDENCE]: [L12EvidenceSubjectKind.PATH_CONFIDENCE],
  [L12EvidenceClass.SHIFT_CONDITION_EVIDENCE]: [L12EvidenceSubjectKind.SHIFT_CONDITION_SET],
  [L12EvidenceClass.RESTRICTION_EVIDENCE]: [L12EvidenceSubjectKind.RESTRICTION_PROFILE],
  [L12EvidenceClass.INPUT_SNAPSHOT]: [L12EvidenceSubjectKind.INPUT_SNAPSHOT],
  [L12EvidenceClass.REPLAY_BUNDLE]: [L12EvidenceSubjectKind.REPLAY_BUNDLE],
};

/** §12.6.10 — Evidence pointer. */
export interface L12EvidencePointer {
  readonly evidence_pointer_id: string;

  readonly evidence_class: L12EvidenceClass;

  readonly subject_kind: L12EvidenceSubjectKind;
  readonly subject_id: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly scenario_subject_id: string;

  readonly archive_uri: string;
  readonly manifest_ref: string;
  readonly checksum: string;

  readonly replay_safe_ref: string;

  readonly input_snapshot_ref?: string;

  readonly lineage_refs: readonly string[];

  readonly created_by_run_id: string;

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * Build the deterministic archive path required by §12.6.10:
 *
 *   l12/evidence/{scope_type}/{scope_id}/{as_of}/{scenario_subject_id}/
 *     {evidence_class}/{subject_id}/{hash}.json
 */
export function buildL12EvidenceArchivePath(input: {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly scenario_subject_id: string;
  readonly evidence_class: L12EvidenceClass;
  readonly subject_id: string;
  readonly hash: string;
}): string {
  return [
    'l12',
    'evidence',
    input.scope_type,
    input.scope_id,
    input.as_of,
    input.scenario_subject_id,
    input.evidence_class,
    input.subject_id,
    `${input.hash}.json`,
  ].join('/');
}

/** Quick check that a path adheres to the canonical pattern. */
export function isL12EvidenceArchivePathLegal(path: string): boolean {
  const parts = path.split('/');
  if (parts.length !== 9) return false;
  if (parts[0] !== 'l12' || parts[1] !== 'evidence') return false;
  if (!parts[8].endsWith('.json')) return false;
  return parts.every(p => p.length > 0);
}
