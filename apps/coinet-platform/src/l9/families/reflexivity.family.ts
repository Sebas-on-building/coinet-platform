/**
 * L9.6 §9.6.7 — Family C: Reflexivity
 *
 * Participation / leverage / reflexive reinforcement dominate.
 * Core state ownership: LEVERAGE_CROWDING_PHASE, LATE_STAGE_REFLEXIVITY.
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

export const REFLEXIVITY_FAMILY: L9SequenceFamilyDefinition = {
  family_id: L9ProductionFamilyId.REFLEXIVITY,
  primary_taxonomy_family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
  secondary_taxonomy_families: [],
  description:
    'Crowding / leverage expansion / reflexive late-stage / unwind ' +
    'risk. Prior participation required; clean continuation trust ' +
    'narrows (§9.6.7).',
  legal_scope_types: ['MARKET', 'ASSET', 'TOKEN', 'CHAIN', 'ECOSYSTEM'],
  state_ownership: [
    {
      state: L9SequenceState.LEVERAGE_CROWDING_PHASE,
      posture: L9StateOwnershipPosture.EXCLUSIVE,
      shared_with: [],
    },
    {
      state: L9SequenceState.LATE_STAGE_REFLEXIVITY,
      posture: L9StateOwnershipPosture.EXCLUSIVE,
      shared_with: [],
    },
  ],
  template_ids: [
    L9SequenceTemplateId.LEVERAGE_CROWDING_PHASE,
    L9SequenceTemplateId.LATE_STAGE_REFLEXIVITY,
  ],
  legal_phase_envelope: [
    L9PhaseClass.EXPANSION,
    L9PhaseClass.CROWDING,
    L9PhaseClass.LATE,
    L9PhaseClass.REFLEXIVE_LATE,
    L9PhaseClass.DECAYING,
  ],
  required_contradiction_trigger_families: [
    L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
    L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    L9ChangePointTriggerFamily.DECAY_DOMINANCE,
    L9ChangePointTriggerFamily.REGIME_TRANSITION,
  ],
  decay_tolerance_ceiling: L9DecayDominance.HIGH_DECAY,
  legal_post_event_anchor_classes: [],
  regime_requirement: L9TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
  rollout_phase: L9SequenceRolloutPhase.P3_LATE_STAGE,
  default_confidence_cap: 0.75,
  default_decay_baseline: L9DecayDominance.MODERATE_DECAY,
  coexists_with: [
    L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
    L9ProductionFamilyId.NARRATIVE_VALIDATION,
    L9ProductionFamilyId.SHOCK_DIGESTION,
    L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE,
  ],
  family_invariants: [
    'prior_expansion_or_validation_required',
    'late_entrant_ordering_required',
    'hostile_regime_narrows',
    'contradiction_pressure_narrows_or_blocks',
  ],
};
