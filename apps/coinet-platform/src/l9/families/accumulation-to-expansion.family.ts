/**
 * L9.6 §9.6.5 — Family A: Accumulation-to-Expansion
 *
 * Constructive early-to-mid sequence: accumulation precedes broad
 * recognition, liquidity improves, narrative emerges later,
 * participation broadens, leverage appears only after prior support.
 *
 * Core state ownership: PRE_NARRATIVE_ACCUMULATION,
 * EARLY_NARRATIVE_IGNITION, VALIDATED_EXPANSION.
 */

import {
  L9SequenceFamilyDefinition,
  L9StateOwnershipPosture,
} from '../contracts/sequence-family-definition';
import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9SequenceTemplateId,
  L9TemplateRegimeRequirement,
} from '../contracts/sequence-template-policy';
import { L9SequenceFamily } from '../contracts/sequence-family';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9PhaseClass } from '../contracts/phase-state';
import { L9ChangePointTriggerFamily } from '../contracts/l9-change-point-policy';
import { L9DecayDominance } from '../contracts/l9-decay-policy';

export const ACCUMULATION_TO_EXPANSION_FAMILY: L9SequenceFamilyDefinition = {
  family_id: L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  primary_taxonomy_family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  secondary_taxonomy_families: [],
  description:
    'Constructive early-to-mid sequence: accumulation → liquidity → ' +
    'narrative → participation → leverage. Leverage may only appear ' +
    'after prior structural support (§9.6.5).',
  legal_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'SECTOR'],
  state_ownership: [
    {
      state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
      posture: L9StateOwnershipPosture.EXCLUSIVE,
      shared_with: [],
    },
    {
      state: L9SequenceState.EARLY_NARRATIVE_IGNITION,
      posture: L9StateOwnershipPosture.SHARED_WITH_DIFFERENT_ROUTE,
      shared_with: [L9ProductionFamilyId.NARRATIVE_VALIDATION],
    },
    {
      state: L9SequenceState.VALIDATED_EXPANSION,
      posture: L9StateOwnershipPosture.SHARED_WITH_DIFFERENT_ROUTE,
      shared_with: [L9ProductionFamilyId.NARRATIVE_VALIDATION],
    },
  ],
  template_ids: [
    L9SequenceTemplateId.PRE_NARRATIVE_ACCUMULATION,
    L9SequenceTemplateId.EARLY_NARRATIVE_IGNITION,
    L9SequenceTemplateId.VALIDATED_EXPANSION,
  ],
  legal_phase_envelope: [
    L9PhaseClass.DISCOVERY,
    L9PhaseClass.EARLY,
    L9PhaseClass.CONFIRMING,
    L9PhaseClass.VALIDATED,
    L9PhaseClass.EXPANSION,
  ],
  required_contradiction_trigger_families: [
    L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
    L9ChangePointTriggerFamily.REGIME_TRANSITION,
    L9ChangePointTriggerFamily.DECAY_DOMINANCE,
  ],
  decay_tolerance_ceiling: L9DecayDominance.MODERATE_DECAY,
  legal_post_event_anchor_classes: [],
  regime_requirement: L9TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
  rollout_phase: L9SequenceRolloutPhase.P1_CORE,
  default_confidence_cap: 0.85,
  default_decay_baseline: L9DecayDominance.LOW_DECAY,
  coexists_with: [
    L9ProductionFamilyId.NARRATIVE_VALIDATION,
    L9ProductionFamilyId.REFLEXIVITY,
  ],
  family_invariants: [
    'leverage_only_after_support',
    'narrative_only_after_structure_or_accumulation',
    'decay_tolerance_moderate_max',
    'no_late_stage_states_in_envelope',
  ],
};
