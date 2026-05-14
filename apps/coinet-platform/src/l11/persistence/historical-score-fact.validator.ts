/**
 * L11.8 — Historical Score Fact Validator (§11.8.8)
 */

import {
  L11HistoricalScoreFact,
  isL11HistoricalScoreFactStructurallyValid,
} from '../contracts/l11-historical-surface';
import {
  L11PersistenceViolationCode,
  L11PersistenceIssue,
  makeL11PersistenceIssue,
} from './l11-persistence-violation-codes';

export function validateL11HistoricalScoreFact(
  f: L11HistoricalScoreFact,
): L11PersistenceIssue[] {
  const issues: L11PersistenceIssue[] = [];
  const ctx = { historical_fact_id: f?.historical_fact_id };

  if (!f) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_HISTORICAL_FACT_INCOMPLETE,
      'historical fact is null/undefined'));
    return issues;
  }

  const struct = isL11HistoricalScoreFactStructurallyValid(f);
  if (!struct.ok) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_HISTORICAL_FACT_INCOMPLETE,
      struct.reason, ctx));
  }
  if (!f.replay_hash) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_HISTORICAL_REPLAY_HASH_MISSING,
      'replay_hash missing', ctx));
  }
  if (!f.formula_version || !f.formula_id) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_HISTORICAL_FORMULA_VERSION_MISSING,
      'formula_id / formula_version missing', ctx));
  }
  if (!f.attribution_fact_ref) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_HISTORICAL_ATTRIBUTION_REF_MISSING,
      'attribution_fact_ref missing', ctx));
  }
  if (!Array.isArray(f.component_fact_refs) || f.component_fact_refs.length === 0) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_HISTORICAL_COMPONENT_REFS_MISSING,
      'component_fact_refs missing or empty', ctx));
  }
  if (!!f.correction_of_fact_id !== !!f.correction_reason) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_HISTORICAL_CORRECTION_LINK_MISSING,
      'correction_of_fact_id and correction_reason must both be present or both absent',
      ctx));
  }
  return issues;
}
