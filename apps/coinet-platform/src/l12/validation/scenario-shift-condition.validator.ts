/**
 * L12.2 — ScenarioShiftConditionSet validator (§12.2.14.2).
 */

import { detectL12RecommendationLanguage } from '../contracts/l12-mission';
import { L12ScenarioShiftConditionSet } from '../contracts/scenario-shift-condition';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

const TRADE_LANG = /(?:^|[^a-z0-9])(buy|sell|long|short|enter|exit|trim|allocate)(?:[^a-z0-9]|$)/i;

export interface L12ShiftConditionInputs {
  /** Whether scenario competition is narrow / unresolved / close secondary / material invalidation pressure. */
  readonly competitionIsClose: boolean;
}

export function validateL12ScenarioShiftConditionSet(
  s: L12ScenarioShiftConditionSet,
  inputs: L12ShiftConditionInputs,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = s.shift_condition_set_id || '<unknown>';

  if (!s.current_primary_scenario_ref) {
    v.push({ code: L12ObjectViolationCode.L12O_SHIFT_PRIMARY_REF_MISSING, subject_id: sid, detail: 'current_primary_scenario_ref required' });
  }
  if (inputs.competitionIsClose && !s.current_secondary_scenario_ref) {
    v.push({ code: L12ObjectViolationCode.L12O_SHIFT_SECONDARY_REF_MISSING, subject_id: sid, detail: 'current_secondary_scenario_ref required when competition is close' });
  }
  if (!s.lineage_refs || s.lineage_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING, subject_id: sid, detail: 'lineage_refs required' });
  }
  if (!s.replay_hash) {
    v.push({ code: L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING, subject_id: sid, detail: 'replay_hash required' });
  }

  // Under close competition, at least one promotion or collapse condition is required.
  if (inputs.competitionIsClose) {
    const hasPromotion =
      (s.conditions_that_promote_secondary?.length ?? 0) > 0 ||
      (s.conditions_that_collapse_base_case?.length ?? 0) > 0 ||
      (s.conditions_that_weaken_primary?.length ?? 0) > 0;
    if (!hasPromotion) {
      v.push({
        code: L12ObjectViolationCode.L12O_SHIFT_CONDITIONS_MISSING_UNDER_CLOSE_SPREAD,
        subject_id: sid,
        detail: 'close competition requires promote-secondary / collapse-base-case / weaken-primary conditions',
      });
    }
  }

  // Detect trade language across all condition refs (which are usually condition_ids,
  // but if they accidentally contain free-form trade text, reject).
  const allConditionRefs: readonly string[] = [
    ...(s.conditions_that_strengthen_primary ?? []),
    ...(s.conditions_that_weaken_primary ?? []),
    ...(s.conditions_that_promote_secondary ?? []),
    ...(s.conditions_that_collapse_base_case ?? []),
    ...(s.conditions_that_raise_bullish_path ?? []),
    ...(s.conditions_that_raise_bearish_path ?? []),
    ...(s.spread_narrowing_conditions ?? []),
    ...(s.spread_widening_conditions ?? []),
  ];
  for (const ref of allConditionRefs) {
    if (!ref) continue;
    if (TRADE_LANG.test(ref) || detectL12RecommendationLanguage(ref)) {
      v.push({
        code: L12ObjectViolationCode.L12O_SHIFT_CONDITIONS_TRADE_LANGUAGE,
        subject_id: sid,
        detail: `shift condition ref carries trade/recommendation language: ${ref}`,
      });
      break;
    }
  }

  return v;
}
