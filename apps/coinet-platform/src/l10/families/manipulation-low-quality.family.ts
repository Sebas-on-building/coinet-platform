/**
 * L10.6 §10.6.9 — Family F: Manipulation / Low-Quality
 *
 * Models explanations where the move is best explained by weak-
 * quality participation, fabricated or low-trust structure, or
 * manipulation-adjacent behavior (§10.6.9.1). Requires support from
 * weak-quality / suspicious / low-integrity domains with poor
 * structural confirmation (§10.6.9.2).
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

export const MANIPULATION_LOW_QUALITY_FAMILY: L10HypothesisFamilyDefinition = {
  family_id: L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
  family_version: '1.0.0',
  description:
    'Explanations anchored in low-quality participation, fabricated ' +
    'structure, and manipulation-adjacent behavior beneath the move.',
  owned_candidate_archetypes: [
    L10HypothesisFamilyClass.LOW_QUALITY_MANIPULATED_LAUNCH,
  ],
  legal_scope_types: ['TOKEN', 'PROTOCOL'],
  legal_support_domains: [
    L10TemplateSupportDomain.SUSPICIOUS_QUALITY_POSTURE,
    L10TemplateSupportDomain.LOW_TRUST_STRUCTURE,
    L10TemplateSupportDomain.FABRICATED_PARTICIPATION_SIGNAL,
    L10TemplateSupportDomain.DISTRIBUTION_DIVERGENCE,
    L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  legal_contradiction_domains: [
    L10TemplateContradictionDomain.QUALITY_IMPROVEMENT,
    L10TemplateContradictionDomain.MANIPULATION_ABSENCE,
    L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
    L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION,
    L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
    L10TemplateContradictionDomain.REGIME_HOSTILITY,
    L10TemplateContradictionDomain.SEQUENCE_POSTURE_INCOMPATIBLE,
  ],
  legal_validation_dependencies: [
    'L7_QUALITY_VALIDATION',
    'L7_TRUST_VALIDATION',
    'L7_MANIPULATION_VALIDATION',
  ],
  legal_regime_dependencies: [
    'LAUNCH_DISCOVERY',
    'THIN_LIQUIDITY_FRAGILITY',
    'MEMECOIN_MANIA',
    'CHOP',
  ],
  legal_sequence_dependencies: [
    'FAILED_CONTINUATION',
    'STRUCTURAL_CONFIRMATION_GAP',
    'CROWDING_WITHOUT_CONFIRMATION',
    'DISCOVERY',
    'EARLY',
    'DECAYING',
  ],
  legal_templates: [
    L10HypothesisTemplateId.LOW_QUALITY_MANIPULATED_LAUNCH,
    L10HypothesisTemplateId.STRUCTURALLY_WEAK_PUMP,
    L10HypothesisTemplateId.FABRICATED_PARTICIPATION_PATTERN,
  ],
  regime_requirement: L10TemplateRegimeRequirement.REQUIRED_PRESENT,
  sequence_requirement:
    L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
  default_restriction_posture: 'NARROWED_DEFAULT',
  rollout_phase: L10HypothesisRolloutPhase.P4_ADVERSARIAL_EXPLANATION,
  coexists_with: [
    L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
    L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
  ],
  incompatible_with: [
    L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
    L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
  ],
  family_invariants: [
    'primary_support_from_low_quality_or_suspicious_domains',
    'quality_improvement_narrows_or_blocks',
    'manipulation_absence_narrows_or_blocks',
    'genuine_accumulation_and_fundamental_rerating_incompatible_co_primary',
  ],
};
