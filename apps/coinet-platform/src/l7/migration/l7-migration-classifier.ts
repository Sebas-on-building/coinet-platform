/**
 * L7.8 — Migration Classifier
 *
 * §7.8.7.2, §7.8.7.3 — Classification of Layer 7 evolution attempts:
 *
 *   ADDITIVE_SAFE                 : pure addition, no semantic change
 *   BACKWARD_COMPATIBLE_STRUCTURAL: non-semantic structural change
 *   MIGRATION_REQUIRED            : compatible with explicit migration
 *   BREAKING_SEMANTIC             : new version namespace required
 *   PROHIBITED                    : never allowed (e.g. destructive
 *                                    ontology drop without new namespace)
 *
 * The migration classifier is the enforcement boundary between
 * "ship as PATCH" and "requires governed migration" decisions. Every
 * contract/template/family/policy surface in L7 must be routed through
 * it before lifting to production.
 */

export enum L7MigrationClass {
  NONE = 'NONE',
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE_STRUCTURAL = 'BACKWARD_COMPATIBLE_STRUCTURAL',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L7_MIGRATION_CLASSES: readonly L7MigrationClass[] =
  Object.values(L7MigrationClass);

/**
 * §7.8.7.3 — Migration-gated surfaces in Layer 7. Any change to one of
 * these surfaces must be routed through the migration classifier.
 */
export enum L7MigrationSurface {
  PRIMARY_VALIDATION_CLASS = 'PRIMARY_VALIDATION_CLASS',
  VALIDATION_MODIFIER_SEMANTICS = 'VALIDATION_MODIFIER_SEMANTICS',
  CONTRADICTION_FAMILY_ONTOLOGY = 'CONTRADICTION_FAMILY_ONTOLOGY',
  CONTRADICTION_TEMPLATE = 'CONTRADICTION_TEMPLATE',
  VALIDATION_FAMILY_DEFINITION = 'VALIDATION_FAMILY_DEFINITION',
  CONFIDENCE_FACTOR_MODEL = 'CONFIDENCE_FACTOR_MODEL',
  CAP_CHAIN_POLICY = 'CAP_CHAIN_POLICY',
  RESTRICTION_RIGHT_POLICY = 'RESTRICTION_RIGHT_POLICY',
  VALIDATION_CONTRACT = 'VALIDATION_CONTRACT',
  CONFIDENCE_CONTRACT = 'CONFIDENCE_CONTRACT',
  RESTRICTION_PROFILE_CONTRACT = 'RESTRICTION_PROFILE_CONTRACT',
  PERSISTENCE_SURFACE = 'PERSISTENCE_SURFACE',
  READ_SURFACE = 'READ_SURFACE',
}

export const ALL_L7_MIGRATION_SURFACES: readonly L7MigrationSurface[] =
  Object.values(L7MigrationSurface);

export interface L7MigrationAttempt {
  readonly attempt_id: string;
  readonly surface: L7MigrationSurface;
  readonly target_id: string;
  readonly from_version: string;
  readonly to_version: string;
  readonly declared_class: L7MigrationClass;
  readonly historical_meaning_preserved: boolean;
  readonly replay_compatible: boolean;
  readonly widens_downstream_rights: boolean;
  readonly contradiction_ontology_change: boolean;
  readonly notes: string;
}

export interface L7MigrationClassificationResult {
  readonly attempt_id: string;
  readonly allowed: boolean;
  readonly requires_review: boolean;
  readonly requires_new_version_namespace: boolean;
  readonly violations: readonly string[];
}

/**
 * §7.8.7.2 — Rule table:
 *
 *   ADDITIVE_SAFE                 → auto-allowed; requires replay compat
 *                                    and preserved historical meaning
 *   BACKWARD_COMPATIBLE_STRUCTURAL→ allowed with review; history preserved
 *   MIGRATION_REQUIRED            → allowed with review; replay compat and
 *                                    history preserved
 *   BREAKING_SEMANTIC             → new version namespace required; cannot
 *                                    reuse prior version id
 *   PROHIBITED                    → blocked unconditionally
 *
 * Additional policy:
 *   • `widens_downstream_rights` escalates class to at least
 *     MIGRATION_REQUIRED — rights expansion must be reviewed.
 *   • `contradiction_ontology_change` forces BREAKING_SEMANTIC (§7.8.7.5)
 *     because ontology drift silently reinterprets historical bundles.
 */
export function classifyL7Migration(
  attempt: L7MigrationAttempt,
): L7MigrationClassificationResult {
  const violations: string[] = [];
  let allowed = true;
  let requires_review = false;
  let requires_new_version_namespace = false;

  // Policy-level escalations
  const effectiveClass: L7MigrationClass =
    attempt.contradiction_ontology_change &&
    attempt.declared_class !== L7MigrationClass.BREAKING_SEMANTIC
      ? L7MigrationClass.BREAKING_SEMANTIC
      : attempt.declared_class;

  if (attempt.contradiction_ontology_change &&
      attempt.declared_class !== L7MigrationClass.BREAKING_SEMANTIC) {
    violations.push('ontology_change_must_be_breaking_semantic');
    allowed = false;
  }

  switch (effectiveClass) {
    case L7MigrationClass.NONE:
      break;
    case L7MigrationClass.ADDITIVE_SAFE:
      if (!attempt.historical_meaning_preserved) {
        violations.push('additive_violates_historical_meaning');
        allowed = false;
      }
      if (!attempt.replay_compatible) {
        violations.push('additive_violates_replay_compat');
        allowed = false;
      }
      if (attempt.widens_downstream_rights) {
        violations.push('additive_cannot_widen_rights');
        allowed = false;
      }
      break;
    case L7MigrationClass.BACKWARD_COMPATIBLE_STRUCTURAL:
      requires_review = true;
      if (!attempt.historical_meaning_preserved) {
        violations.push('structural_violates_historical_meaning');
        allowed = false;
      }
      break;
    case L7MigrationClass.MIGRATION_REQUIRED:
      requires_review = true;
      if (!attempt.historical_meaning_preserved) {
        violations.push('migration_required_violates_historical_meaning');
        allowed = false;
      }
      if (!attempt.replay_compatible) {
        violations.push('migration_required_violates_replay_compat');
        allowed = false;
      }
      break;
    case L7MigrationClass.BREAKING_SEMANTIC:
      requires_review = true;
      requires_new_version_namespace = true;
      if (attempt.to_version === attempt.from_version) {
        violations.push('breaking_requires_distinct_version');
        allowed = false;
      }
      break;
    case L7MigrationClass.PROHIBITED:
      violations.push('migration_is_prohibited_by_policy');
      allowed = false;
      requires_review = true;
      break;
  }

  if (attempt.widens_downstream_rights &&
      effectiveClass !== L7MigrationClass.BREAKING_SEMANTIC) {
    requires_review = true;
    if (effectiveClass === L7MigrationClass.ADDITIVE_SAFE) {
      // Already recorded above.
    }
  }

  return {
    attempt_id: attempt.attempt_id,
    allowed,
    requires_review,
    requires_new_version_namespace,
    violations,
  };
}
