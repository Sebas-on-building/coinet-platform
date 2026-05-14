/**
 * L12.2 — ScenarioRestrictionProfile validator (§12.2.15.4).
 */

import {
  L12_MANDATORY_BLOCKED_USES,
  L12ScenarioBlockedUse,
  L12ScenarioRestrictionProfile,
} from '../contracts/scenario-restriction-profile';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

export function validateL12ScenarioRestrictionProfile(
  p: L12ScenarioRestrictionProfile,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = p.restriction_profile_id || '<unknown>';

  if (!p.allowed_uses || p.allowed_uses.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_RESTRICTION_ALLOWED_USES_EMPTY,
      subject_id: sid,
      detail: 'allowed_uses must not be empty',
    });
  }
  if (!p.blocked_uses || p.blocked_uses.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_RESTRICTION_PROFILE_INCOMPLETE,
      subject_id: sid,
      detail: 'blocked_uses must not be empty',
    });
  }
  if (!p.lineage_refs || p.lineage_refs.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING,
      subject_id: sid,
      detail: 'lineage_refs required',
    });
  }
  if (!p.replay_hash) {
    v.push({
      code: L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING,
      subject_id: sid,
      detail: 'replay_hash required',
    });
  }

  const blockedSet = new Set<L12ScenarioBlockedUse>(p.blocked_uses ?? []);

  for (const must of L12_MANDATORY_BLOCKED_USES) {
    if (!blockedSet.has(must)) {
      const code = mandatoryToCode(must);
      v.push({
        code,
        subject_id: sid,
        detail: `mandatory blocked use missing: ${must}`,
      });
    }
  }

  return v;
}

function mandatoryToCode(b: L12ScenarioBlockedUse): L12ObjectViolationCode {
  switch (b) {
    case L12ScenarioBlockedUse.RECOMMENDATION_OUTPUT:
      return L12ObjectViolationCode.L12O_RESTRICTION_RECOMMENDATION_NOT_BLOCKED;
    case L12ScenarioBlockedUse.PREDICTION_OUTPUT:
      return L12ObjectViolationCode.L12O_RESTRICTION_PREDICTION_NOT_BLOCKED;
    case L12ScenarioBlockedUse.TRADE_ACTION_OUTPUT:
      return L12ObjectViolationCode.L12O_RESTRICTION_TRADE_NOT_BLOCKED;
    case L12ScenarioBlockedUse.FINAL_JUDGMENT_WITHOUT_L13:
      return L12ObjectViolationCode.L12O_RESTRICTION_FINAL_JUDGMENT_NOT_BLOCKED;
    case L12ScenarioBlockedUse.CERTAINTY_CLAIM:
      return L12ObjectViolationCode.L12O_RESTRICTION_CERTAINTY_NOT_BLOCKED;
    case L12ScenarioBlockedUse.SCORE_REPLACEMENT:
      return L12ObjectViolationCode.L12O_RESTRICTION_SCORE_REPLACEMENT_NOT_BLOCKED;
    case L12ScenarioBlockedUse.LIVE_OUTPUT_WITHOUT_DISCLOSURE:
      return L12ObjectViolationCode.L12O_RESTRICTION_PROFILE_INCOMPLETE;
    default:
      return L12ObjectViolationCode.L12O_RESTRICTION_PROFILE_INCOMPLETE;
  }
}
