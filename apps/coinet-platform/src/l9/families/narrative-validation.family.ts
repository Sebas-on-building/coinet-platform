/**
 * L9.6 §9.6.6 — Family B: Narrative Validation
 *
 * Narrative emergence, breadth growth, structural confirmation vs
 * hype-only. Models both constructive narrative ignition/continuation
 * AND the negative-late posture `DISTRIBUTION_UNDER_HYPE` (shared
 * with Family E per §9.6.6.2).
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

export const NARRATIVE_VALIDATION_FAMILY: L9SequenceFamilyDefinition = {
  family_id: L9ProductionFamilyId.NARRATIVE_VALIDATION,
  primary_taxonomy_family: L9SequenceFamily.NARRATIVE_LED,
  secondary_taxonomy_families: [],
  description:
    'Narrative emergence and testing: breadth, sequencing, structural ' +
    'confirmation, sustainability vs hype (§9.6.6).',
  legal_scope_types: ['ASSET', 'TOKEN', 'SECTOR', 'NARRATIVE_CLUSTER', 'ECOSYSTEM'],
  state_ownership: [
    {
      state: L9SequenceState.EARLY_NARRATIVE_IGNITION,
      posture: L9StateOwnershipPosture.SHARED_WITH_DIFFERENT_ROUTE,
      shared_with: [L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION],
    },
    {
      state: L9SequenceState.VALIDATED_EXPANSION,
      posture: L9StateOwnershipPosture.SHARED_WITH_DIFFERENT_ROUTE,
      shared_with: [L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION],
    },
    {
      state: L9SequenceState.DISTRIBUTION_UNDER_HYPE,
      posture: L9StateOwnershipPosture.NEGATIVE_LATE_POSTURE,
      shared_with: [L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE],
    },
  ],
  template_ids: [
    // Narrative-validation templates reuse `EARLY_NARRATIVE_IGNITION`
    // and `VALIDATED_EXPANSION` from Family A per state sharing; the
    // dedicated Family-B template id is reserved for extension. Kept
    // empty to preserve the INV-9.6-A one-family-per-template rule.
  ],
  legal_phase_envelope: [
    L9PhaseClass.EARLY,
    L9PhaseClass.CONFIRMING,
    L9PhaseClass.VALIDATED,
    L9PhaseClass.EXPANSION,
    L9PhaseClass.LATE,
    L9PhaseClass.REFLEXIVE_LATE,
  ],
  required_contradiction_trigger_families: [
    L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
    L9ChangePointTriggerFamily.NARRATIVE_BREAKOUT,
    L9ChangePointTriggerFamily.REGIME_TRANSITION,
  ],
  decay_tolerance_ceiling: L9DecayDominance.MODERATE_DECAY,
  legal_post_event_anchor_classes: [],
  regime_requirement: L9TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
  rollout_phase: L9SequenceRolloutPhase.P2_EARLY_EXPANSION,
  default_confidence_cap: 0.80,
  default_decay_baseline: L9DecayDominance.LOW_DECAY,
  coexists_with: [
    L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
    L9ProductionFamilyId.REFLEXIVITY,
    L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE,
  ],
  family_invariants: [
    'narrative_requires_breadth_or_structural_support',
    'hype_only_narrow_without_substance',
    'distribution_under_hype_is_negative_late_posture',
  ],
};
