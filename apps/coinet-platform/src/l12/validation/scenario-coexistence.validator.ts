/**
 * L12.2 — Scenario coexistence validator (§12.2.17.3).
 *
 * Computes the legal coexistence class given the bullish/bearish/recovery/
 * neutral/stress refs, secondary scenario presence, contradiction posture,
 * insufficiency declaration, and disclosure presence.
 */

import { L12ScenarioCoexistenceClass } from '../contracts/scenario-coexistence';
import {
  L12MultiPathClass,
  L12ScenarioSet,
  L12ScenarioSpreadClass,
  isL12LegalSinglePathClass,
} from '../contracts/scenario-set';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

export interface L12CoexistencePosture {
  /** Whether L7 contradiction is unresolved on the inputs. */
  readonly contradictionUnresolved: boolean;
  /** Whether the restriction profile contains MISSING_VISIBILITY / DRIFT disclosures. */
  readonly disclosuresPresent: boolean;
  /** Whether the scenario set carries contradictory bullish + bearish paths. */
  readonly hasContradictoryPaths: boolean;
}

export interface L12CoexistenceResult {
  readonly coexistenceClass: L12ScenarioCoexistenceClass;
  readonly violations: readonly L12ObjectViolation[];
}

export function classifyL12Coexistence(
  s: L12ScenarioSet,
  posture: L12CoexistencePosture,
): L12CoexistenceResult {
  const violations: L12ObjectViolation[] = [];
  const sid = s.scenario_set_id || '<unknown>';

  const bullishCount = s.bullish_scenario_refs?.length ?? 0;
  const bearishCount =
    (s.bearish_scenario_refs?.length ?? 0) + (s.stress_scenario_refs?.length ?? 0);
  const recoveryCount = s.recovery_scenario_refs?.length ?? 0;
  const totalAlternatives =
    bullishCount +
    bearishCount +
    recoveryCount +
    (s.neutral_scenario_refs?.length ?? 0);

  const isInsufficient = isL12LegalSinglePathClass(s.multi_path_class);
  const hasSecondary = !!s.secondary_scenario_ref;

  // ── illegal collapsed single-path ──
  if (s.scenario_count <= 1 && totalAlternatives === 0 && !isInsufficient) {
    violations.push({
      code: L12ObjectViolationCode.L12O_COEXISTENCE_ILLEGAL_COLLAPSED_SINGLE_PATH,
      subject_id: sid,
      detail: 'single-path collapse without insufficiency declaration is illegal',
    });
    return {
      coexistenceClass: L12ScenarioCoexistenceClass.ILLEGAL_COLLAPSED_SINGLE_PATH,
      violations,
    };
  }

  // ── single-path insufficient (legal with disclosure) ──
  if (isInsufficient) {
    if (!posture.disclosuresPresent) {
      violations.push({
        code: L12ObjectViolationCode.L12O_COEXISTENCE_SINGLE_PATH_WITHOUT_DISCLOSURE,
        subject_id: sid,
        detail: 'insufficient-input single path requires disclosure',
      });
    }
    return {
      coexistenceClass: L12ScenarioCoexistenceClass.SINGLE_PATH_INSUFFICIENT,
      violations,
    };
  }

  // ── bullish without bearish/failure path ──
  if (bullishCount > 0 && bearishCount === 0 && recoveryCount === 0) {
    violations.push({
      code: L12ObjectViolationCode.L12O_COEXISTENCE_BULLISH_WITHOUT_BEARISH,
      subject_id: sid,
      detail: 'bullish path declared without bearish/failure or recovery alternative',
    });
  }

  // ── bearish without recovery or invalidation alternative ──
  if (bearishCount > 0 && recoveryCount === 0 &&
      (s.invalidation_profile_refs?.length ?? 0) === 0) {
    violations.push({
      code: L12ObjectViolationCode.L12O_COEXISTENCE_BEARISH_WITHOUT_RECOVERY_OR_INVALIDATION,
      subject_id: sid,
      detail: 'bearish path declared without recovery or invalidation alternative',
    });
  }

  // ── narrow spread without secondary ──
  if (
    (s.scenario_spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY ||
      s.scenario_spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION) &&
    !hasSecondary
  ) {
    violations.push({
      code: L12ObjectViolationCode.L12O_COEXISTENCE_NARROW_WITHOUT_SECONDARY,
      subject_id: sid,
      detail: `narrow/unresolved spread requires secondary scenario (spread=${s.scenario_spread_class})`,
    });
  }

  // ── contradictory paths require disclosure ──
  if (posture.hasContradictoryPaths && !posture.disclosuresPresent) {
    violations.push({
      code: L12ObjectViolationCode.L12O_COEXISTENCE_HIDDEN_CONTRADICTORY_PATHS,
      subject_id: sid,
      detail: 'contradictory bullish/bearish paths require explicit disclosure',
    });
  }

  // ── clean alternatives but contradiction unresolved → must downgrade ──
  if (
    posture.contradictionUnresolved &&
    s.scenario_spread_class === L12ScenarioSpreadClass.CLEAR_PRIMARY
  ) {
    violations.push({
      code: L12ObjectViolationCode.L12O_COEXISTENCE_CLEAN_BUT_CONTRADICTION_UNRESOLVED,
      subject_id: sid,
      detail: 'CLEAR_PRIMARY with unresolved contradiction must downgrade or disclose',
    });
  }

  // ── classify ──
  let cls: L12ScenarioCoexistenceClass;
  if (posture.hasContradictoryPaths && posture.disclosuresPresent) {
    cls = L12ScenarioCoexistenceClass.CONTRADICTORY_PATHS_WITH_DISCLOSURE;
  } else if (s.scenario_spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION ||
             s.multi_path_class === L12MultiPathClass.MULTI_PATH_UNRESOLVED) {
    cls = L12ScenarioCoexistenceClass.UNRESOLVED_MULTI_PATH;
  } else if (s.scenario_spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY ||
             s.multi_path_class === L12MultiPathClass.BASE_WITH_CLOSE_SECONDARY) {
    cls = L12ScenarioCoexistenceClass.CLOSE_PRIMARY_SECONDARY;
  } else {
    cls = L12ScenarioCoexistenceClass.CLEAN_BASE_WITH_ALTERNATIVES;
  }

  return { coexistenceClass: cls, violations };
}
