/**
 * L6.4 — BaselineEngine
 *
 * §6.4.5.4 — Computes baselines that are:
 *   - declared (method + version)
 *   - reproducible (no hidden rolling caches that alter meaning)
 *   - coverage-aware
 *   - warmup-aware
 *
 * Output baselines carry a deterministic `baseline_id` so the feature engine
 * can verify that replay uses the exact same baseline as live compute did.
 */

import { createHash } from 'crypto';
import { L6Window } from './window-builder';

export enum L6BaselineMethod {
  ROLLING_MEAN = 'ROLLING_MEAN',
  ROLLING_MEDIAN = 'ROLLING_MEDIAN',
  Z_SCORE = 'Z_SCORE',
  PERCENTILE_RANK = 'PERCENTILE_RANK',
  VOLATILITY = 'VOLATILITY',
  EXPECTED_RANGE = 'EXPECTED_RANGE',
  PEER_RELATIVE = 'PEER_RELATIVE',
  REGIME_RELATIVE = 'REGIME_RELATIVE',
}

export const ALL_BASELINE_METHODS: readonly L6BaselineMethod[] = Object.values(L6BaselineMethod);

export interface L6Baseline {
  readonly baseline_id: string;
  readonly method: L6BaselineMethod;
  readonly window_id: string;
  readonly value: number | null;
  readonly dispersion: number | null;
  readonly coverage: number;
  readonly warmup_satisfied: boolean;
  readonly build_policy_version: string;
  readonly legal: boolean;
  readonly illegality_reasons: readonly string[];
}

export interface L6BaselineBuildSpec {
  readonly method: L6BaselineMethod;
  readonly window: L6Window;
  readonly observations: readonly number[];
  readonly peer_observations?: readonly number[];
  readonly min_observations: number;
  readonly min_coverage: number;
  readonly build_policy_version: string;
  readonly peer_relative_allowed: boolean;
  readonly regime_relative_allowed: boolean;
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function variance(xs: readonly number[], mu: number): number {
  if (xs.length <= 1) return 0;
  let s = 0;
  for (const x of xs) {
    const d = x - mu;
    s += d * d;
  }
  return s / (xs.length - 1);
}

export class BaselineEngine {
  build(spec: L6BaselineBuildSpec): L6Baseline {
    const reasons: string[] = [];
    const warmup = spec.observations.length >= spec.min_observations;
    const coverageOk = spec.window.data_coverage >= spec.min_coverage;
    if (!warmup) reasons.push('INSUFFICIENT_OBSERVATIONS');
    if (!coverageOk) reasons.push('INSUFFICIENT_COVERAGE');
    if (spec.method === L6BaselineMethod.PEER_RELATIVE && !spec.peer_relative_allowed) {
      reasons.push('PEER_RELATIVE_NOT_ALLOWED');
    }
    if (spec.method === L6BaselineMethod.REGIME_RELATIVE && !spec.regime_relative_allowed) {
      reasons.push('REGIME_RELATIVE_NOT_ALLOWED');
    }

    let value: number | null = null;
    let dispersion: number | null = null;

    if (reasons.length === 0) {
      switch (spec.method) {
        case L6BaselineMethod.ROLLING_MEAN:
          value = mean(spec.observations);
          break;
        case L6BaselineMethod.ROLLING_MEDIAN:
          value = median(spec.observations);
          break;
        case L6BaselineMethod.Z_SCORE: {
          const mu = mean(spec.observations);
          const v = variance(spec.observations, mu);
          value = mu;
          dispersion = Math.sqrt(v);
          break;
        }
        case L6BaselineMethod.PERCENTILE_RANK: {
          const sorted = [...spec.observations].sort((a, b) => a - b);
          value = sorted[Math.floor(sorted.length / 2)];
          dispersion = sorted[sorted.length - 1] - sorted[0];
          break;
        }
        case L6BaselineMethod.VOLATILITY: {
          const mu = mean(spec.observations);
          dispersion = Math.sqrt(variance(spec.observations, mu));
          value = dispersion;
          break;
        }
        case L6BaselineMethod.EXPECTED_RANGE: {
          const sorted = [...spec.observations].sort((a, b) => a - b);
          value = (sorted[0] + sorted[sorted.length - 1]) / 2;
          dispersion = (sorted[sorted.length - 1] - sorted[0]) / 2;
          break;
        }
        case L6BaselineMethod.PEER_RELATIVE:
          value = spec.peer_observations && spec.peer_observations.length > 0
            ? mean(spec.peer_observations)
            : null;
          break;
        case L6BaselineMethod.REGIME_RELATIVE:
          value = mean(spec.observations);
          break;
      }
    }

    const idMaterial = [
      spec.method,
      spec.window.window_id,
      spec.build_policy_version,
      String(spec.min_observations),
      spec.min_coverage.toFixed(6),
    ].join('|');
    const baseline_id = 'base_' + createHash('sha256').update(idMaterial).digest('hex').slice(0, 24);

    return {
      baseline_id,
      method: spec.method,
      window_id: spec.window.window_id,
      value,
      dispersion,
      coverage: spec.window.data_coverage,
      warmup_satisfied: warmup,
      build_policy_version: spec.build_policy_version,
      legal: reasons.length === 0,
      illegality_reasons: reasons,
    };
  }

  /**
   * Reproducibility check: the same spec yields the same baseline_id.
   */
  static sameIdentity(a: L6Baseline, b: L6Baseline): boolean {
    return a.baseline_id === b.baseline_id;
  }
}
