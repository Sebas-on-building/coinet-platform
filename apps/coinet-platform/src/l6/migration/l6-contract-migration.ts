/**
 * L6.8 — Contract Migration
 *
 * §6.8.6.4, §6.8.8.2 — Feature/event contract evolution classes, and the
 * interpretation of a migration attempt against the compatibility gate.
 */

export enum L6MigrationClass {
  NONE = 'NONE',
  PATCH_COMPATIBLE = 'PATCH_COMPATIBLE',
  MINOR_ADDITIVE = 'MINOR_ADDITIVE',
  MINOR_SEMANTIC_PRESERVED = 'MINOR_SEMANTIC_PRESERVED',
  MAJOR_SEMANTIC_BREAK = 'MAJOR_SEMANTIC_BREAK',
  DEPRECATION = 'DEPRECATION',
  RETIREMENT = 'RETIREMENT',
}

export const ALL_MIGRATION_CLASSES: readonly L6MigrationClass[] = Object.values(L6MigrationClass);

export interface L6ContractMigrationAttempt {
  readonly attempt_id: string;
  readonly target_kind: 'FEATURE_CONTRACT' | 'EVENT_CONTRACT';
  readonly target_id: string;
  readonly from_version: string;
  readonly to_version: string;
  readonly declared_class: L6MigrationClass;
  readonly historical_meaning_preserved: boolean;
  readonly replay_compatible: boolean;
  readonly migration_notes: string;
}

export interface L6MigrationCompatibilityResult {
  readonly attempt_id: string;
  readonly allowed: boolean;
  readonly requires_review: boolean;
  readonly requires_new_version_namespace: boolean;
  readonly violations: readonly string[];
}

/**
 * Rule table for migration classes:
 *   PATCH_COMPATIBLE  → auto-allowed, historical meaning must be preserved
 *   MINOR_ADDITIVE    → allowed with review, must remain replay compatible
 *   MINOR_SEMANTIC_PRESERVED → allowed with review, must preserve history
 *   MAJOR_SEMANTIC_BREAK → never replaces previous version; forces a new
 *                          version namespace to preserve historical
 *                          interpretation
 *   DEPRECATION       → allowed with review
 *   RETIREMENT        → requires explicit lineage preservation
 *   NONE              → no-op
 */
export function classifyContractMigration(
  attempt: L6ContractMigrationAttempt,
): L6MigrationCompatibilityResult {
  const violations: string[] = [];
  let allowed = true;
  let requires_review = false;
  let requires_new_version_namespace = false;

  switch (attempt.declared_class) {
    case L6MigrationClass.NONE:
      break;
    case L6MigrationClass.PATCH_COMPATIBLE:
      if (!attempt.historical_meaning_preserved) {
        violations.push('patch_violates_historical_meaning');
        allowed = false;
      }
      if (!attempt.replay_compatible) {
        violations.push('patch_violates_replay_compat');
        allowed = false;
      }
      break;
    case L6MigrationClass.MINOR_ADDITIVE:
    case L6MigrationClass.MINOR_SEMANTIC_PRESERVED:
      requires_review = true;
      if (!attempt.historical_meaning_preserved) {
        violations.push('minor_violates_historical_meaning');
        allowed = false;
      }
      if (!attempt.replay_compatible) {
        violations.push('minor_violates_replay_compat');
        allowed = false;
      }
      break;
    case L6MigrationClass.MAJOR_SEMANTIC_BREAK:
      requires_review = true;
      requires_new_version_namespace = true;
      if (attempt.to_version === attempt.from_version) {
        violations.push('major_semantic_break_requires_distinct_version');
        allowed = false;
      }
      break;
    case L6MigrationClass.DEPRECATION:
      requires_review = true;
      if (!attempt.historical_meaning_preserved) {
        violations.push('deprecation_violates_historical_meaning');
        allowed = false;
      }
      break;
    case L6MigrationClass.RETIREMENT:
      requires_review = true;
      if (!attempt.historical_meaning_preserved) {
        violations.push('retirement_requires_lineage_preservation');
        allowed = false;
      }
      break;
  }

  return {
    attempt_id: attempt.attempt_id,
    allowed,
    requires_review,
    requires_new_version_namespace,
    violations,
  };
}
