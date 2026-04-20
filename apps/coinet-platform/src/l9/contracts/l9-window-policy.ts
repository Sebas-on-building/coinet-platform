/**
 * L9.5 — Window Policy
 *
 * §9.5.4 — Canonical window types and doctrine. Every temporal
 * interpretation must operate inside an explicit window (§9.5.4.4
 * window-misuse ban).
 */

import { L9SequenceFamily } from './sequence-family';

/**
 * §9.5.4.2 — Canonical window classes. Nothing else may be used as a
 * first-class L9 temporal window class.
 */
export enum L9WindowClass {
  /** Outer bounds of the chain being evaluated. */
  SEQUENCE_WINDOW = 'SEQUENCE_WINDOW',
  /** Admissible lag spacing between leading and lagging signals. */
  LEAD_LAG_WINDOW = 'LEAD_LAG_WINDOW',
  /** Window within which a phase is considered to still govern. */
  PHASE_WINDOW = 'PHASE_WINDOW',
  /** Window over which earlier signal meaning decays. */
  DECAY_WINDOW = 'DECAY_WINDOW',
  /** Window of governed behavior after an anchored event. */
  POST_EVENT_WINDOW = 'POST_EVENT_WINDOW',
  /** Window inside which a signal may refresh its relevance. */
  REFRESH_WINDOW = 'REFRESH_WINDOW',
  /** Comparison window used to decide if a break is a change point. */
  CHANGE_POINT_COMPARISON_WINDOW = 'CHANGE_POINT_COMPARISON_WINDOW',
}

export const ALL_L9_WINDOW_CLASSES: readonly L9WindowClass[] =
  Object.values(L9WindowClass);

/**
 * §9.5.4.3 — Doctrine every window must declare. A window with any of
 * these fields missing is illegal.
 */
export interface L9WindowDoctrine {
  readonly window_class: L9WindowClass;
  /** Natural-time start, ISO8601. */
  readonly start: string;
  /** Natural-time end, ISO8601. Must be >= start. */
  readonly end: string;
  /** What this window is anchored to (ref). Null only for SEQUENCE_WINDOW. */
  readonly anchor_ref: string | null;
  /** Allowable drift in ms that still honors the anchor. */
  readonly allowable_drift_ms: number;
  /** Whether the window is still usable for historical replay. */
  readonly historically_legal: boolean;
  /** Expected freshness ceiling; data past this is treated as degraded. */
  readonly freshness_ceiling_ms: number;
  /** Whether late data may mutate the interpretation inside this window. */
  readonly late_data_may_reinterpret: boolean;
}

/**
 * §9.5.4.3 — Default window doctrine per class, per family. Values are
 * conservative and explicit — invariants compare against these, not
 * ad-hoc numbers scattered in engine code.
 */
export interface L9WindowPolicyEntry {
  readonly family: L9SequenceFamily;
  readonly window_class: L9WindowClass;
  readonly default_span_ms: number;
  readonly default_drift_ms: number;
  readonly default_freshness_ceiling_ms: number;
  readonly late_data_may_reinterpret: boolean;
  readonly historically_legal: boolean;
  /** Must have an explicit anchor_ref on emission. */
  readonly requires_anchor: boolean;
}

// Common durations for readability.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * §9.5.4.3 — Frozen default policy table. Families pick these up via
 * the window registry; engines must never hand-roll windows outside
 * this policy without a typed override.
 */
export const L9_DEFAULT_WINDOW_POLICIES: readonly L9WindowPolicyEntry[] = [
  // ACCUMULATION_TO_EXPANSION — long, patient windows
  policy(L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    L9WindowClass.SEQUENCE_WINDOW, 30 * DAY, 0, 2 * DAY, true, true, false),
  policy(L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    L9WindowClass.LEAD_LAG_WINDOW, 7 * DAY, 6 * HOUR, 12 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    L9WindowClass.PHASE_WINDOW, 14 * DAY, 12 * HOUR, DAY, false, true, true),
  policy(L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    L9WindowClass.DECAY_WINDOW, 21 * DAY, 0, DAY, false, true, false),
  policy(L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    L9WindowClass.REFRESH_WINDOW, 3 * DAY, HOUR, 6 * HOUR, false, true, true),
  policy(L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    L9WindowClass.CHANGE_POINT_COMPARISON_WINDOW, 7 * DAY, HOUR, 6 * HOUR,
    false, true, true),

  // NARRATIVE_LED — faster turnover
  policy(L9SequenceFamily.NARRATIVE_LED,
    L9WindowClass.SEQUENCE_WINDOW, 14 * DAY, 0, DAY, true, true, false),
  policy(L9SequenceFamily.NARRATIVE_LED,
    L9WindowClass.LEAD_LAG_WINDOW, 3 * DAY, 3 * HOUR, 6 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.NARRATIVE_LED,
    L9WindowClass.PHASE_WINDOW, 5 * DAY, 6 * HOUR, 12 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.NARRATIVE_LED,
    L9WindowClass.DECAY_WINDOW, 10 * DAY, 0, 12 * HOUR, false, true, false),
  policy(L9SequenceFamily.NARRATIVE_LED,
    L9WindowClass.REFRESH_WINDOW, 2 * DAY, 30 * MINUTE, 3 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.NARRATIVE_LED,
    L9WindowClass.CHANGE_POINT_COMPARISON_WINDOW, 3 * DAY, 30 * MINUTE,
    3 * HOUR, false, true, true),

  // LEVERAGE_AND_REFLEXIVITY — short, sharp windows
  policy(L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    L9WindowClass.SEQUENCE_WINDOW, 7 * DAY, 0, 6 * HOUR, true, true, false),
  policy(L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    L9WindowClass.LEAD_LAG_WINDOW, DAY, 15 * MINUTE, HOUR, false, true, true),
  policy(L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    L9WindowClass.PHASE_WINDOW, 2 * DAY, HOUR, 3 * HOUR, false, true, true),
  policy(L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    L9WindowClass.DECAY_WINDOW, 5 * DAY, 0, 4 * HOUR, false, true, false),
  policy(L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    L9WindowClass.REFRESH_WINDOW, 12 * HOUR, 15 * MINUTE, HOUR, false, true,
    true),
  policy(L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    L9WindowClass.CHANGE_POINT_COMPARISON_WINDOW, 2 * DAY, 15 * MINUTE, HOUR,
    false, true, true),

  // OVERHANG_AND_DIGESTION — post-event anchored
  policy(L9SequenceFamily.OVERHANG_AND_DIGESTION,
    L9WindowClass.SEQUENCE_WINDOW, 14 * DAY, 0, DAY, true, true, false),
  policy(L9SequenceFamily.OVERHANG_AND_DIGESTION,
    L9WindowClass.LEAD_LAG_WINDOW, 3 * DAY, HOUR, 3 * HOUR, false, true, true),
  policy(L9SequenceFamily.OVERHANG_AND_DIGESTION,
    L9WindowClass.PHASE_WINDOW, 7 * DAY, 6 * HOUR, 12 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.OVERHANG_AND_DIGESTION,
    L9WindowClass.DECAY_WINDOW, 14 * DAY, 0, 12 * HOUR, false, true, false),
  policy(L9SequenceFamily.OVERHANG_AND_DIGESTION,
    L9WindowClass.POST_EVENT_WINDOW, 7 * DAY, HOUR, 6 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.OVERHANG_AND_DIGESTION,
    L9WindowClass.REFRESH_WINDOW, 2 * DAY, 30 * MINUTE, 3 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.OVERHANG_AND_DIGESTION,
    L9WindowClass.CHANGE_POINT_COMPARISON_WINDOW, 5 * DAY, 30 * MINUTE,
    3 * HOUR, false, true, true),

  // ECOSYSTEM_ROTATION — medium patience
  policy(L9SequenceFamily.ECOSYSTEM_ROTATION,
    L9WindowClass.SEQUENCE_WINDOW, 21 * DAY, 0, DAY, true, true, false),
  policy(L9SequenceFamily.ECOSYSTEM_ROTATION,
    L9WindowClass.LEAD_LAG_WINDOW, 5 * DAY, 6 * HOUR, 12 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.ECOSYSTEM_ROTATION,
    L9WindowClass.PHASE_WINDOW, 10 * DAY, 12 * HOUR, DAY, false, true, true),
  policy(L9SequenceFamily.ECOSYSTEM_ROTATION,
    L9WindowClass.DECAY_WINDOW, 14 * DAY, 0, DAY, false, true, false),
  policy(L9SequenceFamily.ECOSYSTEM_ROTATION,
    L9WindowClass.REFRESH_WINDOW, 3 * DAY, 30 * MINUTE, 6 * HOUR, false, true,
    true),
  policy(L9SequenceFamily.ECOSYSTEM_ROTATION,
    L9WindowClass.CHANGE_POINT_COMPARISON_WINDOW, 7 * DAY, HOUR, 6 * HOUR,
    false, true, true),

  // SHOCK_AND_RECOVERY — post-event anchored, fast
  policy(L9SequenceFamily.SHOCK_AND_RECOVERY,
    L9WindowClass.SEQUENCE_WINDOW, 14 * DAY, 0, 6 * HOUR, true, true, false),
  policy(L9SequenceFamily.SHOCK_AND_RECOVERY,
    L9WindowClass.LEAD_LAG_WINDOW, 2 * DAY, 15 * MINUTE, HOUR, false, true,
    true),
  policy(L9SequenceFamily.SHOCK_AND_RECOVERY,
    L9WindowClass.PHASE_WINDOW, 5 * DAY, HOUR, 3 * HOUR, false, true, true),
  policy(L9SequenceFamily.SHOCK_AND_RECOVERY,
    L9WindowClass.DECAY_WINDOW, 7 * DAY, 0, 3 * HOUR, false, true, false),
  policy(L9SequenceFamily.SHOCK_AND_RECOVERY,
    L9WindowClass.POST_EVENT_WINDOW, 3 * DAY, 30 * MINUTE, 3 * HOUR, false,
    true, true),
  policy(L9SequenceFamily.SHOCK_AND_RECOVERY,
    L9WindowClass.REFRESH_WINDOW, DAY, 15 * MINUTE, HOUR, false, true, true),
  policy(L9SequenceFamily.SHOCK_AND_RECOVERY,
    L9WindowClass.CHANGE_POINT_COMPARISON_WINDOW, 2 * DAY, 15 * MINUTE, HOUR,
    false, true, true),
];

function policy(
  family: L9SequenceFamily,
  window_class: L9WindowClass,
  default_span_ms: number,
  default_drift_ms: number,
  default_freshness_ceiling_ms: number,
  requires_anchor: boolean,
  historically_legal: boolean,
  late_data_may_reinterpret: boolean,
): L9WindowPolicyEntry {
  return {
    family,
    window_class,
    default_span_ms,
    default_drift_ms,
    default_freshness_ceiling_ms,
    requires_anchor,
    historically_legal,
    late_data_may_reinterpret,
  };
}

/** §9.5.4.3 — Look up the default policy for `(family, class)`. */
export function getL9WindowPolicy(
  family: L9SequenceFamily,
  window_class: L9WindowClass,
): L9WindowPolicyEntry | undefined {
  return L9_DEFAULT_WINDOW_POLICIES.find(
    e => e.family === family && e.window_class === window_class,
  );
}

/** §9.5.4.3 — Is `window_class` legal for `family`? */
export function isL9WindowClassLegalForFamily(
  family: L9SequenceFamily,
  window_class: L9WindowClass,
): boolean {
  return getL9WindowPolicy(family, window_class) !== undefined;
}
