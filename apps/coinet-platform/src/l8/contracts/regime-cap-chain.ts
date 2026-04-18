/**
 * L8.7 — Regime Cap Chain Contract
 *
 * §8.7.7 — Cap-chain law. Defines the canonical cap reasons, cap-chain
 * precedence, and the shape every L8.7 validator consumes when
 * checking whether a regime output has been correctly narrowed.
 */

/**
 * §8.7.7.3 — Canonical cap reasons. Every reason produced by an L8.4
 * confidence engine must map to exactly one of these. The L8.3 contract
 * accepts a slightly narrower union; L8.7 extends it with
 * `CROSS_DOMAIN_CONTRADICTION` and `HISTORICAL_RELIABILITY_WEAK` for
 * governance-level reasoning.
 */
export enum L8RegimeCapReason {
  CAP_TRANSITION_HIGH = 'CAP_TRANSITION_HIGH',
  CAP_RESTRICTION_NARROWED = 'CAP_RESTRICTION_NARROWED',
  CAP_AMBIGUITY_HIGH = 'CAP_AMBIGUITY_HIGH',
  CAP_FRESHNESS_WEAK = 'CAP_FRESHNESS_WEAK',
  CAP_CROSS_DOMAIN_CONTRADICTION = 'CAP_CROSS_DOMAIN_CONTRADICTION',
  CAP_DEGRADATION_MATERIAL = 'CAP_DEGRADATION_MATERIAL',
  CAP_HISTORICAL_RELIABILITY_WEAK = 'CAP_HISTORICAL_RELIABILITY_WEAK',
}

export const ALL_L8_REGIME_CAP_REASONS: readonly L8RegimeCapReason[] =
  Object.values(L8RegimeCapReason);

/**
 * §8.7.7.4 — Cap precedence. A smaller index is a more truth-restrictive
 * reason and dominates when several caps fire. The validator uses this
 * ordering to identify the dominant cap reason.
 */
export const L8_CAP_REASON_PRECEDENCE:
  Readonly<Record<L8RegimeCapReason, number>> = {
    [L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION]: 1,
    [L8RegimeCapReason.CAP_DEGRADATION_MATERIAL]: 2,
    [L8RegimeCapReason.CAP_RESTRICTION_NARROWED]: 3,
    [L8RegimeCapReason.CAP_TRANSITION_HIGH]: 4,
    [L8RegimeCapReason.CAP_AMBIGUITY_HIGH]: 5,
    [L8RegimeCapReason.CAP_FRESHNESS_WEAK]: 6,
    [L8RegimeCapReason.CAP_HISTORICAL_RELIABILITY_WEAK]: 7,
  };

export function compareL8CapReasonPrecedence(
  a: L8RegimeCapReason, b: L8RegimeCapReason,
): number {
  return L8_CAP_REASON_PRECEDENCE[a] - L8_CAP_REASON_PRECEDENCE[b];
}

/**
 * Single cap entry in the L8.7 governance cap chain. Compatible with
 * the L8.3 `L8ConfidenceCap` shape but uses the L8.7 governance-level
 * cap-reason enum so validators can reason uniformly.
 */
export interface L8RegimeCapEntry {
  readonly cap_id: string;
  readonly cap_reason: L8RegimeCapReason;
  readonly max_after_cap: number;
  readonly applied: boolean;
}

/**
 * §8.7.7.5 — Cap chain output. Carries pre-cap, capped, and dominant
 * cap reason alongside the full applied list.
 */
export interface L8RegimeCapChain {
  readonly pre_cap_score: number;
  readonly capped_score: number;
  readonly dominant_cap_reason: L8RegimeCapReason | null;
  readonly applied_caps: readonly L8RegimeCapEntry[];
  readonly required_cap_reasons: readonly L8RegimeCapReason[];
  readonly readiness_hint:
    | 'CLEAN'
    | 'MODIFIER_REQUIRED'
    | 'CAPPED'
    | 'DEGRADED'
    | 'BLOCKED';
}

/**
 * §8.7.7.4 — Compute the dominant cap reason from the applied cap list.
 */
export function dominantL8CapReason(
  applied: readonly L8RegimeCapEntry[],
): L8RegimeCapReason | null {
  const on = applied.filter(c => c.applied);
  if (on.length === 0) return null;
  return on.reduce((best, c) =>
    compareL8CapReasonPrecedence(c.cap_reason, best) < 0
      ? c.cap_reason : best,
    on[0].cap_reason,
  );
}

/**
 * §8.7.7.5 — Determine the readiness hint from a cap chain.
 *
 *   - `CLEAN`             — no caps applied, capped ≈ raw
 *   - `MODIFIER_REQUIRED` — 1-2 minor caps applied but score still >= 0.55
 *   - `CAPPED`            — capped score < 0.55 after non-degradation caps
 *   - `DEGRADED`          — degradation / cross-domain contradiction dominant
 *   - `BLOCKED`           — capped score at/below band floor with critical cap
 */
export function deriveL8CapChainReadinessHint(
  pre: number, capped: number,
  applied: readonly L8RegimeCapEntry[],
): L8RegimeCapChain['readiness_hint'] {
  const dominant = dominantL8CapReason(applied);
  if (capped <= 0.1) return 'BLOCKED';
  if (dominant === L8RegimeCapReason.CAP_DEGRADATION_MATERIAL ||
      dominant === L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION) {
    return 'DEGRADED';
  }
  if (!dominant || Math.abs(pre - capped) < 1e-9) return 'CLEAN';
  if (capped >= 0.55) return 'MODIFIER_REQUIRED';
  return 'CAPPED';
}
