/**
 * L9.7 — Sequence Cap-Chain Law
 *
 * §9.7.5 — Cap-chain doctrine. Confidence may be capped downward when
 * order ambiguity, contradiction pressure, incomplete progression,
 * stale lead signals, decay burden, or hostile regime posture demand
 * it. Caps may only narrow (INV-9.7-C) and must follow a frozen
 * precedence (§9.7.5.4).
 */

/**
 * §9.7.5.3 — Canonical cap reasons. Every applied cap must be one of
 * these. A cap emitted without a declared reason rejects.
 */
export enum L9SequenceCapReason {
  ORDER_AMBIGUITY_HIGH = 'ORDER_AMBIGUITY_HIGH',
  CONTRADICTION_PRESSURE_HIGH = 'CONTRADICTION_PRESSURE_HIGH',
  PHASE_INCOMPLETE = 'PHASE_INCOMPLETE',
  LEAD_SIGNAL_STALE = 'LEAD_SIGNAL_STALE',
  DECAY_BURDEN_HIGH = 'DECAY_BURDEN_HIGH',
  REGIME_INCOMPATIBLE = 'REGIME_INCOMPATIBLE',
  CHAIN_COMPLETENESS_LOW = 'CHAIN_COMPLETENESS_LOW',
  POST_EVENT_BINDING_ACTIVE = 'POST_EVENT_BINDING_ACTIVE',
  RESTRICTION_POSTURE_NARROWED = 'RESTRICTION_POSTURE_NARROWED',
}

export const ALL_L9_SEQUENCE_CAP_REASONS:
  readonly L9SequenceCapReason[] = Object.values(L9SequenceCapReason);

/**
 * §9.7.5.4 — Dominance rank (lower number dominates). Caps sharing a
 * rank are tied; ties are broken by descending severity of the cap
 * ceiling (§9.7.5.3 ordering is stable across replays).
 */
export const L9_SEQUENCE_CAP_DOMINANCE_RANK: Readonly<
  Record<L9SequenceCapReason, number>
> = {
  [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH]: 1,
  [L9SequenceCapReason.RESTRICTION_POSTURE_NARROWED]: 2,
  [L9SequenceCapReason.ORDER_AMBIGUITY_HIGH]: 3,
  [L9SequenceCapReason.DECAY_BURDEN_HIGH]: 4,
  [L9SequenceCapReason.PHASE_INCOMPLETE]: 5,
  [L9SequenceCapReason.CHAIN_COMPLETENESS_LOW]: 5,
  [L9SequenceCapReason.POST_EVENT_BINDING_ACTIVE]: 5,
  [L9SequenceCapReason.LEAD_SIGNAL_STALE]: 6,
  [L9SequenceCapReason.REGIME_INCOMPATIBLE]: 7,
};

/**
 * §9.7.5.3 / §9.7.5.5 — Frozen cap ceilings. Applying a cap forces the
 * post-cap score to `min(pre_cap_score, ceiling)`.
 */
export const L9_SEQUENCE_CAP_CEILING: Readonly<
  Record<L9SequenceCapReason, number>
> = {
  [L9SequenceCapReason.CONTRADICTION_PRESSURE_HIGH]: 0.40,
  [L9SequenceCapReason.RESTRICTION_POSTURE_NARROWED]: 0.50,
  [L9SequenceCapReason.ORDER_AMBIGUITY_HIGH]: 0.55,
  [L9SequenceCapReason.DECAY_BURDEN_HIGH]: 0.55,
  [L9SequenceCapReason.PHASE_INCOMPLETE]: 0.60,
  [L9SequenceCapReason.CHAIN_COMPLETENESS_LOW]: 0.60,
  [L9SequenceCapReason.POST_EVENT_BINDING_ACTIVE]: 0.60,
  [L9SequenceCapReason.LEAD_SIGNAL_STALE]: 0.70,
  [L9SequenceCapReason.REGIME_INCOMPATIBLE]: 0.65,
};

/**
 * §9.7.5.5 — A single cap edge. `narrows_to` is the ceiling the cap
 * forces the score down to; it never *raises* the score.
 */
export interface L9SequenceCapEdge {
  readonly cap_reason: L9SequenceCapReason;
  readonly dominance_rank: number;
  readonly narrows_to: number;
  readonly note: string;
}

/**
 * §9.7.5.5 — Full cap chain. `tightest_cap` is the single cap whose
 * ceiling actually constrains the final score (§9.7.5.5 / INV-9.7-C).
 */
export interface L9SequenceCapChain {
  readonly sequence_subject_id: string;
  readonly pre_cap_score: number;
  readonly applied_cap_reasons: readonly L9SequenceCapReason[];
  readonly edges: readonly L9SequenceCapEdge[];
  readonly tightest_cap: L9SequenceCapReason | null;
  readonly post_cap_score: number;
  /** §9.7.5.5 — coarse hint surfaced beside the chain itself. */
  readonly readiness_hint: L9SequenceCapReadinessHint;
}

/**
 * §9.7.5.5 — Readiness hint surfaced on the cap chain. This is a hint
 * on the cap chain specifically — not the final reliance readiness
 * (§9.7.9.2), which also looks at restriction + causal restraint.
 */
export enum L9SequenceCapReadinessHint {
  CLEAN = 'CLEAN',
  NARROWED = 'NARROWED',
  HEAVILY_NARROWED = 'HEAVILY_NARROWED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L9_SEQUENCE_CAP_READINESS_HINTS:
  readonly L9SequenceCapReadinessHint[] =
    Object.values(L9SequenceCapReadinessHint);

/**
 * §9.7.5.4 — Deterministic comparator for cap dominance. Ascending —
 * dominant caps sort first.
 */
export function compareL9SequenceCapDominance(
  a: L9SequenceCapReason,
  b: L9SequenceCapReason,
): number {
  const ra = L9_SEQUENCE_CAP_DOMINANCE_RANK[a];
  const rb = L9_SEQUENCE_CAP_DOMINANCE_RANK[b];
  if (ra !== rb) return ra - rb;
  const ca = L9_SEQUENCE_CAP_CEILING[a];
  const cb = L9_SEQUENCE_CAP_CEILING[b];
  if (ca !== cb) return ca - cb;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * §9.7.5.5 — Given an applied-cap set, return the cap whose ceiling
 * actually constrains the final score (= the one with the lowest
 * ceiling; dominance breaks ties). Returns `null` for empty input.
 */
export function tightestL9SequenceCap(
  caps: readonly L9SequenceCapReason[],
): L9SequenceCapReason | null {
  if (caps.length === 0) return null;
  let best: L9SequenceCapReason = caps[0];
  for (const c of caps) {
    const cb = L9_SEQUENCE_CAP_CEILING[c];
    const bb = L9_SEQUENCE_CAP_CEILING[best];
    if (cb < bb) best = c;
    else if (cb === bb && compareL9SequenceCapDominance(c, best) < 0) best = c;
  }
  return best;
}

/**
 * §9.7.5.5 — Compose the narrowed score from a set of caps. Always
 * narrows (INV-9.7-C); returns `pre_cap_score` when caps is empty.
 */
export function applyL9SequenceCapCeilings(
  pre_cap_score: number,
  caps: readonly L9SequenceCapReason[],
): number {
  let s = Number.isFinite(pre_cap_score)
    ? Math.max(0, Math.min(1, pre_cap_score))
    : 0;
  for (const c of caps) {
    const ceil = L9_SEQUENCE_CAP_CEILING[c];
    if (s > ceil) s = ceil;
  }
  return s;
}
