/**
 * L10.3 — Candidate Contract Validator
 *
 * §10.3.3.6 — A candidate contract is illegal if pattern refs for
 * support/challenge/confirmation/invalidation are missing, if the
 * name/description leak judgment/recommendation/finality semantics,
 * or if restriction-defaults, confidence spec, threshold profile,
 * challenge tolerance, competition group, or lineage are missing.
 */

import type { L10HypothesisCandidateContract } from '../contracts/hypothesis-candidate.contract';
import {
  L10HypothesisFamilyRegistry,
  getDefaultL10HypothesisFamilyRegistry,
} from '../registry/hypothesis-family.registry';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';
import { checkL10ContractLeak } from './l10-contract-leak-patterns';

export function validateL10CandidateContract(
  c: L10HypothesisCandidateContract,
  familyRegistry: L10HypothesisFamilyRegistry =
    getDefaultL10HypothesisFamilyRegistry(),
): L10ContractReport {
  const issues: L10ContractIssue[] = [];

  // Identity (§10.3.3.2)
  if (!c.hypothesis_candidate_id) {
    issues.push({ code: V.CANDIDATE_MISSING_IDENTITY,
      message: 'hypothesis_candidate_id is required' });
  }
  if (!c.hypothesis_subject_id) {
    issues.push({ code: V.CANDIDATE_MISSING_SUBJECT,
      message: 'hypothesis_subject_id is required' });
  }
  if (!c.hypothesis_family) {
    issues.push({ code: V.CANDIDATE_MISSING_FAMILY,
      message: 'hypothesis_family is required' });
  } else if (!familyRegistry.has(c.hypothesis_family)) {
    issues.push({ code: V.CANDIDATE_FAMILY_UNREGISTERED,
      message: `hypothesis_family '${c.hypothesis_family}' is not registered` });
  }
  if (!c.hypothesis_template_id) {
    issues.push({ code: V.CANDIDATE_MISSING_TEMPLATE,
      message: 'hypothesis_template_id is required' });
  }
  if (!c.template_version) {
    issues.push({ code: V.CANDIDATE_MISSING_TEMPLATE_VERSION,
      message: 'template_version is required' });
  }
  if (!c.hypothesis_name) {
    issues.push({ code: V.CANDIDATE_MISSING_NAME,
      message: 'hypothesis_name is required' });
  } else {
    const leakName = checkL10ContractLeak(c.hypothesis_name);
    if (leakName.leaks) {
      issues.push({ code: V.CANDIDATE_NAME_LEAKS_SEMANTICS,
        message: `hypothesis_name leaks ${leakName.label ?? 'forbidden'} semantics` });
    }
  }

  // Versioning (§10.3.8.1)
  if (!c.candidate_contract_version) {
    issues.push({ code: V.CANDIDATE_MISSING_CONTRACT_VERSION,
      message: 'candidate_contract_version is required' });
  }

  // Pattern posture (§10.3.3.2) — every candidate must surface all four
  // pattern sets explicitly, even if empty. Undefined is illegal.
  if (!c.required_support_patterns) {
    issues.push({ code: V.CANDIDATE_MISSING_SUPPORT_PATTERNS,
      message: 'required_support_patterns must be declared' });
  }
  if (!c.required_challenge_patterns) {
    issues.push({ code: V.CANDIDATE_MISSING_CHALLENGE_PATTERNS,
      message: 'required_challenge_patterns must be declared' });
  }
  if (!c.required_confirmation_patterns) {
    issues.push({ code: V.CANDIDATE_MISSING_CONFIRMATION_PATTERNS,
      message: 'required_confirmation_patterns must be declared' });
  }
  if (!c.invalidation_patterns) {
    issues.push({ code: V.CANDIDATE_MISSING_INVALIDATION_PATTERNS,
      message: 'invalidation_patterns must be declared' });
  }

  // Conditioning (§10.3.3.2)
  const fd = c.hypothesis_family
    ? familyRegistry.get(c.hypothesis_family)
    : undefined;
  if (fd?.requiresRegimeConditioning
    && (!c.regime_conditioning_requirements
        || c.regime_conditioning_requirements.length === 0)) {
    issues.push({ code: V.CANDIDATE_MISSING_REGIME_CONDITIONING,
      message: 'regime_conditioning_requirements required for regime-conditioned family' });
  }
  if (fd?.requiresSequenceConditioning
    && (!c.sequence_conditioning_requirements
        || c.sequence_conditioning_requirements.length === 0)) {
    issues.push({ code: V.CANDIDATE_MISSING_SEQUENCE_CONDITIONING,
      message: 'sequence_conditioning_requirements required for sequence-conditioned family' });
  }

  // Evaluation (§10.3.3.3)
  if (!c.support_threshold_profile) {
    issues.push({ code: V.CANDIDATE_MISSING_SUPPORT_THRESHOLDS,
      message: 'support_threshold_profile is required' });
  }
  if (!c.challenge_tolerance_profile) {
    issues.push({ code: V.CANDIDATE_MISSING_CHALLENGE_TOLERANCE,
      message: 'challenge_tolerance_profile is required' });
  }
  if (!c.confidence_derivation_spec) {
    issues.push({ code: V.CANDIDATE_MISSING_CONFIDENCE_SPEC,
      message: 'confidence_derivation_spec is required' });
  }
  if (!c.restriction_defaults
    || c.restriction_defaults.forbid_decisive_when_competition_live !== true) {
    issues.push({ code: V.CANDIDATE_MISSING_RESTRICTION_DEFAULTS,
      message: 'restriction_defaults must forbid decisive while competition live' });
  }

  // Competition (§10.3.3.5)
  if (!c.competition_group) {
    issues.push({ code: V.CANDIDATE_MISSING_COMPETITION_GROUP,
      message: 'competition_group is required' });
  }

  // Lineage
  if (!c.lineage_refs
    || !c.lineage_refs.trace_id
    || !c.lineage_refs.manifest_id) {
    issues.push({ code: V.CANDIDATE_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and .manifest_id are required' });
  }

  // Finality / leak (§10.3.5.4 mirrored at candidate tier)
  if (c.description) {
    const leak = checkL10ContractLeak(c.description);
    if (leak.leaks) {
      issues.push({ code: V.CANDIDATE_CARRIES_FINALITY,
        message: `candidate description leaks ${leak.label ?? 'forbidden'} semantics` });
    }
  }

  return { valid: issues.length === 0, issues };
}
