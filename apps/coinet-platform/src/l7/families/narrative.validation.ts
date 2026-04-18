/**
 * L7.5 — Narrative Validation Family
 *
 * §7.5.6.5 — Tests whether narrative acceleration is broad, recent,
 * fresh, cross-source supported, and not merely loud or low-quality.
 */

import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import {
  L7ValidationFamilyDefinition,
  L7ValidationFamilyId,
} from '../contracts/validation-family-definition';
import { L7ValidationRolloutPhase } from '../contracts/validation-family-rollout';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';

export const NARRATIVE_VALIDATION: L7ValidationFamilyDefinition = {
  family_id: L7ValidationFamilyId.NARRATIVE_VALIDATION,
  description:
    'Tests whether narrative acceleration is broad, recent, fresh, cross-source supported, and not merely loud or low-quality',
  legal_subject_classes: [
    L7ValidationSubjectClass.NARRATIVE_CLAIM,
    L7ValidationSubjectClass.ALIGNMENT_CLAIM,
    L7ValidationSubjectClass.DIVERGENCE_CLAIM,
  ],
  legal_scopes: ['NARRATIVE_CLUSTER', 'MARKET'],
  required_support_domains: ['SENTIMENT_FAMILY', 'PARTICIPATION_FAMILY'],
  required_challenge_domains: ['PRICE_FAMILY', 'FLOW_FAMILY'],
  allowed_contradiction_families: [
    L7ContradictionFamilyClass.NARRATIVE_FLOW_CONTRADICTION,
    L7ContradictionFamilyClass.NARRATIVE_STRUCTURE_CONTRADICTION,
    L7ContradictionFamilyClass.TEMPORAL_MATURITY_CONTRADICTION,
  ],
  allowed_template_ids: ['ct:social-hype-whales-distributing@1'],
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
    rawScoreCeiling: 0.85,
    blockingCeiling: 0.25,
  },
  restriction_posture: {
    defaultBaseline: 'SCORE_ONLY',
    requiresContradictionDisclosure: true,
    evidenceOnlyOnConflict: true,
  },
  rollout_phase: L7ValidationRolloutPhase.P3_CORE_SUBSTANCE,
  rollout_priority: 4,
  production_enabled: true,
  certification_band_green: true,
  runtime_integration_green: true,
  restriction_posture_validated: true,
  depends_on: [
    L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    L7ValidationFamilyId.PROTOCOL_SUBSTANCE_VALIDATION,
  ],
};
