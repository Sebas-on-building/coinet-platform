/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     HYPOTHESIS ENGINE — TYPE SYSTEM                                           ║
 * ║                                                                               ║
 * ║   Canonical types for hypothesis generation, ranking, invalidation,          ║
 * ║   evidence mapping, explanation, and persistence.                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

export const HYPOTHESIS_IDS = [
  'GENUINE_EARLY_ACCUMULATION',
  'LEVERAGE_DRIVEN_SQUEEZE',
  'NARRATIVE_ONLY_REFLEXIVE_PUMP',
  'FUNDAMENTALLY_IMPROVING_RERATING',
  'LOW_QUALITY_MANIPULATED_LAUNCH',
  'POST_UNLOCK_REDISTRIBUTION',
  'TREASURY_LED_DISTRIBUTION',
  'SECTOR_SPILLOVER_REPRICING',
  'CAPITULATION_RESET',
  'FORCED_LIQUIDATION_CASCADE',
  'DISTRIBUTION_UNDER_HYPE',
  'SPOT_LED_HEALTHY_CONTINUATION',
] as const;

export type HypothesisId = (typeof HYPOTHESIS_IDS)[number];

export type EvidencePolarity = 'support' | 'contradict' | 'missing' | 'stale';
export type RuleStrength = 'weak' | 'medium' | 'strong' | 'decisive';

export interface HypothesisRuleRef {
  ruleId: string;
  strength: RuleStrength;
  reason: string;
}

export interface HypothesisEvidenceLink {
  evidenceKey: string;
  polarity: EvidencePolarity;
  weight: number;
  observedValue?: number | string | boolean | null;
  normalizedValue?: number | null;
  reason: string;
  sourceDomains: string[];
  freshnessPenaltyApplied?: number;
  stale?: boolean;
}

export interface HypothesisSupportProfile {
  supportScore: number;
  contradictionScore: number;
  missingPenalty: number;
  stalePenalty: number;
  regimeModifier: number;
  sequenceModifier: number;
  coverageModifier: number;
  invalidationPenalty: number;
  finalScore: number;
}

export interface HypothesisConfirmationRule {
  id: string;
  description: string;
  requiredEvidenceKeys: string[];
  strength: RuleStrength;
}

export interface HypothesisInvalidationRule {
  id: string;
  description: string;
  triggerType: 'hard' | 'soft';
  requiredEvidenceKeys: string[];
  thresholdLogic: string;
  severity: number;
}

export interface HypothesisDefinition {
  id: HypothesisId;
  name: string;
  description: string;
  idealContext: string[];
  typicalSupports: string[];
  typicalContradictions: string[];
  regimeAffinity: string[];
  sequenceAffinity: string[];
  requiredForHighConfidence: string[];
  invalidationRules: HypothesisInvalidationRule[];
  confirmationRules: HypothesisConfirmationRule[];
  excludedWith?: HypothesisId[];
  version: string;
}

export interface RankedHypothesis {
  id: HypothesisId;
  rank: number;
  score: number;
  confidence: number;
  spreadFromLeader?: number;
  profile: HypothesisSupportProfile;
  supportLinks: HypothesisEvidenceLink[];
  contradictionLinks: HypothesisEvidenceLink[];
  missingLinks: HypothesisEvidenceLink[];
  triggeredConfirmationRules: HypothesisRuleRef[];
  triggeredInvalidationRules: HypothesisRuleRef[];
  whyItFits: string[];
  whatWouldConfirmNext: string[];
  whatWouldBreakIt: string[];
}

export type AmbiguityLevel = 'low' | 'medium' | 'high';

export interface HypothesisOutput {
  primary: RankedHypothesis;
  secondary: RankedHypothesis | null;
  alternatives: RankedHypothesis[];
  ambiguityLevel: AmbiguityLevel;
  rankingExplanation: string[];
  decisiveMissingEvidence: string[];
  outputVersion: string;
}

export interface CoverageState {
  availableDomains: string[];
  missingDomains: string[];
  staleDomains: string[];
  overallCompleteness: number;
  overallFreshness: number;
}
