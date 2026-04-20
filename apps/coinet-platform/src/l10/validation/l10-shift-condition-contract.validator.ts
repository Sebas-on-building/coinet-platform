/**
 * L10.3 — Shift-Condition Contract Validator
 *
 * §10.3.7.2 — Shift-condition sets must declare promotion,
 * reinforcement, and collapse conditions explicitly. Empty lists are
 * legal; absence of the list itself is not.
 */

import type { L10HypothesisShiftConditionContract } from '../contracts/hypothesis-shift-condition.contract';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';

export function validateL10ShiftConditionContract(
  s: L10HypothesisShiftConditionContract,
  opts: { readonly competition_live?: boolean } = {},
): L10ContractReport {
  const issues: L10ContractIssue[] = [];

  if (!s.shift_condition_set_id)
    issues.push({ code: V.SHIFT_MISSING_IDENTITY, message: 'shift_condition_set_id required' });
  if (!s.shift_condition_contract_version)
    issues.push({ code: V.SHIFT_MISSING_CONTRACT_VERSION, message: 'shift_condition_contract_version required' });
  if (!s.ranking_ref)
    issues.push({ code: V.SHIFT_MISSING_RANKING_REF, message: 'ranking_ref required' });
  if (!s.current_primary_ref)
    issues.push({ code: V.SHIFT_MISSING_PRIMARY, message: 'current_primary_ref required' });
  if (opts.competition_live === true && !s.current_secondary_ref) {
    issues.push({ code: V.SHIFT_MISSING_SECONDARY_WHEN_COMPETITION,
      message: 'current_secondary_ref required when competition is live' });
  }
  if (!s.promotion_conditions_for_secondary) {
    issues.push({ code: V.SHIFT_MISSING_PROMOTION_CONDITIONS,
      message: 'promotion_conditions_for_secondary must be declared' });
  }
  if (!s.reinforcement_conditions_for_primary) {
    issues.push({ code: V.SHIFT_MISSING_REINFORCEMENT_CONDITIONS,
      message: 'reinforcement_conditions_for_primary must be declared' });
  }
  if (!s.collapse_conditions_for_primary) {
    issues.push({ code: V.SHIFT_MISSING_COLLAPSE_CONDITIONS,
      message: 'collapse_conditions_for_primary must be declared' });
  }

  if (!s.replay_hash)
    issues.push({ code: V.SHIFT_MISSING_REPLAY_HASH, message: 'replay_hash required' });
  if (!s.lineage_refs
    || !s.lineage_refs.trace_id
    || !s.lineage_refs.manifest_id) {
    issues.push({ code: V.SHIFT_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and .manifest_id required' });
  }

  return { valid: issues.length === 0, issues };
}
