/**
 * L5.2 Authority Model — Authority Evaluator
 *
 * Orchestrates the full L5.2 evaluation pipeline:
 *   1. Accept L5.1 classification
 *   2. Allocate authority
 *   3. Validate all invariants
 *   4. Register authority home
 *   5. Return complete evaluation result
 */

import { type L5PurposeClassification, classifyL5WritePurpose, type L5WriteDomain } from '../purpose';
import { allocateL5Authority, type L5AuthorityAllocation } from './authority-allocation';
import { assertAllAuthorityInvariants, type AuthorityInvariantResult } from './authority-invariants';
import { declareAuthorityHome, type AuthorityRegistration } from './authority-registry';
import { assessLossImpact, type LossImpactAssessment } from './loss-semantics';
import { L5AuthorityStore } from './authority-store';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5AuthorityEvaluation {
  readonly classification: L5PurposeClassification;
  readonly allocation: L5AuthorityAllocation;
  readonly invariantResults: readonly AuthorityInvariantResult[];
  readonly invariantsPassed: boolean;
  readonly authorityRegistration: AuthorityRegistration;
  readonly lossImpacts: readonly LossImpactAssessment[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateL5Authority(
  domain: L5WriteDomain,
  datumFamily: string,
  moduleId: string,
): L5AuthorityEvaluation {
  const classification = classifyL5WritePurpose({ writeDomain: domain });
  const allocation = allocateL5Authority(classification, domain);

  const invariantResults = assertAllAuthorityInvariants({
    allocation,
    classification,
  });
  const invariantsPassed = invariantResults.every(r => r.passed);

  const authorityRegistration = declareAuthorityHome(
    datumFamily,
    allocation.primaryAuthorityStore,
    moduleId,
  );

  const lossImpacts: LossImpactAssessment[] = [
    L5AuthorityStore.POSTGRES,
    L5AuthorityStore.CLICKHOUSE,
    L5AuthorityStore.REDIS,
    L5AuthorityStore.OBJECT_STORAGE,
  ].map(store => assessLossImpact(classification.primaryStateClass, store));

  return {
    classification,
    allocation,
    invariantResults,
    invariantsPassed,
    authorityRegistration,
    lossImpacts,
  };
}

/**
 * Evaluate authority without registration (for validation/dry-run).
 */
export function dryRunL5Authority(
  domain: L5WriteDomain,
  moduleId: string,
): Omit<L5AuthorityEvaluation, 'authorityRegistration'> {
  const classification = classifyL5WritePurpose({ writeDomain: domain });
  const allocation = allocateL5Authority(classification, domain);

  const invariantResults = assertAllAuthorityInvariants({
    allocation,
    classification,
  });
  const invariantsPassed = invariantResults.every(r => r.passed);

  const lossImpacts: LossImpactAssessment[] = [
    L5AuthorityStore.POSTGRES,
    L5AuthorityStore.CLICKHOUSE,
    L5AuthorityStore.REDIS,
    L5AuthorityStore.OBJECT_STORAGE,
  ].map(store => assessLossImpact(classification.primaryStateClass, store));

  return { classification, allocation, invariantResults, invariantsPassed, lossImpacts };
}
