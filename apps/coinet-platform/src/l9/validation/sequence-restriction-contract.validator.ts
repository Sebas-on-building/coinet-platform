/**
 * L9.3 — SequenceRestrictionProfile Contract Validator — §9.3.6.4
 */

import { L9SequenceRestrictionProfileContract } from '../contracts/sequence-restriction.contract';
import { L9SequenceRelianceBand } from '../contracts/sequence-restriction-profile';
import { containsL9ForbiddenNaming } from '../contracts/l9-boundary';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9RestrictionContractIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
}
export interface L9RestrictionContractReport {
  readonly valid: boolean;
  readonly issues: readonly L9RestrictionContractIssue[];
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

export interface L9RestrictionValidationContext {
  /**
   * §9.3.6.4 — The assessment-level ambiguity score. If material, the
   * reliance band may not be DECISIVE.
   */
  readonly ambiguity_score?: number;
}

export function validateL9SequenceRestrictionProfileContract(
  r: L9SequenceRestrictionProfileContract,
  context: L9RestrictionValidationContext = {},
): L9RestrictionContractReport {
  const issues: L9RestrictionContractIssue[] = [];

  if (!r.sequence_restriction_profile_id || !r.sequence_result_id ||
      !r.sequence_subject_id) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_IDENTITY,
      message:
        'sequence_restriction_profile_id, sequence_result_id, or sequence_subject_id missing',
    });
  }
  if (!r.restriction_contract_version ||
      !SEMVER.test(r.restriction_contract_version)) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_CONTRACT_VERSION,
      message:
        `restriction_contract_version missing or not semver: ${r.restriction_contract_version}`,
    });
  }
  if (!r.reliance_band) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_BAND,
      message: 'reliance_band missing',
    });
  }
  if (!r.allowed_downstream_uses || r.allowed_downstream_uses.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_ALLOWED_USES,
      message: 'allowed_downstream_uses missing or empty',
    });
  }
  if (!r.blocked_uses || r.blocked_uses.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_BLOCKED_USES,
      message: 'blocked_uses missing or empty',
    });
  }
  if (!r.narrowing_reasons) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_NARROWING_REASONS,
      message: 'narrowing_reasons missing',
    });
  } else if (r.reliance_band &&
      r.reliance_band !== L9SequenceRelianceBand.DECISIVE &&
      r.reliance_band !== L9SequenceRelianceBand.PRIMARY &&
      r.narrowing_reasons.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_NARROWING_REASONS,
      message:
        `reliance_band=${r.reliance_band} requires at least one narrowing_reason`,
    });
  }

  // Allowed/blocked overlap
  if (r.allowed_downstream_uses && r.blocked_uses) {
    const blockedSet = new Set(r.blocked_uses);
    for (const u of r.allowed_downstream_uses) {
      if (blockedSet.has(u)) {
        issues.push({
          code:
            L9SequenceContractViolationCode.RESTRICTION_ALLOWED_AND_BLOCKED_OVERLAP,
          message: `use ${u} appears in both allowed and blocked sets`,
        });
      }
    }
  }

  // Decisive while ambiguity material
  if (r.reliance_band === L9SequenceRelianceBand.DECISIVE &&
      typeof context.ambiguity_score === 'number' &&
      context.ambiguity_score >= 0.3) {
    issues.push({
      code:
        L9SequenceContractViolationCode.RESTRICTION_DECISIVE_WHILE_AMBIGUOUS,
      message:
        `reliance_band=DECISIVE but ambiguity_score=${context.ambiguity_score} ≥ material`,
    });
  }

  // Lineage + replay
  if (!r.lineage_refs || !r.lineage_refs.trace_id ||
      !r.lineage_refs.manifest_id) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }
  if (!r.replay_hash) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  // Judgment leak in description
  if (r.description && containsL9ForbiddenNaming(r.description)) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_JUDGMENT_LEAK,
      message:
        'restriction.description contains forbidden judgment/scenario/recommendation semantics',
    });
  }

  return { valid: issues.length === 0, issues };
}
