/**
 * L10.5 — Hypothesis Support Policy Contract
 *
 * §10.5.2 — Freezes the semantic meaning of support for L10 candidates.
 * Declares what counts as support, how its strength is derivable, what
 * roles it may carry, and what absences are illegal to hide.
 */

import { fnv1aHexL10 } from './hypothesis-subject';
import type {
  L10SupportRoleClass,
  L10EvidencePostureClass,
} from './hypothesis-evidence-semantics-types';

/**
 * §10.5.2.7 — One governed, candidate-bound support observation.
 * Support is never generic — it always cites a lower-layer ref, a
 * domain, and a governed posture.
 */
export interface L10SupportObservation {
  readonly observation_id: string;
  readonly hypothesis_candidate_id: string;
  readonly supporting_ref: string;
  readonly support_domain: string;
  readonly support_role: L10SupportRoleClass;
  readonly support_posture: L10EvidencePostureClass;
  /** Per-observation strength in [0, 1]; not a scoring coefficient. */
  readonly support_strength: number;
  /** Optional lower-layer lineage the observation attaches to. */
  readonly lineage_refs: readonly string[];
}

/**
 * §10.5.2.4 — Derivability dimensions for support strength. Support
 * strength may not be a single opaque score; it must be derivable from
 * these governed facets.
 */
export enum L10SupportDerivabilityFacet {
  DOMAIN_FIT = 'DOMAIN_FIT',
  SOURCE_QUALITY = 'SOURCE_QUALITY',
  FRESHNESS_POSTURE = 'FRESHNESS_POSTURE',
  RESTRICTION_POSTURE = 'RESTRICTION_POSTURE',
  SEQUENCE_ALIGNMENT = 'SEQUENCE_ALIGNMENT',
  REGIME_ALIGNMENT = 'REGIME_ALIGNMENT',
  VALIDATION_CONFIDENCE_POSTURE = 'VALIDATION_CONFIDENCE_POSTURE',
  EXPECTED_COMPLETENESS = 'EXPECTED_COMPLETENESS',
}
export const ALL_L10_SUPPORT_DERIVABILITY_FACETS:
  readonly L10SupportDerivabilityFacet[] =
    Object.values(L10SupportDerivabilityFacet);

/**
 * §10.5.2 — Policy contract for support semantics.
 *
 * This object is constitutional, not runtime: it declares the
 * contractual constraints under which a support set is computed, not
 * the computed values themselves.
 */
export interface L10HypothesisSupportPolicy {
  readonly policy_id: string;
  readonly hypothesis_candidate_id: string;
  readonly policy_version: string;

  /** §10.5.2.3 — Support roles that this candidate may surface. */
  readonly allowed_support_roles: readonly L10SupportRoleClass[];

  /** §10.5.2.5 — Roles eligible for primary anchor status. */
  readonly primary_anchor_roles: readonly L10SupportRoleClass[];

  /** §10.5.2.4 — Derivability facets this candidate must expose. */
  readonly required_derivability_facets:
    readonly L10SupportDerivabilityFacet[];

  /** §10.5.2.7 — Template-critical domains: missing support is illegal. */
  readonly required_support_domains: readonly string[];

  /** §10.5.2.6 — Postures that must never masquerade as clean support. */
  readonly degrading_postures: readonly L10EvidencePostureClass[];

  /** §10.5.2.8 — Upstream lineage domains from which support may draw. */
  readonly permitted_lineage_domains: readonly string[];

  readonly lineage_refs: readonly string[];
}

export function buildL10SupportPolicyId(
  hypothesis_candidate_id: string,
  policy_version: string,
): string {
  const key = `${hypothesis_candidate_id}|${policy_version}`;
  return `hsuppol_${fnv1aHexL10(key)}_${fnv1aHexL10(
    hypothesis_candidate_id,
  )}`;
}

export function buildL10SupportObservationId(
  hypothesis_candidate_id: string,
  supporting_ref: string,
  support_domain: string,
): string {
  const key = `${hypothesis_candidate_id}|${supporting_ref}|${support_domain}`;
  return `hsupobs_${fnv1aHexL10(key)}_${fnv1aHexL10(supporting_ref)}`;
}
