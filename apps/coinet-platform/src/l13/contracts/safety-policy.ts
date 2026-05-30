/**
 * L13.9 — Safety Policy Contract
 *
 * §13.9.6 — Declarative policy bound onto every safety scan +
 * classification + final gate result. The policy is immutable
 * with respect to user-visible output: every `block_*` flag is
 * pinned to `true`.
 */

import {
  L13ForbiddenFinancialLanguageFamily,
  L13AdviceAdjacentLanguageFamily,
  L13SafetyAllowedOutputClass,
  L13SafetyBlockedOutputClass,
  L13SafetyLanguageScope,
} from './market-manipulation-pattern';

export interface L13SafetyPolicy {
  readonly safety_policy_id: string;

  readonly allowed_output_classes:
    readonly L13SafetyAllowedOutputClass[];
  readonly blocked_output_classes:
    readonly L13SafetyBlockedOutputClass[];

  readonly allow_informational_analysis: true;
  readonly allow_conditional_scenarios: true;
  readonly allow_evidence_based_explanations: true;
  readonly allow_risk_disclosures: true;
  readonly allow_what_to_watch_triggers: true;
  readonly allow_educational_framing: true;

  readonly block_personalized_financial_advice: true;
  readonly block_buy_sell_hold_avoid_instruction: true;
  readonly block_position_sizing_instruction: true;
  readonly block_leverage_recommendation: true;
  readonly block_liquidation_target_advice: true;
  readonly block_guaranteed_outcomes: true;
  readonly block_tax_legal_advice: true;
  readonly block_market_manipulation_assistance: true;

  readonly blocked_phrase_families:
    readonly L13ForbiddenFinancialLanguageFamily[];
  readonly rewriteable_phrase_families:
    readonly L13AdviceAdjacentLanguageFamily[];
  readonly language_scope: readonly L13SafetyLanguageScope[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
