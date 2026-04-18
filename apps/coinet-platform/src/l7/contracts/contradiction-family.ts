/**
 * L7.5 — Contradiction Family (Ontology)
 *
 * §7.5.4 — Official contradiction family taxonomy. This enumeration is
 * the only legal vocabulary for typed contradictions in Layer 7 production.
 *
 * It is disjoint from L7.2's coarse `L7ContradictionFamily` enum which
 * defined generic contradiction categories consumed internally by the
 * L7.4 runtime. 7.5 narrows contradiction to the real market-story
 * failure patterns L7 must recognize. A canonical parent-category
 * mapping is provided so L7.4 materialization still emits a valid
 * L7.2 contradiction-bundle family.
 */

import {
  L7ContradictionFamily as L7RuntimeContradictionFamily,
  L7ContradictionSeverity,
} from './contradiction-bundle';
import { L7ValidationSubjectClass } from './validation-subject-class';
import type { L7SupportPattern } from './validation-subject-class';

export enum L7ContradictionFamilyClass {
  PRICE_FLOW_CONTRADICTION = 'PRICE_FLOW_CONTRADICTION',
  PRICE_DERIVATIVES_CONTRADICTION = 'PRICE_DERIVATIVES_CONTRADICTION',
  SUBSTANCE_VALUATION_CONTRADICTION = 'SUBSTANCE_VALUATION_CONTRADICTION',
  NARRATIVE_FLOW_CONTRADICTION = 'NARRATIVE_FLOW_CONTRADICTION',
  NARRATIVE_STRUCTURE_CONTRADICTION = 'NARRATIVE_STRUCTURE_CONTRADICTION',
  WHALE_LIQUIDITY_CONTRADICTION = 'WHALE_LIQUIDITY_CONTRADICTION',
  SMART_MONEY_QUALITY_CONTRADICTION = 'SMART_MONEY_QUALITY_CONTRADICTION',
  UNLOCK_OVERHANG_CONTRADICTION = 'UNLOCK_OVERHANG_CONTRADICTION',
  SECURITY_OVERHANG_CONTRADICTION = 'SECURITY_OVERHANG_CONTRADICTION',
  REVENUE_TVL_CONTRADICTION = 'REVENUE_TVL_CONTRADICTION',
  FLOW_CAPTURE_CONTRADICTION = 'FLOW_CAPTURE_CONTRADICTION',
  TEMPORAL_MATURITY_CONTRADICTION = 'TEMPORAL_MATURITY_CONTRADICTION',
}

export const ALL_L7_CONTRADICTION_FAMILIES: readonly L7ContradictionFamilyClass[] =
  Object.values(L7ContradictionFamilyClass);

/**
 * §7.5.4.4 — Descriptor declaring what a contradiction family requires
 * to be legally applied and how it interacts with confidence/restriction.
 */
export interface L7ContradictionFamilyDescriptor {
  readonly family: L7ContradictionFamilyClass;
  readonly description: string;
  /** Support surface families the contradiction REQUIRES to evaluate. */
  readonly supportDomains: readonly L7SupportPattern[];
  /** Challenge surface families the contradiction REQUIRES to evaluate. */
  readonly challengeDomains: readonly L7SupportPattern[];
  readonly legalSubjectClasses: readonly L7ValidationSubjectClass[];
  readonly defaultSeverity: L7ContradictionSeverity;
  /** §7.5.4 — whether this family may, by default, block classification. */
  readonly blockingAllowedByDefault: boolean;
  /** §7.5.4 — whether this family may, by default, cap confidence. */
  readonly capsConfidenceByDefault: boolean;
  /** Parent category used when materializing into an L7.2 bundle. */
  readonly runtimeParentFamily: L7RuntimeContradictionFamily;
  readonly temporalRelevanceRequired: boolean;
}

export const L7_CONTRADICTION_FAMILY_DESCRIPTORS: readonly L7ContradictionFamilyDescriptor[] = [
  {
    family: L7ContradictionFamilyClass.PRICE_FLOW_CONTRADICTION,
    description:
      'Price action appears strong, but actual flow participation is weak or distributional',
    supportDomains: ['PRICE_FAMILY'],
    challengeDomains: ['FLOW_FAMILY', 'PARTICIPATION_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.STATE_CLAIM,
      L7ValidationSubjectClass.CHANGE_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
      L7ValidationSubjectClass.FLOW_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: false,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.PRICE_FLOW_DIVERGENCE,
    temporalRelevanceRequired: true,
  },
  {
    family: L7ContradictionFamilyClass.PRICE_DERIVATIVES_CONTRADICTION,
    description: 'Price action and derivatives posture disagree materially',
    supportDomains: ['PRICE_FAMILY'],
    challengeDomains: ['FUNDING_FAMILY', 'PARTICIPATION_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.STATE_CLAIM,
      L7ValidationSubjectClass.CHANGE_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: false,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.PRICE_FLOW_DIVERGENCE,
    temporalRelevanceRequired: true,
  },
  {
    family: L7ContradictionFamilyClass.SUBSTANCE_VALUATION_CONTRADICTION,
    description:
      'Valuation or price strength exceeds what substance-level features support',
    supportDomains: ['PRICE_FAMILY', 'TVL_FAMILY'],
    challengeDomains: ['REVENUE_FAMILY', 'PARTICIPATION_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.SUBSTANCE_CLAIM,
      L7ValidationSubjectClass.STATE_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: true,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.REVENUE_ACTIVITY_DIVERGENCE,
    temporalRelevanceRequired: false,
  },
  {
    family: L7ContradictionFamilyClass.NARRATIVE_FLOW_CONTRADICTION,
    description: 'Narrative is accelerating while real flow behavior weakens it',
    supportDomains: ['SENTIMENT_FAMILY'],
    challengeDomains: ['FLOW_FAMILY', 'PARTICIPATION_FAMILY', 'ONCHAIN_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.NARRATIVE_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: true,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.SENTIMENT_FUNDAMENTAL_DIVERGENCE,
    temporalRelevanceRequired: true,
  },
  {
    family: L7ContradictionFamilyClass.NARRATIVE_STRUCTURE_CONTRADICTION,
    description:
      'Narrative story conflicts with structural or protocol-level context',
    supportDomains: ['SENTIMENT_FAMILY'],
    challengeDomains: ['STRUCTURAL_FAMILY', 'ONCHAIN_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.NARRATIVE_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
      L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: false,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.STRUCTURAL_WEAKNESS,
    temporalRelevanceRequired: false,
  },
  {
    family: L7ContradictionFamilyClass.WHALE_LIQUIDITY_CONTRADICTION,
    description:
      'Whale/smart-money behavior looks positive, but liquidity quality makes the signal weak or dangerous',
    supportDomains: ['ONCHAIN_FAMILY', 'FLOW_FAMILY'],
    challengeDomains: ['LIQUIDITY_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.FLOW_CLAIM,
      L7ValidationSubjectClass.CHANGE_CLAIM,
      L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: false,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.CROSS_SOURCE_DISAGREEMENT,
    temporalRelevanceRequired: true,
  },
  {
    family: L7ContradictionFamilyClass.SMART_MONEY_QUALITY_CONTRADICTION,
    description:
      'Smart-money-like participation exists, but source/attribution/behavioral quality weakens the interpretation',
    supportDomains: ['ONCHAIN_FAMILY', 'FLOW_FAMILY'],
    challengeDomains: ['ONCHAIN_FAMILY', 'PARTICIPATION_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.FLOW_CLAIM,
      L7ValidationSubjectClass.CHANGE_CLAIM,
      L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: false,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.CROSS_SOURCE_DISAGREEMENT,
    temporalRelevanceRequired: false,
  },
  {
    family: L7ContradictionFamilyClass.UNLOCK_OVERHANG_CONTRADICTION,
    description:
      'Positive support exists, but a materially relevant unlock overhang weakens the claim',
    supportDomains: ['PRICE_FAMILY', 'SENTIMENT_FAMILY'],
    challengeDomains: ['EVENT_FAMILY', 'ONCHAIN_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.RISK_OVERHANG_CLAIM,
      L7ValidationSubjectClass.STATE_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
      L7ValidationSubjectClass.NARRATIVE_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.SEVERE,
    blockingAllowedByDefault: true,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.MATERIAL_RISK_OVERHANG,
    temporalRelevanceRequired: true,
  },
  {
    family: L7ContradictionFamilyClass.SECURITY_OVERHANG_CONTRADICTION,
    description: 'Positive support exists, but security posture materially weakens it',
    supportDomains: ['PRICE_FAMILY', 'SENTIMENT_FAMILY'],
    challengeDomains: ['EVENT_FAMILY', 'STRUCTURAL_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.RISK_OVERHANG_CLAIM,
      L7ValidationSubjectClass.STATE_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.SEVERE,
    blockingAllowedByDefault: true,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.MATERIAL_RISK_OVERHANG,
    temporalRelevanceRequired: true,
  },
  {
    family: L7ContradictionFamilyClass.REVENUE_TVL_CONTRADICTION,
    description:
      'TVL or growth appears strong, but fees/revenue/business quality do not support it',
    supportDomains: ['TVL_FAMILY'],
    challengeDomains: ['REVENUE_FAMILY', 'FLOW_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.SUBSTANCE_CLAIM,
      L7ValidationSubjectClass.FLOW_CLAIM,
      L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: true,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.REVENUE_ACTIVITY_DIVERGENCE,
    temporalRelevanceRequired: false,
  },
  {
    family: L7ContradictionFamilyClass.FLOW_CAPTURE_CONTRADICTION,
    description:
      'Protocol activity or value creation exists, but token-holder capture is weak or inconsistent',
    supportDomains: ['REVENUE_FAMILY', 'ONCHAIN_FAMILY'],
    challengeDomains: ['FLOW_FAMILY', 'STRUCTURAL_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.SUBSTANCE_CLAIM,
      L7ValidationSubjectClass.FLOW_CLAIM,
      L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: false,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.REVENUE_ACTIVITY_DIVERGENCE,
    temporalRelevanceRequired: false,
  },
  {
    family: L7ContradictionFamilyClass.TEMPORAL_MATURITY_CONTRADICTION,
    description:
      'The story may be directionally true, but temporally overmature, too late, or unsupported by timing posture',
    supportDomains: ['PRICE_FAMILY', 'SENTIMENT_FAMILY'],
    challengeDomains: ['FLOW_FAMILY', 'PARTICIPATION_FAMILY'],
    legalSubjectClasses: [
      L7ValidationSubjectClass.STATE_CLAIM,
      L7ValidationSubjectClass.CHANGE_CLAIM,
      L7ValidationSubjectClass.NARRATIVE_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
      L7ValidationSubjectClass.RISK_OVERHANG_CLAIM,
    ],
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowedByDefault: false,
    capsConfidenceByDefault: true,
    runtimeParentFamily: L7RuntimeContradictionFamily.SIGNAL_STALENESS,
    temporalRelevanceRequired: true,
  },
];

export function getL7ContradictionFamilyDescriptor(
  family: L7ContradictionFamilyClass,
): L7ContradictionFamilyDescriptor | undefined {
  return L7_CONTRADICTION_FAMILY_DESCRIPTORS.find(d => d.family === family);
}

export function isL7ContradictionFamilyClass(
  code: string,
): code is L7ContradictionFamilyClass {
  return (ALL_L7_CONTRADICTION_FAMILIES as readonly string[]).includes(code);
}

/**
 * §7.5.4.5 — Severity baseline resolver. Reads the descriptor's default
 * severity. Registry overlays (if any) are applied upstream in the
 * ontology registry.
 */
export function getBaselineSeverity(
  family: L7ContradictionFamilyClass,
): L7ContradictionSeverity | undefined {
  return getL7ContradictionFamilyDescriptor(family)?.defaultSeverity;
}
