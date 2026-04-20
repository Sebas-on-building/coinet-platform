/**
 * L10.6 — Hypothesis Rollout Registry
 *
 * §10.6.12.1 / §10.6.11 — Rollout registry. Keys rollout entries by
 * `L10HypothesisFamilyId` and rejects:
 *   - duplicate entries
 *   - unknown family ids
 *   - rollout entries that have no backing family definition
 *   - rollout lifecycle promotions that would violate gate law
 *     (§10.6.11.4, INV-10.6-F)
 */

import {
  L10HypothesisFamilyRolloutEntry,
  L10RolloutLifecycleStage,
  hasAllRequiredL10RolloutSurfaces,
  rolloutGatesReady,
} from '../contracts/hypothesis-family-rollout';
import {
  L10HypothesisFamilyId,
  L10HypothesisRolloutPhase,
  L10_PRODUCTION_FAMILY_ROLLOUT_PHASE,
  compareL10RolloutPhase,
  isL10RegisteredProductionFamily,
} from '../contracts/hypothesis-template-policy';

export class L10HypothesisRolloutRegistry {
  private readonly byFamily = new Map<
    L10HypothesisFamilyId,
    L10HypothesisFamilyRolloutEntry
  >();

  register(entry: L10HypothesisFamilyRolloutEntry): void {
    if (!isL10RegisteredProductionFamily(entry.family_id)) {
      throw new Error(
        `L10.6 rollout registry: unknown family '${entry.family_id}'`,
      );
    }
    if (!hasAllRequiredL10RolloutSurfaces(entry)) {
      throw new Error(
        `L10.6 rollout registry: incomplete rollout entry for '${entry.family_id}'`,
      );
    }
    const canonicalPhase = L10_PRODUCTION_FAMILY_ROLLOUT_PHASE[entry.family_id];
    if (canonicalPhase !== entry.rollout_phase) {
      throw new Error(
        `L10.6 rollout registry: family '${entry.family_id}' canonical phase ` +
          `is '${canonicalPhase}', not '${entry.rollout_phase}'`,
      );
    }
    if (this.byFamily.has(entry.family_id)) {
      throw new Error(
        `L10.6 rollout registry: duplicate entry '${entry.family_id}'`,
      );
    }
    this.byFamily.set(entry.family_id, entry);
  }

  has(id: L10HypothesisFamilyId): boolean {
    return this.byFamily.has(id);
  }

  get(
    id: L10HypothesisFamilyId,
  ): L10HypothesisFamilyRolloutEntry | undefined {
    return this.byFamily.get(id);
  }

  /**
   * §10.6.11.4 — Family may only transition to ENABLED when:
   *   - all gate flags are green
   *   - every predecessor family is already ENABLED
   */
  canEnable(id: L10HypothesisFamilyId): boolean {
    const e = this.byFamily.get(id);
    if (!e) return false;
    if (!rolloutGatesReady(e.gate_flags)) return false;
    for (const pre of e.required_predecessors) {
      const p = this.byFamily.get(pre);
      if (!p || p.lifecycle_stage !== L10RolloutLifecycleStage.ENABLED) {
        return false;
      }
    }
    return true;
  }

  /**
   * §10.6.11.4 — Every family enabled must sit at ≥ the rollout phase
   * of every family not yet enabled. This mirrors INV-10.6-F.
   */
  enabledFamiliesRespectPhaseOrder(): boolean {
    const enabled = this.list().filter(
      e => e.lifecycle_stage === L10RolloutLifecycleStage.ENABLED,
    );
    for (const e of enabled) {
      for (const other of this.list()) {
        if (other.family_id === e.family_id) continue;
        if (other.lifecycle_stage === L10RolloutLifecycleStage.ENABLED) continue;
        // `other` is not enabled; its phase must not be earlier than `e`'s.
        if (compareL10RolloutPhase(other.rollout_phase, e.rollout_phase) < 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * §10.6.11.1 / §10.6.11.4 — Return all entries ordered by
   * canonical rollout phase.
   */
  listByRolloutOrder(): readonly L10HypothesisFamilyRolloutEntry[] {
    return this.list().slice().sort((a, b) =>
      compareL10RolloutPhase(a.rollout_phase, b.rollout_phase),
    );
  }

  listByPhase(
    phase: L10HypothesisRolloutPhase,
  ): readonly L10HypothesisFamilyRolloutEntry[] {
    return this.list().filter(e => e.rollout_phase === phase);
  }

  list(): readonly L10HypothesisFamilyRolloutEntry[] {
    return Array.from(this.byFamily.values());
  }

  size(): number {
    return this.byFamily.size;
  }

  clear(): void {
    this.byFamily.clear();
  }
}

let _defaultReg: L10HypothesisRolloutRegistry | null = null;
export function getDefaultL10RolloutRegistry(): L10HypothesisRolloutRegistry {
  if (!_defaultReg) {
    _defaultReg = new L10HypothesisRolloutRegistry();
  }
  return _defaultReg;
}

export function resetDefaultL10RolloutRegistry(): void {
  _defaultReg = null;
}
