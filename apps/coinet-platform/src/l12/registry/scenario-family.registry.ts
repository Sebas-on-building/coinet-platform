/**
 * L12.2 — Scenario family registry (§12.2.16).
 *
 * Enforces:
 *   - all 12 frozen families registered
 *   - no duplicate registrations
 *   - production status enforcement
 */

import {
  ALL_L12_SCENARIO_FAMILIES,
  L12_SCENARIO_FAMILY_DESCRIPTORS,
  L12ScenarioFamily,
  L12ScenarioFamilyDescriptor,
  L12ScenarioFamilyProductionStatus,
} from '../contracts/scenario-family';
import { L12ScenarioType } from '../contracts/scenario-type';

const REGISTRY: Map<L12ScenarioFamily, L12ScenarioFamilyDescriptor> = (() => {
  const m = new Map<L12ScenarioFamily, L12ScenarioFamilyDescriptor>();
  for (const d of L12_SCENARIO_FAMILY_DESCRIPTORS) {
    if (m.has(d.scenario_family)) {
      throw new Error(`L12 scenario family registered twice: ${d.scenario_family}`);
    }
    m.set(d.scenario_family, d);
  }
  return m;
})();

export interface L12FamilyRegistryAuditIssue {
  readonly scenario_family: L12ScenarioFamily;
  readonly issue: string;
}

export function getRegisteredL12Family(
  family: L12ScenarioFamily,
): L12ScenarioFamilyDescriptor | undefined {
  return REGISTRY.get(family);
}

export function listRegisteredL12Families(): readonly L12ScenarioFamilyDescriptor[] {
  return [...REGISTRY.values()];
}

export function isL12FamilyRegisteredInRegistry(family: L12ScenarioFamily): boolean {
  return REGISTRY.has(family);
}

export function isL12FamilyProductionEnabled(family: L12ScenarioFamily): boolean {
  const d = REGISTRY.get(family);
  return d?.production_status === L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED;
}

export function isL12FamilyBlocked(family: L12ScenarioFamily): boolean {
  const d = REGISTRY.get(family);
  return d?.production_status === L12ScenarioFamilyProductionStatus.BLOCKED;
}

export function listL12FamiliesByStatus(
  status: L12ScenarioFamilyProductionStatus,
): readonly L12ScenarioFamilyDescriptor[] {
  return [...REGISTRY.values()].filter(d => d.production_status === status);
}

export function isL12LegalTypeForFamily(
  type: L12ScenarioType,
  family: L12ScenarioFamily,
): boolean {
  const d = REGISTRY.get(family);
  if (!d) return false;
  return d.legal_scenario_types.includes(type);
}

export function isL12LegalScopeForRegisteredFamily(
  scopeType: string,
  family: L12ScenarioFamily,
): boolean {
  const d = REGISTRY.get(family);
  if (!d) return false;
  return d.legal_scope_types.includes(scopeType);
}

/**
 * Confirm that every enum value has a descriptor with required fields.
 */
export function auditL12FamilyRegistry(): readonly L12FamilyRegistryAuditIssue[] {
  const issues: L12FamilyRegistryAuditIssue[] = [];
  for (const f of ALL_L12_SCENARIO_FAMILIES) {
    const d = REGISTRY.get(f);
    if (!d) {
      issues.push({ scenario_family: f, issue: 'unregistered family enum' });
      continue;
    }
    if (d.legal_scenario_types.length === 0) {
      issues.push({ scenario_family: f, issue: 'no legal scenario types' });
    }
    if (d.legal_scope_types.length === 0) {
      issues.push({ scenario_family: f, issue: 'no legal scope types' });
    }
    if (d.required_lower_layer_contexts.length === 0) {
      issues.push({ scenario_family: f, issue: 'no required lower-layer contexts' });
    }
    if (!d.policy_version) {
      issues.push({ scenario_family: f, issue: 'missing policy version' });
    }
    if (!d.requires_l11_score_context) {
      issues.push({ scenario_family: f, issue: 'L11 score context not required' });
    }
    if (!d.requires_invalidation_profile) {
      issues.push({ scenario_family: f, issue: 'invalidation profile not required' });
    }
  }
  return issues;
}

export function getL12FamilyRegistryCount(): number {
  return REGISTRY.size;
}
