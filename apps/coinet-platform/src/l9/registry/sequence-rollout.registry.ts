/**
 * L9.6 — Sequence Rollout Registry
 *
 * §9.6.10 — Rollout law. This registry owns the machine-enforced
 * enablement evaluation for every production family: it evaluates
 * every gate (§9.6.10.4) and returns a deterministic rollout status.
 *
 * INV-9.6-F : rollout ordering and enablement remain machine-enforced.
 */

import {
  L9SequenceRolloutGateId,
  L9SequenceRolloutStatus,
  ALL_L9_SEQUENCE_ROLLOUT_GATE_IDS,
  evaluateL9RolloutGates,
  l9ProductionFamilyRolloutPhase,
} from '../contracts/sequence-family-rollout';
import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9_SEQUENCE_ROLLOUT_ORDER,
} from '../contracts/sequence-template-policy';
import { L9StateOwnershipPosture } from '../contracts/sequence-family-definition';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9SequenceFamilyDefinitionRegistry } from './sequence-family-definition.registry';
import { L9SequenceTemplateRegistry } from './sequence-template.registry';

/**
 * §9.6.10.4 — External certification signal. The rollout registry
 * cannot run certification itself; the harness passes in an external
 * predicate that says whether a family's certification band is green.
 */
export interface L9SequenceRolloutSignals {
  certificationGreen: (family: L9ProductionFamilyId) => boolean;
  contradictionFamilyHookup: (family: L9ProductionFamilyId) => boolean;
  regimeConsumptionLegal: (family: L9ProductionFamilyId) => boolean;
  noFamilyStateCollisions: (family: L9ProductionFamilyId) => boolean;
}

export const L9_ROLLOUT_SIGNALS_ALL_GREEN: L9SequenceRolloutSignals = {
  certificationGreen: () => true,
  contradictionFamilyHookup: () => true,
  regimeConsumptionLegal: () => true,
  noFamilyStateCollisions: () => true,
};

export class L9SequenceRolloutRegistry {
  constructor(
    private readonly families: L9SequenceFamilyDefinitionRegistry,
    private readonly templates: L9SequenceTemplateRegistry,
  ) {}

  /**
   * §9.6.10.4 — Evaluate rollout gates for `family` against `signals`.
   * Never throws; returns a typed status so callers can audit
   * deterministically.
   */
  evaluate(
    family: L9ProductionFamilyId,
    signals: L9SequenceRolloutSignals,
  ): L9SequenceRolloutStatus {
    const def = this.families.get(family);
    const owningStatesRegistered = def !== undefined &&
      def.state_ownership.length > 0;

    // §9.6.10.4 — "required template semantics complete" means (a)
    // every template the family declares is registered, AND (b) every
    // constructive (non-NEGATIVE_LATE_POSTURE) state the family owns
    // or shares is covered by at least one registered template on a
    // family legally sharing that state. Families that consume
    // shared-state templates via coexistence (§9.6.6.2) therefore do
    // not need to declare templates of their own but cannot have
    // uncovered constructive states either.
    const declaredRegistered = def !== undefined &&
      def.template_ids.every(id => this.templates.has(id));
    const constructiveStatesCovered = def !== undefined &&
      def.state_ownership
        .filter(o => o.posture !== L9StateOwnershipPosture.NEGATIVE_LATE_POSTURE)
        .every(o => this.isStateCoveredForFamily(family, o.state));
    const templatesComplete = declaredRegistered && constructiveStatesCovered;
    const gate_results: Record<L9SequenceRolloutGateId, boolean> = {
      [L9SequenceRolloutGateId.OWNING_STATES_REGISTERED]:
        owningStatesRegistered,
      [L9SequenceRolloutGateId.REQUIRED_TEMPLATE_SEMANTICS_COMPLETE]:
        templatesComplete,
      [L9SequenceRolloutGateId.CONTRADICTION_FAMILY_HOOKUP]:
        signals.contradictionFamilyHookup(family),
      [L9SequenceRolloutGateId.REGIME_CONSUMPTION_LEGAL]:
        signals.regimeConsumptionLegal(family),
      [L9SequenceRolloutGateId.FAMILY_CERTIFICATION_GREEN]:
        signals.certificationGreen(family),
      [L9SequenceRolloutGateId.NO_ILLEGAL_FAMILY_STATE_COLLISIONS]:
        signals.noFamilyStateCollisions(family),
    };
    return evaluateL9RolloutGates(family, gate_results);
  }

  /**
   * §9.6.10.1 — Rolled-out families in canonical order.
   */
  enabledFamilies(
    signals: L9SequenceRolloutSignals,
  ): readonly L9SequenceRolloutStatus[] {
    const statuses: L9SequenceRolloutStatus[] = [];
    for (const family of this.families.list()) {
      statuses.push(this.evaluate(family.family_id, signals));
    }
    statuses.sort(
      (a, b) =>
        L9_SEQUENCE_ROLLOUT_ORDER.indexOf(a.phase) -
        L9_SEQUENCE_ROLLOUT_ORDER.indexOf(b.phase),
    );
    return statuses;
  }

  /**
   * §9.6.10.1 — Rollout phase for a family.
   */
  phaseFor(family: L9ProductionFamilyId): L9SequenceRolloutPhase {
    return l9ProductionFamilyRolloutPhase(family);
  }

  /**
   * §9.6.10.2 — Deterministic ordered list of all gate ids (used by
   * audit and test suite).
   */
  gateIds(): readonly L9SequenceRolloutGateId[] {
    return ALL_L9_SEQUENCE_ROLLOUT_GATE_IDS;
  }

  /**
   * §9.6.10.4 / §9.6.6.2 — A state is considered "covered" for a
   * family if some registered template targets it on a family that is
   * `family` itself or a coexisting family that legally shares the
   * state (per the `shared_with` declaration on the ownership edge).
   */
  private isStateCoveredForFamily(
    family: L9ProductionFamilyId,
    state: L9SequenceState,
  ): boolean {
    const def = this.families.get(family);
    if (!def) return false;
    const ownershipEdge = def.state_ownership.find(o => o.state === state);
    const eligibleFamilies = new Set<L9ProductionFamilyId>([family]);
    if (ownershipEdge) {
      for (const peer of ownershipEdge.shared_with) {
        if (def.coexists_with.includes(peer)) eligibleFamilies.add(peer);
      }
    }
    return this.templates.list().some(
      t =>
        t.primary_sequence_state === state &&
        eligibleFamilies.has(t.production_family),
    );
  }
}
