/**
 * L13.9 — Safety Action Contract
 *
 * §13.9.5 — Canonical safety actions, the deterministic mapping
 * from risk class to action, and the action-precedence ranking
 * used by the final safety gate (§13.9.21.1).
 */

import { L13SafetyRiskClass } from './safety-risk-class';

export enum L13SafetyAction {
  ALLOW = 'ALLOW',
  ALLOW_WITH_DISCLOSURE = 'ALLOW_WITH_DISCLOSURE',
  REWRITE_REQUIRED = 'REWRITE_REQUIRED',
  REFUSAL_REQUIRED = 'REFUSAL_REQUIRED',
  BLOCK_OUTPUT = 'BLOCK_OUTPUT',
}

export const ALL_L13_SAFETY_ACTIONS: readonly L13SafetyAction[] =
  Object.values(L13SafetyAction);

/**
 * §13.9.21.1 — Action precedence rank. Higher rank = more
 * restrictive. The final safety gate picks the highest-rank
 * action across all classifier signals.
 */
export const L13_SAFETY_ACTION_RANK:
  Readonly<Record<L13SafetyAction, number>> = {
  [L13SafetyAction.ALLOW]: 0,
  [L13SafetyAction.ALLOW_WITH_DISCLOSURE]: 1,
  [L13SafetyAction.REWRITE_REQUIRED]: 2,
  [L13SafetyAction.REFUSAL_REQUIRED]: 3,
  [L13SafetyAction.BLOCK_OUTPUT]: 4,
};

export function l13RankSafetyAction(
  action: L13SafetyAction,
): number {
  return L13_SAFETY_ACTION_RANK[action];
}

export function l13StrengthenSafetyAction(
  a: L13SafetyAction,
  b: L13SafetyAction,
): L13SafetyAction {
  return l13RankSafetyAction(a) >= l13RankSafetyAction(b) ? a : b;
}

/**
 * §13.9.5.1 — Risk-class → canonical action mapping. The
 * classifier resolves each individual risk class to its action;
 * the final gate strengthens across the full set.
 */
export const L13_RISK_CLASS_TO_ACTION:
  Readonly<Record<L13SafetyRiskClass, L13SafetyAction>> = {
  [L13SafetyRiskClass.SAFE_INFORMATIONAL]: L13SafetyAction.ALLOW,
  [L13SafetyRiskClass.ADVICE_ADJACENT_REWRITE_REQUIRED]:
    L13SafetyAction.REWRITE_REQUIRED,
  [L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED]:
    L13SafetyAction.REFUSAL_REQUIRED,
  [L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED]:
    L13SafetyAction.REFUSAL_REQUIRED,
  [L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED]:
    L13SafetyAction.REFUSAL_REQUIRED,
  [L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED]:
    L13SafetyAction.REWRITE_REQUIRED,
  [L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED]:
    L13SafetyAction.BLOCK_OUTPUT,
  [L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED]:
    L13SafetyAction.REFUSAL_REQUIRED,
  [L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED]:
    L13SafetyAction.REWRITE_REQUIRED,
  [L13SafetyRiskClass.OUT_OF_SCOPE_BLOCKED]:
    L13SafetyAction.REFUSAL_REQUIRED,
};

export function l13ActionForRiskClass(
  cls: L13SafetyRiskClass,
): L13SafetyAction {
  return L13_RISK_CLASS_TO_ACTION[cls];
}

/**
 * §13.9.24 — Safety decision status used on classifier + gate +
 * audit records.
 */
export enum L13SafetyDecisionStatus {
  SAFETY_CLEAN = 'SAFETY_CLEAN',
  SAFETY_CLEAN_WITH_DISCLOSURE = 'SAFETY_CLEAN_WITH_DISCLOSURE',
  SAFETY_REWRITEABLE = 'SAFETY_REWRITEABLE',
  SAFETY_REFUSAL_REQUIRED = 'SAFETY_REFUSAL_REQUIRED',
  SAFETY_BLOCKED = 'SAFETY_BLOCKED',
}

export const ALL_L13_SAFETY_DECISION_STATUSES:
  readonly L13SafetyDecisionStatus[] =
  Object.values(L13SafetyDecisionStatus);

/**
 * §13.9.19 — Safety emission decisions emitted by the final
 * safety gate.
 */
export enum L13SafetyEmissionDecision {
  SAFETY_ALLOW = 'SAFETY_ALLOW',
  SAFETY_ALLOW_WITH_DISCLOSURE = 'SAFETY_ALLOW_WITH_DISCLOSURE',
  SAFETY_REWRITE_REQUIRED = 'SAFETY_REWRITE_REQUIRED',
  SAFETY_REFUSAL_REQUIRED = 'SAFETY_REFUSAL_REQUIRED',
  SAFETY_BLOCK_OUTPUT = 'SAFETY_BLOCK_OUTPUT',
}

export const ALL_L13_SAFETY_EMISSION_DECISIONS:
  readonly L13SafetyEmissionDecision[] =
  Object.values(L13SafetyEmissionDecision);

export function l13ActionToEmissionDecision(
  action: L13SafetyAction,
): L13SafetyEmissionDecision {
  switch (action) {
    case L13SafetyAction.ALLOW:
      return L13SafetyEmissionDecision.SAFETY_ALLOW;
    case L13SafetyAction.ALLOW_WITH_DISCLOSURE:
      return L13SafetyEmissionDecision.SAFETY_ALLOW_WITH_DISCLOSURE;
    case L13SafetyAction.REWRITE_REQUIRED:
      return L13SafetyEmissionDecision.SAFETY_REWRITE_REQUIRED;
    case L13SafetyAction.REFUSAL_REQUIRED:
      return L13SafetyEmissionDecision.SAFETY_REFUSAL_REQUIRED;
    case L13SafetyAction.BLOCK_OUTPUT:
    default:
      return L13SafetyEmissionDecision.SAFETY_BLOCK_OUTPUT;
  }
}

export function l13IsUserEmittingSafetyDecision(
  d: L13SafetyEmissionDecision,
): boolean {
  return (
    d === L13SafetyEmissionDecision.SAFETY_ALLOW ||
    d === L13SafetyEmissionDecision.SAFETY_ALLOW_WITH_DISCLOSURE
  );
}
