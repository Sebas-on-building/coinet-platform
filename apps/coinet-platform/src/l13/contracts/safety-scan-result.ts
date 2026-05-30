/**
 * L13.9 — Safety Scan Result Contract
 *
 * §13.9.9 / §13.9.10 — Deterministic record of forbidden / advice-
 * adjacent phrase hits in the styled response corpus, plus the
 * highest-severity risk class and the required action.
 */

import type { L13ProductAnswerMode } from './product-answer-mode';
import type { L13SafetyAction } from './safety-action';
import type { L13SafetyRiskClass } from './safety-risk-class';
import type {
  L13AdviceAdjacentLanguageFamily,
  L13ForbiddenFinancialLanguageFamily,
  L13SafetyBlockLevel,
  L13SafetyLanguageScope,
  L13SafetyMatchContextClass,
} from './market-manipulation-pattern';

export interface L13SafetyPhraseHit {
  readonly safety_phrase_hit_id: string;
  readonly phrase_family: L13ForbiddenFinancialLanguageFamily;
  readonly matched_text: string;
  readonly normalized_match: string;
  readonly match_language: L13SafetyLanguageScope;
  readonly match_context: L13SafetyMatchContextClass;
  readonly direct_user_visible_assertion: boolean;
  readonly quoted_in_refusal_context: boolean;
  readonly quoted_in_blocked_claim_context: boolean;
  readonly block_level: L13SafetyBlockLevel;
  readonly policy_version: string;
}

export interface L13AdviceAdjacentHit {
  readonly advice_adjacent_hit_id: string;
  readonly phrase_family: L13AdviceAdjacentLanguageFamily;
  readonly matched_text: string;
  readonly normalized_match: string;
  readonly match_language: L13SafetyLanguageScope;
  readonly rewriteable: boolean;
  readonly policy_version: string;
}

export interface L13SafetyScanResult {
  readonly safety_scan_id: string;
  readonly output_id: string;
  readonly styled_response_ref: string;
  readonly scanned_text_refs: readonly string[];

  readonly detected_risk_classes: readonly L13SafetyRiskClass[];
  readonly detected_phrase_hits: readonly L13SafetyPhraseHit[];
  readonly detected_advice_adjacent_hits:
    readonly L13AdviceAdjacentHit[];

  readonly highest_risk_class: L13SafetyRiskClass;
  readonly required_action: L13SafetyAction;

  readonly rewriteable: boolean;
  readonly refusal_required: boolean;
  readonly block_required: boolean;

  readonly multilingual_hits_present: boolean;
  readonly output_mode_context: L13ProductAnswerMode;

  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
