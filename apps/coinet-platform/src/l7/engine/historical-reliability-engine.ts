/**
 * L7.6 — Historical Reliability Engine
 *
 * §7.6.3.7 — Computes a BOUNDED [0,1] historical-reliability score for
 * a (validation family, contradiction profile, support pattern) tuple.
 * The score is intentionally weak: it may NEVER overpower contradiction
 * law (§7.6.3.7) and the corresponding factor weight is registry-capped
 * at `L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[HISTORICAL_RELIABILITY]`.
 *
 * The engine is deterministic: it consults a pluggable history surface
 * and returns a clamp-to-bounds score plus a lineage ref so replay
 * remains stable.
 */

import { L7ValidationFamilyId } from '../contracts/validation-family-definition';
import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';

export interface L7HistoricalReliabilitySurface {
  /**
   * Returns a base reliability for the family ∈ [0,1] or null if the
   * surface has no data; null is interpreted by the engine as
   * `WEAK` historical evidence (score = 0.5).
   */
  reliabilityFor(family: L7ValidationFamilyId): number | null;
  /** Per-contradiction-family multiplier ∈ [0.4,1]. */
  contradictionMultiplierFor(family: L7ContradictionFamilyClass | null): number;
  /**
   * Returns a stable lineage ref so replay can reproduce the lookup.
   */
  lineageRef(): string;
}

export interface L7HistoricalReliabilityInput {
  readonly family: L7ValidationFamilyId;
  readonly dominantContradictionFamily: L7ContradictionFamilyClass | null;
  readonly contradictionCount: number;
}

export interface L7HistoricalReliabilityResult {
  readonly family: L7ValidationFamilyId;
  readonly reliability_score_01: number;
  readonly is_weak: boolean;
  readonly rationale: string;
  readonly surface_lineage_ref: string;
}

/** Fallback surface returns 0.7 baseline + 1.0 multiplier. */
export class L7DefaultHistoricalReliabilitySurface
  implements L7HistoricalReliabilitySurface
{
  reliabilityFor(_family: L7ValidationFamilyId): number | null {
    return 0.7;
  }
  contradictionMultiplierFor(_family: L7ContradictionFamilyClass | null): number {
    return 1.0;
  }
  lineageRef(): string {
    return 'l7.6:historical-reliability:default-surface@1';
  }
}

export class L7HistoricalReliabilityEngine {
  constructor(
    private readonly surface: L7HistoricalReliabilitySurface = new L7DefaultHistoricalReliabilitySurface(),
  ) {}

  evaluate(input: L7HistoricalReliabilityInput): L7HistoricalReliabilityResult {
    const base = this.surface.reliabilityFor(input.family);
    const baseScore = base === null ? 0.5 : clamp01(base);
    const mult = clamp(this.surface.contradictionMultiplierFor(
      input.dominantContradictionFamily,
    ), 0.4, 1);
    let score = clamp01(baseScore * mult);
    if (input.contradictionCount > 0) {
      score = clamp01(score * (1 - Math.min(0.3, input.contradictionCount * 0.05)));
    }
    const isWeak = score < 0.4;
    return {
      family: input.family,
      reliability_score_01: score,
      is_weak: isWeak,
      rationale:
        `family=${input.family} base=${baseScore.toFixed(3)} ` +
        `mult=${mult.toFixed(3)} contradictions=${input.contradictionCount} ` +
        `=> ${score.toFixed(3)}`,
      surface_lineage_ref: this.surface.lineageRef(),
    };
  }
}

function clamp01(n: number): number {
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!isFinite(n)) return lo;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
