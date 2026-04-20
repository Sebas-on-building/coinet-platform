/**
 * L10.6 §10.6.7 — Family D: Fundamental Rerating
 *
 * Models explanations driven by improving protocol / business quality,
 * substance-backed rerating, and structural repricing grounded in
 * fundamentals (§10.6.7.1). Requires strong substance / protocol /
 * business-quality support and L7 validation posture supporting the
 * improvement thesis (§10.6.7.2).
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

export const FUNDAMENTAL_RERATING_FAMILY: L10HypothesisFamilyDefinition = {
  family_id: L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
  family_version: '1.0.0',
  description:
    'Substance-backed repricing driven by improving protocol / ' +
    'business quality rather than narrative or leverage.',
  owned_candidate_archetypes: [
    L10HypothesisFamilyClass.FUNDAMENTALLY_IMPROVING_RERATING,
  ],
  legal_scope_types: ['PROTOCOL', 'TOKEN', 'ASSET'],
  legal_support_domains: [
    L10TemplateSupportDomain.PROTOCOL_QUALITY,
    L10TemplateSupportDomain.BUSINESS_SUBSTANCE,
    L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
    L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  legal_contradiction_domains: [
    L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION,
    L10TemplateContradictionDomain.PROTOCOL_QUALITY_DEGRADATION,
    L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
    L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
    L10TemplateContradictionDomain.LEVERAGE_DOMINANCE_UNDER_DEMAND_CLAIM,
    L10TemplateContradictionDomain.NARRATIVE_COLLAPSE,
    L10TemplateContradictionDomain.REGIME_HOSTILITY,
    L10TemplateContradictionDomain.SEQUENCE_POSTURE_INCOMPATIBLE,
  ],
  legal_validation_dependencies: [
    'L7_FUNDAMENTAL_VALIDATION',
    'L7_PROTOCOL_QUALITY_VALIDATION',
    'L7_SUBSTANCE_VALIDATION',
  ],
  legal_regime_dependencies: [
    'SPOT_LED_EXPANSION',
    'MATURE_TREND',
    'EARLY_ACCUMULATION',
    'DEFI_RERATING',
  ],
  legal_sequence_dependencies: [
    'VALIDATED_EXPANSION',
    'EARLY_NARRATIVE_IGNITION',
    'CONFIRMING',
    'VALIDATED',
    'EXPANSION',
  ],
  legal_templates: [
    L10HypothesisTemplateId.FUNDAMENTALLY_IMPROVING_RERATING,
    L10HypothesisTemplateId.PROTOCOL_QUALITY_REPRICING,
    L10HypothesisTemplateId.SUBSTANCE_BACKED_CONTINUATION,
  ],
  regime_requirement: L10TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
  sequence_requirement:
    L10TemplateSequenceRequirement.MUST_NARROW_UNDER_INCOMPATIBLE,
  default_restriction_posture: 'COMPETITION_MUST_BE_LIVE',
  rollout_phase: L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
  coexists_with: [
    L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
    L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
  ],
  incompatible_with: [
    L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
    L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
  ],
  family_invariants: [
    'primary_support_from_fundamentals_or_protocol_quality',
    'validation_contradiction_forces_narrow',
    'narrative_only_explanation_is_incompatible_co_primary',
    'narrowed_under_hostile_regime_or_incompatible_sequence',
  ],
};
