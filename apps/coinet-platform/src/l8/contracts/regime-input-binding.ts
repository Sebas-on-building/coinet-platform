/**
 * L8.5 — Regime Input Binding Contract
 *
 * §8.5.6 — Every regime input must be bound through a governed binding
 * that declares its input family, domain, source, dependency class, and
 * maximum reliance. Loose "we used feature X" notes are illegal.
 *
 * §8.5.6.4 — Dependency-binding contract fields. §8.5.6.5 — Max-reliance
 * doctrine. §8.5.6.6 — The L8RegimeInputBindingValidator rejects soft
 * dependencies inflated into hard support.
 */

import { L8RegimeInputFamily } from './regime-input-family';
import { L8RegimeInputDomain } from './regime-input-domain';

/**
 * §8.5.6.1 — Six legal dependency classes. Every binding must use one.
 */
export enum L8RegimeDependencyClass {
  REQUIRED_VALIDATION_INPUT = 'REQUIRED_VALIDATION_INPUT',
  REQUIRED_PRIMITIVE_INPUT = 'REQUIRED_PRIMITIVE_INPUT',
  REQUIRED_CONTEXT_INPUT = 'REQUIRED_CONTEXT_INPUT',
  OPTIONAL_CONTEXT_INPUT = 'OPTIONAL_CONTEXT_INPUT',
  HISTORICAL_INPUT = 'HISTORICAL_INPUT',
  EVIDENCE_ONLY_INPUT = 'EVIDENCE_ONLY_INPUT',
}

export const ALL_L8_REGIME_DEPENDENCY_CLASSES:
  readonly L8RegimeDependencyClass[] =
    Object.values(L8RegimeDependencyClass);

/**
 * §8.5.6.5 — Max reliance class. Declared per binding so the runtime
 * knows the strongest posture this input is allowed to take at
 * admissibility time.
 */
export enum L8RegimeMaxRelianceClass {
  FULL_SUPPORT = 'FULL_SUPPORT',
  NARROWED_SUPPORT = 'NARROWED_SUPPORT',
  CONTEXT_ONLY = 'CONTEXT_ONLY',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  BLOCKED = 'BLOCKED',
}

export const ALL_L8_REGIME_MAX_RELIANCE_CLASSES:
  readonly L8RegimeMaxRelianceClass[] =
    Object.values(L8RegimeMaxRelianceClass);

/**
 * §8.5.6.4 — Scope constraints per binding. Mirrors the L8.3 scope set
 * but restricted to strings so the binding remains declarative.
 */
export interface L8RegimeBindingScopeConstraint {
  readonly scope_type: string;
  readonly scope_id: string | null;
  readonly requires_exact_scope: boolean;
}

/**
 * §8.5.6.4 — Freshness constraints per binding.
 */
export interface L8RegimeBindingFreshnessConstraint {
  readonly max_age_seconds: number;
  readonly required_current: boolean;
  readonly stale_tolerance: 'STRICT' | 'TOLERANT' | 'PERMISSIVE';
}

/**
 * §8.5.6.4 — Dependency binding.
 */
export interface L8RegimeInputBinding {
  readonly binding_id: string;
  readonly regime_subject_id: string;
  readonly ref: string;
  readonly input_family: L8RegimeInputFamily;
  readonly input_domain: L8RegimeInputDomain;
  readonly source_layer: 'L3' | 'L4' | 'L5' | 'L6' | 'L7';
  readonly source_surface_class: string;
  readonly dependency_class: L8RegimeDependencyClass;
  readonly max_reliance_class: L8RegimeMaxRelianceClass;
  readonly scope_constraints: L8RegimeBindingScopeConstraint;
  readonly freshness_constraints: L8RegimeBindingFreshnessConstraint;
  readonly restriction_consumption_required: boolean;
  readonly contradiction_consumption_required: boolean;
}

/**
 * §8.5.6.3 — Which dependency classes may never assign which max-reliance
 * classes. This captures `§8.5.6.3` semantics in data so validators can
 * reason uniformly.
 */
export const L8_DEPENDENCY_CLASS_MAX_RELIANCE_CEILING:
  Readonly<Record<L8RegimeDependencyClass, L8RegimeMaxRelianceClass>> = {
    [L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT]:
      L8RegimeMaxRelianceClass.FULL_SUPPORT,
    [L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT]:
      L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
    [L8RegimeDependencyClass.REQUIRED_CONTEXT_INPUT]:
      L8RegimeMaxRelianceClass.CONTEXT_ONLY,
    [L8RegimeDependencyClass.OPTIONAL_CONTEXT_INPUT]:
      L8RegimeMaxRelianceClass.CONTEXT_ONLY,
    [L8RegimeDependencyClass.HISTORICAL_INPUT]:
      L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
    [L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT]:
      L8RegimeMaxRelianceClass.EVIDENCE_ONLY,
  };

/**
 * Returns the strongest max-reliance class a dependency class is
 * allowed to declare. Values stronger than this are illegal bindings.
 */
export function maxRelianceCeilingFor(
  depClass: L8RegimeDependencyClass,
): L8RegimeMaxRelianceClass {
  return L8_DEPENDENCY_CLASS_MAX_RELIANCE_CEILING[depClass];
}

/**
 * Order reliance classes by strength so validators can compare.
 * FULL > NARROWED > CONTEXT > EVIDENCE > BLOCKED.
 */
export const L8_RELIANCE_STRENGTH_INDEX:
  Readonly<Record<L8RegimeMaxRelianceClass, number>> = {
    [L8RegimeMaxRelianceClass.FULL_SUPPORT]: 4,
    [L8RegimeMaxRelianceClass.NARROWED_SUPPORT]: 3,
    [L8RegimeMaxRelianceClass.CONTEXT_ONLY]: 2,
    [L8RegimeMaxRelianceClass.EVIDENCE_ONLY]: 1,
    [L8RegimeMaxRelianceClass.BLOCKED]: 0,
  };

export function relianceStrength(
  cls: L8RegimeMaxRelianceClass,
): number {
  return L8_RELIANCE_STRENGTH_INDEX[cls] ?? 0;
}

export function relianceExceedsCeiling(
  declared: L8RegimeMaxRelianceClass,
  ceiling: L8RegimeMaxRelianceClass,
): boolean {
  return relianceStrength(declared) > relianceStrength(ceiling);
}
