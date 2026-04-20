/**
 * L10.5 — Hypothesis Contradiction Policy Contract
 *
 * §10.5.3 — Freezes the semantic meaning of contradiction for L10
 * candidates. A contradiction is a first-class surface; netting it into
 * confidence is illegal. This contract declares the narrowing vs
 * blocking law, the directness law, and the active vs decayed law.
 */

import { fnv1aHexL10 } from './hypothesis-subject';
import type {
  L10ContradictionClass,
  L10ContradictionEffectClass,
  L10ContradictionTemporalPosture,
  L10ContradictionDirectness,
  L10EvidencePostureClass,
} from './hypothesis-evidence-semantics-types';

/**
 * §10.5.3 — One governed, candidate-bound contradiction observation.
 */
export interface L10ContradictionObservation {
  readonly observation_id: string;
  readonly hypothesis_candidate_id: string;
  readonly contradicting_ref: string;
  readonly contradiction_domain: string;
  readonly contradiction_class: L10ContradictionClass;
  readonly contradiction_effect: L10ContradictionEffectClass;
  readonly contradiction_directness: L10ContradictionDirectness;
  readonly contradiction_temporal_posture: L10ContradictionTemporalPosture;
  readonly evidence_posture: L10EvidencePostureClass;
  /** Per-observation pressure in [0, 1]; first-class and inspectable. */
  readonly contradiction_pressure: number;
  readonly lineage_refs: readonly string[];
}

/**
 * §10.5.3.4 — Effect derivability facets. The narrowing-vs-blocking
 * classification must be derivable from explicit, governed facets; it
 * may not be a free-form label.
 */
export enum L10ContradictionDerivabilityFacet {
  CORE_CLAIM_ATTACK = 'CORE_CLAIM_ATTACK',
  SUPPORTING_CONDITION_ATTACK = 'SUPPORTING_CONDITION_ATTACK',
  REGIME_MISMATCH = 'REGIME_MISMATCH',
  SEQUENCE_MISMATCH = 'SEQUENCE_MISMATCH',
  TEMPORAL_RECENCY = 'TEMPORAL_RECENCY',
  VALIDATION_POSTURE = 'VALIDATION_POSTURE',
}
export const ALL_L10_CONTRADICTION_DERIVABILITY_FACETS:
  readonly L10ContradictionDerivabilityFacet[] =
    Object.values(L10ContradictionDerivabilityFacet);

/**
 * §10.5.3 — Policy contract for contradiction semantics.
 */
export interface L10HypothesisContradictionPolicy {
  readonly policy_id: string;
  readonly hypothesis_candidate_id: string;
  readonly policy_version: string;

  /** §10.5.3.3 — Contradiction classes this candidate may surface. */
  readonly allowed_contradiction_classes:
    readonly L10ContradictionClass[];

  /** §10.5.3.4 — Effect labels this candidate may emit. */
  readonly allowed_effect_classes:
    readonly L10ContradictionEffectClass[];

  /** §10.5.3.5 — Temporal postures this candidate must disambiguate. */
  readonly required_temporal_postures:
    readonly L10ContradictionTemporalPosture[];

  /** §10.5.3.6 — Directness disambiguation required. */
  readonly requires_directness_distinction: boolean;

  /** §10.5.3.4 — Facets from which effect must be derivable. */
  readonly required_derivability_facets:
    readonly L10ContradictionDerivabilityFacet[];

  /** §10.5.3.7 — Domains whose contradictions may never be omitted. */
  readonly mandatory_contradiction_domains: readonly string[];

  readonly lineage_refs: readonly string[];
}

export function buildL10ContradictionPolicyId(
  hypothesis_candidate_id: string,
  policy_version: string,
): string {
  const key = `${hypothesis_candidate_id}|${policy_version}`;
  return `hconpol_${fnv1aHexL10(key)}_${fnv1aHexL10(
    hypothesis_candidate_id,
  )}`;
}

export function buildL10ContradictionObservationId(
  hypothesis_candidate_id: string,
  contradicting_ref: string,
  contradiction_domain: string,
): string {
  const key =
    `${hypothesis_candidate_id}|${contradicting_ref}|${contradiction_domain}`;
  return `hconobs_${fnv1aHexL10(key)}_${fnv1aHexL10(contradicting_ref)}`;
}
