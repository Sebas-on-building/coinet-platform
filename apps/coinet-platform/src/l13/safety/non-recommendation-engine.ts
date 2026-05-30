/**
 * L13.9 — Non-Recommendation Engine
 *
 * §13.9.14 — Higher-level "did this output cross from analysis
 * into recommendation?" judgement. Distinct from the
 * phrase-scan: the scan looks for known forbidden strings; this
 * engine looks for STRUCTURAL recommendation patterns (action
 * verb + you-should chains, certainty-to-action links, percent-
 * of-portfolio sizing, NX-leverage numerics).
 */

import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import { L13RecommendationReasonCode } from '../contracts/market-manipulation-pattern';
import { L13SafetyAction } from '../contracts/safety-action';
import { L13SafetyRiskClass } from '../contracts/safety-risk-class';
import type { L13NonRecommendationAssessment } from '../contracts/non-recommendation-assessment';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.safety.v1';

interface ReasonPattern {
  readonly reason: L13RecommendationReasonCode;
  readonly pattern: RegExp;
  readonly risk_class: L13SafetyRiskClass;
}

const REASON_PATTERNS: readonly ReasonPattern[] = [
  // Action verbs in imperative form
  {
    reason: L13RecommendationReasonCode.ACTION_VERB_DETECTED,
    pattern: /\b(buy|sell|long|short|enter|exit|hold|avoid)\s+(now|here|this|the\s+dip|the\s+top|before)\b/i,
    risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED,
  },
  // "you should ..." direct advice
  {
    reason: L13RecommendationReasonCode.YOU_SHOULD_PATTERN,
    pattern: /\byou\s+should\s+(buy|sell|long|short|hold|avoid|enter|exit)\b/i,
    risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED,
  },
  // best-entry framing
  {
    reason: L13RecommendationReasonCode.BEST_ENTRY_FRAMING,
    pattern: /\b(perfect|best|cleanest)\s+(entry|trade|setup)\b/i,
    risk_class: L13SafetyRiskClass.ADVICE_ADJACENT_REWRITE_REQUIRED,
  },
  // entry/exit timing
  {
    reason: L13RecommendationReasonCode.ENTRY_EXIT_TIMING_PATTERN,
    pattern: /\bnow\s+is\s+the\s+(time|moment)\s+to\s+(enter|long|short|buy|sell)\b/i,
    risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED,
  },
  // NX leverage numerics
  {
    reason: L13RecommendationReasonCode.LEVERAGE_NUMERIC_PATTERN,
    pattern: /\b(use|nimm|usa)\s+\d+\s*x\s+(leverage|hebel|apalancamiento)\b/i,
    risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
  },
  // position-percent
  {
    reason: L13RecommendationReasonCode.POSITION_PERCENT_PATTERN,
    pattern: /\bput\s+\d+%\s+(of\s+your\s+(account|portfolio)|in)\b/i,
    risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
  },
  // stop loss
  {
    reason: L13RecommendationReasonCode.STOP_LOSS_PATTERN,
    pattern: /\bset\s+your\s+stop\s+(loss\s+)?at\b/i,
    risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
  },
  // take profit
  {
    reason: L13RecommendationReasonCode.TAKE_PROFIT_PATTERN,
    pattern: /\btake\s+profit\s+at\b/i,
    risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
  },
  // guarantee
  {
    reason: L13RecommendationReasonCode.GUARANTEE_PATTERN,
    pattern: /\bguaranteed\s+(move|outcome|to\s+(pump|dump|rally|drop))\b/i,
    risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED,
  },
  // certainty-to-action linkage
  {
    reason: L13RecommendationReasonCode.CERTAINTY_TO_ACTION_LINK,
    pattern: /\bscore\s+is\s+high(,?\s+so\s+(this|it)\s+is\s+a\s+buy)\b/i,
    risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED,
  },
  {
    reason: L13RecommendationReasonCode.CERTAINTY_TO_ACTION_LINK,
    pattern: /\bopportunity\s+score\s+says\s+(buy|sell)\b/i,
    risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED,
  },
  // comparison-as-recommendation
  {
    reason: L13RecommendationReasonCode.COMPARISON_AS_RECOMMENDATION,
    pattern: /\b(better\s+buy|should\s+outperform|pick\s+\w+\s+over\s+\w+)\b/i,
    risk_class: L13SafetyRiskClass.ADVICE_ADJACENT_REWRITE_REQUIRED,
  },
];

export interface L13NonRecommendationInput {
  readonly output_id: string;
  readonly user_visible_corpus: string;
  readonly product_answer_mode: L13ProductAnswerMode;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

/**
 * §13.9.14 — Run the non-recommendation engine. Pure function.
 */
export function runL13NonRecommendationEngine(
  input: L13NonRecommendationInput,
): L13NonRecommendationAssessment {
  const corpus = input.user_visible_corpus ?? '';
  const reasonSet = new Set<L13RecommendationReasonCode>();
  const riskSet = new Set<L13SafetyRiskClass>();
  let actionDetected = false;
  let personalised = false;
  let certaintyAction = false;

  for (const entry of REASON_PATTERNS) {
    if (entry.pattern.test(corpus)) {
      reasonSet.add(entry.reason);
      riskSet.add(entry.risk_class);
      if (
        entry.reason ===
          L13RecommendationReasonCode.ACTION_VERB_DETECTED ||
        entry.reason ===
          L13RecommendationReasonCode.YOU_SHOULD_PATTERN ||
        entry.reason ===
          L13RecommendationReasonCode.ENTRY_EXIT_TIMING_PATTERN ||
        entry.reason ===
          L13RecommendationReasonCode.LEVERAGE_NUMERIC_PATTERN ||
        entry.reason ===
          L13RecommendationReasonCode.POSITION_PERCENT_PATTERN ||
        entry.reason ===
          L13RecommendationReasonCode.STOP_LOSS_PATTERN ||
        entry.reason ===
          L13RecommendationReasonCode.TAKE_PROFIT_PATTERN
      ) {
        actionDetected = true;
      }
      if (
        entry.reason ===
          L13RecommendationReasonCode.YOU_SHOULD_PATTERN ||
        entry.reason ===
          L13RecommendationReasonCode.LEVERAGE_NUMERIC_PATTERN ||
        entry.reason ===
          L13RecommendationReasonCode.POSITION_PERCENT_PATTERN
      ) {
        personalised = true;
      }
      if (
        entry.reason ===
        L13RecommendationReasonCode.CERTAINTY_TO_ACTION_LINK
      ) {
        certaintyAction = true;
      }
    }
  }

  const recommendation_detected = reasonSet.size > 0;

  // Action selection — most restrictive wins.
  let action: L13SafetyAction = L13SafetyAction.ALLOW;
  let rewriteCandidate = false;
  for (const risk of riskSet) {
    switch (risk) {
      case L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED:
        action = L13SafetyAction.BLOCK_OUTPUT;
        break;
      case L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED:
      case L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED:
      case L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED:
      case L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED:
      case L13SafetyRiskClass.OUT_OF_SCOPE_BLOCKED:
        if (action !== L13SafetyAction.BLOCK_OUTPUT) {
          action = L13SafetyAction.REFUSAL_REQUIRED;
        }
        break;
      case L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED:
      case L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED:
        if (
          action !== L13SafetyAction.BLOCK_OUTPUT &&
          action !== L13SafetyAction.REFUSAL_REQUIRED
        ) {
          action = L13SafetyAction.REWRITE_REQUIRED;
        }
        break;
      case L13SafetyRiskClass.ADVICE_ADJACENT_REWRITE_REQUIRED:
        rewriteCandidate = true;
        if (action === L13SafetyAction.ALLOW) {
          action = L13SafetyAction.REWRITE_REQUIRED;
        }
        break;
      default:
        break;
    }
  }
  if (recommendation_detected && action === L13SafetyAction.ALLOW) {
    action = L13SafetyAction.REWRITE_REQUIRED;
  }

  const replayHash = fnv1a(
    [
      input.output_id,
      input.product_answer_mode,
      Array.from(reasonSet).sort().join(','),
      Array.from(riskSet).sort().join(','),
      action,
      String(recommendation_detected),
      String(personalised),
      String(actionDetected),
      String(certaintyAction),
      String(rewriteCandidate),
      POLICY_V,
    ].join('|'),
  );

  return {
    non_recommendation_assessment_id: `l13.nonrec.${replayHash}`,
    output_id: input.output_id,
    recommendation_detected,
    personalized_instruction_detected: personalised,
    action_language_detected: actionDetected,
    certainty_to_action_link_detected: certaintyAction,
    detected_risk_classes: Array.from(riskSet),
    recommendation_reason_codes: Array.from(reasonSet),
    required_action: action,
    rewrite_candidate_available:
      rewriteCandidate ||
      (recommendation_detected &&
        action === L13SafetyAction.REWRITE_REQUIRED),
    evidence_refs: input.evidence_refs ?? [],
    lineage_refs: input.lineage_refs ?? ['l13.safety.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
