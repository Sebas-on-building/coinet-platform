/**
 * L12.2 — ScenarioSet validator (§12.2.5.5).
 */

import {
  L12MultiPathClass,
  L12ScenarioSet,
  L12ScenarioSpreadClass,
  isL12LegalSinglePathClass,
  isL12NarrowOrUnresolvedSpread,
} from '../contracts/scenario-set';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';
import { containsL12ForbiddenNaming } from '../contracts/l12-boundary';

export function validateL12ScenarioSet(
  s: L12ScenarioSet,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = s.scenario_set_id || '<unknown>';

  if (!s.scenario_set_id) {
    v.push({ code: L12ObjectViolationCode.L12O_SCENARIO_SET_ID_MISSING, subject_id: sid, detail: 'scenario_set_id required' });
  }
  if (!s.scenario_subject_id) {
    v.push({ code: L12ObjectViolationCode.L12O_SUBJECT_REF_MISSING, subject_id: sid, detail: 'scenario_subject_id required' });
  }
  if (!s.base_case_ref) {
    v.push({ code: L12ObjectViolationCode.L12O_BASE_CASE_MISSING, subject_id: sid, detail: 'base_case_ref required' });
  }
  if (!s.primary_scenario_ref) {
    v.push({ code: L12ObjectViolationCode.L12O_PRIMARY_SCENARIO_MISSING, subject_id: sid, detail: 'primary_scenario_ref required' });
  }
  if (s.scenario_count === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_SCENARIO_COUNT_ZERO, subject_id: sid, detail: 'scenario_count must be > 0' });
  }
  if (!s.scenario_spread_class) {
    v.push({ code: L12ObjectViolationCode.L12O_SPREAD_CLASS_MISSING, subject_id: sid, detail: 'spread_class required' });
  }
  if (!s.path_confidence_profile_ref) {
    v.push({ code: L12ObjectViolationCode.L12O_PATH_CONFIDENCE_REF_MISSING, subject_id: sid, detail: 'path_confidence_profile_ref required' });
  }
  if (!s.trigger_profile_refs || s.trigger_profile_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_TRIGGER_PROFILE_REF_MISSING, subject_id: sid, detail: 'trigger_profile_refs required' });
  }
  if (!s.invalidation_profile_refs || s.invalidation_profile_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_INVALIDATION_PROFILE_REF_MISSING, subject_id: sid, detail: 'invalidation_profile_refs required' });
  }
  if (!s.restriction_profile_ref) {
    v.push({ code: L12ObjectViolationCode.L12O_RESTRICTION_PROFILE_REF_MISSING, subject_id: sid, detail: 'restriction_profile_ref required' });
  }
  if (!s.replay_hash) {
    v.push({ code: L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING, subject_id: sid, detail: 'replay_hash required' });
  }
  if (!s.lineage_refs || s.lineage_refs.length === 0) {
    v.push({ code: L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING, subject_id: sid, detail: 'lineage_refs required' });
  }

  // Single-path fake certainty: only one path AND multi-path class doesn't declare insufficiency
  const totalAlts =
    (s.bullish_scenario_refs?.length ?? 0) +
    (s.bearish_scenario_refs?.length ?? 0) +
    (s.neutral_scenario_refs?.length ?? 0) +
    (s.stress_scenario_refs?.length ?? 0) +
    (s.recovery_scenario_refs?.length ?? 0);

  if (s.scenario_count <= 1 && !isL12LegalSinglePathClass(s.multi_path_class)) {
    v.push({
      code: L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY,
      subject_id: sid,
      detail: `single-path output without explicit insufficiency declaration (multi_path_class=${s.multi_path_class})`,
    });
  }
  if (totalAlts === 0 && !isL12LegalSinglePathClass(s.multi_path_class)) {
    v.push({
      code: L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY,
      subject_id: sid,
      detail: 'no alternative scenario refs and no insufficiency declaration',
    });
  }

  // Narrow spread without secondary
  if (
    isL12NarrowOrUnresolvedSpread(s.scenario_spread_class) &&
    !s.secondary_scenario_ref
  ) {
    v.push({
      code: L12ObjectViolationCode.L12O_SECONDARY_REQUIRED_UNDER_NARROW_SPREAD,
      subject_id: sid,
      detail: `narrow/unresolved spread requires secondary scenario (spread=${s.scenario_spread_class})`,
    });
  }

  // Base/primary cannot be labelled as final judgment / guaranteed winner
  if (s.base_case_ref && containsL12ForbiddenNaming(s.base_case_ref)) {
    v.push({
      code: L12ObjectViolationCode.L12O_BASE_CASE_AS_FINAL_JUDGMENT,
      subject_id: sid,
      detail: `base_case_ref carries forbidden naming: ${s.base_case_ref}`,
    });
  }
  if (s.primary_scenario_ref && containsL12ForbiddenNaming(s.primary_scenario_ref)) {
    v.push({
      code: L12ObjectViolationCode.L12O_PRIMARY_AS_GUARANTEED_WINNER,
      subject_id: sid,
      detail: `primary_scenario_ref carries forbidden naming: ${s.primary_scenario_ref}`,
    });
  }

  // Multi-path consistency: BASE_WITH_ALTERNATIVES requires at least one alternative
  if (
    s.multi_path_class === L12MultiPathClass.BASE_WITH_ALTERNATIVES &&
    totalAlts === 0
  ) {
    v.push({
      code: L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY,
      subject_id: sid,
      detail: 'BASE_WITH_ALTERNATIVES declared but no alternative refs',
    });
  }
  // CLEAR_PRIMARY without secondary is allowed only when multi-path declares it
  if (
    s.scenario_spread_class === L12ScenarioSpreadClass.CLEAR_PRIMARY &&
    !s.secondary_scenario_ref &&
    s.multi_path_class !== L12MultiPathClass.BASE_WITH_ALTERNATIVES &&
    !isL12LegalSinglePathClass(s.multi_path_class)
  ) {
    v.push({
      code: L12ObjectViolationCode.L12O_SECONDARY_REQUIRED_UNDER_NARROW_SPREAD,
      subject_id: sid,
      detail: 'CLEAR_PRIMARY without secondary requires explicit insufficiency declaration',
    });
  }

  return v;
}
