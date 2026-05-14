/**
 * L12.5 — Scenario spread profile validator (§12.5.15.4).
 */

import { L12ScenarioSpreadClass } from '../contracts/scenario-set';
import {
  L12ScenarioSpreadProfile,
  l12IsClearPrimarySpread,
} from '../contracts/scenario-spread-profile';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

const FORBIDDEN_RE = /(winner|final judgment)/i;

export function validateL12ScenarioSpreadProfile(
  p: L12ScenarioSpreadProfile,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];

  if (
    !p.secondary_scenario_ref &&
    (p.spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY ||
      p.spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION)
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_SPREAD_MISSING_SECONDARY,
      'narrow/unresolved spread without secondary',
      p.spread_profile_id,
    ));
  }
  if (
    (p.spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY ||
      p.spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION ||
      p.spread_class === L12ScenarioSpreadClass.MODERATE_PRIMARY) &&
    !p.shift_conditions_required
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_NARROW_SPREAD_WITHOUT_SHIFT_CONDITIONS,
      'narrow/moderate spread without shift_conditions_required',
      p.spread_profile_id,
    ));
  }
  if (l12IsClearPrimarySpread(p.spread_class) && p.active_invalidation_present) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAR_PRIMARY_UNDER_INVALIDATION,
      'clear primary under active invalidation',
      p.spread_profile_id,
    ));
  }
  if (l12IsClearPrimarySpread(p.spread_class) && p.contradiction_unresolved) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAR_PRIMARY_UNDER_UNRESOLVED_CONTRADICTION,
      'clear primary under unresolved contradiction',
      p.spread_profile_id,
    ));
  }
  for (const code of p.spread_reason_codes) {
    if (FORBIDDEN_RE.test(code)) {
      issues.push(iss(
        L12TemplateViolationCode.L12T_PRIMARY_CALLED_WINNER,
        `forbidden token in spread_reason_codes: ${code}`,
        p.spread_profile_id,
      ));
    }
  }

  return { ok: issues.length === 0, issues };
}
