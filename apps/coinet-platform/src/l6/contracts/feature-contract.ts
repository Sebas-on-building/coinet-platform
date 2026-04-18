/**
 * L6.2 — Feature Contract
 *
 * §6.2.6.2 — Feature contract minimum surface.
 * A feature = governed STATE descriptor. Must declare value kind, unit,
 * directionality, baseline, normalization, and materialization.
 */

import { L6PrimitiveClass } from './primitive-class';
import { L6FeatureKind, FeatureValueShape } from './feature-kind';
import {
  CommonPrimitiveContract,
  L6Directionality,
  BaselineSpec,
  NormalizationSpec,
} from './primitive-contract';

export enum L6FeatureValueKind {
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  ORDINAL = 'ORDINAL',
  NUMBER_VECTOR = 'NUMBER_VECTOR',
  COMPOSITE = 'COMPOSITE',
  DIVERGENCE_PAIR = 'DIVERGENCE_PAIR',
}

export const FEATURE_VALUE_SHAPE_BY_KIND: Record<L6FeatureValueKind, FeatureValueShape> = {
  [L6FeatureValueKind.NUMBER]: 'NUMBER',
  [L6FeatureValueKind.BOOLEAN]: 'BOOLEAN',
  [L6FeatureValueKind.ORDINAL]: 'ORDINAL',
  [L6FeatureValueKind.NUMBER_VECTOR]: 'NUMBER_VECTOR',
  [L6FeatureValueKind.COMPOSITE]: 'COMPOSITE',
  [L6FeatureValueKind.DIVERGENCE_PAIR]: 'DIVERGENCE_PAIR',
};

export interface WarmupRequirement {
  readonly minObservations: number;
  readonly minDurationSeconds: number;
  readonly blocksEmissionUntilSatisfied: boolean;
}

export interface HorizonSpec {
  readonly horizonId: string;
  readonly durationSeconds: number;
  readonly order: number;
}

export interface VectorAggregationSpec {
  readonly horizons: readonly HorizonSpec[];
  readonly aggregationRule: 'ORDERED_TUPLE' | 'WEIGHTED_SUM' | 'MIN' | 'MAX' | 'NONE';
  readonly missingHorizonPolicy: 'REJECT' | 'SKIP_AND_DEGRADE' | 'PROVISIONAL';
}

export interface CompositeConstituentRef {
  readonly primitive_id: string;
  readonly weight: number;
}

export interface CompositeSpec {
  readonly constituents: readonly CompositeConstituentRef[];
  readonly formulaId: string;
  readonly compositeNullPolicy: 'REJECT_IF_ANY_MISSING' | 'DEGRADE_EXPLICITLY' | 'PROVISIONAL';
}

export interface EventLinkPolicySpec {
  readonly emitsStateOnly: true;
  readonly eventsMayReferenceThisFeature: boolean;
  readonly forbidsLifecycleFields: true;
}

export interface FeatureContract extends CommonPrimitiveContract {
  readonly primitive_class: L6PrimitiveClass.FEATURE;
  readonly feature_kind: L6FeatureKind;
  readonly value_kind: L6FeatureValueKind;
  readonly unit: string;
  readonly directionality: L6Directionality;
  readonly baseline_spec: BaselineSpec;
  readonly normalization_spec: NormalizationSpec;
  readonly warmup_requirement: WarmupRequirement;
  readonly vector_aggregation?: VectorAggregationSpec;
  readonly composite_spec?: CompositeSpec;
  readonly event_link_policy: EventLinkPolicySpec;
}
