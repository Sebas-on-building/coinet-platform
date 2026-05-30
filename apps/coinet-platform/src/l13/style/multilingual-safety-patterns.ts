/**
 * L13.8 — Multilingual Safety Pattern Catalogue
 *
 * §13.8.20 / §13.8.21 — Cross-lingual pattern families covering
 * trade advice, certainty, pump/dump prophecy, score-as-action,
 * scenario-as-certainty, hype-influencer style. Patterns are
 * tagged with the matched language and pattern class.
 *
 * Coverage: English / German / Spanish.
 */

import {
  L13MultilingualSafetyPatternClass,
} from '../contracts/multilingual-safety-scan';
import { L13SupportedLanguage } from '../contracts/language-profile';

export interface L13MultilingualPattern {
  readonly pattern_class: L13MultilingualSafetyPatternClass;
  readonly language: L13SupportedLanguage;
  readonly pattern: RegExp;
  readonly canonical_phrase: string;
}

const C = L13MultilingualSafetyPatternClass;
const EN = L13SupportedLanguage.ENGLISH;
const DE = L13SupportedLanguage.GERMAN;
const ES = L13SupportedLanguage.SPANISH;

export const L13_MULTILINGUAL_SAFETY_PATTERNS:
  readonly L13MultilingualPattern[] = [
  // ── TRADE ADVICE DIRECT ──────────────────────────────────────────
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: EN, pattern: /\byou\s+should\s+(buy|sell|short|long|hold|avoid)\b/i, canonical_phrase: 'you should buy' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: EN, pattern: /\b(buy|sell|long|short)\s+(now|here|the\s+dip|the\s+top)\b/i, canonical_phrase: 'buy now' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: EN, pattern: /\bgo\s+(long|short)\b/i, canonical_phrase: 'go long' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: EN, pattern: /\benter\s+(now|the\s+trade)\b/i, canonical_phrase: 'enter now' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: EN, pattern: /\bavoid\s+this\b/i, canonical_phrase: 'avoid this' },

  { pattern_class: C.TRADE_ADVICE_DIRECT, language: DE, pattern: /\bdu\s+sollt(?:e|est)?\s+(kaufen|verkaufen|long\s+gehen|short\s+gehen|halten|meiden)\b/i, canonical_phrase: 'du solltest kaufen' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: DE, pattern: /\bjetzt\s+(kaufen|verkaufen|einsteigen|aussteigen)\b/i, canonical_phrase: 'jetzt kaufen' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: DE, pattern: /\bgeh\s+(long|short)\b/i, canonical_phrase: 'geh long' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: DE, pattern: /\bmeide\s+(das|diesen)\b/i, canonical_phrase: 'meide das' },

  { pattern_class: C.TRADE_ADVICE_DIRECT, language: ES, pattern: /\bdeber[íi]as\s+(comprar|vender|ponerte\s+(largo|corto)|salir|entrar)\b/i, canonical_phrase: 'deberías comprar' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: ES, pattern: /\b(compra|vende)\s+(ahora|aquí)\b/i, canonical_phrase: 'compra ahora' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: ES, pattern: /\bponte\s+(largo|corto)\b/i, canonical_phrase: 'ponte largo' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: ES, pattern: /\bentra\s+ahora\b/i, canonical_phrase: 'entra ahora' },
  { pattern_class: C.TRADE_ADVICE_DIRECT, language: ES, pattern: /\bevita\s+(esto|esta\s+moneda)\b/i, canonical_phrase: 'evita esto' },

  // ── TRADE ADVICE INDIRECT ────────────────────────────────────────
  { pattern_class: C.TRADE_ADVICE_INDIRECT, language: EN, pattern: /\bmy\s+(call|recommendation)\s+is\s+to\s+(buy|sell|long|short)\b/i, canonical_phrase: 'my call is to buy' },
  { pattern_class: C.TRADE_ADVICE_INDIRECT, language: DE, pattern: /\bmeine\s+empfehlung\s+ist\s+(kauf|verkauf)\b/i, canonical_phrase: 'meine empfehlung ist kauf' },
  { pattern_class: C.TRADE_ADVICE_INDIRECT, language: ES, pattern: /\bmi\s+recomendación\s+es\s+(comprar|vender)\b/i, canonical_phrase: 'mi recomendación es comprar' },

  // ── GUARANTEE / CERTAINTY ────────────────────────────────────────
  { pattern_class: C.GUARANTEE_CERTAINTY, language: EN, pattern: /\bguaranteed\b/i, canonical_phrase: 'guaranteed' },
  { pattern_class: C.GUARANTEE_CERTAINTY, language: EN, pattern: /\b(absolutely|definitely)\s+certain\b/i, canonical_phrase: 'absolutely certain' },
  { pattern_class: C.GUARANTEE_CERTAINTY, language: EN, pattern: /\blocked\s+in\b/i, canonical_phrase: 'locked in' },
  { pattern_class: C.GUARANTEE_CERTAINTY, language: EN, pattern: /\bwill\s+go\s+up\s+for\s+sure\b/i, canonical_phrase: 'will go up for sure' },

  { pattern_class: C.GUARANTEE_CERTAINTY, language: DE, pattern: /\bgarantiert\b/i, canonical_phrase: 'garantiert' },
  { pattern_class: C.GUARANTEE_CERTAINTY, language: DE, pattern: /\bsteht\s+fest\b/i, canonical_phrase: 'steht fest' },
  { pattern_class: C.GUARANTEE_CERTAINTY, language: DE, pattern: /\bist\s+best[äa]tigt\b/i, canonical_phrase: 'ist bestätigt' },
  { pattern_class: C.GUARANTEE_CERTAINTY, language: DE, pattern: /\bwird\s+sicher\s+(steigen|fallen)\b/i, canonical_phrase: 'wird sicher steigen' },

  { pattern_class: C.GUARANTEE_CERTAINTY, language: ES, pattern: /\bgarantizado\b/i, canonical_phrase: 'garantizado' },
  { pattern_class: C.GUARANTEE_CERTAINTY, language: ES, pattern: /\bestá\s+confirmado\b/i, canonical_phrase: 'está confirmado' },
  { pattern_class: C.GUARANTEE_CERTAINTY, language: ES, pattern: /\bva\s+a\s+(subir|caer)\s+seguro\b/i, canonical_phrase: 'va a subir seguro' },

  // ── PUMP / DUMP PROPHECY ─────────────────────────────────────────
  { pattern_class: C.PUMP_DUMP_PROPHECY, language: EN, pattern: /\bwill\s+pump\b/i, canonical_phrase: 'will pump' },
  { pattern_class: C.PUMP_DUMP_PROPHECY, language: EN, pattern: /\bwill\s+dump\b/i, canonical_phrase: 'will dump' },
  { pattern_class: C.PUMP_DUMP_PROPHECY, language: EN, pattern: /\bgoing\s+to\s+(pump|dump|moon|crash)\b/i, canonical_phrase: 'going to pump' },

  { pattern_class: C.PUMP_DUMP_PROPHECY, language: DE, pattern: /\bwird\s+pumpen\b/i, canonical_phrase: 'wird pumpen' },
  { pattern_class: C.PUMP_DUMP_PROPHECY, language: DE, pattern: /\bwird\s+(ab)?st[üu]rzen\b/i, canonical_phrase: 'wird abstürzen' },

  { pattern_class: C.PUMP_DUMP_PROPHECY, language: ES, pattern: /\bse\s+va\s+a\s+disparar\b/i, canonical_phrase: 'se va a disparar' },
  { pattern_class: C.PUMP_DUMP_PROPHECY, language: ES, pattern: /\bva\s+a\s+(reventar|colapsar|caer\s+fuerte)\b/i, canonical_phrase: 'va a colapsar' },

  // ── SCENARIO AS CERTAINTY ────────────────────────────────────────
  { pattern_class: C.SCENARIO_AS_CERTAINTY, language: EN, pattern: /\bscenario\s+is\s+(locked|confirmed|certain)\b/i, canonical_phrase: 'scenario is locked' },
  { pattern_class: C.SCENARIO_AS_CERTAINTY, language: DE, pattern: /\bszenario\s+ist\s+(best[äa]tigt|sicher)\b/i, canonical_phrase: 'szenario ist bestätigt' },
  { pattern_class: C.SCENARIO_AS_CERTAINTY, language: ES, pattern: /\bel\s+escenario\s+está\s+(confirmado|asegurado)\b/i, canonical_phrase: 'el escenario está confirmado' },

  // ── SCORE AS ACTION ──────────────────────────────────────────────
  { pattern_class: C.SCORE_AS_ACTION, language: EN, pattern: /\bscore\s+is\s+high(,?\s+so\s+(this|it)\s+is\s+a\s+buy)\b/i, canonical_phrase: 'score is high so this is a buy' },
  { pattern_class: C.SCORE_AS_ACTION, language: EN, pattern: /\b(opportunity|risk)\s+score\s+says\s+(buy|sell)\b/i, canonical_phrase: 'opportunity score says buy' },
  { pattern_class: C.SCORE_AS_ACTION, language: DE, pattern: /\b(score|opportunity)\s+ist\s+hoch,?\s+also\s+kaufen\b/i, canonical_phrase: 'score ist hoch, also kaufen' },
  { pattern_class: C.SCORE_AS_ACTION, language: ES, pattern: /\b(score|puntuación)\s+es\s+alta,?\s+así\s+que\s+comprar\b/i, canonical_phrase: 'score es alta, así que comprar' },

  // ── HYPE INFLUENCER STYLE ────────────────────────────────────────
  { pattern_class: C.HYPE_INFLUENCER_STYLE, language: EN, pattern: /\b(absolutely|literally)\s+exploding\b/i, canonical_phrase: 'absolutely exploding' },
  { pattern_class: C.HYPE_INFLUENCER_STYLE, language: EN, pattern: /\bto\s+the\s+moon\b/i, canonical_phrase: 'to the moon' },
  { pattern_class: C.HYPE_INFLUENCER_STYLE, language: DE, pattern: /\bzum\s+mond\b/i, canonical_phrase: 'zum mond' },
  { pattern_class: C.HYPE_INFLUENCER_STYLE, language: ES, pattern: /\ba\s+la\s+luna\b/i, canonical_phrase: 'a la luna' },
];
