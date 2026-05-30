/**
 * L13.9 — Guarantee / Certainty Detector
 *
 * §13.9.4 / §13.9.7 — Detects guaranteed-outcome language and
 * unsupported directional certainty in EN/DE/ES. Complements the
 * L13.5 expression-governance forbidden-certainty catalogue: this
 * scanner is the FINAL safety-boundary check, not a style check.
 */

import { L13SafetyLanguageScope } from '../contracts/market-manipulation-pattern';
import { L13SafetyReasonCode } from '../contracts/safety-reason-code';
import { L13SafetyRiskClass } from '../contracts/safety-risk-class';

interface PatternEntry {
  readonly pattern: RegExp;
  readonly canonical_phrase: string;
  readonly language: L13SafetyLanguageScope;
  /** GUARANTEED_OUTCOME_BLOCKED or UNSUPPORTED_CERTAINTY_BLOCKED. */
  readonly risk_class: L13SafetyRiskClass;
  readonly reason_code: L13SafetyReasonCode;
}

const PATTERNS: readonly PatternEntry[] = [
  // GUARANTEE_OUTCOME — strongest
  { pattern: /\bguaranteed\s+(move|outcome|to\s+(pump|dump|rally|drop))\b/i, canonical_phrase: 'guaranteed move', language: L13SafetyLanguageScope.ENGLISH, risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED, reason_code: L13SafetyReasonCode.REASON_GUARANTEED_OUTCOME },
  { pattern: /\bgarantierter?\s+move\b/i, canonical_phrase: 'garantierter move', language: L13SafetyLanguageScope.GERMAN, risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED, reason_code: L13SafetyReasonCode.REASON_GUARANTEED_OUTCOME },
  { pattern: /\bmovimiento\s+garantizado\b/i, canonical_phrase: 'movimiento garantizado', language: L13SafetyLanguageScope.SPANISH, risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED, reason_code: L13SafetyReasonCode.REASON_GUARANTEED_OUTCOME },

  // PUMP / DUMP prophecy
  { pattern: /\bthis\s+will\s+(pump|dump|moon|crash)\b/i, canonical_phrase: 'this will pump', language: L13SafetyLanguageScope.ENGLISH, risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED, reason_code: L13SafetyReasonCode.REASON_PUMP_DUMP_PROPHECY },
  { pattern: /\bguaranteed\s+to\s+(pump|dump)\b/i, canonical_phrase: 'guaranteed to pump', language: L13SafetyLanguageScope.ENGLISH, risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED, reason_code: L13SafetyReasonCode.REASON_PUMP_DUMP_PROPHECY },
  { pattern: /\bdas\s+wird\s+(pumpen|dumpen)\b/i, canonical_phrase: 'das wird pumpen', language: L13SafetyLanguageScope.GERMAN, risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED, reason_code: L13SafetyReasonCode.REASON_PUMP_DUMP_PROPHECY },
  { pattern: /\besto\s+va\s+a\s+(subir|caer)\s+seguro\b/i, canonical_phrase: 'esto va a subir seguro', language: L13SafetyLanguageScope.SPANISH, risk_class: L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED, reason_code: L13SafetyReasonCode.REASON_PUMP_DUMP_PROPHECY },

  // UNSUPPORTED_CERTAINTY — softer, rewriteable
  { pattern: /\balmost\s+certain\s+to\s+(go\s+up|go\s+down|rally|drop)\b/i, canonical_phrase: 'almost certain to go up', language: L13SafetyLanguageScope.ENGLISH, risk_class: L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED, reason_code: L13SafetyReasonCode.REASON_UNSUPPORTED_CERTAINTY },
  { pattern: /\bbullish\s+path\s+is\s+locked\s+in\b/i, canonical_phrase: 'bullish path is locked in', language: L13SafetyLanguageScope.ENGLISH, risk_class: L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED, reason_code: L13SafetyReasonCode.REASON_UNSUPPORTED_CERTAINTY },
  { pattern: /\bbullische\s+pfad\s+(steht\s+fest|ist\s+best[äa]tigt)\b/i, canonical_phrase: 'bullische pfad steht fest', language: L13SafetyLanguageScope.GERMAN, risk_class: L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED, reason_code: L13SafetyReasonCode.REASON_UNSUPPORTED_CERTAINTY },
  { pattern: /\bcamino\s+alcista\s+(asegurado|confirmado)\b/i, canonical_phrase: 'camino alcista asegurado', language: L13SafetyLanguageScope.SPANISH, risk_class: L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED, reason_code: L13SafetyReasonCode.REASON_UNSUPPORTED_CERTAINTY },
];

export interface L13GuaranteeCertaintyHit {
  readonly matched_phrase: string;
  readonly language: L13SafetyLanguageScope;
  readonly risk_class: L13SafetyRiskClass;
  readonly reason_code: L13SafetyReasonCode;
}

export interface L13GuaranteeCertaintyScan {
  readonly hits: readonly L13GuaranteeCertaintyHit[];
  readonly any_guarantee_hit: boolean;
  readonly any_certainty_hit: boolean;
}

export function detectL13GuaranteeCertainty(
  user_visible_corpus: string,
): L13GuaranteeCertaintyScan {
  if (!user_visible_corpus || user_visible_corpus.trim().length === 0) {
    return {
      hits: [],
      any_guarantee_hit: false,
      any_certainty_hit: false,
    };
  }
  const hits: L13GuaranteeCertaintyHit[] = [];
  let guarantee = false;
  let certainty = false;
  for (const entry of PATTERNS) {
    if (entry.pattern.test(user_visible_corpus)) {
      hits.push({
        matched_phrase: entry.canonical_phrase,
        language: entry.language,
        risk_class: entry.risk_class,
        reason_code: entry.reason_code,
      });
      if (
        entry.risk_class === L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED
      ) {
        guarantee = true;
      } else {
        certainty = true;
      }
    }
  }
  return {
    hits,
    any_guarantee_hit: guarantee,
    any_certainty_hit: certainty,
  };
}
