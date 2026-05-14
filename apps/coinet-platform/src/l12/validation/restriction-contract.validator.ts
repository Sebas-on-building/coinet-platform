/**
 * L12.3 — Restriction contract validator (§12.3.12.3).
 */

import { L12RestrictionContract } from '../contracts/scenario-restriction.contract';
import {
  L12ScenarioBlockedUse,
  L12ScenarioDisclosureRequirement,
} from '../contracts/scenario-restriction-profile';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

export interface L12RestrictionContextForValidation {
  readonly required_disclosures?: readonly L12ScenarioDisclosureRequirement[];
  /** Whether the readiness posture allows the same allowed_uses set. */
  readonly readiness_allows_uses?: boolean;
}

export function validateL12RestrictionContract(
  c: L12RestrictionContract,
  ctx?: L12RestrictionContextForValidation,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.restriction_contract_id || '<unknown>';

  if (
    !c.restriction_contract_id ||
    !c.restriction_profile_id ||
    !c.scenario_set_id ||
    !c.policy_version ||
    !c.replay_hash
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_RESTRICTION_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'restriction contract is missing required fields',
    });
  }
  if (!c.allowed_uses || c.allowed_uses.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_RESTRICTION_ALLOWED_USES_EMPTY,
      subject_id: sid,
      detail: 'allowed_uses required',
    });
  }
  if (!c.blocked_uses || c.blocked_uses.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_RESTRICTION_BLOCKED_USES_EMPTY,
      subject_id: sid,
      detail: 'blocked_uses required',
    });
  } else {
    const blocked = new Set(c.blocked_uses);
    if (!blocked.has(L12ScenarioBlockedUse.RECOMMENDATION_OUTPUT)) {
      v.push({
        code: L12ContractViolationCode.L12K_RESTRICTION_RECOMMENDATION_NOT_BLOCKED,
        subject_id: sid,
        detail: 'RECOMMENDATION_OUTPUT must be blocked',
      });
    }
    if (!blocked.has(L12ScenarioBlockedUse.PREDICTION_OUTPUT)) {
      v.push({
        code: L12ContractViolationCode.L12K_RESTRICTION_PREDICTION_NOT_BLOCKED,
        subject_id: sid,
        detail: 'PREDICTION_OUTPUT must be blocked',
      });
    }
    if (!blocked.has(L12ScenarioBlockedUse.TRADE_ACTION_OUTPUT)) {
      v.push({
        code: L12ContractViolationCode.L12K_RESTRICTION_TRADE_NOT_BLOCKED,
        subject_id: sid,
        detail: 'TRADE_ACTION_OUTPUT must be blocked',
      });
    }
    if (!blocked.has(L12ScenarioBlockedUse.FINAL_JUDGMENT_WITHOUT_L13)) {
      v.push({
        code: L12ContractViolationCode.L12K_RESTRICTION_FINAL_JUDGMENT_NOT_BLOCKED,
        subject_id: sid,
        detail: 'FINAL_JUDGMENT_WITHOUT_L13 must be blocked',
      });
    }
    if (!blocked.has(L12ScenarioBlockedUse.CERTAINTY_CLAIM)) {
      v.push({
        code: L12ContractViolationCode.L12K_RESTRICTION_CERTAINTY_NOT_BLOCKED,
        subject_id: sid,
        detail: 'CERTAINTY_CLAIM must be blocked',
      });
    }
  }
  if (
    !c.restriction_reason_codes ||
    c.restriction_reason_codes.length === 0
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_RESTRICTION_REASON_CODES_MISSING,
      subject_id: sid,
      detail: 'restriction_reason_codes required',
    });
  }
  if (ctx?.required_disclosures) {
    const present = new Set(c.required_disclosures ?? []);
    for (const d of ctx.required_disclosures) {
      if (!present.has(d)) {
        v.push({
          code: L12ContractViolationCode.L12K_RESTRICTION_DISCLOSURE_REQUIRED_BUT_ABSENT,
          subject_id: sid,
          detail: `required disclosure missing: ${d}`,
        });
      }
    }
  }
  if (ctx?.readiness_allows_uses === false) {
    v.push({
      code: L12ContractViolationCode.L12K_RESTRICTION_BROADER_THAN_READINESS,
      subject_id: sid,
      detail: 'restriction profile broader than readiness allows',
    });
  }
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    v.push({
      code: L12ContractViolationCode.L12K_LINEAGE_REFS_ABSENT,
      subject_id: sid,
      detail: 'lineage_refs required',
    });
  }
  return v;
}
