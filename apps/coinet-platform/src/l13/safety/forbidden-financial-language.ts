/**
 * L13.9 — Forbidden Financial Language Catalogue
 *
 * §13.9.12 — Multilingual patterns for direct trade advice,
 * leverage / sizing / SL-TP instructions, liquidation targeting,
 * guarantees, pump/dump prophecy, tax/legal advice, and market
 * manipulation assistance.
 *
 * Coverage: English / German / Spanish.
 */

import {
  L13ForbiddenFinancialLanguageFamily,
  L13MarketManipulationPatternClass,
  L13SafetyLanguageScope,
} from '../contracts/market-manipulation-pattern';
import { L13SafetyRiskClass } from '../contracts/safety-risk-class';

const F = L13ForbiddenFinancialLanguageFamily;
const M = L13MarketManipulationPatternClass;
const EN = L13SafetyLanguageScope.ENGLISH;
const DE = L13SafetyLanguageScope.GERMAN;
const ES = L13SafetyLanguageScope.SPANISH;

export interface L13ForbiddenFinancialPattern {
  readonly family: L13ForbiddenFinancialLanguageFamily;
  readonly language: L13SafetyLanguageScope;
  readonly pattern: RegExp;
  readonly canonical_phrase: string;
  /** Highest single-pattern risk class. */
  readonly risk_class: L13SafetyRiskClass;
}

/**
 * §13.9.12 — Catalogue. Patterns are case-insensitive; word
 * boundaries are anchored to keep "buy" inside "buyer" from
 * false-matching.
 */
export const L13_FORBIDDEN_FINANCIAL_PATTERNS:
  readonly L13ForbiddenFinancialPattern[] = [
  // ── DIRECT_BUY ───────────────────────────────────────────────────
  { family: F.DIRECT_BUY, language: EN, pattern: /\bbuy\s+(now|here|the\s+dip|this)\b/i, canonical_phrase: 'buy now', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.DIRECT_BUY, language: EN, pattern: /\byou\s+should\s+buy\b/i, canonical_phrase: 'you should buy', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },
  { family: F.DIRECT_BUY, language: DE, pattern: /\bjetzt\s+kaufen\b/i, canonical_phrase: 'jetzt kaufen', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.DIRECT_BUY, language: DE, pattern: /\bdu\s+sollt(?:e|est)?\s+kaufen\b/i, canonical_phrase: 'du solltest kaufen', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },
  { family: F.DIRECT_BUY, language: ES, pattern: /\bcompra\s+(ahora|aquí|esto)\b/i, canonical_phrase: 'compra ahora', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.DIRECT_BUY, language: ES, pattern: /\bdeber[íi]as\s+comprar\b/i, canonical_phrase: 'deberías comprar', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },

  // ── DIRECT_SELL ──────────────────────────────────────────────────
  { family: F.DIRECT_SELL, language: EN, pattern: /\bsell\s+(now|here|the\s+top|this|before\s+the\s+unlock)\b/i, canonical_phrase: 'sell now', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.DIRECT_SELL, language: EN, pattern: /\byou\s+should\s+sell\b/i, canonical_phrase: 'you should sell', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },
  { family: F.DIRECT_SELL, language: DE, pattern: /\bjetzt\s+verkaufen\b/i, canonical_phrase: 'jetzt verkaufen', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.DIRECT_SELL, language: DE, pattern: /\bdu\s+sollt(?:e|est)?\s+verkaufen\b/i, canonical_phrase: 'du solltest verkaufen', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },
  { family: F.DIRECT_SELL, language: ES, pattern: /\bvende\s+(ahora|aquí|esto)\b/i, canonical_phrase: 'vende ahora', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.DIRECT_SELL, language: ES, pattern: /\bdeber[íi]as\s+vender\b/i, canonical_phrase: 'deberías vender', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },

  // ── DIRECT_HOLD ──────────────────────────────────────────────────
  { family: F.DIRECT_HOLD, language: EN, pattern: /\bhold\s+(this|through\s+volatility|through\s+the\s+dip)\b/i, canonical_phrase: 'hold this', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },
  { family: F.DIRECT_HOLD, language: DE, pattern: /\b(halte|halt)\s+(das|durch)\b/i, canonical_phrase: 'halte das', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },
  { family: F.DIRECT_HOLD, language: ES, pattern: /\bmant(?:én|en)\s+esto\b/i, canonical_phrase: 'mantén esto', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },

  // ── DIRECT_AVOID ─────────────────────────────────────────────────
  { family: F.DIRECT_AVOID, language: EN, pattern: /\bavoid\s+(this|the\s+asset)\b/i, canonical_phrase: 'avoid this', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },
  { family: F.DIRECT_AVOID, language: DE, pattern: /\bmeide\s+(das|diesen|diese)\b/i, canonical_phrase: 'meide das', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },
  { family: F.DIRECT_AVOID, language: ES, pattern: /\bevita\s+(esto|esta)\b/i, canonical_phrase: 'evita esto', risk_class: L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED },

  // ── LONG_SHORT_INSTRUCTION ───────────────────────────────────────
  { family: F.LONG_SHORT_INSTRUCTION, language: EN, pattern: /\bgo\s+(long|short)\b/i, canonical_phrase: 'go long', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.LONG_SHORT_INSTRUCTION, language: EN, pattern: /\blong\s+this\b/i, canonical_phrase: 'long this', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.LONG_SHORT_INSTRUCTION, language: EN, pattern: /\bshort\s+this\b/i, canonical_phrase: 'short this', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.LONG_SHORT_INSTRUCTION, language: DE, pattern: /\bgeh\s+(long|short)\b/i, canonical_phrase: 'geh long', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.LONG_SHORT_INSTRUCTION, language: ES, pattern: /\bponte\s+(largo|corto)\b/i, canonical_phrase: 'ponte largo', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },

  // ── ENTRY_EXIT_INSTRUCTION ───────────────────────────────────────
  { family: F.ENTRY_EXIT_INSTRUCTION, language: EN, pattern: /\b(enter|exit)\s+(here|now|before\s+the\s+unlock|the\s+trade)\b/i, canonical_phrase: 'enter here', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.ENTRY_EXIT_INSTRUCTION, language: DE, pattern: /\b(steig|geh)\s+hier\s+(ein|raus)\b/i, canonical_phrase: 'steig hier ein', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },
  { family: F.ENTRY_EXIT_INSTRUCTION, language: ES, pattern: /\b(entra|sal)\s+(aquí|ahora)\b/i, canonical_phrase: 'entra aquí', risk_class: L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED },

  // ── LEVERAGE_RECOMMENDATION ──────────────────────────────────────
  { family: F.LEVERAGE_RECOMMENDATION, language: EN, pattern: /\buse\s+\d+\s*x\s+leverage\b/i, canonical_phrase: 'use 10x leverage', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.LEVERAGE_RECOMMENDATION, language: EN, pattern: /\buse\s+leverage\b/i, canonical_phrase: 'use leverage', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.LEVERAGE_RECOMMENDATION, language: DE, pattern: /\bnutze\s+\d+\s*x\s+hebel\b/i, canonical_phrase: 'nutze 10x hebel', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.LEVERAGE_RECOMMENDATION, language: DE, pattern: /\b(nimm|nutze)\s+hebel\b/i, canonical_phrase: 'nimm hebel', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.LEVERAGE_RECOMMENDATION, language: ES, pattern: /\busa\s+\d+\s*x\s+apalancamiento\b/i, canonical_phrase: 'usa 10x apalancamiento', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.LEVERAGE_RECOMMENDATION, language: ES, pattern: /\busa\s+apalancamiento\b/i, canonical_phrase: 'usa apalancamiento', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },

  // ── POSITION_SIZING_RECOMMENDATION ───────────────────────────────
  { family: F.POSITION_SIZING_RECOMMENDATION, language: EN, pattern: /\bput\s+\d+%\s+(of\s+your\s+(account|portfolio)|in)\b/i, canonical_phrase: 'put 50% of your account', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.POSITION_SIZING_RECOMMENDATION, language: EN, pattern: /\bsize\s+up\b/i, canonical_phrase: 'size up', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.POSITION_SIZING_RECOMMENDATION, language: DE, pattern: /\berh[oö]he\s+die\s+position\b/i, canonical_phrase: 'erhöhe die position', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.POSITION_SIZING_RECOMMENDATION, language: ES, pattern: /\baumenta\s+la\s+posici[oó]n\b/i, canonical_phrase: 'aumenta la posición', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },

  // ── STOP_LOSS_TAKE_PROFIT_INSTRUCTION ────────────────────────────
  { family: F.STOP_LOSS_TAKE_PROFIT_INSTRUCTION, language: EN, pattern: /\bset\s+your\s+stop\s+(loss\s+)?at\b/i, canonical_phrase: 'set your stop at', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.STOP_LOSS_TAKE_PROFIT_INSTRUCTION, language: EN, pattern: /\btake\s+profit\s+at\b/i, canonical_phrase: 'take profit at', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.STOP_LOSS_TAKE_PROFIT_INSTRUCTION, language: DE, pattern: /\bsetz\s+den\s+stop\s+bei\b/i, canonical_phrase: 'setz den stop bei', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.STOP_LOSS_TAKE_PROFIT_INSTRUCTION, language: DE, pattern: /\bnimm\s+gewinn\s+bei\b/i, canonical_phrase: 'nimm gewinn bei', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.STOP_LOSS_TAKE_PROFIT_INSTRUCTION, language: ES, pattern: /\bpon\s+el\s+stop\s+en\b/i, canonical_phrase: 'pon el stop en', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },
  { family: F.STOP_LOSS_TAKE_PROFIT_INSTRUCTION, language: ES, pattern: /\btoma\s+ganancias\s+en\b/i, canonical_phrase: 'toma ganancias en', risk_class: L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED },

  // ── LIQUIDATION_TARGETING ────────────────────────────────────────
  { family: F.LIQUIDATION_TARGETING, language: EN, pattern: /\btarget\s+liquidations?\s+(at|near)\b/i, canonical_phrase: 'target liquidations at', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
  { family: F.LIQUIDATION_TARGETING, language: EN, pattern: /\bhunt\s+(the\s+)?liquidations?\b/i, canonical_phrase: 'hunt liquidations', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
  { family: F.LIQUIDATION_TARGETING, language: DE, pattern: /\bliquidationen?\s+ins\s+visier\b/i, canonical_phrase: 'liquidationen ins visier', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
  { family: F.LIQUIDATION_TARGETING, language: ES, pattern: /\bapuntar\s+a\s+liquidaciones\b/i, canonical_phrase: 'apuntar a liquidaciones', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },

  // ── GUARANTEE_OUTCOME ────────────────────────────────────────────
  { family: F.GUARANTEE_OUTCOME, language: EN, pattern: /\bguaranteed\s+(move|outcome|to\s+(pump|dump|rally|drop))\b/i, canonical_phrase: 'guaranteed move', risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED },
  { family: F.GUARANTEE_OUTCOME, language: DE, pattern: /\bgarantierter?\s+move\b/i, canonical_phrase: 'garantierter move', risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED },
  { family: F.GUARANTEE_OUTCOME, language: ES, pattern: /\bmovimiento\s+garantizado\b/i, canonical_phrase: 'movimiento garantizado', risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED },

  // ── PUMP_DUMP_PROPHECY ───────────────────────────────────────────
  { family: F.PUMP_DUMP_PROPHECY, language: EN, pattern: /\bthis\s+will\s+(pump|dump|moon|crash)\b/i, canonical_phrase: 'this will pump', risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED },
  { family: F.PUMP_DUMP_PROPHECY, language: EN, pattern: /\bguaranteed\s+to\s+(pump|dump)\b/i, canonical_phrase: 'guaranteed to pump', risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED },
  { family: F.PUMP_DUMP_PROPHECY, language: DE, pattern: /\bdas\s+wird\s+(pumpen|dumpen)\b/i, canonical_phrase: 'das wird pumpen', risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED },
  { family: F.PUMP_DUMP_PROPHECY, language: ES, pattern: /\besto\s+va\s+a\s+(subir|caer)\s+seguro\b/i, canonical_phrase: 'esto va a subir seguro', risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED },
  { family: F.PUMP_DUMP_PROPHECY, language: ES, pattern: /\bse\s+va\s+a\s+disparar\b/i, canonical_phrase: 'se va a disparar', risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED },

  // ── CERTAIN_DIRECTIONAL_OUTCOME ──────────────────────────────────
  { family: F.CERTAIN_DIRECTIONAL_OUTCOME, language: EN, pattern: /\balmost\s+certain\s+to\s+(go\s+up|go\s+down|rally|drop)\b/i, canonical_phrase: 'almost certain to go up', risk_class: L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED },
  { family: F.CERTAIN_DIRECTIONAL_OUTCOME, language: EN, pattern: /\bbullish\s+path\s+is\s+locked\s+in\b/i, canonical_phrase: 'bullish path is locked in', risk_class: L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED },
  { family: F.CERTAIN_DIRECTIONAL_OUTCOME, language: DE, pattern: /\bbullische\s+pfad\s+(steht\s+fest|ist\s+best[äa]tigt)\b/i, canonical_phrase: 'bullische pfad steht fest', risk_class: L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED },
  { family: F.CERTAIN_DIRECTIONAL_OUTCOME, language: ES, pattern: /\bcamino\s+alcista\s+(asegurado|confirmado)\b/i, canonical_phrase: 'camino alcista asegurado', risk_class: L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED },

  // ── TAX_LEGAL_ADVICE ─────────────────────────────────────────────
  { family: F.TAX_LEGAL_ADVICE, language: EN, pattern: /\bavoid\s+taxes\s+by\b/i, canonical_phrase: 'avoid taxes by', risk_class: L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED },
  { family: F.TAX_LEGAL_ADVICE, language: EN, pattern: /\byou\s+do\s+not\s+need\s+to\s+report\s+this\b/i, canonical_phrase: 'you do not need to report this', risk_class: L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED },
  { family: F.TAX_LEGAL_ADVICE, language: EN, pattern: /\bthis\s+trade\s+is\s+legally\s+safe\b/i, canonical_phrase: 'this trade is legally safe', risk_class: L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED },
  { family: F.TAX_LEGAL_ADVICE, language: DE, pattern: /\bsteuern\s+vermeiden\s+(durch|indem)\b/i, canonical_phrase: 'steuern vermeiden durch', risk_class: L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED },
  { family: F.TAX_LEGAL_ADVICE, language: ES, pattern: /\bevitar\s+impuestos\s+(con|mediante)\b/i, canonical_phrase: 'evitar impuestos con', risk_class: L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED },

  // ── MARKET_MANIPULATION_ASSISTANCE ───────────────────────────────
  { family: F.MARKET_MANIPULATION_ASSISTANCE, language: EN, pattern: /\bcoordinate\s+(buys?|sells?)\s+(before|to)\b/i, canonical_phrase: 'coordinate buys before', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
  { family: F.MARKET_MANIPULATION_ASSISTANCE, language: EN, pattern: /\b(use|exploit)\s+low[-\s]liquidity\s+(hours|window)\s+to\s+(push|move)\b/i, canonical_phrase: 'use low-liquidity hours to push', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
  { family: F.MARKET_MANIPULATION_ASSISTANCE, language: EN, pattern: /\b(spread|push)\s+the\s+narrative\s+before\s+(buying|selling)\b/i, canonical_phrase: 'spread the narrative before buying', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
  { family: F.MARKET_MANIPULATION_ASSISTANCE, language: EN, pattern: /\bsqueeze\s+(the\s+)?shorts?\b/i, canonical_phrase: 'squeeze the shorts', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
  { family: F.MARKET_MANIPULATION_ASSISTANCE, language: DE, pattern: /\bkoordiniere(n)?\s+k[äa]ufe\s+(vor|zu)\b/i, canonical_phrase: 'koordinierte käufe vor', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
  { family: F.MARKET_MANIPULATION_ASSISTANCE, language: ES, pattern: /\bcoordina(r)?\s+compras\s+(antes|para)\b/i, canonical_phrase: 'coordinar compras antes', risk_class: L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED },
];

/**
 * §13.9.13 — Market manipulation pattern catalogue. Distinct from
 * the family table above because the manipulation classifier
 * cares about WHICH manipulation pattern fired, not only that one
 * fired.
 */
export interface L13MarketManipulationPattern {
  readonly manipulation_class: L13MarketManipulationPatternClass;
  readonly language: L13SafetyLanguageScope;
  readonly pattern: RegExp;
  readonly canonical_phrase: string;
}

export const L13_MARKET_MANIPULATION_PATTERNS:
  readonly L13MarketManipulationPattern[] = [
  { manipulation_class: M.COORDINATED_PRICE_PUSH, language: EN, pattern: /\bcoordinate\s+(buys?|sells?)\s+(before|to)\b/i, canonical_phrase: 'coordinate buys before' },
  { manipulation_class: M.COORDINATED_PRICE_PUSH, language: DE, pattern: /\bkoordiniere(n)?\s+k[äa]ufe\b/i, canonical_phrase: 'koordinierte käufe' },
  { manipulation_class: M.COORDINATED_PRICE_PUSH, language: ES, pattern: /\bcoordina(r)?\s+compras\b/i, canonical_phrase: 'coordinar compras' },

  { manipulation_class: M.LOW_LIQUIDITY_EXPLOITATION, language: EN, pattern: /\b(use|exploit)\s+low[-\s]liquidity\s+(hours|window)\s+to\s+(push|move)\b/i, canonical_phrase: 'use low-liquidity hours to push' },
  { manipulation_class: M.LOW_LIQUIDITY_EXPLOITATION, language: DE, pattern: /\bin\s+niedriger\s+liquidit[äa]t\s+(dr[üu]cken|bewegen)\b/i, canonical_phrase: 'in niedriger liquidität drücken' },
  { manipulation_class: M.LOW_LIQUIDITY_EXPLOITATION, language: ES, pattern: /\bexplotar\s+(la\s+)?baja\s+liquidez\b/i, canonical_phrase: 'explotar la baja liquidez' },

  { manipulation_class: M.ARTIFICIAL_NARRATIVE_ENGINEERING, language: EN, pattern: /\bspread\s+(the\s+)?narrative\s+(before|to\s+attract)\b/i, canonical_phrase: 'spread the narrative before' },
  { manipulation_class: M.ARTIFICIAL_NARRATIVE_ENGINEERING, language: EN, pattern: /\bpump\s+(the\s+)?narrative\b/i, canonical_phrase: 'pump the narrative' },

  { manipulation_class: M.LIQUIDATION_HUNT_COORDINATION, language: EN, pattern: /\bhunt\s+(the\s+)?liquidations?\b/i, canonical_phrase: 'hunt liquidations' },
  { manipulation_class: M.LIQUIDATION_HUNT_COORDINATION, language: EN, pattern: /\bsqueeze\s+(the\s+)?shorts?\b/i, canonical_phrase: 'squeeze the shorts' },

  { manipulation_class: M.DECEPTIVE_PARTICIPATION_SIGNALING, language: EN, pattern: /\bspoof\s+the\s+(book|order\s+book|tape)\b/i, canonical_phrase: 'spoof the book' },
  { manipulation_class: M.DECEPTIVE_PARTICIPATION_SIGNALING, language: EN, pattern: /\bfake\s+(volume|participation)\b/i, canonical_phrase: 'fake volume' },
];

/**
 * §13.9.8 / §13.9.15.2 — Advice-adjacent (rewriteable) patterns.
 * These DON'T block outright; they flow through the rewriter and
 * re-enter governance.
 */
export interface L13AdviceAdjacentPattern {
  readonly family: import('../contracts/market-manipulation-pattern').L13AdviceAdjacentLanguageFamily;
  readonly language: L13SafetyLanguageScope;
  readonly pattern: RegExp;
  readonly canonical_phrase: string;
}

import { L13AdviceAdjacentLanguageFamily as A } from '../contracts/market-manipulation-pattern';

export const L13_ADVICE_ADJACENT_PATTERNS:
  readonly L13AdviceAdjacentPattern[] = [
  { family: A.BEST_SETUP_FRAMING, language: EN, pattern: /\b(cleanest|best)\s+(setup|trade)\s+(on\s+the\s+board|i\s+see)\b/i, canonical_phrase: 'cleanest setup on the board' },
  { family: A.BEST_ENTRY_FRAMING, language: EN, pattern: /\b(perfect|best)\s+entry\b/i, canonical_phrase: 'best entry' },
  { family: A.ACTIONABLE_SOUNDING_OPPORTUNITY, language: EN, pattern: /\blooks\s+like\s+a\s+nice\s+(long|short|entry|trade)\b/i, canonical_phrase: 'looks like a nice long' },
  { family: A.IMPLIED_ASSET_PREFERENCE, language: EN, pattern: /\b(asset\s+[a-z]|btc|eth|sol)\s+(looks|is)\s+more\s+attractive\s+to\s+(buy|trade)\b/i, canonical_phrase: 'asset A looks more attractive to buy' },
  { family: A.IMPLIED_EXECUTION_TIMING, language: EN, pattern: /\bnow\s+is\s+the\s+(time|moment)\s+to\s+(enter|long|short|buy|sell)\b/i, canonical_phrase: 'now is the time to enter' },
  { family: A.IMPLIED_ENTRY_BIAS, language: EN, pattern: /\bi\s+(would|might)\s+(get\s+long|get\s+short|enter\s+here)\b/i, canonical_phrase: 'i would get long' },
];
