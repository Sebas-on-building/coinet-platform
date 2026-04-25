/**
 * L10.7 — Hypothesis Cap-Chain Law
 *
 * §10.7.6 — Cap-chain doctrine. Hypothesis confidence must be capped
 * downward when:
 *
 *   - support is weak
 *   - contradiction is high
 *   - confirmations are incomplete
 *   - invalidation risk is high
 *   - spread between top explanations is narrow
 *   - sequence or regime posture weakens the explanation
 *   - template reliability is weak
 *   - validation posture is weak
 *
 * Caps may only narrow (INV-10.7-C). Cap precedence is frozen.
 *
 * Required emissions (§10.7.6.5):
 *   - pre_cap_score, applied_cap_reasons, edges, tightest_cap,
 *     post_cap_score, dominant_cap_reason, readiness_hint.
 */

// ──────────────────────────────────────────────────────────────────
// §10.7.6.3 — Canonical cap reasons
// ──────────────────────────────────────────────────────────────────

export enum L10HypothesisCapReason {
  INVALIDATION_RISK_HIGH = 'INVALIDATION_RISK_HIGH',
  CONTRADICTION_HIGH = 'CONTRADICTION_HIGH',
  NARROW_SPREAD = 'NARROW_SPREAD',
  UNRESOLVED_SPREAD = 'UNRESOLVED_SPREAD',
  SEQUENCE_POSTURE_WEAK = 'SEQUENCE_POSTURE_WEAK',
  REGIME_POSTURE_WEAK = 'REGIME_POSTURE_WEAK',
  CONFIRMATION_INCOMPLETE = 'CONFIRMATION_INCOMPLETE',
  SUPPORT_WEAK = 'SUPPORT_WEAK',
  VALIDATION_POSTURE_WEAK = 'VALIDATION_POSTURE_WEAK',
  TEMPLATE_RELIABILITY_WEAK = 'TEMPLATE_RELIABILITY_WEAK',
  RESTRICTION_POSTURE_NARROWED = 'RESTRICTION_POSTURE_NARROWED',
}

export const ALL_L10_HYPOTHESIS_CAP_REASONS:
  readonly L10HypothesisCapReason[] =
    Object.values(L10HypothesisCapReason);

/**
 * §10.7.6.4 — Dominance rank (lower number dominates). Caps sharing
 * a rank are tied; ties are broken by descending severity of the cap
 * ceiling (§10.7.6.4 ordering is stable across replays).
 *
 * Recommended dominance (§10.7.6.4):
 *   1. invalidation-risk caps
 *   2. blocking contradiction caps
 *   3. narrow / unresolved spread caps
 *   4. sequence / regime incompatibility caps
 *   5. missing-confirmation caps
 *   6. weak-support caps
 *   7. weak-historical-reliability caps
 */
export const L10_HYPOTHESIS_CAP_DOMINANCE_RANK: Readonly<
  Record<L10HypothesisCapReason, number>
> = {
  [L10HypothesisCapReason.INVALIDATION_RISK_HIGH]: 1,
  [L10HypothesisCapReason.CONTRADICTION_HIGH]: 2,
  [L10HypothesisCapReason.UNRESOLVED_SPREAD]: 3,
  [L10HypothesisCapReason.NARROW_SPREAD]: 3,
  [L10HypothesisCapReason.SEQUENCE_POSTURE_WEAK]: 4,
  [L10HypothesisCapReason.REGIME_POSTURE_WEAK]: 4,
  [L10HypothesisCapReason.CONFIRMATION_INCOMPLETE]: 5,
  [L10HypothesisCapReason.SUPPORT_WEAK]: 6,
  [L10HypothesisCapReason.VALIDATION_POSTURE_WEAK]: 6,
  [L10HypothesisCapReason.TEMPLATE_RELIABILITY_WEAK]: 7,
  [L10HypothesisCapReason.RESTRICTION_POSTURE_NARROWED]: 2,
};

/**
 * §10.7.6.3 / §10.7.6.5 — Frozen cap ceilings. Applying a cap forces
 * the post-cap score to `min(pre_cap_score, ceiling)`.
 */
export const L10_HYPOTHESIS_CAP_CEILING: Readonly<
  Record<L10HypothesisCapReason, number>
> = {
  [L10HypothesisCapReason.INVALIDATION_RISK_HIGH]: 0.35,
  [L10HypothesisCapReason.CONTRADICTION_HIGH]: 0.40,
  [L10HypothesisCapReason.UNRESOLVED_SPREAD]: 0.45,
  [L10HypothesisCapReason.NARROW_SPREAD]: 0.55,
  [L10HypothesisCapReason.SEQUENCE_POSTURE_WEAK]: 0.60,
  [L10HypothesisCapReason.REGIME_POSTURE_WEAK]: 0.60,
  [L10HypothesisCapReason.CONFIRMATION_INCOMPLETE]: 0.60,
  [L10HypothesisCapReason.SUPPORT_WEAK]: 0.60,
  [L10HypothesisCapReason.VALIDATION_POSTURE_WEAK]: 0.65,
  [L10HypothesisCapReason.TEMPLATE_RELIABILITY_WEAK]: 0.70,
  [L10HypothesisCapReason.RESTRICTION_POSTURE_NARROWED]: 0.50,
};

/**
 * §10.7.6.5 — A single cap edge. `narrows_to` is the ceiling the cap
 * forces the score down to; it never *raises* the score.
 */
export interface L10HypothesisCapEdge {
  readonly cap_reason: L10HypothesisCapReason;
  readonly dominance_rank: number;
  readonly narrows_to: number;
  readonly note: string;
}

/**
 * §10.7.6.5 — Readiness hint surfaced beside the cap chain. This is a
 * local hint on the cap chain specifically — not the final reliance
 * readiness (§10.7.7), which also considers restriction posture.
 */
export enum L10HypothesisCapReadinessHint {
  CLEAN = 'CLEAN',
  NARROWED = 'NARROWED',
  HEAVILY_NARROWED = 'HEAVILY_NARROWED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L10_HYPOTHESIS_CAP_READINESS_HINTS:
  readonly L10HypothesisCapReadinessHint[] =
    Object.values(L10HypothesisCapReadinessHint);

/**
 * §10.7.6.5 — Full cap chain surface. `tightest_cap` is the single
 * cap whose ceiling actually constrains the final score
 * (§10.7.6.5 / INV-10.7-C). `dominant_cap_reason` is the cap with the
 * best (lowest) dominance rank among applied caps; it may differ from
 * `tightest_cap` when a lower-rank cap has a tighter ceiling.
 */
export interface L10HypothesisCapChain {
  readonly hypothesis_subject_id: string;
  readonly pre_cap_score: number;
  readonly applied_cap_reasons: readonly L10HypothesisCapReason[];
  readonly edges: readonly L10HypothesisCapEdge[];
  readonly tightest_cap: L10HypothesisCapReason | null;
  readonly dominant_cap_reason: L10HypothesisCapReason | null;
  readonly post_cap_score: number;
  readonly readiness_hint: L10HypothesisCapReadinessHint;
}

// ──────────────────────────────────────────────────────────────────
// §10.7.6.4 / §10.7.6.5 — Deterministic helpers
// ──────────────────────────────────────────────────────────────────

/**
 * §10.7.6.4 — Deterministic comparator for cap dominance. Ascending —
 * dominant caps sort first.
 */
export function compareL10HypothesisCapDominance(
  a: L10HypothesisCapReason,
  b: L10HypothesisCapReason,
): number {
  const ra = L10_HYPOTHESIS_CAP_DOMINANCE_RANK[a];
  const rb = L10_HYPOTHESIS_CAP_DOMINANCE_RANK[b];
  if (ra !== rb) return ra - rb;
  const ca = L10_HYPOTHESIS_CAP_CEILING[a];
  const cb = L10_HYPOTHESIS_CAP_CEILING[b];
  if (ca !== cb) return ca - cb;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * §10.7.6.5 — Return the cap whose ceiling actually constrains the
 * final score (= lowest ceiling; dominance breaks ties).
 */
export function tightestL10HypothesisCap(
  caps: readonly L10HypothesisCapReason[],
): L10HypothesisCapReason | null {
  if (caps.length === 0) return null;
  let best: L10HypothesisCapReason = caps[0];
  for (const c of caps) {
    const cb = L10_HYPOTHESIS_CAP_CEILING[c];
    const bb = L10_HYPOTHESIS_CAP_CEILING[best];
    if (cb < bb) best = c;
    else if (cb === bb && compareL10HypothesisCapDominance(c, best) < 0) best = c;
  }
  return best;
}

/**
 * §10.7.6.4 — Dominant cap reason = the cap with the best (lowest)
 * dominance rank. Ties are broken by tighter ceiling, then lex.
 */
export function dominantL10HypothesisCap(
  caps: readonly L10HypothesisCapReason[],
): L10HypothesisCapReason | null {
  if (caps.length === 0) return null;
  let best: L10HypothesisCapReason = caps[0];
  for (const c of caps) {
    if (compareL10HypothesisCapDominance(c, best) < 0) best = c;
  }
  return best;
}

/**
 * §10.7.6.5 — Compose the narrowed score from a set of caps. Always
 * narrows (INV-10.7-C); returns `pre_cap_score` when caps is empty.
 */
export function applyL10HypothesisCapCeilings(
  pre_cap_score: number,
  caps: readonly L10HypothesisCapReason[],
): number {
  let s = Number.isFinite(pre_cap_score)
    ? Math.max(0, Math.min(1, pre_cap_score))
    : 0;
  for (const c of caps) {
    const ceil = L10_HYPOTHESIS_CAP_CEILING[c];
    if (s > ceil) s = ceil;
  }
  return s;
}

/**
 * §10.7.6.5 — Canonical readiness-hint derivation from post-cap
 * score + applied caps. Used by the engine for emission and by the
 * validator for consistency.
 */
export function l10HypothesisCapReadinessHintFor(
  chain: L10HypothesisCapChain,
): L10HypothesisCapReadinessHint {
  if (chain.applied_cap_reasons.length === 0) {
    return L10HypothesisCapReadinessHint.CLEAN;
  }
  if (chain.post_cap_score < 0.35) return L10HypothesisCapReadinessHint.BLOCKED;
  if (chain.post_cap_score < 0.55) {
    return L10HypothesisCapReadinessHint.HEAVILY_NARROWED;
  }
  return L10HypothesisCapReadinessHint.NARROWED;
}
