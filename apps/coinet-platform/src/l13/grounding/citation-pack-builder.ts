/**
 * L13.4 — Citation Pack Builder
 *
 * §13.4.13 — Collects emitted claims' refs, groups them by source
 * layer, verifies every ref is governed (present in input package),
 * verifies each claim type has the required ref types, and computes
 * a citation completeness class.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import {
  L13CitationCompletenessClass,
  L13MissingCitationReasonCode,
  type L13CitationPack,
} from '../contracts/citation-pack';
import {
  L13ClaimType,
  type L13GroundedClaim,
} from '../contracts/grounded-claim';
import { fnv1a } from '../context/_fnv1a';
import {
  buildL13PackageRefIndex,
  type L13PackageRefIndex,
} from './_package-refs';

const POLICY_V = 'l13.grounding.v1';

/**
 * §13.4.13.2 — Required ref categories per claim type.
 *
 * Each entry maps a claim type → the citation-pack categories it
 * MUST appear in. The builder also enforces that referenced refs
 * live inside the input package index (otherwise the ref is
 * "ungoverned").
 */
const REQUIRED_REF_BUCKETS: Readonly<
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
  [L13ClaimType.USER_GUIDANCE_STATEMENT]: ['trigger_refs'],
  [L13ClaimType.RESTRICTION_STATEMENT]: [],
  [L13ClaimType.REFUSAL_STATEMENT]: [],
};

const MISSING_CODE_FOR_BUCKET: Readonly<
  Record<string, L13MissingCitationReasonCode>
> = {
  evidence_refs: L13MissingCitationReasonCode.MISSING_EVIDENCE_REF,
  scenario_refs: L13MissingCitationReasonCode.MISSING_SCENARIO_REF,
  score_refs: L13MissingCitationReasonCode.MISSING_SCORE_REF,
  hypothesis_refs: L13MissingCitationReasonCode.MISSING_HYPOTHESIS_REF,
  regime_refs: L13MissingCitationReasonCode.MISSING_REGIME_REF,
  sequence_refs: L13MissingCitationReasonCode.MISSING_SEQUENCE_REF,
  contradiction_refs: L13MissingCitationReasonCode.MISSING_CONTRADICTION_REF,
  validation_refs: L13MissingCitationReasonCode.MISSING_VALIDATION_REF,
  trigger_refs: L13MissingCitationReasonCode.MISSING_SCENARIO_REF,
  invalidation_refs: L13MissingCitationReasonCode.MISSING_SCENARIO_REF,
};

export interface L13CitationPackBuildInput {
  readonly output_id: string;
  readonly input_package: L13AIInputPackage;
  readonly emitted_claims: readonly L13GroundedClaim[];
}

/**
 * §13.4.13 — Build the citation pack.
 */
export function buildL13CitationPack(
  input: L13CitationPackBuildInput,
): L13CitationPack {
  const { output_id, input_package, emitted_claims } = input;
  const index = buildL13PackageRefIndex(input_package);

  const evidence = new Set<string>();
  const contradictions = new Set<string>();
  const scenarios = new Set<string>();
  const scores = new Set<string>();
  const hypotheses = new Set<string>();
  const regimes = new Set<string>();
  const sequences = new Set<string>();
  const validations = new Set<string>();
  const reasonCodes = new Set<L13MissingCitationReasonCode>();
  let ungoverned = false;
  let claimWithoutCitation = false;

  for (const claim of emitted_claims) {
    if (!claim.allowed_to_emit) continue;

    // Citation refs must come from package.
    for (const r of claim.supporting_evidence_refs) {
      if (!index.all_refs.has(r)) {
        ungoverned = true;
        reasonCodes.add(L13MissingCitationReasonCode.UNGOVERNED_REF);
      }
      // Categorize.
      if (index.scenario_refs.has(r)) scenarios.add(r);
      else if (index.score_refs.has(r)) scores.add(r);
      else if (index.hypothesis_refs.has(r)) hypotheses.add(r);
      else if (index.regime_refs.has(r)) regimes.add(r);
      else if (index.sequence_refs.has(r)) sequences.add(r);
      else if (index.validation_refs.has(r)) validations.add(r);
      else if (index.evidence_refs.has(r)) evidence.add(r);
      else if (index.trigger_refs.has(r) || index.invalidation_refs.has(r))
        scenarios.add(r);
    }
    for (const r of claim.contradiction_refs) {
      if (!index.all_refs.has(r)) {
        ungoverned = true;
        reasonCodes.add(L13MissingCitationReasonCode.UNGOVERNED_REF);
      }
      contradictions.add(r);
    }

    // Required-bucket check.
    const buckets = REQUIRED_REF_BUCKETS[claim.claim_type] ?? [];
    if (buckets.length === 0) continue;

    // Claim must reference at least one ref from at least one
    // required bucket.
    let satisfied = false;
    for (const b of buckets) {
      const bucketSet = index[b] as ReadonlySet<string>;
      const hit = claim.supporting_evidence_refs.some(r =>
        bucketSet.has(r),
      );
      if (hit) {
        satisfied = true;
        break;
      }
    }
    if (!satisfied) {
      claimWithoutCitation = true;
      for (const b of buckets) {
        const code = MISSING_CODE_FOR_BUCKET[b];
        if (code) reasonCodes.add(code);
      }
      reasonCodes.add(
        L13MissingCitationReasonCode.CLAIM_HAS_NO_CITATION,
      );
    }
  }

  // Contradiction claims must carry a contradiction_ref.
  for (const claim of emitted_claims) {
    if (
      claim.allowed_to_emit &&
      claim.claim_type === L13ClaimType.CONTRADICTION_STATEMENT &&
      claim.contradiction_refs.length === 0
    ) {
      claimWithoutCitation = true;
      reasonCodes.add(
        L13MissingCitationReasonCode.MISSING_CONTRADICTION_REF,
      );
    }
  }

  let completeness: L13CitationCompletenessClass;
  if (ungoverned) {
    completeness = L13CitationCompletenessClass.BLOCKED_UNGOVERNED_CITATION;
  } else if (claimWithoutCitation) {
    completeness =
      L13CitationCompletenessClass.BLOCKED_MISSING_CRITICAL_CITATION;
  } else if (reasonCodes.size > 0) {
    completeness = L13CitationCompletenessClass.PARTIAL_CITATION_PACK;
  } else if (
    emitted_claims.some(c => c.allowed_to_emit && c.disclosure_required)
  ) {
    completeness = L13CitationCompletenessClass.COMPLETE_WITH_DISCLOSURE;
  } else {
    completeness = L13CitationCompletenessClass.COMPLETE_CITATION_PACK;
  }

  const claimRefs = emitted_claims
    .filter(c => c.allowed_to_emit)
    .map(c => c.claim_id)
    .sort();

  const replayHash = fnv1a(
    [
      'L13_CITATION_PACK',
      output_id,
      input_package.input_package_id,
      claimRefs.join(','),
      [...evidence].sort().join(','),
      [...contradictions].sort().join(','),
      [...scenarios].sort().join(','),
      [...scores].sort().join(','),
      [...hypotheses].sort().join(','),
      [...regimes].sort().join(','),
      [...sequences].sort().join(','),
      [...validations].sort().join(','),
      completeness,
      [...reasonCodes].sort().join(','),
      POLICY_V,
    ].join('|'),
  );

  return {
    citation_pack_id: `l13.citepack.${replayHash}`,
    output_id,
    input_package_id: input_package.input_package_id,
    claim_refs: claimRefs,
    evidence_refs: [...evidence].sort(),
    contradiction_refs: [...contradictions].sort(),
    scenario_refs: [...scenarios].sort(),
    score_refs: [...scores].sort(),
    hypothesis_refs: [...hypotheses].sort(),
    regime_refs: [...regimes].sort(),
    sequence_refs: [...sequences].sort(),
    validation_refs: [...validations].sort(),
    citation_completeness_class: completeness,
    missing_citation_reason_codes: [...reasonCodes].sort(),
    lineage_refs: ['l13.lineage.citation-pack-builder'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
