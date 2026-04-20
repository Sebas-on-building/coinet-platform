/**
 * L9.8 — Evidence Storage Law
 *
 * §9.8.6 — Sequence evidence, lead-lag bundles, change-point bundles,
 * reliance-profile evidence, and phase/decay evidence must be
 * written to object storage with deterministic paths, checksum, and
 * manifest linkage (§9.8.6.1 / §9.8.6.3 / INV-9.8-D).
 *
 * This contract does *not* produce evidence; L9.4 already does that.
 * It defines the shape a legal evidence *pointer* must take so
 * validators can reject orphan or raw-path writes.
 */

/**
 * §9.8.6.2 — Canonical evidence classes. Every object in the
 * evidence store is tagged with exactly one class; no "misc" class
 * is allowed (keeps deterministic path rules unambiguous).
 */
export enum L9EvidenceClass {
  SEQUENCE_EVIDENCE_PACK = 'SEQUENCE_EVIDENCE_PACK',
  ORDERED_SIGNAL_EVIDENCE = 'ORDERED_SIGNAL_EVIDENCE',
  LEAD_LAG_BUNDLE = 'LEAD_LAG_BUNDLE',
  PHASE_EVIDENCE = 'PHASE_EVIDENCE',
  CHANGE_POINT_BUNDLE = 'CHANGE_POINT_BUNDLE',
  DECAY_EVIDENCE = 'DECAY_EVIDENCE',
  POST_EVENT_WINDOW_BUNDLE = 'POST_EVENT_WINDOW_BUNDLE',
  RELIANCE_PROFILE_EVIDENCE = 'RELIANCE_PROFILE_EVIDENCE',
}

export const ALL_L9_EVIDENCE_CLASSES: readonly L9EvidenceClass[] =
  Object.values(L9EvidenceClass);

/**
 * §9.8.6.2 — Evidence subject-kind. Evidence must always bind to a
 * typed L9 subject; "unknown" is illegal (§9.8.6.5).
 */
export enum L9EvidenceSubjectKind {
  SEQUENCE_SUBJECT = 'SEQUENCE_SUBJECT',
  LEAD_LAG_RELATION = 'LEAD_LAG_RELATION',
  PHASE_STATE = 'PHASE_STATE',
  CHANGE_POINT = 'CHANGE_POINT',
  DECAY_PROFILE = 'DECAY_PROFILE',
  POST_EVENT_WINDOW = 'POST_EVENT_WINDOW',
  RELIANCE_PROFILE = 'RELIANCE_PROFILE',
}

export const ALL_L9_EVIDENCE_SUBJECT_KINDS:
  readonly L9EvidenceSubjectKind[] = Object.values(L9EvidenceSubjectKind);

/**
 * §9.8.6.2 — Binding from evidence class → legal subject kinds.
 * Consumed by the evidence-pointer validator (§9.8.6.5).
 */
export const L9_EVIDENCE_SUBJECT_KIND_BY_CLASS:
  Readonly<Record<L9EvidenceClass, L9EvidenceSubjectKind>> = {
  [L9EvidenceClass.SEQUENCE_EVIDENCE_PACK]:
    L9EvidenceSubjectKind.SEQUENCE_SUBJECT,
  [L9EvidenceClass.ORDERED_SIGNAL_EVIDENCE]:
    L9EvidenceSubjectKind.SEQUENCE_SUBJECT,
  [L9EvidenceClass.LEAD_LAG_BUNDLE]:
    L9EvidenceSubjectKind.LEAD_LAG_RELATION,
  [L9EvidenceClass.PHASE_EVIDENCE]: L9EvidenceSubjectKind.PHASE_STATE,
  [L9EvidenceClass.CHANGE_POINT_BUNDLE]: L9EvidenceSubjectKind.CHANGE_POINT,
  [L9EvidenceClass.DECAY_EVIDENCE]: L9EvidenceSubjectKind.DECAY_PROFILE,
  [L9EvidenceClass.POST_EVENT_WINDOW_BUNDLE]:
    L9EvidenceSubjectKind.POST_EVENT_WINDOW,
  [L9EvidenceClass.RELIANCE_PROFILE_EVIDENCE]:
    L9EvidenceSubjectKind.RELIANCE_PROFILE,
};

/**
 * §9.8.6.3 — Evidence pointer. A validated pointer is the *only*
 * legal handle a later layer may use to retrieve evidence; direct
 * object-store access is illegal (§9.8.6.5).
 */
export interface L9EvidencePointer {
  readonly evidence_id: string;
  readonly evidence_class: L9EvidenceClass;
  readonly subject_kind: L9EvidenceSubjectKind;
  readonly sequence_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  /** §9.8.6.3 — manifest linkage is mandatory. */
  readonly manifest_id: string;
  /** §9.8.6.3 — archive uri is mandatory. */
  readonly archive_uri: string;
  /** §9.8.6.3 — checksum is mandatory. */
  readonly checksum_sha256: string;
  /** §9.8.6.3 — replay-safe reference (replay_hash or run_id). */
  readonly replay_ref: string;
  /** §9.8.6.3 — deterministic path segment produced by the builder. */
  readonly deterministic_path: string;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
}

/**
 * §9.8.6.3 — Deterministic path rules. The builder (and the
 * validator's reconstruction check) use these same prefixes so an
 * evidence object cannot end up at an unregistered location.
 */
export const L9_EVIDENCE_PATH_PREFIX_BY_CLASS:
  Readonly<Record<L9EvidenceClass, string>> = {
  [L9EvidenceClass.SEQUENCE_EVIDENCE_PACK]: 'l9/evidence/sequence-pack',
  [L9EvidenceClass.ORDERED_SIGNAL_EVIDENCE]:
    'l9/evidence/ordered-signals',
  [L9EvidenceClass.LEAD_LAG_BUNDLE]: 'l9/evidence/lead-lag',
  [L9EvidenceClass.PHASE_EVIDENCE]: 'l9/evidence/phase',
  [L9EvidenceClass.CHANGE_POINT_BUNDLE]: 'l9/evidence/change-point',
  [L9EvidenceClass.DECAY_EVIDENCE]: 'l9/evidence/decay',
  [L9EvidenceClass.POST_EVENT_WINDOW_BUNDLE]:
    'l9/evidence/post-event-window',
  [L9EvidenceClass.RELIANCE_PROFILE_EVIDENCE]: 'l9/evidence/reliance',
};

/**
 * §9.8.6.3 — Deterministic evidence-path builder. Produces the exact
 * same path for the same tuple; validators reconstruct the path and
 * compare to `deterministic_path` to detect tampering or drift.
 *
 * Shape:
 *   {prefix}/{scope_type}/{scope_id}/{as_of}/{evidence_id}
 */
export function buildL9DeterministicEvidencePath(input: {
  readonly evidence_class: L9EvidenceClass;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly evidence_id: string;
}): string {
  const prefix = L9_EVIDENCE_PATH_PREFIX_BY_CLASS[input.evidence_class];
  const scopeType = sanitize(input.scope_type);
  const scopeId = sanitize(input.scope_id);
  const asOf = sanitize(input.as_of);
  const evidenceId = sanitize(input.evidence_id);
  return `${prefix}/${scopeType}/${scopeId}/${asOf}/${evidenceId}`;
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9._:\-]/g, '_');
}

/**
 * §9.8.6.5 — Helper: a pointer is orphan-free if every required
 * field is present and non-empty.
 */
export function l9EvidencePointerHasRequiredLinkage(
  p: L9EvidencePointer,
): boolean {
  return (
    typeof p.manifest_id === 'string' && p.manifest_id.length > 0 &&
    typeof p.archive_uri === 'string' && p.archive_uri.length > 0 &&
    typeof p.checksum_sha256 === 'string' && p.checksum_sha256.length > 0 &&
    typeof p.replay_ref === 'string' && p.replay_ref.length > 0 &&
    typeof p.sequence_subject_id === 'string' &&
    p.sequence_subject_id.length > 0
  );
}
