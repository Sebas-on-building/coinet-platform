/**
 * L10.6 §10.6.10 — Family G: Ecosystem Spillover / Rotation
 *
 * Models explanations driven by chain-level attention shift, sector
 * spillover, ecosystem beta rerating, and relational repricing rather
 * than asset-specific development (§10.6.10.1). Requires cross-asset
 * or ecosystem-level support and relation evidence from L4 (§10.6.10.2).
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

export const ECOSYSTEM_SPILLOVER_ROTATION_FAMILY: L10HypothesisFamilyDefinition = {
  family_id: L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
  family_version: '1.0.0',
  description:
    'Chain / sector / ecosystem spillover: relational repricing ' +
    'where the candidate asset benefits primarily through relation ' +
    'or sector-level flow, not asset-specific drivers.',
  owned_candidate_archetypes: [
    L10HypothesisFamilyClass.SECTOR_SPILLOVER_REPRICING,
  ],
  legal_scope_types: [
    'SECTOR', 'ECOSYSTEM', 'CHAIN', 'TOKEN', 'PROTOCOL', 'NARRATIVE_CLUSTER',
  ],
  legal_support_domains: [
    L10TemplateSupportDomain.RELATION_CROSS_ASSET,
    L10TemplateSupportDomain.ECOSYSTEM_LEVEL_FLOW,
    L10TemplateSupportDomain.CHAIN_ATTENTION_TRANSFER,
    L10TemplateSupportDomain.NARRATIVE_BREADTH,
    L10TemplateSupportDomain.ATTENTION_FLOW,
    L10TemplateSupportDomain.DEMAND_BREADTH,
    L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
    L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  legal_contradiction_domains: [
    L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE,
    L10TemplateContradictionDomain.SPILLOVER_ABSENCE,
    L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    L10TemplateContradictionDomain.NARRATIVE_COLLAPSE,
    L10TemplateContradictionDomain.ATTENTION_DECAY,
    L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION,
    L10TemplateContradictionDomain.REGIME_HOSTILITY,
    L10TemplateContradictionDomain.SEQUENCE_POSTURE_INCOMPATIBLE,
  ],
  legal_validation_dependencies: [
    'L7_RELATION_VALIDATION',
    'L7_ECOSYSTEM_VALIDATION',
    'L7_SECTOR_VALIDATION',
  ],
  legal_regime_dependencies: [
    'SECTOR_ROTATION',
    'CHAIN_EXPANSION',
    'DEFI_RERATING',
    'L2_ATTENTION_SHIFT',
    'RISK_ON',
  ],
  legal_sequence_dependencies: [
    'EARLY_NARRATIVE_IGNITION',
    'VALIDATED_EXPANSION',
    'ROTATION',
    'EARLY',
    'CONFIRMING',
    'EXPANSION',
  ],
  legal_templates: [
    L10HypothesisTemplateId.SECTOR_SPILLOVER_REPRICING,
    L10HypothesisTemplateId.CHAIN_ATTENTION_TRANSFER,
    L10HypothesisTemplateId.ECOSYSTEM_BETA_RERATING,
  ],
  regime_requirement: L10TemplateRegimeRequirement.REQUIRED_PRESENT,
  sequence_requirement:
    L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
  default_restriction_posture: 'RELATIONAL_ANCHORED',
  rollout_phase: L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION,
  coexists_with: [
    L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
    L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
    L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
  ],
  incompatible_with: [],
  family_invariants: [
    'primary_support_from_relation_or_ecosystem_domains',
    'asset_specific_dominance_narrows_or_blocks',
    'spillover_absence_narrows_or_blocks',
    'relational_anchor_required_for_clean_emission',
  ],
};
