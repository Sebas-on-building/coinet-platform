/**
 * L10.6 §10.6.4 — Family A: Genuine Accumulation / Demand
 *
 * Models explanations where the current state is best explained by
 * real demand, structurally improving participation, and non-fake
 * support beneath the move (§10.6.4.1). Requires constructive support
 * from accumulation / demand-breadth / liquidity domains, with no
 * dominant distribution, overhang, or manipulation signals (§10.6.4.2).
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

export const GENUINE_ACCUMULATION_DEMAND_FAMILY: L10HypothesisFamilyDefinition = {
  family_id: L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
  family_version: '1.0.0',
  description:
    'Constructive demand-led explanations: real accumulation, ' +
    'broadening participation, and non-fake support beneath the move.',
  owned_candidate_archetypes: [
    L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
  ],
  legal_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL', 'SECTOR'],
  legal_support_domains: [
    L10TemplateSupportDomain.ACCUMULATION_EVIDENCE,
    L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L10TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
    L10TemplateSupportDomain.DEMAND_BREADTH,
    L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
    L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  legal_contradiction_domains: [
    L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
    L10TemplateContradictionDomain.LEVERAGE_DOMINANCE_UNDER_DEMAND_CLAIM,
    L10TemplateContradictionDomain.NARRATIVE_COLLAPSE,
    L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
    L10TemplateContradictionDomain.REGIME_HOSTILITY,
    L10TemplateContradictionDomain.SEQUENCE_POSTURE_INCOMPATIBLE,
  ],
  legal_validation_dependencies: [
    'L7_STRUCTURAL_VALIDATION',
    'L7_DEMAND_VALIDATION',
    'L7_CONTINUATION_VALIDATION',
  ],
  legal_regime_dependencies: [
    'SPOT_LED_EXPANSION',
    'EARLY_ACCUMULATION',
    'NARRATIVE_BREAKOUT',
    'MATURE_TREND',
    'RISK_ON',
  ],
  legal_sequence_dependencies: [
    'PRE_NARRATIVE_ACCUMULATION',
    'EARLY_NARRATIVE_IGNITION',
    'VALIDATED_EXPANSION',
    'EARLY',
    'CONFIRMING',
    'EXPANSION',
  ],
  legal_templates: [
    L10HypothesisTemplateId.GENUINE_EARLY_ACCUMULATION,
    L10HypothesisTemplateId.REAL_DEMAND_LED_EXPANSION,
    L10HypothesisTemplateId.STRUCTURALLY_IMPROVING_ACCUMULATION,
  ],
  regime_requirement: L10TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
  sequence_requirement:
    L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
  default_restriction_posture: 'COMPETITION_MUST_BE_LIVE',
  rollout_phase: L10HypothesisRolloutPhase.P1_CORE,
  coexists_with: [
    L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
    L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
    L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
  ],
  incompatible_with: [
    L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
    L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
  ],
  family_invariants: [
    'primary_support_from_accumulation_or_demand_domains',
    'distribution_and_manipulation_never_dominant',
    'leverage_may_not_subsume_demand_as_primary_driver',
    'narrowed_under_hostile_regime_or_incompatible_sequence',
  ],
};
