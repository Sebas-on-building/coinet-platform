/**
 * L6.8 — Compatibility Gate
 *
 * §6.8.6.4, §6.8.8.3 — The gate that rollout must consult before any
 * contract or family migration lands in production. Also enforces the
 * invariant "no migration without compatibility check".
 */

import {
  L6ContractMigrationAttempt,
  L6MigrationCompatibilityResult,
  classifyContractMigration,
  L6MigrationClass,
} from './l6-contract-migration';
import {
  L6FamilyMigrationAttempt,
  L6FamilyMigrationResult,
  classifyFamilyMigration,
} from './l6-family-migration';

export interface L6CompatibilityGateDecision {
  readonly attempt_id: string;
  readonly kind: 'CONTRACT' | 'FAMILY';
  readonly gate: 'AUTO' | 'REVIEW' | 'BLOCK';
  readonly allowed: boolean;
  readonly evidence: L6MigrationCompatibilityResult | L6FamilyMigrationResult;
}

export function gateContractMigration(
  attempt: L6ContractMigrationAttempt,
): L6CompatibilityGateDecision {
  const evidence = classifyContractMigration(attempt);

  let gate: 'AUTO' | 'REVIEW' | 'BLOCK';
  if (!evidence.allowed) gate = 'BLOCK';
  else if (attempt.declared_class === L6MigrationClass.RETIREMENT) gate = 'BLOCK';
  else if (attempt.declared_class === L6MigrationClass.MAJOR_SEMANTIC_BREAK) gate = 'BLOCK';
  else if (evidence.requires_review) gate = 'REVIEW';
  else gate = 'AUTO';

  return {
    attempt_id: attempt.attempt_id,
    kind: 'CONTRACT',
    gate,
    allowed: evidence.allowed,
    evidence,
  };
}

export function gateFamilyMigration(
  attempt: L6FamilyMigrationAttempt,
): L6CompatibilityGateDecision {
  const evidence = classifyFamilyMigration(attempt);

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

const gateLog: L6CompatibilityGateDecision[] = [];

export function recordGateDecision(d: L6CompatibilityGateDecision): void {
  gateLog.push(d);
}

export function listGateDecisions(): readonly L6CompatibilityGateDecision[] {
  return [...gateLog];
}

export function clearGateLog(): void {
  gateLog.length = 0;
}
