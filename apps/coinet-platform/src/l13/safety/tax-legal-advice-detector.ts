/**
 * L13.9 — Tax / Legal Advice Detector
 *
 * §13.9.23 — Detects user-visible language that crosses into tax
 * or legal counsel. Outputs:
 *   - tax_advice_detected
 *   - legal_advice_detected
 *   - matched phrases + reason codes
 *
 * Boundary disclosure is legal: "Tax and legal treatment can vary
 * by jurisdiction; Layer 13 cannot determine that from market
 * evidence." Direct prescriptions are not.
 */

import { L13SafetyReasonCode } from '../contracts/safety-reason-code';

interface PatternEntry {
  readonly pattern: RegExp;
  readonly canonical_phrase: string;
  readonly category: 'TAX' | 'LEGAL';
}

const PATTERNS: readonly PatternEntry[] = [
  // TAX
  { pattern: /\bavoid\s+(taxes|paying\s+tax)\s+by\b/i, canonical_phrase: 'avoid taxes by', category: 'TAX' },
  { pattern: /\byou\s+(don'?t|do\s+not)\s+need\s+to\s+report\s+this\b/i, canonical_phrase: 'you do not need to report this', category: 'TAX' },
  { pattern: /\bstructure\s+this\s+(to|so\s+that)\s+(avoid|reduce)\s+tax(?:es)?\b/i, canonical_phrase: 'structure this to avoid taxes', category: 'TAX' },
  { pattern: /\bskip\s+(the\s+)?(capital\s+gains|tax)\b/i, canonical_phrase: 'skip capital gains', category: 'TAX' },
  // LEGAL
  { pattern: /\bthis\s+trade\s+is\s+legally\s+safe\b/i, canonical_phrase: 'this trade is legally safe', category: 'LEGAL' },
  { pattern: /\b(no|not)\s+legal\s+risk\b/i, canonical_phrase: 'no legal risk', category: 'LEGAL' },
  { pattern: /\bthis\s+is\s+legal\s+to\s+do\b/i, canonical_phrase: 'this is legal to do', category: 'LEGAL' },
  { pattern: /\bregulators\s+(can|will)\s+not\s+(touch|pursue)\b/i, canonical_phrase: 'regulators will not touch', category: 'LEGAL' },
];

export interface L13TaxLegalAdviceHit {
  readonly matched_phrase: string;
  readonly category: 'TAX' | 'LEGAL';
  readonly reason_code: L13SafetyReasonCode;
}

export interface L13TaxLegalAdviceScan {
  readonly hits: readonly L13TaxLegalAdviceHit[];
  readonly tax_advice_detected: boolean;
  readonly legal_advice_detected: boolean;
}

export function detectL13TaxLegalAdvice(
  user_visible_corpus: string,
): L13TaxLegalAdviceScan {
  if (!user_visible_corpus || user_visible_corpus.trim().length === 0) {
    return {
      hits: [],
      tax_advice_detected: false,
      legal_advice_detected: false,
    };
  }
  const hits: L13TaxLegalAdviceHit[] = [];
  let tax = false;
  let legal = false;
  for (const entry of PATTERNS) {
    if (entry.pattern.test(user_visible_corpus)) {
      const reason =
        entry.category === 'TAX'
          ? L13SafetyReasonCode.REASON_TAX_ADVICE
          : L13SafetyReasonCode.REASON_LEGAL_ADVICE;
      hits.push({
        matched_phrase: entry.canonical_phrase,
        category: entry.category,
        reason_code: reason,
      });
      if (entry.category === 'TAX') tax = true;
      else legal = true;
    }
  }
  return {
    hits,
    tax_advice_detected: tax,
    legal_advice_detected: legal,
  };
}
