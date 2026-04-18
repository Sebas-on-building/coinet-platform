/**
 * L6.6 — Legal Input Surface Contract
 *
 * §6.6.2 — Layer 6 may consume only registered legal input surfaces from
 * L3/L4/L5. This module defines the surface class taxonomy, the registration
 * contract, and the illegal-input ban list.
 */

import { L6ScopeType } from './primitive-contract';
import { L6PrimitiveClass } from './primitive-class';

export enum L6LegalInputSurfaceClass {
  CANONICAL_SCOPED_FACT = 'CANONICAL_SCOPED_FACT',
  GRAPH_DERIVED_CONTEXT = 'GRAPH_DERIVED_CONTEXT',
  AUTHORITATIVE_CURRENT_STATE = 'AUTHORITATIVE_CURRENT_STATE',
  HISTORICAL_ANALYTICAL_FACT = 'HISTORICAL_ANALYTICAL_FACT',
  ARCHIVED_REPLAY_EVIDENCE = 'ARCHIVED_REPLAY_EVIDENCE',
  SCHEDULED_REFERENCE_DATA = 'SCHEDULED_REFERENCE_DATA',
}

export const ALL_LEGAL_INPUT_SURFACE_CLASSES: readonly L6LegalInputSurfaceClass[] =
  Object.values(L6LegalInputSurfaceClass);

export enum L6IllegalInputReason {
  RAW_PROVIDER_PAYLOAD = 'RAW_PROVIDER_PAYLOAD',
  UNSCOPED_JSON_BLOB = 'UNSCOPED_JSON_BLOB',
  UI_ONLY_AGGREGATE = 'UI_ONLY_AGGREGATE',
  STALE_CACHE_AS_TRUTH = 'STALE_CACHE_AS_TRUTH',
  NON_CANONICAL_IDENTIFIER = 'NON_CANONICAL_IDENTIFIER',
  UNVERIFIABLE_UNGATED_NOISE = 'UNVERIFIABLE_UNGATED_NOISE',
  UNREGISTERED_SURFACE = 'UNREGISTERED_SURFACE',
  UNGATED_REFERENCE_DATA = 'UNGATED_REFERENCE_DATA',
}

export const ALL_ILLEGAL_INPUT_REASONS: readonly L6IllegalInputReason[] =
  Object.values(L6IllegalInputReason);

export interface L6FreshnessConstraint {
  readonly max_staleness_ms: number;
  readonly freshness_class: string;
}

export interface L6LegalInputSurfaceSpec {
  readonly surface_id: string;
  readonly source_layer: 'L3' | 'L4' | 'L5';
  readonly surface_class: L6LegalInputSurfaceClass;
  readonly description: string;
  readonly scope_types_allowed: readonly L6ScopeType[];
  readonly primitive_classes_allowed: readonly L6PrimitiveClass[];
  readonly historical_allowed: boolean;
  readonly current_allowed: boolean;
  readonly baseline_allowed: boolean;
  readonly replay_allowed: boolean;
  readonly evidence_only_allowed: boolean;
  readonly contract_requirements: readonly string[];
  readonly freshness_constraint: L6FreshnessConstraint | null;
  readonly confidence_caveats: readonly string[];
}

export const REQUIRED_LEGAL_INPUT_SURFACE_FIELDS: readonly (keyof L6LegalInputSurfaceSpec)[] = [
  'surface_id', 'source_layer', 'surface_class', 'description',
  'scope_types_allowed', 'primitive_classes_allowed',
  'historical_allowed', 'current_allowed', 'baseline_allowed',
  'replay_allowed', 'evidence_only_allowed', 'contract_requirements',
];
