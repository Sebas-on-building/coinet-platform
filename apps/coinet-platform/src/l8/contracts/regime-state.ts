/**
 * L8.2 — Regime State Contract
 *
 * §8.2.8.1 / §8.2.8.2 — The full governed regime-state object. A regime
 * state is the atomic, governed, replay-safe environment classification
 * produced by Layer 8.
 *
 * §8.2.8.5 — A regime state is illegal if family is absent, primary
 * regime is absent, scope is incomplete, evidence refs are absent,
 * validation refs are absent when required, confidence exists without
 * derivation, transition risk exists without posture, multiplier
 * profile ref is absent, lineage is absent, or replay hash is absent.
 */

import { L8RegimeFamily, L8RegimeScopeType } from './regime-family';
import { L8RegimeClass } from './regime-class';

/**
 * §8.2.9.3 — Coexistence class. Declared on the regime state so later
 * layers see exactly what kind of coexistence the engine produced.
 */
export enum L8RegimeCoexistenceClass {
  /** A single, unambiguous regime for this family at this scope/time. */
  CLEAN_SINGLE = 'CLEAN_SINGLE',
  /** A dominant primary regime plus a materially present secondary. */
  PRIMARY_PLUS_SECONDARY = 'PRIMARY_PLUS_SECONDARY',
  /** A transition is in progress between two family-local regimes. */
  TRANSITIONAL_OVERLAP = 'TRANSITIONAL_OVERLAP',
  /** Multiple regimes are plausible and ambiguity must remain explicit. */
  AMBIGUOUS_MULTI_CANDIDATE = 'AMBIGUOUS_MULTI_CANDIDATE',
  /** Illegal pairing within the same family — must be blocked. */
  ILLEGAL_COLLISION = 'ILLEGAL_COLLISION',
}

export const ALL_L8_REGIME_COEXISTENCE_CLASSES:
  readonly L8RegimeCoexistenceClass[] =
    Object.values(L8RegimeCoexistenceClass);

/**
 * §8.2.8.1 — Transition risk class. The banded form of
 * `transition_risk_score` kept alongside the score so later layers
 * never have to derive bands themselves.
 */
export enum L8TransitionRiskClass {
  STABLE = 'STABLE',
  MILD = 'MILD',
  ELEVATED = 'ELEVATED',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const ALL_L8_TRANSITION_RISK_CLASSES: readonly L8TransitionRiskClass[] =
  Object.values(L8TransitionRiskClass);

/**
 * §8.2.8.1 — Regime confidence band mirrors L7's banded confidence
 * vocabulary so later layers can reason uniformly.
 */
export enum L8RegimeConfidenceBand {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  FULL = 'FULL',
}

export const ALL_L8_REGIME_CONFIDENCE_BANDS:
  readonly L8RegimeConfidenceBand[] =
    Object.values(L8RegimeConfidenceBand);

/**
 * §8.2.8.2 — Materialization mode — live/replay/repair/historical.
 * Needed for persistence-routing law in later L8 sublayers.
 */
export type L8RegimeMaterializationMode =
  | 'LIVE'
  | 'REPLAY'
  | 'REPAIR'
  | 'HISTORICAL_RECONSTRUCTION';

/**
 * §8.2.8.1 — Lineage refs that every regime state must carry.
 */
export interface L8RegimeLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

/**
 * §8.2.8.1 / §8.2.8.2 — The full regime-state contract.
 *
 * Every field is non-optional by design. Optionality is modeled via
 * explicit `null` for secondary regime, coexistence metadata, and the
 * secondary_regime_confidence field (which is `null` when no secondary
 * regime is present).
 */
export interface L8RegimeState {
  // Identity (§8.2.8.1)
  readonly regime_state_id: string;
  readonly regime_subject_id: string;
  readonly regime_template_id: string;
  readonly regime_version: string;

  // Family and class (§8.2.8.1)
  readonly regime_family: L8RegimeFamily;
  readonly primary_regime: L8RegimeClass;
  readonly secondary_regime: L8RegimeClass | null;

  // Scope and time (§8.2.8.1)
  readonly scope_type: L8RegimeScopeType;
  readonly scope_id: string;
  readonly as_of: string;

  // Confidence (§8.2.8.1)
  readonly regime_confidence_score: number; // 0..1
  readonly regime_confidence_band: L8RegimeConfidenceBand;
  readonly secondary_regime_confidence: number | null; // 0..1 or null

  // Transition (§8.2.8.1)
  readonly transition_risk_score: number; // 0..1
  readonly transition_risk_class: L8TransitionRiskClass;

  // Evidence and validation (§8.2.8.1)
  readonly supporting_surface_refs: readonly string[];
  readonly contradicting_surface_refs: readonly string[];
  readonly validation_refs: readonly string[];
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  // Multiplier linkage (§8.2.8.1)
  readonly multiplier_profile_ref: string;

  // Coexistence posture (§8.2.8.2 / §8.2.9)
  readonly coexistence_class: L8RegimeCoexistenceClass;
  readonly ambiguity_score: number; // 0..1
  readonly staleness_score: number; // 0..1
  readonly degradation_score: number; // 0..1

  // Lineage and run identity (§8.2.8.1)
  readonly lineage_refs: L8RegimeLineageRefs;
  readonly compute_run_id: string;
  readonly replay_hash: string;

  // Materialization / policy (§8.2.8.2)
  readonly materialization_mode: L8RegimeMaterializationMode;
  readonly policy_version: string;

  // Authoring
  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

/**
 * Deterministic FNV-1a reused for state identity.
 */
function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface L8RegimeStateIdInputs {
  readonly regime_subject_id: string;
  readonly primary_regime: L8RegimeClass;
  readonly secondary_regime: L8RegimeClass | null;
  readonly as_of: string;
  readonly compute_run_id: string;
}

export function buildL8RegimeStateId(i: L8RegimeStateIdInputs): string {
  const key =
    `${i.regime_subject_id}|${i.primary_regime}|${i.secondary_regime ?? '-'}|${i.as_of}|${i.compute_run_id}`;
  return `rstate_${fnv1aHex(key)}_${fnv1aHex(i.regime_subject_id)}`;
}

export function buildL8ReplayHash(canonical: string): string {
  return `rhash_${fnv1aHex(canonical)}`;
}

export function canonicalizeRegimeStateForHash(s: L8RegimeState): string {
  return [
    s.regime_family,
    s.primary_regime,
    s.secondary_regime ?? '-',
    s.scope_type,
    s.scope_id,
    s.as_of,
    s.regime_confidence_score.toFixed(6),
    s.transition_risk_score.toFixed(6),
    s.coexistence_class,
    s.regime_template_id,
    s.regime_version,
    s.policy_version,
    s.compute_run_id,
  ].join('|');
}
