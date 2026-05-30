/**
 * L13.9 — Safety Scan Engine
 *
 * §13.9.9 / §13.9.10 — Walks the L13.9 forbidden / advice-adjacent
 * pattern catalogues against the styled-response corpus and emits
 * an `L13SafetyScanResult`. Mirrors the L13.8 context-awareness
 * rule: forbidden phrases quoted inside refusal / blocked-claim /
 * debug-internal corpora are recorded but do NOT block.
 */

import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import {
  L13SafetyBlockLevel,
  L13SafetyLanguageScope,
  L13SafetyMatchContextClass,
} from '../contracts/market-manipulation-pattern';
import {
  L13SafetyRiskClass,
  l13ReduceMaxSafetyRisk,
} from '../contracts/safety-risk-class';
import {
  L13SafetyAction,
  l13ActionForRiskClass,
  l13StrengthenSafetyAction,
} from '../contracts/safety-action';
import type {
  L13AdviceAdjacentHit,
  L13SafetyPhraseHit,
  L13SafetyScanResult,
} from '../contracts/safety-scan-result';
import {
  L13_ADVICE_ADJACENT_PATTERNS,
  L13_FORBIDDEN_FINANCIAL_PATTERNS,
} from './forbidden-financial-language';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.safety.v1';

function classifyBlockLevel(
  action: L13SafetyAction,
): L13SafetyBlockLevel {
  switch (action) {
    case L13SafetyAction.ALLOW:
    case L13SafetyAction.ALLOW_WITH_DISCLOSURE:
      return L13SafetyBlockLevel.NONE;
    case L13SafetyAction.REWRITE_REQUIRED:
      return L13SafetyBlockLevel.REWRITE;
    case L13SafetyAction.REFUSAL_REQUIRED:
      return L13SafetyBlockLevel.REFUSAL;
    case L13SafetyAction.BLOCK_OUTPUT:
    default:
      return L13SafetyBlockLevel.HARD_BLOCK;
  }
}

export interface L13SafetyScanInput {
  readonly output_id: string;
  readonly styled_response_ref: string;
  readonly product_answer_mode: L13ProductAnswerMode;
  readonly user_visible_corpus: string;
  readonly refusal_or_blocked_corpus?: string;
  readonly debug_corpus?: string;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
  /**
   * Languages this output may emit in. When provided, the scan
   * filters out patterns whose language is not in the set (the
   * default scope is all three supported languages so that
   * cross-lingual smuggling is still detected).
   */
  readonly language_scope?: readonly L13SafetyLanguageScope[];
}

function scanCorpus(
  corpus: string,
  context: L13SafetyMatchContextClass,
  blocks: boolean,
  scope: readonly L13SafetyLanguageScope[],
): {
  readonly phrase_hits: readonly L13SafetyPhraseHit[];
  readonly advice_hits: readonly L13AdviceAdjacentHit[];
  readonly risk_classes: readonly L13SafetyRiskClass[];
} {
  if (!corpus || corpus.trim().length === 0) {
    return { phrase_hits: [], advice_hits: [], risk_classes: [] };
  }
  const phrase_hits: L13SafetyPhraseHit[] = [];
  const advice_hits: L13AdviceAdjacentHit[] = [];
  const riskSet = new Set<L13SafetyRiskClass>();

  for (const entry of L13_FORBIDDEN_FINANCIAL_PATTERNS) {
    if (!scope.includes(entry.language)) continue;
    if (!entry.pattern.test(corpus)) continue;
    const blockLevel = blocks
      ? classifyBlockLevel(l13ActionForRiskClass(entry.risk_class))
      : L13SafetyBlockLevel.NONE;
    const hitId = fnv1a(
      [
        entry.family,
        entry.language,
        entry.canonical_phrase,
        context,
        String(blocks),
        POLICY_V,
      ].join('|'),
    );
    phrase_hits.push({
      safety_phrase_hit_id: `l13.safety.hit.${hitId}`,
      phrase_family: entry.family,
      matched_text: entry.canonical_phrase,
      normalized_match: entry.canonical_phrase.toLowerCase(),
      match_language: entry.language,
      match_context: context,
      direct_user_visible_assertion:
        context === L13SafetyMatchContextClass.USER_VISIBLE_ASSERTION,
      quoted_in_refusal_context:
        context === L13SafetyMatchContextClass.REFUSAL_EXPLANATION,
      quoted_in_blocked_claim_context:
        context === L13SafetyMatchContextClass.BLOCKED_CLAIM_RECORD,
      block_level: blockLevel,
      policy_version: POLICY_V,
    });
    if (blocks) {
      riskSet.add(entry.risk_class);
    }
  }
  for (const entry of L13_ADVICE_ADJACENT_PATTERNS) {
    if (!scope.includes(entry.language)) continue;
    if (!entry.pattern.test(corpus)) continue;
    const hitId = fnv1a(
      [
        entry.family,
        entry.language,
        entry.canonical_phrase,
        context,
        String(blocks),
        POLICY_V,
      ].join('|'),
    );
    advice_hits.push({
      advice_adjacent_hit_id: `l13.safety.adjacent.${hitId}`,
      phrase_family: entry.family,
      matched_text: entry.canonical_phrase,
      normalized_match: entry.canonical_phrase.toLowerCase(),
      match_language: entry.language,
      rewriteable: true,
      policy_version: POLICY_V,
    });
    if (blocks) {
      riskSet.add(L13SafetyRiskClass.ADVICE_ADJACENT_REWRITE_REQUIRED);
    }
  }
  return {
    phrase_hits,
    advice_hits,
    risk_classes: Array.from(riskSet),
  };
}

/**
 * §13.9.9 — Run the safety scan.
 */
export function runL13SafetyScan(
  input: L13SafetyScanInput,
): L13SafetyScanResult {
  const scope: readonly L13SafetyLanguageScope[] =
    input.language_scope ?? [
      L13SafetyLanguageScope.ENGLISH,
      L13SafetyLanguageScope.GERMAN,
      L13SafetyLanguageScope.SPANISH,
    ];

  const user = scanCorpus(
    input.user_visible_corpus,
    L13SafetyMatchContextClass.USER_VISIBLE_ASSERTION,
    true,
    scope,
  );
  const refusal = scanCorpus(
    input.refusal_or_blocked_corpus ?? '',
    L13SafetyMatchContextClass.REFUSAL_EXPLANATION,
    false,
    scope,
  );
  const debug = scanCorpus(
    input.debug_corpus ?? '',
    L13SafetyMatchContextClass.INTERNAL_DEBUG,
    false,
    scope,
  );

  const detected_phrase_hits: readonly L13SafetyPhraseHit[] = [
    ...user.phrase_hits,
    ...refusal.phrase_hits,
    ...debug.phrase_hits,
  ];
  const detected_advice_adjacent_hits: readonly L13AdviceAdjacentHit[] = [
    ...user.advice_hits,
    ...refusal.advice_hits,
    ...debug.advice_hits,
  ];

  const blockingRisks = user.risk_classes; // only user-visible scope contributes blocking risks
  const detected_risk_classes: readonly L13SafetyRiskClass[] =
    blockingRisks.length > 0
      ? blockingRisks
      : [L13SafetyRiskClass.SAFE_INFORMATIONAL];
  const highest_risk_class = l13ReduceMaxSafetyRisk(detected_risk_classes);

  let required_action: L13SafetyAction =
    l13ActionForRiskClass(highest_risk_class);
  for (const cls of detected_risk_classes) {
    required_action = l13StrengthenSafetyAction(
      required_action,
      l13ActionForRiskClass(cls),
    );
  }

  const block_required = required_action === L13SafetyAction.BLOCK_OUTPUT;
  const refusal_required =
    required_action === L13SafetyAction.REFUSAL_REQUIRED;
  const rewriteable =
    required_action === L13SafetyAction.REWRITE_REQUIRED;
  const multilingual_hits_present = detected_phrase_hits.some(
    h => h.match_language !== L13SafetyLanguageScope.ENGLISH,
  );

  const replayHash = fnv1a(
    [
      input.output_id,
      input.styled_response_ref,
      input.product_answer_mode,
      detected_phrase_hits
        .map(h => h.safety_phrase_hit_id)
        .sort()
        .join(','),
      detected_advice_adjacent_hits
        .map(h => h.advice_adjacent_hit_id)
        .sort()
        .join(','),
      detected_risk_classes.slice().sort().join(','),
      highest_risk_class,
      required_action,
      String(rewriteable),
      String(refusal_required),
      String(block_required),
      String(multilingual_hits_present),
      POLICY_V,
    ].join('|'),
  );

  return {
    safety_scan_id: `l13.safety.scan.${replayHash}`,
    output_id: input.output_id,
    styled_response_ref: input.styled_response_ref,
    scanned_text_refs: [
      `${input.output_id}:user_visible`,
      ...(input.refusal_or_blocked_corpus
        ? [`${input.output_id}:refusal`]
        : []),
      ...(input.debug_corpus ? [`${input.output_id}:debug`] : []),
    ],
    detected_risk_classes,
    detected_phrase_hits,
    detected_advice_adjacent_hits,
    highest_risk_class,
    required_action,
    rewriteable,
    refusal_required,
    block_required,
    multilingual_hits_present,
    output_mode_context: input.product_answer_mode,
    policy_version: POLICY_V,
    lineage_refs: input.lineage_refs ?? ['l13.safety.lineage'],
    replay_hash: replayHash,
  };
}
