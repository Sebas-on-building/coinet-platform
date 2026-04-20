/**
 * L9.6 — Sequence Family Definition
 *
 * §9.6.3 — First production sequence family definition contract.
 *
 * Distinct from the L9.2 `L9SequenceFamilyDescriptor` (which froze the
 * temporal-object taxonomy): an L9.6 `L9SequenceFamilyDefinition`
 * expresses the *production doctrine* for a launch family — which
 * L9.2 underlying family it maps to, which sequence states it owns or
 * shares, which templates belong to it, what support/challenge
 * posture it requires, and how it rolls out.
 *
 * This split is intentional — L9.2 froze the taxonomy, L9.6 decides
 * what is deployable.
 */

import { L9SequenceFamily, L9SequenceScopeType } from './sequence-family';
import { L9SequenceState } from './sequence-state';
import { L9PhaseClass } from './phase-state';
import { L9ChangePointTriggerFamily } from './l9-change-point-policy';
import { L9PostEventAnchorClass } from './l9-post-event-window-policy';
import { L9DecayDominance } from './l9-decay-policy';
import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9SequenceTemplateId,
  L9TemplateRegimeRequirement,
} from './sequence-template-policy';

/**
 * §9.6.3.3 — State ownership posture. A family may own a state
 * exclusively, share it cleanly with another family, or explicitly
 * treat it as a *negative* posture (emitted as a late/failure signal).
 */
export enum L9StateOwnershipPosture {
  /** Family owns this state outright; no other family may share. */
  EXCLUSIVE = 'EXCLUSIVE',
  /**
   * Family shares the state with another family; state-sharing never
   * implies semantic sameness (§9.6.3.4).
   */
  SHARED_WITH_DIFFERENT_ROUTE = 'SHARED_WITH_DIFFERENT_ROUTE',
  /**
   * Family governs the state only as a *late/failure* posture — it is
   * not the primary constructive state.
   */
  NEGATIVE_LATE_POSTURE = 'NEGATIVE_LATE_POSTURE',
}

/**
 * §9.6.3.3 — A single state-ownership edge.
 */
export interface L9FamilyStateOwnership {
  readonly state: L9SequenceState;
  readonly posture: L9StateOwnershipPosture;
  /**
   * Other production families this state is legally shared with
   * (empty when posture is EXCLUSIVE).
   */
  readonly shared_with: readonly L9ProductionFamilyId[];
}

/**
 * §9.6.3.3 — Full production family definition.
 */
export interface L9SequenceFamilyDefinition {
  /** §9.6.3.1 — production family id. */
  readonly family_id: L9ProductionFamilyId;
  /**
   * §9.6.3.3 — Underlying L9.2 taxonomy family. Production families
   * are allowed to map onto one L9.2 family; secondary mappings (e.g.
   * SHOCK_DIGESTION spanning OVERHANG_AND_DIGESTION and
   * SHOCK_AND_RECOVERY) are declared as `secondary_taxonomy_families`.
   */
  readonly primary_taxonomy_family: L9SequenceFamily;
  readonly secondary_taxonomy_families: readonly L9SequenceFamily[];
  readonly description: string;
  /** §9.6.3.3 — legal scope types at the family level. */
  readonly legal_scope_types: readonly L9SequenceScopeType[];
  /** §9.6.3.3 — states the family owns or shares. */
  readonly state_ownership: readonly L9FamilyStateOwnership[];
  /** §9.6.3.3 — templates that belong to the family. */
  readonly template_ids: readonly L9SequenceTemplateId[];
  /** §9.6.3.3 — phases that are legal inside this family. */
  readonly legal_phase_envelope: readonly L9PhaseClass[];
  /** §9.6.3.3 — contradiction families this family *must* consume. */
  readonly required_contradiction_trigger_families:
    readonly L9ChangePointTriggerFamily[];
  /** §9.6.3.3 — decay tolerance ceiling (inclusive). */
  readonly decay_tolerance_ceiling: L9DecayDominance;
  /**
   * §9.6.3.3 — post-event anchor classes legal for this family. Empty
   * when the family does not require post-event anchoring (§9.2.5.2).
   */
  readonly legal_post_event_anchor_classes:
    readonly L9PostEventAnchorClass[];
  /** §9.6.3.3 — regime conditioning posture. */
  readonly regime_requirement: L9TemplateRegimeRequirement;
  /** §9.6.3.3 / §9.6.10.1 — canonical rollout phase. */
  readonly rollout_phase: L9SequenceRolloutPhase;
  /** §9.6.3.3 — default confidence cap baked into the family. */
  readonly default_confidence_cap: number;
  /** §9.6.3.3 — default decay baseline used by decay resolvers. */
  readonly default_decay_baseline: L9DecayDominance;
  /**
   * §9.6.3.4 — Other production families this family may coexist
   * with. Coexistence must be explicit; coexistence may never imply
   * semantic sameness.
   */
  readonly coexists_with: readonly L9ProductionFamilyId[];
  /**
   * §9.6.1.3 — free-form family-level invariants (strings, not
   * executable). The runtime invariant layer (§9.6.14.1) executes
   * machine-enforced rules; this list is documentation for code
   * review and certification.
   */
  readonly family_invariants: readonly string[];
}

/**
 * §9.6.3.3 — Lookup helper: given a production family definition set,
 * return the definition owning a state, or `undefined`.
 */
export function findL9FamilyOwningState(
  defs: readonly L9SequenceFamilyDefinition[],
  state: L9SequenceState,
  posture: L9StateOwnershipPosture = L9StateOwnershipPosture.EXCLUSIVE,
): L9SequenceFamilyDefinition | undefined {
  return defs.find(d =>
    d.state_ownership.some(
      o => o.state === state && o.posture === posture,
    ),
  );
}

/**
 * §9.6.3.3 — Return every family that references `state` in its
 * ownership set regardless of posture.
 */
export function findL9FamiliesReferencingState(
  defs: readonly L9SequenceFamilyDefinition[],
  state: L9SequenceState,
): readonly L9SequenceFamilyDefinition[] {
  return defs.filter(d =>
    d.state_ownership.some(o => o.state === state),
  );
}

/**
 * §9.6.3.3 — Return the state-ownership record (if any) describing how
 * `family` treats `state`.
 */
export function findL9FamilyStateRecord(
  def: L9SequenceFamilyDefinition,
  state: L9SequenceState,
): L9FamilyStateOwnership | undefined {
  return def.state_ownership.find(o => o.state === state);
}
