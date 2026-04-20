/**
 * L9.5 — Temporal Surfaces
 *
 * §9.5.3 — The canonical time-surface vocabulary used across every
 * temporal interpretation. These surfaces may not be collapsed into a
 * single generic "timestamp" field (§9.5.3.5 time-collapse ban).
 */

/**
 * §9.5.3.1 — The 11 canonical time surfaces Layer 9 must distinguish.
 */
export enum L9TemporalSurface {
  /** Market-time at which the underlying signal/event occurred. */
  OBSERVED_AT = 'OBSERVED_AT',
  /** System-time at which the underlying input was received/persisted. */
  INGESTED_AT = 'INGESTED_AT',
  /** The time the sequence engine is answering for. */
  AS_OF = 'AS_OF',
  /** Time at which a temporal interpretation becomes legally active. */
  EFFECTIVE_AT = 'EFFECTIVE_AT',
  /** Outer lower bound of the evaluated chain. */
  SEQUENCE_WINDOW_START = 'SEQUENCE_WINDOW_START',
  /** Outer upper bound of the evaluated chain. */
  SEQUENCE_WINDOW_END = 'SEQUENCE_WINDOW_END',
  /** Anchor time of the leading element in a lead-lag pair/chain. */
  LEAD_SIGNAL_AT = 'LEAD_SIGNAL_AT',
  /** Anchor time of the lagging element in a lead-lag pair/chain. */
  LAG_SIGNAL_AT = 'LAG_SIGNAL_AT',
  /** Time at which a governed temporal break occurs. */
  CHANGE_POINT_AT = 'CHANGE_POINT_AT',
  /** Lower bound of a governed post-event behavior window. */
  POST_EVENT_WINDOW_START = 'POST_EVENT_WINDOW_START',
  /** Upper bound of a governed post-event behavior window. */
  POST_EVENT_WINDOW_END = 'POST_EVENT_WINDOW_END',
}

export const ALL_L9_TEMPORAL_SURFACES: readonly L9TemporalSurface[] =
  Object.values(L9TemporalSurface);

/**
 * §9.5.3.4 — Which comparison class a surface naturally participates in.
 * This is used by the interaction validator to reject nonsensical
 * comparisons (e.g. comparing `INGESTED_AT` against `CHANGE_POINT_AT`
 * as if they were both market-time events).
 */
export enum L9TemporalSurfaceKind {
  /** Market-time event timestamps. */
  MARKET_TIME = 'MARKET_TIME',
  /** System ingestion/persistence timestamps. */
  SYSTEM_TIME = 'SYSTEM_TIME',
  /** Engine answering/activation timestamps. */
  ENGINE_TIME = 'ENGINE_TIME',
  /** Window bounds (market-time scoped). */
  WINDOW_BOUND = 'WINDOW_BOUND',
}

export const ALL_L9_TEMPORAL_SURFACE_KINDS:
  readonly L9TemporalSurfaceKind[] =
    Object.values(L9TemporalSurfaceKind);

/**
 * §9.5.3 — Canonical kind of each surface. Any comparison must either
 * stay within one kind or use a declared cross-kind rule.
 */
export const L9_TEMPORAL_SURFACE_KIND:
  Readonly<Record<L9TemporalSurface, L9TemporalSurfaceKind>> = {
    [L9TemporalSurface.OBSERVED_AT]: L9TemporalSurfaceKind.MARKET_TIME,
    [L9TemporalSurface.INGESTED_AT]: L9TemporalSurfaceKind.SYSTEM_TIME,
    [L9TemporalSurface.AS_OF]: L9TemporalSurfaceKind.ENGINE_TIME,
    [L9TemporalSurface.EFFECTIVE_AT]: L9TemporalSurfaceKind.ENGINE_TIME,
    [L9TemporalSurface.SEQUENCE_WINDOW_START]:
      L9TemporalSurfaceKind.WINDOW_BOUND,
    [L9TemporalSurface.SEQUENCE_WINDOW_END]:
      L9TemporalSurfaceKind.WINDOW_BOUND,
    [L9TemporalSurface.LEAD_SIGNAL_AT]: L9TemporalSurfaceKind.MARKET_TIME,
    [L9TemporalSurface.LAG_SIGNAL_AT]: L9TemporalSurfaceKind.MARKET_TIME,
    [L9TemporalSurface.CHANGE_POINT_AT]: L9TemporalSurfaceKind.MARKET_TIME,
    [L9TemporalSurface.POST_EVENT_WINDOW_START]:
      L9TemporalSurfaceKind.WINDOW_BOUND,
    [L9TemporalSurface.POST_EVENT_WINDOW_END]:
      L9TemporalSurfaceKind.WINDOW_BOUND,
  };

/**
 * §9.5.3.2 — A temporal reading — the bundle of time surfaces that a
 * given L9 temporal computation carries. Every field is `string | null`
 * so missing surfaces are represented honestly rather than collapsed
 * into a substitute.
 */
export interface L9TemporalReading {
  readonly observed_at: string | null;
  readonly ingested_at: string | null;
  readonly as_of: string;
  readonly effective_at: string | null;
  readonly sequence_window_start: string | null;
  readonly sequence_window_end: string | null;
  readonly lead_signal_at: string | null;
  readonly lag_signal_at: string | null;
  readonly change_point_at: string | null;
  readonly post_event_window_start: string | null;
  readonly post_event_window_end: string | null;
}

/**
 * §9.5.3.4 — Which surfaces a given comparison purpose should use. Used
 * by the time-surface validator to reject e.g. lead-lag math computed
 * from `INGESTED_AT`.
 */
export enum L9TemporalComparisonPurpose {
  LEAD_LAG_SPACING = 'LEAD_LAG_SPACING',
  PHASE_PROGRESSION = 'PHASE_PROGRESSION',
  CHANGE_POINT_BREAK = 'CHANGE_POINT_BREAK',
  DECAY_ELAPSED = 'DECAY_ELAPSED',
  POST_EVENT_WINDOW = 'POST_EVENT_WINDOW',
  REPLAY_CONSISTENCY = 'REPLAY_CONSISTENCY',
}

export const ALL_L9_TEMPORAL_COMPARISON_PURPOSES:
  readonly L9TemporalComparisonPurpose[] =
    Object.values(L9TemporalComparisonPurpose);

/**
 * §9.5.3.4 — Legal surfaces per comparison purpose. Any purpose that
 * uses a surface outside this set is an L9.5 semantic violation.
 */
export const L9_LEGAL_SURFACES_PER_PURPOSE:
  Readonly<Record<L9TemporalComparisonPurpose, readonly L9TemporalSurface[]>> = {
    [L9TemporalComparisonPurpose.LEAD_LAG_SPACING]: [
      L9TemporalSurface.OBSERVED_AT,
      L9TemporalSurface.LEAD_SIGNAL_AT,
      L9TemporalSurface.LAG_SIGNAL_AT,
    ],
    [L9TemporalComparisonPurpose.PHASE_PROGRESSION]: [
      L9TemporalSurface.OBSERVED_AT,
      L9TemporalSurface.AS_OF,
      L9TemporalSurface.SEQUENCE_WINDOW_START,
      L9TemporalSurface.SEQUENCE_WINDOW_END,
    ],
    [L9TemporalComparisonPurpose.CHANGE_POINT_BREAK]: [
      L9TemporalSurface.OBSERVED_AT,
      L9TemporalSurface.CHANGE_POINT_AT,
    ],
    [L9TemporalComparisonPurpose.DECAY_ELAPSED]: [
      L9TemporalSurface.OBSERVED_AT,
      L9TemporalSurface.AS_OF,
    ],
    [L9TemporalComparisonPurpose.POST_EVENT_WINDOW]: [
      L9TemporalSurface.POST_EVENT_WINDOW_START,
      L9TemporalSurface.POST_EVENT_WINDOW_END,
      L9TemporalSurface.AS_OF,
      L9TemporalSurface.OBSERVED_AT,
    ],
    [L9TemporalComparisonPurpose.REPLAY_CONSISTENCY]: [
      L9TemporalSurface.AS_OF,
      L9TemporalSurface.EFFECTIVE_AT,
    ],
  };

/** §9.5.3.4 — Is `surface` a legal participant in `purpose`? */
export function isLegalL9SurfaceForPurpose(
  purpose: L9TemporalComparisonPurpose,
  surface: L9TemporalSurface,
): boolean {
  return L9_LEGAL_SURFACES_PER_PURPOSE[purpose].includes(surface);
}

/**
 * §9.5.3.3 — Temporal-honesty scan over a reading. Returns an array of
 * codes naming each collapse found. The empty array means the reading
 * honors §9.5.3.3 / §9.5.3.5.
 */
export function scanL9TimeCollapses(r: L9TemporalReading): string[] {
  const collapses: string[] = [];
  if (r.observed_at && r.ingested_at && r.observed_at === r.ingested_at) {
    // Equal is legal only if the system deliberately set them equal,
    // but the runtime signals collapse risk when nothing else anchors.
    if (!r.effective_at && !r.sequence_window_start) {
      collapses.push('TS_OBSERVED_EQUALS_INGESTED_WITHOUT_ANCHOR');
    }
  }
  if (r.as_of && r.observed_at && r.as_of === r.observed_at &&
      !r.effective_at) {
    collapses.push('TS_AS_OF_COLLAPSED_TO_OBSERVED');
  }
  if (r.effective_at && !r.as_of) {
    collapses.push('TS_EFFECTIVE_WITHOUT_AS_OF');
  }
  if ((r.post_event_window_start && !r.post_event_window_end) ||
      (!r.post_event_window_start && r.post_event_window_end)) {
    collapses.push('TS_POST_EVENT_HALF_BOUNDED');
  }
  return collapses;
}

/**
 * §9.5.3.4 — Compute `t_lag - t_lead` in ms for a lead-lag spacing
 * check. Returns `null` if either anchor is missing.
 */
export function l9LeadLagSpacingMs(r: L9TemporalReading): number | null {
  if (!r.lead_signal_at || !r.lag_signal_at) return null;
  const lead = Date.parse(r.lead_signal_at);
  const lag = Date.parse(r.lag_signal_at);
  if (Number.isNaN(lead) || Number.isNaN(lag)) return null;
  return lag - lead;
}
