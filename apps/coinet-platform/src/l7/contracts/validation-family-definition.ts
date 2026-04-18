/**
 * L7.5 — Validation Family Definition
 *
 * §7.5.6 — A validation family is a governed group of truth-testing
 * subjects and contradiction templates addressing ONE recurring
 * market-story domain. Families are not labels; they declare:
 *
 *   - which subjects they own
 *   - which support/challenge domains they require
 *   - which contradiction families they may emit
 *   - which governed templates they may use
 *   - their default confidence and restriction posture
 *   - their rollout priority
 *
 * §7.5.6.10 — No production validator may exist outside a registered
 * validation family.
 */

import { L7ContradictionFamilyClass } from './contradiction-family';
import {
  L7ValidationSubjectClass,
  L7SubjectScopeType,
  L7SupportPattern,
} from './validation-subject-class';
import { L7PrimaryValidationClass } from './validation-class.policy';
import { L7ValidationRolloutPhase } from './validation-family-rollout';

export enum L7ValidationFamilyId {
  MARKET_STRENGTH_VALIDATION = 'MARKET_STRENGTH_VALIDATION',
  DERIVATIVES_CONTRADICTION_VALIDATION = 'DERIVATIVES_CONTRADICTION_VALIDATION',
  PROTOCOL_SUBSTANCE_VALIDATION = 'PROTOCOL_SUBSTANCE_VALIDATION',
  NARRATIVE_VALIDATION = 'NARRATIVE_VALIDATION',
  ACCUMULATION_VALIDATION = 'ACCUMULATION_VALIDATION',
  RISK_OVERHANG_VALIDATION = 'RISK_OVERHANG_VALIDATION',
  CROSS_DOMAIN_ALIGNMENT_VALIDATION = 'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
}

export const ALL_L7_VALIDATION_FAMILY_IDS: readonly L7ValidationFamilyId[] =
  Object.values(L7ValidationFamilyId);

export interface L7ValidationFamilyConfidencePosture {
  /** Default starting confidence band before evidence is processed. */
  readonly defaultBand: 'LOW' | 'MODERATE' | 'HIGH';
  /** Per-family ceiling on raw confidence score before caps. */
  readonly rawScoreCeiling: number;
  /** Upper bound on confidence when a blocking contradiction exists. */
  readonly blockingCeiling: number;
}

export interface L7ValidationFamilyRestrictionPosture {
  /** Default restriction baseline when no modifiers are present. */
  readonly defaultBaseline: 'UNRESTRICTED' | 'SCORE_ONLY' | 'EVIDENCE_ONLY';
  /** Whether this family REQUIRES explicit contradiction disclosure. */
  readonly requiresContradictionDisclosure: boolean;
  /** Whether evidence-only mode is mandatory for CONFLICTING outcomes. */
  readonly evidenceOnlyOnConflict: boolean;
}

export interface L7ValidationFamilyDefinition {
  readonly family_id: L7ValidationFamilyId;
  readonly description: string;
  readonly legal_subject_classes: readonly L7ValidationSubjectClass[];
  readonly legal_scopes: readonly L7SubjectScopeType[];
  readonly required_support_domains: readonly L7SupportPattern[];
  readonly required_challenge_domains: readonly L7SupportPattern[];
  /** Contradiction families the family may LEGALLY emit. */
  readonly allowed_contradiction_families: readonly L7ContradictionFamilyClass[];
  /** Registered contradiction templates the family owns or references. */
  readonly allowed_template_ids: readonly string[];
  /** Primary classes the family may legally produce. */
  readonly legal_primary_classes: readonly L7PrimaryValidationClass[];
  readonly confidence_posture: L7ValidationFamilyConfidencePosture;
  readonly restriction_posture: L7ValidationFamilyRestrictionPosture;
  readonly rollout_phase: L7ValidationRolloutPhase;
  readonly rollout_priority: number;
  readonly production_enabled: boolean;
  readonly certification_band_green: boolean;
  readonly runtime_integration_green: boolean;
  readonly restriction_posture_validated: boolean;
  /** IDs of validation families this family depends on (must be enabled first). */
  readonly depends_on: readonly L7ValidationFamilyId[];
}

export function isL7ValidationFamilyId(id: string): id is L7ValidationFamilyId {
  return (ALL_L7_VALIDATION_FAMILY_IDS as readonly string[]).includes(id);
}
