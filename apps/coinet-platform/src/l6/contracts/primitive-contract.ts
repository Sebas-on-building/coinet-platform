/**
 * L6.2 — Shared Primitive Contract Types
 *
 * §6.2.6 — Universal primitive contract surface.
 * §6.2.6.5 — Version law: every primitive contract must be versioned.
 */

import { L6PrimitiveClass } from './primitive-class';
import { L6TransformationClass } from './primitive-transformation-class';
import { NullPolicySpec } from './primitive-null-policy';
import { LineagePolicySpec } from './primitive-lineage-policy';
import { ContradictionSupportSpec } from './primitive-contradiction';

export enum L6ScopeType {
  ASSET = 'ASSET',
  PROJECT = 'PROJECT',
  CONTRACT = 'CONTRACT',
  PAIR = 'PAIR',
  MARKET = 'MARKET',
  CROSS_ASSET = 'CROSS_ASSET',
  NARRATIVE = 'NARRATIVE',
  GLOBAL = 'GLOBAL',
}

export const ALL_SCOPE_TYPES: readonly L6ScopeType[] = Object.values(L6ScopeType);

export enum L6ScopeGranularity {
  POINT = 'POINT',
  WINDOW = 'WINDOW',
  SESSION = 'SESSION',
  BAR = 'BAR',
  DAY = 'DAY',
  EPOCH = 'EPOCH',
}

export const ALL_SCOPE_GRANULARITIES: readonly L6ScopeGranularity[] = Object.values(L6ScopeGranularity);

export enum L6Directionality {
  DIRECTIONLESS = 'DIRECTIONLESS',
  HIGHER_MEANS_MORE = 'HIGHER_MEANS_MORE',
  LOWER_MEANS_MORE = 'LOWER_MEANS_MORE',
  SIGNED = 'SIGNED',
  CATEGORICAL = 'CATEGORICAL',
}

export enum L6LateDataPolicy {
  HISTORICAL_RECOMPUTE_ONLY = 'HISTORICAL_RECOMPUTE_ONLY',
  GOVERNED_REMATERIALIZATION = 'GOVERNED_REMATERIALIZATION',
  REJECT_LATE = 'REJECT_LATE',
}

export enum L6MaterializationPolicy {
  CURRENT_STATE_AND_HISTORY = 'CURRENT_STATE_AND_HISTORY',
  HISTORY_ONLY = 'HISTORY_ONLY',
  INSTANCE_ONLY = 'INSTANCE_ONLY',
  CURRENT_STATE_AND_INSTANCE = 'CURRENT_STATE_AND_INSTANCE',
}

export enum L6EvidencePackPolicy {
  ALWAYS_REQUIRED = 'ALWAYS_REQUIRED',
  REQUIRED_ON_MATERIAL = 'REQUIRED_ON_MATERIAL',
  OPTIONAL = 'OPTIONAL',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export interface ScopeContract {
  readonly scope_type: L6ScopeType;
  readonly scope_granularity: L6ScopeGranularity;
}

export interface QualityGateSpec {
  readonly minInputQuality: number;
  readonly minFreshnessScore: number;
  readonly minConfidence: number;
  readonly blocksOnFailure: boolean;
}

export interface ConfidenceDerivationSpec {
  readonly method: 'INPUT_CONFIDENCE_MIN' | 'INPUT_CONFIDENCE_PRODUCT' | 'BASELINE_DERIVED' | 'COMPOSITE_RULE';
  readonly downgradesOnPartialInputs: boolean;
}

export interface FreshnessBudgetSpec {
  readonly maxAgeSeconds: number;
  readonly warmupSeconds: number;
  readonly blockOnStale: boolean;
}

export interface InputSurfaceRef {
  readonly surfaceId: string;
  readonly fromLayer: 'L3' | 'L4' | 'L5';
  readonly required: boolean;
}

export interface HistoryWindowSpec {
  readonly windowId: string;
  readonly durationSeconds: number;
  readonly requiredPointCount: number;
}

export interface BaselineSpec {
  readonly baselineKind: 'ROLLING_WINDOW' | 'CALENDAR_ANCHOR' | 'PEER_GROUP' | 'CROSS_SECTIONAL' | 'NONE';
  readonly parameters: Record<string, unknown>;
  readonly carriesVersion: string;
}

export interface NormalizationSpec {
  readonly method: 'Z_SCORE' | 'PERCENTILE' | 'MIN_MAX' | 'NONE' | 'LOG' | 'SIGMOID';
  readonly parameters: Record<string, unknown>;
}

export interface CommonPrimitiveContract {
  readonly primitive_class: L6PrimitiveClass;
  readonly primitive_id: string;
  readonly family: string;
  readonly name: string;
  readonly version: string;
  readonly scope: ScopeContract;
  readonly required_inputs: readonly InputSurfaceRef[];
  readonly optional_inputs: readonly InputSurfaceRef[];
  readonly required_context: readonly InputSurfaceRef[];
  readonly required_history_windows: readonly HistoryWindowSpec[];
  readonly transformation_class: L6TransformationClass;
  readonly quality_gate_spec: QualityGateSpec;
  readonly confidence_derivation_spec: ConfidenceDerivationSpec;
  readonly null_policy: NullPolicySpec;
  readonly freshness_budget: FreshnessBudgetSpec;
  readonly late_data_policy: L6LateDataPolicy;
  readonly materialization_policy: L6MaterializationPolicy;
  readonly evidence_pack_policy: L6EvidencePackPolicy;
  readonly lineage_policy: LineagePolicySpec;
  readonly contradiction_support: ContradictionSupportSpec;
  readonly description: string;
}
