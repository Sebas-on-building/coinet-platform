/**
 * L7.8 — Family Migration Gate
 *
 * §7.8.7.4, §7.8.5.2 INV-7.8-E — The gate rollout must consult before
 * any validation family migration lands in production. Also enforces
 * the invariant "no family may be production-enabled unless all
 * prerequisites are green".
 */

import {
  L7MigrationAttempt,
  L7MigrationClass,
  L7MigrationClassificationResult,
  classifyL7Migration,
} from './l7-migration-classifier';
import { L7ValidationFamilyId } from '../contracts/validation-family-definition';

export interface L7FamilyMigrationAttempt {
  readonly attempt_id: string;
  readonly family: L7ValidationFamilyId;
  readonly from_family_version: string;
  readonly to_family_version: string;
  readonly declared_class: L7MigrationClass;
  readonly surface_migrations: readonly L7MigrationAttempt[];
  readonly contradiction_coverage_complete: boolean;
  readonly runtime_path_green: boolean;
  readonly persistence_path_green: boolean;
  readonly confidence_path_green: boolean;
  readonly restriction_path_green: boolean;
  readonly observability_green: boolean;
  readonly certification_production_green: boolean;
  readonly forbidden_shortcut_reintroduced: boolean;
}

export interface L7FamilyMigrationResult {
  readonly attempt_id: string;
  readonly allowed: boolean;
  readonly requires_review: boolean;
  readonly surface_results: readonly L7MigrationClassificationResult[];
  readonly violations: readonly string[];
}

export function classifyL7FamilyMigration(
  attempt: L7FamilyMigrationAttempt,
): L7FamilyMigrationResult {
  const surface_results = attempt.surface_migrations.map(classifyL7Migration);
  const violations: string[] = [];
  let allowed = true;
  let requires_review = false;

  for (const s of surface_results) {
    if (!s.allowed) {
      allowed = false;
      violations.push(`surface:${s.attempt_id}:${s.violations.join('|')}`);
    }
    if (s.requires_review) requires_review = true;
  }

  if (attempt.forbidden_shortcut_reintroduced) {
    violations.push('family_reintroduces_forbidden_shortcut');
    allowed = false;
  }
  if (!attempt.contradiction_coverage_complete) {
    violations.push('contradiction_coverage_incomplete');
    allowed = false;
  }
  if (!attempt.runtime_path_green) {
    violations.push('runtime_path_not_green');
    allowed = false;
  }
  if (!attempt.persistence_path_green) {
    violations.push('persistence_path_not_green');
    allowed = false;
  }
  if (!attempt.confidence_path_green) {
    violations.push('confidence_path_not_green');
    allowed = false;
  }
  if (!attempt.restriction_path_green) {
    violations.push('restriction_path_not_green');
    allowed = false;
  }
  if (!attempt.observability_green) {
    violations.push('observability_not_green');
    allowed = false;
  }
  if (!attempt.certification_production_green) {
    violations.push('certification_not_production_green');
    allowed = false;
  }

  switch (attempt.declared_class) {
    case L7MigrationClass.BREAKING_SEMANTIC:
      requires_review = true;
      if (attempt.to_family_version === attempt.from_family_version) {
        violations.push('breaking_family_requires_distinct_version');
        allowed = false;
      }
      break;
    case L7MigrationClass.PROHIBITED:
      violations.push('family_migration_prohibited');
      allowed = false;
      requires_review = true;
      break;
  }

  return {
    attempt_id: attempt.attempt_id,
    allowed,
    requires_review,
    surface_results,
    violations,
  };
}

export interface L7MigrationGateDecision {
  readonly attempt_id: string;
  readonly kind: 'SURFACE' | 'FAMILY';
  readonly gate: 'AUTO' | 'REVIEW' | 'BLOCK';
  readonly allowed: boolean;
  readonly evidence: L7MigrationClassificationResult | L7FamilyMigrationResult;
}

export function gateL7Migration(
  attempt: L7MigrationAttempt,
): L7MigrationGateDecision {
  const evidence = classifyL7Migration(attempt);

  let gate: 'AUTO' | 'REVIEW' | 'BLOCK';
  if (!evidence.allowed) gate = 'BLOCK';
  else if (attempt.declared_class === L7MigrationClass.PROHIBITED) gate = 'BLOCK';
  else if (attempt.declared_class === L7MigrationClass.BREAKING_SEMANTIC) gate = 'BLOCK';
  else if (evidence.requires_review) gate = 'REVIEW';
  else gate = 'AUTO';

  return {
    attempt_id: attempt.attempt_id,
    kind: 'SURFACE',
    gate,
    allowed: evidence.allowed,
    evidence,
  };
}

export function gateL7FamilyMigration(
  attempt: L7FamilyMigrationAttempt,
): L7MigrationGateDecision {
  const evidence = classifyL7FamilyMigration(attempt);

  let gate: 'AUTO' | 'REVIEW' | 'BLOCK';
  if (!evidence.allowed) gate = 'BLOCK';
  else if (evidence.requires_review) gate = 'REVIEW';
  else gate = 'AUTO';

  return {
    attempt_id: attempt.attempt_id,
    kind: 'FAMILY',
    gate,
    allowed: evidence.allowed,
    evidence,
  };
}

const gateLog: L7MigrationGateDecision[] = [];

export function recordL7MigrationGateDecision(
  d: L7MigrationGateDecision,
): void {
  gateLog.push(d);
}

export function listL7MigrationGateDecisions(): readonly L7MigrationGateDecision[] {
  return [...gateLog];
}

export function clearL7MigrationGateLog(): void {
  gateLog.length = 0;
}
