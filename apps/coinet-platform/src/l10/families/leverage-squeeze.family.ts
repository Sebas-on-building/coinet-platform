/**
 * L10.6 §10.6.5 — Family B: Leverage / Squeeze
 *
 * Models explanations driven by leverage expansion, crowding, squeeze
 * mechanics, or reflexive continuation under positioning stress
 * (§10.6.5.1). Requires material leverage / crowding / basis / funding
 * evidence and sequence posture compatible with squeeze progression
 * (§10.6.5.2).
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

export const LEVERAGE_SQUEEZE_FAMILY: L10HypothesisFamilyDefinition = {
  family_id: L10HypothesisFamilyId.LEVERAGE_SQUEEZE,
  family_version: '1.0.0',
  description:
    'Leverage, crowding, basis / funding stress, and reflexive ' +
    'continuation driven by positioning rather than clean demand.',
  owned_candidate_archetypes: [
    L10HypothesisFamilyClass.LEVERAGE_DRIVEN_SQUEEZE,
  ],
  legal_scope_types: ['ASSET', 'TOKEN', 'CHAIN', 'MARKET'],
  legal_support_domains: [
    L10TemplateSupportDomain.LEVERAGE_POSITIONING,
    L10TemplateSupportDomain.CROWDING_STRUCTURE,
    L10TemplateSupportDomain.BASIS_FUNDING_STRESS,
    L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  legal_contradiction_domains: [
    L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE,
    L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
    L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
    L10TemplateContradictionDomain.NARRATIVE_COLLAPSE,
    L10TemplateContradictionDomain.REGIME_HOSTILITY,
    L10TemplateContradictionDomain.SEQUENCE_POSTURE_INCOMPATIBLE,
  ],
  legal_validation_dependencies: [
    'L7_LEVERAGE_VALIDATION',
    'L7_POSITIONING_VALIDATION',
    'L7_CONTINUATION_VALIDATION',
  ],
  legal_regime_dependencies: [
    'LEVERAGE_LED_EXPANSION',
    'BLOWOFF_REFLEXIVE_LATE_STAGE',
    'MATURE_TREND',
    'THIN_LIQUIDITY_FRAGILITY',
    'CHOP',
  ],
  legal_sequence_dependencies: [
    'LEVERAGE_CROWDING_PHASE',
    'LATE_STAGE_REFLEXIVITY',
    'CROWDING_WITHOUT_CONFIRMATION',
    'CROWDING',
    'LATE',
    'REFLEXIVE_LATE',
  ],
  legal_templates: [
    L10HypothesisTemplateId.LEVERAGE_DRIVEN_SQUEEZE,
    L10HypothesisTemplateId.CROWDING_LED_CONTINUATION,
    L10HypothesisTemplateId.REFLEXIVE_LATE_STAGE_SQUEEZE,
  ],
  regime_requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
  sequence_requirement:
    L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
  default_restriction_posture: 'NARROWED_DEFAULT',
  rollout_phase: L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
  coexists_with: [
    L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
    L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
    L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
  ],
  incompatible_with: [],
  family_invariants: [
    'primary_support_from_leverage_or_crowding_domains',
    'clean_demand_evidence_narrows_or_blocks',
    'leverage_unwind_active_blocks',
    'narrowed_under_hostile_regime_or_incompatible_sequence',
  ],
};
