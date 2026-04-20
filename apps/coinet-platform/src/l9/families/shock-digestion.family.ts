/**
 * L9.6 §9.6.8 — Family D: Shock / Digestion
 *
 * Models what happens after unlocks, liquidation shocks, security
 * shocks, contradiction shocks. Requires anchored post-event windows
 * (§9.6.8.4–5). Core state ownership: POST_SHOCK_DIGESTION (plus
 * optional recovery posture via REACCUMULATION_ATTEMPT).
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
import { L9PostEventAnchorClass } from '../contracts/l9-post-event-window-policy';

export const SHOCK_DIGESTION_FAMILY: L9SequenceFamilyDefinition = {
  family_id: L9ProductionFamilyId.SHOCK_DIGESTION,
  primary_taxonomy_family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
  secondary_taxonomy_families: [L9SequenceFamily.SHOCK_AND_RECOVERY],
  description:
    'Post-event damage and processing: shock realization → momentum ' +
    'damage → digestion → stabilization or failure (§9.6.8). Requires ' +
    'anchored post-event windows. L9.6 launch ships the POST_SHOCK_' +
    'DIGESTION template only; REACCUMULATION_ATTEMPT and RECOVERY_' +
    'UNDER_DAMAGE are reserved for a later template expansion and so ' +
    'are not part of this launch\'s ownership set.',
  legal_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL', 'ECOSYSTEM', 'CHAIN'],
  state_ownership: [
    {
      state: L9SequenceState.POST_SHOCK_DIGESTION,
      posture: L9StateOwnershipPosture.EXCLUSIVE,
      shared_with: [],
    },
    {
      state: L9SequenceState.FAILED_CONTINUATION,
      posture: L9StateOwnershipPosture.NEGATIVE_LATE_POSTURE,
      shared_with: [],
    },
  ],
  template_ids: [
    L9SequenceTemplateId.POST_SHOCK_DIGESTION,
  ],
  legal_phase_envelope: [
    L9PhaseClass.SHOCK_RESPONSE,
    L9PhaseClass.DIGESTION,
    L9PhaseClass.RECOVERY,
    L9PhaseClass.DECAYING,
  ],
  required_contradiction_trigger_families: [
    L9ChangePointTriggerFamily.UNLOCK_EVENT,
    L9ChangePointTriggerFamily.LIQUIDATION_EVENT,
    L9ChangePointTriggerFamily.SECURITY_EVENT,
    L9ChangePointTriggerFamily.POST_EVENT_ENTRY,
    L9ChangePointTriggerFamily.POST_EVENT_EXIT,
    L9ChangePointTriggerFamily.DECAY_DOMINANCE,
  ],
  decay_tolerance_ceiling: L9DecayDominance.HIGH_DECAY,
  legal_post_event_anchor_classes: [
    L9PostEventAnchorClass.UNLOCK,
    L9PostEventAnchorClass.LIQUIDATION,
    L9PostEventAnchorClass.SECURITY_EVENT,
    L9PostEventAnchorClass.CONTRADICTION_BUNDLE,
  ],
  regime_requirement: L9TemplateRegimeRequirement.REQUIRED_PRESENT,
  rollout_phase: L9SequenceRolloutPhase.P4_SHOCK_RECOVERY,
  default_confidence_cap: 0.70,
  default_decay_baseline: L9DecayDominance.MODERATE_DECAY,
  coexists_with: [
    L9ProductionFamilyId.REFLEXIVITY,
    L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  ],
  family_invariants: [
    'post_event_anchor_required',
    'damage_phase_required',
    'no_full_recovery_while_shock_dominant',
    'active_shock_blocks_reaccumulation',
    'expired_window_not_treated_as_current',
  ],
};
