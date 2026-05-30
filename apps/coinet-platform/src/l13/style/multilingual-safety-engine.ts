/**
 * L13.8 — Multilingual Safety Engine
 *
 * §13.8.19 / §13.8.22 — Scans the styled output corpus and the
 * blocked-claim record corpus for cross-lingual safety pattern
 * hits. The engine distinguishes user-visible assertions from
 * authorized refusal/blocked-claim quotations.
 *
 * Returns a deterministic `L13MultilingualSafetyScan`.
 */

import {
  L13MultilingualPatternContextClass,
  L13MultilingualScanReadinessClass,
  type L13MultilingualSafetyHit,
  type L13MultilingualSafetyScan,
} from '../contracts/multilingual-safety-scan';
import type { L13ResolvedOutputLanguage } from '../contracts/language-profile';
import { L13_MULTILINGUAL_SAFETY_PATTERNS } from './multilingual-safety-patterns';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

export interface L13MultilingualSafetyScanInput {
  readonly output_id: string;
  readonly resolved_language: L13ResolvedOutputLanguage;
  /** Combined user-visible corpus (final styled display text). */
  readonly user_visible_corpus: string;
  /**
   * Optional refusal/blocked-claim corpus where forbidden phrases
   * MAY appear (in quotes / refusal explanations). Hits in this
   * corpus do NOT block — they are recorded with context class
   * REFUSAL_EXPLANATION / BLOCKED_CLAIM_RECORD.
   */
  readonly refusal_or_blocked_corpus?: string;
  /** Optional debug-only corpus (never user-emitted). */
  readonly debug_corpus?: string;
}

function scanCorpus(
  corpus: string,
  language: L13ResolvedOutputLanguage,
  context: L13MultilingualPatternContextClass,
  blocks: boolean,
): readonly L13MultilingualSafetyHit[] {
  if (!corpus || corpus.trim().length === 0) return [];
  const hits: L13MultilingualSafetyHit[] = [];
  for (const entry of L13_MULTILINGUAL_SAFETY_PATTERNS) {
    if (entry.pattern.test(corpus)) {
      const hitId = fnv1a(
        [
          entry.pattern_class,
          entry.language,
          entry.canonical_phrase,
          context,
          language,
          String(blocks),
        ].join('|'),
      );
      hits.push({
        hit_id: `l13.safety.hit.${hitId}`,
        pattern_class: entry.pattern_class,
        matched_language: entry.language,
        matched_phrase: entry.canonical_phrase,
        context_class: context,
        blocks_user_emission: blocks,
      });
    }
  }
  return hits;
}

/**
 * §13.8.19 — Run the multilingual safety scan. Pure function.
 */
export function runL13MultilingualSafetyScan(
  input: L13MultilingualSafetyScanInput,
): L13MultilingualSafetyScan {
  const userHits = scanCorpus(
    input.user_visible_corpus,
    input.resolved_language,
    L13MultilingualPatternContextClass.USER_VISIBLE_ASSERTION,
    true,
  );
  const refusalHits = scanCorpus(
    input.refusal_or_blocked_corpus ?? '',
    input.resolved_language,
    L13MultilingualPatternContextClass.REFUSAL_EXPLANATION,
    false,
  );
  const debugHits = scanCorpus(
    input.debug_corpus ?? '',
    input.resolved_language,
    L13MultilingualPatternContextClass.DEBUG_INTERNAL,
    false,
  );
  const all = [...userHits, ...refusalHits, ...debugHits];
  const blocking = all.filter(h => h.blocks_user_emission);

  let readiness: L13MultilingualScanReadinessClass;
  if (blocking.length > 0) {
    readiness = L13MultilingualScanReadinessClass.SAFETY_BLOCKED;
  } else if (refusalHits.length > 0 || debugHits.length > 0) {
    readiness =
      L13MultilingualScanReadinessClass.SAFETY_CLEAN_WITH_QUOTED_REFUSAL;
  } else {
    readiness = L13MultilingualScanReadinessClass.SAFETY_CLEAN;
  }

  const replayHash = fnv1a(
    [
      input.output_id,
      input.resolved_language,
      all.map(h => h.hit_id).join(','),
      readiness,
      POLICY_V,
    ].join('|'),
  );

  return {
    scan_id: `l13.safety.scan.${replayHash}`,
    output_id: input.output_id,
    resolved_language: input.resolved_language,
    hits: all,
    readiness,
    blocking_hits: blocking,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
