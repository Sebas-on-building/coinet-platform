/**
 * L11.1 — Boundary Contract (Negative Definition)
 *
 * §11.1.5 — What Layer 11 is NOT. §11.1.5.4 / §11.1.8 / §11.1.10.3 —
 * Forbidden naming patterns that indicate judgment, scenario,
 * recommendation, trade-action, vibe-scoring, conviction, missing-data
 * laundering, contradiction laundering, or lower-layer rebuild drift.
 */

export const L11_IS_NOT = [
  'the primitive feature layer',
  'the validation layer',
  'the contradiction engine',
  'the regime engine',
  'the sequence engine',
  'the hypothesis engine',
  'the scenario engine',
  'the final judgment layer',
  'the recommendation layer',
  'the portfolio allocation layer',
  'the trade execution layer',
] as const;

export const L11_DOES_NOT_ANSWER = [
  'what trade should be taken',
  'which scenario wins',
  'what final judgment should be emitted',
  'whether the user should buy, sell, hold, or avoid',
  'whether the asset is finally good or bad',
  'whether an opportunity should be acted on',
  'whether the score implies certainty',
  'whether a high score is a guaranteed setup',
  'whether a low risk score means safety',
] as const;

/**
 * §11.1.5.4 / §11.1.10.3 — Forbidden semantic patterns. These names
 * must never appear as score subjects, score outputs, or capability
 * claims.
 */
const FORBIDDEN_NAME_PATTERNS: readonly RegExp[] = [
  /buy[_\s]?signal/i,
  /sell[_\s]?signal/i,
  /avoid[_\s]?signal/i,
  /trade[_\s]?signal/i,
  /action[_\s]?signal/i,
  /recommendation/i,
  /final[_\s]?scenario/i,
  /scenario[_\s]?winner/i,
  /final[_\s]?judgment/i,
  /judgment[_\s]?override/i,
  /final[_\s]?recommendation/i,
  /trade[_\s]?recommendation/i,
  /portfolio[_\s]?allocation/i,
  /portfolio[_\s]?priority/i,
  /best[_\s]?trade/i,
  /best[_\s]?opportunity/i,
  /winning[_\s]?score/i,
  /winning[_\s]?scenario/i,
  /winning[_\s]?thesis/i,
  /winning[_\s]?hypothesis/i,
  /clear[_\s]?buy/i,
  /clear[_\s]?sell/i,
  /trade[_\s]?ready/i,
  /entry[_\s]?ready/i,
  /buy[_\s]?ready/i,
  /risk[_\s]?on[_\s]?buy/i,
  /risk[_\s]?off[_\s]?avoid/i,
  /actionable[_\s]?score/i,
  /actionable[_\s]?setup/i,
  /actionable[_\s]?explanation/i,
  /alpha[_\s]?score/i,
  /alpha[_\s]?signal/i,
  /ideal[_\s]?score/i,
  /ideal[_\s]?setup/i,
  /ideal[_\s]?timing/i,
  /guaranteed[_\s]?setup/i,
  /safest[_\s]?trade/i,
  /highest[_\s]?conviction/i,
  /conviction[_\s]?signal/i,
  /conviction[_\s]?score/i,
  /vibe[_\s]?score/i,
  /unattributed[_\s]?score/i,
  /unversioned[_\s]?score/i,
  /missing[_\s]?meaning[_\s]?claim/i,
  /no[_\s]?meaning[_\s]?claim/i,
  /direction[_\s]?undeclared/i,
  /direction[_\s]?mixed/i,
  /launder[_\s]?missing/i,
  /launder[_\s]?contradiction/i,
  /hide[_\s]?missing[_\s]?data/i,
  /hide[_\s]?contradiction/i,
  /rebuild[_\s]?hypothesis/i,
  /rebuild[_\s]?hypotheses/i,
  /override[_\s]?regime/i,
  /reinterpret[_\s]?regime/i,
  /override[_\s]?sequence/i,
  /reinterpret[_\s]?sequence/i,
  /override[_\s]?validation/i,
  /re[_-]?validate/i,
  /score[_\s]?as[_\s]?action/i,
  /score[_\s]?override/i,
  /causal[_\s]?proof/i,
  /causal[_\s]?certainty/i,
  /score[_\s]?says[_\s]?buy/i,
  /score[_\s]?says[_\s]?sell/i,
];

/**
 * Examples of legal score-domain names. Used by tests and docs.
 */
const VALID_NAME_EXAMPLES: readonly string[] = [
  'opportunity_score_v1',
  'risk_score_v1',
  'timing_score_v1',
  'thesis_coherence_score_v1',
  'signal_confidence_score_v1',
  'market_structure_score_v1',
  'whale_behavior_score_v1',
  'unlock_supply_overhang_score_v1',
  'score_component_breakdown_opportunity',
  'score_attribution_opportunity_v1',
  'score_modifier_profile_regime_aware',
  'score_missing_data_profile_opportunity',
  'score_calibration_hook_opportunity_v1',
  'score_drift_hook_opportunity_v1',
  'score_evidence_read_surface_opportunity',
];

export function containsL11ForbiddenNaming(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(p => p.test(name));
}

export function isValidL11ComponentName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (containsL11ForbiddenNaming(name)) return false;
  return /^[a-z][a-z0-9_]*$/.test(name);
}

export interface L11ForbiddenSemanticCheck {
  readonly name: string;
  readonly forbidden: boolean;
  readonly matchedPattern: string | null;
}

export function checkL11ForbiddenSemantics(name: string): L11ForbiddenSemanticCheck {
  for (const p of FORBIDDEN_NAME_PATTERNS) {
    if (p.test(name)) {
      return { name, forbidden: true, matchedPattern: p.source };
    }
  }
  return { name, forbidden: false, matchedPattern: null };
}

export function getL11ForbiddenNamePatterns(): readonly RegExp[] {
  return FORBIDDEN_NAME_PATTERNS;
}

export function getL11ValidNameExamples(): readonly string[] {
  return VALID_NAME_EXAMPLES;
}
