/**
 * L13.6 — User Intent Classifier
 *
 * §13.6.5 — Deterministic, ruleset-versioned intent classification.
 * Pattern-based, never an LLM call. The classifier ranks rules by
 * priority and emits the top-ranked matching intent. When no rule
 * fires, the result is OUT_OF_SCOPE_MATCH with reason
 * `NO_RULE_MATCHED` — never a silent default to WHATS_HAPPENING.
 *
 * §13.6.5.5 — Adversarial intents (trade-advice / certainty /
 * binary bullish-bearish requests) are detected and routed to the
 * adversarial intent classes defined by L13.2; the runtime treats
 * them as OUT_OF_SCOPE_MATCH unless the request can be re-framed
 * by an explanation route.
 */

import {
  L13AnswerMode,
} from '../contracts/explanation-restriction-profile';
import {
  L13UserIntentClass,
  getL13IntentRequirements,
  isL13AdversarialIntent,
} from '../contracts/user-intent-binding';
import {
  L13IntentConfidenceClass,
  L13IntentOutOfScopeReasonCode,
  type L13RawUserRequest,
  type L13UserIntentClassification,
} from '../contracts/user-intent';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

interface IntentRule {
  readonly rule_id: string;
  readonly intent: L13UserIntentClass;
  readonly answer_mode: L13AnswerMode;
  readonly priority: number;
  readonly patterns: readonly RegExp[];
  readonly confidence: L13IntentConfidenceClass;
}

interface OutOfScopeRule {
  readonly rule_id: string;
  readonly reason_code: L13IntentOutOfScopeReasonCode;
  readonly priority: number;
  readonly patterns: readonly RegExp[];
}

/**
 * §13.6.5.5 — Out-of-scope rules run BEFORE intent rules. A trade-
 * advice or certainty request never falls through to a normal
 * intent class, even if the query also contains explanatory
 * keywords.
 */
const OUT_OF_SCOPE_RULES: readonly OutOfScopeRule[] = [
  {
    rule_id: 'l13r.intent.oos.trade_instruction',
    reason_code:
      L13IntentOutOfScopeReasonCode.REQUESTS_TRADE_INSTRUCTION,
    priority: 100,
    patterns: [
      /\b(buy|sell|short|long)\s+(now|here|the\s+top|the\s+dip|now\?)\b/i,
      /\bshould\s+i\s+(buy|sell|long|short|hold|exit|enter)\b/i,
      /\b(open|close|enter|exit)\s+(a\s+)?(long|short)\s+position\b/i,
      /\bgo\s+(long|short)\b/i,
      /\bgive\s+me\s+a\s+trade\b/i,
      /\bwhat\s+trade\s+should\s+i\b/i,
    ],
  },
  {
    rule_id: 'l13r.intent.oos.buy_sell_hold',
    reason_code: L13IntentOutOfScopeReasonCode.REQUESTS_BUY_SELL_HOLD,
    priority: 95,
    patterns: [
      /\b(should\s+i\s+)?(buy|sell|hold|avoid)\s+(this|btc|eth|sol|the\s+market)\b/i,
      /\b(is\s+it\s+a\s+)?(buy|sell)\s+(here|now)\b/i,
    ],
  },
  {
    rule_id: 'l13r.intent.oos.price_target',
    reason_code: L13IntentOutOfScopeReasonCode.REQUESTS_PRICE_TARGET,
    priority: 90,
    patterns: [
      /\b(price|target|tp|sl|stop\s+loss|take\s+profit)\s+(target|level)?\b.*\?\s*$/i,
      /\bwhat'?s?\s+the\s+(price\s+)?target\b/i,
      /\bprice\s+prediction\b/i,
      /\bwhere\s+will\s+(it|btc|eth|sol)\s+go\b/i,
    ],
  },
  {
    rule_id: 'l13r.intent.oos.prediction',
    reason_code: L13IntentOutOfScopeReasonCode.REQUESTS_PREDICTION,
    priority: 85,
    patterns: [
      /\bwill\s+(it|this|btc|eth|sol)\s+(pump|dump|moon|crash|rally|tank)\b/i,
      /\bpredict(?:ion)?\b.*\?/i,
      /\bwhen\s+(will|do\s+you\s+expect)\b.*\?/i,
    ],
  },
  {
    rule_id: 'l13r.intent.oos.certainty',
    reason_code: L13IntentOutOfScopeReasonCode.REQUESTS_CERTAINTY,
    priority: 80,
    patterns: [
      /\bare\s+you\s+(sure|certain)\b/i,
      /\b(100|99)\s*%\s+(certain|sure|chance)\b/i,
      /\bguarantee(d)?\b/i,
      /\btell\s+me\s+for\s+sure\b/i,
    ],
  },
  {
    rule_id: 'l13r.intent.oos.bullish_bearish_binary',
    reason_code:
      L13IntentOutOfScopeReasonCode.REQUESTS_BULLISH_BEARISH_BINARY,
    priority: 75,
    patterns: [
      /^\s*bullish\s+or\s+bearish\??\s*$/i,
      /\bgive\s+me\s+a\s+(yes|no)\s+(answer|call)\b/i,
      /\bjust\s+tell\s+me\s+(bull|bear)\b/i,
    ],
  },
  {
    rule_id: 'l13r.intent.oos.leverage_position',
    reason_code:
      L13IntentOutOfScopeReasonCode.REQUESTS_LEVERAGE_OR_POSITION_SIZE,
    priority: 70,
    patterns: [
      /\bhow\s+much\s+(leverage|size|capital)\b/i,
      /\b(\d+)x\s+leverage\b/i,
      /\bwhat\s+position\s+size\b/i,
    ],
  },
  {
    rule_id: 'l13r.intent.oos.non_crypto',
    reason_code: L13IntentOutOfScopeReasonCode.REQUESTS_NON_CRYPTO_TOPIC,
    priority: 50,
    patterns: [
      /\b(stocks?|s&p|nasdaq|forex|fx|gold|oil)\b\s*\?/i,
      /\b(weather|recipe|joke|poem)\b/i,
    ],
  },
];

/**
 * §13.6.5.2 — Intent rules. Higher priority wins on tie.
 */
const INTENT_RULES: readonly IntentRule[] = [
  {
    rule_id: 'l13r.intent.market_overview',
    intent: L13UserIntentClass.WHATS_HAPPENING,
    answer_mode: L13AnswerMode.SUMMARIZE_MARKET_STATE,
    priority: 60,
    patterns: [
      /\bwhat'?s?\s+(happening|going\s+on)\b/i,
      /\bmarket\s+(overview|update|state|view)\b/i,
      /\bgive\s+me\s+(an\s+)?(overview|update)\b/i,
      /^\s*(btc|eth|sol|bitcoin|ethereum|solana)\s*\??\s*$/i,
      /\bsummarize\s+(the\s+)?market\b/i,
    ],
    confidence: L13IntentConfidenceClass.STRONG_MATCH,
  },
  {
    rule_id: 'l13r.intent.why_moving',
    intent: L13UserIntentClass.WHY_IS_THIS_MOVING,
    answer_mode: L13AnswerMode.EXPLAIN,
    priority: 65,
    patterns: [
      /\bwhy\s+(is|are)\s+(it|this|btc|eth|sol|prices?)\s+(moving|up|down|pumping|dumping|rallying)\b/i,
      /\bwhy\s+the\s+(move|spike|drop|crash|rally)\b/i,
      /\bwhat'?s?\s+driving\b/i,
      /\bwhat\s+caused\b/i,
    ],
    confidence: L13IntentConfidenceClass.CLEAR_MATCH,
  },
  {
    rule_id: 'l13r.intent.what_next',
    intent: L13UserIntentClass.WHATS_NEXT,
    answer_mode: L13AnswerMode.EXPLAIN_SCENARIO,
    priority: 55,
    patterns: [
      /\bwhat'?s?\s+next\b/i,
      /\bwhat\s+happens\s+next\b/i,
      /\bwhat\s+(should|could)\s+i\s+(watch|monitor|expect)\b/i,
      /\bnext\s+trigger\b/i,
    ],
    confidence: L13IntentConfidenceClass.STRONG_MATCH,
  },
  {
    rule_id: 'l13r.intent.scenario_explanation',
    intent: L13UserIntentClass.EXPLAIN_SCENARIO,
    answer_mode: L13AnswerMode.EXPLAIN_SCENARIO,
    priority: 70,
    patterns: [
      /\b(explain|tell\s+me\s+about)\s+(the\s+)?scenario\b/i,
      /\bwhat\s+is\s+the\s+(base\s+case|scenario)\b/i,
      /\bscenario\s+spread\b/i,
      /\binvalidation\s+conditions?\b/i,
    ],
    confidence: L13IntentConfidenceClass.CLEAR_MATCH,
  },
  {
    rule_id: 'l13r.intent.score_explanation',
    intent: L13UserIntentClass.EXPLAIN_SCORE,
    answer_mode: L13AnswerMode.EXPLAIN_SCORE,
    priority: 70,
    patterns: [
      /\b(explain|why\s+is)\s+(the\s+)?(score|risk|opportunity|momentum)\s+(score|so\s+(high|low))\b/i,
      /\b(omniscore|score)\b/i,
      /\bwhy\s+is\s+the\s+(opportunity|risk)\s+score\b/i,
    ],
    confidence: L13IntentConfidenceClass.STRONG_MATCH,
  },
  {
    rule_id: 'l13r.intent.hypothesis_explanation',
    intent: L13UserIntentClass.EXPLAIN_HYPOTHESIS,
    answer_mode: L13AnswerMode.EXPLAIN_HYPOTHESIS,
    priority: 65,
    patterns: [
      /\b(explain|what\s+is)\s+(the\s+)?hypothes(is|es)\b/i,
      /\b(competing|primary)\s+hypothes(is|es)\b/i,
      /\bwhich\s+thesis\b/i,
    ],
    confidence: L13IntentConfidenceClass.CLEAR_MATCH,
  },
  {
    rule_id: 'l13r.intent.contradiction_explanation',
    intent: L13UserIntentClass.CONTRADICTION_INSIGHT,
    answer_mode: L13AnswerMode.DISCLOSE_CONTRADICTION,
    priority: 60,
    patterns: [
      /\b(what'?s?\s+the\s+)?contradiction(s)?\b/i,
      /\bdisagreement\b/i,
      /\bopposing\s+evidence\b/i,
    ],
    confidence: L13IntentConfidenceClass.STRONG_MATCH,
  },
  {
    rule_id: 'l13r.intent.alert_request',
    intent: L13UserIntentClass.WRITE_ALERT,
    answer_mode: L13AnswerMode.WRITE_ALERT,
    priority: 50,
    patterns: [
      /\b(set\s+up\s+)?an?\s+alert\b/i,
      /\balert\s+me\s+(when|if)\b/i,
      /\bnotify\s+me\b/i,
    ],
    confidence: L13IntentConfidenceClass.STRONG_MATCH,
  },
  {
    rule_id: 'l13r.intent.asset_comparison',
    intent: L13UserIntentClass.COMPARE_ASSETS,
    answer_mode: L13AnswerMode.COMPARE_ASSETS,
    priority: 55,
    patterns: [
      /\b(compare|vs\.?|versus)\b.*\b(btc|eth|sol|asset|asset[s]?)\b/i,
      /\b(btc|eth|sol)\s+vs\.?\s+(btc|eth|sol)\b/i,
    ],
    confidence: L13IntentConfidenceClass.CLEAR_MATCH,
  },
  {
    rule_id: 'l13r.intent.thesis_comparison',
    intent: L13UserIntentClass.COMPARE_THESES,
    answer_mode: L13AnswerMode.COMPARE_THESES,
    priority: 55,
    patterns: [
      /\bcompare\s+(the\s+)?thes(is|es)\b/i,
      /\b(bull|bear)\s+(case|thesis)\s+vs\.?\s+(bull|bear)\b/i,
    ],
    confidence: L13IntentConfidenceClass.CLEAR_MATCH,
  },
  {
    rule_id: 'l13r.intent.structured_report',
    intent: L13UserIntentClass.WRITE_REPORT,
    answer_mode: L13AnswerMode.WRITE_REPORT,
    priority: 45,
    patterns: [
      /\b(write|generate|produce)\s+(a\s+)?(report|brief|writeup)\b/i,
      /\b(structured|full)\s+report\b/i,
    ],
    confidence: L13IntentConfidenceClass.STRONG_MATCH,
  },
];

const ADVERSARIAL_FALLBACK_RULE: IntentRule = {
  rule_id: 'l13r.intent.adversarial_fallback',
  intent: L13UserIntentClass.REQUESTS_TRADE_ADVICE,
  answer_mode: L13AnswerMode.REFUSE_UNSUPPORTED,
  priority: 0,
  patterns: [],
  confidence: L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
};

interface RuleMatchOutcome {
  readonly matched: readonly IntentRule[];
  readonly rejected_rule_ids: readonly string[];
}

function matchIntentRules(query: string): RuleMatchOutcome {
  const matched: IntentRule[] = [];
  const rejected: string[] = [];
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some(p => p.test(query))) {
      matched.push(rule);
    } else {
      rejected.push(rule.rule_id);
    }
  }
  return { matched, rejected_rule_ids: rejected };
}

interface OutOfScopeMatchOutcome {
  readonly hits: readonly OutOfScopeRule[];
}

function matchOutOfScopeRules(query: string): OutOfScopeMatchOutcome {
  const hits: OutOfScopeRule[] = [];
  for (const rule of OUT_OF_SCOPE_RULES) {
    if (rule.patterns.some(p => p.test(query))) hits.push(rule);
  }
  hits.sort((a, b) => b.priority - a.priority);
  return { hits };
}

/**
 * §13.6.5.3 — Classify a raw user request. Pure deterministic
 * function; identical inputs produce identical output (including
 * replay hash).
 */
export function classifyL13UserIntent(
  request: L13RawUserRequest,
): L13UserIntentClassification {
  const query = (request.user_query ?? '').trim();
  const lower = query.toLowerCase();

  if (query.length === 0) {
    const replayHash = fnv1a(
      [
        request.request_id,
        '',
        L13UserIntentClass.REQUESTS_TRADE_ADVICE, // adversarial fallback bucket
        L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
        L13IntentOutOfScopeReasonCode.EMPTY_QUERY,
        POLICY_V,
      ].join('|'),
    );
    return {
      intent_classification_id: `l13.intent.${replayHash}`,
      request_id: request.request_id,
      raw_user_query_ref: `req.${request.request_id}.query`,
      selected_intent: L13UserIntentClass.REQUESTS_TRADE_ADVICE,
      secondary_intent_candidates: [],
      intent_confidence_class:
        L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
      matched_rule_refs: [],
      rejected_rule_refs: INTENT_RULES.map(r => r.rule_id),
      requires_scope_resolution: false,
      requires_comparison_scope: false,
      requires_forward_scenario_context: false,
      requires_score_context: false,
      requires_hypothesis_context: false,
      requires_contradiction_context: false,
      answer_mode_hint: L13AnswerMode.REFUSE_UNSUPPORTED,
      out_of_scope_reason_codes: [
        L13IntentOutOfScopeReasonCode.EMPTY_QUERY,
      ],
      lineage_refs: ['l13.runtime.lineage'],
      policy_version: POLICY_V,
      replay_hash: replayHash,
    };
  }

  // Out-of-scope rules first.
  const oos = matchOutOfScopeRules(lower);
  if (oos.hits.length > 0) {
    const reasonCodes = oos.hits.map(h => h.reason_code);
    const replayHash = fnv1a(
      [
        request.request_id,
        lower,
        L13UserIntentClass.REQUESTS_TRADE_ADVICE,
        L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
        reasonCodes.join(','),
        oos.hits.map(h => h.rule_id).join(','),
        POLICY_V,
      ].join('|'),
    );
    return {
      intent_classification_id: `l13.intent.${replayHash}`,
      request_id: request.request_id,
      raw_user_query_ref: `req.${request.request_id}.query`,
      selected_intent:
        ADVERSARIAL_FALLBACK_RULE.intent,
      secondary_intent_candidates: [],
      intent_confidence_class:
        L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
      matched_rule_refs: oos.hits.map(h => h.rule_id),
      rejected_rule_refs: [],
      requires_scope_resolution: false,
      requires_comparison_scope: false,
      requires_forward_scenario_context: false,
      requires_score_context: false,
      requires_hypothesis_context: false,
      requires_contradiction_context: false,
      answer_mode_hint: L13AnswerMode.REFUSE_UNSUPPORTED,
      out_of_scope_reason_codes: reasonCodes,
      lineage_refs: ['l13.runtime.lineage'],
      policy_version: POLICY_V,
      replay_hash: replayHash,
    };
  }

  // Intent rules.
  const { matched, rejected_rule_ids } = matchIntentRules(lower);
  if (matched.length === 0) {
    const replayHash = fnv1a(
      [
        request.request_id,
        lower,
        L13UserIntentClass.REQUESTS_TRADE_ADVICE,
        L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
        L13IntentOutOfScopeReasonCode.NO_RULE_MATCHED,
        POLICY_V,
      ].join('|'),
    );
    return {
      intent_classification_id: `l13.intent.${replayHash}`,
      request_id: request.request_id,
      raw_user_query_ref: `req.${request.request_id}.query`,
      selected_intent: L13UserIntentClass.REQUESTS_TRADE_ADVICE,
      secondary_intent_candidates: [],
      intent_confidence_class:
        L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
      matched_rule_refs: [],
      rejected_rule_refs: rejected_rule_ids,
      requires_scope_resolution: false,
      requires_comparison_scope: false,
      requires_forward_scenario_context: false,
      requires_score_context: false,
      requires_hypothesis_context: false,
      requires_contradiction_context: false,
      answer_mode_hint: L13AnswerMode.REFUSE_UNSUPPORTED,
      out_of_scope_reason_codes: [
        L13IntentOutOfScopeReasonCode.NO_RULE_MATCHED,
      ],
      lineage_refs: ['l13.runtime.lineage'],
      policy_version: POLICY_V,
      replay_hash: replayHash,
    };
  }
  // Highest-priority match wins; ties resolved by enum order.
  const sorted = [...matched].sort((a, b) => b.priority - a.priority);
  const top = sorted[0];
  const secondaries = sorted.slice(1, 4).map(m => m.intent);
  const ambiguous =
    sorted.length > 1 && sorted[0].priority === sorted[1].priority;
  const confidence = ambiguous
    ? L13IntentConfidenceClass.AMBIGUOUS_MATCH
    : top.confidence;

  // Adversarial intents must be flagged as out-of-scope.
  if (isL13AdversarialIntent(top.intent)) {
    const replayHash = fnv1a(
      [
        request.request_id,
        lower,
        top.intent,
        L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
        top.rule_id,
        POLICY_V,
      ].join('|'),
    );
    return {
      intent_classification_id: `l13.intent.${replayHash}`,
      request_id: request.request_id,
      raw_user_query_ref: `req.${request.request_id}.query`,
      selected_intent: top.intent,
      secondary_intent_candidates: secondaries,
      intent_confidence_class:
        L13IntentConfidenceClass.OUT_OF_SCOPE_MATCH,
      matched_rule_refs: sorted.map(m => m.rule_id),
      rejected_rule_refs: rejected_rule_ids,
      requires_scope_resolution: false,
      requires_comparison_scope: false,
      requires_forward_scenario_context: false,
      requires_score_context: false,
      requires_hypothesis_context: false,
      requires_contradiction_context: false,
      answer_mode_hint: L13AnswerMode.REFUSE_UNSUPPORTED,
      out_of_scope_reason_codes: [
        L13IntentOutOfScopeReasonCode.REQUESTS_TRADE_INSTRUCTION,
      ],
      lineage_refs: ['l13.runtime.lineage'],
      policy_version: POLICY_V,
      replay_hash: replayHash,
    };
  }

  const reqs = getL13IntentRequirements(top.intent);
  const replayHash = fnv1a(
    [
      request.request_id,
      lower,
      top.intent,
      confidence,
      top.rule_id,
      matched.map(m => m.rule_id).join(','),
      String(reqs.requires_scenario_context),
      String(reqs.requires_score_context),
      String(reqs.requires_hypothesis_context),
      String(reqs.requires_contradiction_context),
      String(reqs.requires_comparison_context),
      POLICY_V,
    ].join('|'),
  );
  return {
    intent_classification_id: `l13.intent.${replayHash}`,
    request_id: request.request_id,
    raw_user_query_ref: `req.${request.request_id}.query`,
    selected_intent: top.intent,
    secondary_intent_candidates: secondaries,
    intent_confidence_class: confidence,
    matched_rule_refs: matched.map(m => m.rule_id),
    rejected_rule_refs: rejected_rule_ids,
    requires_scope_resolution: true,
    requires_comparison_scope: reqs.requires_comparison_context,
    requires_forward_scenario_context: reqs.requires_scenario_context,
    requires_score_context: reqs.requires_score_context,
    requires_hypothesis_context: reqs.requires_hypothesis_context,
    requires_contradiction_context: reqs.requires_contradiction_context,
    answer_mode_hint: top.answer_mode,
    out_of_scope_reason_codes: [],
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
