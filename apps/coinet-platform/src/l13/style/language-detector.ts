/**
 * L13.8 — Language Detector
 *
 * §13.8.16 — Lightweight deterministic heuristic over English /
 * German / Spanish. Uses a small stopword + diacritic catalogue;
 * does NOT make external network calls. Returns the dominant
 * supported language detected, or `undefined` when no signal is
 * strong enough.
 */

import { L13SupportedLanguage } from '../contracts/language-profile';

const GERMAN_SIGNALS: readonly RegExp[] = [
  /\bder\b/i,
  /\bdie\b/i,
  /\bdas\b/i,
  /\bund\b/i,
  /\bnicht\b/i,
  /\baber\b/i,
  /\bist\b/i,
  /\bauch\b/i,
  /\bohne\b/i,
  /\bwerden\b/i,
  /\bsoll(?:te|test)?\b/i,
  /\bkaufen\b/i,
  /\bverkaufen\b/i,
  /\bgarantiert\b/i,
  /[äöüß]/,
];

const SPANISH_SIGNALS: readonly RegExp[] = [
  /\bel\b/i,
  /\bla\b/i,
  /\blos\b/i,
  /\blas\b/i,
  /\by\b/i,
  /\bcon\b/i,
  /\bpara\b/i,
  /\bpero\b/i,
  /\bestá\b/i,
  /\bcomprar\b/i,
  /\bvender\b/i,
  /\bgarantizado\b/i,
  /[ñáéíóú]/,
];

const ENGLISH_SIGNALS: readonly RegExp[] = [
  /\bthe\b/i,
  /\band\b/i,
  /\bis\b/i,
  /\bof\b/i,
  /\bto\b/i,
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bshould\b/i,
  /\bguaranteed\b/i,
];

function score(text: string, sigs: readonly RegExp[]): number {
  let n = 0;
  for (const r of sigs) if (r.test(text)) n += 1;
  return n;
}

/**
 * §13.8.16 — Detect dominant language. Pure function.
 * Returns `undefined` when the text is empty or no language wins
 * unambiguously (the resolution engine then falls back to product
 * locale or English per §13.8.17.1).
 */
export function detectL13Language(
  text: string,
): L13SupportedLanguage | undefined {
  if (!text || text.trim().length === 0) return undefined;
  const t = text;
  const scores: Array<{ lang: L13SupportedLanguage; score: number }> = [
    { lang: L13SupportedLanguage.GERMAN, score: score(t, GERMAN_SIGNALS) },
    {
      lang: L13SupportedLanguage.SPANISH,
      score: score(t, SPANISH_SIGNALS),
    },
    {
      lang: L13SupportedLanguage.ENGLISH,
      score: score(t, ENGLISH_SIGNALS),
    },
  ];
  scores.sort((a, b) => b.score - a.score);
  if (scores[0].score === 0) return undefined;
  if (scores[0].score === scores[1].score) {
    // Ambiguous; prefer English as the safe default fallback.
    return L13SupportedLanguage.ENGLISH;
  }
  return scores[0].lang;
}

/**
 * §13.8.16 — Whether two languages are different supported
 * languages (used to detect unauthorized code-switching).
 */
export function l13DifferentSupportedLanguage(
  a: L13SupportedLanguage,
  b: L13SupportedLanguage,
): boolean {
  return a !== b;
}
