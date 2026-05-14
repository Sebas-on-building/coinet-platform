/**
 * L12.6 — Historical scenario fact validator (§12.6.9).
 */

import {
  L12_HISTORICAL_FACT_REQUIRED_REF,
  L12HistoricalScenarioFact,
} from '../contracts/l12-historical-surface';
import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from './l12-persistence-violation-codes';

export function validateL12HistoricalScenarioFact(
  fact: L12HistoricalScenarioFact,
  ctx?: {
    /** Prior fact ids that may collide; used to detect mutation in place. */
    readonly known_fact_ids?: ReadonlySet<string>;
  },
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  const requiredStrings: Array<[keyof L12HistoricalScenarioFact, string]> = [
    ['fact_id', 'fact_id'],
    ['fact_family', 'fact_family'],
    ['scenario_subject_id', 'scenario_subject_id'],
    ['scenario_set_id', 'scenario_set_id'],
    ['compute_run_id', 'compute_run_id'],
    ['fact_payload_ref', 'fact_payload_ref'],
    ['evidence_pack_ref', 'evidence_pack_ref'],
    ['input_snapshot_ref', 'input_snapshot_ref'],
    ['replay_hash', 'replay_hash'],
  ];
  for (const [key, label] of requiredStrings) {
    const v = fact[key] as unknown;
    if (typeof v !== 'string' || v.trim() === '') {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_CURRENT_RECORD_INCOMPLETE,
          `historical fact missing ${label}`,
          fact.fact_id,
        ),
      );
    }
  }

  if (!Array.isArray(fact.lineage_refs) || fact.lineage_refs.length === 0) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_HISTORICAL_APPEND_MISSING_LINEAGE,
        'historical fact missing lineage_refs',
        fact.fact_id,
      ),
    );
  }

  // Family-required ref
  const requiredRef = L12_HISTORICAL_FACT_REQUIRED_REF[fact.fact_family];
  if (requiredRef) {
    const value = fact[requiredRef] as unknown;
    if (typeof value !== 'string' || value.trim() === '') {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_HISTORICAL_FAMILY_REF_MISMATCH,
          `historical fact in family ${fact.fact_family} missing ${String(requiredRef)}`,
          fact.fact_id,
        ),
      );
    }
  }

  // Correction
  if (fact.correction_of_fact_id && !fact.correction_reason) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_HISTORICAL_CORRECTION_MISSING_REASON,
        'correction set without correction reason',
        fact.fact_id,
      ),
    );
  }
  if (fact.correction_reason && !fact.correction_of_fact_id) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_HISTORICAL_CORRECTION_MISSING_REASON,
        'correction reason set without correction_of_fact_id',
        fact.fact_id,
      ),
    );
  }

  // Mutation in place
  if (
    ctx?.known_fact_ids &&
    fact.fact_id &&
    ctx.known_fact_ids.has(fact.fact_id) &&
    !fact.correction_of_fact_id
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_HISTORICAL_FACT_MUTATED,
        `historical fact ${fact.fact_id} would be re-written in place`,
        fact.fact_id,
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}
