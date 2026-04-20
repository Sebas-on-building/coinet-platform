/**
 * L9.6 — Sequence Family Rollout Validator
 *
 * §9.6.10 — Validates a rollout status report. Emits `L9F_ROLL_*`
 * codes for each gate that failed, plus a phase-order violation when a
 * later-phase family is enabled before an earlier-phase family.
 */

import {
  L9SequenceRolloutGateId,
  L9SequenceRolloutStatus,
} from '../contracts/sequence-family-rollout';
import {
  L9ProductionFamilyId,
  L9_PRODUCTION_FAMILY_ROLLOUT_PHASE,
  L9_SEQUENCE_ROLLOUT_ORDER,
} from '../contracts/sequence-template-policy';
import {
  L9FamilyViolation,
  L9FamilyViolationCode,
  L9FamilyViolationTier,
} from './l9-family-violation-codes';

const GATE_TO_CODE: Readonly<
  Record<L9SequenceRolloutGateId, L9FamilyViolationCode>
> = {
  [L9SequenceRolloutGateId.OWNING_STATES_REGISTERED]:
    L9FamilyViolationCode.ROLL_OWNING_STATES_NOT_REGISTERED,
  [L9SequenceRolloutGateId.REQUIRED_TEMPLATE_SEMANTICS_COMPLETE]:
    L9FamilyViolationCode.ROLL_TEMPLATES_INCOMPLETE,
  [L9SequenceRolloutGateId.CONTRADICTION_FAMILY_HOOKUP]:
    L9FamilyViolationCode.ROLL_CONTRADICTION_HOOKUP_MISSING,
  [L9SequenceRolloutGateId.REGIME_CONSUMPTION_LEGAL]:
    L9FamilyViolationCode.ROLL_REGIME_CONSUMPTION_ILLEGAL,
  [L9SequenceRolloutGateId.FAMILY_CERTIFICATION_GREEN]:
    L9FamilyViolationCode.ROLL_CERTIFICATION_NOT_GREEN,
  [L9SequenceRolloutGateId.NO_ILLEGAL_FAMILY_STATE_COLLISIONS]:
    L9FamilyViolationCode.ROLL_FAMILY_STATE_COLLISION,
};

export interface L9RolloutValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9FamilyViolation[];
}

export function validateL9SequenceRolloutStatus(
  status: L9SequenceRolloutStatus,
): L9RolloutValidationResult {
  const violations: L9FamilyViolation[] = [];
  for (const gateId of status.blocking_gate_ids) {
    violations.push({
      code: GATE_TO_CODE[gateId],
      tier: L9FamilyViolationTier.ROLLOUT,
      detail:
        `family ${status.family} rollout gate ${gateId} failed (phase ` +
        `${status.phase})`,
      offending_refs: [String(status.family), String(gateId)],
    });
  }
  return { ok: violations.length === 0, violations };
}

/**
 * §9.6.10.2 — Validate that the global rollout ordering across all
 * families holds: a family may not be enabled unless every
 * earlier-phase family is also enabled.
 */
export function validateL9SequenceRolloutOrder(
  statuses: readonly L9SequenceRolloutStatus[],
): L9RolloutValidationResult {
  const violations: L9FamilyViolation[] = [];
  const byFamily = new Map<L9ProductionFamilyId, L9SequenceRolloutStatus>();
  for (const s of statuses) byFamily.set(s.family, s);
  const sorted = [...statuses].sort(
    (a, b) =>
      L9_SEQUENCE_ROLLOUT_ORDER.indexOf(a.phase) -
      L9_SEQUENCE_ROLLOUT_ORDER.indexOf(b.phase),
  );
  let seenDisabled = false;
  for (const s of sorted) {
    if (!s.enabled) {
      seenDisabled = true;
      continue;
    }
    if (seenDisabled) {
      const expectedPhase =
        L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[s.family];
      violations.push({
        code: L9FamilyViolationCode.ROLL_PHASE_ORDER_VIOLATED,
        tier: L9FamilyViolationTier.ROLLOUT,
        detail:
          `family ${s.family} enabled at phase ${expectedPhase} but an ` +
          `earlier-phase family is still disabled (§9.6.10.2)`,
        offending_refs: [String(s.family)],
      });
    }
  }
  return { ok: violations.length === 0, violations };
}
