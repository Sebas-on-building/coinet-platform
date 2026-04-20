/**
 * L9.6 §9.6.9 — Family E: Distribution Under Hype
 *
 * Deceptive late-stage setups: surface excitement remains high while
 * underlying structural support weakens. Core state: DISTRIBUTION_UNDER_HYPE.
 *
 * §9.6.9.5 — One of the strongest anti-fake-truth pieces of Layer 9:
 * prevents loud narrative / high attention / elevated participation
 * from being misread as continued bullish confirmation while the
 * underlying chain is deteriorating.
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

export const DISTRIBUTION_UNDER_HYPE_FAMILY: L9SequenceFamilyDefinition = {
  family_id: L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE,
  primary_taxonomy_family: L9SequenceFamily.NARRATIVE_LED,
  secondary_taxonomy_families: [],
  description:
    'Deceptive late-stage distribution under loud narrative. High ' +
    'hype, weakening support, late entrants after prior strong ' +
    'signals have decayed (§9.6.9).',
  legal_scope_types: ['ASSET', 'TOKEN', 'SECTOR', 'NARRATIVE_CLUSTER'],
  state_ownership: [
    {
      state: L9SequenceState.DISTRIBUTION_UNDER_HYPE,
      posture: L9StateOwnershipPosture.EXCLUSIVE,
      shared_with: [],
    },
  ],
  template_ids: [
    L9SequenceTemplateId.DISTRIBUTION_UNDER_HYPE,
  ],
  legal_phase_envelope: [
    L9PhaseClass.LATE,
    L9PhaseClass.REFLEXIVE_LATE,
    L9PhaseClass.CROWDING,
    L9PhaseClass.DECAYING,
  ],
  required_contradiction_trigger_families: [
    L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
    L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    L9ChangePointTriggerFamily.DECAY_DOMINANCE,
    L9ChangePointTriggerFamily.NARRATIVE_BREAKOUT,
  ],
  decay_tolerance_ceiling: L9DecayDominance.HIGH_DECAY,
  legal_post_event_anchor_classes: [],
  regime_requirement: L9TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
  rollout_phase: L9SequenceRolloutPhase.P5_DECEPTIVE_PATTERN,
  default_confidence_cap: 0.70,
  default_decay_baseline: L9DecayDominance.MODERATE_DECAY,
  coexists_with: [
    L9ProductionFamilyId.NARRATIVE_VALIDATION,
    L9ProductionFamilyId.REFLEXIVITY,
  ],
  family_invariants: [
    'distribution_evidence_required',
    'hype_intensity_required',
    'earlier_support_materially_decayed_required',
    'no_clean_emission_while_earlier_support_dominant',
  ],
};
