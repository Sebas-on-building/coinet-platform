/**
 * L6.3 — Feature Runtime Output Contract
 *
 * §6.3.4 — A feature output is the actual emitted state primitive at a scope
 * and time. It must carry identity, scope, time, baseline context, validity,
 * quality, confidence, freshness, null state, lineage, and replay identity.
 */

import {
  L6FeatureValidityState,
  L6QualityState,
  L6ConfidenceBand,
  L6FreshnessState,
  L6NullState,
} from './feature-validity-state';
import { L6FeatureValueKind } from './feature-contract';
import { L6ScopeType } from './primitive-contract';

export interface FeatureOutputLineage {
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly envelope_id: string;
  readonly evidence_pack_ref: string | null;
  readonly input_snapshot_ref: string;
  readonly replay_hash: string;
}

export interface FeatureOutputValueNumeric {
  readonly value_kind:
    | L6FeatureValueKind.NUMBER
    | L6FeatureValueKind.ORDINAL;
  readonly value: number | null;
  readonly baseline_value: number | null;
  readonly normalized_value: number | null;
}

export interface FeatureOutputValueBoolean {
  readonly value_kind: L6FeatureValueKind.BOOLEAN;
  readonly value: boolean | null;
  readonly baseline_value: null;
  readonly normalized_value: null;
}

export interface FeatureOutputValueVector {
  readonly value_kind: L6FeatureValueKind.NUMBER_VECTOR;
  readonly value: readonly number[] | null;
  readonly baseline_value: readonly number[] | null;
  readonly normalized_value: readonly number[] | null;
}

export interface FeatureOutputValueComposite {
  readonly value_kind: L6FeatureValueKind.COMPOSITE;
  readonly value: Record<string, number | boolean | null> | null;
  readonly baseline_value: Record<string, number | null> | null;
  readonly normalized_value: Record<string, number | null> | null;
}

export interface FeatureOutputValueDivergence {
  readonly value_kind: L6FeatureValueKind.DIVERGENCE_PAIR;
  readonly value: { readonly a: number | null; readonly b: number | null; readonly delta: number | null } | null;
  readonly baseline_value: null;
  readonly normalized_value: null;
}

export type FeatureOutputValue =
  | FeatureOutputValueNumeric
  | FeatureOutputValueBoolean
  | FeatureOutputValueVector
  | FeatureOutputValueComposite
  | FeatureOutputValueDivergence;

export interface FeatureOutput {
  readonly feature_id: string;
  readonly feature_version: string;

  readonly scope_type: L6ScopeType;
  readonly scope_id: string;

  readonly as_of: string;
  readonly observed_window_start: string;
  readonly observed_window_end: string;

  readonly value_payload: FeatureOutputValue;

  readonly validity_state: L6FeatureValidityState;
  readonly quality_state: L6QualityState;
  readonly confidence_band: L6ConfidenceBand;
  readonly freshness_state: L6FreshnessState;
  readonly null_state: L6NullState;

  readonly late_arrival_flag: boolean;
  readonly warmup_satisfied: boolean;

  readonly lineage: FeatureOutputLineage;
}

export const REQUIRED_FEATURE_OUTPUT_TOP_FIELDS: readonly (keyof FeatureOutput)[] = [
  'feature_id', 'feature_version', 'scope_type', 'scope_id',
  'as_of', 'observed_window_start', 'observed_window_end',
  'value_payload',
  'validity_state', 'quality_state', 'confidence_band', 'freshness_state', 'null_state',
  'late_arrival_flag', 'warmup_satisfied', 'lineage',
];

export const REQUIRED_FEATURE_OUTPUT_LINEAGE_FIELDS: readonly (keyof FeatureOutputLineage)[] = [
  'manifest_id', 'trace_id', 'envelope_id', 'input_snapshot_ref', 'replay_hash',
];
