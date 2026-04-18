/**
 * L7.2 — Validation Subject Classes
 *
 * §7.2.3 — Every Layer 7 validation is bound to exactly one (or, via
 * hybrid declaration, more than one) registered subject class. This file
 * defines the enum and the class descriptors.
 */

export enum L7ValidationSubjectClass {
  STATE_CLAIM = 'STATE_CLAIM',
  CHANGE_CLAIM = 'CHANGE_CLAIM',
  ALIGNMENT_CLAIM = 'ALIGNMENT_CLAIM',
  DIVERGENCE_CLAIM = 'DIVERGENCE_CLAIM',
  RISK_OVERHANG_CLAIM = 'RISK_OVERHANG_CLAIM',
  SUBSTANCE_CLAIM = 'SUBSTANCE_CLAIM',
  FLOW_CLAIM = 'FLOW_CLAIM',
  NARRATIVE_CLAIM = 'NARRATIVE_CLAIM',
  STRUCTURAL_SUPPORT_CLAIM = 'STRUCTURAL_SUPPORT_CLAIM',
}

export const ALL_VALIDATION_SUBJECT_CLASSES: readonly L7ValidationSubjectClass[] =
  Object.values(L7ValidationSubjectClass);

/**
 * Scope types a subject can legally operate on. We mirror the L3/L4/L6
 * scope vocabulary rather than invent our own.
 */
export type L7SubjectScopeType =
  | 'ASSET'
  | 'PROTOCOL'
  | 'CHAIN'
  | 'NARRATIVE_CLUSTER'
  | 'PORTFOLIO'
  | 'MARKET';

/**
 * Required patterns for support and challenge surfaces. A subject class
 * declares the minimum surface families its subjects must reference. The
 * subject-kind validator checks that each pattern has at least one match
 * in the declared support/challenge lists.
 */
export type L7SupportPattern =
  | 'PRICE_FAMILY'
  | 'FLOW_FAMILY'
  | 'PARTICIPATION_FAMILY'
  | 'ONCHAIN_FAMILY'
  | 'FUNDING_FAMILY'
  | 'LIQUIDITY_FAMILY'
  | 'REVENUE_FAMILY'
  | 'TVL_FAMILY'
  | 'SENTIMENT_FAMILY'
  | 'STRUCTURAL_FAMILY'
  | 'EVENT_FAMILY';

export interface ValidationSubjectClassDescriptor {
  readonly class: L7ValidationSubjectClass;
  readonly description: string;
  readonly legalScopeTypes: readonly L7SubjectScopeType[];
  readonly requiredSupportPatterns: readonly L7SupportPattern[];
  readonly requiredChallengePatterns: readonly L7SupportPattern[];
  readonly minSupportSurfaceCount: number;
  readonly minChallengeSurfaceCount: number;
  readonly requiresExplicitEvidence: boolean;
  readonly defaultMaterialityPosture: 'LOW' | 'STANDARD' | 'HIGH' | 'CRITICAL';
  readonly forbiddenShortcuts: readonly string[];
}

export const SUBJECT_CLASS_DESCRIPTORS: readonly ValidationSubjectClassDescriptor[] = [
  {
    class: L7ValidationSubjectClass.STATE_CLAIM,
    description: 'Tests whether a state is materially true at present',
    legalScopeTypes: ['ASSET', 'PROTOCOL', 'CHAIN', 'MARKET', 'NARRATIVE_CLUSTER'],
    requiredSupportPatterns: ['PRICE_FAMILY', 'PARTICIPATION_FAMILY'],
    requiredChallengePatterns: ['PRICE_FAMILY', 'FLOW_FAMILY'],
    minSupportSurfaceCount: 2,
    minChallengeSurfaceCount: 1,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'STANDARD',
    forbiddenShortcuts: ['infer_state_from_narrative_only', 'price_only_state'],
  },
  {
    class: L7ValidationSubjectClass.CHANGE_CLAIM,
    description: 'Tests whether a change is truly occurring or has occurred',
    legalScopeTypes: ['ASSET', 'PROTOCOL', 'CHAIN', 'MARKET', 'NARRATIVE_CLUSTER'],
    requiredSupportPatterns: ['EVENT_FAMILY', 'PRICE_FAMILY'],
    requiredChallengePatterns: ['PARTICIPATION_FAMILY', 'FLOW_FAMILY'],
    minSupportSurfaceCount: 2,
    minChallengeSurfaceCount: 1,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'STANDARD',
    forbiddenShortcuts: ['change_from_single_tick', 'sentiment_only_change'],
  },
  {
    class: L7ValidationSubjectClass.ALIGNMENT_CLAIM,
    description: 'Tests whether multiple primitives point in the same direction',
    legalScopeTypes: ['ASSET', 'PROTOCOL', 'CHAIN', 'MARKET', 'NARRATIVE_CLUSTER', 'PORTFOLIO'],
    requiredSupportPatterns: ['PRICE_FAMILY', 'FLOW_FAMILY', 'PARTICIPATION_FAMILY'],
    requiredChallengePatterns: ['PRICE_FAMILY'],
    minSupportSurfaceCount: 3,
    minChallengeSurfaceCount: 1,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'STANDARD',
    forbiddenShortcuts: ['alignment_from_two_correlated_features'],
  },
  {
    class: L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    description: 'Tests whether meaningful disagreement exists between primitive families',
    legalScopeTypes: ['ASSET', 'PROTOCOL', 'CHAIN', 'MARKET', 'NARRATIVE_CLUSTER'],
    requiredSupportPatterns: ['PRICE_FAMILY', 'SENTIMENT_FAMILY'],
    requiredChallengePatterns: ['FLOW_FAMILY', 'PARTICIPATION_FAMILY'],
    minSupportSurfaceCount: 2,
    minChallengeSurfaceCount: 2,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'HIGH',
    forbiddenShortcuts: ['single_feature_divergence'],
  },
  {
    class: L7ValidationSubjectClass.RISK_OVERHANG_CLAIM,
    description: 'Tests whether a risk materially weakens an otherwise positive setup',
    legalScopeTypes: ['ASSET', 'PROTOCOL', 'CHAIN', 'PORTFOLIO'],
    requiredSupportPatterns: ['EVENT_FAMILY', 'ONCHAIN_FAMILY'],
    requiredChallengePatterns: ['FLOW_FAMILY', 'PRICE_FAMILY'],
    minSupportSurfaceCount: 2,
    minChallengeSurfaceCount: 1,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'HIGH',
    forbiddenShortcuts: ['implicit_risk_from_narrative'],
  },
  {
    class: L7ValidationSubjectClass.SUBSTANCE_CLAIM,
    description: 'Tests whether apparent strength has real underlying substance',
    legalScopeTypes: ['ASSET', 'PROTOCOL', 'CHAIN'],
    requiredSupportPatterns: ['TVL_FAMILY', 'REVENUE_FAMILY', 'PARTICIPATION_FAMILY'],
    requiredChallengePatterns: ['PRICE_FAMILY'],
    minSupportSurfaceCount: 3,
    minChallengeSurfaceCount: 1,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'HIGH',
    forbiddenShortcuts: ['substance_from_price_only'],
  },
  {
    class: L7ValidationSubjectClass.FLOW_CLAIM,
    description: 'Tests whether flow behavior supports or weakens a story',
    legalScopeTypes: ['ASSET', 'PROTOCOL', 'CHAIN', 'PORTFOLIO'],
    requiredSupportPatterns: ['FLOW_FAMILY', 'ONCHAIN_FAMILY'],
    requiredChallengePatterns: ['FLOW_FAMILY', 'PRICE_FAMILY'],
    minSupportSurfaceCount: 2,
    minChallengeSurfaceCount: 1,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'STANDARD',
    forbiddenShortcuts: ['flow_from_aggregate_only'],
  },
  {
    class: L7ValidationSubjectClass.NARRATIVE_CLAIM,
    description: 'Tests whether narrative momentum is broad, fresh, and supported',
    legalScopeTypes: ['NARRATIVE_CLUSTER', 'MARKET'],
    requiredSupportPatterns: ['SENTIMENT_FAMILY', 'PARTICIPATION_FAMILY'],
    requiredChallengePatterns: ['PRICE_FAMILY', 'FLOW_FAMILY'],
    minSupportSurfaceCount: 2,
    minChallengeSurfaceCount: 2,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'STANDARD',
    forbiddenShortcuts: ['loudness_as_narrative'],
  },
  {
    class: L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
    description: 'Tests whether structural context supports a local story',
    legalScopeTypes: ['ASSET', 'PROTOCOL', 'CHAIN', 'NARRATIVE_CLUSTER'],
    requiredSupportPatterns: ['STRUCTURAL_FAMILY', 'ONCHAIN_FAMILY'],
    requiredChallengePatterns: ['STRUCTURAL_FAMILY', 'FLOW_FAMILY'],
    minSupportSurfaceCount: 2,
    minChallengeSurfaceCount: 1,
    requiresExplicitEvidence: true,
    defaultMaterialityPosture: 'HIGH',
    forbiddenShortcuts: ['structural_from_price_only'],
  },
];

export function getSubjectClassDescriptor(
  cls: L7ValidationSubjectClass,
): ValidationSubjectClassDescriptor | undefined {
  return SUBJECT_CLASS_DESCRIPTORS.find(d => d.class === cls);
}

export function isRegisteredSubjectClass(cls: string): boolean {
  return SUBJECT_CLASS_DESCRIPTORS.some(d => d.class === cls);
}

export function subjectClassAllowsScope(
  cls: L7ValidationSubjectClass,
  scope: L7SubjectScopeType,
): boolean {
  const d = getSubjectClassDescriptor(cls);
  if (!d) return false;
  return d.legalScopeTypes.includes(scope);
}
