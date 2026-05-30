/**
 * L13.9 — Multilingual Safety Bridge
 *
 * §13.9.11 — Adapter that consumes the L13.8 multilingual safety
 * scan and surfaces its findings to the L13.9 safety classifier in
 * the L13.9 risk-class taxonomy. Mirrors L13.8 context-awareness:
 * quoted refusal / blocked-claim / debug contexts do not produce
 * blocking risk classes.
 */

import {
  L13MultilingualSafetyPatternClass,
  type L13MultilingualSafetyScan,
} from '../contracts/multilingual-safety-scan';
import { L13SafetyRiskClass } from '../contracts/safety-risk-class';
import { L13SafetyReasonCode } from '../contracts/safety-reason-code';

const SAFETY_RISK_BY_PATTERN_CLASS:
  Readonly<Record<L13MultilingualSafetyPatternClass, L13SafetyRiskClass>> = {
  [L13MultilingualSafetyPatternClass.TRADE_ADVICE_DIRECT]:
    L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED,
  [L13MultilingualSafetyPatternClass.TRADE_ADVICE_INDIRECT]:
    L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED,
  [L13MultilingualSafetyPatternClass.GUARANTEE_CERTAINTY]:
    L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED,
  [L13MultilingualSafetyPatternClass.PUMP_DUMP_PROPHECY]:
    L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED,
  [L13MultilingualSafetyPatternClass.SCENARIO_AS_CERTAINTY]:
    L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED,
  [L13MultilingualSafetyPatternClass.SCORE_AS_ACTION]:
    L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED,
  [L13MultilingualSafetyPatternClass.HYPE_INFLUENCER_STYLE]:
    L13SafetyRiskClass.ADVICE_ADJACENT_REWRITE_REQUIRED,
};

const REASON_BY_PATTERN_CLASS:
  Readonly<Record<L13MultilingualSafetyPatternClass, L13SafetyReasonCode>> = {
  [L13MultilingualSafetyPatternClass.TRADE_ADVICE_DIRECT]:
    L13SafetyReasonCode.REASON_DIRECT_BUY_SELL_INSTRUCTION,
  [L13MultilingualSafetyPatternClass.TRADE_ADVICE_INDIRECT]:
    L13SafetyReasonCode.REASON_DIRECT_BUY_SELL_INSTRUCTION,
  [L13MultilingualSafetyPatternClass.GUARANTEE_CERTAINTY]:
    L13SafetyReasonCode.REASON_GUARANTEED_OUTCOME,
  [L13MultilingualSafetyPatternClass.PUMP_DUMP_PROPHECY]:
    L13SafetyReasonCode.REASON_PUMP_DUMP_PROPHECY,
  [L13MultilingualSafetyPatternClass.SCENARIO_AS_CERTAINTY]:
    L13SafetyReasonCode.REASON_UNSUPPORTED_CERTAINTY,
  [L13MultilingualSafetyPatternClass.SCORE_AS_ACTION]:
    L13SafetyReasonCode.REASON_DIRECT_BUY_SELL_INSTRUCTION,
  [L13MultilingualSafetyPatternClass.HYPE_INFLUENCER_STYLE]:
    L13SafetyReasonCode.REASON_ADVICE_ADJACENT_REWRITEABLE,
};

export interface L13MultilingualSafetyBridgeResult {
  readonly risk_classes: readonly L13SafetyRiskClass[];
  readonly reason_codes: readonly L13SafetyReasonCode[];
  readonly any_blocking_hit_present: boolean;
}

/**
 * §13.9.11 — Bridge function. Only blocking hits (those flagged
 * with `blocks_user_emission=true` by L13.8) contribute risk
 * classes; quoted refusal/debug-internal hits are intentionally
 * ignored.
 */
export function bridgeL13MultilingualSafetyScan(
  scan: L13MultilingualSafetyScan,
): L13MultilingualSafetyBridgeResult {
  const riskSet = new Set<L13SafetyRiskClass>();
  const reasonSet = new Set<L13SafetyReasonCode>();
  for (const hit of scan.blocking_hits) {
    const risk = SAFETY_RISK_BY_PATTERN_CLASS[hit.pattern_class];
    if (risk) riskSet.add(risk);
    const reason = REASON_BY_PATTERN_CLASS[hit.pattern_class];
    if (reason) reasonSet.add(reason);
  }
  return {
    risk_classes: Array.from(riskSet),
    reason_codes: Array.from(reasonSet),
    any_blocking_hit_present: scan.blocking_hits.length > 0,
  };
}
