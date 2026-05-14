/**
 * L13.2 — Evidence Digest Builder
 *
 * §13.2.6 — Builds the strongest-positive and strongest-contradiction
 * digest arrays. Inputs are governed evidence summaries already
 * approved through L13.1 dependency registry. The builder is
 * deterministic: identical inputs produce identical outputs and IDs.
 */

import {
  isL13ProtectedEvidenceRole,
  L13EvidenceRole,
  type L13EvidenceDigest,
} from '../contracts/evidence-digest';
import type { L13DependencyLayer } from '../contracts/l13-constitutional-types';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.input-package.v1';

export interface L13EvidenceDigestInput {
  readonly source_layer: L13DependencyLayer;
  readonly evidence_ref: string;
  readonly role: L13EvidenceRole;
  readonly strength_score: number;
  readonly summary_text: string;
  readonly supports_refs?: readonly string[];
  readonly contradicts_refs?: readonly string[];
  readonly freshness_class?: string;
  readonly reliability_class?: string;
  readonly lineage_refs?: readonly string[];
}

function strengthBandFor(score: number): string {
  if (score >= 0.9) return 'VERY_STRONG';
  if (score >= 0.7) return 'STRONG';
  if (score >= 0.5) return 'MEDIUM';
  if (score >= 0.3) return 'WEAK';
  return 'VERY_WEAK';
}

function digestId(input: L13EvidenceDigestInput): string {
  const key = [
    input.source_layer,
    input.evidence_ref,
    input.role,
    input.strength_score.toFixed(4),
  ].join('|');
  return `l13d.evidence.${fnv1a(key)}`;
}

/**
 * §13.2.6 — Build a single digest from a governed evidence input.
 */
export function buildL13EvidenceDigest(
  input: L13EvidenceDigestInput,
): L13EvidenceDigest {
  const protectedRole = isL13ProtectedEvidenceRole(input.role);
  const supports = input.supports_refs ?? [];
  const contradicts = input.contradicts_refs ?? [];
  const lineage = input.lineage_refs ?? [];

  return {
    evidence_digest_id: digestId(input),
    source_layer: input.source_layer,
    evidence_ref: input.evidence_ref,
    evidence_role: input.role,
    evidence_strength_score: input.strength_score,
    evidence_strength_band: strengthBandFor(input.strength_score),
    summary_text: input.summary_text,
    supports_refs: [...supports].sort(),
    contradicts_refs: [...contradicts].sort(),
    freshness_class: input.freshness_class ?? 'UNKNOWN',
    reliability_class: input.reliability_class ?? 'UNKNOWN',
    must_preserve_under_compression: protectedRole,
    lineage_refs: [...lineage].sort(),
    policy_version: POLICY_V,
  };
}

/**
 * §13.2.6 — Build the (positive, contradiction) pair from an input
 * batch. Sort order is deterministic on (role, strength desc, ref).
 */
export interface L13EvidenceDigestBatch {
  readonly positive: readonly L13EvidenceDigest[];
  readonly contradictions: readonly L13EvidenceDigest[];
}

export function buildL13EvidenceDigestBatch(
  inputs: readonly L13EvidenceDigestInput[],
  topN = 5,
): L13EvidenceDigestBatch {
  const all = inputs.map(buildL13EvidenceDigest);
  const positives = all.filter(
    d =>
      d.evidence_role === L13EvidenceRole.PRIMARY_POSITIVE ||
      d.evidence_role === L13EvidenceRole.SECONDARY_POSITIVE,
  );
  const contradictions = all.filter(
    d =>
      d.evidence_role === L13EvidenceRole.PRIMARY_CONTRADICTION ||
      d.evidence_role === L13EvidenceRole.SECONDARY_CONTRADICTION ||
      d.evidence_role === L13EvidenceRole.INVALIDATION_EVIDENCE,
  );
  const byStrength = (a: L13EvidenceDigest, b: L13EvidenceDigest) => {
    const ds = b.evidence_strength_score - a.evidence_strength_score;
    if (ds !== 0) return ds;
    return a.evidence_ref.localeCompare(b.evidence_ref);
  };
  return {
    positive: positives.sort(byStrength).slice(0, topN),
    contradictions: contradictions.sort(byStrength).slice(0, topN),
  };
}
