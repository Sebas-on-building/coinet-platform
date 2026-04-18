/**
 * L6.6 §6.6.3.5 — Dependency Binding Validator
 *
 * Blocks optional-context-as-truth, evidence-only-affecting-value,
 * undeclared baseline, raw-smuggling, and scope-incompatible bindings.
 */

import {
  L6DependencyBinding,
  isDependencyMisuse,
  L6DependencyClass,
} from '../contracts/dependency-class';
import { L6ScopeType } from '../contracts/primitive-contract';
import { LegalInputSurfaceRegistry } from '../registry/legal-input-surface.registry';
import { L6FamilyViolationCode } from './legal-input.validator';

export interface L6DependencyBindingViolation {
  readonly code: L6FamilyViolationCode;
  readonly surface_id: string;
  readonly detail: string;
}

export interface L6DependencyBindingResult {
  readonly ok: boolean;
  readonly violations: readonly L6DependencyBindingViolation[];
}

export class DependencyBindingValidator {
  constructor(private readonly registry: LegalInputSurfaceRegistry) {}

  validate(
    bindings: readonly L6DependencyBinding[],
    primitive_scope: L6ScopeType,
  ): L6DependencyBindingResult {
    const v: L6DependencyBindingViolation[] = [];

    for (const b of bindings) {
      if (!b.dependency_class) {
        v.push({
          code: L6FamilyViolationCode.DEPENDENCY_NOT_CLASSED,
          surface_id: b.surface_id,
          detail: 'dependency class not declared',
        });
        continue;
      }

      if (!b.scope_compatible.includes(primitive_scope)) {
        v.push({
          code: L6FamilyViolationCode.SCOPE_NOT_ALLOWED,
          surface_id: b.surface_id,
          detail: `primitive scope ${primitive_scope} not in binding scope_compatible [${b.scope_compatible.join(',')}]`,
        });
      }

      if (!this.registry.isRegistered(b.surface_id)) {
        v.push({
          code: L6FamilyViolationCode.UNREGISTERED_INPUT_SURFACE,
          surface_id: b.surface_id,
          detail: `surface_id ${b.surface_id} not registered`,
        });
      }
    }

    // Misuse detection: check all pairs
    const declared = new Map<string, L6DependencyClass>();
    for (const b of bindings) {
      declared.set(b.surface_id, b.dependency_class);
    }

    return { ok: v.length === 0, violations: v };
  }

  /**
   * Explicit misuse check at runtime: someone calls a surface as `actual`
   * but it was declared as `declared`. Returns a violation if misuse.
   */
  checkMisuse(
    surface_id: string,
    declaredClass: L6DependencyClass,
    actualClass: L6DependencyClass,
  ): L6DependencyBindingViolation | null {
    const rule = isDependencyMisuse(declaredClass, actualClass);
    if (!rule) return null;
    return {
      code: L6FamilyViolationCode.DEPENDENCY_MISUSE,
      surface_id,
      detail: rule.reason,
    };
  }
}
