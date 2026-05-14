/**
 * L13.4 — Grounded Claim Validator
 *
 * §13.4.16 — Validates identity, trace, support, contradiction
 * dominance, and rewrite/block consistency for a grounded claim.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import {
  claimTypeRequiresEvidence,
  isL13BlockedGroundingClass,
  L13ClaimGroundingClass,
  L13ClaimType,
  L13ClaimStrengthClass,
  type L13GroundedClaim,
} from '../contracts/grounded-claim';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { buildL13PackageRefIndex } from '../grounding/_package-refs';
import { L13GroundingViolationCode } from './l13-grounding-violation-codes';
import {
  l13GroundingResult,
  type L13GroundingIssue,
  type L13GroundingValidationResult,
} from './_l13-grounding-issue';

const SEV = L13ViolationSeverity;

function missing(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '')
  );
}

function err(
  code: L13GroundingViolationCode,
  severity: L13ViolationSeverity,
  message: string,
  subject_ref?: string,
): L13GroundingIssue {
  return { code, severity, message, subject_ref };
}

export function validateL13GroundedClaim(
  claim: L13GroundedClaim,
  pkg?: L13AIInputPackage,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];

  if (missing(claim.claim_id))
    issues.push(err(L13GroundingViolationCode.L13G_CLAIM_ID_MISSING, SEV.CRITICAL, 'claim_id missing'));
  if (missing(claim.output_id))
    issues.push(err(L13GroundingViolationCode.L13G_OUTPUT_REF_MISSING, SEV.CRITICAL, 'output_id missing', claim.claim_id));
  if (missing(claim.input_package_id))
    issues.push(err(L13GroundingViolationCode.L13G_INPUT_PACKAGE_REF_MISSING, SEV.CRITICAL, 'input_package_id missing', claim.claim_id));
  if (missing(claim.claim_text))
    issues.push(err(L13GroundingViolationCode.L13G_CLAIM_TEXT_MISSING, SEV.CRITICAL, 'claim_text missing', claim.claim_id));
  if (missing(claim.claim_type))
    issues.push(err(L13GroundingViolationCode.L13G_CLAIM_TYPE_MISSING, SEV.CRITICAL, 'claim_type missing', claim.claim_id));
  if (missing(claim.grounding_class))
    issues.push(err(L13GroundingViolationCode.L13G_GROUNDING_CLASS_MISSING, SEV.CRITICAL, 'grounding_class missing', claim.claim_id));
  if (missing(claim.section_ref))
    issues.push(err(L13GroundingViolationCode.L13G_SECTION_REF_MISSING, SEV.ERROR, 'section_ref missing', claim.claim_id));
  if (missing(claim.policy_version))
    issues.push(err(L13GroundingViolationCode.L13G_POLICY_VERSION_MISSING, SEV.ERROR, 'policy_version missing', claim.claim_id));
  if (missing(claim.replay_hash))
    issues.push(err(L13GroundingViolationCode.L13G_REPLAY_HASH_MISSING, SEV.CRITICAL, 'replay_hash missing', claim.claim_id));
  if (claim.lineage_refs.length === 0)
    issues.push(err(L13GroundingViolationCode.L13G_LINEAGE_REF_MISSING, SEV.ERROR, 'lineage_refs missing', claim.claim_id));

  // §13.4.3.2 — Evidence requirement.
  if (
    claim.allowed_to_emit &&
    claimTypeRequiresEvidence(claim.claim_type) &&
    claim.supporting_evidence_refs.length === 0
  ) {
    issues.push(
      err(
        L13GroundingViolationCode.L13G_ALLOWED_CLAIM_WITHOUT_EVIDENCE,
        SEV.CRITICAL,
        `${claim.claim_type} emitted without supporting evidence refs`,
        claim.claim_id,
      ),
    );
  }

  // §13.4.11.4 — Blocked grounding class cannot emit.
  if (isL13BlockedGroundingClass(claim.grounding_class) && claim.allowed_to_emit) {
    const code =
      claim.grounding_class === L13ClaimGroundingClass.CONTRADICTED_BLOCKED
        ? L13GroundingViolationCode.L13G_CONTRADICTED_CLAIM_EMITTED
        : L13GroundingViolationCode.L13G_UNSUPPORTED_CLAIM_EMITTED;
    issues.push(
      err(
        code,
        SEV.CRITICAL,
        `claim with grounding_class=${claim.grounding_class} marked allowed_to_emit=true`,
        claim.claim_id,
      ),
    );
  }

  // §13.4.5.1 — Weak strength used with strong grounding.
  if (
    claim.grounding_class === L13ClaimGroundingClass.DIRECTLY_SUPPORTED &&
    claim.claim_strength === L13ClaimStrengthClass.WEAK_DISCLOSURE_ONLY
  ) {
    issues.push(
      err(
        L13GroundingViolationCode.L13G_WEAK_MATCH_USED_AS_STRONG_SUPPORT,
        SEV.ERROR,
        'DIRECTLY_SUPPORTED claim cannot carry WEAK_DISCLOSURE_ONLY strength',
        claim.claim_id,
      ),
    );
  }

  // §13.4.10 — Semantic match overrides contradiction.
  if (
    claim.contradiction_refs.length > 0 &&
    claim.allowed_to_emit &&
    !claim.disclosure_required &&
    !claim.uncertainty_required
  ) {
    issues.push(
      err(
        L13GroundingViolationCode.L13G_SEMANTIC_MATCH_OVERRIDES_CONTRADICTION,
        SEV.CRITICAL,
        'claim emits with contradiction refs but no disclosure or uncertainty',
        claim.claim_id,
      ),
    );
  }

  // §13.4.13 — Contradiction claim must carry contradiction refs.
  if (
    claim.claim_type === L13ClaimType.CONTRADICTION_STATEMENT &&
    claim.allowed_to_emit &&
    claim.contradiction_refs.length === 0
  ) {
    issues.push(
      err(
        L13GroundingViolationCode.L13G_CONTRADICTION_CLAIM_WITHOUT_CONTRADICTION_REF,
        SEV.CRITICAL,
        'contradiction claim lacks contradiction refs',
        claim.claim_id,
      ),
    );
  }

  // §13.4.4.x — Source-layer specific claim must carry the ref bucket
  // appropriate to its type.
  if (claim.allowed_to_emit) {
    if (
      claim.claim_type === L13ClaimType.SCENARIO_STATEMENT &&
      claim.supporting_evidence_refs.length === 0
    ) {
      issues.push(
        err(
          L13GroundingViolationCode.L13G_SCENARIO_CLAIM_WITHOUT_SCENARIO_REF,
          SEV.CRITICAL,
          'scenario claim missing scenario refs',
          claim.claim_id,
        ),
      );
    }
    if (
      claim.claim_type === L13ClaimType.SCORE_STATEMENT &&
      claim.supporting_evidence_refs.length === 0
    ) {
      issues.push(
        err(
          L13GroundingViolationCode.L13G_SCORE_CLAIM_WITHOUT_SCORE_REF,
          SEV.CRITICAL,
          'score claim missing score refs',
          claim.claim_id,
        ),
      );
    }
    if (
      claim.claim_type === L13ClaimType.HYPOTHESIS_STATEMENT &&
      claim.supporting_evidence_refs.length === 0
    ) {
      issues.push(
        err(
          L13GroundingViolationCode.L13G_HYPOTHESIS_CLAIM_WITHOUT_HYPOTHESIS_REF,
          SEV.CRITICAL,
          'hypothesis claim missing hypothesis refs',
          claim.claim_id,
        ),
      );
    }
    if (
      claim.claim_type === L13ClaimType.REGIME_STATEMENT &&
      claim.supporting_evidence_refs.length === 0
    ) {
      issues.push(
        err(
          L13GroundingViolationCode.L13G_REGIME_CLAIM_WITHOUT_REGIME_REF,
          SEV.CRITICAL,
          'regime claim missing regime refs',
          claim.claim_id,
        ),
      );
    }
    if (
      claim.claim_type === L13ClaimType.SEQUENCE_STATEMENT &&
      claim.supporting_evidence_refs.length === 0
    ) {
      issues.push(
        err(
          L13GroundingViolationCode.L13G_SEQUENCE_CLAIM_WITHOUT_SEQUENCE_REF,
          SEV.CRITICAL,
          'sequence claim missing sequence refs',
          claim.claim_id,
        ),
      );
    }
  }

  // §13.4.16 — Source-layer ref check against input package.
  if (pkg) {
    const index = buildL13PackageRefIndex(pkg);
    for (const r of claim.supporting_evidence_refs) {
      if (!index.all_refs.has(r)) {
        issues.push(
          err(
            L13GroundingViolationCode.L13G_EVIDENCE_REF_NOT_IN_PACKAGE,
            SEV.ERROR,
            `evidence ref "${r}" not present in input package`,
            claim.claim_id,
          ),
        );
      }
    }
    for (const r of claim.contradiction_refs) {
      if (!index.all_refs.has(r)) {
        issues.push(
          err(
            L13GroundingViolationCode.L13G_CONTRADICTION_REF_NOT_IN_PACKAGE,
            SEV.ERROR,
            `contradiction ref "${r}" not present in input package`,
            claim.claim_id,
          ),
        );
      }
    }
  }

  return l13GroundingResult(issues);
}

export function validateL13GroundedClaims(
  claims: readonly L13GroundedClaim[],
  pkg?: L13AIInputPackage,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];
  for (const c of claims) {
    issues.push(...validateL13GroundedClaim(c, pkg).issues);
  }
  return l13GroundingResult(issues);
}
