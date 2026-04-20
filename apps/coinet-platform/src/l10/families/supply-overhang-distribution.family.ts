/**
 * L10.6 §10.6.8 — Family E: Supply-Overhang / Distribution
 *
 * Models explanations driven by unlock overhang, treasury-led
 * distribution, hidden supply pressure, and distribution beneath a
 * still-loud narrative (§10.6.8.1). Requires support from supply-
 * overhang / treasury-flow / distribution-divergence domains and
 * sequence posture compatible with post-unlock / late-stage /
 * weakening-support dynamics (§10.6.8.2).
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

export const SUPPLY_OVERHANG_DISTRIBUTION_FAMILY: L10HypothesisFamilyDefinition = {
  family_id: L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
  family_version: '1.0.0',
  description:
    'Explanations anchored in unlock overhang, treasury-led ' +
    'distribution, and distribution beneath a still-loud narrative.',
  owned_candidate_archetypes: [
    L10HypothesisFamilyClass.POST_UNLOCK_REDISTRIBUTION,
    L10HypothesisFamilyClass.TREASURY_LED_DISTRIBUTION,
  ],
  legal_scope_types: ['TOKEN', 'PROTOCOL'],
  legal_support_domains: [
    L10TemplateSupportDomain.SUPPLY_OVERHANG_EVIDENCE,
    L10TemplateSupportDomain.TREASURY_ENTITY_FLOW,
    L10TemplateSupportDomain.DISTRIBUTION_DIVERGENCE,
    L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  legal_contradiction_domains: [
    L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
    L10TemplateContradictionDomain.QUALITY_IMPROVEMENT,
    L10TemplateContradictionDomain.MANIPULATION_ABSENCE,
    L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    L10TemplateContradictionDomain.NARRATIVE_COLLAPSE,
    L10TemplateContradictionDomain.REGIME_HOSTILITY,
    L10TemplateContradictionDomain.SEQUENCE_POSTURE_INCOMPATIBLE,
    L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
  ],
  legal_validation_dependencies: [
    'L7_SUPPLY_OVERHANG_VALIDATION',
    'L7_TREASURY_FLOW_VALIDATION',
    'L7_DISTRIBUTION_VALIDATION',
  ],
  legal_regime_dependencies: [
    'POST_UNLOCK_DIGESTION',
    'DISTRIBUTION',
    'BLOWOFF_REFLEXIVE_LATE_STAGE',
    'THIN_LIQUIDITY_FRAGILITY',
    'CHAIN_CONTRACTION',
  ],
  legal_sequence_dependencies: [
    'POST_SHOCK_DIGESTION',
    'DISTRIBUTION_UNDER_HYPE',
    'LATE_STAGE_REFLEXIVITY',
    'DIGESTION',
    'DECAYING',
    'LATE',
  ],
  legal_templates: [
    L10HypothesisTemplateId.POST_UNLOCK_REDISTRIBUTION,
    L10HypothesisTemplateId.TREASURY_LED_DISTRIBUTION,
    L10HypothesisTemplateId.DISTRIBUTION_UNDER_HYPE,
  ],
  regime_requirement: L10TemplateRegimeRequirement.REQUIRED_PRESENT,
  sequence_requirement:
    L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
  default_restriction_posture: 'POST_EVENT_ANCHORED',
  rollout_phase: L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
  coexists_with: [
    L10HypothesisFamilyId.LEVERAGE_SQUEEZE,
    L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
    L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
  ],
  incompatible_with: [
    L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
  ],
  family_invariants: [
    'primary_support_from_supply_or_distribution_domains',
    'clean_demand_evidence_narrows_or_blocks',
    'quality_improvement_narrows_or_blocks',
    'genuine_accumulation_is_incompatible_co_primary',
  ],
};
