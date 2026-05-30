/**
 * L13.8 — Multilingual Safety Scan Contract
 *
 * §13.8.19 — §13.8.22 — Cross-lingual safety doctrine. The
 * scanner produces a deterministic record of pattern hits, the
 * context class in which each hit appeared, and whether the hit
 * blocks user emission.
 */

import type { L13ResolvedOutputLanguage } from './language-profile';

/**
 * §13.8.20 — Pattern family taxonomy.
 */
export enum L13MultilingualSafetyPatternClass {
  TRADE_ADVICE_DIRECT = 'TRADE_ADVICE_DIRECT',
  TRADE_ADVICE_INDIRECT = 'TRADE_ADVICE_INDIRECT',
  GUARANTEE_CERTAINTY = 'GUARANTEE_CERTAINTY',
  PUMP_DUMP_PROPHECY = 'PUMP_DUMP_PROPHECY',
  SCENARIO_AS_CERTAINTY = 'SCENARIO_AS_CERTAINTY',
  SCORE_AS_ACTION = 'SCORE_AS_ACTION',
  HYPE_INFLUENCER_STYLE = 'HYPE_INFLUENCER_STYLE',
}

export const ALL_L13_MULTILINGUAL_SAFETY_PATTERN_CLASSES:
  readonly L13MultilingualSafetyPatternClass[] =
  Object.values(L13MultilingualSafetyPatternClass);

/**
 * §13.8.22 — Context taxonomy. The scanner uses this to avoid
 * false positives when a forbidden phrase is QUOTED inside a
 * blocked-claim record or refusal explanation.
 */
export enum L13MultilingualPatternContextClass {
  USER_VISIBLE_ASSERTION = 'USER_VISIBLE_ASSERTION',
  REFUSAL_EXPLANATION = 'REFUSAL_EXPLANATION',
  BLOCKED_CLAIM_RECORD = 'BLOCKED_CLAIM_RECORD',
  DEBUG_INTERNAL = 'DEBUG_INTERNAL',
}

export const ALL_L13_MULTILINGUAL_PATTERN_CONTEXT_CLASSES:
  readonly L13MultilingualPatternContextClass[] =
  Object.values(L13MultilingualPatternContextClass);

/**
 * §13.8.21 — A single pattern hit.
 */
export interface L13MultilingualSafetyHit {
  readonly hit_id: string;
  readonly pattern_class: L13MultilingualSafetyPatternClass;
  readonly matched_language: L13ResolvedOutputLanguage;
  readonly matched_phrase: string;
  readonly context_class: L13MultilingualPatternContextClass;
  readonly blocks_user_emission: boolean;
}

export enum L13MultilingualScanReadinessClass {
  SAFETY_CLEAN = 'SAFETY_CLEAN',
  SAFETY_CLEAN_WITH_QUOTED_REFUSAL = 'SAFETY_CLEAN_WITH_QUOTED_REFUSAL',
  SAFETY_BLOCKED = 'SAFETY_BLOCKED',
}

export interface L13MultilingualSafetyScan {
  readonly scan_id: string;
  readonly output_id: string;
  readonly resolved_language: L13ResolvedOutputLanguage;
  readonly hits: readonly L13MultilingualSafetyHit[];
  readonly readiness: L13MultilingualScanReadinessClass;
  readonly blocking_hits: readonly L13MultilingualSafetyHit[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
