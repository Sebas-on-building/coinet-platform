/**
 * L6.5 — Temporal Baseline Specification
 *
 * §6.5.4 — A baseline is a governed temporal comparison surface. L6.5 layers
 * declaration law on top of L6.4's `BaselineEngine`, adding peer/regime
 * allowance flags, coverage requirements, warmup requirements, and version
 * pinning. The L6.5 `L6BaselineType` is a type alias over L6.4's
 * `L6BaselineMethod` so both surfaces agree on the allowed methods.
 */

import { L6BaselineMethod } from '../engine/baseline-engine';
import { L6CoverageRequirementClass } from './materialization-policy';

export type L6BaselineType = L6BaselineMethod;

export enum L6BaselineNormalizationMode {
  ABSOLUTE = 'ABSOLUTE',
  NORMALIZED_Z = 'NORMALIZED_Z',
  NORMALIZED_PERCENTILE = 'NORMALIZED_PERCENTILE',
  RELATIVE_RATIO = 'RELATIVE_RATIO',
  LOG_RETURN = 'LOG_RETURN',
}

export const ALL_BASELINE_NORMALIZATION_MODES: readonly L6BaselineNormalizationMode[] =
  Object.values(L6BaselineNormalizationMode);

export interface L6TemporalBaselineSpec {
  readonly baseline_id: string;
  readonly baseline_type: L6BaselineType;
  readonly input_surface_ids: readonly string[];
  readonly required_window_spec_ids: readonly string[];
  readonly normalization_mode: L6BaselineNormalizationMode;
  readonly coverage_requirement: L6CoverageRequirementClass;
  readonly min_coverage_ratio: number;
  readonly min_observation_count: number;
  readonly warmup_duration_ms: number;
  readonly peer_relative_allowed: boolean;
  readonly regime_relative_allowed: boolean;
  readonly policy_version: string;
}

export const REQUIRED_BASELINE_SPEC_FIELDS: readonly (keyof L6TemporalBaselineSpec)[] = [
  'baseline_id', 'baseline_type', 'input_surface_ids', 'required_window_spec_ids',
  'normalization_mode', 'coverage_requirement', 'min_coverage_ratio',
  'min_observation_count', 'warmup_duration_ms',
  'peer_relative_allowed', 'regime_relative_allowed', 'policy_version',
];

/**
 * §6.5.4.5 — When a baseline cannot be legally produced, the failure must
 * carry one of these typed codes; silent substitutes are forbidden.
 */
export enum L6BaselineFailureCode {
  INSUFFICIENT_OBSERVATIONS = 'INSUFFICIENT_OBSERVATIONS',
  INSUFFICIENT_COVERAGE = 'INSUFFICIENT_COVERAGE',
  PEER_RELATIVE_NOT_ALLOWED = 'PEER_RELATIVE_NOT_ALLOWED',
  REGIME_RELATIVE_NOT_ALLOWED = 'REGIME_RELATIVE_NOT_ALLOWED',
  BASELINE_WINDOW_INVALID = 'BASELINE_WINDOW_INVALID',
  BASELINE_INPUT_ILLEGAL = 'BASELINE_INPUT_ILLEGAL',
  WARMUP_NOT_SATISFIED = 'WARMUP_NOT_SATISFIED',
}

export const ALL_BASELINE_FAILURE_CODES: readonly L6BaselineFailureCode[] =
  Object.values(L6BaselineFailureCode);
