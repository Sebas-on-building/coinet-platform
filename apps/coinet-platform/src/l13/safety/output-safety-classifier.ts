/**
 * L13.9 — Output Safety Classifier
 *
 * §13.9.17 — Unifies safety scan + non-recommendation assessment +
 * multilingual safety bridge + guarantee/manipulation/tax-legal
 * detectors into a single `L13OutputSafetyClassification`. The
 * final safety gate consumes this object directly.
 */

import { L13SafetyAction, l13StrengthenSafetyAction } from '../contracts/safety-action';
import { L13SafetyReasonCode } from '../contracts/safety-reason-code';
import {
  L13SafetyRiskClass,
  l13ReduceMaxSafetyRisk,
} from '../contracts/safety-risk-class';
import type { L13MultilingualSafetyScan } from '../contracts/multilingual-safety-scan';
import type { L13NonRecommendationAssessment } from '../contracts/non-recommendation-assessment';
import type {
  L13OutputSafetyClassification,
} from '../contracts/output-safety-classification';
import type { L13SafetyScanResult } from '../contracts/safety-scan-result';
import { bridgeL13MultilingualSafetyScan } from './multilingual-safety-bridge';
import {
  detectL13MarketManipulation,
} from './market-manipulation-detector';
import {
  detectL13TaxLegalAdvice,
} from './tax-legal-advice-detector';
import {
  detectL13GuaranteeCertainty,
} from './guarantee-certainty-detector';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.safety.v1';

export interface L13OutputSafetyClassifierInput {
  readonly output_id: string;
  readonly styled_response_ref: string;
  readonly user_visible_corpus: string;
  readonly safety_scan: L13SafetyScanResult;
  readonly non_recommendation: L13NonRecommendationAssessment;
  readonly multilingual_scan?: L13MultilingualSafetyScan;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

/**
 * §13.9.17 — Classify. Pure function.
 */
export function classifyL13OutputSafety(
  input: L13OutputSafetyClassifierInput,
): L13OutputSafetyClassification {
  const allRiskClasses = new Set<L13SafetyRiskClass>();
  const allReasons = new Set<L13SafetyReasonCode>();

  // Safety scan contribution.
  for (const c of input.safety_scan.detected_risk_classes) {
    allRiskClasses.add(c);
  }
  for (const hit of input.safety_scan.detected_phrase_hits) {
    if (hit.direct_user_visible_assertion) {
      // Per-hit reason-code mapping (kept terse on the classifier;
      // detailed phrase hits remain on the scan record).
      switch (hit.phrase_family) {
        case 'DIRECT_BUY':
        case 'DIRECT_SELL':
          allReasons.add(
            L13SafetyReasonCode.REASON_DIRECT_BUY_SELL_INSTRUCTION,
          );
          break;
        case 'DIRECT_HOLD':
        case 'DIRECT_AVOID':
          allReasons.add(
            L13SafetyReasonCode.REASON_DIRECT_HOLD_AVOID_INSTRUCTION,
          );
          break;
        case 'LONG_SHORT_INSTRUCTION':
          allReasons.add(
            L13SafetyReasonCode.REASON_LONG_SHORT_INSTRUCTION,
          );
          break;
        case 'ENTRY_EXIT_INSTRUCTION':
          allReasons.add(
            L13SafetyReasonCode.REASON_ENTRY_EXIT_INSTRUCTION,
          );
          break;
        case 'LEVERAGE_RECOMMENDATION':
          allReasons.add(
            L13SafetyReasonCode.REASON_LEVERAGE_RECOMMENDATION,
          );
          break;
        case 'POSITION_SIZING_RECOMMENDATION':
          allReasons.add(
            L13SafetyReasonCode.REASON_POSITION_SIZING_INSTRUCTION,
          );
          break;
        case 'STOP_LOSS_TAKE_PROFIT_INSTRUCTION':
          allReasons.add(
            L13SafetyReasonCode.REASON_STOP_LOSS_TAKE_PROFIT_INSTRUCTION,
          );
          break;
        case 'LIQUIDATION_TARGETING':
          allReasons.add(
            L13SafetyReasonCode.REASON_LIQUIDATION_TARGET_ADVICE,
          );
          break;
        case 'GUARANTEE_OUTCOME':
          allReasons.add(L13SafetyReasonCode.REASON_GUARANTEED_OUTCOME);
          break;
        case 'PUMP_DUMP_PROPHECY':
          allReasons.add(L13SafetyReasonCode.REASON_PUMP_DUMP_PROPHECY);
          break;
        case 'CERTAIN_DIRECTIONAL_OUTCOME':
          allReasons.add(
            L13SafetyReasonCode.REASON_UNSUPPORTED_CERTAINTY,
          );
          break;
        case 'TAX_LEGAL_ADVICE':
          allReasons.add(L13SafetyReasonCode.REASON_TAX_ADVICE);
          break;
        case 'MARKET_MANIPULATION_ASSISTANCE':
          allReasons.add(
            L13SafetyReasonCode.REASON_MARKET_MANIPULATION_COORDINATED_PUSH,
          );
          break;
        default:
          break;
      }
    }
  }

  // Non-recommendation engine contribution.
  for (const c of input.non_recommendation.detected_risk_classes) {
    allRiskClasses.add(c);
  }

  // Multilingual bridge contribution.
  if (input.multilingual_scan) {
    const bridged = bridgeL13MultilingualSafetyScan(
      input.multilingual_scan,
    );
    for (const c of bridged.risk_classes) allRiskClasses.add(c);
    for (const r of bridged.reason_codes) allReasons.add(r);
  }

  // Market manipulation detector.
  const manip = detectL13MarketManipulation(input.user_visible_corpus);
  if (manip.any_hit_present) {
    allRiskClasses.add(L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED);
    for (const hit of manip.hits) allReasons.add(hit.reason_code);
  }

  // Tax / legal detector.
  const tax = detectL13TaxLegalAdvice(input.user_visible_corpus);
  if (tax.tax_advice_detected || tax.legal_advice_detected) {
    allRiskClasses.add(L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED);
    for (const hit of tax.hits) allReasons.add(hit.reason_code);
  }

  // Guarantee / certainty detector.
  const gc = detectL13GuaranteeCertainty(input.user_visible_corpus);
  if (gc.any_guarantee_hit) {
    allRiskClasses.add(L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED);
  }
  if (gc.any_certainty_hit) {
    allRiskClasses.add(L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED);
  }
  for (const hit of gc.hits) allReasons.add(hit.reason_code);

  // If only safe-informational risk classes remain (nothing
  // contributed), keep SAFE_INFORMATIONAL.
  if (allRiskClasses.size === 0) {
    allRiskClasses.add(L13SafetyRiskClass.SAFE_INFORMATIONAL);
    allReasons.add(L13SafetyReasonCode.REASON_SAFE_INFORMATIONAL);
  } else if (
    allRiskClasses.size === 1 &&
    allRiskClasses.has(L13SafetyRiskClass.SAFE_INFORMATIONAL)
  ) {
    allReasons.add(L13SafetyReasonCode.REASON_SAFE_INFORMATIONAL);
  }

  const allArr = Array.from(allRiskClasses);
  const highest = l13ReduceMaxSafetyRisk(allArr);

  // Compute required action by strengthening across every risk
  // class.
  let required_action: L13SafetyAction = L13SafetyAction.ALLOW;
  for (const cls of allArr) {
    required_action = l13StrengthenSafetyAction(
      required_action,
      input.safety_scan.required_action,
    );
    void cls;
  }
  // Always strengthen with non-recommendation engine's action and
  // the safety scan's action.
  required_action = l13StrengthenSafetyAction(
    required_action,
    input.safety_scan.required_action,
  );
  required_action = l13StrengthenSafetyAction(
    required_action,
    input.non_recommendation.required_action,
  );
  // Risk-class fallback: if highest is severe, ensure action is
  // at least its canonical action.
  const RISK_ACTION_FALLBACK: Readonly<
    Record<L13SafetyRiskClass, L13SafetyAction>
  > = {
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
  for (const cls of allArr) {
    required_action = l13StrengthenSafetyAction(
      required_action,
      RISK_ACTION_FALLBACK[cls],
    );
  }

  const safe_informational =
    highest === L13SafetyRiskClass.SAFE_INFORMATIONAL;
  const advice_adjacent = allRiskClasses.has(
    L13SafetyRiskClass.ADVICE_ADJACENT_REWRITE_REQUIRED,
  );
  const blocked_financial_advice =
    allRiskClasses.has(L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED) ||
    allRiskClasses.has(
      L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED,
    ) ||
    allRiskClasses.has(
      L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
    );
  const blocked_manipulation = allRiskClasses.has(
    L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED,
  );
  const blocked_guarantee = allRiskClasses.has(
    L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED,
  );
  const blocked_tax_legal = allRiskClasses.has(
    L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED,
  );

  const rewrite_allowed =
    required_action === L13SafetyAction.REWRITE_REQUIRED;
  const refusal_required =
    required_action === L13SafetyAction.REFUSAL_REQUIRED;
  const hard_block_required =
    required_action === L13SafetyAction.BLOCK_OUTPUT;

  const replayHash = fnv1a(
    [
      input.output_id,
      input.styled_response_ref,
      input.safety_scan.safety_scan_id,
      input.non_recommendation.non_recommendation_assessment_id,
      input.multilingual_scan?.scan_id ?? '',
      allArr.slice().sort().join(','),
      highest,
      required_action,
      Array.from(allReasons).sort().join(','),
      String(rewrite_allowed),
      String(refusal_required),
      String(hard_block_required),
      POLICY_V,
    ].join('|'),
  );

  return {
    safety_classification_id: `l13.safety.cls.${replayHash}`,
    output_id: input.output_id,
    styled_response_ref: input.styled_response_ref,
    highest_risk_class: highest,
    all_risk_classes: allArr,
    safe_informational,
    advice_adjacent,
    blocked_financial_advice,
    blocked_manipulation,
    blocked_guarantee,
    blocked_tax_legal,
    required_action,
    rewrite_allowed,
    refusal_required,
    hard_block_required,
    reason_codes: Array.from(allReasons),
    policy_version: POLICY_V,
    evidence_refs: input.evidence_refs ?? [],
    lineage_refs: input.lineage_refs ?? ['l13.safety.lineage'],
    replay_hash: replayHash,
  };
}
