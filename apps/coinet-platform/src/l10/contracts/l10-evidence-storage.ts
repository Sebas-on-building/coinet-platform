/**
 * L10.8 — Evidence Storage Law
 *
 * §10.8.6 — Hypothesis evidence packs, contradiction bundles,
 * confirmation sets, invalidation sets, shift-condition bundles,
 * spread evidence, ranking evidence, and reliance-profile evidence
 * must be archived in object storage with deterministic paths,
 * manifest linkage, checksums, and replay-safe references
 * (INV-10.8-D). Orphaned evidence is illegal (§10.8.6.5).
 */

/**
 * §10.8.6.2 — Canonical evidence classes.
 */
export enum L10EvidenceClass {
  HYPOTHESIS_EVIDENCE_PACK = 'HYPOTHESIS_EVIDENCE_PACK',
  CONTRADICTION_BUNDLE = 'CONTRADICTION_BUNDLE',
  CONFIRMATION_SET_BUNDLE = 'CONFIRMATION_SET_BUNDLE',
  INVALIDATION_SET_BUNDLE = 'INVALIDATION_SET_BUNDLE',
  SHIFT_CONDITION_BUNDLE = 'SHIFT_CONDITION_BUNDLE',
  SPREAD_EVIDENCE_BUNDLE = 'SPREAD_EVIDENCE_BUNDLE',
  RANKING_EVIDENCE_BUNDLE = 'RANKING_EVIDENCE_BUNDLE',
  RELIANCE_PROFILE_EVIDENCE = 'RELIANCE_PROFILE_EVIDENCE',
}

export const ALL_L10_EVIDENCE_CLASSES: readonly L10EvidenceClass[] =
  Object.values(L10EvidenceClass);

/**
 * §10.8.6.3 / §10.8.6.5 — Subject kind an evidence bundle is linked
 * to. Every pointer must carry a `subject_kind` and the subject-kind
 * must be legal for its evidence class (mapping below).
 */
export enum L10EvidenceSubjectKind {
  HYPOTHESIS_SUBJECT = 'HYPOTHESIS_SUBJECT',
  CONTRADICTION_SET = 'CONTRADICTION_SET',
  CONFIRMATION_SET = 'CONFIRMATION_SET',
  INVALIDATION_SET = 'INVALIDATION_SET',
  SHIFT_CONDITION_SET = 'SHIFT_CONDITION_SET',
  SPREAD_PROFILE = 'SPREAD_PROFILE',
  RANKING = 'RANKING',
  RELIANCE_PROFILE = 'RELIANCE_PROFILE',
}

export const ALL_L10_EVIDENCE_SUBJECT_KINDS:
  readonly L10EvidenceSubjectKind[] =
    Object.values(L10EvidenceSubjectKind);

/**
 * §10.8.6.5 — Legal (evidence class × subject kind) pairs. Any pointer
 * whose kind isn't present in the class's set is rejected as an
 * orphan-evidence violation.
 */
export const L10_EVIDENCE_CLASS_SUBJECT_KINDS:
  Readonly<Record<L10EvidenceClass, readonly L10EvidenceSubjectKind[]>> = {
  [L10EvidenceClass.HYPOTHESIS_EVIDENCE_PACK]: [
    L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
  ],
  [L10EvidenceClass.CONTRADICTION_BUNDLE]: [
    L10EvidenceSubjectKind.CONTRADICTION_SET,
    L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
  ],
  [L10EvidenceClass.CONFIRMATION_SET_BUNDLE]: [
    L10EvidenceSubjectKind.CONFIRMATION_SET,
    L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
  ],
  [L10EvidenceClass.INVALIDATION_SET_BUNDLE]: [
    L10EvidenceSubjectKind.INVALIDATION_SET,
    L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
  ],
  [L10EvidenceClass.SHIFT_CONDITION_BUNDLE]: [
    L10EvidenceSubjectKind.SHIFT_CONDITION_SET,
    L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
  ],
  [L10EvidenceClass.SPREAD_EVIDENCE_BUNDLE]: [
    L10EvidenceSubjectKind.SPREAD_PROFILE,
    L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
  ],
  [L10EvidenceClass.RANKING_EVIDENCE_BUNDLE]: [
    L10EvidenceSubjectKind.RANKING,
    L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
  ],
  [L10EvidenceClass.RELIANCE_PROFILE_EVIDENCE]: [
    L10EvidenceSubjectKind.RELIANCE_PROFILE,
    L10EvidenceSubjectKind.HYPOTHESIS_SUBJECT,
  ],
};

/**
 * §10.8.6.3 — Evidence pointer. Carries deterministic path, archive
 * URI, manifest link, checksum, and linkage fields. Pointers are the
 * only legal reference to evidence in persistence envelopes and read
 * surfaces.
 */
export interface L10EvidencePointer {
  readonly evidence_pointer_id: string;
  readonly evidence_class: L10EvidenceClass;
  readonly subject_kind: L10EvidenceSubjectKind;
  readonly subject_id: string;
  readonly hypothesis_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly compute_run_id: string;
  readonly archive_uri: string;
  readonly deterministic_path: string;
  readonly manifest_ref: string;
  readonly checksum: string;
  readonly content_bytes: number;
  readonly replay_ref: string | null;
  readonly policy_version: string;
  readonly created_at: string;
}

/**
 * §10.8.6.3 — Deterministic path builder. Layer 10 evidence paths are:
 *
 *   l10/<evidence_class>/<hypothesis_subject_id>/<scope_type>/<scope_id>/
 *     <compute_run_id>/<subject_kind>/<subject_id>.bundle
 *
 * All segments are lowercased and whitespace-stripped so the same
 * logical bundle always produces the same path across replay/repair.
 */
export function buildL10DeterministicEvidencePath(params: {
  evidence_class: L10EvidenceClass;
  subject_kind: L10EvidenceSubjectKind;
  subject_id: string;
  hypothesis_subject_id: string;
  scope_type: string;
  scope_id: string;
  compute_run_id: string;
}): string {
  const clean = (s: string): string =>
    s.trim().replace(/\s+/g, '_').toLowerCase();
  return [
    'l10',
    clean(params.evidence_class),
    clean(params.hypothesis_subject_id),
    clean(params.scope_type),
    clean(params.scope_id),
    clean(params.compute_run_id),
    clean(params.subject_kind),
    `${clean(params.subject_id)}.bundle`,
  ].join('/');
}

/**
 * §10.8.6.5 — Helper: is this (class × kind) pair legal?
 */
export function l10IsLegalEvidencePairing(
  evidenceClass: L10EvidenceClass,
  subjectKind: L10EvidenceSubjectKind,
): boolean {
  return (L10_EVIDENCE_CLASS_SUBJECT_KINDS[evidenceClass] ?? []).includes(
    subjectKind,
  );
}
