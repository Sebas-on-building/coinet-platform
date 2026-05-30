/**
 * L13.9 — Market Manipulation Detector
 *
 * §13.9.13 — Distinct from ordinary scenario / risk analysis.
 * Detects language that recommends artificial market impact:
 * coordinated price pushes, low-liquidity exploitation, narrative
 * engineering, liquidation-hunt coordination, deceptive
 * participation signaling.
 *
 * Legal: "Thin liquidity increases fragility."
 * Illegal: "Thin liquidity makes it easier to move price, so push then."
 */

import {
  L13MarketManipulationPatternClass,
  L13SafetyLanguageScope,
} from '../contracts/market-manipulation-pattern';
import { L13SafetyReasonCode } from '../contracts/safety-reason-code';
import { L13_MARKET_MANIPULATION_PATTERNS } from './forbidden-financial-language';

const REASON_BY_MANIPULATION:
  Readonly<Record<L13MarketManipulationPatternClass, L13SafetyReasonCode>> = {
  [L13MarketManipulationPatternClass.COORDINATED_PRICE_PUSH]:
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_COORDINATED_PUSH,
  [L13MarketManipulationPatternClass.LOW_LIQUIDITY_EXPLOITATION]:
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_LOW_LIQUIDITY,
  [L13MarketManipulationPatternClass.ARTIFICIAL_NARRATIVE_ENGINEERING]:
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_NARRATIVE_ENGINEERING,
  [L13MarketManipulationPatternClass.LIQUIDATION_HUNT_COORDINATION]:
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_LIQUIDATION_HUNT,
  [L13MarketManipulationPatternClass.DECEPTIVE_PARTICIPATION_SIGNALING]:
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_DECEPTIVE_SIGNALING,
};

export interface L13MarketManipulationHit {
  readonly manipulation_class: L13MarketManipulationPatternClass;
  readonly matched_phrase: string;
  readonly matched_language: L13SafetyLanguageScope;
  readonly reason_code: L13SafetyReasonCode;
}

export interface L13MarketManipulationScan {
  readonly hits: readonly L13MarketManipulationHit[];
  readonly any_hit_present: boolean;
}

export function detectL13MarketManipulation(
  user_visible_corpus: string,
): L13MarketManipulationScan {
  if (!user_visible_corpus || user_visible_corpus.trim().length === 0) {
    return { hits: [], any_hit_present: false };
  }
  const hits: L13MarketManipulationHit[] = [];
  const seen = new Set<string>();
  for (const entry of L13_MARKET_MANIPULATION_PATTERNS) {
    if (entry.pattern.test(user_visible_corpus)) {
      const key = `${entry.manipulation_class}|${entry.language}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        manipulation_class: entry.manipulation_class,
        matched_phrase: entry.canonical_phrase,
        matched_language: entry.language,
        reason_code: REASON_BY_MANIPULATION[entry.manipulation_class],
      });
    }
  }
  return { hits, any_hit_present: hits.length > 0 };
}
