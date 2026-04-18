/**
 * L6.6 §6.6.4.12 — FeatureFamilyRegistry
 *
 * Stores all production feature family definitions and validates them
 * at registration time against required fields and scope/input constraints.
 */

import {
  L6FeatureFamilyDefinition,
  L6FeatureFamilyId,
  REQUIRED_FEATURE_FAMILY_FIELDS,
} from '../contracts/feature-family-definition';
import { ROLLOUT_ORDINAL } from '../contracts/family-rollout-priority';

export interface FamilyRegistrationResult {
  readonly ok: boolean;
  readonly violations: readonly string[];
}

export class FeatureFamilyRegistry {
  private readonly families = new Map<L6FeatureFamilyId, L6FeatureFamilyDefinition>();

  register(def: L6FeatureFamilyDefinition): FamilyRegistrationResult {
    const v: string[] = [];
    for (const f of REQUIRED_FEATURE_FAMILY_FIELDS) {
      const val = def[f];
      if (val === undefined || val === null) {
        v.push(`missing ${String(f)}`);
      }
    }
    if (def.allowed_scopes.length === 0) v.push('allowed_scopes is empty');
    if (def.legal_input_surface_classes.length === 0) v.push('legal_input_surface_classes is empty');
    if (def.baseline_classes_allowed.length === 0) v.push('baseline_classes_allowed is empty');
    if (def.output_kinds_allowed.length === 0) v.push('output_kinds_allowed is empty');
    if (this.families.has(def.family_id)) v.push(`duplicate family_id ${def.family_id}`);

    if (v.length > 0) return { ok: false, violations: v };
    this.families.set(def.family_id, def);
    return { ok: true, violations: [] };
  }

  get(id: L6FeatureFamilyId): L6FeatureFamilyDefinition | null {
    return this.families.get(id) ?? null;
  }

  all(): readonly L6FeatureFamilyDefinition[] {
    return [...this.families.values()];
  }

  allSortedByRollout(): readonly L6FeatureFamilyDefinition[] {
    return [...this.families.values()].sort(
      (a, b) => ROLLOUT_ORDINAL[a.rollout_priority] - ROLLOUT_ORDINAL[b.rollout_priority],
    );
  }

  count(): number {
    return this.families.size;
  }
}
