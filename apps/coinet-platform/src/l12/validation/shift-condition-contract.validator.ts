/**
 * L12.3 — Shift-condition contract validator (§12.3.11.2).
 */

import {
  detectL12RecommendationLanguage,
} from '../contracts/l12-mission';
import {
  l12ShiftConditionsRequired,
  L12ShiftConditionContract,
  L12ShiftConditionRequirementPosture,
} from '../contracts/scenario-shift-condition.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

export interface L12ShiftConditionContextForValidation {
  readonly posture?: L12ShiftConditionRequirementPosture;
  /** Refs that the shift contract may legally cite as governed inputs. */
  readonly governedInputRefs?: readonly string[];
}

const TRADE_LANG: readonly RegExp[] = [
  /(?:^|[^a-z0-9])(buy|sell|long|short)(?:[^a-z0-9]|$)/i,
  /entry[_\s]?(point|signal|price)/i,
  /exit[_\s]?(point|signal|price)/i,
];

const UNGOVERNED_REF_PATTERN = /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i;

function any(text: string, pats: readonly RegExp[]): boolean {
  if (!text) return false;
  return pats.some(p => p.test(text));
}

export function validateL12ShiftConditionContract(
  c: L12ShiftConditionContract,
  ctx?: L12ShiftConditionContextForValidation,
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const sid = c.shift_condition_contract_id || '<unknown>';

  if (
    !c.shift_condition_contract_id ||
    !c.shift_condition_set_id ||
    !c.scenario_set_id ||
    !c.policy_version ||
    !c.replay_hash
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_SHIFT_CONTRACT_INCOMPLETE,
      subject_id: sid,
      detail: 'shift contract is missing required fields',
    });
  }
  if (!c.current_primary_scenario_ref) {
    v.push({
      code: L12ContractViolationCode.L12K_SHIFT_PRIMARY_REF_MISSING,
      subject_id: sid,
      detail: 'current_primary_scenario_ref required',
    });
  }
  if (ctx?.posture) {
    const required = l12ShiftConditionsRequired(ctx.posture);
    if (required) {
      if (
        ctx.posture.secondaryPathClose &&
        !c.current_secondary_scenario_ref
      ) {
        v.push({
          code: L12ContractViolationCode.L12K_SHIFT_SECONDARY_REF_MISSING_UNDER_CLOSE,
          subject_id: sid,
          detail: 'secondary scenario close but secondary ref missing',
        });
      }
      if (
        c.current_secondary_scenario_ref &&
        c.conditions_that_promote_secondary.length === 0
      ) {
        v.push({
          code: L12ContractViolationCode.L12K_SHIFT_PROMOTION_MISSING_UNDER_CLOSE,
          subject_id: sid,
          detail: 'secondary exists but no promotion conditions',
        });
      }
      if (
        ctx.posture.activeInvalidationMaterial &&
        c.conditions_that_collapse_base_case.length === 0
      ) {
        v.push({
          code: L12ContractViolationCode.L12K_SHIFT_COLLAPSE_MISSING_UNDER_CLOSE,
          subject_id: sid,
          detail: 'active invalidation material but no base-case collapse conditions',
        });
      }
    }
  }
  // Trade language / recommendation
  const allConditions: readonly string[] = [
    ...(c.conditions_that_strengthen_primary ?? []),
    ...(c.conditions_that_weaken_primary ?? []),
    ...(c.conditions_that_promote_secondary ?? []),
    ...(c.conditions_that_collapse_base_case ?? []),
    ...(c.conditions_that_raise_bullish_path ?? []),
    ...(c.conditions_that_raise_bearish_path ?? []),
    ...(c.spread_narrowing_conditions ?? []),
    ...(c.spread_widening_conditions ?? []),
  ];
  for (const ref of allConditions) {
    if (any(ref, TRADE_LANG)) {
      v.push({
        code: L12ContractViolationCode.L12K_SHIFT_TRADE_LANGUAGE,
        subject_id: sid,
        detail: `shift condition carries trade language: "${ref}"`,
      });
      break;
    }
  }
  for (const ref of allConditions) {
    if (detectL12RecommendationLanguage(ref)) {
      v.push({
        code: L12ContractViolationCode.L12K_SHIFT_RECOMMENDATION,
        subject_id: sid,
        detail: `shift condition carries recommendation language: "${ref}"`,
      });
      break;
    }
  }
  if (ctx?.governedInputRefs !== undefined) {
    const allowed = new Set(ctx.governedInputRefs);
    for (const ref of allConditions) {
      if (UNGOVERNED_REF_PATTERN.test(ref) || (allowed.size > 0 && !allowed.has(ref))) {
        v.push({
          code: L12ContractViolationCode.L12K_SHIFT_UNGOVERNED_INPUT,
          subject_id: sid,
          detail: `shift condition references ungoverned input: "${ref}"`,
        });
        break;
      }
    }
  } else {
    for (const ref of allConditions) {
      if (UNGOVERNED_REF_PATTERN.test(ref)) {
        v.push({
          code: L12ContractViolationCode.L12K_SHIFT_UNGOVERNED_INPUT,
          subject_id: sid,
          detail: `shift condition references ungoverned input: "${ref}"`,
        });
        break;
      }
    }
  }
  return v;
}
