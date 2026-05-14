/**
 * L11.6 — Expected Outcome Direction (§11.6.8)
 *
 * The semantic relation between a score and its outcome metric.
 * Distinct from L11.2's family-direction enum (which describes
 * how higher score values map to constructive vs dangerous
 * meaning) — this enum describes how the score is *expected* to
 * relate to the outcome value.
 */

import { L11ScoreFamily } from './score-family';
import {
  L11OutcomeMetric,
  L11OutcomeBetterDirection,
  getL11OutcomeMetricDefinition,
} from './outcome-metric';

export enum L11ExpectedOutcomeDirection {
  HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME = 'HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME',
  HIGHER_SCORE_SHOULD_CORRELATE_WITH_LOWER_OUTCOME = 'HIGHER_SCORE_SHOULD_CORRELATE_WITH_LOWER_OUTCOME',
  HIGHER_SCORE_SHOULD_CORRELATE_WITH_MORE_FREQUENT_EVENT = 'HIGHER_SCORE_SHOULD_CORRELATE_WITH_MORE_FREQUENT_EVENT',
  HIGHER_SCORE_SHOULD_CORRELATE_WITH_LESS_FREQUENT_EVENT = 'HIGHER_SCORE_SHOULD_CORRELATE_WITH_LESS_FREQUENT_EVENT',
  HIGHER_SCORE_SHOULD_CORRELATE_WITH_FASTER_CONFIRMATION = 'HIGHER_SCORE_SHOULD_CORRELATE_WITH_FASTER_CONFIRMATION',
  HIGHER_SCORE_SHOULD_CORRELATE_WITH_SLOWER_INVALIDATION = 'HIGHER_SCORE_SHOULD_CORRELATE_WITH_SLOWER_INVALIDATION',
  FAMILY_DEFINED = 'FAMILY_DEFINED',
}

export const ALL_L11_EXPECTED_OUTCOME_DIRECTIONS:
  readonly L11ExpectedOutcomeDirection[] =
  Object.values(L11ExpectedOutcomeDirection);

/**
 * Constructive families expect "higher score = higher outcome";
 * risk/danger families expect "higher score = lower outcome" (or
 * more-frequent risk events). The default mapping is overridable
 * per-target via the registry.
 */
export const L11_DEFAULT_EXPECTED_DIRECTION_BY_FAMILY:
  Readonly<Record<L11ScoreFamily, L11ExpectedOutcomeDirection>> = {
  [L11ScoreFamily.OPPORTUNITY]:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
  [L11ScoreFamily.RISK]:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
  [L11ScoreFamily.TIMING]:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_FASTER_CONFIRMATION,
  [L11ScoreFamily.THESIS_COHERENCE]:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
  [L11ScoreFamily.SIGNAL_CONFIDENCE]:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LESS_FREQUENT_EVENT,
  [L11ScoreFamily.MARKET_STRUCTURE]:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
  [L11ScoreFamily.WHALE_CONVICTION]:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
  [L11ScoreFamily.UNLOCK_RISK]:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME,
  // Reserved families remain FAMILY_DEFINED; no production targets
  // permitted for them.
  [L11ScoreFamily.NARRATIVE_QUALITY]: L11ExpectedOutcomeDirection.FAMILY_DEFINED,
  [L11ScoreFamily.FUNDAMENTAL_SUBSTANCE]: L11ExpectedOutcomeDirection.FAMILY_DEFINED,
  [L11ScoreFamily.LIQUIDITY_QUALITY]: L11ExpectedOutcomeDirection.FAMILY_DEFINED,
  [L11ScoreFamily.MANIPULATION_RISK]: L11ExpectedOutcomeDirection.FAMILY_DEFINED,
  [L11ScoreFamily.ECOSYSTEM_BETA]: L11ExpectedOutcomeDirection.FAMILY_DEFINED,
  [L11ScoreFamily.CONTINUATION_QUALITY]: L11ExpectedOutcomeDirection.FAMILY_DEFINED,
  [L11ScoreFamily.REVERSAL_RISK]: L11ExpectedOutcomeDirection.FAMILY_DEFINED,
};

/**
 * §11.6.8.3 — Expected direction must agree with the outcome
 * metric's `better_direction` and the score family's
 * constructive-vs-risk semantics. We encode this as a deterministic
 * compatibility predicate.
 *
 * Constructive families (OPPORTUNITY, TIMING, THESIS_COHERENCE,
 * SIGNAL_CONFIDENCE, MARKET_STRUCTURE, WHALE_CONVICTION):
 *   - HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME → metric better=HIGHER
 *   - HIGHER_SCORE_SHOULD_CORRELATE_WITH_LOWER_OUTCOME → metric better=LOWER
 *   - HIGHER_SCORE_SHOULD_CORRELATE_WITH_LESS_FREQUENT_EVENT → metric better=LOWER
 *   - HIGHER_SCORE_SHOULD_CORRELATE_WITH_FASTER_CONFIRMATION → metric better=LOWER (duration)
 *   - HIGHER_SCORE_SHOULD_CORRELATE_WITH_SLOWER_INVALIDATION → metric better=HIGHER (duration)
 *
 * Danger families (RISK, UNLOCK_RISK):
 *   - HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME on a LOWER_IS_BETTER metric
 *     ⇒ legal (high risk score → high drawdown is the danger semantic)
 *   - HIGHER_SCORE_SHOULD_CORRELATE_WITH_MORE_FREQUENT_EVENT ⇒ legal
 */
export function isL11ExpectedDirectionCompatible(
  family: L11ScoreFamily,
  metric: L11OutcomeMetric,
  direction: L11ExpectedOutcomeDirection,
): { ok: boolean; reason: string } {
  if (direction === L11ExpectedOutcomeDirection.FAMILY_DEFINED) {
    return { ok: false, reason: 'FAMILY_DEFINED is not a production direction' };
  }
  const def = getL11OutcomeMetricDefinition(metric);
  if (!def) return { ok: false, reason: `unknown metric ${metric}` };
  if (!def.allowed_score_families.includes(family)) {
    return {
      ok: false,
      reason: `metric ${metric} not allowed for family ${family}`,
    };
  }
  const isDangerFamily =
    family === L11ScoreFamily.RISK || family === L11ScoreFamily.UNLOCK_RISK;
  switch (direction) {
    case L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME:
      // For constructive families: metric must be HIGHER_IS_BETTER.
      // For danger families: metric must be LOWER_IS_BETTER (the
      //   "outcome" value goes up = more danger; that's good
      //   calibration evidence for a danger score).
      if (isDangerFamily) {
        return def.better_direction === L11OutcomeBetterDirection.LOWER_IS_BETTER
          ? { ok: true, reason: 'ok' }
          : {
            ok: false,
            reason: `danger family ${family} with HIGHER outcome direction needs LOWER_IS_BETTER metric`,
          };
      }
      return def.better_direction === L11OutcomeBetterDirection.HIGHER_IS_BETTER
        ? { ok: true, reason: 'ok' }
        : { ok: false, reason: `constructive family ${family} expects HIGHER_IS_BETTER metric` };

    case L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LOWER_OUTCOME:
      if (isDangerFamily) {
        return {
          ok: false,
          reason: `danger family ${family} cannot expect HIGHER score → LOWER outcome`,
        };
      }
      return def.better_direction === L11OutcomeBetterDirection.LOWER_IS_BETTER
        ? { ok: true, reason: 'ok' }
        : {
          ok: false,
          reason: `LOWER expected direction needs LOWER_IS_BETTER metric`,
        };

    case L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_MORE_FREQUENT_EVENT:
      // Only legal when metric better_direction is LOWER (events
      // are bad and danger family expects more of them).
      if (!isDangerFamily) {
        return {
          ok: false,
          reason: `MORE_FREQUENT direction reserved for danger families`,
        };
      }
      return def.better_direction === L11OutcomeBetterDirection.LOWER_IS_BETTER
        ? { ok: true, reason: 'ok' }
        : {
          ok: false,
          reason: `MORE_FREQUENT direction needs LOWER_IS_BETTER (event) metric`,
        };

    case L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LESS_FREQUENT_EVENT:
      return def.better_direction === L11OutcomeBetterDirection.LOWER_IS_BETTER
        ? { ok: true, reason: 'ok' }
        : {
          ok: false,
          reason: `LESS_FREQUENT direction needs LOWER_IS_BETTER (event) metric`,
        };

    case L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_FASTER_CONFIRMATION:
      // Faster = lower DURATION_MS, so metric LOWER_IS_BETTER.
      return def.better_direction === L11OutcomeBetterDirection.LOWER_IS_BETTER
        ? { ok: true, reason: 'ok' }
        : {
          ok: false,
          reason: `FASTER_CONFIRMATION needs LOWER_IS_BETTER metric (lower duration is better)`,
        };

    case L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_SLOWER_INVALIDATION:
      return def.better_direction === L11OutcomeBetterDirection.HIGHER_IS_BETTER
        ? { ok: true, reason: 'ok' }
        : {
          ok: false,
          reason: `SLOWER_INVALIDATION needs HIGHER_IS_BETTER metric (longer duration is better)`,
        };

    default:
      return { ok: false, reason: `unhandled direction ${direction}` };
  }
}

/**
 * §11.6.8.3 — Detect causality / judgment leakage in target
 * descriptions. Calibration descriptions may declare expectation,
 * not certainty.
 */
const FORBIDDEN_CAUSALITY_PHRASES: readonly RegExp[] = [
  /\bcaus(?:ed|es|ing|ation)\b/i,
  /\bguarantee(?:s|d|ing)?\b/i,
  /\b(?:always|never|definitely|certainly)\b/i,
  /\bproves?\b/i,
  /\bbuy|sell|long|short|enter|exit\b/i,
  /\b(?:safest|best trade|trade now|execute trade)\b/i,
];

export function isL11CalibrationDescriptionCausalityFree(
  description: string,
): { ok: boolean; reason: string } {
  for (const rx of FORBIDDEN_CAUSALITY_PHRASES) {
    if (rx.test(description)) {
      return { ok: false, reason: `description matches forbidden pattern ${rx}` };
    }
  }
  return { ok: true, reason: 'ok' };
}
