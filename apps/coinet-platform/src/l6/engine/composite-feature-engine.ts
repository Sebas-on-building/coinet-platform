/**
 * L6.4 — CompositeFeatureEngine
 *
 * §6.4.6.3–§6.4.6.4 — Composite features may only consume already-computed
 * governed features. They may not reach around to raw provider state. This
 * engine also inherits quality/confidence downgrades from constituents:
 * a composite is never more trustworthy than its weakest constituent.
 */

import { FeatureDefinitionContract } from '../contracts/feature-definition.contract';
import { FeatureOutput } from '../contracts/feature-output.contract';
import {
  L6FeatureValidityState,
  L6QualityState,
  L6ConfidenceBand,
  L6FreshnessState,
  L6NullState,
} from '../contracts/feature-validity-state';

export interface CompositeConstituent {
  readonly primitive_id: string;
  readonly weight: number;
  readonly output: FeatureOutput;
}

export interface CompositeInheritance {
  readonly validity_state: L6FeatureValidityState;
  readonly quality_state: L6QualityState;
  readonly confidence_band: L6ConfidenceBand;
  readonly freshness_state: L6FreshnessState;
  readonly null_state: L6NullState;
  readonly blocked_reasons: readonly string[];
  readonly missing_constituents: readonly string[];
  readonly any_explicitly_degraded: boolean;
}

const VALIDITY_RANK: Record<L6FeatureValidityState, number> = {
  [L6FeatureValidityState.VALID]: 0,
  [L6FeatureValidityState.PROVISIONAL]: 1,
  [L6FeatureValidityState.DEGRADED]: 2,
  [L6FeatureValidityState.ABSENT]: 3,
  [L6FeatureValidityState.BLOCKED]: 4,
};
const QUALITY_RANK: Record<L6QualityState, number> = {
  [L6QualityState.PASS]: 0,
  [L6QualityState.MARGINAL]: 1,
  [L6QualityState.FAIL]: 2,
};
const CONFIDENCE_RANK: Record<L6ConfidenceBand, number> = {
  [L6ConfidenceBand.HIGH]: 0,
  [L6ConfidenceBand.MEDIUM]: 1,
  [L6ConfidenceBand.LOW]: 2,
  [L6ConfidenceBand.UNRATED]: 3,
};
const FRESHNESS_RANK: Record<L6FreshnessState, number> = {
  [L6FreshnessState.FRESH]: 0,
  [L6FreshnessState.STALE]: 1,
  [L6FreshnessState.WARMING_UP]: 2,
  [L6FreshnessState.EXPIRED]: 3,
};

function worst<K extends string, T extends string>(
  xs: readonly T[],
  rank: Record<T, number>,
  fallback: T,
): T {
  if (xs.length === 0) return fallback;
  let w = xs[0];
  for (const x of xs) if (rank[x] > rank[w]) w = x;
  return w;
}

export class CompositeFeatureEngine {
  /**
   * Inheritance law: the composite inherits the worst-ranked axis of every
   * constituent. Null policy is governed by the composite's declared policy.
   */
  inherit(
    def: FeatureDefinitionContract,
    constituents: readonly CompositeConstituent[],
    requiredConstituentIds: readonly string[],
  ): CompositeInheritance {
    const present = new Set(constituents.map((c) => c.primitive_id));
    const missing = requiredConstituentIds.filter((id) => !present.has(id));

    const blocked: string[] = [];
    for (const m of missing) blocked.push(`MISSING_CONSTITUENT:${m}`);

    const validities = constituents.map((c) => c.output.validity_state);
    const qualities = constituents.map((c) => c.output.quality_state);
    const confidences = constituents.map((c) => c.output.confidence_band);
    const freshnesses = constituents.map((c) => c.output.freshness_state);

    const nullPolicy = def.composite_spec?.compositeNullPolicy ?? 'DEGRADE_EXPLICITLY';
    const anyAbsentRequired = constituents.some((c) => c.output.null_state === L6NullState.ABSENT_REQUIRED);
    const anyExplicitlyDegraded = constituents.some((c) => c.output.null_state === L6NullState.EXPLICITLY_DEGRADED);

    let null_state: L6NullState = L6NullState.PRESENT;
    if (missing.length > 0 || anyAbsentRequired) {
      if (nullPolicy === 'REJECT_IF_ANY_MISSING') null_state = L6NullState.ABSENT_REQUIRED;
      else if (nullPolicy === 'DEGRADE_EXPLICITLY') null_state = L6NullState.EXPLICITLY_DEGRADED;
      else null_state = L6NullState.ABSENT_OPTIONAL;
    } else if (anyExplicitlyDegraded) {
      null_state = L6NullState.EXPLICITLY_DEGRADED;
    }

    let validity: L6FeatureValidityState = worst(
      validities,
      VALIDITY_RANK,
      L6FeatureValidityState.VALID,
    );
    if (missing.length > 0 && nullPolicy === 'REJECT_IF_ANY_MISSING') {
      validity = L6FeatureValidityState.BLOCKED;
    }
    if (null_state === L6NullState.ABSENT_REQUIRED
      && validity === L6FeatureValidityState.VALID) {
      validity = L6FeatureValidityState.ABSENT;
    }

    return {
      validity_state: validity,
      quality_state: worst(qualities, QUALITY_RANK, L6QualityState.PASS),
      confidence_band: worst(confidences, CONFIDENCE_RANK, L6ConfidenceBand.UNRATED),
      freshness_state: worst(freshnesses, FRESHNESS_RANK, L6FreshnessState.FRESH),
      null_state,
      blocked_reasons: blocked,
      missing_constituents: missing,
      any_explicitly_degraded: anyExplicitlyDegraded,
    };
  }
}
