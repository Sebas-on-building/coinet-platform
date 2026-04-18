/**
 * L6.6 — Dependency Class Taxonomy (§6.6.3)
 *
 * Bridges L6.4's runtime `L6DependencyClass` with L6.6's family-level
 * dependency doctrine. This module provides the canonical 5-class taxonomy
 * that every primitive must declare and the misuse rules that validators
 * enforce.
 *
 * L6.4 already defines the runtime enum with 7 values (HARD_TRUTH,
 * HARD_CONTEXT, OPTIONAL_CONTEXT, BASELINE, EVIDENCE_ONLY, EVENT_SUPPORT,
 * MATERIALIZATION). L6.6 re-exports those and layers on:
 *   - a family-level binding contract
 *   - the misuse ban matrix
 *   - the dependency template interface
 */

import { L6DependencyClass } from '../engine/dependency-planner';
import { L6ScopeType } from './primitive-contract';
import { L6TemporalMode } from './temporal-surfaces';

export { L6DependencyClass };

export const FAMILY_LEVEL_DEPENDENCY_CLASSES: readonly L6DependencyClass[] = [
  L6DependencyClass.HARD_TRUTH,
  L6DependencyClass.HARD_CONTEXT,
  L6DependencyClass.OPTIONAL_CONTEXT,
  L6DependencyClass.BASELINE,
  L6DependencyClass.EVIDENCE_ONLY,
];

export interface L6DependencyBinding {
  readonly surface_id: string;
  readonly dependency_class: L6DependencyClass;
  readonly required: boolean;
  readonly scope_compatible: readonly L6ScopeType[];
  readonly temporal_mode: L6TemporalMode;
  readonly replay_legal: boolean;
  readonly rationale: string;
}

export interface L6DependencyTemplate {
  readonly family_id: string;
  readonly bindings: readonly L6DependencyBinding[];
}

/**
 * §6.6.3.5 — Dependency misuse matrix. A pair (actual_class, declared_class)
 * is illegal when a stronger actual usage is hidden behind a weaker declared
 * class.
 */
export type DependencyMisuseRule = {
  readonly declared: L6DependencyClass;
  readonly actual: L6DependencyClass;
  readonly reason: string;
};

export const DEPENDENCY_MISUSE_RULES: readonly DependencyMisuseRule[] = [
  { declared: L6DependencyClass.OPTIONAL_CONTEXT, actual: L6DependencyClass.HARD_TRUTH, reason: 'optional context used as required truth' },
  { declared: L6DependencyClass.OPTIONAL_CONTEXT, actual: L6DependencyClass.HARD_CONTEXT, reason: 'optional context used as required context' },
  { declared: L6DependencyClass.EVIDENCE_ONLY, actual: L6DependencyClass.HARD_TRUTH, reason: 'evidence-only input affecting runtime value' },
  { declared: L6DependencyClass.EVIDENCE_ONLY, actual: L6DependencyClass.HARD_CONTEXT, reason: 'evidence-only input affecting runtime context' },
  { declared: L6DependencyClass.EVIDENCE_ONLY, actual: L6DependencyClass.BASELINE, reason: 'evidence-only input affecting baseline' },
];

export function isDependencyMisuse(declared: L6DependencyClass, actual: L6DependencyClass): DependencyMisuseRule | null {
  return DEPENDENCY_MISUSE_RULES.find(r => r.declared === declared && r.actual === actual) ?? null;
}
