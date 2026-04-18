/**
 * L7.5 — Risk-Overhang Validation Family
 *
 * §7.5.6.7 — Tests whether major structural risks materially weaken
 * otherwise positive stories. This family often acts as a challenger
 * rather than a positive validator.
 */

import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import {
  L7ValidationFamilyDefinition,
  L7ValidationFamilyId,
} from '../contracts/validation-family-definition';
import { L7ValidationRolloutPhase } from '../contracts/validation-family-rollout';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';

export const RISK_OVERHANG_VALIDATION: L7ValidationFamilyDefinition = {
  family_id: L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
  description:
    'Tests whether material risk overhangs (unlock / security / regulatory) weaken otherwise positive stories',
  legal_subject_classes: [
    L7ValidationSubjectClass.RISK_OVERHANG_CLAIM,
    L7ValidationSubjectClass.STATE_CLAIM,
    L7ValidationSubjectClass.DIVERGENCE_CLAIM,
  ],
  legal_scopes: ['ASSET', 'PROTOCOL', 'CHAIN', 'PORTFOLIO'],
  required_support_domains: ['EVENT_FAMILY', 'ONCHAIN_FAMILY'],
  required_challenge_domains: ['FLOW_FAMILY', 'PRICE_FAMILY'],
  allowed_contradiction_families: [
    L7ContradictionFamilyClass.UNLOCK_OVERHANG_CONTRADICTION,
    L7ContradictionFamilyClass.SECURITY_OVERHANG_CONTRADICTION,
    L7ContradictionFamilyClass.TEMPORAL_MATURITY_CONTRADICTION,
  ],
  allowed_template_ids: ['ct:narrative-strong-unlock-near@1'],
  legal_primary_classes: [
    L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    L7PrimaryValidationClass.CONFLICTING,
    L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
    L7PrimaryValidationClass.STALE,
    L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
  ],
  confidence_posture: {
    defaultBand: 'LOW',
    rawScoreCeiling: 0.7,
    blockingCeiling: 0.15,
  },
  restriction_posture: {
    defaultBaseline: 'EVIDENCE_ONLY',
    requiresContradictionDisclosure: true,
    evidenceOnlyOnConflict: true,
  },
  rollout_phase: L7ValidationRolloutPhase.P5_RISK,
  rollout_priority: 6,
  production_enabled: true,
  certification_band_green: true,
  runtime_integration_green: true,
  restriction_posture_validated: true,
  depends_on: [
    L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    L7ValidationFamilyId.PROTOCOL_SUBSTANCE_VALIDATION,
    L7ValidationFamilyId.NARRATIVE_VALIDATION,
    L7ValidationFamilyId.ACCUMULATION_VALIDATION,
  ],
};
