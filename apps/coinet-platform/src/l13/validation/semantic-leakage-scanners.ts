/**
 * L13.3 — Semantic Leakage Scanners
 *
 * §13.3.12 / §13.3.16 — Output-text scanners that detect the
 * leakage families enumerated in §13.3.12.1. The scanners wrap the
 * L13.1 mission-level detectors (recommendation, prediction, final
 * judgment) and add L13.3-specific patterns for scenario-as-
 * certainty, score-as-advice, confidence-as-probability, and
 * hypothesis-as-final-truth.
 *
 * Scanners are pure functions: they take a text fragment and return
 * a `L13SemanticLeakHit | null`. They do NOT mutate or rewrite.
 */

import {
  detectL13FinalJudgmentLeak,
  detectL13PredictionTheater,
  detectL13RecommendationLeak,
} from '../contracts/l13-mission';
import {
  containsL13ForbiddenConfidencePhrase,
  detectL13ProbabilityTheater,
} from '../contracts/confidence-disclosure';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import { L13OutputBlockedClaimType } from '../contracts/blocked-claim';

export interface L13SemanticLeakHit {
  readonly code: L13OutputViolationCode;
  readonly blocked_claim_type: L13OutputBlockedClaimType;
  readonly fragment: string;
  readonly reason: string;
}

/**
 * §13.3.12.2 — Trade action vocabulary that the AI may never emit
 * directly ("buy", "sell", "long", "short", "exit now",
 * "take profit"). Recommendation phrasing is detected separately
 * via the L13.1 mission scanner.
 */
const TRADE_ACTION_PATTERNS: readonly RegExp[] = [
  /\b(go\s+long|go\s+short)\b/i,
  /\b(open|enter|close)\s+(a\s+)?(long|short)\b/i,
  /\b(take\s+profit|stop\s+loss|cut\s+the\s+position)\b/i,
  /\b(reduce|increase)\s+(your\s+)?(position|exposure)\b/i,
  /\b(buy|sell)\s+(this|now|today|aggressively)\b/i,
];

/**
 * §13.3.12 — Scenario-as-certainty patterns. Triggered when the AI
 * speaks about a scenario path as a definite outcome rather than a
 * conditional path.
 */
const SCENARIO_AS_CERTAINTY_PATTERNS: readonly RegExp[] = [
  /\b(base\s+case\s+(means|implies)\s+(this|that)\s+(is\s+)?(what\s+happens|will\s+happen|will\s+play))/i,
  /\b(bullish|bearish)\s+path\s+is\s+going\s+to\s+play/i,
  /\bthis\s+is\s+what\s+happens\s+next\b/i,
  /\b(scenario\s+will|scenario\s+is\s+going\s+to)\b/i,
];

/**
 * §13.3.12 — Score-as-advice patterns ("high opportunity score, so
 * it's a good buy", "low risk score means safe", "high timing means
 * enter now").
 */
const SCORE_AS_ADVICE_PATTERNS: readonly RegExp[] = [
  /\b(opportunity\s+score\s+is\s+high[\s,.]+so\s+(this|it)\s+is\s+(a\s+)?(good\s+)?(buy|trade|entry))/i,
  /\b(opportunity|risk|timing|momentum|leadership|liquidity)\s+score\s+(is\s+)?high[\s,.]+so\s+(you|we|i)\s+(should|can|may)\s+(buy|enter|long)/i,
  /\b(low\s+risk\s+score\s+(means|implies)\s+(safe|safer))/i,
  /\b(high\s+timing\s+score\s+(means|implies)\s+(enter\s+now|buy\s+now|good\s+entry))/i,
  /\b(score\s+says\s+(buy|sell|hold|avoid))/i,
];

/**
 * §13.3.12 — Hypothesis-as-final-truth patterns.
 */
const HYPOTHESIS_AS_FINAL_TRUTH_PATTERNS: readonly RegExp[] = [
  /\b(this\s+is\s+definitely\s+the\s+(case|reality|truth))/i,
  /\b(the\s+thesis\s+is\s+(correct|right|proven|confirmed))/i,
  /\b(hypothesis\s+is\s+the\s+(answer|truth|final\s+answer))/i,
  /\b(primary\s+hypothesis\s+is\s+the\s+truth)\b/i,
];

function hit(
  code: L13OutputViolationCode,
  blocked: L13OutputBlockedClaimType,
  fragment: string,
  reason: string,
): L13SemanticLeakHit {
  return {
    code,
    blocked_claim_type: blocked,
    fragment,
    reason,
  };
}

/**
 * §13.3.12.2 — Recommendation leakage scanner.
 */
export function scanL13RecommendationLeakage(
  text: string,
): L13SemanticLeakHit | null {
  if (detectL13RecommendationLeak(text)) {
    return hit(
      L13OutputViolationCode.L13O_RECOMMENDATION_LEAK,
      L13OutputBlockedClaimType.RECOMMENDATION_LEAK,
      text,
      'recommendation-leak phrase detected by L13.1 mission scanner',
    );
  }
  return null;
}

/**
 * §13.3.12 — Additional prediction-theater patterns specific to
 * L13.3 output context. The L13.1 mission scanner catches direct
 * "will go up/down" phrases; these extend the surface to generic
 * "will" + directional/scenario-path constructions.
 */
const PREDICTION_THEATER_PATTERNS: readonly RegExp[] = [
  /\bwill\s+(go|move|push|trade|rally|drop|fall|crash|surge)\s+(higher|lower|up|down)\b/i,
  /\b(bullish|bearish)\s+(path|scenario|case)\s+is\s+going\s+to\s+(play|happen|unfold|continue)/i,
  /\bis\s+going\s+to\s+(continue|extend|break|pump|dump)\s+(higher|lower|up|down)\b/i,
  /\bwill\s+(continue|extend)\s+(higher|lower|to)\b/i,
];

/**
 * §13.3.12.2 — Prediction-theater scanner.
 */
export function scanL13PredictionTheater(
  text: string,
): L13SemanticLeakHit | null {
  if (detectL13PredictionTheater(text)) {
    return hit(
      L13OutputViolationCode.L13O_PREDICTION_THEATER,
      L13OutputBlockedClaimType.PREDICTION_THEATER,
      text,
      'prediction-theater phrase detected by L13.1 mission scanner',
    );
  }
  for (const p of PREDICTION_THEATER_PATTERNS) {
    const m = text.match(p);
    if (m) {
      return hit(
        L13OutputViolationCode.L13O_PREDICTION_THEATER,
        L13OutputBlockedClaimType.PREDICTION_THEATER,
        m[0],
        `prediction-theater phrasing "${m[0]}" detected`,
      );
    }
  }
  return null;
}

/**
 * §13.3.12 — Final-judgment leakage scanner.
 */
export function scanL13FinalJudgmentLeak(
  text: string,
): L13SemanticLeakHit | null {
  if (detectL13FinalJudgmentLeak(text)) {
    return hit(
      L13OutputViolationCode.L13O_FINAL_JUDGMENT_LEAK,
      L13OutputBlockedClaimType.FINAL_JUDGMENT_LEAK,
      text,
      'final-judgment-leak phrase detected by L13.1 mission scanner',
    );
  }
  return null;
}

/**
 * §13.3.12 — Trade-action leakage scanner.
 */
export function scanL13TradeActionLeak(
  text: string,
): L13SemanticLeakHit | null {
  for (const p of TRADE_ACTION_PATTERNS) {
    const m = text.match(p);
    if (m) {
      return hit(
        L13OutputViolationCode.L13O_TRADE_ACTION_LEAK,
        L13OutputBlockedClaimType.RECOMMENDATION_LEAK,
        m[0],
        `trade-action phrase "${m[0]}" detected`,
      );
    }
  }
  return null;
}

/**
 * §13.3.12 — Certainty leakage scanner ("guaranteed", "inevitable",
 * "definitely").
 */
export function scanL13CertaintyLeak(
  text: string,
): L13SemanticLeakHit | null {
  if (containsL13ForbiddenConfidencePhrase(text)) {
    return hit(
      L13OutputViolationCode.L13O_CERTAINTY_LEAK,
      L13OutputBlockedClaimType.PREDICTION_THEATER,
      text,
      'forbidden certainty phrase detected',
    );
  }
  return null;
}

/**
 * §13.3.12 — Scenario-as-certainty scanner.
 */
export function scanL13ScenarioAsCertainty(
  text: string,
): L13SemanticLeakHit | null {
  for (const p of SCENARIO_AS_CERTAINTY_PATTERNS) {
    const m = text.match(p);
    if (m) {
      return hit(
        L13OutputViolationCode.L13O_SCENARIO_AS_CERTAINTY,
        L13OutputBlockedClaimType.SCENARIO_AS_CERTAINTY,
        m[0],
        `scenario-as-certainty phrasing "${m[0]}" detected`,
      );
    }
  }
  return null;
}

/**
 * §13.3.12 — Score-as-advice scanner.
 */
export function scanL13ScoreAsAdvice(
  text: string,
): L13SemanticLeakHit | null {
  for (const p of SCORE_AS_ADVICE_PATTERNS) {
    const m = text.match(p);
    if (m) {
      return hit(
        L13OutputViolationCode.L13O_SCORE_AS_RECOMMENDATION,
        L13OutputBlockedClaimType.SCORE_AS_ADVICE,
        m[0],
        `score-as-advice phrasing "${m[0]}" detected`,
      );
    }
  }
  return null;
}

/**
 * §13.3.12 — Confidence-as-probability scanner.
 */
export function scanL13ConfidenceAsProbability(
  text: string,
): L13SemanticLeakHit | null {
  const m = detectL13ProbabilityTheater(text);
  if (m) {
    return hit(
      L13OutputViolationCode.L13O_CONFIDENCE_AS_PROBABILITY,
      L13OutputBlockedClaimType.CONFIDENCE_AS_PROBABILITY,
      m[0],
      `probability-theater phrasing "${m[0]}" detected`,
    );
  }
  return null;
}

/**
 * §13.3.12 — Hypothesis-as-final-truth scanner.
 */
export function scanL13HypothesisAsFinalTruth(
  text: string,
): L13SemanticLeakHit | null {
  for (const p of HYPOTHESIS_AS_FINAL_TRUTH_PATTERNS) {
    const m = text.match(p);
    if (m) {
      return hit(
        L13OutputViolationCode.L13O_HYPOTHESIS_AS_FINAL_TRUTH,
        L13OutputBlockedClaimType.UNSUPPORTED_CLAIM,
        m[0],
        `hypothesis-as-final-truth phrasing "${m[0]}" detected`,
      );
    }
  }
  return null;
}

/**
 * §13.3.16 — Master scanner: runs every output-text leakage scanner
 * and returns the consolidated hit list. Multiple hits per text are
 * returned (different codes can co-occur).
 */
export function scanL13SemanticLeakage(
  text: string,
): readonly L13SemanticLeakHit[] {
  const out: L13SemanticLeakHit[] = [];
  const scanners: ReadonlyArray<(t: string) => L13SemanticLeakHit | null> = [
    scanL13TradeActionLeak,
    scanL13RecommendationLeakage,
    scanL13PredictionTheater,
    scanL13FinalJudgmentLeak,
    scanL13CertaintyLeak,
    scanL13ScenarioAsCertainty,
    scanL13ScoreAsAdvice,
    scanL13ConfidenceAsProbability,
    scanL13HypothesisAsFinalTruth,
  ];
  for (const s of scanners) {
    const h = s(text);
    if (h) out.push(h);
  }
  return out;
}
