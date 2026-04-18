/**
 * L7.5 — Protocol Substance Validation Family
 *
 * §7.5.6.4 — Tests whether protocol-level improvement is supported by
 * real inflows, fee trend, revenue quality, chain diversification,
 * value capture — not just valuation expansion.
 */

import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import {
  L7ValidationFamilyDefinition,
  L7ValidationFamilyId,
} from '../contracts/validation-family-definition';
import { L7ValidationRolloutPhase } from '../contracts/validation-family-rollout';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';

export const PROTOCOL_SUBSTANCE_VALIDATION: L7ValidationFamilyDefinition = {
  family_id: L7ValidationFamilyId.PROTOCOL_SUBSTANCE_VALIDATION,
  description:
    'Tests whether protocol-level improvement is supported by real inflows, fees, revenue quality, and value capture',
  legal_subject_classes: [
    L7ValidationSubjectClass.SUBSTANCE_CLAIM,
    L7ValidationSubjectClass.FLOW_CLAIM,
    L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
  ],
  legal_scopes: ['PROTOCOL', 'CHAIN', 'ASSET'],
  required_support_domains: ['TVL_FAMILY', 'REVENUE_FAMILY', 'PARTICIPATION_FAMILY'],
  required_challenge_domains: ['FLOW_FAMILY', 'PRICE_FAMILY'],
  allowed_contradiction_families: [
    L7ContradictionFamilyClass.REVENUE_TVL_CONTRADICTION,
    L7ContradictionFamilyClass.SUBSTANCE_VALUATION_CONTRADICTION,
    L7ContradictionFamilyClass.FLOW_CAPTURE_CONTRADICTION,
  ],
  allowed_template_ids: ['ct:tvl-up-inflows-flat-revenue-weak@1'],
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
    rawScoreCeiling: 0.9,
    blockingCeiling: 0.25,
  },
  restriction_posture: {
    defaultBaseline: 'SCORE_ONLY',
    requiresContradictionDisclosure: true,
    evidenceOnlyOnConflict: true,
  },
  rollout_phase: L7ValidationRolloutPhase.P3_CORE_SUBSTANCE,
  rollout_priority: 3,
  production_enabled: true,
  certification_band_green: true,
  runtime_integration_green: true,
  restriction_posture_validated: true,
  depends_on: [L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION],
};
