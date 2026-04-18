/**
 * L6.6 §6.6.5.4 — EventFamilyRegistry
 *
 * Stores all production event family definitions and validates at registration
 * time against trigger linkage, confirmation, suppression, evidence, and
 * resolution rules.
 */

import {
  L6EventFamilyDefinition,
  L6EventFamilyId,
  REQUIRED_EVENT_FAMILY_FIELDS,
} from '../contracts/event-family-definition';
import { ROLLOUT_ORDINAL } from '../contracts/family-rollout-priority';
import { L6FeatureFamilyId } from '../contracts/feature-family-definition';

export interface EventFamilyRegistrationResult {
  readonly ok: boolean;
  readonly violations: readonly string[];
}

export class EventFamilyRegistry {
  private readonly families = new Map<L6EventFamilyId, L6EventFamilyDefinition>();
  private readonly knownFeatureFamilies = new Set<L6FeatureFamilyId>();

  registerKnownFeatureFamily(id: L6FeatureFamilyId): void {
    this.knownFeatureFamilies.add(id);
  }

  register(def: L6EventFamilyDefinition): EventFamilyRegistrationResult {
    const v: string[] = [];
    for (const f of REQUIRED_EVENT_FAMILY_FIELDS) {
      const val = def[f];
      if (val === undefined || val === null) {
        v.push(`missing ${String(f)}`);
      }
    }
    if (def.allowed_scopes.length === 0) v.push('allowed_scopes is empty');
    if (def.triggering_feature_families.length === 0) v.push('no triggering feature families');
    for (const ff of def.triggering_feature_families) {
      if (!this.knownFeatureFamilies.has(ff)) {
        v.push(`triggering feature family ${ff} not registered`);
      }
    }
    if (def.confirmation_window_durations_ms.length === 0) v.push('no confirmation windows');
    if (!def.suppression_family_id) v.push('missing suppression_family_id');
    if (def.resolution_classes.length === 0) v.push('no resolution classes');
    if (def.evidence_requirements.length === 0) v.push('no evidence requirements');

    if (this.families.has(def.family_id)) v.push(`duplicate event family_id ${def.family_id}`);

    if (v.length > 0) return { ok: false, violations: v };
    this.families.set(def.family_id, def);
    return { ok: true, violations: [] };
  }

  get(id: L6EventFamilyId): L6EventFamilyDefinition | null {
    return this.families.get(id) ?? null;
  }

  all(): readonly L6EventFamilyDefinition[] {
    return [...this.families.values()];
  }

  allSortedByRollout(): readonly L6EventFamilyDefinition[] {
    return [...this.families.values()].sort(
      (a, b) => ROLLOUT_ORDINAL[a.rollout_priority] - ROLLOUT_ORDINAL[b.rollout_priority],
    );
  }

  count(): number {
    return this.families.size;
  }
}
