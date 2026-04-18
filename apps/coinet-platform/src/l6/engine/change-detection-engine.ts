/**
 * L6.4 — ChangeDetectionEngine
 *
 * §6.4.7.1–§6.4.7.2 — Compares current vs previous feature state (or vs
 * baseline) and produces *change signals* that the EventDetectionEngine later
 * turns into candidates. This engine does not finalize any event state.
 */

import { FeatureOutput } from '../contracts/feature-output.contract';
import { L6FeatureValidityState } from '../contracts/feature-validity-state';

export enum L6ChangeSignalKind {
  THRESHOLD_CROSS = 'THRESHOLD_CROSS',
  BASELINE_DIVERGENCE = 'BASELINE_DIVERGENCE',
  HORIZON_DIVERGENCE = 'HORIZON_DIVERGENCE',
  STATE_FLIP = 'STATE_FLIP',
  NO_CHANGE = 'NO_CHANGE',
}

export interface L6ChangeSignal {
  readonly signal_id: string;
  readonly kind: L6ChangeSignalKind;
  readonly direction: 'UP' | 'DOWN' | 'EITHER' | 'NONE';
  readonly magnitude: number;
  readonly feature_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly observed_at: string;
  readonly snapshot_from: string | null;
  readonly snapshot_to: string;
}

export interface L6ThresholdCompareSpec {
  readonly threshold: number;
  readonly direction: 'UP' | 'DOWN' | 'EITHER';
  readonly min_magnitude: number;
}

export class ChangeDetectionEngine {
  /**
   * Threshold-cross comparison. Operates only on numeric-kind outputs whose
   * validity is VALID or PROVISIONAL; everything else is a NO_CHANGE signal.
   */
  thresholdCross(
    previous: FeatureOutput | null,
    current: FeatureOutput,
    spec: L6ThresholdCompareSpec,
  ): L6ChangeSignal {
    const prev = extractScalar(previous);
    const cur = extractScalar(current);
    const signal_id = `chg-${current.feature_id}-${current.scope_id}-${current.as_of}`;

    if (cur == null || current.validity_state === L6FeatureValidityState.BLOCKED
      || current.validity_state === L6FeatureValidityState.ABSENT) {
      return buildNoChange(signal_id, current);
    }

    const magnitude = Math.abs(cur - spec.threshold);
    if (magnitude < spec.min_magnitude) return buildNoChange(signal_id, current);

    const crossingUp = (prev == null || prev < spec.threshold) && cur >= spec.threshold;
    const crossingDown = (prev == null || prev > spec.threshold) && cur <= spec.threshold;

    let direction: 'UP' | 'DOWN' | 'NONE' = 'NONE';
    if (spec.direction === 'UP' && crossingUp) direction = 'UP';
    else if (spec.direction === 'DOWN' && crossingDown) direction = 'DOWN';
    else if (spec.direction === 'EITHER') {
      if (crossingUp) direction = 'UP';
      else if (crossingDown) direction = 'DOWN';
    }

    if (direction === 'NONE') return buildNoChange(signal_id, current);

    return {
      signal_id,
      kind: L6ChangeSignalKind.THRESHOLD_CROSS,
      direction,
      magnitude,
      feature_id: current.feature_id,
      scope_type: current.scope_type,
      scope_id: current.scope_id,
      observed_at: current.as_of,
      snapshot_from: previous?.as_of ?? null,
      snapshot_to: current.as_of,
    };
  }

  /**
   * Baseline divergence: compares normalized_value against a tolerance.
   */
  baselineDivergence(current: FeatureOutput, tolerance: number): L6ChangeSignal {
    const p = current.value_payload;
    const signal_id = `div-${current.feature_id}-${current.scope_id}-${current.as_of}`;
    let normalized: number | null = null;
    if ((p.value_kind === 'NUMBER' || p.value_kind === 'ORDINAL') && typeof p.normalized_value === 'number') {
      normalized = p.normalized_value;
    }
    if (normalized == null) return buildNoChange(signal_id, current);

    const magnitude = Math.abs(normalized);
    if (magnitude < tolerance) return buildNoChange(signal_id, current);

    return {
      signal_id,
      kind: L6ChangeSignalKind.BASELINE_DIVERGENCE,
      direction: normalized > 0 ? 'UP' : 'DOWN',
      magnitude,
      feature_id: current.feature_id,
      scope_type: current.scope_type,
      scope_id: current.scope_id,
      observed_at: current.as_of,
      snapshot_from: null,
      snapshot_to: current.as_of,
    };
  }
}

function extractScalar(o: FeatureOutput | null): number | null {
  if (!o) return null;
  const p = o.value_payload;
  if ((p.value_kind === 'NUMBER' || p.value_kind === 'ORDINAL') && typeof p.value === 'number') {
    return p.value;
  }
  return null;
}

function buildNoChange(signal_id: string, current: FeatureOutput): L6ChangeSignal {
  return {
    signal_id,
    kind: L6ChangeSignalKind.NO_CHANGE,
    direction: 'NONE',
    magnitude: 0,
    feature_id: current.feature_id,
    scope_type: current.scope_type,
    scope_id: current.scope_id,
    observed_at: current.as_of,
    snapshot_from: null,
    snapshot_to: current.as_of,
  };
}
