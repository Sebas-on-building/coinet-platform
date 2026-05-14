/**
 * L13.2 — Evidence Digest Contract
 *
 * §13.2.6 — Evidence digests are AI-safe summaries of governed
 * evidence refs. They preserve role, strength, contradiction
 * relationships, freshness, and reliability so the input package can
 * carry the strongest positive evidence and strongest contradictions
 * without raw lower-layer state.
 */

import type { L13DependencyLayer } from './l13-constitutional-types';

export enum L13EvidenceRole {
  PRIMARY_POSITIVE = 'PRIMARY_POSITIVE',
  SECONDARY_POSITIVE = 'SECONDARY_POSITIVE',
  PRIMARY_CONTRADICTION = 'PRIMARY_CONTRADICTION',
  SECONDARY_CONTRADICTION = 'SECONDARY_CONTRADICTION',
  INVALIDATION_EVIDENCE = 'INVALIDATION_EVIDENCE',
  TRIGGER_EVIDENCE = 'TRIGGER_EVIDENCE',
  SCORE_ATTRIBUTION_EVIDENCE = 'SCORE_ATTRIBUTION_EVIDENCE',
  MISSING_DATA_EVIDENCE = 'MISSING_DATA_EVIDENCE',
  DRIFT_EVIDENCE = 'DRIFT_EVIDENCE',
}

export const ALL_L13_EVIDENCE_ROLES: readonly L13EvidenceRole[] =
  Object.values(L13EvidenceRole);

/**
 * Roles that may never be compressed away (§13.2.13).
 */
export const L13_PROTECTED_EVIDENCE_ROLES: readonly L13EvidenceRole[] = [
  L13EvidenceRole.PRIMARY_CONTRADICTION,
  L13EvidenceRole.INVALIDATION_EVIDENCE,
  L13EvidenceRole.TRIGGER_EVIDENCE,
  L13EvidenceRole.MISSING_DATA_EVIDENCE,
  L13EvidenceRole.DRIFT_EVIDENCE,
];

export function isL13ProtectedEvidenceRole(role: L13EvidenceRole): boolean {
  return L13_PROTECTED_EVIDENCE_ROLES.includes(role);
}

export interface L13EvidenceDigest {
  readonly evidence_digest_id: string;

  readonly source_layer: L13DependencyLayer;
  readonly evidence_ref: string;

  readonly evidence_role: L13EvidenceRole;
  readonly evidence_strength_score: number;
  readonly evidence_strength_band: string;

  readonly summary_text: string;

  readonly supports_refs: readonly string[];
  readonly contradicts_refs: readonly string[];

  readonly freshness_class: string;
  readonly reliability_class: string;

  readonly must_preserve_under_compression: boolean;

  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}
