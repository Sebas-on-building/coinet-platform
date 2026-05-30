/**
 * L13.8 — Verbosity Profile Contract
 *
 * §13.8.7 / §13.8.8 — Verbosity level taxonomy, reason codes, and
 * the resolution profile bound onto every style control plan.
 *
 * §13.8.10 — Disclosure floor law: brevity may never erase
 * required truth. The verbosity controller may raise verbosity
 * (e.g. MICRO → SHORT) when uncertainty / contradiction / trigger
 * / invalidation / restriction / drift / missing-data / confidence
 * cap must be preserved.
 */

export enum L13VerbosityLevel {
  MICRO = 'MICRO',
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  DEEP = 'DEEP',
  REPORT = 'REPORT',
}

export const ALL_L13_VERBOSITY_LEVELS: readonly L13VerbosityLevel[] =
  Object.values(L13VerbosityLevel);

/**
 * §13.8.10 — Deterministic verbosity rank. Higher = more verbose.
 */
export const L13_VERBOSITY_RANK:
  Readonly<Record<L13VerbosityLevel, number>> = {
  [L13VerbosityLevel.MICRO]: 0,
  [L13VerbosityLevel.SHORT]: 1,
  [L13VerbosityLevel.MEDIUM]: 2,
  [L13VerbosityLevel.DEEP]: 3,
  [L13VerbosityLevel.REPORT]: 4,
};

export function l13RankVerbosity(level: L13VerbosityLevel): number {
  return L13_VERBOSITY_RANK[level];
}

export function l13MaxVerbosity(
  a: L13VerbosityLevel,
  b: L13VerbosityLevel,
): L13VerbosityLevel {
  return l13RankVerbosity(a) >= l13RankVerbosity(b) ? a : b;
}

export enum L13VerbosityReasonCode {
  DEFAULT_SHORT_CHAT = 'DEFAULT_SHORT_CHAT',
  DEFAULT_STANDARD_CHAT = 'DEFAULT_STANDARD_CHAT',
  USER_REQUESTED_DEEP = 'USER_REQUESTED_DEEP',
  USER_REQUESTED_REPORT = 'USER_REQUESTED_REPORT',
  ALERT_MODE_COMPRESSION = 'ALERT_MODE_COMPRESSION',
  REPORT_MODE_EXPANSION = 'REPORT_MODE_EXPANSION',
  DISCLOSURE_FLOOR_UNCERTAINTY = 'DISCLOSURE_FLOOR_UNCERTAINTY',
  DISCLOSURE_FLOOR_CONTRADICTION = 'DISCLOSURE_FLOOR_CONTRADICTION',
  DISCLOSURE_FLOOR_TRIGGER_INVALIDATION = 'DISCLOSURE_FLOOR_TRIGGER_INVALIDATION',
  DISCLOSURE_FLOOR_RESTRICTION = 'DISCLOSURE_FLOOR_RESTRICTION',
  COMPARISON_REQUIRES_PARITY_DISCLOSURE = 'COMPARISON_REQUIRES_PARITY_DISCLOSURE',
}

export const ALL_L13_VERBOSITY_REASON_CODES:
  readonly L13VerbosityReasonCode[] =
  Object.values(L13VerbosityReasonCode);

export interface L13VerbosityResolutionProfile {
  readonly verbosity_resolution_id: string;
  readonly requested_verbosity?: L13VerbosityLevel;
  readonly default_verbosity: L13VerbosityLevel;
  readonly disclosure_floor_verbosity: L13VerbosityLevel;
  readonly resolved_verbosity: L13VerbosityLevel;
  readonly reason_codes: readonly L13VerbosityReasonCode[];
  readonly preferred_max_sentences?: number;
  readonly preferred_max_paragraphs?: number;
  readonly preferred_max_bullets?: number;
  readonly preferred_max_words?: number;
  readonly hard_max_words?: number;
  readonly hard_max_words_overridden_by_disclosure_floor: boolean;
  readonly deep_mode_explicitly_requested: boolean;
  readonly report_mode_explicitly_requested: boolean;
  readonly policy_version: string;
  readonly replay_hash: string;
}
