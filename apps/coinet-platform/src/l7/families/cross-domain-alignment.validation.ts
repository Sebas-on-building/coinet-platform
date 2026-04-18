/**
 * L7.5 — Cross-Domain Alignment Validation Family
 *
 * §7.5.6.8 — Tests whether price, flows, protocol substance, narrative,
 * entity behavior, and risk surfaces point in the same or conflicting
 * directions. The broadest and most advanced early family.
 */

import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import {
  L7ValidationFamilyDefinition,
  L7ValidationFamilyId,
} from '../contracts/validation-family-definition';
import { L7ValidationRolloutPhase } from '../contracts/validation-family-rollout';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';

export const CROSS_DOMAIN_ALIGNMENT_VALIDATION: L7ValidationFamilyDefinition = {
  family_id: L7ValidationFamilyId.CROSS_DOMAIN_ALIGNMENT_VALIDATION,
  description:
    'Tests whether price, flows, protocol substance, narrative, entity behavior, and risk surfaces align or conflict',
  legal_subject_classes: [
    L7ValidationSubjectClass.ALIGNMENT_CLAIM,
    L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
  ],
  legal_scopes: ['ASSET', 'PROTOCOL', 'CHAIN', 'MARKET', 'NARRATIVE_CLUSTER', 'PORTFOLIO'],
  required_support_domains: ['PRICE_FAMILY', 'FLOW_FAMILY', 'PARTICIPATION_FAMILY'],
  required_challenge_domains: ['FLOW_FAMILY', 'SENTIMENT_FAMILY'],
  allowed_contradiction_families: [
    L7ContradictionFamilyClass.PRICE_FLOW_CONTRADICTION,
    L7ContradictionFamilyClass.PRICE_DERIVATIVES_CONTRADICTION,
    L7ContradictionFamilyClass.SUBSTANCE_VALUATION_CONTRADICTION,
    L7ContradictionFamilyClass.NARRATIVE_FLOW_CONTRADICTION,
    L7ContradictionFamilyClass.NARRATIVE_STRUCTURE_CONTRADICTION,
    L7ContradictionFamilyClass.SMART_MONEY_QUALITY_CONTRADICTION,
    L7ContradictionFamilyClass.WHALE_LIQUIDITY_CONTRADICTION,
    L7ContradictionFamilyClass.UNLOCK_OVERHANG_CONTRADICTION,
    L7ContradictionFamilyClass.SECURITY_OVERHANG_CONTRADICTION,
    L7ContradictionFamilyClass.REVENUE_TVL_CONTRADICTION,
    L7ContradictionFamilyClass.FLOW_CAPTURE_CONTRADICTION,
    L7ContradictionFamilyClass.TEMPORAL_MATURITY_CONTRADICTION,
  ],
  allowed_template_ids: [
    'ct:price-up-spot-weak-perps-crowded@1',
    'ct:tvl-up-inflows-flat-revenue-weak@1',
    'ct:social-hype-whales-distributing@1',
    'ct:narrative-strong-unlock-near@1',
    'ct:smart-wallet-accumulation-liquidity-poor@1',
  ],
  legal_primary_classes: [
    L7PrimaryValidationClass.CONFIRMED,
    L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    L7PrimaryValidationClass.CONFLICTING,
    L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
    L7PrimaryValidationClass.STALE,
    L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
  ],
  confidence_posture: {
    defaultBand: 'MODERATE',
    rawScoreCeiling: 0.95,
    blockingCeiling: 0.3,
  },
  restriction_posture: {
    defaultBaseline: 'SCORE_ONLY',
    requiresContradictionDisclosure: true,
    evidenceOnlyOnConflict: true,
  },
  rollout_phase: L7ValidationRolloutPhase.P6_ALIGNMENT,
  rollout_priority: 7,
  production_enabled: true,
  certification_band_green: true,
  runtime_integration_green: true,
  restriction_posture_validated: true,
  depends_on: [
    L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
    L7ValidationFamilyId.PROTOCOL_SUBSTANCE_VALIDATION,
    L7ValidationFamilyId.NARRATIVE_VALIDATION,
    L7ValidationFamilyId.ACCUMULATION_VALIDATION,
    L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
  ],
};
