/**
 * L13.9 — Default Safety Policy
 *
 * §13.9.6 — Production-grade default policy. Every `block_*` flag
 * is hard-pinned to `true`. The policy is canonical and replay-
 * deterministic.
 */

import {
  L13ForbiddenFinancialLanguageFamily,
  L13AdviceAdjacentLanguageFamily,
  L13SafetyAllowedOutputClass,
  L13SafetyBlockedOutputClass,
  L13SafetyLanguageScope,
} from '../contracts/market-manipulation-pattern';
import type { L13SafetyPolicy } from '../contracts/safety-policy';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.safety.v1';

const ALLOWED: readonly L13SafetyAllowedOutputClass[] = [
  L13SafetyAllowedOutputClass.INFORMATIONAL_ANALYSIS,
  L13SafetyAllowedOutputClass.CONDITIONAL_SCENARIO,
  L13SafetyAllowedOutputClass.EVIDENCE_BASED_EXPLANATION,
  L13SafetyAllowedOutputClass.RISK_DISCLOSURE,
  L13SafetyAllowedOutputClass.WHAT_TO_WATCH_TRIGGER,
  L13SafetyAllowedOutputClass.EDUCATIONAL_FRAMING,
  L13SafetyAllowedOutputClass.NEUTRAL_COMPARISON,
  L13SafetyAllowedOutputClass.ALERT_STATE_CHANGE,
  L13SafetyAllowedOutputClass.STRUCTURED_REPORT_SUMMARY,
];

const BLOCKED: readonly L13SafetyBlockedOutputClass[] = [
  L13SafetyBlockedOutputClass.PERSONALIZED_FINANCIAL_ADVICE,
  L13SafetyBlockedOutputClass.TRADE_INSTRUCTION,
  L13SafetyBlockedOutputClass.LEVERAGE_INSTRUCTION,
  L13SafetyBlockedOutputClass.POSITION_SIZING_INSTRUCTION,
  L13SafetyBlockedOutputClass.STOP_LOSS_TAKE_PROFIT_INSTRUCTION,
  L13SafetyBlockedOutputClass.LIQUIDATION_TARGETING,
  L13SafetyBlockedOutputClass.GUARANTEED_OUTCOME,
  L13SafetyBlockedOutputClass.PUMP_DUMP_PROPHECY,
  L13SafetyBlockedOutputClass.TAX_ADVICE,
  L13SafetyBlockedOutputClass.LEGAL_ADVICE,
  L13SafetyBlockedOutputClass.MARKET_MANIPULATION_ASSISTANCE,
];

const BLOCKED_FAMILIES:
  readonly L13ForbiddenFinancialLanguageFamily[] = [
  L13ForbiddenFinancialLanguageFamily.DIRECT_BUY,
  L13ForbiddenFinancialLanguageFamily.DIRECT_SELL,
  L13ForbiddenFinancialLanguageFamily.DIRECT_HOLD,
  L13ForbiddenFinancialLanguageFamily.DIRECT_AVOID,
  L13ForbiddenFinancialLanguageFamily.LONG_SHORT_INSTRUCTION,
  L13ForbiddenFinancialLanguageFamily.ENTRY_EXIT_INSTRUCTION,
  L13ForbiddenFinancialLanguageFamily.LEVERAGE_RECOMMENDATION,
  L13ForbiddenFinancialLanguageFamily.POSITION_SIZING_RECOMMENDATION,
  L13ForbiddenFinancialLanguageFamily.STOP_LOSS_TAKE_PROFIT_INSTRUCTION,
  L13ForbiddenFinancialLanguageFamily.LIQUIDATION_TARGETING,
  L13ForbiddenFinancialLanguageFamily.GUARANTEE_OUTCOME,
  L13ForbiddenFinancialLanguageFamily.PUMP_DUMP_PROPHECY,
  L13ForbiddenFinancialLanguageFamily.CERTAIN_DIRECTIONAL_OUTCOME,
  L13ForbiddenFinancialLanguageFamily.TAX_LEGAL_ADVICE,
  L13ForbiddenFinancialLanguageFamily.MARKET_MANIPULATION_ASSISTANCE,
];

const REWRITEABLE_FAMILIES:
  readonly L13AdviceAdjacentLanguageFamily[] = [
  L13AdviceAdjacentLanguageFamily.IMPLIED_ENTRY_BIAS,
  L13AdviceAdjacentLanguageFamily.IMPLIED_EXIT_BIAS,
  L13AdviceAdjacentLanguageFamily.BEST_SETUP_FRAMING,
  L13AdviceAdjacentLanguageFamily.BEST_ENTRY_FRAMING,
  L13AdviceAdjacentLanguageFamily.ACTIONABLE_SOUNDING_OPPORTUNITY,
  L13AdviceAdjacentLanguageFamily.IMPLIED_ASSET_PREFERENCE,
  L13AdviceAdjacentLanguageFamily.IMPLIED_EXECUTION_TIMING,
];

const LANGUAGE_SCOPE: readonly L13SafetyLanguageScope[] = [
  L13SafetyLanguageScope.ENGLISH,
  L13SafetyLanguageScope.GERMAN,
  L13SafetyLanguageScope.SPANISH,
];

function buildPolicyHash(): string {
  return fnv1a(
    [
      'l13.safety.policy.default',
      ALLOWED.join(','),
      BLOCKED.join(','),
      BLOCKED_FAMILIES.join(','),
      REWRITEABLE_FAMILIES.join(','),
      LANGUAGE_SCOPE.join(','),
      POLICY_V,
    ].join('|'),
  );
}

const POLICY_HASH = buildPolicyHash();

export const L13_DEFAULT_SAFETY_POLICY: L13SafetyPolicy = {
  safety_policy_id: `l13.safety.policy.${POLICY_HASH}`,
  allowed_output_classes: ALLOWED,
  blocked_output_classes: BLOCKED,
  allow_informational_analysis: true,
  allow_conditional_scenarios: true,
  allow_evidence_based_explanations: true,
  allow_risk_disclosures: true,
  allow_what_to_watch_triggers: true,
  allow_educational_framing: true,
  block_personalized_financial_advice: true,
  block_buy_sell_hold_avoid_instruction: true,
  block_position_sizing_instruction: true,
  block_leverage_recommendation: true,
  block_liquidation_target_advice: true,
  block_guaranteed_outcomes: true,
  block_tax_legal_advice: true,
  block_market_manipulation_assistance: true,
  blocked_phrase_families: BLOCKED_FAMILIES,
  rewriteable_phrase_families: REWRITEABLE_FAMILIES,
  language_scope: LANGUAGE_SCOPE,
  policy_version: POLICY_V,
  replay_hash: POLICY_HASH,
};

export function getL13DefaultSafetyPolicy(): L13SafetyPolicy {
  return L13_DEFAULT_SAFETY_POLICY;
}
