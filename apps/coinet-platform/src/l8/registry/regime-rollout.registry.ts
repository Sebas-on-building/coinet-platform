/**
 * L8.6 — Regime Rollout Registry
 *
 * §8.6.6.4 – §8.6.6.7 — Canonical rollout ordering and runtime-mode
 * legality. Keeps a single source of truth for which phases are
 * considered "completed" at runtime and which template states are
 * legal per runtime mode.
 */

import {
  L8RegimeRolloutPhase,
  L8RegimeTemplateState,
  L8RegimeRuntimeMode,
  ALL_L8_REGIME_ROLLOUT_PHASES,
  L8_REGIME_ROLLOUT_PHASE_INDEX,
  isTemplateStateLegalForMode,
  mayEmitProductionClean,
  compareL8RegimeRolloutPhases,
} from '../contracts/regime-rollout-phase';
import type { L8RegimeTemplate } from '../contracts/regime-template';
import {
  getDefaultL8RegimeTemplateRegistry,
  L8RegimeTemplateRegistry,
} from './regime-template.registry';

export class L8RegimeRolloutRegistry {
  constructor(
    private readonly templateRegistry:
      L8RegimeTemplateRegistry = getDefaultL8RegimeTemplateRegistry(),
  ) {}

  /** §8.6.6.3 — Canonical phase order. */
  phaseOrder(): readonly L8RegimeRolloutPhase[] {
    return ALL_L8_REGIME_ROLLOUT_PHASES;
  }

  /** §8.6.6.1 — Phase index (smaller = earlier). */
  indexOf(phase: L8RegimeRolloutPhase): number {
    return L8_REGIME_ROLLOUT_PHASE_INDEX[phase];
  }

  /** §8.6.6.3 — Compare two phases. */
  compare(a: L8RegimeRolloutPhase, b: L8RegimeRolloutPhase): number {
    return compareL8RegimeRolloutPhases(a, b);
  }

  /**
   * §8.6.6.5 — Template state × runtime mode legality.
   */
  isStateLegalForMode(
    state: L8RegimeTemplateState,
    mode: L8RegimeRuntimeMode,
  ): boolean {
    return isTemplateStateLegalForMode(state, mode);
  }

  /**
   * §8.6.6.7 — Production-clean emission eligibility.
   */
  canEmitProductionClean(
    state: L8RegimeTemplateState,
    mode: L8RegimeRuntimeMode,
  ): boolean {
    return mayEmitProductionClean(state, mode);
  }

  /** §8.6.6.6 — A phase is rollout-complete when every template in it is PRODUCTION_ENABLED. */
  isPhaseFullyEnabled(phase: L8RegimeRolloutPhase): boolean {
    const templates = this.templateRegistry.listForPhase(phase);
    if (templates.length === 0) return false;
    return templates.every(t =>
      t.template_state === L8RegimeTemplateState.PRODUCTION_ENABLED);
  }

  /** §8.6.6.7 — A later phase may not have production-enabled templates if an earlier phase is incomplete. */
  earlierPhasesComplete(phase: L8RegimeRolloutPhase): boolean {
    const targetIdx = this.indexOf(phase);
    for (const earlier of ALL_L8_REGIME_ROLLOUT_PHASES) {
      if (this.indexOf(earlier) >= targetIdx) continue;
      if (!this.isPhaseFullyEnabled(earlier)) return false;
    }
    return true;
  }

  /**
   * §8.6.6.7 — List templates that skip earlier phases (i.e. are
   * PRODUCTION_ENABLED in a later phase while an earlier phase is
   * incomplete). Returns [] if rollout ordering is legal.
   */
  listTemplatesSkippingEarlierPhases(): readonly L8RegimeTemplate[] {
    const offenders: L8RegimeTemplate[] = [];
    for (const t of this.templateRegistry.list()) {
      if (t.template_state !== L8RegimeTemplateState.PRODUCTION_ENABLED) continue;
      if (!this.earlierPhasesComplete(t.rollout_phase)) offenders.push(t);
    }
    return offenders;
  }
}

const defaultRegistry = new L8RegimeRolloutRegistry();

export function getDefaultL8RegimeRolloutRegistry():
  L8RegimeRolloutRegistry {
  return defaultRegistry;
}
