/**
 * L10.6 §10.6.6 — Family C: Narrative / Reflexive
 *
 * Models explanations best described by attention, hype, or reflexive
 * narrative reinforcement with weak structural depth (§10.6.6.1).
 * Requires narrative / attention / breadth support with structural
 * support that is weak or secondary, and sequence posture compatible
 * with ignition or reflexive continuation (§10.6.6.2).
 */

import {
  L10HypothesisFamilyDefinition,
} from '../contracts/hypothesis-family-definition';
import {
  L10HypothesisFamilyId,
  L10HypothesisRolloutPhase,
  L10HypothesisTemplateId,
  L10TemplateContradictionDomain,
  L10TemplateRegimeRequirement,
  L10TemplateSequenceRequirement,
  L10TemplateSupportDomain,
} from '../contracts/hypothesis-template-policy';
import { L10HypothesisFamilyClass } from '../contracts/hypothesis-subject-class';

export const NARRATIVE_REFLEXIVE_FAMILY: L10HypothesisFamilyDefinition = {
  family_id: L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
  family_version: '1.0.0',
  description:
    'Narrative- / attention- / hype-led repricing with weak or ' +
    'secondary structural depth.',
  owned_candidate_archetypes: [
    L10HypothesisFamilyClass.NARRATIVE_ONLY_REFLEXIVE_PUMP,
  ],
  legal_scope_types: ['TOKEN', 'NARRATIVE_CLUSTER', 'SECTOR'],
  legal_support_domains: [
    L10TemplateSupportDomain.NARRATIVE_BREADTH,
    L10TemplateSupportDomain.ATTENTION_FLOW,
    L10TemplateSupportDomain.SPECULATIVE_PARTICIPATION,
    L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  legal_contradiction_domains: [
    L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    L10TemplateContradictionDomain.NARRATIVE_COLLAPSE,
    L10TemplateContradictionDomain.ATTENTION_DECAY,
    L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
    L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION,
    L10TemplateContradictionDomain.REGIME_HOSTILITY,
    L10TemplateContradictionDomain.SEQUENCE_POSTURE_INCOMPATIBLE,
  ],
  legal_validation_dependencies: [
    'L7_NARRATIVE_VALIDATION',
    'L7_ATTENTION_VALIDATION',
    'L7_REFLEXIVE_VALIDATION',
  ],
  legal_regime_dependencies: [
    'NARRATIVE_BREAKOUT',
    'MEMECOIN_MANIA',
    'SECTOR_ROTATION',
    'RISK_ON',
  ],
  legal_sequence_dependencies: [
    'EARLY_NARRATIVE_IGNITION',
    'LATE_STAGE_REFLEXIVITY',
    'DISCOVERY',
    'EARLY',
    'EXPANSION',
    'REFLEXIVE_LATE',
  ],
  legal_templates: [
    L10HypothesisTemplateId.NARRATIVE_ONLY_REFLEXIVE_PUMP,
    L10HypothesisTemplateId.HYPE_LED_CONTINUATION,
    L10HypothesisTemplateId.ATTENTION_DRIVEN_REPRICING,
  ],
  regime_requirement: L10TemplateRegimeRequirement.REQUIRED_PRESENT,
  sequence_requirement:
    L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
  default_restriction_posture: 'COMPETITION_MUST_BE_LIVE',
  rollout_phase: L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
  coexists_with: [
    L10HypothesisFamilyId.LEVERAGE_SQUEEZE,
    L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
    L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
  ],
  incompatible_with: [
    L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
  ],
  family_invariants: [
    'primary_support_from_narrative_or_attention_domains',
    'structural_support_never_primary_in_this_family',
    'attention_decay_narrows_hard',
    'fundamental_rerating_is_incompatible_co_primary',
  ],
};
