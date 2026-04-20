/**
 * L9.6 — Sequence Family Rollout Law
 *
 * §9.6.10 — Rollout ordering and gating. A production family may not
 * become runtime-enabled until its owning states, required
 * contradiction families, regime consumption, and certification gates
 * are satisfied. Rollout ordering and gating are machine-enforced
 * (INV-9.6-F).
 */

import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9_PRODUCTION_FAMILY_ROLLOUT_PHASE,
  L9_SEQUENCE_ROLLOUT_ORDER,
} from './sequence-template-policy';

/**
 * §9.6.10.4 — Rollout gate. A family cannot be enabled unless every
 * gate resolves `true`.
 */
export interface L9SequenceRolloutGate {
  readonly gate_id: string;
  readonly description: string;
  readonly resolve: (family: L9ProductionFamilyId) => boolean;
}

/**
 * §9.6.10.4 — Declared gate identity. The registry uses these typed
 * ids so gate results can be audited deterministically.
 */
export enum L9SequenceRolloutGateId {
  OWNING_STATES_REGISTERED = 'OWNING_STATES_REGISTERED',
  REQUIRED_TEMPLATE_SEMANTICS_COMPLETE =
    'REQUIRED_TEMPLATE_SEMANTICS_COMPLETE',
  CONTRADICTION_FAMILY_HOOKUP = 'CONTRADICTION_FAMILY_HOOKUP',
  REGIME_CONSUMPTION_LEGAL = 'REGIME_CONSUMPTION_LEGAL',
  FAMILY_CERTIFICATION_GREEN = 'FAMILY_CERTIFICATION_GREEN',
  NO_ILLEGAL_FAMILY_STATE_COLLISIONS = 'NO_ILLEGAL_FAMILY_STATE_COLLISIONS',
}

export const ALL_L9_SEQUENCE_ROLLOUT_GATE_IDS:
  readonly L9SequenceRolloutGateId[] =
    Object.values(L9SequenceRolloutGateId);

/**
 * §9.6.10.4 — Status of a family's rollout evaluation.
 */
export interface L9SequenceRolloutStatus {
  readonly family: L9ProductionFamilyId;
  readonly phase: L9SequenceRolloutPhase;
  readonly enabled: boolean;
  readonly gate_results: Readonly<Record<L9SequenceRolloutGateId, boolean>>;
  readonly blocking_gate_ids: readonly L9SequenceRolloutGateId[];
}

/**
 * §9.6.10.2 — Phase ordering helper. Returns the position of `phase`
 * inside the canonical rollout order. -1 if unknown.
 */
export function l9RolloutPhaseIndex(phase: L9SequenceRolloutPhase): number {
  return L9_SEQUENCE_ROLLOUT_ORDER.indexOf(phase);
}

/**
 * §9.6.10.1/9.6.10.2 — Comparator for rollout phases. Returns negative,
 * zero, or positive per standard compare semantics.
 */
export function compareL9RolloutPhases(
  a: L9SequenceRolloutPhase,
  b: L9SequenceRolloutPhase,
): number {
  return l9RolloutPhaseIndex(a) - l9RolloutPhaseIndex(b);
}

/**
 * §9.6.10.1 — Canonical rollout ordering for every production family.
 */
export function l9ProductionFamilyRolloutPhase(
  family: L9ProductionFamilyId,
): L9SequenceRolloutPhase {
  return L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[family];
}

/**
 * §9.6.10.4 — Given a set of gate results, compute whether a family is
 * enabled plus which gates blocked it.
 */
export function evaluateL9RolloutGates(
  family: L9ProductionFamilyId,
  gate_results: Readonly<Record<L9SequenceRolloutGateId, boolean>>,
): L9SequenceRolloutStatus {
  const blocking: L9SequenceRolloutGateId[] = [];
  for (const id of ALL_L9_SEQUENCE_ROLLOUT_GATE_IDS) {
    if (!gate_results[id]) blocking.push(id);
  }
  return {
    family,
    phase: L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[family],
    enabled: blocking.length === 0,
    gate_results,
    blocking_gate_ids: blocking,
  };
}
