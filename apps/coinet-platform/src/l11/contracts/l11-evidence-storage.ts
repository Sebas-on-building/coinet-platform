/**
 * L11.8 — Evidence Storage (§11.8.9)
 *
 * Object-store evidence pointers with deterministic, sanitized
 * paths and replay-safe references.
 */

import { L11ScoreFamily } from './score-family';

export const L11_EVIDENCE_POLICY_VERSION = 'l11.8.evidence.v1';

export enum L11EvidenceClass {
  SCORE_EVIDENCE_PACK = 'SCORE_EVIDENCE_PACK',
  COMPONENT_BREAKDOWN_BUNDLE = 'COMPONENT_BREAKDOWN_BUNDLE',
  ATTRIBUTION_TRACE_BUNDLE = 'ATTRIBUTION_TRACE_BUNDLE',
  MODIFIER_EVIDENCE_BUNDLE = 'MODIFIER_EVIDENCE_BUNDLE',
  MISSING_DATA_EVIDENCE_BUNDLE = 'MISSING_DATA_EVIDENCE_BUNDLE',
  CALIBRATION_HOOK_BUNDLE = 'CALIBRATION_HOOK_BUNDLE',
  DRIFT_REPORT_BUNDLE = 'DRIFT_REPORT_BUNDLE',
  FORMULA_DEFINITION_BUNDLE = 'FORMULA_DEFINITION_BUNDLE',
  SCORE_REPLAY_BUNDLE = 'SCORE_REPLAY_BUNDLE',
  SCORE_REPAIR_BUNDLE = 'SCORE_REPAIR_BUNDLE',
}

export const ALL_L11_EVIDENCE_CLASSES:
  readonly L11EvidenceClass[] = Object.values(L11EvidenceClass);

export enum L11EvidenceSubjectKind {
  SCORE_OUTPUT = 'SCORE_OUTPUT',
  COMPONENT = 'COMPONENT',
  ATTRIBUTION = 'ATTRIBUTION',
  MODIFIER = 'MODIFIER',
  MISSING_DATA_PROFILE = 'MISSING_DATA_PROFILE',
  CALIBRATION_HOOK = 'CALIBRATION_HOOK',
  DRIFT_REPORT = 'DRIFT_REPORT',
  FORMULA_DEFINITION = 'FORMULA_DEFINITION',
  REPLAY_RESULT = 'REPLAY_RESULT',
  REPAIR_REQUEST = 'REPAIR_REQUEST',
}

export const ALL_L11_EVIDENCE_SUBJECT_KINDS:
  readonly L11EvidenceSubjectKind[] = Object.values(L11EvidenceSubjectKind);

/** Map of evidence class → permitted subject kinds. */
export const L11_EVIDENCE_CLASS_TO_SUBJECT_KIND:
  Readonly<Record<L11EvidenceClass, readonly L11EvidenceSubjectKind[]>> = {
  [L11EvidenceClass.SCORE_EVIDENCE_PACK]: [L11EvidenceSubjectKind.SCORE_OUTPUT],
  [L11EvidenceClass.COMPONENT_BREAKDOWN_BUNDLE]: [L11EvidenceSubjectKind.COMPONENT],
  [L11EvidenceClass.ATTRIBUTION_TRACE_BUNDLE]: [L11EvidenceSubjectKind.ATTRIBUTION],
  [L11EvidenceClass.MODIFIER_EVIDENCE_BUNDLE]: [L11EvidenceSubjectKind.MODIFIER],
  [L11EvidenceClass.MISSING_DATA_EVIDENCE_BUNDLE]: [L11EvidenceSubjectKind.MISSING_DATA_PROFILE],
  [L11EvidenceClass.CALIBRATION_HOOK_BUNDLE]: [L11EvidenceSubjectKind.CALIBRATION_HOOK],
  [L11EvidenceClass.DRIFT_REPORT_BUNDLE]: [L11EvidenceSubjectKind.DRIFT_REPORT],
  [L11EvidenceClass.FORMULA_DEFINITION_BUNDLE]: [L11EvidenceSubjectKind.FORMULA_DEFINITION],
  [L11EvidenceClass.SCORE_REPLAY_BUNDLE]: [L11EvidenceSubjectKind.REPLAY_RESULT],
  [L11EvidenceClass.SCORE_REPAIR_BUNDLE]: [L11EvidenceSubjectKind.REPAIR_REQUEST],
};

export interface L11EvidencePointer {
  readonly evidence_pointer_id: string;

  readonly evidence_class: L11EvidenceClass;

  readonly score_id?: string;
  readonly score_family?: L11ScoreFamily;
  readonly run_id?: string;

  readonly subject_kind: L11EvidenceSubjectKind;
  readonly subject_id: string;

  readonly archive_uri: string;
  readonly manifest_ref: string;
  readonly checksum: string;

  readonly replay_safe_ref: string;
  readonly deterministic_path: string;

  readonly created_at: string;
  readonly policy_version: string;
}

const PATH_SEGMENT_RE = /^[A-Za-z0-9_-]+$/;

/**
 * §11.8.9.4 — Validate a deterministic-path. Each segment must
 * match the strict allow-set; the path may end with a single `.json`
 * suffix and contain no `..`, no traversal, no slashes injected via
 * caller-controlled ids.
 */
export function isL11DeterministicPathValid(
  path: string,
): { ok: boolean; reason: string } {
  if (!path) return { ok: false, reason: 'path empty' };
  if (path.includes('..')) return { ok: false, reason: 'path traversal segment ".."' };
  if (path.includes('//')) return { ok: false, reason: 'path contains empty segment' };
  if (!path.startsWith('l11/evidence/')) {
    return { ok: false, reason: 'path must start with l11/evidence/' };
  }
  if (!path.endsWith('.json')) {
    return { ok: false, reason: 'path must end with .json' };
  }
  const trimmed = path.slice(0, path.length - '.json'.length);
  const parts = trimmed.split('/');
  // Expected: [l11, evidence, evidenceClass, scoreFamily, scopeType,
  // scopeId, asOf, subjectId]
  if (parts.length !== 8) {
    return { ok: false, reason: `path must have 8 segments before extension, got ${parts.length}` };
  }
  if (parts[0] !== 'l11' || parts[1] !== 'evidence') {
    return { ok: false, reason: 'path must start with l11/evidence' };
  }
  for (let i = 2; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg || !PATH_SEGMENT_RE.test(seg)) {
      return { ok: false, reason: `path segment ${seg || '(empty)'} fails allow-set` };
    }
  }
  return { ok: true, reason: 'ok' };
}

/**
 * Builds a deterministic, sanitized evidence path. Caller-controlled
 * segments are passed through the allow-set sanitizer so any
 * forbidden characters (slashes, dots, control chars) are rejected.
 */
export function buildL11DeterministicEvidencePath(args: {
  evidence_class: L11EvidenceClass;
  score_family: L11ScoreFamily;
  scope_type: string;
  scope_id: string;
  as_of: string;
  subject_id: string;
}): string {
  const sanitize = (s: string): string => s.replace(/[^A-Za-z0-9_-]/g, '_');
  return [
    'l11', 'evidence',
    args.evidence_class,
    args.score_family,
    sanitize(args.scope_type),
    sanitize(args.scope_id),
    sanitize(args.as_of),
    sanitize(args.subject_id),
  ].join('/') + '.json';
}

export function isL11EvidencePointerStructurallyValid(
  p: L11EvidencePointer,
): { ok: boolean; reason: string } {
  if (!p.evidence_pointer_id) {
    return { ok: false, reason: 'evidence_pointer_id missing' };
  }
  if (!p.evidence_class) return { ok: false, reason: 'evidence_class missing' };
  if (!p.subject_kind) return { ok: false, reason: 'subject_kind missing' };
  if (!p.subject_id) return { ok: false, reason: 'subject_id missing' };
  if (!p.archive_uri) return { ok: false, reason: 'archive_uri missing' };
  if (!p.manifest_ref) return { ok: false, reason: 'manifest_ref missing' };
  if (!p.checksum) return { ok: false, reason: 'checksum missing' };
  if (!p.replay_safe_ref) return { ok: false, reason: 'replay_safe_ref missing' };
  if (!p.deterministic_path) {
    return { ok: false, reason: 'deterministic_path missing' };
  }
  if (!p.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!p.created_at) return { ok: false, reason: 'created_at missing' };
  // Subject kind ↔ evidence class consistency
  const allowed = L11_EVIDENCE_CLASS_TO_SUBJECT_KIND[p.evidence_class];
  if (allowed && !allowed.includes(p.subject_kind)) {
    return { ok: false,
      reason: `subject_kind ${p.subject_kind} does not match evidence_class ${p.evidence_class}` };
  }
  const pathCheck = isL11DeterministicPathValid(p.deterministic_path);
  if (!pathCheck.ok) return pathCheck;
  return { ok: true, reason: 'ok' };
}
