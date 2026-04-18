/**
 * L7.5 — Market Strength Validation Family
 *
 * §7.5.6.3 — Tests whether apparent market strength is supported by
 * spot participation, volume quality, liquidity quality, derivatives
 * context, and contradiction pressure from crowding or weak support.
 */

import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import {
  L7ValidationFamilyDefinition,
  L7ValidationFamilyId,
} from '../contracts/validation-family-definition';
import { L7ValidationRolloutPhase } from '../contracts/validation-family-rollout';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';

export const MARKET_STRENGTH_VALIDATION: L7ValidationFamilyDefinition = {
  family_id: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
  description:
    'Tests whether apparent market strength is supported by spot participation, volume quality, liquidity quality, and derivatives context',
  legal_subject_classes: [
    L7ValidationSubjectClass.STATE_CLAIM,
    L7ValidationSubjectClass.ALIGNMENT_CLAIM,
    L7ValidationSubjectClass.DIVERGENCE_CLAIM,
  ],
  legal_scopes: ['ASSET', 'MARKET', 'PORTFOLIO'],
  required_support_domains: ['PRICE_FAMILY', 'PARTICIPATION_FAMILY'],
  required_challenge_domains: ['FLOW_FAMILY', 'LIQUIDITY_FAMILY'],
  allowed_contradiction_families: [
    L7ContradictionFamilyClass.PRICE_FLOW_CONTRADICTION,
    L7ContradictionFamilyClass.PRICE_DERIVATIVES_CONTRADICTION,
    L7ContradictionFamilyClass.TEMPORAL_MATURITY_CONTRADICTION,
  ],
  allowed_template_ids: ['ct:price-up-spot-weak-perps-crowded@1'],
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
    blockingCeiling: 0.3,
  },
  restriction_posture: {
    defaultBaseline: 'SCORE_ONLY',
    requiresContradictionDisclosure: true,
    evidenceOnlyOnConflict: true,
  },
  rollout_phase: L7ValidationRolloutPhase.P2_CORE_MARKET,
  rollout_priority: 1,
  production_enabled: true,
  certification_band_green: true,
  runtime_integration_green: true,
  restriction_posture_validated: true,
  depends_on: [],
};
