/**
 * L9.5 — Phase Progression Registry
 *
 * §9.5.6 / §9.5.11.2 — Runtime registry for the phase-transition graph.
 * Downstream engines reach legality decisions through the registry so
 * the law is enforced in one place.
 */

import { L9PhaseClass } from '../contracts/phase-state';
import {
  L9PhaseTransition,
  L9PhaseTransitionLegality,
  L9_PHASE_TRANSITIONS,
  L9_ADJACENT_PHASE_PAIRS,
  areL9PhasesAdjacent,
  getL9PhaseTransitionLegality,
  isL9DirectLegalPhaseTransition,
  l9PhaseTransitionRequiresChangePoint,
  l9PhaseTransitionRequiresRecoveryPosture,
  l9PhaseTransitionRequiresShockAnchor,
} from '../contracts/l9-phase-progression-policy';

export class L9PhaseProgressionRegistry {
  private readonly byEdge:
    Map<string, L9PhaseTransition>;

  constructor(
    transitions: readonly L9PhaseTransition[] = L9_PHASE_TRANSITIONS,
  ) {
    this.byEdge = new Map(
      transitions.map(t => [`${t.from}→${t.to}`, t]),
    );
  }

  list(): readonly L9PhaseTransition[] {
    return Array.from(this.byEdge.values());
  }

  legality(from: L9PhaseClass, to: L9PhaseClass): L9PhaseTransitionLegality {
    return getL9PhaseTransitionLegality(from, to);
  }

  isDirectLegal(from: L9PhaseClass, to: L9PhaseClass): boolean {
    return isL9DirectLegalPhaseTransition(from, to);
  }

  requiresChangePoint(from: L9PhaseClass, to: L9PhaseClass): boolean {
    return l9PhaseTransitionRequiresChangePoint(from, to);
  }

  requiresShockAnchor(from: L9PhaseClass, to: L9PhaseClass): boolean {
    return l9PhaseTransitionRequiresShockAnchor(from, to);
  }

  requiresRecoveryPosture(from: L9PhaseClass, to: L9PhaseClass): boolean {
    return l9PhaseTransitionRequiresRecoveryPosture(from, to);
  }

  areAdjacent(a: L9PhaseClass, b: L9PhaseClass): boolean {
    return areL9PhasesAdjacent(a, b);
  }
}

const defaultPhaseProgressionRegistry = new L9PhaseProgressionRegistry();

export function getDefaultL9PhaseProgressionRegistry(): L9PhaseProgressionRegistry {
  return defaultPhaseProgressionRegistry;
}

export {
  L9_ADJACENT_PHASE_PAIRS,
  areL9PhasesAdjacent,
  getL9PhaseTransitionLegality,
  isL9DirectLegalPhaseTransition,
  l9PhaseTransitionRequiresChangePoint,
  l9PhaseTransitionRequiresRecoveryPosture,
  l9PhaseTransitionRequiresShockAnchor,
};
