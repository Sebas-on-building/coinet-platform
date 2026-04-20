/**
 * L10.2 — HypothesisSubject Contract
 *
 * §10.2.6 — The governed explanatory problem instance. Explanations
 * may not be generated without a subject.
 */

import { L10MaterialityClass } from './hypothesis-materiality';
import { L10HypothesisWindow } from './hypothesis-window';
import {
  L10HypothesisFamilyClass,
  L10HypothesisSubjectClass,
  L10ScopeType,
} from './hypothesis-subject-class';

export interface L10HypothesisLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

/**
 * §10.2.6.2/§10.2.6.3 — Full HypothesisSubject. Fields required for a
 * subject to be legal are enumerated in the validator. "Stronger
 * production-ready" fields from §10.2.6.3 are included so the object
 * model is ready for L10.3 runtime assembly.
 */
export interface L10HypothesisSubject {
  readonly hypothesis_subject_id: string;
  readonly subject_class: L10HypothesisSubjectClass;
  readonly subject_version: string;

  readonly scope_type: L10ScopeType;
  readonly scope_id: string;
  readonly scope_granularity: 'POINT' | 'RANGE' | 'AGGREGATE';

  readonly as_of: string;
  readonly window: L10HypothesisWindow;
  readonly materiality: L10MaterialityClass;

  readonly hypothesis_family_set: readonly L10HypothesisFamilyClass[];

  readonly required_validation_inputs: readonly string[];
  readonly required_regime_inputs: readonly string[];
  readonly required_sequence_inputs: readonly string[];
  readonly required_feature_inputs: readonly string[];
  readonly required_event_inputs: readonly string[];
  readonly historical_inputs: readonly string[];
  readonly evidence_only_inputs: readonly string[];

  readonly candidate_generation_rules: readonly string[];
  readonly candidate_template_allowlist: readonly string[];
  readonly candidate_template_blocklist: readonly string[];

  readonly competition_policy: {
    readonly min_competition_size: number;
    readonly requires_secondary: boolean;
    readonly single_story_collapse_forbidden: true;
  };
  readonly restriction_consumption_requirements: readonly string[];
  readonly sequence_posture_requirements: readonly string[];
  readonly regime_posture_requirements: readonly string[];

  readonly input_snapshot_ref: string;
  readonly lineage_refs: L10HypothesisLineageRefs;
  readonly lineage_policy: 'STRICT' | 'STRICT_WITH_DISCLOSURE';

  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

/**
 * Deterministic FNV-1a used for subject/assessment/ranking ids and
 * replay hashes.
 */
export function fnv1aHexL10(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface L10HypothesisSubjectIdInputs {
  readonly subject_class: L10HypothesisSubjectClass;
  readonly scope_type: L10ScopeType;
  readonly scope_id: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly subject_version: string;
}

export function buildL10HypothesisSubjectId(i: L10HypothesisSubjectIdInputs): string {
  const key =
    `${i.subject_class}|${i.scope_type}|${i.scope_id}|${i.window_start}|${i.window_end}|${i.subject_version}`;
  return `hsub_${fnv1aHexL10(key)}_${fnv1aHexL10(i.scope_id)}`;
}

export function buildL10HypothesisReplayHash(canonical: string): string {
  return `hhash_${fnv1aHexL10(canonical)}`;
}
