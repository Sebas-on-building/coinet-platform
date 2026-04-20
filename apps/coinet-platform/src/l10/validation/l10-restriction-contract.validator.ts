/**
 * L10.3 — Restriction Profile Contract Validator
 *
 * §10.3.7.3 — A restriction profile is illegal if its reliance band is
 * absent, if mandatory blocked uses are missing, if allowed and blocked
 * uses overlap semantically (decisive-while-competition-live), or if
 * narrowing reasons are absent for a restrictive / narrow band.
 */

import type { L10HypothesisRestrictionProfileContract } from '../contracts/hypothesis-restriction.contract';
import {
  L10_MANDATORY_BLOCKED_USES,
  L10BlockedUse,
  L10RelianceBand,
  ALL_L10_RELIANCE_BANDS,
} from '../contracts/hypothesis-restriction-profile';
import { checkL10ContractLeak } from './l10-contract-leak-patterns';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';

export function validateL10RestrictionContract(
  p: L10HypothesisRestrictionProfileContract,
): L10ContractReport {
  const issues: L10ContractIssue[] = [];

  if (!p.hypothesis_restriction_profile_id)
    issues.push({ code: V.RESTRICTION_MISSING_IDENTITY,
      message: 'hypothesis_restriction_profile_id required' });
  if (!p.restriction_contract_version)
    issues.push({ code: V.RESTRICTION_MISSING_CONTRACT_VERSION,
      message: 'restriction_contract_version required' });

  if (!p.reliance_band || !ALL_L10_RELIANCE_BANDS.includes(p.reliance_band)) {
    issues.push({ code: V.RESTRICTION_MISSING_BAND,
      message: 'reliance_band must be a registered band' });
  }

  if (!p.allowed_downstream_uses) {
    issues.push({ code: V.RESTRICTION_MISSING_ALLOWED_USES,
      message: 'allowed_downstream_uses must be declared' });
  }
  if (!p.blocked_uses) {
    issues.push({ code: V.RESTRICTION_MISSING_BLOCKED_USES,
      message: 'blocked_uses must be declared' });
  } else {
    const have = new Set(p.blocked_uses);
    const missingMandatory = L10_MANDATORY_BLOCKED_USES.filter(b => !have.has(b));
    if (missingMandatory.length > 0) {
      issues.push({ code: V.RESTRICTION_MISSING_MANDATORY_BLOCKED_USES,
        message: `mandatory blocked uses missing: ${missingMandatory.join(', ')}` });
    }
  }

  // Decisive-while-competition-live (§10.3.7.3)
  if (p.competition_live_flag === true
    && p.reliance_band === L10RelianceBand.BROADENED) {
    issues.push({ code: V.RESTRICTION_DECISIVE_WHILE_COMPETITION_LIVE,
      message: 'reliance_band may not be BROADENED while competition is live' });
  }

  if (p.competition_live_flag === true
    && !(p.blocked_uses ?? []).includes(
      L10BlockedUse.MAY_NOT_BE_SURFACED_WITHOUT_COMPETITION)) {
    issues.push({ code: V.RESTRICTION_DECISIVE_WHILE_COMPETITION_LIVE,
      message: 'MAY_NOT_BE_SURFACED_WITHOUT_COMPETITION required when competition is live' });
  }

  if (p.narrow_spread_flag === true
    && !(p.blocked_uses ?? []).includes(
      L10BlockedUse.MAY_NOT_BE_SURFACED_WITHOUT_SPREAD)) {
    issues.push({ code: V.RESTRICTION_DECISIVE_WHILE_COMPETITION_LIVE,
      message: 'MAY_NOT_BE_SURFACED_WITHOUT_SPREAD required when narrow_spread_flag is true' });
  }

  // Narrowing reasons required for restrictive / narrow bands
  if ((p.reliance_band === L10RelianceBand.NARROW
        || p.reliance_band === L10RelianceBand.RESTRICTED)
      && (!p.narrowing_reasons || p.narrowing_reasons.length === 0)) {
    issues.push({ code: V.RESTRICTION_MISSING_NARROWING_REASONS,
      message: 'narrowing_reasons required for NARROW / RESTRICTED bands' });
  }

  // No semantic leaks in description
  if (p.description) {
    const leak = checkL10ContractLeak(p.description);
    if (leak.leaks) {
      issues.push({ code: V.RESTRICTION_JUDGMENT_LEAK,
        message: `restriction description leaks ${leak.label ?? 'forbidden'} semantics` });
    }
  }

  if (!p.replay_hash)
    issues.push({ code: V.RESTRICTION_MISSING_REPLAY_HASH,
      message: 'replay_hash required' });
  if (!p.lineage_refs
    || !p.lineage_refs.trace_id
    || !p.lineage_refs.manifest_id) {
    issues.push({ code: V.RESTRICTION_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and .manifest_id required' });
  }

  return { valid: issues.length === 0, issues };
}
