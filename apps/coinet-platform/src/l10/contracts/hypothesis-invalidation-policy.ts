/**
 * L10.5 — Hypothesis Invalidation Policy Contract
 *
 * §10.5.5 — Freezes the meaning of invalidation: what would break the
 * candidate, whether those signals are already active, and what
 * collapse thresholds are declared. Explanations must never grow
 * comfortable; invalidation is a first-class surface.
 */

import { fnv1aHexL10 } from './hypothesis-subject';
import type {
  L10InvalidationClass,
  L10EvidencePostureClass,
} from './hypothesis-evidence-semantics-types';

/**
 * §10.5.5 — One governed invalidation expectation.
 */
export interface L10InvalidationObservation {
  readonly observation_id: string;
  readonly hypothesis_candidate_id: string;
  readonly invalidation_signal_ref: string;
  readonly invalidation_domain: string;
  readonly invalidation_class: L10InvalidationClass;
  readonly evidence_posture: L10EvidencePostureClass;
  /** §10.5.5.4 — Whether the invalidation is *already* partially
   *  materialised right now rather than merely a future possibility. */
  readonly is_currently_active: boolean;
  /** §10.5.5.5 — Governed threshold beyond which this signal collapses
   *  the candidate. Null if the class does not carry a scalar threshold. */
  readonly collapse_threshold: number | null;
  readonly lineage_refs: readonly string[];
}

/**
 * §10.5.5.5 — Collapse-threshold basis. A threshold is legal only if it
 * is anchored to one of these governed bases.
 */
export enum L10CollapseThresholdBasis {
  SCALE_CROSSING = 'SCALE_CROSSING',
  COMBINATION_WITH_CONTRADICTION = 'COMBINATION_WITH_CONTRADICTION',
  SEQUENCE_BREAK_CONFIRMATION = 'SEQUENCE_BREAK_CONFIRMATION',
  REGIME_BREAK_CONFIRMATION = 'REGIME_BREAK_CONFIRMATION',
  SUPPORT_DROPOUT = 'SUPPORT_DROPOUT',
  UNRESOLVED = 'UNRESOLVED',
}
export const ALL_L10_COLLAPSE_THRESHOLD_BASES:
  readonly L10CollapseThresholdBasis[] =
    Object.values(L10CollapseThresholdBasis);

/**
 * §10.5.5 — Policy contract for invalidation semantics.
 */
export interface L10HypothesisInvalidationPolicy {
  readonly policy_id: string;
  readonly hypothesis_candidate_id: string;
  readonly policy_version: string;

  /** §10.5.5.3 — Invalidation classes this candidate may surface. */
  readonly allowed_invalidation_classes:
    readonly L10InvalidationClass[];

  /** §10.5.5.4 — Whether active invalidations must be explicitly split
   *  from potential ones (always true in practice; kept as a policy
   *  toggle only for future extensibility). */
  readonly requires_active_vs_potential_split: true;

  /** §10.5.5.5 — Required collapse-threshold bases for this candidate. */
  readonly required_collapse_threshold_bases:
    readonly L10CollapseThresholdBasis[];

  /** §10.5.5.5 — Classes that must carry a numeric threshold. */
  readonly numeric_threshold_required_classes:
    readonly L10InvalidationClass[];

  /** §10.5.5.6 — Whether active invalidation posture *caps* candidate
   *  confidence before collapse is confirmed. */
  readonly active_invalidation_caps_confidence: boolean;

  readonly lineage_refs: readonly string[];
}

export function buildL10InvalidationPolicyId(
  hypothesis_candidate_id: string,
  policy_version: string,
): string {
  const key = `${hypothesis_candidate_id}|${policy_version}`;
  return `hinvpol_${fnv1aHexL10(key)}_${fnv1aHexL10(
    hypothesis_candidate_id,
  )}`;
}

export function buildL10InvalidationObservationId(
  hypothesis_candidate_id: string,
  invalidation_signal_ref: string,
  invalidation_domain: string,
): string {
  const key =
    `${hypothesis_candidate_id}|${invalidation_signal_ref}|${invalidation_domain}`;
  return `hinvobs_${fnv1aHexL10(key)}_${fnv1aHexL10(
    invalidation_signal_ref,
  )}`;
}
