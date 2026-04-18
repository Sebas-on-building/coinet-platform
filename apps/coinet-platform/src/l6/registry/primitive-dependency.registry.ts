/**
 * L6.6 §6.6.3.4 — PrimitiveDependencyRegistry
 *
 * Stores the declared dependency bindings for every primitive, keyed by
 * (primitive_id, family). Supports misuse detection and family-level template
 * resolution.
 */

import {
  L6DependencyBinding,
  L6DependencyTemplate,
  isDependencyMisuse,
  L6DependencyClass,
} from '../contracts/dependency-class';
import { L6FeatureFamilyId } from '../contracts/feature-family-definition';

export interface PrimitiveDependencyEntry {
  readonly primitive_id: string;
  readonly family_id: L6FeatureFamilyId;
  readonly bindings: readonly L6DependencyBinding[];
}

export interface DependencyRegistrationResult {
  readonly ok: boolean;
  readonly violations: readonly string[];
}

export class PrimitiveDependencyRegistry {
  private readonly entries = new Map<string, PrimitiveDependencyEntry>();
  private readonly templates = new Map<string, L6DependencyTemplate>();

  registerTemplate(template: L6DependencyTemplate): void {
    this.templates.set(template.family_id, template);
  }

  getTemplate(family_id: string): L6DependencyTemplate | null {
    return this.templates.get(family_id) ?? null;
  }

  register(entry: PrimitiveDependencyEntry): DependencyRegistrationResult {
    const v: string[] = [];
    if (!entry.primitive_id) v.push('missing primitive_id');
    if (!entry.family_id) v.push('missing family_id');
    if (!entry.bindings || entry.bindings.length === 0) v.push('no dependency bindings');

    for (const b of entry.bindings) {
      if (!b.surface_id) v.push('binding missing surface_id');
      if (!b.dependency_class) v.push('binding missing dependency_class');
    }

    if (v.length > 0) return { ok: false, violations: v };
    this.entries.set(entry.primitive_id, entry);
    return { ok: true, violations: [] };
  }

  get(primitive_id: string): PrimitiveDependencyEntry | null {
    return this.entries.get(primitive_id) ?? null;
  }

  byFamily(family_id: L6FeatureFamilyId): readonly PrimitiveDependencyEntry[] {
    return [...this.entries.values()].filter(e => e.family_id === family_id);
  }

  detectMisuse(
    declared: L6DependencyClass,
    actual: L6DependencyClass,
  ): { misuse: boolean; reason: string } {
    const rule = isDependencyMisuse(declared, actual);
    return rule
      ? { misuse: true, reason: rule.reason }
      : { misuse: false, reason: '' };
  }

  all(): readonly PrimitiveDependencyEntry[] {
    return [...this.entries.values()];
  }
}
