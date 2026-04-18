/**
 * L7.5 — Accumulation Validation Family
 *
 * §7.5.6.6 — Tests whether accumulation stories are supported by real
 * flow quality, non-distribution behavior, liquidity quality,
 * attribution quality, and smart-wallet quality.
 */

import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import {
  L7ValidationFamilyDefinition,
  L7ValidationFamilyId,
} from '../contracts/validation-family-definition';
import { L7ValidationRolloutPhase } from '../contracts/validation-family-rollout';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';

export const ACCUMULATION_VALIDATION: L7ValidationFamilyDefinition = {
  family_id: L7ValidationFamilyId.ACCUMULATION_VALIDATION,
  description:
    'Tests accumulation stories against real flow quality, non-distribution, liquidity, attribution, and smart-wallet quality',
  legal_subject_classes: [
    L7ValidationSubjectClass.FLOW_CLAIM,
    L7ValidationSubjectClass.CHANGE_CLAIM,
    L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
  ],
  legal_scopes: ['ASSET', 'PROTOCOL', 'CHAIN', 'PORTFOLIO'],
  required_support_domains: ['FLOW_FAMILY', 'ONCHAIN_FAMILY'],
  required_challenge_domains: ['LIQUIDITY_FAMILY', 'PRICE_FAMILY'],
  allowed_contradiction_families: [
    L7ContradictionFamilyClass.WHALE_LIQUIDITY_CONTRADICTION,
    L7ContradictionFamilyClass.SMART_MONEY_QUALITY_CONTRADICTION,
    L7ContradictionFamilyClass.PRICE_FLOW_CONTRADICTION,
  ],
  allowed_template_ids: ['ct:smart-wallet-accumulation-liquidity-poor@1'],
  legal_primary_classes: [
    L7PrimaryValidationClass.CONFIRMED,
    L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    L7PrimaryValidationClass.CONFLICTING,
    L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
    L7PrimaryValidationClass.STALE,
    L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
  ],
  confidence_posture: {
    defaultBand: 'LOW',
    rawScoreCeiling: 0.8,
    blockingCeiling: 0.2,
  },
  restriction_posture: {
    defaultBaseline: 'SCORE_ONLY',
    requiresContradictionDisclosure: true,
    evidenceOnlyOnConflict: true,
  },
  rollout_phase: L7ValidationRolloutPhase.P4_BEHAVIORAL,
  rollout_priority: 5,
  production_enabled: true,
  certification_band_green: true,
  runtime_integration_green: true,
  restriction_posture_validated: true,
  depends_on: [
    L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    L7ValidationFamilyId.PROTOCOL_SUBSTANCE_VALIDATION,
    L7ValidationFamilyId.NARRATIVE_VALIDATION,
  ],
};
