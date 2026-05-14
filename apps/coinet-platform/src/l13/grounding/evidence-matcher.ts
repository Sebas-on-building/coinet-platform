/**
 * L13.4 — Evidence Matcher
 *
 * §13.4.9 — Matches each extracted claim to evidence refs that
 * exist inside the L13.2 input package. Direct refs always
 * dominate semantic similarity; weak matches may not support
 * strong claims; no match blocks the claim.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13ExtractedClaim } from '../contracts/claim-extraction';
import {
  L13EvidenceMatchReasonCode,
  L13EvidenceMatchStrength,
  type L13EvidenceMatch,
} from '../contracts/evidence-match';
import { L13ClaimType } from '../contracts/grounded-claim';
import { L13DependencyLayer } from '../contracts/l13-constitutional-types';
import { fnv1a } from '../context/_fnv1a';
import {
  buildL13PackageRefIndex,
  type L13PackageRefIndex,
} from './_package-refs';

const POLICY_V = 'l13.grounding.v1';

/**
 * Required ref sets for each claim type. A claim of one of these
 * types is `missing_required_evidence` if NONE of the required
 * refs are present in the package.
 */
const REQUIRED_REFS_BY_TYPE: Readonly<
  Record<
    L13ClaimType,
    readonly (keyof L13PackageRefIndex)[]
  >
> = {
  [L13ClaimType.OBSERVATION]: ['evidence_refs'],
  [L13ClaimType.INFERENCE]: ['evidence_refs'],
  [L13ClaimType.SCENARIO_STATEMENT]: ['scenario_refs'],
  [L13ClaimType.SCORE_STATEMENT]: ['score_refs'],
  [L13ClaimType.HYPOTHESIS_STATEMENT]: ['hypothesis_refs'],
  [L13ClaimType.REGIME_STATEMENT]: ['regime_refs'],
  [L13ClaimType.SEQUENCE_STATEMENT]: ['sequence_refs'],
  [L13ClaimType.CONTRADICTION_STATEMENT]: ['contradiction_refs'],
  [L13ClaimType.UNCERTAINTY_STATEMENT]: [],
  [L13ClaimType.USER_GUIDANCE_STATEMENT]: ['trigger_refs', 'invalidation_refs'],
  [L13ClaimType.RESTRICTION_STATEMENT]: [],
  [L13ClaimType.REFUSAL_STATEMENT]: [],
};

const LAYER_OF_REF_SET: ReadonlyArray<{
  readonly key: keyof L13PackageRefIndex;
  readonly layer: L13DependencyLayer;
  readonly reason: L13EvidenceMatchReasonCode;
}> = [
  { key: 'validation_refs', layer: L13DependencyLayer.L7_VALIDATION, reason: L13EvidenceMatchReasonCode.VALIDATION_REF_FOUND },
  { key: 'contradiction_refs', layer: L13DependencyLayer.L7_VALIDATION, reason: L13EvidenceMatchReasonCode.DIRECT_REF_FOUND },
  { key: 'regime_refs', layer: L13DependencyLayer.L8_REGIME, reason: L13EvidenceMatchReasonCode.REGIME_REF_FOUND },
  { key: 'sequence_refs', layer: L13DependencyLayer.L9_SEQUENCE, reason: L13EvidenceMatchReasonCode.SEQUENCE_REF_FOUND },
  { key: 'hypothesis_refs', layer: L13DependencyLayer.L10_HYPOTHESIS, reason: L13EvidenceMatchReasonCode.HYPOTHESIS_REF_FOUND },
  { key: 'score_refs', layer: L13DependencyLayer.L11_SCORE, reason: L13EvidenceMatchReasonCode.SCORE_REF_FOUND },
  { key: 'scenario_refs', layer: L13DependencyLayer.L12_SCENARIO, reason: L13EvidenceMatchReasonCode.SCENARIO_REF_FOUND },
  { key: 'trigger_refs', layer: L13DependencyLayer.L12_SCENARIO, reason: L13EvidenceMatchReasonCode.SCENARIO_REF_FOUND },
  { key: 'invalidation_refs', layer: L13DependencyLayer.L12_SCENARIO, reason: L13EvidenceMatchReasonCode.SCENARIO_REF_FOUND },
];

/**
 * §13.4.9 — Match a single claim to package refs.
 *
 * Strategy:
 *   1. Required-ref-set check: if the claim type has required ref
 *      sets and ALL are empty in the package, mark
 *      missing_required_evidence and strength = NO_MATCH.
 *   2. Otherwise collect every set with refs as evidence support
 *      and assign strength based on:
 *        - DIRECT_MATCH       if required ref set is populated
 *        - STRONG_SEMANTIC    if related layer refs are populated
 *        - WEAK_SEMANTIC      if only generic evidence_refs exist
 *        - NO_MATCH           if nothing exists
 *
 * The matcher only uses refs already in the package — it never
 * invents new refs.
 */
export function matchL13Evidence(
  claim: L13ExtractedClaim,
  index: L13PackageRefIndex,
): L13EvidenceMatch {
  const matchedEvidenceRefs = new Set<string>();
  const matchedLayers = new Set<L13DependencyLayer>();
  const matchedSurfaces = new Set<string>();
  const reasons = new Set<L13EvidenceMatchReasonCode>();

  const requiredKeys = REQUIRED_REFS_BY_TYPE[claim.detected_claim_type] ?? [];

  // Check required ref sets.
  let requiredHit = 0;
  for (const k of requiredKeys) {
    const set = index[k] as ReadonlySet<string>;
    if (set && set.size > 0) {
      requiredHit += 1;
      for (const r of set) matchedEvidenceRefs.add(r);
      const layerEntry = LAYER_OF_REF_SET.find(e => e.key === k);
      if (layerEntry) {
        matchedLayers.add(layerEntry.layer);
        matchedSurfaces.add(k);
        reasons.add(layerEntry.reason);
      }
    } else {
      reasons.add(L13EvidenceMatchReasonCode.REQUIRED_REF_MISSING);
    }
  }

  const missingRequired =
    requiredKeys.length > 0 && requiredHit === 0;

  // Add semantic layer matches from extractor candidate layers.
  for (const layer of claim.candidate_source_layers) {
    const refs = index.refs_by_layer.get(layer);
    if (refs && refs.size > 0) {
      for (const r of refs) matchedEvidenceRefs.add(r);
      matchedLayers.add(layer);
      matchedSurfaces.add(`layer:${layer}`);
      reasons.add(L13EvidenceMatchReasonCode.SEMANTIC_KEYWORD_MATCH);
    }
  }

  // Generic evidence digests.
  if (index.evidence_refs.size > 0) {
    reasons.add(L13EvidenceMatchReasonCode.EVIDENCE_DIGEST_FOUND);
    for (const r of index.evidence_refs) matchedEvidenceRefs.add(r);
  } else if (missingRequired) {
    reasons.add(L13EvidenceMatchReasonCode.NO_REF_IN_PACKAGE);
  }

  // Decide strength.
  let strength: L13EvidenceMatchStrength;
  if (
    requiredKeys.length === 0 &&
    matchedEvidenceRefs.size === 0
  ) {
    // Pure uncertainty / restriction / refusal claim — no required
    // evidence but treat as weak semantic match for replay
    // determinism.
    strength = L13EvidenceMatchStrength.WEAK_SEMANTIC_MATCH;
  } else if (missingRequired) {
    strength = L13EvidenceMatchStrength.NO_MATCH;
  } else if (requiredHit === requiredKeys.length && requiredKeys.length > 0) {
    strength = L13EvidenceMatchStrength.DIRECT_MATCH;
  } else if (matchedLayers.size >= 2) {
    strength = L13EvidenceMatchStrength.STRONG_SEMANTIC_MATCH;
  } else if (matchedLayers.size === 1) {
    strength = L13EvidenceMatchStrength.STRONG_SEMANTIC_MATCH;
  } else {
    strength = L13EvidenceMatchStrength.WEAK_SEMANTIC_MATCH;
  }

  if (strength === L13EvidenceMatchStrength.DIRECT_MATCH) {
    reasons.add(L13EvidenceMatchReasonCode.DIRECT_REF_FOUND);
  }

  return {
    evidence_match_id: `l13.ematch.${fnv1a(
      [
        claim.extracted_claim_id,
        strength,
        [...matchedEvidenceRefs].sort().join(','),
        [...matchedLayers].sort().join(','),
        POLICY_V,
      ].join('|'),
    )}`,
    claim_ref: claim.extracted_claim_id,
    matched_evidence_refs: [...matchedEvidenceRefs].sort(),
    matched_source_layer_refs: [...matchedLayers].sort(),
    matched_surface_refs: [...matchedSurfaces].sort(),
    match_strength: strength,
    match_reason_codes: [...reasons].sort(),
    missing_required_evidence: missingRequired,
    policy_version: POLICY_V,
  };
}

export function matchL13EvidenceForClaims(
  claims: readonly L13ExtractedClaim[],
  pkg: L13AIInputPackage,
): readonly L13EvidenceMatch[] {
  const index = buildL13PackageRefIndex(pkg);
  return claims.map(c => matchL13Evidence(c, index));
}
