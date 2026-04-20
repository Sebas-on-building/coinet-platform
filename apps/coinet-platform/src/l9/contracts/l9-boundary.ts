/**
 * L9.1 — Boundary Contract (Negative Definition)
 *
 * §9.1.3 — What Layer 9 is NOT. §9.1.3.4 / §9.1.6.4 — Forbidden naming
 * patterns that indicate validation, regime, scoring, scenario,
 * judgment, hypothesis, or recommendation drift — including patterns
 * that leak "ideal timing" / "alpha phase" / "trade-ready sequence"
 * semantics.
 */

export const L9_IS_NOT = [
  'the validation layer',
  'the contradiction engine',
  'the regime engine',
  'the hypothesis engine',
  'the deterministic scoring layer',
  'the scenario engine',
  'the final judgment layer',
  'the recommendation layer',
] as const;

export const L9_DOES_NOT_ANSWER = [
  'which trade should be taken',
  'which scenario is final',
  'what the final rank is',
  'what the final judgment should be',
  'whether an asset is attractive in final terms',
  'whether a thesis is the winning thesis',
  'which sequence is the best sequence',
  'whether loose temporal adjacency proves causality',
] as const;

/**
 * §9.1.3.4 / §9.1.6.4 — Forbidden semantic patterns. These names must
 * never appear as sequence subjects, sequence outputs, or capability
 * claims.
 *
 * Patterns forbid: final trade advice, thesis confirmation, scenario
 * winners, judgment/score overrides, buy/sell/avoid semantics,
 * action-biased sequence names, causal-certainty claims,
 * "alpha phase" / "ideal timing" / "trade-ready" sequence leakage, and
 * hypothesis-engine behaviour.
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
  /final[_\s]?score/i,
  /score[_\s]?override/i,
  /final[_\s]?rank/i,
  /final[_\s]?narrative/i,
  /portfolio[_\s]?priority/i,
  /opportunity[_\s]?rank/i,
  /best[_\s]?trade/i,
  /best[_\s]?sequence/i,
  /winning[_\s]?sequence/i,
  /winning[_\s]?thesis/i,
  /highest[_\s]?conviction/i,
  /conviction[_\s]?trade/i,
  /conviction[_\s]?sequence/i,
  /ideal[_\s]?timing/i,
  /alpha[_\s]?phase/i,
  /actionable[_\s]?setup/i,
  /actionable[_\s]?sequence/i,
  /trade[_\s]?ready/i,
  /entry[_\s]?ready/i,
  /buy[_\s]?ready/i,
  /risk[_\s]?on[_\s]?buy/i,
  /risk[_\s]?off[_\s]?avoid/i,
  /bullish[_\s]?confirmed/i,
  /bearish[_\s]?confirmed/i,
  /thesis[_\s]?confirmation/i,
  /hypothesis[_\s]?sequence/i,
  /hypothesis[_\s]?chain/i,
  /scenario[_\s]?chain/i,
  /causal[_\s]?certainty/i,
  /proven[_\s]?causality/i,
  /validation[_\s]?override/i,
  /regime[_\s]?override/i,
  /reinterpret[_\s]?regime/i,
  /re[_-]?validate/i,
];

/**
 * Examples of legal sequence-domain names. Used by tests and docs to
 * keep the layer honest.
 */
const VALID_NAME_EXAMPLES: readonly string[] = [
  'ordered_signal_chain_macro',
  'lead_lag_structure_spot_vs_funding',
  'phase_progression_post_accumulation',
  'change_point_evidence_liquidity_shift',
  'decay_state_post_narrative_digestion',
  'post_event_window_post_unlock',
  'sequence_confidence_structural',
  'sequence_restriction_profile_evidence_only',
  'sequence_ambiguity_unresolved_ordering',
];

export function containsL9ForbiddenNaming(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(p => p.test(name));
}

export function isValidL9ComponentName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (containsL9ForbiddenNaming(name)) return false;
  return /^[a-z][a-z0-9_]*$/.test(name);
}

export interface L9ForbiddenSemanticCheck {
  readonly name: string;
  readonly forbidden: boolean;
  readonly matchedPattern: string | null;
}

export function checkL9ForbiddenSemantics(name: string): L9ForbiddenSemanticCheck {
  for (const p of FORBIDDEN_NAME_PATTERNS) {
    if (p.test(name)) {
      return { name, forbidden: true, matchedPattern: p.source };
    }
  }
  return { name, forbidden: false, matchedPattern: null };
}

export function getL9ForbiddenNamePatterns(): readonly RegExp[] {
  return FORBIDDEN_NAME_PATTERNS;
}

export function getL9ValidNameExamples(): readonly string[] {
  return VALID_NAME_EXAMPLES;
}
