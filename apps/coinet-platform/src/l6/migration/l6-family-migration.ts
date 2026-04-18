/**
 * L6.8 — Family Migration
 *
 * §6.8.6.4 — Feature and event family-level evolution. A family migration
 * is a bundle of contract migrations with additional family-level rules
 * (forbidden-input removal, rollout priority change, etc.).
 */

import {
  L6ContractMigrationAttempt,
  L6MigrationClass,
  L6MigrationCompatibilityResult,
  classifyContractMigration,
} from './l6-contract-migration';

export interface L6FamilyMigrationAttempt {
  readonly attempt_id: string;
  readonly target_kind: 'FEATURE_FAMILY' | 'EVENT_FAMILY';
  readonly family_id: string;
  readonly from_family_version: string;
  readonly to_family_version: string;
  readonly declared_class: L6MigrationClass;
  readonly contract_migrations: readonly L6ContractMigrationAttempt[];
  readonly retains_linked_events: boolean;
  readonly retains_legal_input_registry_compliance: boolean;
  readonly forbidden_shortcut_reintroduced: boolean;
}

export interface L6FamilyMigrationResult {
  readonly attempt_id: string;
  readonly allowed: boolean;
  readonly requires_review: boolean;
  readonly contract_results: readonly L6MigrationCompatibilityResult[];
  readonly violations: readonly string[];
}

export function classifyFamilyMigration(
  attempt: L6FamilyMigrationAttempt,
): L6FamilyMigrationResult {
  const contractResults = attempt.contract_migrations.map(classifyContractMigration);
  const violations: string[] = [];
  let allowed = true;
  let requires_review = false;

  for (const c of contractResults) {
    if (!c.allowed) {
      allowed = false;
      violations.push(`contract:${c.attempt_id}:${c.violations.join('|')}`);
    }
    if (c.requires_review) requires_review = true;
  }

  if (attempt.forbidden_shortcut_reintroduced) {
    violations.push('family_reintroduces_forbidden_shortcut');
    allowed = false;
  }
  if (!attempt.retains_legal_input_registry_compliance) {
    violations.push('family_violates_legal_input_registry');
    allowed = false;
  }

  switch (attempt.declared_class) {
    case L6MigrationClass.MAJOR_SEMANTIC_BREAK:
      if (!attempt.retains_linked_events) {
        violations.push('major_family_migration_breaks_linked_events');
      }
      requires_review = true;
      break;
    case L6MigrationClass.RETIREMENT:
      if (attempt.retains_linked_events) {
        violations.push('retirement_leaves_linked_events_dangling');
        allowed = false;
      }
      requires_review = true;
      break;
  }

  return {
    attempt_id: attempt.attempt_id,
    allowed,
    requires_review,
    contract_results: contractResults,
    violations,
  };
}
