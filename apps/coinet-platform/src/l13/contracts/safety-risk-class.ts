/**
 * L13.9 — Safety Risk Class Contract
 *
 * §13.9.4 — Production-grade safety-risk taxonomy. Each risk class
 * maps to a single canonical `L13SafetyAction` (§13.9.5).
 */

export enum L13SafetyRiskClass {
  SAFE_INFORMATIONAL = 'SAFE_INFORMATIONAL',
  ADVICE_ADJACENT_REWRITE_REQUIRED = 'ADVICE_ADJACENT_REWRITE_REQUIRED',
  FINANCIAL_ADVICE_BLOCKED = 'FINANCIAL_ADVICE_BLOCKED',
  TRADE_EXECUTION_INSTRUCTION_BLOCKED = 'TRADE_EXECUTION_INSTRUCTION_BLOCKED',
  LEVERAGE_OR_POSITION_SIZING_BLOCKED = 'LEVERAGE_OR_POSITION_SIZING_BLOCKED',
  GUARANTEED_OUTCOME_BLOCKED = 'GUARANTEED_OUTCOME_BLOCKED',
  MARKET_MANIPULATION_BLOCKED = 'MARKET_MANIPULATION_BLOCKED',
  TAX_OR_LEGAL_ADVICE_BLOCKED = 'TAX_OR_LEGAL_ADVICE_BLOCKED',
  UNSUPPORTED_CERTAINTY_BLOCKED = 'UNSUPPORTED_CERTAINTY_BLOCKED',
  OUT_OF_SCOPE_BLOCKED = 'OUT_OF_SCOPE_BLOCKED',
}

export const ALL_L13_SAFETY_RISK_CLASSES:
  readonly L13SafetyRiskClass[] =
  Object.values(L13SafetyRiskClass);

/**
 * §13.9.4 — Risk-class severity ordering used by the classifier to
 * pick a single `highest_risk_class` when multiple hits fire on
 * one output. Higher rank = more severe.
 */
export const L13_SAFETY_RISK_RANK:
  Readonly<Record<L13SafetyRiskClass, number>> = {
  [L13SafetyRiskClass.SAFE_INFORMATIONAL]: 0,
  [L13SafetyRiskClass.ADVICE_ADJACENT_REWRITE_REQUIRED]: 1,
  [L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED]: 2,
  [L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED]: 3,
  [L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED]: 4,
  [L13SafetyRiskClass.OUT_OF_SCOPE_BLOCKED]: 5,
  [L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED]: 6,
  [L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED]: 7,
  [L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED]: 8,
  [L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED]: 9,
};

export function l13RankSafetyRisk(
  cls: L13SafetyRiskClass,
): number {
  return L13_SAFETY_RISK_RANK[cls];
}

export function l13MaxSafetyRisk(
  a: L13SafetyRiskClass,
  b: L13SafetyRiskClass,
): L13SafetyRiskClass {
  return l13RankSafetyRisk(a) >= l13RankSafetyRisk(b) ? a : b;
}

export function l13ReduceMaxSafetyRisk(
  classes: readonly L13SafetyRiskClass[],
): L13SafetyRiskClass {
  let top: L13SafetyRiskClass = L13SafetyRiskClass.SAFE_INFORMATIONAL;
  for (const c of classes) top = l13MaxSafetyRisk(top, c);
  return top;
}
