/**
 * L6.5 — Null State and Missing-Input Classification
 *
 * §6.5.6 — Every missingness must be classified. Silent neutralization /
 * zero-fill / "treat as normal" are all forbidden. The classes below are the
 * only legal missingness classes a runtime may surface.
 */

export enum L6NullStateClass {
  NONE = 'NONE',
  ABSENT_BY_DESIGN = 'ABSENT_BY_DESIGN',
  MISSING_REQUIRED_INPUT = 'MISSING_REQUIRED_INPUT',
  FRESHNESS_FAILURE = 'FRESHNESS_FAILURE',
  WARMUP_FAILURE = 'WARMUP_FAILURE',
  GATED_BLOCK = 'GATED_BLOCK',
  UNRESOLVED_DEPENDENCY = 'UNRESOLVED_DEPENDENCY',
}

export const ALL_NULL_STATE_CLASSES: readonly L6NullStateClass[] = Object.values(L6NullStateClass);

export const MISSINGNESS_CLASSES: readonly L6NullStateClass[] = [
  L6NullStateClass.MISSING_REQUIRED_INPUT,
  L6NullStateClass.FRESHNESS_FAILURE,
  L6NullStateClass.WARMUP_FAILURE,
  L6NullStateClass.GATED_BLOCK,
  L6NullStateClass.UNRESOLVED_DEPENDENCY,
];

export function isMissingnessClass(c: L6NullStateClass): boolean {
  return MISSINGNESS_CLASSES.includes(c);
}

/**
 * Typed reason codes. These are what audit records and downstream consumers
 * see; they are stable, machine-readable, and never human prose.
 */
export enum L6MissingnessReasonCode {
  INPUT_NEVER_OBSERVED = 'INPUT_NEVER_OBSERVED',
  INPUT_REMOVED = 'INPUT_REMOVED',
  INPUT_QUARANTINED = 'INPUT_QUARANTINED',
  INPUT_NOT_FRESH = 'INPUT_NOT_FRESH',
  INPUT_EXPIRED = 'INPUT_EXPIRED',
  BASELINE_UNAVAILABLE = 'BASELINE_UNAVAILABLE',
  WARMUP_PENDING = 'WARMUP_PENDING',
  DEPENDENCY_BLOCKED = 'DEPENDENCY_BLOCKED',
  GATED_BY_POLICY = 'GATED_BY_POLICY',
  COMPOSITE_CONSTITUENT_MISSING = 'COMPOSITE_CONSTITUENT_MISSING',
}

export const ALL_MISSINGNESS_REASON_CODES: readonly L6MissingnessReasonCode[] =
  Object.values(L6MissingnessReasonCode);

/**
 * §6.5.6.1 — The four explicit null policy modes. This is a temporal-law
 * layer on top of L6.2's `L6NullPolicy` that classifies *behavioral* intent
 * (block / degrade / provisional / sparse emit) separately from the policy
 * *tag* attached to a contract.
 */
export enum L6NullPolicyMode {
  BLOCK = 'BLOCK',
  DEGRADE = 'DEGRADE',
  PROVISIONAL = 'PROVISIONAL',
  SPARSE_EMIT = 'SPARSE_EMIT',
}

export const ALL_NULL_POLICY_MODES: readonly L6NullPolicyMode[] = Object.values(L6NullPolicyMode);

export interface L6NullPolicyDecision {
  readonly policy_mode: L6NullPolicyMode;
  readonly null_state_class: L6NullStateClass;
  readonly reason_code: L6MissingnessReasonCode | null;
  readonly rationale: string;
}
