/**
 * L9.2 — SequenceSubject Contract
 *
 * §9.2.4.2 — The root temporal unit being evaluated. A sequence may not
 * exist without a subject. The subject declares *what* is being
 * sequenced, under *which* family/template, over *what* time window,
 * and from *which* lower-layer surfaces.
 */

import { L9SequenceFamily, L9SequenceScopeType } from './sequence-family';

/**
 * §9.2.4.2 — The temporal window the sequence subject sequences over.
 */
export interface L9SequenceWindow {
  readonly window_start: string;
  readonly window_end: string;
  readonly granularity: 'MINUTE' | 'HOUR' | 'SESSION' | 'DAY' | 'WEEK';
}

/**
 * §9.2.4.2 — The lead-lag window is the window within which signals are
 * compared to discover lead-lag relations. Distinct from the sequence
 * window which is the overall sequence window.
 */
export interface L9LeadLagWindow {
  readonly window_start: string;
  readonly window_end: string;
  readonly max_lag_ms: number;
}

/**
 * §9.2.4.2 — Lineage refs the subject must carry so downstream chains
 * and assessments trace back cleanly.
 */
export interface L9SequenceLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

/**
 * §9.2.4.2 — The full SequenceSubject contract. A subject must declare
 * every reference it intends to consume up-front so later sublayers can
 * gate persistence and replay against a stable input surface.
 */
export interface L9SequenceSubject {
  readonly sequence_subject_id: string;
  readonly sequence_family: L9SequenceFamily;
  readonly sequence_template_id: string;
  readonly sequence_version: string;

  readonly scope_type: L9SequenceScopeType;
  readonly scope_id: string;
  readonly scope_granularity: 'POINT' | 'RANGE' | 'AGGREGATE';

  readonly as_of: string;
  readonly sequence_window: L9SequenceWindow;
  readonly lead_lag_window: L9LeadLagWindow;

  readonly required_input_refs: readonly string[];
  /** §9.2.5.2 — L8 regime refs, required for regime-conditioned families. */
  readonly regime_refs: readonly string[];
  /** L7 validation refs, required for every governed sequence. */
  readonly validation_refs: readonly string[];

  readonly lineage_refs: L9SequenceLineageRefs;

  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

/**
 * Deterministic FNV-1a used for subject / assessment / chain ids so
 * id-generation is reproducible across replay runs.
 */
export function fnv1aHexL9(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface L9SequenceSubjectIdInputs {
  readonly sequence_family: L9SequenceFamily;
  readonly scope_type: L9SequenceScopeType;
  readonly scope_id: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly sequence_template_id: string;
  readonly sequence_version: string;
}

export function buildL9SequenceSubjectId(i: L9SequenceSubjectIdInputs): string {
  const key =
    `${i.sequence_family}|${i.scope_type}|${i.scope_id}|${i.window_start}|${i.window_end}|${i.sequence_template_id}|${i.sequence_version}`;
  return `sseq_${fnv1aHexL9(key)}_${fnv1aHexL9(i.scope_id)}`;
}

export function buildL9SequenceReplayHash(canonical: string): string {
  return `srhash_${fnv1aHexL9(canonical)}`;
}
