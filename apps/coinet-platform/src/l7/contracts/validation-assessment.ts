/**
 * L7.2 — Validation Assessment Contract
 *
 * §7.2.6.1 — The primary structured verdict on a claim candidate. A
 * ValidationAssessment must always be emitted together with (or linked
 * to) its ContradictionBundle, ConfidenceAssessment, and RestrictionProfile.
 */

import {
  L7ValidationClass,
  L7ValidationModifier,
} from './validation-output-class';

export interface L7ValidationAssessment {
  readonly validation_result_id: string;
  readonly validation_subject_id: string;
  readonly claim_family: string;
  readonly claim_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly validation_class: L7ValidationClass;
  readonly validation_modifiers: readonly L7ValidationModifier[];
  readonly support_strength_score: number;

  readonly contradiction_bundle_ref: string | null;
  readonly confidence_assessment_ref: string | null;
  readonly restriction_profile_ref: string | null;

  readonly staleness_flag: boolean;
  readonly incompleteness_flag: boolean;
  readonly ambiguity_flag: boolean;
  readonly degradation_flag: boolean;

  readonly evidence_pack_ref: string | null;
  readonly input_snapshot_ref: string | null;
  readonly compute_run_id: string;
  readonly replay_hash: string;

  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
}

function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function buildValidationResultId(
  validation_subject_id: string,
  as_of: string,
  compute_run_id: string,
): string {
  return `vres_${fnv1aHex(`${validation_subject_id}|${as_of}|${compute_run_id}`)}`;
}

/**
 * Canonical, dependency-free replay hash. Serializes primitives with
 * stable key ordering and returns a 16-hex-char FNV-derived digest.
 * Not cryptographically strong — object-model replay identity only.
 */
export function canonicalReplayHash(obj: unknown): string {
  const canon = canonicalStringify(obj);
  const h1 = fnv1aHex(canon);
  const h2 = fnv1aHex(canon.split('').reverse().join(''));
  return `rh_${h1}${h2}`;
}

function canonicalStringify(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

/**
 * §7.2.6.5 — classes that imply the presence of a contradiction bundle.
 * Used by the assessment validator and by INV-7.2-E.
 */
export function classRequiresContradictionBundle(cls: L7ValidationClass): boolean {
  return cls === L7ValidationClass.CONFLICTING || cls === L7ValidationClass.DEGRADED;
}

export function modifiersRequireContradictionBundle(
  modifiers: readonly L7ValidationModifier[],
): boolean {
  return modifiers.includes(L7ValidationModifier.UNRESOLVED_CONTRADICTION_PRESENT);
}

/**
 * Flag-modifier consistency. The modifier list and the boolean flags must
 * agree — otherwise audits can be laundered by toggling one or the other.
 */
export interface FlagConsistencyResult {
  readonly consistent: boolean;
  readonly reasons: readonly string[];
}

export function checkFlagConsistency(a: L7ValidationAssessment): FlagConsistencyResult {
  const reasons: string[] = [];
  const hasMod = (m: L7ValidationModifier) => a.validation_modifiers.includes(m);

  if (a.staleness_flag !== hasMod(L7ValidationModifier.STALE_SUPPORT_PRESENT)) {
    reasons.push('staleness_flag does not match STALE_SUPPORT_PRESENT');
  }
  if (a.incompleteness_flag !== hasMod(L7ValidationModifier.INCOMPLETE_SUPPORT_PRESENT)) {
    reasons.push('incompleteness_flag does not match INCOMPLETE_SUPPORT_PRESENT');
  }
  if (a.ambiguity_flag !== hasMod(L7ValidationModifier.AMBIGUOUS_DIRECTION_PRESENT)) {
    reasons.push('ambiguity_flag does not match AMBIGUOUS_DIRECTION_PRESENT');
  }
  if (a.degradation_flag !== hasMod(L7ValidationModifier.DEGRADED_SOURCE_PRESENT)) {
    reasons.push('degradation_flag does not match DEGRADED_SOURCE_PRESENT');
  }
  return { consistent: reasons.length === 0, reasons };
}
